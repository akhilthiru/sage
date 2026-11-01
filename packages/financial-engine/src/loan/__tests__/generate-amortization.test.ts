import { describe, it, expect } from 'vitest';
import { generateAmortization } from '../generate-amortization';

describe('generateAmortization', () => {
  describe('Happy Path', () => {
    it('should generate complete schedule for valid loan', () => {
      const result = generateAmortization({
        principal: 100000,
        annualInterestRate: 12,
        tenureMonths: 12
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(12);
        
        // Month 1 checks
        const month1 = result.data[0];
        expect(month1.month).toBe(1);
        expect(month1.emi).toBeGreaterThan(0);
        expect(month1.interest).toBeCloseTo(1000, 0); // 100,000 * 1%
        expect(month1.principal).toBeCloseTo(month1.emi - month1.interest, 2);
        expect(month1.balance).toBeLessThan(100000);

        // Final month checks
        const finalMonth = result.data[11];
        expect(finalMonth.month).toBe(12);
        expect(finalMonth.balance).toBe(0); // Final balance must be exactly 0
      }
    });

    it('should produce monotonically decreasing balance and interest payments', () => {
      const result = generateAmortization({
        principal: 500000,
        annualInterestRate: 10,
        tenureMonths: 24
      });

      expect(result.success).toBe(true);
      if (result.success) {
        for (let i = 1; i < result.data.length; i++) {
          const prev = result.data[i - 1];
          const curr = result.data[i];
          expect(curr.balance).toBeLessThan(prev.balance);
          expect(curr.interest).toBeLessThanOrEqual(prev.interest);
          expect(curr.principal).toBeGreaterThanOrEqual(prev.principal);
        }
      }
    });

    it('should handle zero interest loan amortization correctly', () => {
      const result = generateAmortization({
        principal: 120000,
        annualInterestRate: 0,
        tenureMonths: 12
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(12);
        result.data.forEach(entry => {
          expect(entry.interest).toBe(0);
          expect(entry.principal).toBe(10000);
          expect(entry.emi).toBe(10000);
        });
        expect(result.data[11].balance).toBe(0);
      }
    });
  });

  describe('Edge Cases & Boundaries', () => {
    it('should handle single month tenure', () => {
      const result = generateAmortization({
        principal: 50000,
        annualInterestRate: 12,
        tenureMonths: 1
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].balance).toBe(0);
      }
    });

    it('should handle maximum allowed tenure (360 months)', () => {
      const result = generateAmortization({
        principal: 1000000,
        annualInterestRate: 8.5,
        tenureMonths: 360
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(360);
        expect(result.data[359].balance).toBe(0);
      }
    });
  });

  describe('Error Conditions', () => {
    it('should fail with validation error for negative principal', () => {
      const result = generateAmortization({
        principal: -50000,
        annualInterestRate: 12,
        tenureMonths: 12
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should fail with validation error for zero principal', () => {
      const result = generateAmortization({
        principal: 0,
        annualInterestRate: 12,
        tenureMonths: 12
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should fail for tenure exceeding 360 months', () => {
      const result = generateAmortization({
        principal: 100000,
        annualInterestRate: 10,
        tenureMonths: 361
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });
  });
});
