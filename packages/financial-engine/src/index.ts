/**
 * @sage/financial-engine
 * 
 * Deterministic financial calculation engine for Sage AI Personal CFO
 * 
 * Core Principle: AI explains. Engine calculates.
 * 
 * All functions are:
 * - Pure (no side effects)
 * - Deterministic (same input = same output)
 * - Stateless (no internal state)
 * - Synchronous (no async operations)
 * - Framework agnostic (runs anywhere)
 */

// Loan Domain
export { calculateEMI, generateAmortization, simulateLoan } from './loan';
export type { 
  EMIResult, 
  AmortizationEntry, 
  LoanSimulationResult,
  LoanSimulationInput,
  Affordability
} from './loan/types';

// Allocation Domain
export { calculateAllocation } from './allocation';
export type {
  AllocationInput,
  AllocationResult,
  ExpenseItem,
  DebtItem,
  GoalItem
} from './allocation/types';

// Goal Domain
export { projectGoalTimeline } from './goal';
export type {
  GoalProjectionInput,
  GoalProjectionResult
} from './goal/types';

// Purchase Domain
export { simulatePurchase } from './purchase';
export type {
  PurchaseSimulationInput,
  PurchaseSimulationResult,
  PurchaseScenario,
  ScenarioType
} from './purchase/types';

// Forecast Domain
export { forecastCashFlow } from './forecast';
export type {
  CashFlowProjectionInput,
  CashFlowProjectionResult,
  MonthlyProjection
} from './forecast/types';

// Confidence Domain
export { calculateConfidence } from './confidence';
export type {
  ConfidenceInput,
  PredictionType,
  IncomeStability,
  EmergencyFundStatus
} from './confidence/types';

// Financial Health Domain
export { calculateFinancialHealth } from './financial-health';
export type {
  FinancialHealthInput,
  FinancialHealthResult,
  HealthMetrics,
  HealthGrade,
  HealthLevel,
  RiskLevel,
  HealthRecommendation
} from './financial-health/types';

// Shared Types
export type {
  Frequency,
  Priority,
  RiskTolerance,
  GoalStatus,
  DebtStatus,
  GoalType,
  ExpenseCategory,
  DebtType,
  ConfidenceFactor,
  ConfidenceScore
} from './shared/types';

// Shared Utilities
export {
  roundToTwo,
  roundToNearest,
  clamp,
  percentage,
  roundToDecimal,
  monthsBetween,
  addMonths,
  isFutureDate,
  isPastDate,
  parseISODate,
  toISOString,
  normalizeToMonthly,
  convertFromMonthly,
  getAnnualMultiplier
} from './shared/utils';

// Constants
export { FINANCIAL_CONSTANTS } from './shared/constants';
