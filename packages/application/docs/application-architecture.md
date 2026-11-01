# Application Layer Architecture

**Package**: `@sage/application`  
**Version**: 1.0.0  
**Status**: Design Phase  
**Last Updated**: 2024

---

## Table of Contents

1. [Purpose](#purpose)
2. [Position in System Architecture](#position-in-system-architecture)
3. [Responsibilities](#responsibilities)
4. [Non-Responsibilities](#non-responsibilities)
5. [Communication Patterns](#communication-patterns)
6. [Architecture Diagrams](#architecture-diagrams)
7. [Design Principles](#design-principles)
8. [Package Structure](#package-structure)

---

## Purpose

The Application Layer serves as the **orchestration layer** for Sage AI Personal CFO. It coordinates interactions between:

- **Financial Engine** (pure business logic)
- **Repository Layer** (data persistence)
- **API Routes** (HTTP interface)
- **AI Layer** (explanation generation)

### Core Objective

**Orchestrate business workflows without implementing business logic.**

The Application Layer translates user intent into coordinated operations across domain services and infrastructure, ensuring:

- ✅ Transaction boundaries are respected
- ✅ Data flows correctly between layers
- ✅ Business rules are enforced (via Financial Engine)
- ✅ Validation occurs at appropriate boundaries
- ✅ Errors are handled consistently

---

## Position in System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                       │
│  (Next.js Pages, React Components, Server Actions)          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│              (Use Cases, DTOs, Orchestration)                │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Onboarding  │  │    Goals     │  │  Allocation  │     │
│  │   Service    │  │   Service    │  │   Service    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │     Chat     │  │  Simulation  │  │   Expenses   │     │
│  │   Service    │  │   Service    │  │   Service    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  ┌──────────────┐                                           │
│  │    Debts     │                                           │
│  │   Service    │                                           │
│  └──────────────┘                                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
        ┌───────────────────┴───────────────────┐
        ↓                                       ↓
┌──────────────────┐                  ┌──────────────────┐
│   Domain Layer   │                  │ Infrastructure   │
│                  │                  │     Layer        │
│ ┌──────────────┐ │                  │                  │
│ │  Financial   │ │                  │ ┌──────────────┐ │
│ │   Engine     │ │                  │ │ Repositories │ │
│ │              │ │                  │ │              │ │
│ │ • Allocation │ │                  │ │ • User       │ │
│ │ • Goals      │ │                  │ │ • Goal       │ │
│ │ • Loans      │ │                  │ │ • Expense    │ │
│ │ • Purchase   │ │                  │ │ • Debt       │ │
│ │ • Forecast   │ │                  │ │ • Allocation │ │
│ │ • Health     │ │                  │ │ • Simulation │ │
│ └──────────────┘ │                  │ │ • Conversation│ │
│                  │                  │ └──────────────┘ │
│ ┌──────────────┐ │                  │                  │
│ │  AI Service  │ │                  │ ┌──────────────┐ │
│ │              │ │                  │ │   Prisma     │ │
│ │ • Prompts    │ │                  │ │   Client     │ │
│ │ • Streaming  │ │                  │ └──────────────┘ │
│ └──────────────┘ │                  │                  │
└──────────────────┘                  └──────────────────┘
```

### Layer Dependencies

```
Presentation Layer
    ↓ (calls)
Application Layer
    ↓ (calls)              ↓ (calls)
Domain Layer          Infrastructure Layer
    ↓ (uses)
Financial Engine
```

**Critical Rule**: Dependencies flow **downward only**. Lower layers never import from upper layers.

---

## Responsibilities

The Application Layer is responsible for:

### 1. **Use Case Orchestration**

Coordinate multi-step business workflows:

```typescript
// Example: CompleteOnboardingUseCase
async execute(request: OnboardingRequest): Promise<OnboardingResponse> {
  // 1. Validate input
  // 2. Begin transaction
  // 3. Create user via repository
  // 4. Create financial profile via repository
  // 5. Calculate initial allocation via Financial Engine
  // 6. Save allocation via repository
  // 7. Commit transaction
  // 8. Return DTO
}
```

### 2. **Transaction Management**

Define and enforce transaction boundaries:

- Begin transactions for multi-step workflows
- Coordinate repository operations within transactions
- Handle rollback on failures
- Ensure ACID guarantees

### 3. **Data Transformation**

Map between layers using DTOs:

- **Input**: API requests → Application DTOs
- **Processing**: Application DTOs → Repository entities
- **Output**: Repository entities → Response DTOs

### 4. **Validation Coordination**

Orchestrate validation across layers:

- **Input validation**: Shape, type, required fields
- **Business validation**: Delegate to Financial Engine
- **Authorization**: Verify user ownership

### 5. **Error Translation**

Convert layer-specific errors to application errors:

- Repository errors → Application errors
- Financial Engine errors → Application errors
- Validation errors → Structured error responses

### 6. **Event Publishing**

Emit domain events for cross-module communication:

- `GoalCreated`
- `ExpenseRecorded`
- `IncomeUpdated`
- `AllocationGenerated`
- `SimulationCompleted`

### 7. **Dependency Injection**

Accept dependencies via constructor injection:

```typescript
class GoalService {
  constructor(
    private goalRepository: IGoalRepository,
    private allocationRepository: IAllocationRepository,
    private financialEngine: IFinancialEngine,
    private eventPublisher: IEventPublisher
  ) {}
}
```

---

## Non-Responsibilities

The Application Layer **MUST NOT**:

### ❌ Financial Calculations

**Forbidden**:
```typescript
// WRONG: Application Layer calculating
const monthlyPayment = (principal * rate) / (1 - Math.pow(1 + rate, -months));
```

**Correct**:
```typescript
// RIGHT: Delegate to Financial Engine
const result = financialEngine.calculateLoanPayment({
  principal,
  annualRate,
  termMonths
});
```

### ❌ Database Queries

**Forbidden**:
```typescript
// WRONG: Direct Prisma usage
const goals = await prisma.goal.findMany({
  where: { userId, deletedAt: null }
});
```

**Correct**:
```typescript
// RIGHT: Use repository
const goals = await goalRepository.findByUserId(userId);
```

### ❌ SQL or Prisma Operations

**Forbidden**:
```typescript
// WRONG: Raw SQL
await prisma.$executeRaw`UPDATE goals SET status = 'COMPLETED'`;
```

**Correct**:
```typescript
// RIGHT: Repository method
await goalRepository.markAsCompleted(goalId);
```

### ❌ UI Logic

**Forbidden**:
```typescript
// WRONG: Formatting for display
const formattedAmount = `₹${amount.toLocaleString('en-IN')}`;
```

**Correct**:
```typescript
// RIGHT: Return raw data, let UI format
return { amount, currency: 'INR' };
```

### ❌ AI Prompt Construction

**Forbidden**:
```typescript
// WRONG: Building prompts
const prompt = `You are a CFO. User income is ${income}...`;
```

**Correct**:
```typescript
// RIGHT: Delegate to AI Service
const response = await aiService.generateAdvice({
  context: financialContext,
  question: userQuestion
});
```

### ❌ Business Logic Implementation

**Forbidden**:
```typescript
// WRONG: Implementing allocation logic
const needs = income * 0.50;
const wants = income * 0.30;
const savings = income * 0.20;
```

**Correct**:
```typescript
// RIGHT: Call Financial Engine
const allocation = financialEngine.calculateAllocation({
  monthlyIncome: income,
  expenses,
  goals,
  debts
});
```

---

## Communication Patterns

### 1. **Application ↔ Financial Engine**

**Pattern**: Direct function calls (synchronous)

```typescript
// Application Layer
import { calculateAllocation } from '@sage/financial-engine';

const result = calculateAllocation({
  monthlyIncome: profile.monthlyIncome,
  expenses: expenseData,
  goals: goalData,
  debts: debtData
});
```

**Characteristics**:
- Pure function calls
- Synchronous execution
- No side effects
- Deterministic results

### 2. **Application ↔ Repository Layer**

**Pattern**: Repository pattern (async)

```typescript
// Application Layer
class GoalService {
  constructor(private goalRepository: IGoalRepository) {}

  async createGoal(request: CreateGoalRequest): Promise<GoalResponse> {
    const goal = await this.goalRepository.create({
      userId: request.userId,
      name: request.name,
      targetAmount: request.targetAmount,
      targetDate: request.targetDate,
      priority: request.priority
    });
    
    return this.mapToResponse(goal);
  }
}
```

**Characteristics**:
- Async/await
- Interface-based (dependency inversion)
- Returns domain entities
- Handles persistence errors

### 3. **Application ↔ API Routes**

**Pattern**: Use case invocation

```typescript
// API Route (Server Action)
export async function createGoalAction(formData: FormData) {
  const request = parseFormData(formData);
  
  const goalService = new GoalService(
    goalRepository,
    allocationRepository,
    financialEngine,
    eventPublisher
  );
  
  const result = await goalService.createGoal(request);
  
  return result;
}
```

**Characteristics**:
- API layer instantiates services
- Passes DTOs
- Receives DTOs
- Handles HTTP concerns (status codes, headers)

### 4. **Application ↔ AI Layer**

**Pattern**: Service delegation

```typescript
// Application Layer
class ChatService {
  constructor(
    private conversationRepository: IConversationRepository,
    private aiService: IAIService
  ) {}

  async askCFO(request: AskCFORequest): Promise<AskCFOResponse> {
    // 1. Fetch conversation history
    const conversation = await this.conversationRepository.findById(
      request.conversationId
    );
    
    // 2. Delegate to AI Service
    const aiResponse = await this.aiService.generateResponse({
      conversationHistory: conversation.messages,
      userQuestion: request.question,
      financialContext: request.context
    });
    
    // 3. Save message
    await this.conversationRepository.addMessage(
      request.conversationId,
      aiResponse
    );
    
    return this.mapToResponse(aiResponse);
  }
}
```

**Characteristics**:
- AI Service handles prompt engineering
- Application Layer provides context
- Application Layer persists results

### 5. **Application ↔ Application (Cross-Module)**

**Pattern**: Event-driven (async)

```typescript
// Goals Module
class GoalService {
  async createGoal(request: CreateGoalRequest): Promise<GoalResponse> {
    const goal = await this.goalRepository.create(data);
    
    // Emit event for other modules
    await this.eventPublisher.publish(new GoalCreatedEvent({
      goalId: goal.id,
      userId: goal.userId,
      targetAmount: goal.targetAmount,
      targetDate: goal.targetDate
    }));
    
    return this.mapToResponse(goal);
  }
}

// Allocation Module (subscriber)
class AllocationService {
  async onGoalCreated(event: GoalCreatedEvent): Promise<void> {
    // Recalculate allocation when goal is created
    await this.regenerateAllocation(event.userId);
  }
}
```

**Characteristics**:
- Loose coupling between modules
- Async event handling
- No direct module dependencies
- Simple in-process event bus (no Kafka, RabbitMQ)

---

## Architecture Diagrams

### Request Flow: Create Goal

```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │ POST /api/goals
       ↓
┌─────────────────────────────────────────┐
│         Presentation Layer              │
│  (Server Action: createGoalAction)      │
│                                         │
│  1. Parse request                       │
│  2. Validate auth                       │
│  3. Create GoalService                  │
│  4. Call service.createGoal()           │
└──────┬──────────────────────────────────┘
       │ CreateGoalRequest DTO
       ↓
┌─────────────────────────────────────────┐
│        Application Layer                │
│     (GoalService.createGoal)            │
│                                         │
│  1. Validate input                      │
│  2. Begin transaction                   │
│  3. Create goal (repository)            │
│  4. Calculate allocation (engine)       │
│  5. Save allocation (repository)        │
│  6. Publish GoalCreated event           │
│  7. Commit transaction                  │
│  8. Map to response DTO                 │
└──────┬────────┬─────────┬───────────────┘
       │        │         │
       │        │         └──────────────────┐
       │        │                            │
       ↓        ↓                            ↓
┌──────────┐ ┌──────────────┐    ┌──────────────────┐
│Financial │ │ Repository   │    │  Event Publisher │
│ Engine   │ │   Layer      │    │                  │
│          │ │              │    │  • GoalCreated   │
│calculate │ │ • create()   │    │                  │
│Allocation│ │ • update()   │    │  Subscribers:    │
└──────────┘ └──────┬───────┘    │  • Allocation    │
                    │            └──────────────────┘
                    ↓
             ┌──────────────┐
             │   Prisma     │
             │  Database    │
             └──────────────┘
```

### Data Flow: Dashboard Generation

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ GET /dashboard
       ↓
┌─────────────────────────────────────────┐
│         Presentation Layer              │
└──────┬──────────────────────────────────┘
       │ GetDashboardRequest
       ↓
┌─────────────────────────────────────────┐
│        Application Layer                │
│   (DashboardService.getDashboard)       │
│                                         │
│  1. Fetch user profile (repo)           │
│  2. Fetch goals (repo)                  │
│  3. Fetch expenses (repo)               │
│  4. Fetch debts (repo)                  │
│  5. Fetch allocation (repo)             │
│  6. Calculate health (engine)           │
│  7. Calculate progress (engine)         │
│  8. Map to DashboardResponse DTO        │
└──────┬────────┬─────────────────────────┘
       │        │
       ↓        ↓
┌──────────┐ ┌──────────────┐
│Financial │ │ Repository   │
│ Engine   │ │   Layer      │
│          │ │              │
│calculate │ │ • findByUser │
│Health    │ │ • findActive │
│          │ │              │
│calculate │ │              │
│Progress  │ │              │
└──────────┘ └──────────────┘
```

### Module Communication: Event Flow

```
┌──────────────────┐
│  Goals Module    │
│                  │
│  GoalService     │
│  • createGoal()  │
│  • updateGoal()  │
│  • deleteGoal()  │
└────────┬─────────┘
         │ emits
         ↓
    ┌─────────────────┐
    │ Event Publisher │
    │                 │
    │ • GoalCreated   │
    │ • GoalUpdated   │
    │ • GoalDeleted   │
    └────────┬────────┘
             │ publishes to
             ↓
    ┌─────────────────────────────────┐
    │      Event Subscribers          │
    └─────────────────────────────────┘
             │
       ┌─────┴─────┬─────────────┐
       ↓           ↓             ↓
┌─────────────┐ ┌──────────┐ ┌──────────┐
│ Allocation  │ │   Chat   │ │Dashboard │
│   Module    │ │  Module  │ │  Module  │
│             │ │          │ │          │
│ Recalculate │ │  Update  │ │ Refresh  │
│ allocation  │ │ context  │ │  cache   │
└─────────────┘ └──────────┘ └──────────┘
```

---

## Design Principles

### 1. **Clean Architecture**

- **Independence**: Application Layer doesn't depend on frameworks, UI, or database
- **Testability**: Easy to test without external dependencies
- **Flexibility**: Can swap implementations without changing orchestration logic

### 2. **Domain-Driven Design**

- **Ubiquitous Language**: Use domain terms consistently
- **Bounded Contexts**: Respect module boundaries
- **Aggregates**: Coordinate operations on aggregate roots

### 3. **Repository Pattern**

- **Abstraction**: Application Layer depends on repository interfaces, not implementations
- **Persistence Ignorance**: No knowledge of Prisma, SQL, or database structure

### 4. **Command/Query Separation**

- **Commands**: Mutate state, return minimal data
- **Queries**: Read-only, return rich DTOs
- **No CQRS complexity**: Same models for read/write (for now)

### 5. **Dependency Inversion**

- **Interfaces**: Application Layer defines interfaces
- **Implementations**: Infrastructure Layer implements interfaces
- **Injection**: Dependencies injected via constructor

### 6. **Single Responsibility**

- **One Use Case = One Method**: Each method handles exactly one business workflow
- **Cohesion**: Related operations grouped in same service
- **Separation**: Unrelated operations in different services

---

## Package Structure

```
packages/application/
├── src/
│   ├── services/
│   │   ├── onboarding/
│   │   │   ├── OnboardingService.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   ├── goals/
│   │   │   ├── GoalService.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   ├── allocation/
│   │   │   ├── AllocationService.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   ├── chat/
│   │   │   ├── ChatService.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   ├── simulation/
│   │   │   ├── SimulationService.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   ├── expenses/
│   │   │   ├── ExpenseService.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   ├── debts/
│   │   │   ├── DebtService.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   └── dashboard/
│   │       ├── DashboardService.ts
│   │       ├── types.ts
│   │       └── index.ts
│   ├── dtos/
│   │   ├── user.dto.ts
│   │   ├── goal.dto.ts
│   │   ├── expense.dto.ts
│   │   ├── debt.dto.ts
│   │   ├── allocation.dto.ts
│   │   ├── simulation.dto.ts
│   │   ├── chat.dto.ts
│   │   ├── dashboard.dto.ts
│   │   └── common.dto.ts
│   ├── interfaces/
│   │   ├── repositories/
│   │   │   ├── IUserRepository.ts
│   │   │   ├── IGoalRepository.ts
│   │   │   ├── IExpenseRepository.ts
│   │   │   ├── IDebtRepository.ts
│   │   │   ├── IAllocationRepository.ts
│   │   │   ├── ISimulationRepository.ts
│   │   │   ├── IConversationRepository.ts
│   │   │   └── index.ts
│   │   ├── services/
│   │   │   ├── IFinancialEngine.ts
│   │   │   ├── IAIService.ts
│   │   │   └── index.ts
│   │   └── events/
│   │       ├── IEventPublisher.ts
│   │       └── index.ts
│   ├── events/
│   │   ├── GoalEvents.ts
│   │   ├── ExpenseEvents.ts
│   │   ├── DebtEvents.ts
│   │   ├── AllocationEvents.ts
│   │   ├── SimulationEvents.ts
│   │   └── index.ts
│   ├── errors/
│   │   ├── ApplicationError.ts
│   │   ├── ValidationError.ts
│   │   ├── AuthorizationError.ts
│   │   ├── NotFoundError.ts
│   │   └── index.ts
│   ├── validators/
│   │   ├── inputValidators.ts
│   │   ├── businessValidators.ts
│   │   └── index.ts
│   └── index.ts
├── docs/
│   ├── application-architecture.md
│   ├── use-case-design.md
│   ├── dto-design.md
│   ├── service-boundaries.md
│   ├── dependency-rules.md
│   ├── validation-strategy.md
│   ├── transaction-orchestration.md
│   ├── event-flow.md
│   ├── error-handling.md
│   └── application-review.md
├── tests/
│   ├── services/
│   ├── validators/
│   └── integration/
├── package.json
├── tsconfig.json
└── README.md
```

### Module Organization

Each service module follows this structure:

```typescript
// services/goals/GoalService.ts
export class GoalService {
  constructor(
    private goalRepository: IGoalRepository,
    private allocationRepository: IAllocationRepository,
    private financialEngine: IFinancialEngine,
    private eventPublisher: IEventPublisher
  ) {}

  // Use cases
  async createGoal(request: CreateGoalRequest): Promise<GoalResponse> {}
  async updateGoal(request: UpdateGoalRequest): Promise<GoalResponse> {}
  async deleteGoal(request: DeleteGoalRequest): Promise<void> {}
  async getGoal(request: GetGoalRequest): Promise<GoalResponse> {}
  async listGoals(request: ListGoalsRequest): Promise<GoalListResponse> {}
}
```

---

## Summary

The Application Layer is the **orchestration hub** of Sage AI Personal CFO:

✅ **Coordinates** workflows across Financial Engine and Repository Layer  
✅ **Manages** transactions and data consistency  
✅ **Transforms** data using DTOs  
✅ **Validates** input and enforces authorization  
✅ **Publishes** events for cross-module communication  
✅ **Translates** errors into consistent responses  

❌ **Does NOT** implement business logic  
❌ **Does NOT** perform calculations  
❌ **Does NOT** execute database queries  
❌ **Does NOT** construct UI or AI prompts  

This separation ensures:
- **Testability**: Mock dependencies easily
- **Maintainability**: Clear responsibilities
- **Flexibility**: Swap implementations without breaking orchestration
- **Scalability**: Add new use cases without touching other layers

---

**Next Steps**:
1. Review use case design
2. Define DTOs
3. Establish service boundaries
4. Document dependency rules
5. Design validation strategy
