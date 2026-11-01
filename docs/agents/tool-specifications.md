# Sage: Tool Specifications

**Financial Calculation Tools for CFO Agent**

---

## Overview

The CFO Agent uses deterministic financial calculation tools to provide accurate, reproducible results. The agent NEVER performs calculations itself—it only invokes these tools and explains their results.

**Critical Principle:** All tools are pure TypeScript functions with 100% test coverage.

---

## Tool Categories

1. **Allocation Tools** - Income distribution
2. **Goal Tools** - Goal feasibility and projection
3. **Simulation Tools** - What-if scenarios
4. **Loan Tools** - EMI and loan calculations
5. **Projection Tools** - Future financial state
6. **Confidence Tools** - Prediction reliability

---

## Tool 1: calculateAllocation

**Purpose:** Calculate monthly income allocation across categories using waterfall priority.

### Signature

```typescript
function calculateAllocation(input: AllocationInput): AllocationResult
```

### Input

```typescript
interface AllocationInput {
  monthlyIncome: number;              // Monthly income (> 0)
  expenses: Expense[];                // All expenses
  debts: Debt[];                      // All debts
  goals: Goal[];                      // All active goals
  emergencyFundTarget: number;        // Target emergency fund
  currentEmergencyFund: number;       // Current emergency fund
  currentSavings: number;             // Total savings
}

interface Expense {
  amount: number;
  frequency: Frequency;
  isEssential: boolean;
  isActive: boolean;
}

interface Debt {
  monthlyPayment: number;
  minimumPayment: number;
}

interface Goal {
  id: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
}
```

### Output

```typescript
interface AllocationResult {
  success: true;
  allocation: {
    essentialExpenses: number;
    debtPayments: number;
    emergencyFund: number;
    goalSavings: number;
    investments: number;
    discretionary: number;
    totalIncome: number;
    totalAllocated: number;
  };
  breakdown: {
    goalAllocations: GoalAllocation[];
    surplusAfterEssentials: number;
    surplusAfterDebts: number;
  };
  warnings?: string[];
}

interface GoalAllocation {
  goalId: string;
  goalName: string;
  allocated: number;
  priority: string;
}
```

### Error Handling

```typescript
// Insufficient income
if (monthlyIncome < essentialExpenses + minimumDebtPayments) {
  return {
    success: false,
    error: "INCOME_INSUFFICIENT",
    message: "Monthly income does not cover essential expenses and minimum debt payments",
    details: {
      monthlyIncome,
      essentialExpenses,
      minimumDebtPayments,
      shortfall: (essentialExpenses + minimumDebtPayments) - monthlyIncome
    }
  };
}

// Invalid input
if (monthlyIncome <= 0) {
  return {
    success: false,
    error: "INVALID_INPUT",
    message: "Monthly income must be positive"
  };
}
```

### Usage Example

```typescript
const result = calculateAllocation({
  monthlyIncome: 80000,
  expenses: [
    { amount: 25000, frequency: "MONTHLY", isEssential: true, isActive: true },
    { amount: 15000, frequency: "MONTHLY", isEssential: true, isActive: true }
  ],
  debts: [
    { monthlyPayment: 10000, minimumPayment: 10000 }
  ],
  goals: [
    {
      id: "goal_house",
      targetAmount: 500000,
      currentAmount: 150000,
      targetDate: "2026-12-31",
      priority: "HIGH"
    }
  ],
  emergencyFundTarget: 240000,
  currentEmergencyFund: 150000,
  currentSavings: 200000
});

// Result:
{
  success: true,
  allocation: {
    essentialExpenses: 40000,
    debtPayments: 10000,
    emergencyFund: 6000,
    goalSavings: 18000,
    investments: 4500,
    discretionary: 1500,
    totalIncome: 80000,
    totalAllocated: 80000
  },
  breakdown: {
    goalAllocations: [
      { goalId: "goal_house", goalName: "House", allocated: 18000, priority: "HIGH" }
    ],
    surplusAfterEssentials: 40000,
    surplusAfterDebts: 30000
  }
}
```

### Agent Usage

```typescript
// Agent receives: "How should I allocate my salary?"

// 1. Gather context
const profile = await getFinancialProfile(userId);
const expenses = await getExpenses(userId);
const debts = await getDebts(userId);
const goals = await getGoals(userId);

// 2. Call tool
const result = calculateAllocation({
  monthlyIncome: profile.monthlyIncome,
  expenses,
  debts,
  goals,
  emergencyFundTarget: profile.emergencyFundTarget,
  currentEmergencyFund: profile.currentEmergencyFund,
  currentSavings: profile.currentSavings
});

// 3. Explain result
const explanation = `
Based on your ₹80,000 monthly income, here's your recommended allocation:

**Essential Expenses:** ₹40,000 (50%)
- Rent, utilities, groceries

**Debt Payments:** ₹10,000 (12.5%)
- Minimum payments on all debts

**Emergency Fund:** ₹6,000 (7.5%)
- Building toward ₹2,40,000 target (currently ₹1,50,000)

**Goal Savings:** ₹18,000 (22.5%)
- House down payment (high priority)

**Investments:** ₹4,500 (5.6%)
- Long-term wealth building

**Discretionary:** ₹1,500 (1.9%)
- Flexible spending

This allocation prioritizes your emergency fund and house goal while maintaining financial security.
`;
```

---

## Tool 2: simulatePurchase

**Purpose:** Simulate 3 scenarios for purchase affordability.

### Signature

```typescript
function simulatePurchase(input: PurchaseInput): PurchaseSimulation
```

### Input

```typescript
interface PurchaseInput {
  amount: number;                     // Purchase amount (> 0)
  userId: string;                     // User ID
  itemName?: string;                  // Optional item name
  loanOptions?: {
    interestRate: number;             // Annual rate (0-50)
    tenure: number;                   // Months (1-360)
  };
}
```

### Output

```typescript
interface PurchaseSimulation {
  success: true;
  scenarios: {
    buyFromSavings: Scenario;
    takeLoan: Scenario;
    saveFirst: Scenario;
  };
  recommendation: "buyFromSavings" | "takeLoan" | "saveFirst";
  confidence: number;                 // 0-100
}

interface Scenario {
  type: string;
  isViable: boolean;
  immediateImpact: {
    newSavings: number;
    newEmergencyFund: number;
  };
  monthlyImpact: number;              // Positive = cost, Negative = saving
  totalCost: number;
  timeline: number;                   // Months (0 = immediate)
  pros: string[];
  cons: string[];
  recommendation: boolean;
}
```

### Error Handling

```typescript
// Amount too large
if (amount > currentSavings * 10) {
  return {
    success: false,
    error: "AMOUNT_TOO_LARGE",
    message: "Purchase amount exceeds realistic affordability",
    details: { amount, maxRecommended: currentSavings * 2 }
  };
}

// Insufficient data
if (!profile.monthlyIncome) {
  return {
    success: false,
    error: "INSUFFICIENT_DATA",
    message: "Monthly income required for simulation",
    missingFields: ["monthlyIncome"]
  };
}
```

### Usage Example

```typescript
const result = simulatePurchase({
  amount: 30000,
  userId: "user_123",
  itemName: "laptop",
  loanOptions: {
    interestRate: 12,
    tenure: 12
  }
});

// Result:
{
  success: true,
  scenarios: {
    buyFromSavings: {
      type: "BUY_FROM_SAVINGS",
      isViable: true,
      immediateImpact: {
        newSavings: 170000,
        newEmergencyFund: 150000
      },
      monthlyImpact: 0,
      totalCost: 30000,
      timeline: 0,
      pros: ["Immediate purchase", "No interest", "Emergency fund safe"],
      cons: [],
      recommendation: true
    },
    takeLoan: {
      type: "LOAN_EMI",
      isViable: true,
      immediateImpact: {
        newSavings: 200000,
        newEmergencyFund: 150000
      },
      monthlyImpact: 2650,
      totalCost: 31800,
      timeline: 12,
      pros: ["Immediate purchase", "Preserve savings"],
      cons: ["₹1,800 interest", "12-month commitment"],
      recommendation: false
    },
    saveFirst: {
      type: "SAVE_FIRST",
      isViable: true,
      immediateImpact: {
        newSavings: 200000,
        newEmergencyFund: 150000
      },
      monthlyImpact: -30000,
      totalCost: 30000,
      timeline: 1,
      pros: ["No debt", "No interest", "Short wait"],
      cons: ["Wait 1 month"],
      recommendation: true
    }
  },
  recommendation: "buyFromSavings",
  confidence: 85
}
```

### Agent Usage

```typescript
// Agent receives: "Can I afford a ₹30,000 laptop?"

const result = simulatePurchase({
  amount: 30000,
  userId,
  itemName: "laptop"
});

const explanation = `
I've analyzed 3 scenarios for the ₹30,000 laptop:

**Option 1: Buy from Savings** ✅ Recommended
- New savings: ₹1,70,000
- Emergency fund: Still safe at ₹1,50,000
- Pros: Immediate, no interest, financially secure
- Cons: None

**Option 2: Take Loan** ⚠️ Not recommended
- EMI: ₹2,650/month for 12 months
- Total cost: ₹31,800 (₹1,800 interest)
- Pros: Preserve savings
- Cons: Paying interest for depreciating asset

**Option 3: Save First** ✅ Also good
- Timeline: 1 month
- Pros: No debt, short wait
- Cons: Wait 1 month

**My recommendation:** Buy from savings now. You can afford it without impacting your financial security.

Confidence: 85%
`;
```

---

## Tool 3: calculateEMI

**Purpose:** Calculate Equated Monthly Installment for a loan.

### Signature

```typescript
function calculateEMI(
  principal: number,
  annualRate: number,
  tenureMonths: number
): EMIResult
```

### Input

```typescript
principal: number;      // Loan amount (> 0)
annualRate: number;     // Annual interest rate (0-50)
tenureMonths: number;   // Loan tenure in months (1-360)
```

### Output

```typescript
interface EMIResult {
  emi: number;                        // Monthly EMI
  totalPayable: number;               // Total amount to pay
  totalInterest: number;              // Total interest
  monthlyRate: number;                // Monthly interest rate
  breakdown: {
    principal: number;
    interest: number;
  };
}
```

### Formula

```typescript
function calculateEMI(
  principal: number,
  annualRate: number,
  tenureMonths: number
): EMIResult {
  const monthlyRate = annualRate / 12 / 100;
  
  // Handle zero interest
  if (monthlyRate === 0) {
    return {
      emi: principal / tenureMonths,
      totalPayable: principal,
      totalInterest: 0,
      monthlyRate: 0,
      breakdown: {
        principal: principal / tenureMonths,
        interest: 0
      }
    };
  }
  
  // EMI = P × r × (1+r)^n / ((1+r)^n - 1)
  const emi = principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths) /
              (Math.pow(1 + monthlyRate, tenureMonths) - 1);
  
  const totalPayable = emi * tenureMonths;
  const totalInterest = totalPayable - principal;
  
  return {
    emi: Math.round(emi * 100) / 100,
    totalPayable: Math.round(totalPayable * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
    monthlyRate,
    breakdown: {
      principal: Math.round((emi - (principal * monthlyRate)) * 100) / 100,
      interest: Math.round((principal * monthlyRate) * 100) / 100
    }
  };
}
```

### Usage Example

```typescript
const result = calculateEMI(500000, 12, 12);

// Result:
{
  emi: 44424.39,
  totalPayable: 533092.68,
  totalInterest: 33092.68,
  monthlyRate: 0.01,
  breakdown: {
    principal: 39424.39,
    interest: 5000
  }
}
```

---

## Tool 4: projectGoalTimeline

**Purpose:** Project when a goal will be achieved and calculate feasibility.

### Signature

```typescript
function projectGoalTimeline(input: GoalProjectionInput): GoalProjection
```

### Input

```typescript
interface GoalProjectionInput {
  goal: Goal;
  profile: FinancialProfile;
  allocation: Allocation;
}
```

### Output

```typescript
interface GoalProjection {
  success: true;
  feasibility: {
    isFeasible: boolean;
    feasibilityScore: number;           // 0-100
    utilizationRatio: number;           // Required/Available
  };
  timeline: {
    monthsRemaining: number;
    requiredMonthly: number;
    availableMonthly: number;
    projectedCompletionDate: string;
    delayMonths: number;                // 0 if on time
  };
  recommendations: string[];
  confidence: number;
}
```

### Usage Example

```typescript
const result = projectGoalTimeline({
  goal: {
    id: "goal_house",
    targetAmount: 500000,
    currentAmount: 150000,
    targetDate: "2026-12-31"
  },
  profile: {
    monthlyIncome: 80000,
    currentSavings: 200000
  },
  allocation: {
    goalSavings: 18000
  }
});

// Result:
{
  success: true,
  feasibility: {
    isFeasible: true,
    feasibilityScore: 78,
    utilizationRatio: 0.97
  },
  timeline: {
    monthsRemaining: 24,
    requiredMonthly: 14583,
    availableMonthly: 18000,
    projectedCompletionDate: "2026-10-31",
    delayMonths: 0
  },
  recommendations: [
    "Goal is on track",
    "You're allocating more than required (₹18,000 vs ₹14,583 needed)",
    "Consider increasing other goal allocations"
  ],
  confidence: 82
}
```

---

## Tool 5: calculateConfidence

**Purpose:** Calculate confidence score for predictions.

### Signature

```typescript
function calculateConfidence(factors: ConfidenceFactor[]): ConfidenceResult
```

### Input

```typescript
interface ConfidenceFactor {
  name: string;
  impact: number;                     // -100 to +100
  reason: string;
}
```

### Output

```typescript
interface ConfidenceResult {
  score: number;                      // 0-100
  level: "very_low" | "low" | "medium" | "high" | "very_high";
  factors: ConfidenceFactor[];
  summary: string;
}
```

### Usage Example

```typescript
const result = calculateConfidence([
  {
    name: "Profile Completeness",
    impact: +20,
    reason: "Profile 85% complete"
  },
  {
    name: "Income Stability",
    impact: +10,
    reason: "Stable income for 6 months"
  },
  {
    name: "Emergency Fund",
    impact: -15,
    reason: "Emergency fund below target"
  }
]);

// Result:
{
  score: 65,
  level: "medium",
  factors: [...],
  summary: "Medium confidence based on good profile completeness and stable income, but emergency fund needs attention"
}
```

---

## Tool 6: simulateLoan

**Purpose:** Simulate loan scenarios with affordability assessment.

### Signature

```typescript
function simulateLoan(input: LoanInput): LoanSimulation
```

### Input

```typescript
interface LoanInput {
  principal: number;
  annualRate: number;
  tenureMonths: number;
  userId: string;
}
```

### Output

```typescript
interface LoanSimulation {
  success: true;
  emi: EMIResult;
  affordability: {
    level: "comfortable" | "manageable" | "risky" | "unaffordable";
    debtToIncomeRatio: number;
    monthlyImpact: number;              // % of income
    recommendation: boolean;
  };
  comparison: {
    withLoan: FinancialState;
    withoutLoan: FinancialState;
  };
  confidence: number;
}
```

### Usage Example

```typescript
const result = simulateLoan({
  principal: 500000,
  annualRate: 12,
  tenureMonths: 60,
  userId: "user_123"
});

// Result:
{
  success: true,
  emi: {
    emi: 11122,
    totalPayable: 667320,
    totalInterest: 167320
  },
  affordability: {
    level: "manageable",
    debtToIncomeRatio: 0.26,
    monthlyImpact: 13.9,
    recommendation: true
  },
  comparison: {
    withLoan: {
      monthlyCommitments: 21122,
      discretionaryIncome: 18878,
      savingsRate: 0.15
    },
    withoutLoan: {
      monthlyCommitments: 10000,
      discretionaryIncome: 30000,
      savingsRate: 0.25
    }
  },
  confidence: 80
}
```

---

## Tool Error Handling Patterns

### Standard Error Response

```typescript
interface ToolError {
  success: false;
  error: ErrorCode;
  message: string;
  details?: Record<string, any>;
  suggestions?: string[];
}

enum ErrorCode {
  INVALID_INPUT = "INVALID_INPUT",
  INSUFFICIENT_DATA = "INSUFFICIENT_DATA",
  CALCULATION_ERROR = "CALCULATION_ERROR",
  AMOUNT_TOO_LARGE = "AMOUNT_TOO_LARGE",
  INCOME_INSUFFICIENT = "INCOME_INSUFFICIENT"
}
```

### Error Recovery

```typescript
// Agent handles tool errors gracefully
const result = calculateAllocation(input);

if (!result.success) {
  switch (result.error) {
    case "INSUFFICIENT_DATA":
      return `I need a bit more information to calculate your allocation:
      
Missing: ${result.details.missingFields.join(", ")}

Let's start with: What's your monthly income?`;
      
    case "INCOME_INSUFFICIENT":
      return `I notice your income (₹${result.details.monthlyIncome}) doesn't cover your essential expenses (₹${result.details.essentialExpenses}) and minimum debt payments (₹${result.details.minimumDebtPayments}).

Shortfall: ₹${result.details.shortfall}

I recommend:
1. Increase income (side gig, raise, etc.)
2. Reduce essential expenses where possible
3. Negotiate debt payment terms

Would you like to explore any of these options?`;
      
    default:
      return `I encountered an issue with the calculation. Let me try a different approach...`;
  }
}
```

---

## Tool Testing Requirements

### Unit Tests (100% Coverage)

```typescript
describe('calculateEMI', () => {
  it('should calculate EMI correctly', () => {
    const result = calculateEMI(500000, 12, 12);
    expect(result.emi).toBeCloseTo(44424.39, 2);
  });
  
  it('should handle zero interest', () => {
    const result = calculateEMI(120000, 0, 12);
    expect(result.emi).toBe(10000);
    expect(result.totalInterest).toBe(0);
  });
  
  it('should throw on negative principal', () => {
    expect(() => calculateEMI(-100000, 12, 12)).toThrow();
  });
});
```

### Integration Tests

```typescript
describe('simulatePurchase integration', () => {
  it('should simulate purchase with real user data', async () => {
    const result = await simulatePurchase({
      amount: 30000,
      userId: testUser.id
    });
    
    expect(result.success).toBe(true);
    expect(result.scenarios.buyFromSavings).toBeDefined();
    expect(result.recommendation).toBeDefined();
  });
});
```

---

## Quick Reference

**Tool Categories:**
1. Allocation: calculateAllocation()
2. Goal: projectGoalTimeline()
3. Simulation: simulatePurchase(), simulateLoan()
4. Loan: calculateEMI()
5. Confidence: calculateConfidence()

**All Tools:**
- Pure TypeScript functions
- 100% test coverage
- Deterministic (same input = same output)
- No side effects
- Comprehensive error handling

**Agent Usage:**
1. Extract intent
2. Gather context
3. Call appropriate tool
4. Handle errors gracefully
5. Explain results in natural language

---

**Document Version:** 1.0  
**Last Updated:** 2024-12-19  
**Purpose:** Tool specifications for CFO Agent  
**Audience:** AI developers, backend engineers  
**Related:** cfo-agent.md, confidence-engine.md
