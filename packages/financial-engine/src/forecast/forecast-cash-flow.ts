/**
 * Forecast cash flow using linear projection
 * 
 * V1 Scope: Deterministic linear projection only
 * - No ML, no trends, no behavior prediction
 * - Fixed monthly income and expenses
 * - Based on current allocation
 * 
 * @deterministic This function is deterministic. Same inputs always produce the same output.
 * 
 * Negative Cash Flow Handling:
 * - Explicitly tracks when balance goes negative
 * - Projects month-by-month to identify cash flow issues
 * - Returns structured warnings for negative balance scenarios
 */

import { parseISODate, addMonths, toISOString } from '../shared/utils/date-utils';
import { roundToTwo } from '../shared/utils/math-utils';
import { CashFlowProjectionInputSchema } from '../shared/validation';
import { success, failure, validationError } from '../shared/types/result';
import type { CashFlowProjectionInput, CashFlowProjectionResult, MonthlyProjection } from './types';
import type { Result } from '../shared/types';

/**
 * Project cash flow month-by-month
 * 
 * @param input - Cash flow projection parameters
 * @returns Result containing month-by-month projections or validation error
 * 
 * @example
 * const result = forecastCashFlow({
 *   startDate: '2024-01-01',
 *   months: 12,
 *   currentBalance: 50000,
 *   monthlyIncome: 80000,
 *   expenses: [...],
 *   debts: [...],
 *   goals: [...],
 *   allocation: {...}
 * });
 * if (result.success) {
 *   console.log(result.data.summary.finalBalance);
 * }
 */
export function forecastCashFlow(input: CashFlowProjectionInput): Result<CashFlowProjectionResult> {
  // Runtime validation with Zod
  const validation = CashFlowProjectionInputSchema.safeParse(input);
  
  if (!validation.success) {
    const firstError = validation.error.errors[0];
    return failure(validationError(
      firstError?.message || 'Invalid input',
      firstError?.path.join('.') || undefined
    ));
  }
  
  const validatedInput = validation.data;
  
  const startDate = parseISODate(validatedInput.startDate);
  const projections: MonthlyProjection[] = [];
  
  let currentBalance = validatedInput.currentBalance;
  let emergencyFund = validatedInput.allocation.emergencyFund;
  const goalProgress: Record<string, number> = { ...validatedInput.allocation.goalAllocations };
  const debtBalances: Record<string, number> = {};
  
  const goalsCompleted: string[] = [];
  const debtsCleared: string[] = [];
  
  let totalIncome = 0;
  let totalExpenses = 0;
  let totalSavings = 0;
  
  // Track negative cash flow explicitly
  let hasNegativeBalance = false;
  let firstNegativeMonth: number | undefined;
  
  for (let month = 1; month <= validatedInput.months; month++) {
    const monthDate = addMonths(startDate, month - 1);
    const openingBalance = currentBalance;
    
    const income = validatedInput.monthlyIncome;
    const expenses = validatedInput.allocation.essentialExpenses + validatedInput.allocation.debtPayments;
    const savings = validatedInput.allocation.goalSavings + validatedInput.allocation.emergencyFund + validatedInput.allocation.investments;
    
    currentBalance = roundToTwo(openingBalance + income - expenses - savings);
    emergencyFund = roundToTwo(emergencyFund + validatedInput.allocation.emergencyFund);
    
    // Explicit negative cash flow detection
    if (currentBalance < 0 && !hasNegativeBalance) {
      hasNegativeBalance = true;
      firstNegativeMonth = month;
    }
    
    for (const goalId in validatedInput.allocation.goalAllocations) {
      const allocation = validatedInput.allocation.goalAllocations[goalId];
      if (allocation) {
        goalProgress[goalId] = roundToTwo((goalProgress[goalId] || 0) + allocation);
        
        const goal = validatedInput.goals.find(g => g.id === goalId);
        if (goal && goalProgress[goalId]! >= (goal.targetAmount - goal.currentAmount)) {
          if (!goalsCompleted.includes(goalId)) {
            goalsCompleted.push(goalId);
          }
        }
      }
    }
    
    projections.push({
      month,
      date: toISOString(monthDate),
      openingBalance,
      income,
      expenses,
      savings,
      closingBalance: currentBalance,
      emergencyFund,
      goalProgress: { ...goalProgress },
      debtBalances: { ...debtBalances }
    });
    
    totalIncome += income;
    totalExpenses += expenses;
    totalSavings += savings;
  }
  
  return success({
    projections,
    summary: {
      finalBalance: roundToTwo(currentBalance),
      totalIncome: roundToTwo(totalIncome),
      totalExpenses: roundToTwo(totalExpenses),
      totalSavings: roundToTwo(totalSavings),
      goalsCompleted,
      debtsCleared,
      // Add negative balance warning if detected
      hasNegativeBalance,
      firstNegativeMonth
    }
  });
}

// Validation now handled by Zod schema
