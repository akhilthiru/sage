import {
  AllocationService,
  OnboardingService,
  FinancialProfileService,
  GoalService,
  ExpenseService,
  DebtService,
  SimulationService,
  DashboardService,
  InProcessEventBus,
} from '@sage/application';
import type {
  IUserRepository,
  IFinancialProfileRepository,
  IGoalRepository,
  IExpenseRepository,
  IDebtRepository,
  IAllocationRepository,
  ISimulationRepository,
} from '@sage/database';
import {
  MemoryUserRepository,
  MemoryFinancialProfileRepository,
  MemoryGoalRepository,
  MemoryExpenseRepository,
  MemoryDebtRepository,
  MemoryAllocationRepository,
  MemorySimulationRepository,
} from './mock-db';

// Singleton In-Memory Repositories
export const userRepo = new MemoryUserRepository() as unknown as IUserRepository;
export const profileRepo = new MemoryFinancialProfileRepository() as unknown as IFinancialProfileRepository;
export const goalRepo = new MemoryGoalRepository() as unknown as IGoalRepository;
export const expenseRepo = new MemoryExpenseRepository() as unknown as IExpenseRepository;
export const debtRepo = new MemoryDebtRepository() as unknown as IDebtRepository;
export const allocationRepo = new MemoryAllocationRepository() as unknown as IAllocationRepository;
export const simulationRepo = new MemorySimulationRepository() as unknown as ISimulationRepository;

// In-Memory Transaction Client Mock (prevents unneeded Prisma connection attempts when running standalone)
export const mockPrismaClient = {
  $transaction: async (cb: (tx: any) => Promise<any>) => {
    return await cb({});
  },
} as any;

// Event Bus
export const eventBus = new InProcessEventBus();

// Domain Services wired with repositories and mock transaction client
export const allocationService = new AllocationService(
  profileRepo,
  expenseRepo,
  debtRepo,
  goalRepo,
  allocationRepo,
  eventBus
);

export const onboardingService = new OnboardingService(
  userRepo,
  profileRepo,
  allocationService,
  eventBus,
  mockPrismaClient
);

export const profileService = new FinancialProfileService(
  profileRepo,
  allocationService,
  eventBus,
  mockPrismaClient
);

export const goalService = new GoalService(
  goalRepo,
  profileRepo,
  expenseRepo,
  allocationService,
  eventBus,
  mockPrismaClient
);

export const expenseService = new ExpenseService(
  expenseRepo,
  allocationService,
  eventBus,
  mockPrismaClient
);

export const debtService = new DebtService(
  debtRepo,
  profileRepo,
  allocationService,
  eventBus,
  mockPrismaClient
);

export const simulationService = new SimulationService(
  simulationRepo,
  profileRepo,
  expenseRepo,
  debtRepo,
  goalRepo,
  allocationRepo,
  eventBus
);

export const dashboardService = new DashboardService(
  profileRepo,
  goalRepo,
  expenseRepo,
  debtRepo,
  allocationRepo
);
