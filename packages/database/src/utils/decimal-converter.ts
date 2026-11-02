import { Prisma } from '@prisma/client';
import { DatabaseError } from '../errors/database-error';

/**
 * Utility functions for deterministic conversion between Prisma.Decimal and JavaScript number.
 * Ensures the Financial Engine receives pure numbers and the Database Layer stores Decimal(12,2).
 */

/**
 * Converts a Prisma Decimal, string, or number to a JS number or null.
 */
export function toNumber(
  value: Prisma.Decimal | number | string | null | undefined
): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (value instanceof Prisma.Decimal) {
    return value.toNumber();
  }

  // Handle duck-typed Decimal objects (e.g., from serialized JSON or mocks)
  if (typeof (value as { toNumber?: unknown }).toNumber === 'function') {
    return (value as { toNumber: () => number }).toNumber();
  }

  const fallback = Number(value);
  return Number.isFinite(fallback) ? fallback : null;
}

/**
 * Converts a Prisma Decimal, string, or number to an optional JS number (number | undefined).
 */
export function toOptionalNumber(
  value: Prisma.Decimal | number | string | null | undefined
): number | undefined {
  const result = toNumber(value);
  return result === null ? undefined : result;
}

/**
 * Converts a Prisma Decimal or number to a required JS number.
 * Throws DatabaseError(VALIDATION_ERROR) if null, undefined, or NaN.
 */
export function toRequiredNumber(
  value: Prisma.Decimal | number | string | null | undefined,
  fieldName = 'field'
): number {
  const num = toNumber(value);
  if (num === null) {
    throw new DatabaseError(
      'VALIDATION_ERROR',
      `Required monetary value for "${fieldName}" is missing or not a valid number`,
      { field: fieldName }
    );
  }
  return num;
}

/**
 * Converts a JS number, string, or Prisma Decimal to a Prisma.Decimal or null.
 */
export function toDecimal(
  value: number | string | Prisma.Decimal | null | undefined
): Prisma.Decimal | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Prisma.Decimal) {
    return value;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return null;
    }
    // Round to 2 decimal places to match schema Decimal(12, 2)
    const rounded = roundCurrency(value);
    return new Prisma.Decimal(rounded);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return null;
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) return null;
    return new Prisma.Decimal(roundCurrency(parsed));
  }

  return null;
}

/**
 * Converts a JS number, string, or Prisma Decimal to an optional Prisma.Decimal (Decimal | undefined).
 */
export function toOptionalDecimal(
  value: number | string | Prisma.Decimal | null | undefined
): Prisma.Decimal | undefined {
  const result = toDecimal(value);
  return result === null ? undefined : result;
}

/**
 * Converts a JS number, string, or Prisma Decimal to a required Prisma.Decimal.
 * Throws DatabaseError(VALIDATION_ERROR) if null, undefined, or invalid.
 */
export function toRequiredDecimal(
  value: number | string | Prisma.Decimal | null | undefined,
  fieldName = 'field'
): Prisma.Decimal {
  const dec = toDecimal(value);
  if (dec === null) {
    throw new DatabaseError(
      'VALIDATION_ERROR',
      `Required monetary value for "${fieldName}" cannot be converted to Decimal`,
      { field: fieldName }
    );
  }
  return dec;
}

/**
 * Rounds a number to exactly two decimal places (currency standard).
 */
export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
