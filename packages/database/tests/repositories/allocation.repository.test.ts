import { describe, it, expect } from 'vitest';
import type { Allocation } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { AllocationRepository } from '../../src/repositories/allocation.repository';
import { prismaMock, txMock } from '../mocks/prisma.mock';

describe('AllocationRepository Unit Tests', () => {
  const repository = new AllocationRepository(prismaMock as unknown as never);

  const mockAllocation: Allocation = {
    id: 'alloc_123',
    userId: 'user_123',
    month: 1,
    year: 2026,
    essentialExpenses: new Prisma.Decimal('25000.00'),
    debtPayments: new Prisma.Decimal('26000.00'),
    emergencyFund: new Prisma.Decimal('10000.00'),
    goalSavings: new Prisma.Decimal('15000.00'),
    investments: new Prisma.Decimal('5000.00'),
    discretionary: new Prisma.Decimal('4000.00'),
    totalIncome: new Prisma.Decimal('85000.00'),
    totalAllocated: new Prisma.Decimal('85000.00'),
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  describe('create & upsert', () => {
    it('should create allocation snapshot with all Decimal fields', async () => {
      prismaMock.allocation.create.mockResolvedValueOnce(mockAllocation);

      const result = await repository.create({
        userId: 'user_123',
        month: 1,
        year: 2026,
        essentialExpenses: 25000,
        debtPayments: 26000,
        emergencyFund: 10000,
        goalSavings: 15000,
        investments: 5000,
        discretionary: 4000,
        totalIncome: 85000,
        totalAllocated: 85000,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockAllocation);
      }
      expect(prismaMock.allocation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user_123',
          month: 1,
          year: 2026,
          essentialExpenses: new Prisma.Decimal('25000'),
          debtPayments: new Prisma.Decimal('26000'),
        }),
      });
    });

    it('should upsert allocation by composite userId_month_year', async () => {
      prismaMock.allocation.upsert.mockResolvedValueOnce(mockAllocation);

      const result = await repository.upsert({
        userId: 'user_123',
        month: 1,
        year: 2026,
        essentialExpenses: 25000,
        debtPayments: 26000,
        emergencyFund: 10000,
        goalSavings: 15000,
        investments: 5000,
        discretionary: 4000,
        totalIncome: 85000,
        totalAllocated: 85000,
      });

      expect(result.success).toBe(true);
      expect(prismaMock.allocation.upsert).toHaveBeenCalledWith({
        where: {
          userId_month_year: {
            userId: 'user_123',
            month: 1,
            year: 2026,
          },
        },
        create: expect.any(Object),
        update: expect.any(Object),
      });
    });
  });

  describe('findById, findByUserId, findByMonth & findRecent', () => {
    it('should find allocation by id', async () => {
      prismaMock.allocation.findUnique.mockResolvedValueOnce(mockAllocation);

      const result = await repository.findById('alloc_123');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockAllocation);
      }
    });

    it('should find allocation by month and year', async () => {
      prismaMock.allocation.findUnique.mockResolvedValueOnce(mockAllocation);

      const result = await repository.findByMonth('user_123', 1, 2026);
      expect(result.success).toBe(true);
      expect(prismaMock.allocation.findUnique).toHaveBeenCalledWith({
        where: {
          userId_month_year: {
            userId: 'user_123',
            month: 1,
            year: 2026,
          },
        },
      });
    });

    it('should find recent allocations with limit count', async () => {
      prismaMock.allocation.findMany.mockResolvedValueOnce([mockAllocation]);

      const result = await repository.findRecent('user_123', 3);
      expect(result.success).toBe(true);
      expect(prismaMock.allocation.findMany).toHaveBeenCalledWith({
        where: { userId: 'user_123' },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        take: 3,
      });
    });
  });

  describe('update', () => {
    it('should update all allocation fields', async () => {
      prismaMock.allocation.update.mockResolvedValueOnce(mockAllocation);

      const result = await repository.update('alloc_123', {
        essentialExpenses: 26000,
        debtPayments: 25000,
        emergencyFund: 12000,
        goalSavings: 18000,
        investments: 6000,
        discretionary: 3000,
        totalIncome: 90000,
        totalAllocated: 90000,
        isActive: false,
      });

      expect(result.success).toBe(true);
      expect(prismaMock.allocation.update).toHaveBeenCalledWith({
        where: { id: 'alloc_123' },
        data: expect.objectContaining({
          essentialExpenses: new Prisma.Decimal('26000'),
          totalIncome: new Prisma.Decimal('90000'),
          isActive: false,
        }),
      });
    });

    it('should update allocation fields selectively', async () => {
      prismaMock.allocation.update.mockResolvedValueOnce({
        ...mockAllocation,
        discretionary: new Prisma.Decimal('5000.00'),
      });

      const result = await repository.update('alloc_123', {
        discretionary: 5000,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.discretionary.toString()).toBe('5000');
      }
    });
  });
});
