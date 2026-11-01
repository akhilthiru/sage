# Database Design — Industry Reference Baseline

> This file contains industry-standard database design principles used as the baseline for `rules/db-standards.md`.
> Do not modify this file. To update TALON Rev-specific standards, run `/sync-rules`.

## Relational Database Design Principles

### Normalisation
- **1NF**: Each column contains atomic values; no repeating groups
- **2NF**: Every non-key attribute is fully dependent on the whole primary key
- **3NF**: No transitive dependencies — non-key columns depend only on the PK
- **BCNF**: Every determinant is a candidate key
- Denormalise intentionally for read performance — document the trade-off

### Table Design
- Each table represents one entity or relationship — single responsibility
- Avoid "god tables" that store multiple unrelated entity types via a type discriminator
- Use separate tables for polymorphic variants rather than nullable columns for different types

### Column Design
- Choose the most restrictive appropriate data type
- Explicit NOT NULL where domain prohibits nullability
- Avoid generic column names: `Value`, `Data`, `Info` — use descriptive names
- Boolean columns: prefix with `Is`, `Has`, `Can` — e.g., `IsActive`, `HasAttachments`
- Date columns: suffix with `At` and timezone context — `CreatedAtUtc`, `ProcessedAt`

## Naming Conventions

### Tables
- PascalCase, singular: `OrderItem`, `Customer`, `PaymentMethod`
- Avoid abbreviations: `RepairOrder` not `RO`
- Junction tables: combine both entity names — `OrderItem`, `UserRole`

### Columns
- PascalCase: `FirstName`, `TotalAmount`, `CreatedAtUtc`
- PKs: `Id` (surrogate) or `{EntityName}Id` for natural keys
- FKs: `{ReferencedTable}Id` — e.g., `OrderId`, `CustomerId`
- Timestamps: always UTC — `CreatedAtUtc`, `UpdatedAtUtc`, `DeletedAtUtc`

### Indexes
- `IX_{Table}_{Columns}`: `IX_OrderItem_TenantId_OrderId`
- `UX_{Table}_{Columns}` for unique indexes
- `PK_{Table}` for primary keys
- `FK_{Table}_{Referenced}` for foreign key constraints
- `CK_{Table}_{Description}` for check constraints

## Primary Keys

### Surrogate Keys (Auto-increment / Identity)
- Simple, compact, fast for joins
- `BIGINT IDENTITY(1,1)` for SQL Server
- `SERIAL` / `BIGSERIAL` for PostgreSQL
- Never expose surrogate keys in external APIs

### Natural Keys
- Use when the business key is stable and uniquely identifies the entity
- Ensure uniqueness constraints are in place

### UUIDs (GUIDs)
- Use when distributed generation is required (no DB round-trip)
- Version 4 (random) for most cases; Version 7 (time-ordered) for better index performance
- Consider performance impact on clustered indexes in SQL Server

## Foreign Keys & Relationships

- Always declare FK constraints explicitly — do not rely on application-layer enforcement
- Name all constraints: `FK_{ChildTable}_{ParentTable}` or `FK_{Table}_{Column}`
- Document cascade rules: `ON DELETE CASCADE` only when child records have no meaning without parent
- `ON DELETE SET NULL` for optional relationships
- `ON DELETE RESTRICT` / `NO ACTION` as safe default

## Indexes

### Types
| Type | When to use |
|------|------------|
| B-tree (default) | Equality, range, ORDER BY |
| Hash | Equality only (PostgreSQL) |
| Full-text | Text search |
| Covering | Avoid table lookups for high-frequency queries |
| Partial | Index subset of rows matching a condition |

### Guidelines
- Index every FK column — prevents full table scans on joins
- Composite index column order: most selective first, or leading with partition/tenant key
- Monitor unused indexes — each index has a write cost
- Avoid over-indexing OLTP tables — target specific query patterns

### Covering Indexes
```sql
CREATE INDEX IX_Order_TenantId_Status_CreatedAt
ON [Order] (TenantId, Status)
INCLUDE (CreatedAtUtc, TotalAmount)
```

## Data Integrity

### Constraints
- `NOT NULL` — enforce domain completeness at DB layer
- `UNIQUE` — enforce business uniqueness rules
- `CHECK` — enforce domain invariants (e.g., `CHECK (Quantity > 0)`)
- `DEFAULT` — set application-level defaults at DB layer for safety

### Audit Trail
Standard audit columns for all mutable tables:
```sql
CreatedAtUtc    DATETIME2    NOT NULL,
CreatedByUserId BIGINT       NOT NULL,
UpdatedAtUtc    DATETIME2    NOT NULL,
UpdatedByUserId BIGINT       NOT NULL
```

### Soft Delete
```sql
DeletedAtUtc DATETIME2 NULL  -- NULL = active, timestamp = soft deleted
```
- Filter all queries: `WHERE DeletedAtUtc IS NULL`
- Hard delete only with explicit justification

## Concurrency

### Optimistic Concurrency
- Add a version/row version column: `Version ROWVERSION` (SQL Server) or `xmin` (PostgreSQL)
- Application checks version before update — returns 409 on mismatch
- No locks held — high read throughput

### Pessimistic Concurrency
- Use `SELECT ... FOR UPDATE` (PostgreSQL) or `WITH (UPDLOCK)` (SQL Server)
- Reserved for short critical sections — avoid long-held locks

## Multi-Tenancy Patterns

### Shared Database, Shared Schema (Row-Level)
- All tables have `TenantId` column
- Every query filters by `TenantId`
- Simple to operate, lowest cost, suitable for most SaaS
- Risk: misconfigured queries may expose cross-tenant data

### Shared Database, Separate Schema
- One schema per tenant in the same database
- Better isolation, schema customisation per tenant possible

### Separate Database per Tenant
- Maximum isolation and security
- High operational cost — only for enterprise/regulated tenants

## Migrations & Schema Changes

### Migration-Based Approach
- All changes via migration scripts — never manual DDL in production
- Scripts must be idempotent (safe to run more than once) or sequential and tracked
- Include both `Up` and `Down` migrations

### Zero-Downtime Migrations
1. **Expand**: add new column (nullable), run app reading both old and new
2. **Migrate**: backfill data in batches
3. **Contract**: make column NOT NULL, remove old column in next release

### Backfill Strategy
- Batch backfills: update N rows at a time to avoid table locks
- Do not UPDATE in a single transaction affecting millions of rows

## Stored Procedures & Views

### When to use
- Complex reporting queries that need DB-layer optimisation
- Views for backward-compatible schema changes

### When NOT to use
- Business logic — belongs in the application layer
- Transaction management — belongs in the application layer

## NoSQL / Document Store Design

### Document Structure
- Design documents around access patterns, not normalisation
- Embed related data that is always accessed together
- Reference (by ID) data accessed independently or frequently updated

### Partitioning
- Choose partition key carefully — determines scalability and query performance
- High cardinality, even distribution, included in all queries
- Avoid hot partitions (single tenant with very high write volume)

### Cosmos DB (MongoDB API) Guidelines
- Collection per entity type or logical group
- Partition key: `tenantId` or composite `(tenantId, entityType)`
- Indexing policy: index all fields by default, exclude large text/blob fields
- TTL for ephemeral documents (sessions, temp data)
- Avoid transactions across partitions — model to avoid cross-partition writes
