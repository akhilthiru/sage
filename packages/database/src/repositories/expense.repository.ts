import type { Expense, Prisma } from '@prisma/client';
import { BaseRepository } from './base.repository';
import type {
  IExpenseRepository,
  CreateExpenseData,
  UpdateExpenseData,
  ExpenseFilter,
} from '../types/repository.types';
import type { PaginationParams, PaginatedResult } from '../types/pagination.types';
import type { Result } from '../errors/database-error';
import type { TransactionClient } from '../client';
import { toRequiredDecimal, toNumber } from '../utils/decimal-converter';

export class ExpenseRepository extends BaseRepository implements IExpenseRepository {
  async create(data: CreateExpenseData, tx?: TransactionClient): Promise<Result<Expense>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      return client.expense.create({
        data: {
          userId: data.userId,
          name: data.name,
          amount: toRequiredDecimal(data.amount, 'amount'),
          category: data.category,
          frequency: data.frequency ?? 'MONTHLY',
          isEssential: data.isEssential ?? false,
          isActive: data.isActive ?? true,
          startDate: data.startDate ? new Date(data.startDate) : new Date(),
          endDate: data.endDate ? new Date(data.endDate) : null,
        },
      });
    }, 'Failed to create expense');
  }

  async findById(id: string, tx?: TransactionClient): Promise<Result<Expense | null>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      return client.expense.findUnique({
        where: { id },
      });
    }, `Failed to find expense by id: ${id}`);
  }

  async findByUserId(userId: string, tx?: TransactionClient): Promise<Result<Expense[]>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      return client.expense.findMany({
        where: { userId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });
    }, `Failed to find expenses for user: ${userId}`);
  }

  async findActiveByUserId(userId: string, tx?: TransactionClient): Promise<Result<Expense[]>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      return client.expense.findMany({
        where: { userId, isActive: true, deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });
    }, `Failed to find active expenses for user: ${userId}`);
  }

  async findByCategory(
    userId: string,
    category: CreateExpenseData['category'],
    tx?: TransactionClient
  ): Promise<Result<Expense[]>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      return client.expense.findMany({
        where: { userId, category, deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });
    }, `Failed to find expenses for category ${category}`);
  }

  async findMany(
    filter: ExpenseFilter,
    pagination?: PaginationParams,
    tx?: TransactionClient
  ): Promise<Result<PaginatedResult<Expense>>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      const { page, pageSize, skip, take } = this.getPaginationBounds(pagination);

      const where: Prisma.ExpenseWhereInput = {
        userId: filter.userId,
      };

      if (filter.deleted === false || filter.deleted === undefined) {
        where.deletedAt = null;
      } else if (filter.deleted === true) {
        where.deletedAt = { not: null };
      }

      if (filter.category) {
        where.category = Array.isArray(filter.category) ? { in: filter.category } : filter.category;
      }

      if (filter.isEssential !== undefined) {
        where.isEssential = filter.isEssential;
      }

      if (filter.isActive !== undefined) {
        where.isActive = filter.isActive;
      }

      const [data, total] = await Promise.all([
        client.expense.findMany({
          where,
          skip,
          take,
          orderBy: { [pagination?.orderBy ?? 'createdAt']: pagination?.orderDirection ?? 'desc' },
        }),
        client.expense.count({ where }),
      ]);

      return {
        data,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
      };
    }, 'Failed to query expenses');
  }

  async update(id: string, data: UpdateExpenseData, tx?: TransactionClient): Promise<Result<Expense>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      return client.expense.update({
        where: { id },
        data: {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.amount !== undefined ? { amount: toRequiredDecimal(data.amount, 'amount') } : {}),
          ...(data.category ? { category: data.category } : {}),
          ...(data.frequency ? { frequency: data.frequency } : {}),
          ...(data.isEssential !== undefined ? { isEssential: data.isEssential } : {}),
          ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
          ...(data.startDate ? { startDate: new Date(data.startDate) } : {}),
          ...(data.endDate !== undefined ? { endDate: data.endDate ? new Date(data.endDate) : null } : {}),
        },
      });
    }, `Failed to update expense: ${id}`);
  }

  async softDelete(id: string, tx?: TransactionClient): Promise<Result<Expense>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      return client.expense.update({
        where: { id },
        data: { deletedAt: new Date(), isActive: false },
      });
    }, `Failed to soft delete expense: ${id}`);
  }

  async restore(id: string, tx?: TransactionClient): Promise<Result<Expense>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      return client.expense.update({
        where: { id },
        data: { deletedAt: null, isActive: true },
      });
    }, `Failed to restore expense: ${id}`);
  }

  async calculateTotalMonthly(userId: string, tx?: TransactionClient): Promise<Result<number>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      const aggregate = await client.expense.aggregate({
        where: {
          userId,
          isActive: true,
          deletedAt: null,
          frequency: 'MONTHLY',
        },
        _sum: {
          amount: true,
        },
      });

      return toNumber(aggregate._sum.amount) ?? 0;
    }, `Failed to calculate total monthly expenses for user: ${userId}`);
  }

  async calculateEssentialMonthly(userId: string, tx?: TransactionClient): Promise<Result<number>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      const aggregate = await client.expense.aggregate({
        where: {
          userId,
          isActive: true,
          isEssential: true,
          deletedAt: null,
          frequency: 'MONTHLY',
        },
        _sum: {
          amount: true,
        },
      });

      return toNumber(aggregate._sum.amount) ?? 0;
    }, `Failed to calculate essential monthly expenses for user: ${userId}`);
  }
}
