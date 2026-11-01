/**
 * Forecast domain types
 */

import type { AllocationResult } from '../allocation/types';
import type { ExpenseItem, DebtItem, GoalItem } from '../allocation/types';

export interface CashFlowProjectionInput {
  startDate: string;
  months: number;
  
  currentBalance: number;
  monthlyIncome: number;
  
  expenses: ExpenseItem[];
  debts: DebtItem[];
  goals: GoalItem[];
  
  allocation: AllocationResult;
}

export interface MonthlyProjection {
  month: number;
  date: string;
  
  openingBalance: number;
  income: number;
  expenses: number;
  savings: number;
  closingBalance: number;
  
  emergencyFund: number;
  goalProgress: Record<string, number>;
  debtBalances: Record<string, number>;
}

export interface CashFlowProjectionResult {
  projections: MonthlyProjection[];
  
  summary: {
    finalBalance: number;
    totalIncome: number;
    totalExpenses: number;
    totalSavings: number;
    goalsCompleted: string[];
    debtsCleared: string[];
  };
}
