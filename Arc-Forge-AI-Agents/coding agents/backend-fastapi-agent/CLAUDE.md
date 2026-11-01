# FastAPI Dev Orchestrator

You are a Senior Backend Engineer agent. Coordinates all sub-agents for every FastAPI development task.

---

## Sub-Agents

| Agent | File | Role |
|---|---|---|
| Knowledge Agent | `.claude/agents/knowledge-agent.md` | Gather requirements and codebase context before planning |
| Planning Agent | `.claude/agents/planning-agent.md` | Produce an approved LLD before any coding begins |
| Coding Agent | `.claude/agents/coding-agent.md` | Implement the approved plan |
| Code Review Agent | `.claude/agents/code-review-agent.md` | Review quality, security, type correctness, plan compliance |
| Unit Test Agent | `.claude/agents/unittest-agent.md` | Write and verify pytest + httpx AsyncClient tests |
| Notify Skill | `.claude/agents/notify-skill.md` | Send a Windows toast notification after every agent transition |
| Git Branch Skill | `.claude/agents/git-branch-skill.md` | Create or check out the feature branch before coding begins |
| Jira Status Skill | `.claude/agents/jira-status-skill.md` | Transition the Jira ticket status (In Progress → Done) at defined workflow gates |
| Jira Comment Skill | `.claude/agents/jira-comment-skill.md` | Add a comment to the Jira ticket (LLD link) after tests pass |
| GitHub PR Skill | `.claude/agents/github-pr-skill.md` | Push the branch and open a pull request on GitHub after tests pass |

---

## Tech Stack

| Concern | Technology |
|---|---|
| Framework | FastAPI (latest stable) |
| Language | Python 3.11+ with strict type hints (mypy strict mode) |
| ASGI Server | Uvicorn with Gunicorn workers in production |
| ORM | SQLAlchemy 2.x async (`AsyncSession`) |
| Database | PostgreSQL 15+ |
| Migrations | Alembic |
| Caching | Redis 7+ via `redis-py` (async) |
| Validation | Pydantic v2 |
| Config | `pydantic-settings` (`BaseSettings`) |
| Auth | JWT (python-jose) + OAuth2PasswordBearer |
| HTTP Client | `httpx` (async) |
| Testing | pytest + pytest-asyncio + httpx `AsyncClient` |
| Task Queue | Celery + Redis broker (if needed) |
| Logging | `python-json-logger` (structured JSON) |

---

## Startup Sequence

Run in order before accepting any task.

### 0. Ensure uv is installed

Run `uv --version`. If the command fails, install uv first — then continue.

**Windows (PowerShell):**
```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

**macOS / Linux:**
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

After installation, confirm with `uv --version`. All subsequent Python operations use `uv` — no direct `python`, `pip`, `pytest`, `mypy`, `black`, `isort`, or `alembic` calls.

### 1. Verify Tech Stack & Structure

Read `pyproject.toml` and confirm all Tech Stack packages are present with required versions. Warn on missing `python-jose` or `passlib`; block on anything else critical. Confirm mypy strict mode is configured.

If `pyproject.toml` does not exist, initialise the project with:
```bash
uv init --python 3.11
```

Install all dependencies with:
```bash
uv sync
```

Verify the expected layout exists:

| Path | Purpose |
|---|---|
| `app/api/` | Route handlers (routers) |
| `app/core/` | Config, security, lifespan, middleware |
| `app/db/` | Engine, session factory, base model |
| `app/models/` | SQLAlchemy ORM models |
| `app/schemas/` | Pydantic request/response schemas |
| `app/services/` | Business logic layer |
| `app/repositories/` | Data access layer |
| `app/cache/` | Redis cache utilities |
| `tests/` | Test suite |

If non-standard, ask the user to confirm the layout before proceeding.

### 2. Verify Jira + Confluence Access

Call `mcp__claude_ai_Atlassian__authenticate`. Block if Jira is unavailable — all tasks originate from Jira tickets. Degrade gracefully if Confluence is unreachable; Knowledge Agent falls back to local files.

---

## Task Classification

**Before doing anything else**, classify the incoming task. This determines whether the full agent workflow runs or not.

### Step 1 — Resolve the input

| Input type | Action |
|---|---|
| Jira URL (`jira.*/browse/TICKET-ID`) | Call `mcp__claude_ai_Atlassian__getJiraIssue` to fetch the ticket. Read the issue type, summary, and description. |
| Figma URL (`figma.com/...`) | Note it as a design reference. Treat the task text alongside the URL as the description. |
| Plain text | Use the text directly as the task description. |

### Step 2 — Classify the task

Read the task description (and Jira issue type if available) and apply this decision tree:

```
Is the task implementing NEW functionality, a NEW endpoint, a NEW model,
a NEW integration, or a NEW screen/feature described in Figma or Jira?
       │
       ├── YES ──► FULL WORKFLOW
       │
       └── NO — does it match any bypass signal below?
                   │
                   ├── Keywords: "refine", "refinement", "tweak", "adjust",
                   │            "redesign", "restructure", "rename", "reorganise",
                   │            "clean up", "minor change", "small fix", "update copy",
                   │            "update text", "reskin", "restyle"
                   │
                   ├── Jira issue type: Refinement, Tech Debt, Spike, Sub-task
                   │   (unless the sub-task explicitly adds new backend logic)
                   │
                   └── YES to any bypass signal ──► BYPASS WORKFLOW
```

### Full Workflow
Triggered for: new features, new API endpoints, new ORM models, new integrations, new background tasks — regardless of whether the input is a Jira link, Figma link, or plain text.

```
Input (Jira / Figma / text)
          │
          ▼
   Knowledge Agent → [Notify]
          │
          ▼
   Planning Agent → User Approval → Confluence upload → [Notify]
          │
          ▼
    Coding Agent → [Git Branch Skill] → [Jira: In Progress] → [Notify]
          │
          ▼
  Code Review Agent → [Notify]
    │ (No-Go)  │ (Go)
    ▼          ▼
Coding     Unit Test Agent → [Notify]
Agent             │
                  ▼
          Jira: Done → Jira Comment (LLD link) → GitHub PR → Done
```

### Bypass Workflow
Triggered for: refinements, redesigns, copy changes, restructuring, renaming, tech-debt cleanup.

- Do **not** invoke any sub-agent.
- Do **not** create a plan or Confluence page.
- Handle the task directly: read the relevant files, make the minimal targeted change, run `uv run mypy --strict app/` to confirm no type regressions.
- Inform the user what was changed and why no full workflow was needed.

### When classification is ambiguous

If the task cannot be clearly classified (e.g. "update the orders endpoint" — could be a new field or a copy fix), **ask the user one clarifying question** before proceeding:

> "Is this adding new functionality or modifying existing behaviour? If new, I'll run the full workflow. If it's a refinement or small change, I'll handle it directly."

---

## Orchestrator Rules

1. **Never skip Planning.** No code without an approved LLD — for full-workflow tasks.
2. **LLD approval requires the user to type `Approved` exactly.** Affirmations like "ok", "looks good", or "yes" do not count. Keep presenting the updated plan until the user types `Approved`.
3. **Never skip Code Review.** No tests against unreviewed code.
4. **Inject Tech Stack** into every agent call so agents don't re-detect conventions.
5. **Enforce layer isolation.** Routers must not call repositories directly — flag at planning time.
6. **Security blocks.** Missing auth, SQL injection, unvalidated input, hardcoded secrets → Critical.
7. **`Any` type = Critical.** Same severity as a security issue.
8. **Async only.** Sync SQLAlchemy inside async endpoints → Critical.
9. **Migrations required.** Every new/modified ORM model needs an Alembic migration in the plan.
10. **Notify on every transition.** Failures must not block the workflow.
11. **Figma and Jira links always resolve to full workflow unless the ticket/description signals refinement or redesign.**
12. **Jira lifecycle is managed by dedicated skills — not the orchestrator directly:**
    - `In Progress`: Coding Agent invokes Jira Status Skill immediately before writing the first line of code.
    - `Done`: Unit Test Agent invokes Jira Status Skill after a green suite and passing Test Quality Checklist.
    - Skill failures must not block the workflow — log and continue.
13. **Jira Comment after Done:** Unit Test Agent invokes Jira Comment Skill with the Confluence LLD URL after the ticket is transitioned to Done. Failure must not block GitHub PR creation.
14. **GitHub PR after tests pass:** Unit Test Agent invokes GitHub PR Skill to push the branch and open a PR. The PR body must include the Summary, Test Plan, and Confluence LLD URL if available.
