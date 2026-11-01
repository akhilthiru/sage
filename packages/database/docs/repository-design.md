# Repository Design

**Package:** `@sage/database`  
**Purpose:** Repository pattern specifications for all Sage aggregates  
**Date:** June 30, 2026  
**Status:** Design Phase - Documentation Only

---

## Overview

This document defines the repository pattern implementation for Sage, providing clean data access abstractions that maintain strict separation between persistence and business logic.

**Core Principle:** Repositories are pure data access adapters. They perform CRUD operations only. No business logic, no calculations, no validation.

---

## Repository Pattern Philosophy

### What Repositories ARE

**Data Access Abstraction:**
- Interface between application layer and database
- CRUD operations (Create, Read, Update, Delete)
- Query building and filtering
- Data mapping (Prisma models ↔ Domain types)
- Pagination and sorting

### What Repositories ARE NOT

**NOT Business Logic:**
- ❌ Financial calculations
- ❌ Validation rules
- ❌ State transitions
- ❌ Authorization checks
- ❌ Workflow orchestration

**Example - WRONG:**
```typescript
// ❌ Repository with business logic
class GoalRepository {
  async createGoal(data: GoalInput) {
    // Validation - WRONG! Belongs in application layer
    if (data.targetAmount <= 0) {
      throw new Error('Invalid amount');
    }
    
    // Business rule - WRONG! Belongs in application layer
    const existing = await this.findEmergencyFund(data.userId);
    if (existing && data.type === 'EMERGENCY_FUND') {
      throw new Error('Already has emergency fund');
    }
    
    // Calculation - WRONG! Belongs in Financial Engine
    const feasibility = calculateFeasibility(data);
    
    return this.db.goal.create({ 
      data: { ...data, isFeasible: feasibility.isFeasible } 
    });
  }
}
```

**Example - CORRECT:**
```typescript
// ✅ Repository with pure data access
class GoalRepository {
  async create(data: CreateGoalData) {
    return this.db.goal.create({ data });
  }
  
  async findByUserId(userId: string) {
    return this.db.goal.findMany({ 
      where: { userId, deletedAt: null } 
    });
  }
  
  async findEmergencyFundGoal(userId: string) {
    return this.db.goal.findFirst({
      where: { 
        userId, 
        type: 'EMERGENCY_FUND',
        deletedAt: null 
      }
    });
  }
}
```

---

## Repository Specifications

### 1. UserRepository

**Purpose:** Manage user accounts and authentication linkage

**Responsibilities:**
- User CRUD operations
- Clerk ID lookups
- Email uniqueness checks
- Soft delete management

**Public Methods:**

```typescript
interface IUserRepository {
  // Create
  create(data: CreateUserData): Promise<User>;
  
  // Read
  findById(id: string): Promise<User | null>;
  findByClerkId(clerkId: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findMany(filter: UserFilter): Promise<User[]>;
  exists(id: string): Promise<boolean>;
  
  // Update
  update(id: string, data: UpdateUserData): Promise<User>;
  
  // Delete
  softDelete(id: string): Promise<User>;
  restore(id: string): Promise<User>;
  
  // Queries
  isEmailTaken(email: string): Promise<boolean>;
  isClerkIdTaken(clerkId: string): Promise<boolean>;
}

interface CreateUserData {
  clerkId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
}

interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
}

interface UserFilter {
  deletedAt?: 'null' | 'not-null';
  createdAfter?: Date;
  createdBefore?: Date;
}
```

**What Belongs Here:**
- ✅ User lookup by ID, email, clerkId
- ✅ Soft delete operations
- ✅ Email/clerkId uniqueness checks

**What Does NOT Belong Here:**
- ❌ Password hashing (handled by Clerk)
- ❌ Email validation (application layer)
- ❌ Authorization checks (application layer)
- ❌ User onboarding workflow (application layer)

**Transaction Boundaries:**
- User creation: Single operation
- User deletion: Cascade handled by database

---

### 2. FinancialProfileRepository

**Purpose:** Manage user financial profiles

**Responsibilities:**
- Profile CRUD operations
- User profile lookups
- Profile completeness tracking

**Public Methods:**

```typescript
interface IFinancialProfileRepository {
  // Create
  create(data: CreateProfileData): Promise<FinancialProfile>;
  
  // Read
  findById(id: string): Promise<FinancialProfile | null>;
  findByUserId(userId: string): Promise<FinancialProfile | null>;
  exists(userId: string): Promise<boolean>;
  
  // Update
  update(id: string, data: UpdateProfileData): Promise<FinancialProfile>;
  updateByUserId(userId: string, data: UpdateProfileData): Promise<FinancialProfile>;
  
  // Delete (cascade from User)
}

interface CreateProfileData {
  userId: string;
  monthlyIncome: number;
  otherIncome?: number;
  incomeFrequency: IncomeFrequency;
  currentSavings: number;
  emergencyFundTarget?: number;
  currentEmergencyFund?: number;
  primaryGoal?: string;
  riskTolerance: RiskTolerance;
  cfoUnderstandingScore: number;
}

interface UpdateProfileData {
  monthlyIncome?: number;
  otherIncome?: number;
  incomeFrequency?: IncomeFrequency;
  currentSavings?: number;
  emergencyFundTarget?: number;
  currentEmergencyFund?: number;
  primaryGoal?: string;
  riskTolerance?: RiskTolerance;
  cfoUnderstandingScore?: number;
}
```

**What Belongs Here:**
- ✅ Profile lookup by userId
- ✅ Profile updates
- ✅ Existence checks

**What Does NOT Belong Here:**
- ❌ Understanding score calculation (application layer)
- ❌ Income normalization (Financial Engine)
- ❌ Validation (currentSavings >= emergencyFund) (application layer)
- ❌ Profile completeness logic (application layer)

**Transaction Boundaries:**
- Profile creation: Part of user onboarding transaction
- Profile updates: Single operation

---

### 3. GoalRepository

**Purpose:** Manage financial goals and milestones

**Responsibilities:**
- Goal CRUD operations
- Goal filtering and queries
- Milestone management
- Soft delete

**Public Methods:**

```typescript
interface IGoalRepository {
  // Create
  create(data: CreateGoalData): Promise<Goal>;
  createMany(data: CreateGoalData[]): Promise<Goal[]>;
  
  // Read
  findById(id: string): Promise<Goal | null>;
  findByUserId(userId: string): Promise<Goal[]>;
  findActiveByUserId(userId: string): Promise<Goal[]>;
  findByType(userId: string, type: GoalType): Promise<Goal[]>;
  findByStatus(userId: string, status: GoalStatus): Promise<Goal[]>;
  findDueWithin(userId: string, months: number): Promise<Goal[]>;
  findWithMilestones(id: string): Promise<GoalWithMilestones | null>;
  count(filter: GoalFilter): Promise<number>;
  
  // Update
  update(id: string, data: UpdateGoalData): Promise<Goal>;
  updateStatus(id: string, status: GoalStatus): Promise<Goal>;
  updateProgress(id: string, currentAmount: number): Promise<Goal>;
  
  // Delete
  softDelete(id: string): Promise<Goal>;
  restore(id: string): Promise<Goal>;
  
  // Queries
  hasEmergencyFundGoal(userId: string): Promise<boolean>;
  findEmergencyFundGoal(userId: string): Promise<Goal | null>;
  countActiveGoals(userId: string): Promise<number>;
}

interface CreateGoalData {
  userId: string;
  name: string;
  description?: string;
  type: GoalType;
  targetAmount: number;
  currentAmount?: number;
  targetDate: string; // ISO date
  priority: Priority;
  status?: GoalStatus;
  isFeasible?: boolean;
  feasibilityScore?: number;
}

interface UpdateGoalData {
  name?: string;
  description?: string;
  targetAmount?: number;
  currentAmount?: number;
  targetDate?: string;
  priority?: Priority;
  status?: GoalStatus;
  isFeasible?: boolean;
  feasibilityScore?: number;
  monthlyContribution?: number;
  completedDate?: string;
}

interface GoalFilter {
  userId: string;
  status?: GoalStatus | GoalStatus[];
  type?: GoalType | GoalType[];
  priority?: Priority | Priority[];
  dueBefore?: Date;
  dueAfter?: Date;
  deletedAt?: 'null' | 'not-null';
}
```

**What Belongs Here:**
- ✅ Goal CRUD operations
- ✅ Filtering by status, type, priority
- ✅ Emergency fund goal checks
- ✅ Due date queries

**What Does NOT Belong Here:**
- ❌ Feasibility calculation (Financial Engine)
- ❌ Goal validation (application layer)
- ❌ Auto-completion logic (application layer)
- ❌ Allocation recalculation (application layer)
- ❌ Business rule: one emergency fund per user (application layer)

**Transaction Boundaries:**
- Goal creation: May include allocation recalculation
- Goal updates: May include allocation recalculation
- Goal completion: Single operation

---

### 4. ExpenseRepository

**Purpose:** Manage recurring and one-time expenses

**Responsibilities:**
- Expense CRUD operations
- Active expense filtering
- Category-based queries

**Public Methods:**

```typescript
interface IExpenseRepository {
  // Create
  create(data: CreateExpenseData): Promise<Expense>;
  createMany(data: CreateExpenseData[]): Promise<Expense[]>;
  
  // Read
  findById(id: string): Promise<Expense | null>;
  findByUserId(userId: string): Promise<Expense[]>;
  findActiveByUserId(userId: string): Promise<Expense[]>;
  findByCategory(userId: string, category: ExpenseCategory): Promise<Expense[]>;
  findEssential(userId: string): Promise<Expense[]>;
  count(filter: ExpenseFilter): Promise<number>;
  
  // Update
  update(id: string, data: UpdateExpenseData): Promise<Expense>;
  activate(id: string): Promise<Expense>;
  deactivate(id: string): Promise<Expense>;
  
  // Delete
  softDelete(id: string): Promise<Expense>;
  restore(id: string): Promise<Expense>;
  
  // Queries
  calculateTotalMonthly(userId: string): Promise<number>;
  calculateEssentialMonthly(userId: string): Promise<number>;
}

interface CreateExpenseData {
  userId: string;
  name: string;
  amount: number;
  category: ExpenseCategory;
  frequency: Frequency;
  isEssential: boolean;
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
}

interface UpdateExpenseData {
  name?: string;
  amount?: number;
  category?: ExpenseCategory;
  frequency?: Frequency;
  isEssential?: boolean;
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
}

interface ExpenseFilter {
  userId: string;
  category?: ExpenseCategory | ExpenseCategory[];
  isEssential?: boolean;
  isActive?: boolean;
  deletedAt?: 'null' | 'not-null';
}
```

**What Belongs Here:**
- ✅ Expense CRUD operations
- ✅ Active/inactive filtering
- ✅ Category filtering
- ✅ Simple aggregations (sum)

**What Does NOT Belong Here:**
- ❌ Frequency normalization (Financial Engine)
- ❌ Essential expense validation (application layer)
- ❌ Allocation impact calculation (Financial Engine)

**Transaction Boundaries:**
- Expense creation: May include allocation recalculation
- Expense updates: May include allocation recalculation

---

### 5. DebtRepository

**Purpose:** Manage debts and payment history

**Responsibilities:**
- Debt CRUD operations
- Payment tracking
- Status management

**Public Methods:**

```typescript
interface IDebtRepository {
  // Create
  create(data: CreateDebtData): Promise<Debt>;
  createPayment(debtId: string, data: CreatePaymentData): Promise<DebtPayment>;
  
  // Read
  findById(id: string): Promise<Debt | null>;
  findByUserId(userId: string): Promise<Debt[]>;
  findActiveByUserId(userId: string): Promise<Debt[]>;
  findByType(userId: string, type: DebtType): Promise<Debt[]>;
  findWithPayments(id: string): Promise<DebtWithPayments | null>;
  getPaymentHistory(debtId: string): Promise<DebtPayment[]>;
  count(filter: DebtFilter): Promise<number>;
  
  // Update
  update(id: string, data: UpdateDebtData): Promise<Debt>;
  updateBalance(id: string, newBalance: number): Promise<Debt>;
  updateStatus(id: string, status: DebtStatus): Promise<Debt>;
  
  // Delete
  softDelete(id: string): Promise<Debt>;
  restore(id: string): Promise<Debt>;
  
  // Queries
  calculateTotalBalance(userId: string): Promise<number>;
  calculateMonthlyPayments(userId: string): Promise<number>;
  calculateDebtToIncome(userId: string, monthlyIncome: number): Promise<number>;
}

interface CreateDebtData {
  userId: string;
  name: string;
  type: DebtType;
  principalAmount: number;
  currentBalance: number;
  interestRate: number;
  monthlyPayment: number;
  minimumPayment: number;
  startDate: string;
  endDate?: string;
  status?: DebtStatus;
}

interface UpdateDebtData {
  name?: string;
  currentBalance?: number;
  interestRate?: number;
  monthlyPayment?: number;
  minimumPayment?: number;
  endDate?: string;
  status?: DebtStatus;
}

interface CreatePaymentData {
  amount: number;
  paymentDate: string;
  principalPaid: number;
  interestPaid: number;
}

interface DebtFilter {
  userId: string;
  type?: DebtType | DebtType[];
  status?: DebtStatus | DebtStatus[];
  deletedAt?: 'null' | 'not-null';
}
```

**What Belongs Here:**
- ✅ Debt CRUD operations
- ✅ Payment history tracking
- ✅ Simple aggregations (sum)

**What Does NOT Belong Here:**
- ❌ EMI calculation (Financial Engine)
- ❌ Amortization schedule (Financial Engine)
- ❌ Payoff strategy (application layer)
- ❌ Auto-completion logic (application layer)

**Transaction Boundaries:**
- Debt creation: May include allocation recalculation
- Payment recording: Update debt balance + create payment record

---

### 6. AllocationRepository

**Purpose:** Manage monthly budget allocations

**Responsibilities:**
- Allocation CRUD operations
- Monthly allocation lookups
- Historical tracking

**Public Methods:**

```typescript
interface IAllocationRepository {
  // Create
  create(data: CreateAllocationData): Promise<Allocation>;
  upsert(data: CreateAllocationData): Promise<Allocation>;
  
  // Read
  findById(id: string): Promise<Allocation | null>;
  findByUserId(userId: string): Promise<Allocation[]>;
  findCurrent(userId: string): Promise<Allocation | null>;
  findByMonth(userId: string, month: number, year: number): Promise<Allocation | null>;
  findByYear(userId: string, year: number): Promise<Allocation[]>;
  findRecent(userId: string, count: number): Promise<Allocation[]>;
  
  // Update
  update(id: string, data: UpdateAllocationData): Promise<Allocation>;
  updateByMonth(
    userId: string, 
    month: number, 
    year: number, 
    data: UpdateAllocationData
  ): Promise<Allocation>;
  
  // Delete (rare - historical data)
  delete(id: string): Promise<Allocation>;
  
  // Queries
  exists(userId: string, month: number, year: number): Promise<boolean>;
}

interface CreateAllocationData {
  userId: string;
  month: number; // 1-12
  year: number;
  essentialExpenses: number;
  debtPayments: number;
  emergencyFund: number;
  goalSavings: number;
  investments: number;
  discretionary: number;
  totalIncome: number;
  totalAllocated: number;
  warning?: string;
  warningMessage?: string;
}

interface UpdateAllocationData {
  essentialExpenses?: number;
  debtPayments?: number;
  emergencyFund?: number;
  goalSavings?: number;
  investments?: number;
  discretionary?: number;
  totalIncome?: number;
  totalAllocated?: number;
  warning?: string;
  warningMessage?: string;
}
```

**What Belongs Here:**
- ✅ Allocation CRUD operations
- ✅ Monthly/yearly lookups
- ✅ Historical tracking

**What Does NOT Belong Here:**
- ❌ Allocation calculation (Financial Engine)
- ❌ Waterfall logic (Financial Engine)
- ❌ Validation (total <= income) (application layer)

**Transaction Boundaries:**
- Allocation creation/update: Part of goal/expense/debt change transaction

---

### 7. ConversationRepository

**Purpose:** Manage AI chat conversations and messages

**Responsibilities:**
- Conversation CRUD operations
- Message management
- Conversation history

**Public Methods:**

```typescript
interface IConversationRepository {
  // Create
  create(data: CreateConversationData): Promise<Conversation>;
  createMessage(conversationId: string, data: CreateMessageData): Promise<Message>;
  
  // Read
  findById(id: string): Promise<Conversation | null>;
  findByUserId(userId: string): Promise<Conversation[]>;
  findRecent(userId: string, limit: number): Promise<Conversation[]>;
  findWithMessages(id: string): Promise<ConversationWithMessages | null>;
  getMessages(conversationId: string): Promise<Message[]>;
  count(userId: string): Promise<number>;
  
  // Update
  update(id: string, data: UpdateConversationData): Promise<Conversation>;
  updateTitle(id: string, title: string): Promise<Conversation>;
  
  // Delete
  softDelete(id: string): Promise<Conversation>;
  restore(id: string): Promise<Conversation>;
  deleteMessage(messageId: string): Promise<void>;
  
  // Queries
  getLatestMessage(conversationId: string): Promise<Message | null>;
}

interface CreateConversationData {
  userId: string;
  title?: string;
}

interface UpdateConversationData {
  title?: string;
}

interface CreateMessageData {
  role: MessageRole;
  content: string;
  metadata?: Record<string, any>;
}
```

**What Belongs Here:**
- ✅ Conversation CRUD operations
- ✅ Message management
- ✅ History retrieval

**What Does NOT Belong Here:**
- ❌ Intent extraction (AI service)
- ❌ Response generation (AI service)
- ❌ Calculation execution (Financial Engine)

**Transaction Boundaries:**
- Message creation: May include simulation creation

---

### 8. SimulationRepository

**Purpose:** Manage what-if scenario history

**Responsibilities:**
- Simulation CRUD operations
- Historical tracking
- Type-based filtering

**Public Methods:**

```typescript
interface ISimulationRepository {
  // Create
  create(data: CreateSimulationData): Promise<Simulation>;
  
  // Read
  findById(id: string): Promise<Simulation | null>;
  findByUserId(userId: string): Promise<Simulation[]>;
  findByType(userId: string, type: SimulationType): Promise<Simulation[]>;
  findRecent(userId: string, limit: number): Promise<Simulation[]>;
  count(filter: SimulationFilter): Promise<number>;
  
  // Update (rare - simulations are immutable)
  
  // Delete
  delete(id: string): Promise<Simulation>;
  
  // Queries
  getLatestByType(userId: string, type: SimulationType): Promise<Simulation | null>;
}

interface CreateSimulationData {
  userId: string;
  type: SimulationType;
  input: Record<string, any>;
  output: Record<string, any>;
}

interface SimulationFilter {
  userId: string;
  type?: SimulationType | SimulationType[];
  createdAfter?: Date;
  createdBefore?: Date;
}
```

**What Belongs Here:**
- ✅ Simulation CRUD operations
- ✅ Historical tracking
- ✅ Type filtering

**What Does NOT Belong Here:**
- ❌ Simulation execution (Financial Engine)
- ❌ Result interpretation (AI service)

**Transaction Boundaries:**
- Simulation creation: Single operation (immutable)

---

## Common Patterns

### Pagination

All repositories support pagination for list operations:

```typescript
interface PaginationOptions {
  page: number;
  pageSize: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Usage
async findMany(
  filter: GoalFilter, 
  pagination: PaginationOptions
): Promise<PaginatedResult<Goal>> {
  const skip = (pagination.page - 1) * pagination.pageSize;
  
  const [data, total] = await Promise.all([
    this.db.goal.findMany({
      where: this.buildWhere(filter),
      skip,
      take: pagination.pageSize,
      orderBy: { [pagination.orderBy || 'createdAt']: pagination.orderDirection || 'desc' }
    }),
    this.db.goal.count({ where: this.buildWhere(filter) })
  ]);
  
  return {
    data,
    total,
    page: pagination.page,
    pageSize: pagination.pageSize,
    totalPages: Math.ceil(total / pagination.pageSize)
  };
}
```

### Soft Delete

All repositories handle soft delete consistently:

```typescript
// Soft delete
async softDelete(id: string): Promise<Goal> {
  return this.db.goal.update({
    where: { id },
    data: { deletedAt: new Date() }
  });
}

// Restore
async restore(id: string): Promise<Goal> {
  return this.db.goal.update({
    where: { id },
    data: { deletedAt: null }
  });
}

// Filter active records
async findActiveByUserId(userId: string): Promise<Goal[]> {
  return this.db.goal.findMany({
    where: { 
      userId, 
      deletedAt: null // Always filter soft-deleted
    }
  });
}
```

### Error Handling

Repositories throw consistent errors:

```typescript
class RepositoryError extends Error {
  constructor(
    message: string,
    public code: string,
    public cause?: unknown
  ) {
    super(message);
    this.name = 'RepositoryError';
  }
}

// Usage
async findById(id: string): Promise<Goal | null> {
  try {
    return await this.db.goal.findUnique({ where: { id } });
  } catch (error) {
    throw new RepositoryError(
      `Failed to find goal: ${id}`,
      'FIND_FAILED',
      error
    );
  }
}
```

---

## Repository Base Class

All repositories extend a base class for common functionality:

```typescript
abstract class BaseRepository<T> {
  constructor(protected db: PrismaClient) {}
  
  // Common error handling
  protected handleError(error: unknown, operation: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002':
          throw new RepositoryError('Duplicate record', 'DUPLICATE', error);
        case 'P2025':
          throw new RepositoryError('Record not found', 'NOT_FOUND', error);
        default:
          throw new RepositoryError(`Database error: ${error.code}`, 'DB_ERROR', error);
      }
    }
    throw new RepositoryError(`${operation} failed`, 'OPERATION_FAILED', error);
  }
  
  // Common soft delete filter
  protected activeCriteria() {
    return { deletedAt: null };
  }
}
```

---

## Testing Repositories

### Unit Tests

```typescript
describe('GoalRepository', () => {
  let repository: GoalRepository;
  let db: PrismaClient;
  
  beforeEach(async () => {
    db = new PrismaClient();
    repository = new GoalRepository(db);
    await db.goal.deleteMany();
  });
  
  afterEach(async () => {
    await db.$disconnect();
  });
  
  describe('create', () => {
    it('should create goal', async () => {
      const goal = await repository.create({
        userId: 'user_123',
        name: 'House',
        type: 'HOUSE',
        targetAmount: 500000,
        targetDate: '2026-12-31',
        priority: 'HIGH'
      });
      
      expect(goal.id).toBeDefined();
      expect(goal.name).toBe('House');
    });
  });
  
  describe('findActiveByUserId', () => {
    it('should return only active goals', async () => {
      await repository.create({ /* active goal */ });
      const deleted = await repository.create({ /* goal */ });
      await repository.softDelete(deleted.id);
      
      const goals = await repository.findActiveByUserId('user_123');
      
      expect(goals).toHaveLength(1);
    });
  });
});
```

---

## Summary

### Repository Count: 8

1. UserRepository
2. FinancialProfileRepository
3. GoalRepository
4. ExpenseRepository
5. DebtRepository
6. AllocationRepository
7. ConversationRepository
8. SimulationRepository

### Total Public Methods: ~120+

Each repository provides:
- CRUD operations
- Domain-specific queries
- Soft delete management
- Pagination support
- Error handling

### Key Principles

✅ **Pure Data Access** - No business logic  
✅ **Clean Interfaces** - Clear public APIs  
✅ **Consistent Patterns** - Pagination, soft delete, errors  
✅ **Type Safety** - Full TypeScript types  
✅ **Testability** - Easy to mock and test  

---

## Conclusion

This repository design provides:
- Clean separation between data access and business logic
- Consistent interfaces across all repositories
- Type-safe operations
- Testable architecture
- Future extensibility

**Status:** Ready for implementation

**Next Steps:**
1. Implement base repository class
2. Implement individual repositories
3. Write comprehensive tests
4. Integrate with application layer

---

**Document Version:** 1.0  
**Last Updated:** June 30, 2026  
**Next Review:** After Phase 2 implementation
