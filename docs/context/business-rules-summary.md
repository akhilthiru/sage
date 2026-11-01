# Sage: Business Rules Summary

**Constraints, Validations & Domain Logic**

---

## Core Business Rules

### Rule Categories

1. **Entity Rules** - Field constraints and relationships
2. **Financial Rules** - Calculation constraints and limits
3. **Workflow Rules** - State transitions and processes
4. **Validation Rules** - Input validation and data integrity
5. **AI Behavior Rules** - How AI interacts with users

---

## Entity-Level Rules

### User
- One user per Clerk account (unique `clerkId`)
- Soft delete only (set `deletedAt`, never hard delete)
- Email must be valid and unique
- Cannot delete user with active goals/debts

### FinancialProfile
- **One profile per user** (1:1 relationship, unique `userId`)
- `monthlyIncome > 0` (required, positive)
- `currentSavings >= 0` (cannot be negative)
- `currentSavings >= currentEmergencyFund` (savings must cover emergency fund)
- `currentEmergencyFund <= emergencyFundTarget` (if target set)
- `cfoUnderstandingScore` recalculated on every update
- Income frequency determines normalization:
  - ANNUAL: divide by 12
  - WEEKLY: multiply by 4.33
  - BIWEEKLY: multiply by 2.17
  - MONTHLY: use as-is

### Goal
- **One EMERGENCY_FUND goal per user** (business constraint)
- `targetDate` must be in future
- `targetAmount > 0` (positive, minimum ₹1,000)
- `currentAmount >= 0` (cannot be negative)
- `currentAmount < targetAmount` (cannot exceed target)
- `name` max 100 characters
- `description` max 500 characters
- Auto-complete when `currentAmount >= targetAmount`
- Cannot delete ACTIVE goals with `currentAmount > 0` (must pause first)

### GoalMilestone
- `targetAmount <= goal.targetAmount`
- `targetDate <= goal.targetDate`
- Milestones must be ordered chronologically
- Cannot have duplicate milestone names within same goal

### Expense
- `amount > 0` (positive)
- `endDate > startDate` (if both set)
- Essential expenses prioritized in allocation
- `isActive` determines inclusion in calculations
- Frequency determines monthly normalization

### Debt
- `principalAmount > 0` (positive, minimum ₹10,000)
- `currentBalance >= 0` (cannot be negative)
- `currentBalance <= principalAmount` (cannot exceed original)
- `monthlyPayment >= minimumPayment` (must pay at least minimum)
- `interestRate` between 0-50% (annual)
- Auto-complete when `currentBalance = 0`
- Cannot delete debt with outstanding balance

### Allocation
- One allocation per user per month/year combination
- `totalAllocated = sum(essentialExpenses, debtPayments, emergencyFund, goalSavings, investments, discretionary)`
- `totalAllocated <= totalIncome` (cannot allocate more than income)
- All category amounts >= 0 (non-negative)
- Recalculated when goals/expenses/debts change

---

## Financial Calculation Rules

### Income Constraints
```typescript
// Minimum viable income
monthlyIncome >= essentialExpenses + minimumDebtPayments

// Warning if income too low
if (monthlyIncome < 10000) {
  warning: 'Income seems unusually low'
}

// Warning if income too high (data quality check)
if (monthlyIncome > 10000000) {
  warning: 'Income seems unusually high, please verify'
}
```

### Allocation Constraints
```typescript
// Essential expenses cap
essentialExpenses <= monthlyIncome * 0.50 // Max 50%

// Emergency fund priority
if (currentEmergencyFund < emergencyFundTarget) {
  emergencyFundAllocation = surplus * 0.20 // 20% of surplus
}

// Goal savings allocation
goalSavingsAllocation = surplus * 0.60 // 60% of surplus

// Investment allocation
investmentAllocation = surplus * 0.15 // 15% of surplus

// Discretionary (remainder)
discretionary = surplus - (emergencyFund + goalSavings + investments)
```

### Debt Rules
```typescript
// Debt-to-income ratio thresholds
totalDebtPayments / monthlyIncome <= 0.40 // Recommended max
totalDebtPayments / monthlyIncome > 0.50  // High risk

// Minimum payment enforcement
monthlyPayment >= minimumPayment // Always

// Interest rate validation
0 <= interestRate <= 50 // Annual percentage
```

### Goal Feasibility Rules
```typescript
// Feasibility calculation
requiredMonthly = (targetAmount - currentAmount) / monthsRemaining
availableMonthly = allocation.goalSavings
utilizationRatio = requiredMonthly / availableMonthly

// Feasibility determination
isFeasible = utilizationRatio <= 1.0
feasibilityScore = max(0, min(100, (1 - utilizationRatio) * 100))

// Confidence thresholds
utilizationRatio < 0.5  → Easily achievable
utilizationRatio < 0.8  → On track
utilizationRatio < 1.0  → Tight but feasible
utilizationRatio >= 1.0 → Infeasible
```

### Emergency Fund Rules
```typescript
// Default target
emergencyFundTarget = monthlyExpenses * 6 // 6 months

// Minimum recommended
emergencyFundTarget >= monthlyExpenses * 3 // 3 months minimum

// Priority
if (currentEmergencyFund < emergencyFundTarget) {
  // Emergency fund takes priority over goals
  prioritize(emergencyFund, goals)
}
```

---

## State Transition Rules

### Goal Status Transitions
```
ACTIVE ←→ PAUSED
  ↓         ↓
COMPLETED CANCELLED
```

**Allowed Transitions:**
- ACTIVE → PAUSED: User action (anytime)
- PAUSED → ACTIVE: User action (anytime)
- ACTIVE → COMPLETED: System (when `currentAmount >= targetAmount`)
- PAUSED → COMPLETED: System (when `currentAmount >= targetAmount`)
- ACTIVE → CANCELLED: User action (with confirmation)
- PAUSED → CANCELLED: User action (with confirmation)

**Forbidden Transitions:**
- COMPLETED → any (final state)
- CANCELLED → any (final state)

### Debt Status Transitions
```
ACTIVE → PAID_OFF
  ↓
DEFAULTED
```

**Allowed Transitions:**
- ACTIVE → PAID_OFF: System (when `currentBalance = 0`)
- ACTIVE → DEFAULTED: System (missed payments - future feature)

**Forbidden Transitions:**
- PAID_OFF → any (final state)
- DEFAULTED → PAID_OFF (must create new debt)

### Profile Completeness States
```
Incomplete (0-30%) → Basic (31-60%) → Good (61-85%) → Strong (86-95%) → Complete (96-100%)
```

**Based on Understanding Score:**
- Required fields (40%): monthlyIncome, currentSavings
- Important fields (40%): emergencyFundTarget, otherIncome, primaryGoal
- Optional fields (20%): riskTolerance

---

## Validation Rules

### Field-Level Validation

**Amounts (Decimal):**
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
  .int()                // Whole numbers for scores
```

**Interest Rates:**
```typescript
z.number()
  .min(0)
  .max(50)              // Max 50% annual
  .multipleOf(0.01)     // 2 decimal places
```

**Dates:**
```typescript
z.string()
  .datetime()           // ISO 8601 format
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

**Enums:**
```typescript
z.enum(['ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'])
```

### Cross-Field Validation

**Goal:**
```typescript
GoalSchema.refine(
  data => new Date(data.targetDate) > new Date(),
  'Target date must be in future'
).refine(
  data => data.currentAmount < data.targetAmount,
  'Current amount must be less than target'
)
```

**Expense:**
```typescript
ExpenseSchema.refine(
  data => !data.endDate || !data.startDate || 
          new Date(data.endDate) > new Date(data.startDate),
  'End date must be after start date'
)
```

**Debt:**
```typescript
DebtSchema.refine(
  data => data.currentBalance <= data.principalAmount,
  'Current balance cannot exceed principal'
).refine(
  data => data.monthlyPayment >= data.minimumPayment,
  'Monthly payment must be >= minimum payment'
)
```

### Business Logic Validation

**Allocation:**
```typescript
function validateAllocation(allocation: Allocation): ValidationResult {
  const errors = [];
  
  if (allocation.totalAllocated > allocation.totalIncome) {
    errors.push('Cannot allocate more than total income');
  }
  
  if (allocation.essentialExpenses > allocation.totalIncome * 0.50) {
    errors.push('Essential expenses exceed 50% of income');
  }
  
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

## AI Behavior Rules

### Core Principles

**1. AI Explains, Engine Calculates**
```typescript
// ❌ NEVER: AI performs calculation
const allocation = await llm.complete('Calculate allocation for ₹80,000 income');

// ✅ ALWAYS: Engine calculates, AI explains
const allocation = calculateAllocation(input);
const explanation = await llm.complete(`Explain this allocation: ${allocation}`);
```

**2. Cite Data Sources**
```typescript
// ❌ BAD: No context
"You should save ₹15,000 per month"

// ✅ GOOD: Cite source
"Based on your ₹80,000 monthly income and ₹40,000 expenses, you have ₹40,000 surplus. 
I recommend saving ₹15,000 per month for your house goal."
```

**3. Admit Limitations**
```typescript
// ❌ BAD: Pretend to know
"Your loan will definitely be approved"

// ✅ GOOD: Acknowledge uncertainty
"Based on your debt-to-income ratio of 25%, you have a good chance of loan approval. 
However, lenders also consider credit score and employment history, which I don't have."
```

**4. No Financial Advice**
```typescript
// ❌ BAD: Advice
"You should invest in mutual funds"

// ✅ GOOD: Guidance
"You have ₹6,000 allocated for investments. Common options include mutual funds, 
fixed deposits, or PPF. Consider your risk tolerance and goals when choosing."
```

**5. Show Confidence Scores**
```typescript
// Always include confidence
{
  recommendation: "Save ₹15,000/month",
  confidence: 75,
  factors: [
    { name: 'Profile Completeness', impact: +20 },
    { name: 'Income Stability', impact: +10 },
    { name: 'Emergency Fund', impact: -15 }
  ]
}
```

### Prohibited AI Actions

**Never:**
- Perform financial calculations
- Invent numbers or data
- Guarantee outcomes
- Provide legal/tax advice
- Make investment recommendations
- Access external financial data
- Execute transactions
- Make decisions for users

**Always:**
- Use deterministic engine results
- Cite calculation sources
- Include confidence scores
- Acknowledge limitations
- Provide context and reasoning
- Show calculation steps
- Offer multiple options

---

## Data Privacy Rules

### Sensitive Data Classification

**Highly Sensitive (Encrypt):**
- `monthlyIncome`
- `otherIncome`
- `currentSavings`
- `emergencyFundTarget`
- `currentEmergencyFund`
- `targetAmount` (goals)
- `currentAmount` (goals)
- `principalAmount` (debts)
- `currentBalance` (debts)

**Sensitive (Protect):**
- `name`
- `email`
- `primaryGoal`
- Goal/debt descriptions

**Non-Sensitive:**
- `userId` (internal ID)
- `createdAt`, `updatedAt`
- Enum values (status, type, category)
- Calculated scores (understanding, feasibility)

### Data Handling Rules

**Logging:**
```typescript
// ❌ NEVER log sensitive data
logger.info({ income: 80000, savings: 200000 }); // NO!

// ✅ Log with redaction
logger.info({ 
  userId: 'user_123',
  income: '[REDACTED]',
  savings: '[REDACTED]'
});
```

**Error Messages:**
```typescript
// ❌ Don't expose sensitive data in errors
throw new Error(`Failed to create goal with amount ${targetAmount}`);

// ✅ Generic error messages
throw new Error('Failed to create goal');
```

**Soft Delete:**
```typescript
// ❌ NEVER hard delete
await db.user.delete({ where: { id: userId } });

// ✅ Soft delete
await db.user.update({ 
  where: { id: userId },
  data: { deletedAt: new Date() }
});
```

**Data Export:**
```typescript
// User has right to export all their data
async function exportUserData(userId: string): Promise<ExportData> {
  return {
    profile: await db.financialProfile.findUnique({ where: { userId } }),
    goals: await db.goal.findMany({ where: { userId } }),
    expenses: await db.expense.findMany({ where: { userId } }),
    debts: await db.debt.findMany({ where: { userId } }),
    // ... all user data
  };
}
```

**Data Deletion:**
```typescript
// User has right to delete all their data
async function deleteUserData(userId: string): Promise<void> {
  await db.$transaction([
    db.goal.updateMany({ where: { userId }, data: { deletedAt: new Date() } }),
    db.expense.updateMany({ where: { userId }, data: { deletedAt: new Date() } }),
    db.debt.updateMany({ where: { userId }, data: { deletedAt: new Date() } }),
    db.user.update({ where: { id: userId }, data: { deletedAt: new Date() } })
  ]);
}
```

---

## Performance Rules

### Response Time Targets

**Page Load:**
- Initial: < 2s (p95)
- Subsequent: < 500ms (cached)

**Calculations:**
- Allocation: < 50ms
- Goal feasibility: < 100ms
- Loan EMI: < 10ms
- Purchase simulation: < 200ms
- Cash flow projection (60mo): < 500ms

**AI Response:**
- First token: < 2s
- Full response: < 5s (streaming)

**Database:**
- Simple query: < 50ms
- Complex query: < 200ms
- Transaction: < 500ms

### Optimization Rules

**Caching:**
```typescript
// Cache allocation calculations
const cacheKey = `allocation:${userId}:${month}:${year}`;
const ttl = 3600; // 1 hour

// Invalidate on data change
await cache.del(cacheKey);
```

**Query Optimization:**
```typescript
// ❌ N+1 queries
const goals = await db.goal.findMany({ where: { userId } });
for (const goal of goals) {
  goal.milestones = await db.goalMilestone.findMany({ where: { goalId: goal.id } });
}

// ✅ Single query with includes
const goals = await db.goal.findMany({
  where: { userId },
  include: { milestones: true }
});
```

**Pagination:**
```typescript
// Always paginate large lists
const goals = await db.goal.findMany({
  where: { userId },
  take: 20,
  skip: page * 20,
  orderBy: { createdAt: 'desc' }
});
```

---

## Error Handling Rules

### Error Response Format

```typescript
interface ErrorResponse {
  success: false;
  error: string;           // Human-readable message
  code: ErrorCode;         // Machine-readable code
  details?: Record<string, string[]>; // Field-level errors
  timestamp: string;
}
```

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
  
  // System
  NOT_FOUND = 'NOT_FOUND',
  SERVER_ERROR = 'SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  RATE_LIMITED = 'RATE_LIMITED'
}
```

### Error Handling Patterns

**Validation Errors:**
```typescript
try {
  const validated = GoalSchema.parse(input);
} catch (error) {
  if (error instanceof z.ZodError) {
    return {
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: error.flatten().fieldErrors
    };
  }
}
```

**Business Logic Errors:**
```typescript
if (existingEmergencyFund && input.type === 'EMERGENCY_FUND') {
  return {
    success: false,
    error: 'You already have an emergency fund goal',
    code: 'DUPLICATE_EMERGENCY_FUND'
  };
}
```

**Database Errors:**
```typescript
try {
  const goal = await db.goal.create({ data: input });
} catch (error) {
  logger.error({ error, userId }, 'Failed to create goal');
  return {
    success: false,
    error: 'Failed to create goal',
    code: 'DATABASE_ERROR'
  };
}
```

---

## Testing Rules

### Coverage Requirements

- **Financial Engines:** 100% (deterministic, critical)
- **Application Layer:** 80% (business logic)
- **Presentation Layer:** 60% (UI components)

### Test Categories

**Unit Tests:**
```typescript
// Test pure functions
describe('calculateEMI', () => {
  it('should calculate EMI correctly', () => {
    expect(calculateEMI(500000, 12, 12)).toBeCloseTo(44424);
  });
});
```

**Integration Tests:**
```typescript
// Test with database
describe('createGoal', () => {
  it('should create goal and recalculate allocation', async () => {
    const goal = await createGoal(input);
    expect(goal.isFeasible).toBeDefined();
  });
});
```

**E2E Tests:**
```typescript
// Test user journeys
test('user can create goal', async ({ page }) => {
  await page.goto('/goals');
  await page.click('text=Create Goal');
  // ... complete flow
});
```

### Edge Case Testing

**Required Edge Cases:**
- Zero income
- Negative savings (should error)
- Future dates in past (should error)
- Extremely large amounts (> 1 billion)
- Extremely small amounts (< 1)
- Division by zero
- Empty arrays
- Null/undefined values

---

## Quick Reference

**Critical Rules:**
- One profile per user
- One emergency fund goal per user
- AI explains, engine calculates (NEVER mix)
- Soft delete only (never hard delete)
- Encrypt sensitive financial data
- 100% test coverage for financial engines
- All amounts positive (except deltas)
- Allocation total ≤ income
- Debt-to-income ≤ 40% (recommended)
- Essential expenses ≤ 50% income

**Validation:**
- Zod schemas for all inputs
- Cross-field validation
- Business logic validation
- Error codes for all failures

**Performance:**
- Calculations < 500ms
- Page load < 2s
- AI response < 5s
- Cache aggressively

**Privacy:**
- Encrypt sensitive fields
- Redact in logs
- Soft delete only
- Export/delete on request

---

**Document Version:** 1.0  
**Last Updated:** 2024-12-19  
**Purpose:** Quick business rules reference for AI sessions
