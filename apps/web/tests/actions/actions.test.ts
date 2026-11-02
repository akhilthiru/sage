import { describe, it, expect, vi } from 'vitest';
import { submitOnboarding } from '@/app/actions/onboarding.actions';
import {
  runPurchaseSimulationAction,
  runLoanSimulationAction,
} from '@/app/actions/simulation.actions';
import {
  createGoalAction,
  updateGoalProgressAction,
  deleteGoalAction,
} from '@/app/actions/goal.actions';

// Mock next/cache revalidatePath
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Server Actions Integration', () => {
  describe('submitOnboarding', () => {
    it('successfully completes onboarding and sets up allocation', async () => {
      const res = await submitOnboarding({
        monthlyIncome: 90000,
        currentSavings: 180000,
        emergencyFundTarget: 270000,
        riskTolerance: 'MEDIUM',
        goal: {
          name: 'Starter Emergency Cushion',
          category: 'EMERGENCY_FUND',
          targetAmount: 200000,
          targetMonths: 6,
        },
      });

      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();
    });

    it('handles invalid input gracefully', async () => {
      const res = await submitOnboarding({
        monthlyIncome: -500, // Invalid negative income
        currentSavings: 0,
        emergencyFundTarget: 0,
        riskTolerance: 'LOW',
      });

      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
    });
  });

  describe('runPurchaseSimulationAction', () => {
    it('runs purchase affordability evaluation deterministically', async () => {
      const res = await runPurchaseSimulationAction({
        name: '4K Monitor',
        amount: 45000,
      });

      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();
      expect(res.data?.canAfford).toBe(true);
      expect(res.data?.impact.savingsReduction).toBeGreaterThanOrEqual(0);
    });

    it('handles negative or invalid amount gracefully', async () => {
      const res = await runPurchaseSimulationAction({
        name: 'Invalid Item',
        amount: -100,
      });

      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
    });
  });

  describe('runLoanSimulationAction', () => {
    it('calculates deterministic EMI and affordability', async () => {
      const res = await runLoanSimulationAction({
        loanAmount: 400000,
        interestRate: 9.0,
        termMonths: 24,
        purpose: 'Car Loan',
      });

      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();
      expect(res.data?.monthlyPayment).toBeGreaterThan(0);
      expect(res.data?.totalInterest).toBeGreaterThan(0);
      expect(res.data?.affordability).toBeDefined();
    });

    it('handles negative or invalid loan terms gracefully', async () => {
      const res = await runLoanSimulationAction({
        loanAmount: -1000,
        interestRate: -5,
        termMonths: 0,
        purpose: '',
      });

      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
    });
  });

  describe('Goal Management Actions', () => {
    let createdGoalId: string;

    it('creates a new financial goal', async () => {
      const now = new Date();
      const targetDate = new Date(now.getFullYear(), now.getMonth() + 10, 1);

      const res = await createGoalAction({
        name: 'Action Test Vacation Goal',
        category: 'VACATION',
        targetAmount: 120000,
        currentAmount: 20000,
        targetDate: targetDate.toISOString(),
        priority: 'MEDIUM',
      });

      expect(res.success).toBe(true);
      expect(res.data?.goal.name).toBe('Action Test Vacation Goal');
      createdGoalId = res.data!.goal.id;
    });

    it('handles invalid goal creation gracefully', async () => {
      const res = await createGoalAction({
        name: '',
        category: 'INVALID',
        targetAmount: -100,
        targetDate: 'invalid-date',
      });

      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
    });

    it('updates progress on existing goal', async () => {
      const res = await updateGoalProgressAction(createdGoalId, 15000);
      expect(res.success).toBe(true);
      expect(res.data?.goal.currentAmount).toBe(35000);
    });

    it('handles update on non-existent goal gracefully', async () => {
      const res = await updateGoalProgressAction('non_existent_goal_id', 5000);
      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
    });

    it('deletes the goal successfully', async () => {
      const res = await deleteGoalAction(createdGoalId);
      expect(res.success).toBe(true);
    });

    it('handles delete on non-existent goal gracefully', async () => {
      const res = await deleteGoalAction('non_existent_goal_id');
      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
    });
  });
});
