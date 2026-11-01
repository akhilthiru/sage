/**
 * Financial calculation constants
 * All values are based on Indian financial best practices
 */

export const FINANCIAL_CONSTANTS = {
  // Allocation percentages
  ESSENTIAL_EXPENSES_MAX: 0.50, // 50% max of income
  EMERGENCY_FUND_ALLOCATION: 0.20, // 20% of surplus
  
  // Investment allocation by risk tolerance
  INVESTMENT_ALLOCATION: {
    CONSERVATIVE: 0.30,
    MODERATE: 0.50,
    AGGRESSIVE: 0.70
  },
  
  // Debt-to-income thresholds
  DTI_COMFORTABLE: 0.30, // 30% or less
  DTI_MANAGEABLE: 0.40, // 40% or less
  DTI_RISKY: 0.50, // 50% or less
  
  // Emergency fund
  EMERGENCY_FUND_MONTHS_MIN: 3,
  EMERGENCY_FUND_MONTHS_TARGET: 6,
  
  // Feasibility thresholds
  UTILIZATION_COMFORTABLE: 0.50, // Using 50% or less of available
  UTILIZATION_TIGHT: 0.80, // Using 80% or less
  UTILIZATION_VERY_TIGHT: 1.00, // Using 100%
  
  // Default loan parameters
  DEFAULT_LOAN_RATE: 12, // 12% annual
  DEFAULT_LOAN_TENURE: 12, // 12 months
  
  // Confidence score thresholds
  CONFIDENCE_VERY_HIGH: 90,
  CONFIDENCE_HIGH: 70,
  CONFIDENCE_MEDIUM: 50,
  CONFIDENCE_LOW: 30,
  
  // Financial health score thresholds
  HEALTH_EXCELLENT: 90, // A grade
  HEALTH_GOOD: 75, // B grade
  HEALTH_FAIR: 60, // C grade
  HEALTH_POOR: 40, // D grade
  
  // Surplus allocation percentages (after essentials and debts)
  SURPLUS_EMERGENCY_FUND: 0.20, // 20% to emergency fund
  SURPLUS_GOALS: 0.60, // 60% to goals
  SURPLUS_INVESTMENTS: 0.15, // 15% to investments
  SURPLUS_DISCRETIONARY: 0.05 // 5% discretionary
} as const;
