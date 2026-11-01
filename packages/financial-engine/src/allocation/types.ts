/**
 * Allocation domain types
 */

import type { Frequency, Priority, GoalStatus, RiskTolerance } from '../shared/types';

export interface ExpenseItem {
  amount: number;
  frequency: Frequency;
  isActive: boolean;
}

export interface DebtItem {
  minimumPayment: number;
  status: 'ACTIVE' | 'PAID_OFF' | 'DEFAULTED';
}

export interface GoalItem {
  id: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  priority: Priority;
  status: GoalStatus;
}

export interface AllocationInput {
  userId: string;
  month: number;
  year: number;
  monthlyIncome: number;
  otherIncome?: number;
  
  essentialExpenses: ExpenseItem[];
  discretionaryExpenses: ExpenseItem[];
  debts: DebtItem[];
  
  emergencyFundTarget: number;
  currentEmergencyFund: number;
  
  goals: GoalItem[];
  riskTolerance: RiskTolerance;
}

export interface AllocationResult {
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
  
  goalAllocations: Record<string, number>;
  
  warning?: 'INCOME_INSUFFICIENT' | 'DEBT_PAYMENTS_INSUFFICIENT';
  warningMessage?: string;
  shortfall?: number;
}
