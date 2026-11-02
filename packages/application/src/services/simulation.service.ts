import {
  type ISimulationRepository,
  type IFinancialProfileRepository,
  type IExpenseRepository,
  type IDebtRepository,
  type IGoalRepository,
  type IAllocationRepository,
  type TransactionClient,
} from '@sage/database';
import {
  simulatePurchase as engineSimulatePurchase,
  simulateLoan as engineSimulateLoan,
  projectGoalTimeline as engineProjectGoalTimeline,
  type Priority,
  type GoalStatus as EngineGoalStatus,
} from '@sage/financial-engine';
import {
  type SimulatePurchaseRequest,
  type SimulatePurchaseResponse,
  type SimulateLoanRequest,
  type SimulateLoanResponse,
  type ProjectGoalTimelineRequest,
  type ProjectGoalTimelineResponse,
  SimulatePurchaseSchema,
  SimulateLoanSchema,
  ProjectGoalTimelineSchema,
  validateWithZod,
} from '../dtos';
import {
  NotFoundError,
  AuthorizationError,
  BusinessRuleError,
  DatabaseOperationError,
} from '../errors';
import { SimulationCompletedEvent, type IEventPublisher } from '../events';
import { mapAllocationToDTO } from './allocation.service';

export class SimulationService {
  constructor(
    private readonly simulationRepo: ISimulationRepository,
    private readonly profileRepo: IFinancialProfileRepository,
    private readonly expenseRepo: IExpenseRepository,
    private readonly debtRepo: IDebtRepository,
    private readonly goalRepo: IGoalRepository,
    private readonly allocationRepo?: IAllocationRepository,
    private readonly eventPublisher?: IEventPublisher
  ) {}

  async simulatePurchase(
    request: SimulatePurchaseRequest,
    tx?: TransactionClient
  ): Promise<SimulatePurchaseResponse> {
    const validated = validateWithZod(SimulatePurchaseSchema, request);
    const { userId, purchaseAmount, purchaseName } = validated;

    const [profileRes, expensesRes, debtsRes, goalsRes] = await Promise.all([
      this.profileRepo.findByUserId(userId, tx),
      this.expenseRepo.calculateTotalMonthly(userId, tx),
      this.debtRepo.findActiveByUserId(userId, tx),
      this.goalRepo.findActiveByUserId(userId, tx),
    ]);

    if (!profileRes.success || !profileRes.data) {
      throw new NotFoundError(`Financial profile not found for user ${userId}`, 'FinancialProfile', userId);
    }
    const profile = profileRes.data;
    const monthlyExpenses = expensesRes.success ? expensesRes.data : 0;
    const debts = debtsRes.success ? debtsRes.data : [];
    const goals = goalsRes.success ? goalsRes.data : [];

    const engineInput = {
      purchaseAmount,
      itemName: purchaseName,
      currentSavings: Number(profile.currentSavings),
      emergencyFundTarget: Number(profile.emergencyFundTarget ?? Number(profile.monthlyIncome) * 3),
      currentEmergencyFund: Number(profile.currentEmergencyFund),
      monthlyIncome: Number(profile.monthlyIncome),
      monthlyExpenses,
      activeGoals: goals.map((g) => ({
        id: g.id,
        targetAmount: Number(g.targetAmount),
        currentAmount: Number(g.currentAmount),
        targetDate: g.targetDate.toISOString(),
        priority: g.priority as Priority,
        status: g.status as EngineGoalStatus,
      })),
      existingDebts: debts.map((d) => ({
        minimumPayment: Number(d.minimumPayment || d.monthlyPayment),
        status: d.status as 'ACTIVE' | 'PAID_OFF' | 'DEFAULTED',
      })),
    };

    // Engine Calculates
    const res = engineSimulatePurchase(engineInput);
    if (!res.success) {
      throw new BusinessRuleError(res.error.message, res.error.code);
    }

    const { canAfford, scenarios, recommended } = res.data;

    // Persist simulation run
    const simRes = await this.simulationRepo.create(
      {
        userId,
        type: 'PURCHASE_AFFORDABILITY',
        parameters: engineInput,
        results: res.data as unknown as Record<string, unknown>,
        title: `Purchase Simulation: ${purchaseName}`,
      },
      tx
    );

    if (!simRes.success) {
      throw new DatabaseOperationError('Failed to record simulation', simRes.error);
    }

    if (this.eventPublisher) {
      await this.eventPublisher.publish(
        new SimulationCompletedEvent(simRes.data.id, userId, 'PURCHASE_AFFORDABILITY')
      );
    }

    const buyScenario = scenarios.find((s) => s.type === 'BUY_FROM_SAVINGS');
    const loanScenario = scenarios.find((s) => s.type === 'LOAN_EMI');
    const saveScenario = scenarios.find((s) => s.type === 'SAVE_FIRST');

    const alternatives: string[] = [];
    if (loanScenario?.isViable) {
      alternatives.push(`Finance via loan with monthly EMI of ₹${loanScenario.emi ?? 0}`);
    }
    if (saveScenario?.isViable) {
      alternatives.push(`Save for ${saveScenario.timeline} months to purchase outright`);
    }

    return {
      simulationId: simRes.data.id,
      canAfford,
      impact: {
        savingsReduction: buyScenario?.isViable ? purchaseAmount : 0,
        monthsToRecover: buyScenario?.timeline ?? 0,
        goalDelays: (buyScenario?.goalImpacts ?? []).map((gi) => ({
          goalId: gi.goalId,
          goalName: gi.goalName,
          delayMonths: gi.delayMonths,
        })),
      },
      alternatives,
      recommendation: `Recommended strategy: ${recommended}.`,
    };
  }

  async simulateLoan(
    request: SimulateLoanRequest,
    tx?: TransactionClient
  ): Promise<SimulateLoanResponse> {
    const validated = validateWithZod(SimulateLoanSchema, request);
    const { userId, loanAmount, interestRate, termMonths, purpose } = validated;

    const [profileRes, expensesRes, debtsRes, allocRes] = await Promise.all([
      this.profileRepo.findByUserId(userId, tx),
      this.expenseRepo.calculateTotalMonthly(userId, tx),
      this.debtRepo.findActiveByUserId(userId, tx),
      this.allocationRepo ? this.allocationRepo.findByUserId(userId, tx) : Promise.resolve({ success: false as const }),
    ]);

    if (!profileRes.success || !profileRes.data) {
      throw new NotFoundError(`Financial profile not found for user ${userId}`, 'FinancialProfile', userId);
    }
    const profile = profileRes.data;
    const monthlyExpenses = expensesRes.success ? expensesRes.data : 0;
    const debts = debtsRes.success ? debtsRes.data : [];

    const engineInput = {
      principal: loanAmount,
      annualInterestRate: interestRate,
      tenureMonths: termMonths,
      monthlyIncome: Number(profile.monthlyIncome),
      monthlyExpenses,
      existingDebts: debts.map((d) => ({
        monthlyPayment: Number(d.monthlyPayment),
        status: d.status as 'ACTIVE' | 'PAID_OFF' | 'DEFAULTED',
      })),
    };

    // Engine Calculates
    const res = engineSimulateLoan(engineInput);
    if (!res.success) {
      throw new BusinessRuleError(res.error.message, res.error.code);
    }

    const { emi, totalInterest, totalPayable, affordability, debtToIncomeRatio } = res.data;

    const simRes = await this.simulationRepo.create(
      {
        userId,
        type: 'LOAN_FEASIBILITY',
        parameters: { ...engineInput, purpose },
        results: res.data as unknown as Record<string, unknown>,
        title: `Loan Simulation: ${purpose} (₹${loanAmount})`,
      },
      tx
    );

    if (!simRes.success) {
      throw new DatabaseOperationError('Failed to record loan simulation', simRes.error);
    }

    if (this.eventPublisher) {
      await this.eventPublisher.publish(
        new SimulationCompletedEvent(simRes.data.id, userId, 'LOAN_FEASIBILITY')
      );
    }

    let mappedAffordability: 'AFFORDABLE' | 'TIGHT' | 'UNAFFORDABLE' = 'AFFORDABLE';
    if (affordability === 'MANAGEABLE' || affordability === 'RISKY') mappedAffordability = 'TIGHT';
    if (affordability === 'UNAFFORDABLE') mappedAffordability = 'UNAFFORDABLE';

    // Mock/project new allocation with the new EMI added
    const latestAlloc = (allocRes as any).success && (allocRes as any).data?.[0]
      ? mapAllocationToDTO((allocRes as any).data[0], Number(profile.monthlyIncome))
      : {
          id: 'proj',
          userId,
          monthlyIncome: Number(profile.monthlyIncome),
          needs: monthlyExpenses + emi,
          wants: 0,
          savings: 0,
          breakdown: {
            fixedExpenses: monthlyExpenses,
            variableExpenses: 0,
            goalContributions: 0,
            debtPayments: emi,
            discretionary: 0,
            emergencyFund: 0,
          },
          createdAt: new Date(),
        };

    return {
      simulationId: simRes.data.id,
      monthlyPayment: emi,
      totalInterest,
      totalCost: totalPayable,
      affordability: mappedAffordability,
      impact: {
        newAllocation: latestAlloc,
        debtToIncomeRatio,
        goalDelays: [],
      },
      recommendation:
        mappedAffordability === 'AFFORDABLE'
          ? `Loan is within comfortable limits (DTI: ${debtToIncomeRatio}%).`
          : `Loan may strain monthly cashflow (DTI: ${debtToIncomeRatio}%).`,
    };
  }

  async projectGoalTimeline(
    request: ProjectGoalTimelineRequest,
    tx?: TransactionClient
  ): Promise<ProjectGoalTimelineResponse> {
    const validated = validateWithZod(ProjectGoalTimelineSchema, request);
    const { userId, goalId } = validated;

    const [goalRes, profileRes, expensesRes] = await Promise.all([
      this.goalRepo.findById(goalId, tx),
      this.profileRepo.findByUserId(userId, tx),
      this.expenseRepo.calculateTotalMonthly(userId, tx),
    ]);

    if (!goalRes.success || !goalRes.data) {
      throw new NotFoundError(`Goal with ID ${goalId} not found`, 'Goal', goalId);
    }
    const goal = goalRes.data;
    if (goal.userId !== userId) {
      throw new AuthorizationError('You do not own this goal');
    }
    if (!profileRes.success || !profileRes.data) {
      throw new NotFoundError(`Financial profile not found for user ${userId}`, 'FinancialProfile', userId);
    }
    const profile = profileRes.data;
    const monthlyExpenses = expensesRes.success ? expensesRes.data : 0;

    const res = engineProjectGoalTimeline({
      goal: {
        id: goal.id,
        targetAmount: Number(goal.targetAmount),
        currentAmount: Number(goal.currentAmount),
        targetDate: goal.targetDate.toISOString(),
        priority: goal.priority as Priority,
      },
      monthlyIncome: Number(profile.monthlyIncome),
      monthlyExpenses,
      otherGoalCommitments: 0,
      emergencyFundStatus:
        Number(profile.currentEmergencyFund) >= Number(profile.emergencyFundTarget ?? 0)
          ? 'MET'
          : 'NOT_MET',
    });

    if (!res.success) {
      throw new BusinessRuleError(res.error.message, res.error.code);
    }

    const { projectedCompletionDate, monthsRemaining, requiredMonthly, confidence } = res.data;

    const simRes = await this.simulationRepo.create(
      {
        userId,
        type: 'GOAL_TIMELINE',
        parameters: { goalId },
        results: res.data as unknown as Record<string, unknown>,
        title: `Goal Timeline Projection: ${goal.name}`,
      },
      tx
    );

    if (!simRes.success) {
      throw new DatabaseOperationError('Failed to record goal projection', simRes.error);
    }

    if (this.eventPublisher) {
      await this.eventPublisher.publish(
        new SimulationCompletedEvent(simRes.data.id, userId, 'GOAL_TIMELINE')
      );
    }

    const completionDate = new Date(projectedCompletionDate);

    let confLevel: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
    if (confidence.level === 'high' || confidence.level === 'very_high') confLevel = 'HIGH';
    if (confidence.level === 'low' || confidence.level === 'very_low') confLevel = 'LOW';

    const targetAmount = Number(goal.targetAmount);
    const milestones = Array.from({ length: Math.min(monthsRemaining, 12) }, (_, i) => ({
      month: i + 1,
      amount: (i + 1) * requiredMonthly,
      percentage: targetAmount > 0 ? Math.min(100, Math.round((((i + 1) * requiredMonthly) / targetAmount) * 100)) : 0,
    }));

    return {
      simulationId: simRes.data.id,
      goalId,
      projectedCompletionDate: completionDate,
      monthsToComplete: monthsRemaining,
      confidenceLevel: confLevel,
      milestones,
    };
  }
}
