# Senior Backend Developer Agent

An intelligent agent that implements Jira tickets end-to-end on a .NET 8 / ASP.NET Core microservice codebase. Given a ticket ID, it traverses the Jira hierarchy (subtask → story → epic), reads your HLD, LLD, and FRD from Confluence, analyses the relevant repos, produces an implementation plan for developer and tech lead approval, implements the approved plan on a feature branch across all affected repos, reviews the code for quality and standards compliance, writes and verifies tests against coverage thresholds, then raises a pull request on GitHub.

---

## Quick Start

### 1. Prerequisites

- [Claude Code](https://claude.ai/code) installed locally
- **Atlassian MCP** connected in Claude Code → Settings → Connectors (covers both Jira and Confluence)
- [`gh` CLI](https://cli.github.com) installed and authenticated (`gh auth login`) — used to raise pull requests
- Git configured with access to your GitHub repos
- .NET 8 SDK installed (for build and test verification)

### 2. Connect the MCP

Open **Claude Code → Settings → Connectors** and connect **Atlassian**. This is the only connector required — it provides both Jira and Confluence access.

### 3. Place the agent alongside your repos

Copy or clone this agent into the same parent directory where you have cloned your microservice repos. The directory structure should look like:

```
<your-workspace>/
├── CLAUDE.md          ← this agent
├── .claude/
├── tps-dms-shared/    ← your shared repo
├── tps-dms-repair-order/
├── tps-dms-accounting/
└── ...                ← any other cloned repos
```

Then open `<your-workspace>` in Claude Code.

### 4. Run — First Time

## Entry Points

| Trigger | What changes vs default |
|---|---|
| Paste Jira Ticket URL | Standard pipeline |
| `/task PHNX-1234` | Same as URL paste |
| `/dev PHNX-1234 release/0.17.2` | Prefix → `bugfix/`, base branch → `release/0.17.2`, commit type → `fix(...)` |
| `/startup` | Re-runs environment setup only |
| `/task-resume PHNX-1234` | Skips completed stages; asks user where to re-enter |

**The first run automatically triggers the Startup Agent**, which will:
- Verify your project structure and .NET manifest
- Verify Jira and Confluence connectivity
- Ask for your feature branch prefix (e.g. `feature/`) and git base branch (e.g. `main`)
- Retrieve your developer name from Atlassian authentication
- Write memory files so all future runs skip this entirely (~2 minutes)

### 5. Force Re-setup

```
/startup
```

Use when Jira credentials change, the MCP connection is reset, or startup memory is stale.

---

## How It Works — Step by Step

```
Jira Ticket URL
     │
     ▼
[Step 1] Startup Gate (once per project — skipped if already green)
         └─ Verifies .NET manifest, project structure, Jira access
         └─ Collects branch prefix, base branch, developer name
         └─ Writes memory files for all future sessions
     │
     ▼
[Step 2] Knowledge Agent reads the ticket
         └─ Fetches subtask → parent story → epic from Jira
         └─ Detects issue type — if Bug, searches for the {TicketId}-RCA Confluence page
             ⏸ If the RCA page is NOT found → STOPS and asks you to share it
                (paste the URL or content directly; no planning begins without it)
             └─ Extracts root cause and recommended fix — this is the authoritative fix approach;
                the Planning Agent follows the RCA, not its own derivation
         └─ Reads the story's Confluence page (acceptance criteria)
         └─ Reads the epic's FRD, HLD, and LLD from Confluence
         └─ Analyses all affected repos in the workspace
         └─ Scans tps-dms-shared for existing shared artifacts
     │
     ▼
[Step 3] Planning Agent produces an implementation plan
         └─ Maps the full layer flow (Controller → Service → Repository)
         └─ Lists every file to create, modify, or delete
         └─ Defines data contracts, error handling, cache strategy, migrations
         └─ Lists test scenarios for the Unittest Agent
     │
     ▼
[Step 4] ⏸ GATE 1 — YOUR APPROVAL
         └─ Plan presented in conversation
         └─ Type PlanApproved to proceed, or give feedback to refine
         └─ No limit on refinement rounds
         └─ On APPROVED → Planning Agent asks "Publish to Confluence? Reply Yes to publish"
         └─ Type Yes → plan published to Confluence as child of Epic's LLD page
     │
     ▼
[Step 5] ⏸ GATE 2 — LEAD REVIEW
         └─ You share the Confluence URL with your tech lead
         └─ Relay their feedback → agent refines and re-publishes
         └─ Type LeadApproved when lead is satisfied
     │
     ▼
[Step 6] Coding Agent implements the plan
         └─ Creates feature branch (feature/PHNX-7210-add-stock-items)
             in EVERY affected repo before writing a single file
         └─ Base branch (main) is pulled latest in each repo first
         └─ If plan includes tps-dms-shared changes → Shared Repo Agent takes over:
             Phase 1 — implements shared repo → bumps NuGet version
                        → shows PR draft → Type PRApproved → raises PR
             ⏸ WAITS for you to confirm the shared repo PR is merged and package published
             Phase 2 — bumps NuGet version in all dependent repos → dotnet build per repo
             (Coding Agent waits for Shared Repo Agent Status: Completed before touching main repo)
         └─ Runs dotnet build — must be green before handoff
     │
     ▼
[Step 7] Code Review Agent reviews the implementation
         └─ Checks plan compliance (file counts match Scope of Change)
         └─ Checks security, layer isolation, async patterns, type safety
         └─ Checks EF Core, FluentValidation, Serilog standards
         └─ Go → proceeds to tests
         └─ No-Go → Coding Agent reworks; max 2 consecutive No-Go rounds before escalating to you
     │
     ▼
[Step 8] Unittest Agent writes and verifies tests
         └─ Writes unit tests (Controller, Service, Validator layers)
         └─ Writes integration tests (Repository layer, WebApplicationFactory)
         └─ Runs dotnet test — must be fully green
         └─ Verifies coverage thresholds per layer (Services ≥90%, etc.)
         └─ Reports coverage table to you in conversation
     │
     ▼
[Step 9] ⏸ PR APPROVAL
         └─ PR Agent assembles the full PR draft (title, summary, test plan, coverage, references)
         └─ Full PR shown in conversation
         └─ Type PRApproved to raise the PR, or give feedback to refine
     │
     ▼
[Step 10] Pull Request raised on GitHub
          └─ Branch pushed, PR created via gh CLI
          └─ PR body includes summary, test plan, coverage table,
              and References (Confluence LLD URL + Jira link)
          └─ PR URL shared in conversation
          └─ Desktop + phone notification sent
```

---

## Branch Naming

Every branch follows this convention, applied identically across all affected repos:

```
<prefix>/<TICKET_ID>-<short-description>
```

**Feature ticket (URL paste or `/task`):**
```
feature/PHNX-7210-add-stock-items
feature/PHNX-7211-repair-order-events
```

**Bug ticket (auto-detected `IssueType == "Bug"`):**
```
bugfix/PHNX-3210-fix-null-ref-on-order-create
```

**`/dev` command (bugfix targeting a specific release branch):**
```
bugfix/PHNX-1234-fix-missing-tenant-filter
```
The PR target is the release branch you specified (e.g. `release/0.17.2`), not `main`.

Rules:
- Prefix: `feature/` by default; automatically `bugfix/` for Bug tickets and all `/dev` runs
- Ticket ID is always included — never omitted
- Description: lowercase, hyphen-separated, ≤ 5 words
- The same branch name is created in every repo the task touches
- Coding on the base branch is a hard blocker — the agent will stop if the active branch is not the feature branch

---

## Multi-Repo Behaviour

This agent is designed to be dropped into whatever directory the developer has cloned their repos into. It works with any number of microservice repos alongside `tps-dms-shared`.

**Repos are auto-discovered at startup.** The Startup Agent scans the workspace for every folder containing a `README.md` and writes a repository index to `.claude/repository-index.md`. All agents read from this index — no repo names are hardcoded in the pipeline.

The Coding Agent reads the approved plan's Scope of Change and creates the feature branch in **every repo that has at least one file listed** — not just the primary one. If a task touches three repos, all three get the branch before any file is written.

**`tps-dms-shared` is a special case.** If the plan requires changes to the shared NuGet packages repo, it is treated as a two-phase flow with a hard gate between phases:

| Phase | What happens |
|---|---|
| Phase 1 | Implement shared repo changes → bump NuGet version → raise PR → ⏸ wait for merge and package publish |
| Phase 2 | Update `Directory.Packages.props` in all dependent repos → `dotnet build` in each |

No dependent repo is touched until the user confirms the shared repo PR is merged and the new package version is available on the feed.

---

## Coverage Thresholds

The Unittest Agent enforces these thresholds. The PR is not raised if any layer is below threshold.

| Layer | Min Lines | Min Branches |
|---|---|---|
| Services | 90% | 85% |
| Controllers | 85% | 80% |
| Repositories | 85% | 80% |
| Validators | 100% | 100% |
| Domain Entities | 90% | 85% |
| Exception Handlers | 85% | 80% |

---

## Agents

| Agent | Step | Role |
|---|---|---|
| `orchestrator` | All | Drives the pipeline, enforces gates, coordinates all agents |
| `startup-agent` | 1 | Verifies environment once; writes memory for future sessions |
| `knowledge-agent` | 2 | Fetches Jira ticket hierarchy; reads Confluence; delegates codebase analysis |
| `codebase-analysis-agent` | 2 | Syncs repos, explores existing patterns, scans tps-dms-shared for existing artifacts |
| `planning-agent` | 3–5 | Produces implementation plan; manages developer and lead approval gates |
| `coding-agent` | 6 | Creates branches in all affected repos; implements the plan; delegates shared repo work |
| `shared-repo-agent` | 6 | Implements tps-dms-shared changes, raises shared repo PR, manages merge gate, bumps NuGet versions |
| `code-review-agent` | 7 | Reviews quality, security, layer isolation, and standards compliance |
| `unittest-agent` | 8 | Writes tests, verifies coverage, hands off to PR Agent |
| `pr-agent` | 9–10 | Drafts PR, gets developer approval, raises PR on GitHub |

---

## Skills

| Skill | Used By | Purpose |
|---|---|---|
| `confluence-publish-skill` | Planning Agent | Publishes implementation plan as child of Epic's LLD page |
| `git-branch-skill` | Coding Agent | Creates feature branch in each affected repo (pulls latest main first) |
| `github-pr-skill` | PR Agent, Shared Repo Agent | Pushes branch and opens PR on GitHub |
| `notify-skill` | All agents | Desktop toast + phone push after every agent transition |

---

## Resume After Interruption

```
/task-resume PHNX-7210
```

The agent will ask which stage last completed (Knowledge / Planning / Coding / Shared Repo / Code Review / Unittest / PR) and re-enter the pipeline at the next step. All prior context from the approved plan and branch name is recovered from memory and conversation history.

---

## Output

| Artifact | Where |
|---|---|
| Implementation plan | Confluence — child page under the Epic's LLD page, titled `<TicketId> - Implementation Plan` |
| Feature branch | Git remote — `feature/<TicketId>-<description>` in each affected repo |
| Pull request | GitHub — includes summary, test plan, and per-layer coverage table |
| Test report | Conversation only — not persisted |

---

## Standards Enforced

Every piece of generated code is checked against these standards (read in full by agents before planning or coding):

| Standard | Covers |
|---|---|
| `.claude/standards/DOTNET-RULES.md` | Async/await, nullable types, EF Core, DI, controller/service/repository patterns |
| `.claude/rules/api-standards.md` | REST URL conventions, DTOs, pagination, RFC 7807 error format, Swagger |
| `.claude/rules/db-standards.md` | Naming, multi-tenancy (Finbuckle), data types, table partitioning, PII encryption |
| `.claude/standards/UNITTEST-STANDARDS.md` | xUnit + Moq + FluentAssertions patterns, naming, coverage thresholds |

---

## Troubleshooting

**"Startup blocked — Jira unavailable"**
→ Check your Atlassian MCP connection in Claude Code → Settings → Connectors. Re-authenticate if needed, then run `/startup`.

**"Implementation plan published but lead review is pending"**
→ This is normal. Share the Confluence URL with your lead. Once they have reviewed, relay their feedback or type `Approved` to proceed to coding.

**"Branch creation failed in repo X"**
→ Check that `origin` is configured and you have push access: `git remote -v` inside that repo. Resolve the git issue and run `/task-resume PHNX-7210`.

**"dotnet build failed after coding"**
→ The Coding Agent will report the build errors in conversation. It will attempt to fix them. If it cannot after the first attempt, the errors are surfaced to you for guidance.

**"Code Review returned No-Go 2 consecutive times"**
→ The orchestrator stops the loop and presents the unresolved findings to you. Review the Critical/Major items listed and decide whether to continue, adjust the plan, or escalate.

**"Coverage below threshold"**
→ The Unittest Agent will add more tests before proceeding. If coverage cannot be raised above threshold with reasonable tests (e.g., generated code, framework boilerplate), the agent will flag it and ask for your decision.

**"gh auth status fails during PR pre-flight"**
→ Run `gh auth login` in the terminal, then type `Approved` again to retry the PR step.

**"PR raised but wrong base branch"**
→ The base branch is read from `project_config.md` in `.claude/memory/`. Run `/startup` to reconfigure it.
