import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OnboardingService } from '../../src/services/onboarding.service';
import { InProcessEventBus } from '../../src/events';
import {
  createMockUserRepository,
  createMockProfileRepository,
  createMockPrismaClient,
} from '../helpers/mock-repositories';
import { NotFoundError, DatabaseOperationError } from '../../src/errors';
import type { AllocationService } from '../../src/services/allocation.service';

describe('OnboardingService', () => {
  let userRepo: ReturnType<typeof createMockUserRepository>;
  let profileRepo: ReturnType<typeof createMockProfileRepository>;
  let mockAllocationService: AllocationService;
  let mockPrisma: any;
  let eventBus: InProcessEventBus;
  let service: OnboardingService;

  const mockUser = {
    id: 'user-1',
    clerkId: 'clerk_123',
    email: 'user@example.com',
    firstName: 'John',
    lastName: 'Doe',
    imageUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockProfile = {
    id: 'prof-1',
    userId: 'user-1',
    monthlyIncome: 75000,
    otherIncome: 0,
    incomeFrequency: 'MONTHLY' as const,
    currentSavings: 0,
    emergencyFundTarget: 225000,
    currentEmergencyFund: 0,
    primaryGoal: null,
    riskTolerance: 'MODERATE' as const,
    cfoUnderstandingScore: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAllocationResponse = {
    allocation: {
      id: 'alloc-1',
      userId: 'user-1',
      monthlyIncome: 75000,
      needs: 37500,
      wants: 22500,
      savings: 15000,
      breakdown: {
        fixedExpenses: 37500,
        variableExpenses: 22500,
        goalContributions: 10000,
        debtPayments: 0,
        discretionary: 22500,
        emergencyFund: 5000,
      },
      createdAt: new Date(),
    },
    recommendations: ['Initial baseline allocation generated.'],
  };

  beforeEach(() => {
    userRepo = createMockUserRepository({
      findById: vi.fn().mockResolvedValue({ success: true, data: mockUser }),
    });
    profileRepo = createMockProfileRepository({
      upsert: vi.fn().mockResolvedValue({ success: true, data: mockProfile }),
    });
    mockAllocationService = {
      generateAllocation: vi.fn().mockResolvedValue(mockAllocationResponse),
    } as unknown as AllocationService;
    mockPrisma = createMockPrismaClient();
    eventBus = new InProcessEventBus();

    service = new OnboardingService(
      userRepo,
      profileRepo,
      mockAllocationService,
      eventBus,
      mockPrisma
    );
  });

  it('should complete onboarding and publish UserOnboardingCompletedEvent', async () => {
    const publishSpy = vi.spyOn(eventBus, 'publish');
    const res = await service.completeOnboarding({
      userId: 'user-1',
      monthlyIncome: 75000,
      riskTolerance: 'MEDIUM',
    });

    expect(res).toBeDefined();
    expect(res.userId).toBe('user-1');
    expect(res.profileId).toBe('prof-1');
    expect(res.allocationId).toBe('alloc-1');
    expect(res.monthlyIncome).toBe(75000);
    expect(res.allocation.needs).toBe(37500);
    expect(res.allocation.wants).toBe(22500);
    expect(res.allocation.savings).toBe(15000);

    expect(userRepo.findById).toHaveBeenCalledWith('user-1', undefined);
    expect(profileRepo.upsert).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        monthlyIncome: 75000,
        riskTolerance: 'MODERATE',
      }),
      expect.anything()
    );
    expect(mockAllocationService.generateAllocation).toHaveBeenCalledWith(
      { userId: 'user-1' },
      expect.anything()
    );
    expect(publishSpy).toHaveBeenCalledTimes(1);
  });

  it('should map LOW riskTolerance to CONSERVATIVE and HIGH to AGGRESSIVE', async () => {
    await service.completeOnboarding({
      userId: 'user-1',
      monthlyIncome: 60000,
      riskTolerance: 'LOW',
    });
    expect(profileRepo.upsert).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ riskTolerance: 'CONSERVATIVE' }),
      expect.anything()
    );

    await service.completeOnboarding({
      userId: 'user-1',
      monthlyIncome: 90000,
      riskTolerance: 'HIGH',
    });
    expect(profileRepo.upsert).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ riskTolerance: 'AGGRESSIVE' }),
      expect.anything()
    );
  });

  it('should throw NotFoundError if user does not exist', async () => {
    userRepo.findById = vi.fn().mockResolvedValue({ success: true, data: null });
    await expect(
      service.completeOnboarding({
        userId: 'missing-user',
        monthlyIncome: 50000,
      })
    ).rejects.toThrow(NotFoundError);
  });

  it('should throw DatabaseOperationError if profile upsert fails', async () => {
    profileRepo.upsert = vi.fn().mockResolvedValue({
      success: false,
      error: new Error('Upsert error'),
    });

    await expect(
      service.completeOnboarding({
        userId: 'user-1',
        monthlyIncome: 50000,
      })
    ).rejects.toThrow(DatabaseOperationError);
  });

  it('should use existing transaction if provided', async () => {
    const existingTx = {} as any;
    await service.completeOnboarding(
      {
        userId: 'user-1',
        monthlyIncome: 80000,
      },
      existingTx
    );

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(userRepo.findById).toHaveBeenCalledWith('user-1', existingTx);
    expect(profileRepo.upsert).toHaveBeenCalledWith('user-1', expect.anything(), existingTx);
  });
});
