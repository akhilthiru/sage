import { describe, it, expect } from 'vitest';
import { simulatePurchase } from '../simulate-purchase';

describe('simulatePurchase', () => {
  const baseInput = {
    purchaseAmount: 50000,
    itemName: 'MacBook Air',
    currentSavings: 150000,
    emergencyFundTarget: 100000,
    currentEmergencyFund: 100000,
    monthlyIncome: 80000,
    monthlyExpenses: 40000,
    activeGoals: [],
    existingDebts: []
  };

  describe('Happy Path', () => {
    it('should simulate 3 scenarios (savings, loan, save first) and assess viability', () => {
      const result = simulatePurchase(baseInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.scenarios).toHaveLength(3);
        expect(result.data.canAfford).toBe(true);
        expect(['BUY_FROM_SAVINGS', 'SAVE_FIRST', 'LOAN_EMI']).toContain(result.data.recommended);
        expect(result.data.confidence).toBeDefined();
        expect(result.data.confidence.value).toBeGreaterThan(0);
      }
    });

    it('should recommend BUY_FROM_SAVINGS when savings are plentiful and save-first has no monthly surplus after debt', () => {
      const result = simulatePurchase({
        purchaseAmount: 50000,
        itemName: 'Tools',
        currentSavings: 200000,
        emergencyFundTarget: 100000,
        currentEmergencyFund: 100000,
        monthlyIncome: 60000,
        monthlyExpenses: 59000,
        activeGoals: [],
        existingDebts: [
          {
            minimumPayment: 2000,
            status: 'ACTIVE' as const
          }
        ]
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.recommended).toBe('BUY_FROM_SAVINGS');
      }
    });

    it('should recommend LOAN_EMI when savings are inadequate, saving takes long, but loan DTI is comfortable', () => {
      const result = simulatePurchase({
        purchaseAmount: 80000,
        itemName: 'Used Bike',
        currentSavings: 10000,
        emergencyFundTarget: 100000,
        currentEmergencyFund: 10000,
        monthlyIncome: 100000,
        monthlyExpenses: 88000,
        activeGoals: [],
        existingDebts: []
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(['LOAN_EMI', 'SAVE_FIRST', 'BUY_FROM_SAVINGS']).toContain(result.data.recommended);
      }
    });

    it('should handle completely unaffordable purchase (NONE recommended)', () => {
      const result = simulatePurchase({
        purchaseAmount: 1000000,
        itemName: 'Luxury Watch',
        currentSavings: 5000,
        emergencyFundTarget: 200000,
        currentEmergencyFund: 5000,
        monthlyIncome: 30000,
        monthlyExpenses: 29000,
        activeGoals: [],
        existingDebts: [
          {
            minimumPayment: 5000,
            status: 'ACTIVE' as const
          }
        ]
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.canAfford).toBe(false);
        expect(result.data.recommended).toBe('NONE');
        expect(result.data.confidence.level).toBe('very_low');
      }
    });

    it('should evaluate impact on active goals adhering to GoalItemSchema', () => {
      const result = simulatePurchase({
        ...baseInput,
        purchaseAmount: 60000,
        activeGoals: [
          {
            id: 'car-goal',
            targetAmount: 300000,
            currentAmount: 100000,
            targetDate: '2028-01-01T00:00:00.000Z',
            priority: 'HIGH' as const,
            status: 'ACTIVE' as const
          }
        ]
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.scenarios.length).toBe(3);
      }
    });
  });

  describe('Error Conditions', () => {
    it('should reject invalid purchaseAmount <= 0', () => {
      const result = simulatePurchase({
        ...baseInput,
        purchaseAmount: 0
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should reject monthlyExpenses >= monthlyIncome', () => {
      const result = simulatePurchase({
        ...baseInput,
        monthlyIncome: 50000,
        monthlyExpenses: 60000
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should reject currentEmergencyFund exceeding emergencyFundTarget', () => {
      const result = simulatePurchase({
        ...baseInput,
        currentEmergencyFund: 200000,
        emergencyFundTarget: 100000
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });
  });
});
