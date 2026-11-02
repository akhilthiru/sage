// Prisma Client & Transactions
export * from '@prisma/client';
export { prisma, disconnectPrisma, type TransactionClient } from './client';

// Standardized Database Errors & Result Pattern
export {
  DatabaseError,
  type DatabaseErrorCode,
  type DatabaseErrorDetails,
  type Result,
  success,
  failure,
  mapPrismaError,
  safePrismaCall,
} from './errors/database-error';

// Pagination Types
export type { PaginationParams, PaginatedResult } from './types/pagination.types';

// Repository Types & Contracts
export type {
  CreateUserData,
  UpdateUserData,
  UserFilter,
  IUserRepository,
  CreateProfileData,
  UpdateProfileData,
  IFinancialProfileRepository,
  CreateGoalData,
  UpdateGoalData,
  GoalFilter,
  IGoalRepository,
  CreateExpenseData,
  UpdateExpenseData,
  ExpenseFilter,
  IExpenseRepository,
  CreateDebtData,
  UpdateDebtData,
  CreatePaymentData,
  DebtFilter,
  DebtWithPayments,
  IDebtRepository,
  CreateAllocationData,
  UpdateAllocationData,
  IAllocationRepository,
  CreateConversationData,
  UpdateConversationData,
  CreateMessageData,
  ConversationWithMessages,
  IConversationRepository,
  CreateSimulationData,
  SimulationFilter,
  ISimulationRepository,
} from './types/repository.types';

// Repositories
export { BaseRepository } from './repositories/base.repository';
export { UserRepository } from './repositories/user.repository';
export { FinancialProfileRepository } from './repositories/financial-profile.repository';
export { GoalRepository } from './repositories/goal.repository';
export { ExpenseRepository } from './repositories/expense.repository';
export { DebtRepository } from './repositories/debt.repository';
export { AllocationRepository } from './repositories/allocation.repository';
export { ConversationRepository } from './repositories/conversation.repository';
export { SimulationRepository } from './repositories/simulation.repository';

// Utilities
export {
  toNumber,
  toOptionalNumber,
  toRequiredNumber,
  toDecimal,
  toOptionalDecimal,
  toRequiredDecimal,
  roundCurrency,
} from './utils/decimal-converter';

export {
  encrypt,
  decrypt,
  encryptNullable,
  decryptNullable,
  hash,
} from './utils/encryption';
