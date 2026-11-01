# Financial Engine Package: Technical Implementation Plan

**Package:** `packages/financial-engine`  
**Version:** 1.0.0  
**Date:** 2024-12-19  
**Status:** Ready for Implementation

---

## Executive Summary

This plan outlines the complete implementation of the Financial Engine package - a standalone TypeScript library containing all deterministic financial calculation logic for Sage. The package will be:

- **Pure TypeScript** - No React, no database, no external dependencies
- **Deterministic** - Same input always produces same output
- **100% Tested** - Complete unit test coverage
- **Zero Side Effects** - Pure functions only
- **Framework Agnostic** - Can be used anywhere

---

## Package Architecture

### Technology Stack

```
Language: TypeScript 5.3+
Runtime: Node.js 18+ (for development/testing)
Build: tsup (fast TypeScript bundler)
Testing: Vitest (fast unit testing)
Validation: Zod (runtime type validation)
```

### Package Structure

```
packages/financial-engine/
├── src/
│   ├── engines/
│   │   ├── allocation/
│   │   │   ├── index.ts
│   │   │   ├── calculate-allocation.ts
│   │   │   ├── types.ts
│   │   │   └── __tests__/
│   │   │       └── calculate-allocation.test.ts
│   │   ├── goal-projection/
│   │   │   ├── index.ts
│   │   │   ├── calculate-feasibility.ts
│   │   │   ├── calculate-confidence.ts
│   │   │   ├── generate-recommendations.ts
│   │   │   ├── types.ts
│   │   │   └── __tests__/
│   │   ├── purchase-simulation/
│   │   │   ├── index.ts
│   │   │   ├── simulate-purchase.ts
│   │   │   ├── simulate-buy-from-savings.ts
│   │   │   ├── simulate-loan.ts
│   │   │   ├── simulate-save-first.ts
│   │   │   ├── determine-recommendation.ts
│   │   │   ├── types.ts
│   │   │   └── __tests__/
│   │   ├── loan-simulation/
│   │   │   ├── index.ts
│   │   │   ├── calculate-emi.ts
│   │   │   ├── generate-amortization.ts
│   │   │   ├── assess-affordability.ts
│   │   │   ├── calculate-prepayment.ts
│   │   │   ├── types.ts
│   │   │   └── __tests__/
│   │   ├── cash-flow-projection/
│   │   │   ├── index.ts
│   │   │   ├── project-cash-flow.ts
│   │   │   ├── analyze-goal-impact.ts
│   │   │   ├── types.ts
│   │   │   └── __tests__/
│   │   └── confidence/
│   │       ├── index.ts
│   │       ├── calculate-confidence.ts
│   │       ├── types.ts
│   │       └── __tests__/
│   ├── utils/
│   │   ├── date-utils.ts
│   │   ├── frequency-utils.ts
│   │   ├── math-utils.ts
│   │   ├── validation-utils.ts
│   │   └── __tests__/
│   ├── types/
│   │   ├── common.ts
│   │   ├── goal.ts
│   │   ├── expense.ts
│   │   ├── debt.ts
│   │   ├── allocation.ts
│   │   └── index.ts
│   ├── validation/
│   │   ├── schemas/
│   │   │   ├── allocation.schema.ts
│   │   │   ├── goal.schema.ts
│   │   │   ├── expense.schema.ts
│   │   │   ├── debt.schema.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── constants/
│   │   ├── financial-constants.ts
│   │   ├── validation-constants.ts
│   │   └── index.ts
│   └── index.ts (main export)
├── tests/
│   ├── integration/
│   │   ├── allocation-flow.test.ts
│   │   ├── goal-lifecycle.test.ts
│   │   └── purchase-decision.test.ts
│   └── fixtures/
│       ├── test-data.ts
│       └── test-scenarios.ts
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
└── README.md
```

---

## Implementation Phases

### Phase 1: Foundation (Day 1-2)

**Deliverables:**
1. Package setup and configuration
2. Core types and interfaces
3. Utility functions
4. Validation schemas
5. Constants

**Tasks:**

#### 1.1 Package Initialization
```bash
mkdir -p packages/financial-engine
cd packages/financial-engine
npm init -y
```

#### 1.2 Dependencies
```json
{
  "dependencies": {
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "tsup": "^8.0.1",
    "typescript": "^5.3.3",
    "vitest": "^1.0.4"
  }
}
```

#### 1.3 TypeScript Configuration
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "skipLibCheck": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

#### 1.4 Build Configuration (tsup.config.ts)
```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false
});
```

#### 1.5 Test Configuration (vitest.config.ts)
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/__tests__/**'
      ],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100
      }
    }
  }
});
```

---

### Phase 2: Core Types & Utilities (Day 2-3)

#### 2.1 Common Types (`src/types/common.ts`)
```typescript
export type Frequency = 
  | 'DAILY' 
  | 'WEEKLY' 
  | 'BIWEEKLY' 
  | 'MONTHLY' 
  | 'QUARTERLY' 
  | 'ANNUAL' 
  | 'ONE_TIME';

export type Priority = 'HIGH' | 'MEDIUM' | 'LOW';

export type RiskTolerance = 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';

export type GoalStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

export type DebtStatus = 'ACTIVE' | 'PAID_OFF' | 'DEFAULTED';

export interface ConfidenceFactor {
  name: string;
  impact: number;
  reason: string;
  category: string;
}

export interface ConfidenceScore {
  value: number;
  level: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  factors: ConfidenceFactor[];
  summary: string;
}
```

#### 2.2 Goal Types (`src/types/goal.ts`)
```typescript
import type { Priority, GoalStatus } from './common';

export interface Goal {
  id: string;
  userId: string;
  name: string;
  description?: string;
  type: GoalType;
  targetAmount: number;
  currentAmount: number;
  targetDate: string; // ISO 8601
  priority: Priority;
  status: GoalStatus;
}

export type GoalType = 
  | 'EMERGENCY_FUND'
  | 'HOUSE'
  | 'CAR'
  | 'VACATION'
  | 'WEDDING'
  | 'EDUCATION'
  | 'RETIREMENT'
  | 'CUSTOM';
```

#### 2.3 Expense Types (`src/types/expense.ts`)
```typescript
import type { Frequency } from './common';

export interface Expense {
  id: string;
  userId: string;
  name: string;
  amount: number;
  category: ExpenseCategory;
  frequency: Frequency;
  isEssential: boolean;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
}

export type ExpenseCategory =
  | 'RENT'
  | 'UTILITIES'
  | 'GROCERIES'
  | 'TRANSPORTATION'
  | 'HEALTHCARE'
  | 'INSURANCE'
  | 'ENTERTAINMENT'
  | 'DINING'
  | 'SHOPPING'
  | 'EDUCATION'
  | 'OTHER';
```

#### 2.4 Debt Types (`src/types/debt.ts`)
```typescript
import type { DebtStatus } from './common';

export interface Debt {
  id: string;
  userId: string;
  name: string;
  type: DebtType;
  principalAmount: number;
  currentBalance: number;
  interestRate: number;
  monthlyPayment: number;
  minimumPayment: number;
  startDate: string;
  endDate?: string;
  status: DebtStatus;
}

export type DebtType =
  | 'HOME_LOAN'
  | 'CAR_LOAN'
  | 'PERSONAL_LOAN'
  | 'EDUCATION_LOAN'
  | 'CREDIT_CARD'
  | 'OTHER';
```

#### 2.5 Date Utilities (`src/utils/date-utils.ts`)
```typescript
/**
 * Calculate months between two dates
 */
export function monthsBetween(start: Date, end: Date): number {
  const yearDiff = end.getFullYear() - start.getFullYear();
  const monthDiff = end.getMonth() - start.getMonth();
  return yearDiff * 12 + monthDiff;
}

/**
 * Add months to a date
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Check if date is in future
 */
export function isFutureDate(date: Date): boolean {
  return date.getTime() > Date.now();
}
```

#### 2.6 Frequency Utilities (`src/utils/frequency-utils.ts`)
```typescript
import type { Frequency } from '../types/common';

/**
 * Normalize amount to monthly frequency
 */
export function normalizeToMonthly(amount: number, frequency: Frequency): number {
  const multipliers: Record<Frequency, number> = {
    DAILY: 30,
    WEEKLY: 4.33,
    BIWEEKLY: 2.17,
    MONTHLY: 1,
    QUARTERLY: 1 / 3,
    ANNUAL: 1 / 12,
    ONE_TIME: 0
  };

  return amount * multipliers[frequency];
}

/**
 * Convert monthly amount to specified frequency
 */
export function convertFromMonthly(monthlyAmount: number, frequency: Frequency): number {
  const divisors: Record<Frequency, number> = {
    DAILY: 30,
    WEEKLY: 4.33,
    BIWEEKLY: 2.17,
    MONTHLY: 1,
    QUARTERLY: 3,
    ANNUAL: 12,
    ONE_TIME: 1
  };

  return monthlyAmount / divisors[frequency];
}
```

#### 2.7 Math Utilities (`src/utils/math-utils.ts`)
```typescript
/**
 * Round to 2 decimal places
 */
export function roundToTwo(num: number): number {
  return Math.round(num * 100) / 100;
}

/**
 * Round to nearest value
 */
export function roundToNearest(num: number, nearest: number = 100): number {
  return Math.round(num / nearest) * nearest;
}

/**
 * Clamp value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Calculate percentage
 */
export function percentage(value: number, total: number): number {
  if (total === 0) return 0;
  return (value / total) * 100;
}
```

#### 2.8 Constants (`src/constants/financial-constants.ts`)
```typescript
/**
 * Financial calculation constants
 */
export const FINANCIAL_CONSTANTS = {
  // Allocation percentages
  ESSENTIAL_EXPENSES_MAX: 0.50, // 50% max
  EMERGENCY_FUND_ALLOCATION: 0.20, // 20% of surplus
  GOAL_SAVINGS_ALLOCATION: 0.60, // 60% of surplus
  
  // Investment allocation by risk tolerance
  INVESTMENT_ALLOCATION: {
    CONSERVATIVE: 0.30,
    MODERATE: 0.50,
    AGGRESSIVE: 0.70
  },
  
  // Debt-to-income thresholds
  DTI_COMFORTABLE: 0.30,
  DTI_MANAGEABLE: 0.40,
  DTI_RISKY: 0.50,
  
  // Emergency fund
  EMERGENCY_FUND_MONTHS_MIN: 3,
  EMERGENCY_FUND_MONTHS_TARGET: 6,
  
  // Feasibility thresholds
  UTILIZATION_COMFORTABLE: 0.50,
  UTILIZATION_TIGHT: 0.80,
  UTILIZATION_VERY_TIGHT: 1.00,
  
  // Default loan parameters
  DEFAULT_LOAN_RATE: 12, // 12% annual
  DEFAULT_LOAN_TENURE: 12, // 12 months
  
  // Confidence score thresholds
  CONFIDENCE_VERY_HIGH: 90,
  CONFIDENCE_HIGH: 70,
  CONFIDENCE_MEDIUM: 50,
  CONFIDENCE_LOW: 30
} as const;
```

---

### Phase 3: Validation Schemas (Day 3)

#### 3.1 Allocation Schema (`src/validation/schemas/allocation.schema.ts`)
```typescript
import { z } from 'zod';

export const AllocationInputSchema = z.object({
  userId: z.string().min(1),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
  monthlyIncome: z.number().positive(),
  otherIncome: z.number().nonnegative().optional(),
  essentialExpenses: z.array(z.object({
    amount: z.number().positive(),
    frequency: z.enum(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'ONE_TIME']),
    isActive: z.boolean()
  })),
  discretionaryExpenses: z.array(z.object({
    amount: z.number().positive(),
    frequency: z.enum(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'ONE_TIME']),
    isActive: z.boolean()
  })),
  debts: z.array(z.object({
    minimumPayment: z.number().positive(),
    status: z.enum(['ACTIVE', 'PAID_OFF', 'DEFAULTED'])
  })),
  emergencyFundTarget: z.number().nonnegative(),
  currentEmergencyFund: z.number().nonnegative(),
  goals: z.array(z.object({
    id: z.string(),
    targetAmount: z.number().positive(),
    currentAmount: z.number().nonnegative(),
    targetDate: z.string().datetime(),
    priority: z.enum(['HIGH', 'MEDIUM', 'LOW']),
    status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'])
  })),
  riskTolerance: z.enum(['CONSERVATIVE', 'MODERATE', 'AGGRESSIVE'])
});

export type AllocationInput = z.infer<typeof AllocationInputSchema>;
```

---

### Phase 4: Engine Implementation (Day 4-7)

#### 4.1 Allocation Engine

**File: `src/engines/allocation/calculate-allocation.ts`**

```typescript
import type { AllocationInput } from '../../validation/schemas/allocation.schema';
import type { Allocation } from './types';
import { normalizeToMonthly } from '../../utils/frequency-utils';
import { monthsBetween } from '../../utils/date-utils';
import { roundToTwo } from '../../utils/math-utils';
import { FINANCIAL_CONSTANTS } from '../../constants/financial-constants';

/**
 * Calculate monthly income allocation using waterfall priority
 * 
 * Priority order:
 * 1. Essential Expenses (max 50%)
 * 2. Debt Payments (minimum)
 * 3. Emergency Fund (20% of surplus until target)
 * 4. Goal Savings (by priority)
 * 5. Investments (based on risk tolerance)
 * 6. Discretionary (remainder)
 * 
 * @param input - Allocation input parameters
 * @returns Allocation result with breakdown
 */
export function calculateAllocation(input: AllocationInput): Allocation {
  // Step 1: Calculate total income
  const totalIncome = input.monthlyIncome + (input.otherIncome || 0);
  let remaining = totalIncome;

  // Step 2: Allocate to essential expenses (max 50%)
  const essentialTotal = input.essentialExpenses
    .filter(e => e.isActive)
    .reduce((sum, e) => sum + normalizeToMonthly(e.amount, e.frequency), 0);

  const essentialExpenses = Math.min(
    essentialTotal,
    totalIncome * FINANCIAL_CONSTANTS.ESSENTIAL_EXPENSES_MAX,
    remaining
  );
  remaining -= essentialExpenses;

  // Check for insufficient income
  if (essentialTotal > totalIncome) {
    return {
      userId: input.userId,
      month: input.month,
      year: input.year,
      essentialExpenses: totalIncome,
      debtPayments: 0,
      emergencyFund: 0,
      goalSavings: 0,
      investments: 0,
      discretionary: 0,
      totalIncome,
      totalAllocated: totalIncome,
      goalAllocations: {},
      warning: 'INCOME_INSUFFICIENT',
      warningMessage: 'Income does not cover essential expenses',
      shortfall: essentialTotal - totalIncome
    };
  }

  // Step 3: Allocate to debt minimum payments
  const debtMinimumTotal = input.debts
    .filter(d => d.status === 'ACTIVE')
    .reduce((sum, d) => sum + d.minimumPayment, 0);

  const debtPayments = Math.min(debtMinimumTotal, remaining);
  remaining -= debtPayments;

  // Check if income insufficient for debts
  if (debtMinimumTotal > remaining + debtPayments) {
    return {
      userId: input.userId,
      month: input.month,
      year: input.year,
      essentialExpenses,
      debtPayments: remaining + debtPayments,
      emergencyFund: 0,
      goalSavings: 0,
      investments: 0,
      discretionary: 0,
      totalIncome,
      totalAllocated: totalIncome,
      goalAllocations: {},
      warning: 'DEBT_PAYMENTS_INSUFFICIENT',
      warningMessage: 'Income does not cover essential expenses and minimum debt payments',
      shortfall: debtMinimumTotal - (remaining + debtPayments)
    };
  }

  // Step 4: Allocate to emergency fund (if below target)
  const emergencyFundGap = Math.max(
    0,
    input.emergencyFundTarget - input.currentEmergencyFund
  );

  const emergencyFund = input.currentEmergencyFund < input.emergencyFundTarget
    ? Math.min(
        emergencyFundGap,
        remaining * FINANCIAL_CONSTANTS.EMERGENCY_FUND_ALLOCATION,
        remaining
      )
    : 0;

  remaining -= emergencyFund;

  // Step 5: Allocate to goals (by priority)
  const sortedGoals = input.goals
    .filter(g => g.status === 'ACTIVE')
    .sort((a, b) => {
      const priorityWeight = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      if (priorityWeight[a.priority] !== priorityWeight[b.priority]) {
        return priorityWeight[b.priority] - priorityWeight[a.priority];
      }
      return new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime();
    });

  let goalSavings = 0;
  const goalAllocations: Record<string, number> = {};

  for (const goal of sortedGoals) {
    const monthsRemaining = monthsBetween(new Date(), new Date(goal.targetDate));
    const remainingAmount = goal.targetAmount - goal.currentAmount;
    const requiredMonthly = monthsRemaining > 0
      ? remainingAmount / monthsRemaining
      : remainingAmount;

    const allocation = Math.min(requiredMonthly, remaining);

    if (allocation > 0) {
      goalAllocations[goal.id] = roundToTwo(allocation);
      goalSavings += allocation;
      remaining -= allocation;
    }
  }

  // Step 6: Allocate to investments (if emergency fund met)
  let investments = 0;
  if (input.currentEmergencyFund >= input.emergencyFundTarget && remaining > 0) {
    const investmentPercentage = FINANCIAL_CONSTANTS.INVESTMENT_ALLOCATION[input.riskTolerance];
    investments = remaining * investmentPercentage;
    remaining -= investments;
  }

  // Step 7: Remaining goes to discretionary
  const discretionary = remaining;

  return {
    userId: input.userId,
    month: input.month,
    year: input.year,
    essentialExpenses: roundToTwo(essentialExpenses),
    debtPayments: roundToTwo(debtPayments),
    emergencyFund: roundToTwo(emergencyFund),
    goalSavings: roundToTwo(goalSavings),
    investments: roundToTwo(investments),
    discretionary: roundToTwo(discretionary),
    totalIncome: roundToTwo(totalIncome),
    totalAllocated: roundToTwo(totalIncome),
    goalAllocations
  };
}
```

**File: `src/engines/allocation/types.ts`**

```typescript
export interface Allocation {
  userId: string;
  month: number;
  year: number;
  essentialExpenses: number;
  debtPayments: number;
  emergencyFund: number;
  goalSavings: number;
  investments: number;
  discretionary: number;
  totalIncome: number;
  totalAllocated: number;
  goalAllocations: Record<string, number>;
  warning?: 'INCOME_INSUFFICIENT' | 'DEBT_PAYMENTS_INSUFFICIENT';
  warningMessage?: string;
  shortfall?: number;
}
```

#### 4.2 EMI Calculation (Loan Simulation Engine)

**File: `src/engines/loan-simulation/calculate-emi.ts`**

```typescript
import { roundToTwo } from '../../utils/math-utils';

/**
 * Calculate EMI (Equated Monthly Installment) for a loan
 * 
 * Formula: EMI = P × r × (1+r)^n / ((1+r)^n - 1)
 * where:
 *   P = Principal loan amount
 *   r = Monthly interest rate (annual rate / 12 / 100)
 *   n = Tenure in months
 * 
 * @param principal - Loan amount
 * @param annualInterestRate - Annual interest rate (percentage)
 * @param tenureMonths - Loan tenure in months
 * @returns Monthly EMI amount
 * 
 * @example
 * calculateEMI(500000, 12, 24) // Returns 23539.23
 */
export function calculateEMI(
  principal: number,
  annualInterestRate: number,
  tenureMonths: number
): number {
  // Validate inputs
  if (principal <= 0) {
    throw new Error('Principal must be positive');
  }
  if (annualInterestRate < 0 || annualInterestRate > 50) {
    throw new Error('Interest rate must be between 0 and 50');
  }
  if (tenureMonths <= 0 || !Number.isInteger(tenureMonths)) {
    throw new Error('Tenure must be a positive integer');
  }

  const monthlyRate = annualInterestRate / 12 / 100;

  // Handle zero interest case
  if (monthlyRate === 0) {
    return roundToTwo(principal / tenureMonths);
  }

  // Calculate EMI using formula
  const numerator = principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths);
  const denominator = Math.pow(1 + monthlyRate, tenureMonths) - 1;
  const emi = numerator / denominator;

  return roundToTwo(emi);
}
```

---

### Phase 5: Comprehensive Testing (Day 8-9)

#### 5.1 Unit Test Example

**File: `src/engines/allocation/__tests__/calculate-allocation.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { calculateAllocation } from '../calculate-allocation';
import type { AllocationInput } from '../../../validation/schemas/allocation.schema';

describe('calculateAllocation', () => {
  describe('Standard Allocation', () => {
    it('should allocate income correctly with all categories', () => {
      const input: AllocationInput = {
        userId: 'user_123',
        month: 12,
        year: 2024,
        monthlyIncome: 80000,
        otherIncome: 0,
        essentialExpenses: [
          { amount: 40000, frequency: 'MONTHLY', isActive: true }
        ],
        discretionaryExpenses: [],
        debts: [
          { minimumPayment: 10000, status: 'ACTIVE' }
        ],
        emergencyFundTarget: 240000,
        currentEmergencyFund: 150000,
        goals: [
          {
            id: 'goal_1',
            targetAmount: 500000,
            currentAmount: 150000,
            targetDate: '2026-12-31T00:00:00Z',
            priority: 'HIGH',
            status: 'ACTIVE'
          }
        ],
        riskTolerance: 'MODERATE'
      };

      const result = calculateAllocation(input);

      expect(result.essentialExpenses).toBe(40000);
      expect(result.debtPayments).toBe(10000);
      expect(result.emergencyFund).toBe(6000); // 20% of 30000
      expect(result.goalSavings).toBeGreaterThan(0);
      expect(result.investments).toBeGreaterThan(0);
      expect(result.discretionary).toBeGreaterThan(0);
      expect(result.totalAllocated).toBe(80000);
      expect(result.warning).toBeUndefined();
    });

    it('should cap essential expenses at 50% of income', () => {
      const input: AllocationInput = {
        userId: 'user_123',
        month: 12,
        year: 2024,
        monthlyIncome: 80000,
        otherIncome: 0,
        essentialExpenses: [
          { amount: 60000, frequency: 'MONTHLY', isActive: true }
        ],
        discretionaryExpenses: [],
        debts: [],
        emergencyFundTarget: 0,
        currentEmergencyFund: 0,
        goals: [],
        riskTolerance: 'MODERATE'
      };

      const result = calculateAllocation(input);

      expect(result.essentialExpenses).toBe(40000); // 50% of 80000
      expect(result.essentialExpenses).toBeLessThanOrEqual(input.monthlyIncome * 0.5);
    });
  });

  describe('Edge Cases', () => {
    it('should handle insufficient income', () => {
      const input: AllocationInput = {
        userId: 'user_123',
        month: 12,
        year: 2024,
        monthlyIncome: 30000,
        otherIncome: 0,
        essentialExpenses: [
          { amount: 40000, frequency: 'MONTHLY', isActive: true }
        ],
        discretionaryExpenses: [],
        debts: [
          { minimumPayment: 5000, status: 'ACTIVE' }
        ],
        emergencyFundTarget: 0,
        currentEmergencyFund: 0,
        goals: [],
        riskTolerance: 'MODERATE'
      };

      const result = calculateAllocation(input);

      expect(result.warning).toBe('INCOME_INSUFFICIENT');
      expect(result.shortfall).toBe(10000);
      expect(result.essentialExpenses).toBe(30000);
      expect(result.debtPayments).toBe(0);
    });

    it('should handle zero income', () => {
      const input: AllocationInput = {
        userId: 'user_123',
        month: 12,
        year: 2024,
        monthlyIncome: 0,
        otherIncome: 0,
        essentialExpenses: [],
        discretionaryExpenses: [],
        debts: [],
        emergencyFundTarget: 0,
        currentEmergencyFund: 0,
        goals: [],
        riskTolerance: 'MODERATE'
      };

      const result = calculateAllocation(input);

      expect(result.totalIncome).toBe(0);
      expect(result.totalAllocated).toBe(0);
    });

    it('should prioritize emergency fund over goals', () => {
      const input: AllocationInput = {
        userId: 'user_123',
        month: 12,
        year: 2024,
        monthlyIncome: 50000,
        otherIncome: 0,
        essentialExpenses: [
          { amount: 30000, frequency: 'MONTHLY', isActive: true }
        ],
        discretionaryExpenses: [],
        debts: [],
        emergencyFundTarget: 150000,
        currentEmergencyFund: 0,
        goals: [
          {
            id: 'goal_1',
            targetAmount: 100000,
            currentAmount: 0,
            targetDate: '2025-12-31T00:00:00Z',
            priority: 'HIGH',
            status: 'ACTIVE'
          }
        ],
        riskTolerance: 'MODERATE'
      };

      const result = calculateAllocation(input);

      expect(result.emergencyFund).toBeGreaterThan(0);
      expect(result.investments).toBe(0); // No investments until emergency fund met
    });
  });

  describe('Goal Allocation', () => {
    it('should allocate to goals by priority', () => {
      const input: AllocationInput = {
        userId: 'user_123',
        month: 12,
        year: 2024,
        monthlyIncome: 100000,
        otherIncome: 0,
        essentialExpenses: [
          { amount: 40000, frequency: 'MONTHLY', isActive: true }
        ],
        discretionaryExpenses: [],
        debts: [],
        emergencyFundTarget: 0,
        currentEmergencyFund: 0,
        goals: [
          {
            id: 'goal_high',
            targetAmount: 100000,
            currentAmount: 0,
            targetDate: '2025-12-31T00:00:00Z',
            priority: 'HIGH',
            status: 'ACTIVE'
          },
          {
            id: 'goal_low',
            targetAmount: 100000,
            currentAmount: 0,
            targetDate: '2025-12-31T00:00:00Z',
            priority: 'LOW',
            status: 'ACTIVE'
          }
        ],
        riskTolerance: 'MODERATE'
      };

      const result = calculateAllocation(input);

      expect(result.goalAllocations['goal_high']).toBeGreaterThan(0);
      expect(result.goalAllocations['goal_high']).toBeGreaterThanOrEqual(
        result.goalAllocations['goal_low'] || 0
      );
    });
  });
});
```

#### 5.2 EMI Test Example

**File: `src/engines/loan-simulation/__tests__/calculate-emi.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { calculateEMI } from '../calculate-emi';

describe('calculateEMI', () => {
  it('should calculate EMI correctly for standard loan', () => {
    const emi = calculateEMI(500000, 12, 24);
    expect(emi).toBeCloseTo(23539.23, 2);
  });

  it('should handle zero interest rate', () => {
    const emi = calculateEMI(120000, 0, 12);
    expect(emi).toBe(10000);
  });

  it('should throw error for negative principal', () => {
    expect(() => calculateEMI(-100000, 12, 12)).toThrow('Principal must be positive');
  });

  it('should throw error for invalid interest rate', () => {
    expect(() => calculateEMI(100000, -5, 12)).toThrow('Interest rate must be between 0 and 50');
    expect(() => calculateEMI(100000, 60, 12)).toThrow('Interest rate must be between 0 and 50');
  });

  it('should throw error for invalid tenure', () => {
    expect(() => calculateEMI(100000, 12, 0)).toThrow('Tenure must be a positive integer');
    expect(() => calculateEMI(100000, 12, -12)).toThrow('Tenure must be a positive integer');
    expect(() => calculateEMI(100000, 12, 12.5)).toThrow('Tenure must be a positive integer');
  });

  it('should match known EMI calculations', () => {
    // Test case from specification
    const emi = calculateEMI(500000, 12, 12);
    expect(emi).toBeCloseTo(44424.39, 2);
  });
});
```

---

### Phase 6: Documentation & Export (Day 10)

#### 6.1 Main Export (`src/index.ts`)
```typescript
// Engines
export { calculateAllocation } from './engines/allocation';
export { calculateEMI } from './engines/loan-simulation';
export { simulatePurchase } from './engines/purchase-simulation';
export { calculateGoalFeasibility } from './engines/goal-projection';
export { projectCashFlow } from './engines/cash-flow-projection';
export { calculateConfidence } from './engines/confidence';

// Types
export type * from './types';

// Utilities
export * from './utils/date-utils';
export * from './utils/frequency-utils';
export * from './utils/math-utils';

// Constants
export { FINANCIAL_CONSTANTS } from './constants/financial-constants';

// Validation
export * from './validation/schemas';
```

#### 6.2 README.md
```markdown
# @sage/financial-engine

Deterministic financial calculation engine for Sage AI Personal CFO.

## Features

- ✅ Pure TypeScript - No dependencies on React, databases, or external APIs
- ✅ 100% Test Coverage - Every function fully tested
- ✅ Type-Safe - Strict TypeScript with Zod validation
- ✅ Deterministic - Same input always produces same output
- ✅ Zero Side Effects - Pure functions only
- ✅ Framework Agnostic - Use anywhere

## Installation

```bash
npm install @sage/financial-engine
```

## Usage

### Calculate Allocation

```typescript
import { calculateAllocation } from '@sage/financial-engine';

const allocation = calculateAllocation({
  userId: 'user_123',
  month: 12,
  year: 2024,
  monthlyIncome: 80000,
  // ... other parameters
});

console.log(allocation.goalSavings); // 18000
```

### Calculate EMI

```typescript
import { calculateEMI } from '@sage/financial-engine';

const emi = calculateEMI(500000, 12, 24);
console.log(emi); // 23539.23
```

## API Reference

See [API.md](./API.md) for complete API documentation.

## Testing

```bash
npm test                 # Run tests
npm run test:coverage    # Run with coverage
npm run test:watch       # Watch mode
```

## License

MIT
```

---

## Testing Strategy

### Coverage Requirements

- **Financial Engines:** 100% (all lines, branches, functions)
- **Utilities:** 100%
- **Types:** N/A (type-only files)
- **Overall:** 100%

### Test Categories

1. **Unit Tests** - Test individual functions
2. **Integration Tests** - Test engine workflows
3. **Edge Case Tests** - Test boundary conditions
4. **Performance Tests** - Verify calculation speed

### Test Data

Create comprehensive test fixtures in `tests/fixtures/test-data.ts`:

```typescript
export const TEST_USERS = {
  standard: {
    userId: 'user_standard',
    monthlyIncome: 80000,
    currentSavings: 200000
  },
  lowIncome: {
    userId: 'user_low',
    monthlyIncome: 30000,
    currentSavings: 50000
  },
  highIncome: {
    userId: 'user_high',
    monthlyIncome: 200000,
    currentSavings: 1000000
  }
};

export const TEST_GOALS = {
  house: {
    id: 'goal_house',
    name: 'House Down Payment',
    targetAmount: 500000,
    currentAmount: 150000,
    targetDate: '2026-12-31T00:00:00Z',
    priority: 'HIGH',
    status: 'ACTIVE'
  },
  // ... more test goals
};
```

---

## Performance Benchmarks

All calculations must meet these targets:

| Function | Target | Max Acceptable |
|----------|--------|----------------|
| calculateAllocation | < 50ms | 100ms |
| calculateEMI | < 1ms | 10ms |
| simulatePurchase | < 100ms | 200ms |
| calculateGoalFeasibility | < 10ms | 50ms |
| projectCashFlow (60mo) | < 300ms | 500ms |

---

## Implementation Checklist

### Phase 1: Foundation ✓
- [ ] Package initialization
- [ ] TypeScript configuration
- [ ] Build setup (tsup)
- [ ] Test setup (vitest)
- [ ] Dependencies installed

### Phase 2: Core Types ✓
- [ ] Common types
- [ ] Goal types
- [ ] Expense types
- [ ] Debt types
- [ ] Allocation types

### Phase 3: Utilities ✓
- [ ] Date utilities
- [ ] Frequency utilities
- [ ] Math utilities
- [ ] Constants

### Phase 4: Validation ✓
- [ ] Allocation schema
- [ ] Goal schema
- [ ] Expense schema
- [ ] Debt schema

### Phase 5: Engines ✓
- [ ] Allocation engine
- [ ] EMI calculation
- [ ] Purchase simulation
- [ ] Goal projection
- [ ] Cash flow projection
- [ ] Confidence calculation

### Phase 6: Testing ✓
- [ ] Unit tests (100% coverage)
- [ ] Integration tests
- [ ] Edge case tests
- [ ] Performance tests

### Phase 7: Documentation ✓
- [ ] README.md
- [ ] API.md
- [ ] JSDoc comments
- [ ] Usage examples

---

## Success Criteria

1. ✅ All 7 engines implemented
2. ✅ 100% test coverage achieved
3. ✅ All tests passing
4. ✅ Performance benchmarks met
5. ✅ Zero external dependencies (except Zod)
6. ✅ Full TypeScript strict mode
7. ✅ Complete JSDoc documentation
8. ✅ Build produces CJS + ESM outputs
9. ✅ Package size < 50KB (minified)

---

## Next Steps After Implementation

1. **Integration** - Integrate into main Sage application
2. **Validation** - Validate calculations with financial expert
3. **Benchmarking** - Run performance benchmarks
4. **Documentation** - Create usage guides
5. **Publishing** - Publish to npm (if open-sourcing)

---

**Plan Status:** Ready for Implementation  
**Estimated Timeline:** 10 days  
**Team Size:** 1-2 developers  
**Risk Level:** Low (well-defined specifications)

---

**Approval Required Before Implementation**

Please review this plan and confirm:
1. Architecture approach is correct
2. All required engines are included
3. Testing strategy is sufficient
4. Timeline is acceptable

Once approved, implementation can begin immediately.
