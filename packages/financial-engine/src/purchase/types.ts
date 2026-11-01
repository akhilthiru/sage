/**
 * Purchase domain types
 */

import type { ConfidenceScore } from '../shared/types';
import type { GoalItem } from '../allocation/types';

export interface PurchaseDebt {
  minimumPayment: number;
  status: 'ACTIVE' | 'PAID_OFF' | 'DEFAULTED';
}

export type ScenarioType = 'BUY_FROM_SAVINGS' | 'LOAN_EMI' | 'SAVE_FIRST';

export interface PurchaseSimulationInput {
  purchaseAmount: number;
  itemName?: string;
  
  currentSavings: number;
  emergencyFundTarget: number;
  currentEmergencyFund: number;
  
  monthlyIncome: number;
  monthlyExpenses: number;
  
  activeGoals: GoalItem[];
  existingDebts: PurchaseDebt[];
}

export interface PurchaseScenario {
  type: ScenarioType;
  isViable: boolean;
  
  immediateImpact: {
    newSavings: number;
    newEmergencyFund: number;
    emergencyFundImpact?: number;
  };
  
  monthlyImpact: number;
  totalCost: number;
  timeline: number;
  
  goalImpacts?: GoalImpact[];
  
  pros: string[];
  cons: string[];
  recommendation: boolean;
  
  emi?: number;
  tenure?: number;
  totalInterest?: number;
  debtToIncomeRatio?: number;
}

export interface GoalImpact {
  goalId: string;
  goalName: string;
  delayMonths: number;
}

export interface PurchaseSimulationResult {
  purchaseAmount: number;
  itemName?: string;
  
  scenarios: PurchaseScenario[];
  recommended: ScenarioType | 'NONE';
  canAfford: boolean;
  
  confidence: ConfidenceScore;
}
