# Transaction Strategy

**Package:** `@sage/database`  
**Purpose:** Database transaction specifications for Sage workflows  
**Date:** June 30, 2026  
**Status:** Design Phase - Documentation Only

---

## Overview

This document defines the transaction strategy for Sage, identifying all workflows that require ACID guarantees and specifying transaction boundaries, rollback scenarios, and error handling.

**Core Principle:** Transactions wrap complete business workflows to ensure data consistency.

---

## Transaction Fundamentals

### What is a Transaction?

A database transaction is a unit of work that either:
- **Commits** - All changes are saved
- **Rolls back** - All changes are undone

**ACID Properties:**
- **Atomicity** - All or nothing
- **Consistency** - Valid state before and after
- **Isolation** - Concurrent transactions don't interfere
- **Durability** - Committed changes persist

### Prisma Transaction API

```typescript
// Prisma provides two transaction patterns:

// 1. Sequential Operations
await db.$transaction([
  db.user.create({ data: userData }),
  db.financialProfile.create({ data: profileData })
]);

// 2. Interactive Transactions (recommended for complex workflows)
await db.$transaction(async (tx) => {
  const user = await tx.user.create({ data: userData });
  const profile = await tx.financialProfile.create({ 
    data: { ...profileData, userId: user.id } 
  });
  return { user, profile };
});
```

---

## Transaction Workflows

### 1. User Onboarding

**Workflow:** Create user account with initial financial profile

**Operations:**
1. Create User record
2. Create FinancialProfile record
3. Create default emergency fund Goal (optional)
4. Create initial Allocation

**Transaction Boundary:**
```typescript
async function onboardUser(data: OnboardingData): Promise<OnboardingResult> {
  return await db.$transaction(async (tx) => {
    // 1. Create user
    const user = await tx.user.create({
      data: {
        clerkId: data.clerkId,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName
      }
    });
    
    // 2. Create financial profile
    const profile = await tx.financialProfile.create({
      data: {
        userId: user.id,
        monthlyIncome: data.monthlyIncome,
        currentSavings: data.currentSavings,
        incomeFrequency: data.incomeFrequency,
        riskTolerance: data.riskTolerance,
        cfoUnderstandingScore: calculateUnderstandingScore(data)
      }
    });
    
    // 3. Create emergency fund goal (if target provided)
    let emergencyGoal = null;
    if (data.emergencyFundTarget) {
      emergencyGoal = await tx.goal.create({
        data: {
          userId: user.id,
          name: 'Emergency Fund',
          type: 'EMERGENCY_FUND',
          targetAmount: data.emergencyFundTarget,
          currentAmount: data.currentEmergencyFund || 0,
          targetDate: calculateEmergencyFundDate(data),
          priority: 'HIGH',
          status: 'ACTIVE'
        }
      });
    }
    
    // 4. Create initial allocation (current month)
    const allocation = await tx.allocation.create({
      data: {
        userId: user.id,
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        ...calculateInitialAllocation(profile, emergencyGoal)
      }
    });
    
    return { user, profile, emergencyGoal, allocation };
  });
}
```

**Why Transaction?**
- User without profile is invalid state
- Profile without user is orphaned data
- All or nothing ensures consistency

**Rollback Scenarios:**
- Duplicate email/clerkId
- Invalid profile data
- Database constraint violation
- Network failure

**Error Handling:**
```typescript
try {
  const result = await onboardUser(data);
  return { success: true, data: result };
} catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return { success: false, error: 'Email already exists', code: 'DUPLICATE_EMAIL' };
    }
  }
  return { success: false, error: 'Onboarding failed', code: 'ONBOARDING_ERROR' };
}
```

---

### 2. Goal Creation with Allocation Recalculation

**Workflow:** Create goal and update monthly allocation

**Operations:**
1. Validate no duplicate emergency fund goal (if applicable)
2. Create Goal record
3. Calculate new allocation using Financial Engine
4. Update or create current month's Allocation

**Transaction Boundary:**
```typescript
async function createGoalWithAllocation(
  userId: string,
  goalData: CreateGoalData
): Promise<GoalCreationResult> {
  return await db.$transaction(async (tx) => {
    // 1. Check for duplicate emergency fund
    if (goalData.type === 'EMERGENCY_FUND') {
      const existing = await tx.goal.findFirst({
        where: { 
          userId, 
          type: 'EMERGENCY_FUND',
          deletedAt: null 
        }
      });
      
      if (existing) {
        throw new Error('User already has an emergency fund goal');
      }
    }
    
    // 2. Create goal
    const goal = await tx.goal.create({
      data: {
        userId,
        ...goalData,
        isFeasible: true, // Will be calculated
        feasibilityScore: 100 // Will be calculated
      }
    });
    
    // 3. Fetch data for allocation calculation
    const [profile, goals, expenses, debts] = await Promise.all([
      tx.financialProfile.findUnique({ where: { userId } }),
      tx.goal.findMany({ where: { userId, status: 'ACTIVE', deletedAt: null } }),
      tx.expense.findMany({ where: { userId, isActive: true, deletedAt: null } }),
      tx.debt.findMany({ where: { userId, status: 'ACTIVE', deletedAt: null } })
    ]);
    
    // 4. Calculate allocation (Financial Engine - outside transaction)
    // Note: Calculation happens in-memory, no side effects
    const allocationResult = calculateAllocation({
      monthlyIncome: profile.monthlyIncome,
      goals: goals.map(mapGoalToDomain),
      expenses: expenses.map(mapExpenseToDomain),
      debts: debts.map(mapDebtToDomain)
    });
    
    if (!allocationResult.success) {
      throw new Error('Allocation calculation failed');
    }
    
    // 5. Update allocation
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    
    const allocation = await tx.allocation.upsert({
      where: {
        userId_month_year: { userId, month: currentMonth, year: currentYear }
      },
      create: {
        userId,
        month: currentMonth,
        year: currentYear,
        ...allocationResult.data
      },
      update: allocationResult.data
    });
    
    // 6. Update goal feasibility
    const updatedGoal = await tx.goal.update({
      where: { id: goal.id },
      data: {
        isFeasible: allocationResult.data.goalSavings >= goalData.monthlyContribution,
        feasibilityScore: calculateFeasibilityScore(allocationResult.data, goalData)
      }
    });
    
    return { goal: updatedGoal, allocation };
  });
}
```

**Why Transaction?**
- Goal and allocation must be consistent
- Prevents duplicate emergency fund goals
- Ensures allocation reflects new goal

**Rollback Scenarios:**
- Duplicate emergency fund goal
- Allocation calculation failure
- Database constraint violation

---

### 3. Goal Update with Allocation Recalculation

**Workflow:** Update goal and recalculate allocation

**Operations:**
1. Update Goal record
2. Recalculate allocation
3. Update current month's Allocation

**Transaction Boundary:**
```typescript
async function updateGoalWithAllocation(
  goalId: string,
  updates: UpdateGoalData
): Promise<GoalUpdateResult> {
  return await db.$transaction(async (tx) => {
    // 1. Get current goal
    const currentGoal = await tx.goal.findUnique({ where: { id: goalId } });
    if (!currentGoal) {
      throw new Error('Goal not found');
    }
    
    // 2. Update goal
    const updatedGoal = await tx.goal.update({
      where: { id: goalId },
      data: updates
    });
    
    // 3. If amount or date changed, recalculate allocation
    if (updates.targetAmount || updates.targetDate || updates.status) {
      const [profile, goals, expenses, debts] = await Promise.all([
        tx.financialProfile.findUnique({ where: { userId: currentGoal.userId } }),
        tx.goal.findMany({ 
          where: { userId: currentGoal.userId, status: 'ACTIVE', deletedAt: null } 
        }),
        tx.expense.findMany({ 
          where: { userId: currentGoal.userId, isActive: true, deletedAt: null } 
        }),
        tx.debt.findMany({ 
          where: { userId: currentGoal.userId, status: 'ACTIVE', deletedAt: null } 
        })
      ]);
      
      const allocationResult = calculateAllocation({
        monthlyIncome: profile.monthlyIncome,
        goals: goals.map(mapGoalToDomain),
        expenses: expenses.map(mapExpenseToDomain),
        debts: debts.map(mapDebtToDomain)
      });
      
      if (allocationResult.success) {
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        
        await tx.allocation.upsert({
          where: {
            userId_month_year: { 
              userId: currentGoal.userId, 
              month: currentMonth, 
              year: currentYear 
            }
          },
          create: {
            userId: currentGoal.userId,
            month: currentMonth,
            year: currentYear,
            ...allocationResult.data
          },
          update: allocationResult.data
        });
      }
    }
    
    return { goal: updatedGoal };
  });
}
```

**Why Transaction?**
- Goal and allocation must stay in sync
- Prevents partial updates

**Rollback Scenarios:**
- Goal not found
- Invalid update data
- Allocation calculation failure

---

### 4. Goal Completion

**Workflow:** Mark goal as completed and update allocation

**Operations:**
1. Update Goal status to COMPLETED
2. Set completedDate
3. Recalculate allocation (goal no longer active)

**Transaction Boundary:**
```typescript
async function completeGoal(goalId: string): Promise<GoalCompletionResult> {
  return await db.$transaction(async (tx) => {
    // 1. Complete goal
    const goal = await tx.goal.update({
      where: { id: goalId },
      data: {
        status: 'COMPLETED',
        completedDate: new Date()
      }
    });
    
    // 2. Recalculate allocation (goal no longer active)
    const [profile, activeGoals, expenses, debts] = await Promise.all([
      tx.financialProfile.findUnique({ where: { userId: goal.userId } }),
      tx.goal.findMany({ 
        where: { userId: goal.userId, status: 'ACTIVE', deletedAt: null } 
      }),
      tx.expense.findMany({ 
        where: { userId: goal.userId, isActive: true, deletedAt: null } 
      }),
      tx.debt.findMany({ 
        where: { userId: goal.userId, status: 'ACTIVE', deletedAt: null } 
      })
    ]);
    
    const allocationResult = calculateAllocation({
      monthlyIncome: profile.monthlyIncome,
      goals: activeGoals.map(mapGoalToDomain),
      expenses: expenses.map(mapExpenseToDomain),
      debts: debts.map(mapDebtToDomain)
    });
    
    if (allocationResult.success) {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      
      await tx.allocation.upsert({
        where: {
          userId_month_year: { userId: goal.userId, month: currentMonth, year: currentYear }
        },
        create: {
          userId: goal.userId,
          month: currentMonth,
          year: currentYear,
          ...allocationResult.data
        },
        update: allocationResult.data
      });
    }
    
    return { goal };
  });
}
```

**Why Transaction?**
- Goal completion and allocation update must be atomic
- Freed-up funds immediately available

**Rollback Scenarios:**
- Goal not found
- Invalid state transition
- Allocation calculation failure

---

### 5. Expense Creation/Update with Allocation

**Workflow:** Create/update expense and recalculate allocation

**Operations:**
1. Create/update Expense record
2. Recalculate allocation
3. Update current month's Allocation

**Transaction Boundary:**
```typescript
async function createExpenseWithAllocation(
  userId: string,
  expenseData: CreateExpenseData
): Promise<ExpenseCreationResult> {
  return await db.$transaction(async (tx) => {
    // 1. Create expense
    const expense = await tx.expense.create({
      data: {
        userId,
        ...expenseData
      }
    });
    
    // 2. Recalculate allocation
    const [profile, goals, expenses, debts] = await Promise.all([
      tx.financialProfile.findUnique({ where: { userId } }),
      tx.goal.findMany({ where: { userId, status: 'ACTIVE', deletedAt: null } }),
      tx.expense.findMany({ where: { userId, isActive: true, deletedAt: null } }),
      tx.debt.findMany({ where: { userId, status: 'ACTIVE', deletedAt: null } })
    ]);
    
    const allocationResult = calculateAllocation({
      monthlyIncome: profile.monthlyIncome,
      goals: goals.map(mapGoalToDomain),
      expenses: expenses.map(mapExpenseToDomain),
      debts: debts.map(mapDebtToDomain)
    });
    
    if (allocationResult.success) {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      
      await tx.allocation.upsert({
        where: {
          userId_month_year: { userId, month: currentMonth, year: currentYear }
        },
        create: {
          userId,
          month: currentMonth,
          year: currentYear,
          ...allocationResult.data
        },
        update: allocationResult.data
      });
    }
    
    return { expense };
  });
}
```

**Why Transaction?**
- Expense and allocation must be consistent
- Prevents allocation showing old data

**Rollback Scenarios:**
- Invalid expense data
- Allocation calculation failure

---

### 6. Debt Payment Recording

**Workflow:** Record payment and update debt balance

**Operations:**
1. Create DebtPayment record
2. Update Debt currentBalance
3. Auto-complete debt if balance reaches zero
4. Recalculate allocation if debt status changes

**Transaction Boundary:**
```typescript
async function recordDebtPayment(
  debtId: string,
  paymentData: CreatePaymentData
): Promise<PaymentResult> {
  return await db.$transaction(async (tx) => {
    // 1. Get current debt
    const debt = await tx.debt.findUnique({ where: { id: debtId } });
    if (!debt) {
      throw new Error('Debt not found');
    }
    
    // 2. Create payment record
    const payment = await tx.debtPayment.create({
      data: {
        debtId,
        amount: paymentData.amount,
        paymentDate: paymentData.paymentDate,
        principalPaid: paymentData.principalPaid,
        interestPaid: paymentData.interestPaid
      }
    });
    
    // 3. Update debt balance
    const newBalance = debt.currentBalance - paymentData.principalPaid;
    const statusChanged = newBalance <= 0 && debt.status === 'ACTIVE';
    
    const updatedDebt = await tx.debt.update({
      where: { id: debtId },
      data: {
        currentBalance: Math.max(0, newBalance),
        status: newBalance <= 0 ? 'PAID_OFF' : debt.status
      }
    });
    
    // 4. If debt paid off, recalculate allocation
    if (statusChanged) {
      const [profile, goals, expenses, debts] = await Promise.all([
        tx.financialProfile.findUnique({ where: { userId: debt.userId } }),
        tx.goal.findMany({ where: { userId: debt.userId, status: 'ACTIVE', deletedAt: null } }),
        tx.expense.findMany({ where: { userId: debt.userId, isActive: true, deletedAt: null } }),
        tx.debt.findMany({ where: { userId: debt.userId, status: 'ACTIVE', deletedAt: null } })
      ]);
      
      const allocationResult = calculateAllocation({
        monthlyIncome: profile.monthlyIncome,
        goals: goals.map(mapGoalToDomain),
        expenses: expenses.map(mapExpenseToDomain),
        debts: debts.map(mapDebtToDomain)
      });
      
      if (allocationResult.success) {
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        
        await tx.allocation.upsert({
          where: {
            userId_month_year: { userId: debt.userId, month: currentMonth, year: currentYear }
          },
          create: {
            userId: debt.userId,
            month: currentMonth,
            year: currentYear,
            ...allocationResult.data
          },
          update: allocationResult.data
        });
      }
    }
    
    return { payment, debt: updatedDebt, statusChanged };
  });
}
```

**Why Transaction?**
- Payment and balance update must be atomic
- Auto-completion must be immediate
- Allocation reflects freed-up funds

**Rollback Scenarios:**
- Debt not found
- Invalid payment amount
- Payment exceeds balance

---

### 7. Simulation with Conversation Update

**Workflow:** Create simulation and update conversation

**Operations:**
1. Create Simulation record
2. Update Conversation updatedAt timestamp

**Transaction Boundary:**
```typescript
async function createSimulationInConversation(
  userId: string,
  conversationId: string,
  simulationData: CreateSimulationData
): Promise<SimulationResult> {
  return await db.$transaction(async (tx) => {
    // 1. Create simulation
    const simulation = await tx.simulation.create({
      data: {
        userId,
        type: simulationData.type,
        input: simulationData.input,
        output: simulationData.output
      }
    });
    
    // 2. Update conversation timestamp
    await tx.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() }
    });
    
    return { simulation };
  });
}
```

**Why Transaction?**
- Simulation and conversation update should be atomic
- Ensures conversation shows latest activity

**Rollback Scenarios:**
- Conversation not found
- Invalid simulation data

---

### 8. Financial Profile Update with Allocation

**Workflow:** Update profile and recalculate allocation

**Operations:**
1. Update FinancialProfile
2. Recalculate understanding score
3. Recalculate allocation
4. Update current month's Allocation

**Transaction Boundary:**
```typescript
async function updateProfileWithAllocation(
  userId: string,
  updates: UpdateProfileData
): Promise<ProfileUpdateResult> {
  return await db.$transaction(async (tx) => {
    // 1. Get current profile
    const currentProfile = await tx.financialProfile.findUnique({ 
      where: { userId } 
    });
    
    if (!currentProfile) {
      throw new Error('Profile not found');
    }
    
    // 2. Calculate new understanding score
    const newScore = calculateUnderstandingScore({
      ...currentProfile,
      ...updates
    });
    
    // 3. Update profile
    const profile = await tx.financialProfile.update({
      where: { userId },
      data: {
        ...updates,
        cfoUnderstandingScore: newScore
      }
    });
    
    // 4. If income changed, recalculate allocation
    if (updates.monthlyIncome || updates.otherIncome || updates.incomeFrequency) {
      const [goals, expenses, debts] = await Promise.all([
        tx.goal.findMany({ where: { userId, status: 'ACTIVE', deletedAt: null } }),
        tx.expense.findMany({ where: { userId, isActive: true, deletedAt: null } }),
        tx.debt.findMany({ where: { userId, status: 'ACTIVE', deletedAt: null } })
      ]);
      
      const allocationResult = calculateAllocation({
        monthlyIncome: profile.monthlyIncome,
        goals: goals.map(mapGoalToDomain),
        expenses: expenses.map(mapExpenseToDomain),
        debts: debts.map(mapDebtToDomain)
      });
      
      if (allocationResult.success) {
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        
        await tx.allocation.upsert({
          where: {
            userId_month_year: { userId, month: currentMonth, year: currentYear }
          },
          create: {
            userId,
            month: currentMonth,
            year: currentYear,
            ...allocationResult.data
          },
          update: allocationResult.data
        });
      }
    }
    
    return { profile };
  });
}
```

**Why Transaction?**
- Profile and allocation must be consistent
- Understanding score updated atomically

**Rollback Scenarios:**
- Profile not found
- Invalid update data
- Allocation calculation failure

---

## Transaction Best Practices

### 1. Keep Transactions Short

**❌ Bad - Long transaction:**
```typescript
await db.$transaction(async (tx) => {
  const user = await tx.user.create({ data });
  
  // External API call - BAD!
  await sendWelcomeEmail(user.email);
  
  // Long calculation - BAD!
  await complexCalculation();
  
  return user;
});
```

**✅ Good - Short transaction:**
```typescript
// 1. Transaction for database operations only
const user = await db.$transaction(async (tx) => {
  return await tx.user.create({ data });
});

// 2. External operations after transaction
await sendWelcomeEmail(user.email);
await complexCalculation();
```

### 2. Handle Errors Properly

```typescript
try {
  const result = await db.$transaction(async (tx) => {
    // Operations
  });
  return { success: true, data: result };
} catch (error) {
  // Transaction automatically rolled back
  logger.error({ error }, 'Transaction failed');
  
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Handle specific Prisma errors
    switch (error.code) {
      case 'P2002':
        return { success: false, error: 'Duplicate record', code: 'DUPLICATE' };
      case 'P2025':
        return { success: false, error: 'Record not found', code: 'NOT_FOUND' };
      default:
        return { success: false, error: 'Database error', code: 'DB_ERROR' };
    }
  }
  
  return { success: false, error: 'Transaction failed', code: 'TRANSACTION_ERROR' };
}
```

### 3. Avoid Nested Transactions

Prisma doesn't support nested transactions. Use a single transaction for the entire workflow.

**❌ Bad:**
```typescript
await db.$transaction(async (tx) => {
  const user = await tx.user.create({ data });
  
  // Nested transaction - NOT SUPPORTED!
  await db.$transaction(async (tx2) => {
    await tx2.profile.create({ data });
  });
});
```

**✅ Good:**
```typescript
await db.$transaction(async (tx) => {
  const user = await tx.user.create({ data });
  const profile = await tx.profile.create({ data });
  return { user, profile };
});
```

### 4. Use Timeout for Long Transactions

```typescript
await db.$transaction(
  async (tx) => {
    // Operations
  },
  {
    maxWait: 5000, // Wait up to 5s to start transaction
    timeout: 10000 // Transaction must complete within 10s
  }
);
```

---

## Rollback Scenarios Summary

### Automatic Rollback

Transactions automatically rollback on:
- **Database Errors:**
  - Constraint violations (unique, foreign key, check)
  - Data type mismatches
  - Connection failures
  
- **Application Errors:**
  - Thrown exceptions
  - Validation failures
  - Business rule violations

### Manual Rollback

Throw an error to trigger rollback:

```typescript
await db.$transaction(async (tx) => {
  const goal = await tx.goal.create({ data });
  
  // Business rule check
  if (goal.type === 'EMERGENCY_FUND') {
    const existing = await tx.goal.findFirst({
      where: { userId: goal.userId, type: 'EMERGENCY_FUND' }
    });
    
    if (existing && existing.id !== goal.id) {
      // Throw to rollback
      throw new Error('Duplicate emergency fund goal');
    }
  }
  
  return goal;
});
```

---

## Transaction Isolation Levels

Prisma uses PostgreSQL's default isolation level: **READ COMMITTED**

**What this means:**
- Transactions see committed data from other transactions
- No dirty reads
- Phantom reads possible
- Repeatable reads not guaranteed

**For Sage, this is acceptable because:**
- Most workflows are single-user
- Concurrent updates to same data are rare
- Application layer handles conflicts

**If needed, can use serializable transactions:**
```typescript
await db.$executeRaw`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`;
await db.$transaction(async (tx) => {
  // Operations
});
```

---

## Performance Considerations

### Transaction Overhead

Each transaction has overhead:
- Lock acquisition
- Commit/rollback processing
- Connection management

**Minimize by:**
- Keeping transactions short
- Batching operations when possible
- Avoiding external calls in transactions

### Deadlock Prevention

Deadlocks occur when transactions wait for each other's locks.

**Prevention strategies:**
1. **Consistent lock order** - Always acquire locks in same order
2. **Short transactions** - Reduce lock hold time
3. **Retry logic** - Retry on deadlock detection

```typescript
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (error.code === 'P2034' && i < maxRetries - 1) {
        // Deadlock detected, retry
        await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)));
        continue;
      }
      throw error;
    }
  }
}
```

---

## Testing Transactions

### Unit Tests

```typescript
describe('User Onboarding Transaction', () => {
  it('should create user and profile atomically', async () => {
    const result = await onboardUser({
      clerkId: 'clerk_123',
      email: 'test@example.com',
      monthlyIncome: 80000,
      currentSavings: 100000
    });
    
    expect(result.user).toBeDefined();
    expect(result.profile).toBeDefined();
    expect(result.profile.userId).toBe(result.user.id);
  });
  
  it('should rollback on duplicate email', async () => {
    await onboardUser({ email: 'test@example.com', /* ... */ });
    
    const result = await onboardUser({ email: 'test@example.com', /* ... */ });
    
    expect(result.success).toBe(false);
    expect(result.code).toBe('DUPLICATE_EMAIL');
    
    // Verify no partial data
    const users = await db.user.findMany({ where: { email: 'test@example.com' } });
    expect(users).toHaveLength(1);
  });
});
```

---

## Summary

### Transaction Workflows: 8

1. User Onboarding
2. Goal Creation with Allocation
3. Goal Update with Allocation
4. Goal Completion
5. Expense Creation/Update with Allocation
6. Debt Payment Recording
7. Simulation with Conversation Update
8. Financial Profile Update with Allocation

### Key Principles

✅ **Atomic Operations** - All or nothing  
✅ **Short Transactions** - Minimize lock time  
✅ **Proper Error Handling** - Graceful rollback  
✅ **No External Calls** - Database operations only  
✅ **Consistent State** - Always valid data  

### Rollback Guarantees

- Automatic on errors
- No partial updates
- Data integrity maintained
- Audit trail preserved

---

## Conclusion

This transaction strategy ensures:
- Data consistency across workflows
- Proper error handling and rollback
- Performance optimization
- Testable transaction logic

**Status:** Ready for implementation

**Next Steps:**
1. Implement transaction wrappers
2. Add retry logic for deadlocks
3. Write comprehensive tests
4. Monitor transaction performance

---

**Document Version:** 1.0  
**Last Updated:** June 30, 2026  
**Next Review:** After Phase 3 implementation
