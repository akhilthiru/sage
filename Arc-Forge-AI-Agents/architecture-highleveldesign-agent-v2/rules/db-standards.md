# Database Design Standards — TALON Rev Platform

> These rules are mandatory. Every database schema designed in an HLD must conform to these standards.
> The DB Schema Designer sub-agent must validate its output against every rule here before returning.

## Technology Stack

- **Primary OLTP store**: Azure SQL (SQL Server) — for all transactional data
- **Permissions / non-relational**: Cosmos DB (MongoDB API) — for permissions, feature flags, tenant config
- **Migrations**: EF Core migrations — all schema changes via code-first migration scripts
- **ORM**: EF Core with explicit configuration — no conventions-only mapping

## Naming Conventions

- Table names: PascalCase, singular noun — `RepairOrderItem` not `repair_order_items`
- Column names: PascalCase — `CreatedAtUtc` not `created_at`
- Primary keys: always named `Id`
- Foreign keys: `{ReferencedTable}Id` — e.g., `RepairOrderId`, `InventoryItemId`
- Index names: `IX_{Table}_{Columns}` — e.g., `IX_RepairOrderItem_TenantId_RepairOrderId`
- Constraint names: `PK_{Table}`, `FK_{Table}_{Referenced}`, `CK_{Table}_{Description}`
- Schema names: lowercase, matches service domain — e.g., `inventory`, `repair`, `pricing`

## Mandatory Audit Columns

Every table must include these columns — no exceptions:

| Column | Type | Notes |
|--------|------|-------|
| `CreatedAtUtc` | DATETIME2 | Set on insert, never updated |
| `CreatedByUserId` | BIGINT | User who created the record |
| `UpdatedAtUtc` | DATETIME2 | Updated on every write |
| `UpdatedByUserId` | BIGINT | User who last updated |

## Mandatory Concurrency Column

All tables that support updates must include:

| Column | Type | Notes |
|--------|------|-------|
| `Version` | ROWVERSION | Optimistic concurrency token — required on all update/delete mutations |

Configure EF Core: `.IsRowVersion()` on the `Version` property.

## Soft Delete

- All tables must use soft delete — never hard delete rows unless explicitly justified
- Soft delete column: `DeletedAtUtc DATETIME2 NULL` (null = active, timestamp = deleted)
- All EF Core queries must apply a global query filter: `WHERE DeletedAtUtc IS NULL`
- Hard deletes require explicit architectural justification documented in the HLD

## Tenant Isolation

- All tables must include `TenantId NVARCHAR(64) NOT NULL`
- All EF Core queries must include `TenantId` as a filter — no cross-tenant data access permitted
- Apply a global EF Core query filter on `TenantId` in the DbContext
- Composite indexes must lead with `TenantId`

## Primary Keys

- Use `BIGINT IDENTITY(1,1)` for primary keys unless a domain-specific natural key applies
- UUIDs permitted only where distributed generation is required (e.g., event IDs) — document the reason
- Do not expose surrogate integer PKs in external API responses — use domain identifiers or GUIDs

## Quantity / Financial Fields

- Use `DECIMAL(18,6)` for all quantity and financial fields — never `FLOAT` or `REAL`
- Include check constraints to prevent negative quantities where the domain prohibits them

## Relationships & Constraints

- All foreign keys must be explicitly declared with named constraints
- Cascade rules must be documented: `ON DELETE CASCADE` only where logically correct
- Check constraints must cover all domain invariants enforceable at the DB layer
- Reference `EnumType` table for all lookup/enum values — never store raw string enum names

## Indexing

- Every table must have indexes covering its primary query patterns
- Always index `(TenantId, {primary filter column})` composite
- Avoid over-indexing — document the query pattern that justifies each index in the HLD
- Covering indexes preferred over key + included columns where access patterns are clear

## Schema Ownership

- Each service owns its own Azure SQL database — no cross-service direct table joins
- Cross-service data access is via API only, never direct DB queries
- Schema name matches the service domain within its own database

## Enum/Lookup Values

- Use a shared `EnumType` table pattern for lookup values:
  - Columns: `Type NVARCHAR(64)`, `EnumValue NVARCHAR(64)`, `DisplayName NVARCHAR(256)`, `Language NVARCHAR(10)`
- Never use magic numbers or raw string literals — always reference via the enum table

## Cosmos DB (MongoDB API) Usage

- Use Cosmos DB only for: permissions documents, tenant configuration, feature flags, non-transactional reads
- Collection naming: PascalCase, plural — `TenantConfigurations`, `UserPermissions`
- All documents must include: `tenantId`, `createdAtUtc`, `updatedAtUtc`, `_id` (string UUID)
- Partition key must be specified and documented — typically `tenantId` or composite with entity type
- Never use Cosmos DB for OLTP or ACID-required operations

## Migration Standards

- All Azure SQL schema changes via EF Core migration scripts — no manual DDL in production
- Migrations must be backward compatible during deployment window
- Backfill strategies for new NOT NULL columns must be documented in the HLD
- Each migration script must include a rollback path (or document why rollback is not safe)
- Migration file naming: `{timestamp}_{PascalCaseDescription}.cs`

## EF Core Configuration

- Explicit column type mapping for all `DECIMAL` columns: `.HasColumnType("DECIMAL(18,6)")`
- Explicit `nvarchar` length for string columns: `.HasMaxLength(256)`
- All navigation properties must be explicitly configured — no shadow FK assumptions
- `DbContext` must register global query filters for `TenantId` and `DeletedAtUtc`
