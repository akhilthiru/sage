# Event Flow

**Package**: `@sage/application`  
**Version**: 1.0.0  
**Last Updated**: 2024

---

## Table of Contents

1. [Overview](#overview)
2. [Event Principles](#event-principles)
3. [Domain Events](#domain-events)
4. [Event Publishers](#event-publishers)
5. [Event Consumers](#event-consumers)
6. [Event Flow Patterns](#event-flow-patterns)
7. [Implementation](#implementation)

---

## Overview

Events enable **loose coupling** between modules. Instead of direct dependencies, modules communicate via domain events.

**Key Principle**: **Publish-Subscribe Pattern**

- **Publishers**: Emit events when important actions occur
- **Subscribers**: React to events from other modules
- **Event Bus**: Routes events from publishers to subscribers

**Implementation**: Simple in-process event bus (no Kafka, RabbitMQ, or distributed messaging for MVP).

---

## Event Principles

### 1. **Events Represent Past Actions**

Events are named in past tense:

```typescript
// ✅ Good: Past tense
GoalCreatedEvent
ExpenseRecordedEvent
IncomeUpdatedEvent

// ❌ Bad: Present/future tense
CreateGoalEvent
RecordExpenseEvent
UpdateIncomeEvent
```

### 2. **Events Are Immutable**

Once published, events cannot be changed:

```typescript
interface GoalCreatedEvent {
  readonly eventId: string;
  readonly timestamp: Date;
  readonly goalId: string;
  readonly userId: string;
  readonly targetAmount: number;
}
```

### 3. **Events Contain Minimal Data**

Include only essential information:

```typescript
// ✅ Good: Minimal data
interface GoalCreatedEvent {
  eventId: string;
  timestamp: Date;
  goalId: string;
  userId: string;
}

// ❌ Bad: Too much data
interface GoalCreatedEvent {
  eventId: string;
  timestamp: Date;
  goal: Goal; // Entire entity
  user: User; // Entire entity
  allocation: Allocation; // Entire entity
}
```

Subscribers fetch additional data if needed:

```typescript
async onGoalCreated(event: GoalCreatedEvent): Promise<void> {
  // Fetch full goal if needed
  const goal = await this.goalRepository.findById(event.goalId);
  // Process...
}
```

### 4. **Events Are Asynchronous**

Publishing events doesn't block the publisher:

```typescript
// Publish event (non-blocking)
await this.eventPublisher.publish(new GoalCreatedEvent({ goalId, userId }));

// Continue execution
return response;
```

### 5. **Events Are Eventually Consistent**

Subscribers process events asynchronously:

```typescript
// Publisher commits transaction
await transactionManager.execute(async (tx) => {
  const goal = await goalRepository.create(data, tx);
});

// Publish event (after commit)
await eventPublisher.publish(new GoalCreatedEvent({ goalId }));

// Subscribers process later (eventually consistent)
```

### 6. **No Distributed Messaging (MVP)**

Keep it simple:

- ✅ In-process event bus
- ✅ Synchronous handlers (await)
- ❌ No Kafka
- ❌ No RabbitMQ
- ❌ No message queues

**Future**: Can migrate to distributed messaging if needed.

---

## Domain Events

### Goal Events

#### GoalCreatedEvent

**Published By**: GoalService

**When**: After goal is created and transaction commits

**Payload**:
```typescript
interface GoalCreatedEvent {
  readonly eventId: string;
  readonly timestamp: Date;
  readonly goalId: string;
  readonly userId: string;
  readonly targetAmount: number;
  readonly targetDate: Date;
  readonly priority: 'HIGH' | 'MEDIUM' | 'LOW';
}
```

**Subscribers**:
- AllocationService: Recalculate allocation (already done in transaction)
- DashboardService: Invalidate cache
- ChatService: Update conversation context

---

#### GoalUpdatedEvent

**Published By**: GoalService

**When**: After goal is updated and transaction commits

**Payload**:
```typescript
interface GoalUpdatedEvent {
  readonly eventId: string;
  readonly timestamp: Date;
  readonly goalId: string;
  readonly userId: string;
  readonly updatedFields: string[];
}
```

**Subscribers**:
- AllocationService: Recalculate allocation (already done in transaction)
- DashboardService: Invalidate cache

---

#### GoalCompletedEvent

**Published By**: GoalService

**When**: After goal is marked as completed

**Payload**:
```typescript
interface GoalCompletedEvent {
  readonly eventId: string;
  readonly timestamp: Date;
  readonly goalId: string;
  readonly userId: string;
  readonly completedAmount: number;
  readonly completedAt: Date;
}
```

**Subscribers**:
- AllocationService: Recalculate allocation
- DashboardService: Invalidate cache
- ChatService: Generate congratulations message

---

#### GoalDeletedEvent

**Published By**: GoalService

**When**: After goal is soft deleted

**Payload**:
```typescript
interface GoalDeletedEvent {
  readonly eventId: string;
  readonly timestamp: Date;
  readonly goalId: string;
  readonly userId: string;
  readonly deletedAt: Date;
}
```

**Subscribers**:
- AllocationService: Recalculate allocation (already done in transaction)
- DashboardService: Invalidate cache

---

### Expense Events

#### ExpenseRecordedEvent

**Published By**: ExpenseService

**When**: After expense is recorded

**Payload**:
```typescript
interface ExpenseRecordedEvent {
  readonly eventId: string;
  readonly timestamp: Date;
  readonly expenseId: string;
  readonly userId: string;
  readonly amount: number;
  readonly category: string;
  readonly isRecurring: boolean;
}
```

**Subscribers**:
- AllocationService: Recalculate allocation (already done in transaction)
- DashboardService: Invalidate cache

---

#### ExpenseUpdatedEvent

**Published By**: ExpenseService

**When**: After expense is updated

**Payload**:
```typescript
interface ExpenseUpdatedEvent {
  readonly eventId: string;
  readonly timestamp: Date;
  readonly expenseId: string;
  readonly userId: string;
  readonly updatedFields: string[];
}
```

**Subscribers**:
- AllocationService: Recalculate allocation (already done in transaction)
- DashboardService: Invalidate cache

---

#### ExpenseDeletedEvent

**Published By**: ExpenseService

**When**: After expense is soft deleted

**Payload**:
```typescript
interface ExpenseDeletedEvent {
  readonly eventId: string;
  readonly timestamp: Date;
  readonly expenseId: string;
  readonly userId: string;
  readonly deletedAt: Date;
}
```

**Subscribers**:
- AllocationService: Recalculate allocation (already done in transaction)
- DashboardService: Invalidate cache

---

### Debt Events

#### DebtRecordedEvent

**Published By**: DebtService

**When**: After debt is recorded

**Payload**:
```typescript
interface DebtRecordedEvent {
  readonly eventId: string;
  readonly timestamp: Date;
  readonly debtId: string;
  readonly userId: string;
  readonly principal: number;
  readonly monthlyPayment: number;
}
```

**Subscribers**:
- AllocationService: Recalculate allocation (already done in transaction)
- DashboardService: Invalidate cache

---

#### DebtPaymentRecordedEvent

**Published By**: DebtService

**When**: After debt payment is recorded

**Payload**:
```typescript
interface DebtPaymentRecordedEvent {
  readonly eventId: string;
  readonly timestamp: Date;
  readonly paymentId: string;
  readonly debtId: string;
  readonly userId: string;
  readonly amount: number;
  readonly newBalance: number;
}
```

**Subscribers**:
- AllocationService: Recalculate allocation (already done in transaction)
- DashboardService: Invalidate cache

---

#### DebtPaidOffEvent

**Published By**: DebtService

**When**: After debt is fully paid off

**Payload**:
```typescript
interface DebtPaidOffEvent {
  readonly eventId: string;
  readonly timestamp: Date;
  readonly debtId: string;
  readonly userId: string;
  readonly paidOffAt: Date;
}
```

**Subscribers**:
- AllocationService: Recalculate allocation (already done in transaction)
- DashboardService: Invalidate cache
- ChatService: Generate congratulations message

---

### Income Events

#### IncomeUpdatedEvent

**Published By**: OnboardingService / ProfileService

**When**: After monthly income is updated

**Payload**:
```typescript
interface IncomeUpdatedEvent {
  readonly eventId: string;
  readonly timestamp: Date;
  readonly userId: string;
  readonly oldIncome: number;
  readonly newIncome: number;
}
```

**Subscribers**:
- AllocationService: Recalculate allocation (already done in transaction)
- GoalService: Recalculate goal feasibility
- DashboardService: Invalidate cache

---

### Allocation Events

#### AllocationGeneratedEvent

**Published By**: AllocationService

**When**: After allocation is calculated and saved

**Payload**:
```typescript
interface AllocationGeneratedEvent {
  readonly eventId: string;
  readonly timestamp: Date;
  readonly allocationId: string;
  readonly userId: string;
  readonly needs: number;
  readonly wants: number;
  readonly savings: number;
}
```

**Subscribers**:
- DashboardService: Invalidate cache
- ChatService: Update conversation context

---

### Simulation Events

#### SimulationCompletedEvent

**Published By**: SimulationService

**When**: After simulation is completed

**Payload**:
```typescript
interface SimulationCompletedEvent {
  readonly eventId: string;
  readonly timestamp: Date;
  readonly simulationId: string;
  readonly userId: string;
  readonly type: 'PURCHASE' | 'LOAN' | 'GOAL_TIMELINE' | 'INCOME_CHANGE';
}
```

**Subscribers**:
- ChatService: Link simulation to conversation
- DashboardService: Show recent simulations

---

### Chat Events

#### MessageSentEvent

**Published By**: ChatService

**When**: After user message is saved

**Payload**:
```typescript
interface MessageSentEvent {
  readonly eventId: string;
  readonly timestamp: Date;
  readonly messageId: string;
  readonly conversationId: string;
  readonly userId: string;
}
```

**Subscribers**:
- None (informational only)

---

#### MessageReceivedEvent

**Published By**: ChatService

**When**: After AI message is saved

**Payload**:
```typescript
interface MessageReceivedEvent {
  readonly eventId: string;
  readonly timestamp: Date;
  readonly messageId: string;
  readonly conversationId: string;
  readonly userId: string;
}
```

**Subscribers**:
- None (informational only)

---

### Onboarding Events

#### UserOnboardingCompletedEvent

**Published By**: OnboardingService

**When**: After user completes onboarding

**Payload**:
```typescript
interface UserOnboardingCompletedEvent {
  readonly eventId: string;
  readonly timestamp: Date;
  readonly userId: string;
  readonly profileId: string;
}
```

**Subscribers**:
- AllocationService: Generate initial allocation (already done in transaction)
- DashboardService: Initialize dashboard cache

---

## Event Publishers

### GoalService

**Publishes**:
- `GoalCreatedEvent`
- `GoalUpdatedEvent`
- `GoalCompletedEvent`
- `GoalDeletedEvent`

**Example**:
```typescript
export class GoalService {
  constructor(
    private goalRepository: IGoalRepository,
    private eventPublisher: IEventPublisher
  ) {}

  async createGoal(request: CreateGoalRequest): Promise<CreateGoalResponse> {
    // Create goal in transaction
    const goal = await this.transactionManager.execute(async (tx) => {
      return await this.goalRepository.create(data, tx);
    });

    // Publish event (after transaction commits)
    await this.eventPublisher.publish(
      new GoalCreatedEvent({
        eventId: generateId(),
        timestamp: new Date(),
        goalId: goal.id,
        userId: goal.userId,
        targetAmount: goal.targetAmount,
        targetDate: goal.targetDate,
        priority: goal.priority,
      })
    );

    return this.mapToResponse(goal);
  }
}
```

---

### ExpenseService

**Publishes**:
- `ExpenseRecordedEvent`
- `ExpenseUpdatedEvent`
- `ExpenseDeletedEvent`

---

### DebtService

**Publishes**:
- `DebtRecordedEvent`
- `DebtPaymentRecordedEvent`
- `DebtPaidOffEvent`

---

### OnboardingService

**Publishes**:
- `UserOnboardingCompletedEvent`
- `IncomeUpdatedEvent`

---

### AllocationService

**Publishes**:
- `AllocationGeneratedEvent`

---

### SimulationService

**Publishes**:
- `SimulationCompletedEvent`

---

### ChatService

**Publishes**:
- `MessageSentEvent`
- `MessageReceivedEvent`

---

## Event Consumers

### AllocationService

**Subscribes To**:
- `GoalCreatedEvent` → Recalculate allocation (if not done in transaction)
- `GoalUpdatedEvent` → Recalculate allocation (if not done in transaction)
- `GoalDeletedEvent` → Recalculate allocation (if not done in transaction)
- `ExpenseRecordedEvent` → Recalculate allocation (if not done in transaction)
- `ExpenseUpdatedEvent` → Recalculate allocation (if not done in transaction)
- `ExpenseDeletedEvent` → Recalculate allocation (if not done in transaction)
- `DebtRecordedEvent` → Recalculate allocation (if not done in transaction)
- `DebtPaymentRecordedEvent` → Recalculate allocation (if not done in transaction)
- `IncomeUpdatedEvent` → Recalculate allocation (if not done in transaction)

**Note**: For MVP, allocation is recalculated within the same transaction. Events are published for future extensibility and cache invalidation.

---

### DashboardService

**Subscribes To**:
- `GoalCreatedEvent` → Invalidate cache
- `GoalUpdatedEvent` → Invalidate cache
- `GoalCompletedEvent` → Invalidate cache
- `GoalDeletedEvent` → Invalidate cache
- `ExpenseRecordedEvent` → Invalidate cache
- `ExpenseUpdatedEvent` → Invalidate cache
- `ExpenseDeletedEvent` → Invalidate cache
- `DebtRecordedEvent` → Invalidate cache
- `DebtPaymentRecordedEvent` → Invalidate cache
- `DebtPaidOffEvent` → Invalidate cache
- `IncomeUpdatedEvent` → Invalidate cache
- `AllocationGeneratedEvent` → Invalidate cache

**Example**:
```typescript
export class DashboardService {
  constructor(
    private cacheService: ICacheService,
    private eventSubscriber: IEventSubscriber
  ) {
    // Subscribe to events
    this.eventSubscriber.subscribe('GoalCreatedEvent', this.onGoalCreated.bind(this));
    this.eventSubscriber.subscribe('ExpenseRecordedEvent', this.onExpenseRecorded.bind(this));
    // ... other subscriptions
  }

  private async onGoalCreated(event: GoalCreatedEvent): Promise<void> {
    // Invalidate user's dashboard cache
    await this.cacheService.invalidate(`dashboard:${event.userId}`);
  }

  private async onExpenseRecorded(event: ExpenseRecordedEvent): Promise<void> {
    // Invalidate user's dashboard cache
    await this.cacheService.invalidate(`dashboard:${event.userId}`);
  }
}
```

---

### ChatService

**Subscribes To**:
- `GoalCreatedEvent` → Update conversation context
- `GoalCompletedEvent` → Generate congratulations message
- `DebtPaidOffEvent` → Generate congratulations message
- `AllocationGeneratedEvent` → Update conversation context
- `SimulationCompletedEvent` → Link simulation to conversation

**Example**:
```typescript
export class ChatService {
  constructor(
    private conversationRepository: IConversationRepository,
    private aiService: IAIService,
    private eventSubscriber: IEventSubscriber
  ) {
    this.eventSubscriber.subscribe('GoalCompletedEvent', this.onGoalCompleted.bind(this));
    this.eventSubscriber.subscribe('DebtPaidOffEvent', this.onDebtPaidOff.bind(this));
  }

  private async onGoalCompleted(event: GoalCompletedEvent): Promise<void> {
    // Find user's active conversations
    const conversations = await this.conversationRepository.findActiveByUserId(
      event.userId
    );

    if (conversations.length === 0) return;

    // Generate congratulations message
    const message = await this.aiService.generateCongratulations({
      type: 'GOAL_COMPLETED',
      goalId: event.goalId,
    });

    // Add to most recent conversation
    await this.conversationRepository.addMessage(
      conversations[0].id,
      {
        role: 'ASSISTANT',
        content: message,
      }
    );
  }

  private async onDebtPaidOff(event: DebtPaidOffEvent): Promise<void> {
    // Similar to goal completion
  }
}
```

---

## Event Flow Patterns

### Pattern 1: Write Operation with Event

```
User Action
    ↓
API Route / Server Action
    ↓
Application Service
    ↓
BEGIN TRANSACTION
  - Create/Update Entity (Repository)
  - Update Related Entities (Repository)
COMMIT
    ↓
Publish Event
    ↓
Event Bus
    ↓
Subscribers (async)
  - Invalidate Cache
  - Update Related Data
  - Send Notifications
```

**Example**: Create Goal

```
1. User submits goal form
2. createGoalAction (Server Action)
3. GoalService.createGoal()
4. BEGIN TRANSACTION
   - goalRepository.create()
   - allocationRepository.create()
5. COMMIT
6. Publish GoalCreatedEvent
7. Event Bus routes to subscribers:
   - DashboardService.onGoalCreated() → Invalidate cache
   - ChatService.onGoalCreated() → Update context
```

---

### Pattern 2: Read Operation (No Events)

```
User Request
    ↓
API Route / Server Action
    ↓
Application Service
    ↓
Repository (Read)
    ↓
Map to DTO
    ↓
Return Response
```

**Example**: Get Dashboard

```
1. User visits dashboard
2. getDashboardAction (Server Action)
3. DashboardService.getDashboard()
4. Fetch from repositories
5. Map to DashboardDTO
6. Return response
(No events published)
```

---

### Pattern 3: Event Chain

```
Event A
    ↓
Subscriber 1 processes Event A
    ↓
Subscriber 1 publishes Event B
    ↓
Subscriber 2 processes Event B
```

**Example**: Income Update Chain

```
1. IncomeUpdatedEvent published
2. AllocationService.onIncomeUpdated()
   - Recalculates allocation
   - Publishes AllocationGeneratedEvent
3. DashboardService.onAllocationGenerated()
   - Invalidates cache
4. ChatService.onAllocationGenerated()
   - Updates conversation context
```

---

## Implementation

### Event Base Class

```typescript
// packages/application/src/events/DomainEvent.ts
export abstract class DomainEvent {
  readonly eventId: string;
  readonly timestamp: Date;
  readonly eventType: string;

  constructor(eventType: string) {
    this.eventId = generateId();
    this.timestamp = new Date();
    this.eventType = eventType;
  }
}
```

---

### Concrete Event

```typescript
// packages/application/src/events/GoalEvents.ts
export class GoalCreatedEvent extends DomainEvent {
  readonly goalId: string;
  readonly userId: string;
  readonly targetAmount: number;
  readonly targetDate: Date;
  readonly priority: 'HIGH' | 'MEDIUM' | 'LOW';

  constructor(data: {
    goalId: string;
    userId: string;
    targetAmount: number;
    targetDate: Date;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
  }) {
    super('GoalCreatedEvent');
    this.goalId = data.goalId;
    this.userId = data.userId;
    this.targetAmount = data.targetAmount;
    this.targetDate = data.targetDate;
    this.priority = data.priority;
  }
}
```

---

### Event Publisher Interface

```typescript
// packages/application/src/interfaces/events/IEventPublisher.ts
export interface IEventPublisher {
  publish(event: DomainEvent): Promise<void>;
}
```

---

### Event Subscriber Interface

```typescript
// packages/application/src/interfaces/events/IEventSubscriber.ts
export interface IEventSubscriber {
  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: (event: T) => Promise<void>
  ): void;
}
```

---

### In-Process Event Bus

```typescript
// packages/application/src/infrastructure/InProcessEventBus.ts
export class InProcessEventBus implements IEventPublisher, IEventSubscriber {
  private handlers: Map<string, Array<(event: DomainEvent) => Promise<void>>> = new Map();

  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: (event: T) => Promise<void>
  ): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler as (event: DomainEvent) => Promise<void>);
  }

  async publish(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.eventType) || [];

    // Execute all handlers (in parallel for MVP, can be sequential if needed)
    await Promise.all(
      handlers.map(async (handler) => {
        try {
          await handler(event);
        } catch (error) {
          // Log error but don't fail the publish
          console.error(`Error handling event ${event.eventType}:`, error);
        }
      })
    );
  }
}
```

---

### Service with Event Publishing

```typescript
// packages/application/src/services/goals/GoalService.ts
export class GoalService {
  constructor(
    private goalRepository: IGoalRepository,
    private allocationRepository: IAllocationRepository,
    private financialEngine: IFinancialEngine,
    private eventPublisher: IEventPublisher,
    private transactionManager: ITransactionManager
  ) {}

  async createGoal(request: CreateGoalRequest): Promise<CreateGoalResponse> {
    // Validation, fetch data, calculate...

    // Persist in transaction
    const result = await this.transactionManager.execute(async (tx) => {
      const goal = await this.goalRepository.create(goalData, tx);
      const allocation = await this.allocationRepository.create(allocationData, tx);
      return { goal, allocation };
    });

    // Publish event (after transaction commits)
    await this.eventPublisher.publish(
      new GoalCreatedEvent({
        goalId: result.goal.id,
        userId: result.goal.userId,
        targetAmount: result.goal.targetAmount,
        targetDate: result.goal.targetDate,
        priority: result.goal.priority,
      })
    );

    return this.mapToResponse(result);
  }
}
```

---

### Service with Event Subscription

```typescript
// packages/application/src/services/dashboard/DashboardService.ts
export class DashboardService {
  constructor(
    private cacheService: ICacheService,
    private eventSubscriber: IEventSubscriber
  ) {
    // Register event handlers
    this.registerEventHandlers();
  }

  private registerEventHandlers(): void {
    this.eventSubscriber.subscribe('GoalCreatedEvent', this.onGoalCreated.bind(this));
    this.eventSubscriber.subscribe('GoalUpdatedEvent', this.onGoalUpdated.bind(this));
    this.eventSubscriber.subscribe('GoalDeletedEvent', this.onGoalDeleted.bind(this));
    this.eventSubscriber.subscribe('ExpenseRecordedEvent', this.onExpenseRecorded.bind(this));
    this.eventSubscriber.subscribe('AllocationGeneratedEvent', this.onAllocationGenerated.bind(this));
  }

  private async onGoalCreated(event: GoalCreatedEvent): Promise<void> {
    await this.invalidateUserCache(event.userId);
  }

  private async onGoalUpdated(event: GoalUpdatedEvent): Promise<void> {
    await this.invalidateUserCache(event.userId);
  }

  private async onGoalDeleted(event: GoalDeletedEvent): Promise<void> {
    await this.invalidateUserCache(event.userId);
  }

  private async onExpenseRecorded(event: ExpenseRecordedEvent): Promise<void> {
    await this.invalidateUserCache(event.userId);
  }

  private async onAllocationGenerated(event: AllocationGeneratedEvent): Promise<void> {
    await this.invalidateUserCache(event.userId);
  }

  private async invalidateUserCache(userId: string): Promise<void> {
    await this.cacheService.invalidate(`dashboard:${userId}`);
  }
}
```

---

## Summary

### Total Events: 15

**By Category**:
- Goal Events: 4
- Expense Events: 3
- Debt Events: 3
- Income Events: 1
- Allocation Events: 1
- Simulation Events: 1
- Chat Events: 2
- Onboarding Events: 1

### Event Publishers (7 Services)

1. GoalService
2. ExpenseService
3. DebtService
4. OnboardingService
5. AllocationService
6. SimulationService
7. ChatService

### Event Consumers (3 Services)

1. AllocationService (future extensibility)
2. DashboardService (cache invalidation)
3. ChatService (context updates, congratulations)

### Key Principles

1. **Events represent past actions** (past tense naming)
2. **Events are immutable**
3. **Events contain minimal data**
4. **Events are asynchronous**
5. **Eventually consistent**
6. **Simple in-process event bus** (no distributed messaging)
7. **Publish after transaction commits**
8. **Subscribers are independent** (failures don't affect publisher)

### Benefits

- ✅ **Loose coupling**: Modules don't depend on each other directly
- ✅ **Extensibility**: Add new subscribers without changing publishers
- ✅ **Auditability**: Events provide audit trail
- ✅ **Scalability**: Can migrate to distributed messaging later
- ✅ **Testability**: Easy to test event handlers in isolation

### Future Enhancements

- Event persistence (event store)
- Event replay
- Distributed messaging (Kafka, RabbitMQ)
- Event versioning
- Dead letter queue for failed events

---

**Next**: Define error handling strategy.
