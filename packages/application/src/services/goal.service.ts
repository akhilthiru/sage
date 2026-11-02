import {
  type IGoalRepository,
  type IFinancialProfileRepository,
  type IExpenseRepository,
  type TransactionClient,
  type Goal,
  type GoalType as DbGoalType,
  type Priority as DbPriority,
  type GoalStatus as DbGoalStatus,
  prisma,
} from '@sage/database';
import {
  projectGoalTimeline,
  type Priority,
} from '@sage/financial-engine';
import {
  type GoalDTO,
  type CreateGoalRequest,
  type CreateGoalResponse,
  type UpdateGoalRequest,
  type UpdateGoalResponse,
  type DeleteGoalRequest,
  type DeleteGoalResponse,
  type ListGoalsRequest,
  type ListGoalsResponse,
  type GoalFeasibility,
  type GoalPriority,
  type GoalStatus,
  CreateGoalSchema,
  UpdateGoalSchema,
  DeleteGoalSchema,
  ListGoalsSchema,
  validateWithZod,
} from '../dtos';
import {
  NotFoundError,
  ValidationError,
  AuthorizationError,
  BusinessRuleError,
  DatabaseOperationError,
} from '../errors';
import {
  GoalCreatedEvent,
  GoalUpdatedEvent,
  GoalCompletedEvent,
  GoalDeletedEvent,
  type IEventPublisher,
} from '../events';
import { AllocationService } from './allocation.service';

export function mapGoalToDTO(goal: Goal, feasibility: GoalFeasibility = 'FEASIBLE'): GoalDTO {
  const target = Number(goal.targetAmount);
  const current = Number(goal.currentAmount);
  const progress = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

  return {
    id: goal.id,
    userId: goal.userId,
    name: goal.name,
    description: goal.description,
    targetAmount: target,
    currentAmount: current,
    targetDate: goal.targetDate,
    priority: goal.priority as GoalPriority,
    category: goal.type,
    status: (goal.status === 'CANCELLED' ? 'ABANDONED' : goal.status) as GoalStatus,
    monthlySavingsRequired: Number(goal.monthlyContribution),
    progressPercentage: progress,
    feasibility,
    createdAt: goal.createdAt,
    updatedAt: goal.updatedAt,
  };
}

export class GoalService {
  constructor(
    private readonly goalRepo: IGoalRepository,
    private readonly profileRepo: IFinancialProfileRepository,
    private readonly expenseRepo: IExpenseRepository,
    private readonly allocationService: AllocationService,
    private readonly eventPublisher?: IEventPublisher,
    private readonly prismaClient: typeof prisma = prisma
  ) {}

  async createGoal(
    request: CreateGoalRequest,
    existingTx?: TransactionClient
  ): Promise<CreateGoalResponse> {
    const validated = validateWithZod(CreateGoalSchema, request);
    const { userId, name, targetAmount, currentAmount = 0, targetDate, priority, category, description } = validated;

    // 1. Authorization & Profile Verification
    const profileRes = await this.profileRepo.findByUserId(userId, existingTx);
    if (!profileRes.success || !profileRes.data) {
      throw new NotFoundError(`Financial profile not found for user ${userId}`, 'FinancialProfile', userId);
    }
    const profile = profileRes.data;

    // 2. Business Rules Validation
    const activeGoalsRes = await this.goalRepo.findActiveByUserId(userId, existingTx);
    if (!activeGoalsRes.success) {
      throw new DatabaseOperationError('Failed to fetch user goals', activeGoalsRes.error);
    }

    const activeGoals = activeGoalsRes.data;
    if (activeGoals.length >= 10) {
      throw new BusinessRuleError('Maximum 10 active goals allowed', 'MAX_ACTIVE_GOALS');
    }

    const duplicate = activeGoals.find((g) => g.name.toLowerCase() === name.toLowerCase());
    if (duplicate) {
      throw new ValidationError('A goal with this name already exists', {
        name: 'A goal with this name already exists',
      });
    }

    // 3. Engine Calculates - Feasibility & Monthly Savings Required
    const expensesRes = await this.expenseRepo.calculateTotalMonthly(userId, existingTx);
    const monthlyExpenses = expensesRes.success ? expensesRes.data : 0;

    const timelineResult = projectGoalTimeline({
      goal: {
        id: 'new_goal',
        targetAmount,
        currentAmount,
        targetDate: targetDate.toISOString(),
        priority: (priority ?? 'MEDIUM') as Priority,
      },
      monthlyIncome: Number(profile.monthlyIncome),
      monthlyExpenses,
      otherGoalCommitments: 0,
      emergencyFundStatus:
        Number(profile.currentEmergencyFund) >= Number(profile.emergencyFundTarget ?? 0)
          ? 'MET'
          : 'NOT_MET',
    });

    let monthlySavingsRequired = 0;
    let feasibilityScore = 100;
    let isFeasible = true;
    let feasibilityGrade: GoalFeasibility = 'FEASIBLE';

    if (timelineResult.success) {
      monthlySavingsRequired = timelineResult.data.requiredMonthly;
      feasibilityScore = timelineResult.data.feasibilityScore;
      isFeasible = timelineResult.data.isFeasible;
      if (!isFeasible) {
        feasibilityGrade = 'INFEASIBLE';
      } else if (feasibilityScore < 75) {
        feasibilityGrade = 'STRETCH';
      }
    }

    // Map category to DB GoalType
    let dbGoalType: DbGoalType = 'CUSTOM';
    const validTypes: DbGoalType[] = [
      'EMERGENCY_FUND',
      'HOUSE',
      'CAR',
      'VACATION',
      'WEDDING',
      'EDUCATION',
      'RETIREMENT',
      'CUSTOM',
    ];
    if (validTypes.includes(category as DbGoalType)) {
      dbGoalType = category as DbGoalType;
    }

    // 4. Persistence within Transaction
    const executeWork = async (tx: TransactionClient): Promise<CreateGoalResponse> => {
      const createRes = await this.goalRepo.create(
        {
          userId,
          name,
          description: description ?? null,
          type: dbGoalType,
          targetAmount,
          currentAmount,
          monthlyContribution: monthlySavingsRequired,
          targetDate,
          priority: priority as DbPriority,
          status: 'ACTIVE',
          isFeasible,
          feasibilityScore,
        },
        tx
      );

      if (!createRes.success) {
        throw new DatabaseOperationError('Failed to create goal', createRes.error);
      }

      // Recalculate allocation
      const allocRes = await this.allocationService.generateAllocation({ userId }, tx);

      return {
        goal: mapGoalToDTO(createRes.data, feasibilityGrade),
        allocation: allocRes.allocation,
      };
    };

    let result: CreateGoalResponse;
    if (existingTx) {
      result = await executeWork(existingTx);
    } else {
      result = await this.prismaClient.$transaction(async (tx) => {
        return await executeWork(tx);
      });
    }

    // 5. Publish Event
    if (this.eventPublisher) {
      await this.eventPublisher.publish(
        new GoalCreatedEvent(result.goal.id, userId, targetAmount, targetDate, priority ?? 'MEDIUM')
      );
    }

    return result;
  }

  async updateGoal(
    request: UpdateGoalRequest,
    existingTx?: TransactionClient
  ): Promise<UpdateGoalResponse> {
    const validated = validateWithZod(UpdateGoalSchema, request);
    const { userId, goalId, name, description, targetAmount, currentAmount, targetDate, priority, status } = validated;

    // Check goal exists and verify ownership
    const goalRes = await this.goalRepo.findById(goalId, existingTx);
    if (!goalRes.success || !goalRes.data) {
      throw new NotFoundError(`Goal with ID ${goalId} not found`, 'Goal', goalId);
    }
    const existingGoal = goalRes.data;
    if (existingGoal.userId !== userId) {
      throw new AuthorizationError('You do not own this goal');
    }

    // Check duplicate name if name changed
    if (name && name.toLowerCase() !== existingGoal.name.toLowerCase()) {
      const activeGoals = await this.goalRepo.findActiveByUserId(userId, existingTx);
      if (activeGoals.success) {
        const dup = activeGoals.data.find(
          (g) => g.id !== goalId && g.name.toLowerCase() === name.toLowerCase()
        );
        if (dup) {
          throw new ValidationError('A goal with this name already exists', {
            name: 'A goal with this name already exists',
          });
        }
      }
    }

    let dbStatus: DbGoalStatus | undefined = undefined;
    if (status) {
      dbStatus = status === 'ABANDONED' ? 'CANCELLED' : (status as DbGoalStatus);
    }

    const executeWork = async (tx: TransactionClient): Promise<UpdateGoalResponse> => {
      const updateRes = await this.goalRepo.update(
        goalId,
        {
          name,
          description: description !== undefined ? description : undefined,
          targetAmount,
          currentAmount,
          targetDate,
          priority: priority as DbPriority | undefined,
          status: dbStatus,
        },
        tx
      );

      if (!updateRes.success) {
        throw new DatabaseOperationError('Failed to update goal', updateRes.error);
      }

      const allocRes = await this.allocationService.generateAllocation({ userId }, tx);

      return {
        goal: mapGoalToDTO(updateRes.data),
        allocation: allocRes.allocation,
      };
    };

    let result: UpdateGoalResponse;
    if (existingTx) {
      result = await executeWork(existingTx);
    } else {
      result = await this.prismaClient.$transaction(async (tx) => {
        return await executeWork(tx);
      });
    }

    // Publish Events
    if (this.eventPublisher) {
      await this.eventPublisher.publish(
        new GoalUpdatedEvent(goalId, userId, { name, targetAmount, currentAmount, status })
      );
      if (status === 'COMPLETED' && existingGoal.status !== 'COMPLETED') {
        await this.eventPublisher.publish(new GoalCompletedEvent(goalId, userId));
      }
    }

    return result;
  }

  async deleteGoal(
    request: DeleteGoalRequest,
    existingTx?: TransactionClient
  ): Promise<DeleteGoalResponse> {
    const validated = validateWithZod(DeleteGoalSchema, request);
    const { userId, goalId } = validated;

    const goalRes = await this.goalRepo.findById(goalId, existingTx);
    if (!goalRes.success || !goalRes.data) {
      throw new NotFoundError(`Goal with ID ${goalId} not found`, 'Goal', goalId);
    }
    if (goalRes.data.userId !== userId) {
      throw new AuthorizationError('You do not own this goal');
    }

    const executeWork = async (tx: TransactionClient): Promise<DeleteGoalResponse> => {
      const deleteRes = await this.goalRepo.softDelete(goalId, tx);
      if (!deleteRes.success) {
        throw new DatabaseOperationError('Failed to delete goal', deleteRes.error);
      }

      const allocRes = await this.allocationService.generateAllocation({ userId }, tx);

      return {
        goalId,
        deletedAt: new Date(),
        allocation: allocRes.allocation,
      };
    };

    let result: DeleteGoalResponse;
    if (existingTx) {
      result = await executeWork(existingTx);
    } else {
      result = await this.prismaClient.$transaction(async (tx) => {
        return await executeWork(tx);
      });
    }

    if (this.eventPublisher) {
      await this.eventPublisher.publish(new GoalDeletedEvent(goalId, userId));
    }

    return result;
  }

  async getGoal(userId: string, goalId: string, tx?: TransactionClient): Promise<GoalDTO> {
    const goalRes = await this.goalRepo.findById(goalId, tx);
    if (!goalRes.success || !goalRes.data) {
      throw new NotFoundError(`Goal with ID ${goalId} not found`, 'Goal', goalId);
    }
    if (goalRes.data.userId !== userId) {
      throw new AuthorizationError('You do not own this goal');
    }
    return mapGoalToDTO(goalRes.data);
  }

  async listGoals(request: ListGoalsRequest, tx?: TransactionClient): Promise<ListGoalsResponse> {
    const validated = validateWithZod(ListGoalsSchema, request);
    const { userId, status, priority } = validated;

    let dbStatus: DbGoalStatus | undefined = undefined;
    if (status) {
      dbStatus = status === 'ABANDONED' ? 'CANCELLED' : (status as DbGoalStatus);
    }

    const goalsRes = await this.goalRepo.findByUserId(userId, tx);
    if (!goalsRes.success) {
      throw new DatabaseOperationError('Failed to list goals', goalsRes.error);
    }

    let goals = goalsRes.data;
    if (dbStatus) {
      goals = goals.filter((g) => g.status === dbStatus);
    }
    if (priority) {
      goals = goals.filter((g) => g.priority === priority);
    }

    const dtos = goals.map((g) => mapGoalToDTO(g));

    let totalTarget = 0;
    let totalCurrent = 0;
    let activeCount = 0;
    let completedCount = 0;

    for (const g of dtos) {
      totalTarget += g.targetAmount;
      totalCurrent += g.currentAmount;
      if (g.status === 'ACTIVE') activeCount++;
      if (g.status === 'COMPLETED') completedCount++;
    }

    return {
      goals: dtos,
      summary: {
        totalGoals: dtos.length,
        activeGoals: activeCount,
        completedGoals: completedCount,
        totalTargetAmount: totalTarget,
        totalCurrentAmount: totalCurrent,
      },
    };
  }
}
