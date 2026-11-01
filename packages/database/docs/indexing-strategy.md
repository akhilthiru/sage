# Indexing Strategy

**Package:** `@sage/database`  
**Purpose:** Database index specifications for optimal query performance  
**Date:** June 30, 2026  
**Status:** Design Phase - Documentation Only

---

## Overview

This document defines the indexing strategy for Sage's PostgreSQL database, identifying critical indexes for performance while avoiding premature optimization.

**Core Principle:** Index for actual query patterns, not hypothetical ones. Measure before optimizing.

---

## Indexing Fundamentals

### What is an Index?

A database index is a data structure that improves query performance by allowing fast lookups without scanning the entire table.

**Benefits:**
- Faster SELECT queries
- Faster WHERE clause filtering
- Faster JOIN operations
- Faster ORDER BY sorting

**Costs:**
- Slower INSERT/UPDATE/DELETE operations
- Additional storage space
- Maintenance overhead

### When to Index

**✅ Index when:**
- Column frequently used in WHERE clauses
- Column frequently used in JOIN conditions
- Column frequently used in ORDER BY
- Column has high cardinality (many unique values)
- Query performance is measurably slow

**❌ Don't index when:**
- Table has few rows (< 1000)
- Column has low cardinality (few unique values)
- Column rarely queried
- Write performance is critical
- No measured performance issue

---

## Index Types

### 1. B-tree Index (Default)

**Use for:**
- Equality comparisons (`=`)
- Range queries (`<`, `>`, `BETWEEN`)
- Sorting (`ORDER BY`)
- Pattern matching (`LIKE 'prefix%'`)

**Syntax:**
```sql
CREATE INDEX idx_name ON table_name(column_name);
```

### 2. Unique Index

**Use for:**
- Enforcing uniqueness
- Primary keys (automatic)
- Unique constraints (automatic)

**Syntax:**
```sql
CREATE UNIQUE INDEX idx_name ON table_name(column_name);
```

### 3. Composite Index

**Use for:**
- Queries filtering on multiple columns
- Column order matters (most selective first)

**Syntax:**
```sql
CREATE INDEX idx_name ON table_name(column1, column2);
```

### 4. Partial Index

**Use for:**
- Indexing subset of rows
- Soft delete filtering
- Status-based queries

**Syntax:**
```sql
CREATE INDEX idx_name ON table_name(column_name) WHERE condition;
```

---

## Index Specifications by Entity

### 1. User

**Primary Key:**
```sql
-- Automatic
PRIMARY KEY (id)
```

**Unique Indexes:**
```sql
-- Automatic from schema
UNIQUE INDEX users_clerkId_key ON users(clerkId);
UNIQUE INDEX users_email_key ON users(email);
```

**Additional Indexes:**
```sql
-- Filter active users (soft delete)
CREATE INDEX idx_users_deleted_at ON users(deletedAt) 
WHERE deletedAt IS NULL;
```

**Query Patterns:**
```sql
-- Lookup by clerkId (auth) - UNIQUE INDEX
SELECT * FROM users WHERE clerkId = 'clerk_123';

-- Lookup by email - UNIQUE INDEX
SELECT * FROM users WHERE email = 'user@example.com';

-- Active users - PARTIAL INDEX
SELECT * FROM users WHERE deletedAt IS NULL;
```

**Rationale:**
- `clerkId` and `email` are unique lookups (automatic indexes)
- `deletedAt` partial index for active user queries
- No need for `firstName`/`lastName` indexes (not queried alone)

---

### 2. FinancialProfile

**Primary Key:**
```sql
PRIMARY KEY (id)
```

**Unique Index:**
```sql
-- Automatic from schema
UNIQUE INDEX financial_profiles_userId_key ON financial_profiles(userId);
```

**Foreign Key Index:**
```sql
-- Automatic from Prisma
CREATE INDEX financial_profiles_userId_idx ON financial_profiles(userId);
```

**Query Patterns:**
```sql
-- Lookup by userId - UNIQUE INDEX
SELECT * FROM financial_profiles WHERE userId = 'user_123';
```

**Rationale:**
- `userId` is the primary lookup (unique index sufficient)
- No range queries on income/savings (no index needed)
- Profile is always fetched by userId, never filtered

---

### 3. Goal

**Primary Key:**
```sql
PRIMARY KEY (id)
```

**Indexes:**
```sql
-- User's goals (most common query)
CREATE INDEX idx_goals_userId ON goals(userId);

-- Active goals by user (composite for common filter)
CREATE INDEX idx_goals_userId_status ON goals(userId, status);

-- Status filtering
CREATE INDEX idx_goals_status ON goals(status);

-- Upcoming goals
CREATE INDEX idx_goals_targetDate ON goals(targetDate);

-- Emergency fund check (composite for business rule)
CREATE INDEX idx_goals_type_userId ON goals(type, userId);

-- Active goals (partial index for soft delete)
CREATE INDEX idx_goals_active ON goals(userId, status) 
WHERE deletedAt IS NULL;
```

**Query Patterns:**
```sql
-- User's goals - COMPOSITE INDEX
SELECT * FROM goals WHERE userId = 'user_123';

-- Active goals - COMPOSITE INDEX
SELECT * FROM goals WHERE userId = 'user_123' AND status = 'ACTIVE';

-- Active goals (no soft delete) - PARTIAL INDEX
SELECT * FROM goals 
WHERE userId = 'user_123' AND status = 'ACTIVE' AND deletedAt IS NULL;

-- Emergency fund check - COMPOSITE INDEX
SELECT * FROM goals 
WHERE userId = 'user_123' AND type = 'EMERGENCY_FUND' AND deletedAt IS NULL;

-- Upcoming goals - INDEX
SELECT * FROM goals 
WHERE targetDate BETWEEN '2024-01-01' AND '2024-12-31';
```

**Rationale:**
- `userId` is in almost every query (primary index)
- `userId, status` composite for common active goal queries
- `type, userId` for emergency fund business rule
- `targetDate` for upcoming goal queries
- Partial index on active goals to exclude soft-deleted

**Index Selectivity:**
- `userId` - High (many users)
- `status` - Low (4 values: ACTIVE, PAUSED, COMPLETED, CANCELLED)
- `type` - Low (8 types)
- Composite `userId, status` - High (filters to user's active goals)

---

### 4. GoalMilestone

**Primary Key:**
```sql
PRIMARY KEY (id)
```

**Indexes:**
```sql
-- Goal's milestones (foreign key)
CREATE INDEX idx_goal_milestones_goalId ON goal_milestones(goalId);

-- Upcoming milestones
CREATE INDEX idx_goal_milestones_targetDate ON goal_milestones(targetDate);
```

**Query Patterns:**
```sql
-- Goal's milestones - INDEX
SELECT * FROM goal_milestones WHERE goalId = 'goal_123';

-- Upcoming milestones - INDEX
SELECT * FROM goal_milestones 
WHERE targetDate BETWEEN '2024-01-01' AND '2024-12-31';
```

**Rationale:**
- `goalId` for fetching goal's milestones
- `targetDate` for upcoming milestone queries
- Small table, minimal indexing needed

---

### 5. Expense

**Primary Key:**
```sql
PRIMARY KEY (id)
```

**Indexes:**
```sql
-- User's expenses
CREATE INDEX idx_expenses_userId ON expenses(userId);

-- Active expenses (most common query)
CREATE INDEX idx_expenses_userId_isActive ON expenses(userId, isActive);

-- Category filtering
CREATE INDEX idx_expenses_category ON expenses(category);

-- Active expenses (partial index for soft delete)
CREATE INDEX idx_expenses_active ON expenses(userId, isActive) 
WHERE deletedAt IS NULL;
```

**Query Patterns:**
```sql
-- User's expenses - INDEX
SELECT * FROM expenses WHERE userId = 'user_123';

-- Active expenses - COMPOSITE INDEX
SELECT * FROM expenses 
WHERE userId = 'user_123' AND isActive = true;

-- Active expenses (no soft delete) - PARTIAL INDEX
SELECT * FROM expenses 
WHERE userId = 'user_123' AND isActive = true AND deletedAt IS NULL;

-- Category filtering - INDEX
SELECT * FROM expenses 
WHERE userId = 'user_123' AND category = 'RENT';
```

**Rationale:**
- `userId` for user's expenses
- `userId, isActive` composite for active expense queries
- `category` for category-based filtering
- Partial index for active, non-deleted expenses

---

### 6. Debt

**Primary Key:**
```sql
PRIMARY KEY (id)
```

**Indexes:**
```sql
-- User's debts
CREATE INDEX idx_debts_userId ON debts(userId);

-- Active debts (most common query)
CREATE INDEX idx_debts_userId_status ON debts(userId, status);

-- Status filtering
CREATE INDEX idx_debts_status ON debts(status);

-- Active debts (partial index for soft delete)
CREATE INDEX idx_debts_active ON debts(userId, status) 
WHERE deletedAt IS NULL;
```

**Query Patterns:**
```sql
-- User's debts - INDEX
SELECT * FROM debts WHERE userId = 'user_123';

-- Active debts - COMPOSITE INDEX
SELECT * FROM debts 
WHERE userId = 'user_123' AND status = 'ACTIVE';

-- Active debts (no soft delete) - PARTIAL INDEX
SELECT * FROM debts 
WHERE userId = 'user_123' AND status = 'ACTIVE' AND deletedAt IS NULL;
```

**Rationale:**
- `userId` for user's debts
- `userId, status` composite for active debt queries
- `status` for status-based filtering
- Partial index for active, non-deleted debts

---

### 7. DebtPayment

**Primary Key:**
```sql
PRIMARY KEY (id)
```

**Indexes:**
```sql
-- Debt's payments (foreign key)
CREATE INDEX idx_debt_payments_debtId ON debt_payments(debtId);

-- Payment history (chronological)
CREATE INDEX idx_debt_payments_paymentDate ON debt_payments(paymentDate);

-- Composite for debt payment history
CREATE INDEX idx_debt_payments_debtId_paymentDate 
ON debt_payments(debtId, paymentDate DESC);
```

**Query Patterns:**
```sql
-- Debt's payments - INDEX
SELECT * FROM debt_payments WHERE debtId = 'debt_123';

-- Recent payments - COMPOSITE INDEX
SELECT * FROM debt_payments 
WHERE debtId = 'debt_123' 
ORDER BY paymentDate DESC;

-- Payment history in date range - INDEX
SELECT * FROM debt_payments 
WHERE paymentDate BETWEEN '2024-01-01' AND '2024-12-31';
```

**Rationale:**
- `debtId` for debt's payment history
- `paymentDate` for chronological queries
- Composite `debtId, paymentDate DESC` for recent payments

---

### 8. Asset

**Primary Key:**
```sql
PRIMARY KEY (id)
```

**Indexes:**
```sql
-- User's assets
CREATE INDEX idx_assets_userId ON assets(userId);

-- Asset type filtering
CREATE INDEX idx_assets_type ON assets(type);

-- Active assets (partial index for soft delete)
CREATE INDEX idx_assets_active ON assets(userId) 
WHERE deletedAt IS NULL;
```

**Query Patterns:**
```sql
-- User's assets - INDEX
SELECT * FROM assets WHERE userId = 'user_123';

-- Assets by type - INDEX
SELECT * FROM assets 
WHERE userId = 'user_123' AND type = 'REAL_ESTATE';
```

**Rationale:**
- `userId` for user's assets
- `type` for type-based filtering
- Partial index for active assets

---

### 9. Transaction

**Primary Key:**
```sql
PRIMARY KEY (id)
```

**Indexes:**
```sql
-- User's transactions
CREATE INDEX idx_transactions_userId ON transactions(userId);

-- Transaction history (chronological)
CREATE INDEX idx_transactions_transactionDate 
ON transactions(transactionDate DESC);

-- Composite for user's transaction history
CREATE INDEX idx_transactions_userId_transactionDate 
ON transactions(userId, transactionDate DESC);

-- Transaction type filtering
CREATE INDEX idx_transactions_type ON transactions(type);
```

**Query Patterns:**
```sql
-- User's transactions - INDEX
SELECT * FROM transactions WHERE userId = 'user_123';

-- Recent transactions - COMPOSITE INDEX
SELECT * FROM transactions 
WHERE userId = 'user_123' 
ORDER BY transactionDate DESC 
LIMIT 20;

-- Transactions by type - INDEX
SELECT * FROM transactions 
WHERE userId = 'user_123' AND type = 'EXPENSE';

-- Transaction date range - INDEX
SELECT * FROM transactions 
WHERE transactionDate BETWEEN '2024-01-01' AND '2024-12-31';
```

**Rationale:**
- `userId` for user's transactions
- `transactionDate DESC` for recent transactions
- Composite for user's recent transactions
- `type` for type-based filtering

---

### 10. Allocation

**Primary Key:**
```sql
PRIMARY KEY (id)
```

**Unique Index:**
```sql
-- One allocation per user per month/year
CREATE UNIQUE INDEX idx_allocations_userId_month_year 
ON allocations(userId, month, year);
```

**Indexes:**
```sql
-- User's allocations
CREATE INDEX idx_allocations_userId ON allocations(userId);

-- Time-based queries
CREATE INDEX idx_allocations_month_year ON allocations(month, year);
```

**Query Patterns:**
```sql
-- Current allocation - UNIQUE INDEX
SELECT * FROM allocations 
WHERE userId = 'user_123' AND month = 6 AND year = 2024;

-- User's allocations - INDEX
SELECT * FROM allocations WHERE userId = 'user_123';

-- Year's allocations - INDEX
SELECT * FROM allocations 
WHERE userId = 'user_123' AND year = 2024;
```

**Rationale:**
- Unique index on `userId, month, year` enforces business rule
- `userId` for user's allocation history
- `month, year` for time-based queries

---

### 11. Conversation

**Primary Key:**
```sql
PRIMARY KEY (id)
```

**Indexes:**
```sql
-- User's conversations
CREATE INDEX idx_conversations_userId ON conversations(userId);

-- Recent conversations
CREATE INDEX idx_conversations_updatedAt 
ON conversations(updatedAt DESC);

-- Composite for user's recent conversations
CREATE INDEX idx_conversations_userId_updatedAt 
ON conversations(userId, updatedAt DESC);

-- Active conversations (partial index for soft delete)
CREATE INDEX idx_conversations_active ON conversations(userId, updatedAt DESC) 
WHERE deletedAt IS NULL;
```

**Query Patterns:**
```sql
-- User's conversations - INDEX
SELECT * FROM conversations WHERE userId = 'user_123';

-- Recent conversations - COMPOSITE INDEX
SELECT * FROM conversations 
WHERE userId = 'user_123' 
ORDER BY updatedAt DESC 
LIMIT 10;

-- Active conversations - PARTIAL INDEX
SELECT * FROM conversations 
WHERE userId = 'user_123' AND deletedAt IS NULL 
ORDER BY updatedAt DESC;
```

**Rationale:**
- `userId` for user's conversations
- `updatedAt DESC` for recent conversations
- Composite for user's recent conversations
- Partial index for active conversations

---

### 12. Message

**Primary Key:**
```sql
PRIMARY KEY (id)
```

**Indexes:**
```sql
-- Conversation's messages (foreign key)
CREATE INDEX idx_messages_conversationId ON messages(conversationId);

-- Message ordering
CREATE INDEX idx_messages_createdAt ON messages(createdAt);

-- Composite for conversation's messages in order
CREATE INDEX idx_messages_conversationId_createdAt 
ON messages(conversationId, createdAt);
```

**Query Patterns:**
```sql
-- Conversation's messages - COMPOSITE INDEX
SELECT * FROM messages 
WHERE conversationId = 'conv_123' 
ORDER BY createdAt;

-- Recent messages - INDEX
SELECT * FROM messages 
WHERE conversationId = 'conv_123' 
ORDER BY createdAt DESC 
LIMIT 20;
```

**Rationale:**
- `conversationId` for conversation's messages
- `createdAt` for chronological ordering
- Composite for ordered message retrieval

---

### 13. Simulation

**Primary Key:**
```sql
PRIMARY KEY (id)
```

**Indexes:**
```sql
-- User's simulations
CREATE INDEX idx_simulations_userId ON simulations(userId);

-- Simulation type filtering
CREATE INDEX idx_simulations_type ON simulations(type);

-- Recent simulations
CREATE INDEX idx_simulations_createdAt 
ON simulations(createdAt DESC);

-- Composite for user's simulations by type
CREATE INDEX idx_simulations_userId_type 
ON simulations(userId, type);
```

**Query Patterns:**
```sql
-- User's simulations - INDEX
SELECT * FROM simulations WHERE userId = 'user_123';

-- Simulations by type - COMPOSITE INDEX
SELECT * FROM simulations 
WHERE userId = 'user_123' AND type = 'PURCHASE_AFFORDABILITY';

-- Recent simulations - INDEX
SELECT * FROM simulations 
WHERE userId = 'user_123' 
ORDER BY createdAt DESC 
LIMIT 10;
```

**Rationale:**
- `userId` for user's simulations
- `type` for type-based filtering
- `createdAt DESC` for recent simulations
- Composite for user's simulations by type

---

## Index Summary

### Total Indexes: 45+

**By Category:**
- Primary Keys: 13 (automatic)
- Unique Indexes: 4 (automatic from schema)
- Foreign Key Indexes: 8 (automatic from Prisma)
- Custom Indexes: 20+
- Partial Indexes: 6

**Index Distribution:**

| Entity | Indexes | Rationale |
|--------|---------|-----------|
| User | 3 | Auth lookups, soft delete |
| FinancialProfile | 2 | User lookup only |
| Goal | 6 | Complex filtering needs |
| GoalMilestone | 2 | Simple queries |
| Expense | 4 | Active expense queries |
| Debt | 4 | Active debt queries |
| DebtPayment | 3 | Payment history |
| Asset | 3 | Basic filtering |
| Transaction | 4 | Transaction history |
| Allocation | 3 | Time-based queries |
| Conversation | 4 | Recent conversations |
| Message | 3 | Message ordering |
| Simulation | 4 | Type-based queries |

---

## Index Maintenance

### Monitoring Index Usage

```sql
-- Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan;

-- Find unused indexes (idx_scan = 0)
SELECT 
  schemaname,
  tablename,
  indexname
FROM pg_stat_user_indexes
WHERE schemaname = 'public' AND idx_scan = 0;
```

### Index Size Monitoring

```sql
-- Check index sizes
SELECT 
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;
```

### Reindexing

```sql
-- Reindex specific index
REINDEX INDEX idx_goals_userId;

-- Reindex entire table
REINDEX TABLE goals;

-- Reindex entire database (maintenance window)
REINDEX DATABASE sage;
```

---

## Performance Testing

### Query Performance Baseline

Before adding indexes, measure baseline performance:

```sql
-- Enable query timing
\timing on

-- Test query
EXPLAIN ANALYZE
SELECT * FROM goals 
WHERE userId = 'user_123' AND status = 'ACTIVE';
```

### Index Impact Testing

After adding index, measure improvement:

```sql
-- Create index
CREATE INDEX idx_goals_userId_status ON goals(userId, status);

-- Test same query
EXPLAIN ANALYZE
SELECT * FROM goals 
WHERE userId = 'user_123' AND status = 'ACTIVE';

-- Compare execution time
```

### Expected Performance

**Without Index:**
- Seq Scan on goals
- Planning time: ~0.1ms
- Execution time: ~10-50ms (depends on table size)

**With Index:**
- Index Scan using idx_goals_userId_status
- Planning time: ~0.1ms
- Execution time: ~0.1-1ms

---

## Index Best Practices

### 1. Index Column Order Matters

For composite indexes, order columns by selectivity (most selective first):

```sql
-- ✅ Good: userId first (high selectivity)
CREATE INDEX idx_goals_userId_status ON goals(userId, status);

-- ❌ Bad: status first (low selectivity)
CREATE INDEX idx_goals_status_userId ON goals(status, userId);
```

### 2. Use Partial Indexes for Soft Delete

```sql
-- ✅ Good: Partial index excludes deleted rows
CREATE INDEX idx_goals_active ON goals(userId, status) 
WHERE deletedAt IS NULL;

-- ❌ Less efficient: Full index includes deleted rows
CREATE INDEX idx_goals_all ON goals(userId, status, deletedAt);
```

### 3. Avoid Over-Indexing

```sql
-- ❌ Bad: Too many indexes on same columns
CREATE INDEX idx_goals_userId ON goals(userId);
CREATE INDEX idx_goals_userId_status ON goals(userId, status);
CREATE INDEX idx_goals_userId_type ON goals(userId, type);
CREATE INDEX idx_goals_userId_priority ON goals(userId, priority);

-- ✅ Good: Strategic indexes for actual queries
CREATE INDEX idx_goals_userId_status ON goals(userId, status);
CREATE INDEX idx_goals_type_userId ON goals(type, userId); -- For emergency fund check
```

### 4. Monitor and Remove Unused Indexes

```sql
-- Find unused indexes
SELECT indexname, idx_scan 
FROM pg_stat_user_indexes 
WHERE schemaname = 'public' AND idx_scan = 0;

-- Drop if truly unused
DROP INDEX idx_unused;
```

---

## Indexing for Specific Queries

### Dashboard Query

```sql
-- Query: User's active goals with milestones
SELECT g.*, m.*
FROM goals g
LEFT JOIN goal_milestones m ON g.id = m.goalId
WHERE g.userId = 'user_123' 
  AND g.status = 'ACTIVE' 
  AND g.deletedAt IS NULL
ORDER BY g.priority DESC, g.targetDate ASC;

-- Indexes needed:
-- 1. idx_goals_userId_status (composite)
-- 2. idx_goal_milestones_goalId (foreign key)
```

### Allocation Calculation Query

```sql
-- Query: Fetch all data for allocation calculation
SELECT * FROM financial_profiles WHERE userId = 'user_123';
SELECT * FROM goals WHERE userId = 'user_123' AND status = 'ACTIVE' AND deletedAt IS NULL;
SELECT * FROM expenses WHERE userId = 'user_123' AND isActive = true AND deletedAt IS NULL;
SELECT * FROM debts WHERE userId = 'user_123' AND status = 'ACTIVE' AND deletedAt IS NULL;

-- Indexes needed:
-- 1. financial_profiles_userId_key (unique)
-- 2. idx_goals_userId_status (composite)
-- 3. idx_expenses_userId_isActive (composite)
-- 4. idx_debts_userId_status (composite)
```

### Chat History Query

```sql
-- Query: Recent conversations with latest message
SELECT c.*, 
       (SELECT content FROM messages 
        WHERE conversationId = c.id 
        ORDER BY createdAt DESC 
        LIMIT 1) as latestMessage
FROM conversations c
WHERE c.userId = 'user_123' AND c.deletedAt IS NULL
ORDER BY c.updatedAt DESC
LIMIT 10;

-- Indexes needed:
-- 1. idx_conversations_userId_updatedAt (composite)
-- 2. idx_messages_conversationId_createdAt (composite)
```

---

## Production Deployment

### Index Creation Strategy

**Option 1: Create Concurrently (Recommended)**
```sql
-- Non-blocking index creation
CREATE INDEX CONCURRENTLY idx_goals_userId_status 
ON goals(userId, status);
```

**Option 2: Maintenance Window**
```sql
-- Faster but locks table
CREATE INDEX idx_goals_userId_status 
ON goals(userId, status);
```

### Migration Script

```sql
-- migrations/001_add_indexes.sql

-- Goals indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_goals_userId 
ON goals(userId);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_goals_userId_status 
ON goals(userId, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_goals_active 
ON goals(userId, status) WHERE deletedAt IS NULL;

-- Expenses indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expenses_userId_isActive 
ON expenses(userId, isActive);

-- Continue for all indexes...
```

---

## Conclusion

This indexing strategy provides:
- ✅ Optimized query performance for common patterns
- ✅ Minimal write overhead
- ✅ Strategic use of composite and partial indexes
- ✅ Monitoring and maintenance guidelines
- ✅ Production deployment strategy

**Key Metrics:**
- Total indexes: ~45
- Expected query improvement: 10-100x for indexed queries
- Storage overhead: ~10-20% of table size
- Write performance impact: < 5%

**Status:** Ready for implementation

**Next Steps:**
1. Create indexes in development
2. Test query performance
3. Monitor index usage
4. Deploy to production with CONCURRENTLY
5. Establish monitoring dashboards

---

**Document Version:** 1.0  
**Last Updated:** June 30, 2026  
**Next Review:** After 1 month in production
