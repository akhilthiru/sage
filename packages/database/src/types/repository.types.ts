import type {
  User,
  FinancialProfile,
  Goal,
  Expense,
  Debt,
  DebtPayment,
  Allocation,
  Conversation,
  Message,
  Simulation,
  IncomeFrequency,
  RiskTolerance,
  GoalType,
  Priority,
  GoalStatus,
  ExpenseCategory,
  Frequency,
  DebtType,
  DebtStatus,
  PaymentStatus,
  MessageRole,
  SimulationType,
} from '@prisma/client';
import type { Result } from '../errors/database-error';
import type { TransactionClient } from '../client';
import type { PaginationParams, PaginatedResult } from './pagination.types';

// ============================================================================
// USER TYPES
// ============================================================================

export interface CreateUserData {
  clerkId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string | null;
}

export interface UpdateUserData {
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string | null;
}

export interface UserFilter {
  deleted?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface IUserRepository {
  create(data: CreateUserData, tx?: TransactionClient): Promise<Result<User>>;
  findById(id: string, tx?: TransactionClient): Promise<Result<User | null>>;
  findByClerkId(clerkId: string, tx?: TransactionClient): Promise<Result<User | null>>;
  findByEmail(email: string, tx?: TransactionClient): Promise<Result<User | null>>;
  findMany(filter?: UserFilter, pagination?: PaginationParams, tx?: TransactionClient): Promise<Result<PaginatedResult<User>>>;
  update(id: string, data: UpdateUserData, tx?: TransactionClient): Promise<Result<User>>;
  softDelete(id: string, tx?: TransactionClient): Promise<Result<User>>;
  restore(id: string, tx?: TransactionClient): Promise<Result<User>>;
  isEmailTaken(email: string, tx?: TransactionClient): Promise<Result<boolean>>;
  isClerkIdTaken(clerkId: string, tx?: TransactionClient): Promise<Result<boolean>>;
}

// ============================================================================
// FINANCIAL PROFILE TYPES
// ============================================================================

export interface CreateProfileData {
  userId: string;
  monthlyIncome: number;
  otherIncome?: number;
  incomeFrequency?: IncomeFrequency;
  currentSavings: number;
  emergencyFundTarget?: number | null;
  currentEmergencyFund?: number;
  primaryGoal?: string | null;
  riskTolerance?: RiskTolerance;
  cfoUnderstandingScore?: number;
}

export interface UpdateProfileData {
  monthlyIncome?: number;
  otherIncome?: number;
  incomeFrequency?: IncomeFrequency;
  currentSavings?: number;
  emergencyFundTarget?: number | null;
  currentEmergencyFund?: number;
  primaryGoal?: string | null;
  riskTolerance?: RiskTolerance;
  cfoUnderstandingScore?: number;
}

export interface IFinancialProfileRepository {
  create(data: CreateProfileData, tx?: TransactionClient): Promise<Result<FinancialProfile>>;
  findById(id: string, tx?: TransactionClient): Promise<Result<FinancialProfile | null>>;
  findByUserId(userId: string, tx?: TransactionClient): Promise<Result<FinancialProfile | null>>;
  update(id: string, data: UpdateProfileData, tx?: TransactionClient): Promise<Result<FinancialProfile>>;
  updateByUserId(userId: string, data: UpdateProfileData, tx?: TransactionClient): Promise<Result<FinancialProfile>>;
  upsert(userId: string, data: CreateProfileData, tx?: TransactionClient): Promise<Result<FinancialProfile>>;
}

// ============================================================================
// GOAL TYPES
// ============================================================================

export interface CreateGoalData {
  userId: string;
  name: string;
  description?: string | null;
  type: GoalType;
  targetAmount: number;
  currentAmount?: number;
  monthlyContribution?: number;
  targetDate: Date | string;
  startDate?: Date | string;
  priority?: Priority;
  status?: GoalStatus;
  isFeasible?: boolean;
  feasibilityScore?: number;
}

export interface UpdateGoalData {
  name?: string;
  description?: string | null;
  type?: GoalType;
  targetAmount?: number;
  currentAmount?: number;
  monthlyContribution?: number;
  targetDate?: Date | string;
  completedDate?: Date | string | null;
  priority?: Priority;
  status?: GoalStatus;
  isFeasible?: boolean;
  feasibilityScore?: number;
}

export interface GoalFilter {
  userId: string;
  status?: GoalStatus | GoalStatus[];
  type?: GoalType | GoalType[];
  priority?: Priority | Priority[];
  dueBefore?: Date;
  dueAfter?: Date;
  deleted?: boolean;
}

export interface IGoalRepository {
  create(data: CreateGoalData, tx?: TransactionClient): Promise<Result<Goal>>;
  findById(id: string, tx?: TransactionClient): Promise<Result<Goal | null>>;
  findByUserId(userId: string, tx?: TransactionClient): Promise<Result<Goal[]>>;
  findActiveByUserId(userId: string, tx?: TransactionClient): Promise<Result<Goal[]>>;
  findByType(userId: string, type: GoalType, tx?: TransactionClient): Promise<Result<Goal[]>>;
  findMany(filter: GoalFilter, pagination?: PaginationParams, tx?: TransactionClient): Promise<Result<PaginatedResult<Goal>>>;
  update(id: string, data: UpdateGoalData, tx?: TransactionClient): Promise<Result<Goal>>;
  updateProgress(id: string, currentAmount: number, tx?: TransactionClient): Promise<Result<Goal>>;
  softDelete(id: string, tx?: TransactionClient): Promise<Result<Goal>>;
  restore(id: string, tx?: TransactionClient): Promise<Result<Goal>>;
  findEmergencyFundGoal(userId: string, tx?: TransactionClient): Promise<Result<Goal | null>>;
  countActiveGoals(userId: string, tx?: TransactionClient): Promise<Result<number>>;
}

// ============================================================================
// EXPENSE TYPES
// ============================================================================

export interface CreateExpenseData {
  userId: string;
  name: string;
  amount: number;
  category: ExpenseCategory;
  frequency?: Frequency;
  isEssential?: boolean;
  isActive?: boolean;
  startDate?: Date | string;
  endDate?: Date | string | null;
}

export interface UpdateExpenseData {
  name?: string;
  amount?: number;
  category?: ExpenseCategory;
  frequency?: Frequency;
  isEssential?: boolean;
  isActive?: boolean;
  startDate?: Date | string;
  endDate?: Date | string | null;
}

export interface ExpenseFilter {
  userId: string;
  category?: ExpenseCategory | ExpenseCategory[];
  isEssential?: boolean;
  isActive?: boolean;
  deleted?: boolean;
}

export interface IExpenseRepository {
  create(data: CreateExpenseData, tx?: TransactionClient): Promise<Result<Expense>>;
  findById(id: string, tx?: TransactionClient): Promise<Result<Expense | null>>;
  findByUserId(userId: string, tx?: TransactionClient): Promise<Result<Expense[]>>;
  findActiveByUserId(userId: string, tx?: TransactionClient): Promise<Result<Expense[]>>;
  findByCategory(userId: string, category: ExpenseCategory, tx?: TransactionClient): Promise<Result<Expense[]>>;
  findMany(filter: ExpenseFilter, pagination?: PaginationParams, tx?: TransactionClient): Promise<Result<PaginatedResult<Expense>>>;
  update(id: string, data: UpdateExpenseData, tx?: TransactionClient): Promise<Result<Expense>>;
  softDelete(id: string, tx?: TransactionClient): Promise<Result<Expense>>;
  restore(id: string, tx?: TransactionClient): Promise<Result<Expense>>;
  calculateTotalMonthly(userId: string, tx?: TransactionClient): Promise<Result<number>>;
  calculateEssentialMonthly(userId: string, tx?: TransactionClient): Promise<Result<number>>;
}

// ============================================================================
// DEBT TYPES
// ============================================================================

export interface CreateDebtData {
  userId: string;
  name: string;
  type: DebtType;
  principalAmount: number;
  currentBalance: number;
  interestRate: number;
  monthlyPayment: number;
  minimumPayment: number;
  startDate: Date | string;
  endDate?: Date | string | null;
  status?: DebtStatus;
}

export interface UpdateDebtData {
  name?: string;
  currentBalance?: number;
  interestRate?: number;
  monthlyPayment?: number;
  minimumPayment?: number;
  endDate?: Date | string | null;
  status?: DebtStatus;
}

export interface CreatePaymentData {
  debtId: string;
  amount: number;
  principalPaid: number;
  interestPaid: number;
  paymentDate: Date | string;
  dueDate: Date | string;
  status?: PaymentStatus;
}

export interface DebtFilter {
  userId: string;
  type?: DebtType | DebtType[];
  status?: DebtStatus | DebtStatus[];
  deleted?: boolean;
}

export type DebtWithPayments = Debt & { payments: DebtPayment[] };

export interface IDebtRepository {
  create(data: CreateDebtData, tx?: TransactionClient): Promise<Result<Debt>>;
  createPayment(data: CreatePaymentData, tx?: TransactionClient): Promise<Result<DebtPayment>>;
  findById(id: string, tx?: TransactionClient): Promise<Result<Debt | null>>;
  findByUserId(userId: string, tx?: TransactionClient): Promise<Result<Debt[]>>;
  findActiveByUserId(userId: string, tx?: TransactionClient): Promise<Result<Debt[]>>;
  findWithPayments(id: string, tx?: TransactionClient): Promise<Result<DebtWithPayments | null>>;
  findMany(filter: DebtFilter, pagination?: PaginationParams, tx?: TransactionClient): Promise<Result<PaginatedResult<Debt>>>;
  update(id: string, data: UpdateDebtData, tx?: TransactionClient): Promise<Result<Debt>>;
  updateBalance(id: string, newBalance: number, tx?: TransactionClient): Promise<Result<Debt>>;
  softDelete(id: string, tx?: TransactionClient): Promise<Result<Debt>>;
  restore(id: string, tx?: TransactionClient): Promise<Result<Debt>>;
  calculateTotalBalance(userId: string, tx?: TransactionClient): Promise<Result<number>>;
  calculateTotalMonthlyPayments(userId: string, tx?: TransactionClient): Promise<Result<number>>;
}

// ============================================================================
// ALLOCATION TYPES
// ============================================================================

export interface CreateAllocationData {
  userId: string;
  month: number;
  year: number;
  essentialExpenses: number;
  debtPayments: number;
  emergencyFund: number;
  goalSavings: number;
  investments: number;
  discretionary: number;
  totalIncome: number;
  totalAllocated: number;
  isActive?: boolean;
}

export interface UpdateAllocationData {
  essentialExpenses?: number;
  debtPayments?: number;
  emergencyFund?: number;
  goalSavings?: number;
  investments?: number;
  discretionary?: number;
  totalIncome?: number;
  totalAllocated?: number;
  isActive?: boolean;
}

export interface IAllocationRepository {
  create(data: CreateAllocationData, tx?: TransactionClient): Promise<Result<Allocation>>;
  upsert(data: CreateAllocationData, tx?: TransactionClient): Promise<Result<Allocation>>;
  findById(id: string, tx?: TransactionClient): Promise<Result<Allocation | null>>;
  findByUserId(userId: string, tx?: TransactionClient): Promise<Result<Allocation[]>>;
  findByMonth(userId: string, month: number, year: number, tx?: TransactionClient): Promise<Result<Allocation | null>>;
  findRecent(userId: string, count: number, tx?: TransactionClient): Promise<Result<Allocation[]>>;
  update(id: string, data: UpdateAllocationData, tx?: TransactionClient): Promise<Result<Allocation>>;
}

// ============================================================================
// CONVERSATION TYPES
// ============================================================================

export interface CreateConversationData {
  userId: string;
  title?: string | null;
}

export interface UpdateConversationData {
  title?: string | null;
}

export interface CreateMessageData {
  conversationId: string;
  role: MessageRole;
  content: string;
  metadata?: Record<string, unknown> | null;
}

export type ConversationWithMessages = Conversation & { messages: Message[] };

export interface IConversationRepository {
  create(data: CreateConversationData, tx?: TransactionClient): Promise<Result<Conversation>>;
  createMessage(data: CreateMessageData, tx?: TransactionClient): Promise<Result<Message>>;
  findById(id: string, tx?: TransactionClient): Promise<Result<Conversation | null>>;
  findByUserId(userId: string, tx?: TransactionClient): Promise<Result<Conversation[]>>;
  findWithMessages(id: string, tx?: TransactionClient): Promise<Result<ConversationWithMessages | null>>;
  update(id: string, data: UpdateConversationData, tx?: TransactionClient): Promise<Result<Conversation>>;
  delete(id: string, tx?: TransactionClient): Promise<Result<Conversation>>;
}

// ============================================================================
// SIMULATION TYPES
// ============================================================================

export interface CreateSimulationData {
  userId: string;
  type: SimulationType;
  parameters: Record<string, unknown>;
  results: Record<string, unknown>;
  title?: string | null;
  description?: string | null;
}

export interface SimulationFilter {
  userId: string;
  type?: SimulationType | SimulationType[];
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface ISimulationRepository {
  create(data: CreateSimulationData, tx?: TransactionClient): Promise<Result<Simulation>>;
  findById(id: string, tx?: TransactionClient): Promise<Result<Simulation | null>>;
  findByUserId(userId: string, tx?: TransactionClient): Promise<Result<Simulation[]>>;
  findByType(userId: string, type: SimulationType, tx?: TransactionClient): Promise<Result<Simulation[]>>;
  findRecent(userId: string, limit: number, tx?: TransactionClient): Promise<Result<Simulation[]>>;
  delete(id: string, tx?: TransactionClient): Promise<Result<Simulation>>;
}
