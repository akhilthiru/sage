import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DebtService } from '../../src/services/debt.service';
import { InProcessEventBus } from '../../src/events';
import {
  createMockDebtRepository,
  createMockProfileRepository,
  createMockPrismaClient,
} from '../helpers/mock-repositories';
import {
  NotFoundError,
  AuthorizationError,
  BusinessRuleError,
  DatabaseOperationError,
} from '../../src/errors';
import type { AllocationService } from '../../src/services/allocation.service';
import * as financialEngine from '@sage/financial-engine';

describe('DebtService', () => {
  let debtRepo: ReturnType<typeof createMockDebtRepository>;
  let profileRepo: ReturnType<typeof createMockProfileRepository>;
  let mockAllocationService: AllocationService;
  let mockPrisma: any;
  let eventBus: InProcessEventBus;
  let service: DebtService;

  const mockProfile = {
    id: 'prof-1',
    userId: 'user-1',
    monthlyIncome: 100000,
    otherIncome: 0,
    incomeFrequency: 'MONTHLY' as const,
    currentSavings: 20000,
    emergencyFundTarget: 300000,
    currentEmergencyFund: 50000,
    primaryGoal: null,
    riskTolerance: 'MODERATE' as const,
    cfoUnderstandingScore: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDebt = {
    id: 'debt-1',
    userId: 'user-1',
    name: 'Car Loan',
    type: 'CAR_LOAN' as const,
    principalAmount: 600000,
    currentBalance: 600000,
    interestRate: 10,
    monthlyPayment: 19360,
    minimumPayment: 19360,
    startDate: new Date('2026-01-01'),
    endDate: new Date('2029-01-01'),
    status: 'ACTIVE' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockAllocation = {
    id: 'alloc-1',
    userId: 'user-1',
    monthlyIncome: 100000,
    needs: 50000,
    wants: 25000,
    savings: 25000,
    breakdown: {
      fixedExpenses: 30000,
      variableExpenses: 25000,
      goalContributions: 15000,
      debtPayments: 19360,
      discretionary: 25000,
      emergencyFund: 10000,
    },
    createdAt: new Date(),
  };

  beforeEach(() => {
    debtRepo = createMockDebtRepository({
      create: vi.fn().mockResolvedValue({ success: true, data: mockDebt }),
      findById: vi.fn().mockResolvedValue({ success: true, data: mockDebt }),
      findByUserId: vi.fn().mockResolvedValue({ success: true, data: [mockDebt] }),
      update: vi.fn().mockResolvedValue({ success: true, data: { ...mockDebt, currentBalance: 585000 } }),
      createPayment: vi.fn().mockResolvedValue({
        success: true,
        data: {
          id: 'pay-1',
          debtId: 'debt-1',
          amount: 20000,
          principalPaid: 15000,
          interestPaid: 5000,
          paymentDate: new Date(),
          dueDate: new Date(),
          status: 'COMPLETED',
          createdAt: new Date(),
        },
      }),
    });
    profileRepo = createMockProfileRepository({
      findByUserId: vi.fn().mockResolvedValue({ success: true, data: mockProfile }),
    });
    mockAllocationService = {
      generateAllocation: vi.fn().mockResolvedValue({
        allocation: mockAllocation,
        recommendations: [],
      }),
    } as unknown as AllocationService;
    mockPrisma = createMockPrismaClient();
    eventBus = new InProcessEventBus();

    service = new DebtService(
      debtRepo,
      profileRepo,
      mockAllocationService,
      eventBus,
      mockPrisma
    );
  });

  describe('recordDebt', () => {
    it('should calculate EMI, record debt, recalculate allocation, and publish DebtRecordedEvent', async () => {
      const publishSpy = vi.spyOn(eventBus, 'publish');
      const res = await service.recordDebt({
        userId: 'user-1',
        name: 'Car Loan',
        principal: 600000,
        interestRate: 10,
        termMonths: 36,
        minimumPayment: 20000,
      });

      expect(res.debt).toBeDefined();
      expect(res.calculations.monthlyPayment).toBeGreaterThan(0);
      expect(res.calculations.totalInterest).toBeGreaterThan(0);
      expect(res.calculations.payoffDate).toBeInstanceOf(Date);
      expect(debtRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          name: 'Car Loan',
          principalAmount: 600000,
          interestRate: 10,
          minimumPayment: 20000,
        }),
        expect.anything()
      );
      expect(publishSpy).toHaveBeenCalledTimes(1);
    });

    it('should throw BusinessRuleError when calculateEMI fails', async () => {
      const emiSpy = vi.spyOn(financialEngine, 'calculateEMI').mockReturnValueOnce({
        success: false,
        error: { code: 'EMI_FAIL', message: 'Invalid EMI calculation' },
      } as any);

      await expect(
        service.recordDebt({
          userId: 'user-1',
          name: 'Bad Loan',
          principal: 10000,
          interestRate: 10,
          termMonths: 12,
        })
      ).rejects.toThrow(BusinessRuleError);
      emiSpy.mockRestore();
    });

    it('should throw DatabaseOperationError if create fails', async () => {
      debtRepo.create = vi.fn().mockResolvedValue({ success: false, error: new Error('DB error') });
      await expect(
        service.recordDebt({
          userId: 'user-1',
          name: 'Loan',
          principal: 100000,
          interestRate: 12,
          termMonths: 12,
        })
      ).rejects.toThrow(DatabaseOperationError);
    });
  });

  describe('recordPayment', () => {
    it('should record partial payment and update balance', async () => {
      const publishSpy = vi.spyOn(eventBus, 'publish');
      const res = await service.recordPayment({
        userId: 'user-1',
        debtId: 'debt-1',
        amount: 20000,
      });

      expect(res.paymentId).toBe('pay-1');
      expect(res.isPaidOff).toBe(false);
      expect(res.newBalance).toBeLessThan(600000);
      expect(debtRepo.createPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          debtId: 'debt-1',
          amount: 20000,
          status: 'COMPLETED',
        }),
        expect.anything()
      );
      expect(debtRepo.update).toHaveBeenCalledWith(
        'debt-1',
        expect.objectContaining({ status: 'ACTIVE' }),
        expect.anything()
      );
      expect(publishSpy).toHaveBeenCalledTimes(1);
    });

    it('should mark debt as PAID_OFF when payment covers balance and emit DebtPaidOffEvent', async () => {
      const publishSpy = vi.spyOn(eventBus, 'publish');
      debtRepo.findById = vi.fn().mockResolvedValue({
        success: true,
        data: { ...mockDebt, currentBalance: 10000 },
      });

      const res = await service.recordPayment({
        userId: 'user-1',
        debtId: 'debt-1',
        amount: 15000,
      });

      expect(res.isPaidOff).toBe(true);
      expect(res.newBalance).toBe(0);
      expect(debtRepo.update).toHaveBeenCalledWith(
        'debt-1',
        expect.objectContaining({ currentBalance: 0, status: 'PAID_OFF' }),
        expect.anything()
      );
      expect(publishSpy).toHaveBeenCalledTimes(2);
    });

    it('should throw DatabaseOperationError if createPayment fails', async () => {
      debtRepo.createPayment = vi.fn().mockResolvedValue({
        success: false,
        error: new Error('Payment create error'),
      });

      await expect(
        service.recordPayment({ userId: 'user-1', debtId: 'debt-1', amount: 5000 })
      ).rejects.toThrow(DatabaseOperationError);
    });

    it('should throw DatabaseOperationError if debt update fails on payment', async () => {
      debtRepo.update = vi.fn().mockResolvedValue({
        success: false,
        error: new Error('Debt update error'),
      });

      await expect(
        service.recordPayment({ userId: 'user-1', debtId: 'debt-1', amount: 5000 })
      ).rejects.toThrow(DatabaseOperationError);
    });

    it('should reject payment if debt is already PAID_OFF', async () => {
      debtRepo.findById = vi.fn().mockResolvedValue({
        success: true,
        data: { ...mockDebt, status: 'PAID_OFF', currentBalance: 0 },
      });

      await expect(
        service.recordPayment({ userId: 'user-1', debtId: 'debt-1', amount: 5000 })
      ).rejects.toThrow(BusinessRuleError);
    });

    it('should throw NotFoundError if debt does not exist', async () => {
      debtRepo.findById = vi.fn().mockResolvedValue({ success: true, data: null });
      await expect(
        service.recordPayment({ userId: 'user-1', debtId: 'missing', amount: 5000 })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw AuthorizationError if user does not own debt', async () => {
      debtRepo.findById = vi.fn().mockResolvedValue({
        success: true,
        data: { ...mockDebt, userId: 'other-user' },
      });
      await expect(
        service.recordPayment({ userId: 'user-1', debtId: 'debt-1', amount: 5000 })
      ).rejects.toThrow(AuthorizationError);
    });
  });

  describe('listDebts', () => {
    it('should list debts and compute total debt balance and DTI ratio', async () => {
      const res = await service.listDebts({ userId: 'user-1' });
      expect(res.debts.length).toBe(1);
      expect(res.summary.totalDebts).toBe(1);
      expect(res.summary.totalBalance).toBe(600000);
      expect(res.summary.totalMonthlyPayment).toBe(19360);
      expect(res.summary.debtToIncomeRatio).toBe(19.4);
    });

    it('should filter debts by status', async () => {
      const resActive = await service.listDebts({ userId: 'user-1', status: 'ACTIVE' });
      expect(resActive.debts.length).toBe(1);

      const resPaidOff = await service.listDebts({ userId: 'user-1', status: 'PAID_OFF' });
      expect(resPaidOff.debts.length).toBe(0);
    });

    it('should throw DatabaseOperationError if findByUserId fails on listDebts', async () => {
      debtRepo.findByUserId = vi.fn().mockResolvedValue({
        success: false,
        error: new Error('Debts list error'),
      });
      await expect(service.listDebts({ userId: 'user-1' })).rejects.toThrow(DatabaseOperationError);
    });
  });
});
