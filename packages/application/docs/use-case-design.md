# Use Case Design

**Package**: `@sage/application`  
**Version**: 1.0.0  
**Last Updated**: 2024

---

## Table of Contents

1. [Overview](#overview)
2. [Onboarding Use Cases](#onboarding-use-cases)
3. [Goal Use Cases](#goal-use-cases)
4. [Expense Use Cases](#expense-use-cases)
5. [Debt Use Cases](#debt-use-cases)
6. [Allocation Use Cases](#allocation-use-cases)
7. [Simulation Use Cases](#simulation-use-cases)
8. [Chat Use Cases](#chat-use-cases)
9. [Dashboard Use Cases](#dashboard-use-cases)
10. [Financial Health Use Cases](#financial-health-use-cases)

---

## Overview

Each use case represents a single business workflow in the Application Layer. Use cases:

- Accept request DTOs as input
- Return response DTOs as output
- Orchestrate repositories and Financial Engine
- Manage transactions
- Publish domain events
- Handle errors consistently

### Use Case Template

```typescript
async executeUseCase(request: RequestDTO): Promise<ResponseDTO> {
  // 1. Validate input
  // 2. Authorize user
  // 3. Begin transaction (if needed)
  // 4. Fetch data (repositories)
  // 5. Execute business logic (Financial Engine)
  // 6. Persist changes (repositories)
  // 7. Publish events
  // 8. Commit transaction
  // 9. Map to response DTO
}
```

---

## Onboarding Use Cases

### UC-001: CompleteOnboardingUseCase

**Purpose**: Create user profile and initial financial setup in one atomic operation.

**Inputs**:
```typescript
interface CompleteOnboardingRequest {
  userId: string;
  monthlyIncome: number;
  currency: string;
  hasDebts: boolean;
  hasGoals: boolean;
  riskTolerance: 'LOW' | 'MEDIUM' | 'HIGH';
}
```

**Outputs**:
```typescript
interface CompleteOnboardingResponse {
  userId: string;
  profileId: string;
  allocationId: string;
  allocation: {
    needs: number;
    wants: number;
    savings: number;
  };
}
```

**Dependencies**:
- `IUserRepository`
- `IFinancialProfileRepository`
- `IAllocationRepository`
- `IFinancialEngine`
- `IEventPublisher`

**Validation**:
- ✓ userId is valid Clerk ID
- ✓ monthlyIncome > 0
- ✓ currency is 'INR'
- ✓ User doesn't already have profile

**Repository Interactions**:
1. `userRepository.findById(userId)` - Verify user exists
2. `financialProfileRepository.findByUserId(userId)` - Check for existing profile
3. `financialProfileRepository.create(data)` - Create profile
4. `allocationRepository.create(data)` - Save initial allocation

**Financial Engine Interactions**:
1. `calculateAllocation({ monthlyIncome, expenses: [], goals: [], debts: [] })` - Generate 50/30/20 baseline

**Transaction Boundary**:
```typescript
BEGIN TRANSACTION
  - Create FinancialProfile
  - Create Allocation
COMMIT
```

**Events Published**:
- `UserOnboardingCompleted`
- `AllocationGenerated`

**Error Scenarios**:
- User not found → `NotFoundError`
- Profile already exists → `ConflictError`
- Invalid income → `ValidationError`
- Transaction failure → Rollback, return `DatabaseError`

---

### UC-002: UpdateIncomeUseCase

**Purpose**: Update user's monthly income and recalculate allocation.

**Inputs**:
```typescript
interface UpdateIncomeRequest {
  userId: string;
  monthlyIncome: number;
}
```

**Outputs**:
```typescript
interface UpdateIncomeResponse {
  profileId: string;
  monthlyIncome: number;
  allocation: AllocationDTO;
}
```

**Dependencies**:
- `IFinancialProfileRepository`
- `IAllocationRepository`
- `IGoalRepository`
- `IExpenseRepository`
- `IDebtRepository`
- `IFinancialEngine`
- `IEventPublisher`

**Validation**:
- ✓ monthlyIncome > 0
- ✓ User owns profile

**Repository Interactions**:
1. `financialProfileRepository.findByUserId(userId)`
2. `goalRepository.findActiveByUserId(userId)`
3. `expenseRepository.findByUserId(userId)`
4. `debtRepository.findActiveByUserId(userId)`
5. `financialProfileRepository.update(profileId, { monthlyIncome })`
6. `allocationRepository.create(newAllocation)`

**Financial Engine Interactions**:
1. `calculateAllocation({ monthlyIncome, expenses, goals, debts })`

**Transaction Boundary**:
```typescript
BEGIN TRANSACTION
  - Update FinancialProfile.monthlyIncome
  - Create new Allocation record
COMMIT
```

**Events Published**:
- `IncomeUpdated`
- `AllocationGenerated`

**Error Scenarios**:
- Profile not found → `NotFoundError`
- Unauthorized → `AuthorizationError`
- Invalid income → `ValidationError`

---

## Goal Use Cases

### UC-003: CreateGoalUseCase

**Purpose**: Create a new financial goal and recalculate allocation.

**Inputs**:
```typescript
interface CreateGoalRequest {
  userId: string;
  name: string;
  targetAmount: number;
  targetDate: Date;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
}
```

**Outputs**:
```typescript
interface CreateGoalResponse {
  goalId: string;
  name: string;
  targetAmount: number;
  targetDate: Date;
  monthlySavingsRequired: number;
  feasibility: 'FEASIBLE' | 'STRETCH' | 'INFEASIBLE';
  allocation: AllocationDTO;
}
```

**Dependencies**:
- `IGoalRepository`
- `IFinancialProfileRepository`
- `IAllocationRepository`
- `IExpenseRepository`
- `IDebtRepository`
- `IFinancialEngine`
- `IEventPublisher`

**Validation**:
- ✓ name is 1-100 characters
- ✓ targetAmount > 0
- ✓ targetDate is in future
- ✓ User owns profile

**Repository Interactions**:
1. `financialProfileRepository.findByUserId(userId)`
2. `goalRepository.findActiveByUserId(userId)` - Get existing goals
3. `expenseRepository.findByUserId(userId)`
4. `debtRepository.findActiveByUserId(userId)`
5. `goalRepository.create(goalData)`
6. `allocationRepository.create(newAllocation)`

**Financial Engine Interactions**:
1. `calculateGoalFeasibility({ targetAmount, targetDate, monthlyIncome, expenses, debts })`
2. `calculateMonthlySavingsRequired({ targetAmount, targetDate })`
3. `calculateAllocation({ monthlyIncome, expenses, goals: [...existing, new], debts })`

**Transaction Boundary**:
```typescript
BEGIN TRANSACTION
  - Create Goal
  - Create new Allocation
COMMIT
```

**Events Published**:
- `GoalCreated`
- `AllocationGenerated`

**Error Scenarios**:
- Invalid target date → `ValidationError`
- Profile not found → `NotFoundError`
- Transaction failure → Rollback

---

### UC-004: UpdateGoalUseCase

**Purpose**: Update existing goal and recalculate allocation.

**Inputs**:
```typescript
interface UpdateGoalRequest {
  userId: string;
  goalId: string;
  name?: string;
  targetAmount?: number;
  targetDate?: Date;
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
}
```

**Outputs**:
```typescript
interface UpdateGoalResponse {
  goalId: string;
  updatedFields: string[];
  allocation: AllocationDTO;
}
```

**Dependencies**: Same as CreateGoalUseCase

**Validation**:
- ✓ Goal exists
- ✓ User owns goal
- ✓ Goal is not completed
- ✓ At least one field to update

**Repository Interactions**:
1. `goalRepository.findById(goalId)`
2. Fetch profile, expenses, debts, other goals
3. `goalRepository.update(goalId, updates)`
4. `allocationRepository.create(newAllocation)`

**Financial Engine Interactions**:
1. `calculateGoalFeasibility()` - If amount/date changed
2. `calculateAllocation()` - Always

**Transaction Boundary**:
```typescript
BEGIN TRANSACTION
  - Update Goal
  - Create new Allocation
COMMIT
```

**Events Published**:
- `GoalUpdated`
- `AllocationGenerated`

---

### UC-005: DeleteGoalUseCase

**Purpose**: Soft delete goal and recalculate allocation.

**Inputs**:
```typescript
interface DeleteGoalRequest {
  userId: string;
  goalId: string;
}
```

**Outputs**:
```typescript
interface DeleteGoalResponse {
  goalId: string;
  deletedAt: Date;
  allocation: AllocationDTO;
}
```

**Dependencies**: Same as CreateGoalUseCase

**Validation**:
- ✓ Goal exists
- ✓ User owns goal
- ✓ Goal not already deleted

**Repository Interactions**:
1. `goalRepository.findById(goalId)`
2. `goalRepository.softDelete(goalId)`
3. Fetch remaining goals, expenses, debts
4. `allocationRepository.create(newAllocation)`

**Financial Engine Interactions**:
1. `calculateAllocation()` - Without deleted goal

**Transaction Boundary**:
```typescript
BEGIN TRANSACTION
  - Soft delete Goal (set deletedAt)
  - Create new Allocation
COMMIT
```

**Events Published**:
- `GoalDeleted`
- `AllocationGenerated`

---

### UC-006: CompleteGoalUseCase

**Purpose**: Mark goal as completed and recalculate allocation.

**Inputs**:
```typescript
interface CompleteGoalRequest {
  userId: string;
  goalId: string;
  completedAmount: number;
}
```

**Outputs**:
```typescript
interface CompleteGoalResponse {
  goalId: string;
  status: 'COMPLETED';
  completedAt: Date;
  allocation: AllocationDTO;
}
```

**Dependencies**: Same as CreateGoalUseCase

**Validation**:
- ✓ Goal exists and is active
- ✓ User owns goal
- ✓ completedAmount >= targetAmount

**Repository Interactions**:
1. `goalRepository.findById(goalId)`
2. `goalRepository.update(goalId, { status: 'COMPLETED', completedAt })`
3. `allocationRepository.create(newAllocation)`

**Financial Engine Interactions**:
1. `calculateAllocation()` - Without completed goal

**Transaction Boundary**:
```typescript
BEGIN TRANSACTION
  - Update Goal status to COMPLETED
  - Create new Allocation
COMMIT
```

**Events Published**:
- `GoalCompleted`
- `AllocationGenerated`

---

## Expense Use Cases

### UC-007: RecordExpenseUseCase

**Purpose**: Record a new expense and recalculate allocation.

**Inputs**:
```typescript
interface RecordExpenseRequest {
  userId: string;
  amount: number;
  category: string;
  description?: string;
  date: Date;
  isRecurring: boolean;
  frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
}
```

**Outputs**:
```typescript
interface RecordExpenseResponse {
  expenseId: string;
  amount: number;
  category: string;
  allocation: AllocationDTO;
}
```

**Dependencies**:
- `IExpenseRepository`
- `IFinancialProfileRepository`
- `IGoalRepository`
- `IDebtRepository`
- `IAllocationRepository`
- `IFinancialEngine`
- `IEventPublisher`

**Validation**:
- ✓ amount > 0
- ✓ category is valid
- ✓ date <= today
- ✓ If recurring, frequency is required

**Repository Interactions**:
1. `expenseRepository.create(expenseData)`
2. Fetch profile, goals, debts, all expenses
3. `allocationRepository.create(newAllocation)`

**Financial Engine Interactions**:
1. `calculateAllocation({ monthlyIncome, expenses: [...existing, new], goals, debts })`

**Transaction Boundary**:
```typescript
BEGIN TRANSACTION
  - Create Expense
  - Create new Allocation
COMMIT
```

**Events Published**:
- `ExpenseRecorded`
- `AllocationGenerated`

---

### UC-008: UpdateExpenseUseCase

**Purpose**: Update existing expense and recalculate allocation.

**Inputs**:
```typescript
interface UpdateExpenseRequest {
  userId: string;
  expenseId: string;
  amount?: number;
  category?: string;
  description?: string;
}
```

**Outputs**:
```typescript
interface UpdateExpenseResponse {
  expenseId: string;
  allocation: AllocationDTO;
}
```

**Dependencies**: Same as RecordExpenseUseCase

**Validation**:
- ✓ Expense exists
- ✓ User owns expense
- ✓ At least one field to update

**Repository Interactions**:
1. `expenseRepository.findById(expenseId)`
2. `expenseRepository.update(expenseId, updates)`
3. `allocationRepository.create(newAllocation)`

**Financial Engine Interactions**:
1. `calculateAllocation()`

**Transaction Boundary**:
```typescript
BEGIN TRANSACTION
  - Update Expense
  - Create new Allocation
COMMIT
```

**Events Published**:
- `ExpenseUpdated`
- `AllocationGenerated`

---

### UC-009: DeleteExpenseUseCase

**Purpose**: Soft delete expense and recalculate allocation.

**Inputs**:
```typescript
interface DeleteExpenseRequest {
  userId: string;
  expenseId: string;
}
```

**Outputs**:
```typescript
interface DeleteExpenseResponse {
  expenseId: string;
  deletedAt: Date;
  allocation: AllocationDTO;
}
```

**Dependencies**: Same as RecordExpenseUseCase

**Validation**:
- ✓ Expense exists
- ✓ User owns expense

**Repository Interactions**:
1. `expenseRepository.findById(expenseId)`
2. `expenseRepository.softDelete(expenseId)`
3. `allocationRepository.create(newAllocation)`

**Financial Engine Interactions**:
1. `calculateAllocation()` - Without deleted expense

**Transaction Boundary**:
```typescript
BEGIN TRANSACTION
  - Soft delete Expense
  - Create new Allocation
COMMIT
```

**Events Published**:
- `ExpenseDeleted`
- `AllocationGenerated`

---

## Debt Use Cases

### UC-010: RecordDebtUseCase

**Purpose**: Record a new debt and recalculate allocation.

**Inputs**:
```typescript
interface RecordDebtRequest {
  userId: string;
  name: string;
  principal: number;
  interestRate: number;
  termMonths: number;
  startDate: Date;
  minimumPayment: number;
}
```

**Outputs**:
```typescript
interface RecordDebtResponse {
  debtId: string;
  monthlyPayment: number;
  totalInterest: number;
  payoffDate: Date;
  allocation: AllocationDTO;
}
```

**Dependencies**:
- `IDebtRepository`
- `IFinancialProfileRepository`
- `IGoalRepository`
- `IExpenseRepository`
- `IAllocationRepository`
- `IFinancialEngine`
- `IEventPublisher`

**Validation**:
- ✓ principal > 0
- ✓ interestRate >= 0
- ✓ termMonths > 0
- ✓ minimumPayment > 0

**Repository Interactions**:
1. `debtRepository.create(debtData)`
2. Fetch profile, goals, expenses, all debts
3. `allocationRepository.create(newAllocation)`

**Financial Engine Interactions**:
1. `calculateLoanPayment({ principal, annualRate, termMonths })`
2. `calculateTotalInterest({ principal, annualRate, termMonths })`
3. `calculatePayoffDate({ startDate, termMonths })`
4. `calculateAllocation({ monthlyIncome, expenses, goals, debts: [...existing, new] })`

**Transaction Boundary**:
```typescript
BEGIN TRANSACTION
  - Create Debt
  - Create new Allocation
COMMIT
```

**Events Published**:
- `DebtRecorded`
- `AllocationGenerated`

---

### UC-011: RecordDebtPaymentUseCase

**Purpose**: Record debt payment and update debt balance.

**Inputs**:
```typescript
interface RecordDebtPaymentRequest {
  userId: string;
  debtId: string;
  amount: number;
  paymentDate: Date;
}
```

**Outputs**:
```typescript
interface RecordDebtPaymentResponse {
  paymentId: string;
  debtId: string;
  newBalance: number;
  remainingPayments: number;
  allocation: AllocationDTO;
}
```

**Dependencies**: Same as RecordDebtUseCase + `IDebtPaymentRepository`

**Validation**:
- ✓ Debt exists and is active
- ✓ User owns debt
- ✓ amount > 0
- ✓ amount <= remaining balance

**Repository Interactions**:
1. `debtRepository.findById(debtId)`
2. `debtPaymentRepository.create(paymentData)`
3. `debtRepository.update(debtId, { currentBalance })`
4. If balance = 0: `debtRepository.update(debtId, { status: 'PAID_OFF' })`
5. `allocationRepository.create(newAllocation)`

**Financial Engine Interactions**:
1. `calculateRemainingBalance({ currentBalance, payment })`
2. `calculateRemainingPayments({ balance, monthlyPayment })`
3. `calculateAllocation()` - With updated debt

**Transaction Boundary**:
```typescript
BEGIN TRANSACTION
  - Create DebtPayment
  - Update Debt.currentBalance
  - If paid off: Update Debt.status
  - Create new Allocation
COMMIT
```

**Events Published**:
- `DebtPaymentRecorded`
- `DebtPaidOff` (if applicable)
- `AllocationGenerated`

---

## Allocation Use Cases

### UC-012: GenerateAllocationUseCase

**Purpose**: Generate allocation based on current financial state.

**Inputs**:
```typescript
interface GenerateAllocationRequest {
  userId: string;
}
```

**Outputs**:
```typescript
interface GenerateAllocationResponse {
  allocationId: string;
  needs: number;
  wants: number;
  savings: number;
  breakdown: {
    fixedExpenses: number;
    goalContributions: number;
    debtPayments: number;
    discretionary: number;
  };
}
```

**Dependencies**:
- `IFinancialProfileRepository`
- `IGoalRepository`
- `IExpenseRepository`
- `IDebtRepository`
- `IAllocationRepository`
- `IFinancialEngine`

**Validation**:
- ✓ User has financial profile

**Repository Interactions**:
1. `financialProfileRepository.findByUserId(userId)`
2. `goalRepository.findActiveByUserId(userId)`
3. `expenseRepository.findByUserId(userId)`
4. `debtRepository.findActiveByUserId(userId)`
5. `allocationRepository.create(allocationData)`

**Financial Engine Interactions**:
1. `calculateAllocation({ monthlyIncome, expenses, goals, debts })`

**Transaction Boundary**: None (single write)

**Events Published**:
- `AllocationGenerated`

---

## Simulation Use Cases

### UC-013: SimulatePurchaseUseCase

**Purpose**: Simulate impact of a purchase on financial health.

**Inputs**:
```typescript
interface SimulatePurchaseRequest {
  userId: string;
  purchaseAmount: number;
  purchaseName: string;
  conversationId?: string;
}
```

**Outputs**:
```typescript
interface SimulatePurchaseResponse {
  simulationId: string;
  canAfford: boolean;
  impact: {
    savingsReduction: number;
    goalDelays: Array<{ goalId: string; delayMonths: number }>;
    alternativeOptions: string[];
  };
  recommendation: string;
}
```

**Dependencies**:
- `ISimulationRepository`
- `IConversationRepository`
- `IFinancialProfileRepository`
- `IGoalRepository`
- `IExpenseRepository`
- `IDebtRepository`
- `IFinancialEngine`
- `IEventPublisher`

**Validation**:
- ✓ purchaseAmount > 0
- ✓ User has financial profile

**Repository Interactions**:
1. Fetch profile, goals, expenses, debts
2. `simulationRepository.create(simulationData)`
3. If conversationId: `conversationRepository.update()` - Link simulation

**Financial Engine Interactions**:
1. `simulatePurchase({ purchaseAmount, monthlyIncome, expenses, goals, debts })`
2. `calculateGoalImpact({ purchase, goals })`
3. `calculateAffordability({ purchase, allocation })`

**Transaction Boundary**:
```typescript
BEGIN TRANSACTION
  - Create Simulation
  - Update Conversation (if provided)
COMMIT
```

**Events Published**:
- `SimulationCompleted`

---

### UC-014: SimulateLoanUseCase

**Purpose**: Simulate taking a loan and its impact.

**Inputs**:
```typescript
interface SimulateLoanRequest {
  userId: string;
  loanAmount: number;
  interestRate: number;
  termMonths: number;
  purpose: string;
}
```

**Outputs**:
```typescript
interface SimulateLoanResponse {
  simulationId: string;
  monthlyPayment: number;
  totalInterest: number;
  affordability: 'AFFORDABLE' | 'TIGHT' | 'UNAFFORDABLE';
  impact: {
    allocationChange: AllocationDTO;
    goalDelays: Array<{ goalId: string; delayMonths: number }>;
  };
  recommendation: string;
}
```

**Dependencies**: Same as SimulatePurchaseUseCase

**Validation**:
- ✓ loanAmount > 0
- ✓ interestRate >= 0
- ✓ termMonths > 0

**Repository Interactions**:
1. Fetch financial data
2. `simulationRepository.create(simulationData)`

**Financial Engine Interactions**:
1. `calculateLoanPayment({ principal, annualRate, termMonths })`
2. `calculateTotalInterest()`
3. `simulateLoan({ loan, monthlyIncome, expenses, goals, debts })`
4. `calculateAllocation()` - With simulated loan

**Transaction Boundary**: Single write

**Events Published**:
- `SimulationCompleted`

---

### UC-015: ProjectGoalTimelineUseCase

**Purpose**: Project timeline for achieving a goal.

**Inputs**:
```typescript
interface ProjectGoalTimelineRequest {
  userId: string;
  goalId: string;
  monthlyContribution?: number;
}
```

**Outputs**:
```typescript
interface ProjectGoalTimelineResponse {
  simulationId: string;
  projectedCompletionDate: Date;
  monthsToComplete: number;
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  milestones: Array<{
    month: number;
    amount: number;
    percentage: number;
  }>;
}
```

**Dependencies**: Same as SimulatePurchaseUseCase

**Validation**:
- ✓ Goal exists
- ✓ User owns goal
- ✓ Goal is active

**Repository Interactions**:
1. `goalRepository.findById(goalId)`
2. Fetch financial data
3. `simulationRepository.create(simulationData)`

**Financial Engine Interactions**:
1. `projectGoalTimeline({ goal, monthlyContribution, expenses, debts })`
2. `calculateConfidence({ timeline, income, expenses })`

**Transaction Boundary**: Single write

**Events Published**:
- `SimulationCompleted`

---

## Chat Use Cases

### UC-016: AskCFOUseCase

**Purpose**: Process user question and generate AI response.

**Inputs**:
```typescript
interface AskCFORequest {
  userId: string;
  conversationId?: string;
  question: string;
}
```

**Outputs**:
```typescript
interface AskCFOResponse {
  conversationId: string;
  messageId: string;
  response: string;
  suggestedActions?: string[];
}
```

**Dependencies**:
- `IConversationRepository`
- `IFinancialProfileRepository`
- `IGoalRepository`
- `IExpenseRepository`
- `IDebtRepository`
- `IAllocationRepository`
- `IAIService`
- `IEventPublisher`

**Validation**:
- ✓ question is not empty
- ✓ question length <= 1000 characters

**Repository Interactions**:
1. If conversationId: `conversationRepository.findById()`
2. Else: `conversationRepository.create()`
3. Fetch all financial data for context
4. `conversationRepository.addMessage(userMessage)`
5. `conversationRepository.addMessage(aiMessage)`

**Financial Engine Interactions**: None (AI Service handles this)

**Transaction Boundary**:
```typescript
BEGIN TRANSACTION
  - Create/Update Conversation
  - Add user message
  - Add AI message
COMMIT
```

**Events Published**:
- `MessageSent`
- `MessageReceived`

---

## Dashboard Use Cases

### UC-017: GenerateDashboardUseCase

**Purpose**: Generate comprehensive dashboard data.

**Inputs**:
```typescript
interface GenerateDashboardRequest {
  userId: string;
}
```

**Outputs**:
```typescript
interface GenerateDashboardResponse {
  financialHealth: {
    score: number;
    status: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  };
  allocation: AllocationDTO;
  goals: GoalSummaryDTO[];
  recentExpenses: ExpenseDTO[];
  debts: DebtSummaryDTO[];
  insights: string[];
}
```

**Dependencies**:
- `IFinancialProfileRepository`
- `IGoalRepository`
- `IExpenseRepository`
- `IDebtRepository`
- `IAllocationRepository`
- `IFinancialEngine`

**Validation**:
- ✓ User has financial profile

**Repository Interactions**:
1. `financialProfileRepository.findByUserId(userId)`
2. `goalRepository.findActiveByUserId(userId)`
3. `expenseRepository.findRecentByUserId(userId, limit: 10)`
4. `debtRepository.findActiveByUserId(userId)`
5. `allocationRepository.findLatestByUserId(userId)`

**Financial Engine Interactions**:
1. `calculateFinancialHealth({ income, expenses, debts, savings })`
2. `calculateGoalProgress({ goals, allocation })`

**Transaction Boundary**: None (read-only)

**Events Published**: None

---

## Financial Health Use Cases

### UC-018: CalculateFinancialHealthUseCase

**Purpose**: Calculate user's financial health score.

**Inputs**:
```typescript
interface CalculateFinancialHealthRequest {
  userId: string;
}
```

**Outputs**:
```typescript
interface CalculateFinancialHealthResponse {
  score: number;
  status: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  factors: {
    incomeStability: number;
    debtToIncome: number;
    savingsRate: number;
    emergencyFund: number;
  };
  recommendations: string[];
}
```

**Dependencies**:
- `IFinancialProfileRepository`
- `IExpenseRepository`
- `IDebtRepository`
- `IAllocationRepository`
- `IFinancialEngine`

**Validation**:
- ✓ User has financial profile

**Repository Interactions**:
1. Fetch profile, expenses, debts, allocation

**Financial Engine Interactions**:
1. `calculateFinancialHealth({ income, expenses, debts, savings })`
2. `calculateDebtToIncomeRatio({ debts, income })`
3. `calculateSavingsRate({ income, expenses, savings })`

**Transaction Boundary**: None (read-only)

**Events Published**: None

---

## Summary

### Total Use Cases: 18

**By Module**:
- Onboarding: 2
- Goals: 4
- Expenses: 3
- Debts: 2
- Allocation: 1
- Simulation: 3
- Chat: 1
- Dashboard: 1
- Financial Health: 1

### Common Patterns

**Transaction-Required Use Cases** (11):
- CompleteOnboarding
- UpdateIncome
- CreateGoal, UpdateGoal, DeleteGoal, CompleteGoal
- RecordExpense, UpdateExpense, DeleteExpense
- RecordDebt, RecordDebtPayment

**Read-Only Use Cases** (5):
- GenerateDashboard
- CalculateFinancialHealth
- ProjectGoalTimeline
- SimulatePurchase
- SimulateLoan

**Event-Publishing Use Cases** (13):
All transaction-required use cases + AskCFO

### Performance Targets

- Simple queries (single entity): < 50ms
- Complex queries (dashboard): < 200ms
- Write operations: < 100ms
- Simulations: < 500ms
- AI responses: < 5s

---

**Next**: Define DTOs for all request/response objects.
