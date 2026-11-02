import type { Allocation } from '@prisma/client';
import { BaseRepository } from './base.repository';
import type {
  IAllocationRepository,
  CreateAllocationData,
  UpdateAllocationData,
} from '../types/repository.types';
import type { Result } from '../errors/database-error';
import type { TransactionClient } from '../client';
import { toRequiredDecimal } from '../utils/decimal-converter';

export class AllocationRepository
  extends BaseRepository
  implements IAllocationRepository
{
  async create(
    data: CreateAllocationData,
    tx?: TransactionClient
  ): Promise<Result<Allocation>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      return client.allocation.create({
        data: {
          userId: data.userId,
          month: data.month,
          year: data.year,
          essentialExpenses: toRequiredDecimal(data.essentialExpenses, 'essentialExpenses'),
          debtPayments: toRequiredDecimal(data.debtPayments, 'debtPayments'),
          emergencyFund: toRequiredDecimal(data.emergencyFund, 'emergencyFund'),
          goalSavings: toRequiredDecimal(data.goalSavings, 'goalSavings'),
          investments: toRequiredDecimal(data.investments, 'investments'),
          discretionary: toRequiredDecimal(data.discretionary, 'discretionary'),
          totalIncome: toRequiredDecimal(data.totalIncome, 'totalIncome'),
          totalAllocated: toRequiredDecimal(data.totalAllocated, 'totalAllocated'),
          isActive: data.isActive ?? true,
        },
      });
    }, 'Failed to create budget allocation snapshot');
  }

  async upsert(
    data: CreateAllocationData,
    tx?: TransactionClient
  ): Promise<Result<Allocation>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      const essentialExpenses = toRequiredDecimal(data.essentialExpenses, 'essentialExpenses');
      const debtPayments = toRequiredDecimal(data.debtPayments, 'debtPayments');
      const emergencyFund = toRequiredDecimal(data.emergencyFund, 'emergencyFund');
      const goalSavings = toRequiredDecimal(data.goalSavings, 'goalSavings');
      const investments = toRequiredDecimal(data.investments, 'investments');
      const discretionary = toRequiredDecimal(data.discretionary, 'discretionary');
      const totalIncome = toRequiredDecimal(data.totalIncome, 'totalIncome');
      const totalAllocated = toRequiredDecimal(data.totalAllocated, 'totalAllocated');

      return client.allocation.upsert({
        where: {
          userId_month_year: {
            userId: data.userId,
            month: data.month,
            year: data.year,
          },
        },
        create: {
          userId: data.userId,
          month: data.month,
          year: data.year,
          essentialExpenses,
          debtPayments,
          emergencyFund,
          goalSavings,
          investments,
          discretionary,
          totalIncome,
          totalAllocated,
          isActive: data.isActive ?? true,
        },
        update: {
          essentialExpenses,
          debtPayments,
          emergencyFund,
          goalSavings,
          investments,
          discretionary,
          totalIncome,
          totalAllocated,
          ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        },
      });
    }, `Failed to upsert allocation for user: ${data.userId} (${data.month}/${data.year})`);
  }

  async findById(id: string, tx?: TransactionClient): Promise<Result<Allocation | null>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      return client.allocation.findUnique({
        where: { id },
      });
    }, `Failed to find allocation by id: ${id}`);
  }

  async findByUserId(userId: string, tx?: TransactionClient): Promise<Result<Allocation[]>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      return client.allocation.findMany({
        where: { userId },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      });
    }, `Failed to find allocations for user: ${userId}`);
  }

  async findByMonth(
    userId: string,
    month: number,
    year: number,
    tx?: TransactionClient
  ): Promise<Result<Allocation | null>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      return client.allocation.findUnique({
        where: {
          userId_month_year: {
            userId,
            month,
            year,
          },
        },
      });
    }, `Failed to find allocation for user: ${userId} (${month}/${year})`);
  }

  async findRecent(
    userId: string,
    count: number,
    tx?: TransactionClient
  ): Promise<Result<Allocation[]>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      return client.allocation.findMany({
        where: { userId },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        take: count,
      });
    }, `Failed to find recent allocations for user: ${userId}`);
  }

  async update(
    id: string,
    data: UpdateAllocationData,
    tx?: TransactionClient
  ): Promise<Result<Allocation>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      return client.allocation.update({
        where: { id },
        data: {
          ...(data.essentialExpenses !== undefined
            ? { essentialExpenses: toRequiredDecimal(data.essentialExpenses, 'essentialExpenses') }
            : {}),
          ...(data.debtPayments !== undefined
            ? { debtPayments: toRequiredDecimal(data.debtPayments, 'debtPayments') }
            : {}),
          ...(data.emergencyFund !== undefined
            ? { emergencyFund: toRequiredDecimal(data.emergencyFund, 'emergencyFund') }
            : {}),
          ...(data.goalSavings !== undefined
            ? { goalSavings: toRequiredDecimal(data.goalSavings, 'goalSavings') }
            : {}),
          ...(data.investments !== undefined
            ? { investments: toRequiredDecimal(data.investments, 'investments') }
            : {}),
          ...(data.discretionary !== undefined
            ? { discretionary: toRequiredDecimal(data.discretionary, 'discretionary') }
            : {}),
          ...(data.totalIncome !== undefined
            ? { totalIncome: toRequiredDecimal(data.totalIncome, 'totalIncome') }
            : {}),
          ...(data.totalAllocated !== undefined
            ? { totalAllocated: toRequiredDecimal(data.totalAllocated, 'totalAllocated') }
            : {}),
          ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        },
      });
    }, `Failed to update allocation: ${id}`);
  }
}
