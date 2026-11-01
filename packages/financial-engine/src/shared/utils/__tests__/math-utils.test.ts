import { describe, it, expect } from 'vitest';
import { roundToTwo, roundToNearest, clamp, percentage, roundToDecimal } from '../math-utils';

describe('math-utils', () => {
  it('should round correctly to two decimal places', () => {
    expect(roundToTwo(10.555)).toBe(10.56);
    expect(roundToTwo(10.554)).toBe(10.55);
    expect(roundToTwo(10)).toBe(10);
  });

  it('should round to nearest multiple', () => {
    expect(roundToNearest(149, 100)).toBe(100);
    expect(roundToNearest(150, 100)).toBe(200);
    expect(roundToNearest(25, 50)).toBe(50);
  });

  it('should clamp numbers correctly within bounds', () => {
    expect(clamp(50, 0, 100)).toBe(50);
    expect(clamp(-10, 0, 100)).toBe(0);
    expect(clamp(150, 0, 100)).toBe(100);
  });

  it('should calculate percentages and handle zero division', () => {
    expect(percentage(25, 100)).toBe(25);
    expect(percentage(50, 0)).toBe(0);
  });

  it('should round to specified decimals', () => {
    expect(roundToDecimal(1.23456, 3)).toBe(1.235);
    expect(roundToDecimal(1.23456, 1)).toBe(1.2);
  });
});
