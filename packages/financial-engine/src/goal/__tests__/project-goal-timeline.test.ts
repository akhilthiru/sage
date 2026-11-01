import { describe, it, expect } from 'vitest';
import { projectGoalTimeline } from '../project-goal-timeline';

describe('projectGoalTimeline', () => {
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 2); // 24 months

  const baseInput = {
    goal: {
      id: 'house-goal',
      targetAmount: 500000,
      currentAmount: 100000,
      targetDate: futureDate.toISOString(),
      priority: 'HIGH' as const
    },
    monthlyIncome: 100000,
    monthlyExpenses: 50000,
    otherGoalCommitments: 10000,
    emergencyFundStatus: 'MET' as const
  };

  describe('Happy Path', () => {
    it('should project feasible goal when available savings exceed required monthly savings', () => {
      const result = projectGoalTimeline(baseInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isFeasible).toBe(true);
        expect(result.data.feasibilityScore).toBeGreaterThan(60);
        expect(result.data.requiredMonthly).toBeGreaterThan(0);
        expect(result.data.availableMonthly).toBeGreaterThanOrEqual(result.data.requiredMonthly);
        expect(result.data.projectedCompletionDate).toBeDefined();
        expect(result.data.confidence).toBeDefined();
      }
    });

    it('should handle short timeline (<12 months) and high utilization', () => {
      const shortDate = new Date();
      shortDate.setMonth(shortDate.getMonth() + 6);

      const result = projectGoalTimeline({
        ...baseInput,
        goal: {
          ...baseInput.goal,
          targetAmount: 200000,
          currentAmount: 50000,
          targetDate: shortDate.toISOString()
        },
        emergencyFundStatus: 'NOT_MET' as const
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.monthsRemaining).toBeLessThanOrEqual(6);
        expect(result.data.confidence.factors.some(f => f.name.includes('Emergency Fund Not Met'))).toBe(true);
      }
    });

    it('should handle medium timeline (12 to 24 months) and moderate utilization', () => {
      const medDate = new Date();
      medDate.setMonth(medDate.getMonth() + 15);

      const result = projectGoalTimeline({
        ...baseInput,
        goal: {
          ...baseInput.goal,
          targetAmount: 300000,
          currentAmount: 50000,
          targetDate: medDate.toISOString()
        },
        monthlyIncome: 80000,
        monthlyExpenses: 50000,
        otherGoalCommitments: 5000
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.monthsRemaining).toBeGreaterThanOrEqual(12);
      }
    });

    it('should handle over-utilization when required savings exceed available', () => {
      const tightDate = new Date();
      tightDate.setMonth(tightDate.getMonth() + 2);

      const result = projectGoalTimeline({
        ...baseInput,
        goal: {
          ...baseInput.goal,
          targetDate: tightDate.toISOString()
        }
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isFeasible).toBe(false);
        expect(result.data.feasibilityScore).toBeLessThan(70);
        expect(result.data.recommendations.length).toBeGreaterThan(0);
      }
    });

    it('should identify already achieved goal when currentAmount equals targetAmount', () => {
      const result = projectGoalTimeline({
        ...baseInput,
        goal: {
          ...baseInput.goal,
          currentAmount: 500000
        }
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isFeasible).toBe(true);
        expect(result.data.feasibilityScore).toBe(100);
        expect(result.data.recommendations).toContain('Goal already achieved!');
      }
    });

    it('should mark infeasible when target date has passed', () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);

      const result = projectGoalTimeline({
        ...baseInput,
        goal: {
          ...baseInput.goal,
          targetDate: pastDate.toISOString()
        }
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isFeasible).toBe(false);
        expect(result.data.feasibilityScore).toBe(0);
      }
    });
  });

  describe('Error Conditions', () => {
    it('should reject invalid goal with targetAmount <= 0', () => {
      const result = projectGoalTimeline({
        ...baseInput,
        goal: {
          ...baseInput.goal,
          targetAmount: -1000
        }
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should reject negative monthlyIncome', () => {
      const result = projectGoalTimeline({
        ...baseInput,
        monthlyIncome: -50000
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });
  });
});
