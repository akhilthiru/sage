# Sage: Module Boundaries

## Overview

This document defines the modular monolith architecture for Sage, establishing clear boundaries between modules, ownership rules, and communication patterns.

**Architecture:** Modular Monolith with Domain-Driven Design

---

## Why Modular Monolith?

### The Best of Both Worlds

**Monolith Benefits:**
- Single deployment unit
- Shared database (ACID transactions)
- Simple infrastructure
- Easy local development

**Microservices Benefits:**
- Clear module boundaries
- Independent development
- Testable in isolation
- Future extraction path

**Modular Monolith = Monolith structure + Microservices discipline**

### Why NOT Microservices Now?

**Premature Distribution Costs:**

1. **Network Overhead**
   ```typescript
   // Microservices: Network call
   const allocation = await fetch('http://allocation-service/calculate');
   // Latency: 50-200ms
   
   // Modular Monolith: Function call
   const allocation = calculateAllocation(input);
   // Latency: < 1ms
   ```

2. **Data Consistency**
   ```typescript
   // Microservices: Distributed transaction
   await goalService.createGoal(goal);
   await allocationService.recalculate(userId); // May fail
   await notificationService.send(userId);      // May fail
   // Need saga pattern, compensation, eventual consistency
   
   // Modular Monolith: Database transaction
   await db.$transaction([
     createGoal(goal),
     recalculateAllocation(userId),
     sendNotification(userId)
   ]);
   // ACID guarantees
   ```

3. **Development Complexity**
   ```bash
   # Microservices: Multiple services to run
   docker-compose up
   # 5+ services, complex setup
   
   # Modular Monolith: Single process
   npm run dev
   # One command, instant feedback
   ```

**Startup Reality:**
- Team size: 2-10 developers
- Need speed over scalability
- Unclear service boundaries
- Limited ops resources

### When to Extract Microservices

**Valid Triggers:**
1. **Independent Scaling**
   - Chat service needs 10x instances
   - Clear performance bottleneck
   - Cost optimization opportunity

2. **Team Growth**
   - 50+ developers
   - Multiple autonomous teams
   - Clear ownership boundaries

3. **Technology Requirements**
   - Need Python for ML models
   - Need Go for high-performance service
   - Polyglot persistence needed

**Our Approach:**
- Design modules as if they were microservices
- Keep them in monolith for simplicity
- Extract when business need is clear

---

## Module Architecture

### Layered Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│         (Next.js Pages, Components, Client-side)             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│              (Server Actions, API Routes)                    │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Onboarding│  │  Goals   │  │   Chat   │  │Allocation│   │
│  │  Module  │  │  Module  │  │  Module  │  │  Module  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      Domain Layer                            │
│              (Pure Business Logic)                           │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Financial │  │Simulation│  │Validation│  │   AI     │   │
│  │  Engine  │  │  Engine  │  │  Rules   │  │ Service  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  Infrastructure Layer                        │
│         (Database, External APIs, Services)                  │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │PostgreSQL│  │  Clerk   │  │  OpenAI  │  │  Cache   │   │
│  │ (Prisma) │  │   Auth   │  │   API    │  │  (Redis) │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Dependency Rules

**Strict Layering:**
```
Presentation → Application → Domain → Infrastructure
```

**Rules:**
1. **Presentation** can depend on: Application, Domain, Infrastructure
2. **Application** can depend on: Domain, Infrastructure
3. **Domain** can depend on: Infrastructure (interfaces only)
4. **Infrastructure** cannot depend on other layers

**Enforcement:**
```typescript
// ESLint configuration
{
  "rules": {
    "import/no-restricted-paths": [
      "error",
      {
        "zones": [
          {
            "target": "./domain",
            "from": "./features",
            "message": "Domain cannot import from Application layer"
          },
          {
            "target": "./domain",
            "from": "./app",
            "message": "Domain cannot import from Presentation layer"
          },
          {
            "target": "./lib",
            "from": ["./app", "./features", "./domain"],
            "message": "Infrastructure cannot import from upper layers"
          }
        ]
      }
    ]
  }
}
```

---

## Core Modules

### Module 1: Onboarding

**Purpose:** User registration and initial profile setup

**Boundaries:**
```
features/onboarding/
├── components/
│   ├── WelcomeStep.tsx
│   ├── IncomeStep.tsx
│   ├── SavingsStep.tsx
│   └── GoalStep.tsx
├── actions/
│   ├── create-profile.ts
│   ├── update-profile.ts
│   └── calculate-understanding-score.ts
├── hooks/
│   ├── useOnboardingProgress.ts
│   └── useProfileValidation.ts
├── types/
│   └── onboarding.ts
└── README.md
```

**Public API:**
```typescript
// features/onboarding/actions/index.ts
export { createProfile } from './create-profile';
export { updateProfile } from './update-profile';
export { calculateUnderstandingScore } from './calculate-understanding-score';

// Usage from other modules
import { createProfile } from '@/features/onboarding/actions';
```

**Dependencies:**
- Domain: `@/domain/validation/profile-schema`
- Infrastructure: `@/lib/db`
- External: Clerk (auth)

**Owned Data:**
- FinancialProfile entity
- Understanding score calculation

**Communication:**
- Emits: `profile.created`, `profile.updated`
- Listens: `user.created` (from Clerk webhook)

---

### Module 2: Goals

**Purpose:** Financial goal management and tracking

**Boundaries:**
```
features/goals/
├── components/
│   ├── GoalCard.tsx
│   ├── GoalForm.tsx
│   ├── GoalProgress.tsx
│   └── FeasibilityPreview.tsx
├── actions/
│   ├── create-goal.ts
│   ├── update-goal.ts
│   ├── delete-goal.ts
│   └── calculate-feasibility.ts
├── hooks/
│   ├── useGoals.ts
│   ├── useGoalFeasibility.ts
│   └── useGoalProgress.ts
├── types/
│   └── goals.ts
└── README.md
```

**Public API:**
```typescript
export { createGoal } from './actions/create-goal';
export { updateGoal } from './actions/update-goal';
export { deleteGoal } from './actions/delete-goal';
export { calculateGoalFeasibility } from './actions/calculate-feasibility';
```

**Dependencies:**
- Domain: `@/domain/financial/goals`, `@/domain/financial/projection`
- Infrastructure: `@/lib/db`
- Modules: None (independent)

**Owned Data:**
- Goal entity
- GoalMilestone entity

**Communication:**
- Emits: `goal.created`, `goal.updated`, `goal.completed`, `goal.deleted`
- Listens: `profile.updated` (recalculate feasibility)

---

### Module 3: Allocation

**Purpose:** Monthly income allocation calculation

**Boundaries:**
```
features/allocation/
├── components/
│   ├── AllocationCard.tsx
│   ├── AllocationBreakdown.tsx
│   └── AllocationChart.tsx
├── actions/
│   ├── calculate-allocation.ts
│   ├── save-allocation.ts
│   └── get-allocation.ts
├── hooks/
│   ├── useAllocation.ts
│   └── useAllocationHistory.ts
├── types/
│   └── allocation.ts
└── README.md
```

**Public API:**
```typescript
export { calculateAllocation } from './actions/calculate-allocation';
export { saveAllocation } from './actions/save-allocation';
export { getAllocation } from './actions/get-allocation';
```

**Dependencies:**
- Domain: `@/domain/financial/allocation`
- Infrastructure: `@/lib/db`
- Modules: None (reads from database)

**Owned Data:**
- Allocation entity (snapshots)

**Communication:**
- Emits: `allocation.calculated`, `allocation.saved`
- Listens: `goal.created`, `goal.updated`, `expense.created`, `debt.created`

---

### Module 4: Chat

**Purpose:** AI-powered financial conversation

**Boundaries:**
```
features/chat/
├── components/
│   ├── ChatInterface.tsx
│   ├── MessageList.tsx
│   ├── MessageInput.tsx
│   └── SuggestedQuestions.tsx
├── actions/
│   ├── send-message.ts
│   ├── get-conversations.ts
│   └── get-messages.ts
├── hooks/
│   ├── useChat.ts
│   ├── useConversations.ts
│   └── useStreamingResponse.ts
├── lib/
│   ├── intent-extraction.ts
│   ├── response-generation.ts
│   └── conversation-context.ts
├── types/
│   └── chat.ts
└── README.md
```

**Public API:**
```typescript
export { sendMessage } from './actions/send-message';
export { getConversations } from './actions/get-conversations';
export { getMessages } from './actions/get-messages';
```

**Dependencies:**
- Domain: `@/domain/ai/intent-extraction`, `@/domain/financial/*`
- Infrastructure: `@/lib/openai`, `@/lib/db`
- Modules: Goals, Allocation, Simulation (for data)

**Owned Data:**
- Conversation entity
- Message entity

**Communication:**
- Emits: `message.sent`, `conversation.created`
- Listens: All domain events (for context)

---

### Module 5: Simulation

**Purpose:** What-if scenario modeling

**Boundaries:**
```
features/simulation/
├── components/
│   ├── AffordabilitySimulator.tsx
│   ├── LoanCalculator.tsx
│   ├── ScenarioCard.tsx
│   └── ComparisonChart.tsx
├── actions/
│   ├── simulate-purchase.ts
│   ├── simulate-loan.ts
│   └── simulate-goal-change.ts
├── hooks/
│   ├── useSimulation.ts
│   └── useSimulationHistory.ts
├── types/
│   └── simulation.ts
└── README.md
```

**Public API:**
```typescript
export { simulatePurchase } from './actions/simulate-purchase';
export { simulateLoan } from './actions/simulate-loan';
export { simulateGoalChange } from './actions/simulate-goal-change';
```

**Dependencies:**
- Domain: `@/domain/financial/simulation`, `@/domain/financial/loans`
- Infrastructure: `@/lib/db`
- Modules: None (independent)

**Owned Data:**
- Simulation entity (historical records)

**Communication:**
- Emits: `simulation.run`, `simulation.saved`
- Listens: None

---

### Module 6: Expenses

**Purpose:** Expense tracking and budgeting

**Boundaries:**
```
features/expenses/
├── components/
│   ├── ExpenseList.tsx
│   ├── ExpenseForm.tsx
│   └── BudgetOverview.tsx
├── actions/
│   ├── create-expense.ts
│   ├── update-expense.ts
│   └── delete-expense.ts
├── hooks/
│   ├── useExpenses.ts
│   └── useBudget.ts
├── types/
│   └── expenses.ts
└── README.md
```

**Public API:**
```typescript
export { createExpense } from './actions/create-expense';
export { updateExpense } from './actions/update-expense';
export { deleteExpense } from './actions/delete-expense';
```

**Dependencies:**
- Domain: `@/domain/validation/expense-schema`
- Infrastructure: `@/lib/db`
- Modules: None

**Owned Data:**
- Expense entity

**Communication:**
- Emits: `expense.created`, `expense.updated`, `expense.deleted`
- Listens: None

---

### Module 7: Debts

**Purpose:** Debt and loan management

**Boundaries:**
```
features/debts/
├── components/
│   ├── DebtList.tsx
│   ├── DebtForm.tsx
│   ├── PaymentSchedule.tsx
│   └── DebtSummary.tsx
├── actions/
│   ├── create-debt.ts
│   ├── update-debt.ts
│   ├── record-payment.ts
│   └── calculate-payoff.ts
├── hooks/
│   ├── useDebts.ts
│   └── usePaymentSchedule.ts
├── types/
│   └── debts.ts
└── README.md
```

**Public API:**
```typescript
export { createDebt } from './actions/create-debt';
export { updateDebt } from './actions/update-debt';
export { recordPayment } from './actions/record-payment';
```

**Dependencies:**
- Domain: `@/domain/financial/loans`
- Infrastructure: `@/lib/db`
- Modules: None

**Owned Data:**
- Debt entity
- DebtPayment entity

**Communication:**
- Emits: `debt.created`, `debt.updated`, `debt.paid_off`
- Listens: None

---

## Domain Layer Modules

### Financial Engine

**Purpose:** Core financial calculations (deterministic)

**Structure:**
```
domain/financial/
├── allocation.ts          # Allocation algorithm
├── goals.ts              # Goal feasibility
├── loans.ts              # EMI calculations
├── projection.ts         # Cash flow projection
├── confidence.ts         # Confidence scoring
├── types.ts              # Financial types
├── constants.ts          # Financial constants
└── __tests__/
    ├── allocation.test.ts
    ├── goals.test.ts
    └── loans.test.ts
```

**Public API:**
```typescript
// Pure functions only
export function calculateAllocation(input: AllocationInput): Allocation;
export function calculateGoalFeasibility(input: GoalInput): FeasibilityResult;
export function calculateEMI(principal: number, rate: number, tenure: number): number;
export function projectCashFlow(input: ProjectionInput): CashFlowProjection;
export function calculateConfidence(factors: ConfidenceFactor[]): ConfidenceScore;
```

**Rules:**
- No side effects
- No database access
- No API calls
- Pure functions only
- 100% test coverage

---

### AI Service

**Purpose:** LLM integration and prompt management

**Structure:**
```
domain/ai/
├── intent-extraction.ts   # Extract user intent
├── response-generation.ts # Generate explanations
├── prompts/
│   ├── system.ts         # System prompts
│   ├── intent.ts         # Intent extraction prompts
│   └── explanation.ts    # Explanation prompts
├── types.ts
└── __tests__/
    └── intent-extraction.test.ts
```

**Public API:**
```typescript
export async function extractIntent(message: string): Promise<Intent>;
export async function generateExplanation(
  calculation: CalculationResult,
  context: ConversationContext
): Promise<string>;
```

**Rules:**
- Never perform calculations
- Only explain results
- Include confidence scores
- Cite data sources

---

### Validation

**Purpose:** Input validation and business rules

**Structure:**
```
domain/validation/
├── schemas/
│   ├── profile.ts        # Zod schemas
│   ├── goal.ts
│   ├── expense.ts
│   └── debt.ts
├── rules/
│   ├── financial.ts      # Business rules
│   └── constraints.ts    # Domain constraints
└── __tests__/
    └── schemas.test.ts
```

**Public API:**
```typescript
export const ProfileSchema = z.object({ /* ... */ });
export const GoalSchema = z.object({ /* ... */ });
export function validateAllocation(allocation: Allocation): ValidationResult;
```

---

## Infrastructure Layer

### Database

**Purpose:** Data persistence with Prisma

**Structure:**
```
lib/db/
├── client.ts             # Prisma client
├── migrations/           # Database migrations
├── seed.ts              # Seed data
└── utils/
    ├── transactions.ts   # Transaction helpers
    └── queries.ts        # Common queries
```

**Public API:**
```typescript
export { db } from './client';
export { withTransaction } from './utils/transactions';
```

---

### External Services

**Purpose:** Third-party integrations

**Structure:**
```
lib/services/
├── clerk/
│   ├── client.ts
│   └── webhooks.ts
├── openai/
│   ├── client.ts
│   └── streaming.ts
├── cache/
│   ├── redis.ts
│   └── memory.ts
└── analytics/
    └── posthog.ts
```

**Public API:**
```typescript
export { clerkClient } from './clerk/client';
export { openai } from './openai/client';
export { cache } from './cache/redis';
```

---

## Module Communication

### Event-Driven Communication

**Event Bus (Simple Implementation):**
```typescript
// lib/events/bus.ts
type EventHandler<T> = (payload: T) => void | Promise<void>;

class EventBus {
  private handlers = new Map<string, EventHandler<any>[]>();
  
  on<T>(event: string, handler: EventHandler<T>): void {
    const handlers = this.handlers.get(event) || [];
    handlers.push(handler);
    this.handlers.set(event, handlers);
  }
  
  async emit<T>(event: string, payload: T): Promise<void> {
    const handlers = this.handlers.get(event) || [];
    await Promise.all(handlers.map(h => h(payload)));
  }
}

export const eventBus = new EventBus();
```

**Event Definitions:**
```typescript
// lib/events/types.ts
export interface DomainEvent {
  type: string;
  timestamp: Date;
  userId: string;
  payload: any;
}

export type GoalCreatedEvent = DomainEvent & {
  type: 'goal.created';
  payload: {
    goalId: string;
    goalType: string;
    targetAmount: number;
  };
};

export type AllocationCalculatedEvent = DomainEvent & {
  type: 'allocation.calculated';
  payload: {
    allocationId: string;
    month: number;
    year: number;
  };
};
```

**Event Emission:**
```typescript
// features/goals/actions/create-goal.ts
import { eventBus } from '@/lib/events/bus';

export async function createGoal(input: GoalInput) {
  const goal = await db.goal.create({ data: input });
  
  // Emit event
  await eventBus.emit('goal.created', {
    type: 'goal.created',
    timestamp: new Date(),
    userId: goal.userId,
    payload: {
      goalId: goal.id,
      goalType: goal.type,
      targetAmount: goal.targetAmount
    }
  });
  
  return goal;
}
```

**Event Subscription:**
```typescript
// features/allocation/listeners/goal-created.ts
import { eventBus } from '@/lib/events/bus';
import { calculateAllocation } from '../actions/calculate-allocation';

eventBus.on('goal.created', async (event) => {
  // Recalculate allocation when goal is created
  await calculateAllocation(event.userId);
});

// Register in app initialization
// app/layout.tsx or similar
import '@/features/allocation/listeners/goal-created';
```

### Direct Function Calls (Preferred for Reads)

**For read operations, direct imports are simpler:**
```typescript
// features/chat/actions/send-message.ts
import { getGoals } from '@/features/goals/actions';
import { getAllocation } from '@/features/allocation/actions';

export async function sendMessage(conversationId: string, message: string) {
  // Get context for AI
  const goals = await getGoals(userId);
  const allocation = await getAllocation(userId, month, year);
  
  // Process message with context
  const response = await generateResponse(message, { goals, allocation });
  
  return response;
}
```

### Communication Rules

**1. Use Events for:**
- Write operations that trigger side effects
- Decoupling modules
- Async processing
- Audit trails

**2. Use Direct Calls for:**
- Read operations
- Synchronous queries
- Simple data fetching

**3. Never:**
- Circular dependencies between modules
- Direct database access from other modules' tables
- Bypassing public APIs

---

## Module Ownership

### Ownership Model

**Each module has:**
1. **Owner** - Team/person responsible
2. **Public API** - Exported functions/components
3. **Private Implementation** - Internal details
4. **Data Ownership** - Database tables owned

**Example:**
```markdown
# Goals Module

## Owner
Team: Core Features
Lead: @alice

## Public API
- `createGoal(input: GoalInput): Promise<Goal>`
- `updateGoal(id: string, updates: GoalUpdate): Promise<Goal>`
- `deleteGoal(id: string): Promise<void>`
- `getGoals(userId: string): Promise<Goal[]>`

## Private Implementation
- Feasibility calculation logic
- Goal validation rules
- Database queries

## Data Ownership
- `Goal` table
- `GoalMilestone` table

## Dependencies
- Domain: Financial engine
- Infrastructure: Database

## Dependents
- Dashboard (displays goals)
- Chat (references goals)
- Allocation (uses goal data)
```

### Change Management

**Breaking Changes:**
1. Discuss with dependent modules
2. Create migration plan
3. Update all dependents
4. Deploy atomically (monolith advantage!)

**Non-Breaking Changes:**
- Add new functions freely
- Extend types (additive only)
- Improve internal implementation

---

## Dependency Graph

### Module Dependencies

```
┌─────────────────────────────────────────────────────────────┐
│                      Presentation Layer                      │
│                                                              │
│  Dashboard ──┬──→ Goals                                     │
│              ├──→ Allocation                                │
│              ├──→ Expenses                                  │
│              └──→ Debts                                     │
│                                                              │
│  Chat ───────┬──→ Goals (read)                              │
│              ├──→ Allocation (read)                         │
│              └──→ Simulation (trigger)                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│                                                              │
│  Onboarding ─────→ Domain/Validation                        │
│                                                              │
│  Goals ──────────→ Domain/Financial/Goals                   │
│                                                              │
│  Allocation ─────→ Domain/Financial/Allocation              │
│                                                              │
│  Chat ───────────→ Domain/AI                                │
│              └───→ Domain/Financial/* (all)                 │
│                                                              │
│  Simulation ─────→ Domain/Financial/Simulation              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                       Domain Layer                           │
│                                                              │
│  Financial ──────→ (no dependencies)                        │
│  AI ─────────────→ Infrastructure/OpenAI                    │
│  Validation ─────→ (no dependencies)                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Infrastructure Layer                       │
│                                                              │
│  Database, Clerk, OpenAI, Cache, Analytics                  │
│  (no dependencies on upper layers)                          │
└─────────────────────────────────────────────────────────────┘
```

### Allowed Dependencies

```typescript
// ✅ Allowed
import { calculateAllocation } from '@/domain/financial/allocation';
import { db } from '@/lib/db';
import { GoalSchema } from '@/domain/validation/schemas';

// ✅ Allowed (Application → Domain)
import { calculateEMI } from '@/domain/financial/loans';

// ✅ Allowed (Module → Module public API)
import { getGoals } from '@/features/goals/actions';

// ❌ Not allowed (Domain → Application)
// domain/financial/allocation.ts
import { saveAllocation } from '@/features/allocation/actions'; // NO!

// ❌ Not allowed (Module → Module internals)
import { validateGoalInput } from '@/features/goals/lib/validation'; // NO!
// Use public API instead:
import { createGoal } from '@/features/goals/actions';

// ❌ Not allowed (Infrastructure → Domain)
// lib/db/client.ts
import { calculateAllocation } from '@/domain/financial/allocation'; // NO!
```

---

## Testing Strategy

### Module Testing Levels

**1. Unit Tests (Domain Layer)**
```typescript
// domain/financial/__tests__/allocation.test.ts
import { calculateAllocation } from '../allocation';

describe('calculateAllocation', () => {
  it('should allocate income correctly', () => {
    const result = calculateAllocation({
      monthlyIncome: 80000,
      expenses: 40000,
      debts: [],
      goals: [],
      emergencyFundTarget: 210000,
      currentEmergencyFund: 150000
    });
    
    expect(result.essentialExpenses).toBe(40000);
    expect(result.emergencyFund).toBe(8000); // 20% of surplus
  });
});
```

**2. Integration Tests (Application Layer)**
```typescript
// features/goals/__tests__/create-goal.integration.test.ts
import { createGoal } from '../actions/create-goal';
import { db } from '@/lib/db';

describe('createGoal', () => {
  it('should create goal and trigger allocation recalculation', async () => {
    const goal = await createGoal({
      name: 'House',
      targetAmount: 500000,
      targetDate: '2026-12-31',
      priority: 'HIGH'
    });
    
    expect(goal.id).toBeDefined();
    expect(goal.isFeasible).toBeDefined();
    
    // Verify allocation was recalculated
    const allocation = await db.allocation.findFirst({
      where: { userId: goal.userId }
    });
    expect(allocation).toBeDefined();
  });
});
```

**3. E2E Tests (Full User Journeys)**
```typescript
// tests/e2e/goal-creation.spec.ts
import { test, expect } from '@playwright/test';

test('user can create a goal', async ({ page }) => {
  await page.goto('/goals');
  await page.click('text=Create Goal');
  await page.fill('[name="name"]', 'House Down Payment');
  await page.fill('[name="targetAmount"]', '500000');
  await page.click('text=Create');
  
  await expect(page.locator('text=House Down Payment')).toBeVisible();
});
```

### Test Coverage Requirements

**Domain Layer:** 100% (deterministic, critical)
**Application Layer:** 80% (business logic)
**Presentation Layer:** 60% (UI components)

---

## Module Extraction Guide

### Preparing for Future Microservices

**Design Principles:**
1. **Clear Boundaries** - Well-defined public APIs
2. **Data Ownership** - Each module owns its data
3. **Event-Driven** - Async communication via events
4. **Stateless** - No shared state between modules

### Extraction Checklist

**When extracting a module to microservice:**

1. **Identify Boundary**
   - [ ] Module has clear public API
   - [ ] Module owns specific database tables
   - [ ] Module has minimal dependencies

2. **Data Migration**
   - [ ] Extract module's tables to separate database
   - [ ] Set up database replication (if needed)
   - [ ] Create data migration scripts

3. **API Gateway**
   - [ ] Convert function calls to HTTP/gRPC
   - [ ] Add authentication/authorization
   - [ ] Implement rate limiting

4. **Event Bus**
   - [ ] Replace in-memory events with message queue
   - [ ] Use RabbitMQ/Kafka/SQS
   - [ ] Implement retry logic

5. **Deployment**
   - [ ] Containerize service (Docker)
   - [ ] Set up CI/CD pipeline
   - [ ] Configure monitoring/logging

6. **Rollback Plan**
   - [ ] Keep monolith code for 1 month
   - [ ] Feature flag for service toggle
   - [ ] Database rollback scripts

### Example: Extracting Chat Module

**Before (Monolith):**
```typescript
// features/chat/actions/send-message.ts
import { getGoals } from '@/features/goals/actions';

export async function sendMessage(message: string) {
  const goals = await getGoals(userId); // Direct function call
  // Process message
}
```

**After (Microservice):**
```typescript
// chat-service/src/handlers/send-message.ts
export async function sendMessage(message: string) {
  // HTTP call to goals service
  const goals = await fetch('http://goals-service/api/goals', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  // Process message
}
```

**Migration Steps:**
1. Add HTTP endpoints to goals module
2. Update chat to use HTTP (behind feature flag)
3. Test thoroughly
4. Extract chat to separate service
5. Remove old code after 1 month

---

## Best Practices

### 1. Module README

**Every module must have:**
```markdown
# Module Name

## Purpose
What this module does

## Public API
- Function signatures
- Component exports

## Dependencies
- What it depends on

## Dependents
- What depends on it

## Events
- Emits: Events this module emits
- Listens: Events this module listens to

## Owner
Team/person responsible
```

### 2. Explicit Public API

**Use index.ts to define public API:**
```typescript
// features/goals/index.ts
export { createGoal } from './actions/create-goal';
export { updateGoal } from './actions/update-goal';
export { deleteGoal } from './actions/delete-goal';
export type { Goal, GoalInput } from './types';

// Do NOT export internal utilities
// Internal: ./lib/validation.ts (not exported)
```

### 3. Avoid Circular Dependencies

**Bad:**
```typescript
// features/goals/actions.ts
import { calculateAllocation } from '@/features/allocation/actions';

// features/allocation/actions.ts
import { getGoals } from '@/features/goals/actions';
// CIRCULAR DEPENDENCY!
```

**Good:**
```typescript
// Both depend on domain layer
// features/goals/actions.ts
import { calculateGoalFeasibility } from '@/domain/financial/goals';

// features/allocation/actions.ts
import { calculateAllocation } from '@/domain/financial/allocation';
// No circular dependency
```

### 4. Use Dependency Injection

**For testability:**
```typescript
// features/goals/actions/create-goal.ts
export async function createGoal(
  input: GoalInput,
  deps = {
    db: db,
    eventBus: eventBus,
    calculateFeasibility: calculateGoalFeasibility
  }
) {
  const goal = await deps.db.goal.create({ data: input });
  const feasibility = deps.calculateFeasibility(goal);
  await deps.eventBus.emit('goal.created', goal);
  return goal;
}

// Easy to test with mocks
const mockDb = { goal: { create: vi.fn() } };
await createGoal(input, { db: mockDb, ... });
```

### 5. Document Breaking Changes

**Use ADRs (Architecture Decision Records):**
```markdown
# ADR-015: Change Goal API to Include Milestones

## Status
Proposed

## Context
Goals need milestone tracking for better progress visualization.

## Decision
Add `milestones` array to Goal type.

## Breaking Changes
- `Goal` type now includes `milestones?: Milestone[]`
- Existing code must handle undefined milestones

## Migration
1. Update all Goal usages to handle milestones
2. Add database migration for milestones table
3. Update API contracts

## Affected Modules
- Goals (owner)
- Dashboard (consumer)
- Chat (consumer)
```

---

## Conclusion

### Summary

**Modular Monolith Benefits:**
1. ✅ Clear boundaries (like microservices)
2. ✅ Simple deployment (like monolith)
3. ✅ ACID transactions (like monolith)
4. ✅ Easy refactoring (like monolith)
5. ✅ Future extraction path (to microservices)

**Key Principles:**
- **Feature-based modules** with clear ownership
- **Layered architecture** with strict dependencies
- **Event-driven communication** for decoupling
- **Domain-driven design** for business logic
- **Testability** at all layers

**Migration Path:**
- Start: Modular monolith (now)
- Grow: Add tooling (Turborepo) when needed
- Scale: Extract services when business requires

### Decision

**Use modular monolith architecture** for Sage's startup stage.

**Rationale:**
- Optimizes for development speed
- Maintains deployment simplicity
- Enables future microservices extraction
- Enforces good architectural practices

**Review Criteria:**
- Team size > 20 developers
- Clear service boundaries emerge
- Independent scaling requirements
- Different technology needs

---

**Document Version:** 1.0  
**Last Updated:** 2024-12-19  
**Next Review:** After 6 months of development  
**Owner:** Technical Architecture Team
