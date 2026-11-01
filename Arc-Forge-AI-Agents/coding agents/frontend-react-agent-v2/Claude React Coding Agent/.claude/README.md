# TPS DMS — AI Development Pipeline

---

## What Is This?

The TPS DMS frontend team has 30+ developers working across 50+ modules. Every feature goes through the same lifecycle — understand the requirement → plan → build → test → review → ship — but each developer was doing this differently, leading to inconsistent quality, architecture drift, and standards violations slipping through to PR review.

This pipeline solves that by automating the entire lifecycle using AI agents. A developer types one command, and Claude Code takes the work from Jira ticket all the way to a ready-to-review PR — with the same quality bar applied every single time, regardless of which developer runs it.

**Average end-to-end time: 15–25 minutes** for a typical feature or bug fix. Phases that are independent of each other run concurrently as parallel subagents, eliminating the wait time that would otherwise accumulate from sequential execution.

Desktop notifications are sent automatically at the start and completion of every phase and every human gate — so the developer does not need to watch the terminal. They receive a push notification when input is needed.

---

## How to Trigger the Pipeline

The developer types one of the following commands in the Claude Code chat inside VS Code:

| Command | Track | When to use |
|---------|-------|-------------|
| `/dev PHNX-1234` | Pilot | Any ticket targeting `main` — issue type and track auto-detected from Jira |
| `/dev PHNX-1234 release/0.3.14` | Beta | Any ticket targeting a release branch — dual PRs created automatically (release branch + main backport) |

**Auto-detection:** `/dev` fetches the Jira ticket and determines both workflow type and track automatically:

| Jira data | Detected |
|-----------|---------|
| Issue type is Story or Task | Feature pipeline (full spec + implementation) |
| Issue type is Bug | Defect pipeline (RCA check → implementation) |
| Fix version name contains `Pilot`, `F1`, `F2`, `F3`, or empty | Pilot track → `main` |
| Fix version name contains `Beta` | Beta track → release branch derived from fix version semver |
| Second argument provided | Beta track → use that argument as the release branch |

The release branch argument is optional: if the fix version contains a semver (e.g. `"0.3.14 Beta"`), `/dev` constructs `release/0.3.14` automatically.

**PR targets are set automatically by track:** pilot track creates one PR targeting `main`; beta track always creates dual PRs — one to the release branch and one to `main` — ensuring every fix and feature backports to main automatically. No manual back-merge is ever needed.

---

## The Pipeline at a Glance

Think of the pipeline as a production line. Independent phases run **concurrently** as parallel subagents to maximise throughput. There are three points where the pipeline pauses and waits for the developer to make a decision — everything else runs automatically.

**Feature pipeline** (Story/Task tickets):

```
START  →  Detect ticket type + track  →  MCP health check  →  Write spec + plan
                                                      ↓
                                           ⛔ HUMAN GATE 1
                                        Developer approves the plan
                                                      ↓
                                    Create branch + Write code
                                                      ↓
          ┌───────────────────────────────────────────────────────────────────┐
          │                    PARALLEL BLOCK A (concurrent)                  │
          │   Impact Analysis & Regression Guard  │  Code Review              │
          └───────────────────────────┬───────────────────────────────────────┘
                                      ↓
                         ⛔ Surface Warnings (only if warnings found)
                              Developer decides: fix or proceed
                                                      ↓
          ┌───────────────────────────────────────────────────────────────────┐
          │                    PARALLEL BLOCK B (concurrent)                  │
          │              Test Writer              │  Performance Review        │
          └───────────────────────────┬───────────────────────────────────────┘
                                      ↓
                              Sync with target branch
                                                      ↓
                                           ⛔ HUMAN GATE 2 (only if merge conflicts)
                                        Developer resolves conflicts
                                                      ↓
                                           ⛔ HUMAN GATE 3 (only if shared library changed)
                                        Developer merges the shared library PR into main
                                                      ↓
                              Pipeline checks out main inside submodule → pulls merge commit
                              git add src/shared captures exact merge hash as pointer
                                                      ↓
                              Create pointer update PR  →  Create feature PR
                                                      ↓
                              Update Jira  →  DONE
```

**Bug/Defect pipeline** (Bug tickets):

```
START  →  Detect ticket type (Bug) + track
                     ↓
           RCA Check (Confluence search + Jira comments — simultaneous)
                     ↓                               ↓
              RCA not found                  ⛔ STOP: "Run /rca first"
                     ↓
     RCA found ("{TICKET_ID}-RCA" under TALON Rev - RCA Documents) → load as context
                     ↓
              Create branch + Implement fix
                     ↓
  ┌──────────────────────────────────────────────────────────────────────────┐
  │                       PARALLEL BLOCK A (concurrent)                      │
  │    Impact Analysis & Regression Guard     │     Code Review               │
  └──────────────────────────┬───────────────────────────────────────────────┘
                              ↓
  ┌──────────────────────────────────────────────────────────────────────────┐
  │                       PARALLEL BLOCK B (concurrent)                      │
  │           Test Writer                    │    Performance Review          │
  └──────────────────────────┬───────────────────────────────────────────────┘
                              ↓
         Sync with target branch  →  Create PR(s)  →  Update Jira  →  DONE
```

---

## The Three Human Gates

The pipeline is designed to be fully automated except at three decision points where a human must be in control.

### Gate 1 — Approve the Plan (always runs, feature tickets only)

After the AI reads the Jira ticket, Figma design, and Confluence page and builds a detailed implementation plan — it stops and shows the developer:

- A summary of what will be built
- Any assumptions it made where requirements were unclear
- A list of existing components it found that can be reused

**The developer must type `approve` before any code is written or any branch is created.** If something looks wrong, the developer gives feedback and the AI revises the plan.

---

### Gate 2 — Resolve Merge Conflicts (only when conflicts exist)

After implementation is complete, the pipeline syncs the branch with the latest main. If two developers changed the same logic file at the same time, there is a conflict the AI cannot safely resolve on its own. The pipeline lists the conflicting files and pauses.

**The developer opens VS Code's merge editor, resolves the conflicts, then tells the pipeline to continue.** Most pipelines never hit this gate — it only appears when a genuine conflict exists.

---

### Gate 3 — Shared Library PR Merge (only when shared library was changed)

If the feature included changes to the shared component library (`src/shared/`), those changes must be merged into the shared library's own `main` branch first — before the main feature PR is created.

**Why this matters:** The parent application (`tps-dms-app`) does not copy shared library files — it stores a pointer to a specific commit in `tps-dms-ui-shared`. If the pipeline created the feature PR while the shared library branch was still unmerged, that pointer would reference a commit that only exists on an unmerged branch. Every other developer on the team would get a broken clone the moment they pulled, because git would try to check out a commit it cannot find on `main`.

**The correct sequence:**
1. Pipeline creates PR #1 in `tps-dms-ui-shared` (shared library changes → `main`) and pauses
2. Developer requests review, waits for PR #1 to be merged into `main`
3. Developer tells the pipeline `merged`
4. Pipeline runs inside the submodule:
   - `git -C src/shared checkout main` — switches submodule to main
   - `git -C src/shared pull origin main` — pulls the newly merged commit
5. Pipeline runs `git add src/shared` in the parent repo — this captures the exact merge commit hash as the new pointer
6. Pipeline commits the pointer update and creates PR #2 (pointer update) and PR #3 (feature)

This guarantees the parent repo always points to a commit that is on `main` in the shared library — a commit every developer can access.

---

## Each Pipeline Stage — What It Does

> **Model right-sizing:** Mechanical checks (Impact Analysis, Performance Review) run on Claude Haiku for speed. Reasoning-intensive phases (Code Review, Test Writer) run on Claude Sonnet. This reduces cost and latency without sacrificing output quality.

---

### Stage 0 — Auto-detection & MCP Health Check

**What it does:** Every pipeline run starts here before any work begins — detecting the workflow type and MCP connectivity in a single initialisation step.

**Step 0 — Ticket detection:**
The pipeline fetches the Jira ticket and auto-detects everything it needs:

| What is detected | How |
|-----------------|-----|
| **Workflow type** | Issue type — Story/Task → feature pipeline · Bug → defect pipeline (RCA-first) |
| **Track** | Fix version name — `Beta` → beta track · pilot keywords or empty → pilot track |
| **Base branch** | Pilot → `main` · Beta → derived from fix version semver (e.g. `"0.3.14 Beta"` → `release/0.3.14`) or provided as argument |
| **PR targets** | Pilot → `[main]` · Beta → `[release/X.Y.Z, main]` (dual PRs, automatic backport) |

The developer is shown a one-line confirmation before any further work begins:
```
Detected: feature — pilot track → targeting main
Ticket:   PHNX-1234 — Dealer bulk-edit screen
Workflow: feature
```

**Step 1 — MCP health check:**
Probes each MCP server with a lightweight call and reports status:

```
🔌 MCP Connectivity Check

  Atlassian (Jira + Confluence) : ✅ connected  |  ❌ unavailable
  Figma                         : ✅ connected  |  ❌ unavailable
  GitHub                        : ✅ connected  |  ❌ unavailable
```

If all servers are up the pipeline continues automatically. If any server is unavailable the developer chooses: continue with fallbacks per phase, or abort. The result is recorded in the state file so every downstream phase knows which servers are available.

**For Bug tickets — RCA Check (replaces Spec & Plan):**
Instead of writing a spec, the pipeline simultaneously searches for a child page titled `{TICKET_ID}-RCA` under the [TALON Rev - RCA Documents](https://harleydavidson.atlassian.net/wiki/spaces/TPSPhoenix/pages/2408808451) Confluence page AND fetches all Jira comments on the ticket — both in parallel to save time. If the RCA page is found, both sources are loaded as implementation context and the pipeline proceeds directly to implementation. If not found, the pipeline stops and tells the developer that the RCA agent must be run first — no code is written without a confirmed root cause analysis.

---

### Stage 1 — Spec & Plan

**What it does:** Reads the Jira ticket, Figma design, and Confluence page, then writes a structured specification document. In the same pass it scans the existing codebase and git history to produce a complete implementation plan — so the developer approves both the spec and the code plan at Human Gate 1, not just the requirements.

This spec becomes the single source of truth for everything that follows. The implementation agent follows it like a contract. If the spec is wrong, the code will be wrong — which is why Human Gate 1 exists immediately after.

**What it reads:**
- Jira: ticket title, description, acceptance criteria, labels, issue type
- Figma: the linked design (if one exists) — developer can paste a screenshot if Figma is unavailable
- Confluence: any linked technical documentation
- Codebase: scans `src/features/`, `src/shared/`, existing hooks, components, and services for reuse opportunities
- Git history: reads `git log` on files expected to change, to understand recent decisions that should be preserved

**What it produces — a Confluence page (`{TICKET_ID} — <title>` in the TPSPhoenix space):**

This page is created once in Phase 1 and serves as **both the spec and the LLD** for the feature — no separate LLD is created at the end of the pipeline. The page persists in Confluence after the pipeline completes, providing a permanent record for future reference.

The page contains:
- Summary of what is being built
- Acceptance criteria formatted as a checklist
- Assumptions made where requirements had gaps
- What is explicitly out of scope
- Implementation plan, covering:
  - Exact file names and folder paths for every new file
  - Which existing files need to be modified and why
  - A table of reusable components found (with import paths) vs new ones to create
  - Translation keys that need to be added
  - Which state management approach to use (server state via TanStack Query, UI state via Zustand)
  - API endpoints to be called
  - Feature flag name
  - Whether the shared library needs to be changed
  - Test cases to cover (passed to the Test Writer later)

> For bug fixes: Figma and Confluence design pages are skipped automatically.
> For the `/shared` workflow: Figma is skipped (shared utilities rarely have Figma designs).

> If any planned change is inside `src/shared/`, the pipeline flags this — which will trigger the Submodule Compliance stage and Human Gate 3 later.

---

### ⛔ HUMAN GATE 1 — Plan Approval

The pipeline presents the spec summary, assumptions, and reusable components table to the developer, along with the Confluence page URL. The developer reviews and edits directly in Confluence.

- **`approve`** → branch is created, implementation begins
- **feedback** → AI revises the Confluence page and re-presents. Repeats until approved.

No branch is created and no code is written until the developer types `approve`.

---

### Stage 2 — Branch & Implementation

**What it does:** First creates a clean, correctly named branch from the latest version of the target branch, then writes all the code for the feature or fix in a strict order following the approved spec and all 18 coding standards.

**Step 0 — Branch creation:** For ticket PHNX-1234 about dealer bulk editing, it creates `feature/PHNX-1234-dealer-bulk-edit` from the latest `main`. For a defect it creates `bugfix/PHNX-1234-checkout-crash` from the base branch. This ensures implementation always starts from a known-good state.

**The implementation order is fixed — it never skips steps or reorders them:**

1. TypeScript interfaces and types (defined first, never inline)
2. Validation schemas (for any forms)
3. API service functions
4. Data fetching hooks (using TanStack Query)
5. Data mutation hooks (create, update, delete — with toast notifications)
6. State store (Zustand, only if shared UI state is genuinely needed)
7. Screen component and sub-components (with loading, empty, and error states)
8. Translation keys (all three language files updated at the same time: English, German, Russian)
9. Tab/route registration (if the feature adds a new screen)
10. Feature flag guard (all new UI wrapped so it can be toggled off)

After each of these steps, the code is committed. The ESLint pre-commit hook runs automatically on every commit — if it fails, lint errors are fixed before the commit is retried. Bypassing the hook (`--no-verify`) is never allowed.

---

### Stage 2b — Submodule Compliance *(only runs if shared library was changed)*

**What it does:** If Stage 2 modified anything inside `src/shared/`, those changes need to be committed inside the shared library's own git repository — not just left as uncommitted changes in the parent project. This stage handles that, then validates the shared changes meet four rules.

**The four checks:**
1. The submodule is on the correct feature branch, not on `main`
2. All commits have been successfully pushed to the remote
3. No `../../` relative import paths — all imports must use aliases like `@components/`, `@hooks/`
4. No new shared component duplicates something that already exists in a feature folder

If any check fails, the pipeline stops and lists all violations. All issues must be fixed before continuing.

---

### Parallel Block A — Impact Analysis & Code Review *(run concurrently)*

**These two phases run simultaneously** as independent subagents after implementation completes. The combined time is determined by whichever takes longer — not the sum of both. Both must complete cleanly before the pipeline moves to Phase 4b.

---

### Stage 3 — Impact Analysis & Regression Guard *(Parallel Block A — model: Haiku)*

**What it does:** Checks that the new changes haven't broken any of the 50+ existing modules. TypeScript compilation and regression tests launch simultaneously at the start of this phase — both are independent and together account for most of the phase time.

**Check 1 — Full TypeScript compile + Targeted regression tests (simultaneous)**

Both commands start at the same time:

- **TypeScript** (`tsc --noEmit`) — compiles the entire codebase. This cannot be limited to just the changed files because a type change in one place can break consumers anywhere across all 50+ modules. Any compile error is blocking.
- **Regression tests** (`vitest run --changed main`) — Vitest uses the module dependency graph to find only the tests whose dependency tree includes a changed file, then runs just those. Typically completes in 1–3 minutes instead of 60+ minutes. Any test that was previously passing but now fails is a regression and is blocking.

**Check 2 — Which existing modules are affected**
Takes every changed file in `src/shared/` and finds every existing module that imports it. Produces a map like: "you changed PxStatusBadge in shared — these 6 modules use it: Dealer, Inventory, Sales, Parts, Finance, Customer." This is informational only, not a blocker. It's passed to the Test Writer so it knows which existing areas to verify.

**Check 3 — Translation key integrity**
Checks whether any existing translation key was deleted or renamed. If yes, that's a blocker — any module still using the old key name will silently show the raw key string instead of the translated text at runtime. Adding new keys is always safe.

---

### Stage 4 — Code Review *(Parallel Block A — model: Sonnet)*

**What it does:** Reviews every changed file against the full set of coding standards — the same review a senior developer would do before approving a PR, but automated and applied consistently every time. Runs concurrently with Impact Analysis. When `submoduleFlag` is true, the review covers files changed in the submodule branch (`feature/{TICKET_ID}-shared` inside `tps-dms-ui-shared`) in addition to parent repo changes.

**Blocking violations** (fixed directly by the agent):
- TypeScript `any` type used anywhere
- `console.log`, `debugger`, `TODO`, or `FIXME` left in committed code
- `../../` relative import paths (must use path aliases)
- Feature flags not using optional chaining (`features?.flagName`)
- Zustand store not using the `createStore` factory
- TanStack Query using raw string keys instead of the key factory
- Translation files not all updated together
- Toast notifications not going through `useToastStore`
- Screens not wrapped in `TabErrorBoundary` and `Suspense`
- `PxDataGrid` or `PxDialogModal` not imported from `@ui-kit`
- Service endpoints using `import.meta.env` directly instead of `envConfig`
- Hardcoded user-visible text (must use `t('key')`)
- Dates, currencies, or numbers not formatted via `useLocalization()`
- And 5 more mandatory rules

**Warnings** (not auto-fixed — surfaced to developer):
- Missing accessibility labels (aria attributes)
- Minor style or pattern issues that don't violate hard rules

**If clean:** Pipeline moves to the Surface Warnings gate (or Phase 4b directly if no warnings).

---

### ⛔ Surface Warnings Gate *(only if warnings were found)*

The developer sees a list of non-blocking warnings and decides:

- **`proceed`** → warnings are included in the PR's "Notes for Reviewers" section; pipeline continues to Phase 4b
- **`fix`** → pipeline returns to implementation, warnings are fixed, then Code Review runs again

---

### Phase 4b — Test Writer & Performance Review *(run concurrently)*

**These two phases run simultaneously** after the Surface Warnings gate (or immediately after Parallel Block A if no warnings existed). Both must complete before the pipeline proceeds to Rebase Health.

---

### Stage 5 — Test Writer *(Phase 4b — model: Sonnet)*

**What it does:** Writes unit and integration tests for every changed file — both new files and modified files — runs them, and keeps adding tests until 80% branch coverage is reached. Runs concurrently with the Performance Review. When `submoduleFlag` is true, this phase also writes tests for files changed in the submodule branch.

Tests are written against the implementation after code review, so they reflect the clean, reviewed code rather than an intermediate draft.

**Where tests are written** depends on what Stage 2 modified:
- **Feature files** (`src/features/<feature-name>/`): tests go in `src/__tests__/features/<feature-name>/`, mirroring the feature folder structure — Vitest project: `<feature-name>`
- **Shared files** (`src/shared/`): tests go in `src/shared/__tests__/`, mirroring the shared folder structure — Vitest project: `shared-ui`

**Test scoping:** Tests run with `vitest run --changed main`, which uses Vitest's module dependency graph to discover only tests whose tree includes a changed file. This is far faster than running a full project suite and typically completes in 1–3 minutes. Coverage is then checked scoped to the affected project and changed files (`--coverage --project <feature-name> --changed main`).

**What gets tested:**
- Every data fetching hook — does it return the right data shape? Does it handle errors without crashing?
- Every data mutation hook — does a successful save trigger the right notification and refresh the right data? Does an error show the error notification?
- Every screen or shared component — does it show content when the feature flag is on? Does it hide it when off? Does it handle loading, empty, and error states?
- Every utility function — unit tests for each exported function

---

### Stage 4b — Performance Review *(Phase 4b — model: Haiku)*

**What it does:** Checks the changed files for performance problems specific to the TPS DMS tech stack — things that work but will cause slowness, wasted network calls, or memory leaks over time. Runs concurrently with the Test Writer. When `submoduleFlag` is true, the checks cover submodule branch files as well as parent repo changes.

**Complexity gate:** Before running any checks, the phase assesses the change scope. If **all** of the following are true — ≤3 files changed AND no performance-sensitive patterns found (no `useQuery`, `useInfiniteQuery`, `useSignalR`, large library imports, or store subscriptions) — the entire review is skipped automatically with the message:

```
✅ Performance review skipped — trivial change (≤3 files, no performance-sensitive patterns)
```

This avoids running 7 checks on trivial text or label changes.

**Blocking violations** (must be fixed before continuing):

| Issue | Why it matters |
|-------|---------------|
| Importing an entire library when only one function is needed (e.g. `import { debounce } from 'lodash'`) | Adds the entire 70KB library to the bundle instead of just the 2KB function needed |
| Subscribing to an entire Zustand store instead of using a selector | The component re-renders every time anything in the store changes, even unrelated fields |
| Opening a SignalR connection without closing it when the component unmounts | Connection stays open permanently, consuming memory and server resources |

**Warnings** (noted in PR, not blocking):

| Issue | Why it matters |
|-------|---------------|
| Data query missing `staleTime` | Refetches data on every component mount, causing unnecessary network calls |
| Invalidating too broad a query cache after a save | Forces every active query to refetch at once instead of just the affected data |
| Data grid with potentially 50+ rows not using virtual scrolling | Renders a massive DOM all at once instead of only the visible rows |
| Inline object/array/function passed as prop to a memoised component | Creates a new reference every render, defeating the memoisation |

---

### Stage 6 — Rebase Health

**What it does:** Syncs the feature branch with the latest main immediately before creating the PR. This is the single rebase checkpoint in the pipeline — the branch was created from latest main at the start of implementation, so an earlier sync is not needed; this final sync catches anything that merged while the pipeline was running.

The pipeline pulls all new commits from main, resolves any safe conflicts automatically, runs the affected tests to confirm everything still passes, then hands off to Release Readiness.

**Three possible outcomes:**

| Situation | What happens |
|-----------|-------------|
| No conflicts | Pipeline continues automatically |
| Conflicts only in translation files or feature flag config | Additive — both sides added new entries. The pipeline accepts both sides and continues automatically |
| Conflicts in additive logic files (interfaces, tab configs, query hooks) — both sides are agent commits | If both sides carry `Co-Authored-By: Claude Sonnet 4.6`, all additions from both branches are kept and the conflict is resolved automatically |
| Conflicts in other logic files — at least one side is a human commit | The pipeline cannot safely decide which version is correct. Pauses for Human Gate 2 |

---

### ⛔ HUMAN GATE 2 — Conflict Resolution *(only if human-involved conflicts exist)*

The pipeline lists every conflicting file, noting which side is agent-authored and which is human-authored. The developer opens VS Code's merge editor, resolves each conflict, then runs `git rebase --continue`.

- **`resolved`** → rebase re-runs to verify everything is clean
- **`abort`** → pipeline stops; the branch is preserved for manual handling

Most pipelines never reach this gate. When they do, the pipeline tells the developer exactly which commits came from the agent and which were human-written.

---

### Stage 7 — Release Readiness

**What it does:** Everything needed to ship — pushing branches, creating PRs, writing Confluence documentation, updating Jira, and cleaning up.

**Part A — Shared library PR** *(only if the shared library was changed)*

Creates PR #1 in the `tps-dms-ui-shared` repository (shared library changes → `main`). Records the PR URL. Then pauses at Human Gate 3.

---

### ⛔ HUMAN GATE 3 — Shared Library PR Merge *(only if shared library was changed)*

The developer requests review on PR #1 in `tps-dms-ui-shared` and waits for it to be merged.

The pipeline cannot proceed until this merge happens. The reason: the main application keeps a pointer to a specific commit in the shared library. If the pipeline pointed to an unmerged commit, every other developer's clone would break when they pulled. By waiting for the actual merge commit, the pointer is always to a commit everyone can access.

- **`merged`** → pipeline picks up the exact merge commit hash and continues to Part B
- **`abort`** → pipeline stops; both branches are preserved for manual handling

---

**Part B — Feature PR and all artefacts**

1. **Submodule pointer update** *(only if shared library was changed)*:
   - Checks out `main` inside the submodule: `git -C src/shared checkout main`
   - Pulls the latest main to get the merge commit: `git -C src/shared pull origin main`
   - Runs `git add src/shared` in the parent repo — this captures the exact merge commit hash as the new pointer (not the files themselves, just the commit reference)
   - Commits the pointer update and creates PR #2 in the parent repo for this change alone

2. **Creates the feature PR** with the PR template auto-filled:
   - Description pulled from the spec
   - Acceptance criteria as a checklist
   - All pipeline-verified items pre-ticked (ESLint, TypeScript, tests, code review, state management, error handling)
   - Items requiring manual verification left unticked (screenshots, browser testing, keyboard nav, screen readers)
   - Notes for Reviewers: Confluence spec/LLD link (created in Phase 1), any performance warnings, and (if applicable) the order the 3 PRs must be merged

3. **For beta track — dual PRs**: an additional PR targeting `main` is created automatically alongside the release branch PR. This ensures the fix is automatically backported to `main` without any manual steps.

4. **Updates Jira**: adds the PR link and Confluence spec/LLD link as comments. Does not change the ticket status — the developer moves the ticket to "In Review" manually after completing UI testing.

5. **Cleans up**: deletes the local pipeline state file. No spec file to delete — it lives in Confluence.

6. **Final message to developer** with all links and a manual checklist for the items the pipeline cannot verify: screenshots, Chrome/Safari testing, keyboard navigation, aria attributes.

---

## What the Developer Does vs What the Pipeline Does

| Step | Who does it |
|------|------------|
| Ensure RCA agent has been run for bug tickets (before `/dev`) | Developer |
| Type `/dev PHNX-1234 [release/X.Y.Z]` | Developer |
| Detect ticket type and track from Jira | Pipeline |
| MCP health check | Pipeline |
| Read Jira, Figma, Confluence | Pipeline |
| Scan codebase and git history | Pipeline |
| Write the spec and implementation plan | Pipeline |
| Review and approve the spec + plan | **Developer (Gate 1)** |
| Create the branch | Pipeline |
| Write all the code | Pipeline |
| Commit code following standards | Pipeline |
| Send desktop notification at phase start/completion/gate | Pipeline |
| Sync with latest main | Pipeline |
| Resolve merge conflicts (if any) | **Developer (Gate 2)** |
| Run impact analysis and regression guard (parallel with code review) | Pipeline |
| Review code against all standards (parallel with impact analysis) | Pipeline |
| Decide on non-blocking warnings | **Developer (Surface Warnings)** |
| Write unit tests to 80% coverage (parallel with performance review) | Pipeline |
| Check performance patterns (parallel with test writing) | Pipeline |
| Final sync before PR | Pipeline |
| Create PR(s) — dual PRs automatically for beta track | Pipeline |
| Create shared library PR (#1 in tps-dms-ui-shared) | Pipeline |
| Merge shared library PR into main (if applicable) | **Developer (Gate 3)** |
| Checkout main + pull inside submodule to get merge commit hash | Pipeline |
| Stage submodule pointer (`git add src/shared`) with exact merge hash | Pipeline |
| Create pointer update PR (#2 in parent repo) | Pipeline |
| Add PR + spec/LLD links as Jira comments | Pipeline |
| Move Jira ticket to "In Review" (after UI testing) | **Developer** |
| Add screenshots to the PR | Developer |
| Test on Chrome and Safari | Developer |
| Approve and merge the PR | Developer / Reviewer |

---

## What Happens if Something Goes Wrong Mid-Pipeline

Every pipeline saves a state file at `.claude/output/pipeline-state/PHNX-XXXX-state.yml`. This file records every completed stage, the branch name, MCP server availability, and any intermediate results.

If VS Code is closed, the network drops, or the session times out — the developer simply runs the same command again. The pipeline reads the state file and resumes from the last completed stage. No work is lost and no stages are repeated.

The state file is automatically deleted when the pipeline completes successfully.

---

## Manual Developer Responsibilities (Outside the Pipeline)

The pipeline automates from ticket to PR. The following steps happen after the PR is created and are the developer's responsibility.

---

### Release Branch Creation

Creating a release branch (e.g. `release/0.3.14`) is done manually by the release manager or tech lead. The pipeline does not create release branches — it only targets ones that already exist.

```bash
git checkout main
git pull origin main
git checkout -b release/0.3.14
git push -u origin release/0.3.14
```

---

### PR Review and Merge

The pipeline creates and pre-fills the PR. A human reviewer must still:
- Review the code for business logic correctness
- Check screenshots of the UI change
- Test on Chrome and Safari
- Verify keyboard navigation
- Check accessibility (aria attributes, screen reader behaviour)

The pipeline pre-ticks everything it mechanically verified. The reviewer only needs to cover what requires human judgement.

---

### Production Deployment Approval

After a PR merges to `main`, Azure Static Web Apps deploys to the Staging environment automatically. Promotion from Staging to Production requires a manual approval in the Azure portal — this is outside the pipeline scope.

---

### Jira Ticket Closure

The pipeline adds the PR link to the Jira ticket at the end of Stage 7. Moving the ticket to "In Review" after the PR is created, and to "Done" after the PR is merged, is the developer's or project manager's responsibility.

---

## Built-in Safeguards Summary

| Safeguard | When it runs | What it prevents |
|-----------|-------------|-----------------|
| MCP Health Check | Before anything starts | Pipeline failing mid-way due to unavailable external services |
| Auto-detection | Before anything starts | Mismatched workflow — pipeline infers the correct type from Jira data |
| Dual PR targets for beta | Before PR creation | Beta fixes regressing in future pilot releases — backport to main is automatic |
| RCA Check | Before implementation (bug tickets) | Implementing a fix without a confirmed RCA document — pipeline stops if `{TICKET_ID}-RCA` is not found under TALON Rev - RCA Documents |
| Human Gate 1 | After planning (feature tickets) | Building the wrong thing — no code written without approval |
| Submodule Compliance | After implementation (if shared library changed) | Broken imports, component duplication, unpushed shared changes |
| Parallel TypeScript compile + regression tests | Impact Analysis (simultaneously) | Type changes silently breaking other modules; regressions in existing tests |
| Translation key check | Impact Analysis | Deleted/renamed keys causing silent broken text at runtime |
| Parallel execution (Blocks A and B) | After implementation; after warnings gate | Time wasted waiting for sequential checks that are fully independent |
| Complexity gate (Performance Review) | Before running performance checks | Wasting time running 7 checks on trivial label/text-only changes |
| Human Gate 2 | After syncing with main | Merge conflicts in logic files resolved by a human, not guessed |
| Code Review | After impact analysis | All 18 mandatory standards and architecture patterns enforced |
| Surface Warnings Gate | After code review | Non-blocking issues reviewed by developer before tests are written |
| Performance Review | After test writing | Bundle bloat, re-render inefficiencies, connection leaks |
| Rebase Health | Before PR creation | Branch out of date with main when PR is opened |
| Dependency Gate (Phase 7) | Before PR creation | PR created before prerequisite stories have merged — causes ordering issues |
| Human Gate 3 | Before final PR (if shared library changed) | Parent app pointing to an unmerged shared library commit |

---

## Key Benefits

| Benefit | What it means in practice |
|---------|--------------------------|
| **Consistency** | Every developer follows the exact same process — no variation in how features are structured, named, or reviewed |
| **Speed** | Spec writing, architecture planning, test writing, and PR creation are all automated. Independent phases run concurrently — typical end-to-end time is 15–25 minutes |
| **Quality** | Code never reaches a PR without passing TypeScript compile, regression tests, a full code review, and a performance review |
| **Safety net** | The impact analysis and regression guard catch problems across all 50+ modules before they reach main |
| **Resumable** | A VS Code restart or network failure at any point does not lose progress — the pipeline picks up where it left off |
| **Audit trail** | Every ticket automatically produces a Confluence spec/LLD page (Phase 1), a linked GitHub PR, and a Jira comment update |
| **Scoped test runs** | Tests run with `vitest --changed main` — Vitest's module graph scopes execution to only affected files. Coverage checks are further scoped to the relevant project. Typical time: 1–3 minutes instead of 60+ |
| **Automatic backport** | Beta track features and fixes automatically create a dual PR — one to the release branch and one to `main` — so no manual back-merge is ever needed |
| **Desktop notifications** | Push notifications are sent at the start and end of every phase and every human gate — the developer can work on other tasks and be paged when input is needed |
