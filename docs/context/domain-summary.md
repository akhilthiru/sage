# Sage: Domain Summary

**Core Entities & Relationships**

---

## Entity Overview

**14 Core Entities:**
1. User - Account owner
2. FinancialProfile - User's financial snapshot
3. Goal - Financial objectives
4. GoalMilestone - Goal checkpoints
5. Expense - Recurring/one-time expenses
6. Debt - Loans and liabilities
7. DebtPayment - Payment history
8. Asset - Owned assets
9. Transaction - Financial transactions
10. Allocation - Monthly budget allocation
11. Conversation - AI chat sessions
12. Message - Chat messages
13. Simulation - What-if scenarios
14. Value Objects - Money, DateRange, etc.

---

## Core Entities

### User
```typescript
{
  id: string (CUID)
  clerkId: string (unique, from Clerk)
  email: string
  name: string
  createdAt: DateTime
  updatedAt: DateTime
  deletedAt: DateTime? (soft delete)
}
```
**Purpose:** Authentication and account management  
**Relationships:** 1:1 FinancialProfile, 1:N Goals, Expenses, Debts, etc.

---

### FinancialProfile
```typescript
{
  id: string
  userId: string (unique - one per user)
  monthlyIncome: Decimal (> 0)
  otherIncome: Decimal? (>= 0)
  incomeFrequency: MONTHLY | ANNUAL | WEEKLY | BIWEEKLY
  currentSavings: Decimal (>= 0)
  emergencyFundTarget: Decimal?
  currentEmergencyFund: Decimal (>= 0)
  primaryGoal: string?
  riskTolerance: CONSERVATIVE | MODERATE | AGGRESSIVE
  cfoUnderstandingScore: int (0-100, calculated)
}
```

**Purpose:** User's financial snapshot for calculations

**Key Rules:**
- One profile per user (1:1)
- `currentSavings >= currentEmergencyFund`
- `currentEmergencyFund <= emergencyFundTarget` (if set)
- Understanding score recalculated on every update

**Understanding Score Formula:**
```
score = (requiredFilled/2 * 40) + (importantFilled/3 * 40) + (optionalFilled/1 * 20)
Required: monthlyIncome, currentSavings
Important: emergencyFundTarget, otherIncome, primaryGoal
Optional: riskTolerance
```

**Calculated Fields:**
- `totalMonthlyIncome` - Normalized to monthly
- `isComplete` - Score >= 90
- `emergencyFundMonths` - currentEmergencyFund / monthlyExpenses

---

### Goal
```typescript
{
  id: string
  userId: string
  name: string (max 100 chars)
  description: string? (max 500 chars)
  type: EMERGENCY_FUND | HOUSE | CAR | VACATION | WEDDING | 
        EDUCATION | RETIREMENT | CUSTOM
  targetAmount: Decimal (> 0)
  currentAmount: Decimal (>= 0, default 0)
  targetDate: DateTime (future)
  priority: HIGH | MEDIUM | LOW
  status: ACTIVE | PAUSED | COMPLETED | CANCELLED
  isFeasible: boolean (calculated)
  feasibilityScore: int (0-100, calculated)
  monthlyContribution: Decimal (calculated)
}
```

**Purpose:** Financial objectives with feasibility tracking

**Key Rules:**
- Only one EMERGENCY_FUND goal per user
- `targetDate` must be in future
- `currentAmount < targetAmount`
- Status transitions: ACTIVE ↔ PAUSED → COMPLETED/CANCELLED
- Auto-complete when `currentAmount >= targetAmount`

**Calculated Fields:**
- `isFeasible` - Can achieve with available income
- `feasibilityScore` - Confidence (0-100)
- `monthlyContribution` - Required monthly savings
- `projectedCompletionDate` - When goal will complete
- `progressPercentage` - (currentAmount / targetAmount) * 100

---

### GoalMilestone
```typescript
{
  id: string
  goalId: string
  name: string
  targetAmount: Decimal
  targetDate: DateTime
  isCompleted: boolean
  completedAt: DateTime?
}
```

**Purpose:** Track progress checkpoints within goals

**Relationships:** N:1 with Goal

---

### Expense
```typescript
{
  id: string
  userId: string
  name: string
  amount: Decimal (> 0)
  category: RENT | UTILITIES | GROCERIES | TRANSPORTATION | 
           HEALTHCARE | INSURANCE | ENTERTAINMENT | DINING | 
           SHOPPING | EDUCATION | OTHER
  frequency: DAILY | WEEKLY | BIWEEKLY | MONTHLY | 
             QUARTERLY | ANNUAL | ONE_TIME
  isEssential: boolean
  startDate: DateTime?
  endDate: DateTime?
  isActive: boolean (default true)
}
```

**Purpose:** Track recurring and one-time expenses

**Key Rules:**
- `endDate > startDate` (if both set)
- Essential expenses prioritized in allocation
- Frequency determines monthly normalization

**Calculated Fields:**
- `monthlyAmount` - Normalized to monthly frequency
- `annualAmount` - Total annual cost

---

### Debt
```typescript
{
  id: string
  userId: string
  name: string
  type: HOME_LOAN | CAR_LOAN | PERSONAL_LOAN | 
        EDUCATION_LOAN | CREDIT_CARD | OTHER
  principalAmount: Decimal (> 0)
  currentBalance: Decimal (>= 0)
  interestRate: Decimal (0-50, annual %)
  monthlyPayment: Decimal (> 0)
  minimumPayment: Decimal (> 0)
  startDate: DateTime
  endDate: DateTime? (maturity)
  status: ACTIVE | PAID_OFF | DEFAULTED
}
```

**Purpose:** Track loans and liabilities

**Key Rules:**
- `currentBalance <= principalAmount`
- `monthlyPayment >= minimumPayment`
- Auto-complete when `currentBalance = 0`

**Calculated Fields:**
- `remainingMonths` - Months to payoff
- `totalInterest` - Total interest to be paid
- `debtToIncomeRatio` - monthlyPayment / monthlyIncome

---

### Allocation
```typescript
{
  id: string
  userId: string
  month: int (1-12)
  year: int
  essentialExpenses: Decimal
  debtPayments: Decimal
  emergencyFund: Decimal
  goalSavings: Decimal
  investments: Decimal
  discretionary: Decimal
  totalIncome: Decimal
  totalAllocated: Decimal
}
```

**Purpose:** Monthly budget snapshot (calculated, then saved)

**Key Rules:**
- `totalAllocated = sum of all categories`
- `totalAllocated <= totalIncome`
- One allocation per user per month/year
- Recalculated when goals/expenses/debts change

**Waterfall Priority:**
1. Essential expenses (50% max)
2. Debt payments (minimum)
3. Emergency fund (until target)
4. Goal savings (by priority)
5. Investments (10-20% recommended)
6. Discretionary (remainder)

---

### Conversation & Message
```typescript
Conversation {
  id: string
  userId: string
  title: string? (auto-generated from first message)
  createdAt: DateTime
  updatedAt: DateTime
}

Message {
  id: string
  conversationId: string
  role: USER | ASSISTANT | SYSTEM
  content: string (max 10,000 chars)
  metadata: JSON? {
    intent?: { type, parameters }
    calculations?: { input, output, formula }
    confidence?: number
  }
  createdAt: DateTime
}
```

**Purpose:** AI chat history and context

**Key Rules:**
- Messages ordered by createdAt
- Metadata stores calculation details (not in content)
- System messages for important events

---

### Simulation
```typescript
{
  id: string
  userId: string
  type: PURCHASE_AFFORDABILITY | LOAN_FEASIBILITY | 
        GOAL_TIMELINE | CASH_FLOW_PROJECTION
  input: JSON (parameters)
  output: JSON (results)
  createdAt: DateTime
}
```

**Purpose:** Historical what-if scenarios

**Types:**
- **PURCHASE_AFFORDABILITY** - Can I buy this?
- **LOAN_FEASIBILITY** - Should I take this loan?
- **GOAL_TIMELINE** - What if I change goal parameters?
- **CASH_FLOW_PROJECTION** - Future financial state

---

## Entity Relationships

```
User (1)
  ├─→ FinancialProfile (1)
  ├─→ Goal (N)
  │    └─→ GoalMilestone (N)
  ├─→ Expense (N)
  ├─→ Debt (N)
  │    └─→ DebtPayment (N)
  ├─→ Asset (N)
  ├─→ Transaction (N)
  ├─→ Allocation (N)
  ├─→ Conversation (N)
  │    └─→ Message (N)
  └─→ Simulation (N)
```

**Key Relationships:**
- User → FinancialProfile: **1:1** (unique userId)
- User → Goal: **1:N** (multiple goals)
- Goal → GoalMilestone: **1:N** (progress tracking)
- User → Debt: **1:N** (multiple debts)
- Debt → DebtPayment: **1:N** (payment history)
- Conversation → Message: **1:N** (chat history)

---

## Aggregate Boundaries

**Aggregate Root: User**
- Controls: FinancialProfile, Goals, Expenses, Debts
- Ensures: Data consistency across user's financial data
- Transactions: All user data changes in single transaction

**Aggregate Root: Conversation**
- Controls: Messages
- Ensures: Message ordering and context
- Transactions: Conversation + messages together

**Aggregate Root: Simulation**
- Controls: Simulation results
- Ensures: Immutable historical record
- Transactions: Single simulation record

---

## Domain Invariants

**Cross-Entity Rules:**

1. **Income Sufficiency**
   ```
   totalIncome >= (essentialExpenses + minimumDebtPayments)
   ```

2. **Emergency Fund Priority**
   ```
   IF emergencyFund < emergencyFundTarget
   THEN prioritize emergency fund over goals
   ```

3. **Debt-to-Income Ratio**
   ```
   totalDebtPayments / monthlyIncome <= 0.40 (recommended)
   ```

4. **Savings Consistency**
   ```
   currentSavings >= currentEmergencyFund + sum(goal.currentAmount)
   ```

5. **Allocation Balance**
   ```
   totalAllocated <= totalIncome
   sum(allocations) = totalAllocated
   ```

---

## State Transitions

### Goal Status
```
[ACTIVE] ←→ [PAUSED]
   ↓           ↓
[COMPLETED] [CANCELLED]
```

**Triggers:**
- ACTIVE → COMPLETED: `currentAmount >= targetAmount`
- ACTIVE → PAUSED: User action
- PAUSED → ACTIVE: User action
- Any → CANCELLED: User action

### Debt Status
```
[ACTIVE] → [PAID_OFF]
   ↓
[DEFAULTED]
```

**Triggers:**
- ACTIVE → PAID_OFF: `currentBalance = 0`
- ACTIVE → DEFAULTED: Missed payments (future)

### FinancialProfile Completeness
```
[Incomplete] → [Basic] → [Good] → [Strong] → [Complete]
   0-30%       31-60%    61-85%    86-95%      96-100%
```

**Based on:** Understanding score calculation

---

## Value Objects

### Money
```typescript
{
  amount: Decimal
  currency: 'INR' (default, future: multi-currency)
}
```

### DateRange
```typescript
{
  startDate: DateTime
  endDate: DateTime
}
```

### Frequency
```typescript
enum: DAILY | WEEKLY | BIWEEKLY | MONTHLY | QUARTERLY | ANNUAL | ONE_TIME
```

**Conversion to Monthly:**
- DAILY: amount * 30
- WEEKLY: amount * 4.33
- BIWEEKLY: amount * 2.17
- MONTHLY: amount * 1
- QUARTERLY: amount / 3
- ANNUAL: amount / 12
- ONE_TIME: 0 (not recurring)

---

## Calculated vs Stored Fields

### Stored (Persisted)
- User input: income, savings, goal amounts
- System generated: IDs, timestamps
- Snapshots: Allocation (monthly snapshot)

### Calculated (On-Demand)
- Understanding score (from profile completeness)
- Goal feasibility (from income vs requirements)
- Monthly contribution (from goal amount and timeline)
- Debt-to-income ratio (from debts and income)
- Emergency fund months (from fund and expenses)

**Rule:** Recalculate on every data change, cache if needed

---

## Data Validation

### Field-Level
- **Amounts:** Positive decimals, max 12 digits
- **Percentages:** 0-100 for scores, 0-50 for interest rates
- **Dates:** Future dates for goals, valid ranges
- **Strings:** Max lengths enforced
- **Enums:** Strict type checking

### Business-Level
- Income > essential expenses
- Savings >= emergency fund
- Goal target date in future
- Debt balance <= principal
- Allocation total <= income

### Cross-Entity
- One emergency fund goal per user
- One financial profile per user
- Allocation matches income/expenses

---

## Extensibility Points

**Future Additions:**

1. **FinancialProfile**
   - Tax bracket
   - Dependents count
   - Employment type
   - Credit score

2. **Goal**
   - Shared goals (family)
   - Goal dependencies
   - Auto-contribution rules

3. **Expense**
   - Actual vs budgeted tracking
   - Receipt attachments
   - Merchant categorization

4. **Debt**
   - Refinancing options
   - Payoff strategies (snowball/avalanche)
   - Credit utilization tracking

5. **New Entities**
   - IncomeSource (multiple income streams)
   - Investment (portfolio tracking)
   - Notification (alerts and reminders)
   - RecurringTransaction (automation)

---

## Quick Reference

**Primary Entities:** User, FinancialProfile, Goal, Expense, Debt, Allocation  
**Supporting Entities:** GoalMilestone, DebtPayment, Transaction, Asset  
**AI Entities:** Conversation, Message  
**Analysis Entities:** Simulation, Allocation  

**Key Relationships:**
- User → FinancialProfile: 1:1
- User → Goal: 1:N
- Goal → Milestone: 1:N
- User → Allocation: 1:N (one per month)

**Critical Rules:**
- One profile per user
- One emergency fund goal per user
- Allocation total <= income
- All amounts positive (except deltas)

---

**Document Version:** 1.0  
**Last Updated:** 2024-12-19  
**Purpose:** Quick domain model reference for AI sessions
