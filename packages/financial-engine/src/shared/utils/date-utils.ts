/**
 * Date utility functions for financial calculations
 * All functions are pure and deterministic
 */

/**
 * Calculate months between two dates
 * @param start - Start date
 * @param end - End date
 * @returns Number of months between dates (can be negative)
 */
export function monthsBetween(start: Date, end: Date): number {
  const yearDiff = end.getFullYear() - start.getFullYear();
  const monthDiff = end.getMonth() - start.getMonth();
  return yearDiff * 12 + monthDiff;
}

/**
 * Add months to a date
 * @param date - Base date
 * @param months - Number of months to add (can be negative)
 * @returns New date with months added
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Check if date is in future
 * @param date - Date to check
 * @param referenceDate - Reference date (defaults to current date)
 * @returns True if date is in future relative to reference
 */
export function isFutureDate(date: Date, referenceDate: Date = new Date()): boolean {
  return date.getTime() > referenceDate.getTime();
}

/**
 * Check if date is in past
 * @param date - Date to check
 * @param referenceDate - Reference date (defaults to current date)
 * @returns True if date is in past relative to reference
 */
export function isPastDate(date: Date, referenceDate: Date = new Date()): boolean {
  return date.getTime() < referenceDate.getTime();
}

/**
 * Parse ISO 8601 date string to Date object
 * @param dateString - ISO 8601 date string
 * @returns Date object
 */
export function parseISODate(dateString: string): Date {
  return new Date(dateString);
}

/**
 * Format date to ISO 8601 string
 * @param date - Date to format
 * @returns ISO 8601 date string
 */
export function toISOString(date: Date): string {
  return date.toISOString();
}
