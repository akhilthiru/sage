import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import {
  toNumber,
  toOptionalNumber,
  toRequiredNumber,
  toDecimal,
  toOptionalDecimal,
  toRequiredDecimal,
  roundCurrency,
} from '../../src/utils/decimal-converter';
import { DatabaseError } from '../../src/errors/database-error';

describe('Decimal Converter Utilities', () => {
  describe('roundCurrency', () => {
    it('should round numbers to 2 decimal places deterministically', () => {
      expect(roundCurrency(123.456)).toBe(123.46);
      expect(roundCurrency(123.454)).toBe(123.45);
      expect(roundCurrency(100)).toBe(100);
      expect(roundCurrency(0.005)).toBe(0.01);
    });
  });

  describe('toNumber', () => {
    it('should convert Prisma.Decimal to number', () => {
      const decimal = new Prisma.Decimal('1500.50');
      expect(toNumber(decimal)).toBe(1500.5);
    });

    it('should convert number directly', () => {
      expect(toNumber(2500)).toBe(2500);
    });

    it('should convert numeric string to number', () => {
      expect(toNumber('3500.75')).toBe(3500.75);
    });

    it('should handle duck-typed Decimal object', () => {
      const duck = { toNumber: () => 42.5 };
      expect(toNumber(duck as unknown as Prisma.Decimal)).toBe(42.5);
    });

    it('should return null for null and undefined', () => {
      expect(toNumber(null)).toBeNull();
      expect(toNumber(undefined)).toBeNull();
    });

    it('should return null for non-finite or invalid string', () => {
      expect(toNumber('invalid_num')).toBeNull();
      expect(toNumber(Infinity)).toBeNull();
      expect(toNumber(NaN)).toBeNull();
      expect(toNumber({} as unknown as number)).toBeNull();
      expect(toNumber(true as unknown as number)).toBe(1);
    });
  });

  describe('toOptionalNumber', () => {
    it('should return undefined for null/undefined or invalid', () => {
      expect(toOptionalNumber(null)).toBeUndefined();
      expect(toOptionalNumber(undefined)).toBeUndefined();
      expect(toOptionalNumber('not-a-number')).toBeUndefined();
    });

    it('should return number when valid', () => {
      expect(toOptionalNumber(new Prisma.Decimal('500'))).toBe(500);
      expect(toOptionalNumber(123)).toBe(123);
    });
  });

  describe('toRequiredNumber', () => {
    it('should return number when valid', () => {
      expect(toRequiredNumber(new Prisma.Decimal('80000'), 'monthlyIncome')).toBe(80000);
      expect(toRequiredNumber('1250.25', 'amount')).toBe(1250.25);
    });

    it('should throw DatabaseError(VALIDATION_ERROR) when null or invalid', () => {
      expect(() => toRequiredNumber(null, 'monthlyIncome')).toThrow(DatabaseError);
      expect(() => toRequiredNumber('not-a-number', 'targetAmount')).toThrowError(
        /Required monetary value for "targetAmount"/
      );
    });
  });

  describe('toDecimal', () => {
    it('should convert number to Prisma.Decimal rounded to 2 decimals', () => {
      const dec = toDecimal(123.456);
      expect(dec).toBeInstanceOf(Prisma.Decimal);
      expect(dec?.toString()).toBe('123.46');
    });

    it('should return existing Prisma.Decimal instances untouched', () => {
      const original = new Prisma.Decimal('999.99');
      expect(toDecimal(original)).toBe(original);
    });

    it('should convert numeric string to Prisma.Decimal', () => {
      const dec = toDecimal('450.70');
      expect(dec?.toNumber()).toBe(450.7);
    });

    it('should return null for null, undefined, empty string, or invalid input', () => {
      expect(toDecimal(null)).toBeNull();
      expect(toDecimal(undefined)).toBeNull();
      expect(toDecimal('')).toBeNull();
      expect(toDecimal('   ')).toBeNull();
      expect(toDecimal('abc')).toBeNull();
      expect(toDecimal(NaN)).toBeNull();
      expect(toDecimal(Infinity)).toBeNull();
      expect(toDecimal({} as unknown as number)).toBeNull();
    });
  });

  describe('toOptionalDecimal', () => {
    it('should return undefined for null, undefined, or invalid', () => {
      expect(toOptionalDecimal(null)).toBeUndefined();
      expect(toOptionalDecimal(undefined)).toBeUndefined();
      expect(toOptionalDecimal('abc')).toBeUndefined();
    });

    it('should return Prisma.Decimal for valid values', () => {
      const dec = toOptionalDecimal(100);
      expect(dec).toBeInstanceOf(Prisma.Decimal);
      expect(dec?.toNumber()).toBe(100);
    });
  });

  describe('toRequiredDecimal', () => {
    it('should return Prisma.Decimal for valid inputs', () => {
      const dec = toRequiredDecimal(1500, 'currentSavings');
      expect(dec).toBeInstanceOf(Prisma.Decimal);
      expect(dec.toNumber()).toBe(1500);
    });

    it('should throw DatabaseError(VALIDATION_ERROR) when null or invalid', () => {
      expect(() => toRequiredDecimal(null, 'currentSavings')).toThrow(DatabaseError);
      expect(() => toRequiredDecimal('invalid', 'emergencyFundTarget')).toThrowError(
        /Required monetary value for "emergencyFundTarget"/
      );
    });
  });
});
