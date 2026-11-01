# Transaction Orchestration

**Package**: `@sage/application`  
**Version**: 1.0.0  
**Last Updated**: 2024

---

## Table of Contents

1. [Overview](#overview)
2. [Transaction Principles](#transaction-principles)
3. [Workflows Requiring Transactions](#workflows-requiring-transactions)
4. [Transaction Patterns](#transaction-patterns)
5. [Rollback Strategy](#rollback-strategy)
6. [Retry Strategy](#retry-strategy)
7. [Error Handling](#error-handling)
8. [Performance Considerations](#performance-considerations)

---

## Overview

Transactions ensure **ACID guarantees** for multi-step operations:

- **Atomicity**: All operations succeed or all fail
- **Consistency**: Database remains in valid state
- **Isolation**: Concurrent transactions don't interfere
- **Durability**: Committed changes persist

**Responsibility**: Application Layer orchestrates transactions, Repository Layer executes them.

---

## Transaction Principles

### 1. **Application Layer Defines Boundaries**

Application Layer decides which operations require transactions:

```typescript
// Application Layer
async createGoal(request: CreateGoalRequest): Promise<CreateGoalResponse> {
  // Define transaction boundary
  return await this.transactionManager.execute(async (tx) => {
    // Operations within transaction
    const goal = await this.goalRepository.create(data, tx);
    const allocation = await this.allocationRepository.create(allocationData, tx);
    return { goal, allocation };
  });
}
```

### 2. **Repository Layer Executes Transactions**

Repository Layer provides transaction primitives:

```typescript
// Repository Layer
export interface ITransactionManager {
  execute<T>(callback: (tx: Transaction) => Promise<T>): Promise<T>;
}

// Prisma implementation
export class PrismaTransactionManager implements ITransactionManager {
  constructor(private prisma: PrismaClient) {}

  async execute<T>(callback: (tx: Transaction) => Promise<T>): Promise<T> {
    return await this.prisma.$transaction(async (tx) => {
      return await callback(tx);
    });
  }
}
```

### 3. **Keep Transactions Short**

Minimize transaction duration to avoid locks:

```typescript
// ❌ Bad: Long transaction with external calls
await transactionManager.execute(async (tx) => {
  const goal = await goalRepository.create(data, tx);
  
  // FORBIDDEN: External API call in transaction
  await aiService.generateAdvice(goal); // ❌
  
  await allocationRepository.create(allocationData, tx);
});

// ✅ Good: Short transaction, external calls outside
const result = await transactionManager.execute(async (tx) => {
  const goal = await goalRepository.create(data, tx);
  const allocation = await allocationRepository.create(allocationData, tx);
  return { goal, allocation };
});

// External calls after transaction
await aiService.generateAdvice(result.goal);
```

### 4. **No Nested Transactions**

Avoid nested transactions (Prisma doesn't support them):

```typescript
// ❌ Bad: Nested transactions
await transactionManager.execute(async (tx) => {
  await goalRepository.create(data, tx);
  
  // FORBIDDEN: Nested transaction
  await transactionManager.execute(async (tx2) => { // ❌
    await allocationRepository.create(data, tx2);
  });
});

// ✅ Good: Single transaction
await transactionManager.execute(async (tx) => {
  await goalRepository.create(data, tx);
  await allocationRepository.create(data, tx);
});
```

### 5. **Financial Engine Calls Outside Transactions**

Financial Engine is pure, call before or after transaction:

```typescript
// ✅ Correct pattern
async createGoal(request: CreateGoalRequest): Promise<CreateGoalResponse> {
  // 1. Fetch data (outside transaction)
  const profile = await this.financialProfileRepository.findByUserId(userId);
  const expenses = await this.expenseRepository.findByUserId(userId);
  const debts = await this.debtRepository.findActiveByUserId(userId);

  // 2. Calculate (outside transaction)
  const allocationResult = this.financialEngine.calculateAllocation({
    monthlyIncome: profile.monthlyIncome,
    expenses,
    goals: [...existingGoals, newGoalData],
    debts,
  });

  // 3. Persist (inside transaction)
  return await this.transactionManager.execute(async (tx) => {
    const goal = await this.goalRepository.create(goalData, tx);
    const allocation = await this.allocationRepository.create(
      { userId, ...allocationResult },
      tx
    );
    return { goal, allocation };
  });
}
```

---

## Workflows Requiring Transactions

### 1. **User Onboarding**

**Operations**:
1. Create FinancialProfile
2. Create initial Allocation

**Transaction Boundary**:
```typescript
async completeOnboarding(
  request: CompleteOnboardingRequest
): Promise<CompleteOnboardingResponse> {
  // Calculate allocation (outside transaction)
  const allocationResult = this.financialEngine.calculateAllocation({
    monthlyIncome: request.monthlyIncome,
    expenses: [],
    goals: [],
    debts: [],
  });

  // Persist (inside transaction)
  return await this.transactionManager.execute(async (tx) => {
    const profile = await this.financialProfileRepository.create(
      {
        userId: request.userId,
        monthlyIncome: request.monthlyIncome,
        currency: request.currency,
        riskTolerance: request.riskTolerance,
      },
      tx
    );

    const allocation = await this.allocationRepository.create(
      {
        userId: request.userId,
        monthlyIncome: request.monthlyIncome,
        ...allocationResult,
      },
      tx
    );

    return {
      userId: request.userId,
      profileId: profile.id,
      allocationId: allocation.id,
      allocation: this.mapAllocationToDTO(allocation),
    };
  });
}
```

**Rollback Scenario**:
- Profile created but allocation fails → Rollback profile creation

---

### 2. **Income Update**

**Operations**:
1. Update FinancialProfile.monthlyIncome
2. Create new Allocation

**Transaction Boundary**:
```typescript
async updateIncome(
  request: UpdateIncomeRequest
): Promise<UpdateIncomeResponse> {
  // Fetch data
  const profile = await this.financialProfileRepository.findByUserId(
    request.userId
  );
  const goals = await this.goalRepository.findActiveByUserId(request.userId);
  const expenses = await this.expenseRepository.findByUserId(request.userId);
  const debts = await this.debtRepository.findActiveByUserId(request.userId);

  // Calculate
  const allocationResult = this.financialEngine.calculateAllocation({
    monthlyIncome: request.monthlyIncome,
    expenses,
    goals,
    debts,
  });

  // Persist
  return await this.transactionManager.execute(async (tx) => {
    const updatedProfile = await this.financialProfileRepository.update(
      profile.id,
      { monthlyIncome: request.monthlyIncome },
      tx
    );

    const allocation = await this.allocationRepository.create(
      {
        userId: request.userId,
        monthlyIncome: request.monthlyIncome,
        ...allocationResult,
      },
      tx
    );

    return {
      profileId: updatedProfile.id,
      monthlyIncome: updatedProfile.monthlyIncome,
      allocation: this.mapAllocationToDTO(allocation),
    };
  });
}
```

**Rollback Scenario**:
- Profile updated but allocation fails → Rollback income update

---

### 3. **Goal Creation**

**Operations**:
1. Create Goal
2. Create new Allocation

**Transaction Boundary**:
```typescript
async createGoal(
  request: CreateGoalRequest
): Promise<CreateGoalResponse> {
  // Validation (outside transaction)
  this.validateInput(request);
  await this.validateAuthorization(request.userId);
  await this.validateBusinessRules(request);

  // Fetch data
  const profile = await this.financialProfileRepository.findByUserId(
    request.userId
  );
  const existingGoals = await this.goalRepository.findActiveByUserId(
    request.userId
  );
  const expenses = await this.expenseRepository.findByUserId(request.userId);
  const debts = await this.debtRepository.findActiveByUserId(request.userId);

  // Calculate
  const allocationResult = this.financialEngine.calculateAllocation({
    monthlyIncome: profile.monthlyIncome,
    expenses,
    goals: [...existingGoals, { targetAmount: request.targetAmount }],
    debts,
  });

  // Persist
  return await this.transactionManager.execute(async (tx) => {
    const goal = await this.goalRepository.create(
      {
        userId: request.userId,
        name: request.name,
        targetAmount: request.targetAmount,
        targetDate: request.targetDate,
        priority: request.priority,
        category: request.category,
      },
      tx
    );

    const allocation = await this.allocationRepository.create(
      {
        userId: request.userId,
        monthlyIncome: profile.monthlyIncome,
        ...allocationResult,
      },
      tx
    );

    // Publish event (after transaction commits)
    await this.eventPublisher.publish(
      new GoalCreatedEvent({
        goalId: goal.id,
        userId: goal.userId,
      })
    );

    return {
      goal: this.mapGoalToDTO(goal),
      allocation: this.mapAllocationToDTO(allocation),
    };
  });
}
```

**Rollback Scenario**:
- Goal created but allocation fails → Rollback goal creation

---

### 4. **Goal Update**

**Operations**:
1. Update Goal
2. Create new Allocation

**Transaction Boundary**:
```typescript
async updateGoal(
  request: UpdateGoalRequest
): Promise<UpdateGoalResponse> {
  // Validation
  await this.validateGoalOwnership(request.goalId, request.userId);

  // Fetch data
  const profile = await this.financialProfileRepository.findByUserId(
    request.userId
  );
  const goals = await this.goalRepository.findActiveByUserId(request.userId);
  const expenses = await this.expenseRepository.findByUserId(request.userId);
  const debts = await this.debtRepository.findActiveByUserId(request.userId);

  // Update goal data for calculation
  const updatedGoals = goals.map((g) =>
    g.id === request.goalId
      ? { ...g, ...request }
      : g
  );

  // Calculate
  const allocationResult = this.financialEngine.calculateAllocation({
    monthlyIncome: profile.monthlyIncome,
    expenses,
    goals: updatedGoals,
    debts,
  });

  // Persist
  return await this.transactionManager.execute(async (tx) => {
    const goal = await this.goalRepository.update(
      request.goalId,
      {
        name: request.name,
        targetAmount: request.targetAmount,
        targetDate: request.targetDate,
        priority: request.priority,
      },
      tx
    );

    const allocation = await this.allocationRepository.create(
      {
        userId: request.userId,
        monthlyIncome: profile.monthlyIncome,
        ...allocationResult,
      },
      tx
    );

    await this.eventPublisher.publish(
      new GoalUpdatedEvent({ goalId: goal.id, userId: goal.userId })
    );

    return {
      goal: this.mapGoalToDTO(goal),
      allocation: this.mapAllocationToDTO(allocation),
    };
  });
}
```

---

### 5. **Goal Deletion**

**Operations**:
1. Soft delete Goal (set deletedAt)
2. Create new Allocation

**Transaction Boundary**:
```typescript
async deleteGoal(
  request: DeleteGoalRequest
): Promise<DeleteGoalResponse> {
  // Validation
  await this.validateGoalOwnership(request.goalId, request.userId);

  // Fetch data
  const profile = await this.financialProfileRepository.findByUserId(
    request.userId
  );
  const goals = await this.goalRepository.findActiveByUserId(request.userId);
  const expenses = await this.expenseRepository.findByUserId(request.userId);
  const debts = await this.debtRepository.findActiveByUserId(request.userId);

  // Calculate without deleted goal
  const remainingGoals = goals.filter((g) => g.id !== request.goalId);
  const allocationResult = this.financialEngine.calculateAllocation({
    monthlyIncome: profile.monthlyIncome,
    expenses,
    goals: remainingGoals,
    debts,
  });

  // Persist
  return await this.transactionManager.execute(async (tx) => {
    await this.goalRepository.softDelete(request.goalId, tx);

    const allocation = await this.allocationRepository.create(
      {
        userId: request.userId,
        monthlyIncome: profile.monthlyIncome,
        ...allocationResult,
      },
      tx
    );

    await this.eventPublisher.publish(
      new GoalDeletedEvent({ goalId: request.goalId, userId: request.userId })
    );

    return {
      goalId: request.goalId,
      deletedAt: new Date(),
      allocation: this.mapAllocationToDTO(allocation),
    };
  });
}
```

---

### 6. **Expense Recording**

**Operations**:
1. Create Expense
2. Create new Allocation

**Transaction Boundary**:
```typescript
async recordExpense(
  request: RecordExpenseRequest
): Promise<RecordExpenseResponse> {
  // Validation
  this.validateInput(request);

  // Fetch data
  const profile = await this.financialProfileRepository.findByUserId(
    request.userId
  );
  const goals = await this.goalRepository.findActiveByUserId(request.userId);
  const expenses = await this.expenseRepository.findByUserId(request.userId);
  const debts = await this.debtRepository.findActiveByUserId(request.userId);

  // Calculate
  const allocationResult = this.financialEngine.calculateAllocation({
    monthlyIncome: profile.monthlyIncome,
    expenses: [...expenses, { amount: request.amount, isRecurring: request.isRecurring }],
    goals,
    debts,
  });

  // Persist
  return await this.transactionManager.execute(async (tx) => {
    const expense = await this.expenseRepository.create(
      {
        userId: request.userId,
        amount: request.amount,
        category: request.category,
        description: request.description,
        date: request.date,
        isRecurring: request.isRecurring,
        frequency: request.frequency,
      },
      tx
    );

    const allocation = await this.allocationRepository.create(
      {
        userId: request.userId,
        monthlyIncome: profile.monthlyIncome,
        ...allocationResult,
      },
      tx
    );

    await this.eventPublisher.publish(
      new ExpenseRecordedEvent({ expenseId: expense.id, userId: expense.userId })
    );

    return {
      expense: this.mapExpenseToDTO(expense),
      allocation: this.mapAllocationToDTO(allocation),
    };
  });
}
```

---

### 7. **Debt Payment Recording**

**Operations**:
1. Create DebtPayment
2. Update Debt.currentBalance
3. If paid off: Update Debt.status
4. Create new Allocation

**Transaction Boundary**:
```typescript
async recordDebtPayment(
  request: RecordDebtPaymentRequest
): Promise<RecordDebtPaymentResponse> {
  // Validation
  await this.validateDebtOwnership(request.debtId, request.userId);

  const debt = await this.debtRepository.findById(request.debtId);

  if (request.amount > debt.currentBalance) {
    throw new ValidationError('Payment exceeds remaining balance');
  }

  // Calculate new balance
  const newBalance = debt.currentBalance - request.amount;
  const isPaidOff = newBalance === 0;

  // Fetch data for allocation
  const profile = await this.financialProfileRepository.findByUserId(
    request.userId
  );
  const goals = await this.goalRepository.findActiveByUserId(request.userId);
  const expenses = await this.expenseRepository.findByUserId(request.userId);
  const debts = await this.debtRepository.findActiveByUserId(request.userId);

  // Update debt data for calculation
  const updatedDebts = debts.map((d) =>
    d.id === request.debtId
      ? { ...d, currentBalance: newBalance }
      : d
  ).filter((d) => !(d.id === request.debtId && isPaidOff));

  // Calculate
  const allocationResult = this.financialEngine.calculateAllocation({
    monthlyIncome: profile.monthlyIncome,
    expenses,
    goals,
    debts: updatedDebts,
  });

  // Persist
  return await this.transactionManager.execute(async (tx) => {
    const payment = await this.debtPaymentRepository.create(
      {
        debtId: request.debtId,
        amount: request.amount,
        paymentDate: request.paymentDate,
      },
      tx
    );

    await this.debtRepository.update(
      request.debtId,
      {
        currentBalance: newBalance,
        ...(isPaidOff && { status: 'PAID_OFF' }),
      },
      tx
    );

    const allocation = await this.allocationRepository.create(
      {
        userId: request.userId,
        monthlyIncome: profile.monthlyIncome,
        ...allocationResult,
      },
      tx
    );

    await this.eventPublisher.publish(
      new DebtPaymentRecordedEvent({
        paymentId: payment.id,
        debtId: request.debtId,
        userId: request.userId,
      })
    );

    if (isPaidOff) {
      await this.eventPublisher.publish(
        new DebtPaidOffEvent({ debtId: request.debtId, userId: request.userId })
      );
    }

    return {
      paymentId: payment.id,
      debtId: request.debtId,
      amount: request.amount,
      newBalance,
      remainingPayments: this.calculateRemainingPayments(newBalance, debt.monthlyPayment),
      isPaidOff,
      allocation: this.mapAllocationToDTO(allocation),
    };
  });
}
```

---

### 8. **Simulation with Conversation Update**

**Operations**:
1. Create Simulation
2. Update Conversation (link simulation)

**Transaction Boundary**:
```typescript
async simulatePurchase(
  request: SimulatePurchaseRequest
): Promise<SimulatePurchaseResponse> {
  // Fetch data
  const profile = await this.financialProfileRepository.findByUserId(
    request.userId
  );
  const goals = await this.goalRepository.findActiveByUserId(request.userId);
  const expenses = await this.expenseRepository.findByUserId(request.userId);
  const debts = await this.debtRepository.findActiveByUserId(request.userId);
  const allocation = await this.allocationRepository.findLatestByUserId(
    request.userId
  );

  // Simulate (Financial Engine)
  const simulationResult = this.financialEngine.simulatePurchase({
    purchaseAmount: request.purchaseAmount,
    monthlyIncome: profile.monthlyIncome,
    expenses,
    goals,
    debts,
    currentSavings: allocation.savings,
  });

  // Persist
  return await this.transactionManager.execute(async (tx) => {
    const simulation = await this.simulationRepository.create(
      {
        userId: request.userId,
        type: 'PURCHASE',
        parameters: {
          purchaseAmount: request.purchaseAmount,
          purchaseName: request.purchaseName,
        },
        results: simulationResult,
      },
      tx
    );

    // Link to conversation if provided
    if (request.conversationId) {
      await this.conversationRepository.linkSimulation(
        request.conversationId,
        simulation.id,
        tx
      );
    }

    await this.eventPublisher.publish(
      new SimulationCompletedEvent({
        simulationId: simulation.id,
        userId: request.userId,
      })
    );

    return {
      simulationId: simulation.id,
      canAfford: simulationResult.canAfford,
      impact: simulationResult.impact,
      alternatives: simulationResult.alternatives,
      recommendation: simulationResult.recommendation,
    };
  });
}
```

---

### 9. **AI Chat Message**

**Operations**:
1. Create/Update Conversation
2. Add user message
3. Add AI message

**Transaction Boundary**:
```typescript
async askCFO(request: AskCFORequest): Promise<AskCFOResponse> {
  // Fetch financial context (outside transaction)
  const profile = await this.financialProfileRepository.findByUserId(
    request.userId
  );
  const goals = await this.goalRepository.findActiveByUserId(request.userId);
  const allocation = await this.allocationRepository.findLatestByUserId(
    request.userId
  );

  // Get or create conversation
  let conversation;
  if (request.conversationId) {
    conversation = await this.conversationRepository.findById(
      request.conversationId
    );
  }

  // Generate AI response (outside transaction)
  const aiResponse = await this.aiService.generateResponse({
    conversationHistory: conversation?.messages || [],
    userQuestion: request.question,
    financialContext: {
      monthlyIncome: profile.monthlyIncome,
      allocation,
      goals,
    },
  });

  // Persist (inside transaction)
  return await this.transactionManager.execute(async (tx) => {
    // Create conversation if needed
    if (!conversation) {
      conversation = await this.conversationRepository.create(
        {
          userId: request.userId,
          title: null,
        },
        tx
      );
    }

    // Add user message
    const userMessage = await this.conversationRepository.addMessage(
      conversation.id,
      {
        role: 'USER',
        content: request.question,
      },
      tx
    );

    // Add AI message
    const aiMessage = await this.conversationRepository.addMessage(
      conversation.id,
      {
        role: 'ASSISTANT',
        content: aiResponse.response,
      },
      tx
    );

    await this.eventPublisher.publish(
      new MessageSentEvent({
        conversationId: conversation.id,
        messageId: aiMessage.id,
        userId: request.userId,
      })
    );

    return {
      conversationId: conversation.id,
      messageId: aiMessage.id,
      response: aiResponse.response,
      suggestedActions: aiResponse.suggestedActions,
    };
  });
}
```

---

## Transaction Patterns

### Pattern 1: Fetch → Calculate → Persist

```typescript
async executeUseCase(request: Request): Promise<Response> {
  // 1. Fetch data (outside transaction)
  const data = await this.repository.findData();

  // 2. Calculate (outside transaction)
  const result = this.financialEngine.calculate(data);

  // 3. Persist (inside transaction)
  return await this.transactionManager.execute(async (tx) => {
    const entity = await this.repository.create(result, tx);
    return this.mapToDTO(entity);
  });
}
```

### Pattern 2: Validate → Fetch → Calculate → Persist

```typescript
async executeUseCase(request: Request): Promise<Response> {
  // 1. Validate (outside transaction)
  this.validateInput(request);
  await this.validateAuthorization(request.userId);

  // 2. Fetch data (outside transaction)
  const data = await this.repository.findData();

  // 3. Calculate (outside transaction)
  const result = this.financialEngine.calculate(data);

  // 4. Persist (inside transaction)
  return await this.transactionManager.execute(async (tx) => {
    const entity = await this.repository.create(result, tx);
    await this.relatedRepository.update(relatedData, tx);
    return this.mapToDTO(entity);
  });
}
```

### Pattern 3: Multi-Step Persistence

```typescript
async executeUseCase(request: Request): Promise<Response> {
  return await this.transactionManager.execute(async (tx) => {
    // Step 1
    const entity1 = await this.repository1.create(data1, tx);

    // Step 2 (depends on step 1)
    const entity2 = await this.repository2.create(
      { ...data2, relatedId: entity1.id },
      tx
    );

    // Step 3 (depends on step 2)
    await this.repository3.update(entity3Id, { status: 'UPDATED' }, tx);

    return { entity1, entity2 };
  });
}
```

---

## Rollback Strategy

### Automatic Rollback

Prisma automatically rolls back on errors:

```typescript
try {
  await transactionManager.execute(async (tx) => {
    await goalRepository.create(data, tx);
    throw new Error('Something failed'); // Automatic rollback
    await allocationRepository.create(data, tx); // Never executes
  });
} catch (error) {
  // Transaction rolled back
  console.error('Transaction failed:', error);
}
```

### Manual Rollback

Throw error to trigger rollback:

```typescript
await transactionManager.execute(async (tx) => {
  const goal = await goalRepository.create(data, tx);

  // Validation after creation
  if (goal.targetAmount > MAX_AMOUNT) {
    throw new ValidationError('Amount too high'); // Triggers rollback
  }

  await allocationRepository.create(data, tx);
});
```

### Compensating Actions

For operations outside transactions:

```typescript
async executeUseCase(request: Request): Promise<Response> {
  // External operation (cannot be rolled back)
  const externalResult = await externalService.doSomething();

  try {
    // Transaction
    return await this.transactionManager.execute(async (tx) => {
      const entity = await this.repository.create(data, tx);
      return entity;
    });
  } catch (error) {
    // Compensate for external operation
    await externalService.undo(externalResult);
    throw error;
  }
}
```

---

## Retry Strategy

### Retry on Deadlock

```typescript
async executeWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Retry on deadlock or serialization failure
      if (
        error.code === 'P2034' || // Prisma deadlock
        error.code === '40001' // PostgreSQL serialization failure
      ) {
        if (attempt < maxRetries) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 100;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }

      // Don't retry other errors
      throw error;
    }
  }

  throw lastError;
}

// Usage
async createGoal(request: CreateGoalRequest): Promise<CreateGoalResponse> {
  return await this.executeWithRetry(async () => {
    return await this.transactionManager.execute(async (tx) => {
      // Transaction operations
    });
  });
}
```

### Idempotency

Ensure operations can be safely retried:

```typescript
async createGoal(request: CreateGoalRequest): Promise<CreateGoalResponse> {
  // Check if already exists (idempotency)
  const existing = await this.goalRepository.findByUserIdAndName(
    request.userId,
    request.name
  );

  if (existing) {
    return this.mapToResponse(existing);
  }

  // Create if doesn't exist
  return await this.transactionManager.execute(async (tx) => {
    const goal = await this.goalRepository.create(data, tx);
    return this.mapToResponse(goal);
  });
}
```

---

## Error Handling

### Transaction Errors

```typescript
async executeUseCase(request: Request): Promise<Response> {
  try {
    return await this.transactionManager.execute(async (tx) => {
      // Operations
    });
  } catch (error) {
    if (error.code === 'P2002') {
      // Unique constraint violation
      throw new ValidationError('Resource already exists');
    }

    if (error.code === 'P2025') {
      // Record not found
      throw new NotFoundError('Resource not found');
    }

    if (error.code === 'P2034') {
      // Deadlock
      throw new DatabaseError('Transaction deadlock, please retry');
    }

    // Unknown error
    throw new DatabaseError('Transaction failed', error);
  }
}
```

### Logging

```typescript
async executeUseCase(request: Request): Promise<Response> {
  const startTime = Date.now();

  try {
    const result = await this.transactionManager.execute(async (tx) => {
      // Operations
    });

    const duration = Date.now() - startTime;
    logger.info('Transaction completed', { duration, userId: request.userId });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Transaction failed', {
      duration,
      userId: request.userId,
      error: error.message,
    });

    throw error;
  }
}
```

---

## Performance Considerations

### 1. **Minimize Transaction Duration**

```typescript
// ❌ Bad: Long transaction
await transactionManager.execute(async (tx) => {
  const data = await fetchExternalData(); // Slow
  const result = await complexCalculation(data); // Slow
  await repository.create(result, tx);
});

// ✅ Good: Short transaction
const data = await fetchExternalData(); // Outside
const result = await complexCalculation(data); // Outside
await transactionManager.execute(async (tx) => {
  await repository.create(result, tx); // Fast
});
```

### 2. **Batch Operations**

```typescript
// ❌ Bad: Multiple transactions
for (const item of items) {
  await transactionManager.execute(async (tx) => {
    await repository.create(item, tx);
  });
}

// ✅ Good: Single transaction
await transactionManager.execute(async (tx) => {
  for (const item of items) {
    await repository.create(item, tx);
  }
});
```

### 3. **Read-Only Queries Outside Transactions**

```typescript
// ✅ Good: Read outside, write inside
const goals = await goalRepository.findActiveByUserId(userId);
const expenses = await expenseRepository.findByUserId(userId);

await transactionManager.execute(async (tx) => {
  await allocationRepository.create(data, tx);
});
```

### 4. **Use Appropriate Isolation Level**

```typescript
// Default: READ COMMITTED (sufficient for most cases)
await transactionManager.execute(async (tx) => {
  // Operations
});

// For critical operations: SERIALIZABLE
await prisma.$transaction(
  async (tx) => {
    // Operations
  },
  {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  }
);
```

---

## Summary

### Workflows Requiring Transactions (11 Total)

1. User Onboarding
2. Income Update
3. Goal Creation
4. Goal Update
5. Goal Deletion
6. Expense Recording
7. Expense Update
8. Expense Deletion
9. Debt Payment Recording
10. Simulation with Conversation
11. AI Chat Message

### Key Principles

1. **Application Layer defines boundaries**
2. **Repository Layer executes transactions**
3. **Keep transactions short**
4. **No nested transactions**
5. **Financial Engine calls outside transactions**
6. **Automatic rollback on errors**
7. **Retry on deadlocks**
8. **Log transaction metrics**

### Transaction Pattern

```
1. Validate (outside)
2. Fetch data (outside)
3. Calculate (outside)
4. BEGIN TRANSACTION
5.   Persist changes
6.   Update related entities
7. COMMIT
8. Publish events (after commit)
```

### Performance Targets

- Simple transactions: < 50ms
- Complex transactions: < 100ms
- Max transaction duration: 500ms

---

**Next**: Define event flow for cross-module communication.
