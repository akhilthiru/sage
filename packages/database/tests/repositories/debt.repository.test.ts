import { describe, it, expect } from 'vitest';
import type { Debt, DebtPayment } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { DebtRepository } from '../../src/repositories/debt.repository';
import { prismaMock, txMock } from '../mocks/prisma.mock';

describe('DebtRepository Unit Tests', () => {
  const repository = new DebtRepository(prismaMock as unknown as never);

  const mockDebt: Debt = {
    id: 'debt_123',
    userId: 'user_123',
    name: 'Home Loan',
    type: 'HOME_LOAN',
    principalAmount: new Prisma.Decimal('3000000.00'),
    currentBalance: new Prisma.Decimal('2800000.00'),
    interestRate: new Prisma.Decimal('8.50'),
    monthlyPayment: new Prisma.Decimal('26000.00'),
    minimumPayment: new Prisma.Decimal('26000.00'),
    startDate: new Date('2024-01-01'),
    endDate: new Date('2044-01-01'),
    status: 'ACTIVE',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
  };

  const mockPayment: DebtPayment = {
    id: 'pay_123',
    debtId: 'debt_123',
    amount: new Prisma.Decimal('26000.00'),
    principalPaid: new Prisma.Decimal('6000.00'),
    interestPaid: new Prisma.Decimal('20000.00'),
    paymentDate: new Date('2026-01-05'),
    dueDate: new Date('2026-01-05'),
    status: 'COMPLETED',
    createdAt: new Date('2026-01-05'),
    updatedAt: new Date('2026-01-05'),
  };

  describe('create & createPayment', () => {
    it('should create debt with Decimal fields', async () => {
      prismaMock.debt.create.mockResolvedValueOnce(mockDebt);

      const result = await repository.create({
        userId: 'user_123',
        name: 'Home Loan',
        type: 'HOME_LOAN',
        principalAmount: 3000000,
        currentBalance: 2800000,
        interestRate: 8.5,
        monthlyPayment: 26000,
        minimumPayment: 26000,
        startDate: '2024-01-01',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockDebt);
      }
      expect(prismaMock.debt.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user_123',
          name: 'Home Loan',
          principalAmount: new Prisma.Decimal('3000000'),
          currentBalance: new Prisma.Decimal('2800000'),
          interestRate: new Prisma.Decimal('8.5'),
          monthlyPayment: new Prisma.Decimal('26000'),
        }),
      });
    });

    it('should record debt payment with Decimal breakdown', async () => {
      prismaMock.debtPayment.create.mockResolvedValueOnce(mockPayment);

      const result = await repository.createPayment({
        debtId: 'debt_123',
        amount: 26000,
        principalPaid: 6000,
        interestPaid: 20000,
        paymentDate: '2026-01-05',
        dueDate: '2026-01-05',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockPayment);
      }
      expect(prismaMock.debtPayment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          debtId: 'debt_123',
          amount: new Prisma.Decimal('26000'),
          principalPaid: new Prisma.Decimal('6000'),
          interestPaid: new Prisma.Decimal('20000'),
        }),
      });
    });
  });

  describe('findById, findByUserId & findWithPayments', () => {
    it('should find debt by id', async () => {
      prismaMock.debt.findUnique.mockResolvedValueOnce(mockDebt);

      const result = await repository.findById('debt_123');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockDebt);
      }
    });

    it('should find debt with payments', async () => {
      const debtWithPayments = { ...mockDebt, payments: [mockPayment] };
      prismaMock.debt.findUnique.mockResolvedValueOnce(debtWithPayments);

      const result = await repository.findWithPayments('debt_123');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.payments).toHaveLength(1);
      }
      expect(prismaMock.debt.findUnique).toHaveBeenCalledWith({
        where: { id: 'debt_123' },
        include: { payments: { orderBy: { paymentDate: 'desc' } } },
      });
    });
  });

  describe('findMany', () => {
    it('should query debts with filters and pagination', async () => {
      prismaMock.debt.findMany.mockResolvedValueOnce([mockDebt]);
      prismaMock.debt.count.mockResolvedValueOnce(1);

      const result = await repository.findMany(
        {
          userId: 'user_123',
          type: 'HOME_LOAN',
          status: 'ACTIVE',
          deleted: false,
        },
        { page: 1, pageSize: 10 }
      );

      expect(result.success).toBe(true);
      expect(prismaMock.debt.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user_123',
          type: 'HOME_LOAN',
          status: 'ACTIVE',
          deletedAt: null,
        },
        skip: 0,
        take: 10,
        orderBy: { currentBalance: 'desc' },
      });
    });

    it('should query debts with array filters and deleted: true', async () => {
      prismaMock.debt.findMany.mockResolvedValueOnce([mockDebt]);
      prismaMock.debt.count.mockResolvedValueOnce(1);

      const result = await repository.findMany({
        userId: 'user_123',
        type: ['HOME_LOAN', 'CAR_LOAN'],
        status: ['ACTIVE'],
        deleted: true,
      });

      expect(result.success).toBe(true);
      expect(prismaMock.debt.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user_123',
          type: { in: ['HOME_LOAN', 'CAR_LOAN'] },
          status: { in: ['ACTIVE'] },
          deletedAt: { not: null },
        },
        skip: 0,
        take: 20,
        orderBy: { currentBalance: 'desc' },
      });
    });
  });

  describe('update', () => {
    it('should update all debt fields', async () => {
      prismaMock.debt.update.mockResolvedValueOnce(mockDebt);

      const result = await repository.update('debt_123', {
        name: 'Refinanced Home Loan',
        currentBalance: 2500000,
        interestRate: 7.9,
        monthlyPayment: 24000,
        minimumPayment: 24000,
        endDate: '2042-01-01',
        status: 'ACTIVE',
      });

      expect(result.success).toBe(true);
      expect(prismaMock.debt.update).toHaveBeenCalledWith({
        where: { id: 'debt_123' },
        data: expect.objectContaining({
          name: 'Refinanced Home Loan',
          currentBalance: new Prisma.Decimal('2500000'),
          interestRate: new Prisma.Decimal('7.9'),
          monthlyPayment: new Prisma.Decimal('24000'),
        }),
      });
    });

    it('should handle update with empty object', async () => {
      prismaMock.debt.update.mockResolvedValueOnce(mockDebt);
      const result = await repository.update('debt_123', {});
      expect(result.success).toBe(true);
    });
  });

  describe('updateBalance & status automation', () => {
    it('should update balance and automatically set status to PAID_OFF when balance is 0', async () => {
      const paidDebt = { ...mockDebt, currentBalance: new Prisma.Decimal('0.00'), status: 'PAID_OFF' as const };
      prismaMock.debt.update.mockResolvedValueOnce(paidDebt);

      const result = await repository.updateBalance('debt_123', 0);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('PAID_OFF');
      }
      expect(prismaMock.debt.update).toHaveBeenCalledWith({
        where: { id: 'debt_123' },
        data: {
          currentBalance: new Prisma.Decimal('0'),
          status: 'PAID_OFF',
        },
      });
    });

    it('should update balance without altering status when balance remains positive', async () => {
      prismaMock.debt.update.mockResolvedValueOnce(mockDebt);

      const result = await repository.updateBalance('debt_123', 2700000);
      expect(result.success).toBe(true);
      expect(prismaMock.debt.update).toHaveBeenCalledWith({
        where: { id: 'debt_123' },
        data: {
          currentBalance: new Prisma.Decimal('2700000'),
        },
      });
    });
  });

  describe('softDelete & restore', () => {
    it('should soft delete debt', async () => {
      prismaMock.debt.update.mockResolvedValueOnce({ ...mockDebt, deletedAt: new Date() });

      const result = await repository.softDelete('debt_123');
      expect(result.success).toBe(true);
      expect(prismaMock.debt.update).toHaveBeenCalledWith({
        where: { id: 'debt_123' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should restore debt', async () => {
      prismaMock.debt.update.mockResolvedValueOnce(mockDebt);

      const result = await repository.restore('debt_123');
      expect(result.success).toBe(true);
      expect(prismaMock.debt.update).toHaveBeenCalledWith({
        where: { id: 'debt_123' },
        data: { deletedAt: null },
      });
    });
  });

  describe('calculateTotalBalance & calculateTotalMonthlyPayments', () => {
    it('should calculate total active debt balance', async () => {
      prismaMock.debt.aggregate.mockResolvedValueOnce({
        _sum: { currentBalance: new Prisma.Decimal('2800000.00') },
      } as unknown as never);

      const result = await repository.calculateTotalBalance('user_123');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(2800000);
      }
    });

    it('should calculate total monthly debt payment', async () => {
      prismaMock.debt.aggregate.mockResolvedValueOnce({
        _sum: { monthlyPayment: new Prisma.Decimal('26000.00') },
      } as unknown as never);

      const result = await repository.calculateTotalMonthlyPayments('user_123');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(26000);
      }
    });
  });
});
