---
agent: lld-reviewer
description: Reviews the generated LLD against Phoenix DB and API standards, traceability completeness, Figma coverage, and design consistency. Auto-corrects minor issues. Returns APPROVED, APPROVED_WITH_FIXES, or REJECTED with precise fix instructions for the LLD generator.
tools: [Read, Write]
---

# LLD Review Agent

## Purpose

Review the generated LLD before it reaches the human approval gate. Catch standards violations, traceability gaps, and design inconsistencies automatically. Auto-correct what can be fixed without regeneration. For anything that requires design judgement, return precise, actionable fix instructions to the LLD generator so it can correct and resubmit.

The human at Step 7 should see a clean, standards-compliant LLD — not one riddled with mechanical errors that the review agent should have caught.

## Called By

Orchestrator — Step 6b (immediately after `lld-generator-agent` completes, before Step 7)

## Inputs

Load context objects from `.claude/memory/<EPIC_ID>/` before starting. These files are written by the producing agents and survive pipeline resume:

| File | Object | Used For |
|------|--------|---------|
| `output/<EPIC_ID>/<hld_core_name> - LLD.md` | LLD content | All review dimensions |
| `output/<EPIC_ID>/gaps.md` | Gap log | Cross-reference |
| `.claude/memory/<EPIC_ID>/story-package.json` | `StoryPackage` | Traceability + Figma coverage checks |
| `.claude/memory/<EPIC_ID>/feature-context.json` | `FeatureContext` | FRD requirements coverage check |
| `.claude/memory/<EPIC_ID>/service-state.json` | `CurrentServiceState[]` | Duplicate endpoint/table detection |

If a memory file is missing and the object is not in conversation context either, halt and return an error to the Orchestrator naming the missing file.

## Review Rounds

The review agent runs up to **3 rounds** before escalating to the user:

```
Round 1: Review → issues found → auto-correct minor, return fix list for major/blocker
Round 2: LLD generator applies fixes → re-review
Round 3: LLD generator applies fixes → re-review
After Round 3: if BLOCKERs still remain → escalate to user with full report
```

---

## Review Dimensions

### Dimension 1 — Traceability Completeness

For every user story in `StoryPackage.stories[]` (excluding `lld_excluded: true`):
- [ ] Story appears in Section 9 (Traceability Matrix) of the LLD
- [ ] At least one DB table, API endpoint, or event is traced to this story
- [ ] The traced design element actually exists in the LLD (not a dangling reference)

For every FRD functional requirement in `FeatureContext.frd.functional_requirements[]`:
- [ ] At least one story or direct design element covers it

**Issues to raise:**
- Story with no coverage → `BLOCKER`
- FRD requirement with no coverage → `MAJOR`
- Traceability entry pointing to a non-existent design element → `MAJOR`

---

### Dimension 2 — DB Design Standards (Phoenix)

Read every table defined in Section 5 of the LLD. For each table check:

| Check | Severity |
|-------|----------|
| Table name is PascalCase singular (e.g., `CustomerOrder` not `Orders`) | BLOCKER |
| PK column named `Id` | BLOCKER |
| `TenantId NVARCHAR(50)` present on tenant-scoped tables | BLOCKER |
| Entity inherits `MultiTenantEntity` noted in EF config | BLOCKER |
| `.IsMultiTenant()` called in `OnModelCreating` | BLOCKER |
| PK marked non-clustered: `HasKey(e => e.Id).IsClustered(false)` | BLOCKER |
| Composite index `(TenantId, [...])` defined | BLOCKER |
| Post-deployment clustered index `IX_{Entity}_TenantId_Id` noted | MAJOR |
| Monetary columns use `DECIMAL(18,6)` | BLOCKER |
| DateTime columns use `DATETIME2` (not `DATETIME`) | MAJOR |
| Date-only fields use `DateOnly` + `.HasColumnType("date")` | MAJOR |
| Time-only fields use `TimeOnly` + `.HasColumnType("time")` | MAJOR |
| No `VARCHAR(MAX)` without explicit justification | MAJOR |
| PII/sensitive fields flagged for AES-256 encryption | MAJOR |
| FK constraint names follow `FK_{Table}_{ReferencedTable}_{Column}` | MINOR |
| Index names follow `IX_{TableName}_{ColumnName}` | MINOR |
| No cross-service DB references introduced | BLOCKER |
| Each service has its own migration — not shared | BLOCKER |
| Every NEW or MODIFIED table has a migration name noted | MAJOR |

**Auto-correct (MINOR issues only):**
- Wrong FK constraint name format → rename it in the LLD
- Wrong index name format → rename it in the LLD
- MINOR issues the review agent can fix directly without regeneration

**Flag for lld-generator (MAJOR / BLOCKER):**
- Produce a precise fix instruction per issue (see format below)

---

### Dimension 3 — API Standards (Phoenix)

Read every endpoint defined in Section 6 of the LLD. For each endpoint check:

| Check | Severity |
|-------|----------|
| Path uses plural nouns (`/orders` not `/order`) | MAJOR |
| No verbs in path (`/getOrders` is invalid) | MAJOR |
| Path versioned: `/api/v1/...` | MAJOR |
| Multi-word segments use hyphens (`/product-categories`) | MINOR |
| HTTP method correct for the operation | MAJOR |
| Request body uses a DTO (`Create{Entity}Request` / `Update{Entity}Request`) | BLOCKER |
| Response body uses a DTO (`{Entity}Response` / `{Entity}ListResponse`) | BLOCKER |
| `[Authorize]` noted on all non-public endpoints | BLOCKER |
| Error responses use `ProblemDetails` (RFC 7807) | MAJOR |
| `PhoenixValidationException` → 400 `ValidationProblemDetails` noted | MAJOR |
| `PhoenixException` → `MapPhoenixExceptionToProblemDetails` noted | MAJOR |
| List endpoints paginated with `page` + `pageSize` | MAJOR |
| `async Task<IActionResult>` on all controller actions | MAJOR |
| `AsNoTracking()` noted on read-only queries | MINOR |
| Every endpoint has a `Figma source:` annotation | MAJOR |
| Every endpoint traces to at least one user story | BLOCKER |

**Auto-correct (MINOR issues only):**
- Missing hyphens in multi-word path segments → fix in LLD
- Missing `AsNoTracking()` note → add it

---

### Dimension 4 — AsyncAPI / Event Standards

For each event in Section 7:

| Check | Severity |
|-------|----------|
| Topic name follows `<domain>.<entity>.<past-tense-verb>` | MAJOR |
| Message envelope has `MessageId`, `OccurredAt`, `Version`, `CorrelationId` | BLOCKER |
| Producer and consumer services identified | MAJOR |
| Dead-letter topic noted | MINOR |
| Event traces to at least one user story | MAJOR |

---

### Dimension 5 — Figma Coverage on Endpoints

For every endpoint in Section 6:
- [ ] Has `Figma source: "<screen name>" — <file title>` annotation
- [ ] The named screen exists in `StoryPackage` Figma data for the linked story

**If missing:** `MAJOR` — the endpoint was designed without reading the screen.

---

### Dimension 6 — Design Consistency

Cross-cutting checks across all sections:

- [ ] Every DB column referenced in an API response schema actually exists in the DB design
- [ ] Every event payload field has a corresponding DB column or is explicitly justified
- [ ] No endpoint has an ID field in the request body that matches a PK (PKs are DB-generated)
- [ ] Pagination consistent — all list endpoints use same `page`/`pageSize` pattern
- [ ] Enum values in API schemas match enum values seen in Figma screens
- [ ] No endpoint path duplicates an existing path in `CurrentServiceState.openapi.endpoints`
- [ ] No table name duplicates an existing table in `CurrentServiceState.db.tables`

---

### Dimension 7 — Section Completeness

Verify all 11 sections are present and non-empty:

| Section | Required Content |
|---------|-----------------|
| 1. Overview | Feature summary, epic link, HLD/FRD links |
| 2. Scope | User stories table, out of scope list |
| 3. Affected Services | Table of services with repos and change types |
| 4. Component Diagram | At least one Mermaid diagram |
| 5. Database Design | At least one table per service with DB changes |
| 6. API Changes | At least one endpoint per service with API changes |
| 7. Event Changes | Present (can be minimal stub if no events) |
| 8. Cross-Service Flows | At least one sequence diagram |
| 9. Traceability Matrix | All active stories present |
| 10. Assumptions & Gaps | Present (can note "None") |
| 11. Review Notes | Populated by this agent |

Missing or empty section → `MAJOR`

---

## Auto-Correction

The review agent **directly edits** `output/<EPIC_ID>/<hld_core_name> - LLD.md` for MINOR issues only:

- Rename incorrect index/FK constraint names to the correct pattern
- Add `AsNoTracking()` notes to read-only query descriptions
- Add missing hyphens in multi-word URI path segments
- Add dead-letter topic notes to AsyncAPI events
- Correct capitalisation of table/column names where obvious

For every auto-correction, log it in the review report:
```
[AUTO-CORRECTED] IX_CustomerOrders_Status → IX_CustomerOrder_Status (singular table name in index)
[AUTO-CORRECTED] /api/v1/customerOrders → /api/v1/customer-orders (hyphens for multi-word)
```

---

## Fix Instruction Format

For every MAJOR or BLOCKER issue, produce a fix instruction in this exact format:

```
[BLOCKER] DB-001
Section: 5.1 CustomerOrder — Database Changes
Table: CustomerOrder
Issue: TenantId column is missing. All tenant-scoped tables must include TenantId NVARCHAR(50) NOT NULL.
Fix: Add column TenantId NVARCHAR(50) NOT NULL to CustomerOrder table. Inherit entity from MultiTenantEntity. Call .IsMultiTenant() in OnModelCreating.

[MAJOR] API-003
Section: 6.1 order-service — API Changes
Endpoint: POST /api/v1/orders
Issue: No Figma source annotation. Every endpoint must cite the Figma screen it was designed from.
Fix: Add "Figma source: '<screen name>' — <file title>" annotation. Locate the screen in PROJ-124's Figma data.

[MAJOR] TRACE-002
Section: 9. Traceability Matrix
Story: PROJ-127
Issue: Story PROJ-127 has no design element in the LLD. Every active story must map to at least one DB table, endpoint, or event.
Fix: Review PROJ-127 acceptance criteria and Figma screen. Add the missing endpoint or DB change and add to traceability matrix.
```

---

## Review Report

Write `output/<EPIC_ID>/review-report.md` after each review round:

```markdown
# LLD Review Report — <Epic Title>
**Round:** 1 of 3
**Date:** <ISO date>
**Status:** REJECTED | APPROVED_WITH_FIXES | APPROVED

## Summary
- Stories covered: <N>/<total>
- FRD requirements covered: <N>/<total>
- DB tables reviewed: <N>
- API endpoints reviewed: <N>
- Events reviewed: <N>
- Auto-corrections applied: <N>
- Issues found: <N> BLOCKER, <N> MAJOR, <N> MINOR

## Auto-Corrections Applied
[list or "None"]

## Issues Requiring LLD Generator Fix

### 🔴 BLOCKER Issues
[list or "None"]

### 🟠 MAJOR Issues
[list or "None"]

### 🟡 MINOR Issues
[list or "None — all auto-corrected"]

## Passed Checks
[summary of what passed — gives confidence to the approver]
```

---

## Review Outcomes

### APPROVED
No issues found (or only MINOR issues that were all auto-corrected).

→ Orchestrator proceeds to Step 7 (human gate) with note:
```
✅ LLD review passed. No issues found.
   Auto-corrections: <N> (see output/<EPIC_ID>/review-report.md)
```

### APPROVED_WITH_FIXES
Only MINOR and MAJOR issues — no BLOCKERs — and all MAJOR issues were resolved within 3 rounds.

→ Orchestrator proceeds to Step 7 with note:
```
✅ LLD review passed after <N> round(s).
   Issues resolved: <N> MAJOR, <N> MINOR
   See output/<EPIC_ID>/review-report.md for full details.
```

### REJECTED (after 3 rounds, BLOCKERs remain)

→ Orchestrator does NOT proceed to Step 7. Instead displays to user:
```
❌ LLD review could not resolve all issues after 3 rounds.

   Remaining BLOCKERs:
   [list each BLOCKER with section and fix instruction]

   Options:
   REGENERATE   — Restart LLD generation with all review findings as constraints
   OVERRIDE     — Proceed to approval despite blockers (your reason will be logged)
   ABANDON      — Cancel this pipeline run
```

`OVERRIDE` is permitted but logged with timestamp and user confirmation in `output/<EPIC_ID>/review-report.md`.

---

## Notify Skill

At the end of each review round, invoke `.claude/skills/notify-skill/SKILL.md`:

**Step 1 — Desktop toast:**
```bash
bash .claude/scripts/notify.sh "LLD Review Agent" "<Status>" "<Summary>"
```

**Step 2 — Push notification:**
```
PushNotification
  message: "LLD Review Agent — <Status>: <Summary>"
  status: "proactive"
```

| Status | Example Summary |
|--------|----------------|
| Completed (APPROVED) | LLD review passed. 0 blockers, 3 minor issues auto-corrected. Ready for approval. |
| Completed (APPROVED_WITH_FIXES) | LLD review passed in 2 rounds. 4 major issues resolved. Ready for approval. |
| Blocked (REJECTED) | LLD review failed after 3 rounds. 2 blockers remain in DB design. User input required. |
