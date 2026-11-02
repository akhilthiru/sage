import { vi } from 'vitest';
import type {
  IUserRepository,
  IFinancialProfileRepository,
  IGoalRepository,
  IExpenseRepository,
  IDebtRepository,
  IAllocationRepository,
  ISimulationRepository,
  User,
  FinancialProfile,
  Goal,
  Expense,
  Debt,
  DebtPayment,
  Allocation,
  Simulation,
} from '@sage/database';

export function createMockUserRepository(overrides?: Partial<IUserRepository>): IUserRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findByClerkId: vi.fn(),
    findByEmail: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    ...overrides,
  } as unknown as IUserRepository;
}

export function createMockProfileRepository(
  overrides?: Partial<IFinancialProfileRepository>
): IFinancialProfileRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findByUserId: vi.fn(),
    update: vi.fn(),
    updateByUserId: vi.fn(),
    upsert: vi.fn(),
    ...overrides,
  } as unknown as IFinancialProfileRepository;
}

export function createMockGoalRepository(overrides?: Partial<IGoalRepository>): IGoalRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findByUserId: vi.fn(),
    findActiveByUserId: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    updateProgress: vi.fn(),
    softDelete: vi.fn(),
    restore: vi.fn(),
    createMilestone: vi.fn(),
    updateMilestone: vi.fn(),
    calculateTotalTarget: vi.fn(),
    calculateTotalCurrent: vi.fn(),
    ...overrides,
  } as unknown as IGoalRepository;
}

export function createMockExpenseRepository(
  overrides?: Partial<IExpenseRepository>
): IExpenseRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findByUserId: vi.fn(),
    findActiveByUserId: vi.fn(),
    findByCategory: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    restore: vi.fn(),
    calculateTotalMonthly: vi.fn(),
    calculateEssentialMonthly: vi.fn(),
    ...overrides,
  } as unknown as IExpenseRepository;
}

export function createMockDebtRepository(overrides?: Partial<IDebtRepository>): IDebtRepository {
  return {
    create: vi.fn(),
    createPayment: vi.fn(),
    findById: vi.fn(),
    findByUserId: vi.fn(),
    findActiveByUserId: vi.fn(),
    findWithPayments: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    updateBalance: vi.fn(),
    softDelete: vi.fn(),
    restore: vi.fn(),
    calculateTotalBalance: vi.fn(),
    calculateTotalMonthlyPayments: vi.fn(),
    ...overrides,
  } as unknown as IDebtRepository;
}

export function createMockAllocationRepository(
  overrides?: Partial<IAllocationRepository>
): IAllocationRepository {
  return {
    create: vi.fn(),
    upsert: vi.fn(),
    findById: vi.fn(),
    findByUserId: vi.fn(),
    findByMonth: vi.fn(),
    findRecent: vi.fn(),
    update: vi.fn(),
    ...overrides,
  } as unknown as IAllocationRepository;
}

export function createMockSimulationRepository(
  overrides?: Partial<ISimulationRepository>
): ISimulationRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findByUserId: vi.fn(),
    findMany: vi.fn(),
    delete: vi.fn(),
    ...overrides,
  } as unknown as ISimulationRepository;
}

export function createMockPrismaClient() {
  return {
    $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => {
      const mockTx = {};
      return await cb(mockTx);
    }),
  } as any;
}
