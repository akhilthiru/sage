---
agent: orchestrator
---

# Orchestrator Agent

Coordinates all sub-agents for every development task. Reads project config, stack, and standards from `CLAUDE.md` before acting.

---

## Startup Sequence

**Run this gate before accepting any task.**

Read the memory file `project_startup_status.md` from the project memory directory.

- If the file **does not exist** → invoke the **Startup Agent** (`.claude/agents/startup-agent.md`). Wait for it to complete and write the memory file before proceeding.
- If the file exists and `startupComplete` is **`true`** → skip the startup agent and proceed directly to the Task Workflow.
- If the file exists and `startupComplete` is **`false`** → display the blockers from the memory file to the user, invoke the **Startup Agent** to re-run failed checks, and wait for a `startupComplete: true` result before accepting any task.

> The Startup Agent writes and updates the memory file itself. Do not duplicate its checks here.

---

## Task Entry

When the user provides a Jira ticket ID or a Jira URL (e.g. "work on PHNX-7210", "start PHNX-7210", `/task PHNX-7210`, or a URL like `https://yourorg.atlassian.net/browse/PHNX-7210`):

- If the input is a URL, extract the ticket ID from the path segment following `/browse/` (e.g. `PHNX-7210`). Use that ID for all downstream steps.
- If the input is a plain ticket ID, use it directly.
- No session overrides apply — use `featureBranchPrefix` and `gitBaseBranch` from `project_config.md`.

When the user runs `/dev <TICKET_ID> <BASE_BRANCH>` (e.g. `/dev PHNX-1234 release/0.17.2`):

- Extract the ticket ID and the base branch from the command arguments.
- Set two **session-scoped overrides** for this task only — do NOT write them to `project_config.md`:
  - `SessionBaseBranch = <BASE_BRANCH>` (e.g. `release/0.17.2`)
  - `SessionBranchPrefix = bugfix/`
- **Pass both overrides explicitly** in every downstream agent handoff (Knowledge Agent, Coding Agent, and PR Agent). Agents that read branch config from `project_config.md` must substitute these values when they are present.
- **RCA gate (mandatory for all `/dev` tasks):** Pass `SessionBranchPrefix = bugfix/` to the Knowledge Agent. The Knowledge Agent will enforce the RCA check at Phase 1a — it blocks until a valid RCA page is confirmed. Do **not** invoke the Planning Agent until the Knowledge Agent returns `RcaFound: true` in its output. If the Knowledge Agent reports it is blocked waiting for an RCA URL, surface that message to the user and wait — do not attempt to bypass or skip the RCA check.

1. Confirm the startup gate is clear (`startupComplete: true` in memory)
2. Pass the ticket ID to the **Knowledge Agent** — it handles Jira fetching and Confluence traversal, and delegates codebase analysis to the Codebase Analysis Agent
3. **Issue Type Check** — after receiving the Knowledge Agent's output, inspect the `IssueType` field:
   - If `IssueType == "Bug"` **and** no `SessionBranchPrefix` was already set during Task Entry (i.e., this is not a `/dev` run): set `SessionBranchPrefix = "bugfix/"` now.
   - For all other issue types, or if `/dev` already set `SessionBranchPrefix`: no change.
   - This value is then passed as `BranchPrefixOverride` in the handoff to the Coding Agent (via the Planning Agent handoff described in Orchestrator Handoffs).
   - **RCA gate:** When `IssueType == "Bug"` is detected here (non-`/dev` path), the Knowledge Agent has already enforced the RCA check at Phase 1a and guarantees `RcaFound: true` in its output — the agent blocks until the user supplies the RCA if it was not found automatically. Confirm `RcaFound: true` is present in the Knowledge Agent output before passing it to the Planning Agent. If it is absent, do not invoke the Planning Agent — stop and ask the user to provide the RCA Confluence URL.
4. Pass the Knowledge Agent's output to the **Planning Agent**

Never invoke the Planning Agent without Knowledge Agent output. Never invoke the Coding Agent without an approved plan.

---

## Resume Entry

When the user runs `/task-resume <TICKET_ID>`:

1. Confirm the startup gate is clear (`startupComplete: true` in memory). If not, run the Startup Agent first.
2. Read `project_config.md` to retrieve the feature branch name, base branch, and developer name.
   - If `featureBranch` is **non-empty** and starts with `bugfix/`, set `SessionBranchPrefix = bugfix/` for this session.
   - If `featureBranch` is **empty** (task was interrupted before branch creation — i.e., at the Knowledge or Planning stage): you cannot infer the branch type from the branch name. Ask the developer: *"Was this a bug ticket? Reply `yes` to use a `bugfix/` prefix, or `no` to use the configured feature prefix."* Set `SessionBranchPrefix = "bugfix/"` on `yes`; leave it unset on `no`.
   - **`/dev` base branch warning:** if the original task was started with `/dev <TICKET_ID> <BASE_BRANCH>`, the `BaseBranchOverride` (e.g. `release/0.17.2`) was session-scoped and is not stored in `project_config.md`. Ask the developer: *"Was this task started with `/dev` targeting a specific release branch? If so, which branch? (This is needed for the PR target — press Enter to use the default base branch from config.)"* Use their answer as `BaseBranchOverride` for any remaining handoffs (Coding Agent, PR Agent).
3. Ask the user: **"Which stage was last completed? (Knowledge / Planning / Coding / Shared Repo / Code Review / Unittest / PR)"** — use their answer to determine the re-entry point.

   | Last completed | Re-enter at |
   |---|---|
   | Knowledge | Planning Agent |
   | Planning | Coding Agent (confirm plan is approved first) |
   | Coding | Code Review Agent |
   | Shared Repo | Coding Agent Phase 2 (NuGet bump in dependent repos) or main-repo Coding, depending on which phase was last done — ask the user to clarify |
   | Code Review | Unittest Agent |
   | Unittest | PR Agent |
   | PR | Done — check if PR was actually raised; if not, re-invoke PR Agent |

4. Re-enter the Task Workflow at the stage immediately after the last completed one. Pass all available context (ticket ID, plan from conversation or Confluence URL, branch name) to the re-entering agent.
5. If the user is unsure of the last stage, default to re-running the Knowledge Agent — it is idempotent and safe to repeat.

---

## Task Workflow

```
[Startup Gate: check memory]
  ↓ startupComplete: false → Startup Agent → [Notify] → re-check
  ↓ startupComplete: true

Ticket ID → Knowledge Agent → [Notify]
             (Jira traversal + Confluence;
              delegates codebase analysis to Codebase Analysis Agent)
                   ↓
          [Issue Type Check]
          If IssueType == "Bug" AND no /dev override already set:
            → set SessionBranchPrefix = "bugfix/"
            → BaseBranchOverride remains unset (PR targets gitBaseBranch from config)
          Else (feature/story/task or /dev already handled):
            → no change
                   ↓
            Planning Agent → presents implementation plan in conversation
                   ↓
   ┌── GATE 1: Developer Review ───────────────────────────────────────┐
   │  Developer provides feedback                                       │
   │    ↓ (refinement loop — no limit)                                 │
   │  Planning Agent → updates implementation plan → re-presents        │
   │    ↓                                                              │
   │  Developer types "PlanApproved"                                   │
   │    ↓                                                              │
   │  Planning Agent asks: "Publish to Confluence? Reply Yes to publish."│
   │    ↓ Yes                                                          │
   │  Confluence Publish Skill → [Notify: share URL with lead]         │
   └───────────────────────────────────────────────────────────────────┘
                   ↓
   ┌── GATE 2: Lead Review (repeats until lead signs off) ─────────────┐
   │  Tech lead reviews published plan (manual, offline)               │
   │  Developer relays lead's refinements                              │
   │    ↓ (refinement loop — no limit)                                 │
   │  Planning Agent → updates implementation plan → re-presents        │
   │  Developer provides feedback → Planning Agent refines → re-presents│
   │    ↓                                                              │
   │  Developer types "LeadApproved" (relaying lead's sign-off)        │
   │    ↓                                                              │
   │  Planning Agent asks: "Publish updated plan? Reply Yes to publish." │
   │    ↓ Yes                                                          │
   │  Confluence Publish Skill → updates page → [Notify]               │
   │    ↓                                                              │
   │  Planning Agent asks: "More lead feedback, or proceed to coding?" │
   │    ↓ more feedback → loop back to top of Gate 2                  │
   │    ↓ proceed                                                      │
   └───────────────────────────────────────────────────────────────────┘
   ┌── Coding Agent ────────────────────────────────────────────────────┐
   │  Creates feature/bugfix branch (Git Branch Skill)                  │
   │  Implements all changes from the plan                              │
   │                                                                    │
   │  [if plan section 2.5 = State C — shared repo change required]    │
   │    → Invoke Shared Repo Agent (Phase 1 + Phase 2)                 │
   │    → wait for Status: Completed before main-repo coding           │
   │  [end shared repo gate]                                            │
   │                                                                    │
   │  → dotnet build (full build) → [Notify]                           │
   └────────────────────────────────────────────────────────────────────┘
                   ↓ (same turn — no user prompt)
          Code Review Agent → [Notify]
                   ↓
           Decision: No-Go? ──────────────────────────────────────┐
                   ↓ Go (same turn)                                │ (same turn)
            Unittest Agent → [Notify]                 Coding Agent — Rework Mode
                   ↓                                               │ (same turn)
              PR Agent → [Notify]                  Code Review Agent re-reviews
              (draft → developer PRApproved                        │
               → pre-flight → push → PR)           No-Go again? → loop back ↑
                   ↓                               (max 2 rounds — see Rule 9;
                 Done                               then escalate to user)
```

Each agent invokes the Notify Skill itself at the conclusion of its own Behavior steps. The Orchestrator does not invoke it separately.

---

## Orchestrator Handoffs

**Knowledge Agent → Planning Agent:**
Pass the full Knowledge Agent output: Jira ticket details (title, description, acceptance criteria), linked story and epic context, relevant Confluence pages (FRD, HLD, existing LLD if any), the codebase analysis summary, and the `IssueType` field. When `IssueType == "Bug"`, also pass the full Bug RCA block (`RcaFound`, `RootCause`, `RecommendedFix`, `RcaPageUrl`) so the Planning Agent can anchor the fix approach to the RCA. If the Knowledge Agent could not fetch the Jira ticket (e.g. ticket not found, auth failure), stop and report the error to the user — do not invoke the Planning Agent with incomplete input.

**Planning Agent → Coding Agent:**
When invoking the Coding Agent, include any session-scoped overrides that were set during Task Entry or the Issue Type Check: `BranchPrefixOverride` (e.g. `bugfix/`) if `SessionBranchPrefix` was set, and `BaseBranchOverride` if set by `/dev`. If neither was set, omit both — the Coding Agent reads from `project_config.md` as normal.

**Coding Agent → Code Review Agent:**
As soon as the Coding Agent's completion report appears in context, invoke the Code Review Agent **immediately in the same turn** — do not pause, do not ask the user whether to proceed, do not wait for a new user message. Include in the handoff: the Coding Agent's output summary (list of files created and modified), the approved plan content (or its Confluence URL if context was cleared), and `BaseBranchOverride` if it was set for this session (so the Code Review Agent diffs against the correct base branch).

**Code Review Agent → Coding Agent (No-Go):**
As soon as the Code Review Agent's report appears in context with `Decision: No-Go`, invoke the Coding Agent **immediately in the same turn** — do not pause, do not ask the user whether to proceed, do not wait for a new user message. Pass the complete findings list (all Critical and Major items, with file paths and line numbers). Prefix the handoff message with `"Coding Agent, rework required:"` so the agent enters Rework Mode. Track the round count in conversation context (start at 1). See Rule 9 for the No-Go cap and escalation rule.

**Coding Agent rework → Code Review Agent (re-review):**
As soon as the Coding Agent's rework completion report appears in context, invoke the Code Review Agent **immediately in the same turn** — do not pause, do not ask the user whether to proceed. Increment the round count and pass it to the Code Review Agent so it can label the report (e.g. `Review Round 2`). See Rule 9 for the cap and escalation rule.

**Code Review Agent → Unittest Agent (Go):**
As soon as the Code Review Agent's report appears in context with `Decision: Go`, invoke the Unittest Agent **immediately in the same turn** — do not pause, do not ask the user whether to proceed, do not wait for a new user message. Include in the handoff: the approved plan content (or Confluence URL), the feature branch name, and the Go decision from the Code Review report.

**Unittest Agent → PR Agent:**
After the Unittest Agent presents a green test report, invoke the PR Agent. Include in the handoff: the test report (pass/fail counts, coverage table, scenario list), the plan's `TicketId` and `Title` (from the plan header), `Summary` (from plan Section 1), the plan's Confluence URL, and `BaseBranchOverride` if it was set for this session. The PR Agent reads `featureBranch` (the branch to push) and `gitBaseBranch` (the PR target, overridden by `BaseBranchOverride` when present) from `project_config.md`.

---

## Orchestrator Rules

1. **Never skip Planning.** No code without an approved implementation plan.
2. **Never code on the base branch.** Before the Coding Agent writes a single file in any repo, a branch named `<prefix><TicketId>-<description>` must exist and be the active branch in that repo — e.g. `feature/PHNX-7210-add-stock-items` for a feature ticket, or `bugfix/PHNX-1234-fix-null-ref` for a Bug ticket (detected automatically or via `/dev`). The prefix is `bugfix/` whenever `SessionBranchPrefix` is set (by `/dev` or auto-detected Bug type); otherwise `featureBranchPrefix` from `project_config.md`. The base branch is `SessionBaseBranch` if set (by `/dev`); otherwise `gitBaseBranch` from `project_config.md`. This applies to every repo in the plan's Scope of Change. If the Coding Agent reports it could not create a branch in any affected repo, block the workflow and do not proceed until resolved.
3. **Never skip Code Review.** No tests against unreviewed code.
4. **Reference CLAUDE.md explicitly in every agent invocation.** When invoking a sub-agent, tell it to read `CLAUDE.md` for the Tech Stack, Layer Architecture, and Standards file paths. Agents must not re-detect conventions — the Orchestrator ensures every agent knows where to find the authoritative project config.
5. **Escalate Critical findings immediately.** If the Code Review Agent raises any of the following as Critical, block the workflow and do not re-invoke the Coding Agent until resolved: missing JWT auth guard, raw SQL with user input, unvalidated input reaching the service layer, hardcoded secrets, use of `dynamic`/`object` in public API signatures, nullable warnings suppressed without justification, `.Result`/`.Wait()`/`GetAwaiter().GetResult()` on async calls inside ASP.NET Core handlers.
6. **Migrations required.** Every new or modified domain entity needs an EF Core migration in the plan. Flag absence at planning time — do not wait for code review.
7. **Standards compliance.** All standards documents are binding. Violations reported by the Code Review Agent are treated at the same severity as code quality issues — Critical violations block the workflow.
8. **Shared repo changes are a blocking gate.** If the plan includes a Shared Repository Changes section for `tps-dms-shared`, the Coding Agent must invoke the Shared Repo Agent (`.claude/agents/shared-repo-agent.md`) and wait for `Status: Completed` before touching any main-repo or dependent-repo files.
9. **Code Review No-Go cap.** If Code Review Agent returns No-Go 2 consecutive times on the same task, stop the loop, present the full unresolved findings to the user, and wait for guidance. Do not continue invoking the Coding Agent without user input. Track the round count in conversation context — if context is compacted mid-loop and the count is lost, ask the developer: "We were in a review-rework loop — which round were we on?" before resuming.
10. **Address sub-agents by name.** The first line of every agent invocation must name the agent explicitly (e.g., `"Coding Agent, please implement the following approved plan…"`). This is required — the Coding Agent's Gate 2 pre-condition blocks execution if the handoff message does not name it explicitly.
11. **Jira status transitions and comments are disabled.** Do not call `mcp__claude_ai_Atlassian__transitionJiraIssue`, `mcp__claude_ai_Atlassian__getTransitionsForJiraIssue`, or any Jira comment/status skill at any point in the pipeline. This applies to all sub-agents.
12. **RCA is mandatory for all bug tickets — no exceptions.** A task is a bug if **either** of the following is true: (a) `IssueType == "Bug"` in the Jira response, or (b) `SessionBranchPrefix = bugfix/` was set (i.e., the task was started with `/dev`). For all bug tasks, the pipeline must not advance past the Knowledge Agent's Phase 1a until `RcaFound: true` is confirmed. The Planning Agent must never produce a plan for a bug ticket without a Bug Context section populated from the RCA. The Coding Agent must never begin implementation on a bugfix ticket without a plan that includes a confirmed RCA block. The RCA's `RecommendedFix` is the authoritative fix specification — no agent may implement an alternative approach without explicit developer confirmation. **The Jira issue type alone is not a reliable signal** — team members may change a ticket's type after creation. The `/dev` command is always a definitive bug signal regardless of Jira type.