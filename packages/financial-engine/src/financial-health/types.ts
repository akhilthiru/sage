/**
 * Financial Health domain types
 */

import type { AllocationResult } from '../allocation/types';

export type HealthGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export type HealthLevel = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL';

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface FinancialHealthInput {
  monthlyIncome: number;
  monthlyExpenses: number;
  
  currentSavings: number;
  emergencyFundTarget: number;
  currentEmergencyFund: number;
  
  totalDebtBalance: number;
  monthlyDebtPayments: number;
  
  activeGoalsCount: number;
  goalsOnTrack: number;
  
  allocation?: AllocationResult;
}

export interface HealthMetrics {
  debtToIncomeRatio: number;
  savingsRate: number;
  emergencyFundMonths: number;
  expenseRatio: number;
  goalProgressRate: number;
}

export interface HealthRecommendation {
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  category: 'DEBT' | 'SAVINGS' | 'EXPENSES' | 'GOALS' | 'EMERGENCY_FUND';
  recommendation: string;
  impact: string;
}

export interface FinancialHealthResult {
  score: number;
  grade: HealthGrade;
  level: HealthLevel;
  
  metrics: HealthMetrics;
  
  riskLevel: RiskLevel;
  riskFactors: string[];
  
  recommendations: HealthRecommendation[];
  
  strengths: string[];
  weaknesses: string[];
}
