import { describe, it, expect } from 'vitest';
import {
  PaginationRequestSchema,
  DateRangeSchema,
  validateWithZod,
  CompleteOnboardingSchema,
  UpdateIncomeSchema,
  UpdateRiskToleranceSchema,
  CreateGoalSchema,
  UpdateGoalSchema,
  DeleteGoalSchema,
  ListGoalsSchema,
  RecordExpenseSchema,
  UpdateExpenseSchema,
  DeleteExpenseSchema,
  ListExpensesSchema,
  RecordDebtSchema,
  RecordDebtPaymentSchema,
  ListDebtsSchema,
  GenerateAllocationSchema,
  SimulatePurchaseSchema,
  SimulateLoanSchema,
  ProjectGoalTimelineSchema,
  GenerateDashboardSchema,
  CalculateFinancialHealthSchema,
} from '../../src/dtos';
import { ValidationError } from '../../src/errors';

describe('DTO Validation Schemas', () => {
  describe('common.dto', () => {
    it('should validate pagination with defaults', () => {
      const parsed = PaginationRequestSchema.parse({});
      expect(parsed.page).toBe(1);
      expect(parsed.limit).toBe(20);
    });

    it('should validate valid date range', () => {
      const start = new Date('2026-01-01');
      const end = new Date('2026-01-10');
      const result = DateRangeSchema.parse({ startDate: start, endDate: end });
      expect(result.startDate).toEqual(start);
      expect(result.endDate).toEqual(end);
    });

    it('should fail date range when endDate is before startDate', () => {
      const start = new Date('2026-01-10');
      const end = new Date('2026-01-01');
      expect(() => DateRangeSchema.parse({ startDate: start, endDate: end })).toThrow();
    });

    it('should throw domain ValidationError when validateWithZod fails', () => {
      expect(() => validateWithZod(PaginationRequestSchema, { page: -1 })).toThrowError(ValidationError);
      try {
        validateWithZod(PaginationRequestSchema, { page: -1 });
      } catch (err) {
        expect(err).toBeInstanceOf(ValidationError);
        const valErr = err as ValidationError;
        expect(valErr.validationErrors).toBeDefined();
        expect(valErr.validationErrors!['page']).toBeDefined();
      }
    });

    it('should return parsed data when validateWithZod succeeds', () => {
      const data = validateWithZod(PaginationRequestSchema, { page: 2, limit: 50 });
      expect(data.page).toBe(2);
      expect(data.limit).toBe(50);
    });
  });

  describe('onboarding.dto', () => {
    it('should validate complete onboarding schema', () => {
      const valid = {
        userId: 'user-1',
        monthlyIncome: 75000,
      };
      const parsed = CompleteOnboardingSchema.parse(valid);
      expect(parsed.userId).toBe('user-1');
      expect(parsed.monthlyIncome).toBe(75000);
      expect(parsed.currency).toBe('INR');
      expect(parsed.riskTolerance).toBe('MEDIUM');
      expect(parsed.hasDebts).toBe(false);
      expect(parsed.hasGoals).toBe(false);
    });

    it('should reject non-positive income', () => {
      expect(() => CompleteOnboardingSchema.parse({ userId: 'u1', monthlyIncome: 0 })).toThrow();
      expect(() => CompleteOnboardingSchema.parse({ userId: '', monthlyIncome: 1000 })).toThrow();
    });
  });

  describe('profile.dto', () => {
    it('should validate update income schema', () => {
      const parsed = UpdateIncomeSchema.parse({ userId: 'u1', monthlyIncome: 90000 });
      expect(parsed.monthlyIncome).toBe(90000);
    });

    it('should validate update risk tolerance schema', () => {
      const parsed = UpdateRiskToleranceSchema.parse({ userId: 'u1', riskTolerance: 'HIGH' });
      expect(parsed.riskTolerance).toBe('HIGH');
    });
  });

  describe('goal.dto', () => {
    it('should validate create goal with valid future date', () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
      const parsed = CreateGoalSchema.parse({
        userId: 'u1',
        name: 'Emergency Fund',
        targetAmount: 100000,
        targetDate: futureDate,
      });
      expect(parsed.name).toBe('Emergency Fund');
      expect(parsed.priority).toBe('MEDIUM');
      expect(parsed.category).toBe('GENERAL');
    });

    it('should reject past target date for goal', () => {
      const pastDate = new Date(Date.now() - 10000);
      expect(() =>
        CreateGoalSchema.parse({
          userId: 'u1',
          name: 'Past Goal',
          targetAmount: 50000,
          targetDate: pastDate,
        })
      ).toThrow();
    });

    it('should validate update and delete goal schemas', () => {
      expect(UpdateGoalSchema.parse({ userId: 'u1', goalId: 'g1', name: 'New Name' }).name).toBe('New Name');
      expect(DeleteGoalSchema.parse({ userId: 'u1', goalId: 'g1' }).goalId).toBe('g1');
      expect(ListGoalsSchema.parse({ userId: 'u1', status: 'ACTIVE' }).status).toBe('ACTIVE');
    });
  });

  describe('expense.dto', () => {
    it('should validate record expense schema', () => {
      const parsed = RecordExpenseSchema.parse({
        userId: 'u1',
        amount: 2500,
        category: 'Food',
      });
      expect(parsed.amount).toBe(2500);
      expect(parsed.category).toBe('Food');
      expect(parsed.isRecurring).toBe(false);
    });

    it('should validate update, delete, and list expenses', () => {
      expect(UpdateExpenseSchema.parse({ userId: 'u1', expenseId: 'e1', amount: 3000 }).amount).toBe(3000);
      expect(DeleteExpenseSchema.parse({ userId: 'u1', expenseId: 'e1' }).expenseId).toBe('e1');
      expect(ListExpensesSchema.parse({ userId: 'u1' }).userId).toBe('u1');
    });
  });

  describe('debt.dto', () => {
    it('should validate record debt schema', () => {
      const parsed = RecordDebtSchema.parse({
        userId: 'u1',
        name: 'Car Loan',
        principal: 500000,
        interestRate: 9.5,
        termMonths: 36,
      });
      expect(parsed.principal).toBe(500000);
      expect(parsed.interestRate).toBe(9.5);
    });

    it('should reject invalid interest rate', () => {
      expect(() =>
        RecordDebtSchema.parse({
          userId: 'u1',
          name: 'Invalid Loan',
          principal: 10000,
          interestRate: -5,
          termMonths: 12,
        })
      ).toThrow();
      expect(() =>
        RecordDebtSchema.parse({
          userId: 'u1',
          name: 'Invalid Loan',
          principal: 10000,
          interestRate: 150,
          termMonths: 12,
        })
      ).toThrow();
    });

    it('should validate debt payment and list debts schema', () => {
      expect(
        RecordDebtPaymentSchema.parse({ userId: 'u1', debtId: 'd1', amount: 15000 }).amount
      ).toBe(15000);
      expect(ListDebtsSchema.parse({ userId: 'u1' }).userId).toBe('u1');
    });
  });

  describe('allocation, simulation, dashboard schemas', () => {
    it('should validate allocation request schema', () => {
      expect(GenerateAllocationSchema.parse({ userId: 'u1' }).userId).toBe('u1');
    });

    it('should validate simulate purchase schema', () => {
      const parsed = SimulatePurchaseSchema.parse({
        userId: 'u1',
        purchaseAmount: 85000,
        purchaseName: 'MacBook Pro',
      });
      expect(parsed.purchaseAmount).toBe(85000);
    });

    it('should validate simulate loan schema', () => {
      const parsed = SimulateLoanSchema.parse({
        userId: 'u1',
        loanAmount: 1000000,
        interestRate: 8.5,
        termMonths: 60,
      });
      expect(parsed.loanAmount).toBe(1000000);
      expect(parsed.purpose).toBe('PERSONAL');
    });

    it('should validate project goal timeline schema', () => {
      const parsed = ProjectGoalTimelineSchema.parse({
        userId: 'u1',
        goalId: 'g1',
        monthlyContribution: 5000,
      });
      expect(parsed.monthlyContribution).toBe(5000);
    });

    it('should validate dashboard and health schemas', () => {
      expect(GenerateDashboardSchema.parse({ userId: 'u1' }).userId).toBe('u1');
      expect(CalculateFinancialHealthSchema.parse({ userId: 'u1' }).userId).toBe('u1');
    });
  });
});
