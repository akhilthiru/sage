import {
  type IFinancialProfileRepository,
  type IGoalRepository,
  type IExpenseRepository,
  type IDebtRepository,
  type IAllocationRepository,
  type TransactionClient,
} from '@sage/database';
import {
  calculateFinancialHealth,
} from '@sage/financial-engine';
import {
  type FinancialHealthDTO,
  type GenerateDashboardRequest,
  type GenerateDashboardResponse,
  type CalculateFinancialHealthRequest,
  type CalculateFinancialHealthResponse,
  type HealthStatus,
  GenerateDashboardSchema,
  CalculateFinancialHealthSchema,
  validateWithZod,
} from '../dtos';
import { NotFoundError, DatabaseOperationError, BusinessRuleError } from '../errors';
import { mapAllocationToDTO } from './allocation.service';
import { mapGoalToDTO } from './goal.service';
import { mapExpenseToDTO } from './expense.service';
import { mapDebtToDTO } from './debt.service';

export class DashboardService {
  constructor(
    private readonly profileRepo: IFinancialProfileRepository,
    private readonly goalRepo: IGoalRepository,
    private readonly expenseRepo: IExpenseRepository,
    private readonly debtRepo: IDebtRepository,
    private readonly allocationRepo: IAllocationRepository
  ) {}

  async getDashboard(
    request: GenerateDashboardRequest,
    tx?: TransactionClient
  ): Promise<GenerateDashboardResponse> {
    const validated = validateWithZod(GenerateDashboardSchema, request);
    const { userId } = validated;

    // 1. Fetch all aggregates
    const [profileRes, goalsRes, expensesRes, debtsRes, allocRes] = await Promise.all([
      this.profileRepo.findByUserId(userId, tx),
      this.goalRepo.findActiveByUserId(userId, tx),
      this.expenseRepo.findActiveByUserId(userId, tx),
      this.debtRepo.findActiveByUserId(userId, tx),
      this.allocationRepo.findByUserId(userId, tx),
    ]);

    if (!profileRes.success || !profileRes.data) {
      throw new NotFoundError(`Financial profile not found for user ${userId}`, 'FinancialProfile', userId);
    }
    const profile = profileRes.data;

    if (!goalsRes.success) throw new DatabaseOperationError('Failed to fetch goals', goalsRes.error);
    if (!expensesRes.success) throw new DatabaseOperationError('Failed to fetch expenses', expensesRes.error);
    if (!debtsRes.success) throw new DatabaseOperationError('Failed to fetch debts', debtsRes.error);

    const activeGoals = goalsRes.data;
    const activeExpenses = expensesRes.data;
    const activeDebts = debtsRes.data;

    // 2. Compute Expense & Debt Totals
    let totalMonthlyExpenses = 0;
    const byCategory: Record<string, number> = {};
    for (const exp of activeExpenses) {
      const amt = Number(exp.amount);
      totalMonthlyExpenses += amt;
      byCategory[exp.category] = (byCategory[exp.category] ?? 0) + amt;
    }

    let totalDebtBalance = 0;
    let totalDebtMonthly = 0;
    for (const d of activeDebts) {
      totalDebtBalance += Number(d.currentBalance);
      totalDebtMonthly += Number(d.monthlyPayment);
    }

    const goalsOnTrack = activeGoals.filter((g) => g.isFeasible).length;

    // 3. Engine Calculates Financial Health
    const healthEngineRes = calculateFinancialHealth({
      monthlyIncome: Number(profile.monthlyIncome),
      monthlyExpenses: totalMonthlyExpenses,
      currentSavings: Number(profile.currentSavings),
      emergencyFundTarget: Number(profile.emergencyFundTarget ?? Number(profile.monthlyIncome) * 3),
      currentEmergencyFund: Number(profile.currentEmergencyFund),
      totalDebtBalance,
      monthlyDebtPayments: totalDebtMonthly,
      activeGoalsCount: activeGoals.length,
      goalsOnTrack,
    });

    if (!healthEngineRes.success) {
      throw new BusinessRuleError(healthEngineRes.error.message, healthEngineRes.error.code);
    }

    const healthData = healthEngineRes.data;

    let mappedStatus: HealthStatus = 'GOOD';
    if (healthData.level === 'EXCELLENT') mappedStatus = 'EXCELLENT';
    else if (healthData.level === 'GOOD') mappedStatus = 'GOOD';
    else if (healthData.level === 'FAIR') mappedStatus = 'FAIR';
    else mappedStatus = 'POOR';

    const healthDTO: FinancialHealthDTO = {
      score: healthData.score,
      status: mappedStatus,
      grade: healthData.grade,
      factors: {
        incomeStability: 85,
        debtToIncome: healthData.metrics.debtToIncomeRatio,
        savingsRate: healthData.metrics.savingsRate,
        emergencyFund: healthData.metrics.emergencyFundMonths,
      },
      recommendations: healthData.recommendations.map((r) => r.recommendation),
    };

    // 4. Map Allocation
    let allocationDTO = allocRes.success && allocRes.data[0]
      ? mapAllocationToDTO(allocRes.data[0], Number(profile.monthlyIncome))
      : {
          id: 'unallocated',
          userId,
          monthlyIncome: Number(profile.monthlyIncome),
          needs: totalMonthlyExpenses + totalDebtMonthly,
          wants: 0,
          savings: 0,
          breakdown: {
            fixedExpenses: totalMonthlyExpenses,
            variableExpenses: 0,
            goalContributions: 0,
            debtPayments: totalDebtMonthly,
            discretionary: 0,
            emergencyFund: Number(profile.currentEmergencyFund),
          },
          createdAt: new Date(),
        };

    // 5. Goal Summaries
    let totalGoalProgress = 0;
    const goalSummaries = activeGoals.map((g) => {
      const dto = mapGoalToDTO(g);
      totalGoalProgress += dto.progressPercentage;
      return {
        id: dto.id,
        name: dto.name,
        targetAmount: dto.targetAmount,
        currentAmount: dto.currentAmount,
        progressPercentage: dto.progressPercentage,
        targetDate: dto.targetDate,
        priority: dto.priority,
        status: dto.status,
      };
    });

    const avgGoalProgress = activeGoals.length > 0 ? Math.round(totalGoalProgress / activeGoals.length) : 0;

    // 6. Expense Summaries
    const expenseSummaries = activeExpenses.slice(0, 5).map((e) => {
      const dto = mapExpenseToDTO(e);
      return {
        id: dto.id,
        amount: dto.amount,
        category: dto.category,
        date: dto.date,
        isRecurring: dto.isRecurring,
      };
    });

    // 7. Debt Summaries
    const debtSummaries = activeDebts.map((d) => {
      const dto = mapDebtToDTO(d);
      return {
        id: dto.id,
        name: dto.name,
        currentBalance: dto.currentBalance,
        monthlyPayment: dto.monthlyPayment,
        payoffDate: dto.payoffDate,
        status: dto.status,
      };
    });

    // 8. Compile Insights
    const insights: string[] = [...healthDTO.recommendations];
    if (healthData.metrics.debtToIncomeRatio > 40) {
      insights.push('Debt payments consume more than 40% of monthly income. Focus on high-interest repayment.');
    }
    if (healthData.metrics.emergencyFundMonths < 3) {
      insights.push('Emergency fund coverage is below 3 months. Prioritize building reserves.');
    }

    return {
      dashboard: {
        userId,
        financialHealth: healthDTO,
        allocation: allocationDTO,
        goals: {
          active: goalSummaries,
          summary: {
            totalGoals: activeGoals.length,
            onTrack: goalsOnTrack,
            atRisk: activeGoals.length - goalsOnTrack,
            totalProgress: avgGoalProgress,
          },
        },
        expenses: {
          recent: expenseSummaries,
          monthlyTotal: totalMonthlyExpenses,
          byCategory,
        },
        debts: {
          active: debtSummaries,
          totalBalance: totalDebtBalance,
          totalMonthlyPayment: totalDebtMonthly,
        },
        insights,
      },
    };
  }

  async calculateFinancialHealth(
    request: CalculateFinancialHealthRequest,
    tx?: TransactionClient
  ): Promise<CalculateFinancialHealthResponse> {
    const validated = validateWithZod(CalculateFinancialHealthSchema, request);
    const dashboardRes = await this.getDashboard({ userId: validated.userId }, tx);
    return {
      health: dashboardRes.dashboard.financialHealth,
    };
  }
}
