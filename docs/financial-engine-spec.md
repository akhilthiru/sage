# Sage: Financial Engine Specification

## Overview

This document provides complete specifications for all deterministic financial calculation engines in Sage. Every calculation is reproducible, testable, and independent of LLMs.

**Critical Principle:** LLMs explain results, engines calculate results. No AI involvement in financial calculations.

---

## Engine 1: Allocation Engine

**Purpose:** Distributes monthly income across financial priorities using a waterfall algorithm.

### Priority Order

1. **Essential Expenses** (50-60% of income)
2. **Debt Payments** (minimum payments required)
3. **Emergency Fund** (until target reached)
4. **Goal Savings** (by priority)
5. **Investments** (long-term wealth)
6. **Discretionary** (remaining balance)

### Input Parameters

```typescript
interface AllocationInput {
  userId: string;
  month: number;
  year: number;
  
  // Income
  monthlyIncome: number;
  otherIncome?: number;
  
  // Expenses
  essentialExpenses: Expense[];
  discretionaryExpenses: Expense[];
  
  // Debts
  debts: Debt[];
  
  // Emergency Fund
  emergencyFundTarget: number;
  currentEmergencyFund: number;
  
  // Goals
  goals: Goal[];
  
  // Risk Profile
  riskTolerance: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
}
```

### Algorithm

```typescript
function calculateAllocation(input: AllocationInput): Allocation {
  // Step 1: Calculate total income
  const totalIncome = input.monthlyIncome + (input.otherIncome || 0);
  
  let remaining = totalIncome;
  
  // Step 2: Allocate to essential expenses
  const essentialTotal = input.essentialExpenses
    .filter(e => e.isActive)
    .reduce((sum, e) => sum + normalizeToMonthly(e.amount, e.frequency), 0);
  
  const essentialExpenses = Math.min(essentialTotal, remaining);
  remaining -= essentialExpenses;
  
  // Step 3: Allocate to debt minimum payments
  const debtMinimumTotal = input.debts
    .filter(d => d.status === 'ACTIVE')
    .reduce((sum, d) => sum + d.minimumPayment, 0);
  
  const debtPayments = Math.min(debtMinimumTotal, remaining);
  remaining -= debtPayments;
  
  // Step 4: Allocate to emergency fund (if below target)
  const emergencyFundGap = Math.max(
    0, 
    input.emergencyFundTarget - input.currentEmergencyFund
  );
  
  // Allocate 20% of remaining or gap amount, whichever is smaller
  const emergencyFundAllocation = Math.min(
    emergencyFundGap,
    remaining * 0.20,
    remaining
  );
  
  const emergencyFund = emergencyFundAllocation;
  remaining -= emergencyFund;
  
  // Step 5: Allocate to goals (by priority)
  const sortedGoals = input.goals
    .filter(g => g.status === 'ACTIVE')
    .sort((a, b) => {
      // Priority order: HIGH > MEDIUM > LOW
      const priorityWeight = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      if (priorityWeight[a.priority] !== priorityWeight[b.priority]) {
        return priorityWeight[b.priority] - priorityWeight[a.priority];
      }
      // If same priority, sort by target date (earlier first)
      return new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime();
    });
  
  let goalSavings = 0;
  const goalAllocations: Record<string, number> = {};
  
  for (const goal of sortedGoals) {
    const monthsRemaining = monthsBetween(new Date(), goal.targetDate);
    const remainingAmount = goal.targetAmount - goal.currentAmount;
    const requiredMonthly = monthsRemaining > 0 
      ? remainingAmount / monthsRemaining 
      : remainingAmount;
    
    const allocation = Math.min(requiredMonthly, remaining);
    
    if (allocation > 0) {
      goalAllocations[goal.id] = allocation;
      goalSavings += allocation;
      remaining -= allocation;
    }
  }
  
  // Step 6: Allocate to investments (if emergency fund met)
  let investments = 0;
  if (input.currentEmergencyFund >= input.emergencyFundTarget && remaining > 0) {
    // Allocate based on risk tolerance
    const investmentPercentage = {
      CONSERVATIVE: 0.30,  // 30% of remaining
      MODERATE: 0.50,      // 50% of remaining
      AGGRESSIVE: 0.70     // 70% of remaining
    };
    
    investments = remaining * investmentPercentage[input.riskTolerance];
    remaining -= investments;
  }
  
  // Step 7: Remaining goes to discretionary
  const discretionary = remaining;
  
  return {
    userId: input.userId,
    month: input.month,
    year: input.year,
    essentialExpenses,
    debtPayments,
    emergencyFund,
    goalSavings,
    investments,
    discretionary,
    totalIncome,
    totalAllocated: totalIncome,
    isActive: true,
    goalAllocations, // Detailed breakdown
    createdAt: new Date(),
    updatedAt: new Date()
  };
}
```

### Helper Functions

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

function monthsBetween(start: Date, end: Date): number {
  const yearDiff = end.getFullYear() - start.getFullYear();
  const monthDiff = end.getMonth() - start.getMonth();
  return yearDiff * 12 + monthDiff;
}
```

### Business Rules

1. **Income Validation:** Total income must be > 0
2. **Essential Cap:** Essential expenses should not exceed 60% of income (warning if exceeded)
3. **Debt Priority:** Minimum payments always prioritized
4. **Emergency Fund:** 20% allocation until target reached
5. **Goal Feasibility:** If total goal requirements > available, flag as infeasible
6. **Investment Threshold:** Only invest after emergency fund is met

### Edge Cases

**Case 1: Income < Essential Expenses**
```typescript
if (essentialTotal > totalIncome) {
  // Flag critical situation
  return {
    ...allocation,
    warning: 'INCOME_INSUFFICIENT',
    message: 'Income does not cover essential expenses',
    shortfall: essentialTotal - totalIncome
  };
}
```

**Case 2: No Remaining After Debts**
```typescript
if (remaining <= 0 after debt payments) {
  // All other allocations = 0
  // Flag need to increase income or reduce expenses
}
```

**Case 3: Multiple High-Priority Goals**
```typescript
// Distribute proportionally based on required monthly amounts
const totalRequired = goals.reduce((sum, g) => sum + g.requiredMonthly, 0);
goals.forEach(g => {
  g.allocation = (g.requiredMonthly / totalRequired) * availableForGoals;
});
```

### Test Cases

**Test 1: Standard Allocation**
```typescript
Input:
  monthlyIncome: 80000
  essentialExpenses: 40000
  debtPayments: 10000
  emergencyFundTarget: 210000
  currentEmergencyFund: 150000
  goals: [{ required: 15000, priority: HIGH }]
  riskTolerance: MODERATE

Expected Output:
  essentialExpenses: 40000
  debtPayments: 10000
  emergencyFund: 6000 (20% of 30000)
  goalSavings: 15000
  investments: 4500 (50% of 9000)
  discretionary: 4500
  totalAllocated: 80000
```

**Test 2: Emergency Fund Priority**
```typescript
Input:
  monthlyIncome: 50000
  essentialExpenses: 30000
  emergencyFundTarget: 150000
  currentEmergencyFund: 0

Expected Output:
  essentialExpenses: 30000
  emergencyFund: 4000 (20% of 20000)
  investments: 0 (emergency fund not met)
  goalSavings: 0 (after emergency fund)
  discretionary: 16000
```

**Test 3: Insufficient Income**
```typescript
Input:
  monthlyIncome: 40000
  essentialExpenses: 50000

Expected Output:
  essentialExpenses: 40000
  warning: 'INCOME_INSUFFICIENT'
  shortfall: 10000
  All other allocations: 0
```

### Performance Requirements

- Calculation time: < 50ms
- Memory usage: < 1MB
- Supports up to 100 expenses, 10 debts, 20 goals

---

## Engine 2: Goal Projection Engine

**Purpose:** Calculates goal feasibility, timeline, and confidence score.

### Input Parameters

```typescript
interface GoalProjectionInput {
  goal: Goal;
  monthlyIncome: number;
  monthlyExpenses: number;
  otherGoalCommitments: number;
  currentSavings: number;
  emergencyFundStatus: 'MET' | 'NOT_MET';
}
```

### Feasibility Calculation

```typescript
function calculateGoalFeasibility(input: GoalProjectionInput): FeasibilityResult {
  const { goal, monthlyIncome, monthlyExpenses, otherGoalCommitments } = input;
  
  // Step 1: Calculate available surplus
  const monthlySurplus = monthlyIncome - monthlyExpenses;
  const availableForGoal = monthlySurplus - otherGoalCommitments;
  
  // Step 2: Calculate required monthly contribution
  const monthsRemaining = monthsBetween(new Date(), goal.targetDate);
  const remainingAmount = goal.targetAmount - goal.currentAmount;
  
  if (monthsRemaining <= 0) {
    return {
      isFeasible: false,
      feasibilityScore: 0,
      reason: 'Target date is in the past',
      requiredMonthly: 0,
      availableMonthly: availableForGoal
    };
  }
  
  const requiredMonthly = remainingAmount / monthsRemaining;
  
  // Step 3: Calculate feasibility
  const utilizationRatio = requiredMonthly / availableForGoal;
  
  let isFeasible: boolean;
  let feasibilityScore: number;
  
  if (utilizationRatio <= 0.5) {
    // Comfortable - using <= 50% of available
    isFeasible = true;
    feasibilityScore = 100;
  } else if (utilizationRatio <= 0.8) {
    // Tight but feasible - using 50-80% of available
    isFeasible = true;
    feasibilityScore = Math.round(100 - ((utilizationRatio - 0.5) / 0.3) * 30);
  } else if (utilizationRatio <= 1.0) {
    // Very tight - using 80-100% of available
    isFeasible = true;
    feasibilityScore = Math.round(70 - ((utilizationRatio - 0.8) / 0.2) * 40);
  } else {
    // Not feasible - requires more than available
    isFeasible = false;
    feasibilityScore = Math.round(30 / utilizationRatio);
  }
  
  // Step 4: Adjust for emergency fund status
  if (input.emergencyFundStatus === 'NOT_MET') {
    feasibilityScore = Math.round(feasibilityScore * 0.8); // 20% penalty
  }
  
  // Step 5: Calculate projected completion date
  const projectedMonths = availableForGoal > 0 
    ? Math.ceil(remainingAmount / availableForGoal)
    : Infinity;
  
  const projectedCompletionDate = new Date();
  projectedCompletionDate.setMonth(projectedCompletionDate.getMonth() + projectedMonths);
  
  return {
    isFeasible,
    feasibilityScore: Math.max(0, Math.min(100, feasibilityScore)),
    requiredMonthly,
    availableMonthly: availableForGoal,
    utilizationRatio,
    projectedCompletionDate,
    delayMonths: Math.max(0, projectedMonths - monthsRemaining),
    recommendations: generateRecommendations(
      isFeasible,
      requiredMonthly,
      availableForGoal,
      goal
    )
  };
}
```

### Confidence Score Calculation

```typescript
function calculateConfidenceScore(
  goal: Goal,
  feasibilityScore: number,
  historicalConsistency: number = 100
): ConfidenceScore {
  const factors: ConfidenceFactor[] = [];
  
  let baseScore = feasibilityScore;
  
  // Factor 1: Timeline length (longer = more uncertainty)
  const monthsRemaining = monthsBetween(new Date(), goal.targetDate);
  let timelineFactor = 0;
  
  if (monthsRemaining <= 6) {
    timelineFactor = 10; // Short term = high confidence
    factors.push({ name: 'Timeline', impact: 10, reason: 'Short-term goal (< 6 months)' });
  } else if (monthsRemaining <= 24) {
    timelineFactor = 0; // Medium term = neutral
    factors.push({ name: 'Timeline', impact: 0, reason: 'Medium-term goal (6-24 months)' });
  } else {
    timelineFactor = -15; // Long term = lower confidence
    factors.push({ name: 'Timeline', impact: -15, reason: 'Long-term goal (> 24 months)' });
  }
  
  // Factor 2: Historical consistency (if data available)
  let consistencyFactor = 0;
  if (historicalConsistency >= 90) {
    consistencyFactor = 10;
    factors.push({ name: 'Consistency', impact: 10, reason: 'Excellent savings track record' });
  } else if (historicalConsistency >= 70) {
    consistencyFactor = 0;
    factors.push({ name: 'Consistency', impact: 0, reason: 'Good savings track record' });
  } else {
    consistencyFactor = -10;
    factors.push({ name: 'Consistency', impact: -10, reason: 'Inconsistent savings history' });
  }
  
  // Factor 3: Goal priority
  let priorityFactor = 0;
  if (goal.priority === 'HIGH') {
    priorityFactor = 5;
    factors.push({ name: 'Priority', impact: 5, reason: 'High-priority goal' });
  }
  
  // Factor 4: Current progress
  const progressRatio = goal.currentAmount / goal.targetAmount;
  let progressFactor = 0;
  
  if (progressRatio >= 0.5) {
    progressFactor = 10;
    factors.push({ name: 'Progress', impact: 10, reason: 'Already 50%+ complete' });
  } else if (progressRatio >= 0.25) {
    progressFactor = 5;
    factors.push({ name: 'Progress', impact: 5, reason: 'Good progress (25%+)' });
  }
  
  const finalScore = Math.max(0, Math.min(100, 
    baseScore + timelineFactor + consistencyFactor + priorityFactor + progressFactor
  ));
  
  return {
    value: Math.round(finalScore),
    factors
  };
}
```

### Recommendation Generation

```typescript
function generateRecommendations(
  isFeasible: boolean,
  requiredMonthly: number,
  availableMonthly: number,
  goal: Goal
): string[] {
  const recommendations: string[] = [];
  
  if (!isFeasible) {
    const shortfall = requiredMonthly - availableMonthly;
    
    // Option 1: Extend timeline
    const newMonths = Math.ceil(
      (goal.targetAmount - goal.currentAmount) / availableMonthly
    );
    const monthsToAdd = newMonths - monthsBetween(new Date(), goal.targetDate);
    recommendations.push(
      `Extend timeline by ${monthsToAdd} months to make goal achievable`
    );
    
    // Option 2: Reduce target
    const affordableTarget = goal.currentAmount + 
      (availableMonthly * monthsBetween(new Date(), goal.targetDate));
    const reduction = goal.targetAmount - affordableTarget;
    recommendations.push(
      `Reduce target amount by ₹${reduction.toLocaleString('en-IN')} to ₹${affordableTarget.toLocaleString('en-IN')}`
    );
    
    // Option 3: Increase income
    recommendations.push(
      `Increase monthly income by ₹${shortfall.toLocaleString('en-IN')} or reduce expenses by the same amount`
    );
  } else if (requiredMonthly / availableMonthly > 0.8) {
    // Tight but feasible
    recommendations.push(
      'Goal is achievable but leaves little room for unexpected expenses'
    );
    recommendations.push(
      'Consider building emergency fund first for financial security'
    );
  } else {
    // Comfortable
    recommendations.push(
      'Goal is comfortably achievable with current finances'
    );
    
    if (requiredMonthly / availableMonthly < 0.5) {
      recommendations.push(
        'You could achieve this goal faster or add additional goals'
      );
    }
  }
  
  return recommendations;
}
```

### Test Cases

**Test 1: Feasible Goal**
```typescript
Input:
  goal: { targetAmount: 300000, currentAmount: 0, targetDate: +24 months }
  monthlyIncome: 80000
  monthlyExpenses: 50000
  otherGoalCommitments: 10000

Calculation:
  availableMonthly = 80000 - 50000 - 10000 = 20000
  requiredMonthly = 300000 / 24 = 12500
  utilizationRatio = 12500 / 20000 = 0.625 (62.5%)

Expected Output:
  isFeasible: true
  feasibilityScore: 79 (100 - ((0.625-0.5)/0.3)*30)
  requiredMonthly: 12500
  availableMonthly: 20000
```

**Test 2: Infeasible Goal**
```typescript
Input:
  goal: { targetAmount: 500000, currentAmount: 0, targetDate: +12 months }
  monthlyIncome: 60000
  monthlyExpenses: 50000

Calculation:
  availableMonthly = 10000
  requiredMonthly = 500000 / 12 = 41667
  utilizationRatio = 4.17

Expected Output:
  isFeasible: false
  feasibilityScore: 7 (30 / 4.17)
  recommendations: [extend timeline, reduce target, increase income]
```

### Performance Requirements

- Calculation time: < 10ms
- Supports concurrent calculations for multiple goals

---

## Engine 3: Purchase Simulation Engine

**Purpose:** Simulates purchase scenarios and recommends best approach.

### Input Parameters

```typescript
interface PurchaseSimulationInput {
  purchaseAmount: number;
  item?: string;
  currentSavings: number;
  emergencyFundTarget: number;
  currentEmergencyFund: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  activeGoals: Goal[];
  existingDebts: Debt[];
}
```

### Simulation Algorithm

```typescript
function simulatePurchase(input: PurchaseSimulationInput): PurchaseSimulationResult {
  const scenarios: PurchaseScenario[] = [];
  
  // Scenario 1: Buy from savings now
  const savingsScenario = simulateBuyFromSavings(input);
  scenarios.push(savingsScenario);
  
  // Scenario 2: Take loan/EMI
  const loanScenario = simulateLoan(input);
  scenarios.push(loanScenario);
  
  // Scenario 3: Save first, then buy
  const saveFirstScenario = simulateSaveFirst(input);
  scenarios.push(saveFirstScenario);
  
  // Determine recommended scenario
  const recommended = determineRecommendation(scenarios);
  
  return {
    purchaseAmount: input.purchaseAmount,
    item: input.item,
    scenarios,
    recommended,
    canAfford: scenarios.some(s => s.isViable),
    confidence: calculatePurchaseConfidence(scenarios, input)
  };
}
```

### Scenario 1: Buy from Savings

```typescript
function simulateBuyFromSavings(input: PurchaseSimulationInput): PurchaseScenario {
  const newSavings = input.currentSavings - input.purchaseAmount;
  const newEmergencyFund = Math.max(0, 
    Math.min(input.currentEmergencyFund, newSavings)
  );
  
  const emergencyFundImpact = input.currentEmergencyFund - newEmergencyFund;
  const emergencyFundShortfall = Math.max(0, 
    input.emergencyFundTarget - newEmergencyFund
  );
  
  // Check impact on goals
  const goalImpacts = input.activeGoals.map(goal => {
    // If savings drop below emergency fund target, goals may be delayed
    if (newSavings < input.emergencyFundTarget) {
      const monthsToRecover = Math.ceil(
        emergencyFundShortfall / (input.monthlyIncome - input.monthlyExpenses)
      );
      return {
        goalId: goal.id,
        goalName: goal.name,
        delayMonths: monthsToRecover
      };
    }
    return {
      goalId: goal.id,
      goalName: goal.name,
      delayMonths: 0
    };
  });
  
  const isViable = newSavings >= 0 && 
                   newEmergencyFund >= input.emergencyFundTarget * 0.5; // At least 50% of target
  
  return {
    type: 'BUY_FROM_SAVINGS',
    isViable,
    immediateImpact: {
      newSavings,
      newEmergencyFund,
      emergencyFundImpact
    },
    goalImpacts,
    monthlyImpact: 0,
    totalCost: input.purchaseAmount,
    timeline: 0, // Immediate
    pros: [
      'No interest or fees',
      'Immediate purchase',
      'No monthly commitment'
    ],
    cons: newEmergencyFund < input.emergencyFundTarget 
      ? ['Reduces emergency fund below target', 'May delay other goals']
      : [],
    recommendation: isViable && newEmergencyFund >= input.emergencyFundTarget
  };
}
```

### Scenario 2: Loan/EMI

```typescript
function simulateLoan(input: PurchaseSimulationInput): PurchaseScenario {
  // Assume typical personal loan terms
  const interestRate = 12; // 12% annual
  const tenure = 12; // 12 months
  
  const emi = calculateEMI(input.purchaseAmount, interestRate, tenure);
  const totalCost = emi * tenure;
  const totalInterest = totalCost - input.purchaseAmount;
  
  // Check affordability
  const monthlySurplus = input.monthlyIncome - input.monthlyExpenses;
  const existingEMIs = input.existingDebts
    .filter(d => d.status === 'ACTIVE')
    .reduce((sum, d) => sum + d.monthlyPayment, 0);
  
  const newTotalEMI = existingEMIs + emi;
  const debtToIncomeRatio = newTotalEMI / input.monthlyIncome;
  
  const isViable = debtToIncomeRatio <= 0.40 && emi <= monthlySurplus * 0.5;
  
  // Calculate goal impact
  const availableAfterEMI = monthlySurplus - emi;
  const goalImpacts = input.activeGoals.map(goal => {
    const monthsRemaining = monthsBetween(new Date(), goal.targetDate);
    const requiredMonthly = (goal.targetAmount - goal.currentAmount) / monthsRemaining;
    
    if (requiredMonthly > availableAfterEMI) {
      const newMonthsRequired = Math.ceil(
        (goal.targetAmount - goal.currentAmount) / availableAfterEMI
      );
      return {
        goalId: goal.id,
        goalName: goal.name,
        delayMonths: newMonthsRequired - monthsRemaining
      };
    }
    return {
      goalId: goal.id,
      goalName: goal.name,
      delayMonths: 0
    };
  });
  
  return {
    type: 'LOAN_EMI',
    isViable,
    immediateImpact: {
      newSavings: input.currentSavings, // Unchanged
      newEmergencyFund: input.currentEmergencyFund // Unchanged
    },
    monthlyImpact: emi,
    totalCost,
    totalInterest,
    timeline: 0, // Immediate purchase
    tenure,
    debtToIncomeRatio,
    goalImpacts,
    pros: [
      'No impact on savings',
      'Immediate purchase',
      'Spreads cost over time'
    ],
    cons: [
      `Additional ₹${totalInterest.toLocaleString('en-IN')} in interest`,
      `Monthly commitment of ₹${emi.toLocaleString('en-IN')}`,
      debtToIncomeRatio > 0.30 ? 'High debt-to-income ratio' : ''
    ].filter(Boolean),
    recommendation: isViable && debtToIncomeRatio <= 0.30
  };
}
```

### Scenario 3: Save First

```typescript
function simulateSaveFirst(input: PurchaseSimulationInput): PurchaseScenario {
  const monthlySurplus = input.monthlyIncome - input.monthlyExpenses;
  
  // Allocate 50% of surplus to saving for this purchase
  const monthlySavings = monthlySurplus * 0.5;
  const monthsToSave = Math.ceil(input.purchaseAmount / monthlySavings);
  
  const isViable = monthlySavings > 0;
  
  return {
    type: 'SAVE_FIRST',
    isViable,
    immediateImpact: {
      newSavings: input.currentSavings, // Unchanged initially
      newEmergencyFund: input.currentEmergencyFund // Unchanged
    },
    monthlyImpact: -monthlySavings, // Negative = saving
    totalCost: input.purchaseAmount,
    timeline: monthsToSave,
    goalImpacts: [], // Minimal impact if saving alongside goals
    pros: [
      'No interest or fees',
      'No impact on emergency fund',
      'Builds discipline',
      'Can cancel anytime'
    ],
    cons: [
      `Wait ${monthsToSave} months for purchase`,
      'Requires discipline'
    ],
    recommendation: true // Always a viable option
  };
}
```

### Recommendation Logic

```typescript
function determineRecommendation(scenarios: PurchaseScenario[]): string {
  const viable = scenarios.filter(s => s.isViable);
  
  if (viable.length === 0) {
    return 'NONE'; // Cannot afford
  }
  
  // Priority order:
  // 1. Save first (if timeline reasonable)
  const saveFirst = scenarios.find(s => s.type === 'SAVE_FIRST');
  if (saveFirst && saveFirst.timeline <= 6) {
    return 'SAVE_FIRST';
  }
  
  // 2. Buy from savings (if emergency fund safe)
  const fromSavings = scenarios.find(s => s.type === 'BUY_FROM_SAVINGS');
  if (fromSavings && fromSavings.recommendation) {
    return 'BUY_FROM_SAVINGS';
  }
  
  // 3. Loan (if affordable)
  const loan = scenarios.find(s => s.type === 'LOAN_EMI');
  if (loan && loan.recommendation) {
    return 'LOAN_EMI';
  }
  
  // 4. Save first (even if longer)
  if (saveFirst) {
    return 'SAVE_FIRST';
  }
  
  return 'NONE';
}
```

### Test Cases

**Test 1: Can Afford from Savings**
```typescript
Input:
  purchaseAmount: 50000
  currentSavings: 300000
  emergencyFundTarget: 210000
  currentEmergencyFund: 210000
  monthlyIncome: 80000
  monthlyExpenses: 50000

Expected:
  Scenario 1 (Savings): viable=true, newSavings=250000, recommended=true
  Scenario 2 (Loan): viable=true, emi=4442, recommended=false
  Scenario 3 (Save): viable=true, timeline=2, recommended=false
  Overall Recommendation: BUY_FROM_SAVINGS
```

**Test 2: Should Save First**
```typescript
Input:
  purchaseAmount: 50000
  currentSavings: 200000
  emergencyFundTarget: 210000
  currentEmergencyFund: 150000

Expected:
  Scenario 1 (Savings): viable=false (emergency fund impact)
  Scenario 2 (Loan): viable=true but not recommended
  Scenario 3 (Save): viable=true, timeline=3, recommended=true
  Overall Recommendation: SAVE_FIRST
```

### Performance Requirements

- Calculation time: < 100ms
- All three scenarios calculated in parallel

---

## Engine 4: Loan Simulation Engine

**Purpose:** Calculates EMI, amortization, and loan affordability.

### EMI Calculation Formula

```typescript
function calculateEMI(
  principal: number,
  annualInterestRate: number,
  tenureMonths: number
): number {
  // EMI = P × r × (1 + r)^n / ((1 + r)^n - 1)
  // where:
  //   P = Principal loan amount
  //   r = Monthly interest rate (annual rate / 12 / 100)
  //   n = Tenure in months
  
  const r = annualInterestRate / 12 / 100;
  const n = tenureMonths;
  
  if (r === 0) {
    // No interest case
    return principal / n;
  }
  
  const emi = principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
  
  return Math.round(emi * 100) / 100; // Round to 2 decimals
}
```

### Amortization Schedule

```typescript
function generateAmortizationSchedule(
  principal: number,
  annualInterestRate: number,
  tenureMonths: number
): AmortizationEntry[] {
  const emi = calculateEMI(principal, annualInterestRate, tenureMonths);
  const monthlyRate = annualInterestRate / 12 / 100;
  
  let balance = principal;
  const schedule: AmortizationEntry[] = [];
  
  for (let month = 1; month <= tenureMonths; month++) {
    const interestPayment = balance * monthlyRate;
    const principalPayment = emi - interestPayment;
    balance -= principalPayment;
    
    // Handle final month rounding
    if (month === tenureMonths) {
      balance = 0;
    }
    
    schedule.push({
      month,
      emi: Math.round(emi * 100) / 100,
      principal: Math.round(principalPayment * 100) / 100,
      interest: Math.round(interestPayment * 100) / 100,
      balance: Math.round(Math.max(0, balance) * 100) / 100
    });
  }
  
  return schedule;
}
```

### Affordability Assessment

```typescript
function assessLoanAffordability(
  emi: number,
  monthlyIncome: number,
  existingEMIs: number,
  monthlyExpenses: number
): AffordabilityAssessment {
  const totalEMI = emi + existingEMIs;
  const debtToIncomeRatio = totalEMI / monthlyIncome;
  const monthlySurplus = monthlyIncome - monthlyExpenses - totalEMI;
  
  let affordability: 'COMFORTABLE' | 'MANAGEABLE' | 'RISKY' | 'UNAFFORDABLE';
  let recommendation: string;
  
  if (debtToIncomeRatio <= 0.30 && monthlySurplus > monthlyIncome * 0.2) {
    affordability = 'COMFORTABLE';
    recommendation = 'This loan is comfortably affordable';
  } else if (debtToIncomeRatio <= 0.40 && monthlySurplus > 0) {
    affordability = 'MANAGEABLE';
    recommendation = 'This loan is manageable but leaves limited flexibility';
  } else if (debtToIncomeRatio <= 0.50) {
    affordability = 'RISKY';
    recommendation = 'This loan is risky. Consider reducing loan amount or extending tenure';
  } else {
    affordability = 'UNAFFORDABLE';
    recommendation = 'This loan is not affordable with current income';
  }
  
  return {
    affordability,
    debtToIncomeRatio: Math.round(debtToIncomeRatio * 100),
    monthlySurplus,
    recommendation,
    maxAffordableEMI: monthlyIncome * 0.40 - existingEMIs
  };
}
```

### Prepayment Scenarios

```typescript
function calculatePrepaymentImpact(
  principal: number,
  annualInterestRate: number,
  tenureMonths: number,
  prepaymentAmount: number,
  prepaymentMonth: number
): PrepaymentImpact {
  // Calculate original loan details
  const originalEMI = calculateEMI(principal, annualInterestRate, tenureMonths);
  const originalSchedule = generateAmortizationSchedule(principal, annualInterestRate, tenureMonths);
  const originalTotalInterest = originalSchedule.reduce((sum, entry) => sum + entry.interest, 0);
  
  // Calculate balance at prepayment month
  const balanceAtPrepayment = originalSchedule[prepaymentMonth - 1].balance;
  const newPrincipal = balanceAtPrepayment - prepaymentAmount;
  const remainingTenure = tenureMonths - prepaymentMonth;
  
  // Calculate new loan details
  const newEMI = calculateEMI(newPrincipal, annualInterestRate, remainingTenure);
  const newSchedule = generateAmortizationSchedule(newPrincipal, annualInterestRate, remainingTenure);
  const newTotalInterest = newSchedule.reduce((sum, entry) => sum + entry.interest, 0);
  
  // Calculate interest already paid
  const interestPaidSoFar = originalSchedule
    .slice(0, prepaymentMonth)
    .reduce((sum, entry) => sum + entry.interest, 0);
  
  const totalInterestSaved = originalTotalInterest - (interestPaidSoFar + newTotalInterest);
  
  return {
    originalEMI,
    newEMI,
    emiReduction: originalEMI - newEMI,
    originalTotalInterest,
    newTotalInterest: interestPaidSoFar + newTotalInterest,
    interestSaved: totalInterestSaved,
    newTenure: remainingTenure
  };
}
```

### Test Cases

**Test 1: Standard EMI Calculation**
```typescript
Input:
  principal: 500000
  annualInterestRate: 12
  tenureMonths: 24

Calculation:
  r = 12 / 12 / 100 = 0.01
  n = 24
  EMI = 500000 × 0.01 × (1.01)^24 / ((1.01)^24 - 1)
      = 500000 × 0.01 × 1.2697 / 0.2697
      = 23539.23

Expected Output:
  emi: 23539.23
  totalPayable: 564941.52
  totalInterest: 64941.52
```

**Test 2: Affordability Assessment**
```typescript
Input:
  emi: 23539
  monthlyIncome: 80000
  existingEMIs: 10000
  monthlyExpenses: 40000

Calculation:
  totalEMI = 33539
  debtToIncomeRatio = 33539 / 80000 = 0.419 (41.9%)
  surplus = 80000 - 40000 - 33539 = 6461

Expected Output:
  affordability: 'MANAGEABLE'
  debtToIncomeRatio: 42%
  recommendation: 'Manageable but limited flexibility'
```

### Performance Requirements

- EMI calculation: < 1ms
- Amortization schedule (360 months): < 10ms
- Prepayment scenarios: < 50ms

---

## Engine 5: Cash Flow Projection Engine

**Purpose:** Projects month-by-month cash flow for planning.

### Input Parameters

```typescript
interface CashFlowProjectionInput {
  startDate: Date;
  months: number; // Number of months to project
  currentBalance: number;
  monthlyIncome: number;
  expenses: Expense[];
  debts: Debt[];
  goals: Goal[];
  allocation: Allocation;
}
```

### Projection Algorithm

```typescript
function projectCashFlow(input: CashFlowProjectionInput): CashFlowProjection {
  const projections: MonthlyProjection[] = [];
  let balance = input.currentBalance;
  
  const startDate = new Date(input.startDate);
  
  for (let i = 0; i < input.months; i++) {
    const month = new Date(startDate);
    month.setMonth(month.getMonth() + i);
    
    // Income
    const income = input.monthlyIncome;
    
    // Expenses
    const expenses = input.expenses
      .filter(e => e.isActive && isExpenseActiveInMonth(e, month))
      .reduce((sum, e) => sum + normalizeToMonthly(e.amount, e.frequency), 0);
    
    // Debt payments
    const debtPayments = input.debts
      .filter(d => d.status === 'ACTIVE')
      .reduce((sum, d) => sum + d.monthlyPayment, 0);
    
    // Goal contributions
    const goalContributions = input.allocation.goalSavings;
    
    // Emergency fund contribution
    const emergencyFund = input.allocation.emergencyFund;
    
    // Investments
    const investments = input.allocation.investments;
    
    // Calculate net change
    const totalInflow = income;
    const totalOutflow = expenses + debtPayments + goalContributions + 
                         emergencyFund + investments;
    const netChange = totalInflow - totalOutflow;
    
    balance += netChange;
    
    // Identify milestones
    const milestones = identifyMilestones(month, balance, input.goals);
    
    projections.push({
      month: month.toISOString().substring(0, 7), // YYYY-MM
      income,
      expenses,
      debtPayments,
      goalContributions,
      emergencyFund,
      investments,
      netChange,
      balance,
      milestones
    });
  }
  
  return {
    startDate: input.startDate,
    endDate: new Date(startDate.setMonth(startDate.getMonth() + input.months)),
    projections,
    summary: {
      totalIncome: projections.reduce((sum, p) => sum + p.income, 0),
      totalExpenses: projections.reduce((sum, p) => sum + p.expenses, 0),
      totalSavings: projections.reduce((sum, p) => sum + p.goalContributions + p.emergencyFund + p.investments, 0),
      finalBalance: balance
    }
  };
}
```

### Helper Functions

```typescript
function isExpenseActiveInMonth(expense: Expense, month: Date): boolean {
  if (expense.startDate > month) return false;
  if (expense.endDate && expense.endDate < month) return false;
  return true;
}

function identifyMilestones(
  month: Date,
  balance: number,
  goals: Goal[]
): Milestone[] {
  const milestones: Milestone[] = [];
  
  // Check for goal milestones
  goals.forEach(goal => {
    goal.milestones?.forEach(milestone => {
      const milestoneDate = new Date(milestone.targetDate);
      if (milestoneDate.getMonth() === month.getMonth() &&
          milestoneDate.getFullYear() === month.getFullYear()) {
        milestones.push({
          type: 'GOAL_MILESTONE',
          description: `${goal.name}: ${milestone.name}`,
          amount: milestone.targetAmount
        });
      }
    });
  });
  
  return milestones;
}
```

### Test Cases

**Test 1: 12-Month Projection**
```typescript
Input:
  startDate: 2024-01-01
  months: 12
  currentBalance: 200000
  monthlyIncome: 80000
  expenses: 50000/month
  debts: 10000/month
  goalSavings: 15000/month

Expected Output:
  Month 1: balance = 200000 + (80000 - 50000 - 10000 - 15000) = 205000
  Month 12: balance = 200000 + (5000 * 12) = 260000
```

### Performance Requirements

- Projection time: < 50ms for 12 months
- Supports up to 60 months projection

---

## Engine 6: Confidence Engine

**Purpose:** Calculates confidence scores for predictions and recommendations.

### Confidence Score Formula

```typescript
function calculateConfidenceScore(factors: ConfidenceFactor[]): number {
  const baseScore = 50; // Start at 50%
  
  const totalImpact = factors.reduce((sum, factor) => sum + factor.impact, 0);
  
  const finalScore = baseScore + totalImpact;
  
  return Math.max(0, Math.min(100, finalScore));
}
```

### Data Completeness Assessment

```typescript
function assessDataCompleteness(profile: FinancialProfile): DataCompletenessScore {
  const requiredFields = [
    'monthlyIncome',
    'currentSavings',
    'emergencyFundTarget'
  ];
  
  const importantFields = [
    'otherIncome',
    'riskTolerance',
    'primaryGoal'
  ];
  
  const optionalFields = [
    'currentEmergencyFund'
  ];
  
  const requiredComplete = requiredFields.filter(f => profile[f] != null).length;
  const importantComplete = importantFields.filter(f => profile[f] != null).length;
  const optionalComplete = optionalFields.filter(f => profile[f] != null).length;
  
  const score = (
    (requiredComplete / requiredFields.length) * 50 +
    (importantComplete / importantFields.length) * 30 +
    (optionalComplete / optionalFields.length) * 20
  );
  
  return {
    score: Math.round(score),
    requiredComplete,
    requiredTotal: requiredFields.length,
    importantComplete,
    importantTotal: importantFields.length,
    missingFields: [
      ...requiredFields.filter(f => profile[f] == null),
      ...importantFields.filter(f => profile[f] == null)
    ]
  };
}
```

### Performance Requirements

- Calculation time: < 5ms

---

## Cross-Engine Validation

### Consistency Checks

1. **Allocation Total = Income**
   ```typescript
   assert(allocation.totalAllocated === allocation.totalIncome);
   ```

2. **Goal Feasibility Matches Allocation**
   ```typescript
   assert(goal.monthlyContribution <= allocation.goalSavings);
   ```

3. **Debt Payments Match Allocation**
   ```typescript
   assert(sum(debts.monthlyPayment) === allocation.debtPayments);
   ```

### Error Handling

All engines must:
- Validate inputs before calculation
- Return structured errors (not throw exceptions)
- Provide fallback values for edge cases
- Log calculation details for debugging

---

## Conclusion

This specification provides:

✅ **Complete mathematical formulas** for all calculations  
✅ **Step-by-step algorithms** for each engine  
✅ **Business rules** and validation logic  
✅ **Edge case handling** specifications  
✅ **Test cases** with expected outputs  
✅ **Performance requirements** for each engine  

All engines are:
- **Deterministic** - Same inputs always produce same outputs
- **LLM-independent** - No AI involvement in calculations
- **Testable** - Complete test coverage possible
- **Performant** - Sub-second response times
- **Accurate** - Precise decimal calculations

This serves as the complete specification for implementing Sage's financial calculation layer.
