import {
  type IFinancialProfileRepository,
  type TransactionClient,
  type FinancialProfile,
  type RiskTolerance as DbRiskTolerance,
  prisma,
} from '@sage/database';
import {
  type FinancialProfileDTO,
  type UpdateIncomeRequest,
  type UpdateIncomeResponse,
  type UpdateRiskToleranceRequest,
  UpdateIncomeSchema,
  UpdateRiskToleranceSchema,
  validateWithZod,
} from '../dtos';
import { NotFoundError, DatabaseOperationError } from '../errors';
import { IncomeUpdatedEvent, type IEventPublisher } from '../events';
import { AllocationService } from './allocation.service';

export function mapProfileToDTO(profile: FinancialProfile): FinancialProfileDTO {
  let riskTol: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';
  if (profile.riskTolerance === 'CONSERVATIVE') riskTol = 'LOW';
  if (profile.riskTolerance === 'AGGRESSIVE') riskTol = 'HIGH';

  return {
    userId: profile.userId,
    profileId: profile.id,
    monthlyIncome: Number(profile.monthlyIncome),
    currency: 'INR',
    riskTolerance: riskTol,
    hasDebts: false,
    hasGoals: false,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

export class FinancialProfileService {
  constructor(
    private readonly profileRepo: IFinancialProfileRepository,
    private readonly allocationService: AllocationService,
    private readonly eventPublisher?: IEventPublisher,
    private readonly prismaClient: typeof prisma = prisma
  ) {}

  async getProfile(userId: string, tx?: TransactionClient): Promise<FinancialProfileDTO> {
    const profileRes = await this.profileRepo.findByUserId(userId, tx);
    if (!profileRes.success || !profileRes.data) {
      throw new NotFoundError(`Financial profile not found for user ${userId}`, 'FinancialProfile', userId);
    }
    return mapProfileToDTO(profileRes.data);
  }

  async updateIncome(
    request: UpdateIncomeRequest,
    existingTx?: TransactionClient
  ): Promise<UpdateIncomeResponse> {
    const validated = validateWithZod(UpdateIncomeSchema, request);
    const { userId, monthlyIncome } = validated;

    // Check profile existence
    const currentRes = await this.profileRepo.findByUserId(userId, existingTx);
    if (!currentRes.success || !currentRes.data) {
      throw new NotFoundError(`Financial profile not found for user ${userId}`, 'FinancialProfile', userId);
    }
    const oldIncome = Number(currentRes.data.monthlyIncome);

    const executeWork = async (tx: TransactionClient): Promise<UpdateIncomeResponse> => {
      const updateRes = await this.profileRepo.updateByUserId(
        userId,
        {
          monthlyIncome,
          emergencyFundTarget: monthlyIncome * 3,
        },
        tx
      );

      if (!updateRes.success) {
        throw new DatabaseOperationError('Failed to update income', updateRes.error);
      }

      const allocRes = await this.allocationService.generateAllocation({ userId }, tx);

      return {
        profile: mapProfileToDTO(updateRes.data),
        allocation: allocRes.allocation,
      };
    };

    let result: UpdateIncomeResponse;
    if (existingTx) {
      result = await executeWork(existingTx);
    } else {
      result = await this.prismaClient.$transaction(async (tx) => {
        return await executeWork(tx);
      });
    }

    if (this.eventPublisher) {
      await this.eventPublisher.publish(new IncomeUpdatedEvent(userId, oldIncome, monthlyIncome));
    }

    return result;
  }

  async updateRiskTolerance(
    request: UpdateRiskToleranceRequest,
    existingTx?: TransactionClient
  ): Promise<FinancialProfileDTO> {
    const validated = validateWithZod(UpdateRiskToleranceSchema, request);
    const { userId, riskTolerance } = validated;

    let dbRiskTolerance: DbRiskTolerance = 'MODERATE';
    if (riskTolerance === 'LOW') dbRiskTolerance = 'CONSERVATIVE';
    if (riskTolerance === 'HIGH') dbRiskTolerance = 'AGGRESSIVE';

    const executeWork = async (tx: TransactionClient): Promise<FinancialProfileDTO> => {
      const updateRes = await this.profileRepo.updateByUserId(
        userId,
        { riskTolerance: dbRiskTolerance },
        tx
      );

      if (!updateRes.success) {
        throw new DatabaseOperationError('Failed to update risk tolerance', updateRes.error);
      }

      await this.allocationService.generateAllocation({ userId }, tx);
      return mapProfileToDTO(updateRes.data);
    };

    if (existingTx) {
      return await executeWork(existingTx);
    } else {
      return await this.prismaClient.$transaction(async (tx) => {
        return await executeWork(tx);
      });
    }
  }
}
