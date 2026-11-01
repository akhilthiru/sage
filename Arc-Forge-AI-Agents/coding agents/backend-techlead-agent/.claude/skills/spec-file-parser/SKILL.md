---
agent: spec-file-parser
attached_to: spec-reader-agent
---

# Skill: Spec File Parser

## Purpose
Read and parse the three spec files in a repo's `specifications/` folder. Used by spec-reader-agent.

---

## Reading Each File

### openapi.yaml — Parse as YAML

```bash
cat <repo_path>/specifications/openapi.yaml
```

The file is a valid OpenAPI 3.x document. Parse the YAML structure directly — do not treat it as prose.

Key extraction paths:
```
info.version                          → API version string
servers[0].url                        → base URL
paths.<path>.<method>.operationId     → each endpoint
paths.<path>.<method>.tags            → endpoint tags
components.schemas                    → map of schema name → schema object (extract keys only)
components.securitySchemes            → map of scheme name → definition (extract keys only)
```

Build endpoint list as: `[{ method: "GET", path: "/api/v1/orders", operationId: "ListOrders" }]`

If the file is empty or has YAML parse errors: return `{ found: true, parse_error: true, raw_content: "<content>" }` — the LLD generator will skip existing-spec checks for this service.

---

### asyncapi.yaml — Parse as YAML

```bash
cat <repo_path>/specifications/asyncapi.yaml
```

The file is a valid AsyncAPI 3.x or 2.x document.

**AsyncAPI 3.x extraction:**
```
info.version
servers.<name>.protocol               → broker type (kafka, amqp, etc.)
channels.<name>.address               → topic/queue address
operations.<name>.action              → "send" or "receive"
operations.<name>.channel.$ref        → links operation to channel
components.messages                   → message schema names (extract keys only)
```

Build channel list as: `[{ name: "orders.order.created", role: "producer", message_schema: "OrderCreatedMessage" }]`

**AsyncAPI 2.x extraction:**
```
info.version
servers.<name>.protocol
channels.<address>.publish            → this service produces
channels.<address>.subscribe          → this service consumes
channels.<address>.publish.message.$ref or message.name
```

Detect version from `asyncapi:` field at root (`"3.0.0"` vs `"2.6.0"` etc.) and apply the correct parsing path.

---

### db-schema.md — Parse as Markdown

```bash
cat <repo_path>/specifications/db-schema.md
```

This is a human-written Markdown file. Parse it by scanning for known patterns.

**Table detection:**

Pattern A — `### <TableName>` heading followed by a Markdown table:
```markdown
### Orders
| Column | Type | Nullable | Default | PK | FK |
```
Extract table name from heading. Extract columns from table rows.

Pattern B — SQL `CREATE TABLE` inside a code block:
```
```sql
CREATE TABLE Orders ( ... )
```
```
Use regex: `CREATE TABLE (\w+)\s*\(([^)]+)\)` to extract table name and column definitions.
Parse column lines: `ColumnName TYPE [NOT NULL] [DEFAULT value] [PRIMARY KEY]`

**Index detection:**

Pattern A — Markdown table after "**Indexes:**":
```markdown
**Indexes:**
| Name | Columns | Unique |
```

Pattern B — SQL `CREATE INDEX`:
```sql
CREATE [UNIQUE] INDEX IX_Orders_Status ON Orders(Status)
```
Regex: `CREATE (UNIQUE )?INDEX (\w+) ON (\w+)\(([^)]+)\)`

**Migration metadata detection:**

Look for these exact patterns anywhere in the file:
```
**Last migration:** 20260101_AddOrdersTables
Last migration: 20260101_AddOrdersTables
Migration: 20260101_AddOrdersTables
```
Regex: `[Ll]ast migration[:\s]+(\S+)`

Also look for:
```
**Migration tool:** EF Core
```

---

## Error Handling

| Situation | Response |
|-----------|---------|
| File not found | `{ found: false }` — do not error |
| YAML parse error on openapi/asyncapi | `{ found: true, parse_error: true, raw_content: "..." }` |
| db-schema.md has no recognisable table patterns | `{ found: true, tables: [], note: "No parseable table definitions found" }` |
| File is empty | `{ found: true, tables/endpoints/channels: [], note: "File is empty" }` |

Never halt the pipeline for a parse error — always return partial data with a note.

---

## Important: Read-Only

Always use `cat` / file read. Never write to, modify, or delete any file in any repo.
