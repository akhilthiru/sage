import { describe, it, expect } from 'vitest';
import { calculateConfidence } from '../calculate-confidence';

describe('calculateConfidence', () => {
  const baseInput = {
    predictionType: 'GOAL' as const,
    profileCompleteness: 90,
    incomeStability: 'STABLE' as const,
    expenseHistoryMonths: 12,
    emergencyFundStatus: 'MET' as const,
    debtToIncomeRatio: 15,
    dataRecencyDays: 2,
    timelineMonths: 12
  };

  describe('Happy Path', () => {
    it('should calculate very_high or high confidence for complete profile and stable financials', () => {
      const result = calculateConfidence(baseInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(['very_high', 'high']).toContain(result.data.level);
        expect(result.data.value).toBeGreaterThanOrEqual(75);
        expect(result.data.factors.length).toBeGreaterThan(0);
      }
    });

    it('should calculate lower confidence for variable income, high DTI, and incomplete profile', () => {
      const result = calculateConfidence({
        predictionType: 'GOAL' as const,
        profileCompleteness: 30,
        incomeStability: 'VARIABLE' as const,
        expenseHistoryMonths: 1,
        emergencyFundStatus: 'NOT_MET' as const,
        debtToIncomeRatio: 55,
        dataRecencyDays: 60,
        timelineMonths: 36
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(['low', 'very_low', 'medium']).toContain(result.data.level);
        expect(result.data.value).toBeLessThan(70);
      }
    });

    it('should support UNKNOWN status and moderate thresholds', () => {
      const result = calculateConfidence({
        predictionType: 'GOAL' as const,
        profileCompleteness: 75,
        incomeStability: 'UNKNOWN' as const,
        expenseHistoryMonths: 5,
        emergencyFundStatus: 'UNKNOWN' as const,
        debtToIncomeRatio: 30,
        dataRecencyDays: 20,
        timelineMonths: 8
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.value).toBeGreaterThan(0);
      }
    });

    it('should support medium profile completeness (55%) and moderate DTI (45%)', () => {
      const result = calculateConfidence({
        predictionType: 'GOAL' as const,
        profileCompleteness: 55,
        incomeStability: 'STABLE' as const,
        expenseHistoryMonths: 8,
        emergencyFundStatus: 'MET' as const,
        debtToIncomeRatio: 45,
        dataRecencyDays: 80
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.value).toBeGreaterThan(0);
      }
    });

    it('should support PURCHASE prediction type with purchaseToIncomeRatio', () => {
      const result = calculateConfidence({
        predictionType: 'PURCHASE' as const,
        profileCompleteness: 85,
        incomeStability: 'STABLE' as const,
        expenseHistoryMonths: 6,
        emergencyFundStatus: 'NOT_MET' as const,
        debtToIncomeRatio: 20,
        dataRecencyDays: 5,
        purchaseToIncomeRatio: 15
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.factors.some(f => f.name.toLowerCase().includes('purchase'))).toBe(true);
      }
    });
  });

  describe('Clamping & Boundaries', () => {
    it('score value should always remain between 0 and 100', () => {
      const highResult = calculateConfidence({
        ...baseInput,
        profileCompleteness: 100,
        dataRecencyDays: 0
      });
      const lowResult = calculateConfidence({
        predictionType: 'GOAL' as const,
        profileCompleteness: 0,
        incomeStability: 'VARIABLE' as const,
        expenseHistoryMonths: 0,
        emergencyFundStatus: 'NOT_MET' as const,
        debtToIncomeRatio: 90,
        dataRecencyDays: 180,
        timelineMonths: 120
      });

      expect(highResult.success && lowResult.success).toBe(true);
      if (highResult.success && lowResult.success) {
        expect(highResult.data.value).toBeLessThanOrEqual(100);
        expect(lowResult.data.value).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Error Conditions', () => {
    it('should reject invalid profile completeness (>100 or <0)', () => {
      const result = calculateConfidence({
        ...baseInput,
        profileCompleteness: 120
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should reject negative debtToIncomeRatio', () => {
      const result = calculateConfidence({
        ...baseInput,
        debtToIncomeRatio: -10
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });
  });
});
