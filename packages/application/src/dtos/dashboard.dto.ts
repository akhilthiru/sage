import { z } from 'zod';
import { AllocationDTO } from './allocation.dto';
import { GoalSummaryDTO } from './goal.dto';
import { ExpenseSummaryDTO } from './expense.dto';
import { DebtSummaryDTO } from './debt.dto';

export type HealthStatus = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';

export interface FinancialHealthFactorsDTO {
  readonly incomeStability: number;
  readonly debtToIncome: number;
  readonly savingsRate: number;
  readonly emergencyFund: number;
}

export interface FinancialHealthDTO {
  readonly score: number;
  readonly status: HealthStatus;
  readonly grade: string;
  readonly factors: FinancialHealthFactorsDTO;
  readonly recommendations: string[];
}

export interface DashboardGoalsSummaryDTO {
  readonly totalGoals: number;
  readonly onTrack: number;
  readonly atRisk: number;
  readonly totalProgress: number;
}

export interface DashboardDTO {
  readonly userId: string;
  readonly financialHealth: FinancialHealthDTO;
  readonly allocation: AllocationDTO;
  readonly goals: {
    readonly active: GoalSummaryDTO[];
    readonly summary: DashboardGoalsSummaryDTO;
  };
  readonly expenses: {
    readonly recent: ExpenseSummaryDTO[];
    readonly monthlyTotal: number;
    readonly byCategory: Record<string, number>;
  };
  readonly debts: {
    readonly active: DebtSummaryDTO[];
    readonly totalBalance: number;
    readonly totalMonthlyPayment: number;
  };
  readonly insights: string[];
}

export const GenerateDashboardSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

export type GenerateDashboardRequest = z.infer<typeof GenerateDashboardSchema>;

export interface GenerateDashboardResponse {
  readonly dashboard: DashboardDTO;
}

export const CalculateFinancialHealthSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

export type CalculateFinancialHealthRequest = z.infer<typeof CalculateFinancialHealthSchema>;

export interface CalculateFinancialHealthResponse {
  readonly health: FinancialHealthDTO;
}
