# Rules: SQL Database Design Guidelines (TPSPhoenix)

> Source: TPSPhoenix-SQL_Database_Design_Guidelines_for_Micro-Services
> Status: IN PROGRESS — authoritative for all LLD DB design in this project

---

## 1. Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Table names | PascalCase, **singular** | `CustomerOrder`, `Customer` (NOT `Customers`) |
| Column names | PascalCase | `OrderDate`, `DateOfBirth` |
| Primary key column | Always named `Id` | `Id` |
| Index names | `IX_{TableName}_{ColumnName}` | `IX_CustomerOrder_TenantId` |
| Foreign key constraints | `FK_{TableName}_{ReferencedTableName}_{ColumnName}` | `FK_Order_Customer_CustomerId` |
| Abbreviations | Avoid unless industry-standard | `DateOfBirth` NOT `DOB` |

---

## 2. General Design Principles

### 2a — Database Per Microservice
- Each microservice **owns its own database** — no shared databases between services
- Promotes bounded context (DDD) and independent scalability
- Never design cross-service DB queries or joins in the LLD

### 2b — Surrogate Keys
- Use **auto-incremented `BIGINT`** or **`UNIQUEIDENTIFIER`** as primary keys — named `Id`
- **Never** use natural keys (email, SSN, phone) as PKs
- **Avoid compound primary keys** unless absolutely required
- PK is non-clustered when table partitioning applies (see §6)

### 2c — Column Data Types & Sizes

| Concern | Rule | Example |
|---------|------|---------|
| String columns | Smallest appropriate size — never `VARCHAR(MAX)` without justification | `VARCHAR(50)` not `VARCHAR(MAX)` |
| DateTime | Use `DATETIME2` — not `DATETIME` | `DATETIME2` |
| Monetary values | `DECIMAL(18,6)` — always 6 decimal places | `DECIMAL(18,6)` |
| Nullability | Always define explicitly — no implicit nullability | `NOT NULL` or `NULL` stated |
| Date-only fields | `DateOnly` in C# → `date` column type in SQL | `DateOnly DateOfBirth` |
| Time-only fields | `TimeOnly` in C# → `time` column type in SQL | `TimeOnly OpeningTime` |

---

## 3. Tenant-Aware Design (Multi-Tenant — Phoenix Standard)

- Every tenant-scoped table **must** include a `TenantId` column
- Entity classes must **inherit from `MultiTenantEntity`** (available in the framework)
- Use **Finbuckle** library for multi-tenancy
- In `OnModelCreating`, call `.IsMultiTenant()` for tenant-scoped entity types:

```csharp
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    base.OnModelCreating(modelBuilder);
    modelBuilder.ApplyConfiguration(new OrderEntityConfiguration());
    modelBuilder.Entity<OrderEntity>().IsMultiTenant();
    // Finbuckle automatically applies global query filter based on current tenant
}
```

- Define a **composite index on `(TenantId, [entity-specific columns])`** for query efficiency

### TenantId Column Specification
- Type: `NVARCHAR(50)` — numeric string identifiers (min 5 digits) to preserve lexical ordering
- Required (NOT NULL), exact type critical for partition elimination

---

## 4. Schema Changes

### EF Core Migrations Per Microservice
- Each microservice maintains its own `DbContext` and `Migrations` folder
- Migration history scoped to its own DB via `__EFMigrationsHistory`
- Use **EF Core Migration Bundles** in CI/CD (not raw `dotnet ef database update`)

### Migration Naming in LLD
When designing new migrations, name them descriptively:
- Format: `<Timestamp>_<PascalCaseDescription>`
- Example: `20260506120000_AddOrderTable`, `20260507_AddTenantIdIndexToCustomer`

---

## 5. Security Guidelines

| Concern | Rule |
|---------|------|
| Sensitive fields (SSN, CardNumber) | Encrypt/decrypt at application layer using shared utility class before persisting |
| PII Data | Encrypt with AES-256 before storing |
| DB access | Use **Azure AD Managed Identity** — never credentials in connection strings |
| SQL injection | EF Core parameterised queries by default — never raw SQL with string concatenation |
| Encryption at rest | **TDE (Transparent Data Encryption)** enabled on all Azure SQL databases |

---

## 6. Table Partitioning — Phoenix Microservice Rules

> Apply to all Phoenix microservice databases storing tenant-scoped data.

### Partition Keys & Data Types

Every tenant-scoped table must include:
- `TenantId NVARCHAR(50)` — numeric string identifiers (min 5 digits), NOT NULL
- `OrganizationId INT` — when the service also scopes by organisation, NOT NULL

**Types must be exact** — implicit conversions prevent partition elimination.

### Primary Key & Clustering Pattern

```csharp
// In EF Fluent API — PK must be non-clustered to reserve clustered index for partition alignment
HasKey(e => e.Id).IsClustered(false);
```

- Surrogate PK (`BIGINT` identity or `UNIQUEIDENTIFIER`) named `Id`, **non-clustered**
- Clustered index reserved for partition-aligned index (created post-deployment via SQL project)

### Partition Functions & Schemes (SQL Project / DACPAC)

```sql
-- Partition functions
CREATE PARTITION FUNCTION pf_TenantId (NVARCHAR(50)) AS RANGE LEFT FOR VALUES (/* known tenant IDs */)
CREATE PARTITION FUNCTION pf_OrganizationId (INT) AS RANGE LEFT FOR VALUES (/* known org IDs */)

-- Partition schemes
CREATE PARTITION SCHEME ps_TenantId AS PARTITION pf_TenantId ALL TO ([PRIMARY])
CREATE PARTITION SCHEME ps_OrganizationId AS PARTITION pf_OrganizationId ALL TO ([PRIMARY])
```

### Post-Deployment Clustered Index (Partition-Aligned)

```sql
-- Added in SQL project AFTER EF creates tables
CREATE CLUSTERED INDEX IX_{Entity}_TenantId_Id
ON dbo.{Entity} (TenantId, Id)
ON ps_TenantId(TenantId);
```

### Non-Partitioned Tables
- Tables with Phoenix-global scope (no tenant/org affinity) are **not** partitioned
- Retain normal clustered index strategy for these

### Secondary Indexes for Tenant-Scoped Tables
- `TenantId` must be the **leading key** in all secondary indexes: `(TenantId, <HotFilterColumns>)`
- Always create composite indexes on `(TenantId, [entity-specific])` for access paths
- Do NOT use `OPTION(RECOMPILE)` — design correct data types instead

---

## LLD DB Design Output Checklist

Before submitting DB design in any LLD, verify:

- [ ] Table names are PascalCase singular
- [ ] All PKs named `Id` (BIGINT or UNIQUEIDENTIFIER)
- [ ] Tenant-scoped entities inherit `MultiTenantEntity`, have `TenantId NVARCHAR(50)`
- [ ] `.IsMultiTenant()` called in `OnModelCreating` for all tenant-scoped entities
- [ ] PK defined as non-clustered (`IsClustered(false)`) for partitioned tables
- [ ] Composite index `(TenantId, [entity-specific])` defined on all tenant-scoped tables
- [ ] Clustered partition-aligned index noted in LLD for post-deployment SQL project
- [ ] Monetary columns use `DECIMAL(18,6)`
- [ ] DateTime columns use `DATETIME2`
- [ ] `DateOnly` / `TimeOnly` used where time/date component not needed
- [ ] EF Core column type mappings explicit: `.HasColumnType("date")`, `.HasColumnType("time")`
- [ ] Sensitive fields flagged for app-layer encryption
- [ ] FK constraint names follow `FK_{Table}_{ReferencedTable}_{Column}` pattern
- [ ] Index names follow `IX_{TableName}_{ColumnName}` pattern
- [ ] Migration name is descriptive and timestamped
- [ ] No cross-service DB dependencies introduced
