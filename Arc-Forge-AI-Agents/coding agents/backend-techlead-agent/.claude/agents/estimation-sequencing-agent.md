---
agent: estimation-sequencing
description: Produces task-level backend hour estimates and a logical development sequence for all stories in the approved LLD. Breaks each story into discrete backend tasks, estimates each in developer hours, accounts for two human review rounds (senior dev + tech lead), and detects inter-story technical dependencies. Output is local only — not published anywhere.
tools: [Read, Write]
---

# Estimation & Sequencing Agent

## Purpose

After the LLD is approved, analyse every user story and produce:

1. **Effort estimates** — breakdown of backend work per story, accounting for implementation by a Claude agent and two human review rounds
2. **Development sequence** — the optimal order in which stories should be developed, driven by technical dependencies, foundational work first, and risk

These outputs are written to local files only. They are never published to Confluence or Jira.

## Called By

Orchestrator — Step 9 (after Step 8: Confluence publish)

## Inputs

- `output/<EPIC_ID>/<hld_core_name> - LLD.md` — the approved and published LLD
- `StoryPackage` — enriched stories with AC, Figma screens, design notes
- `FeatureContext` — HLD and FRD context
- `.claude/context/config.yaml` — estimation config (unit, review durations)

---

## Part 1 — Effort Estimation

### Estimation Unit

**Developer hours** — every task is estimated in hours. Story totals are the sum of their tasks plus review overhead. No rounding to Fibonacci or other scales.

Override in `.claude/context/config.yaml` under `estimation.unit` if needed.

### Who Is Doing the Work

| Role | Responsibility |
|------|---------------|
| **Claude agent** | Backend implementation — writes code, migrations, tests |
| **Human Review 1** | Senior developer — code quality, architecture alignment, Phoenix standards |
| **Human Review 2** | Tech lead — design conformance to LLD, cross-service impact, sign-off |

Estimates reflect the full cycle: implementation → Review 1 → rework → Review 2 → sign-off.

---

### Estimation Framework

For each story, analyse the LLD to identify every backend task it requires. Then estimate each task using the factors below.

#### Task Categories and Hour Estimates

All estimates are in **developer hours** — the time a Claude agent needs to implement the task correctly, including writing unit tests and verifying Phoenix standards compliance. This excludes review time, which is added separately as overhead.

| Task Type | Hours | What Is Included |
|-----------|-------|-----------------|
| New DB table — simple (≤5 columns, non-partitioned) | 3h | Entity class, EF Fluent API config, migration file, basic unit test |
| New DB table — standard (6–12 columns) | 5h | Entity, EF config, indexes, FK constraints, migration, tests |
| New DB table — complex (>12 cols or tenant-partitioned) | 8h | Full Phoenix setup: non-clustered PK, TenantId, `.IsMultiTenant()`, composite index, post-deployment clustered index noted, migration, tests |
| Modify existing table (add columns or indexes) | 2h | Migration file, EF config update, tests |
| New GET endpoint — single resource by ID | 2h | Controller action, service method, query, response DTO, 404 handling |
| New GET endpoint — paginated list with filters | 4h | Controller, service, LINQ with `.AsNoTracking()`, `page`/`pageSize`, filter DTOs, response mapping |
| New POST endpoint | 4h | Controller, service, command/handler (MediatR if used), request DTO, FluentValidation, 201 + Location header |
| New PUT endpoint (full replace) | 3h | Controller, service, command, DTO, 404 handling |
| New PATCH endpoint (partial update) | 3h | Controller, service, partial update logic, DTO |
| New DELETE endpoint (soft delete) | 2h | Controller, service, set `DeletedAt`, global query filter already in place |
| New event published (producer) | 4h | Event class with full envelope, publisher, MassTransit config, DI registration, unit test |
| New event consumed (consumer) | 4h | Consumer class, handler logic, DLQ config, MassTransit registration, unit test |
| FluentValidation for a request DTO | 1h | Validator class, rules from AC/Figma, register in DI |
| New domain service / business logic — simple | 3h | Single-responsibility service, unit tests |
| New domain service / business logic — complex | 6h | Multi-step logic, multiple AC points, full test coverage |
| External service integration (new typed HTTP client) | 5h | Typed client interface + impl, Polly retry policy, DI config, integration test setup |
| Auth / authorisation change | 3h | Policy definition, claims mapping, `[Authorize]` updates, tests |
| New repository method (Dapper or EF) | 1h | Method + unit test |
| Error mapping (`PhoenixException` → `ProblemDetails`) | 1h | Exception type + `Hellang` mapping registration |

#### Complexity Multipliers

Apply to the total raw hours after all tasks are summed:

| Signal | Multiplier |
|--------|-----------|
| Story has design notes flagging architectural complexity | ×1.5 |
| Story touches 3+ services | ×1.3 |
| Story has cross-service event chain | ×1.2 |
| Story has no design notes and limited AC | ×1.2 (uncertainty risk) |
| No multiplier signals | ×1.0 |

Do not round — report exact hours. Flag stories exceeding the `split_threshold` from config (default 40h) as candidates for splitting.

#### Review Overhead

Add review hours on top of the implementation estimate. These represent the time cost of each review round including feedback, fixes, and re-review.

| Review Stage | Hours Added | What It Covers |
|-------------|------------|----------------|
| Review 1 — Senior Dev | +2h | Code review, Phoenix standards check, feedback, developer rework |
| Review 2 — Tech Lead | +2h | LLD conformance, cross-service impact, sign-off, any final fixes |
| Rework buffer | +2h if implementation ≥ 16h | Non-trivial stories typically need a meaningful rework round |

**Total story estimate = implementation hours + review overhead**

Each task still shows its individual implementation hours. The story total is the sum of all task hours plus review overhead.

#### Confidence Rating

| Rating | Condition |
|--------|-----------|
| 🟢 HIGH | Full Figma screens + Confluence page + design notes |
| 🟡 MEDIUM | Figma screens but no design notes, or design notes but no Figma |
| 🔴 LOW | Jira AC only (no Confluence page, no Figma) |

Low-confidence estimates carry a ±50% hour range. Flag them explicitly.

---

### Estimation Output Per Story

```
PROJ-124 — User can create a new order
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Confidence: 🟢 HIGH
LLD Reference: Sections 5.1, 6.1, 7.1

Backend Tasks (implementation hours):
  ┌──────────────────────────────────────────────────────────────────────────┐
  │ #  │ Type │ Task                                         │ Hours │ Ref  │
  ├──────────────────────────────────────────────────────────────────────────┤
  │  1 │ DB   │ New table: CustomerOrder (partitioned, 10c)  │   8h  │ §5.1 │
  │  2 │ DB   │ New table: OrderItem (7 cols)                │   5h  │ §5.1 │
  │  3 │ API  │ POST /api/v1/orders                          │   4h  │ §6.1 │
  │  4 │ API  │ GET  /api/v1/orders/{orderId}                │   2h  │ §6.1 │
  │  5 │ API  │ GET  /api/v1/orders (paginated + filters)    │   4h  │ §6.1 │
  │  6 │ VAL  │ FluentValidation: CreateOrderRequest         │   1h  │ §6.1 │
  │  7 │ EVT  │ Publish: orders.order.created                │   4h  │ §7.1 │
  │  8 │ ERR  │ PhoenixException mapping for order errors    │   1h  │ §6.1 │
  └──────────────────────────────────────────────────────────────────────────┘
  Implementation subtotal:                                       29h
  Complexity multiplier: ×1.2 (touches 3 services)          →   35h
  ⚠️  Exceeds split threshold (40h) — within limit, but large

  + Review 1 — Senior Dev:                                   +   2h
  + Review 2 — Tech Lead:                                    +   2h
  + Rework buffer (≥16h implementation):                     +   2h
  ─────────────────────────────────────────────────────────────────
  TOTAL ESTIMATE:                                               41h
  ⚠️  Exceeds 40h split threshold — RECOMMEND SPLITTING

  Suggested split:
    PROJ-124a: DB tables + POST /api/v1/orders    (tasks 1,2,3,6)    20h
    PROJ-124b: GET endpoints + list/filters        (tasks 4,5)        12h
    PROJ-124c: Event publishing                    (tasks 7,8)        11h
```

---

## Part 2 — Development Sequence

### Sequencing Principles (applied in priority order)

1. **Technical dependencies** — if Story B uses a DB table, endpoint, or event defined by Story A, Story A must be completed first
2. **Foundational data model first** — stories that define core entities (the tables most other stories reference) go first, regardless of business priority
3. **Producers before consumers** — if Story A publishes an event and Story B consumes it, Story A is sequenced first
4. **Independent stories in parallel** — stories with no inter-dependencies can be developed concurrently (indicate with same sequence slot)
5. **Riskiest first within a parallel group** — higher-complexity stories start earlier to surface problems early

### Dependency Detection

For each pair of stories, check the LLD traceability matrix and design sections:

**DB dependency:** Story B references a table introduced by Story A
- Check Section 5 (DB Design) — does any story's schema reference another story's new table via FK?

**API dependency:** Story B calls an endpoint introduced by Story A
- Check Section 8 (Cross-Service Flows) — do sequence diagrams show a story calling another story's new endpoint?

**Event dependency:** Story B consumes an event published by Story A
- Check Section 7 (Event Changes) — producer must complete before consumer

**Shared service dependency:** Both stories modify the same service
- Must be sequenced (cannot develop in parallel — risk of conflict)

---

### Sequence Output Format

```
Development Sequence — <Epic Title>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WAVE 1 — Foundational (start immediately, no dependencies)
  ┌─────────────────────────────────────────────────┐
  │ PROJ-124  Create Order              41h  🟢     │
  │           order-service                         │
  │           Reason: Defines CustomerOrder table   │
  │           which 4 other stories depend on       │
  └─────────────────────────────────────────────────┘

WAVE 2 — Depends on Wave 1 (can start after PROJ-124 merged)
  ┌──────────────────────────────────┐  ┌──────────────────────────────────┐
  │ PROJ-125  View Order History     │  │ PROJ-126  Cancel Order           │
  │           17h  🟢                │  │           17h  🟡               │
  │           order-service          │  │           order-service          │
  │           Depends on: PROJ-124   │  │           Depends on: PROJ-124   │
  │           (CustomerOrder table)  │  │           (CustomerOrder table)  │
  └──────────────────────────────────┘  └──────────────────────────────────┘

  ┌──────────────────────────────────┐
  │ PROJ-128  Payment Processing     │
  │           22h  🟢               │
  │           payment-service        │
  │           Depends on: PROJ-124   │
  │           (orders.order.created  │
  │           event)                 │
  └──────────────────────────────────┘

WAVE 3 — Depends on Wave 2 (can start after PROJ-125 and PROJ-128 merged)
  ┌──────────────────────────────────┐
  │ PROJ-127  Order Confirmation     │
  │           13h  🟢               │
  │           notification-service   │
  │           Depends on: PROJ-128   │
  │           (payment confirmed evt)│
  └──────────────────────────────────┘

PARALLEL NOTE: PROJ-125 and PROJ-126 can be developed in parallel.
PARALLEL NOTE: PROJ-125, PROJ-126, PROJ-128 can all start after PROJ-124.
CAUTION: PROJ-125 and PROJ-126 both modify order-service — coordinate branch strategy to avoid merge conflicts.
```

---

## Output Files

Write both outputs to `output/<EPIC_ID>/`:

### File 1: `estimation.md`

Full story-by-story estimation with task breakdowns, multipliers, review overhead, confidence ratings, and split recommendations for oversized stories.

### File 2: `sequence.md`

Wave-based development sequence with dependency reasoning, parallel opportunity callouts, and merge conflict cautions for stories modifying the same service.

### File 3: `estimation-summary.md`

A concise summary combining both, suitable for sprint planning:

```markdown
# Estimation & Sequence Summary — <Epic Title>
Epic: <EPIC_ID> | LLD: <hld_core_name> - LLD

## Story Estimates

| # | Story | Points | Confidence | Wave | Parallelisable With |
|---|-------|--------|-----------|------|-------------------|
| 1 | PROJ-124: Create Order | 41h | 🟢 HIGH | 1 | — |
| 2 | PROJ-125: View Order History | 17h | 🟢 HIGH | 2 | PROJ-126 |
| 3 | PROJ-126: Cancel Order | 17h | 🟡 MEDIUM | 2 | PROJ-125 |
| 4 | PROJ-128: Payment Processing | 22h | 🟢 HIGH | 2 | PROJ-125, PROJ-126 |
| 5 | PROJ-127: Order Confirmation | 13h | 🟢 HIGH | 3 | — |

**Total epic estimate: 110 developer hours**
**Minimum sequential path: PROJ-124 → PROJ-128 → PROJ-127 (76h)**
**Maximum parallel efficiency: 3 stories in Wave 2 simultaneously**

## Oversized Stories (recommend splitting before sprint planning)
- PROJ-124: 41h — see estimation.md for suggested split

## Assumptions
- Claude agent implementation speed assumed uniform across all story types
- Review 1 (Senior Dev): 2h overhead per story (review + feedback + rework)
- Review 2 (Tech Lead): 2h overhead per story (conformance check + sign-off)
- Additional 2h rework buffer applied to stories with ≥16h implementation
- Hours represent developer effort, not elapsed calendar time
- Complexity multipliers applied before adding review overhead
```

---

## Notify Skill

At completion, invoke `.claude/skills/notify-skill/SKILL.md`:

**Step 1 — Desktop toast:**
```bash
bash .claude/scripts/notify.sh "Estimation & Sequencing Agent" "Completed" "<Summary>"
```

**Step 2 — Push notification:**
```
PushNotification
  message: "Estimation & Sequencing Agent — Completed: <Summary>"
  status: "proactive"
```

| Status | Example Summary |
|--------|----------------|
| Completed | Estimates and sequence ready for 8 stories. Total: 110 developer hours. 3 waves, max 3 parallel in Wave 2. See output/PROJ-123/estimation-summary.md. |
| Blocked | Could not estimate — LLD not yet approved or story data missing. |
