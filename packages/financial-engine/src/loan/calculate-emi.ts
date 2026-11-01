/**
 * Calculate EMI (Equated Monthly Installment) for a loan
 * 
 * Formula: EMI = P × r × (1+r)^n / ((1+r)^n - 1)
 * where:
 *   P = Principal loan amount
 *   r = Monthly interest rate (annual rate / 12 / 100)
 *   n = Tenure in months
 * 
 * @deterministic This function is deterministic. Same inputs always produce the same output.
 * @precision Results are rounded to 2 decimal places to minimize floating-point errors
 * 
 * Precision Notes:
 * - Uses standard floating-point arithmetic
 * - Rounding applied at final step to minimize accumulation
 * - For amounts > 10 crore, consider using integer arithmetic (paise)
 */

import { roundToTwo } from '../shared/utils/math-utils';
import { CalculateEMIInputSchema } from '../shared/validation';
import { success, failure, validationError } from '../shared/types/result';
import type { EMIResult } from './types';
import type { Result } from '../shared/types';

/**
 * Calculate EMI for a loan
 * 
 * @param input - Loan calculation parameters
 * @returns Result containing EMI calculation or validation error
 * 
 * @example
 * const result = calculateEMI({ principal: 500000, annualInterestRate: 12, tenureMonths: 24 });
 * if (result.success) {
 *   console.log(result.data.emi); // 23536.74
 * } else {
 *   console.error(result.error.message);
 * }
 */
export function calculateEMI(input: {
  principal: number;
  annualInterestRate: number;
  tenureMonths: number;
}): Result<EMIResult> {
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

  const monthlyRate = annualInterestRate / 12 / 100;

  // Handle zero interest case
  if (monthlyRate === 0) {
    const emi = roundToTwo(principal / tenureMonths);
    return success({
      emi,
      totalPayable: roundToTwo(emi * tenureMonths),
      totalInterest: 0,
      principal,
      tenure: tenureMonths,
      interestRate: annualInterestRate
    });
  }

  // Calculate EMI using standard formula
  // Precision: Calculate power once to minimize floating-point operations
  const onePlusR = 1 + monthlyRate;
  const powerN = Math.pow(onePlusR, tenureMonths);
  const emi = (principal * monthlyRate * powerN) / (powerN - 1);

  // Round at final step to minimize precision loss
  const roundedEMI = roundToTwo(emi);
  const totalPayable = roundToTwo(roundedEMI * tenureMonths);
  const totalInterest = roundToTwo(totalPayable - principal);

  return success({
    emi: roundedEMI,
    totalPayable,
    totalInterest,
    principal,
    tenure: tenureMonths,
    interestRate: annualInterestRate
  });
}
