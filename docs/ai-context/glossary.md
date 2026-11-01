# Sage: Project Glossary

**Terminology Reference for AI Development**

---

## Product Terms

### Sage
The AI-powered Personal CFO platform. Named to evoke wisdom and financial guidance.

### Personal CFO
Chief Financial Officer for individuals. Provides strategic financial guidance, not just tracking.

### Financial Digital Twin
Long-term vision: Complete digital representation of user's financial life that can simulate any scenario.

---

## Core Concepts

### Allocation
Distribution of monthly income across spending categories using waterfall priority.

**Categories (in priority order):**
1. Essential Expenses
2. Debt Payments
3. Emergency Fund
4. Goal Savings
5. Investments
6. Discretionary

**Example:**
```
Income: ₹80,000
Allocation:
- Essential Expenses: ₹40,000 (50%)
- Debt Payments: ₹10,000 (12.5%)
- Emergency Fund: ₹6,000 (7.5%)
- Goal Savings: ₹18,000 (22.5%)
- Investments: ₹4,500 (5.6%)
- Discretionary: ₹1,500 (1.9%)
```

### Feasibility
Whether a goal can be achieved with available income and timeline.

**Calculation:**
```
utilizationRatio = requiredMonthly / availableMonthly
isFeasible = utilizationRatio <= 1.0
feasibilityScore = (1 - utilizationRatio) × 100
```

**Levels:**
- Easily achievable: utilizationRatio < 0.5
- On track: utilizationRatio < 0.8
- Tight but feasible: utilizationRatio < 1.0
- Infeasible: utilizationRatio >= 1.0

### Understanding Score
Profile completeness score (0-100) based on filled fields.

**Formula:**
```
score = (requiredFilled/2 × 40) + (importantFilled/3 × 40) + (optionalFilled/1 × 20)
```

**Fields:**
- Required (40%): monthlyIncome, currentSavings
- Important (40%): emergencyFundTarget, otherIncome, primaryGoal
- Optional (20%): riskTolerance

**Levels:**
- Incomplete: 0-30%
- Basic: 31-60%
- Good: 61-85%
- Strong: 86-95%
- Complete: 96-100%

### Confidence Score
Prediction reliability score (0-100) based on data quality and stability.

**Factors:**
- Profile completeness (+/- 20)
- Income stability (+/- 10)
- Emergency fund status (+/- 15)
- Debt load (+/- 10)
- Goal timeline (+/- 10)

**Levels:**
- Very High: 90-100
- High: 70-89
- Medium: 50-69
- Low: 30-49
- Very Low: 0-29

---

## Financial Terms

### EMI (Equated Monthly Installment)
Fixed monthly payment for a loan.

**Formula:**
```
EMI = P × r × (1+r)^n / ((1+r)^n - 1)

Where:
P = Principal amount
r = Monthly interest rate (annual / 12 / 100)
n = Tenure in months
```

**Example:**
```
Principal: ₹5,00,000
Rate: 12% annual
Tenure: 12 months
EMI: ₹44,424
```

### Debt-to-Income Ratio
Percentage of monthly income used for debt payments.

**Formula:**
```
ratio = totalDebtPayments / monthlyIncome
```

**Thresholds:**
- Comfortable: <= 30%
- Manageable: <= 40%
- Risky: <= 50%
- Unaffordable: > 50%

### Emergency Fund
Savings reserved for unexpected expenses.

**Target:** 3-6 months of essential expenses

**Priority:** Takes priority over goals until target is reached

### Essential Expenses
Necessary monthly expenses (rent, utilities, groceries, etc.)

**Cap:** Maximum 50% of monthly income

### Discretionary Spending
Flexible spending after all priorities are met.

**Calculation:** Remainder after all allocations

### Utilization Ratio
Ratio of required monthly savings to available monthly savings for a goal.

**Formula:**
```
utilizationRatio = requiredMonthly / availableMonthly
```

**Interpretation:**
- < 1.0: Goal is feasible
- >= 1.0: Goal is infeasible

---

## Technical Terms

### Server Action
Next.js feature for server-side mutations with type safety.

**Characteristics:**
- Marked with `'use server'`
- Runs on server
- Type-safe
- Automatic serialization

**Example:**
```typescript
'use server';

export async function createGoal(input: GoalInput) {
  // Server-side code
}
```

### Server Component
React component that renders on server (default in App Router).

**Characteristics:**
- No client-side JavaScript
- Direct database access
- Cannot use hooks (useState, useEffect)
- Better performance

### Client Component
React component that renders on client.

**Characteristics:**
- Marked with `'use client'`
- Can use hooks
- Can handle events
- Runs in browser

### Modular Monolith
Architecture with clear module boundaries but single deployment.

**Characteristics:**
- Clear module boundaries (like microservices)
- Single deployment (like monolith)
- Event-driven communication
- Future extraction path

### Monorepo
Single repository containing all code.

**Benefits:**
- Shared code
- Atomic changes
- Easy refactoring
- Single source of truth

### Soft Delete
Marking records as deleted without actually removing them.

**Implementation:**
```typescript
deletedAt: DateTime?
```

**Query:**
```typescript
where: { deletedAt: null }
```

### Waterfall Priority
Sequential allocation where each category gets its share before the next.

**Order:**
1. Essential Expenses (highest priority)
2. Debt Payments
3. Emergency Fund
4. Goal Savings
5. Investments
6. Discretionary (lowest priority)

---

## Domain Entities

### User
Account owner. One per Clerk account.

**Key Fields:**
- `clerkId`: Unique identifier from Clerk
- `email`: User email
- `name`: User name

### FinancialProfile
User's financial snapshot. One per user.

**Key Fields:**
- `monthlyIncome`: Monthly income
- `currentSavings`: Total savings
- `emergencyFundTarget`: Target emergency fund
- `cfoUnderstandingScore`: Profile completeness (0-100)

### Goal
Financial objective with target amount and date.

**Types:**
- EMERGENCY_FUND (one per user)
- HOUSE
- CAR
- VACATION
- WEDDING
- EDUCATION
- RETIREMENT
- CUSTOM

**Key Fields:**
- `targetAmount`: Goal amount
- `currentAmount`: Progress so far
- `targetDate`: When to achieve
- `isFeasible`: Can be achieved?
- `feasibilityScore`: Confidence (0-100)

### GoalMilestone
Checkpoint within a goal.

**Key Fields:**
- `goalId`: Parent goal
- `targetAmount`: Milestone amount
- `targetDate`: Milestone date
- `isCompleted`: Achieved?

### Expense
Recurring or one-time expense.

**Categories:**
- RENT, UTILITIES, GROCERIES
- TRANSPORTATION, HEALTHCARE, INSURANCE
- ENTERTAINMENT, DINING, SHOPPING
- EDUCATION, OTHER

**Key Fields:**
- `amount`: Expense amount
- `frequency`: How often (DAILY, WEEKLY, MONTHLY, etc.)
- `isEssential`: Priority in allocation
- `isActive`: Include in calculations?

### Debt
Loan or liability.

**Types:**
- HOME_LOAN
- CAR_LOAN
- PERSONAL_LOAN
- EDUCATION_LOAN
- CREDIT_CARD
- OTHER

**Key Fields:**
- `principalAmount`: Original loan amount
- `currentBalance`: Remaining amount
- `interestRate`: Annual percentage
- `monthlyPayment`: Monthly payment
- `minimumPayment`: Minimum required

### Allocation
Monthly budget snapshot.

**Key Fields:**
- `month`, `year`: Time period
- `essentialExpenses`: Essential spending
- `debtPayments`: Debt payments
- `emergencyFund`: Emergency fund contribution
- `goalSavings`: Goal contributions
- `investments`: Investment contributions
- `discretionary`: Flexible spending

### Conversation
AI chat session.

**Key Fields:**
- `userId`: Owner
- `title`: Auto-generated from first message
- `messages`: Related messages

### Message
Single message in conversation.

**Roles:**
- USER: From user
- ASSISTANT: From AI
- SYSTEM: System messages

**Key Fields:**
- `content`: Message text
- `metadata`: Calculation details, intent, confidence

### Simulation
What-if scenario result.

**Types:**
- PURCHASE_AFFORDABILITY: Can I buy this?
- LOAN_FEASIBILITY: Should I take this loan?
- GOAL_TIMELINE: What if I change goal parameters?
- CASH_FLOW_PROJECTION: Future financial state

---

## Abbreviations

### CFO
Chief Financial Officer

### EMI
Equated Monthly Installment

### ACID
Atomicity, Consistency, Isolation, Durability (database properties)

### GDPR
General Data Protection Regulation

### MAU
Monthly Active Users

### NPS
Net Promoter Score

### DX
Developer Experience

### UX
User Experience

### ORM
Object-Relational Mapping

### API
Application Programming Interface

### UI
User Interface

### SSR
Server-Side Rendering

### ISR
Incremental Static Regeneration

### CDN
Content Delivery Network

### PR
Pull Request

### CI/CD
Continuous Integration / Continuous Deployment

---

## Status Values

### Goal Status
- **ACTIVE**: Currently working towards
- **PAUSED**: Temporarily stopped
- **COMPLETED**: Target achieved
- **CANCELLED**: Abandoned

### Debt Status
- **ACTIVE**: Currently paying
- **PAID_OFF**: Fully repaid
- **DEFAULTED**: Missed payments (future)

### Priority Levels
- **HIGH**: Top priority
- **MEDIUM**: Normal priority
- **LOW**: Lower priority

### Risk Tolerance
- **CONSERVATIVE**: Low risk preference
- **MODERATE**: Balanced risk
- **AGGRESSIVE**: High risk tolerance

### Income Frequency
- **DAILY**: Daily income
- **WEEKLY**: Weekly income
- **BIWEEKLY**: Every 2 weeks
- **MONTHLY**: Monthly income
- **QUARTERLY**: Every 3 months
- **ANNUAL**: Yearly income
- **ONE_TIME**: Single occurrence

---

## Calculation Terms

### Normalization
Converting different frequencies to monthly equivalent.

**Multipliers:**
- DAILY: × 30
- WEEKLY: × 4.33
- BIWEEKLY: × 2.17
- MONTHLY: × 1
- QUARTERLY: ÷ 3
- ANNUAL: ÷ 12
- ONE_TIME: 0

### Projection
Forecasting future financial state month-by-month.

**Inputs:**
- Current financial profile
- Goals and timeline
- Expenses and debts

**Output:**
- Month-by-month savings
- Goal progress
- Completion dates

### Simulation
What-if scenario analysis.

**Scenarios:**
1. Buy from savings
2. Take loan
3. Save first

**Output:**
- Viability
- Impact on finances
- Pros and cons
- Recommendation

---

## Architecture Terms

### Layer
Horizontal slice of architecture.

**Layers:**
1. **Presentation**: UI, pages, components
2. **Application**: Business logic, Server Actions
3. **Domain**: Pure logic, calculations
4. **Infrastructure**: Database, external services

### Module
Vertical slice of functionality.

**Modules:**
- Onboarding
- Goals
- Allocation
- Chat
- Simulation
- Expenses
- Debts

### Public API
Exported functions/types from a module.

**Location:** `features/*/index.ts`

**Purpose:** Define module boundaries

### Event
Notification of state change.

**Examples:**
- `goal.created`
- `allocation.calculated`
- `profile.updated`

**Pattern:**
```typescript
eventBus.emit('goal.created', { goalId, userId });
```

---

## AI Terms

### Intent
User's goal extracted from natural language.

**Examples:**
- "Can I afford this?" → PURCHASE_AFFORDABILITY
- "Should I take this loan?" → LOAN_FEASIBILITY
- "Will I reach my goal?" → GOAL_PROJECTION

### Context
Information needed to answer user's question.

**Includes:**
- Financial profile
- Goals
- Expenses
- Debts
- Allocation

### Explanation
Natural language description of calculation result.

**Requirements:**
- Cite data sources
- Show calculation steps
- Include confidence score
- Acknowledge limitations

### Hallucination
LLM generating false information.

**Prevention:**
- Never use LLM for calculations
- Always cite sources
- Show confidence scores
- Verify with deterministic engines

---

## Common Phrases

### "AI explains, engine calculates"
The most important rule. LLM only explains results from deterministic TypeScript functions.

### "Soft delete only"
Never hard delete data. Always set `deletedAt` timestamp.

### "Type safety first"
Use TypeScript strict mode, no `any` types.

### "Feature-based organization"
Organize code by feature, not by layer.

### "Public API only"
Import from module's public API (`index.ts`), not internal files.

### "Explicit over clever"
Write clear, readable code over clever optimizations.

### "Fail fast"
Validate inputs at boundaries, throw errors early.

### "Pure domain logic"
Domain layer has no framework dependencies, side effects.

---

## Currency

### ₹ (Rupee)
Indian Rupee, primary currency for Sage.

**Formatting:**
- ₹80,000 (with comma separators)
- ₹5,00,000 (Indian numbering system)

**Future:** Multi-currency support planned for Phase 3

---

## Time Periods

### Month
Calendar month (1-12)

### Year
Calendar year (e.g., 2024)

### Tenure
Loan duration in months

### Timeline
Time from now to goal target date

---

## Quick Reference

**Most Important Terms:**
- Allocation
- Feasibility
- Understanding Score
- Confidence Score
- EMI
- Server Action
- Modular Monolith
- Soft Delete

**Most Important Rule:**
"AI explains, engine calculates"

**Most Important Entities:**
- User
- FinancialProfile
- Goal
- Allocation

**Most Important Statuses:**
- Goal: ACTIVE, PAUSED, COMPLETED, CANCELLED
- Priority: HIGH, MEDIUM, LOW

---

## Usage Guidelines

**For AI Sessions:**
1. Use exact terminology from this glossary
2. Don't invent new terms without adding them here
3. When unsure, refer to this document
4. Maintain consistency across codebase

**For Developers:**
1. Use these terms in code, comments, documentation
2. Don't use synonyms (e.g., "budget" instead of "allocation")
3. Update glossary when adding new concepts
4. Link to glossary in code reviews

**For Documentation:**
1. Define terms on first use
2. Link to glossary for complex terms
3. Use consistent terminology
4. Update glossary when terms evolve

---

**Document Version:** 1.0  
**Last Updated:** 2024-12-19  
**Purpose:** Terminology reference for consistent communication  
**Audience:** AI sessions, developers, documentation  
**Update:** When new terms are introduced or definitions change
