/**
 * Zod validation schemas for all public API inputs
 * Provides runtime type safety at package boundaries
 */

import { z } from 'zod';

/**
 * Common validation schemas
 */
export const PositiveNumberSchema = z.number().positive();
export const NonNegativeNumberSchema = z.number().min(0);
export const PercentageSchema = z.number().min(0).max(100);
export const MonthSchema = z.number().int().min(1).max(12);
export const YearSchema = z.number().int().min(2020).max(2100);
export const UTCDateStringSchema = z.string().datetime();

/**
 * Shared type schemas
 */
export const FrequencySchema = z.enum([
  'DAILY',
  'WEEKLY',
  'BIWEEKLY',
  'MONTHLY',
  'QUARTERLY',
  'ANNUAL',
  'ONE_TIME'
]);

export const PrioritySchema = z.enum(['HIGH', 'MEDIUM', 'LOW']);

export const GoalStatusSchema = z.enum(['ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED']);

export const DebtStatusSchema = z.enum(['ACTIVE', 'PAID_OFF', 'DEFAULTED']);

export const RiskToleranceSchema = z.enum(['CONSERVATIVE', 'MODERATE', 'AGGRESSIVE']);

/**
 * Financial entity schemas
 */
// Allocation domain debt schema
export const DebtItemSchema = z.object({
  minimumPayment: NonNegativeNumberSchema,
  status: DebtStatusSchema
});

// Loan domain debt schema
export const ExistingDebtSchema = z.object({
  id: z.string().optional(),
  balance: NonNegativeNumberSchema.optional(),
  monthlyPayment: NonNegativeNumberSchema,
  status: DebtStatusSchema
});

export const ExpenseItemSchema = z.object({
  amount: NonNegativeNumberSchema,
  frequency: FrequencySchema,
  isActive: z.boolean()
});

export const GoalItemSchema = z.object({
  id: z.string(),
  targetAmount: PositiveNumberSchema,
  currentAmount: NonNegativeNumberSchema,
  targetDate: UTCDateStringSchema,
  priority: PrioritySchema,
  status: GoalStatusSchema
});

/**
 * Loan domain schemas
 */
export const CalculateEMIInputSchema = z.object({
  principal: PositiveNumberSchema.max(1000000000, 'Principal cannot exceed 100 crore'),
  annualInterestRate: PercentageSchema.max(50, 'Interest rate cannot exceed 50%'),
  tenureMonths: z.number().int().min(1).max(360, 'Tenure must be between 1 and 360 months')
});

export const LoanSimulationInputSchema = z.object({
  principal: PositiveNumberSchema.max(1000000000),
  annualInterestRate: PercentageSchema.max(50),
  tenureMonths: z.number().int().min(1).max(360),
  monthlyIncome: PositiveNumberSchema,
  monthlyExpenses: NonNegativeNumberSchema,
  existingDebts: z.array(ExistingDebtSchema)
}).refine(
  (data) => data.monthlyExpenses < data.monthlyIncome,
  { message: 'Monthly expenses cannot exceed monthly income' }
);

/**
 * Allocation domain schemas
 */
export const AllocationInputSchema = z.object({
  userId: z.string(),
  month: MonthSchema,
  year: YearSchema,
  monthlyIncome: PositiveNumberSchema,
  otherIncome: NonNegativeNumberSchema.optional().default(0),
  essentialExpenses: z.array(ExpenseItemSchema),
  discretionaryExpenses: z.array(ExpenseItemSchema),
  debts: z.array(DebtItemSchema),
  emergencyFundTarget: NonNegativeNumberSchema,
  currentEmergencyFund: NonNegativeNumberSchema,
  goals: z.array(GoalItemSchema),
  riskTolerance: RiskToleranceSchema
}).refine(
  (data) => data.currentEmergencyFund <= data.emergencyFundTarget,
  { message: 'Current emergency fund cannot exceed target' }
);

/**
 * Goal domain schemas
 */
export const GoalProjectionInputSchema = z.object({
  goal: z.object({
    id: z.string(),
    targetAmount: PositiveNumberSchema,
    currentAmount: NonNegativeNumberSchema,
    targetDate: UTCDateStringSchema,
    priority: PrioritySchema
  }),
  monthlyIncome: PositiveNumberSchema,
  monthlyExpenses: NonNegativeNumberSchema,
  otherGoalCommitments: NonNegativeNumberSchema,
  emergencyFundStatus: z.enum(['MET', 'NOT_MET'])
}).refine(
  (data) => data.monthlyExpenses < data.monthlyIncome,
  { message: 'Monthly expenses cannot exceed monthly income' }
).refine(
  (data) => data.goal.currentAmount <= data.goal.targetAmount,
  { message: 'Current amount cannot exceed target amount' }
);

/**
 * Purchase domain schemas
 */
export const PurchaseSimulationInputSchema = z.object({
  purchaseAmount: PositiveNumberSchema,
  itemName: z.string().optional(),
  currentSavings: NonNegativeNumberSchema,
  emergencyFundTarget: NonNegativeNumberSchema,
  currentEmergencyFund: NonNegativeNumberSchema,
  monthlyIncome: PositiveNumberSchema,
  monthlyExpenses: NonNegativeNumberSchema,
  activeGoals: z.array(GoalItemSchema),
  existingDebts: z.array(DebtItemSchema)
}).refine(
  (data) => data.monthlyExpenses < data.monthlyIncome,
  { message: 'Monthly expenses cannot exceed monthly income' }
).refine(
  (data) => data.currentEmergencyFund <= data.emergencyFundTarget,
  { message: 'Current emergency fund cannot exceed target' }
);

/**
 * Forecast domain schemas
 */
export const CashFlowProjectionInputSchema = z.object({
  startDate: UTCDateStringSchema,
  months: z.number().int().min(1).max(60, 'Projection cannot exceed 60 months'),
  currentBalance: NonNegativeNumberSchema,
  monthlyIncome: PositiveNumberSchema,
  expenses: z.array(ExpenseItemSchema),
  debts: z.array(DebtItemSchema),
  goals: z.array(GoalItemSchema),
  allocation: z.object({
    essentialExpenses: NonNegativeNumberSchema,
    debtPayments: NonNegativeNumberSchema,
    emergencyFund: NonNegativeNumberSchema,
    goalSavings: NonNegativeNumberSchema,
    investments: NonNegativeNumberSchema,
    discretionary: NonNegativeNumberSchema,
    goalAllocations: z.record(z.string(), NonNegativeNumberSchema)
  })
});

/**
 * Confidence domain schemas
 */
export const ConfidenceInputSchema = z.object({
  predictionType: z.enum(['GOAL', 'PURCHASE', 'LOAN', 'ALLOCATION', 'FORECAST']),
  profileCompleteness: PercentageSchema,
  incomeStability: z.enum(['STABLE', 'VARIABLE', 'UNKNOWN']),
  expenseHistoryMonths: NonNegativeNumberSchema,
  emergencyFundStatus: z.enum(['MET', 'NOT_MET', 'UNKNOWN']),
  debtToIncomeRatio: PercentageSchema,
  dataRecencyDays: NonNegativeNumberSchema,
  timelineMonths: NonNegativeNumberSchema.optional(),
  utilizationRatio: NonNegativeNumberSchema.optional(),
  purchaseToIncomeRatio: NonNegativeNumberSchema.optional()
});

/**
 * Financial Health domain schemas
 */
export const FinancialHealthInputSchema = z.object({
  monthlyIncome: PositiveNumberSchema,
  monthlyExpenses: NonNegativeNumberSchema,
  currentSavings: NonNegativeNumberSchema,
  emergencyFundTarget: NonNegativeNumberSchema,
  currentEmergencyFund: NonNegativeNumberSchema,
  totalDebtBalance: NonNegativeNumberSchema,
  monthlyDebtPayments: NonNegativeNumberSchema,
  activeGoalsCount: z.number().int().min(0),
  goalsOnTrack: z.number().int().min(0),
  allocation: z.any().optional()
}).refine(
  (data) => data.monthlyExpenses < data.monthlyIncome,
  { message: 'Monthly expenses cannot exceed monthly income' }
).refine(
  (data) => data.currentEmergencyFund <= data.emergencyFundTarget,
  { message: 'Current emergency fund cannot exceed target' }
).refine(
  (data) => data.goalsOnTrack <= data.activeGoalsCount,
  { message: 'Goals on track cannot exceed active goals count' }
);
