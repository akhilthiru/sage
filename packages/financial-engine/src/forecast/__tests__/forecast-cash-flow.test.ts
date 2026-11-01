import { describe, it, expect } from 'vitest';
import { forecastCashFlow } from '../forecast-cash-flow';

describe('forecastCashFlow', () => {
  const baseInput = {
    startDate: '2026-01-01T00:00:00.000Z',
    months: 12,
    currentBalance: 50000,
    monthlyIncome: 100000,
    allocation: {
      essentialExpenses: 40000,
      debtPayments: 10000,
      emergencyFund: 10000,
      goalSavings: 20000,
      investments: 10000,
      discretionary: 10000,
      goalAllocations: {
        'goal-1': 20000
      }
    },
    expenses: [
      {
        amount: 40000,
        frequency: 'MONTHLY' as const,
        isActive: true
      }
    ],
    debts: [
      {
        minimumPayment: 10000,
        status: 'ACTIVE' as const
      }
    ],
    goals: [
      {
        id: 'goal-1',
        targetAmount: 200000,
        currentAmount: 40000,
        targetDate: '2027-01-01T00:00:00.000Z',
        priority: 'HIGH' as const,
        status: 'ACTIVE' as const
      }
    ]
  };

  describe('Happy Path', () => {
    it('should generate monthly projections for the given horizon', () => {
      const result = forecastCashFlow(baseInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.projections).toHaveLength(12);
        expect(result.data.summary.finalBalance).toBeDefined();
        expect(result.data.summary.totalIncome).toBeGreaterThan(0);
        expect(result.data.summary.hasNegativeBalance).toBe(false);
      }
    });

    it('should track goal completion when progress reaches target', () => {
      const result = forecastCashFlow({
        ...baseInput,
        goals: [
          {
            id: 'small-goal',
            targetAmount: 30000,
            currentAmount: 20000,
            targetDate: '2027-01-01T00:00:00.000Z',
            priority: 'HIGH' as const,
            status: 'ACTIVE' as const
          }
        ],
        allocation: {
          ...baseInput.allocation,
          goalAllocations: {
            'small-goal': 15000
          }
        }
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.summary.goalsCompleted).toContain('small-goal');
      }
    });
  });

  describe('Negative Cash Flow Detection', () => {
    it('should flag negative balance and indicate the first negative month', () => {
      const result = forecastCashFlow({
        ...baseInput,
        currentBalance: 0,
        monthlyIncome: 10000,
        allocation: {
          ...baseInput.allocation,
          essentialExpenses: 40000,
          debtPayments: 10000,
          emergencyFund: 0,
          goalSavings: 0,
          investments: 0,
          discretionary: 0,
          goalAllocations: {}
        }
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.summary.hasNegativeBalance).toBe(true);
        expect(result.data.summary.firstNegativeMonth).toBe(1);
      }
    });
  });

  describe('Error Conditions', () => {
    it('should reject invalid horizon (e.g. 0 months)', () => {
      const result = forecastCashFlow({
        ...baseInput,
        months: 0
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should reject invalid start date', () => {
      const result = forecastCashFlow({
        ...baseInput,
        startDate: 'not-a-date'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });
  });
});
