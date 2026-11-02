import {
  type IFinancialProfileRepository,
  type IExpenseRepository,
  type IDebtRepository,
  type IGoalRepository,
  type IAllocationRepository,
  type TransactionClient,
  type Allocation,
} from '@sage/database';
import {
  calculateAllocation,
  type AllocationInput,
  type ExpenseItem,
  type DebtItem,
  type GoalItem,
  type RiskTolerance,
  type Frequency,
  type Priority,
  type GoalStatus as EngineGoalStatus,
} from '@sage/financial-engine';
import {
  type AllocationDTO,
  type GenerateAllocationRequest,
  type GenerateAllocationResponse,
  GenerateAllocationSchema,
  validateWithZod,
} from '../dtos';
import { NotFoundError, BusinessRuleError, DatabaseOperationError } from '../errors';
import { AllocationGeneratedEvent, type IEventPublisher } from '../events';

export function mapAllocationToDTO(allocation: Allocation, monthlyIncome?: number): AllocationDTO {
  const essential = Number(allocation.essentialExpenses);
  const debt = Number(allocation.debtPayments);
  const emergency = Number(allocation.emergencyFund);
  const goal = Number(allocation.goalSavings);
  const investments = Number(allocation.investments);
  const discretionary = Number(allocation.discretionary);
  const income = monthlyIncome ?? Number(allocation.totalIncome);

  return {
    id: allocation.id,
    userId: allocation.userId,
    monthlyIncome: income,
    needs: essential + debt,
    wants: discretionary,
    savings: emergency + goal + investments,
    breakdown: {
      fixedExpenses: essential,
      variableExpenses: discretionary,
      goalContributions: goal,
      debtPayments: debt,
      discretionary,
      emergencyFund: emergency,
    },
    createdAt: allocation.createdAt,
  };
}

export class AllocationService {
  constructor(
    private readonly profileRepo: IFinancialProfileRepository,
    private readonly expenseRepo: IExpenseRepository,
    private readonly debtRepo: IDebtRepository,
    private readonly goalRepo: IGoalRepository,
    private readonly allocationRepo: IAllocationRepository,
    private readonly eventPublisher?: IEventPublisher
  ) {}

  async generateAllocation(
    request: GenerateAllocationRequest,
    tx?: TransactionClient
  ): Promise<GenerateAllocationResponse> {
    const validated = validateWithZod(GenerateAllocationSchema, request);
    const { userId } = validated;

    // 1. Fetch Profile
    const profileRes = await this.profileRepo.findByUserId(userId, tx);
    if (!profileRes.success || !profileRes.data) {
      throw new NotFoundError(`Financial profile not found for user ${userId}`, 'FinancialProfile', userId);
    }
    const profile = profileRes.data;

    // 2. Fetch Active Expenses, Debts, Goals
    const [expensesRes, debtsRes, goalsRes] = await Promise.all([
      this.expenseRepo.findActiveByUserId(userId, tx),
      this.debtRepo.findActiveByUserId(userId, tx),
      this.goalRepo.findActiveByUserId(userId, tx),
    ]);

    if (!expensesRes.success) throw new DatabaseOperationError('Failed to fetch expenses', expensesRes.error);
    if (!debtsRes.success) throw new DatabaseOperationError('Failed to fetch debts', debtsRes.error);
    if (!goalsRes.success) throw new DatabaseOperationError('Failed to fetch goals', goalsRes.error);

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // 3. Map to Financial Engine items
    const essentialExpenses: ExpenseItem[] = [];
    const discretionaryExpenses: ExpenseItem[] = [];

    for (const exp of expensesRes.data) {
      const item: ExpenseItem = {
        amount: Number(exp.amount),
        frequency: exp.frequency as Frequency,
        isActive: exp.isActive,
      };
      if (exp.isEssential) {
        essentialExpenses.push(item);
      } else {
        discretionaryExpenses.push(item);
      }
    }

    const debtItems: DebtItem[] = debtsRes.data.map((d) => ({
      minimumPayment: Number(d.minimumPayment || d.monthlyPayment),
      status: d.status as 'ACTIVE' | 'PAID_OFF' | 'DEFAULTED',
    }));

    const goalItems: GoalItem[] = goalsRes.data.map((g) => ({
      id: g.id,
      targetAmount: Number(g.targetAmount),
      currentAmount: Number(g.currentAmount),
      targetDate: g.targetDate.toISOString(),
      priority: g.priority as Priority,
      status: g.status as EngineGoalStatus,
    }));

    // Normalize risk tolerance to Financial Engine RiskTolerance
    let riskTol: RiskTolerance = 'MODERATE';
    if (profile.riskTolerance === 'CONSERVATIVE') riskTol = 'CONSERVATIVE';
    if (profile.riskTolerance === 'AGGRESSIVE') riskTol = 'AGGRESSIVE';

    const allocationInput: AllocationInput = {
      userId,
      month,
      year,
      monthlyIncome: Number(profile.monthlyIncome || 0),
      otherIncome: Number(profile.otherIncome || 0),
      essentialExpenses,
      discretionaryExpenses,
      debts: debtItems,
      emergencyFundTarget: Number(profile.emergencyFundTarget ?? Number(profile.monthlyIncome) * 3),
      currentEmergencyFund: Number(profile.currentEmergencyFund || 0),
      goals: goalItems,
      riskTolerance: riskTol,
    };

    // 4. "Engine Calculates" - pure deterministic engine calculation
    const engineResult = calculateAllocation(allocationInput);
    if (!engineResult.success) {
      throw new BusinessRuleError(
        engineResult.error.message || 'Allocation calculation failed',
        engineResult.error.code
      );
    }

    const alloc = engineResult.data;

    // 5. Persist allocation snapshot in repository
    const upsertRes = await this.allocationRepo.upsert(
      {
        userId,
        month,
        year,
        essentialExpenses: alloc.essentialExpenses,
        debtPayments: alloc.debtPayments,
        emergencyFund: alloc.emergencyFund,
        goalSavings: alloc.goalSavings,
        investments: alloc.investments,
        discretionary: alloc.discretionary,
        totalIncome: alloc.totalIncome,
        totalAllocated: alloc.totalAllocated,
        isActive: true,
      },
      tx
    );

    if (!upsertRes.success) {
      throw new DatabaseOperationError('Failed to persist allocation', upsertRes.error);
    }

    const allocationDTO = mapAllocationToDTO(upsertRes.data, Number(profile.monthlyIncome));

    // 6. Generate deterministic recommendations based on warnings/surplus
    const recommendations: string[] = [];
    if (alloc.warning === 'INCOME_INSUFFICIENT') {
      recommendations.push(
        `Income is insufficient to cover essential expenses and minimum debt payments. Shortfall: ₹${alloc.shortfall ?? 0}.`
      );
    } else if (alloc.warning === 'DEBT_PAYMENTS_INSUFFICIENT') {
      recommendations.push('Available income after essential expenses is insufficient for minimum debt obligations.');
    } else {
      recommendations.push(
        `Allocated ₹${alloc.essentialExpenses} to essentials, ₹${alloc.debtPayments} to debt, and ₹${alloc.goalSavings} towards active goals.`
      );
      if (alloc.discretionary > 0) {
        recommendations.push(`You have ₹${alloc.discretionary} remaining in discretionary spending.`);
      }
    }

    // 7. Publish Event
    if (this.eventPublisher) {
      await this.eventPublisher.publish(
        new AllocationGeneratedEvent(
          allocationDTO.id,
          userId,
          allocationDTO.needs,
          allocationDTO.wants,
          allocationDTO.savings
        )
      );
    }

    return {
      allocation: allocationDTO,
      recommendations,
    };
  }
}
