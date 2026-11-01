/**
 * Common types used across all financial engines
 */

export type Frequency = 
  | 'DAILY' 
  | 'WEEKLY' 
  | 'BIWEEKLY' 
  | 'MONTHLY' 
  | 'QUARTERLY' 
  | 'ANNUAL' 
  | 'ONE_TIME';

export type Priority = 'HIGH' | 'MEDIUM' | 'LOW';

export type RiskTolerance = 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';

export type GoalStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

export type DebtStatus = 'ACTIVE' | 'PAID_OFF' | 'DEFAULTED';

export type GoalType = 
  | 'EMERGENCY_FUND'
  | 'HOUSE'
  | 'CAR'
  | 'VACATION'
  | 'WEDDING'
  | 'EDUCATION'
  | 'RETIREMENT'
  | 'CUSTOM';

export type ExpenseCategory =
  | 'RENT'
  | 'UTILITIES'
  | 'GROCERIES'
  | 'TRANSPORTATION'
  | 'HEALTHCARE'
  | 'INSURANCE'
  | 'ENTERTAINMENT'
  | 'DINING'
  | 'SHOPPING'
  | 'EDUCATION'
  | 'OTHER';

export type DebtType =
  | 'HOME_LOAN'
  | 'CAR_LOAN'
  | 'PERSONAL_LOAN'
  | 'EDUCATION_LOAN'
  | 'CREDIT_CARD'
  | 'OTHER';

export interface ConfidenceFactor {
  name: string;
  impact: number;
  reason: string;
  category: 'data_quality' | 'income' | 'financial_health' | 'goal' | 'purchase' | 'debt';
}

export interface ConfidenceScore {
  value: number;
  level: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  factors: ConfidenceFactor[];
  summary: string;
}
