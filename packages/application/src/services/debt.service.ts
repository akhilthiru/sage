import {
  type IDebtRepository,
  type IFinancialProfileRepository,
  type TransactionClient,
  type Debt,
  type DebtStatus as DbDebtStatus,
  prisma,
} from '@sage/database';
import {
  calculateEMI,
  addMonths,
} from '@sage/financial-engine';
import {
  type DebtDTO,
  type RecordDebtRequest,
  type RecordDebtResponse,
  type RecordDebtPaymentRequest,
  type RecordDebtPaymentResponse,
  type ListDebtsRequest,
  type ListDebtsResponse,
  type DebtStatus,
  RecordDebtSchema,
  RecordDebtPaymentSchema,
  ListDebtsSchema,
  validateWithZod,
} from '../dtos';
import {
  NotFoundError,
  AuthorizationError,
  BusinessRuleError,
  DatabaseOperationError,
} from '../errors';
import {
  DebtRecordedEvent,
  DebtPaymentRecordedEvent,
  DebtPaidOffEvent,
  type IEventPublisher,
} from '../events';
import { AllocationService } from './allocation.service';

export function mapDebtToDTO(debt: Debt): DebtDTO {
  return {
    id: debt.id,
    userId: debt.userId,
    name: debt.name,
    principal: Number(debt.principalAmount),
    currentBalance: Number(debt.currentBalance),
    interestRate: Number(debt.interestRate),
    termMonths: 0,
    monthlyPayment: Number(debt.monthlyPayment),
    minimumPayment: Number(debt.minimumPayment),
    startDate: debt.startDate,
    payoffDate: debt.endDate ?? debt.startDate,
    status: debt.status as DebtStatus,
    totalInterestPaid: 0,
    createdAt: debt.createdAt,
    updatedAt: debt.updatedAt,
  };
}

export class DebtService {
  constructor(
    private readonly debtRepo: IDebtRepository,
    private readonly profileRepo: IFinancialProfileRepository,
    private readonly allocationService: AllocationService,
    private readonly eventPublisher?: IEventPublisher,
    private readonly prismaClient: typeof prisma = prisma
  ) {}

  async recordDebt(
    request: RecordDebtRequest,
    existingTx?: TransactionClient
  ): Promise<RecordDebtResponse> {
    const validated = validateWithZod(RecordDebtSchema, request);
    const { userId, name, principal, interestRate, termMonths, minimumPayment, startDate } = validated;

    // 1. Engine Calculates EMI and total interest
    const emiRes = calculateEMI({
      principal,
      annualInterestRate: interestRate,
      tenureMonths: termMonths,
    });

    if (!emiRes.success) {
      throw new BusinessRuleError(emiRes.error.message, emiRes.error.code);
    }

    const { emi, totalInterest } = emiRes.data;
    const effectiveStartDate = startDate ?? new Date();
    const payoffDate = addMonths(effectiveStartDate, termMonths);

    const executeWork = async (tx: TransactionClient): Promise<RecordDebtResponse> => {
      const createRes = await this.debtRepo.create(
        {
          userId,
          name,
          type: 'OTHER',
          principalAmount: principal,
          currentBalance: principal,
          interestRate,
          monthlyPayment: emi,
          minimumPayment: minimumPayment ?? emi,
          startDate: effectiveStartDate,
          endDate: payoffDate,
          status: 'ACTIVE',
        },
        tx
      );

      if (!createRes.success) {
        throw new DatabaseOperationError('Failed to record debt', createRes.error);
      }

      const allocRes = await this.allocationService.generateAllocation({ userId }, tx);

      const debtDto: DebtDTO = {
        ...mapDebtToDTO(createRes.data),
        termMonths,
        totalInterestPaid: 0,
      };

      return {
        debt: debtDto,
        allocation: allocRes.allocation,
        calculations: {
          monthlyPayment: emi,
          totalInterest,
          payoffDate,
        },
      };
    };

    let result: RecordDebtResponse;
    if (existingTx) {
      result = await executeWork(existingTx);
    } else {
      result = await this.prismaClient.$transaction(async (tx) => {
        return await executeWork(tx);
      });
    }

    if (this.eventPublisher) {
      await this.eventPublisher.publish(
        new DebtRecordedEvent(result.debt.id, userId, principal, interestRate)
      );
    }

    return result;
  }

  async recordPayment(
    request: RecordDebtPaymentRequest,
    existingTx?: TransactionClient
  ): Promise<RecordDebtPaymentResponse> {
    const validated = validateWithZod(RecordDebtPaymentSchema, request);
    const { userId, debtId, amount, paymentDate } = validated;

    const debtRes = await this.debtRepo.findById(debtId, existingTx);
    if (!debtRes.success || !debtRes.data) {
      throw new NotFoundError(`Debt with ID ${debtId} not found`, 'Debt', debtId);
    }
    const debt = debtRes.data;
    if (debt.userId !== userId) {
      throw new AuthorizationError('You do not own this debt');
    }
    if (debt.status === 'PAID_OFF') {
      throw new BusinessRuleError('Debt is already fully paid off', 'DEBT_ALREADY_PAID');
    }

    const currentBalance = Number(debt.currentBalance);
    const monthlyRate = Number(debt.interestRate) / 100 / 12;
    const interestPaid = Math.min(amount, Math.round(currentBalance * monthlyRate * 100) / 100);
    const principalPaid = Math.max(0, amount - interestPaid);
    const newBalance = Math.max(0, Math.round((currentBalance - principalPaid) * 100) / 100);
    const isPaidOff = newBalance <= 0;
    const remainingPayments =
      newBalance > 0 && Number(debt.monthlyPayment) > 0
        ? Math.ceil(newBalance / Number(debt.monthlyPayment))
        : 0;

    const effectivePaymentDate = paymentDate ?? new Date();

    const executeWork = async (tx: TransactionClient): Promise<RecordDebtPaymentResponse> => {
      const paymentRes = await this.debtRepo.createPayment(
        {
          debtId,
          amount,
          principalPaid,
          interestPaid,
          paymentDate: effectivePaymentDate,
          dueDate: effectivePaymentDate,
          status: 'COMPLETED',
        },
        tx
      );

      if (!paymentRes.success) {
        throw new DatabaseOperationError('Failed to create payment record', paymentRes.error);
      }

      const updateRes = await this.debtRepo.update(
        debtId,
        {
          currentBalance: newBalance,
          status: isPaidOff ? 'PAID_OFF' : 'ACTIVE',
          endDate: isPaidOff ? paymentDate : undefined,
        },
        tx
      );

      if (!updateRes.success) {
        throw new DatabaseOperationError('Failed to update debt balance', updateRes.error);
      }

      const allocRes = await this.allocationService.generateAllocation({ userId }, tx);

      return {
        paymentId: paymentRes.data.id,
        debtId,
        amount,
        newBalance,
        remainingPayments,
        isPaidOff,
        allocation: allocRes.allocation,
      };
    };

    let result: RecordDebtPaymentResponse;
    if (existingTx) {
      result = await executeWork(existingTx);
    } else {
      result = await this.prismaClient.$transaction(async (tx) => {
        return await executeWork(tx);
      });
    }

    if (this.eventPublisher) {
      await this.eventPublisher.publish(
        new DebtPaymentRecordedEvent(result.paymentId, debtId, userId, amount, newBalance, isPaidOff)
      );
      if (isPaidOff) {
        await this.eventPublisher.publish(new DebtPaidOffEvent(debtId, userId));
      }
    }

    return result;
  }

  async listDebts(request: ListDebtsRequest, tx?: TransactionClient): Promise<ListDebtsResponse> {
    const validated = validateWithZod(ListDebtsSchema, request);
    const { userId, status } = validated;

    const [debtsRes, profileRes] = await Promise.all([
      this.debtRepo.findByUserId(userId, tx),
      this.profileRepo.findByUserId(userId, tx),
    ]);

    if (!debtsRes.success) {
      throw new DatabaseOperationError('Failed to list debts', debtsRes.error);
    }

    let items = debtsRes.data;
    if (status) {
      items = items.filter((d) => d.status === (status as DbDebtStatus));
    }

    const dtos = items.map((d) => mapDebtToDTO(d));

    let totalBalance = 0;
    let totalMonthlyPayment = 0;

    for (const d of dtos) {
      if (d.status === 'ACTIVE') {
        totalBalance += d.currentBalance;
        totalMonthlyPayment += d.monthlyPayment;
      }
    }

    const monthlyIncome = profileRes.success && profileRes.data ? Number(profileRes.data.monthlyIncome) : 0;
    const debtToIncomeRatio =
      monthlyIncome > 0 ? Math.round((totalMonthlyPayment / monthlyIncome) * 1000) / 10 : 0;

    return {
      debts: dtos,
      summary: {
        totalDebts: dtos.length,
        totalBalance,
        totalMonthlyPayment,
        debtToIncomeRatio,
      },
    };
  }
}
