# DTO Design

**Package**: `@sage/application`  
**Version**: 1.0.0  
**Last Updated**: 2024

---

## Table of Contents

1. [Overview](#overview)
2. [Design Principles](#design-principles)
3. [Common DTOs](#common-dtos)
4. [User & Profile DTOs](#user--profile-dtos)
5. [Goal DTOs](#goal-dtos)
6. [Expense DTOs](#expense-dtos)
7. [Debt DTOs](#debt-dtos)
8. [Allocation DTOs](#allocation-dtos)
9. [Simulation DTOs](#simulation-dtos)
10. [Chat DTOs](#chat-dtos)
11. [Dashboard DTOs](#dashboard-dtos)
12. [Mapping Rules](#mapping-rules)

---

## Overview

DTOs (Data Transfer Objects) are the **contract** between layers. They:

- ✅ Decouple Application Layer from database schema
- ✅ Expose only necessary data to clients
- ✅ Provide type safety across boundaries
- ✅ Enable independent evolution of layers

**Critical Rule**: **NEVER expose Prisma entities directly**

---

## Design Principles

### 1. **Immutability**

DTOs are read-only data structures:

```typescript
interface GoalDTO {
  readonly id: string;
  readonly name: string;
  readonly targetAmount: number;
}
```

### 2. **Flat Structure**

Avoid deep nesting where possible:

```typescript
// ❌ Bad: Deep nesting
interface DashboardDTO {
  user: {
    profile: {
      income: {
        monthly: number;
      };
    };
  };
}

// ✅ Good: Flat structure
interface DashboardDTO {
  userId: string;
  monthlyIncome: number;
}
```

### 3. **Explicit Nullability**

Use `null` for missing optional values:

```typescript
interface GoalDTO {
  id: string;
  description: string | null; // Explicitly nullable
}
```

### 4. **No Business Logic**

DTOs are pure data containers:

```typescript
// ❌ Bad: Methods in DTO
interface GoalDTO {
  calculateProgress(): number;
}

// ✅ Good: Data only
interface GoalDTO {
  currentAmount: number;
  targetAmount: number;
  progressPercentage: number; // Calculated before DTO creation
}
```

### 5. **Separate Request/Response**

Different DTOs for input and output:

```typescript
// Input
interface CreateGoalRequest {
  name: string;
  targetAmount: number;
  targetDate: Date;
}

// Output
interface GoalResponse {
  id: string;
  name: string;
  targetAmount: number;
  targetDate: Date;
  createdAt: Date;
  monthlySavingsRequired: number;
}
```

---

## Common DTOs

### MoneyDTO

```typescript
interface MoneyDTO {
  readonly amount: number;
  readonly currency: 'INR';
}
```

### DateRangeDTO

```typescript
interface DateRangeDTO {
  readonly startDate: Date;
  readonly endDate: Date;
}
```

### PaginationRequest

```typescript
interface PaginationRequest {
  readonly page: number;
  readonly limit: number;
}
```

### PaginatedResponse<T>

```typescript
interface PaginatedResponse<T> {
  readonly data: T[];
  readonly pagination: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly totalPages: number;
  };
}
```

### ErrorResponse

```typescript
interface ErrorResponse {
  readonly code: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
  readonly timestamp: Date;
}
```

---

## User & Profile DTOs

### UserProfileDTO

```typescript
interface UserProfileDTO {
  readonly userId: string;
  readonly profileId: string;
  readonly monthlyIncome: number;
  readonly currency: 'INR';
  readonly riskTolerance: 'LOW' | 'MEDIUM' | 'HIGH';
  readonly hasDebts: boolean;
  readonly hasGoals: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
```

### CompleteOnboardingRequest

```typescript
interface CompleteOnboardingRequest {
  readonly userId: string;
  readonly monthlyIncome: number;
  readonly currency: 'INR';
  readonly hasDebts: boolean;
  readonly hasGoals: boolean;
  readonly riskTolerance: 'LOW' | 'MEDIUM' | 'HIGH';
}
```

### CompleteOnboardingResponse

```typescript
interface CompleteOnboardingResponse {
  readonly userId: string;
  readonly profileId: string;
  readonly allocationId: string;
  readonly allocation: {
    readonly needs: number;
    readonly wants: number;
    readonly savings: number;
  };
}
```

### UpdateIncomeRequest

```typescript
interface UpdateIncomeRequest {
  readonly userId: string;
  readonly monthlyIncome: number;
}
```

### UpdateIncomeResponse

```typescript
interface UpdateIncomeResponse {
  readonly profileId: string;
  readonly monthlyIncome: number;
  readonly allocation: AllocationDTO;
}
```

---

## Goal DTOs

### GoalDTO

```typescript
interface GoalDTO {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly description: string | null;
  readonly targetAmount: number;
  readonly currentAmount: number;
  readonly targetDate: Date;
  readonly priority: 'HIGH' | 'MEDIUM' | 'LOW';
  readonly category: string;
  readonly status: 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
  readonly monthlySavingsRequired: number;
  readonly progressPercentage: number;
  readonly feasibility: 'FEASIBLE' | 'STRETCH' | 'INFEASIBLE';
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
```

### GoalSummaryDTO

```typescript
interface GoalSummaryDTO {
  readonly id: string;
  readonly name: string;
  readonly targetAmount: number;
  readonly currentAmount: number;
  readonly progressPercentage: number;
  readonly targetDate: Date;
  readonly priority: 'HIGH' | 'MEDIUM' | 'LOW';
  readonly status: 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
}
```

### CreateGoalRequest

```typescript
interface CreateGoalRequest {
  readonly userId: string;
  readonly name: string;
  readonly description?: string;
  readonly targetAmount: number;
  readonly targetDate: Date;
  readonly priority: 'HIGH' | 'MEDIUM' | 'LOW';
  readonly category: string;
}
```

### CreateGoalResponse

```typescript
interface CreateGoalResponse {
  readonly goal: GoalDTO;
  readonly allocation: AllocationDTO;
}
```

### UpdateGoalRequest

```typescript
interface UpdateGoalRequest {
  readonly userId: string;
  readonly goalId: string;
  readonly name?: string;
  readonly description?: string;
  readonly targetAmount?: number;
  readonly targetDate?: Date;
  readonly priority?: 'HIGH' | 'MEDIUM' | 'LOW';
}
```

### UpdateGoalResponse

```typescript
interface UpdateGoalResponse {
  readonly goal: GoalDTO;
  readonly allocation: AllocationDTO;
}
```

### DeleteGoalRequest

```typescript
interface DeleteGoalRequest {
  readonly userId: string;
  readonly goalId: string;
}
```

### DeleteGoalResponse

```typescript
interface DeleteGoalResponse {
  readonly goalId: string;
  readonly deletedAt: Date;
  readonly allocation: AllocationDTO;
}
```

### ListGoalsRequest

```typescript
interface ListGoalsRequest {
  readonly userId: string;
  readonly status?: 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
  readonly priority?: 'HIGH' | 'MEDIUM' | 'LOW';
}
```

### ListGoalsResponse

```typescript
interface ListGoalsResponse {
  readonly goals: GoalDTO[];
  readonly summary: {
    readonly totalGoals: number;
    readonly activeGoals: number;
    readonly completedGoals: number;
    readonly totalTargetAmount: number;
    readonly totalCurrentAmount: number;
  };
}
```

---

## Expense DTOs

### ExpenseDTO

```typescript
interface ExpenseDTO {
  readonly id: string;
  readonly userId: string;
  readonly amount: number;
  readonly category: string;
  readonly description: string | null;
  readonly date: Date;
  readonly isRecurring: boolean;
  readonly frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
```

### ExpenseSummaryDTO

```typescript
interface ExpenseSummaryDTO {
  readonly id: string;
  readonly amount: number;
  readonly category: string;
  readonly date: Date;
  readonly isRecurring: boolean;
}
```

### RecordExpenseRequest

```typescript
interface RecordExpenseRequest {
  readonly userId: string;
  readonly amount: number;
  readonly category: string;
  readonly description?: string;
  readonly date: Date;
  readonly isRecurring: boolean;
  readonly frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
}
```

### RecordExpenseResponse

```typescript
interface RecordExpenseResponse {
  readonly expense: ExpenseDTO;
  readonly allocation: AllocationDTO;
}
```

### UpdateExpenseRequest

```typescript
interface UpdateExpenseRequest {
  readonly userId: string;
  readonly expenseId: string;
  readonly amount?: number;
  readonly category?: string;
  readonly description?: string;
}
```

### UpdateExpenseResponse

```typescript
interface UpdateExpenseResponse {
  readonly expense: ExpenseDTO;
  readonly allocation: AllocationDTO;
}
```

### DeleteExpenseRequest

```typescript
interface DeleteExpenseRequest {
  readonly userId: string;
  readonly expenseId: string;
}
```

### DeleteExpenseResponse

```typescript
interface DeleteExpenseResponse {
  readonly expenseId: string;
  readonly deletedAt: Date;
  readonly allocation: AllocationDTO;
}
```

### ListExpensesRequest

```typescript
interface ListExpensesRequest {
  readonly userId: string;
  readonly startDate?: Date;
  readonly endDate?: Date;
  readonly category?: string;
  readonly isRecurring?: boolean;
  readonly pagination?: PaginationRequest;
}
```

### ListExpensesResponse

```typescript
interface ListExpensesResponse {
  readonly expenses: ExpenseDTO[];
  readonly summary: {
    readonly totalExpenses: number;
    readonly totalAmount: number;
    readonly byCategory: Record<string, number>;
  };
  readonly pagination?: PaginatedResponse<ExpenseDTO>['pagination'];
}
```

---

## Debt DTOs

### DebtDTO

```typescript
interface DebtDTO {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly principal: number;
  readonly currentBalance: number;
  readonly interestRate: number;
  readonly termMonths: number;
  readonly monthlyPayment: number;
  readonly minimumPayment: number;
  readonly startDate: Date;
  readonly payoffDate: Date;
  readonly status: 'ACTIVE' | 'PAID_OFF' | 'DEFAULTED';
  readonly totalInterestPaid: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
```

### DebtSummaryDTO

```typescript
interface DebtSummaryDTO {
  readonly id: string;
  readonly name: string;
  readonly currentBalance: number;
  readonly monthlyPayment: number;
  readonly payoffDate: Date;
  readonly status: 'ACTIVE' | 'PAID_OFF' | 'DEFAULTED';
}
```

### RecordDebtRequest

```typescript
interface RecordDebtRequest {
  readonly userId: string;
  readonly name: string;
  readonly principal: number;
  readonly interestRate: number;
  readonly termMonths: number;
  readonly minimumPayment: number;
  readonly startDate: Date;
}
```

### RecordDebtResponse

```typescript
interface RecordDebtResponse {
  readonly debt: DebtDTO;
  readonly allocation: AllocationDTO;
  readonly calculations: {
    readonly monthlyPayment: number;
    readonly totalInterest: number;
    readonly payoffDate: Date;
  };
}
```

### RecordDebtPaymentRequest

```typescript
interface RecordDebtPaymentRequest {
  readonly userId: string;
  readonly debtId: string;
  readonly amount: number;
  readonly paymentDate: Date;
}
```

### RecordDebtPaymentResponse

```typescript
interface RecordDebtPaymentResponse {
  readonly paymentId: string;
  readonly debtId: string;
  readonly amount: number;
  readonly newBalance: number;
  readonly remainingPayments: number;
  readonly isPaidOff: boolean;
  readonly allocation: AllocationDTO;
}
```

### ListDebtsRequest

```typescript
interface ListDebtsRequest {
  readonly userId: string;
  readonly status?: 'ACTIVE' | 'PAID_OFF' | 'DEFAULTED';
}
```

### ListDebtsResponse

```typescript
interface ListDebtsResponse {
  readonly debts: DebtDTO[];
  readonly summary: {
    readonly totalDebts: number;
    readonly totalBalance: number;
    readonly totalMonthlyPayment: number;
    readonly debtToIncomeRatio: number;
  };
}
```

---

## Allocation DTOs

### AllocationDTO

```typescript
interface AllocationDTO {
  readonly id: string;
  readonly userId: string;
  readonly monthlyIncome: number;
  readonly needs: number;
  readonly wants: number;
  readonly savings: number;
  readonly breakdown: {
    readonly fixedExpenses: number;
    readonly variableExpenses: number;
    readonly goalContributions: number;
    readonly debtPayments: number;
    readonly discretionary: number;
    readonly emergencyFund: number;
  };
  readonly createdAt: Date;
}
```

### GenerateAllocationRequest

```typescript
interface GenerateAllocationRequest {
  readonly userId: string;
}
```

### GenerateAllocationResponse

```typescript
interface GenerateAllocationResponse {
  readonly allocation: AllocationDTO;
  readonly recommendations: string[];
}
```

---

## Simulation DTOs

### SimulationDTO

```typescript
interface SimulationDTO {
  readonly id: string;
  readonly userId: string;
  readonly type: 'PURCHASE' | 'LOAN' | 'GOAL_TIMELINE' | 'INCOME_CHANGE';
  readonly parameters: Record<string, unknown>;
  readonly results: Record<string, unknown>;
  readonly createdAt: Date;
}
```

### SimulatePurchaseRequest

```typescript
interface SimulatePurchaseRequest {
  readonly userId: string;
  readonly purchaseAmount: number;
  readonly purchaseName: string;
  readonly conversationId?: string;
}
```

### SimulatePurchaseResponse

```typescript
interface SimulatePurchaseResponse {
  readonly simulationId: string;
  readonly canAfford: boolean;
  readonly impact: {
    readonly savingsReduction: number;
    readonly monthsToRecover: number;
    readonly goalDelays: Array<{
      readonly goalId: string;
      readonly goalName: string;
      readonly delayMonths: number;
    }>;
  };
  readonly alternatives: string[];
  readonly recommendation: string;
}
```

### SimulateLoanRequest

```typescript
interface SimulateLoanRequest {
  readonly userId: string;
  readonly loanAmount: number;
  readonly interestRate: number;
  readonly termMonths: number;
  readonly purpose: string;
}
```

### SimulateLoanResponse

```typescript
interface SimulateLoanResponse {
  readonly simulationId: string;
  readonly monthlyPayment: number;
  readonly totalInterest: number;
  readonly totalCost: number;
  readonly affordability: 'AFFORDABLE' | 'TIGHT' | 'UNAFFORDABLE';
  readonly impact: {
    readonly newAllocation: AllocationDTO;
    readonly debtToIncomeRatio: number;
    readonly goalDelays: Array<{
      readonly goalId: string;
      readonly goalName: string;
      readonly delayMonths: number;
    }>;
  };
  readonly recommendation: string;
}
```

### ProjectGoalTimelineRequest

```typescript
interface ProjectGoalTimelineRequest {
  readonly userId: string;
  readonly goalId: string;
  readonly monthlyContribution?: number;
}
```

### ProjectGoalTimelineResponse

```typescript
interface ProjectGoalTimelineResponse {
  readonly simulationId: string;
  readonly goalId: string;
  readonly projectedCompletionDate: Date;
  readonly monthsToComplete: number;
  readonly confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  readonly milestones: Array<{
    readonly month: number;
    readonly amount: number;
    readonly percentage: number;
  }>;
}
```

---

## Chat DTOs

### MessageDTO

```typescript
interface MessageDTO {
  readonly id: string;
  readonly conversationId: string;
  readonly role: 'USER' | 'ASSISTANT';
  readonly content: string;
  readonly createdAt: Date;
}
```

### ConversationDTO

```typescript
interface ConversationDTO {
  readonly id: string;
  readonly userId: string;
  readonly title: string | null;
  readonly messages: MessageDTO[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
```

### AskCFORequest

```typescript
interface AskCFORequest {
  readonly userId: string;
  readonly conversationId?: string;
  readonly question: string;
}
```

### AskCFOResponse

```typescript
interface AskCFOResponse {
  readonly conversationId: string;
  readonly messageId: string;
  readonly response: string;
  readonly suggestedActions?: Array<{
    readonly type: 'CREATE_GOAL' | 'SIMULATE_PURCHASE' | 'VIEW_ALLOCATION';
    readonly label: string;
    readonly data?: Record<string, unknown>;
  }>;
}
```

### ListConversationsRequest

```typescript
interface ListConversationsRequest {
  readonly userId: string;
  readonly pagination?: PaginationRequest;
}
```

### ListConversationsResponse

```typescript
interface ListConversationsResponse {
  readonly conversations: Array<{
    readonly id: string;
    readonly title: string | null;
    readonly lastMessage: string;
    readonly updatedAt: Date;
  }>;
  readonly pagination?: PaginatedResponse<ConversationDTO>['pagination'];
}
```

---

## Dashboard DTOs

### DashboardDTO

```typescript
interface DashboardDTO {
  readonly userId: string;
  readonly financialHealth: {
    readonly score: number;
    readonly status: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
    readonly factors: {
      readonly incomeStability: number;
      readonly debtToIncome: number;
      readonly savingsRate: number;
      readonly emergencyFund: number;
    };
  };
  readonly allocation: AllocationDTO;
  readonly goals: {
    readonly active: GoalSummaryDTO[];
    readonly summary: {
      readonly totalGoals: number;
      readonly onTrack: number;
      readonly atRisk: number;
      readonly totalProgress: number;
    };
  };
  readonly expenses: {
    readonly recent: ExpenseSummaryDTO[];
    readonly monthlyTotal: number;
    readonly byCategory: Record<string, number>;
  };
  readonly debts: {
    readonly active: DebtSummaryDTO[];
    readonly totalBalance: number;
    readonly totalMonthlyPayment: number;
  };
  readonly insights: string[];
}
```

### GenerateDashboardRequest

```typescript
interface GenerateDashboardRequest {
  readonly userId: string;
}
```

### GenerateDashboardResponse

```typescript
interface GenerateDashboardResponse {
  readonly dashboard: DashboardDTO;
}
```

### FinancialHealthDTO

```typescript
interface FinancialHealthDTO {
  readonly score: number;
  readonly status: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  readonly factors: {
    readonly incomeStability: number;
    readonly debtToIncome: number;
    readonly savingsRate: number;
    readonly emergencyFund: number;
  };
  readonly recommendations: string[];
}
```

### CalculateFinancialHealthRequest

```typescript
interface CalculateFinancialHealthRequest {
  readonly userId: string;
}
```

### CalculateFinancialHealthResponse

```typescript
interface CalculateFinancialHealthResponse {
  readonly health: FinancialHealthDTO;
}
```

---

## Mapping Rules

### 1. **Prisma Entity → DTO**

**Rule**: Map only necessary fields, calculate derived fields.

```typescript
// Prisma Entity
interface GoalEntity {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: Date;
  priority: string;
  category: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

// Mapping Function
function mapGoalToDTO(
  entity: GoalEntity,
  calculations: {
    monthlySavingsRequired: number;
    progressPercentage: number;
    feasibility: string;
  }
): GoalDTO {
  return {
    id: entity.id,
    userId: entity.userId,
    name: entity.name,
    description: null, // Not in entity, set default
    targetAmount: entity.targetAmount,
    currentAmount: entity.currentAmount,
    targetDate: entity.targetDate,
    priority: entity.priority as 'HIGH' | 'MEDIUM' | 'LOW',
    category: entity.category,
    status: entity.status as 'ACTIVE' | 'COMPLETED' | 'ABANDONED',
    monthlySavingsRequired: calculations.monthlySavingsRequired,
    progressPercentage: calculations.progressPercentage,
    feasibility: calculations.feasibility as 'FEASIBLE' | 'STRETCH' | 'INFEASIBLE',
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}
```

### 2. **Request DTO → Repository Input**

**Rule**: Extract only fields needed for persistence.

```typescript
function mapCreateGoalRequestToEntity(
  request: CreateGoalRequest
): Omit<GoalEntity, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'> {
  return {
    userId: request.userId,
    name: request.name,
    targetAmount: request.targetAmount,
    targetDate: request.targetDate,
    priority: request.priority,
    category: request.category,
    currentAmount: 0, // Default
    status: 'ACTIVE', // Default
  };
}
```

### 3. **Financial Engine Output → DTO**

**Rule**: Embed engine results in response DTOs.

```typescript
// Financial Engine Output
interface AllocationResult {
  needs: number;
  wants: number;
  savings: number;
  breakdown: {
    fixedExpenses: number;
    variableExpenses: number;
    goalContributions: number;
    debtPayments: number;
    discretionary: number;
    emergencyFund: number;
  };
}

// Map to DTO
function mapAllocationResultToDTO(
  userId: string,
  allocationId: string,
  monthlyIncome: number,
  result: AllocationResult,
  createdAt: Date
): AllocationDTO {
  return {
    id: allocationId,
    userId,
    monthlyIncome,
    needs: result.needs,
    wants: result.wants,
    savings: result.savings,
    breakdown: result.breakdown,
    createdAt,
  };
}
```

### 4. **Multiple Entities → Composite DTO**

**Rule**: Fetch multiple entities, combine into single DTO.

```typescript
async function generateDashboardDTO(userId: string): Promise<DashboardDTO> {
  // Fetch from repositories
  const profile = await financialProfileRepository.findByUserId(userId);
  const goals = await goalRepository.findActiveByUserId(userId);
  const expenses = await expenseRepository.findRecentByUserId(userId, 10);
  const debts = await debtRepository.findActiveByUserId(userId);
  const allocation = await allocationRepository.findLatestByUserId(userId);

  // Calculate via Financial Engine
  const health = financialEngine.calculateFinancialHealth({
    income: profile.monthlyIncome,
    expenses,
    debts,
    savings: allocation.savings,
  });

  // Combine into DTO
  return {
    userId,
    financialHealth: mapHealthToDTO(health),
    allocation: mapAllocationToDTO(allocation),
    goals: {
      active: goals.map(mapGoalSummaryToDTO),
      summary: calculateGoalSummary(goals),
    },
    expenses: {
      recent: expenses.map(mapExpenseSummaryToDTO),
      monthlyTotal: sumExpenses(expenses),
      byCategory: groupExpensesByCategory(expenses),
    },
    debts: {
      active: debts.map(mapDebtSummaryToDTO),
      totalBalance: sumDebtBalances(debts),
      totalMonthlyPayment: sumDebtPayments(debts),
    },
    insights: generateInsights(profile, goals, expenses, debts),
  };
}
```

### 5. **Error Mapping**

**Rule**: Convert internal errors to ErrorResponse DTO.

```typescript
function mapErrorToDTO(error: Error): ErrorResponse {
  if (error instanceof ValidationError) {
    return {
      code: 'VALIDATION_ERROR',
      message: error.message,
      details: error.validationErrors,
      timestamp: new Date(),
    };
  }

  if (error instanceof NotFoundError) {
    return {
      code: 'NOT_FOUND',
      message: error.message,
      timestamp: new Date(),
    };
  }

  // Default
  return {
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
    timestamp: new Date(),
  };
}
```

---

## Summary

### Total DTOs: 60+

**By Category**:
- Common: 5
- User & Profile: 6
- Goals: 10
- Expenses: 10
- Debts: 10
- Allocation: 3
- Simulation: 8
- Chat: 6
- Dashboard: 6

### Key Principles

1. **Never expose Prisma entities**
2. **Separate request/response DTOs**
3. **Calculate derived fields before mapping**
4. **Use readonly properties**
5. **Explicit nullability**
6. **Flat structure where possible**
7. **Type-safe enums**
8. **Consistent naming conventions**

### Naming Conventions

- **Request DTOs**: `{Action}{Entity}Request` (e.g., `CreateGoalRequest`)
- **Response DTOs**: `{Action}{Entity}Response` (e.g., `CreateGoalResponse`)
- **Entity DTOs**: `{Entity}DTO` (e.g., `GoalDTO`)
- **Summary DTOs**: `{Entity}SummaryDTO` (e.g., `GoalSummaryDTO`)

---

**Next**: Define service boundaries and responsibilities.
