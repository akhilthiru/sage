import {
  type IUserRepository,
  type IFinancialProfileRepository,
  type TransactionClient,
  type RiskTolerance as DbRiskTolerance,
  prisma,
} from '@sage/database';
import {
  type CompleteOnboardingRequest,
  type CompleteOnboardingResponse,
  CompleteOnboardingSchema,
  validateWithZod,
} from '../dtos';
import { NotFoundError, DatabaseOperationError } from '../errors';
import { UserOnboardingCompletedEvent, type IEventPublisher } from '../events';
import { AllocationService } from './allocation.service';

export class OnboardingService {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly profileRepo: IFinancialProfileRepository,
    private readonly allocationService: AllocationService,
    private readonly eventPublisher?: IEventPublisher,
    private readonly prismaClient: typeof prisma = prisma
  ) {}

  async completeOnboarding(
    request: CompleteOnboardingRequest,
    existingTx?: TransactionClient
  ): Promise<CompleteOnboardingResponse> {
    const validated = validateWithZod(CompleteOnboardingSchema, request);
    const { userId, monthlyIncome, riskTolerance } = validated;

    // 1. Check user exists
    const userRes = await this.userRepo.findById(userId, existingTx);
    if (!userRes.success || !userRes.data) {
      throw new NotFoundError(`User with ID ${userId} does not exist`, 'User', userId);
    }

    // Map risk tolerance to DB enum
    let dbRiskTolerance: DbRiskTolerance = 'MODERATE';
    if (riskTolerance === 'LOW') dbRiskTolerance = 'CONSERVATIVE';
    else if (riskTolerance === 'HIGH') dbRiskTolerance = 'AGGRESSIVE';
    else if (riskTolerance === 'MEDIUM') dbRiskTolerance = 'MODERATE';

    // 2. Execute Transaction
    const executeWork = async (tx: TransactionClient): Promise<CompleteOnboardingResponse> => {
      // Upsert Financial Profile
      const profileRes = await this.profileRepo.upsert(
        userId,
        {
          userId,
          monthlyIncome,
          riskTolerance: dbRiskTolerance,
          currentSavings: 0,
          currentEmergencyFund: 0,
          emergencyFundTarget: monthlyIncome * 3,
        },
        tx
      );

      if (!profileRes.success) {
        throw new DatabaseOperationError('Failed to create or update financial profile', profileRes.error);
      }

      // Generate baseline allocation
      const allocRes = await this.allocationService.generateAllocation({ userId }, tx);

      return {
        userId,
        profileId: profileRes.data.id,
        allocationId: allocRes.allocation.id,
        monthlyIncome,
        allocation: {
          needs: allocRes.allocation.needs,
          wants: allocRes.allocation.wants,
          savings: allocRes.allocation.savings,
        },
      };
    };

    let result: CompleteOnboardingResponse;
    if (existingTx) {
      result = await executeWork(existingTx);
    } else {
      result = await this.prismaClient.$transaction(async (tx) => {
        return await executeWork(tx);
      });
    }

    // 3. Publish Event
    if (this.eventPublisher) {
      await this.eventPublisher.publish(new UserOnboardingCompletedEvent(userId, monthlyIncome));
    }

    return result;
  }
}
