import { describe, it, expect } from 'vitest';
import type { FinancialProfile } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { FinancialProfileRepository } from '../../src/repositories/financial-profile.repository';
import { prismaMock, txMock } from '../mocks/prisma.mock';

describe('FinancialProfileRepository Unit Tests', () => {
  const repository = new FinancialProfileRepository(prismaMock as unknown as never);

  const mockProfile: FinancialProfile = {
    id: 'prof_123',
    userId: 'user_123',
    monthlyIncome: new Prisma.Decimal('80000.00'),
    otherIncome: new Prisma.Decimal('5000.00'),
    incomeFrequency: 'MONTHLY',
    currentSavings: new Prisma.Decimal('100000.00'),
    emergencyFundTarget: new Prisma.Decimal('240000.00'),
    currentEmergencyFund: new Prisma.Decimal('50000.00'),
    primaryGoal: 'house',
    riskTolerance: 'MODERATE',
    cfoUnderstandingScore: 65,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  describe('create', () => {
    it('should create profile with proper Decimal conversion', async () => {
      prismaMock.financialProfile.create.mockResolvedValueOnce(mockProfile);

      const result = await repository.create({
        userId: 'user_123',
        monthlyIncome: 80000,
        otherIncome: 5000,
        currentSavings: 100000,
        emergencyFundTarget: 240000,
        currentEmergencyFund: 50000,
        primaryGoal: 'house',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockProfile);
      }
      expect(prismaMock.financialProfile.create).toHaveBeenCalledWith({
        data: {
          userId: 'user_123',
          monthlyIncome: new Prisma.Decimal('80000'),
          otherIncome: new Prisma.Decimal('5000'),
          incomeFrequency: 'MONTHLY',
          currentSavings: new Prisma.Decimal('100000'),
          emergencyFundTarget: new Prisma.Decimal('240000'),
          currentEmergencyFund: new Prisma.Decimal('50000'),
          primaryGoal: 'house',
          riskTolerance: 'MODERATE',
          cfoUnderstandingScore: 0,
        },
      });
    });

    it('should delegate to transaction client tx if provided', async () => {
      txMock.financialProfile.create.mockResolvedValueOnce(mockProfile);

      const result = await repository.create(
        {
          userId: 'user_123',
          monthlyIncome: 80000,
          currentSavings: 100000,
        },
        txMock as unknown as never
      );

      expect(result.success).toBe(true);
      expect(txMock.financialProfile.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('findById & findByUserId', () => {
    it('should find profile by id', async () => {
      prismaMock.financialProfile.findUnique.mockResolvedValueOnce(mockProfile);

      const result = await repository.findById('prof_123');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockProfile);
      }
    });

    it('should find profile by userId', async () => {
      prismaMock.financialProfile.findUnique.mockResolvedValueOnce(mockProfile);

      const result = await repository.findByUserId('user_123');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockProfile);
      }
      expect(prismaMock.financialProfile.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user_123' },
      });
    });
  });

  describe('update & updateByUserId', () => {
    it('should update profile fields by id with all fields populated', async () => {
      prismaMock.financialProfile.update.mockResolvedValueOnce({
        ...mockProfile,
        monthlyIncome: new Prisma.Decimal('90000.00'),
      });

      const result = await repository.update('prof_123', {
        monthlyIncome: 90000,
        otherIncome: 10000,
        incomeFrequency: 'ANNUAL',
        currentSavings: 150000,
        emergencyFundTarget: 300000,
        currentEmergencyFund: 60000,
        primaryGoal: 'retirement',
        riskTolerance: 'AGGRESSIVE',
        cfoUnderstandingScore: 85,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.monthlyIncome.toString()).toBe('90000');
      }
      expect(prismaMock.financialProfile.update).toHaveBeenCalledWith({
        where: { id: 'prof_123' },
        data: expect.objectContaining({
          monthlyIncome: new Prisma.Decimal('90000'),
          otherIncome: new Prisma.Decimal('10000'),
          incomeFrequency: 'ANNUAL',
          currentSavings: new Prisma.Decimal('150000'),
          emergencyFundTarget: new Prisma.Decimal('300000'),
          currentEmergencyFund: new Prisma.Decimal('60000'),
          primaryGoal: 'retirement',
          riskTolerance: 'AGGRESSIVE',
          cfoUnderstandingScore: 85,
        }),
      });
    });

    it('should update profile by userId with all fields', async () => {
      prismaMock.financialProfile.update.mockResolvedValueOnce(mockProfile);

      const result = await repository.updateByUserId('user_123', {
        monthlyIncome: 95000,
        otherIncome: 5000,
        incomeFrequency: 'MONTHLY',
        currentSavings: 120000,
        emergencyFundTarget: 250000,
        currentEmergencyFund: 70000,
        primaryGoal: 'education',
        riskTolerance: 'CONSERVATIVE',
        cfoUnderstandingScore: 90,
      });

      expect(result.success).toBe(true);
    });

    it('should handle partial update with empty object', async () => {
      prismaMock.financialProfile.update.mockResolvedValueOnce(mockProfile);
      const result = await repository.update('prof_123', {});
      expect(result.success).toBe(true);
    });

    it('should handle updateByUserId with empty object', async () => {
      prismaMock.financialProfile.update.mockResolvedValueOnce(mockProfile);
      const result = await repository.updateByUserId('user_123', {});
      expect(result.success).toBe(true);
    });
  });

  describe('upsert', () => {
    it('should upsert profile with create and update payloads', async () => {
      prismaMock.financialProfile.upsert.mockResolvedValueOnce(mockProfile);

      const result = await repository.upsert('user_123', {
        userId: 'user_123',
        monthlyIncome: 80000,
        currentSavings: 100000,
        emergencyFundTarget: 240000,
        cfoUnderstandingScore: 70,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockProfile);
      }
      expect(prismaMock.financialProfile.upsert).toHaveBeenCalledWith({
        where: { userId: 'user_123' },
        create: expect.objectContaining({
          userId: 'user_123',
          monthlyIncome: new Prisma.Decimal('80000'),
        }),
        update: expect.objectContaining({
          monthlyIncome: new Prisma.Decimal('80000'),
          cfoUnderstandingScore: 70,
        }),
      });
    });
  });
});
