import type { FinancialProfile } from '@prisma/client';
import { BaseRepository } from './base.repository';
import type {
  IFinancialProfileRepository,
  CreateProfileData,
  UpdateProfileData,
} from '../types/repository.types';
import type { Result } from '../errors/database-error';
import type { TransactionClient } from '../client';
import { toRequiredDecimal, toOptionalDecimal, toDecimal } from '../utils/decimal-converter';

export class FinancialProfileRepository
  extends BaseRepository
  implements IFinancialProfileRepository
{
  async create(
    data: CreateProfileData,
    tx?: TransactionClient
  ): Promise<Result<FinancialProfile>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      return client.financialProfile.create({
        data: {
          userId: data.userId,
          monthlyIncome: toRequiredDecimal(data.monthlyIncome, 'monthlyIncome'),
          otherIncome: toRequiredDecimal(data.otherIncome ?? 0, 'otherIncome'),
          incomeFrequency: data.incomeFrequency ?? 'MONTHLY',
          currentSavings: toRequiredDecimal(data.currentSavings, 'currentSavings'),
          emergencyFundTarget: toDecimal(data.emergencyFundTarget),
          currentEmergencyFund: toRequiredDecimal(data.currentEmergencyFund ?? 0, 'currentEmergencyFund'),
          primaryGoal: data.primaryGoal ?? null,
          riskTolerance: data.riskTolerance ?? 'MODERATE',
          cfoUnderstandingScore: data.cfoUnderstandingScore ?? 0,
        },
      });
    }, 'Failed to create financial profile');
  }

  async findById(id: string, tx?: TransactionClient): Promise<Result<FinancialProfile | null>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      return client.financialProfile.findUnique({
        where: { id },
      });
    }, `Failed to find financial profile by id: ${id}`);
  }

  async findByUserId(
    userId: string,
    tx?: TransactionClient
  ): Promise<Result<FinancialProfile | null>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      return client.financialProfile.findUnique({
        where: { userId },
      });
    }, `Failed to find financial profile for user: ${userId}`);
  }

  async update(
    id: string,
    data: UpdateProfileData,
    tx?: TransactionClient
  ): Promise<Result<FinancialProfile>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      return client.financialProfile.update({
        where: { id },
        data: {
          ...(data.monthlyIncome !== undefined
            ? { monthlyIncome: toRequiredDecimal(data.monthlyIncome, 'monthlyIncome') }
            : {}),
          ...(data.otherIncome !== undefined
            ? { otherIncome: toRequiredDecimal(data.otherIncome, 'otherIncome') }
            : {}),
          ...(data.incomeFrequency ? { incomeFrequency: data.incomeFrequency } : {}),
          ...(data.currentSavings !== undefined
            ? { currentSavings: toRequiredDecimal(data.currentSavings, 'currentSavings') }
            : {}),
          ...(data.emergencyFundTarget !== undefined
            ? { emergencyFundTarget: toOptionalDecimal(data.emergencyFundTarget) ?? null }
            : {}),
          ...(data.currentEmergencyFund !== undefined
            ? { currentEmergencyFund: toRequiredDecimal(data.currentEmergencyFund, 'currentEmergencyFund') }
            : {}),
          ...(data.primaryGoal !== undefined ? { primaryGoal: data.primaryGoal } : {}),
          ...(data.riskTolerance ? { riskTolerance: data.riskTolerance } : {}),
          ...(data.cfoUnderstandingScore !== undefined
            ? { cfoUnderstandingScore: data.cfoUnderstandingScore }
            : {}),
        },
      });
    }, `Failed to update financial profile: ${id}`);
  }

  async updateByUserId(
    userId: string,
    data: UpdateProfileData,
    tx?: TransactionClient
  ): Promise<Result<FinancialProfile>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      return client.financialProfile.update({
        where: { userId },
        data: {
          ...(data.monthlyIncome !== undefined
            ? { monthlyIncome: toRequiredDecimal(data.monthlyIncome, 'monthlyIncome') }
            : {}),
          ...(data.otherIncome !== undefined
            ? { otherIncome: toRequiredDecimal(data.otherIncome, 'otherIncome') }
            : {}),
          ...(data.incomeFrequency ? { incomeFrequency: data.incomeFrequency } : {}),
          ...(data.currentSavings !== undefined
            ? { currentSavings: toRequiredDecimal(data.currentSavings, 'currentSavings') }
            : {}),
          ...(data.emergencyFundTarget !== undefined
            ? { emergencyFundTarget: toOptionalDecimal(data.emergencyFundTarget) ?? null }
            : {}),
          ...(data.currentEmergencyFund !== undefined
            ? { currentEmergencyFund: toRequiredDecimal(data.currentEmergencyFund, 'currentEmergencyFund') }
            : {}),
          ...(data.primaryGoal !== undefined ? { primaryGoal: data.primaryGoal } : {}),
          ...(data.riskTolerance ? { riskTolerance: data.riskTolerance } : {}),
          ...(data.cfoUnderstandingScore !== undefined
            ? { cfoUnderstandingScore: data.cfoUnderstandingScore }
            : {}),
        },
      });
    }, `Failed to update financial profile for user: ${userId}`);
  }

  async upsert(
    userId: string,
    data: CreateProfileData,
    tx?: TransactionClient
  ): Promise<Result<FinancialProfile>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      const monthlyIncome = toRequiredDecimal(data.monthlyIncome, 'monthlyIncome');
      const otherIncome = toRequiredDecimal(data.otherIncome ?? 0, 'otherIncome');
      const currentSavings = toRequiredDecimal(data.currentSavings, 'currentSavings');
      const emergencyFundTarget = toDecimal(data.emergencyFundTarget);
      const currentEmergencyFund = toRequiredDecimal(data.currentEmergencyFund ?? 0, 'currentEmergencyFund');

      return client.financialProfile.upsert({
        where: { userId },
        create: {
          userId,
          monthlyIncome,
          otherIncome,
          incomeFrequency: data.incomeFrequency ?? 'MONTHLY',
          currentSavings,
          emergencyFundTarget,
          currentEmergencyFund,
          primaryGoal: data.primaryGoal ?? null,
          riskTolerance: data.riskTolerance ?? 'MODERATE',
          cfoUnderstandingScore: data.cfoUnderstandingScore ?? 0,
        },
        update: {
          monthlyIncome,
          otherIncome,
          incomeFrequency: data.incomeFrequency ?? 'MONTHLY',
          currentSavings,
          emergencyFundTarget,
          currentEmergencyFund,
          ...(data.primaryGoal !== undefined ? { primaryGoal: data.primaryGoal } : {}),
          ...(data.riskTolerance ? { riskTolerance: data.riskTolerance } : {}),
          ...(data.cfoUnderstandingScore !== undefined
            ? { cfoUnderstandingScore: data.cfoUnderstandingScore }
            : {}),
        },
      });
    }, `Failed to upsert financial profile for user: ${userId}`);
  }
}
