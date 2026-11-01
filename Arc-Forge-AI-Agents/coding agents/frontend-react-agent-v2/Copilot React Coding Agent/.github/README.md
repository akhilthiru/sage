# TPS DMS — Copilot AI Development Pipeline

---

## What Is This?

The TPS DMS frontend team has 30+ developers working across 50+ modules. Every feature goes through the same lifecycle — understand the requirement → plan → build → test → review → ship — but each developer was doing this differently, leading to inconsistent quality, architecture drift, and standards violations slipping through to PR review.

This pipeline solves that by automating the entire lifecycle using GitHub Copilot agent mode with MCP server integration. A developer selects a prompt, enters a ticket ID, and the pipeline takes the work from Jira ticket all the way to a ready-to-review PR — with the same quality bar applied every single time, regardless of which developer runs it.

**Average end-to-end time: 20–35 minutes** for a typical feature or bug fix. Phases run sequentially in a single Copilot agent session, with the agent announcing each phase as it starts.

> This is the **GitHub Copilot version** of the TPS DMS AI pipeline. The team also maintains a Claude Code version in `.claude/`. Both pipelines produce the same output — same Confluence specs, same PR structure, same state file format — because they share the same phase logic and MCP servers. The only differences are the tooling entry points and the fact that Copilot runs phases sequentially rather than in parallel subagents.

---

## Prerequisites

Before using the pipeline, ensure the following are in place.

### 1 — VS Code 1.99 or later

MCP server support in Copilot agent mode requires VS Code 1.99+. Check: `Help → About`.

### 2 — GitHub Copilot Extension

Install the **GitHub Copilot** extension from the VS Code marketplace. Ensure you are signed in with an account that has a Copilot license.

### 3 — Environment Variables

The pipeline connects to two external systems via MCP servers. Set the following variables in your shell profile (`.bashrc`, `.zshrc`) or Windows System Environment Variables:

| Variable | Required by | Where to get it |
|----------|------------|----------------|
| `ATLASSIAN_BASE_URL` | Atlassian MCP | Your Atlassian base URL (e.g. `https://yourteam.atlassian.net`) |
| `ATLASSIAN_EMAIL` | Atlassian MCP | Your Atlassian account email |
| `ATLASSIAN_API_TOKEN` | Atlassian MCP | Generate at: id.atlassian.com → Security → API tokens |
| `FIGMA_API_TOKEN` | Figma MCP | Figma → Settings → Personal access tokens (optional — pipeline offers fallback) |

### 4 — MCP Servers (Auto-configured)

The `.vscode/mcp.json` file in this repo registers both MCP servers for VS Code. No manual setup is needed beyond the environment variables above. When you open the repo in VS Code, the servers start automatically.

### 5 — gh CLI (Required for PR creation)

The pipeline uses the `gh` CLI to create pull requests in Phase 7:

```bash
winget install GitHub.cli   # Windows
brew install gh              # macOS
```

Authenticate once: `gh auth login`

---

## How to Trigger the Pipeline

Open Copilot Chat (`Ctrl+Shift+I` on Windows / `Cmd+Shift+I` on Mac), then:

1. Click the **paperclip / attach** icon (or type `/` in the chat input)
2. Select **Prompts**
3. Pick the prompt you want

| Prompt | When to use |
|--------|-------------|
| `dev.prompt.md` | Start a feature or bug fix for any Jira ticket |
| `help.prompt.md` | Show the pipeline quick reference |

You can also type "hi" or "help" in a fresh Copilot Chat — the assistant will respond with a pipeline quick reference because the project instructions (`copilot-instructions.md`) are loaded automatically for every session.

### Coding Pipeline Inputs

When you select `dev.prompt.md`, Copilot asks for:

- **Ticket ID** — e.g. `PHNX-1234`
- **Release branch** (optional) — e.g. `release/0.3.14`. Leave blank for pilot track tickets targeting `main`.

**Auto-detection:** The pipeline fetches the Jira ticket and determines the workflow type and target branch automatically:

| Jira data | Detected |
|-----------|---------|
| Issue type is Story or Task | Feature pipeline (full spec + implementation) |
| Issue type is Bug | Defect pipeline (RCA check → implementation) |
| Fix version name contains `Beta` | Beta track → release branch derived from fix version semver |
| Otherwise or empty fix version | Pilot track → `main` |
| Second argument provided | Beta track → use that argument as the release branch |

---

## The Pipeline at a Glance

Phases run sequentially in a single Copilot agent session. The agent announces each phase as it starts.

**Feature pipeline** (Story/Task tickets):

```
START  →  Detect ticket type + track  →  MCP health check  →  Write spec + plan
                                                      ↓
                                           ◉ HUMAN GATE 1
                                        Developer approves the plan
                                                      ↓
                                    Create branch + Write code
                                                      ↓
                                    Phase 3: Impact Analysis
                                    (tsc + regression tests + locale check)
                                                      ↓
                                    Phase 4: Code Review
                                    (all 18 mandatory standards)
                                                      ↓
                                    ◉ Surface Warnings (only if warnings found)
                                         Developer decides: fix or proceed
                                                      ↓
                                    Phase 5: Test Writer
                                    (vitest, 80% branch coverage)
                                                      ↓
                                    Phase 4b: Performance Review
                                    (bundle, Zustand, SignalR, query checks)
                                                      ↓
                                    Phase 6: Final Rebase Health
                                    (sync with base branch)
                                                      ↓
                                    ◉ HUMAN GATE 2 (only if merge conflicts)
                                        Developer resolves conflicts
                                                      ↓
                                    Phase 7: Release Readiness
                                       Part A (if shared library changed):
                                         submodule PR → ◉ HUMAN GATE 3
                                       Part B:
                                         feature PR → Jira comment + transition → cleanup
```

**Bug/Defect pipeline** (Bug tickets):

```
START  →  Detect ticket type (Bug) + track
                     ↓
           RCA Check (search Confluence for {TICKET_ID}-RCA)
                     ↓
              RCA not found → STOP: "Run the RCA agent first"
                     ↓
     RCA found → load as implementation context
                     ↓
              Create branch + Implement fix
                     ↓
  (same Phase 3 → 4 → 4b → 5 → 6 → 7 sequence as feature pipeline)
```

---

## The Three Human Gates

### Gate 1 — Approve the Plan (always runs, feature tickets only)

After the pipeline reads Jira, Figma, and Confluence and builds a detailed implementation plan, it stops and shows you:

- Summary of what will be built
- Assumptions made where requirements were unclear
- Reusable components found in the codebase

**Type `approve` to proceed. Any other text is treated as feedback — the pipeline revises the Confluence spec and re-presents.** No branch is created and no code is written until you approve.

---

### Gate 2 — Resolve Merge Conflicts (only when conflicts exist)

After implementation, the pipeline syncs the branch with the latest base branch. If there are logic conflicts the pipeline cannot safely resolve, it pauses and lists the conflicting files.

**Open your editor's merge tool, resolve each conflict, then run `git rebase --continue` and type `resolved`.** Most runs never hit this gate.

---

### Gate 3 — Shared Library PR Merge (only when `src/shared/` was changed)

If the feature modified the shared component library, those changes must be merged into `tps-dms-ui-shared` first, before the parent repo's PR is created.

**Request review on the submodule PR, wait for it to be merged, then type `merged`.** The pipeline then pulls the merge commit hash and creates the correct pointer-update PR.

---

## Each Pipeline Phase — What It Does

### Phase 0 — Initialization

Detects workflow type and track from Jira, probes MCP servers, creates the state file. Reports:

```
Detected: feature — pilot track → targeting main
Ticket:   PHNX-1234 — Dealer bulk-edit screen
Workflow: feature
```

MCP connectivity check:
```
  Atlassian (Jira + Confluence) : ✅ connected
  Figma                         : ✅ connected
  GitHub                        : ✅ connected
```

If Atlassian is unavailable the pipeline stops — it cannot proceed without Jira/Confluence access. Figma and GitHub offer fallbacks.

---

### Phase 1 — Spec & Plan

**What it reads:**
- Jira: ticket title, description, acceptance criteria, comments, issue type
- Figma: linked design (screenshot/paste/skip fallback if unavailable)
- Confluence: linked technical docs, epic HLD pages
- Sprint plan: if a plan exists in Confluence for the current sprint, slot and dependencies are loaded automatically
- Codebase: scans `src/features/`, `src/shared/`, hooks, and services for reuse opportunities
- Git history: reads `git log` on files expected to change

**What it produces — a Confluence page (`{TICKET_ID} — <title>` in the project space):**

This page serves as both the spec and the LLD. It contains: summary, acceptance criteria, assumptions, out-of-scope items, exact file names and paths, reusable components table, API endpoints, feature flag name, locale keys, submodule impact, test cases, and complexity estimate.

The spec page ID and URL are recorded in the state file and used in Phase 7 for the PR body and Jira comment.

---

### Phase 2 — Branch & Implementation

Creates a clean branch from the latest base branch, then implements in a fixed order:

1. TypeScript interfaces and types
2. Validation schemas (if forms are involved)
3. API service functions
4. TanStack Query key factory
5. Query hooks
6. Mutation hooks (with `useToastStore` notifications)
7. Zustand store (only if the spec explicitly requires one)
8. Screen component and sub-components (loading, empty, error states)
9. Translation keys — all three files (`en.json`, `de.json`, `ru.json`) at the same time
10. Tab/route registration
11. Feature flag guard (`features?.flagName`)

Each logical unit is committed individually. The ESLint pre-commit hook runs automatically — never bypassed with `--no-verify`.

---

### Phase 3 — Impact Analysis & Regression Guard

Three checks run in sequence:

1. **Full TypeScript compile** (`npx tsc --noEmit`) — catches type errors across all 50+ modules. Blocking.
2. **Targeted regression tests** (`npx vitest run --changed {baseBranch}`) — Vitest's module graph scopes execution to only tests whose dependency tree includes a changed file. Typically 1–3 minutes. Blocking if a previously passing test now fails.
3. **Translation key integrity** — checks via `git diff` that no existing key was deleted or renamed without a replacement. Blocking if violated.

Also produces a reverse-dependency map of which existing modules import changed shared files — passed to Phase 5 so the test writer knows which areas to verify.

---

### Phase 4 — Code Review

Reviews every changed file against `.github/rules/coding-standards.md`.

**Blocking violations** (fixed directly by the agent):
- TypeScript `any` type anywhere
- `console.log`, `debugger`, `TODO`, `FIXME` in committed code
- `../../` relative imports (must use path aliases)
- Feature flags not using optional chaining (`features?.flagName`)
- Zustand store not using the `createStore` factory
- TanStack Query using raw string keys instead of the key factory
- Translation files not all updated together
- Toast notifications not going through `useToastStore`
- Screens not wrapped in `TabErrorBoundary` and `Suspense`
- `PxDataGrid` / `PxDialogModal` not imported from `@ui-kit`
- Service endpoints using `import.meta.env` directly instead of `envConfig`
- Hardcoded user-visible text (must use `t('key')`)
- And additional mandatory rules (see `coding-standards.md`)

**Warnings** (not auto-fixed — surfaced at the Surface Warnings gate).

---

### Surface Warnings Gate *(only if Phase 4 found warnings)*

```
⚠️ Code review complete — warnings found:
[list of warnings with file references]

Reply with:
  proceed   → create PR with warnings noted in description
  fix       → return to Phase 2 to address these first
```

---

### Phase 5 — Test Writer

Writes unit and integration tests for all changed files (new and modified), then runs coverage checks. Uses `.github/rules/unit-testing-standards.md`.

**Coverage target**: 80% branch coverage on all files changed in this pipeline run. Uses `npx vitest run --changed {baseBranch}` scoped to the affected feature project.

**What gets tested per file type:**
- Query hooks: correct data shape returned, error handling
- Mutation hooks: success toast triggered, correct query invalidation, error toast on failure
- Screen components: renders with flag ON, hidden with flag OFF, loading state, empty state, error state
- Utility functions: unit tests for every exported function

---

### Phase 4b — Performance Review

**Complexity gate:** Automatically skipped if ≤3 files changed and no performance-sensitive patterns detected (no `useQuery`, `useSignalR`, store subscriptions, or large library imports). A "skipped" result is not a failure.

**Blocking violations** (must be fixed):

| Issue | Why |
|-------|-----|
| Importing an entire library instead of one function (`import { debounce } from 'lodash'`) | Adds 70KB bundle cost for a 2KB function |
| Subscribing to an entire Zustand store without a selector | Component re-renders on every unrelated state change |
| Opening a SignalR connection without cleanup on unmount | Permanent connection leak |

**Warnings** (written to `performanceWarnings` in state, included in PR description):

| Issue | Why |
|-------|-----|
| Query missing `staleTime` | Refetches on every component mount |
| Overly broad `invalidateQueries` after a save | Forces all active queries to refetch |
| `PxDataGrid` without virtual scrolling on potentially large datasets | Renders a massive DOM all at once |
| Unstable object/array/function prop on a memoised component | Defeats memoisation on every render |

---

### Phase 6 — Final Rebase Health

Syncs the feature branch with the latest base branch before the PR is created. Runs immediately before Phase 7 to catch anything that merged during the pipeline run.

**Auto-resolved conflicts:**
- Translation files: both sides added new keys — the pipeline accepts both
- Feature flag config files: additive on both sides — the pipeline accepts both

**Human Gate 2 triggered** when conflicts exist in logic files where at least one side is a human commit.

---

### Phase 7 — Release Readiness

**Part A** *(only if `submoduleFlag: true` in state):*
- Verifies the submodule branch is pushed
- Creates PR #1 in the submodule repo: submodule changes → `main`
- **HUMAN GATE 3**: waits for `merged` or `abort`

**Part B:**
1. **Submodule pointer update** *(if submoduleFlag):* pulls the merge commit hash, commits the pointer, creates PR #2.
2. **README staleness check**: updates `README.md` if npm scripts, core deps, MCP config, or pipeline phases changed.
3. **Push feature branch**: `git push -u origin {branch}`
4. **Create feature PR**: body populated from the Confluence spec (fetched via `getConfluencePage(specPageId)`). Includes pre-ticked checklist items, `specPageUrl` in Notes for Reviewers, performance warnings if any.
5. **Jira comment**: adds the PR URL and spec URL to the Jira ticket.
6. **Jira transition**: moves the ticket to "In Review".
7. **Handover**: presents all links and a manual testing checklist with step-by-step instructions derived from the spec's acceptance criteria.
8. **Cleanup**: deletes `.github/output/pipeline-state/{TICKET_ID}-state.yml`.

---

## What the Developer Does vs What the Pipeline Does

| Step | Who does it |
|------|------------|
| Ensure RCA agent has been run for bug tickets | Developer |
| Select `dev.prompt.md` and enter ticket ID | Developer |
| Detect ticket type and track from Jira | Pipeline |
| MCP health check | Pipeline |
| Read Jira, Figma, Confluence | Pipeline |
| Scan codebase and git history | Pipeline |
| Write spec and implementation plan to Confluence | Pipeline |
| Review and approve the spec + plan | **Developer (Gate 1)** |
| Create the branch | Pipeline |
| Write all the code | Pipeline |
| Commit code following standards | Pipeline |
| Sync with latest base branch | Pipeline |
| Resolve merge conflicts (if any) | **Developer (Gate 2)** |
| Run TypeScript compile + regression tests | Pipeline |
| Review code against all standards | Pipeline |
| Decide on non-blocking warnings | **Developer (Surface Warnings)** |
| Write unit tests to 80% coverage | Pipeline |
| Check performance patterns | Pipeline |
| Final sync before PR | Pipeline |
| Create feature PR | Pipeline |
| Create shared library PR (if applicable) | Pipeline |
| Merge shared library PR into main | **Developer (Gate 3)** |
| Create pointer update PR | Pipeline |
| Add PR + spec links as Jira comments | Pipeline |
| Transition Jira ticket to "In Review" | Pipeline |
| Add screenshots to the PR | Developer |
| Test on Chrome and Safari | Developer |
| Approve and merge the PR | Developer / Reviewer |

---

## Resume After Interruption

Every pipeline run saves a state file at `.github/output/pipeline-state/{TICKET_ID}-state.yml`. This file records every completed phase, the branch name, Confluence page IDs, MCP server status, and intermediate results.

If VS Code is closed, the network drops, or the session ends mid-run — select `dev.prompt.md` again with the same ticket ID. The pipeline reads the state file and resumes from the last completed phase.

The state file is automatically deleted when the pipeline completes successfully.

---

## Pipeline File Structure

```
.github/
  copilot-instructions.md   ← loaded automatically by every Copilot session
                               (includes greeting-response guide + coding standards)
  prompts/
    dev.prompt.md            ← start a feature or bug fix
    help.prompt.md           ← quick reference guide

  copilot/                  ← phase agents (loaded via #file: from the orchestrators)
    phase-1-spec-plan.prompt.md
    phase-2-implementation.prompt.md
    phase-3-impact-analysis.prompt.md
    phase-4-code-review.prompt.md
    phase-5-test-writer.prompt.md
    phase-4b-performance.prompt.md
    phase-6-rebase-health.prompt.md
    phase-7-release.prompt.md

  rules/                    ← standards loaded by agents via #file:
    coding-standards.md
    unit-testing-standards.md

.vscode/
  mcp.json                  ← VS Code MCP server registration

.github/output/
  pipeline-state/           ← transient state files (gitignored)
    {TICKET_ID}-state.yml
```

---

## Differences Between the Claude and Copilot Pipelines

Both pipelines implement the same phases, produce the same Confluence output, and use the same MCP servers. The differences are tooling-level only.

| Aspect | Claude Code pipeline | Copilot pipeline |
|--------|---------------------|-----------------|
| Entry point | `/dev PHNX-1234` slash command in Claude Code chat | Select `dev.prompt.md` from Copilot Chat prompt picker |
| Phase execution | Parallel subagents for Blocks A and B | Sequential phases in one agent session |
| Notifications | Desktop push notifications at each phase | Progress shown in Copilot Chat |
| Phase files | `.claude/agents/` (`.md`) | `.github/copilot/` (`.prompt.md`) |
| Rules files | `.github/rules/coding-standards.md` (shared) | `.github/rules/coding-standards.md` (shared) |
| State file | `.claude/output/pipeline-state/` | `.github/output/pipeline-state/` |
| Confluence output | Identical | Identical |
| PR output | Identical | Identical |

---

## Built-in Safeguards

| Safeguard | When it runs | What it prevents |
|-----------|-------------|-----------------|
| MCP Health Check | Before anything starts | Pipeline failing mid-way due to unavailable external services |
| Auto-detection | Before anything starts | Mismatched workflow — pipeline infers correct type from Jira |
| RCA Check | Before implementation (bug tickets) | Implementing without a confirmed root cause analysis |
| Human Gate 1 | After planning (feature tickets) | Building the wrong thing — no code written without approval |
| TypeScript compile | Phase 3 | Type changes silently breaking other modules |
| Regression tests | Phase 3 | Previously passing tests broken by the new code |
| Translation key check | Phase 3 | Deleted/renamed keys causing silent broken text at runtime |
| Code Review | Phase 4 | All 18 mandatory standards enforced every time |
| Surface Warnings Gate | After Phase 4 | Non-blocking issues reviewed before tests are written |
| Performance Review | Phase 4b | Bundle bloat, re-render inefficiencies, connection leaks |
| Complexity gate | Phase 4b | Wasting time on performance checks for trivial changes |
| Rebase Health | Phase 6 | Branch out of date with base branch when PR is opened |
| Dependency Gate | Phase 7 | PR created before prerequisite stories have merged |
| Human Gate 2 | Phase 6 | Merge conflicts in logic files resolved by a human |
| Human Gate 3 | Phase 7 | Parent app pointing to an unmerged shared library commit |
