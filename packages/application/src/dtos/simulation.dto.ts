import { z } from 'zod';
import { AllocationDTO } from './allocation.dto';

export type SimulationType = 'PURCHASE' | 'LOAN' | 'GOAL_TIMELINE' | 'INCOME_CHANGE';

export interface SimulationDTO {
  readonly id: string;
  readonly userId: string;
  readonly type: SimulationType;
  readonly parameters: Record<string, unknown>;
  readonly results: Record<string, unknown>;
  readonly createdAt: Date;
}

export const SimulatePurchaseSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  purchaseAmount: z.number().positive('Purchase amount must be positive'),
  purchaseName: z.string().trim().min(1, 'Purchase name is required'),
  conversationId: z.string().optional(),
});

export type SimulatePurchaseRequest = z.infer<typeof SimulatePurchaseSchema>;

export interface SimulatePurchaseResponse {
  readonly simulationId: string;
  readonly canAfford: boolean;
  readonly impact: {
    readonly savingsReduction: number;
    readonly monthsToRecover: number;
    readonly goalDelays: Array<{
      readonly goalId: string;
      readonly goalName: string;
      readonly delayMonths: number;
    }>;
  };
  readonly alternatives: string[];
  readonly recommendation: string;
}

export const SimulateLoanSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  loanAmount: z.number().positive('Loan amount must be positive'),
  interestRate: z.number().min(0, 'Interest rate cannot be negative').max(100, 'Interest rate cannot exceed 100%'),
  termMonths: z.number().int().positive('Term must be at least 1 month'),
  purpose: z.string().trim().min(1).default('PERSONAL'),
});

export type SimulateLoanRequest = z.infer<typeof SimulateLoanSchema>;

export interface SimulateLoanResponse {
  readonly simulationId: string;
  readonly monthlyPayment: number;
  readonly totalInterest: number;
  readonly totalCost: number;
  readonly affordability: 'AFFORDABLE' | 'TIGHT' | 'UNAFFORDABLE';
  readonly impact: {
    readonly newAllocation: AllocationDTO;
    readonly debtToIncomeRatio: number;
    readonly goalDelays: Array<{
      readonly goalId: string;
      readonly goalName: string;
      readonly delayMonths: number;
    }>;
  };
  readonly recommendation: string;
}

export const ProjectGoalTimelineSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  goalId: z.string().min(1, 'Goal ID is required'),
  monthlyContribution: z.number().positive().optional(),
});

export type ProjectGoalTimelineRequest = z.infer<typeof ProjectGoalTimelineSchema>;

export interface ProjectGoalTimelineResponse {
  readonly simulationId: string;
  readonly goalId: string;
  readonly projectedCompletionDate: Date;
  readonly monthsToComplete: number;
  readonly confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  readonly milestones: Array<{
    readonly month: number;
    readonly amount: number;
    readonly percentage: number;
  }>;
}
