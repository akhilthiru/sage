import { describe, it, expect } from 'vitest';
import type { Goal } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { GoalRepository } from '../../src/repositories/goal.repository';
import { prismaMock, txMock } from '../mocks/prisma.mock';

describe('GoalRepository Unit Tests', () => {
  const repository = new GoalRepository(prismaMock as unknown as never);

  const mockGoal: Goal = {
    id: 'goal_123',
    userId: 'user_123',
    name: 'House Down Payment',
    description: 'Save 20% down payment',
    type: 'HOUSE',
    targetAmount: new Prisma.Decimal('500000.00'),
    currentAmount: new Prisma.Decimal('100000.00'),
    monthlyContribution: new Prisma.Decimal('15000.00'),
    targetDate: new Date('2028-12-31'),
    startDate: new Date('2026-01-01'),
    completedDate: null,
    priority: 'HIGH',
    status: 'ACTIVE',
    isFeasible: true,
    feasibilityScore: 88,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    deletedAt: null,
  };

  describe('create', () => {
    it('should create goal with decimal and date conversions', async () => {
      prismaMock.goal.create.mockResolvedValueOnce(mockGoal);

      const result = await repository.create({
        userId: 'user_123',
        name: 'House Down Payment',
        type: 'HOUSE',
        targetAmount: 500000,
        currentAmount: 100000,
        monthlyContribution: 15000,
        targetDate: '2028-12-31',
        priority: 'HIGH',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockGoal);
      }
      expect(prismaMock.goal.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user_123',
          name: 'House Down Payment',
          targetAmount: new Prisma.Decimal('500000'),
          currentAmount: new Prisma.Decimal('100000'),
          monthlyContribution: new Prisma.Decimal('15000'),
          priority: 'HIGH',
          status: 'ACTIVE',
        }),
      });
    });

    it('should delegate to transaction client tx if provided', async () => {
      txMock.goal.create.mockResolvedValueOnce(mockGoal);

      const result = await repository.create(
        {
          userId: 'user_123',
          name: 'Emergency Fund',
          type: 'EMERGENCY_FUND',
          targetAmount: 240000,
          targetDate: '2027-01-01',
        },
        txMock as unknown as never
      );

      expect(result.success).toBe(true);
      expect(txMock.goal.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('findById, findByUserId, findActiveByUserId & findByType', () => {
    it('should find goal by id', async () => {
      prismaMock.goal.findUnique.mockResolvedValueOnce(mockGoal);

      const result = await repository.findById('goal_123');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockGoal);
      }
    });

    it('should find active goals for user', async () => {
      prismaMock.goal.findMany.mockResolvedValueOnce([mockGoal]);

      const result = await repository.findActiveByUserId('user_123');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([mockGoal]);
      }
      expect(prismaMock.goal.findMany).toHaveBeenCalledWith({
        where: { userId: 'user_123', status: 'ACTIVE', deletedAt: null },
        orderBy: [{ priority: 'asc' }, { targetDate: 'asc' }],
      });
    });

    it('should find goals by type', async () => {
      prismaMock.goal.findMany.mockResolvedValueOnce([mockGoal]);

      const result = await repository.findByType('user_123', 'HOUSE');
      expect(result.success).toBe(true);
      expect(prismaMock.goal.findMany).toHaveBeenCalledWith({
        where: { userId: 'user_123', type: 'HOUSE', deletedAt: null },
        orderBy: { targetDate: 'asc' },
      });
    });
  });

  describe('findMany', () => {
    it('should apply complex filters, pagination, and sorting', async () => {
      prismaMock.goal.findMany.mockResolvedValueOnce([mockGoal]);
      prismaMock.goal.count.mockResolvedValueOnce(1);

      const dueBefore = new Date('2029-01-01');
      const dueAfter = new Date('2026-01-01');

      const result = await repository.findMany(
        {
          userId: 'user_123',
          status: ['ACTIVE', 'PAUSED'],
          type: 'HOUSE',
          priority: 'HIGH',
          dueBefore,
          dueAfter,
        },
        { page: 1, pageSize: 10, orderBy: 'targetAmount', orderDirection: 'desc' }
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.total).toBe(1);
      }
      expect(prismaMock.goal.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user_123',
          deletedAt: null,
          status: { in: ['ACTIVE', 'PAUSED'] },
          type: 'HOUSE',
          priority: 'HIGH',
          targetDate: { lte: dueBefore, gte: dueAfter },
        },
        skip: 0,
        take: 10,
        orderBy: { targetAmount: 'desc' },
      });
    });

    it('should query with singular status, singular type, singular priority, and deleted: true', async () => {
      prismaMock.goal.findMany.mockResolvedValueOnce([mockGoal]);
      prismaMock.goal.count.mockResolvedValueOnce(1);

      const result = await repository.findMany({
        userId: 'user_123',
        status: 'ACTIVE',
        type: 'HOUSE',
        priority: 'HIGH',
        deleted: true,
      });

      expect(result.success).toBe(true);
      expect(prismaMock.goal.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user_123',
          deletedAt: { not: null },
          status: 'ACTIVE',
          type: 'HOUSE',
          priority: 'HIGH',
        },
        skip: 0,
        take: 20,
        orderBy: { targetDate: 'asc' },
      });
    });
  });

  describe('update, updateProgress, softDelete & restore', () => {
    it('should update all goal fields', async () => {
      prismaMock.goal.update.mockResolvedValueOnce(mockGoal);

      const result = await repository.update('goal_123', {
        name: 'Updated Goal',
        description: 'Updated Desc',
        type: 'CAR',
        targetAmount: 800000,
        currentAmount: 200000,
        monthlyContribution: 20000,
        targetDate: '2029-01-01',
        completedDate: '2028-12-01',
        priority: 'LOW',
        status: 'COMPLETED',
        isFeasible: false,
        feasibilityScore: 40,
      });

      expect(result.success).toBe(true);
      expect(prismaMock.goal.update).toHaveBeenCalledWith({
        where: { id: 'goal_123' },
        data: expect.objectContaining({
          name: 'Updated Goal',
          description: 'Updated Desc',
          type: 'CAR',
          targetAmount: new Prisma.Decimal('800000'),
          currentAmount: new Prisma.Decimal('200000'),
          monthlyContribution: new Prisma.Decimal('20000'),
          priority: 'LOW',
          status: 'COMPLETED',
          isFeasible: false,
          feasibilityScore: 40,
        }),
      });
    });

    it('should handle update with empty object', async () => {
      prismaMock.goal.update.mockResolvedValueOnce(mockGoal);
      const result = await repository.update('goal_123', {});
      expect(result.success).toBe(true);
    });

    it('should update goal progress currentAmount', async () => {
      prismaMock.goal.update.mockResolvedValueOnce({
        ...mockGoal,
        currentAmount: new Prisma.Decimal('120000.00'),
      });

      const result = await repository.updateProgress('goal_123', 120000);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.currentAmount.toString()).toBe('120000');
      }
      expect(prismaMock.goal.update).toHaveBeenCalledWith({
        where: { id: 'goal_123' },
        data: { currentAmount: new Prisma.Decimal('120000') },
      });
    });

    it('should soft delete goal setting status to CANCELLED', async () => {
      prismaMock.goal.update.mockResolvedValueOnce({
        ...mockGoal,
        deletedAt: new Date(),
        status: 'CANCELLED',
      });

      const result = await repository.softDelete('goal_123');
      expect(result.success).toBe(true);
      expect(prismaMock.goal.update).toHaveBeenCalledWith({
        where: { id: 'goal_123' },
        data: { deletedAt: expect.any(Date), status: 'CANCELLED' },
      });
    });

    it('should restore goal setting status to ACTIVE', async () => {
      prismaMock.goal.update.mockResolvedValueOnce(mockGoal);

      const result = await repository.restore('goal_123');
      expect(result.success).toBe(true);
      expect(prismaMock.goal.update).toHaveBeenCalledWith({
        where: { id: 'goal_123' },
        data: { deletedAt: null, status: 'ACTIVE' },
      });
    });
  });

  describe('findEmergencyFundGoal & countActiveGoals', () => {
    it('should query for first active EMERGENCY_FUND goal', async () => {
      prismaMock.goal.findFirst.mockResolvedValueOnce(mockGoal);

      const result = await repository.findEmergencyFundGoal('user_123');
      expect(result.success).toBe(true);
      expect(prismaMock.goal.findFirst).toHaveBeenCalledWith({
        where: { userId: 'user_123', type: 'EMERGENCY_FUND', deletedAt: null },
      });
    });

    it('should count active goals correctly', async () => {
      prismaMock.goal.count.mockResolvedValueOnce(3);

      const result = await repository.countActiveGoals('user_123');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(3);
      }
    });
  });
});
