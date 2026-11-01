# Database Implementation Plan

**Package:** `@sage/database`  
**Purpose:** Production-ready persistence layer for Sage AI Personal CFO  
**Date:** June 30, 2026  
**Status:** Design Phase - Documentation Only

---

## Executive Summary

This document outlines the complete implementation plan for the Sage database layer, designed as a clean persistence abstraction that integrates with the Financial Engine while maintaining strict separation of concerns.

**Key Principles:**
- PostgreSQL with Prisma ORM
- Repository Pattern for data access
- No business logic in repositories
- Financial Engine remains persistence-agnostic
- Application Layer orchestrates repositories and Financial Engine

---

## Architecture Overview

### Layered Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Application Layer                       │
│         (Server Actions - Orchestration)                 │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Financial  │  │  Repository  │  │   Database   │  │
│  │    Engine    │  │   Pattern    │  │    Layer     │  │
│  │  (Pure TS)   │  │  (Adapter)   │  │   (Prisma)   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Separation of Concerns

**Financial Engine:**
- Pure TypeScript functions
- No database dependencies
- Receives plain objects
- Returns calculated results

**Repository Layer:**
- Data access abstraction
- CRUD operations only
- No business logic
- Maps between domain and persistence

**Application Layer:**
- Orchestrates repositories and engine
- Handles transactions
- Implements workflows
- Enforces business rules

---

## Package Structure

```
packages/database/
├── prisma/
│   ├── schema.prisma           # Prisma schema definition
│   ├── migrations/             # Database migrations
│   │   └── [timestamp]_[name]/ # Individual migrations
│   └── seed.ts                 # Seed data script
│
├── src/
│   ├── client.ts               # Prisma client singleton
│   ├── repositories/           # Repository implementations
│   │   ├── user.repository.ts
│   │   ├── financial-profile.repository.ts
│   │   ├── goal.repository.ts
│   │   ├── expense.repository.ts
│   │   ├── debt.repository.ts
│   │   ├── allocation.repository.ts
│   │   ├── conversation.repository.ts
│   │   └── simulation.repository.ts
│   │
│   ├── types/                  # TypeScript types
│   │   ├── repository.types.ts # Repository interfaces
│   │   └── domain.types.ts     # Domain model types
│   │
│   ├── utils/                  # Utility functions
│   │   ├── encryption.ts       # Field encryption
│   │   ├── pagination.ts       # Pagination helpers
│   │   └── query-builder.ts    # Query utilities
│   │
│   └── index.ts                # Public API exports
│
├── docs/                       # Documentation
│   ├── database-implementation-plan.md (this file)
│   ├── prisma-schema-review.md
│   ├── repository-design.md
│   ├── transaction-strategy.md
│   ├── indexing-strategy.md
│   ├── encryption-strategy.md
│   ├── migration-strategy.md
│   └── seeding-strategy.md
│
├── tests/                      # Test files
│   ├── repositories/
│   └── integration/
│
├── package.json
├── tsconfig.json
└── README.md
```

---

## Core Design Decisions

### 1. Repository Pattern

**Why Repository Pattern?**
- Abstracts data access from business logic
- Makes testing easier (mock repositories)
- Provides clean API for application layer
- Enables future database changes
- Maintains separation of concerns

**What Repositories Do:**
- CRUD operations (Create, Read, Update, Delete)
- Query building and filtering
- Pagination and sorting
- Data mapping (Prisma ↔ Domain)

**What Repositories DON'T Do:**
- Business logic (belongs in application layer)
- Financial calculations (belongs in Financial Engine)
- Validation (belongs in application layer with Zod)
- Authorization (belongs in application layer)

### 2. No Business Logic in Database Layer

**Critical Rule:** Database layer is a pure persistence adapter.

**Example - WRONG:**
```typescript
// ❌ Repository calculating allocation
class AllocationRepository {
  async createAllocation(userId: string) {
    const profile = await this.getProfile(userId);
    const allocation = calculateAllocation(profile); // NO!
    return this.save(allocation);
  }
}
```

**Example - CORRECT:**
```typescript
// ✅ Application layer orchestrates
async function createAllocation(userId: string) {
  // 1. Fetch data via repository
  const profile = await profileRepo.findByUserId(userId);
  const goals = await goalRepo.findActiveByUserId(userId);
  const expenses = await expenseRepo.findActiveByUserId(userId);
  
  // 2. Calculate via Financial Engine
  const result = calculateAllocation({
    monthlyIncome: profile.monthlyIncome,
    goals: goals.map(mapGoalToDomain),
    expenses: expenses.map(mapExpenseToDomain)
  });
  
  // 3. Save via repository
  if (result.success) {
    return allocationRepo.create(result.data);
  }
}
```

### 3. Financial Engine Independence

**The Financial Engine must never import from database layer.**

**Dependency Flow:**
```
Application Layer
    ↓ (imports)
Repository Layer
    ↓ (imports)
Prisma Client

Financial Engine (INDEPENDENT - no imports from above)
```

**Integration Pattern:**
```typescript
// Application layer maps database models to engine inputs
const engineInput = {
  monthlyIncome: profile.monthlyIncome.toNumber(),
  currentSavings: profile.currentSavings.toNumber(),
  goals: goals.map(g => ({
    targetAmount: g.targetAmount.toNumber(),
    currentAmount: g.currentAmount.toNumber(),
    targetDate: g.targetDate.toISOString()
  }))
};

// Call engine
const result = calculateAllocation(engineInput);

// Map engine output back to database models
const allocationData = {
  userId: profile.userId,
  essentialExpenses: new Prisma.Decimal(result.essentialExpenses),
  goalSavings: new Prisma.Decimal(result.goalSavings)
};
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
**Goal:** Set up package structure and core infrastructure

**Tasks:**
1. Initialize `@sage/database` package
2. Configure Prisma with PostgreSQL
3. Create initial schema (User, FinancialProfile)
4. Set up Prisma client singleton
5. Configure TypeScript
6. Set up testing framework
7. Create base repository interfaces

**Deliverables:**
- Working Prisma setup
- User and FinancialProfile tables
- Basic repository pattern
- Test infrastructure

### Phase 2: Core Entities (Week 2)
**Goal:** Implement primary domain entities

**Tasks:**
1. Complete Prisma schema for all entities
2. Implement repositories:
   - UserRepository
   - FinancialProfileRepository
   - GoalRepository
   - ExpenseRepository
   - DebtRepository
3. Add encryption for sensitive fields
4. Create indexes for performance
5. Write repository tests

**Deliverables:**
- Complete schema
- 5 core repositories
- Encryption working
- 80%+ test coverage

### Phase 3: Supporting Entities (Week 3)
**Goal:** Implement remaining entities

**Tasks:**
1. Implement repositories:
   - AllocationRepository
   - ConversationRepository
   - MessageRepository
   - SimulationRepository
2. Add transaction support
3. Implement soft delete
4. Create seed data
5. Write integration tests

**Deliverables:**
- All repositories complete
- Transaction support
- Seed data for development
- Integration tests

### Phase 4: Optimization & Polish (Week 4)
**Goal:** Production readiness

**Tasks:**
1. Performance optimization
2. Query optimization
3. Index tuning
4. Connection pooling
5. Error handling
6. Documentation
7. Migration strategy
8. Production deployment guide

**Deliverables:**
- Production-ready package
- Complete documentation
- Migration guide
- Deployment checklist

---

## Repository Design Principles

### Repository Interface Pattern

Each repository follows a consistent interface:

```typescript
interface IRepository<T> {
  // Create
  create(data: CreateInput): Promise<T>;
  createMany(data: CreateInput[]): Promise<T[]>;
  
  // Read
  findById(id: string): Promise<T | null>;
  findMany(filter: FilterInput): Promise<T[]>;
  findFirst(filter: FilterInput): Promise<T | null>;
  count(filter: FilterInput): Promise<number>;
  
  // Update
  update(id: string, data: UpdateInput): Promise<T>;
  updateMany(filter: FilterInput, data: UpdateInput): Promise<number>;
  
  // Delete
  delete(id: string): Promise<T>;
  softDelete(id: string): Promise<T>;
  restore(id: string): Promise<T>;
}
```

### Domain-Specific Methods

Repositories can add domain-specific query methods:

```typescript
interface IGoalRepository extends IRepository<Goal> {
  findActiveByUserId(userId: string): Promise<Goal[]>;
  findByType(userId: string, type: GoalType): Promise<Goal[]>;
  findDueWithin(userId: string, months: number): Promise<Goal[]>;
  hasEmergencyFundGoal(userId: string): Promise<boolean>;
}
```

---

## Transaction Strategy

### Transaction Boundaries

**Rule:** Transactions wrap complete business workflows.

**Example Workflows:**

1. **User Onboarding**
   ```typescript
   await db.$transaction(async (tx) => {
     const user = await tx.user.create({ data: userData });
     const profile = await tx.financialProfile.create({ 
       data: { userId: user.id, ...profileData } 
     });
     const emergencyGoal = await tx.goal.create({
       data: { userId: user.id, type: 'EMERGENCY_FUND', ...goalData }
     });
   });
   ```

2. **Goal Creation with Allocation Recalculation**
   ```typescript
   await db.$transaction(async (tx) => {
     const goal = await tx.goal.create({ data: goalData });
     await tx.allocation.update({
       where: { userId_month_year: { userId, month, year } },
       data: newAllocationData
     });
   });
   ```

3. **Simulation History**
   ```typescript
   await db.$transaction(async (tx) => {
     const simulation = await tx.simulation.create({
       data: { type, input, output }
     });
     await tx.conversation.update({
       where: { id: conversationId },
       data: { updatedAt: new Date() }
     });
   });
   ```

### Rollback Scenarios

Transactions automatically rollback on:
- Database constraint violations
- Application errors
- Validation failures
- Network issues

**No manual rollback needed** - Prisma handles it.

---

## Data Integrity

### Constraints

**Database-Level:**
- Primary keys (all tables)
- Unique constraints (email, clerkId, userId for profiles)
- Foreign keys (all relationships)
- Check constraints (amounts > 0)
- Not null constraints (required fields)

**Application-Level:**
- Zod validation before database operations
- Business rule enforcement
- Cross-entity validation

### Cascade Rules

**User Deletion:**
```prisma
model FinancialProfile {
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**Cascade Strategy:**
- User deleted → All user data soft-deleted
- Goal deleted → Milestones soft-deleted
- Debt deleted → Payments retained (audit trail)
- Conversation deleted → Messages deleted

---

## Performance Considerations

### Query Optimization

**N+1 Query Prevention:**
```typescript
// ❌ BAD: N+1 queries
const goals = await goalRepo.findByUserId(userId);
for (const goal of goals) {
  goal.milestones = await milestoneRepo.findByGoalId(goal.id);
}

// ✅ GOOD: Single query with includes
const goals = await goalRepo.findByUserIdWithMilestones(userId);
```

**Pagination:**
```typescript
interface PaginationInput {
  page: number;
  pageSize: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

async findMany(filter: FilterInput, pagination: PaginationInput) {
  const skip = (pagination.page - 1) * pagination.pageSize;
  return db.goal.findMany({
    where: filter,
    skip,
    take: pagination.pageSize,
    orderBy: { [pagination.orderBy]: pagination.orderDirection }
  });
}
```

### Connection Pooling

**Vercel Serverless:**
- Use Prisma connection pooling
- Configure connection limits
- Handle cold starts

**Configuration:**
```typescript
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

---

## Error Handling

### Repository Error Pattern

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
try {
  return await db.goal.create({ data });
} catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      throw new RepositoryError(
        'Duplicate goal found',
        'DUPLICATE_GOAL',
        error
      );
    }
  }
  throw new RepositoryError(
    'Failed to create goal',
    'CREATE_FAILED',
    error
  );
}
```

---

## Testing Strategy

### Unit Tests (Repositories)

```typescript
describe('GoalRepository', () => {
  let repository: GoalRepository;
  let db: PrismaClient;
  
  beforeEach(async () => {
    db = new PrismaClient();
    repository = new GoalRepository(db);
    await db.goal.deleteMany(); // Clean slate
  });
  
  it('should create goal', async () => {
    const goal = await repository.create({
      userId: 'user_123',
      name: 'House',
      targetAmount: 500000,
      targetDate: '2026-12-31'
    });
    
    expect(goal.id).toBeDefined();
    expect(goal.name).toBe('House');
  });
});
```

### Integration Tests (Workflows)

```typescript
describe('User Onboarding Workflow', () => {
  it('should create user with profile and emergency goal', async () => {
    const result = await onboardUser({
      email: 'test@example.com',
      monthlyIncome: 80000,
      currentSavings: 100000
    });
    
    expect(result.user).toBeDefined();
    expect(result.profile).toBeDefined();
    expect(result.emergencyGoal).toBeDefined();
  });
});
```

---

## Monitoring & Observability

### Query Performance Monitoring

```typescript
// Prisma middleware for logging slow queries
prisma.$use(async (params, next) => {
  const before = Date.now();
  const result = await next(params);
  const after = Date.now();
  
  const duration = after - before;
  if (duration > 100) { // Log queries > 100ms
    logger.warn({
      model: params.model,
      action: params.action,
      duration,
      args: params.args
    }, 'Slow query detected');
  }
  
  return result;
});
```

### Metrics to Track

- Query execution time (p50, p95, p99)
- Connection pool utilization
- Transaction success/failure rate
- Repository method call frequency
- Database error rate

---

## Security Considerations

### Row-Level Security

**Always filter by userId:**
```typescript
// Every query includes userId check
async findByUserId(userId: string) {
  return db.goal.findMany({
    where: { 
      userId,           // Security filter
      deletedAt: null   // Soft delete filter
    }
  });
}
```

### Sensitive Data Handling

**Encryption at rest:**
- Income amounts
- Savings balances
- Debt amounts
- Goal amounts

**Logging:**
- Never log sensitive amounts
- Redact PII in error messages
- Use structured logging

---

## Migration Strategy

### Development Workflow

```bash
# Create migration
npx prisma migrate dev --name add_feature

# Apply migrations
npx prisma migrate deploy

# Reset database (dev only)
npx prisma migrate reset
```

### Production Workflow

```bash
# Generate migration (no apply)
npx prisma migrate dev --create-only

# Review migration SQL
cat prisma/migrations/[timestamp]_[name]/migration.sql

# Apply to production
npx prisma migrate deploy
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] All migrations tested in staging
- [ ] Indexes created for performance
- [ ] Encryption configured
- [ ] Connection pooling configured
- [ ] Backup strategy in place
- [ ] Rollback plan documented

### Post-Deployment

- [ ] Monitor query performance
- [ ] Check connection pool usage
- [ ] Verify encryption working
- [ ] Test critical workflows
- [ ] Monitor error rates

---

## Success Criteria

### Functional Requirements

- ✅ All entities persisted correctly
- ✅ Repositories provide clean API
- ✅ Transactions work reliably
- ✅ Soft delete implemented
- ✅ Encryption working for sensitive fields

### Non-Functional Requirements

- ✅ Query performance < 200ms (p95)
- ✅ Transaction performance < 500ms (p95)
- ✅ Test coverage > 80%
- ✅ Zero business logic in repositories
- ✅ Financial Engine remains independent

### Quality Requirements

- ✅ Type-safe throughout
- ✅ Well-documented
- ✅ Production-ready error handling
- ✅ Comprehensive tests
- ✅ Clear separation of concerns

---

## Risks & Mitigation

### Risk 1: Performance Degradation

**Risk:** Complex queries slow down as data grows  
**Mitigation:**
- Proper indexing strategy
- Query optimization
- Pagination for large datasets
- Connection pooling
- Monitoring and alerting

### Risk 2: Data Integrity Issues

**Risk:** Inconsistent data across entities  
**Mitigation:**
- Database constraints
- Transactions for workflows
- Validation before persistence
- Comprehensive testing

### Risk 3: Coupling with Financial Engine

**Risk:** Accidentally creating dependencies  
**Mitigation:**
- Strict architectural boundaries
- ESLint rules preventing imports
- Code reviews
- Clear documentation

### Risk 4: Migration Failures

**Risk:** Production migrations fail  
**Mitigation:**
- Test all migrations in staging
- Backup before migrations
- Rollback plan
- Incremental migrations

---

## Next Steps

1. **Review this plan** with team
2. **Create remaining documentation**:
   - Prisma schema review
   - Repository design
   - Transaction strategy
   - Indexing strategy
   - Encryption strategy
   - Migration strategy
   - Seeding strategy
3. **Get approval** for implementation
4. **Begin Phase 1** implementation

---

## Conclusion

This database layer design provides a solid foundation for Sage's persistence needs while maintaining clean architecture and separation of concerns. The repository pattern ensures the Financial Engine remains independent, testable, and reusable.

**Key Takeaway:** The database layer is a pure persistence adapter. All business logic lives in the application layer, all calculations live in the Financial Engine.

**Status:** Ready for implementation upon approval.

---

**Document Version:** 1.0  
**Last Updated:** June 30, 2026  
**Next Review:** After implementation of Phase 1
