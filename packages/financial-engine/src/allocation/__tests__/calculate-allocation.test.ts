import { describe, it, expect } from 'vitest';
import { calculateAllocation } from '../calculate-allocation';

describe('calculateAllocation', () => {
  const baseInput = {
    userId: 'user_123',
    month: 12,
    year: 2026,
    monthlyIncome: 100000,
    otherIncome: 0,
    essentialExpenses: [
      {
        amount: 30000,
        frequency: 'MONTHLY' as const,
        isActive: true
      },
      {
        amount: 10000,
        frequency: 'MONTHLY' as const,
        isActive: true
      }
    ],
    discretionaryExpenses: [],
    debts: [
      {
        minimumPayment: 5000,
        status: 'ACTIVE' as const
      }
    ],
    goals: [
      {
        id: 'emergency-goal',
        targetAmount: 200000,
        currentAmount: 50000,
        targetDate: '2028-01-01T00:00:00.000Z',
        priority: 'HIGH' as const,
        status: 'ACTIVE' as const
      }
    ],
    emergencyFundTarget: 300000,
    currentEmergencyFund: 100000,
    riskTolerance: 'MODERATE' as const
  };

  describe('Happy Path Waterfall', () => {
    it('should correctly allocate waterfall for normal income and surplus', () => {
      const result = calculateAllocation(baseInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.totalIncome).toBe(100000);
        expect(result.data.essentialExpenses).toBe(40000);
        expect(result.data.debtPayments).toBe(5000);
        expect(result.data.emergencyFund).toBeGreaterThan(0);
        expect(result.data.goalSavings).toBeGreaterThan(0);
        expect(result.data.discretionary).toBeGreaterThan(0);
        expect(result.data.warning).toBeUndefined();
      }
    });

    it('should allocate to investments when emergency fund target is fully met', () => {
      const result = calculateAllocation({
        ...baseInput,
        emergencyFundTarget: 300000,
        currentEmergencyFund: 300000
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.emergencyFund).toBe(0);
        expect(result.data.investments).toBeGreaterThan(0);
      }
    });

    it('should distribute goal savings according to goal priorities', () => {
      const result = calculateAllocation({
        ...baseInput,
        goals: [
          {
            id: 'high-goal',
            targetAmount: 100000,
            currentAmount: 10000,
            targetDate: '2028-01-01T00:00:00.000Z',
            priority: 'HIGH' as const,
            status: 'ACTIVE' as const
          },
          {
            id: 'low-goal',
            targetAmount: 100000,
            currentAmount: 10000,
            targetDate: '2028-01-01T00:00:00.000Z',
            priority: 'LOW' as const,
            status: 'ACTIVE' as const
          }
        ]
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.goalAllocations['high-goal']).toBeGreaterThan(0);
      }
    });
  });

  describe('Negative Cash Flow & Deficit Scenarios', () => {
    it('should flag warning when income cannot cover essentials and debt minimums', () => {
      const result = calculateAllocation({
        ...baseInput,
        monthlyIncome: 30000,
        essentialExpenses: [
          {
            amount: 35000,
            frequency: 'MONTHLY' as const,
            isActive: true
          }
        ],
        debts: [
          {
            minimumPayment: 20000,
            status: 'ACTIVE' as const
          }
        ]
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.warning).toBe('INCOME_INSUFFICIENT');
        expect(result.data.shortfall).toBeGreaterThan(0);
        expect(result.data.emergencyFund).toBe(0);
        expect(result.data.goalSavings).toBe(0);
        expect(result.data.discretionary).toBe(0);
      }
    });
  });

  describe('Error Conditions', () => {
    it('should reject invalid month', () => {
      const result = calculateAllocation({
        ...baseInput,
        month: 13
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should reject negative income', () => {
      const result = calculateAllocation({
        ...baseInput,
        monthlyIncome: -5000
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });
  });
});
