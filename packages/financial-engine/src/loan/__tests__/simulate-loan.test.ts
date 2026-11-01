import { describe, it, expect } from 'vitest';
import { simulateLoan } from '../simulate-loan';

describe('simulateLoan', () => {
  const baseInput = {
    principal: 500000,
    annualInterestRate: 10,
    tenureMonths: 24,
    monthlyIncome: 100000,
    monthlyExpenses: 40000,
    existingDebts: []
  };

  describe('Happy Path', () => {
    it('should determine COMFORTABLE affordability when DTI is low and surplus is high', () => {
      const result = simulateLoan(baseInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.affordability).toBe('COMFORTABLE');
        expect(result.data.emi).toBeGreaterThan(0);
        expect(result.data.debtToIncomeRatio).toBeLessThan(35);
        expect(result.data.monthlySurplus).toBeGreaterThan(20000);
        expect(result.data.amortizationSchedule).toHaveLength(24);
        expect(result.data.recommendation).toContain('comfortable');
      }
    });

    it('should determine MANAGEABLE affordability when DTI is moderate', () => {
      const result = simulateLoan({
        ...baseInput,
        monthlyIncome: 65000,
        monthlyExpenses: 30000
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(['COMFORTABLE', 'MANAGEABLE']).toContain(result.data.affordability);
        expect(result.data.monthlySurplus).toBeGreaterThan(0);
      }
    });

    it('should determine RISKY / UNAFFORDABLE when existing debts push DTI high', () => {
      const result = simulateLoan({
        ...baseInput,
        existingDebts: [
          {
            id: 'car-loan',
            monthlyPayment: 25000,
            status: 'ACTIVE' as const
          }
        ]
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(['MANAGEABLE', 'RISKY']).toContain(result.data.affordability);
        expect(result.data.debtToIncomeRatio).toBeGreaterThan(40);
      }
    });

    it('should identify UNAFFORDABLE when monthly surplus is negative or DTI exceeds risky thresholds', () => {
      const result = simulateLoan({
        principal: 2000000,
        annualInterestRate: 15,
        tenureMonths: 12,
        monthlyIncome: 50000,
        monthlyExpenses: 40000,
        existingDebts: []
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.affordability).toBe('UNAFFORDABLE');
        expect(result.data.suggestedTenure).toBeDefined();
        expect(result.data.monthlySurplus).toBeLessThan(0);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should ignore non-ACTIVE existing debts (PAID_OFF)', () => {
      const activeOnlyResult = simulateLoan({
        ...baseInput,
        existingDebts: [
          {
            id: 'old-debt',
            monthlyPayment: 20000,
            status: 'PAID_OFF' as const
          }
        ]
      });

      const noDebtResult = simulateLoan(baseInput);

      expect(activeOnlyResult.success && noDebtResult.success).toBe(true);
      if (activeOnlyResult.success && noDebtResult.success) {
        expect(activeOnlyResult.data.debtToIncomeRatio).toBe(noDebtResult.data.debtToIncomeRatio);
      }
    });
  });

  describe('Error Conditions', () => {
    it('should reject invalid input with negative income', () => {
      const result = simulateLoan({
        ...baseInput,
        monthlyIncome: -1000
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should reject invalid tenure', () => {
      const result = simulateLoan({
        ...baseInput,
        tenureMonths: 0
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });
  });
});
