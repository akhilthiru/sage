/**
 * Simulate loan affordability with complete assessment
 * 
 * Provides EMI calculation, amortization schedule, and affordability assessment
 * based on debt-to-income ratio and monthly surplus
 * 
 * @deterministic This function is deterministic. Same inputs always produce the same output.
 */

import { calculateEMI } from './calculate-emi';
import { generateAmortization } from './generate-amortization';
import { roundToTwo, percentage } from '../shared/utils/math-utils';
import { FINANCIAL_CONSTANTS } from '../shared/constants';
import { LoanSimulationInputSchema } from '../shared/validation';
import { success, failure, validationError, calculationError } from '../shared/types/result';
import type { LoanSimulationInput, LoanSimulationResult, Affordability } from './types';
import type { Result } from '../shared/types';

/**
 * Simulate loan with affordability assessment
 * 
 * @param input - Loan simulation parameters
 * @returns Result containing complete loan simulation or validation error
 * 
 * @example
 * const result = simulateLoan({
 *   principal: 500000,
 *   annualInterestRate: 12,
 *   tenureMonths: 24,
 *   monthlyIncome: 80000,
 *   monthlyExpenses: 50000,
 *   existingDebts: []
 * });
 * if (result.success) {
 *   console.log(result.data.affordability); // 'COMFORTABLE'
 * }
 */
export function simulateLoan(input: LoanSimulationInput): Result<LoanSimulationResult> {
  // Runtime validation with Zod
  const validation = LoanSimulationInputSchema.safeParse(input);
  
  if (!validation.success) {
    const firstError = validation.error.errors[0];
    return failure(validationError(
      firstError?.message || 'Invalid input',
      firstError?.path.join('.') || undefined
    ));
  }

  const {
    principal,
    annualInterestRate,
    tenureMonths,
    monthlyIncome,
    monthlyExpenses,
    existingDebts
  } = validation.data;

  // Calculate EMI using refactored function
  const emiResult = calculateEMI({ principal, annualInterestRate, tenureMonths });
  
  if (!emiResult.success) {
    return failure(calculationError('Failed to calculate EMI', {
      error: emiResult.error
    }));
  }
  
  // Generate amortization schedule using refactored function
  const amortizationResult = generateAmortization({ principal, annualInterestRate, tenureMonths });
  
  if (!amortizationResult.success) {
    return failure(calculationError('Failed to generate amortization schedule', {
      error: amortizationResult.error
    }));
  }
  
  const amortizationSchedule = amortizationResult.data;
  
  // Calculate existing debt payments
  const existingDebtPayments = existingDebts
    .filter(debt => debt.status === 'ACTIVE')
    .reduce((sum, debt) => sum + debt.monthlyPayment, 0);
  
  // Calculate total debt payments (existing + new EMI)
  const totalDebtPayments = existingDebtPayments + emiResult.data.emi;
  
  // Calculate debt-to-income ratio
  const debtToIncomeRatio = roundToTwo(percentage(totalDebtPayments, monthlyIncome));
  
  // Calculate monthly surplus after all expenses and debts
  const monthlySurplus = roundToTwo(monthlyIncome - monthlyExpenses - totalDebtPayments);
  
  // Determine affordability
  const affordability = determineAffordability(debtToIncomeRatio, monthlySurplus, monthlyIncome);
  
  // Calculate max affordable EMI (40% DTI threshold)
  const maxAffordableEMI = roundToTwo(
    (monthlyIncome * FINANCIAL_CONSTANTS.DTI_MANAGEABLE) - existingDebtPayments
  );
  
  // Generate recommendation (returns raw data, no UI formatting)
  const recommendation = generateRecommendation(
    affordability,
    emiResult.data.emi,
    maxAffordableEMI,
    monthlySurplus
  );
  
  // Calculate suggested tenure if current is unaffordable
  let suggestedTenure: number | undefined;
  if (affordability === 'UNAFFORDABLE' || affordability === 'RISKY') {
    suggestedTenure = calculateSuggestedTenure(
      principal,
      annualInterestRate,
      maxAffordableEMI
    );
  }
  
  return success({
    emi: emiResult.data.emi,
    totalPayable: emiResult.data.totalPayable,
    totalInterest: emiResult.data.totalInterest,
    affordability,
    debtToIncomeRatio,
    monthlySurplus,
    amortizationSchedule,
    recommendation,
    maxAffordableEMI,
    suggestedTenure
  });
}

/**
 * Determine affordability level based on DTI and surplus
 */
function determineAffordability(
  dti: number,
  surplus: number,
  income: number
): Affordability {
  const surplusPercentage = percentage(surplus, income);
  
  if (dti <= FINANCIAL_CONSTANTS.DTI_COMFORTABLE * 100 && surplusPercentage > 20) {
    return 'COMFORTABLE';
  }
  
  if (dti <= FINANCIAL_CONSTANTS.DTI_MANAGEABLE * 100 && surplus > 0) {
    return 'MANAGEABLE';
  }
  
  if (dti <= FINANCIAL_CONSTANTS.DTI_RISKY * 100) {
    return 'RISKY';
  }
  
  return 'UNAFFORDABLE';
}

/**
 * Generate recommendation based on affordability
 * Returns raw data without UI formatting
 */
function generateRecommendation(
  affordability: Affordability,
  emi: number,
  maxAffordableEMI: number,
  surplus: number
): string {
  const percentOfMax = roundToTwo((emi / maxAffordableEMI) * 100);
  
  switch (affordability) {
    case 'COMFORTABLE':
      return `This loan is comfortable for your budget. Monthly surplus: ${surplus}`;
    
    case 'MANAGEABLE':
      return `This loan is manageable but will be tight. Consider building an emergency fund before taking this loan.`;
    
    case 'RISKY':
      return `This loan is risky for your current income. Debt payments would be ${percentOfMax}% of recommended maximum.`;
    
    case 'UNAFFORDABLE':
      return `This loan is not affordable with your current income. Maximum recommended EMI: ${maxAffordableEMI}`;
    
    default:
      return 'Unable to assess affordability.';
  }
}

/**
 * Calculate suggested tenure to make loan affordable
 */
function calculateSuggestedTenure(
  principal: number,
  annualInterestRate: number,
  maxAffordableEMI: number
): number {
  // Binary search for tenure that results in EMI <= maxAffordableEMI
  let minTenure = 1;
  let maxTenure = 360; // 30 years max
  
  while (minTenure < maxTenure) {
    const midTenure = Math.floor((minTenure + maxTenure) / 2);
    const emiResult = calculateEMI({ principal, annualInterestRate, tenureMonths: midTenure });
    
    if (!emiResult.success) {
      // If calculation fails, return max tenure
      return 360;
    }
    
    if (emiResult.data.emi <= maxAffordableEMI) {
      maxTenure = midTenure;
    } else {
      minTenure = midTenure + 1;
    }
  }
  
  return minTenure;
}
