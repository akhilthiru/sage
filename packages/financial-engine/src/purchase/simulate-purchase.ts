/**
 * Simulate purchase affordability with 3 scenarios
 * 
 * Scenarios:
 * 1. Buy from savings - Use existing savings
 * 2. Take loan - Finance with EMI
 * 3. Save first - Save up before purchasing
 * 
 * @deterministic This function is deterministic. Same inputs always produce the same output.
 */

import { calculateEMI } from '../loan/calculate-emi';
import { roundToTwo, percentage, clamp } from '../shared/utils/math-utils';
import { FINANCIAL_CONSTANTS } from '../shared/constants';
import { PurchaseSimulationInputSchema } from '../shared/validation';
import { success, failure, validationError } from '../shared/types/result';
import type { 
  PurchaseSimulationInput, 
  PurchaseSimulationResult, 
  PurchaseScenario,
  ScenarioType 
} from './types';
import type { ConfidenceScore, ConfidenceFactor } from '../shared/types';
import type { Result } from '../shared/types';

const DEFAULT_LOAN_RATE = 12;
const DEFAULT_LOAN_TENURE = 12;

/**
 * Simulate purchase with 3 affordability scenarios
 * 
 * @param input - Purchase simulation parameters
 * @returns Result containing purchase simulation or validation error
 * 
 * @example
 * const result = simulatePurchase({
 *   purchaseAmount: 50000,
 *   itemName: 'Laptop',
 *   currentSavings: 30000,
 *   emergencyFundTarget: 100000,
 *   currentEmergencyFund: 80000,
 *   monthlyIncome: 80000,
 *   monthlyExpenses: 50000,
 *   activeGoals: [],
 *   existingDebts: []
 * });
 * if (result.success) {
 *   console.log(result.data.recommended, result.data.canAfford);
 * }
 */
export function simulatePurchase(input: PurchaseSimulationInput): Result<PurchaseSimulationResult> {
  // Runtime validation with Zod
  const validation = PurchaseSimulationInputSchema.safeParse(input);
  
  if (!validation.success) {
    const firstError = validation.error.errors[0];
    return failure(validationError(
      firstError?.message || 'Invalid input',
      firstError?.path.join('.') || undefined
    ));
  }
  
  const validatedInput = validation.data;
  
  const scenarios: PurchaseScenario[] = [
    simulateBuyFromSavings(validatedInput),
    simulateLoanEMI(validatedInput),
    simulateSaveFirst(validatedInput)
  ];
  
  const recommended = determineRecommendation(scenarios);
  const canAfford = scenarios.some(s => s.isViable);
  
  const confidence = calculatePurchaseConfidence(validatedInput, scenarios, recommended);
  
  return success({
    purchaseAmount: validatedInput.purchaseAmount,
    itemName: validatedInput.itemName,
    scenarios,
    recommended,
    canAfford,
    confidence
  });
}

/**
 * Scenario 1: Buy from savings
 */
function simulateBuyFromSavings(input: PurchaseSimulationInput): PurchaseScenario {
  const newSavings = roundToTwo(input.currentSavings - input.purchaseAmount);
  const newEmergencyFund = roundToTwo(Math.min(input.currentEmergencyFund, newSavings));
  const emergencyFundImpact = roundToTwo(input.currentEmergencyFund - newEmergencyFund);
  
  const minEmergencyFund = input.emergencyFundTarget * 0.5;
  const isViable = newSavings >= 0 && newEmergencyFund >= minEmergencyFund;
  
  const pros: string[] = ['Immediate purchase', 'No interest or debt', 'No monthly commitment'];
  const cons: string[] = [];
  
  if (emergencyFundImpact > 0) {
    cons.push(`Reduces emergency fund by ${emergencyFundImpact}`);
  }
  
  if (!isViable) {
    if (newSavings < 0) {
      cons.push('Insufficient savings');
    }
    if (newEmergencyFund < minEmergencyFund) {
      cons.push('Would deplete emergency fund below safe level');
    }
  }
  
  const recommendation = isViable && newEmergencyFund >= input.emergencyFundTarget;
  
  return {
    type: 'BUY_FROM_SAVINGS',
    isViable,
    immediateImpact: {
      newSavings,
      newEmergencyFund,
      emergencyFundImpact: emergencyFundImpact > 0 ? emergencyFundImpact : undefined
    },
    monthlyImpact: 0,
    totalCost: input.purchaseAmount,
    timeline: 0,
    pros,
    cons,
    recommendation
  };
}

/**
 * Scenario 2: Take loan with EMI
 */
function simulateLoanEMI(input: PurchaseSimulationInput): PurchaseScenario {
  const emiResult = calculateEMI({
    principal: input.purchaseAmount,
    annualInterestRate: DEFAULT_LOAN_RATE,
    tenureMonths: DEFAULT_LOAN_TENURE
  });
  
  if (!emiResult.success) {
    // Fallback: return non-viable scenario if EMI calculation fails
    return {
      type: 'LOAN_EMI',
      isViable: false,
      immediateImpact: {
        newSavings: input.currentSavings,
        newEmergencyFund: input.currentEmergencyFund
      },
      monthlyImpact: 0,
      totalCost: input.purchaseAmount,
      timeline: DEFAULT_LOAN_TENURE,
      pros: [],
      cons: ['Unable to calculate EMI'],
      recommendation: false
    };
  }
  
  const { emi, totalPayable, totalInterest } = emiResult.data;
  
  const existingDebtPayments = input.existingDebts
    .filter(d => d.status === 'ACTIVE')
    .reduce((sum, d) => sum + d.minimumPayment, 0);
  
  const totalDebtPayments = existingDebtPayments + emi;
  const debtToIncomeRatio = roundToTwo(percentage(totalDebtPayments, input.monthlyIncome));
  
  const monthlySurplus = roundToTwo(
    input.monthlyIncome - input.monthlyExpenses - totalDebtPayments
  );
  
  const isViable = debtToIncomeRatio <= FINANCIAL_CONSTANTS.DTI_MANAGEABLE * 100 && monthlySurplus >= 0;
  
  const pros: string[] = [
    'Immediate purchase',
    'Preserves savings',
    `Spread cost over ${DEFAULT_LOAN_TENURE} months`
  ];
  
  const cons: string[] = [
    `${totalInterest} interest cost`,
    `${emi} monthly commitment`,
    `${debtToIncomeRatio.toFixed(1)}% debt-to-income ratio`
  ];
  
  if (!isViable) {
    cons.push('Exceeds recommended debt-to-income ratio');
  }
  
  const recommendation = isViable && debtToIncomeRatio <= FINANCIAL_CONSTANTS.DTI_COMFORTABLE * 100;
  
  return {
    type: 'LOAN_EMI',
    isViable,
    immediateImpact: {
      newSavings: input.currentSavings,
      newEmergencyFund: input.currentEmergencyFund
    },
    monthlyImpact: emi,
    totalCost: totalPayable,
    timeline: DEFAULT_LOAN_TENURE,
    emi,
    tenure: DEFAULT_LOAN_TENURE,
    totalInterest,
    debtToIncomeRatio,
    pros,
    cons,
    recommendation
  };
}

/**
 * Scenario 3: Save first before purchasing
 */
function simulateSaveFirst(input: PurchaseSimulationInput): PurchaseScenario {
  const monthlySurplus = roundToTwo(input.monthlyIncome - input.monthlyExpenses);
  const existingDebtPayments = input.existingDebts
    .filter(d => d.status === 'ACTIVE')
    .reduce((sum, d) => sum + d.minimumPayment, 0);
  
  const availableForSaving = roundToTwo(monthlySurplus - existingDebtPayments);
  const amountNeeded = roundToTwo(input.purchaseAmount - input.currentSavings);
  
  const isViable = availableForSaving > 0;
  
  const monthsToSave = isViable ? Math.ceil(amountNeeded / availableForSaving) : 0;
  
  const pros: string[] = [
    'No interest or debt',
    'No impact on emergency fund',
    'Builds financial discipline'
  ];
  
  const cons: string[] = [];
  
  if (monthsToSave > 0) {
    cons.push(`Wait ${monthsToSave} months before purchase`);
  }
  
  if (!isViable) {
    cons.push('No monthly surplus available for saving');
  }
  
  const recommendation = isViable && monthsToSave <= 6;
  
  return {
    type: 'SAVE_FIRST',
    isViable,
    immediateImpact: {
      newSavings: input.currentSavings,
      newEmergencyFund: input.currentEmergencyFund
    },
    monthlyImpact: -availableForSaving,
    totalCost: input.purchaseAmount,
    timeline: monthsToSave,
    pros,
    cons,
    recommendation
  };
}

/**
 * Determine recommended scenario
 */
function determineRecommendation(scenarios: PurchaseScenario[]): ScenarioType | 'NONE' {
  const saveFirst = scenarios.find(s => s.type === 'SAVE_FIRST');
  const buyFromSavings = scenarios.find(s => s.type === 'BUY_FROM_SAVINGS');
  const loanEMI = scenarios.find(s => s.type === 'LOAN_EMI');
  
  if (saveFirst?.recommendation && saveFirst.timeline <= 6) {
    return 'SAVE_FIRST';
  }
  
  if (buyFromSavings?.recommendation) {
    return 'BUY_FROM_SAVINGS';
  }
  
  if (loanEMI?.recommendation) {
    return 'LOAN_EMI';
  }
  
  if (saveFirst?.isViable) {
    return 'SAVE_FIRST';
  }
  
  if (buyFromSavings?.isViable) {
    return 'BUY_FROM_SAVINGS';
  }
  
  if (loanEMI?.isViable) {
    return 'LOAN_EMI';
  }
  
  return 'NONE';
}

/**
 * Calculate confidence for purchase decision
 */
function calculatePurchaseConfidence(
  input: PurchaseSimulationInput,
  scenarios: PurchaseScenario[],
  recommended: ScenarioType | 'NONE'
): ConfidenceScore {
  const factors: ConfidenceFactor[] = [];
  let baseScore = 50;
  
  const viableCount = scenarios.filter(s => s.isViable).length;
  
  if (viableCount === 3) {
    factors.push({
      name: 'Multiple Options',
      impact: 20,
      reason: 'All 3 purchase scenarios are viable',
      category: 'purchase'
    });
    baseScore += 20;
  } else if (viableCount === 2) {
    factors.push({
      name: 'Good Options',
      impact: 10,
      reason: '2 purchase scenarios are viable',
      category: 'purchase'
    });
    baseScore += 10;
  } else if (viableCount === 1) {
    factors.push({
      name: 'Limited Options',
      impact: -10,
      reason: 'Only 1 purchase scenario is viable',
      category: 'purchase'
    });
    baseScore -= 10;
  } else {
    factors.push({
      name: 'No Viable Options',
      impact: -30,
      reason: 'No affordable purchase scenarios',
      category: 'purchase'
    });
    baseScore -= 30;
  }
  
  const purchaseToIncomeRatio = percentage(input.purchaseAmount, input.monthlyIncome);
  if (purchaseToIncomeRatio <= 100) {
    factors.push({
      name: 'Affordable Purchase',
      impact: 15,
      reason: 'Purchase is less than 1 month income',
      category: 'purchase'
    });
    baseScore += 15;
  } else if (purchaseToIncomeRatio > 300) {
    factors.push({
      name: 'Large Purchase',
      impact: -15,
      reason: 'Purchase exceeds 3 months income',
      category: 'purchase'
    });
    baseScore -= 15;
  }
  
  const emergencyFundRatio = input.currentEmergencyFund / input.emergencyFundTarget;
  if (emergencyFundRatio >= 1.0) {
    factors.push({
      name: 'Emergency Fund Met',
      impact: 15,
      reason: 'Emergency fund target achieved',
      category: 'financial_health'
    });
    baseScore += 15;
  } else if (emergencyFundRatio < 0.5) {
    factors.push({
      name: 'Low Emergency Fund',
      impact: -15,
      reason: 'Emergency fund below 50% of target',
      category: 'financial_health'
    });
    baseScore -= 15;
  }
  
  const finalScore = clamp(baseScore, 0, 100);
  
  return {
    value: roundToTwo(finalScore),
    level: getConfidenceLevel(finalScore),
    factors,
    summary: generatePurchaseConfidenceSummary(finalScore, recommended, viableCount)
  };
}

function getConfidenceLevel(score: number): 'very_low' | 'low' | 'medium' | 'high' | 'very_high' {
  if (score >= 90) return 'very_high';
  if (score >= 70) return 'high';
  if (score >= 50) return 'medium';
  if (score >= 30) return 'low';
  return 'very_low';
}

function generatePurchaseConfidenceSummary(
  score: number,
  recommended: ScenarioType | 'NONE',
  viableCount: number
): string {
  if (recommended === 'NONE') {
    return `Low confidence (${score}/100). This purchase is not affordable with current finances.`;
  }
  
  if (score >= 70) {
    return `High confidence (${score}/100). ${viableCount} viable options available. Recommended: ${recommended.replace('_', ' ').toLowerCase()}.`;
  } else if (score >= 50) {
    return `Medium confidence (${score}/100). Purchase is possible but requires careful planning.`;
  } else {
    return `Low confidence (${score}/100). Purchase is challenging with current financial situation.`;
  }
}

// Validation now handled by Zod schema
