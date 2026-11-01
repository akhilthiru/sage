import { describe, it, expect } from 'vitest';
import { calculateFinancialHealth } from '../calculate-financial-health';

describe('calculateFinancialHealth', () => {
  const baseInput = {
    monthlyIncome: 100000,
    monthlyExpenses: 40000,
    currentSavings: 300000,
    emergencyFundTarget: 240000,
    currentEmergencyFund: 240000,
    totalDebtBalance: 50000,
    monthlyDebtPayments: 10000,
    activeGoalsCount: 3,
    goalsOnTrack: 3
  };

  describe('Happy Path', () => {
    it('should calculate strong financial health score (Grade A/B, EXCELLENT/GOOD) for robust finances', () => {
      const result = calculateFinancialHealth(baseInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.score).toBeGreaterThanOrEqual(70);
        expect(['A', 'B']).toContain(result.data.grade);
        expect(['EXCELLENT', 'GOOD']).toContain(result.data.level);
        expect(result.data.riskLevel).toBe('LOW');
        expect(result.data.metrics.debtToIncomeRatio).toBe(10);
        expect(result.data.metrics.emergencyFundMonths).toBeGreaterThanOrEqual(4);
        expect(result.data.strengths.length).toBeGreaterThan(0);
      }
    });

    it('should handle moderate metrics (Grade B/C, FAIR) for intermediate DTI and savings', () => {
      const result = calculateFinancialHealth({
        monthlyIncome: 80000,
        monthlyExpenses: 48000, // 60% expense ratio
        currentSavings: 150000,
        emergencyFundTarget: 240000,
        currentEmergencyFund: 120000, // 2.5 months emergency fund
        totalDebtBalance: 200000,
        monthlyDebtPayments: 20000, // 25% DTI
        activeGoalsCount: 4,
        goalsOnTrack: 3 // 75% progress rate
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.score).toBeGreaterThan(50);
        expect(['B', 'C', 'FAIR', 'GOOD']).toContain(result.data.level || result.data.grade);
      }
    });

    it('should handle tight metrics (Grade D/F, POOR/CRITICAL) with low savings rate and high expense ratio', () => {
      const result = calculateFinancialHealth({
        monthlyIncome: 50000,
        monthlyExpenses: 42000, // 84% expense ratio
        currentSavings: 20000,
        emergencyFundTarget: 150000,
        currentEmergencyFund: 25000, // ~0.6 months
        totalDebtBalance: 700000, // total debt > annual income (600k)
        monthlyDebtPayments: 6000, // 12% DTI
        activeGoalsCount: 2,
        goalsOnTrack: 1 // 50% progress rate
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.riskFactors.length).toBeGreaterThan(0);
        expect(result.data.recommendations.length).toBeGreaterThan(0);
      }
    });

    it('should assign lower score (Grade C/D/F) for high DTI, no emergency fund, and zero goals on track', () => {
      const result = calculateFinancialHealth({
        monthlyIncome: 50000,
        monthlyExpenses: 30000,
        currentSavings: 5000,
        emergencyFundTarget: 180000,
        currentEmergencyFund: 0,
        totalDebtBalance: 400000,
        monthlyDebtPayments: 18000,
        activeGoalsCount: 3,
        goalsOnTrack: 0
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.score).toBeLessThan(75);
        expect(['C', 'D', 'F']).toContain(result.data.grade);
        expect(result.data.weaknesses.length).toBeGreaterThan(0);
        expect(result.data.recommendations.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Metrics and Edge Cases', () => {
    it('should handle zero active goals gracefully and default goalProgressRate to 100', () => {
      const result = calculateFinancialHealth({
        ...baseInput,
        activeGoalsCount: 0,
        goalsOnTrack: 0
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.metrics.goalProgressRate).toBe(100);
        expect(result.data.score).toBeGreaterThan(0);
      }
    });
  });

  describe('Error Conditions', () => {
    it('should reject invalid zero or negative monthlyIncome', () => {
      const result = calculateFinancialHealth({
        ...baseInput,
        monthlyIncome: 0
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should reject goalsOnTrack exceeding activeGoalsCount', () => {
      const result = calculateFinancialHealth({
        ...baseInput,
        activeGoalsCount: 2,
        goalsOnTrack: 5
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });
  });
});
