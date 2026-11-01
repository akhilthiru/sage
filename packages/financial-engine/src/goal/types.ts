/**
 * Goal domain types
 */

import type { ConfidenceScore } from '../shared/types';

export interface GoalProjectionInput {
  goal: {
    id: string;
    targetAmount: number;
    currentAmount: number;
    targetDate: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
  };
  
  monthlyIncome: number;
  monthlyExpenses: number;
  otherGoalCommitments: number;
  
  emergencyFundStatus: 'MET' | 'NOT_MET';
}

export interface GoalProjectionResult {
  isFeasible: boolean;
  feasibilityScore: number;
  
  monthsRemaining: number;
  projectedCompletionDate: string;
  delayMonths: number;
  
  requiredMonthly: number;
  availableMonthly: number;
  utilizationRatio: number;
  
  recommendations: string[];
  
  confidence: ConfidenceScore;
}
