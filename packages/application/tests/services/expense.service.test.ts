import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExpenseService } from '../../src/services/expense.service';
import { InProcessEventBus } from '../../src/events';
import {
  createMockExpenseRepository,
  createMockPrismaClient,
} from '../helpers/mock-repositories';
import {
  NotFoundError,
  AuthorizationError,
  DatabaseOperationError,
} from '../../src/errors';
import type { AllocationService } from '../../src/services/allocation.service';

describe('ExpenseService', () => {
  let expenseRepo: ReturnType<typeof createMockExpenseRepository>;
  let mockAllocationService: AllocationService;
  let mockPrisma: any;
  let eventBus: InProcessEventBus;
  let service: ExpenseService;

  const mockExpense = {
    id: 'exp-1',
    userId: 'user-1',
    name: 'Office Rent',
    amount: 30000,
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

  const mockAllocation = {
    id: 'alloc-1',
    userId: 'user-1',
    monthlyIncome: 80000,
    needs: 35000,
    wants: 25000,
    savings: 20000,
    breakdown: {
      fixedExpenses: 30000,
      variableExpenses: 5000,
      goalContributions: 15000,
      debtPayments: 0,
      discretionary: 25000,
      emergencyFund: 5000,
    },
    createdAt: new Date(),
  };

  beforeEach(() => {
    expenseRepo = createMockExpenseRepository({
      create: vi.fn().mockResolvedValue({ success: true, data: mockExpense }),
      findById: vi.fn().mockResolvedValue({ success: true, data: mockExpense }),
      update: vi.fn().mockResolvedValue({ success: true, data: { ...mockExpense, amount: 35000 } }),
      softDelete: vi.fn().mockResolvedValue({ success: true, data: mockExpense }),
      findMany: vi.fn().mockResolvedValue({
        success: true,
        data: {
          data: [mockExpense],
          total: 1,
          page: 1,
          pageSize: 20,
          totalPages: 1,
        },
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

    service = new ExpenseService(
      expenseRepo,
      mockAllocationService,
      eventBus,
      mockPrisma
    );
  });

  describe('recordExpense', () => {
    it('should record an essential recurring expense and recalculate allocation', async () => {
      const publishSpy = vi.spyOn(eventBus, 'publish');
      const res = await service.recordExpense({
        userId: 'user-1',
        amount: 30000,
        category: 'RENT',
        description: 'Office Rent',
        isRecurring: true,
        frequency: 'MONTHLY',
      });

      expect(res.expense).toBeDefined();
      expect(res.allocation).toBeDefined();
      expect(expenseRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          amount: 30000,
          category: 'RENT',
          isEssential: true,
          frequency: 'MONTHLY',
        }),
        expect.anything()
      );
      expect(mockAllocationService.generateAllocation).toHaveBeenCalledWith(
        { userId: 'user-1' },
        expect.anything()
      );
      expect(publishSpy).toHaveBeenCalledTimes(1);
    });

    it('should record non-essential one-time expense', async () => {
      const diningExpense = { ...mockExpense, category: 'DINING' as const, isEssential: false, frequency: 'ONE_TIME' as const };
      expenseRepo.create = vi.fn().mockResolvedValue({ success: true, data: diningExpense });

      const res = await service.recordExpense({
        userId: 'user-1',
        amount: 2500,
        category: 'DINING',
        isRecurring: false,
      });

      expect(expenseRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'DINING',
          isEssential: false,
          frequency: 'ONE_TIME',
        }),
        expect.anything()
      );
      expect(res.expense.category).toBe('DINING');
    });

    it('should throw DatabaseOperationError if create fails', async () => {
      expenseRepo.create = vi.fn().mockResolvedValue({
        success: false,
        error: new Error('Create error'),
      });
      await expect(
        service.recordExpense({
          userId: 'user-1',
          amount: 1000,
          category: 'OTHER',
        })
      ).rejects.toThrow(DatabaseOperationError);
    });
  });

  describe('updateExpense', () => {
    it('should update expense and publish ExpenseUpdatedEvent', async () => {
      const publishSpy = vi.spyOn(eventBus, 'publish');
      const res = await service.updateExpense({
        userId: 'user-1',
        expenseId: 'exp-1',
        amount: 35000,
        category: 'RENT',
      });

      expect(res.expense.amount).toBe(35000);
      expect(expenseRepo.update).toHaveBeenCalledWith(
        'exp-1',
        expect.objectContaining({ amount: 35000 }),
        expect.anything()
      );
      expect(mockAllocationService.generateAllocation).toHaveBeenCalledWith(
        { userId: 'user-1' },
        expect.anything()
      );
      expect(publishSpy).toHaveBeenCalledTimes(1);
    });

    it('should throw DatabaseOperationError if update fails', async () => {
      expenseRepo.update = vi.fn().mockResolvedValue({
        success: false,
        error: new Error('Update error'),
      });
      await expect(
        service.updateExpense({
          userId: 'user-1',
          expenseId: 'exp-1',
          amount: 40000,
        })
      ).rejects.toThrow(DatabaseOperationError);
    });

    it('should use existingTx when updating expense', async () => {
      const existingTx = {} as any;
      await service.updateExpense(
        { userId: 'user-1', expenseId: 'exp-1', amount: 40000 },
        existingTx
      );
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(expenseRepo.update).toHaveBeenCalledWith('exp-1', expect.anything(), existingTx);
    });
  });

  describe('deleteExpense', () => {
    it('should soft delete expense and publish ExpenseDeletedEvent', async () => {
      const publishSpy = vi.spyOn(eventBus, 'publish');
      const res = await service.deleteExpense({ userId: 'user-1', expenseId: 'exp-1' });

      expect(res.expenseId).toBe('exp-1');
      expect(expenseRepo.softDelete).toHaveBeenCalledWith('exp-1', expect.anything());
      expect(mockAllocationService.generateAllocation).toHaveBeenCalledWith(
        { userId: 'user-1' },
        expect.anything()
      );
      expect(publishSpy).toHaveBeenCalledTimes(1);
    });

    it('should throw DatabaseOperationError if softDelete fails', async () => {
      expenseRepo.softDelete = vi.fn().mockResolvedValue({
        success: false,
        error: new Error('Delete error'),
      });
      await expect(
        service.deleteExpense({ userId: 'user-1', expenseId: 'exp-1' })
      ).rejects.toThrow(DatabaseOperationError);
    });

    it('should use existingTx when deleting expense', async () => {
      const existingTx = {} as any;
      await service.deleteExpense(
        { userId: 'user-1', expenseId: 'exp-1' },
        existingTx
      );
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(expenseRepo.softDelete).toHaveBeenCalledWith('exp-1', existingTx);
    });

    it('should throw NotFoundError if expense not found on delete', async () => {
      expenseRepo.findById = vi.fn().mockResolvedValue({ success: true, data: null });
      await expect(
        service.deleteExpense({ userId: 'user-1', expenseId: 'missing' })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw AuthorizationError if user does not own expense on delete', async () => {
      expenseRepo.findById = vi.fn().mockResolvedValue({
        success: true,
        data: { ...mockExpense, userId: 'someone-else' },
      });
      await expect(
        service.deleteExpense({ userId: 'user-1', expenseId: 'exp-1' })
      ).rejects.toThrow(AuthorizationError);
    });
  });

  describe('listExpenses', () => {
    it('should list expenses and return aggregated summary', async () => {
      const res = await service.listExpenses({ userId: 'user-1' });
      expect(res.expenses.length).toBe(1);
      expect(res.summary.totalExpenses).toBe(1);
      expect(res.summary.totalAmount).toBe(30000);
      expect(res.summary.byCategory['RENT']).toBe(30000);
      expect(res.pagination?.page).toBe(1);
    });

    it('should filter by category and isRecurring', async () => {
      const resCategory = await service.listExpenses({ userId: 'user-1', category: 'RENT' });
      expect(resCategory.expenses.length).toBe(1);

      const resFilteredOut = await service.listExpenses({ userId: 'user-1', category: 'GROCERIES' });
      expect(resFilteredOut.expenses.length).toBe(0);

      const resRecurring = await service.listExpenses({ userId: 'user-1', isRecurring: true });
      expect(resRecurring.expenses.length).toBe(1);
    });
  });
});
