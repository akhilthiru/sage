/**
 * Mathematical utility functions for financial calculations
 * All functions are pure and deterministic
 */

/**
 * Round number to 2 decimal places
 * Used for monetary values
 */
export function roundToTwo(num: number): number {
  return Math.round(num * 100) / 100;
}

/**
 * Round number to nearest value
 * @param num - Number to round
 * @param nearest - Round to nearest multiple of this value (default: 100)
 */
export function roundToNearest(num: number, nearest: number = 100): number {
  return Math.round(num / nearest) * nearest;
}

/**
 * Clamp value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Calculate percentage
 * Returns 0 if total is 0 to avoid division by zero
 */
export function percentage(value: number, total: number): number {
  if (total === 0) return 0;
  return (value / total) * 100;
}

/**
 * Round to specified decimal places
 */
export function roundToDecimal(num: number, decimals: number): number {
  const multiplier = Math.pow(10, decimals);
  return Math.round(num * multiplier) / multiplier;
}
