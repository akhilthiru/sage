/**
 * Calculate overall financial health score
 * 
 * Provides comprehensive financial wellness assessment based on:
 * - Debt-to-income ratio
 * - Savings rate
 * - Emergency fund coverage
 * - Expense ratio
 * - Goal progress
 * 
 * @deterministic This function is deterministic. Same inputs always produce the same output.
 */

import { roundToTwo, percentage, clamp } from '../shared/utils/math-utils';
import { FinancialHealthInputSchema } from '../shared/validation';
import { success, failure, validationError } from '../shared/types/result';
import type {
  FinancialHealthInput,
  FinancialHealthResult,
  HealthMetrics,
  HealthGrade,
  HealthLevel,
  RiskLevel,
  HealthRecommendation
} from './types';
import type { Result } from '../shared/types';

/**
 * Calculate financial health score and assessment
 * 
 * @param input - Financial health parameters
 * @returns Result containing comprehensive health assessment or validation error
 * 
 * @example
 * const result = calculateFinancialHealth({
 *   monthlyIncome: 80000,
 *   monthlyExpenses: 45000,
 *   monthlyDebtPayments: 15000,
 *   currentEmergencyFund: 180000,
 *   activeGoalsCount: 3,
 *   goalsOnTrack: 2
 * });
 * if (result.success) {
 *   console.log(result.data.score, result.data.grade);
 * }
 */
export function calculateFinancialHealth(input: FinancialHealthInput): Result<FinancialHealthResult> {
  // Runtime validation with Zod
  const validation = FinancialHealthInputSchema.safeParse(input);
  
  if (!validation.success) {
    const firstError = validation.error.errors[0];
    return failure(validationError(
      firstError?.message || 'Invalid input',
      firstError?.path.join('.') || undefined
    ));
  }
  
  const validatedInput = validation.data;
  
  // Calculate metrics
  const metrics = calculateMetrics(validatedInput);
  
  // Calculate health score
  const score = calculateHealthScore(metrics);
  
  // Determine grade and level
  const grade = getHealthGrade(score);
  const level = getHealthLevel(score);
  
  // Assess risk
  const { riskLevel, riskFactors } = assessRisk(metrics, validatedInput);
  
  // Generate recommendations
  const recommendations = generateRecommendations(metrics, validatedInput);
  
  // Identify strengths and weaknesses
  const { strengths, weaknesses } = identifyStrengthsWeaknesses(metrics);
  
  return success({
    score: roundToTwo(score),
    grade,
    level,
    metrics,
    riskLevel,
    riskFactors,
    recommendations,
    strengths,
    weaknesses
  });
}

/**
 * Calculate key financial health metrics
 */
function calculateMetrics(input: FinancialHealthInput): HealthMetrics {
  const debtToIncomeRatio = roundToTwo(
    percentage(input.monthlyDebtPayments, input.monthlyIncome)
  );
  
  const monthlySavings = input.monthlyIncome - input.monthlyExpenses - input.monthlyDebtPayments;
  const savingsRate = roundToTwo(percentage(monthlySavings, input.monthlyIncome));
  
  const emergencyFundMonths = input.monthlyExpenses > 0
    ? roundToTwo(input.currentEmergencyFund / input.monthlyExpenses)
    : 0;
  
  const expenseRatio = roundToTwo(percentage(input.monthlyExpenses, input.monthlyIncome));
  
  const goalProgressRate = input.activeGoalsCount > 0
    ? roundToTwo(percentage(input.goalsOnTrack, input.activeGoalsCount))
    : 100;
  
  return {
    debtToIncomeRatio,
    savingsRate,
    emergencyFundMonths,
    expenseRatio,
    goalProgressRate
  };
}

/**
 * Calculate overall health score (0-100)
 */
function calculateHealthScore(metrics: HealthMetrics): number {
  let score = 50; // Base score
  
  // Factor 1: Debt-to-Income Ratio (-20 to +20)
  if (metrics.debtToIncomeRatio <= 20) {
    score += 20;
  } else if (metrics.debtToIncomeRatio <= 30) {
    score += 10;
  } else if (metrics.debtToIncomeRatio <= 40) {
    score += 0;
  } else {
    score -= 20;
  }
  
  // Factor 2: Emergency Fund (-20 to +20)
  if (metrics.emergencyFundMonths >= 6) {
    score += 20;
  } else if (metrics.emergencyFundMonths >= 3) {
    score += 10;
  } else if (metrics.emergencyFundMonths >= 1) {
    score += 0;
  } else {
    score -= 20;
  }
  
  // Factor 3: Savings Rate (0 to +15)
  if (metrics.savingsRate >= 20) {
    score += 15;
  } else if (metrics.savingsRate >= 10) {
    score += 10;
  } else if (metrics.savingsRate >= 5) {
    score += 5;
  }
  
  // Factor 4: Expense Ratio (-10 to +10)
  if (metrics.expenseRatio <= 50) {
    score += 10;
  } else if (metrics.expenseRatio <= 70) {
    score += 5;
  } else if (metrics.expenseRatio <= 90) {
    score += 0;
  } else {
    score -= 10;
  }
  
  // Factor 5: Goal Progress (-5 to +10)
  if (metrics.goalProgressRate === 100) {
    score += 10;
  } else if (metrics.goalProgressRate >= 75) {
    score += 5;
  } else if (metrics.goalProgressRate >= 50) {
    score += 0;
  } else {
    score -= 5;
  }
  
  return clamp(score, 0, 100);
}

/**
 * Get health grade from score
 */
function getHealthGrade(score: number): HealthGrade {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

/**
 * Get health level from score
 */
function getHealthLevel(score: number): HealthLevel {
  if (score >= 90) return 'EXCELLENT';
  if (score >= 75) return 'GOOD';
  if (score >= 60) return 'FAIR';
  if (score >= 40) return 'POOR';
  return 'CRITICAL';
}

/**
 * Assess financial risk
 */
function assessRisk(metrics: HealthMetrics, input: FinancialHealthInput): {
  riskLevel: RiskLevel;
  riskFactors: string[];
} {
  const riskFactors: string[] = [];
  let riskScore = 0;
  
  if (metrics.debtToIncomeRatio > 40) {
    riskFactors.push('High debt burden (DTI > 40%)');
    riskScore += 3;
  }
  
  if (metrics.emergencyFundMonths < 3) {
    riskFactors.push('Insufficient emergency fund (< 3 months)');
    riskScore += 3;
  }
  
  if (metrics.savingsRate < 5) {
    riskFactors.push('Low savings rate (< 5%)');
    riskScore += 2;
  }
  
  if (metrics.expenseRatio > 80) {
    riskFactors.push('High expense ratio (> 80% of income)');
    riskScore += 2;
  }
  
  if (input.totalDebtBalance > input.monthlyIncome * 12) {
    riskFactors.push('Total debt exceeds annual income');
    riskScore += 2;
  }
  
  let riskLevel: RiskLevel;
  if (riskScore >= 8) {
    riskLevel = 'CRITICAL';
  } else if (riskScore >= 5) {
    riskLevel = 'HIGH';
  } else if (riskScore >= 2) {
    riskLevel = 'MODERATE';
  } else {
    riskLevel = 'LOW';
  }
  
  return { riskLevel, riskFactors };
}

/**
 * Generate personalized recommendations
 */
function generateRecommendations(
  metrics: HealthMetrics,
  input: FinancialHealthInput
): HealthRecommendation[] {
  const recommendations: HealthRecommendation[] = [];
  
  // Debt recommendations
  if (metrics.debtToIncomeRatio > 30) {
    recommendations.push({
      priority: 'HIGH',
      category: 'DEBT',
      recommendation: 'Reduce debt payments to below 30% of income',
      impact: 'Improve financial stability and reduce stress'
    });
  }
  
  // Emergency fund recommendations
  if (metrics.emergencyFundMonths < 6) {
    const targetAmount = input.monthlyExpenses * 6;
    const gap = targetAmount - input.currentEmergencyFund;
    recommendations.push({
      priority: metrics.emergencyFundMonths < 3 ? 'HIGH' : 'MEDIUM',
      category: 'EMERGENCY_FUND',
      recommendation: `Build emergency fund to 6 months (${gap} more needed)`,
      impact: 'Protect against unexpected expenses and job loss'
    });
  }
  
  // Savings recommendations
  if (metrics.savingsRate < 20) {
    recommendations.push({
      priority: 'MEDIUM',
      category: 'SAVINGS',
      recommendation: 'Increase savings rate to at least 20% of income',
      impact: 'Accelerate wealth building and goal achievement'
    });
  }
  
  // Expense recommendations
  if (metrics.expenseRatio > 70) {
    recommendations.push({
      priority: 'MEDIUM',
      category: 'EXPENSES',
      recommendation: 'Reduce expenses to below 70% of income',
      impact: 'Free up funds for savings and investments'
    });
  }
  
  // Goal recommendations
  if (metrics.goalProgressRate < 75 && input.activeGoalsCount > 0) {
    recommendations.push({
      priority: 'LOW',
      category: 'GOALS',
      recommendation: 'Review and adjust goals to improve progress rate',
      impact: 'Stay on track for financial objectives'
    });
  }
  
  return recommendations.sort((a, b) => {
    const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
}

/**
 * Identify financial strengths and weaknesses
 */
function identifyStrengthsWeaknesses(metrics: HealthMetrics): {
  strengths: string[];
  weaknesses: string[];
} {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  
  // Debt
  if (metrics.debtToIncomeRatio <= 20) {
    strengths.push(`Low debt burden (${metrics.debtToIncomeRatio.toFixed(1)}% DTI)`);
  } else if (metrics.debtToIncomeRatio > 40) {
    weaknesses.push(`High debt burden (${metrics.debtToIncomeRatio.toFixed(1)}% DTI)`);
  }
  
  // Emergency fund
  if (metrics.emergencyFundMonths >= 6) {
    strengths.push(`Strong emergency fund (${metrics.emergencyFundMonths.toFixed(1)} months)`);
  } else if (metrics.emergencyFundMonths < 3) {
    weaknesses.push(`Weak emergency fund (${metrics.emergencyFundMonths.toFixed(1)} months)`);
  }
  
  // Savings rate
  if (metrics.savingsRate >= 20) {
    strengths.push(`Excellent savings rate (${metrics.savingsRate.toFixed(1)}%)`);
  } else if (metrics.savingsRate < 10) {
    weaknesses.push(`Low savings rate (${metrics.savingsRate.toFixed(1)}%)`);
  }
  
  // Expense ratio
  if (metrics.expenseRatio <= 50) {
    strengths.push(`Controlled expenses (${metrics.expenseRatio.toFixed(1)}% of income)`);
  } else if (metrics.expenseRatio > 80) {
    weaknesses.push(`High expenses (${metrics.expenseRatio.toFixed(1)}% of income)`);
  }
  
  // Goal progress
  if (metrics.goalProgressRate >= 75) {
    strengths.push(`Good goal progress (${metrics.goalProgressRate.toFixed(0)}% on track)`);
  } else if (metrics.goalProgressRate < 50) {
    weaknesses.push(`Poor goal progress (${metrics.goalProgressRate.toFixed(0)}% on track)`);
  }
  
  return { strengths, weaknesses };
}

// Validation now handled by Zod schema
