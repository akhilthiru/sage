# Financial Engine: Public API Contracts

**Package:** `@sage/financial-engine`  
**Version:** 1.0.0  
**Status:** Contract Definition  
**Date:** 2024-12-19

---

## Overview

This document defines all public APIs for the Financial Engine package. These contracts are **implementation-ready** and must not change without major version bump.

**Stability Guarantee:** All APIs defined here are stable and will be maintained with semantic versioning.

---

## Contract 1: calculateAllocation()

### Purpose
Distribute monthly income across financial priorities using waterfall algorithm.

### Function Signature

```typescript
function calculateAllocation(input: AllocationInput): AllocationResult;
```

### Input Type

```typescript
interface AllocationInput {
  userId: string;
  month: number;           // 1-12
  year: number;            // 2020-2100
  monthlyIncome: number;   // > 0
  otherIncome?: number;    // >= 0
  
  essentialExpenses: ExpenseItem[];
  discretionaryExpenses: ExpenseItem[];
  debts: DebtItem[];
  
  emergencyFundTarget: number;     // >= 0
  currentEmergencyFund: number;    // >= 0
  
  goals: GoalItem[];
  riskTolerance: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
}

interface ExpenseItem {
  amount: number;          // > 0
  frequency: Frequency;
  isActive: boolean;
}

interface DebtItem {
  minimumPayment: number;  // > 0
  status: 'ACTIVE' | 'PAID_OFF' | 'DEFAULTED';
}

interface GoalItem {
  id: string;
  targetAmount: number;    // > 0
  currentAmount: number;   // >= 0
  targetDate: string;      // ISO 8601
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
}

type Frequency = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'ONE_TIME';
```

### Output Type

```typescript
interface AllocationResult {
  userId: string;
  month: number;
  year: number;
  
  // Allocation breakdown
  essentialExpenses: number;
  debtPayments: number;
  emergencyFund: number;
  goalSavings: number;
  investments: number;
  discretionary: number;
  
  totalIncome: number;
  totalAllocated: number;
  
  // Goal-specific allocations
  goalAllocations: Record<string, number>;
  
  // Warnings (if any)
  warning?: 'INCOME_INSUFFICIENT' | 'DEBT_PAYMENTS_INSUFFICIENT';
  warningMessage?: string;
  shortfall?: number;
}
```

### Validation Rules

**Input Validation:**
- `monthlyIncome` must be > 0
- `month` must be 1-12
- `year` must be 2020-2100
- `otherIncome` must be >= 0 if provided
- `emergencyFundTarget` must be >= 0
- `currentEmergencyFund` must be >= 0
- `currentEmergencyFund` must be <= `emergencyFundTarget`
- All expense amounts must be > 0
- All debt minimum payments must be > 0
- Goal `targetDate` must be valid ISO 8601 date
- Goal `targetAmount` must be > 0
- Goal `currentAmount` must be >= 0 and < `targetAmount`

**Business Rules:**
- Essential expenses capped at 50% of total income
- Debt minimum payments prioritized
- Emergency fund gets 20% of surplus until target met
- Goals allocated by priority (HIGH > MEDIUM > LOW)
- Investments only allocated if emergency fund target met
- Total allocated must equal total income

### Error Conditions

```typescript
// Throws if validation fails
throw new Error('Invalid input: monthlyIncome must be positive');

// Returns warning in result if income insufficient
{
  warning: 'INCOME_INSUFFICIENT',
  warningMessage: 'Income does not cover essential expenses',
  shortfall: 10000
}
```

### Edge Cases

**Case 1: Zero Income**
- Input: `monthlyIncome = 0`
- Output: All allocations = 0, no warning

**Case 2: Income < Essential Expenses**
- Input: `monthlyIncome = 30000`, `essentialExpenses = 40000`
- Output: `warning = 'INCOME_INSUFFICIENT'`, `shortfall = 10000`

**Case 3: No Active Goals**
- Input: All goals have `status = 'PAUSED'`
- Output: `goalSavings = 0`, more to investments/discretionary

**Case 4: Multiple High-Priority Goals**
- Input: 3 goals with `priority = 'HIGH'`
- Output: Allocated by target date (earlier first), then proportionally

**Case 5: Emergency Fund Already Met**
- Input: `currentEmergencyFund >= emergencyFundTarget`
- Output: `emergencyFund = 0`, more to investments

### Usage Example

```typescript
import { calculateAllocation } from '@sage/financial-engine';

const result = calculateAllocation({
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
      id: 'goal_house',
      targetAmount: 500000,
      currentAmount: 150000,
      targetDate: '2026-12-31T00:00:00Z',
      priority: 'HIGH',
      status: 'ACTIVE'
    }
  ],
  riskTolerance: 'MODERATE'
});

console.log(result);
// {
//   essentialExpenses: 40000,
//   debtPayments: 10000,
//   emergencyFund: 6000,
//   goalSavings: 14583,
//   investments: 4708,
//   discretionary: 4709,
//   totalIncome: 80000,
//   totalAllocated: 80000,
//   goalAllocations: { goal_house: 14583 }
// }
```

### Future Extensibility

**V2 Considerations:**
- Add `savingsGoals` separate from `goals`
- Add `taxWithholding` category
- Add `charitableGiving` category
- Support multiple income sources with different frequencies
- Support variable income (min/max ranges)

---

## Contract 2: calculateEMI()

### Purpose
Calculate Equated Monthly Installment (EMI) for a loan using standard formula.

### Function Signature

```typescript
function calculateEMI(
  principal: number,
  annualInterestRate: number,
  tenureMonths: number
): EMIResult;
```

### Input Type

```typescript
// Parameters
principal: number;           // > 0, loan amount
annualInterestRate: number;  // 0-50, annual percentage
tenureMonths: number;        // > 0, integer, loan tenure in months
```

### Output Type

```typescript
interface EMIResult {
  emi: number;              // Monthly payment
  totalPayable: number;     // Total amount to be paid
  totalInterest: number;    // Total interest amount
  principal: number;        // Original loan amount
  tenure: number;           // Loan tenure in months
  interestRate: number;     // Annual interest rate
}
```

### Validation Rules

**Input Validation:**
- `principal` must be > 0
- `principal` must be <= 100,000,000 (10 crore)
- `annualInterestRate` must be >= 0 and <= 50
- `tenureMonths` must be > 0
- `tenureMonths` must be integer
- `tenureMonths` must be <= 360 (30 years)

### Error Conditions

```typescript
// Invalid principal
throw new Error('Principal must be positive and <= 10 crore');

// Invalid interest rate
throw new Error('Interest rate must be between 0 and 50');

// Invalid tenure
throw new Error('Tenure must be a positive integer <= 360 months');
```

### Edge Cases

**Case 1: Zero Interest Rate**
- Input: `annualInterestRate = 0`
- Output: `emi = principal / tenureMonths`

**Case 2: Very Small Principal**
- Input: `principal = 100`
- Output: Calculated normally, rounded to 2 decimals

**Case 3: Very Long Tenure**
- Input: `tenureMonths = 360` (30 years)
- Output: Calculated normally

### Mathematical Formula

```
EMI = P × r × (1+r)^n / ((1+r)^n - 1)

where:
  P = Principal loan amount
  r = Monthly interest rate (annual rate / 12 / 100)
  n = Tenure in months

Special case (r = 0):
  EMI = P / n
```

### Usage Example

```typescript
import { calculateEMI } from '@sage/financial-engine';

const result = calculateEMI(500000, 12, 24);

console.log(result);
// {
//   emi: 23539.23,
//   totalPayable: 564941.52,
//   totalInterest: 64941.52,
//   principal: 500000,
//   tenure: 24,
//   interestRate: 12
// }
```

### Future Extensibility

**V2 Considerations:**
- Add `calculateReducingEMI()` for reducing balance method
- Add `calculateFlatEMI()` for flat rate method
- Support irregular payment schedules
- Support grace periods

---

## Contract 3: simulateLoan()

### Purpose
Simulate loan affordability with amortization schedule and assessment.

### Function Signature

```typescript
function simulateLoan(input: LoanSimulationInput): LoanSimulationResult;
```

### Input Type

```typescript
interface LoanSimulationInput {
  principal: number;           // > 0
  annualInterestRate: number;  // 0-50
  tenureMonths: number;        // > 0, integer
  
  // User financial context
  monthlyIncome: number;       // > 0
  monthlyExpenses: number;     // >= 0
  existingDebts: ExistingDebt[];
}

interface ExistingDebt {
  monthlyPayment: number;      // > 0
  status: 'ACTIVE' | 'PAID_OFF' | 'DEFAULTED';
}
```

### Output Type

```typescript
interface LoanSimulationResult {
  // EMI details
  emi: number;
  totalPayable: number;
  totalInterest: number;
  
  // Affordability assessment
  affordability: 'COMFORTABLE' | 'MANAGEABLE' | 'RISKY' | 'UNAFFORDABLE';
  debtToIncomeRatio: number;   // Percentage (0-100)
  monthlySurplus: number;      // After all expenses and EMIs
  
  // Amortization schedule
  amortizationSchedule: AmortizationEntry[];
  
  // Recommendations
  recommendation: string;
  maxAffordableEMI: number;
  suggestedTenure?: number;    // If current is unaffordable
}

interface AmortizationEntry {
  month: number;
  emi: number;
  principal: number;
  interest: number;
  balance: number;
}
```

### Validation Rules

Same as `calculateEMI()` plus:
- `monthlyIncome` must be > 0
- `monthlyExpenses` must be >= 0
- `monthlyExpenses` must be < `monthlyIncome`

### Error Conditions

```typescript
// Invalid income/expense ratio
throw new Error('Monthly expenses cannot exceed monthly income');
```

### Edge Cases

**Case 1: No Existing Debts**
- Input: `existingDebts = []`
- Output: DTI based only on new EMI

**Case 2: High Existing Debt**
- Input: Existing DTI already 40%
- Output: `affordability = 'UNAFFORDABLE'` for most new loans

**Case 3: Very Low Income**
- Input: `monthlyIncome = 20000`, `emi = 15000`
- Output: `affordability = 'RISKY'` or `'UNAFFORDABLE'`

### Affordability Thresholds

```typescript
// Debt-to-Income Ratio thresholds
COMFORTABLE:    DTI <= 30% AND surplus > 20% of income
MANAGEABLE:     DTI <= 40% AND surplus > 0
RISKY:          DTI <= 50%
UNAFFORDABLE:   DTI > 50%
```

### Usage Example

```typescript
import { simulateLoan } from '@sage/financial-engine';

const result = simulateLoan({
  principal: 500000,
  annualInterestRate: 12,
  tenureMonths: 24,
  monthlyIncome: 80000,
  monthlyExpenses: 40000,
  existingDebts: [
    { monthlyPayment: 10000, status: 'ACTIVE' }
  ]
});

console.log(result.affordability); // 'MANAGEABLE'
console.log(result.debtToIncomeRatio); // 42%
```

### Future Extensibility

**V2 Considerations:**
- Add prepayment scenarios
- Add refinancing analysis
- Support balloon payments
- Support step-up/step-down EMIs

---

## Contract 4: projectGoalTimeline()

### Purpose
Calculate goal feasibility, timeline, and confidence score.

### Function Signature

```typescript
function projectGoalTimeline(input: GoalProjectionInput): GoalProjectionResult;
```

### Input Type

```typescript
interface GoalProjectionInput {
  goal: {
    id: string;
    targetAmount: number;      // > 0
    currentAmount: number;     // >= 0
    targetDate: string;        // ISO 8601
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
  };
  
  monthlyIncome: number;       // > 0
  monthlyExpenses: number;     // >= 0
  otherGoalCommitments: number; // >= 0, allocated to other goals
  
  emergencyFundStatus: 'MET' | 'NOT_MET';
}
```

### Output Type

```typescript
interface GoalProjectionResult {
  // Feasibility
  isFeasible: boolean;
  feasibilityScore: number;    // 0-100
  
  // Timeline
  monthsRemaining: number;
  projectedCompletionDate: string; // ISO 8601
  delayMonths: number;         // 0 if on track
  
  // Financial requirements
  requiredMonthly: number;
  availableMonthly: number;
  utilizationRatio: number;    // 0-N (1.0 = 100% utilization)
  
  // Recommendations
  recommendations: string[];
  
  // Confidence
  confidence: {
    score: number;             // 0-100
    level: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
    factors: ConfidenceFactor[];
  };
}

interface ConfidenceFactor {
  name: string;
  impact: number;              // -20 to +20
  reason: string;
}
```

### Validation Rules

**Input Validation:**
- `targetAmount` must be > 0
- `currentAmount` must be >= 0 and < `targetAmount`
- `targetDate` must be valid ISO 8601 date
- `monthlyIncome` must be > 0
- `monthlyExpenses` must be >= 0 and < `monthlyIncome`
- `otherGoalCommitments` must be >= 0

**Business Rules:**
- If `targetDate` is in past, `isFeasible = false`
- If `availableMonthly <= 0`, `isFeasible = false`
- Feasibility score reduced by 20% if emergency fund not met

### Error Conditions

```typescript
// Target date in past
// Returns result with isFeasible = false, not an error

// Invalid date format
throw new Error('Target date must be valid ISO 8601 format');
```

### Edge Cases

**Case 1: Target Date in Past**
- Input: `targetDate = '2020-01-01'`
- Output: `isFeasible = false`, `feasibilityScore = 0`

**Case 2: Already Achieved**
- Input: `currentAmount >= targetAmount`
- Output: `isFeasible = true`, `feasibilityScore = 100`, `monthsRemaining = 0`

**Case 3: No Available Income**
- Input: `monthlyIncome = monthlyExpenses + otherGoalCommitments`
- Output: `isFeasible = false`, recommendations to increase income

**Case 4: Very Long Timeline**
- Input: `targetDate` is 10 years away
- Output: Lower confidence score due to uncertainty

### Feasibility Scoring

```typescript
utilizationRatio = requiredMonthly / availableMonthly

if (utilizationRatio <= 0.5):
  feasibilityScore = 100          // Comfortable
else if (utilizationRatio <= 0.8):
  feasibilityScore = 100 - ((utilizationRatio - 0.5) / 0.3) * 30  // 70-100
else if (utilizationRatio <= 1.0):
  feasibilityScore = 70 - ((utilizationRatio - 0.8) / 0.2) * 40   // 30-70
else:
  feasibilityScore = 30 / utilizationRatio  // 0-30

if (emergencyFundStatus === 'NOT_MET'):
  feasibilityScore *= 0.8  // 20% penalty
```

### Usage Example

```typescript
import { projectGoalTimeline } from '@sage/financial-engine';

const result = projectGoalTimeline({
  goal: {
    id: 'goal_house',
    targetAmount: 500000,
    currentAmount: 150000,
    targetDate: '2026-12-31T00:00:00Z',
    priority: 'HIGH'
  },
  monthlyIncome: 80000,
  monthlyExpenses: 50000,
  otherGoalCommitments: 10000,
  emergencyFundStatus: 'MET'
});

console.log(result.isFeasible); // true
console.log(result.feasibilityScore); // 79
console.log(result.confidence.level); // 'high'
```

### Future Extensibility

**V2 Considerations:**
- Add inflation adjustment
- Add investment returns projection
- Support milestone-based goals
- Add risk-adjusted projections

---

## Contract 5: simulatePurchase()

### Purpose
Simulate 3 purchase scenarios: buy from savings, take loan, save first.

### Function Signature

```typescript
function simulatePurchase(input: PurchaseSimulationInput): PurchaseSimulationResult;
```

### Input Type

```typescript
interface PurchaseSimulationInput {
  purchaseAmount: number;      // > 0
  itemName?: string;
  
  // User financial state
  currentSavings: number;      // >= 0
  emergencyFundTarget: number; // >= 0
  currentEmergencyFund: number; // >= 0
  
  monthlyIncome: number;       // > 0
  monthlyExpenses: number;     // >= 0
  
  activeGoals: GoalItem[];
  existingDebts: DebtItem[];
}
```

### Output Type

```typescript
interface PurchaseSimulationResult {
  purchaseAmount: number;
  itemName?: string;
  
  scenarios: PurchaseScenario[];
  recommended: 'BUY_FROM_SAVINGS' | 'LOAN_EMI' | 'SAVE_FIRST' | 'NONE';
  canAfford: boolean;
  
  confidence: {
    score: number;
    level: string;
    factors: ConfidenceFactor[];
  };
}

interface PurchaseScenario {
  type: 'BUY_FROM_SAVINGS' | 'LOAN_EMI' | 'SAVE_FIRST';
  isViable: boolean;
  
  immediateImpact: {
    newSavings: number;
    newEmergencyFund: number;
    emergencyFundImpact?: number;
  };
  
  monthlyImpact: number;       // Positive = cost, Negative = saving
  totalCost: number;
  timeline: number;            // Months (0 = immediate)
  
  goalImpacts?: GoalImpact[];
  
  pros: string[];
  cons: string[];
  recommendation: boolean;
  
  // Loan-specific
  emi?: number;
  tenure?: number;
  totalInterest?: number;
  debtToIncomeRatio?: number;
}

interface GoalImpact {
  goalId: string;
  goalName: string;
  delayMonths: number;
}
```

### Validation Rules

**Input Validation:**
- `purchaseAmount` must be > 0
- `currentSavings` must be >= 0
- `emergencyFundTarget` must be >= 0
- `currentEmergencyFund` must be >= 0 and <= `emergencyFundTarget`
- `monthlyIncome` must be > 0
- `monthlyExpenses` must be >= 0 and < `monthlyIncome`

**Business Rules:**
- Scenario 1 viable only if savings remain >= 50% of emergency fund target
- Scenario 2 viable only if DTI <= 40%
- Scenario 3 always viable if monthly surplus > 0

### Error Conditions

```typescript
// All validation errors throw
throw new Error('Purchase amount must be positive');
```

### Edge Cases

**Case 1: Purchase > Total Savings**
- Input: `purchaseAmount = 100000`, `currentSavings = 50000`
- Output: Scenario 1 not viable, Scenario 2 or 3 recommended

**Case 2: Very Small Purchase**
- Input: `purchaseAmount = 1000`, `currentSavings = 100000`
- Output: Scenario 1 recommended (minimal impact)

**Case 3: No Monthly Surplus**
- Input: `monthlyIncome = monthlyExpenses`
- Output: Only Scenario 1 viable (if savings sufficient)

### Recommendation Logic

```typescript
Priority order:
1. Save first (if timeline <= 6 months)
2. Buy from savings (if emergency fund safe)
3. Loan (if affordable)
4. Save first (even if longer)
5. None (if nothing viable)
```

### Usage Example

```typescript
import { simulatePurchase } from '@sage/financial-engine';

const result = simulatePurchase({
  purchaseAmount: 50000,
  itemName: 'Laptop',
  currentSavings: 200000,
  emergencyFundTarget: 180000,
  currentEmergencyFund: 150000,
  monthlyIncome: 80000,
  monthlyExpenses: 50000,
  activeGoals: [],
  existingDebts: []
});

console.log(result.recommended); // 'SAVE_FIRST'
console.log(result.scenarios.length); // 3
```

### Future Extensibility

**V2 Considerations:**
- Add partial payment scenarios
- Add credit card EMI option
- Support multiple loan options
- Add opportunity cost analysis

---

## Contract 6: forecastCashFlow()

### Purpose
Project month-by-month cash flow using linear deterministic projection.

**V1 Scope:** Linear projection only. No ML, no trends, no behavior prediction.

### Function Signature

```typescript
function forecastCashFlow(input: CashFlowProjectionInput): CashFlowProjectionResult;
```

### Input Type

```typescript
interface CashFlowProjectionInput {
  startDate: string;           // ISO 8601
  months: number;              // 1-60
  
  currentBalance: number;      // >= 0
  monthlyIncome: number;       // > 0
  
  expenses: ExpenseItem[];
  debts: DebtItem[];
  goals: GoalItem[];
  
  allocation: AllocationResult; // From calculateAllocation()
}
```

### Output Type

```typescript
interface CashFlowProjectionResult {
  projections: MonthlyProjection[];
  
  summary: {
    finalBalance: number;
    totalIncome: number;
    totalExpenses: number;
    totalSavings: number;
    goalsCompleted: string[];
    debtsCleared: string[];
  };
}

interface MonthlyProjection {
  month: number;
  date: string;              // ISO 8601
  
  openingBalance: number;
  income: number;
  expenses: number;
  savings: number;
  closingBalance: number;
  
  emergencyFund: number;
  goalProgress: Record<string, number>;
  debtBalances: Record<string, number>;
}
```

### Validation Rules

**Input Validation:**
- `startDate` must be valid ISO 8601
- `months` must be 1-60
- `currentBalance` must be >= 0
- `monthlyIncome` must be > 0

**Business Rules:**
- Linear projection (no growth, no trends)
- Fixed monthly income (no variation)
- Fixed monthly expenses (no variation)
- Goal contributions from allocation
- Debt payments from allocation

### Error Conditions

```typescript
// Invalid projection period
throw new Error('Projection months must be between 1 and 60');

// Invalid start date
throw new Error('Start date must be valid ISO 8601 format');
```

### Edge Cases

**Case 1: Goals Completed Mid-Projection**
- Behavior: Stop allocating to completed goal, redistribute to other goals

**Case 2: Debts Paid Off Mid-Projection**
- Behavior: Stop debt payments, redistribute to goals/investments

**Case 3: Negative Balance**
- Behavior: Allow negative balance, flag in summary

### V1 Limitations

**NOT Included in V1:**
- Income growth/inflation
- Expense trends
- Spending behavior prediction
- Probabilistic scenarios
- Investment returns
- Tax implications

**Deferred to V2:**
- Machine learning forecasting
- Trend analysis
- Monte Carlo simulation
- Risk-adjusted projections

### Usage Example

```typescript
import { forecastCashFlow } from '@sage/financial-engine';

const result = forecastCashFlow({
  startDate: '2024-01-01T00:00:00Z',
  months: 12,
  currentBalance: 200000,
  monthlyIncome: 80000,
  expenses: [...],
  debts: [...],
  goals: [...],
  allocation: allocationResult
});

console.log(result.summary.finalBalance); // 350000
console.log(result.summary.goalsCompleted); // ['goal_vacation']
```

### Future Extensibility

**V2 Considerations:**
- Add income growth rate
- Add inflation adjustment
- Add investment returns
- Add probabilistic scenarios
- Add spending behavior learning

---

## Contract 7: calculateConfidence()

### Purpose
Calculate confidence score for financial predictions based on data quality.

### Function Signature

```typescript
function calculateConfidence(input: ConfidenceInput): ConfidenceScore;
```

### Input Type

```typescript
interface ConfidenceInput {
  predictionType: 'GOAL' | 'PURCHASE' | 'LOAN' | 'ALLOCATION' | 'FORECAST';
  
  // Data quality factors
  profileCompleteness: number;     // 0-100
  incomeStability: 'STABLE' | 'VARIABLE' | 'UNKNOWN';
  expenseHistoryMonths: number;    // 0-N
  emergencyFundStatus: 'MET' | 'NOT_MET' | 'UNKNOWN';
  debtToIncomeRatio: number;       // 0-100
  dataRecencyDays: number;         // 0-N
  
  // Prediction-specific factors
  timelineMonths?: number;         // For goals
  utilizationRatio?: number;       // For goals
  purchaseToIncomeRatio?: number;  // For purchases
}
```

### Output Type

```typescript
interface ConfidenceScore {
  score: number;                   // 0-100
  level: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  factors: ConfidenceFactor[];
  summary: string;
  improvements: string[];          // What would increase confidence
}

interface ConfidenceFactor {
  name: string;
  impact: number;                  // -20 to +20
  reason: string;
  category: 'data_quality' | 'income' | 'financial_health' | 'goal' | 'purchase' | 'debt';
}
```

### Validation Rules

**Input Validation:**
- `profileCompleteness` must be 0-100
- `expenseHistoryMonths` must be >= 0
- `debtToIncomeRatio` must be 0-100
- `dataRecencyDays` must be >= 0

### Error Conditions

```typescript
// Invalid profile completeness
throw new Error('Profile completeness must be between 0 and 100');
```

### Edge Cases

**Case 1: Perfect Data**
- Input: All factors optimal
- Output: `score = 95-100`, `level = 'very_high'`

**Case 2: Minimal Data**
- Input: New user, no history
- Output: `score = 20-30`, `level = 'very_low'`

**Case 3: Mixed Data**
- Input: Good income, poor expense tracking
- Output: `score = 50-60`, `level = 'medium'`

### Confidence Levels

```typescript
very_high: 90-100
high:      70-89
medium:    50-69
low:       30-49
very_low:  0-29
```

### Confidence Factors

**Standard Factors:**
1. Profile Completeness (-20 to +20)
2. Income Stability (-15 to +15)
3. Emergency Fund Status (-15 to +15)
4. Debt Load (-15 to +10)
5. Spending History (-10 to +10)
6. Data Recency (-10 to +5)

**Prediction-Specific:**
- Goal: Timeline length, utilization ratio
- Purchase: Purchase size relative to income
- Loan: DTI ratio after loan

### Usage Example

```typescript
import { calculateConfidence } from '@sage/financial-engine';

const result = calculateConfidence({
  predictionType: 'GOAL',
  profileCompleteness: 85,
  incomeStability: 'STABLE',
  expenseHistoryMonths: 6,
  emergencyFundStatus: 'MET',
  debtToIncomeRatio: 25,
  dataRecencyDays: 7,
  timelineMonths: 24,
  utilizationRatio: 0.65
});

console.log(result.score); // 78
console.log(result.level); // 'high'
console.log(result.improvements); // ['Track expenses for 12+ months']
```

### Future Extensibility

**V2 Considerations:**
- Add historical accuracy tracking
- Add user behavior consistency
- Add external data sources
- Add market condition factors

---

## Contract 8: calculateFinancialHealth()

### Purpose
Provide high-level financial wellness assessment for dashboard.

**New in V1:** Core dashboard metric.

### Function Signature

```typescript
function calculateFinancialHealth(input: FinancialHealthInput): FinancialHealthResult;
```

### Input Type

```typescript
interface FinancialHealthInput {
  // Income & Expenses
  monthlyIncome: number;       // > 0
  monthlyExpenses: number;     // >= 0
  
  // Savings
  currentSavings: number;      // >= 0
  emergencyFundTarget: number; // >= 0
  currentEmergencyFund: number; // >= 0
  
  // Debts
  totalDebtBalance: number;    // >= 0
  monthlyDebtPayments: number; // >= 0
  
  // Goals
  activeGoalsCount: number;    // >= 0
  goalsOnTrack: number;        // >= 0
  
  // Allocation (optional, for detailed analysis)
  allocation?: AllocationResult;
}
```

### Output Type

```typescript
interface FinancialHealthResult {
  // Overall score
  score: number;               // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  level: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL';
  
  // Key metrics
  metrics: {
    debtToIncomeRatio: number;     // Percentage
    savingsRate: number;           // Percentage
    emergencyFundMonths: number;   // Months of expenses covered
    expenseRatio: number;          // Expenses as % of income
    goalProgressRate: number;      // % of goals on track
  };
  
  // Risk assessment
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  riskFactors: string[];
  
  // Recommendations
  recommendations: HealthRecommendation[];
  
  // Strengths & weaknesses
  strengths: string[];
  weaknesses: string[];
}

interface HealthRecommendation {
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  category: 'DEBT' | 'SAVINGS' | 'EXPENSES' | 'GOALS' | 'EMERGENCY_FUND';
  recommendation: string;
  impact: string;              // Expected improvement
}
```

### Validation Rules

**Input Validation:**
- `monthlyIncome` must be > 0
- `monthlyExpenses` must be >= 0 and <= `monthlyIncome`
- `currentSavings` must be >= 0
- `currentEmergencyFund` must be >= 0 and <= `emergencyFundTarget`
- `totalDebtBalance` must be >= 0
- `monthlyDebtPayments` must be >= 0
- `activeGoalsCount` must be >= 0
- `goalsOnTrack` must be >= 0 and <= `activeGoalsCount`

### Error Conditions

```typescript
// Invalid expense ratio
throw new Error('Monthly expenses cannot exceed monthly income');

// Invalid goals on track
throw new Error('Goals on track cannot exceed active goals count');
```

### Edge Cases

**Case 1: No Debt, No Goals**
- Output: Focus on emergency fund and savings rate

**Case 2: High Debt**
- Output: `riskLevel = 'HIGH'`, debt reduction recommendations

**Case 3: Perfect Financial Health**
- Output: `score = 95-100`, `grade = 'A'`, `level = 'EXCELLENT'`

### Health Score Calculation

```typescript
Base score: 50

Factors:
+ Debt-to-Income Ratio:
  - <= 20%: +20
  - <= 30%: +10
  - <= 40%: 0
  - > 40%: -20

+ Emergency Fund:
  - >= 6 months: +20
  - >= 3 months: +10
  - >= 1 month: 0
  - < 1 month: -20

+ Savings Rate:
  - >= 20%: +15
  - >= 10%: +10
  - >= 5%: +5
  - < 5%: 0

+ Expense Ratio:
  - <= 50%: +10
  - <= 70%: +5
  - <= 90%: 0
  - > 90%: -10

+ Goal Progress:
  - 100% on track: +10
  - >= 75%: +5
  - >= 50%: 0
  - < 50%: -5

Final score: clamp(base + factors, 0, 100)
```

### Grade Mapping

```typescript
A: 90-100 (EXCELLENT)
B: 75-89  (GOOD)
C: 60-74  (FAIR)
D: 40-59  (POOR)
F: 0-39   (CRITICAL)
```

### Usage Example

```typescript
import { calculateFinancialHealth } from '@sage/financial-engine';

const result = calculateFinancialHealth({
  monthlyIncome: 80000,
  monthlyExpenses: 50000,
  currentSavings: 300000,
  emergencyFundTarget: 300000,
  currentEmergencyFund: 300000,
  totalDebtBalance: 200000,
  monthlyDebtPayments: 15000,
  activeGoalsCount: 3,
  goalsOnTrack: 2
});

console.log(result.score); // 78
console.log(result.grade); // 'B'
console.log(result.level); // 'GOOD'
console.log(result.metrics.debtToIncomeRatio); // 18.75%
console.log(result.recommendations.length); // 3
```

### Future Extensibility

**V2 Considerations:**
- Add credit score integration
- Add net worth tracking
- Add investment portfolio health
- Add retirement readiness score
- Add comparative benchmarks (peer comparison)

---

## Cross-Cutting Concerns

### Error Handling Strategy

All functions follow consistent error handling:

```typescript
// Validation errors: Throw immediately
if (input.monthlyIncome <= 0) {
  throw new Error('Monthly income must be positive');
}

// Business warnings: Return in result
return {
  ...result,
  warning: 'INCOME_INSUFFICIENT',
  warningMessage: 'Income does not cover essential expenses'
};

// Edge cases: Handle gracefully
if (monthlyRate === 0) {
  return principal / tenureMonths; // Zero interest case
}
```

### Type Safety

All inputs and outputs are fully typed:
- No `any` types
- No type assertions
- Strict null checks
- Exhaustive switch statements

### Precision & Rounding

All monetary values:
- Stored as numbers (not strings)
- Rounded to 2 decimal places
- Consistent rounding (Math.round)

```typescript
function roundToTwo(num: number): number {
  return Math.round(num * 100) / 100;
}
```

### Date Handling

All dates:
- ISO 8601 format strings
- UTC timezone
- Validated before use

```typescript
// Input: '2024-12-31T00:00:00Z'
// Never: '12/31/2024' or timestamps
```

---

## Versioning & Stability

### Semantic Versioning

- **Major:** Breaking changes to public APIs
- **Minor:** New features, backward compatible
- **Patch:** Bug fixes, no API changes

### Deprecation Policy

- Deprecated features marked in TypeScript
- Minimum 1 major version before removal
- Migration guide provided

### Backward Compatibility

V1 contracts are stable. Changes require:
1. Major version bump
2. Migration guide
3. Deprecation warnings
4. Parallel implementation period

---

## Performance Contracts

All functions must meet performance targets:

| Function | Target | Max |
|----------|--------|-----|
| `calculateAllocation()` | < 50ms | 100ms |
| `calculateEMI()` | < 1ms | 10ms |
| `simulateLoan()` | < 100ms | 200ms |
| `projectGoalTimeline()` | < 10ms | 50ms |
| `simulatePurchase()` | < 100ms | 200ms |
| `forecastCashFlow(60mo)` | < 300ms | 500ms |
| `calculateConfidence()` | < 50ms | 100ms |
| `calculateFinancialHealth()` | < 50ms | 100ms |

---

## Testing Contracts

Each function must have:
- ✅ Unit tests for happy path
- ✅ Unit tests for all edge cases
- ✅ Unit tests for error conditions
- ✅ Performance benchmarks
- ✅ Property-based tests (where applicable)

Critical functions require 100% coverage:
- `calculateEMI()`
- `simulateLoan()`
- `calculateAllocation()`
- `projectGoalTimeline()`
- `calculateFinancialHealth()`

---

## Documentation Contracts

Each function must have:
- ✅ JSDoc with description
- ✅ Parameter descriptions
- ✅ Return value description
- ✅ Usage examples
- ✅ Edge case documentation
- ✅ Error condition documentation

---

**Contract Status:** Final  
**Implementation Ready:** Yes  
**Breaking Changes Allowed:** No (after v1.0.0)  
**Review Status:** Pending Approval

---

**Document Version:** 1.0  
**Last Updated:** 2024-12-19  
**Next Review:** Before v2.0.0
