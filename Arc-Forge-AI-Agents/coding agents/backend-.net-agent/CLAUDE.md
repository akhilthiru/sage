# Senior Backend Developer Agent

Implements Jira tickets end-to-end on a .NET 8 / ASP.NET Core microservice codebase. Given a ticket ID, it reads the Jira story, gathers context from Confluence and the codebase, produces an implementation plan for developer and tech lead approval, implements the approved plan on a feature branch, reviews the code for quality and standards compliance, writes and verifies tests, then raises a pull request on GitHub.

All configuration below is injected into every sub-agent. For the full task workflow, approval gates, and agent handoffs, read `.claude/agents/orchestrator.md`.

---

## Commands

### Paste a Jira URL (primary trigger)
Paste any Jira ticket URL (subtask or story) directly into the conversation to start the pipeline. No command needed.

Example: `https://yourorg.atlassian.net/browse/PHNX-7211`

**What happens:**
1. Startup gate — verifies manifest, stack, directory structure, and Jira access. Runs once; skipped on future sessions if memory is green.
2. Knowledge Agent reads the Jira ticket (subtask → story → epic) and gathers Confluence and codebase context.
3. Planning Agent produces an implementation plan and walks through two approval gates (developer → tech lead).
4. Coding Agent implements the approved plan on a feature branch. If the plan requires changes to `tps-dms-shared`, the Shared Repo Agent runs first as a blocking gate — it raises a PR on the shared repo and **pauses the pipeline** until you confirm the PR has been merged and the NuGet package is published. This is the only manual wait in an otherwise automated pipeline.
5. Code Review Agent reviews for quality, security, and standards compliance.
6. Unittest Agent writes tests, verifies coverage thresholds, and raises the PR.

**Delegates to:** `.claude/agents/orchestrator.md`

---

### `/task <TICKET_ID>`
Alternative to pasting a URL — start the pipeline with just the ticket ID.

**Delegates to:** `.claude/agents/orchestrator.md`

---

### `/dev <TICKET_ID> <BASE_BRANCH>`
Start the pipeline for a **bugfix targeting a specific release branch** (e.g. `/dev PHNX-1234 release/0.17.2`).

Identical to `/task` except:
- The base branch for checkout and the PR target is `<BASE_BRANCH>` instead of `gitBaseBranch` in `project_config.md`
- The branch prefix is `bugfix/` instead of the configured `featureBranchPrefix` (e.g. `bugfix/PHNX-1234-fix-null-ref`)
- Commit message type is `fix(...)` instead of `feat(...)`

These overrides are **session-scoped** — they are never written to `project_config.md`.

**Delegates to:** `.claude/agents/orchestrator.md`

---

### `/startup`
Re-run the full environment setup.

Use when: first-time project setup, Jira credentials changed, or startup memory is stale.

**Delegates to:** `.claude/agents/startup-agent.md`

---

### `/task-resume <TICKET_ID>`
Resume a pipeline interrupted mid-flight.

Reads `project_config.md` memory and conversation context to determine the last completed agent, then continues from there.

**Delegates to:** `.claude/agents/orchestrator.md`

---

## Setup (First Time)

Ensure the **Atlassian MCP connector** is connected in **Claude Code → Settings → Connectors** before starting.

Then paste a Jira URL or run `/task <TICKET_ID>`. Startup runs automatically on first use and collects:
- A sample Confluence URL (space key is extracted automatically)
- Feature branch prefix (e.g. `feature/`)
- Git base branch (e.g. `main`)
- Developer name (from Atlassian authentication)

---

## MCP Connectors Required

| Connector | Required | Used For |
|---|---|---|
| Atlassian | ✅ Yes | Jira ticket fetch (subtask → story → epic), Confluence implementation plan publishing |

Connect in **Claude Code → Settings → Connectors** before running `/task`.

---

## Project Identity

> The Confluence Space Key is extracted automatically during startup — no manual configuration needed.

| Field | Value |
|---|---|
| Stack Type | backend |
| Primary Language | C# |
| Confluence Space Key | auto-derived at startup from a sample Confluence URL |

---

## Tech Stack

| Concern | Technology |
|---|---|
| Framework | ASP.NET Core 8 Web API |
| Language Version | C# 12 / .NET 8 |
| Type Checking | C# nullable reference types enabled (`<Nullable>enable</Nullable>`) |
| ORM / Data Access | Entity Framework Core 8 (async) |
| Database | SQL Server 2022 / Azure SQL |
| Migrations | EF Core code-first migrations |
| Caching | Redis (IDistributedCache) / IMemoryCache |
| Validation | FluentValidation 11 |
| Config / Env | `appsettings.json` + `IOptions<T>` + environment variables |
| Auth | JWT Bearer (`Microsoft.AspNetCore.Authentication.JwtBearer`) |
| HTTP Client | `IHttpClientFactory` (typed clients) |
| Testing | xUnit + Moq + FluentAssertions + WebApplicationFactory |
| Linter | Roslyn Analyzers + StyleCop.Analyzers |
| Formatter | EditorConfig (`.editorconfig`) |
| Task Queue | None |
| Logging | Serilog with structured logging |
| Build Tool | MSBuild / dotnet CLI |
| Container / Infra | Docker + Docker Compose |

---

## Layer Architecture

| Layer | Name in This Project | Purpose |
|---|---|---|
| Entry Layer | Controller | ASP.NET Core API Controllers — receive HTTP requests, validate input via FluentValidation, delegate to Service layer |
| Logic Layer | Service | Business rules, orchestration, cache strategy, domain exception raising |
| Data Layer | Repository | Data access via EF Core DbContext — returns `null` for not-found, never raises HTTP exceptions |
| Cross-Cutting | Middleware / Action Filters | Global exception handling, auth, logging, request correlation |

**Layer isolation rule (critical):** Controllers must never access `DbContext`, repository types, or EF Core namespaces directly — all data access goes through the Service → Repository chain.

---

## Agent Structure

The agent framework sits alongside the developer's cloned repos in the same workspace directory. Repos are auto-discovered at startup — none are hardcoded.

```
<workspace>/
├── CLAUDE.md                              ← Entry point — commands, stack, standards
├── .claude/
│   ├── agents/                            ← 10 sub-agent instruction files
│   │   ├── orchestrator.md
│   │   ├── startup-agent.md
│   │   ├── knowledge-agent.md
│   │   ├── codebase-analysis-agent.md
│   │   ├── planning-agent.md
│   │   ├── coding-agent.md
│   │   ├── shared-repo-agent.md
│   │   ├── code-review-agent.md
│   │   ├── unittest-agent.md
│   │   └── pr-agent.md
│   ├── skills/                            ← 6 reusable skill definitions
│   │   ├── confluence-publish-skill/SKILL.md
│   │   ├── notify-skill/SKILL.md
│   │   ├── git-branch-skill/SKILL.md
│   │   ├── github-pr-skill/SKILL.md
│   │   ├── jira-comment-skill/SKILL.md
│   │   └── jira-status-skill/SKILL.md
│   ├── rules/                             ← Project-specific standards
│   │   ├── api-standards.md
│   │   └── db-standards.md
│   ├── standards/                         ← General .NET + test standards
│   │   ├── DOTNET-RULES.md
│   │   └── UNITTEST-STANDARDS.md
│   ├── memory/                            ← Runtime state (written at startup)
│   ├── repository-index.md               ← Auto-scanned at startup; lists all repos
│   └── settings.json
├── tps-dms-shared/                        ← Shared NuGet packages repo (special-cased)
├── <your-microservice-repo>/              ← Any microservice repos cloned here
├── <your-microservice-repo>/              ← Auto-discovered via README.md scan
└── ...                                    ← Add as many repos as needed
```

---

## Application Code Structure

Pattern used by every microservice repo in this workspace (Clean Architecture + CQRS):

```
src/
├── Tps.Dms.[Service].Api/
│   ├── Controllers/          ← Entry Layer — API controllers
│   ├── EventSubscribers/     ← MassTransit consumer registration
│   └── Extensions/           ← Service registration helpers
├── Tps.Dms.[Service].Application/
│   ├── Commands/             ← MediatR command handlers
│   ├── Queries/              ← MediatR query handlers
│   ├── Services/             ← Orchestration / business logic
│   ├── Contracts/            ← Service and repository interfaces
│   ├── Dtos/                 ← Request / Response types
│   ├── Validators/           ← FluentValidation validators
│   └── Abstractions/         ← Shared abstractions
├── Tps.Dms.[Service].Domain/
│   ├── Entities/             ← EF Core domain entities (inherit MultiTenantEntity)
│   └── Enums/
└── Tps.Dms.[Service].Infrastructure/
    ├── Persistence/          ← DbContext + EF entity configurations
    ├── Migrations/           ← EF Core migration files
    ├── Services/             ← Infrastructure service implementations
    └── RefitClients/         ← Typed HTTP clients
tests/
├── Tps.Dms.[Service].Api.Tests/
│   └── Controllers/
└── Tps.Dms.[Service].Application.Tests/
    ├── Commands/
    ├── Queries/
    ├── Services/
    ├── Validators/
    └── TestData/
```

---

## Standards Documents

All agents must read and strictly enforce all standards before planning or implementing:

| Standard | File | Scope |
|---|---|---|
| DOTNET-RULES | `.claude/standards/DOTNET-RULES.md` | General .NET coding standards: async/await, nullable types, EF Core, DI, testing |
| API Standards | `.claude/rules/api-standards.md` | TPSPhoenix REST API rules: URL conventions, DTOs, auth, pagination, RFC 7807 error format, Swagger |
| Database Standards | `.claude/rules/db-standards.md` | TPSPhoenix DB rules: naming, multi-tenancy (MultiTenantEntity/Finbuckle), data types, partitioning, PII encryption |
| Test Standards | `.claude/standards/UNITTEST-STANDARDS.md` | xUnit + Moq + FluentAssertions patterns, naming, coverage thresholds |

---

## Test Configuration

| Config | Value |
|---|---|
| Test Command | `dotnet test` |
| Coverage Command | `dotnet test --collect:"XPlat Code Coverage"` |
| Coverage Threshold | See per-layer thresholds in `.claude/standards/UNITTEST-STANDARDS.md` |
| Test Database | EF Core in-memory database (unit) / SQL Server LocalDB or TestContainers (integration) |
| Mock Library | Moq 4.x |

---

## Memory

| File | Written By | Read By |
|---|---|---|
| `.claude/memory/project_startup_status.md` | Startup Agent | Orchestrator (startup gate on every session) |
| `.claude/memory/project_config.md` | Startup Agent | All agents (branch prefix, base branch, developer name) |
| `.claude/repository-index.md` | Startup Agent | Knowledge Agent, Coding Agent, Code Review Agent |

---

## Output

All pipeline outputs live in the conversation context and Confluence. Nothing is written to disk except memory files and the repository index.

| Artifact | Where |
|---|---|
| Implementation plan | Confluence — child page under the Epic's LLD page |
| Feature branch | Git remote — `<prefix><ticket-id>-<short-description>` |
| Pull request | GitHub — opened by PR Agent after tests pass |
| Test report (pass/fail counts, coverage per layer) | Conversation only — not written to disk |

---

## Agent Directory

| Agent | File | Role |
|---|---|---|
| Orchestrator | `.claude/agents/orchestrator.md` | Drives the full task workflow; coordinates all sub-agents |
| Startup Agent | `.claude/agents/startup-agent.md` | Verify stack, structure, and Jira access once per project; persist result to memory |
| Knowledge Agent | `.claude/agents/knowledge-agent.md` | Fetch Jira ticket (subtask → story → epic); gather Confluence context; delegate codebase analysis |
| Codebase Analysis Agent | `.claude/agents/codebase-analysis-agent.md` | Sync repos, explore existing patterns, scan tps-dms-shared for existing artifacts |
| Planning Agent | `.claude/agents/planning-agent.md` | Produce an approved implementation plan before any coding begins |
| Coding Agent | `.claude/agents/coding-agent.md` | Implement the approved plan; delegate shared repo work to Shared Repo Agent |
| Shared Repo Agent | `.claude/agents/shared-repo-agent.md` | Implement tps-dms-shared changes, raise shared repo PR, manage merge gate, bump NuGet versions |
| Code Review Agent | `.claude/agents/code-review-agent.md` | Review quality, security, type correctness, plan compliance |
| Unittest Agent | `.claude/agents/unittest-agent.md` | Write and verify tests; hand off to PR Agent when suite is green |
| PR Agent | `.claude/agents/pr-agent.md` | Draft and raise the pull request after tests pass |

---

## Skill Directory

| Skill | File | Role |
|---|---|---|
| Confluence Publish Skill | `.claude/skills/confluence-publish-skill/SKILL.md` | Publish the implementation plan as a child of the Epic's LLD page |
| Notify Skill | `.claude/skills/notify-skill/SKILL.md` | Send cross-platform desktop toast and phone push after every agent transition |
| Git Branch Skill | `.claude/skills/git-branch-skill/SKILL.md` | Create or check out the feature branch before coding begins |
| GitHub PR Skill | `.claude/skills/github-pr-skill/SKILL.md` | Push the branch and open a pull request on GitHub after tests pass |

> **Note:** Two additional skill files exist in `.claude/skills/` — `jira-comment-skill/` and `jira-status-skill/`. These are **disabled** for this project. Orchestrator Rule 11 explicitly prohibits all Jira status transitions and comment operations. Do not invoke these skills at any point in the pipeline.

---

## Orchestrator

For the full task workflow, approval gates, agent handoffs, and orchestration rules, read `.claude/agents/orchestrator.md`.
