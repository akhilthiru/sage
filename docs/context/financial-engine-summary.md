# Sage: Financial Engine Summary

**Deterministic Calculation Engines**

---

## Core Principle

**AI NEVER calculates. Engine ALWAYS calculates.**

```
User Question → Intent Extraction → Financial Engine → Structured Result → AI Explanation
```

All financial calculations are:
- **Deterministic** - Same input = same output
- **Pure functions** - No side effects
- **Testable** - 100% test coverage required
- **Reproducible** - Results can be verified
- **Independent** - No LLM involvement

---

## 6 Financial Engines

1. **Allocation Engine** - Monthly income distribution
2. **Goal Projection Engine** - Goal feasibility and timeline
3. **Purchase Simulation Engine** - Affordability scenarios
4. **Loan Simulation Engine** - EMI and loan feasibility
5. **Cash Flow Projection Engine** - Future financial state
6. **Confidence Engine** - Prediction confidence scoring

---

## 1. Allocation Engine

**Purpose:** Distribute monthly income across categories using waterfall priority.

### Algorithm

```typescript
function calculateAllocation(input: AllocationInput): Allocation {
  const { monthlyIncome, expenses, debts, goals, emergencyFundTarget, currentEmergencyFund } = input;
  
  let remaining = monthlyIncome;
  
  // 1. Essential Expenses (max 50% of income)
  const essentialExpenses = Math.min(
    sumEssentialExpenses(expenses),
    monthlyIncome * 0.50
  );
  remaining -= essentialExpenses;
  
  // 2. Debt Payments (minimum payments)
  const debtPayments = sumMinimumPayments(debts);
  remaining -= debtPayments;
  
  // 3. Emergency Fund (20% of surplus until target)
  const emergencyFundNeeded = emergencyFundTarget - currentEmergencyFund;
  const emergencyFund = currentEmergencyFund < emergencyFundTarget
    ? Math.min(remaining * 0.20, emergencyFundNeeded)
    : 0;
  remaining -= emergencyFund;
  
  // 4. Goal Savings (by priority, 60% of surplus)
  const goalSavings = allocateToGoals(goals, remaining * 0.60);
  remaining -= goalSavings;
  
  // 5. Investments (10-20% of surplus)
  const investments = remaining * 0.15;
  remaining -= investments;
  
  // 6. Discretionary (remainder)
  const discretionary = remaining;
  
  return {
    essentialExpenses,
    debtPayments,
    emergencyFund,
    goalSavings,
    investments,
    discretionary,
    totalIncome: monthlyIncome,
    totalAllocated: monthlyIncome
  };
}
```

### Waterfall Priority

1. **Essential Expenses** (50% max) - Rent, utilities, groceries
2. **Debt Payments** (minimum) - Cannot skip
3. **Emergency Fund** (20% surplus) - Until 6 months expenses
4. **Goal Savings** (60% surplus) - By priority (HIGH → MEDIUM → LOW)
5. **Investments** (15% surplus) - Long-term wealth
6. **Discretionary** (remainder) - Flexible spending

### Edge Cases

**Insufficient Income:**
```typescript
if (monthlyIncome < essentialExpenses + minimumDebtPayments) {
  return {
    warning: 'INCOME_INSUFFICIENT',
    message: 'Income does not cover essential expenses and debt',
    recommendation: 'Increase income or reduce expenses'
  };
}
```

**No Emergency Fund Target:**
```typescript
const defaultTarget = monthlyExpenses * 6; // 6 months
```

**Performance:** < 50ms

---

## 2. Goal Projection Engine

**Purpose:** Calculate if goal is achievable and when it will complete.

### Feasibility Calculation

```typescript
function calculateGoalFeasibility(goal: Goal, profile: FinancialProfile): FeasibilityResult {
  const monthsRemaining = monthsBetween(new Date(), goal.targetDate);
  const amountRemaining = goal.targetAmount - goal.currentAmount;
  const requiredMonthly = amountRemaining / monthsRemaining;
  
  // Get available monthly from allocation
  const allocation = calculateAllocation(profile);
  const availableMonthly = allocation.goalSavings; // Allocated to all goals
  
  // Calculate utilization
  const utilizationRatio = requiredMonthly / availableMonthly;
  
  // Determine feasibility
  const isFeasible = utilizationRatio <= 1.0;
  const feasibilityScore = Math.max(0, Math.min(100, (1 - utilizationRatio) * 100));
  
  // Project completion
  const projectedMonths = amountRemaining / availableMonthly;
  const projectedCompletionDate = addMonths(new Date(), projectedMonths);
  const delayMonths = Math.max(0, projectedMonths - monthsRemaining);
  
  return {
    isFeasible,
    feasibilityScore,
    requiredMonthly,
    availableMonthly,
    utilizationRatio,
    projectedCompletionDate,
    delayMonths,
    recommendations: generateRecommendations(utilizationRatio)
  };
}
```

### Feasibility Scoring

```
Score = (1 - utilizationRatio) * 100

utilizationRatio < 0.8  → Score > 20  → Feasible
utilizationRatio < 1.0  → Score > 0   → Tight but feasible
utilizationRatio >= 1.0 → Score = 0   → Infeasible
```

### Recommendations

```typescript
function generateRecommendations(utilizationRatio: number): string[] {
  if (utilizationRatio < 0.5) {
    return ['Goal is easily achievable', 'Consider increasing monthly contribution'];
  } else if (utilizationRatio < 0.8) {
    return ['Goal is on track', 'Maintain current contribution'];
  } else if (utilizationRatio < 1.0) {
    return ['Goal is tight', 'Consider reducing other expenses'];
  } else {
    return [
      'Goal is not feasible with current timeline',
      'Options: Extend timeline, increase income, or reduce target amount'
    ];
  }
}
```

**Performance:** < 100ms

---

## 3. Purchase Simulation Engine

**Purpose:** Simulate 3 scenarios for purchase affordability.

### Scenarios

**Scenario 1: Buy from Savings**
```typescript
function simulateBuyFromSavings(amount: number, profile: FinancialProfile): Scenario {
  const newSavings = profile.currentSavings - amount;
  const newEmergencyFund = Math.min(profile.currentEmergencyFund, newSavings);
  
  const isViable = newSavings >= 0 && newEmergencyFund >= profile.emergencyFundTarget * 0.5;
  
  return {
    type: 'BUY_FROM_SAVINGS',
    isViable,
    immediateImpact: { newSavings, newEmergencyFund },
    monthlyImpact: 0,
    totalCost: amount,
    timeline: 0,
    pros: ['Immediate purchase', 'No interest'],
    cons: isViable ? [] : ['Depletes emergency fund', 'Financial risk'],
    recommendation: isViable && newEmergencyFund >= profile.emergencyFundTarget
  };
}
```

**Scenario 2: Take Loan**
```typescript
function simulateLoan(amount: number, interestRate: number, tenure: number): Scenario {
  const emi = calculateEMI(amount, interestRate, tenure);
  const totalPayable = emi * tenure;
  const totalInterest = totalPayable - amount;
  
  const allocation = calculateAllocation(profile);
  const affordability = emi <= allocation.discretionary * 0.5 ? 'COMFORTABLE' : 
                       emi <= allocation.discretionary ? 'MANAGEABLE' : 'RISKY';
  
  return {
    type: 'LOAN_EMI',
    isViable: affordability !== 'RISKY',
    immediateImpact: { newSavings: profile.currentSavings },
    monthlyImpact: emi,
    totalCost: totalPayable,
    timeline: tenure,
    pros: ['Immediate purchase', 'Preserve savings'],
    cons: [`₹${totalInterest} interest`, 'Monthly commitment'],
    recommendation: affordability === 'COMFORTABLE'
  };
}
```

**Scenario 3: Save First**
```typescript
function simulateSaveFirst(amount: number, profile: FinancialProfile): Scenario {
  const allocation = calculateAllocation(profile);
  const monthlySavings = allocation.discretionary * 0.8; // 80% of discretionary
  const monthsNeeded = Math.ceil(amount / monthlySavings);
  
  return {
    type: 'SAVE_FIRST',
    isViable: true,
    immediateImpact: { newSavings: profile.currentSavings },
    monthlyImpact: -monthlySavings, // Negative = saving
    totalCost: amount,
    timeline: monthsNeeded,
    pros: ['No debt', 'No interest', 'Builds discipline'],
    cons: [`Wait ${monthsNeeded} months`],
    recommendation: true // Always recommended
  };
}
```

### Decision Logic

```typescript
function recommendScenario(scenarios: Scenario[]): string {
  // Prefer save first if timeline < 6 months
  if (scenarios[2].timeline <= 6) return 'SAVE_FIRST';
  
  // Prefer buy from savings if emergency fund safe
  if (scenarios[0].isViable && scenarios[0].recommendation) return 'BUY_FROM_SAVINGS';
  
  // Loan if comfortable
  if (scenarios[1].isViable && scenarios[1].recommendation) return 'LOAN_EMI';
  
  // Default to save first
  return 'SAVE_FIRST';
}
```

**Performance:** < 200ms (3 scenarios)

---

## 4. Loan Simulation Engine

**Purpose:** Calculate EMI and loan affordability.

### EMI Formula

```typescript
function calculateEMI(principal: number, annualRate: number, tenureMonths: number): number {
  const monthlyRate = annualRate / 12 / 100;
  
  if (monthlyRate === 0) return principal / tenureMonths;
  
  const emi = principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths) /
              (Math.pow(1 + monthlyRate, tenureMonths) - 1);
  
  return Math.round(emi * 100) / 100; // Round to 2 decimals
}
```

**Example:**
```
Principal: ₹500,000
Rate: 12% annual
Tenure: 12 months

monthlyRate = 12 / 12 / 100 = 0.01
EMI = 500000 * 0.01 * (1.01)^12 / ((1.01)^12 - 1)
EMI = ₹44,424
```

### Amortization Schedule

```typescript
function generateAmortizationSchedule(principal: number, rate: number, tenure: number): Schedule[] {
  const emi = calculateEMI(principal, rate, tenure);
  const monthlyRate = rate / 12 / 100;
  let balance = principal;
  
  const schedule = [];
  for (let month = 1; month <= tenure; month++) {
    const interest = balance * monthlyRate;
    const principalPaid = emi - interest;
    balance -= principalPaid;
    
    schedule.push({
      month,
      emi,
      principal: principalPaid,
      interest,
      balance: Math.max(0, balance)
    });
  }
  
  return schedule;
}
```

### Affordability Assessment

```typescript
function assessLoanAffordability(emi: number, profile: FinancialProfile): Affordability {
  const debtToIncomeRatio = (emi + currentDebtPayments) / monthlyIncome;
  
  if (debtToIncomeRatio <= 0.30) return 'COMFORTABLE';
  if (debtToIncomeRatio <= 0.40) return 'MANAGEABLE';
  if (debtToIncomeRatio <= 0.50) return 'RISKY';
  return 'UNAFFORDABLE';
}
```

**Thresholds:**
- **Comfortable:** Debt-to-income ≤ 30%
- **Manageable:** Debt-to-income ≤ 40%
- **Risky:** Debt-to-income ≤ 50%
- **Unaffordable:** Debt-to-income > 50%

**Performance:** < 100ms (including amortization)

---

## 5. Cash Flow Projection Engine

**Purpose:** Project future financial state month-by-month.

### Algorithm

```typescript
function projectCashFlow(profile: FinancialProfile, months: number): Projection[] {
  const projections = [];
  let currentSavings = profile.currentSavings;
  let currentEmergencyFund = profile.currentEmergencyFund;
  
  for (let month = 1; month <= months; month++) {
    const allocation = calculateAllocation({
      ...profile,
      currentSavings,
      currentEmergencyFund
    });
    
    // Update savings
    currentSavings += allocation.goalSavings + allocation.investments;
    currentEmergencyFund += allocation.emergencyFund;
    
    // Update goals
    const goalProgress = updateGoalProgress(goals, allocation.goalSavings);
    
    projections.push({
      month,
      savings: currentSavings,
      emergencyFund: currentEmergencyFund,
      allocation,
      goalProgress
    });
  }
  
  return projections;
}
```

### Goal Impact Analysis

```typescript
function analyzeGoalImpact(newGoal: Goal, existingGoals: Goal[]): Impact {
  const withoutNew = projectCashFlow(profile, 60);
  const withNew = projectCashFlow({ ...profile, goals: [...existingGoals, newGoal] }, 60);
  
  const delays = existingGoals.map(goal => ({
    goalId: goal.id,
    goalName: goal.name,
    originalCompletion: findCompletionMonth(withoutNew, goal.id),
    newCompletion: findCompletionMonth(withNew, goal.id),
    delayMonths: calculateDelay(withoutNew, withNew, goal.id)
  }));
  
  return { delays };
}
```

**Performance:** < 500ms for 60-month projection

---

## 6. Confidence Engine

**Purpose:** Calculate confidence in predictions based on data quality.

### Confidence Factors

```typescript
function calculateConfidence(profile: FinancialProfile, goal: Goal): ConfidenceScore {
  const factors = [
    {
      name: 'Profile Completeness',
      impact: profile.cfoUnderstandingScore >= 80 ? +20 : -20,
      reason: `Profile ${profile.cfoUnderstandingScore}% complete`
    },
    {
      name: 'Income Stability',
      impact: profile.otherIncome ? -10 : +10,
      reason: profile.otherIncome ? 'Variable income' : 'Stable income'
    },
    {
      name: 'Emergency Fund',
      impact: profile.currentEmergencyFund >= profile.emergencyFundTarget ? +15 : -15,
      reason: `Emergency fund ${profile.currentEmergencyFund >= profile.emergencyFundTarget ? 'adequate' : 'insufficient'}`
    },
    {
      name: 'Debt Load',
      impact: calculateDebtToIncomeRatio(profile) < 0.30 ? +10 : -10,
      reason: `Debt-to-income ${calculateDebtToIncomeRatio(profile) * 100}%`
    },
    {
      name: 'Goal Timeline',
      impact: monthsToGoal(goal) > 12 ? -10 : +10,
      reason: `${monthsToGoal(goal)} months timeline`
    }
  ];
  
  const baseConfidence = 50;
  const totalImpact = factors.reduce((sum, f) => sum + f.impact, 0);
  const confidence = Math.max(0, Math.min(100, baseConfidence + totalImpact));
  
  return { value: confidence, factors };
}
```

### Confidence Levels

```
90-100: Very High - Strong data, stable situation
70-89:  High - Good data, minor uncertainties
50-69:  Medium - Adequate data, some uncertainties
30-49:  Low - Limited data, significant uncertainties
0-29:   Very Low - Insufficient data, high uncertainty
```

**Performance:** < 50ms

---

## Common Utilities

### Income Normalization

```typescript
function normalizeToMonthly(amount: number, frequency: Frequency): number {
  const multipliers = {
    DAILY: 30,
    WEEKLY: 4.33,
    BIWEEKLY: 2.17,
    MONTHLY: 1,
    QUARTERLY: 1/3,
    ANNUAL: 1/12,
    ONE_TIME: 0
  };
  
  return amount * multipliers[frequency];
}
```

### Date Calculations

```typescript
function monthsBetween(start: Date, end: Date): number {
  return (end.getFullYear() - start.getFullYear()) * 12 + 
         (end.getMonth() - start.getMonth());
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}
```

### Rounding

```typescript
function roundToTwo(num: number): number {
  return Math.round(num * 100) / 100;
}

function roundToNearest(num: number, nearest: number = 100): number {
  return Math.round(num / nearest) * nearest;
}
```

---

## Testing Requirements

### Unit Tests (100% Coverage)

```typescript
describe('calculateEMI', () => {
  it('should calculate EMI correctly', () => {
    const emi = calculateEMI(500000, 12, 12);
    expect(emi).toBeCloseTo(44424, 0);
  });
  
  it('should handle zero interest rate', () => {
    const emi = calculateEMI(120000, 0, 12);
    expect(emi).toBe(10000);
  });
});

describe('calculateAllocation', () => {
  it('should prioritize essential expenses', () => {
    const allocation = calculateAllocation({
      monthlyIncome: 80000,
      expenses: [{ amount: 50000, isEssential: true }],
      debts: [],
      goals: []
    });
    
    expect(allocation.essentialExpenses).toBeLessThanOrEqual(40000); // 50% max
  });
});
```

### Edge Case Tests

```typescript
describe('Edge Cases', () => {
  it('should handle insufficient income', () => {
    const result = calculateAllocation({
      monthlyIncome: 30000,
      expenses: [{ amount: 40000, isEssential: true }],
      debts: [{ minimumPayment: 5000 }]
    });
    
    expect(result.warning).toBe('INCOME_INSUFFICIENT');
  });
  
  it('should handle zero savings', () => {
    const result = simulateBuyFromSavings(50000, {
      currentSavings: 0
    });
    
    expect(result.isViable).toBe(false);
  });
});
```

---

## Performance Benchmarks

| Engine | Target | Typical | Max Acceptable |
|--------|--------|---------|----------------|
| Allocation | < 50ms | 20ms | 100ms |
| Goal Feasibility | < 100ms | 50ms | 200ms |
| Purchase Simulation | < 200ms | 100ms | 500ms |
| Loan Simulation | < 100ms | 50ms | 200ms |
| Cash Flow (60mo) | < 500ms | 300ms | 1000ms |
| Confidence | < 50ms | 20ms | 100ms |

---

## Critical Rules

1. **Never use LLM for calculations** - Always deterministic functions
2. **Always validate inputs** - Zod schemas before calculation
3. **Always round appropriately** - Currency to 2 decimals
4. **Always handle edge cases** - Zero income, negative savings, etc.
5. **Always return confidence** - Acknowledge uncertainty
6. **Always cite formulas** - Show calculation steps
7. **Always test thoroughly** - 100% coverage for financial code

---

## Quick Reference

**Engines:** Allocation, Goal Projection, Purchase Simulation, Loan Simulation, Cash Flow, Confidence  
**Key Formula:** EMI = P × r × (1+r)^n / ((1+r)^n - 1)  
**Allocation Priority:** Essentials → Debt → Emergency → Goals → Investments → Discretionary  
**Feasibility:** utilizationRatio < 1.0 = feasible  
**Affordability:** Debt-to-income < 40% = manageable  
**Confidence:** Based on data completeness + stability factors  

**Performance:** All calculations < 1 second  
**Testing:** 100% coverage required  
**Principle:** Deterministic, reproducible, testable  

---

**Document Version:** 1.0  
**Last Updated:** 2024-12-19  
**Purpose:** Quick financial engine reference for AI sessions
