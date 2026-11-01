# FastAPI Agent Seed

A multi-agent Claude Code setup that automates the full FastAPI development lifecycle — from Jira ticket to green test suite — using a structured pipeline of specialised sub-agents.

---

## How It Works

The **Dev Orchestrator** (defined in `CLAUDE.md`) is the root agent. It accepts a Jira link, Figma link, or plain text description — classifies it first, then either runs the full agent pipeline or handles it directly.

No code is written without an approved plan. No tests are written against unreviewed code.

---

## Agent Pipeline

```
Input: Jira URL / Figma URL / plain text
     │
     ▼
┌─────────────────────────────────────────────┐
│           Task Classification               │
│                                             │
│  New feature / new endpoint / new model?    │
│       YES ──► Full Workflow                 │
│                                             │
│  Refinement / redesign / copy change /      │
│  rename / restructure / tech-debt?          │
│       YES ──► Bypass (handle directly)      │
│                                             │
│  Ambiguous? ──► Ask one clarifying question │
└─────────────────────────────────────────────┘
     │ Full Workflow
     ▼
┌─────────────────────┐
│   Knowledge Agent   │  Gathers requirements + codebase context
└─────────────────────┘
          │  [Notify]
          ▼
┌─────────────────────┐
│   Planning Agent    │  Produces Low-Level Design (LLD)
└─────────────────────┘
          │
          ▼
   ┌──────────────────────────────────────┐
   │            User Review               │
   │  Planning Agent presents plan and    │
   │  waits. User can request changes     │
   │  (plan is revised and re-presented)  │
   │  until user types exactly "Approved" │
   └──────────────────────────────────────┘
     "Approved" │              changes/questions ──► revise plan ──► re-present
               │
               ▼
   ┌───────────────────────────────────────────┐
   │  1. Upload LLD to Confluence              │
   │     Title: {TICKET-ID}-{desc}-backend     │
   │  2. Jira comment: LLD link                │
   │  3. Jira status → In Progress             │
   └───────────────────────────────────────────┘
               │  [Notify]
              ▼
┌─────────────────────┐
│    Coding Agent     │  Implements the approved plan
└─────────────────────┘
          │  [Notify]
          ▼
┌─────────────────────┐
│  Code Review Agent  │  Reviews quality, security, plan compliance
└─────────────────────┘
          │
     ┌────┴─────┐
   Go │          │ No-Go [Notify]
     │          ▼
     │   ┌─────────────────────┐
     │   │    Coding Agent     │  Fixes Critical / Major findings
     │   └─────────────────────┘
     │          │
     └──────────┘
          │  [Notify]
          ▼
┌─────────────────────┐
│  Unit Test Agent    │  Writes tests, runs suite, enforces coverage
└─────────────────────┘
          │  [Notify]
          ▼
┌─────────────────────┐
│  Jira → Done        │  Transition ticket status to Done
└─────────────────────┘
          │
        Done ✓
```

---

## Sub-Agents

| Agent | File | Trigger | Output |
|---|---|---|---|
| Knowledge Agent | `.claude/agents/knowledge-agent.md` | Start of every task | Structured context package for Planning Agent |
| Planning Agent | `.claude/agents/planning-agent.md` | After Knowledge Agent | Approved LLD in `plans/PLAN-[ID]/plan.md` |
| Coding Agent | `.claude/agents/coding-agent.md` | After LLD approval | All files in plan Scope of Change implemented |
| Code Review Agent | `.claude/agents/code-review-agent.md` | After Coding Agent | Go/No-Go report in `artifacts/code-review-report.md` |
| Unit Test Agent | `.claude/agents/unittest-agent.md` | After Code Review Go | Green test suite + `artifacts/unittest-report.md` |
| Notify Skill | `.claude/agents/notify-skill.md` | After every transition | Windows toast notification |

---

## Agent Interactions (Detailed)

```
┌──────────────┐     user story +      ┌──────────────────┐
│  Orchestrator│ ──── task description ──► Knowledge Agent │
│  (CLAUDE.md) │                        └──────────────────┘
│              │                                │
│              │ ◄── context package ───────────┘
│              │     (routers, services,
│              │      models, schemas,
│              │      ADRs, constraints)
│              │
│              │     context package +   ┌──────────────────┐
│              │ ──── user story ─────► Planning Agent    │
│              │                        └──────────────────┘
│              │                                │
│              │ ◄── LLD plan.md + ─────────────┘
│              │     task files +
│              │     INDEX.md update
│              │
│              │ ──── presents LLD ──── User
│              │ ◄──────────────────── Approved / Rejected
│              │
│              │     approved plan +    ┌──────────────────┐
│              │ ──── context ────────► Coding Agent      │
│              │                        └──────────────────┘
│              │                                │
│              │ ◄── file list + ───────────────┘
│              │     summary +
│              │     deviations
│              │
│              │     changed files +    ┌──────────────────┐
│              │ ──── plan path ──────► Code Review Agent │
│              │                        └──────────────────┘
│              │                                │
│              │ ◄── Go/No-Go report ───────────┘
│              │     (Critical/Major findings)
│              │
│              │  [No-Go] send back to Coding Agent
│              │  [Go]
│              │     changed files +    ┌──────────────────┐
│              │ ──── plan path ──────► Unit Test Agent   │
│              │                        └──────────────────┘
│              │                                │
│              │ ◄── unittest-report.md ────────┘
│              │     (pass/fail + coverage)
└──────────────┘
```

---

## Knowledge Agent

**File:** `.claude/agents/knowledge-agent.md`

Runs first on every task. Explores the existing codebase using `Glob` and `Grep`, reads key files, checks `docs/` for ADRs and design notes, and asks clarifying questions when acceptance criteria are ambiguous.

```
Input:  User story / task description
           │
           ├── Glob/Grep app/api/, app/services/, app/repositories/,
           │           app/models/, app/schemas/, app/cache/
           │
           ├── Read existing routers, services, repositories, base classes
           │
           └── Search docs/ for ADRs, API contracts, coding standards
           │
Output: Structured context package
        ├── Feature summary + acceptance criteria + constraints
        ├── Relevant existing files (routers, services, models, schemas)
        ├── Docs findings (ADRs, design decisions)
        └── List of files likely to be touched
```

---

## Planning Agent

**File:** `.claude/agents/planning-agent.md`

Produces a full Low-Level Design (LLD) document before any code is written. The plan becomes the single source of truth for all downstream agents.

```
Input:  User story + Knowledge Agent context package
           │
           ├── Designs layer flow: Router → Service → Repository → Model
           ├── Specifies every Pydantic schema (request + response + InDB)
           ├── Plans async SQLAlchemy access + Alembic migrations
           ├── Plans Redis cache strategy (key patterns, TTLs, invalidation)
           ├── Plans auth dependencies for every endpoint
           └── Plans error handling (exceptions + HTTP status codes)
           │
Output: plans/PLAN-[ID]-[ShortName]/
        ├── plan.md                  ← Full LLD (15 sections)
        ├── tasks/
        │   ├── 01-knowledge.md
        │   ├── 02-planning.md
        │   ├── 03-coding.md
        │   ├── 04-code-review.md
        │   └── 05-unittest.md
        └── artifacts/               ← Written by downstream agents
```

**Blocked until:** User approves the LLD by typing `Approved` exactly.

**On approval:** Uploads the LLD to Confluence automatically. Page title is derived from the Jira ticket ID and task description: `{TICKET-ID}-{short-description}-backend` (e.g. `HFC-142-orders-api-backend`). The returned Confluence URL is stored in `tasks/02-planning.md` and the plan header. Confluence upload failure does not block coding.

---

## Coding Agent

**File:** `.claude/agents/coding-agent.md`

Implements exactly what is in the approved plan — nothing more. Works through the plan's Scope of Change file by file, reads existing patterns before writing anything, and runs `uv run mypy --strict` to verify no import or type errors.

```
Input:  Approved plan.md path + Knowledge Agent context
           │
           ├── Read plan Section 2 (Scope of Change)
           ├── Read existing files matching the task domain
           ├── CREATE all files listed in Section 2.1
           ├── MODIFY all files listed in Section 2.2
           ├── DELETE all files listed in Section 2.3
           └── Run: uv run mypy --strict app/  +  uv run pytest --collect-only
           │
Output: ├── All plan files created/modified/deleted
        └── tasks/03-coding.md updated (status, deviations)
```

**Coding standards enforced:**
- All route handlers, service methods, and repository methods are `async def`
- No `Any` types — treated as Critical (same severity as a security issue)
- No `print()` — structured JSON logging only
- SQLAlchemy 2.x `Mapped[T]` + `mapped_column()` style only
- Pydantic v2 `ConfigDict(from_attributes=True)` on all response schemas

---

## Code Review Agent

**File:** `.claude/agents/code-review-agent.md`

Acts as a senior engineer reviewing the Coding Agent's output. Checks against the plan checksum and runs through checklists covering type safety, async correctness, security, performance, and layer isolation.

```
Input:  Changed file list + approved plan path
           │
           ├── Plan Compliance: compare actual files vs plan Scope of Change
           ├── Python type checklist (Any, missing annotations, bare generics)
           ├── FastAPI router checklist (sync handlers, missing auth, layer skipping)
           ├── Service layer checklist (HTTPException in service, sync session)
           ├── Repository layer checklist (lazy loading, legacy db.query() API)
           ├── SQLAlchemy model checklist (lazy="raise", Mapped[T] style)
           ├── Alembic migration checklist (missing downgrade, unreviewed autogenerate)
           ├── Redis cache checklist (missing TTL, inline key strings)
           ├── Security checklist (hardcoded secrets, SQLi, missing auth)
           └── Performance checklist (N+1, missing indexes, unbounded queries)
           │
Output: artifacts/code-review-report.md
        ├── Plan compliance (checksum vs actual)
        ├── Findings grouped by: Critical / Major / Minor / Suggestions
        └── Decision: Go | No-Go
```

**Severity levels:**

| Level | Examples | Action |
|---|---|---|
| Critical | Missing auth, `Any` type, sync IO in async handler, SQL injection | Must fix — blocks proceeding |
| Major | Layer violation, lazy loading, swallowed exception, N+1 query | Should fix before tests |
| Minor | Missing `summary` on endpoint, f-string in log message | Consider fixing |
| Suggestion | Refactoring opportunities | Optional |

---

## Unit Test Agent

**File:** `.claude/agents/unittest-agent.md`

Runs after Code Review approves. Writes tests for every behaviour and corner case, runs the full suite, and verifies coverage thresholds before marking complete.

```
Input:  Changed file list + approved plan path
           │
           ├── Endpoint tests  (AsyncClient via ASGITransport)
           │   ├── Happy path, validation errors (422), auth guard (401/403)
           │   ├── Not found (404), business errors (4xx), pagination
           │   └── Response schema shape
           │
           ├── Service tests  (mocked repository + fake Redis)
           │   ├── Happy path, not found, access denied
           │   ├── Cache hit / miss / invalidation
           │   └── Business rule violations
           │
           ├── Repository tests  (real async SQLite session)
           │   ├── Happy path, not found (returns None)
           │   ├── Eager loading, pagination, filters
           │   └── Insert → flush → refresh flow
           │
           ├── Cache tests  (fakeredis.aioredis.FakeRedis)
           │   ├── Hit, miss, set, invalidation
           │   └── Deserialization failure → returns None (no raise)
           │
           └── Schema tests  (real Pydantic validation)
               ├── Valid input, invalid input → ValidationError
               └── from_attributes serialization of ORM objects
           │
Output: artifacts/unittest-report.md
        ├── Pass/fail counts + coverage metrics
        └── Corner cases covered
```

**Coverage minimums:**

| Code Type | Line | Branch |
|---|---|---|
| Utility functions | 100% | 100% |
| Services | 90% | 85% |
| Repositories | 85% | 80% |
| Routers | 85% | 80% |
| Cache helpers | 90% | 85% |
| Auth / payment flows | 95% | 95% |

---

## Notify Skill

**File:** `.claude/agents/notify-skill.md`

Sends a Windows toast notification after every agent transition so you know what is happening without watching the terminal.

```
Orchestrator
     │
     ├── after Knowledge Agent  ──► notify: "Knowledge Agent Completed"
     ├── after LLD produced     ──► notify: "Planning Agent Completed – awaiting approval"
     ├── after LLD approved     ──► notify: "Planning Agent Completed – LLD approved"
     ├── after Coding Agent     ──► notify: "Coding Agent Completed"
     ├── after Code Review Go   ──► notify: "Code Review Agent Completed – Go"
     ├── after Code Review No-Go ──► notify: "Code Review Agent Blocked – N critical findings"
     ├── after rework complete  ──► notify: "Coding Agent Completed"
     └── after tests green      ──► notify: "Unit Test Agent Completed"
```

Invoked via:
```bash
powershell -ExecutionPolicy Bypass -File "./scripts/notify.ps1" \
  -AgentName "Coding Agent" \
  -Status "Completed" \
  -Summary "Implemented 6 files. orders router, service, repository, model, schema, cache."
```

Failures do not block the workflow — notifications are informational only.

---

## Plan Directory Structure

Every task produces a self-contained plan directory:

```
plans/
  INDEX.md                         ← One-line entry per plan
  PLAN-001-Orders/
    plan.md                        ← Full 15-section LLD
    tasks/
      01-knowledge.md              ← Knowledge Agent task + checklist
      02-planning.md               ← Planning task (Completed on LLD approval)
      03-coding.md                 ← Coding task (filled from plan Scope of Change)
      04-code-review.md            ← Review task + Go/No-Go result
      05-unittest.md               ← Test task + coverage results
    artifacts/
      code-review-report.md        ← Written by Code Review Agent
      unittest-report.md           ← Written by Unit Test Agent
```

Task file status values: `Pending` | `In Progress` | `Completed` | `Blocked` | `Skipped`

---

## Project Layout Expected

The orchestrator verifies this structure exists before accepting any task:

```
app/
  api/           Route handlers (routers)
  core/          Config, security, lifespan, middleware, dependencies
  db/            Engine, session factory, base model
  models/        SQLAlchemy ORM models
  schemas/       Pydantic request/response schemas
  services/      Business logic layer
  repositories/  Data access layer
  cache/         Redis cache utilities
tests/           pytest test suite
plans/           Agent-produced LLD documents
scripts/
  notify.ps1     Windows toast notification script
```

---

## Getting Started

### 1. Install uv

All Python operations in this project use [uv](https://docs.astral.sh/uv/). Install it once, then everything else flows through `uv`.

**Windows (PowerShell):**
```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

**macOS / Linux:**
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

Confirm: `uv --version`

### 2. Set up the project

```bash
# Create project (if starting fresh)
uv init --python 3.11

# Install all dependencies from pyproject.toml
uv sync

# Add a runtime dependency
uv add fastapi sqlalchemy[asyncio] alembic pydantic-settings redis

# Add a dev dependency
uv add --dev pytest pytest-asyncio pytest-cov httpx mypy black isort fakeredis
```

### 3. Common commands

| Task | Command |
|---|---|
| Run tests | `uv run pytest` |
| Run tests with coverage | `uv run pytest --cov=app --cov-report=term-missing` |
| Type check | `uv run mypy --strict app/` |
| Format code | `uv run black app/ tests/` |
| Sort imports | `uv run isort app/ tests/` |
| Generate migration | `uv run alembic revision --autogenerate -m "description"` |
| Apply migrations | `uv run alembic upgrade head` |
| Run dev server | `uv run uvicorn app.main:app --reload` |

> The orchestrator checks for `uv` at startup and installs it automatically if missing before any agent runs.

---

## Tech Stack

| Concern | Technology |
|---|---|
| Package Manager | uv |
| Framework | FastAPI (latest stable) |
| Language | Python 3.11+ — mypy strict mode |
| ASGI | Uvicorn + Gunicorn workers (production) |
| ORM | SQLAlchemy 2.x async (`AsyncSession`) |
| Database | PostgreSQL 15+ |
| Migrations | Alembic |
| Caching | Redis 7+ via `redis-py` async |
| Validation | Pydantic v2 |
| Config | `pydantic-settings` (`BaseSettings`) |
| Auth | JWT (`python-jose`) + `OAuth2PasswordBearer` |
| HTTP Client | `httpx` async |
| Testing | pytest + pytest-asyncio + `httpx.AsyncClient` |
| Task Queue | Celery + Redis broker (if needed) |
| Logging | `python-json-logger` (structured JSON) |

---

## Orchestrator Rules

These rules are enforced by the orchestrator and cannot be overridden:

1. **Never skip Planning.** No code without an approved LLD.
2. **Never skip Code Review.** No tests against unreviewed code.
3. **Layer isolation.** Routers → Services → Repositories only. No skipping.
4. **`Any` type = Critical.** Same severity as a security issue.
5. **Async only.** Sync SQLAlchemy inside async endpoints blocks immediately.
6. **Migrations required.** Every new or modified ORM model needs an Alembic migration.
7. **Notify on every transition.** Failures must not block the workflow.
8. **Jira required.** All tasks originate from Jira tickets. Block if Jira is unavailable.
