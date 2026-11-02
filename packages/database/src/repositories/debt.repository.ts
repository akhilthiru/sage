import type { Debt, DebtPayment, Prisma } from '@prisma/client';
import { BaseRepository } from './base.repository';
import type {
  IDebtRepository,
  CreateDebtData,
  UpdateDebtData,
  CreatePaymentData,
  DebtFilter,
  DebtWithPayments,
} from '../types/repository.types';
import type { PaginationParams, PaginatedResult } from '../types/pagination.types';
import type { Result } from '../errors/database-error';
import type { TransactionClient } from '../client';
import { toRequiredDecimal, toNumber } from '../utils/decimal-converter';

export class DebtRepository extends BaseRepository implements IDebtRepository {
  async create(data: CreateDebtData, tx?: TransactionClient): Promise<Result<Debt>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      return client.debt.create({
        data: {
          userId: data.userId,
          name: data.name,
          type: data.type,
          principalAmount: toRequiredDecimal(data.principalAmount, 'principalAmount'),
          currentBalance: toRequiredDecimal(data.currentBalance, 'currentBalance'),
          interestRate: toRequiredDecimal(data.interestRate, 'interestRate'),
          monthlyPayment: toRequiredDecimal(data.monthlyPayment, 'monthlyPayment'),
          minimumPayment: toRequiredDecimal(data.minimumPayment, 'minimumPayment'),
          startDate: new Date(data.startDate),
          endDate: data.endDate ? new Date(data.endDate) : null,
          status: data.status ?? 'ACTIVE',
        },
      });
    }, 'Failed to create debt');
  }

  async createPayment(
    data: CreatePaymentData,
    tx?: TransactionClient
  ): Promise<Result<DebtPayment>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      return client.debtPayment.create({
        data: {
          debtId: data.debtId,
          amount: toRequiredDecimal(data.amount, 'amount'),
          principalPaid: toRequiredDecimal(data.principalPaid, 'principalPaid'),
          interestPaid: toRequiredDecimal(data.interestPaid, 'interestPaid'),
          paymentDate: new Date(data.paymentDate),
          dueDate: new Date(data.dueDate),
          status: data.status ?? 'COMPLETED',
        },
      });
    }, 'Failed to record debt payment');
  }

  async findById(id: string, tx?: TransactionClient): Promise<Result<Debt | null>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      return client.debt.findUnique({
        where: { id },
      });
    }, `Failed to find debt by id: ${id}`);
  }

  async findByUserId(userId: string, tx?: TransactionClient): Promise<Result<Debt[]>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      return client.debt.findMany({
        where: { userId, deletedAt: null },
        orderBy: { currentBalance: 'desc' },
      });
    }, `Failed to find debts for user: ${userId}`);
  }

  async findActiveByUserId(userId: string, tx?: TransactionClient): Promise<Result<Debt[]>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      return client.debt.findMany({
        where: { userId, status: 'ACTIVE', deletedAt: null },
        orderBy: { currentBalance: 'desc' },
      });
    }, `Failed to find active debts for user: ${userId}`);
  }

  async findWithPayments(
    id: string,
    tx?: TransactionClient
  ): Promise<Result<DebtWithPayments | null>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      return client.debt.findUnique({
        where: { id },
        include: {
          payments: {
            orderBy: { paymentDate: 'desc' },
          },
        },
      });
    }, `Failed to find debt with payment history: ${id}`);
  }

  async findMany(
    filter: DebtFilter,
    pagination?: PaginationParams,
    tx?: TransactionClient
  ): Promise<Result<PaginatedResult<Debt>>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      const { page, pageSize, skip, take } = this.getPaginationBounds(pagination);

      const where: Prisma.DebtWhereInput = {
        userId: filter.userId,
      };

      if (filter.deleted === false || filter.deleted === undefined) {
        where.deletedAt = null;
      } else if (filter.deleted === true) {
        where.deletedAt = { not: null };
      }

      if (filter.type) {
        where.type = Array.isArray(filter.type) ? { in: filter.type } : filter.type;
      }

      if (filter.status) {
        where.status = Array.isArray(filter.status) ? { in: filter.status } : filter.status;
      }

      const [data, total] = await Promise.all([
        client.debt.findMany({
          where,
          skip,
          take,
          orderBy: { [pagination?.orderBy ?? 'currentBalance']: pagination?.orderDirection ?? 'desc' },
        }),
        client.debt.count({ where }),
      ]);

      return {
        data,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
      };
    }, 'Failed to query debts');
  }

  async update(id: string, data: UpdateDebtData, tx?: TransactionClient): Promise<Result<Debt>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      return client.debt.update({
        where: { id },
        data: {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.currentBalance !== undefined
            ? { currentBalance: toRequiredDecimal(data.currentBalance, 'currentBalance') }
            : {}),
          ...(data.interestRate !== undefined
            ? { interestRate: toRequiredDecimal(data.interestRate, 'interestRate') }
            : {}),
          ...(data.monthlyPayment !== undefined
            ? { monthlyPayment: toRequiredDecimal(data.monthlyPayment, 'monthlyPayment') }
            : {}),
          ...(data.minimumPayment !== undefined
            ? { minimumPayment: toRequiredDecimal(data.minimumPayment, 'minimumPayment') }
            : {}),
          ...(data.endDate !== undefined
            ? { endDate: data.endDate ? new Date(data.endDate) : null }
            : {}),
          ...(data.status ? { status: data.status } : {}),
        },
      });
    }, `Failed to update debt: ${id}`);
  }

  async updateBalance(
    id: string,
    newBalance: number,
    tx?: TransactionClient
  ): Promise<Result<Debt>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      const balanceDecimal = toRequiredDecimal(newBalance, 'currentBalance');
      const status = newBalance <= 0 ? 'PAID_OFF' : undefined;

      return client.debt.update({
        where: { id },
        data: {
          currentBalance: balanceDecimal,
          ...(status ? { status } : {}),
        },
      });
    }, `Failed to update balance for debt: ${id}`);
  }

  async softDelete(id: string, tx?: TransactionClient): Promise<Result<Debt>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      return client.debt.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    }, `Failed to soft delete debt: ${id}`);
  }

  async restore(id: string, tx?: TransactionClient): Promise<Result<Debt>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      return client.debt.update({
        where: { id },
        data: { deletedAt: null },
      });
    }, `Failed to restore debt: ${id}`);
  }

  async calculateTotalBalance(userId: string, tx?: TransactionClient): Promise<Result<number>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      const aggregate = await client.debt.aggregate({
        where: {
          userId,
          status: 'ACTIVE',
          deletedAt: null,
        },
        _sum: {
          currentBalance: true,
        },
      });

      return toNumber(aggregate._sum.currentBalance) ?? 0;
    }, `Failed to calculate total debt balance for user: ${userId}`);
  }

  async calculateTotalMonthlyPayments(
    userId: string,
    tx?: TransactionClient
  ): Promise<Result<number>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      const aggregate = await client.debt.aggregate({
        where: {
          userId,
          status: 'ACTIVE',
          deletedAt: null,
        },
        _sum: {
          monthlyPayment: true,
        },
      });

      return toNumber(aggregate._sum.monthlyPayment) ?? 0;
    }, `Failed to calculate total monthly debt payments for user: ${userId}`);
  }
}
