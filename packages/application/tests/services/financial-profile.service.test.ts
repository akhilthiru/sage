import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FinancialProfileService } from '../../src/services/financial-profile.service';
import { InProcessEventBus } from '../../src/events';
import {
  createMockProfileRepository,
  createMockPrismaClient,
} from '../helpers/mock-repositories';
import { NotFoundError, DatabaseOperationError } from '../../src/errors';
import type { AllocationService } from '../../src/services/allocation.service';

describe('FinancialProfileService', () => {
  let profileRepo: ReturnType<typeof createMockProfileRepository>;
  let mockAllocationService: AllocationService;
  let mockPrisma: any;
  let eventBus: InProcessEventBus;
  let service: FinancialProfileService;

  const mockProfile = {
    id: 'prof-1',
    userId: 'user-1',
    monthlyIncome: 60000,
    otherIncome: 0,
    incomeFrequency: 'MONTHLY' as const,
    currentSavings: 10000,
    emergencyFundTarget: 180000,
    currentEmergencyFund: 30000,
    primaryGoal: null,
    riskTolerance: 'MODERATE' as const,
    cfoUnderstandingScore: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAllocation = {
    id: 'alloc-1',
    userId: 'user-1',
    monthlyIncome: 80000,
    needs: 40000,
    wants: 20000,
    savings: 20000,
    breakdown: {
      fixedExpenses: 40000,
      variableExpenses: 20000,
      goalContributions: 10000,
      debtPayments: 0,
      discretionary: 20000,
      emergencyFund: 10000,
    },
    createdAt: new Date(),
  };

  beforeEach(() => {
    profileRepo = createMockProfileRepository({
      findByUserId: vi.fn().mockResolvedValue({ success: true, data: mockProfile }),
      updateByUserId: vi.fn().mockResolvedValue({
        success: true,
        data: { ...mockProfile, monthlyIncome: 80000 },
      }),
    });
    mockAllocationService = {
      generateAllocation: vi.fn().mockResolvedValue({
        allocation: mockAllocation,
        recommendations: [],
      }),
    } as unknown as AllocationService;
    mockPrisma = createMockPrismaClient();
    eventBus = new InProcessEventBus();

    service = new FinancialProfileService(
      profileRepo,
      mockAllocationService,
      eventBus,
      mockPrisma
    );
  });

  describe('getProfile', () => {
    it('should return mapped profile DTO', async () => {
      const dto = await service.getProfile('user-1');
      expect(dto.userId).toBe('user-1');
      expect(dto.profileId).toBe('prof-1');
      expect(dto.monthlyIncome).toBe(60000);
      expect(dto.riskTolerance).toBe('MEDIUM');
    });

    it('should map CONSERVATIVE to LOW and AGGRESSIVE to HIGH', async () => {
      profileRepo.findByUserId = vi.fn().mockResolvedValue({
        success: true,
        data: { ...mockProfile, riskTolerance: 'CONSERVATIVE' },
      });
      const lowDto = await service.getProfile('user-1');
      expect(lowDto.riskTolerance).toBe('LOW');

      profileRepo.findByUserId = vi.fn().mockResolvedValue({
        success: true,
        data: { ...mockProfile, riskTolerance: 'AGGRESSIVE' },
      });
      const highDto = await service.getProfile('user-1');
      expect(highDto.riskTolerance).toBe('HIGH');
    });

    it('should throw NotFoundError if profile does not exist', async () => {
      profileRepo.findByUserId = vi.fn().mockResolvedValue({ success: true, data: null });
      await expect(service.getProfile('user-unknown')).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateIncome', () => {
    it('should update income, recalculate allocation, and publish IncomeUpdatedEvent', async () => {
      const publishSpy = vi.spyOn(eventBus, 'publish');
      const res = await service.updateIncome({ userId: 'user-1', monthlyIncome: 80000 });

      expect(res.profile.monthlyIncome).toBe(80000);
      expect(res.allocation.id).toBe('alloc-1');
      expect(profileRepo.updateByUserId).toHaveBeenCalledWith(
        'user-1',
        { monthlyIncome: 80000, emergencyFundTarget: 240000 },
        expect.anything()
      );
      expect(mockAllocationService.generateAllocation).toHaveBeenCalledWith(
        { userId: 'user-1' },
        expect.anything()
      );
      expect(publishSpy).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundError if profile not found when updating income', async () => {
      profileRepo.findByUserId = vi.fn().mockResolvedValue({ success: true, data: null });
      await expect(
        service.updateIncome({ userId: 'missing', monthlyIncome: 90000 })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw DatabaseOperationError if update fails', async () => {
      profileRepo.updateByUserId = vi.fn().mockResolvedValue({
        success: false,
        error: new Error('Update error'),
      });
      await expect(
        service.updateIncome({ userId: 'user-1', monthlyIncome: 90000 })
      ).rejects.toThrow(DatabaseOperationError);
    });

    it('should use provided transaction if present', async () => {
      const existingTx = {} as any;
      await service.updateIncome({ userId: 'user-1', monthlyIncome: 85000 }, existingTx);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(profileRepo.updateByUserId).toHaveBeenCalledWith('user-1', expect.anything(), existingTx);
    });
  });

  describe('updateRiskTolerance', () => {
    it('should update risk tolerance and recalculate allocation', async () => {
      profileRepo.updateByUserId = vi.fn().mockResolvedValue({
        success: true,
        data: { ...mockProfile, riskTolerance: 'AGGRESSIVE' },
      });

      const res = await service.updateRiskTolerance({ userId: 'user-1', riskTolerance: 'HIGH' });
      expect(res.riskTolerance).toBe('HIGH');
      expect(profileRepo.updateByUserId).toHaveBeenCalledWith(
        'user-1',
        { riskTolerance: 'AGGRESSIVE' },
        expect.anything()
      );
      expect(mockAllocationService.generateAllocation).toHaveBeenCalledWith(
        { userId: 'user-1' },
        expect.anything()
      );
    });

    it('should map LOW to CONSERVATIVE', async () => {
      profileRepo.updateByUserId = vi.fn().mockResolvedValue({
        success: true,
        data: { ...mockProfile, riskTolerance: 'CONSERVATIVE' },
      });

      const res = await service.updateRiskTolerance({ userId: 'user-1', riskTolerance: 'LOW' });
      expect(res.riskTolerance).toBe('LOW');
      expect(profileRepo.updateByUserId).toHaveBeenCalledWith(
        'user-1',
        { riskTolerance: 'CONSERVATIVE' },
        expect.anything()
      );
    });

    it('should throw DatabaseOperationError if update fails', async () => {
      profileRepo.updateByUserId = vi.fn().mockResolvedValue({
        success: false,
        error: new Error('DB error'),
      });

      await expect(
        service.updateRiskTolerance({ userId: 'user-1', riskTolerance: 'MEDIUM' })
      ).rejects.toThrow(DatabaseOperationError);
    });
  });
});
