/**
 * Calculate confidence score for financial predictions
 * 
 * Based on data quality factors:
 * - Profile completeness
 * - Income stability
 * - Expense history
 * - Emergency fund status
 * - Debt load
 * - Data recency
 * 
 * @deterministic This function is deterministic. Same inputs always produce the same output.
 */

import { clamp, roundToTwo } from '../shared/utils/math-utils';
import { ConfidenceInputSchema } from '../shared/validation';
import { success, failure, validationError } from '../shared/types/result';
import type { ConfidenceInput } from './types';
import type { ConfidenceScore, ConfidenceFactor } from '../shared/types';
import type { Result } from '../shared/types';

/**
 * Calculate confidence score for a prediction
 * 
 * @param input - Confidence calculation parameters
 * @returns Result containing confidence score or validation error
 * 
 * @example
 * const result = calculateConfidence({
 *   predictionType: 'GOAL',
 *   profileCompleteness: 85,
 *   incomeStability: 'STABLE',
 *   expenseHistoryMonths: 12,
 *   emergencyFundStatus: 'MET',
 *   debtToIncomeRatio: 25,
 *   dataRecencyDays: 5,
 *   timelineMonths: 24
 * });
 * if (result.success) {
 *   console.log(result.data.value, result.data.level);
 * }
 */
export function calculateConfidence(input: ConfidenceInput): Result<ConfidenceScore> {
  // Runtime validation with Zod
  const validation = ConfidenceInputSchema.safeParse(input);
  
  if (!validation.success) {
    const firstError = validation.error.errors[0];
    return failure(validationError(
      firstError?.message || 'Invalid input',
      firstError?.path.join('.') || undefined
    ));
  }
  
  const validatedInput = validation.data;
  
  const factors: ConfidenceFactor[] = [];
  let baseScore = 50;
  
  // Factor 1: Profile Completeness (-20 to +20)
  const profileFactor = calculateProfileCompleteness(validatedInput.profileCompleteness);
  factors.push(profileFactor);
  baseScore += profileFactor.impact;
  
  // Factor 2: Income Stability (-15 to +15)
  const incomeFactor = calculateIncomeStability(validatedInput.incomeStability);
  factors.push(incomeFactor);
  baseScore += incomeFactor.impact;
  
  // Factor 3: Emergency Fund Status (-15 to +15)
  const emergencyFactor = calculateEmergencyFundStatus(validatedInput.emergencyFundStatus);
  factors.push(emergencyFactor);
  baseScore += emergencyFactor.impact;
  
  // Factor 4: Debt Load (-15 to +10)
  const debtFactor = calculateDebtLoad(validatedInput.debtToIncomeRatio);
  factors.push(debtFactor);
  baseScore += debtFactor.impact;
  
  // Factor 5: Expense History (-10 to +10)
  const expenseFactor = calculateExpenseHistory(validatedInput.expenseHistoryMonths);
  factors.push(expenseFactor);
  baseScore += expenseFactor.impact;
  
  // Factor 6: Data Recency (-10 to +5)
  const recencyFactor = calculateDataRecency(validatedInput.dataRecencyDays);
  factors.push(recencyFactor);
  baseScore += recencyFactor.impact;
  
  // Prediction-specific factors
  if (validatedInput.predictionType === 'GOAL' && validatedInput.timelineMonths !== undefined) {
    const timelineFactor = calculateTimelineFactor(validatedInput.timelineMonths);
    factors.push(timelineFactor);
    baseScore += timelineFactor.impact;
  }
  
  if (validatedInput.predictionType === 'PURCHASE' && validatedInput.purchaseToIncomeRatio !== undefined) {
    const purchaseFactor = calculatePurchaseFactor(validatedInput.purchaseToIncomeRatio);
    factors.push(purchaseFactor);
    baseScore += purchaseFactor.impact;
  }
  
  const finalScore = clamp(baseScore, 0, 100);
  
  return success({
    value: roundToTwo(finalScore),
    level: getConfidenceLevel(finalScore),
    factors,
    summary: generateSummary(finalScore, factors)
  });
}

function calculateProfileCompleteness(score: number): ConfidenceFactor {
  let impact: number;
  if (score >= 90) impact = 20;
  else if (score >= 70) impact = 10;
  else if (score >= 50) impact = 0;
  else if (score >= 30) impact = -10;
  else impact = -20;
  
  return {
    name: 'Profile Completeness',
    impact,
    reason: `Profile ${score}% complete`,
    category: 'data_quality'
  };
}

function calculateIncomeStability(stability: string): ConfidenceFactor {
  const impacts: Record<string, number> = {
    STABLE: 15,
    VARIABLE: -10,
    UNKNOWN: -15
  };
  
  return {
    name: 'Income Stability',
    impact: impacts[stability] || 0,
    reason: `Income is ${stability.toLowerCase()}`,
    category: 'income'
  };
}

function calculateEmergencyFundStatus(status: string): ConfidenceFactor {
  const impacts: Record<string, number> = {
    MET: 15,
    NOT_MET: -10,
    UNKNOWN: -15
  };
  
  return {
    name: 'Emergency Fund',
    impact: impacts[status] || 0,
    reason: status === 'MET' ? 'Emergency fund adequate' : 'Emergency fund insufficient',
    category: 'financial_health'
  };
}

function calculateDebtLoad(dti: number): ConfidenceFactor {
  let impact: number;
  if (dti <= 20) impact = 10;
  else if (dti <= 30) impact = 5;
  else if (dti <= 40) impact = 0;
  else if (dti <= 50) impact = -10;
  else impact = -15;
  
  return {
    name: 'Debt Load',
    impact,
    reason: `Debt-to-income ratio: ${dti.toFixed(1)}%`,
    category: 'debt'
  };
}

function calculateExpenseHistory(months: number): ConfidenceFactor {
  let impact: number;
  if (months >= 12) impact = 10;
  else if (months >= 6) impact = 5;
  else if (months >= 3) impact = 0;
  else impact = -10;
  
  return {
    name: 'Expense History',
    impact,
    reason: `${months} months of expense data`,
    category: 'data_quality'
  };
}

function calculateDataRecency(days: number): ConfidenceFactor {
  let impact: number;
  if (days <= 7) impact = 5;
  else if (days <= 30) impact = 0;
  else if (days <= 90) impact = -5;
  else impact = -10;
  
  return {
    name: 'Data Recency',
    impact,
    reason: `Data updated ${days} days ago`,
    category: 'data_quality'
  };
}

function calculateTimelineFactor(months: number): ConfidenceFactor {
  let impact: number;
  if (months <= 12) impact = 5;
  else if (months <= 24) impact = 0;
  else impact = -5;
  
  return {
    name: 'Timeline Length',
    impact,
    reason: `Goal timeline: ${months} months`,
    category: 'goal'
  };
}

function calculatePurchaseFactor(ratio: number): ConfidenceFactor {
  let impact: number;
  if (ratio <= 100) impact = 5;
  else if (ratio <= 200) impact = 0;
  else impact = -5;
  
  return {
    name: 'Purchase Size',
    impact,
    reason: `Purchase is ${ratio.toFixed(0)}% of monthly income`,
    category: 'purchase'
  };
}

function getConfidenceLevel(score: number): 'very_low' | 'low' | 'medium' | 'high' | 'very_high' {
  if (score >= 90) return 'very_high';
  if (score >= 70) return 'high';
  if (score >= 50) return 'medium';
  if (score >= 30) return 'low';
  return 'very_low';
}

function generateSummary(score: number, factors: ConfidenceFactor[]): string {
  const level = getConfidenceLevel(score);
  const positiveFactors = factors.filter(f => f.impact > 0).length;
  const negativeFactors = factors.filter(f => f.impact < 0).length;
  
  const levelDescriptions: Record<string, string> = {
    very_high: `Very high confidence (${score}/100). ${positiveFactors} positive factors support this prediction.`,
    high: `High confidence (${score}/100). Prediction is reliable with current data.`,
    medium: `Medium confidence (${score}/100). Prediction is reasonable but has some uncertainties.`,
    low: `Low confidence (${score}/100). ${negativeFactors} factors reduce reliability.`,
    very_low: `Very low confidence (${score}/100). Insufficient data for reliable prediction.`
  };
  
  return levelDescriptions[level] || `Confidence: ${score}/100`;
}

// Validation now handled by Zod schema
