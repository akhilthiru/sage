import type { Goal, Prisma } from '@prisma/client';
import { BaseRepository } from './base.repository';
import type {
  IGoalRepository,
  CreateGoalData,
  UpdateGoalData,
  GoalFilter,
} from '../types/repository.types';
import type { PaginationParams, PaginatedResult } from '../types/pagination.types';
import type { Result } from '../errors/database-error';
import type { TransactionClient } from '../client';
import { toRequiredDecimal } from '../utils/decimal-converter';

export class GoalRepository extends BaseRepository implements IGoalRepository {
  async create(data: CreateGoalData, tx?: TransactionClient): Promise<Result<Goal>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      return client.goal.create({
        data: {
          userId: data.userId,
          name: data.name,
          description: data.description ?? null,
          type: data.type,
          targetAmount: toRequiredDecimal(data.targetAmount, 'targetAmount'),
          currentAmount: toRequiredDecimal(data.currentAmount ?? 0, 'currentAmount'),
          monthlyContribution: toRequiredDecimal(data.monthlyContribution ?? 0, 'monthlyContribution'),
          targetDate: new Date(data.targetDate),
          startDate: data.startDate ? new Date(data.startDate) : new Date(),
          priority: data.priority ?? 'MEDIUM',
          status: data.status ?? 'ACTIVE',
          isFeasible: data.isFeasible ?? true,
          feasibilityScore: data.feasibilityScore ?? 100,
        },
      });
    }, 'Failed to create goal');
  }

  async findById(id: string, tx?: TransactionClient): Promise<Result<Goal | null>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      return client.goal.findUnique({
        where: { id },
      });
    }, `Failed to find goal by id: ${id}`);
  }

  async findByUserId(userId: string, tx?: TransactionClient): Promise<Result<Goal[]>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      return client.goal.findMany({
        where: { userId, deletedAt: null },
        orderBy: [{ priority: 'asc' }, { targetDate: 'asc' }],
      });
    }, `Failed to find goals for user: ${userId}`);
  }

  async findActiveByUserId(userId: string, tx?: TransactionClient): Promise<Result<Goal[]>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      return client.goal.findMany({
        where: { userId, status: 'ACTIVE', deletedAt: null },
        orderBy: [{ priority: 'asc' }, { targetDate: 'asc' }],
      });
    }, `Failed to find active goals for user: ${userId}`);
  }

  async findByType(
    userId: string,
    type: CreateGoalData['type'],
    tx?: TransactionClient
  ): Promise<Result<Goal[]>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      return client.goal.findMany({
        where: { userId, type, deletedAt: null },
        orderBy: { targetDate: 'asc' },
      });
    }, `Failed to find goals of type ${type} for user: ${userId}`);
  }

  async findMany(
    filter: GoalFilter,
    pagination?: PaginationParams,
    tx?: TransactionClient
  ): Promise<Result<PaginatedResult<Goal>>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      const { page, pageSize, skip, take } = this.getPaginationBounds(pagination);

      const where: Prisma.GoalWhereInput = {
        userId: filter.userId,
      };

      if (filter.deleted === false || filter.deleted === undefined) {
        where.deletedAt = null;
      } else if (filter.deleted === true) {
        where.deletedAt = { not: null };
      }

      if (filter.status) {
        where.status = Array.isArray(filter.status) ? { in: filter.status } : filter.status;
      }

      if (filter.type) {
        where.type = Array.isArray(filter.type) ? { in: filter.type } : filter.type;
      }

      if (filter.priority) {
        where.priority = Array.isArray(filter.priority) ? { in: filter.priority } : filter.priority;
      }

      if (filter.dueBefore) {
        where.targetDate = { ...where.targetDate as Prisma.DateTimeFilter, lte: filter.dueBefore };
      }

      if (filter.dueAfter) {
        where.targetDate = { ...where.targetDate as Prisma.DateTimeFilter, gte: filter.dueAfter };
      }

      const [data, total] = await Promise.all([
        client.goal.findMany({
          where,
          skip,
          take,
          orderBy: { [pagination?.orderBy ?? 'targetDate']: pagination?.orderDirection ?? 'asc' },
        }),
        client.goal.count({ where }),
      ]);

      return {
        data,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
      };
    }, 'Failed to query goals');
  }

  async update(id: string, data: UpdateGoalData, tx?: TransactionClient): Promise<Result<Goal>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      return client.goal.update({
        where: { id },
        data: {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          ...(data.type ? { type: data.type } : {}),
          ...(data.targetAmount !== undefined
            ? { targetAmount: toRequiredDecimal(data.targetAmount, 'targetAmount') }
            : {}),
          ...(data.currentAmount !== undefined
            ? { currentAmount: toRequiredDecimal(data.currentAmount, 'currentAmount') }
            : {}),
          ...(data.monthlyContribution !== undefined
            ? { monthlyContribution: toRequiredDecimal(data.monthlyContribution, 'monthlyContribution') }
            : {}),
          ...(data.targetDate ? { targetDate: new Date(data.targetDate) } : {}),
          ...(data.completedDate !== undefined
            ? { completedDate: data.completedDate ? new Date(data.completedDate) : null }
            : {}),
          ...(data.priority ? { priority: data.priority } : {}),
          ...(data.status ? { status: data.status } : {}),
          ...(data.isFeasible !== undefined ? { isFeasible: data.isFeasible } : {}),
          ...(data.feasibilityScore !== undefined ? { feasibilityScore: data.feasibilityScore } : {}),
        },
      });
    }, `Failed to update goal: ${id}`);
  }

  async updateProgress(
    id: string,
    currentAmount: number,
    tx?: TransactionClient
  ): Promise<Result<Goal>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      return client.goal.update({
        where: { id },
        data: {
          currentAmount: toRequiredDecimal(currentAmount, 'currentAmount'),
        },
      });
    }, `Failed to update progress for goal: ${id}`);
  }

  async softDelete(id: string, tx?: TransactionClient): Promise<Result<Goal>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      return client.goal.update({
        where: { id },
        data: { deletedAt: new Date(), status: 'CANCELLED' },
      });
    }, `Failed to soft delete goal: ${id}`);
  }

  async restore(id: string, tx?: TransactionClient): Promise<Result<Goal>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      return client.goal.update({
        where: { id },
        data: { deletedAt: null, status: 'ACTIVE' },
      });
    }, `Failed to restore goal: ${id}`);
  }

  async findEmergencyFundGoal(
    userId: string,
    tx?: TransactionClient
  ): Promise<Result<Goal | null>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      return client.goal.findFirst({
        where: {
          userId,
          type: 'EMERGENCY_FUND',
          deletedAt: null,
        },
      });
    }, `Failed to find emergency fund goal for user: ${userId}`);
  }

  async countActiveGoals(userId: string, tx?: TransactionClient): Promise<Result<number>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      return client.goal.count({
        where: {
          userId,
          status: 'ACTIVE',
          deletedAt: null,
        },
      });
    }, `Failed to count active goals for user: ${userId}`);
  }
}
