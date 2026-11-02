import { describe, it, expect } from 'vitest';
import type { Expense } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { ExpenseRepository } from '../../src/repositories/expense.repository';
import { prismaMock, txMock } from '../mocks/prisma.mock';

describe('ExpenseRepository Unit Tests', () => {
  const repository = new ExpenseRepository(prismaMock as unknown as never);

  const mockExpense: Expense = {
    id: 'exp_123',
    userId: 'user_123',
    name: 'Apartment Rent',
    amount: new Prisma.Decimal('25000.00'),
    category: 'RENT',
    frequency: 'MONTHLY',
    isEssential: true,
    isActive: true,
    startDate: new Date('2026-01-01'),
    endDate: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    deletedAt: null,
  };

  describe('create', () => {
    it('should create expense with proper Decimal conversion', async () => {
      prismaMock.expense.create.mockResolvedValueOnce(mockExpense);

      const result = await repository.create({
        userId: 'user_123',
        name: 'Apartment Rent',
        amount: 25000,
        category: 'RENT',
        isEssential: true,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockExpense);
      }
      expect(prismaMock.expense.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user_123',
          name: 'Apartment Rent',
          amount: new Prisma.Decimal('25000'),
          category: 'RENT',
          frequency: 'MONTHLY',
          isEssential: true,
          isActive: true,
        }),
      });
    });

    it('should use transaction client tx if passed', async () => {
      txMock.expense.create.mockResolvedValueOnce(mockExpense);

      const result = await repository.create(
        {
          userId: 'user_123',
          name: 'Groceries',
          amount: 8000,
          category: 'GROCERIES',
        },
        txMock as unknown as never
      );

      expect(result.success).toBe(true);
      expect(txMock.expense.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('findById, findByUserId, findActiveByUserId & findByCategory', () => {
    it('should find expense by id', async () => {
      prismaMock.expense.findUnique.mockResolvedValueOnce(mockExpense);

      const result = await repository.findById('exp_123');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockExpense);
      }
    });

    it('should find active expenses for user', async () => {
      prismaMock.expense.findMany.mockResolvedValueOnce([mockExpense]);

      const result = await repository.findActiveByUserId('user_123');
      expect(result.success).toBe(true);
      expect(prismaMock.expense.findMany).toHaveBeenCalledWith({
        where: { userId: 'user_123', isActive: true, deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should find expenses by category', async () => {
      prismaMock.expense.findMany.mockResolvedValueOnce([mockExpense]);

      const result = await repository.findByCategory('user_123', 'RENT');
      expect(result.success).toBe(true);
      expect(prismaMock.expense.findMany).toHaveBeenCalledWith({
        where: { userId: 'user_123', category: 'RENT', deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findMany', () => {
    it('should query expenses with filters and pagination', async () => {
      prismaMock.expense.findMany.mockResolvedValueOnce([mockExpense]);
      prismaMock.expense.count.mockResolvedValueOnce(1);

      const result = await repository.findMany(
        {
          userId: 'user_123',
          category: ['RENT', 'UTILITIES'],
          isEssential: true,
          isActive: true,
        },
        { page: 1, pageSize: 15 }
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.total).toBe(1);
      }
      expect(prismaMock.expense.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user_123',
          deletedAt: null,
          category: { in: ['RENT', 'UTILITIES'] },
          isEssential: true,
          isActive: true,
        },
        skip: 0,
        take: 15,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should query with single category and deleted: true', async () => {
      prismaMock.expense.findMany.mockResolvedValueOnce([mockExpense]);
      prismaMock.expense.count.mockResolvedValueOnce(1);

      const result = await repository.findMany({
        userId: 'user_123',
        category: 'RENT',
        deleted: true,
      });

      expect(result.success).toBe(true);
      expect(prismaMock.expense.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user_123',
          deletedAt: { not: null },
          category: 'RENT',
        },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('update, softDelete & restore', () => {
    it('should update all expense fields', async () => {
      prismaMock.expense.update.mockResolvedValueOnce(mockExpense);

      const result = await repository.update('exp_123', {
        name: 'Higher Rent',
        amount: 28000,
        category: 'RENT',
        frequency: 'MONTHLY',
        isEssential: true,
        isActive: true,
        startDate: '2026-02-01',
        endDate: '2027-02-01',
      });

      expect(result.success).toBe(true);
      expect(prismaMock.expense.update).toHaveBeenCalledWith({
        where: { id: 'exp_123' },
        data: expect.objectContaining({
          name: 'Higher Rent',
          amount: new Prisma.Decimal('28000'),
          frequency: 'MONTHLY',
          isEssential: true,
          isActive: true,
        }),
      });
    });

    it('should handle update with empty object', async () => {
      prismaMock.expense.update.mockResolvedValueOnce(mockExpense);
      const result = await repository.update('exp_123', {});
      expect(result.success).toBe(true);
    });
    it('should update expense fields selectively', async () => {
      prismaMock.expense.update.mockResolvedValueOnce({
        ...mockExpense,
        amount: new Prisma.Decimal('28000.00'),
      });

      const result = await repository.update('exp_123', { amount: 28000 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.amount.toString()).toBe('28000');
      }
      expect(prismaMock.expense.update).toHaveBeenCalledWith({
        where: { id: 'exp_123' },
        data: { amount: new Prisma.Decimal('28000') },
      });
    });

    it('should soft delete expense and set isActive to false', async () => {
      prismaMock.expense.update.mockResolvedValueOnce({
        ...mockExpense,
        deletedAt: new Date(),
        isActive: false,
      });

      const result = await repository.softDelete('exp_123');
      expect(result.success).toBe(true);
      expect(prismaMock.expense.update).toHaveBeenCalledWith({
        where: { id: 'exp_123' },
        data: { deletedAt: expect.any(Date), isActive: false },
      });
    });

    it('should restore expense and set isActive to true', async () => {
      prismaMock.expense.update.mockResolvedValueOnce(mockExpense);

      const result = await repository.restore('exp_123');
      expect(result.success).toBe(true);
      expect(prismaMock.expense.update).toHaveBeenCalledWith({
        where: { id: 'exp_123' },
        data: { deletedAt: null, isActive: true },
      });
    });
  });

  describe('calculateTotalMonthly & calculateEssentialMonthly', () => {
    it('should aggregate active monthly expenses', async () => {
      prismaMock.expense.aggregate.mockResolvedValueOnce({
        _sum: { amount: new Prisma.Decimal('35000.00') },
      } as unknown as never);

      const result = await repository.calculateTotalMonthly('user_123');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(35000);
      }
      expect(prismaMock.expense.aggregate).toHaveBeenCalledWith({
        where: {
          userId: 'user_123',
          isActive: true,
          deletedAt: null,
          frequency: 'MONTHLY',
        },
        _sum: { amount: true },
      });
    });

    it('should aggregate active essential monthly expenses', async () => {
      prismaMock.expense.aggregate.mockResolvedValueOnce({
        _sum: { amount: new Prisma.Decimal('25000.00') },
      } as unknown as never);

      const result = await repository.calculateEssentialMonthly('user_123');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(25000);
      }
      expect(prismaMock.expense.aggregate).toHaveBeenCalledWith({
        where: {
          userId: 'user_123',
          isActive: true,
          isEssential: true,
          deletedAt: null,
          frequency: 'MONTHLY',
        },
        _sum: { amount: true },
      });
    });
  });
});
