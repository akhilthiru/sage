/**
 * Calculate monthly income allocation across financial priorities
 * 
 * Uses waterfall algorithm to distribute income:
 * 1. Essential Expenses (max 50% of income)
 * 2. Debt Payments (minimum payments)
 * 3. Emergency Fund (20% of surplus until target)
 * 4. Goal Savings (60% of surplus, by priority)
 * 5. Investments (15% of surplus)
 * 6. Discretionary (remaining)
 * 
 * @deterministic This function is deterministic. Same inputs always produce the same output.
 * 
 * Negative Cash Flow Handling:
 * - Explicitly detects when income < (essentials + debt payments)
 * - Returns structured error state with shortfall amount
 * - Provides clear warning codes for different scenarios
 */

import { normalizeToMonthly } from '../shared/utils/frequency-utils';
import { roundToTwo } from '../shared/utils/math-utils';
import { FINANCIAL_CONSTANTS } from '../shared/constants';
import { parseISODate, isFutureDate } from '../shared/utils/date-utils';
import { AllocationInputSchema } from '../shared/validation';
import { success, failure, validationError } from '../shared/types/result';
import type { AllocationInput, AllocationResult, GoalItem } from './types';
import type { Result } from '../shared/types';

/**
 * Calculate allocation of monthly income
 * 
 * @param input - Allocation parameters
 * @returns Result containing allocation breakdown or validation error
 * 
 * @example
 * const result = calculateAllocation({
 *   userId: 'user_123',
 *   month: 12,
 *   year: 2024,
 *   monthlyIncome: 80000,
 *   essentialExpenses: [...],
 *   debts: [...],
 *   goals: [...],
 *   emergencyFundTarget: 240000,
 *   currentEmergencyFund: 150000,
 *   riskTolerance: 'MODERATE'
 * });
 * if (result.success) {
 *   console.log(result.data.essentialExpenses);
 * }
 */
export function calculateAllocation(input: AllocationInput): Result<AllocationResult> {
  // Runtime validation with Zod
  const validation = AllocationInputSchema.safeParse(input);
  
  if (!validation.success) {
    const firstError = validation.error.errors[0];
    return failure(validationError(
      firstError?.message || 'Invalid input',
      firstError?.path.join('.') || undefined
    ));
  }
  
  const validatedInput = validation.data;
  
  const totalIncome = validatedInput.monthlyIncome + (validatedInput.otherIncome || 0);
  let remaining = totalIncome;
  
  // Step 1: Essential Expenses (max 50% of income)
  const essentialTotal = validatedInput.essentialExpenses
    .filter(e => e.isActive)
    .reduce((sum, e) => sum + normalizeToMonthly(e.amount, e.frequency), 0);
  
  const maxEssential = totalIncome * FINANCIAL_CONSTANTS.ESSENTIAL_EXPENSES_MAX;
  const essentialExpenses = roundToTwo(Math.min(essentialTotal, maxEssential, remaining));
  remaining = roundToTwo(remaining - essentialExpenses);
  
  // Step 2: Debt Payments (minimum payments)
  const debtMinimumTotal = validatedInput.debts
    .filter(d => d.status === 'ACTIVE')
    .reduce((sum, d) => sum + d.minimumPayment, 0);
  
  const debtPayments = roundToTwo(Math.min(debtMinimumTotal, remaining));
  remaining = roundToTwo(remaining - debtPayments);
  
  // Explicit negative cash flow handling
  let warning: 'INCOME_INSUFFICIENT' | 'DEBT_PAYMENTS_INSUFFICIENT' | undefined;
  let warningMessage: string | undefined;
  let shortfall: number | undefined;
  
  if (essentialExpenses < essentialTotal || debtPayments < debtMinimumTotal) {
    const totalRequired = essentialTotal + debtMinimumTotal;
    shortfall = roundToTwo(totalRequired - totalIncome);
    warning = 'INCOME_INSUFFICIENT';
    // Removed UI formatting - return raw number in message
    warningMessage = `Income insufficient to cover essential expenses and debt payments. Shortfall: ${shortfall}`;
  }
  
  // If no remaining funds after essentials and debt, return early with structured result
  if (remaining <= 0) {
    return success({
      userId: validatedInput.userId,
      month: validatedInput.month,
      year: validatedInput.year,
      essentialExpenses,
      debtPayments,
      emergencyFund: 0,
      goalSavings: 0,
      investments: 0,
      discretionary: 0,
      totalIncome,
      totalAllocated: totalIncome,
      goalAllocations: {},
      warning,
      warningMessage,
      shortfall
    });
  }
  
  // Step 3: Emergency Fund (20% of surplus until target)
  const emergencyFundGap = Math.max(0, validatedInput.emergencyFundTarget - validatedInput.currentEmergencyFund);
  const emergencyFundAllocation = validatedInput.currentEmergencyFund < validatedInput.emergencyFundTarget
    ? Math.min(
        emergencyFundGap,
        remaining * FINANCIAL_CONSTANTS.SURPLUS_EMERGENCY_FUND,
        remaining
      )
    : 0;
  
  const emergencyFund = roundToTwo(emergencyFundAllocation);
  remaining = roundToTwo(remaining - emergencyFund);
  
  // Step 4: Goal Savings (60% of surplus, by priority)
  const goalSurplus = remaining * FINANCIAL_CONSTANTS.SURPLUS_GOALS;
  const { goalSavings, goalAllocations } = allocateToGoals(
    validatedInput.goals,
    goalSurplus,
    new Date(validatedInput.year, validatedInput.month - 1, 1)
  );
  remaining = roundToTwo(remaining - goalSavings);
  
  // Step 5: Investments (15% of surplus)
  const investmentAllocation = validatedInput.currentEmergencyFund >= validatedInput.emergencyFundTarget
    ? remaining * FINANCIAL_CONSTANTS.SURPLUS_INVESTMENTS
    : 0;
  
  const investments = roundToTwo(investmentAllocation);
  remaining = roundToTwo(remaining - investments);
  
  // Step 6: Discretionary (remaining)
  const discretionary = roundToTwo(remaining);
  
  return success({
    userId: validatedInput.userId,
    month: validatedInput.month,
    year: validatedInput.year,
    essentialExpenses,
    debtPayments,
    emergencyFund,
    goalSavings,
    investments,
    discretionary,
    totalIncome,
    totalAllocated: totalIncome,
    goalAllocations,
    warning,
    warningMessage,
    shortfall
  });
}

// Validation now handled by Zod schema - no need for manual validation function

/**
 * Allocate funds to goals by priority and target date
 */
function allocateToGoals(
  goals: GoalItem[],
  availableAmount: number,
  currentDate: Date
): { goalSavings: number; goalAllocations: Record<string, number> } {
  const activeGoals = goals
    .filter(g => g.status === 'ACTIVE')
    .filter(g => isFutureDate(parseISODate(g.targetDate), currentDate))
    .sort((a, b) => {
      // Sort by priority first (HIGH > MEDIUM > LOW)
      const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by target date (earlier first)
      return parseISODate(a.targetDate).getTime() - parseISODate(b.targetDate).getTime();
    });
  
  if (activeGoals.length === 0) {
    return { goalSavings: 0, goalAllocations: {} };
  }
  
  const goalAllocations: Record<string, number> = {};
  let remaining = availableAmount;
  
  // Distribute proportionally among goals of same priority
  let currentPriority = activeGoals[0]?.priority;
  let samePriorityGoals: GoalItem[] = [];
  
  for (const goal of activeGoals) {
    if (goal.priority !== currentPriority) {
      // Allocate to previous priority group
      const allocated = allocateToPriorityGroup(samePriorityGoals, remaining);
      Object.assign(goalAllocations, allocated.allocations);
      remaining = roundToTwo(remaining - allocated.total);
      
      // Start new priority group
      currentPriority = goal.priority;
      samePriorityGoals = [goal];
    } else {
      samePriorityGoals.push(goal);
    }
  }
  
  // Allocate to final priority group
  if (samePriorityGoals.length > 0) {
    const allocated = allocateToPriorityGroup(samePriorityGoals, remaining);
    Object.assign(goalAllocations, allocated.allocations);
  }
  
  const totalGoalSavings = Object.values(goalAllocations).reduce((sum, val) => sum + val, 0);
  
  return {
    goalSavings: roundToTwo(totalGoalSavings),
    goalAllocations
  };
}

/**
 * Allocate funds proportionally among goals of same priority
 */
function allocateToPriorityGroup(
  goals: GoalItem[],
  availableAmount: number
): { allocations: Record<string, number>; total: number } {
  const allocations: Record<string, number> = {};
  
  if (goals.length === 0 || availableAmount <= 0) {
    return { allocations, total: 0 };
  }
  
  // Calculate total remaining amount needed for all goals
  const totalNeeded = goals.reduce(
    (sum, g) => sum + Math.max(0, g.targetAmount - g.currentAmount),
    0
  );
  
  if (totalNeeded === 0) {
    return { allocations, total: 0 };
  }
  
  let totalAllocated = 0;
  
  // Distribute proportionally
  for (let i = 0; i < goals.length; i++) {
    const goal = goals[i]!;
    const needed = Math.max(0, goal.targetAmount - goal.currentAmount);
    
    let allocation: number;
    if (i === goals.length - 1) {
      // Last goal gets remaining to avoid rounding errors
      allocation = roundToTwo(availableAmount - totalAllocated);
    } else {
      allocation = roundToTwo((needed / totalNeeded) * availableAmount);
    }
    
    // Don't allocate more than needed
    allocation = Math.min(allocation, needed);
    
    if (allocation > 0) {
      allocations[goal.id] = allocation;
      totalAllocated += allocation;
    }
  }
  
  return { allocations, total: roundToTwo(totalAllocated) };
}
