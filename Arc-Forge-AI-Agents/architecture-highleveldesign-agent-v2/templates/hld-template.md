<!--
  TALON Rev Technical Architecture
  Document Type: High-Level Design
  Space: TPSPhoenix
  Parent Folder ID: 1473413558
-->

| Field | Value |
|-------|-------|
| **Status** | Draft |
| **Version** | 1.0 |
| **Author** | {author-name} |
| **Reviewer** | {reviewer-name} |
| **Last Updated** | {date} |
| **Feature Slug** | {feature-name} |
| **JIRA Epic** | {epic-url} |
| **FRD** | {frd-url} |

---

## 1. Requirements Summary

### 1.1 Purpose
{One-paragraph summary of the feature's intent — what business problem does this feature solve?}

---

## 2. Scope & Boundaries

### 2.1 In Scope
- {item}

### 2.2 Out of Scope
- {item — reason}

### 2.3 Assumptions
1. {assumption}

### 2.4 Dependencies
| Dependency | Type | Owner | Status |
|-----------|------|-------|--------|
| {name} | Service / Team / Data / External | {owner} | Available / Pending / Unknown |

### 2.5 Risks & Blockers
| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| {risk} | High/Med/Low | High/Med/Low | {mitigation} |

---

## 3. Domain & Service Ownership

### 3.1 Business Capability Mapping
| Level | Name |
|-------|------|
| Business Capability | {e.g., Dealer Operations} |
| Sub-Capability | {e.g., Parts & Inventory} |
| Domain | {e.g., Inventory} |
| Owning Service | {e.g., talon-inventory-service} |

### 3.2 New vs. Existing Service
**Decision:** Extend existing / New service boundary required

{Justification — 2–3 sentences}

### 3.3 Cross-Domain Interactions
| Domain / Service | Interaction Type | Data Exchanged | Boundary Type |
|-----------------|-----------------|---------------|---------------|
| {service name} | Sync / Async | {data} | API call / Event |

### 3.4 Domain Boundary Notes
{Important notes about boundary decisions, constraints, or future implications}

---

## 4. Service Communication

### 4.1 Synchronous API Communication
| Operation | Caller | Provider Service | Method | Reason for Sync |
|-----------|--------|-----------------|--------|-----------------|
| {operation} | {service} | {service} | REST POST/GET/etc. | {reason} |

### 4.2 Asynchronous Event Communication
**Pattern:** Orchestration / Choreography / Hybrid
{Brief justification}

Event publishing is handled by MassTransit. The framework manages outbox, transport bindings, and message infrastructure. Only include this section if the feature introduces or consumes specific domain events.

### 4.3 Failure & Compensation Handling
| Scenario | Failure Type | Handling Strategy | Compensation Action |
|----------|-------------|------------------|---------------------|
| {scenario} | Timeout / Error / Partial | Retry / DLQ / Rollback | {action} |

---

## 5. Database Design

### 5.1 Tables & Schema

#### {TableName}
**Purpose:** {what this table stores}
**Schema:** {schema name}

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| Id | BIGINT IDENTITY(1,1) | PK, NOT NULL | Primary identifier |
| TenantId | NVARCHAR(64) | NOT NULL | Tenant partition key |
| {column} | {type} | {constraints} | {description} |
| CreatedAtUtc | DATETIME2 | NOT NULL | Audit — creation time |
| CreatedByUserId | BIGINT | NOT NULL | Audit — created by |
| UpdatedAtUtc | DATETIME2 | NOT NULL | Audit — last modified |
| UpdatedByUserId | BIGINT | NOT NULL | Audit — updated by |
| DeletedAtUtc | DATETIME2 | NULL | Soft delete marker |
| Version | ROWVERSION | NOT NULL | Optimistic concurrency token |

**Constraints & Indexes:**
- `PK_{TableName} (Id)`
- `IX_{TableName}_TenantId_{FilterCol} (TenantId, {FilterCol})`

### 5.2 Relationships
| Table | Relationship | Related Table | FK Column | Notes |
|-------|------------|--------------|-----------|-------|
| {table} | Many-to-One | {table} | {fk_col} | {notes} |

### 5.3 Key Business Rules
1. {rule enforced at data layer}

### 5.4 Indexing Strategy
| Table | Index Columns | Type | Query Pattern |
|-------|-------------|------|---------------|
| {table} | TenantId, {col} | Composite | {pattern} |

### 5.5 Standards & Migration Notes
{Alignment confirmation and migration/backfill concerns}

---

## 6. API & Integration Design

### 6.1 Internal APIs

#### {Service Name} — {Endpoint Group}

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| {METHOD} | `/v1/{path}` | {what this endpoint does} | Bearer / Managed identity |

### 6.2 External Integrations
| System | Type | Auth Method | Notes |
|--------|------|------------|-------|
| {system} | REST / Event | {method} | {notes} |

### 6.3 API Versioning Strategy
URL path versioning: `/v1/` prefix on all endpoints. Breaking changes require `/v2/`.

---

## 7. Diagrams

### 7.1 Component Diagram

```
+------------------+        REST         +------------------+
| {Service A}      |-------------------->| {Service B}      |
|                  |                     |                  |
| [Azure SQL]      |                     | [Azure SQL]      |
+------------------+                     +------------------+
```

### 7.2 Sequence Diagram — {Primary Flow Name}

```
{Actor/Client}       {Service A}          {Service B}          {DB}
      |                    |                    |                 |
      |--POST /v1/path---->|                    |                 |
      |                    |--GET /v1/dep------->|                |
      |                    |<--200 OK------------|                |
      |                    |                    |                 |
      |                    |--INSERT------------|---------------->|
      |                    |<--OK---------------|-----------------|
      |                    |                    |                 |
      |<--201 Created------|                    |                 |
```

---

## 8. Non-Functional Requirements

Only include requirements that are exceptional or feature-specific — i.e., they differ from, extend, or add to the platform NFR baseline. Do not list standard platform defaults (TLS, RBAC, audit logging, Polly, etc.).

| # | Category | Requirement | Target / Constraint | Deviation from Baseline |
|---|----------|-------------|---------------------|------------------------|
| NFR-01 | {Category} | {specific exceptional requirement} | {target or constraint} | {how this differs from the platform baseline} |
