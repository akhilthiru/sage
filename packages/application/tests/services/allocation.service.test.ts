import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AllocationService } from '../../src/services/allocation.service';
import { InProcessEventBus } from '../../src/events';
import {
  createMockProfileRepository,
  createMockExpenseRepository,
  createMockDebtRepository,
  createMockGoalRepository,
  createMockAllocationRepository,
} from '../helpers/mock-repositories';
import { NotFoundError, DatabaseOperationError, BusinessRuleError } from '../../src/errors';
import * as financialEngine from '@sage/financial-engine';

describe('AllocationService', () => {
  let profileRepo: ReturnType<typeof createMockProfileRepository>;
  let expenseRepo: ReturnType<typeof createMockExpenseRepository>;
  let debtRepo: ReturnType<typeof createMockDebtRepository>;
  let goalRepo: ReturnType<typeof createMockGoalRepository>;
  let allocationRepo: ReturnType<typeof createMockAllocationRepository>;
  let eventBus: InProcessEventBus;
  let service: AllocationService;

  const mockProfile = {
    id: 'prof-1',
    userId: 'user-1',
    monthlyIncome: 80000,
    otherIncome: 0,
    incomeFrequency: 'MONTHLY',
    currentSavings: 20000,
    emergencyFundTarget: 240000,
    currentEmergencyFund: 50000,
    primaryGoal: null,
    riskTolerance: 'MODERATE' as const,
    cfoUnderstandingScore: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAllocation = {
    id: 'alloc-1',
    userId: 'user-1',
    month: 12,
    year: 2026,
    essentialExpenses: 30000,
    debtPayments: 10000,
    emergencyFund: 5000,
    goalSavings: 15000,
    investments: 5000,
    discretionary: 15000,
    totalIncome: 80000,
    totalAllocated: 80000,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    profileRepo = createMockProfileRepository({
      findByUserId: vi.fn().mockResolvedValue({ success: true, data: mockProfile }),
    });
    expenseRepo = createMockExpenseRepository({
      findActiveByUserId: vi.fn().mockResolvedValue({
        success: true,
        data: [
          {
            id: 'exp-1',
            userId: 'user-1',
            name: 'Rent',
            amount: 25000,
            category: 'RENT',
            frequency: 'MONTHLY',
            isEssential: true,
            isActive: true,
            startDate: new Date(),
            endDate: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
          },
          {
            id: 'exp-2',
            userId: 'user-1',
            name: 'Gym',
            amount: 3000,
            category: 'OTHER',
            frequency: 'MONTHLY',
            isEssential: false,
            isActive: true,
            startDate: new Date(),
            endDate: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
          },
        ],
      }),
    });
    debtRepo = createMockDebtRepository({
      findActiveByUserId: vi.fn().mockResolvedValue({
        success: true,
        data: [
          {
            id: 'debt-1',
            userId: 'user-1',
            name: 'Education Loan',
            type: 'EDUCATION_LOAN',
            principalAmount: 200000,
            currentBalance: 150000,
            interestRate: 8.5,
            monthlyPayment: 8000,
            minimumPayment: 8000,
            startDate: new Date(),
            endDate: new Date(),
            status: 'ACTIVE',
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
          },
        ],
      }),
    });
    goalRepo = createMockGoalRepository({
      findActiveByUserId: vi.fn().mockResolvedValue({
        success: true,
        data: [
          {
            id: 'goal-1',
            userId: 'user-1',
            name: 'Emergency Buffer',
            description: null,
            type: 'EMERGENCY_FUND',
            targetAmount: 100000,
            currentAmount: 20000,
            monthlyContribution: 5000,
            targetDate: new Date('2028-01-01'),
            startDate: new Date(),
            completedDate: null,
            priority: 'HIGH',
            status: 'ACTIVE',
            isFeasible: true,
            feasibilityScore: 90,
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
          },
        ],
      }),
    });
    allocationRepo = createMockAllocationRepository({
      upsert: vi.fn().mockResolvedValue({ success: true, data: mockAllocation }),
    });
    eventBus = new InProcessEventBus();
    service = new AllocationService(
      profileRepo,
      expenseRepo,
      debtRepo,
      goalRepo,
      allocationRepo,
      eventBus
    );
  });

  it('should successfully calculate and persist allocation', async () => {
    const publishSpy = vi.spyOn(eventBus, 'publish');
    const res = await service.generateAllocation({ userId: 'user-1' });

    expect(res).toBeDefined();
    expect(res.allocation.userId).toBe('user-1');
    expect(res.allocation.needs).toBe(40000); // 30000 essential + 10000 debt
    expect(res.allocation.wants).toBe(15000);
    expect(res.allocation.savings).toBe(25000); // 5000 + 15000 + 5000
    expect(res.recommendations.length).toBeGreaterThan(0);
    expect(publishSpy).toHaveBeenCalledTimes(1);
    expect(allocationRepo.upsert).toHaveBeenCalledTimes(1);
  });

  it('should handle conservative and aggressive risk tolerance profiles', async () => {
    profileRepo.findByUserId = vi.fn().mockResolvedValue({
      success: true,
      data: { ...mockProfile, riskTolerance: 'CONSERVATIVE' },
    });
    const res1 = await service.generateAllocation({ userId: 'user-1' });
    expect(res1.allocation).toBeDefined();

    profileRepo.findByUserId = vi.fn().mockResolvedValue({
      success: true,
      data: { ...mockProfile, riskTolerance: 'AGGRESSIVE' },
    });
    const res2 = await service.generateAllocation({ userId: 'user-1' });
    expect(res2.allocation).toBeDefined();
  });

  it('should handle INCOME_INSUFFICIENT warning from engine', async () => {
    const calcSpy = vi.spyOn(financialEngine, 'calculateAllocation').mockReturnValueOnce({
      success: true,
      data: {
        userId: 'user-1',
        month: 12,
        year: 2026,
        essentialExpenses: 90000,
        debtPayments: 20000,
        emergencyFund: 0,
        goalSavings: 0,
        investments: 0,
        discretionary: 0,
        totalIncome: 80000,
        totalAllocated: 80000,
        goalAllocations: {},
        warning: 'INCOME_INSUFFICIENT',
        shortfall: 30000,
      },
    });

    const res = await service.generateAllocation({ userId: 'user-1' });
    expect(res.recommendations.some((r) => r.includes('Income is insufficient'))).toBe(true);
    calcSpy.mockRestore();
  });

  it('should handle DEBT_PAYMENTS_INSUFFICIENT warning from engine', async () => {
    const calcSpy = vi.spyOn(financialEngine, 'calculateAllocation').mockReturnValueOnce({
      success: true,
      data: {
        userId: 'user-1',
        month: 12,
        year: 2026,
        essentialExpenses: 70000,
        debtPayments: 20000,
        emergencyFund: 0,
        goalSavings: 0,
        investments: 0,
        discretionary: 0,
        totalIncome: 80000,
        totalAllocated: 80000,
        goalAllocations: {},
        warning: 'DEBT_PAYMENTS_INSUFFICIENT',
      },
    });

    const res = await service.generateAllocation({ userId: 'user-1' });
    expect(res.recommendations.some((r) => r.includes('Available income after essential expenses is insufficient'))).toBe(true);
    calcSpy.mockRestore();
  });

  it('should throw BusinessRuleError when engine calculation fails', async () => {
    const calcSpy = vi.spyOn(financialEngine, 'calculateAllocation').mockReturnValueOnce({
      success: false,
      error: { code: 'CALC_FAIL', message: 'Math calculation failure' },
    } as any);

    await expect(service.generateAllocation({ userId: 'user-1' })).rejects.toThrow(BusinessRuleError);
    calcSpy.mockRestore();
  });

  it('should throw NotFoundError if profile does not exist', async () => {
    profileRepo.findByUserId = vi.fn().mockResolvedValue({ success: true, data: null });
    await expect(service.generateAllocation({ userId: 'missing-user' })).rejects.toThrow(NotFoundError);
  });

  it('should throw DatabaseOperationError if expenses fetch fails', async () => {
    expenseRepo.findActiveByUserId = vi.fn().mockResolvedValue({ success: false, error: new Error('DB fail') });
    await expect(service.generateAllocation({ userId: 'user-1' })).rejects.toThrow(DatabaseOperationError);
  });

  it('should throw DatabaseOperationError if debts fetch fails', async () => {
    debtRepo.findActiveByUserId = vi.fn().mockResolvedValue({ success: false, error: new Error('DB fail') });
    await expect(service.generateAllocation({ userId: 'user-1' })).rejects.toThrow(DatabaseOperationError);
  });

  it('should throw DatabaseOperationError if goals fetch fails', async () => {
    goalRepo.findActiveByUserId = vi.fn().mockResolvedValue({ success: false, error: new Error('DB fail') });
    await expect(service.generateAllocation({ userId: 'user-1' })).rejects.toThrow(DatabaseOperationError);
  });

  it('should throw DatabaseOperationError if upsert fails', async () => {
    allocationRepo.upsert = vi.fn().mockResolvedValue({ success: false, error: new Error('Upsert fail') });
    await expect(service.generateAllocation({ userId: 'user-1' })).rejects.toThrow(DatabaseOperationError);
  });

  it('should pass transaction client to repositories when provided', async () => {
    const tx = {} as any;
    await service.generateAllocation({ userId: 'user-1' }, tx);
    expect(profileRepo.findByUserId).toHaveBeenCalledWith('user-1', tx);
    expect(expenseRepo.findActiveByUserId).toHaveBeenCalledWith('user-1', tx);
    expect(debtRepo.findActiveByUserId).toHaveBeenCalledWith('user-1', tx);
    expect(goalRepo.findActiveByUserId).toHaveBeenCalledWith('user-1', tx);
    expect(allocationRepo.upsert).toHaveBeenCalledWith(expect.anything(), tx);
  });
});
