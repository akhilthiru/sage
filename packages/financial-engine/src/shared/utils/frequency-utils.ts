/**
 * Frequency conversion utilities for financial calculations
 * All functions are pure and deterministic
 */

import type { Frequency } from '../types/common';

/**
 * Normalize amount to monthly frequency
 * @param amount - Amount in original frequency
 * @param frequency - Original frequency
 * @returns Monthly equivalent amount
 */
export function normalizeToMonthly(amount: number, frequency: Frequency): number {
  const multipliers: Record<Frequency, number> = {
    DAILY: 30,
    WEEKLY: 4.33,
    BIWEEKLY: 2.17,
    MONTHLY: 1,
    QUARTERLY: 1 / 3,
    ANNUAL: 1 / 12,
    ONE_TIME: 0
  };

  return amount * multipliers[frequency];
}

/**
 * Convert monthly amount to specified frequency
 * @param monthlyAmount - Amount per month
 * @param frequency - Target frequency
 * @returns Amount in target frequency
 */
export function convertFromMonthly(monthlyAmount: number, frequency: Frequency): number {
  const divisors: Record<Frequency, number> = {
    DAILY: 30,
    WEEKLY: 4.33,
    BIWEEKLY: 2.17,
    MONTHLY: 1,
    QUARTERLY: 3,
    ANNUAL: 12,
    ONE_TIME: 1
  };

  return monthlyAmount / divisors[frequency];
}

/**
 * Get annual multiplier for frequency
 * @param frequency - Frequency to convert
 * @returns Number of occurrences per year
 */
export function getAnnualMultiplier(frequency: Frequency): number {
  const multipliers: Record<Frequency, number> = {
    DAILY: 365,
    WEEKLY: 52,
    BIWEEKLY: 26,
    MONTHLY: 12,
    QUARTERLY: 4,
    ANNUAL: 1,
    ONE_TIME: 0
  };

  return multipliers[frequency];
}
