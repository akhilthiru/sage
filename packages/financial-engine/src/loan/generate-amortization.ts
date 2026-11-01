/**
 * Generate amortization schedule for a loan
 * 
 * Shows month-by-month breakdown of EMI, principal, interest, and remaining balance
 * 
 * @deterministic This function is deterministic. Same inputs always produce the same output.
 * 
 * Precision Notes:
 * - Rounding applied per month to match real-world EMI payments
 * - Final month balance forced to 0 to handle accumulated rounding
 */

import { calculateEMI } from './calculate-emi';
import { roundToTwo } from '../shared/utils/math-utils';
import { CalculateEMIInputSchema } from '../shared/validation';
import { success, failure, validationError, calculationError } from '../shared/types/result';
import type { AmortizationEntry } from './types';
import type { Result } from '../shared/types';

/**
 * Generate complete amortization schedule for a loan
 * 
 * @param input - Loan parameters
 * @returns Result containing array of amortization entries or validation error
 * 
 * @example
 * const result = generateAmortization({ principal: 500000, annualInterestRate: 12, tenureMonths: 24 });
 * if (result.success) {
 *   console.log(result.data[0]); // First month breakdown
 * }
 */
export function generateAmortization(input: {
  principal: number;
  annualInterestRate: number;
  tenureMonths: number;
}): Result<AmortizationEntry[]> {
  // Runtime validation with Zod
  const validation = CalculateEMIInputSchema.safeParse(input);
  
  if (!validation.success) {
    const firstError = validation.error.errors[0];
    return failure(validationError(
      firstError?.message || 'Invalid input',
      firstError?.path.join('.') || undefined
    ));
  }

  const { principal, annualInterestRate, tenureMonths } = validation.data;
  
  // Calculate EMI using refactored function
  const emiResult = calculateEMI({ principal, annualInterestRate, tenureMonths });
  
  if (!emiResult.success) {
    return failure(calculationError('Failed to calculate EMI for amortization', {
      error: emiResult.error
    }));
  }
  
  const { emi } = emiResult.data;
  const monthlyRate = annualInterestRate / 12 / 100;
  
  let balance = principal;
  const schedule: AmortizationEntry[] = [];
  
  for (let month = 1; month <= tenureMonths; month++) {
    const interestPayment = roundToTwo(balance * monthlyRate);
    const principalPayment = roundToTwo(emi - interestPayment);
    balance = roundToTwo(balance - principalPayment);
    
    // Handle final month rounding - ensure balance is exactly 0
    if (month === tenureMonths) {
      balance = 0;
    }
    
    schedule.push({
      month,
      emi,
      principal: principalPayment,
      interest: interestPayment,
      balance
    });
  }
  
  return success(schedule);
}
