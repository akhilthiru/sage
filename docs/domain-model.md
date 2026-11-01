# Sage: Domain Model

## Overview

This document provides a complete specification of all business entities in the Sage domain. Each entity is defined with its purpose, fields, relationships, business rules, and extensibility considerations.

The domain model follows Domain-Driven Design (DDD) principles with clear aggregate boundaries and separation between entities and value objects.

---

## Entity Relationship Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                         USER (Aggregate Root)                     │
│  - id, clerkId, email, name                                      │
└────────────┬─────────────────────────────────────────────────────┘
             │
             │ 1:1
             ├─────────────► FinancialProfile
             │                 - income, savings, risk tolerance
             │
             │ 1:N
             ├─────────────► Goal
             │                 └─► GoalMilestone (1:N)
             │
             │ 1:N
             ├─────────────► Expense
             │                 - recurring expenses
             │
             │ 1:N
             ├─────────────► Debt
             │                 └─► DebtPayment (1:N)
             │
             │ 1:N
             ├─────────────► Asset
             │                 - investments, savings
             │
             │ 1:N
             ├─────────────► Transaction
             │                 - financial movements
             │
             │ 1:N
             ├─────────────► Allocation
             │                 - monthly allocations
             │
             │ 1:N
             ├─────────────► Conversation
             │                 └─► Message (1:N)
             │
             │ 1:N
             └─────────────► Simulation
                               - what-if scenarios
```

---

## Domain Invariants

**Global Rules That Must Always Hold:**

1. **Financial Integrity**
   - All monetary values must be non-negative (except for calculated differences)
   - Allocation total must not exceed income
   - Goal current amount must not exceed target amount
   - Debt current balance must not exceed principal amount

2. **Temporal Consistency**
   - Target dates must be in the future
   - Created timestamps must be before updated timestamps
   - Completed dates must be after start dates

3. **User Data Ownership**
   - All financial data must belong to exactly one user
   - Users can only access their own data
   - Deletion of user cascades to all owned data

4. **Calculation Determinism**
   - Same inputs must always produce same outputs
   - No randomness in financial calculations
   - All calculations must be reproducible

---

## Aggregate Boundaries

### User Aggregate
**Root:** User  
**Entities:** FinancialProfile, Goal, Expense, Debt, Asset, Transaction, Allocation, Conversation, Simulation  
**Boundary:** All financial data for a single user

**Consistency Rules:**
- Changes to goals must recalculate allocation
- Changes to income/expenses must recalculate feasibility
- Profile updates must update understanding score

---

## Entity Specifications

### 1. User

**Purpose:** Represents a person using Sage. The aggregate root for all financial data.

**Type:** Entity (Aggregate Root)

**Fields:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| id | String (CUID) | Yes | Unique, immutable | Internal user identifier |
| clerkId | String | Yes | Unique, immutable | Clerk authentication ID |
| email | String | Yes | Unique, valid email | User's email address |
| firstName | String | No | Max 100 chars | User's first name |
| lastName | String | No | Max 100 chars | User's last name |
| imageUrl | String | No | Valid URL | Profile image URL |
| createdAt | DateTime | Yes | Auto-generated | Account creation timestamp |
| updatedAt | DateTime | Yes | Auto-updated | Last update timestamp |
| deletedAt | DateTime | No | Soft delete | Deletion timestamp (null = active) |

**Relationships:**
- 1:1 with FinancialProfile (optional initially)
- 1:N with Goal
- 1:N with Expense
- 1:N with Debt
- 1:N with Asset
- 1:N with Transaction
- 1:N with Allocation
- 1:N with Conversation
- 1:N with Simulation

**Business Rules:**
1. Email must be unique across all users
2. ClerkId must match Clerk authentication system
3. User cannot be hard-deleted if they have financial data
4. Soft delete sets deletedAt timestamp
5. Deleted users cannot log in

**State Transitions:**
```
[New] → [Active] → [Deleted]
         ↑____________↓
         (can be restored)
```

**Calculated Fields:**
- `fullName`: `${firstName} ${lastName}`
- `isActive`: `deletedAt === null`

**Future Extensibility:**
- Phone number for notifications
- Preferred language
- Timezone
- Notification preferences
- Subscription tier
- Referral code

---

### 2. FinancialProfile

**Purpose:** Stores core financial information about a user. This is the foundation for all calculations.

**Type:** Entity

**Fields:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| id | String (CUID) | Yes | Unique | Profile identifier |
| userId | String | Yes | Unique, FK to User | Owner of this profile |
| monthlyIncome | Decimal(12,2) | Yes | > 0 | Primary monthly income |
| otherIncome | Decimal(12,2) | No | >= 0 | Additional income sources |
| incomeFrequency | Enum | Yes | MONTHLY/ANNUAL/WEEKLY/BIWEEKLY | Income payment frequency |
| currentSavings | Decimal(12,2) | Yes | >= 0 | Current savings balance |
| emergencyFundTarget | Decimal(12,2) | No | >= 0 | Target emergency fund amount |
| currentEmergencyFund | Decimal(12,2) | Yes | >= 0 | Current emergency fund balance |
| primaryGoal | String | No | Max 200 chars | User's primary financial goal |
| riskTolerance | Enum | Yes | CONSERVATIVE/MODERATE/AGGRESSIVE | Investment risk tolerance |
| cfoUnderstandingScore | Integer | Yes | 0-100 | Profile completeness score |
| createdAt | DateTime | Yes | Auto-generated | Profile creation timestamp |
| updatedAt | DateTime | Yes | Auto-updated | Last update timestamp |

**Relationships:**
- N:1 with User (belongs to one user)

**Business Rules:**
1. One profile per user (1:1 relationship)
2. Monthly income must be positive
3. Current emergency fund cannot exceed target (if target is set)
4. Current savings must be >= current emergency fund
5. Income frequency determines calculation normalization
6. Understanding score recalculated on every profile update

**Understanding Score Calculation:**
```typescript
const fields = {
  required: ['monthlyIncome', 'currentSavings'],
  important: ['emergencyFundTarget', 'otherIncome', 'primaryGoal'],
  optional: ['riskTolerance']
};

score = (
  (requiredFilled / requiredTotal) * 40 +
  (importantFilled / importantTotal) * 40 +
  (optionalFilled / optionalTotal) * 20
);
```

**State Transitions:**
```
[Incomplete] → [Basic] → [Good] → [Strong] → [Complete]
   0-30%       31-60%    61-85%    86-95%      96-100%
```

**Calculated Fields:**
- `totalMonthlyIncome`: Normalized total income per month
- `isComplete`: `cfoUnderstandingScore >= 90`
- `hasEmergencyFund`: `currentEmergencyFund > 0`
- `emergencyFundMonths`: `currentEmergencyFund / monthlyExpenses`

**Validation Rules:**
- If `incomeFrequency` is ANNUAL, `monthlyIncome` should be divided by 12 for calculations
- `emergencyFundTarget` should typically be 3-6 months of expenses
- `currentEmergencyFund` should be <= `currentSavings`

**Future Extensibility:**
- Tax bracket
- Dependents count
- Employment type (salaried, self-employed, business owner)
- Industry/occupation
- Financial goals beyond primary
- Credit score
- Net worth tracking

---

### 3. Goal

**Purpose:** Represents a financial goal the user wants to achieve.

**Type:** Entity

**Fields:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| id | String (CUID) | Yes | Unique | Goal identifier |
| userId | String | Yes | FK to User | Goal owner |
| name | String | Yes | 1-100 chars | Goal name |
| description | String | No | Max 500 chars | Goal description |
| type | Enum | Yes | GoalType | Goal category |
| targetAmount | Decimal(12,2) | Yes | > 0 | Target amount to save |
| currentAmount | Decimal(12,2) | Yes | >= 0 | Current progress amount |
| monthlyContribution | Decimal(12,2) | Yes | >= 0 | Planned monthly contribution |
| targetDate | DateTime | Yes | Future date | Target completion date |
| startDate | DateTime | Yes | Default: now() | Goal start date |
| completedDate | DateTime | No | After startDate | Actual completion date |
| priority | Enum | Yes | HIGH/MEDIUM/LOW | Goal priority |
| status | Enum | Yes | GoalStatus | Current status |
| isFeasible | Boolean | Yes | Calculated | Is goal achievable? |
| feasibilityScore | Integer | Yes | 0-100 | Confidence in achieving goal |
| createdAt | DateTime | Yes | Auto-generated | Creation timestamp |
| updatedAt | DateTime | Yes | Auto-updated | Last update timestamp |
| deletedAt | DateTime | No | Soft delete | Deletion timestamp |

**Enums:**

```typescript
enum GoalType {
  EMERGENCY_FUND = 'EMERGENCY_FUND',
  HOUSE = 'HOUSE',
  CAR = 'CAR',
  VACATION = 'VACATION',
  WEDDING = 'WEDDING',
  EDUCATION = 'EDUCATION',
  RETIREMENT = 'RETIREMENT',
  CUSTOM = 'CUSTOM'
}

enum Priority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}

enum GoalStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}
```

**Relationships:**
- N:1 with User
- 1:N with GoalMilestone
- 1:N with Transaction (optional)

**Business Rules:**
1. Target amount must be greater than current amount
2. Target date must be in the future (for active goals)
3. Current amount cannot exceed target amount
4. Monthly contribution calculated based on remaining amount and time
5. Status changes to COMPLETED when currentAmount >= targetAmount
6. Emergency fund goals have special priority in allocation
7. Only one EMERGENCY_FUND goal allowed per user
8. Feasibility recalculated when income, expenses, or other goals change

**Feasibility Calculation:**
```typescript
monthsRemaining = monthsBetween(now, targetDate);
remainingAmount = targetAmount - currentAmount;
requiredMonthly = remainingAmount / monthsRemaining;
availableMonthly = income - expenses - otherGoalContributions;

isFeasible = requiredMonthly <= availableMonthly;

// Confidence score factors:
// - Timeline (longer = higher confidence)
// - Required vs available ratio
// - Historical contribution consistency
// - Income stability
```

**State Transitions:**
```
[ACTIVE] ←→ [PAUSED]
   ↓
[COMPLETED]
   ↓
[CANCELLED]
```

**Calculated Fields:**
- `remainingAmount`: `targetAmount - currentAmount`
- `monthsRemaining`: Months until targetDate
- `requiredMonthly`: Amount needed per month
- `progressPercentage`: `(currentAmount / targetAmount) * 100`
- `isOnTrack`: Current progress >= expected progress
- `projectedCompletionDate`: Based on current contribution rate

**Validation Rules:**
- `targetAmount` must be between ₹1,000 and ₹10,00,00,000
- `targetDate` must be at least 1 month in the future
- `monthlyContribution` cannot exceed user's monthly surplus
- `currentAmount` must be <= `targetAmount`

**Future Extensibility:**
- Goal categories/tags
- Shared goals (family/joint)
- Goal dependencies (must complete X before Y)
- Auto-contribution rules
- Goal templates
- Stretch goals
- Goal notes/journal

---

### 4. GoalMilestone

**Purpose:** Breaks large goals into smaller, trackable milestones.

**Type:** Entity

**Fields:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| id | String (CUID) | Yes | Unique | Milestone identifier |
| goalId | String | Yes | FK to Goal | Parent goal |
| name | String | Yes | 1-100 chars | Milestone name |
| targetAmount | Decimal(12,2) | Yes | > 0 | Milestone target amount |
| targetDate | DateTime | Yes | Future date | Milestone target date |
| isCompleted | Boolean | Yes | Default: false | Completion status |
| completedDate | DateTime | No | After creation | Actual completion date |
| createdAt | DateTime | Yes | Auto-generated | Creation timestamp |
| updatedAt | DateTime | Yes | Auto-updated | Last update timestamp |

**Relationships:**
- N:1 with Goal

**Business Rules:**
1. Milestone target amount must be <= parent goal target amount
2. Milestone target date must be <= parent goal target date
3. Milestones should be ordered chronologically
4. Completion triggers when goal's currentAmount >= milestone targetAmount
5. Cannot delete completed milestones
6. Milestones auto-complete based on goal progress

**Calculated Fields:**
- `isUpcoming`: `!isCompleted && targetDate > now()`
- `isOverdue`: `!isCompleted && targetDate < now()`
- `daysUntilDue`: Days until targetDate

**Validation Rules:**
- Milestone amounts should be progressive (25%, 50%, 75%, 100%)
- Target dates must be sequential
- Cannot have more than 10 milestones per goal

**Future Extensibility:**
- Milestone rewards/celebrations
- Milestone notes
- Milestone sharing
- Custom milestone triggers

---

### 5. Expense

**Purpose:** Represents recurring or one-time expenses.

**Type:** Entity

**Fields:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| id | String (CUID) | Yes | Unique | Expense identifier |
| userId | String | Yes | FK to User | Expense owner |
| name | String | Yes | 1-100 chars | Expense name |
| amount | Decimal(12,2) | Yes | > 0 | Expense amount |
| category | Enum | Yes | ExpenseCategory | Expense category |
| frequency | Enum | Yes | Frequency | How often expense occurs |
| isEssential | Boolean | Yes | Default: false | Is this essential? |
| isActive | Boolean | Yes | Default: true | Is expense active? |
| startDate | DateTime | Yes | Default: now() | Expense start date |
| endDate | DateTime | No | After startDate | Expense end date |
| createdAt | DateTime | Yes | Auto-generated | Creation timestamp |
| updatedAt | DateTime | Yes | Auto-updated | Last update timestamp |
| deletedAt | DateTime | No | Soft delete | Deletion timestamp |

**Enums:**

```typescript
enum ExpenseCategory {
  RENT = 'RENT',
  UTILITIES = 'UTILITIES',
  GROCERIES = 'GROCERIES',
  TRANSPORTATION = 'TRANSPORTATION',
  HEALTHCARE = 'HEALTHCARE',
  INSURANCE = 'INSURANCE',
  ENTERTAINMENT = 'ENTERTAINMENT',
  DINING = 'DINING',
  SHOPPING = 'SHOPPING',
  EDUCATION = 'EDUCATION',
  OTHER = 'OTHER'
}

enum Frequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  ANNUAL = 'ANNUAL',
  ONE_TIME = 'ONE_TIME'
}
```

**Relationships:**
- N:1 with User

**Business Rules:**
1. Essential expenses prioritized in allocation
2. Inactive expenses not included in calculations
3. One-time expenses have endDate = startDate
4. Recurring expenses normalize to monthly for calculations
5. Rent, utilities, groceries typically marked essential
6. Entertainment, dining, shopping typically discretionary

**Normalization to Monthly:**
```typescript
const monthlyAmount = {
  DAILY: amount * 30,
  WEEKLY: amount * 4.33,
  BIWEEKLY: amount * 2.17,
  MONTHLY: amount,
  QUARTERLY: amount / 3,
  ANNUAL: amount / 12,
  ONE_TIME: 0 // Not included in recurring
};
```

**Calculated Fields:**
- `monthlyAmount`: Normalized monthly amount
- `annualAmount`: `monthlyAmount * 12`
- `isRecurring`: `frequency !== ONE_TIME`
- `isActive`: `!deletedAt && isActive && (!endDate || endDate > now())`

**Validation Rules:**
- Amount must be between ₹1 and ₹10,00,000
- Essential expenses should be realistic (not luxury items)
- End date must be after start date

**Future Extensibility:**
- Expense splitting (shared expenses)
- Expense attachments (receipts)
- Expense budgets per category
- Expense trends and insights
- Automatic expense detection
- Expense optimization suggestions

---

### 6. Debt

**Purpose:** Represents loans and debt obligations.

**Type:** Entity

**Fields:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| id | String (CUID) | Yes | Unique | Debt identifier |
| userId | String | Yes | FK to User | Debt owner |
| name | String | Yes | 1-100 chars | Debt name |
| type | Enum | Yes | DebtType | Debt category |
| principalAmount | Decimal(12,2) | Yes | > 0 | Original loan amount |
| currentBalance | Decimal(12,2) | Yes | >= 0 | Remaining balance |
| interestRate | Decimal(5,2) | Yes | >= 0 | Annual interest rate % |
| monthlyPayment | Decimal(12,2) | Yes | > 0 | Current monthly payment |
| minimumPayment | Decimal(12,2) | Yes | > 0 | Minimum required payment |
| startDate | DateTime | Yes | Past/present | Loan start date |
| endDate | DateTime | No | After startDate | Expected payoff date |
| status | Enum | Yes | DebtStatus | Debt status |
| createdAt | DateTime | Yes | Auto-generated | Creation timestamp |
| updatedAt | DateTime | Yes | Auto-updated | Last update timestamp |
| deletedAt | DateTime | No | Soft delete | Deletion timestamp |

**Enums:**

```typescript
enum DebtType {
  HOME_LOAN = 'HOME_LOAN',
  CAR_LOAN = 'CAR_LOAN',
  PERSONAL_LOAN = 'PERSONAL_LOAN',
  EDUCATION_LOAN = 'EDUCATION_LOAN',
  CREDIT_CARD = 'CREDIT_CARD',
  OTHER = 'OTHER'
}

enum DebtStatus {
  ACTIVE = 'ACTIVE',
  PAID_OFF = 'PAID_OFF',
  DEFAULTED = 'DEFAULTED'
}
```

**Relationships:**
- N:1 with User
- 1:N with DebtPayment

**Business Rules:**
1. Current balance cannot exceed principal amount
2. Monthly payment must be >= minimum payment
3. Interest rate must be realistic (0-50%)
4. Status changes to PAID_OFF when currentBalance = 0
5. Debt payments prioritized in allocation after essentials
6. High-interest debt prioritized for extra payments

**EMI Calculation:**
```typescript
// For new loans
P = principalAmount;
r = (interestRate / 100) / 12; // Monthly interest rate
n = tenure in months;

EMI = P × r × (1 + r)^n / ((1 + r)^n - 1);
```

**Calculated Fields:**
- `totalInterestPaid`: Sum of all interest from payments
- `totalPrincipalPaid`: `principalAmount - currentBalance`
- `remainingMonths`: Estimated months to payoff
- `debtToIncomeRatio`: `monthlyPayment / monthlyIncome`
- `interestSavingsFromPrepayment`: Potential savings from extra payments

**State Transitions:**
```
[ACTIVE] → [PAID_OFF]
   ↓
[DEFAULTED]
```

**Validation Rules:**
- Principal amount: ₹10,000 to ₹10,00,00,000
- Interest rate: 0% to 50%
- Monthly payment must cover at least interest
- Current balance must be <= principal amount

**Future Extensibility:**
- Debt consolidation tracking
- Refinancing scenarios
- Prepayment schedules
- Debt snowball/avalanche strategies
- Lender information
- Loan documents storage

---

### 7. DebtPayment

**Purpose:** Records individual debt payments for tracking and analysis.

**Type:** Entity

**Fields:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| id | String (CUID) | Yes | Unique | Payment identifier |
| debtId | String | Yes | FK to Debt | Parent debt |
| amount | Decimal(12,2) | Yes | > 0 | Total payment amount |
| principalPaid | Decimal(12,2) | Yes | >= 0 | Principal portion |
| interestPaid | Decimal(12,2) | Yes | >= 0 | Interest portion |
| paymentDate | DateTime | Yes | Past/present | Actual payment date |
| dueDate | DateTime | Yes | Any date | Payment due date |
| status | Enum | Yes | PaymentStatus | Payment status |
| createdAt | DateTime | Yes | Auto-generated | Creation timestamp |
| updatedAt | DateTime | Yes | Auto-updated | Last update timestamp |

**Enums:**

```typescript
enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  MISSED = 'MISSED',
  PARTIAL = 'PARTIAL'
}
```

**Relationships:**
- N:1 with Debt

**Business Rules:**
1. `amount = principalPaid + interestPaid`
2. Payment updates debt's currentBalance
3. Late payments (paymentDate > dueDate) flagged
4. Missed payments affect credit score (future)
5. Partial payments tracked separately

**Calculated Fields:**
- `isLate`: `paymentDate > dueDate`
- `daysLate`: Days between dueDate and paymentDate
- `isUpcoming`: `status === PENDING && dueDate > now()`

**Validation Rules:**
- Principal + interest must equal total amount
- Payment date must be <= current date (for completed)
- Cannot delete completed payments

**Future Extensibility:**
- Payment method tracking
- Auto-payment setup
- Payment reminders
- Payment receipts

---

### 8. Asset

**Purpose:** Represents user's assets and investments.

**Type:** Entity

**Fields:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| id | String (CUID) | Yes | Unique | Asset identifier |
| userId | String | Yes | FK to User | Asset owner |
| name | String | Yes | 1-100 chars | Asset name |
| type | Enum | Yes | AssetType | Asset category |
| currentValue | Decimal(12,2) | Yes | >= 0 | Current market value |
| purchaseValue | Decimal(12,2) | No | >= 0 | Original purchase value |
| purchaseDate | DateTime | No | Past date | Purchase date |
| expectedReturn | Decimal(5,2) | No | -100 to 100 | Expected annual return % |
| isLiquid | Boolean | Yes | Default: true | Can be quickly converted to cash? |
| createdAt | DateTime | Yes | Auto-generated | Creation timestamp |
| updatedAt | DateTime | Yes | Auto-updated | Last update timestamp |
| deletedAt | DateTime | No | Soft delete | Deletion timestamp |

**Enums:**

```typescript
enum AssetType {
  SAVINGS_ACCOUNT = 'SAVINGS_ACCOUNT',
  FIXED_DEPOSIT = 'FIXED_DEPOSIT',
  STOCKS = 'STOCKS',
  MUTUAL_FUNDS = 'MUTUAL_FUNDS',
  REAL_ESTATE = 'REAL_ESTATE',
  GOLD = 'GOLD',
  PPF = 'PPF',
  EPF = 'EPF',
  NPS = 'NPS',
  OTHER = 'OTHER'
}
```

**Relationships:**
- N:1 with User

**Business Rules:**
1. Liquid assets available for emergency fund
2. Real estate typically not liquid
3. Expected return used for projections
4. Current value updated manually or via integrations (future)
5. Purchase value used to calculate gains/losses

**Calculated Fields:**
- `totalGain`: `currentValue - purchaseValue`
- `gainPercentage`: `(totalGain / purchaseValue) * 100`
- `yearsHeld`: Years since purchaseDate
- `annualizedReturn`: Actual return per year

**Validation Rules:**
- Current value must be >= 0
- Expected return should be realistic (-20% to 50%)
- Purchase value should be <= current value for most assets

**Future Extensibility:**
- Asset allocation recommendations
- Rebalancing suggestions
- Tax implications
- Asset performance tracking
- Dividend/interest tracking
- Asset linking to external accounts

---

### 9. Transaction

**Purpose:** Records financial movements and contributions.

**Type:** Entity

**Fields:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| id | String (CUID) | Yes | Unique | Transaction identifier |
| userId | String | Yes | FK to User | Transaction owner |
| goalId | String | No | FK to Goal | Related goal (if any) |
| amount | Decimal(12,2) | Yes | != 0 | Transaction amount |
| type | Enum | Yes | TransactionType | Transaction category |
| category | String | No | Max 50 chars | Custom category |
| description | String | No | Max 200 chars | Transaction description |
| transactionDate | DateTime | Yes | Default: now() | Transaction date |
| source | String | No | Max 50 chars | Transaction source |
| createdAt | DateTime | Yes | Auto-generated | Creation timestamp |
| updatedAt | DateTime | Yes | Auto-updated | Last update timestamp |

**Enums:**

```typescript
enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  GOAL_CONTRIBUTION = 'GOAL_CONTRIBUTION',
  DEBT_PAYMENT = 'DEBT_PAYMENT',
  INVESTMENT = 'INVESTMENT',
  TRANSFER = 'TRANSFER'
}
```

**Relationships:**
- N:1 with User
- N:1 with Goal (optional)

**Business Rules:**
1. Goal contributions update goal's currentAmount
2. Debt payments update debt's currentBalance
3. Transactions immutable after creation (no updates)
4. Negative amounts for expenses, positive for income
5. Source tracks origin (manual, import, recurring)

**Calculated Fields:**
- `isIncome`: `type === INCOME`
- `isExpense`: `type === EXPENSE`
- `absoluteAmount`: `Math.abs(amount)`

**Validation Rules:**
- Amount must be != 0
- Transaction date must be <= current date
- Goal contributions must have valid goalId

**Future Extensibility:**
- Transaction attachments (receipts)
- Transaction splitting
- Recurring transaction templates
- Transaction categorization AI
- Bank sync integration
- Transaction search and filtering

---

### 10. Allocation

**Purpose:** Stores monthly allocation recommendations.

**Type:** Entity (Snapshot)

**Fields:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| id | String (CUID) | Yes | Unique | Allocation identifier |
| userId | String | Yes | FK to User | Allocation owner |
| month | Integer | Yes | 1-12 | Month number |
| year | Integer | Yes | >= 2024 | Year |
| essentialExpenses | Decimal(12,2) | Yes | >= 0 | Essential expenses allocation |
| debtPayments | Decimal(12,2) | Yes | >= 0 | Debt payment allocation |
| emergencyFund | Decimal(12,2) | Yes | >= 0 | Emergency fund allocation |
| goalSavings | Decimal(12,2) | Yes | >= 0 | Goal savings allocation |
| investments | Decimal(12,2) | Yes | >= 0 | Investment allocation |
| discretionary | Decimal(12,2) | Yes | >= 0 | Discretionary spending allocation |
| totalIncome | Decimal(12,2) | Yes | > 0 | Total income for month |
| totalAllocated | Decimal(12,2) | Yes | > 0 | Total allocated amount |
| isActive | Boolean | Yes | Default: true | Is this the active allocation? |
| createdAt | DateTime | Yes | Auto-generated | Creation timestamp |
| updatedAt | DateTime | Yes | Auto-updated | Last update timestamp |

**Relationships:**
- N:1 with User
- Unique constraint on (userId, month, year)

**Business Rules:**
1. Total allocated should equal total income
2. One active allocation per user per month
3. Allocations are snapshots (historical record)
4. Priority order: essentials → debt → emergency → goals → investments → discretionary
5. Emergency fund allocation stops when target reached

**Calculated Fields:**
- `unallocated`: `totalIncome - totalAllocated`
- `savingsRate`: `(goalSavings + investments + emergencyFund) / totalIncome`
- `essentialRatio`: `essentialExpenses / totalIncome`

**Validation Rules:**
- All amounts must be >= 0
- Total allocated should be <= total income
- Month must be 1-12
- Year must be current or future

**Future Extensibility:**
- Allocation templates
- Allocation comparison (month-over-month)
- Allocation optimization suggestions
- What-if allocation scenarios
- Allocation tracking vs actual spending

---

### 11. Conversation

**Purpose:** Stores AI chat conversations.

**Type:** Entity (Aggregate Root for Messages)

**Fields:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| id | String (CUID) | Yes | Unique | Conversation identifier |
| userId | String | Yes | FK to User | Conversation owner |
| title | String | No | Max 100 chars | Conversation title |
| createdAt | DateTime | Yes | Auto-generated | Creation timestamp |
| updatedAt | DateTime | Yes | Auto-updated | Last update timestamp |

**Relationships:**
- N:1 with User
- 1:N with Message

**Business Rules:**
1. Title auto-generated from first message
2. Conversations ordered by updatedAt (most recent first)
3. Empty conversations (no messages) can be deleted
4. Conversations provide context for AI responses

**Calculated Fields:**
- `messageCount`: Number of messages
- `lastMessageAt`: Timestamp of last message
- `isRecent`: Updated within last 7 days

**Validation Rules:**
- Cannot have more than 100 active conversations per user
- Conversations older than 90 days can be archived

**Future Extensibility:**
- Conversation sharing
- Conversation export
- Conversation search
- Conversation tags/categories
- Conversation pinning

---

### 12. Message

**Purpose:** Individual messages within a conversation.

**Type:** Entity

**Fields:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| id | String (CUID) | Yes | Unique | Message identifier |
| conversationId | String | Yes | FK to Conversation | Parent conversation |
| role | Enum | Yes | MessageRole | Message sender |
| content | String (Text) | Yes | Max 10,000 chars | Message content |
| metadata | JSON | No | Valid JSON | Structured data (calculations, etc.) |
| createdAt | DateTime | Yes | Auto-generated | Creation timestamp |

**Enums:**

```typescript
enum MessageRole {
  USER = 'USER',
  ASSISTANT = 'ASSISTANT',
  SYSTEM = 'SYSTEM'
}
```

**Relationships:**
- N:1 with Conversation

**Business Rules:**
1. Messages are immutable (no updates)
2. Messages ordered by createdAt
3. System messages used for context/instructions
4. Metadata stores calculation results for transparency
5. User and assistant messages alternate

**Metadata Structure:**
```typescript
interface MessageMetadata {
  intent?: {
    type: string;
    parameters: Record<string, any>;
  };
  calculations?: {
    input: Record<string, any>;
    output: Record<string, any>;
    formula?: string;
  };
  confidence?: number;
  sources?: string[]; // Data sources used
}
```

**Validation Rules:**
- Content cannot be empty
- Role must be valid enum value
- Metadata must be valid JSON

**Future Extensibility:**
- Message reactions
- Message editing (with history)
- Message citations
- Message formatting (markdown)
- Voice messages

---

### 13. Simulation

**Purpose:** Stores what-if scenario simulations.

**Type:** Entity

**Fields:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| id | String (CUID) | Yes | Unique | Simulation identifier |
| userId | String | Yes | FK to User | Simulation owner |
| type | Enum | Yes | SimulationType | Simulation category |
| parameters | JSON | Yes | Valid JSON | Simulation inputs |
| results | JSON | Yes | Valid JSON | Simulation outputs |
| title | String | No | Max 100 chars | Simulation title |
| description | String | No | Max 500 chars | Simulation description |
| createdAt | DateTime | Yes | Auto-generated | Creation timestamp |

**Enums:**

```typescript
enum SimulationType {
  PURCHASE_AFFORDABILITY = 'PURCHASE_AFFORDABILITY',
  LOAN_FEASIBILITY = 'LOAN_FEASIBILITY',
  GOAL_TIMELINE = 'GOAL_TIMELINE',
  INCOME_CHANGE = 'INCOME_CHANGE',
  EXPENSE_CHANGE = 'EXPENSE_CHANGE',
  RETIREMENT_PLANNING = 'RETIREMENT_PLANNING'
}
```

**Relationships:**
- N:1 with User

**Business Rules:**
1. Simulations are historical records (immutable)
2. Parameters and results stored as JSON for flexibility
3. Simulations can be re-run with updated data
4. Simulations linked to conversations when created via chat

**Parameters Structure (varies by type):**

```typescript
// Purchase Affordability
interface PurchaseParams {
  purchaseAmount: number;
  item?: string;
  paymentMethod?: 'savings' | 'loan' | 'emi';
}

// Loan Feasibility
interface LoanParams {
  loanAmount: number;
  interestRate: number;
  tenure: number; // months
  downPayment?: number;
}

// Goal Timeline
interface GoalTimelineParams {
  goalId: string;
  newTargetAmount?: number;
  newTargetDate?: string;
  newMonthlyContribution?: number;
}
```

**Results Structure:**

```typescript
interface SimulationResults {
  canAfford: boolean;
  confidence: number; // 0-100
  impact: {
    emergencyFund?: number;
    goals?: Array<{
      goalId: string;
      delayMonths: number;
    }>;
    monthlyCashFlow?: number;
  };
  recommendations: string[];
  alternatives?: Array<{
    approach: string;
    timeline: number;
    impact: string;
  }>;
}
```

**Validation Rules:**
- Parameters must match simulation type
- Results must include required fields
- Simulations older than 30 days can be archived

**Future Extensibility:**
- Simulation comparison
- Simulation sharing
- Simulation templates
- Monte Carlo simulations
- Multi-scenario analysis
- Simulation versioning

---

## Value Objects

### 1. Money

**Purpose:** Represents monetary values with currency.

```typescript
interface Money {
  amount: Decimal;
  currency: 'INR' | 'USD'; // Extensible
}
```

**Business Rules:**
- Amount must be precise (Decimal, not Float)
- Currency conversions must use current rates
- All calculations preserve precision

---

### 2. DateRange

**Purpose:** Represents a period of time.

```typescript
interface DateRange {
  startDate: DateTime;
  endDate: DateTime;
}
```

**Business Rules:**
- End date must be after start date
- Used for filtering, reporting, projections

---

### 3. ConfidenceScore

**Purpose:** Represents confidence in a calculation or prediction.

```typescript
interface ConfidenceScore {
  value: number; // 0-100
  factors: Array<{
    name: string;
    impact: number; // -50 to +50
    reason: string;
  }>;
}
```

**Business Rules:**
- Value must be 0-100
- Factors explain the score
- Used for transparency in AI responses

---

## Domain Events

**Events that trigger side effects:**

1. **UserCreated** → Create default financial profile
2. **ProfileUpdated** → Recalculate understanding score, update allocations
3. **GoalCreated** → Recalculate allocation, check feasibility
4. **GoalCompleted** → Trigger celebration, update allocation
5. **DebtPaidOff** → Trigger celebration, update allocation
6. **AllocationCalculated** → Store snapshot, notify user
7. **SimulationRun** → Store results, track usage
8. **EmergencyFundReached** → Notify user, adjust allocation priority

---

## Aggregate Consistency Rules

**Within User Aggregate:**

1. **Goal Changes** → Must recalculate allocation
2. **Income/Expense Changes** → Must recalculate feasibility for all goals
3. **Debt Changes** → Must update allocation
4. **Profile Completion** → Must update understanding score

**Cross-Aggregate:**

1. Simulations reference but don't modify goals/debts
2. Conversations reference but don't modify financial data
3. Transactions may update goal/debt balances (eventual consistency acceptable)

---

## Future Extensibility Considerations

### New Entities (Potential)

1. **Budget** - Monthly budget tracking
2. **Notification** - User notifications and alerts
3. **Report** - Generated financial reports
4. **Document** - Uploaded financial documents
5. **Subscription** - Recurring subscription tracking
6. **Family** - Family/joint account management
7. **Advisor** - Human advisor interactions
8. **Achievement** - Gamification achievements

### New Relationships

1. **Goal Dependencies** - Goals that depend on other goals
2. **Shared Goals** - Goals shared between users
3. **Asset-Goal Linking** - Assets earmarked for specific goals
4. **Expense-Budget Linking** - Expenses linked to budget categories

### New Value Objects

1. **Address** - User address for tax purposes
2. **PhoneNumber** - Contact information
3. **TaxBracket** - Tax calculation support
4. **CreditScore** - Credit score tracking

---

## Conclusion

This domain model provides:

✅ **Complete entity specifications** with all fields, relationships, and business rules  
✅ **Clear aggregate boundaries** for consistency management  
✅ **Validation rules** for data integrity  
✅ **Calculated fields** for derived data  
✅ **State transitions** for entity lifecycles  
✅ **Future extensibility** considerations  
✅ **Domain events** for side effects  
✅ **Value objects** for domain concepts  

The model is designed to be:
- **Comprehensive** - Covers all MVP requirements
- **Extensible** - Can grow with product evolution
- **Consistent** - Clear rules and invariants
- **Type-safe** - Works with TypeScript/Prisma
- **Testable** - All rules can be unit tested

This serves as the single source of truth for all business entities in Sage.
