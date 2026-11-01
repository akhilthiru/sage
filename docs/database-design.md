# Sage: Database Design

## Overview

Sage uses PostgreSQL as the primary database with Prisma as the ORM. The schema is designed for:
- Data integrity
- Audit trails
- Scalability
- Type safety
- Query performance

## Design Principles

### 1. Normalization
- Avoid data duplication
- Use foreign keys for relationships
- Separate concerns into distinct tables

### 2. Audit Trails
- Track creation and update timestamps
- Soft deletes where applicable
- Maintain history for financial data

### 3. Type Safety
- Use appropriate data types
- Leverage Prisma's type generation
- Validate at database level

### 4. Performance
- Index frequently queried fields
- Optimize for common access patterns
- Use appropriate column types

## Core Schema

### User Management

```prisma
model User {
  id            String   @id @default(cuid())
  clerkId       String   @unique
  email         String   @unique
  firstName     String?
  lastName      String?
  imageUrl      String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  deletedAt     DateTime?
  
  // Relations
  profile       FinancialProfile?
  goals         Goal[]
  expenses      Expense[]
  debts         Debt[]
  assets        Asset[]
  transactions  Transaction[]
  conversations Conversation[]
  allocations   Allocation[]
  simulations   Simulation[]
  
  @@index([clerkId])
  @@index([email])
}
```

**Design Notes:**
- `clerkId` links to Clerk authentication
- Soft delete with `deletedAt`
- All user data cascades from this table

---

### Financial Profile

```prisma
model FinancialProfile {
  id                      String   @id @default(cuid())
  userId                  String   @unique
  
  // Income
  monthlyIncome           Decimal  @db.Decimal(12, 2)
  otherIncome             Decimal  @default(0) @db.Decimal(12, 2)
  incomeFrequency         IncomeFrequency @default(MONTHLY)
  
  // Savings
  currentSavings          Decimal  @db.Decimal(12, 2)
  emergencyFundTarget     Decimal? @db.Decimal(12, 2)
  currentEmergencyFund    Decimal  @default(0) @db.Decimal(12, 2)
  
  // Metadata
  primaryGoal             String?
  riskTolerance           RiskTolerance @default(MODERATE)
  cfoUnderstandingScore   Int      @default(0)
  
  // Timestamps
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt
  
  // Relations
  user                    User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
}

enum IncomeFrequency {
  MONTHLY
  ANNUAL
  WEEKLY
  BIWEEKLY
}

enum RiskTolerance {
  CONSERVATIVE
  MODERATE
  AGGRESSIVE
}
```

**Design Notes:**
- Uses `Decimal` for precise financial calculations
- `cfoUnderstandingScore` tracks profile completeness
- One-to-one relationship with User

---

### Goals

```prisma
model Goal {
  id              String     @id @default(cuid())
  userId          String
  
  // Goal Details
  name            String
  description     String?
  type            GoalType
  
  // Financial
  targetAmount    Decimal    @db.Decimal(12, 2)
  currentAmount   Decimal    @default(0) @db.Decimal(12, 2)
  monthlyContribution Decimal @default(0) @db.Decimal(12, 2)
  
  // Timeline
  targetDate      DateTime
  startDate       DateTime   @default(now())
  completedDate   DateTime?
  
  // Priority & Status
  priority        Priority   @default(MEDIUM)
  status          GoalStatus @default(ACTIVE)
  
  // Feasibility
  isFeasible      Boolean    @default(true)
  feasibilityScore Int       @default(100)
  
  // Metadata
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt
  deletedAt       DateTime?
  
  // Relations
  user            User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  transactions    Transaction[]
  milestones      GoalMilestone[]
  
  @@index([userId])
  @@index([status])
  @@index([userId, status])
  @@index([targetDate])
}

enum GoalType {
  EMERGENCY_FUND
  HOUSE
  CAR
  VACATION
  WEDDING
  EDUCATION
  RETIREMENT
  CUSTOM
}

enum Priority {
  HIGH
  MEDIUM
  LOW
}

enum GoalStatus {
  ACTIVE
  PAUSED
  COMPLETED
  CANCELLED
}
```

**Design Notes:**
- Tracks both target and current amounts
- Feasibility calculated and stored
- Soft delete for historical tracking
- Indexed for common queries

---

### Goal Milestones

```prisma
model GoalMilestone {
  id              String   @id @default(cuid())
  goalId          String
  
  // Milestone Details
  name            String
  targetAmount    Decimal  @db.Decimal(12, 2)
  targetDate      DateTime
  
  // Status
  isCompleted     Boolean  @default(false)
  completedDate   DateTime?
  
  // Timestamps
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  // Relations
  goal            Goal     @relation(fields: [goalId], references: [id], onDelete: Cascade)
  
  @@index([goalId])
  @@index([targetDate])
}
```

**Design Notes:**
- Breaks large goals into smaller milestones
- Tracks completion separately

---

### Expenses

```prisma
model Expense {
  id              String         @id @default(cuid())
  userId          String
  
  // Expense Details
  name            String
  amount          Decimal        @db.Decimal(12, 2)
  category        ExpenseCategory
  frequency       Frequency      @default(MONTHLY)
  
  // Status
  isEssential     Boolean        @default(false)
  isActive        Boolean        @default(true)
  
  // Timestamps
  startDate       DateTime       @default(now())
  endDate         DateTime?
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  deletedAt       DateTime?
  
  // Relations
  user            User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@index([category])
  @@index([userId, isActive])
}

enum ExpenseCategory {
  RENT
  UTILITIES
  GROCERIES
  TRANSPORTATION
  HEALTHCARE
  INSURANCE
  ENTERTAINMENT
  DINING
  SHOPPING
  EDUCATION
  OTHER
}

enum Frequency {
  DAILY
  WEEKLY
  BIWEEKLY
  MONTHLY
  QUARTERLY
  ANNUAL
  ONE_TIME
}
```

**Design Notes:**
- Recurring expenses tracked separately
- Essential vs discretionary flag
- Soft delete for history

---

### Debts

```prisma
model Debt {
  id                String    @id @default(cuid())
  userId            String
  
  // Debt Details
  name              String
  type              DebtType
  principalAmount   Decimal   @db.Decimal(12, 2)
  currentBalance    Decimal   @db.Decimal(12, 2)
  interestRate      Decimal   @db.Decimal(5, 2)
  
  // Payment
  monthlyPayment    Decimal   @db.Decimal(12, 2)
  minimumPayment    Decimal   @db.Decimal(12, 2)
  
  // Timeline
  startDate         DateTime
  endDate           DateTime?
  
  // Status
  status            DebtStatus @default(ACTIVE)
  
  // Timestamps
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  deletedAt         DateTime?
  
  // Relations
  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  payments          DebtPayment[]
  
  @@index([userId])
  @@index([status])
  @@index([userId, status])
}

enum DebtType {
  HOME_LOAN
  CAR_LOAN
  PERSONAL_LOAN
  EDUCATION_LOAN
  CREDIT_CARD
  OTHER
}

enum DebtStatus {
  ACTIVE
  PAID_OFF
  DEFAULTED
}
```

**Design Notes:**
- Tracks principal and current balance
- Interest rate for calculations
- Payment history in separate table

---

### Debt Payments

```prisma
model DebtPayment {
  id              String   @id @default(cuid())
  debtId          String
  
  // Payment Details
  amount          Decimal  @db.Decimal(12, 2)
  principalPaid   Decimal  @db.Decimal(12, 2)
  interestPaid    Decimal  @db.Decimal(12, 2)
  
  // Timing
  paymentDate     DateTime
  dueDate         DateTime
  
  // Status
  status          PaymentStatus @default(PENDING)
  
  // Timestamps
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  // Relations
  debt            Debt     @relation(fields: [debtId], references: [id], onDelete: Cascade)
  
  @@index([debtId])
  @@index([paymentDate])
  @@index([status])
}

enum PaymentStatus {
  PENDING
  COMPLETED
  MISSED
  PARTIAL
}
```

**Design Notes:**
- Tracks payment breakdown
- Enables payment history analysis

---

### Assets

```prisma
model Asset {
  id              String    @id @default(cuid())
  userId          String
  
  // Asset Details
  name            String
  type            AssetType
  currentValue    Decimal   @db.Decimal(12, 2)
  purchaseValue   Decimal?  @db.Decimal(12, 2)
  purchaseDate    DateTime?
  
  // Returns (for investments)
  expectedReturn  Decimal?  @db.Decimal(5, 2)
  
  // Status
  isLiquid        Boolean   @default(true)
  
  // Timestamps
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  deletedAt       DateTime?
  
  // Relations
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@index([type])
}

enum AssetType {
  SAVINGS_ACCOUNT
  FIXED_DEPOSIT
  STOCKS
  MUTUAL_FUNDS
  REAL_ESTATE
  GOLD
  PPF
  EPF
  NPS
  OTHER
}
```

**Design Notes:**
- Tracks current and purchase value
- Liquidity flag for planning
- Expected returns for projections

---

### Transactions

```prisma
model Transaction {
  id              String          @id @default(cuid())
  userId          String
  goalId          String?
  
  // Transaction Details
  amount          Decimal         @db.Decimal(12, 2)
  type            TransactionType
  category        String?
  description     String?
  
  // Timing
  transactionDate DateTime        @default(now())
  
  // Metadata
  source          String?         // e.g., "manual", "import", "recurring"
  
  // Timestamps
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  
  // Relations
  user            User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  goal            Goal?           @relation(fields: [goalId], references: [id], onDelete: SetNull)
  
  @@index([userId])
  @@index([goalId])
  @@index([transactionDate])
  @@index([userId, transactionDate])
}

enum TransactionType {
  INCOME
  EXPENSE
  GOAL_CONTRIBUTION
  DEBT_PAYMENT
  INVESTMENT
  TRANSFER
}
```

**Design Notes:**
- Generic transaction table
- Links to goals when applicable
- Indexed for time-based queries

---

### Allocations

```prisma
model Allocation {
  id                  String   @id @default(cuid())
  userId              String
  
  // Period
  month               Int
  year                Int
  
  // Allocation Breakdown
  essentialExpenses   Decimal  @db.Decimal(12, 2)
  debtPayments        Decimal  @db.Decimal(12, 2)
  emergencyFund       Decimal  @db.Decimal(12, 2)
  goalSavings         Decimal  @db.Decimal(12, 2)
  investments         Decimal  @db.Decimal(12, 2)
  discretionary       Decimal  @db.Decimal(12, 2)
  
  // Metadata
  totalIncome         Decimal  @db.Decimal(12, 2)
  totalAllocated      Decimal  @db.Decimal(12, 2)
  
  // Status
  isActive            Boolean  @default(true)
  
  // Timestamps
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  
  // Relations
  user                User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([userId, month, year])
  @@index([userId])
  @@index([year, month])
}
```

**Design Notes:**
- Monthly allocation snapshots
- Enables historical tracking
- Unique constraint on user + month + year

---

### Conversations (Chat)

```prisma
model Conversation {
  id              String    @id @default(cuid())
  userId          String
  
  // Conversation Details
  title           String?
  
  // Timestamps
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  // Relations
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages        Message[]
  
  @@index([userId])
  @@index([createdAt])
}

model Message {
  id              String       @id @default(cuid())
  conversationId  String
  
  // Message Details
  role            MessageRole
  content         String       @db.Text
  
  // Metadata
  metadata        Json?        // Store structured data, calculations, etc.
  
  // Timestamps
  createdAt       DateTime     @default(now())
  
  // Relations
  conversation    Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  
  @@index([conversationId])
  @@index([createdAt])
}

enum MessageRole {
  USER
  ASSISTANT
  SYSTEM
}
```

**Design Notes:**
- Stores chat history
- Metadata field for structured data
- Enables conversation context

---

### Simulations

```prisma
model Simulation {
  id              String         @id @default(cuid())
  userId          String
  
  // Simulation Details
  type            SimulationType
  parameters      Json           // Store simulation inputs
  results         Json           // Store simulation outputs
  
  // Metadata
  title           String?
  description     String?
  
  // Timestamps
  createdAt       DateTime       @default(now())
  
  // Relations
  user            User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@index([createdAt])
  @@index([type])
}

enum SimulationType {
  PURCHASE_AFFORDABILITY
  LOAN_FEASIBILITY
  GOAL_TIMELINE
  INCOME_CHANGE
  EXPENSE_CHANGE
  RETIREMENT_PLANNING
}
```

**Design Notes:**
- Stores simulation history
- JSON fields for flexibility
- Enables "what-if" tracking

---

## Indexes Strategy

### Primary Indexes (Automatic)
- All `@id` fields
- All `@unique` fields

### Custom Indexes

**User Queries:**
```prisma
@@index([userId])
@@index([userId, status])
@@index([userId, createdAt])
```

**Time-Based Queries:**
```prisma
@@index([createdAt])
@@index([targetDate])
@@index([transactionDate])
```

**Status Queries:**
```prisma
@@index([status])
@@index([isActive])
```

**Composite Queries:**
```prisma
@@index([userId, status])
@@index([userId, transactionDate])
@@index([year, month])
```

---

## Data Types

### Decimal Precision

**Financial Amounts:**
```prisma
amount Decimal @db.Decimal(12, 2)
```
- 12 total digits
- 2 decimal places
- Max: ₹9,99,99,99,999.99

**Interest Rates:**
```prisma
interestRate Decimal @db.Decimal(5, 2)
```
- 5 total digits
- 2 decimal places
- Max: 999.99%

### JSON Fields

Used for flexible, structured data:
```prisma
metadata Json?
parameters Json
results Json
```

**Example Usage:**
```typescript
// Simulation parameters
{
  "purchaseAmount": 50000,
  "paymentMethod": "savings",
  "timeline": 12
}

// Simulation results
{
  "canAfford": true,
  "confidence": 85,
  "impact": {
    "emergencyFund": -50000,
    "goals": [...]
  }
}
```

---

## Relationships

### One-to-One
- User ↔ FinancialProfile

### One-to-Many
- User → Goals
- User → Expenses
- User → Debts
- User → Assets
- User → Transactions
- User → Conversations
- User → Allocations
- Goal → Milestones
- Debt → Payments
- Conversation → Messages

### Optional Relationships
- Transaction → Goal (nullable)

---

## Soft Deletes

Tables with soft delete:
- User
- Goal
- Expense
- Debt
- Asset

**Implementation:**
```prisma
deletedAt DateTime?

// Query only active records
where: { deletedAt: null }

// Soft delete
update: { deletedAt: new Date() }
```

---

## Audit Trail

All tables include:
```prisma
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
```

This enables:
- Change tracking
- Historical analysis
- Debugging
- Compliance

---

## Data Migration Strategy

### Initial Setup
```bash
npx prisma migrate dev --name init
```

### Adding Fields
```bash
npx prisma migrate dev --name add_field_name
```

### Schema Changes
1. Update `schema.prisma`
2. Create migration: `npx prisma migrate dev`
3. Review SQL in `migrations/`
4. Test in development
5. Deploy to production

---

## Seed Data

```typescript
// prisma/seed.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create test user
  const user = await prisma.user.create({
    data: {
      clerkId: 'test_user_1',
      email: 'test@sage.app',
      profile: {
        create: {
          monthlyIncome: 80000,
          currentSavings: 100000,
          emergencyFundTarget: 240000,
        }
      }
    }
  });

  // Create test goal
  await prisma.goal.create({
    data: {
      userId: user.id,
      name: 'House Down Payment',
      type: 'HOUSE',
      targetAmount: 500000,
      targetDate: new Date('2028-01-01'),
      priority: 'HIGH',
    }
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

---

## Query Examples

### Get User Financial Overview
```typescript
const overview = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    profile: true,
    goals: {
      where: { status: 'ACTIVE' },
      orderBy: { priority: 'desc' }
    },
    expenses: {
      where: { isActive: true }
    },
    debts: {
      where: { status: 'ACTIVE' }
    },
    assets: true,
  }
});
```

### Get Monthly Allocation
```typescript
const allocation = await prisma.allocation.findUnique({
  where: {
    userId_month_year: {
      userId,
      month: 6,
      year: 2026
    }
  }
});
```

### Get Goal Progress
```typescript
const goal = await prisma.goal.findUnique({
  where: { id: goalId },
  include: {
    transactions: {
      where: { type: 'GOAL_CONTRIBUTION' },
      orderBy: { transactionDate: 'desc' }
    },
    milestones: {
      orderBy: { targetDate: 'asc' }
    }
  }
});
```

### Get Recent Conversations
```typescript
const conversations = await prisma.conversation.findMany({
  where: { userId },
  include: {
    messages: {
      orderBy: { createdAt: 'asc' },
      take: 10
    }
  },
  orderBy: { updatedAt: 'desc' },
  take: 5
});
```

---

## Performance Considerations

### Connection Pooling
```typescript
// lib/db.ts
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});
```

### Query Optimization
```typescript
// ❌ Bad: Multiple queries
const user = await prisma.user.findUnique({ where: { id } });
const goals = await prisma.goal.findMany({ where: { userId: id } });

// ✅ Good: Single query with include
const user = await prisma.user.findUnique({
  where: { id },
  include: { goals: true }
});
```

### Pagination
```typescript
const goals = await prisma.goal.findMany({
  where: { userId },
  take: 20,
  skip: page * 20,
  orderBy: { createdAt: 'desc' }
});
```

---

## Backup Strategy

### Automated Backups
- Daily full backups
- Point-in-time recovery
- 30-day retention

### Manual Backup
```bash
pg_dump $DATABASE_URL > backup.sql
```

### Restore
```bash
psql $DATABASE_URL < backup.sql
```

---

## Security

### Row-Level Security (Future)
```sql
-- Enable RLS
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own goals
CREATE POLICY user_goals ON goals
  FOR ALL
  USING (user_id = current_user_id());
```

### Encryption
- Database encryption at rest
- TLS for connections
- Sensitive fields encrypted (future)

---

## Monitoring

### Slow Query Log
```typescript
const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'stdout' },
  ],
});

prisma.$on('query', (e) => {
  if (e.duration > 1000) {
    console.warn('Slow query:', e.query, e.duration);
  }
});
```

---

## Complete Schema File

See `/prisma/schema.prisma` for the complete, production-ready schema.

---

## Conclusion

This database design:
- ✅ Supports all MVP features
- ✅ Maintains data integrity
- ✅ Enables audit trails
- ✅ Optimizes for common queries
- ✅ Scales to 100k+ users
- ✅ Provides type safety with Prisma
- ✅ Allows for future extensions

The schema is normalized, indexed, and ready for production use.
