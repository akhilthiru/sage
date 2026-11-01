---
agent: spec-reader
description: Reads specifications/openapi.yaml, specifications/asyncapi.yaml, specifications/db-schema.md from each confirmed repo via GitHub API to establish current service state baseline.
tools: [Bash]
---

# Agent: Spec Reader

## Purpose
Read each confirmed service repo's three spec files from GitHub to understand the current state of DB schema, OpenAPI endpoints, and AsyncAPI events. This is the baseline from which the LLD generates only the DELTA — what changes, not what already exists.

No local repo clones are required. Files are fetched directly from GitHub using the `gh` CLI.

## Called By
Orchestrator — Step 5

## Input
- `repos[]` — confirmed repo names (from service-identifier-agent)
- `github.org` and `github.base_branch` from `.claude/memory/project_config.md`

---

## Spec File Structure

Each repo has a `specifications/` folder containing three independent files:

```
<repo>/
└── specifications/
    ├── openapi.yaml      ← current OpenAPI 3.x spec
    ├── asyncapi.yaml     ← current AsyncAPI spec
    └── db-schema.md      ← current DB schema
```

Each file is read **independently**. Any one (or all) may be absent — that is normal and not an error. A service with no `openapi.yaml` may be a pure event consumer. A service with no `asyncapi.yaml` may be purely synchronous.

---

## Reading Files from GitHub

Use the `gh` CLI to fetch file content from the configured base branch. The GitHub Contents API returns base64-encoded content — pipe through `base64 -d` to decode.

```bash
# Read a spec file (returns decoded content or empty if not found)
gh api repos/<org>/<repo>/contents/specifications/<filename> \
  --header "ref: <base_branch>" \
  --jq '.content' 2>/dev/null | base64 -d 2>/dev/null
```

If the file does not exist, the API returns 404 and the command produces no output — treat as `{ found: false }`.

---

## File Discovery — Per File Per Repo

For each repo, attempt these filenames in order, stopping at the first that returns content.

### openapi.yaml
```
specifications/openapi.yaml    ← primary
specifications/openapi.yml
specifications/open-api.yaml
```

### asyncapi.yaml
```
specifications/asyncapi.yaml   ← primary
specifications/asyncapi.yml
specifications/async-api.yaml
```

### db-schema.md
```
specifications/db-schema.md    ← primary
specifications/db-schema.yaml
specifications/db-schema.sql
specifications/database.md
specifications/schema.md
```

**Per-repo overrides:** If `.claude/context/config.yaml` has `spec_file_overrides.<repo-name>.openapi` (or asyncapi / db_schema), use those paths instead of the discovery order above.

---

## What to Extract

### From `openapi.yaml` (full OpenAPI 3.x document)

Parse the YAML directly. Extract:
- `info.version` — current API version string
- `servers[0].url` — base path (e.g., `/api/v1` or `http://localhost:5000`)
- Every entry in `paths` → endpoint list: `{ method, path, operationId, tags[] }`
- All keys under `components.schemas` → list of already-defined schema names
- `components.securitySchemes` keys → existing auth scheme name(s)

**LLD generator uses this to:**
- Know which endpoints already exist → never emit a duplicate `method + path`
- Know which schema names are taken → new schemas must have distinct names
- Know the auth scheme to apply consistently on new endpoints

### From `asyncapi.yaml` (full AsyncAPI 3.x or 2.x document)

Parse the YAML directly. Extract:
- `info.version` — current spec version
- Broker/server type from `servers` block (Kafka, Azure Service Bus, RabbitMQ, etc.)
- Every channel → `{ address/name, role, messageSchema }`

**AsyncAPI 3.x role detection:**
- `operations` with `action: send` = this service **produces** on that channel
- `operations` with `action: receive` = this service **consumes** from that channel

**AsyncAPI 2.x role detection:**
- `channels.<name>.publish` = this service **produces**
- `channels.<name>.subscribe` = this service **consumes**

- All keys under `components.messages` → list of already-defined message schema names

**LLD generator uses this to:**
- Know which topics already exist → never redefine them
- Match the existing message envelope structure for new events

### From `db-schema.md` (Markdown document)

Parse flexibly — the file may use any of these formats:

**Format A — Markdown tables (preferred)**
```markdown
## Tables

### Orders
| Column | Type | Nullable | Default | PK | FK |
|--------|------|----------|---------|----|----|
| Id | uniqueidentifier | No | NEWSEQUENTIALID() | ✓ | |
| CustomerId | uniqueidentifier | No | — | | Customers.Id |
| Status | nvarchar(50) | No | — | | |
| CreatedAt | datetimeoffset | No | GETUTCDATE() | | |

**Indexes:**
| Name | Columns | Unique |
|------|---------|--------|
| IX_Orders_Status | Status | No |
| IX_Orders_CustomerId | CustomerId | No |
```

**Format B — SQL DDL code block**
```markdown
```sql
CREATE TABLE Orders (
    Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    CustomerId UNIQUEIDENTIFIER NOT NULL,
    Status NVARCHAR(50) NOT NULL,
    CONSTRAINT FK_Orders_Customers FOREIGN KEY (CustomerId) REFERENCES Customers(Id)
)
CREATE INDEX IX_Orders_Status ON Orders(Status)
```
```

Parse `CREATE TABLE` → table name, columns, PKs, FKs.
Parse `CREATE INDEX` → index name, table, columns.

**Migration metadata** — also extract if present:
```
**Last migration:** 20260101_AddOrdersTables
**Migration tool:** EF Core
```

This helps the LLD generator name the next migration in sequence.

---

## How This Data Is Used by LLD Generator

The LLD generator uses `CurrentServiceState` from each service to generate only the delta:

1. **DB:** Add only NEW tables or columns — never redesign or rename what already exists
2. **OpenAPI:** Add only NEW endpoints — never emit a duplicate `method + path`, never reuse existing schema names for a different shape
3. **AsyncAPI:** Add only NEW channels — never redefine existing topics
4. **Naming continuity:** New schemas, events, and migration names follow the same conventions already visible in this service's existing specs

---

## Output Per Service

```json
{
  "service": "order-service",
  "github_repo": "your-org/order-service",
  "github_branch": "main",
  "specifications_folder_exists": true,
  "files": {
    "openapi": {
      "found": true,
      "github_path": "specifications/openapi.yaml",
      "api_version": "3.1.0",
      "base_path": "/api/v1",
      "endpoints": [
        { "method": "GET", "path": "/api/v1/customers/{id}", "operationId": "GetCustomerById" },
        { "method": "GET", "path": "/api/v1/customers", "operationId": "ListCustomers" }
      ],
      "schema_names": ["CustomerResponse", "CustomerListResponse", "ProblemDetails"],
      "security_scheme": "BearerAuth"
    },
    "asyncapi": {
      "found": true,
      "github_path": "specifications/asyncapi.yaml",
      "spec_version": "3.0.0",
      "broker": "Azure Service Bus",
      "channels": [
        { "name": "customers.customer.created", "role": "producer", "message_schema": "CustomerCreatedMessage" }
      ],
      "message_names": ["CustomerCreatedMessage"]
    },
    "db_schema": {
      "found": true,
      "github_path": "specifications/db-schema.md",
      "last_migration": "20260101_AddCustomerTable",
      "migration_tool": "EF Core",
      "tables": [
        {
          "name": "Customers",
          "columns": [
            { "name": "Id", "type": "uniqueidentifier", "nullable": false, "pk": true },
            { "name": "Email", "type": "nvarchar(255)", "nullable": false }
          ],
          "indexes": [
            { "name": "IX_Customers_Email", "columns": ["Email"], "unique": true }
          ]
        }
      ]
    }
  }
}
```

When no spec files are found (new service or repo has no `specifications/` folder):
```json
{
  "service": "new-service",
  "github_repo": "your-org/new-service",
  "github_branch": "main",
  "specifications_folder_exists": false,
  "files": {
    "openapi":   { "found": false },
    "asyncapi":  { "found": false },
    "db_schema": { "found": false }
  },
  "note": "No spec files found on GitHub. LLD will design this service from scratch."
}
```

---

## Persist to Memory

Immediately after building all `CurrentServiceState` objects, write the full array to disk:

```
Path: .claude/memory/<EPIC_ID>/service-state.json
```

Format: a JSON array — one `CurrentServiceState` object per confirmed service.

Create the directory if it does not exist. This file is the durable handoff to downstream agents and survives pipeline resume.

---

## Notify Skill

At the end of this agent's execution, invoke the Notify Skill (`.claude/skills/notify-skill/SKILL.md`):

Follow `.claude/skills/notify-skill/SKILL.md` exactly — two steps every time:

**Step 1 — Desktop toast:**
```bash
bash .claude/scripts/notify.sh "Spec Reader Agent" "<Status>" "<Summary>"
```

**Step 2 — Push notification (always runs after Step 1, regardless of toast outcome):**
```
PushNotification
  message: "Spec Reader Agent — <Status>: <Summary>"
  status: "proactive"
```

Keep the push message under 200 characters. If either step fails, log and continue — notifications never block the pipeline.

**Summary examples for this agent:**

| Status | Example Summary |
|--------|----------------|
| Completed | {N} service spec files read. {M} with full specs, {K} missing specs noted. |
| Blocked | Could not read spec files — repos not accessible or not on base branch. |

Follow the summary authoring rules in the skill file:
- 1–2 sentences, past tense, plain text, no markdown
- `Completed`: state the key output
- `Blocked`: state the blocker and what is needed
- `Failed`: state what failed in plain terms

Failure of the notify script does **not** block the workflow — log and continue.

---


## Summary Report to User

```
📋 Reading service specifications from GitHub (<org>/<branch>)...

   order-service
   ├── specifications/openapi.yaml    ✅  API v3.1.0 — 6 endpoints, 8 schemas
   ├── specifications/asyncapi.yaml   ✅  Azure Service Bus — 1 producer channel
   └── specifications/db-schema.md    ✅  3 tables (last migration: 20260101_AddCustomerTable)

   payment-service
   ├── specifications/openapi.yaml    ✅  API v3.1.0 — 4 endpoints, 5 schemas
   ├── specifications/asyncapi.yaml   ✅  Azure Service Bus — 2 consumer channels
   └── specifications/db-schema.md    ✅  2 tables (last migration: 20260115_AddPaymentTable)

   notification-service
   ├── specifications/openapi.yaml    ⚠️  Not found on GitHub — new endpoints designed from scratch
   ├── specifications/asyncapi.yaml   ✅  Azure Service Bus — 1 consumer channel
   └── specifications/db-schema.md    ⚠️  Not found on GitHub — DB design starts from scratch
```
