---
name: db-design-guidelines
description: "db model design guidelines and standards"
---

## Before You Generate

1. **Require context.** You need: the PRD (for data requirements), the HLD (for
   technology choice), and any existing schema (for migration planning).
2. **Ask about data volumes** — expected row counts, growth rate, query patterns.
3. **Ask about compliance** — GDPR, HIPAA, PCI-DSS, or data residency requirements
   affect schema decisions.

---

## Schema Document Structure

### 1. Overview
- Database engine and version (e.g., PostgreSQL 16, SQL Server 2022)
- Justification for engine choice (reference HLD decision record)
- Schema naming convention
- Estimated data volume at launch and at 12 months

### 2. Entity-Relationship Diagram
- Provide a Mermaid ER diagram
- Show all entities, their relationships (1:1, 1:N, M:N), and cardinality
- Label relationships with their business meaning

### 3. Table Definitions

For each table, provide:

```
### Table: [schema].[table_name]

**Purpose:** [One-line description]
**Estimated Rows:** [At launch] → [At 12 months]
**Growth Pattern:** [Append-only | Slowly changing | High churn]
**Retention Policy:** [How long data is kept, archival strategy]

| Column      | Type        | Nullable | Default           | Description                  |
|-------------|-------------|----------|-------------------|------------------------------|
| id          | UUID        | NO       | gen_random_uuid() | Primary key                  |
| created_at  | TIMESTAMPTZ | NO       | NOW()             | Row creation timestamp (UTC) |
| updated_at  | TIMESTAMPTZ | NO       | NOW()             | Last modification timestamp  |
| created_by  | UUID        | NO       | —                 | FK to user who created record|

**Primary Key:** id
**Unique Constraints:** [List]
**Foreign Keys:**
- column_name → referenced_table(referenced_column)
  [ON DELETE CASCADE|SET NULL|RESTRICT]

**Indexes:**
- idx_[table]_[columns] ON (column1, column2)
  — [Justification: supports query X]

**Triggers:**
- [Trigger name] — [When it fires and what it does]

**Row-Level Security:** [If applicable, describe RLS policies]
```

### 4. Standard Columns

Every table MUST include these columns unless explicitly justified otherwise:

| Column     | Type        | Purpose                                           |
|------------|-------------|---------------------------------------------------|
| id         | UUID/BIGINT | Primary key (prefer UUID for distributed systems) |
| created_at | TIMESTAMPTZ | When the row was created (UTC, never null)        |
| updated_at | TIMESTAMPTZ | When the row was last modified (UTC)              |
| created_by | UUID        | FK to the user who created the record             |
| updated_by | UUID        | FK to the user who last modified the record       |
| is_deleted | BOOLEAN     | Soft delete flag (default: false)                 |
| deleted_at | TIMESTAMPTZ | When the row was soft-deleted                     |
| version    | INTEGER     | Optimistic concurrency control                    |

### 5. Naming Conventions

| Element            | Convention               | Example                     |
|--------------------|--------------------------|-----------------------------|
| Schema             | snake_case               | billing, auth, inventory    |
| Table              | snake_case, singular     | user_profile, order_item    |
| Column             | snake_case               | first_name, created_at      |
| Primary Key        | id                       | id                          |
| Foreign Key column | [referenced_table]_id    | user_id, order_id           |
| Index              | idx_[table]_[columns]    | idx_user_profile_email      |
| Unique Constraint  | uq_[table]_[columns]     | uq_user_profile_email       |
| Check Constraint   | ck_[table]_[description] | ck_order_positive_amount    |
| Enum type          | [domain]_[name]_enum     | order_status_enum           |

### 6. Normalization and Denormalization

- Default to **Third Normal Form (3NF)**
- Document every denormalization with:
  - Which normal form it violates
  - Which query it optimizes
  - How data consistency is maintained
  - Performance test results justifying the denormalization

### 7. Data Types

| Data Kind   | Use                    | Do NOT Use               |
|-------------|------------------------|--------------------------|
| Identifier  | UUID or BIGINT         | INT (overflow risk)      |
| Money       | DECIMAL(19,4)          | FLOAT, DOUBLE, MONEY     |
| Timestamp   | TIMESTAMPTZ (UTC)      | TIMESTAMP without TZ     |
| Boolean     | BOOLEAN                | TINYINT, CHAR(1)         |
| Short text  | VARCHAR(n) with limit  | TEXT without constraint  |
| Long text   | TEXT                   | VARCHAR(MAX)             |
| JSON data   | JSONB (PostgreSQL)     | JSON (not indexable)     |
| Email       | CITEXT or VARCHAR(320) | VARCHAR(50) (too short)  |
| IP Address  | INET                   | VARCHAR                  |
| Enum        | Database ENUM or lookup table | Application-only enums |

### 8. Indexing Strategy

- **Primary key**: Automatically indexed
- **Foreign keys**: ALWAYS index — no exceptions
- **Frequently filtered columns**: Index based on query patterns
- **Composite indexes**: Most selective column first
- **Covering indexes**: Use INCLUDE columns to avoid table lookups
- **Partial indexes**: Use WHERE clauses for subsets
  e.g. `WHERE is_deleted = false`

Document each index with:
- Which queries it supports
- Expected performance improvement
- Write overhead trade-off

### 9. Migration Strategy

- All schema changes MUST be versioned migrations
  (Flyway, Liquibase, EF Migrations, or similar)
- Every migration must be **reversible** — include both up and down scripts
- No destructive changes without a migration plan:
  - Column rename: Add new → copy data → update app → drop old
  - Column removal: Soft-deprecate → stop writing → verify → drop
  - Table split: Create new → dual-write → migrate readers → drop old
- Test migrations against production-volume data before deploying

### 10. Security Considerations

- **PII columns**: Mark with comment `-- PII`, document in data classification table
- **Encryption**: Specify columns needing application-level encryption
- **Row-Level Security**: Define RLS policies for multi-tenant data
- **Access control**: Define database roles and their permissions
- **Audit**: Specify tables needing change tracking (audit tables or CDC)

### 11. Performance Considerations

- **Partitioning**: For tables expected to exceed 10M rows, define partitioning
  (range, hash, or list)
- **Connection pooling**: Recommended pool size and timeout settings
- **Query timeout**: Maximum allowed query execution time per environment
- **Vacuum/maintenance**: Schedule for PostgreSQL VACUUM,
  SQL Server index rebuilds, etc.