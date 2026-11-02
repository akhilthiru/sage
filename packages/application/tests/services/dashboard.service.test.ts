import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DashboardService } from '../../src/services/dashboard.service';
import {
  createMockProfileRepository,
  createMockGoalRepository,
  createMockExpenseRepository,
  createMockDebtRepository,
  createMockAllocationRepository,
} from '../helpers/mock-repositories';
import { NotFoundError, DatabaseOperationError, BusinessRuleError } from '../../src/errors';
import * as financialEngine from '@sage/financial-engine';

describe('DashboardService', () => {
  let profileRepo: ReturnType<typeof createMockProfileRepository>;
  let goalRepo: ReturnType<typeof createMockGoalRepository>;
  let expenseRepo: ReturnType<typeof createMockExpenseRepository>;
  let debtRepo: ReturnType<typeof createMockDebtRepository>;
  let allocationRepo: ReturnType<typeof createMockAllocationRepository>;
  let service: DashboardService;

  const mockProfile = {
    id: 'prof-1',
    userId: 'user-1',
    monthlyIncome: 120000,
    otherIncome: 0,
    incomeFrequency: 'MONTHLY' as const,
    currentSavings: 100000,
    emergencyFundTarget: 360000,
    currentEmergencyFund: 180000,
    primaryGoal: null,
    riskTolerance: 'MODERATE' as const,
    cfoUnderstandingScore: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockGoal = {
    id: 'goal-1',
    userId: 'user-1',
    name: 'Home Downpayment',
    description: null,
    type: 'HOUSE' as const,
    targetAmount: 2000000,
    currentAmount: 500000,
    monthlyContribution: 30000,
    targetDate: new Date('2028-12-31'),
    startDate: new Date(),
    completedDate: null,
    priority: 'HIGH' as const,
    status: 'ACTIVE' as const,
    isFeasible: true,
    feasibilityScore: 85,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockExpense = {
    id: 'exp-1',
    userId: 'user-1',
    name: 'Rent',
    amount: 35000,
    category: 'RENT' as const,
    frequency: 'MONTHLY' as const,
    isEssential: true,
    isActive: true,
    startDate: new Date('2026-01-01'),
    endDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockDebt = {
    id: 'debt-1',
    userId: 'user-1',
    name: 'Education Loan',
    type: 'EDUCATION_LOAN' as const,
    principalAmount: 500000,
    currentBalance: 300000,
    interestRate: 8,
    monthlyPayment: 15000,
    minimumPayment: 15000,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2028-01-01'),
    status: 'ACTIVE' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockAllocation = {
    id: 'alloc-1',
    userId: 'user-1',
    month: 12,
    year: 2026,
    essentialExpenses: 35000,
    debtPayments: 15000,
    emergencyFund: 10000,
    goalSavings: 30000,
    investments: 10000,
    discretionary: 20000,
    totalIncome: 120000,
    totalAllocated: 120000,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    profileRepo = createMockProfileRepository({
      findByUserId: vi.fn().mockResolvedValue({ success: true, data: mockProfile }),
    });
    goalRepo = createMockGoalRepository({
      findActiveByUserId: vi.fn().mockResolvedValue({ success: true, data: [mockGoal] }),
    });
    expenseRepo = createMockExpenseRepository({
      findActiveByUserId: vi.fn().mockResolvedValue({ success: true, data: [mockExpense] }),
    });
    debtRepo = createMockDebtRepository({
      findActiveByUserId: vi.fn().mockResolvedValue({ success: true, data: [mockDebt] }),
    });
    allocationRepo = createMockAllocationRepository({
      findByUserId: vi.fn().mockResolvedValue({ success: true, data: [mockAllocation] }),
    });

    service = new DashboardService(
      profileRepo,
      goalRepo,
      expenseRepo,
      debtRepo,
      allocationRepo
    );
  });

  describe('getDashboard', () => {
    it('should aggregate all data into a unified dashboard DTO', async () => {
      const res = await service.getDashboard({ userId: 'user-1' });

      expect(res.dashboard).toBeDefined();
      expect(res.dashboard.userId).toBe('user-1');

      // Financial Health
      expect(res.dashboard.financialHealth.score).toBeGreaterThan(0);
      expect(['A', 'B', 'C', 'D', 'F']).toContain(res.dashboard.financialHealth.grade);
      expect(['EXCELLENT', 'GOOD', 'FAIR', 'POOR']).toContain(res.dashboard.financialHealth.status);
      expect(res.dashboard.financialHealth.factors.debtToIncome).toBeDefined();

      // Allocation
      expect(res.dashboard.allocation.id).toBe('alloc-1');
      expect(res.dashboard.allocation.needs).toBe(50000); // 35000 + 15000

      // Goals
      expect(res.dashboard.goals.active.length).toBe(1);
      expect(res.dashboard.goals.summary.totalGoals).toBe(1);
      expect(res.dashboard.goals.summary.onTrack).toBe(1);

      // Expenses
      expect(res.dashboard.expenses.recent.length).toBe(1);
      expect(res.dashboard.expenses.monthlyTotal).toBe(35000);
      expect(res.dashboard.expenses.byCategory['RENT']).toBe(35000);

      // Debts
      expect(res.dashboard.debts.active.length).toBe(1);
      expect(res.dashboard.debts.totalBalance).toBe(300000);
      expect(res.dashboard.debts.totalMonthlyPayment).toBe(15000);

      // Insights
      expect(res.dashboard.insights.length).toBeGreaterThan(0);
    });

    it('should handle EXCELLENT, FAIR, and CRITICAL/POOR health levels', async () => {
      const healthSpy = vi.spyOn(financialEngine, 'calculateFinancialHealth');

      // FAIR
      healthSpy.mockReturnValueOnce({
        success: true,
        data: {
          score: 65,
          grade: 'C',
          level: 'FAIR',
          riskLevel: 'MODERATE',
          riskFactors: [],
          metrics: {
            debtToIncomeRatio: 45,
            savingsRate: 10,
            emergencyFundMonths: 2,
            expenseRatio: 60,
            goalProgressRate: 50,
          },
          recommendations: [{ priority: 'HIGH', category: 'DEBT', recommendation: 'Pay off debt', impact: 'High' }],
          strengths: [],
          weaknesses: [],
        },
      });

      const resFair = await service.getDashboard({ userId: 'user-1' });
      expect(resFair.dashboard.financialHealth.status).toBe('FAIR');
      expect(resFair.dashboard.insights.some((i) => i.includes('Debt payments consume more than 40%'))).toBe(true);
      expect(resFair.dashboard.insights.some((i) => i.includes('Emergency fund coverage is below 3 months'))).toBe(true);

      // CRITICAL -> POOR
      healthSpy.mockReturnValueOnce({
        success: true,
        data: {
          score: 30,
          grade: 'F',
          level: 'CRITICAL',
          riskLevel: 'CRITICAL',
          riskFactors: [],
          metrics: {
            debtToIncomeRatio: 60,
            savingsRate: 0,
            emergencyFundMonths: 0.5,
            expenseRatio: 90,
            goalProgressRate: 10,
          },
          recommendations: [],
          strengths: [],
          weaknesses: [],
        },
      });

      const resCritical = await service.getDashboard({ userId: 'user-1' });
      expect(resCritical.dashboard.financialHealth.status).toBe('POOR');

      healthSpy.mockRestore();
    });

    it('should throw BusinessRuleError when calculateFinancialHealth engine returns failure', async () => {
      const healthSpy = vi.spyOn(financialEngine, 'calculateFinancialHealth').mockReturnValueOnce({
        success: false,
        error: { code: 'HEALTH_FAIL', message: 'Calculation error' },
      } as any);

      await expect(service.getDashboard({ userId: 'user-1' })).rejects.toThrow(BusinessRuleError);
      healthSpy.mockRestore();
    });

    it('should handle user without allocations gracefully', async () => {
      allocationRepo.findByUserId = vi.fn().mockResolvedValue({ success: true, data: [] });
      const res = await service.getDashboard({ userId: 'user-1' });
      expect(res.dashboard.allocation).toBeDefined();
      expect(res.dashboard.allocation.id).toBe('unallocated');
    });

    it('should throw NotFoundError if profile not found', async () => {
      profileRepo.findByUserId = vi.fn().mockResolvedValue({ success: true, data: null });
      await expect(service.getDashboard({ userId: 'missing-user' })).rejects.toThrow(NotFoundError);
    });

    it('should throw DatabaseOperationError if goals query fails', async () => {
      goalRepo.findActiveByUserId = vi.fn().mockResolvedValue({
        success: false,
        error: new Error('Goals DB error'),
      });
      await expect(service.getDashboard({ userId: 'user-1' })).rejects.toThrow(DatabaseOperationError);
    });

    it('should throw DatabaseOperationError if expenses query fails', async () => {
      expenseRepo.findActiveByUserId = vi.fn().mockResolvedValue({
        success: false,
        error: new Error('Expenses DB error'),
      });
      await expect(service.getDashboard({ userId: 'user-1' })).rejects.toThrow(DatabaseOperationError);
    });

    it('should throw DatabaseOperationError if debts query fails', async () => {
      debtRepo.findActiveByUserId = vi.fn().mockResolvedValue({
        success: false,
        error: new Error('Debts DB error'),
      });
      await expect(service.getDashboard({ userId: 'user-1' })).rejects.toThrow(DatabaseOperationError);
    });
  });

  describe('calculateFinancialHealth', () => {
    it('should return financial health assessment directly', async () => {
      const res = await service.calculateFinancialHealth({ userId: 'user-1' });
      expect(res.health).toBeDefined();
      expect(res.health.score).toBeGreaterThan(0);
      expect(res.health.factors.emergencyFund).toBeDefined();
    });
  });
});
