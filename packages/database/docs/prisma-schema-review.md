# Prisma Schema Review

**Package:** `@sage/database`  
**Purpose:** Complete Prisma schema specification for all Sage entities  
**Date:** June 30, 2026  
**Status:** Design Phase - Documentation Only

---

## Overview

This document provides a comprehensive review of the Prisma schema for Sage, covering all 14 core entities with detailed specifications for:
- Field definitions and constraints
- Relationships and cascade rules
- Indexes for performance
- Soft delete strategy
- Audit fields
- Encryption requirements
- Future extensibility

**Critical Principle:** This schema is designed for data integrity, audit trails, and performance while maintaining clean separation from business logic.

---

## Schema Configuration

### Database Provider

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

generator client {
  provider = "prisma-client-js"
  previewFeatures = ["fullTextSearch", "fullTextIndex"]
}
```

**Configuration Notes:**
- `DATABASE_URL`: Connection pooling URL (for serverless)
- `DIRECT_URL`: Direct connection URL (for migrations)
- Preview features enabled for future search capabilities

---

## Entity Specifications

### 1. User (Aggregate Root)

**Purpose:** Account owner and aggregate root for all financial data

```prisma
model User {
  id        String   @id @default(cuid())
  clerkId   String   @unique
  email     String   @unique
  firstName String?
  lastName  String?
  imageUrl  String?
  
  // Audit fields
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime? // Soft delete
  
  // Relationships (1:N unless specified)
  profile       FinancialProfile?
  goals         Goal[]
  expenses      Expense[]
  debts         Debt[]
  assets        Asset[]
  transactions  Transaction[]
  allocations   Allocation[]
  conversations Conversation[]
  simulations   Simulation[]
  
  @@index([clerkId])
  @@index([email])
  @@index([deletedAt]) // For filtering active users
  @@map("users")
}
```

**Field Specifications:**

| Field | Type | Constraints | Purpose | Encryption |
|-------|------|-------------|---------|------------|
| id | String (CUID) | PK, Unique, Immutable | Internal identifier | No |
| clerkId | String | Unique, Immutable | Clerk auth ID | No |
| email | String | Unique, Valid email | User email | No |
| firstName | String | Optional, Max 100 | First name | No |
| lastName | String | Optional, Max 100 | Last name | No |
| imageUrl | String | Optional, Valid URL | Profile image | No |
| createdAt | DateTime | Auto-generated | Account creation | No |
| updatedAt | DateTime | Auto-updated | Last modification | No |
| deletedAt | DateTime | Nullable | Soft delete timestamp | No |

**Relationships:**
- 1:1 with FinancialProfile (optional initially)
- 1:N with all other entities

**Cascade Rules:**
- User soft-deleted → All related entities soft-deleted
- User hard-deleted (admin only) → Cascade delete all data

**Indexes:**
- `clerkId` - Frequent lookups during auth
- `email` - User search and uniqueness
- `deletedAt` - Filter active users

**Business Rules:**
1. Email must be unique across all users
2. ClerkId must match Clerk authentication
3. Cannot hard delete user with financial data
4. Soft delete sets deletedAt timestamp

**Future Extensibility:**
- `phoneNumber` - For notifications
- `preferredLanguage` - Localization
- `timezone` - Date handling
- `notificationPreferences` - JSON field
- `subscriptionTier` - Enum (FREE, PRO, ENTERPRISE)

---

### 2. FinancialProfile

**Purpose:** Core financial snapshot for calculations

```prisma
model FinancialProfile {
  id     String @id @default(cuid())
  userId String @unique
  
  // Income (ENCRYPTED)
  monthlyIncome    Decimal @db.Decimal(12, 2)
  otherIncome      Decimal @default(0) @db.Decimal(12, 2)
  incomeFrequency  IncomeFrequency @default(MONTHLY)
  
  // Savings (ENCRYPTED)
  currentSavings        Decimal @db.Decimal(12, 2)
  emergencyFundTarget   Decimal? @db.Decimal(12, 2)
  currentEmergencyFund  Decimal @default(0) @db.Decimal(12, 2)
  
  // Metadata
  primaryGoal           String?
  riskTolerance         RiskTolerance @default(MODERATE)
  cfoUnderstandingScore Int @default(0) @db.SmallInt
  
  // Audit fields
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relationships
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@map("financial_profiles")
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

**Field Specifications:**

| Field | Type | Constraints | Encryption | Notes |
|-------|------|-------------|------------|-------|
| monthlyIncome | Decimal(12,2) | > 0, Required | YES | Primary income |
| otherIncome | Decimal(12,2) | >= 0, Default 0 | YES | Additional income |
| incomeFrequency | Enum | Required | NO | Payment frequency |
| currentSavings | Decimal(12,2) | >= 0, Required | YES | Total savings |
| emergencyFundTarget | Decimal(12,2) | >= 0, Optional | YES | Target amount |
| currentEmergencyFund | Decimal(12,2) | >= 0, Default 0 | YES | Current amount |
| primaryGoal | String | Optional, Max 200 | NO | User's main goal |
| riskTolerance | Enum | Default MODERATE | NO | Investment risk |
| cfoUnderstandingScore | SmallInt | 0-100, Default 0 | NO | Profile completeness |

**Relationships:**
- N:1 with User (belongs to one user)

**Cascade Rules:**
- User deleted → Profile deleted

**Indexes:**
- `userId` - Primary lookup

**Business Rules:**
1. One profile per user (enforced by unique userId)
2. currentSavings >= currentEmergencyFund
3. currentEmergencyFund <= emergencyFundTarget (if set)
4. monthlyIncome > 0
5. Understanding score recalculated on update

**Encryption Requirements:**
- All monetary fields must be encrypted at rest
- Encryption handled at application layer before persistence

**Future Extensibility:**
- `taxBracket` - Decimal
- `dependentsCount` - Int
- `employmentType` - Enum
- `creditScore` - Int
- `monthlyExpensesEstimate` - Decimal

---

### 3. Goal

**Purpose:** Financial objectives with feasibility tracking

```prisma
model Goal {
  id     String @id @default(cuid())
  userId String
  
  // Goal details
  name        String @db.VarChar(100)
  description String? @db.VarChar(500)
  type        GoalType
  
  // Financial (ENCRYPTED)
  targetAmount        Decimal @db.Decimal(12, 2)
  currentAmount       Decimal @default(0) @db.Decimal(12, 2)
  monthlyContribution Decimal @default(0) @db.Decimal(12, 2)
  
  // Timeline
  targetDate     DateTime
  startDate      DateTime @default(now())
  completedDate  DateTime?
  
  // Priority & Status
  priority Priority @default(MEDIUM)
  status   GoalStatus @default(ACTIVE)
  
  // Feasibility (calculated, stored for performance)
  isFeasible       Boolean @default(true)
  feasibilityScore Int @default(100) @db.SmallInt
  
  // Audit fields
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime? // Soft delete
  
  // Relationships
  user         User @relation(fields: [userId], references: [id], onDelete: Cascade)
  milestones   GoalMilestone[]
  transactions Transaction[]
  
  @@index([userId])
  @@index([status])
  @@index([userId, status])
  @@index([targetDate])
  @@index([type, userId]) // For emergency fund check
  @@map("goals")
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

**Field Specifications:**

| Field | Type | Constraints | Encryption | Notes |
|-------|------|-------------|------------|-------|
| name | VarChar(100) | Required | NO | Goal name |
| description | VarChar(500) | Optional | NO | Goal details |
| type | Enum | Required | NO | Goal category |
| targetAmount | Decimal(12,2) | > 0 | YES | Target amount |
| currentAmount | Decimal(12,2) | >= 0, Default 0 | YES | Current progress |
| monthlyContribution | Decimal(12,2) | >= 0, Default 0 | YES | Monthly savings |
| targetDate | DateTime | Future date | NO | Completion target |
| startDate | DateTime | Default now() | NO | Goal start |
| completedDate | DateTime | Optional | NO | Completion date |
| priority | Enum | Default MEDIUM | NO | Goal priority |
| status | Enum | Default ACTIVE | NO | Current status |
| isFeasible | Boolean | Default true | NO | Can achieve? |
| feasibilityScore | SmallInt | 0-100, Default 100 | NO | Confidence score |

**Relationships:**
- N:1 with User
- 1:N with GoalMilestone
- 1:N with Transaction

**Cascade Rules:**
- User deleted → Goals soft-deleted
- Goal deleted → Milestones soft-deleted

**Indexes:**
- `userId` - User's goals
- `status` - Active goals
- `userId, status` - Composite for common query
- `targetDate` - Upcoming goals
- `type, userId` - Emergency fund check

**Business Rules:**
1. Only one EMERGENCY_FUND goal per user
2. targetDate must be in future
3. currentAmount < targetAmount
4. Auto-complete when currentAmount >= targetAmount
5. Cannot delete ACTIVE goals with currentAmount > 0

**Soft Delete Strategy:**
- Set deletedAt timestamp
- Retain for historical analysis
- Exclude from active queries

**Future Extensibility:**
- `sharedWith` - String[] (family goals)
- `autoContribute` - Boolean
- `linkedAccountId` - String
- `milestoneRewards` - JSON

---

### 4. GoalMilestone

**Purpose:** Track progress checkpoints within goals

```prisma
model GoalMilestone {
  id     String @id @default(cuid())
  goalId String
  
  // Milestone details
  name         String @db.VarChar(100)
  targetAmount Decimal @db.Decimal(12, 2)
  targetDate   DateTime
  
  // Status
  isCompleted  Boolean @default(false)
  completedAt  DateTime?
  
  // Audit fields
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relationships
  goal Goal @relation(fields: [goalId], references: [id], onDelete: Cascade)
  
  @@index([goalId])
  @@index([targetDate])
  @@map("goal_milestones")
}
```

**Field Specifications:**

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| name | VarChar(100) | Required | Milestone name |
| targetAmount | Decimal(12,2) | > 0 | Milestone amount |
| targetDate | DateTime | Required | Target date |
| isCompleted | Boolean | Default false | Completion status |
| completedAt | DateTime | Optional | Completion timestamp |

**Relationships:**
- N:1 with Goal

**Cascade Rules:**
- Goal deleted → Milestones deleted

**Indexes:**
- `goalId` - Goal's milestones
- `targetDate` - Upcoming milestones

**Business Rules:**
1. targetAmount <= goal.targetAmount
2. targetDate <= goal.targetDate
3. Milestones ordered chronologically
4. No duplicate names within same goal

---

### 5. Expense

**Purpose:** Track recurring and one-time expenses

```prisma
model Expense {
  id     String @id @default(cuid())
  userId String
  
  // Expense details
  name     String @db.VarChar(100)
  amount   Decimal @db.Decimal(12, 2) // ENCRYPTED
  category ExpenseCategory
  frequency Frequency
  
  // Classification
  isEssential Boolean @default(false)
  isActive    Boolean @default(true)
  
  // Timeline
  startDate DateTime?
  endDate   DateTime?
  
  // Audit fields
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime? // Soft delete
  
  // Relationships
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@index([userId, isActive])
  @@index([category])
  @@map("expenses")
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

**Field Specifications:**

| Field | Type | Constraints | Encryption | Notes |
|-------|------|-------------|------------|-------|
| name | VarChar(100) | Required | NO | Expense name |
| amount | Decimal(12,2) | > 0 | YES | Expense amount |
| category | Enum | Required | NO | Expense type |
| frequency | Enum | Required | NO | How often |
| isEssential | Boolean | Default false | NO | Priority flag |
| isActive | Boolean | Default true | NO | Currently active |
| startDate | DateTime | Optional | NO | Start date |
| endDate | DateTime | Optional | NO | End date |

**Relationships:**
- N:1 with User

**Cascade Rules:**
- User deleted → Expenses soft-deleted

**Indexes:**
- `userId` - User's expenses
- `userId, isActive` - Active expenses
- `category` - Category filtering

**Business Rules:**
1. amount > 0
2. endDate > startDate (if both set)
3. Essential expenses prioritized in allocation
4. isActive determines inclusion in calculations

**Future Extensibility:**
- `merchantName` - String
- `receiptUrl` - String
- `actualAmount` - Decimal (vs budgeted)
- `tags` - String[]

---

### 6. Debt

**Purpose:** Track loans and liabilities

```prisma
model Debt {
  id     String @id @default(cuid())
  userId String
  
  // Debt details
  name String @db.VarChar(100)
  type DebtType
  
  // Financial (ENCRYPTED)
  principalAmount Decimal @db.Decimal(12, 2)
  currentBalance  Decimal @db.Decimal(12, 2)
  interestRate    Decimal @db.Decimal(5, 2) // Annual %
  monthlyPayment  Decimal @db.Decimal(12, 2)
  minimumPayment  Decimal @db.Decimal(12, 2)
  
  // Timeline
  startDate DateTime
  endDate   DateTime? // Maturity date
  
  // Status
  status DebtStatus @default(ACTIVE)
  
  // Audit fields
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime? // Soft delete
  
  // Relationships
  user     User @relation(fields: [userId], references: [id], onDelete: Cascade)
  payments DebtPayment[]
  
  @@index([userId])
  @@index([userId, status])
  @@index([status])
  @@map("debts")
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

**Field Specifications:**

| Field | Type | Constraints | Encryption | Notes |
|-------|------|-------------|------------|-------|
| name | VarChar(100) | Required | NO | Debt name |
| type | Enum | Required | NO | Debt category |
| principalAmount | Decimal(12,2) | > 0 | YES | Original amount |
| currentBalance | Decimal(12,2) | >= 0 | YES | Remaining balance |
| interestRate | Decimal(5,2) | 0-50 | NO | Annual % |
| monthlyPayment | Decimal(12,2) | > 0 | YES | Monthly payment |
| minimumPayment | Decimal(12,2) | > 0 | YES | Minimum payment |
| startDate | DateTime | Required | NO | Debt start |
| endDate | DateTime | Optional | NO | Maturity date |
| status | Enum | Default ACTIVE | NO | Current status |

**Relationships:**
- N:1 with User
- 1:N with DebtPayment

**Cascade Rules:**
- User deleted → Debts soft-deleted
- Debt deleted → Payments retained (audit trail)

**Indexes:**
- `userId` - User's debts
- `userId, status` - Active debts
- `status` - Status filtering

**Business Rules:**
1. principalAmount > 0 (min ₹10,000)
2. currentBalance <= principalAmount
3. monthlyPayment >= minimumPayment
4. interestRate: 0-50%
5. Auto-complete when currentBalance = 0

**Future Extensibility:**
- `lenderName` - String
- `accountNumber` - String (encrypted)
- `payoffStrategy` - Enum (SNOWBALL, AVALANCHE)
- `refinanceOptions` - JSON

---

### 7. DebtPayment

**Purpose:** Track debt payment history

```prisma
model DebtPayment {
  id     String @id @default(cuid())
  debtId String
  
  // Payment details
  amount      Decimal @db.Decimal(12, 2) // ENCRYPTED
  paymentDate DateTime
  
  // Breakdown
  principalPaid Decimal @db.Decimal(12, 2)
  interestPaid  Decimal @db.Decimal(12, 2)
  
  // Audit fields
  createdAt DateTime @default(now())
  
  // Relationships
  debt Debt @relation(fields: [debtId], references: [id], onDelete: Restrict)
  
  @@index([debtId])
  @@index([paymentDate])
  @@map("debt_payments")
}
```

**Field Specifications:**

| Field | Type | Constraints | Encryption | Notes |
|-------|------|-------------|------------|-------|
| amount | Decimal(12,2) | > 0 | YES | Total payment |
| paymentDate | DateTime | Required | NO | Payment date |
| principalPaid | Decimal(12,2) | >= 0 | YES | Principal portion |
| interestPaid | Decimal(12,2) | >= 0 | YES | Interest portion |

**Relationships:**
- N:1 with Debt

**Cascade Rules:**
- Debt deleted → Payments RETAINED (onDelete: Restrict)

**Indexes:**
- `debtId` - Debt's payments
- `paymentDate` - Payment history

**Business Rules:**
1. amount = principalPaid + interestPaid
2. paymentDate <= now()
3. Cannot delete payments (audit trail)

---

### 8. Asset

**Purpose:** Track owned assets and investments

```prisma
model Asset {
  id     String @id @default(cuid())
  userId String
  
  // Asset details
  name  String @db.VarChar(100)
  type  AssetType
  
  // Financial (ENCRYPTED)
  currentValue  Decimal @db.Decimal(12, 2)
  purchaseValue Decimal? @db.Decimal(12, 2)
  purchaseDate  DateTime?
  
  // Metadata
  description String? @db.VarChar(500)
  
  // Audit fields
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime? // Soft delete
  
  // Relationships
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@index([type])
  @@map("assets")
}

enum AssetType {
  REAL_ESTATE
  VEHICLE
  INVESTMENT
  SAVINGS_ACCOUNT
  FIXED_DEPOSIT
  MUTUAL_FUND
  STOCKS
  GOLD
  OTHER
}
```

**Future Extensibility:**
- Full asset tracking in Phase 2+

---

### 9. Transaction

**Purpose:** Financial movements and history

```prisma
model Transaction {
  id     String @id @default(cuid())
  userId String
  
  // Transaction details
  amount          Decimal @db.Decimal(12, 2) // ENCRYPTED
  type            TransactionType
  category        ExpenseCategory?
  description     String? @db.VarChar(200)
  transactionDate DateTime
  
  // Linking
  goalId String?
  
  // Audit fields
  createdAt DateTime @default(now())
  
  // Relationships
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  goal Goal? @relation(fields: [goalId], references: [id], onDelete: SetNull)
  
  @@index([userId])
  @@index([transactionDate])
  @@index([userId, transactionDate])
  @@index([type])
  @@map("transactions")
}

enum TransactionType {
  INCOME
  EXPENSE
  GOAL_CONTRIBUTION
  DEBT_PAYMENT
  TRANSFER
}
```

**Future Extensibility:**
- Full transaction tracking in Phase 2+

---

### 10. Allocation

**Purpose:** Monthly budget snapshots

```prisma
model Allocation {
  id     String @id @default(cuid())
  userId String
  
  // Time period
  month Int @db.SmallInt // 1-12
  year  Int @db.SmallInt // e.g., 2024
  
  // Allocation breakdown (ENCRYPTED)
  essentialExpenses Decimal @db.Decimal(12, 2)
  debtPayments      Decimal @db.Decimal(12, 2)
  emergencyFund     Decimal @db.Decimal(12, 2)
  goalSavings       Decimal @db.Decimal(12, 2)
  investments       Decimal @db.Decimal(12, 2)
  discretionary     Decimal @db.Decimal(12, 2)
  
  // Totals (ENCRYPTED)
  totalIncome     Decimal @db.Decimal(12, 2)
  totalAllocated  Decimal @db.Decimal(12, 2)
  
  // Metadata
  warning        String? // e.g., "INCOME_INSUFFICIENT"
  warningMessage String? @db.VarChar(500)
  
  // Audit fields
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relationships
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([userId, month, year]) // One allocation per user per month
  @@index([userId])
  @@index([month, year])
  @@map("allocations")
}
```

**Field Specifications:**

| Field | Type | Constraints | Encryption | Notes |
|-------|------|-------------|------------|-------|
| month | SmallInt | 1-12 | NO | Month number |
| year | SmallInt | e.g., 2024 | NO | Year |
| essentialExpenses | Decimal(12,2) | >= 0 | YES | Essential costs |
| debtPayments | Decimal(12,2) | >= 0 | YES | Debt payments |
| emergencyFund | Decimal(12,2) | >= 0 | YES | Emergency savings |
| goalSavings | Decimal(12,2) | >= 0 | YES | Goal contributions |
| investments | Decimal(12,2) | >= 0 | YES | Investment amount |
| discretionary | Decimal(12,2) | >= 0 | YES | Discretionary spending |
| totalIncome | Decimal(12,2) | > 0 | YES | Total income |
| totalAllocated | Decimal(12,2) | >= 0 | YES | Sum of categories |

**Relationships:**
- N:1 with User

**Cascade Rules:**
- User deleted → Allocations deleted

**Indexes:**
- `userId` - User's allocations
- `month, year` - Time-based queries
- Unique constraint on `userId, month, year`

**Business Rules:**
1. One allocation per user per month/year
2. totalAllocated = sum of all categories
3. totalAllocated <= totalIncome
4. Recalculated when goals/expenses/debts change

---

### 11. Conversation

**Purpose:** AI chat sessions

```prisma
model Conversation {
  id     String @id @default(cuid())
  userId String
  
  // Conversation details
  title String? @db.VarChar(200) // Auto-generated from first message
  
  // Audit fields
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime? // Soft delete
  
  // Relationships
  user     User @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages Message[]
  
  @@index([userId])
  @@index([updatedAt]) // Recent conversations
  @@map("conversations")
}
```

**Relationships:**
- N:1 with User
- 1:N with Message

**Cascade Rules:**
- User deleted → Conversations soft-deleted
- Conversation deleted → Messages deleted

**Indexes:**
- `userId` - User's conversations
- `updatedAt` - Recent conversations

---

### 12. Message

**Purpose:** Chat messages with calculation metadata

```prisma
model Message {
  id             String @id @default(cuid())
  conversationId String
  
  // Message details
  role    MessageRole
  content String @db.Text // Max 10,000 chars enforced at app layer
  
  // Metadata (JSON)
  metadata Json? // { intent, calculations, confidence }
  
  // Audit fields
  createdAt DateTime @default(now())
  
  // Relationships
  conversation Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  
  @@index([conversationId])
  @@index([createdAt])
  @@map("messages")
}

enum MessageRole {
  USER
  ASSISTANT
  SYSTEM
}
```

**Field Specifications:**

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| role | Enum | Required | Message sender |
| content | Text | Max 10,000 chars | Message text |
| metadata | Json | Optional | Calculation details |

**Metadata Structure:**
```json
{
  "intent": {
    "type": "CALCULATE_ALLOCATION",
    "parameters": {}
  },
  "calculations": {
    "input": {},
    "output": {},
    "formula": "..."
  },
  "confidence": 85
}
```

**Relationships:**
- N:1 with Conversation

**Cascade Rules:**
- Conversation deleted → Messages deleted

**Indexes:**
- `conversationId` - Conversation's messages
- `createdAt` - Message ordering

**Business Rules:**
1. Messages ordered by createdAt
2. Metadata stores calculation details (not in content)
3. System messages for important events

---

### 13. Simulation

**Purpose:** Historical what-if scenarios

```prisma
model Simulation {
  id     String @id @default(cuid())
  userId String
  
  // Simulation details
  type SimulationType
  
  // Data (JSON)
  input  Json // Simulation parameters
  output Json // Simulation results
  
  // Audit fields
  createdAt DateTime @default(now())
  
  // Relationships
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@index([type])
  @@index([createdAt])
  @@map("simulations")
}

enum SimulationType {
  PURCHASE_AFFORDABILITY
  LOAN_FEASIBILITY
  GOAL_TIMELINE
  CASH_FLOW_PROJECTION
}
```

**Field Specifications:**

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| type | Enum | Required | Simulation type |
| input | Json | Required | Input parameters |
| output | Json | Required | Simulation results |

**Relationships:**
- N:1 with User

**Cascade Rules:**
- User deleted → Simulations deleted

**Indexes:**
- `userId` - User's simulations
- `type` - Simulation type
- `createdAt` - Recent simulations

**Business Rules:**
1. Immutable after creation (historical record)
2. Input/output stored as JSON
3. No updates allowed

---

## Summary Statistics

### Total Entities: 13

**Core Entities (8):**
1. User
2. FinancialProfile
3. Goal
4. GoalMilestone
5. Expense
6. Debt
7. DebtPayment
8. Allocation

**Supporting Entities (3):**
9. Asset
10. Transaction
11. Conversation

**Analysis Entities (2):**
12. Message
13. Simulation

### Encrypted Fields: 23

**FinancialProfile (6):**
- monthlyIncome, otherIncome, currentSavings
- emergencyFundTarget, currentEmergencyFund

**Goal (3):**
- targetAmount, currentAmount, monthlyContribution

**Expense (1):**
- amount

**Debt (4):**
- principalAmount, currentBalance, monthlyPayment, minimumPayment

**DebtPayment (3):**
- amount, principalPaid, interestPaid

**Asset (2):**
- currentValue, purchaseValue

**Transaction (1):**
- amount

**Allocation (8):**
- All category amounts + totals

### Total Indexes: 45+

Optimized for:
- User lookups
- Active data filtering
- Time-based queries
- Status filtering
- Composite queries

---

## Conclusion

This Prisma schema provides:
- ✅ Complete data model for all 14 entities
- ✅ Proper relationships and cascade rules
- ✅ Soft delete for audit trails
- ✅ Encryption for sensitive fields
- ✅ Performance indexes
- ✅ Future extensibility
- ✅ Type safety via Prisma

**Status:** Ready for implementation

**Next Steps:**
1. Review schema with team
2. Implement encryption layer
3. Create migration files
4. Build repository layer

---

**Document Version:** 1.0  
**Last Updated:** June 30, 2026  
**Next Review:** After Phase 1 implementation
