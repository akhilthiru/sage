import { describe, it, expect } from 'vitest';
import { normalizeToMonthly, convertFromMonthly, getAnnualMultiplier } from '../frequency-utils';
import type { Frequency } from '../../types/common';

describe('frequency-utils', () => {
  const frequencies: Frequency[] = [
    'DAILY',
    'WEEKLY',
    'BIWEEKLY',
    'MONTHLY',
    'QUARTERLY',
    'ANNUAL',
    'ONE_TIME'
  ];

  it('should normalize amounts to monthly for all frequencies', () => {
    expect(normalizeToMonthly(100, 'DAILY')).toBe(3000);
    expect(normalizeToMonthly(100, 'WEEKLY')).toBe(433);
    expect(normalizeToMonthly(100, 'BIWEEKLY')).toBe(217);
    expect(normalizeToMonthly(100, 'MONTHLY')).toBe(100);
    expect(normalizeToMonthly(1200, 'ANNUAL')).toBe(100);
    expect(normalizeToMonthly(300, 'QUARTERLY')).toBe(100);
    expect(normalizeToMonthly(500, 'ONE_TIME')).toBe(0);
  });

  it('should convert from monthly to specified frequencies', () => {
    frequencies.forEach(freq => {
      const result = convertFromMonthly(1200, freq);
      expect(result).toBeGreaterThanOrEqual(0);
    });
    expect(convertFromMonthly(3000, 'DAILY')).toBe(100);
    expect(convertFromMonthly(100, 'MONTHLY')).toBe(100);
    expect(convertFromMonthly(100, 'ANNUAL')).toBeCloseTo(8.33, 2);
  });

  it('should return correct annual multiplier for all frequencies', () => {
    expect(getAnnualMultiplier('DAILY')).toBe(365);
    expect(getAnnualMultiplier('WEEKLY')).toBe(52);
    expect(getAnnualMultiplier('BIWEEKLY')).toBe(26);
    expect(getAnnualMultiplier('MONTHLY')).toBe(12);
    expect(getAnnualMultiplier('QUARTERLY')).toBe(4);
    expect(getAnnualMultiplier('ANNUAL')).toBe(1);
    expect(getAnnualMultiplier('ONE_TIME')).toBe(0);
  });
});
