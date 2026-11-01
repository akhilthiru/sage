# Rules: Pipeline Behaviour

## Mandatory Human Checkpoints

Two steps in the pipeline REQUIRE user input before proceeding. These cannot be bypassed:

### Checkpoint 1 — Service Confirmation (Step 3)
- User must explicitly type `CONFIRM` (or complete edits then `CONFIRM`)
- Agent may not assume confirmation from silence or adjacent messages

### Checkpoint 2 — LLD Approval (Step 7)
- User must explicitly type `APPROVE`
- `REVISE` triggers regeneration — approval still required after revision
- `REJECT` terminates the pipeline cleanly
- Publishing to Confluence is forbidden without prior `APPROVE`

---

## Repo Access Rules

- **Read-only.** No commits, no pushes, no branch creation, no file modifications in repos.
- Stashing uncommitted changes (before checkout) is permitted — local and reversible.
- Always stash with descriptive message: `tech-lead-agent auto-stash <timestamp>`

---

## LLD Design Rules

### Traceability
- Every design element must trace to HLD section, FRD requirement, or explicit `[ASSUMPTION]`
- Design is **additive only** — never removes existing contracts, endpoints, or tables

### Phoenix DB Standards — Enforcement (source: `.claude/rules/db-standards.md`)

| Rule | Severity if Violated |
|------|---------------------|
| Table names PascalCase **singular** (e.g., `CustomerOrder` not `Orders`) | BLOCKER |
| PK column always named `Id` | BLOCKER |
| Tenant-scoped entity inherits `MultiTenantEntity` | BLOCKER |
| `TenantId NVARCHAR(50)` NOT NULL on all tenant-scoped tables | BLOCKER |
| `.IsMultiTenant()` called in `OnModelCreating` (Finbuckle) | BLOCKER |
| PK non-clustered for partitioned tables: `HasKey(e=>e.Id).IsClustered(false)` | BLOCKER |
| Composite index `(TenantId, [...])` on all tenant-scoped tables | BLOCKER |
| Post-deployment clustered index `IX_{Entity}_TenantId_Id` noted in LLD | MAJOR |
| Monetary columns `DECIMAL(18,6)` — 6 decimal places always | BLOCKER |
| `DATETIME2` not `DATETIME` | MAJOR |
| `DateOnly` + `.HasColumnType("date")` for date-only fields | MAJOR |
| `TimeOnly` + `.HasColumnType("time")` for time-only fields | MAJOR |
| No `VARCHAR(MAX)` without explicit justification | MAJOR |
| Sensitive/PII fields flagged for app-layer AES-256 encryption | MAJOR |
| FK constraint name: `FK_{Table}_{ReferencedTable}_{Column}` | MINOR |
| Index name: `IX_{TableName}_{ColumnName}` | MINOR |
| No cross-service DB joins or shared databases | BLOCKER |
| EF Core migration per microservice — own DbContext and Migrations folder | BLOCKER |

### Phoenix API Standards — Enforcement (source: `.claude/rules/api-standards.md`)

| Rule | Severity if Violated |
|------|---------------------|
| DTOs used — never expose entity classes in API responses | BLOCKER |
| `[Authorize]` on all protected endpoints | BLOCKER |
| No secrets in `appsettings.json` — Azure Key Vault referenced | BLOCKER |
| PII fields encrypted AES-256 before storage | BLOCKER |
| Error responses use RFC 7807 `ProblemDetails` via `Hellang.Middleware.ProblemDetails` | MAJOR |
| `PhoenixValidationException` → 400 `ValidationProblemDetails` | MAJOR |
| `PhoenixException` → `MapPhoenixExceptionToProblemDetails` | MAJOR |
| URL versioning `/api/v1/` | MAJOR |
| Plural nouns in URIs (`/customers`, `/orders`) | MAJOR |
| No verbs in URIs (no `/getOrders`, `/updateProduct`) | MAJOR |
| `async Task<IActionResult>` on all controller actions | MAJOR |
| List endpoints paginated: `page` + `pageSize` query params | MAJOR |
| `AsNoTracking()` on all read-only EF queries | MINOR |
| Hyphens for multi-word URI segments (`/product-categories`) | MINOR |
| Swagger/SwaggerUI restricted to Development environment only | MAJOR |
| OAuth 2.0 / JWT Bearer authentication used | MAJOR |
| FluentValidation used for input validation | MINOR |

---

## Communication Rules

- One clear thing at a time — never combine a question with an action
- Always show what step you're on: `[Step N/8]`
- When waiting for user input, always state exactly what to type
- On any error: state what went wrong, where, and how to fix it

---

## State and Resume Rules

- Write to `.claude/memory/<EPIC_ID>/state.json` before and after every step
- On `/lld-resume <EPIC_ID>`: read state, resume from `current_step`, skip completed steps

---

## Error Escalation

| Situation | Action |
|-----------|--------|
| Jira epic not found | Halt, tell user to check epic ID |
| HLD not found / not linked | Halt — ask user for HLD URL. Do not proceed without it. |
| FRD not found / not linked | Halt — ask user for FRD URL. Do not proceed without it. Both are required. |
| Service repo not found on GitHub | Pause — ask user to verify repo name/access, or SKIP |
| Spec file missing | Note it, continue — LLD designs from scratch |
| Confluence publish failed | Save locally, offer RETRY or manual paste instructions |

---

## Automated Review Rules (Step 6b)

- Review runs automatically after every LLD generation — it is not optional
- Maximum 3 review rounds before escalating to user
- Auto-corrections (MINOR only) are applied directly to the LLD file — no round consumed
- Fix instructions returned to lld-generator must be precise: section, element, issue, fix
- lld-generator applies only the flagged fixes — no unrequested changes
- On `OVERRIDE`: user must provide a reason, it is logged in review-report.md with timestamp
- `OVERRIDE` does not clear the issues — they still appear in Section 11 of the published LLD
- Review report is always written to `output/<EPIC_ID>/review-report.md` and included in the published Confluence page
