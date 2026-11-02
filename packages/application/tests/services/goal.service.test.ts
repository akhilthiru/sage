import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GoalService } from '../../src/services/goal.service';
import { InProcessEventBus } from '../../src/events';
import {
  createMockGoalRepository,
  createMockProfileRepository,
  createMockExpenseRepository,
  createMockPrismaClient,
} from '../helpers/mock-repositories';
import {
  NotFoundError,
  ValidationError,
  AuthorizationError,
  BusinessRuleError,
  DatabaseOperationError,
} from '../../src/errors';
import type { AllocationService } from '../../src/services/allocation.service';
import * as financialEngine from '@sage/financial-engine';

describe('GoalService', () => {
  let goalRepo: ReturnType<typeof createMockGoalRepository>;
  let profileRepo: ReturnType<typeof createMockProfileRepository>;
  let expenseRepo: ReturnType<typeof createMockExpenseRepository>;
  let mockAllocationService: AllocationService;
  let mockPrisma: any;
  let eventBus: InProcessEventBus;
  let service: GoalService;

  const mockProfile = {
    id: 'prof-1',
    userId: 'user-1',
    monthlyIncome: 100000,
    otherIncome: 0,
    incomeFrequency: 'MONTHLY' as const,
    currentSavings: 50000,
    emergencyFundTarget: 300000,
    currentEmergencyFund: 150000,
    primaryGoal: null,
    riskTolerance: 'MODERATE' as const,
    cfoUnderstandingScore: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockGoal = {
    id: 'goal-1',
    userId: 'user-1',
    name: 'New Car',
    description: 'Electric vehicle',
    type: 'CAR' as const,
    targetAmount: 1200000,
    currentAmount: 200000,
    monthlyContribution: 25000,
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

  const mockAllocation = {
    id: 'alloc-1',
    userId: 'user-1',
    monthlyIncome: 100000,
    needs: 40000,
    wants: 25000,
    savings: 35000,
    breakdown: {
      fixedExpenses: 40000,
      variableExpenses: 25000,
      goalContributions: 25000,
      debtPayments: 0,
      discretionary: 25000,
      emergencyFund: 10000,
    },
    createdAt: new Date(),
  };

  beforeEach(() => {
    goalRepo = createMockGoalRepository({
      create: vi.fn().mockResolvedValue({ success: true, data: mockGoal }),
      findById: vi.fn().mockResolvedValue({ success: true, data: mockGoal }),
      findActiveByUserId: vi.fn().mockResolvedValue({ success: true, data: [mockGoal] }),
      findByUserId: vi.fn().mockResolvedValue({ success: true, data: [mockGoal] }),
      update: vi.fn().mockResolvedValue({ success: true, data: { ...mockGoal, name: 'Updated Car' } }),
      softDelete: vi.fn().mockResolvedValue({ success: true, data: mockGoal }),
    });
    profileRepo = createMockProfileRepository({
      findByUserId: vi.fn().mockResolvedValue({ success: true, data: mockProfile }),
    });
    expenseRepo = createMockExpenseRepository({
      calculateTotalMonthly: vi.fn().mockResolvedValue({ success: true, data: 35000 }),
    });
    mockAllocationService = {
      generateAllocation: vi.fn().mockResolvedValue({
        allocation: mockAllocation,
        recommendations: [],
      }),
    } as unknown as AllocationService;
    mockPrisma = createMockPrismaClient();
    eventBus = new InProcessEventBus();

    service = new GoalService(
      goalRepo,
      profileRepo,
      expenseRepo,
      mockAllocationService,
      eventBus,
      mockPrisma
    );
  });

  describe('createGoal', () => {
    it('should create goal and publish GoalCreatedEvent', async () => {
      const publishSpy = vi.spyOn(eventBus, 'publish');
      const targetDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365); // 1 year future

      goalRepo.findActiveByUserId = vi.fn().mockResolvedValue({ success: true, data: [] });

      const res = await service.createGoal({
        userId: 'user-1',
        name: 'House Downpayment',
        targetAmount: 1500000,
        targetDate,
        priority: 'HIGH',
        category: 'HOUSE',
      });

      expect(res.goal).toBeDefined();
      expect(res.allocation).toBeDefined();
      expect(goalRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          name: 'House Downpayment',
          type: 'HOUSE',
          targetAmount: 1500000,
        }),
        expect.anything()
      );
      expect(publishSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle INFEASIBLE and STRETCH feasibility grades', async () => {
      const targetDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365);
      goalRepo.findActiveByUserId = vi.fn().mockResolvedValue({ success: true, data: [] });

      // Infeasible
      const projSpy = vi.spyOn(financialEngine, 'projectGoalTimeline').mockReturnValueOnce({
        success: true,
        data: {
          isFeasible: false,
          feasibilityScore: 30,
          requiredMonthly: 80000,
          availableMonthly: 20000,
          monthsRemaining: 12,
          projectedCompletionDate: '2029-01-01',
          delayMonths: 10,
          utilizationRatio: 4,
          recommendations: [],
          confidence: { value: 70, level: 'medium', factors: [], summary: '' },
        },
      });

      const resInfeasible = await service.createGoal({
        userId: 'user-1',
        name: 'Supercar',
        targetAmount: 10000000,
        targetDate,
      });
      expect(resInfeasible.goal.feasibility).toBe('INFEASIBLE');

      // Stretch (< 75 score)
      projSpy.mockReturnValueOnce({
        success: true,
        data: {
          isFeasible: true,
          feasibilityScore: 65,
          requiredMonthly: 30000,
          availableMonthly: 40000,
          monthsRemaining: 12,
          projectedCompletionDate: '2028-01-01',
          delayMonths: 0,
          utilizationRatio: 0.75,
          recommendations: [],
          confidence: { value: 80, level: 'high', factors: [], summary: '' },
        },
      });

      const resStretch = await service.createGoal({
        userId: 'user-1',
        name: 'Stretch Goal',
        targetAmount: 500000,
        targetDate,
      });
      expect(resStretch.goal.feasibility).toBe('STRETCH');
      projSpy.mockRestore();
    });

    it('should reject if user already has 10 active goals', async () => {
      const tenGoals = Array.from({ length: 10 }, (_, i) => ({
        ...mockGoal,
        id: `g-${i}`,
        name: `Goal ${i}`,
      }));
      goalRepo.findActiveByUserId = vi.fn().mockResolvedValue({ success: true, data: tenGoals });

      const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 60);
      await expect(
        service.createGoal({
          userId: 'user-1',
          name: 'Goal 11',
          targetAmount: 50000,
          targetDate: futureDate,
        })
      ).rejects.toThrow(BusinessRuleError);
    });

    it('should reject duplicate goal name', async () => {
      goalRepo.findActiveByUserId = vi.fn().mockResolvedValue({ success: true, data: [mockGoal] });

      const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 60);
      await expect(
        service.createGoal({
          userId: 'user-1',
          name: 'new car',
          targetAmount: 50000,
          targetDate: futureDate,
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should throw DatabaseOperationError if active goals query fails', async () => {
      goalRepo.findActiveByUserId = vi.fn().mockResolvedValue({
        success: false,
        error: new Error('Goals query error'),
      });
      const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 60);
      await expect(
        service.createGoal({
          userId: 'user-1',
          name: 'Goal X',
          targetAmount: 50000,
          targetDate: futureDate,
        })
      ).rejects.toThrow(DatabaseOperationError);
    });

    it('should throw DatabaseOperationError if create goal repo fails', async () => {
      goalRepo.findActiveByUserId = vi.fn().mockResolvedValue({ success: true, data: [] });
      goalRepo.create = vi.fn().mockResolvedValue({
        success: false,
        error: new Error('Create error'),
      });
      const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 60);
      await expect(
        service.createGoal({
          userId: 'user-1',
          name: 'Goal X',
          targetAmount: 50000,
          targetDate: futureDate,
        })
      ).rejects.toThrow(DatabaseOperationError);
    });

    it('should throw NotFoundError if user profile does not exist', async () => {
      profileRepo.findByUserId = vi.fn().mockResolvedValue({ success: true, data: null });
      const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 60);
      await expect(
        service.createGoal({
          userId: 'missing-user',
          name: 'Some Goal',
          targetAmount: 50000,
          targetDate: futureDate,
        })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateGoal', () => {
    it('should update goal and publish events', async () => {
      const publishSpy = vi.spyOn(eventBus, 'publish');
      const res = await service.updateGoal({
        userId: 'user-1',
        goalId: 'goal-1',
        name: 'Updated Car',
        status: 'COMPLETED',
      });

      expect(res.goal).toBeDefined();
      expect(publishSpy).toHaveBeenCalledTimes(2);
    });

    it('should update goal with ABANDONED status mapping to CANCELLED in DB', async () => {
      await service.updateGoal({
        userId: 'user-1',
        goalId: 'goal-1',
        status: 'ABANDONED',
      });
      expect(goalRepo.update).toHaveBeenCalledWith(
        'goal-1',
        expect.objectContaining({ status: 'CANCELLED' }),
        expect.anything()
      );
    });

    it('should reject renaming goal to an existing active goal name', async () => {
      const secondGoal = { ...mockGoal, id: 'goal-2', name: 'Existing Goal' };
      goalRepo.findActiveByUserId = vi.fn().mockResolvedValue({
        success: true,
        data: [mockGoal, secondGoal],
      });

      await expect(
        service.updateGoal({
          userId: 'user-1',
          goalId: 'goal-1',
          name: 'existing goal', // duplicate
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError if goal does not exist', async () => {
      goalRepo.findById = vi.fn().mockResolvedValue({ success: true, data: null });
      await expect(
        service.updateGoal({ userId: 'user-1', goalId: 'missing-goal' })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw AuthorizationError if user does not own goal', async () => {
      goalRepo.findById = vi.fn().mockResolvedValue({
        success: true,
        data: { ...mockGoal, userId: 'other-user' },
      });
      await expect(
        service.updateGoal({ userId: 'user-1', goalId: 'goal-1' })
      ).rejects.toThrow(AuthorizationError);
    });

    it('should throw DatabaseOperationError if update fails', async () => {
      goalRepo.update = vi.fn().mockResolvedValue({
        success: false,
        error: new Error('Update error'),
      });
      await expect(
        service.updateGoal({ userId: 'user-1', goalId: 'goal-1', name: 'New' })
      ).rejects.toThrow(DatabaseOperationError);
    });
  });

  describe('deleteGoal', () => {
    it('should soft delete goal and recalculate allocation', async () => {
      const publishSpy = vi.spyOn(eventBus, 'publish');
      const res = await service.deleteGoal({ userId: 'user-1', goalId: 'goal-1' });

      expect(res.goalId).toBe('goal-1');
      expect(goalRepo.softDelete).toHaveBeenCalledWith('goal-1', expect.anything());
      expect(publishSpy).toHaveBeenCalledTimes(1);
    });

    it('should throw DatabaseOperationError if softDelete fails', async () => {
      goalRepo.softDelete = vi.fn().mockResolvedValue({
        success: false,
        error: new Error('Delete error'),
      });
      await expect(
        service.deleteGoal({ userId: 'user-1', goalId: 'goal-1' })
      ).rejects.toThrow(DatabaseOperationError);
    });

    it('should throw NotFoundError if goal not found', async () => {
      goalRepo.findById = vi.fn().mockResolvedValue({ success: true, data: null });
      await expect(
        service.deleteGoal({ userId: 'user-1', goalId: 'missing' })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw AuthorizationError if user does not own goal', async () => {
      goalRepo.findById = vi.fn().mockResolvedValue({
        success: true,
        data: { ...mockGoal, userId: 'another-user' },
      });
      await expect(
        service.deleteGoal({ userId: 'user-1', goalId: 'goal-1' })
      ).rejects.toThrow(AuthorizationError);
    });
  });

  describe('getGoal and listGoals', () => {
    it('should get single goal by id', async () => {
      const goal = await service.getGoal('user-1', 'goal-1');
      expect(goal.id).toBe('goal-1');
      expect(goal.name).toBe('New Car');
    });

    it('should throw NotFoundError if goal does not exist on getGoal', async () => {
      goalRepo.findById = vi.fn().mockResolvedValue({ success: true, data: null });
      await expect(service.getGoal('user-1', 'missing')).rejects.toThrow(NotFoundError);
    });

    it('should throw AuthorizationError on getGoal if owned by another user', async () => {
      goalRepo.findById = vi.fn().mockResolvedValue({
        success: true,
        data: { ...mockGoal, userId: 'diff-user' },
      });
      await expect(service.getGoal('user-1', 'goal-1')).rejects.toThrow(AuthorizationError);
    });

    it('should list goals with status and priority filters and completed count', async () => {
      const completedGoal = { ...mockGoal, id: 'g-comp', status: 'COMPLETED' as const };
      const cancelledGoal = { ...mockGoal, id: 'g-canc', status: 'CANCELLED' as const };
      goalRepo.findByUserId = vi.fn().mockResolvedValue({
        success: true,
        data: [mockGoal, completedGoal, cancelledGoal],
      });

      const listAll = await service.listGoals({ userId: 'user-1' });
      expect(listAll.summary.totalGoals).toBe(3);
      expect(listAll.summary.activeGoals).toBe(1);
      expect(listAll.summary.completedGoals).toBe(1);

      const listCompleted = await service.listGoals({ userId: 'user-1', status: 'COMPLETED' });
      expect(listCompleted.goals.length).toBe(1);

      const listAbandoned = await service.listGoals({ userId: 'user-1', status: 'ABANDONED' });
      expect(listAbandoned.goals.length).toBe(1);

      const listHighPriority = await service.listGoals({ userId: 'user-1', priority: 'HIGH' });
      expect(listHighPriority.goals.length).toBe(3);

      const listLowPriority = await service.listGoals({ userId: 'user-1', priority: 'LOW' });
      expect(listLowPriority.goals.length).toBe(0);
    });

    it('should throw DatabaseOperationError if findByUserId fails in listGoals', async () => {
      goalRepo.findByUserId = vi.fn().mockResolvedValue({
        success: false,
        error: new Error('List error'),
      });
      await expect(service.listGoals({ userId: 'user-1' })).rejects.toThrow(DatabaseOperationError);
    });
  });
});
