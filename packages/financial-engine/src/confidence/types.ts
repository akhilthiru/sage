/**
 * Confidence domain types
 */

export type PredictionType = 'GOAL' | 'PURCHASE' | 'LOAN' | 'ALLOCATION' | 'FORECAST';

export type IncomeStability = 'STABLE' | 'VARIABLE' | 'UNKNOWN';

export type EmergencyFundStatus = 'MET' | 'NOT_MET' | 'UNKNOWN';

export interface ConfidenceInput {
  predictionType: PredictionType;
  
  profileCompleteness: number;
  incomeStability: IncomeStability;
  expenseHistoryMonths: number;
  emergencyFundStatus: EmergencyFundStatus;
  debtToIncomeRatio: number;
  dataRecencyDays: number;
  
  timelineMonths?: number;
  utilizationRatio?: number;
  purchaseToIncomeRatio?: number;
}
