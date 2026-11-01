/**
 * Project goal timeline and feasibility
 * 
 * Calculates whether a goal is achievable, when it will be completed,
 * and provides recommendations for improvement
 * 
 * @deterministic This function is deterministic. Same inputs always produce the same output.
 * 
 * Note: Uses UTC date handling for consistent timezone-independent calculations
 */

import { monthsBetween, addMonths, parseISODate, isPastDate, toISOString } from '../shared/utils/date-utils';
import { roundToTwo, clamp, percentage } from '../shared/utils/math-utils';
import { FINANCIAL_CONSTANTS } from '../shared/constants';
import { GoalProjectionInputSchema } from '../shared/validation';
import { success, failure, validationError } from '../shared/types/result';
import type { GoalProjectionInput, GoalProjectionResult } from './types';
import type { ConfidenceScore, ConfidenceFactor } from '../shared/types';
import type { Result } from '../shared/types';

/**
 * Project goal timeline and calculate feasibility
 * 
 * @param input - Goal projection parameters
 * @param currentDate - Current date for calculations (defaults to now)
 * @returns Result containing goal projection or validation error
 * 
 * @example
 * const result = projectGoalTimeline({
 *   goal: {
 *     id: 'goal_house',
 *     targetAmount: 500000,
 *     currentAmount: 150000,
 *     targetDate: '2026-12-31T00:00:00Z',
 *     priority: 'HIGH'
 *   },
 *   monthlyIncome: 80000,
 *   monthlyExpenses: 50000,
 *   otherGoalCommitments: 10000,
 *   emergencyFundStatus: 'MET'
 * });
 * if (result.success) {
 *   console.log(result.data.isFeasible, result.data.feasibilityScore);
 * }
 */
export function projectGoalTimeline(
  input: GoalProjectionInput,
  currentDate: Date = new Date()
): Result<GoalProjectionResult> {
  // Runtime validation with Zod
  const validation = GoalProjectionInputSchema.safeParse(input);
  
  if (!validation.success) {
    const firstError = validation.error.errors[0];
    return failure(validationError(
      firstError?.message || 'Invalid input',
      firstError?.path.join('.') || undefined
    ));
  }
  
  const validatedInput = validation.data;
  const { goal, monthlyIncome, monthlyExpenses, otherGoalCommitments, emergencyFundStatus } = validatedInput;
  
  const targetDate = parseISODate(goal.targetDate);
  
  // Check if target date is in past
  if (isPastDate(targetDate, currentDate)) {
    return createInfeasibleResult(goal, currentDate, 'Target date has passed');
  }
  
  // Check if goal already achieved
  if (goal.currentAmount >= goal.targetAmount) {
    return createAchievedResult(goal, currentDate);
  }
  
  // Calculate months remaining
  const monthsRemaining = monthsBetween(currentDate, targetDate);
  
  // Calculate amount remaining
  const amountRemaining = goal.targetAmount - goal.currentAmount;
  
  // Calculate required monthly savings
  const requiredMonthly = monthsRemaining > 0 
    ? roundToTwo(amountRemaining / monthsRemaining)
    : amountRemaining;
  
  // Calculate available monthly savings
  const availableMonthly = roundToTwo(
    Math.max(0, monthlyIncome - monthlyExpenses - otherGoalCommitments)
  );
  
  // Check if no funds available
  if (availableMonthly <= 0) {
    return createInfeasibleResult(
      goal,
      currentDate,
      'No funds available for this goal after expenses and other commitments'
    );
  }
  
  // Calculate utilization ratio
  const utilizationRatio = roundToTwo(requiredMonthly / availableMonthly);
  
  // Calculate feasibility
  const isFeasible = utilizationRatio <= 1.0;
  
  // Calculate feasibility score (0-100)
  const feasibilityScore = calculateFeasibilityScore(utilizationRatio, emergencyFundStatus);
  
  // Calculate projected completion
  const projectedMonths = Math.ceil(amountRemaining / availableMonthly);
  const projectedCompletionDate = addMonths(currentDate, projectedMonths);
  const delayMonths = Math.max(0, projectedMonths - monthsRemaining);
  
  // Generate recommendations
  const recommendations = generateRecommendations(
    utilizationRatio,
    availableMonthly,
    requiredMonthly,
    emergencyFundStatus,
    isFeasible
  );
  
  // Calculate confidence
  const confidence = calculateConfidence(
    utilizationRatio,
    monthsRemaining,
    emergencyFundStatus,
    availableMonthly,
    monthlyIncome
  );
  
  return success({
    isFeasible,
    feasibilityScore,
    monthsRemaining,
    projectedCompletionDate: toISOString(projectedCompletionDate),
    delayMonths,
    requiredMonthly,
    availableMonthly,
    utilizationRatio,
    recommendations,
    confidence
  });
}

// Validation now handled by Zod schema

/**
 * Calculate feasibility score (0-100)
 */
function calculateFeasibilityScore(
  utilizationRatio: number,
  emergencyFundStatus: 'MET' | 'NOT_MET'
): number {
  let score: number;
  
  if (utilizationRatio <= FINANCIAL_CONSTANTS.UTILIZATION_COMFORTABLE) {
    score = 100; // Comfortable
  } else if (utilizationRatio <= FINANCIAL_CONSTANTS.UTILIZATION_TIGHT) {
    // Linear scale from 100 to 70
    const range = FINANCIAL_CONSTANTS.UTILIZATION_TIGHT - FINANCIAL_CONSTANTS.UTILIZATION_COMFORTABLE;
    const position = utilizationRatio - FINANCIAL_CONSTANTS.UTILIZATION_COMFORTABLE;
    score = 100 - (position / range) * 30;
  } else if (utilizationRatio <= FINANCIAL_CONSTANTS.UTILIZATION_VERY_TIGHT) {
    // Linear scale from 70 to 30
    const range = FINANCIAL_CONSTANTS.UTILIZATION_VERY_TIGHT - FINANCIAL_CONSTANTS.UTILIZATION_TIGHT;
    const position = utilizationRatio - FINANCIAL_CONSTANTS.UTILIZATION_TIGHT;
    score = 70 - (position / range) * 40;
  } else {
    // Over 100% utilization
    score = 30 / utilizationRatio;
  }
  
  // Apply emergency fund penalty
  if (emergencyFundStatus === 'NOT_MET') {
    score *= 0.8; // 20% penalty
  }
  
  return roundToTwo(clamp(score, 0, 100));
}

/**
 * Generate recommendations based on feasibility
 */
function generateRecommendations(
  utilizationRatio: number,
  availableMonthly: number,
  requiredMonthly: number,
  emergencyFundStatus: 'MET' | 'NOT_MET',
  isFeasible: boolean
): string[] {
  const recommendations: string[] = [];
  
  if (!isFeasible) {
    const shortfall = roundToTwo(requiredMonthly - availableMonthly);
    recommendations.push(
      `Increase monthly savings by ${shortfall} to meet target date`
    );
    recommendations.push('Consider extending target date');
    recommendations.push('Reduce expenses to free up more funds');
  } else if (utilizationRatio > FINANCIAL_CONSTANTS.UTILIZATION_TIGHT) {
    recommendations.push('Goal is achievable but will be tight');
    recommendations.push('Consider building buffer by increasing savings');
  } else if (utilizationRatio > FINANCIAL_CONSTANTS.UTILIZATION_COMFORTABLE) {
    recommendations.push('Goal is on track with moderate effort');
    recommendations.push('Maintain current savings rate');
  } else {
    recommendations.push('Goal is comfortably achievable');
    recommendations.push('Consider advancing target date or increasing goal amount');
  }
  
  if (emergencyFundStatus === 'NOT_MET') {
    recommendations.push('Build emergency fund before focusing on this goal');
  }
  
  return recommendations;
}

/**
 * Calculate confidence score for goal projection
 */
function calculateConfidence(
  utilizationRatio: number,
  monthsRemaining: number,
  emergencyFundStatus: 'MET' | 'NOT_MET',
  availableMonthly: number,
  monthlyIncome: number
): ConfidenceScore {
  const factors: ConfidenceFactor[] = [];
  let baseScore = 50;
  
  // Factor 1: Utilization ratio
  if (utilizationRatio <= 0.5) {
    factors.push({
      name: 'Low Utilization',
      impact: 20,
      reason: 'Only using 50% or less of available funds',
      category: 'goal'
    });
    baseScore += 20;
  } else if (utilizationRatio <= 0.8) {
    factors.push({
      name: 'Moderate Utilization',
      impact: 10,
      reason: 'Using 50-80% of available funds',
      category: 'goal'
    });
    baseScore += 10;
  } else if (utilizationRatio > 1.0) {
    factors.push({
      name: 'Over-Utilization',
      impact: -20,
      reason: 'Requires more than available funds',
      category: 'goal'
    });
    baseScore -= 20;
  }
  
  // Factor 2: Timeline length
  if (monthsRemaining >= 24) {
    factors.push({
      name: 'Long Timeline',
      impact: -10,
      reason: 'Goal is 2+ years away, more uncertainty',
      category: 'goal'
    });
    baseScore -= 10;
  } else if (monthsRemaining >= 12) {
    factors.push({
      name: 'Medium Timeline',
      impact: 0,
      reason: 'Goal is 1-2 years away',
      category: 'goal'
    });
  } else {
    factors.push({
      name: 'Short Timeline',
      impact: 10,
      reason: 'Goal is less than 1 year away',
      category: 'goal'
    });
    baseScore += 10;
  }
  
  // Factor 3: Emergency fund status
  if (emergencyFundStatus === 'MET') {
    factors.push({
      name: 'Emergency Fund Met',
      impact: 15,
      reason: 'Financial safety net in place',
      category: 'financial_health'
    });
    baseScore += 15;
  } else {
    factors.push({
      name: 'Emergency Fund Not Met',
      impact: -15,
      reason: 'No financial safety net',
      category: 'financial_health'
    });
    baseScore -= 15;
  }
  
  // Factor 4: Savings rate
  const savingsRate = percentage(availableMonthly, monthlyIncome);
  if (savingsRate >= 30) {
    factors.push({
      name: 'High Savings Rate',
      impact: 10,
      reason: 'Saving 30%+ of income',
      category: 'financial_health'
    });
    baseScore += 10;
  } else if (savingsRate < 10) {
    factors.push({
      name: 'Low Savings Rate',
      impact: -10,
      reason: 'Saving less than 10% of income',
      category: 'financial_health'
    });
    baseScore -= 10;
  }
  
  const finalScore = clamp(baseScore, 0, 100);
  
  return {
    value: roundToTwo(finalScore),
    level: getConfidenceLevel(finalScore),
    factors,
    summary: generateConfidenceSummary(finalScore, factors)
  };
}

/**
 * Get confidence level from score
 */
function getConfidenceLevel(score: number): 'very_low' | 'low' | 'medium' | 'high' | 'very_high' {
  if (score >= 90) return 'very_high';
  if (score >= 70) return 'high';
  if (score >= 50) return 'medium';
  if (score >= 30) return 'low';
  return 'very_low';
}

/**
 * Generate confidence summary
 */
function generateConfidenceSummary(score: number, factors: ConfidenceFactor[]): string {
  const level = getConfidenceLevel(score);
  const positiveFactors = factors.filter(f => f.impact > 0).length;
  const negativeFactors = factors.filter(f => f.impact < 0).length;
  
  if (level === 'very_high') {
    return `Very high confidence (${score}/100). ${positiveFactors} positive factors support this projection.`;
  } else if (level === 'high') {
    return `High confidence (${score}/100). Goal is likely achievable with current plan.`;
  } else if (level === 'medium') {
    return `Medium confidence (${score}/100). Goal is possible but has some uncertainties.`;
  } else if (level === 'low') {
    return `Low confidence (${score}/100). ${negativeFactors} factors make this challenging.`;
  } else {
    return `Very low confidence (${score}/100). Significant obstacles to achieving this goal.`;
  }
}

/**
 * Create result for infeasible goal
 */
function createInfeasibleResult(
  goal: { targetAmount: number; currentAmount: number; targetDate: string },
  _currentDate: Date,
  reason: string
): Result<GoalProjectionResult> {
  return success({
    isFeasible: false,
    feasibilityScore: 0,
    monthsRemaining: 0,
    projectedCompletionDate: goal.targetDate,
    delayMonths: 0,
    requiredMonthly: 0,
    availableMonthly: 0,
    utilizationRatio: 0,
    recommendations: [reason, 'Review goal parameters and financial situation'],
    confidence: {
      value: 0,
      level: 'very_low',
      factors: [],
      summary: reason
    }
  });
}

/**
 * Create result for already achieved goal
 */
function createAchievedResult(
  _goal: { targetAmount: number; currentAmount: number; targetDate: string },
  currentDate: Date
): Result<GoalProjectionResult> {
  return success({
    isFeasible: true,
    feasibilityScore: 100,
    monthsRemaining: 0,
    projectedCompletionDate: toISOString(currentDate),
    delayMonths: 0,
    requiredMonthly: 0,
    availableMonthly: 0,
    utilizationRatio: 0,
    recommendations: ['Goal already achieved!'],
    confidence: {
      value: 100,
      level: 'very_high',
      factors: [],
      summary: 'Goal has been achieved'
    }
  });
}
