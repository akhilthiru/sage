import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SimulationService } from '../../src/services/simulation.service';
import { InProcessEventBus } from '../../src/events';
import {
  createMockSimulationRepository,
  createMockProfileRepository,
  createMockExpenseRepository,
  createMockDebtRepository,
  createMockGoalRepository,
  createMockAllocationRepository,
} from '../helpers/mock-repositories';
import { NotFoundError, AuthorizationError, DatabaseOperationError, BusinessRuleError } from '../../src/errors';
import * as financialEngine from '@sage/financial-engine';

describe('SimulationService', () => {
  let simulationRepo: ReturnType<typeof createMockSimulationRepository>;
  let profileRepo: ReturnType<typeof createMockProfileRepository>;
  let expenseRepo: ReturnType<typeof createMockExpenseRepository>;
  let debtRepo: ReturnType<typeof createMockDebtRepository>;
  let goalRepo: ReturnType<typeof createMockGoalRepository>;
  let allocationRepo: ReturnType<typeof createMockAllocationRepository>;
  let eventBus: InProcessEventBus;
  let service: SimulationService;

  const mockProfile = {
    id: 'prof-1',
    userId: 'user-1',
    monthlyIncome: 100000,
    otherIncome: 0,
    incomeFrequency: 'MONTHLY' as const,
    currentSavings: 150000,
    emergencyFundTarget: 300000,
    currentEmergencyFund: 200000,
    primaryGoal: null,
    riskTolerance: 'MODERATE' as const,
    cfoUnderstandingScore: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockGoal = {
    id: 'goal-1',
    userId: 'user-1',
    name: 'Vacation',
    description: null,
    type: 'VACATION' as const,
    targetAmount: 100000,
    currentAmount: 20000,
    monthlyContribution: 5000,
    targetDate: new Date('2028-06-01'),
    startDate: new Date(),
    completedDate: null,
    priority: 'MEDIUM' as const,
    status: 'ACTIVE' as const,
    isFeasible: true,
    feasibilityScore: 90,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockDebt = {
    id: 'debt-1',
    userId: 'user-1',
    name: 'Personal Loan',
    type: 'PERSONAL_LOAN' as const,
    principalAmount: 100000,
    currentBalance: 50000,
    interestRate: 12,
    monthlyPayment: 5000,
    minimumPayment: 5000,
    startDate: new Date(),
    endDate: new Date(),
    status: 'ACTIVE' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockSimRecord = {
    id: 'sim-1',
    userId: 'user-1',
    type: 'PURCHASE_AFFORDABILITY' as const,
    parameters: {},
    results: {},
    title: 'Test Sim',
    description: null,
    createdAt: new Date(),
  };

  beforeEach(() => {
    simulationRepo = createMockSimulationRepository({
      create: vi.fn().mockResolvedValue({ success: true, data: mockSimRecord }),
    });
    profileRepo = createMockProfileRepository({
      findByUserId: vi.fn().mockResolvedValue({ success: true, data: mockProfile }),
    });
    expenseRepo = createMockExpenseRepository({
      calculateTotalMonthly: vi.fn().mockResolvedValue({ success: true, data: 40000 }),
    });
    debtRepo = createMockDebtRepository({
      findActiveByUserId: vi.fn().mockResolvedValue({ success: true, data: [mockDebt] }),
    });
    goalRepo = createMockGoalRepository({
      findActiveByUserId: vi.fn().mockResolvedValue({ success: true, data: [mockGoal] }),
      findById: vi.fn().mockResolvedValue({ success: true, data: mockGoal }),
    });
    allocationRepo = createMockAllocationRepository({
      findByUserId: vi.fn().mockResolvedValue({
        success: true,
        data: [
          {
            id: 'alloc-1',
            userId: 'user-1',
            month: 12,
            year: 2026,
            essentialExpenses: 40000,
            debtPayments: 5000,
            emergencyFund: 10000,
            goalSavings: 20000,
            investments: 5000,
            discretionary: 20000,
            totalIncome: 100000,
            totalAllocated: 100000,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      }),
    });
    eventBus = new InProcessEventBus();

    service = new SimulationService(
      simulationRepo,
      profileRepo,
      expenseRepo,
      debtRepo,
      goalRepo,
      allocationRepo,
      eventBus
    );
  });

  describe('simulatePurchase', () => {
    it('should simulate purchase affordability and persist result', async () => {
      const publishSpy = vi.spyOn(eventBus, 'publish');
      const res = await service.simulatePurchase({
        userId: 'user-1',
        purchaseAmount: 50000,
        purchaseName: 'Gaming Laptop',
      });

      expect(res.simulationId).toBe('sim-1');
      expect(typeof res.canAfford).toBe('boolean');
      expect(res.impact).toBeDefined();
      expect(simulationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          type: 'PURCHASE_AFFORDABILITY',
        }),
        undefined
      );
      expect(publishSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle alternative viable scenarios (loan and saveFirst)', async () => {
      const simSpy = vi.spyOn(financialEngine, 'simulatePurchase').mockReturnValueOnce({
        success: true,
        data: {
          purchaseAmount: 50000,
          canAfford: true,
          recommended: 'BUY_FROM_SAVINGS',
          confidence: { value: 85, level: 'high', factors: [], summary: '' },
          scenarios: [
            {
              type: 'BUY_FROM_SAVINGS',
              isViable: true,
              immediateImpact: { newSavings: 100000, newEmergencyFund: 200000 },
              monthlyImpact: 0,
              totalCost: 50000,
              timeline: 3,
              goalImpacts: [{ goalId: 'goal-1', goalName: 'Vacation', delayMonths: 1 }],
              pros: [],
              cons: [],
              recommendation: true,
            },
            {
              type: 'LOAN_EMI',
              isViable: true,
              immediateImpact: { newSavings: 150000, newEmergencyFund: 200000 },
              monthlyImpact: 4500,
              totalCost: 54000,
              timeline: 12,
              emi: 4500,
              pros: [],
              cons: [],
              recommendation: false,
            },
            {
              type: 'SAVE_FIRST',
              isViable: true,
              immediateImpact: { newSavings: 150000, newEmergencyFund: 200000 },
              monthlyImpact: 10000,
              totalCost: 50000,
              timeline: 5,
              pros: [],
              cons: [],
              recommendation: false,
            },
          ],
        },
      });

      const res = await service.simulatePurchase({
        userId: 'user-1',
        purchaseAmount: 50000,
        purchaseName: 'Car Downpayment',
      });

      expect(res.alternatives.length).toBe(2);
      expect(res.impact.goalDelays.length).toBe(1);
      simSpy.mockRestore();
    });

    it('should throw BusinessRuleError when engine simulation fails', async () => {
      const simSpy = vi.spyOn(financialEngine, 'simulatePurchase').mockReturnValueOnce({
        success: false,
        error: { code: 'SIM_FAIL', message: 'Engine simulation error' },
      } as any);

      await expect(
        service.simulatePurchase({
          userId: 'user-1',
          purchaseAmount: 50000,
          purchaseName: 'Failing Item',
        })
      ).rejects.toThrow(BusinessRuleError);
      simSpy.mockRestore();
    });

    it('should throw DatabaseOperationError if simulationRepo.create fails', async () => {
      simulationRepo.create = vi.fn().mockResolvedValue({
        success: false,
        error: new Error('Sim save failed'),
      });

      await expect(
        service.simulatePurchase({
          userId: 'user-1',
          purchaseAmount: 50000,
          purchaseName: 'Item',
        })
      ).rejects.toThrow(DatabaseOperationError);
    });

    it('should throw NotFoundError if profile does not exist', async () => {
      profileRepo.findByUserId = vi.fn().mockResolvedValue({ success: true, data: null });
      await expect(
        service.simulatePurchase({
          userId: 'unknown-user',
          purchaseAmount: 20000,
          purchaseName: 'Item',
        })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('simulateLoan', () => {
    it('should simulate loan affordability and return assessment', async () => {
      const publishSpy = vi.spyOn(eventBus, 'publish');
      const res = await service.simulateLoan({
        userId: 'user-1',
        loanAmount: 500000,
        interestRate: 9.5,
        termMonths: 48,
        purpose: 'Home Improvement',
      });

      expect(res.simulationId).toBe('sim-1');
      expect(res.monthlyPayment).toBeGreaterThan(0);
      expect(res.totalCost).toBeGreaterThan(500000);
      expect(['AFFORDABLE', 'TIGHT', 'UNAFFORDABLE']).toContain(res.affordability);
      expect(publishSpy).toHaveBeenCalledTimes(1);
    });

    it('should map high DTI loan to UNAFFORDABLE', async () => {
      const res = await service.simulateLoan({
        userId: 'user-1',
        loanAmount: 50000000,
        interestRate: 15,
        termMonths: 12,
        purpose: 'Excessive Loan',
      });
      expect(res.affordability).toBe('UNAFFORDABLE');
    });

    it('should throw BusinessRuleError when loan engine calculation fails', async () => {
      const simSpy = vi.spyOn(financialEngine, 'simulateLoan').mockReturnValueOnce({
        success: false,
        error: { code: 'LOAN_FAIL', message: 'Loan calculation failed' },
      } as any);

      await expect(
        service.simulateLoan({
          userId: 'user-1',
          loanAmount: 100000,
          interestRate: 10,
          termMonths: 12,
        })
      ).rejects.toThrow(BusinessRuleError);
      simSpy.mockRestore();
    });

    it('should throw DatabaseOperationError if simulationRepo.create fails on loan', async () => {
      simulationRepo.create = vi.fn().mockResolvedValue({
        success: false,
        error: new Error('Loan save failed'),
      });

      await expect(
        service.simulateLoan({
          userId: 'user-1',
          loanAmount: 100000,
          interestRate: 10,
          termMonths: 12,
        })
      ).rejects.toThrow(DatabaseOperationError);
    });
  });

  describe('projectGoalTimeline', () => {
    it('should project goal completion date and milestones', async () => {
      const publishSpy = vi.spyOn(eventBus, 'publish');
      const res = await service.projectGoalTimeline({
        userId: 'user-1',
        goalId: 'goal-1',
      });

      expect(res.simulationId).toBe('sim-1');
      expect(res.goalId).toBe('goal-1');
      expect(res.projectedCompletionDate).toBeInstanceOf(Date);
      expect(res.monthsToComplete).toBeGreaterThanOrEqual(0);
      expect(['HIGH', 'MEDIUM', 'LOW']).toContain(res.confidenceLevel);
      expect(res.milestones.length).toBeGreaterThan(0);
      expect(publishSpy).toHaveBeenCalledTimes(1);
    });

    it('should map low and very_low confidence to LOW', async () => {
      const projSpy = vi.spyOn(financialEngine, 'projectGoalTimeline').mockReturnValueOnce({
        success: true,
        data: {
          isFeasible: true,
          feasibilityScore: 80,
          monthsRemaining: 6,
          projectedCompletionDate: '2027-01-01',
          delayMonths: 0,
          requiredMonthly: 10000,
          availableMonthly: 20000,
          utilizationRatio: 0.5,
          recommendations: [],
          confidence: { value: 30, level: 'low', factors: [], summary: '' },
        },
      });

      const res = await service.projectGoalTimeline({
        userId: 'user-1',
        goalId: 'goal-1',
      });
      expect(res.confidenceLevel).toBe('LOW');
      projSpy.mockRestore();
    });

    it('should throw BusinessRuleError when engine projectGoalTimeline fails', async () => {
      const projSpy = vi.spyOn(financialEngine, 'projectGoalTimeline').mockReturnValueOnce({
        success: false,
        error: { code: 'PROJ_FAIL', message: 'Projection error' },
      } as any);

      await expect(
        service.projectGoalTimeline({ userId: 'user-1', goalId: 'goal-1' })
      ).rejects.toThrow(BusinessRuleError);
      projSpy.mockRestore();
    });

    it('should throw DatabaseOperationError if simulationRepo.create fails on goal timeline', async () => {
      simulationRepo.create = vi.fn().mockResolvedValue({
        success: false,
        error: new Error('Goal sim save failed'),
      });

      await expect(
        service.projectGoalTimeline({ userId: 'user-1', goalId: 'goal-1' })
      ).rejects.toThrow(DatabaseOperationError);
    });

    it('should throw NotFoundError if goal not found', async () => {
      goalRepo.findById = vi.fn().mockResolvedValue({ success: true, data: null });
      await expect(
        service.projectGoalTimeline({ userId: 'user-1', goalId: 'missing-goal' })
      ).rejects.toThrow(NotFoundError);
    });

    it('should fallback to projected allocation if allocationRepo returns empty in simulateLoan', async () => {
      const serviceNoAlloc = new SimulationService(
        simulationRepo,
        profileRepo,
        expenseRepo,
        debtRepo,
        goalRepo,
        undefined, // no allocationRepo
        eventBus
      );

      const res = await serviceNoAlloc.simulateLoan({
        userId: 'user-1',
        loanAmount: 100000,
        interestRate: 10,
        termMonths: 12,
      });
      expect(res.impact.newAllocation.id).toBe('proj');
    });

    it('should map very_high confidence to HIGH in projectGoalTimeline', async () => {
      const projSpy = vi.spyOn(financialEngine, 'projectGoalTimeline').mockReturnValueOnce({
        success: true,
        data: {
          isFeasible: true,
          feasibilityScore: 95,
          monthsRemaining: 12,
          projectedCompletionDate: '2028-01-01',
          delayMonths: 0,
          requiredMonthly: 5000,
          availableMonthly: 20000,
          utilizationRatio: 0.25,
          recommendations: [],
          confidence: { value: 95, level: 'very_high', factors: [], summary: '' },
        },
      });

      const res = await service.projectGoalTimeline({
        userId: 'user-1',
        goalId: 'goal-1',
      });
      expect(res.confidenceLevel).toBe('HIGH');
      projSpy.mockRestore();
    });

    it('should throw NotFoundError if profile not found on projectGoalTimeline', async () => {
      profileRepo.findByUserId = vi.fn().mockResolvedValue({ success: true, data: null });
      await expect(
        service.projectGoalTimeline({ userId: 'user-1', goalId: 'goal-1' })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw AuthorizationError if goal is owned by another user', async () => {
      goalRepo.findById = vi.fn().mockResolvedValue({
        success: true,
        data: { ...mockGoal, userId: 'other-user' },
      });
      await expect(
        service.projectGoalTimeline({ userId: 'user-1', goalId: 'goal-1' })
      ).rejects.toThrow(AuthorizationError);
    });
  });
});
