# Sage: Business Rules for AI Development

**Complete Business Logic Reference**

---

## Critical Rules (Never Violate)

### Rule #1: AI Explains, Engine Calculates

**THE MOST IMPORTANT RULE IN THE ENTIRE SYSTEM**

```typescript
// ❌ NEVER: LLM performs calculation
const allocation = await llm.complete('Calculate allocation for ₹80,000 income');

// ✅ ALWAYS: Engine calculates, LLM explains
const allocation = calculateAllocation(input);
const explanation = await llm.complete(`Explain this allocation: ${JSON.stringify(allocation)}`);
```

**Why:**
- LLMs hallucinate numbers
- Financial calculations must be deterministic
- Users must trust the math
- Calculations must be auditable

**Enforcement:**
- All financial calculations in `domain/financial/`
- Pure TypeScript functions only
- 100% test coverage required
- No LLM API calls in calculation code

---

## Entity Business Rules

### User

**Rules:**
1. One user per Clerk account (unique `clerkId`)
2. Email must be valid and unique
3. Soft delete only (set `deletedAt`, never hard delete)
4. Cannot delete user with active goals or outstanding debts

**Validation:**
```typescript
const UserSchema = z.object({
  clerkId: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1).max(100)
});
```

**Example:**
```typescript
// ✅ CORRECT: Soft delete
await db.user.update({
  where: { id: userId },
  data: { deletedAt: new Date() }
});

// ❌ WRONG: Hard delete
await db.user.delete({ where: { id: userId } });
```

---

### FinancialProfile

**Rules:**
1. **One profile per user** (1:1 relationship, unique `userId`)
2. `monthlyIncome > 0` (required, must be positive)
3. `currentSavings >= 0` (cannot be negative)
4. `currentSavings >= currentEmergencyFund` (savings must cover emergency fund)
5. `currentEmergencyFund <= emergencyFundTarget` (if target is set)
6. `cfoUnderstandingScore` recalculated on every profile update
7. Income frequency determines normalization

**Understanding Score Calculation:**
```typescript
function calculateUnderstandingScore(profile: FinancialProfile): number {
  const required = ['monthlyIncome', 'currentSavings'];
  const important = ['emergencyFundTarget', 'otherIncome', 'primaryGoal'];
  const optional = ['riskTolerance'];
  
  const requiredFilled = required.filter(f => profile[f] != null).length;
  const importantFilled = important.filter(f => profile[f] != null).length;
  const optionalFilled = optional.filter(f => profile[f] != null).length;
  
  return (
    (requiredFilled / required.length) * 40 +
    (importantFilled / important.length) * 40 +
    (optionalFilled / optional.length) * 20
  );
}
```

**Validation:**
```typescript
const FinancialProfileSchema = z.object({
  monthlyIncome: z.number().positive(),
  otherIncome: z.number().nonnegative().optional(),
  currentSavings: z.number().nonnegative(),
  emergencyFundTarget: z.number().nonnegative().optional(),
  currentEmergencyFund: z.number().nonnegative(),
  incomeFrequency: z.enum(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL']),
  riskTolerance: z.enum(['CONSERVATIVE', 'MODERATE', 'AGGRESSIVE'])
}).refine(
  data => data.currentSavings >= data.currentEmergencyFund,
  'Current savings must be >= emergency fund'
).refine(
  data => !data.emergencyFundTarget || data.currentEmergencyFund <= data.emergencyFundTarget,
  'Emergency fund cannot exceed target'
);
```

**Example:**
```typescript
// ✅ CORRECT: Valid profile
const profile = {
  monthlyIncome: 80000,
  currentSavings: 200000,
  currentEmergencyFund: 150000,
  emergencyFundTarget: 240000
};

// ❌ WRONG: Savings < emergency fund
const profile = {
  monthlyIncome: 80000,
  currentSavings: 100000,
  currentEmergencyFund: 150000 // Invalid!
};
```

---

### Goal

**Rules:**
1. **One EMERGENCY_FUND goal per user** (business constraint)
2. `targetDate` must be in future
3. `targetAmount > 0` (positive, minimum ₹1,000)
4. `currentAmount >= 0` (cannot be negative)
5. `currentAmount < targetAmount` (cannot exceed target while active)
6. `name` max 100 characters
7. `description` max 500 characters
8. Auto-complete when `currentAmount >= targetAmount`
9. Cannot delete ACTIVE goals with `currentAmount > 0` (must pause first)

**Status Transitions:**
```
ACTIVE ←→ PAUSED
  ↓         ↓
COMPLETED CANCELLED
```

**Allowed Transitions:**
- ACTIVE → PAUSED: User action
- PAUSED → ACTIVE: User action
- ACTIVE → COMPLETED: System (when `currentAmount >= targetAmount`)
- PAUSED → COMPLETED: System (when `currentAmount >= targetAmount`)
- ACTIVE → CANCELLED: User action (with confirmation)
- PAUSED → CANCELLED: User action (with confirmation)

**Forbidden Transitions:**
- COMPLETED → any (final state)
- CANCELLED → any (final state)

**Validation:**
```typescript
const GoalSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: z.enum(['EMERGENCY_FUND', 'HOUSE', 'CAR', 'VACATION', 'WEDDING', 'EDUCATION', 'RETIREMENT', 'CUSTOM']),
  targetAmount: z.number().positive().min(1000),
  currentAmount: z.number().nonnegative().default(0),
  targetDate: z.string().datetime(),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW'])
}).refine(
  data => new Date(data.targetDate) > new Date(),
  'Target date must be in future'
).refine(
  data => data.currentAmount < data.targetAmount,
  'Current amount must be less than target'
);
```

**Business Logic:**
```typescript
async function createGoal(input: GoalInput): Promise<Result<Goal>> {
  // Check for duplicate emergency fund
  if (input.type === 'EMERGENCY_FUND') {
    const existing = await db.goal.findFirst({
      where: { 
        userId: input.userId,
        type: 'EMERGENCY_FUND',
        status: { in: ['ACTIVE', 'PAUSED'] }
      }
    });
    
    if (existing) {
      return {
        success: false,
        error: 'You already have an emergency fund goal',
        code: 'DUPLICATE_EMERGENCY_FUND'
      };
    }
  }
  
  // Create goal
  const goal = await db.goal.create({ data: input });
  
  // Calculate feasibility
  const feasibility = calculateGoalFeasibility(goal, profile);
  
  // Update goal with feasibility
  await db.goal.update({
    where: { id: goal.id },
    data: {
      isFeasible: feasibility.isFeasible,
      feasibilityScore: feasibility.feasibilityScore,
      monthlyContribution: feasibility.requiredMonthly
    }
  });
  
  return { success: true, data: goal };
}
```

---

### Expense

**Rules:**
1. `amount > 0` (positive)
2. `endDate > startDate` (if both set)
3. Essential expenses prioritized in allocation
4. `isActive` determines inclusion in calculations
5. Frequency determines monthly normalization

**Validation:**
```typescript
const ExpenseSchema = z.object({
  name: z.string().min(1).max(100),
  amount: z.number().positive(),
  category: z.enum(['RENT', 'UTILITIES', 'GROCERIES', 'TRANSPORTATION', 'HEALTHCARE', 'INSURANCE', 'ENTERTAINMENT', 'DINING', 'SHOPPING', 'EDUCATION', 'OTHER']),
  frequency: z.enum(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'ONE_TIME']),
  isEssential: z.boolean(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  isActive: z.boolean().default(true)
}).refine(
  data => !data.endDate || !data.startDate || new Date(data.endDate) > new Date(data.startDate),
  'End date must be after start date'
);
```

**Normalization:**
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

---

### Debt

**Rules:**
1. `principalAmount > 0` (positive, minimum ₹10,000)
2. `currentBalance >= 0` (cannot be negative)
3. `currentBalance <= principalAmount` (cannot exceed original)
4. `monthlyPayment >= minimumPayment` (must pay at least minimum)
5. `interestRate` between 0-50% (annual)
6. Auto-complete when `currentBalance = 0`
7. Cannot delete debt with outstanding balance

**Validation:**
```typescript
const DebtSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['HOME_LOAN', 'CAR_LOAN', 'PERSONAL_LOAN', 'EDUCATION_LOAN', 'CREDIT_CARD', 'OTHER']),
  principalAmount: z.number().positive().min(10000),
  currentBalance: z.number().nonnegative(),
  interestRate: z.number().min(0).max(50),
  monthlyPayment: z.number().positive(),
  minimumPayment: z.number().positive(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional()
}).refine(
  data => data.currentBalance <= data.principalAmount,
  'Current balance cannot exceed principal'
).refine(
  data => data.monthlyPayment >= data.minimumPayment,
  'Monthly payment must be >= minimum payment'
);
```

---

### Allocation

**Rules:**
1. One allocation per user per month/year combination
2. `totalAllocated = sum(all categories)`
3. `totalAllocated <= totalIncome`
4. All category amounts >= 0
5. Recalculated when goals/expenses/debts change

**Waterfall Priority:**
```typescript
function calculateAllocation(input: AllocationInput): Allocation {
  let remaining = input.monthlyIncome;
  
  // 1. Essential Expenses (max 50% of income)
  const essentialExpenses = Math.min(
    sumEssentialExpenses(input.expenses),
    input.monthlyIncome * 0.50
  );
  remaining -= essentialExpenses;
  
  // 2. Debt Payments (minimum payments)
  const debtPayments = sumMinimumPayments(input.debts);
  remaining -= debtPayments;
  
  // 3. Emergency Fund (20% of surplus until target)
  const emergencyFundNeeded = input.emergencyFundTarget - input.currentEmergencyFund;
  const emergencyFund = input.currentEmergencyFund < input.emergencyFundTarget
    ? Math.min(remaining * 0.20, emergencyFundNeeded)
    : 0;
  remaining -= emergencyFund;
  
  // 4. Goal Savings (60% of surplus, by priority)
  const goalSavings = allocateToGoals(input.goals, remaining * 0.60);
  remaining -= goalSavings;
  
  // 5. Investments (15% of surplus)
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
    totalIncome: input.monthlyIncome,
    totalAllocated: input.monthlyIncome
  };
}
```

**Validation:**
```typescript
function validateAllocation(allocation: Allocation): ValidationResult {
  const errors = [];
  
  // Check total
  if (allocation.totalAllocated > allocation.totalIncome) {
    errors.push('Cannot allocate more than total income');
  }
  
  // Check essential expenses cap
  if (allocation.essentialExpenses > allocation.totalIncome * 0.50) {
    errors.push('Essential expenses exceed 50% of income');
  }
  
  // Check sum
  const sum = allocation.essentialExpenses + allocation.debtPayments + 
              allocation.emergencyFund + allocation.goalSavings + 
              allocation.investments + allocation.discretionary;
  
  if (Math.abs(sum - allocation.totalAllocated) > 0.01) {
    errors.push('Allocation categories do not sum to total');
  }
  
  return { isValid: errors.length === 0, errors };
}
```

---

## Financial Calculation Rules

### Income Constraints

```typescript
// Minimum viable income
if (monthlyIncome < essentialExpenses + minimumDebtPayments) {
  return {
    warning: 'INCOME_INSUFFICIENT',
    message: 'Income does not cover essential expenses and minimum debt payments',
    recommendation: 'Increase income or reduce expenses'
  };
}

// Data quality checks
if (monthlyIncome < 10000) {
  warning: 'Income seems unusually low, please verify';
}

if (monthlyIncome > 10000000) {
  warning: 'Income seems unusually high, please verify';
}
```

### Debt-to-Income Ratio

```typescript
function calculateDebtToIncomeRatio(debts: Debt[], income: number): number {
  const totalDebtPayments = debts.reduce((sum, debt) => sum + debt.monthlyPayment, 0);
  return totalDebtPayments / income;
}

// Thresholds
const ratio = calculateDebtToIncomeRatio(debts, income);

if (ratio <= 0.30) return 'COMFORTABLE';
if (ratio <= 0.40) return 'MANAGEABLE';
if (ratio <= 0.50) return 'RISKY';
return 'UNAFFORDABLE';
```

**Recommended Maximum:** 40%  
**High Risk Threshold:** 50%

### Emergency Fund Rules

```typescript
// Default target
const emergencyFundTarget = monthlyExpenses * 6; // 6 months

// Minimum recommended
const minimumTarget = monthlyExpenses * 3; // 3 months

// Priority
if (currentEmergencyFund < emergencyFundTarget) {
  // Emergency fund takes priority over goals
  prioritize(emergencyFund, goals);
}
```

### Goal Feasibility

```typescript
function calculateGoalFeasibility(goal: Goal, profile: FinancialProfile): FeasibilityResult {
  const monthsRemaining = monthsBetween(new Date(), goal.targetDate);
  const amountRemaining = goal.targetAmount - goal.currentAmount;
  const requiredMonthly = amountRemaining / monthsRemaining;
  
  const allocation = calculateAllocation(profile);
  const availableMonthly = allocation.goalSavings;
  
  const utilizationRatio = requiredMonthly / availableMonthly;
  
  return {
    isFeasible: utilizationRatio <= 1.0,
    feasibilityScore: Math.max(0, Math.min(100, (1 - utilizationRatio) * 100)),
    requiredMonthly,
    availableMonthly,
    utilizationRatio
  };
}
```

**Feasibility Thresholds:**
- `utilizationRatio < 0.5` → Easily achievable
- `utilizationRatio < 0.8` → On track
- `utilizationRatio < 1.0` → Tight but feasible
- `utilizationRatio >= 1.0` → Infeasible

### EMI Calculation

```typescript
function calculateEMI(
  principal: number,
  annualRate: number,
  tenureMonths: number
): number {
  const monthlyRate = annualRate / 12 / 100;
  
  // Handle zero interest
  if (monthlyRate === 0) {
    return principal / tenureMonths;
  }
  
  const emi = principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths) /
              (Math.pow(1 + monthlyRate, tenureMonths) - 1);
  
  return Math.round(emi * 100) / 100; // Round to 2 decimals
}
```

**Formula:** EMI = P × r × (1+r)^n / ((1+r)^n - 1)

Where:
- P = Principal amount
- r = Monthly interest rate (annual rate / 12 / 100)
- n = Tenure in months

---

## AI Behavior Rules

### Core Principles

**1. Cite Data Sources**
```typescript
// ❌ BAD: No context
"You should save ₹15,000 per month"

// ✅ GOOD: Cite source
"Based on your ₹80,000 monthly income and ₹40,000 expenses, you have ₹40,000 surplus. 
The allocation engine recommends ₹15,000 per month for your goals (60% of surplus)."
```

**2. Admit Limitations**
```typescript
// ❌ BAD: Pretend to know
"Your loan will definitely be approved"

// ✅ GOOD: Acknowledge uncertainty
"Based on your debt-to-income ratio of 25%, you have a good chance of loan approval. 
However, lenders also consider credit score and employment history, which I don't have access to."
```

**3. No Financial Advice**
```typescript
// ❌ BAD: Advice
"You should invest in mutual funds"

// ✅ GOOD: Guidance
"You have ₹6,000 allocated for investments. Common options include mutual funds, 
fixed deposits, or PPF. Consider your risk tolerance and goals when choosing."
```

**4. Show Confidence Scores**
```typescript
{
  recommendation: "Save ₹15,000/month for your house goal",
  confidence: 75,
  reasoning: [
    "Profile is 85% complete (+20)",
    "Income is stable (+10)",
    "Emergency fund below target (-15)"
  ]
}
```

**5. Provide Context**
```typescript
// ❌ BAD: Just numbers
"EMI: ₹44,424"

// ✅ GOOD: With context
"For a ₹5,00,000 loan at 12% annual interest for 12 months:
- Monthly EMI: ₹44,424
- Total payable: ₹5,33,088
- Total interest: ₹33,088
- This is 55% of your ₹80,000 monthly income (high but manageable)"
```

### Prohibited AI Actions

**Never:**
- Perform financial calculations
- Invent numbers or data
- Guarantee outcomes
- Provide legal or tax advice
- Make investment recommendations
- Access external financial data
- Execute transactions
- Make decisions for users
- Store or remember sensitive data across sessions

**Always:**
- Use deterministic engine results
- Cite calculation sources
- Include confidence scores
- Acknowledge limitations
- Provide context and reasoning
- Show calculation steps
- Offer multiple options
- Let users make final decisions

---

## Data Privacy Rules

### Sensitive Data Classification

**Highly Sensitive (Encrypt at Rest):**
- `monthlyIncome`, `otherIncome`
- `currentSavings`, `emergencyFundTarget`, `currentEmergencyFund`
- `targetAmount`, `currentAmount` (goals)
- `principalAmount`, `currentBalance` (debts)
- All monetary amounts

**Sensitive (Protect):**
- `name`, `email`
- `primaryGoal`, goal/debt descriptions
- Chat messages

**Non-Sensitive:**
- `userId` (internal ID only)
- Timestamps (`createdAt`, `updatedAt`)
- Enum values (status, type, category)
- Calculated scores (understanding, feasibility)

### Logging Rules

```typescript
// ❌ NEVER log sensitive data
logger.info({ 
  income: 80000, 
  savings: 200000,
  goalAmount: 500000
});

// ✅ ALWAYS redact
logger.info({ 
  userId: 'user_123',
  income: '[REDACTED]',
  savings: '[REDACTED]',
  goalAmount: '[REDACTED]',
  action: 'goal_created'
});
```

### Error Messages

```typescript
// ❌ Don't expose sensitive data
throw new Error(`Failed to create goal with amount ${targetAmount}`);

// ✅ Generic error messages
throw new Error('Failed to create goal');
// Log details separately with redaction
logger.error({ userId, error, goalAmount: '[REDACTED]' }, 'Goal creation failed');
```

### Data Deletion

```typescript
// User has right to delete all their data
async function deleteUserData(userId: string): Promise<void> {
  await db.$transaction([
    // Soft delete all user data
    db.goal.updateMany({ 
      where: { userId }, 
      data: { deletedAt: new Date() } 
    }),
    db.expense.updateMany({ 
      where: { userId }, 
      data: { deletedAt: new Date() } 
    }),
    db.debt.updateMany({ 
      where: { userId }, 
      data: { deletedAt: new Date() } 
    }),
    db.financialProfile.update({ 
      where: { userId }, 
      data: { deletedAt: new Date() } 
    }),
    db.user.update({ 
      where: { id: userId }, 
      data: { deletedAt: new Date() } 
    })
  ]);
}
```

---

## Validation Rules

### Field-Level Validation

**Amounts:**
```typescript
z.number()
  .positive()           // > 0
  .max(1000000000)      // Max 1 billion
  .multipleOf(0.01)     // 2 decimal places
```

**Percentages:**
```typescript
z.number()
  .min(0)
  .max(100)
  .int()                // Whole numbers
```

**Interest Rates:**
```typescript
z.number()
  .min(0)
  .max(50)              // Max 50% annual
  .multipleOf(0.01)
```

**Dates:**
```typescript
z.string()
  .datetime()           // ISO 8601
  .refine(
    date => new Date(date) > new Date(),
    'Date must be in future'
  )
```

**Strings:**
```typescript
z.string()
  .min(1)               // Not empty
  .max(100)             // Max length
  .trim()               // Remove whitespace
```

### Cross-Entity Validation

**Profile Consistency:**
```typescript
currentSavings >= currentEmergencyFund
currentEmergencyFund <= emergencyFundTarget (if set)
monthlyIncome >= essentialExpenses + minimumDebtPayments
```

**Goal Constraints:**
```typescript
targetDate > now
currentAmount < targetAmount
Only one EMERGENCY_FUND goal per user
```

**Allocation Balance:**
```typescript
totalAllocated <= totalIncome
sum(categories) === totalAllocated
essentialExpenses <= totalIncome * 0.50
```

---

## Performance Rules

### Response Time Targets

- Page load: < 2s (p95)
- Allocation calculation: < 50ms
- Goal feasibility: < 100ms
- Loan EMI: < 10ms
- Purchase simulation: < 200ms
- Cash flow projection (60mo): < 500ms
- AI first token: < 2s
- AI full response: < 5s

### Optimization Guidelines

**Cache Aggressively:**
```typescript
// Cache allocation calculations
const cacheKey = `allocation:${userId}:${month}:${year}`;
await redis.set(cacheKey, allocation, { ex: 3600 }); // 1 hour

// Invalidate on data change
await redis.del(cacheKey);
```

**Optimize Queries:**
```typescript
// ✅ Use includes for related data
const goals = await db.goal.findMany({
  where: { userId },
  include: { milestones: true }
});

// ❌ Avoid N+1 queries
const goals = await db.goal.findMany({ where: { userId } });
for (const goal of goals) {
  goal.milestones = await db.goalMilestone.findMany({ where: { goalId: goal.id } });
}
```

**Paginate Large Lists:**
```typescript
const goals = await db.goal.findMany({
  where: { userId },
  take: 20,
  skip: page * 20,
  orderBy: { createdAt: 'desc' }
});
```

---

## Error Handling Rules

### Error Codes

```typescript
enum ErrorCode {
  // Auth
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  
  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  
  // Business Logic
  DUPLICATE_EMERGENCY_FUND = 'DUPLICATE_EMERGENCY_FUND',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  GOAL_NOT_FEASIBLE = 'GOAL_NOT_FEASIBLE',
  INCOME_INSUFFICIENT = 'INCOME_INSUFFICIENT',
  DEBT_OUTSTANDING = 'DEBT_OUTSTANDING',
  
  // System
  NOT_FOUND = 'NOT_FOUND',
  SERVER_ERROR = 'SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  RATE_LIMITED = 'RATE_LIMITED'
}
```

### Error Response Format

```typescript
interface ErrorResponse {
  success: false;
  error: string;                      // Human-readable
  code: ErrorCode;                    // Machine-readable
  details?: Record<string, string[]>; // Field errors
  timestamp: string;
}
```

### Error Handling Pattern

```typescript
async function createGoal(input: unknown): Promise<Result<Goal>> {
  try {
    // Validate input
    const validated = GoalSchema.parse(input);
    
    // Business logic validation
    if (await hasDuplicateEmergencyFund(validated)) {
      return {
        success: false,
        error: 'You already have an emergency fund goal',
        code: 'DUPLICATE_EMERGENCY_FUND'
      };
    }
    
    // Create goal
    const goal = await db.goal.create({ data: validated });
    
    return { success: true, data: goal };
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: error.flatten().fieldErrors
      };
    }
    
    logger.error({ error, input }, 'Failed to create goal');
    return {
      success: false,
      error: 'Failed to create goal',
      code: 'SERVER_ERROR'
    };
  }
}
```

---

## Testing Rules

### Coverage Requirements

- **Financial Engines:** 100% (deterministic, critical)
- **Application Layer:** 80% (business logic)
- **Presentation Layer:** 60% (UI components)

### Required Test Cases

**Financial Calculations:**
- Happy path (valid inputs)
- Edge cases (zero, negative, very large)
- Boundary conditions (min/max values)
- Division by zero
- Rounding precision

**Business Logic:**
- Valid state transitions
- Invalid state transitions
- Duplicate checks
- Constraint violations
- Data consistency

**Example:**
```typescript
describe('calculateEMI', () => {
  it('should calculate EMI correctly', () => {
    expect(calculateEMI(500000, 12, 12)).toBeCloseTo(44424, 0);
  });
  
  it('should handle zero interest rate', () => {
    expect(calculateEMI(120000, 0, 12)).toBe(10000);
  });
  
  it('should round to 2 decimals', () => {
    const emi = calculateEMI(100000, 10, 12);
    expect(emi).toBe(Math.round(emi * 100) / 100);
  });
});
```

---

## Quick Reference Checklist

**Before Creating a Goal:**
- [ ] Validate input with GoalSchema
- [ ] Check for duplicate emergency fund
- [ ] Verify target date is in future
- [ ] Calculate feasibility
- [ ] Emit goal.created event
- [ ] Revalidate allocation cache

**Before Calculating Allocation:**
- [ ] Normalize all income to monthly
- [ ] Normalize all expenses to monthly
- [ ] Cap essential expenses at 50%
- [ ] Prioritize emergency fund if below target
- [ ] Allocate to goals by priority
- [ ] Validate total <= income

**Before Using AI:**
- [ ] Calculate result with deterministic engine
- [ ] Format result for LLM explanation
- [ ] Include confidence score
- [ ] Cite data sources
- [ ] Acknowledge limitations

**Before Logging:**
- [ ] Redact all sensitive data
- [ ] Use structured logging
- [ ] Include userId (not sensitive data)
- [ ] Include error codes
- [ ] Include action/event type

---

**Document Version:** 1.0  
**Last Updated:** 2024-12-19  
**Purpose:** Complete business rules reference for AI development  
**Audience:** AI sessions, developers  
**Critical:** Never violate Rule #1 (AI explains, engine calculates)
