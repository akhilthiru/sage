# Development Pipeline Orchestrator

**Project config**: Read `.claude/context/project-config.md` at startup. Use the values defined there for: Jira base URL, Confluence space key, RCA parent page ID, submodule repo name, fix version track keywords, default base branch, and all file paths.

You are the pipeline orchestrator for **all development work** — new features, bug fixes, pilot track, and beta track.

**Usage**: `/dev PHNX-1234 [release/X.Y.Z]`

- Providing a release branch signals beta track. Omitting it signals pilot track (confirmed against the Jira fix version).
- Track, workflow type, branch prefix, and commit prefix are all auto-detected from the Jira ticket.

**Arguments**: $ARGUMENTS

---

## Task Workflows

### Feature workflow (Story / Task / Epic)

| # | Task | Type | Agent File |
|---|------|------|-----------|
| 0 | Initialize — detect ticket type, track, create state file | Auto | — |
| 1 | MCP Health Check | Auto | `.claude/skills/mcp-health-check/skill.md` |
| 2 | Spec & Plan — fetch Jira/Figma/Confluence, scan codebase, publish spec | Auto | `.claude/agents/development/phase-1-spec-and-plan.md` |
| 3 | **HUMAN GATE 1** — spec + plan approval | **Pause** | — |
| 4 | Branch & Implementation | Auto | `.claude/agents/development/phase-2-implementation.md` |
| 4b | Submodule Compliance *(only if submoduleFlag: true)* | Conditional | `.claude/agents/development/phase-2b-submodule-compliance.md` |
| 5 | Impact Analysis & Regression Guard | Auto | `.claude/agents/development/phase-3-impact-analysis.md` |
| 6 | Code Review | Auto | `.claude/agents/development/phase-4-code-review.md` |
| 7 | Performance Review | Auto | `.claude/agents/development/phase-4b-performance-review.md` |
| 8 | **Surface Warnings** — proceed or fix decision (if triggered) | **Pause** | — |
| 9 | Test Writer | Auto | `.claude/agents/development/phase-5-test-writer.md` |
| 10 | Rebase Health | Auto | `.claude/agents/development/phase-6-final-rebase-health.md` |
| 11 | **HUMAN GATE 2** — conflict resolution (if triggered) | **Pause** | — |
| 12 | Release Readiness | Auto | `.claude/agents/development/phase-7-release-readiness.md` |

### Bug/Defect workflow (Bug issue type)

| # | Task | Type | Agent File |
|---|------|------|-----------|
| 0 | Initialize — detect ticket type, track, create state file | Auto | — |
| 1 | RCA Check — fetch RCA page from Confluence | Auto | — |
| 2 | Branch & Implementation (RCA-guided) | Auto | `.claude/agents/development/phase-2-implementation.md` |
| 2b | Submodule Compliance *(only if submoduleFlag: true)* | Conditional | `.claude/agents/development/phase-2b-submodule-compliance.md` |
| 3 | Impact Analysis & Regression Guard | Auto | `.claude/agents/development/phase-3-impact-analysis.md` |
| 4 | Code Review | Auto | `.claude/agents/development/phase-4-code-review.md` |
| 5 | Performance Review | Auto | `.claude/agents/development/phase-4b-performance-review.md` |
| 6 | **Surface Warnings** — proceed or fix decision (if triggered) | **Pause** | — |
| 7 | Test Writer | Auto | `.claude/agents/development/phase-5-test-writer.md` |
| 8 | Rebase Health | Auto | `.claude/agents/development/phase-6-final-rebase-health.md` |
| 9 | **HUMAN GATE 2** — conflict resolution (if triggered) | **Pause** | — |
| 10 | Release Readiness | Auto | `.claude/agents/development/phase-7-release-readiness.md` |

---

## Fallback Transparency Rule

**This rule applies to every phase and every agent in this pipeline.**

Whenever any automatic action cannot complete — a tool call fails, a CLI command returns an error, an MCP server is unreachable, authentication is required, or a permission is denied — you **MUST**:
1. Display the failure reason clearly
2. Show the manual step the developer needs to take
3. **Proceed immediately** — do NOT wait for the developer to reply or confirm

**Exception — Figma unavailable with a Figma URL in the ticket:** This is NOT a proceed-immediately case. When Phase 1 finds a Figma URL in the Jira ticket but Figma MCP is unavailable, the pipeline MUST stop and wait for the developer to provide a screenshot or pasted design before continuing. Do not apply the "proceed immediately" rule to this scenario.

Format to use every time:
```
⚠️ [Action] could not complete automatically
Reason: [exact error — e.g. "GitKraken MCP requires sign-in", "gh CLI: authentication failed", "Bash tool returned exit code 1"]
Action needed: [what the developer must do — e.g. "Run the commands above in your terminal", "Create the PR manually at <URL>"]
Continuing...
```

**Never stop the pipeline to wait for a response.** Show the reason, show what needs to be done, and continue.

---

## Phase Timing Rule

**This rule applies to every phase, every gate, and every agent in this pipeline — no exceptions.**

**Phases** — at the start of each phase, immediately after telling the developer "Starting Phase X":
- Set `phaseTiming.phaseX.startedAt` to the current ISO timestamp

At the completion of each phase, when updating `currentPhase` and `completedPhases`:
- Set `phaseTiming.phaseX.completedAt` to the current ISO timestamp
- Set `phaseTiming.phaseX.durationMinutes` to the elapsed time in whole minutes

Phase keys: `phase1`, `phase2`, `phase2b`, `phase3`, `phase4`, `phase4b`, `phase5`, `phase6`, `phase7`
— Always record `phase2b` even if `submoduleFlag: false` (it will remain 0 and be omitted from the display).

**Human Gates** — every time the pipeline pauses for a human gate, including submodule approval:
- Immediately before displaying the gate prompt: set `gateTiming.gateX.startedAt` and `gateTiming.gateX.triggered: true`
- Immediately after the developer responds and the pipeline resumes: set `gateTiming.gateX.completedAt` and calculate `gateTiming.gateX.durationMinutes`

Gate keys: `gate1` (Spec Approval), `gateWarnings` (Surface Warnings — if triggered), `gate2` (Conflict Resolution — if triggered), `gate3` (Submodule PR Merge — if triggered)

---

## Step 0 — Initialization

### Parse arguments

Set `TICKET_ID` = first word of `$ARGUMENTS`. If missing, stop:
> "Please provide a Jira ticket ID — e.g. `/dev PHNX-1234` or `/dev PHNX-1234 release/0.3.14`."

Set `ARG_RELEASE_BRANCH` = second word of `$ARGUMENTS` (may be empty).

---

### MCP prerequisite check

**Run this before any other step.**

Read `.claude/skills/mcp-health-check/skill.md` and follow every instruction exactly.

- **Atlassian unavailable** → the skill stops the pipeline with full setup instructions. No state file is created. No further action is taken. Do NOT offer any manual alternative or ask the developer to provide Jira details by hand.
- **Figma unavailable** → the skill notes it and returns. Continue below.
- **All connected** → continue below.

---

### Resume check

Check if `.claude/output/pipeline-state/$TICKET_ID-state.yml` exists:
- **EXISTS** → Read it. Tell the developer: "Resuming pipeline for $TICKET_ID from Phase {currentPhase}." Skip all completed phases and jump to the current phase.
- **MISSING** → Continue to detection below.

---

### Jira detection

Fetch Jira ticket `$TICKET_ID` using Atlassian MCP. Extract:

| Field | What to read |
|-------|-------------|
| `issueType` | Story / Task / Bug / Sub-task / Epic |
| `fixVersions` | Array of version name strings (may be empty) |
| `labels` | Array of label strings |
| `priority` | Highest / High / Medium / Low |
| `summary` | Ticket title |

---

### Determine issue category

| Condition | Category |
|-----------|----------|
| `issueType` is `Bug` | **defect** |
| `issueType` is Sub-task and parent is a Bug | **defect** |
| Anything else (Story, Task, Epic, Feature) | **feature** |

---

### Determine track and base branch

Apply in order — first match wins:

| Condition | Track | `baseBranch` |
|-----------|-------|--------------|
| `ARG_RELEASE_BRANCH` provided | beta | `$ARG_RELEASE_BRANCH` |
| Any `fixVersions` name contains `Beta` (case-insensitive) | beta | derived from fix version |
| Otherwise | pilot | `main` |

**Deriving release branch from fix version name:** Extract the semver pattern `\d+\.\d+\.\d+` from the fix version name string, then prepend `release/`.

Examples:
- `"0.3.14 Beta"` → `release/0.3.14`
- `"Beta 0.3.14 Release"` → `release/0.3.14`

If no semver is found in the fix version name, stop:
> "Cannot derive release branch from fix version `{fixVersionName}`. Re-run with the release branch as a second argument: `/dev $TICKET_ID release/X.Y.Z`."

---

### Set workflow type, branch prefix, and commit prefix

| Track | Category | `workflowType` | Branch prefix | Commit prefix |
|-------|----------|----------------|---------------|---------------|
| pilot | feature | `feature` | `feature/` | `feat($TICKET_ID):` |
| pilot | defect | `bugfix` | `bugfix/` | `fix($TICKET_ID):` |
| beta | feature | `beta-feature` | `feature/` | `feat($TICKET_ID):` |
| beta | defect | `beta-bugfix` | `bugfix/` | `fix($TICKET_ID):` |

---

### Report detection to developer

```
Detected: {issueCategory} — {track} track → targeting {baseBranch}
Ticket:   {TICKET_ID} — {summary}
Workflow: {workflowType}
```

---

### Create the state file

Ensure `.claude/output/` and `.claude/output/pipeline-state/` directories exist. Create them if not.

**Set `prTargets` based on track:**
- **Pilot track**: `prTargets: [main]` — one PR to main
- **Beta track**: `prTargets: [release/X.Y.Z, main]` — dual PRs; Release Readiness creates PR #1 to the release branch and PR #2 to main

Write `.claude/output/pipeline-state/$TICKET_ID-state.yml`:

```yaml
ticketId: "$TICKET_ID"
workflowType: "{workflowType}"
currentPhase: 1
completedPhases: []
specPageId: ""
specPageUrl: ""
rcaPageId: ""
rcaPageUrl: ""
branch: ""
baseBranch: "{baseBranch}"
releaseBranch: "{ARG_RELEASE_BRANCH or derived release branch or ''}"
prTargets:
  - "{baseBranch}"
  # pilot track: only baseBranch (main)
  # beta track:  baseBranch (release/X.Y.Z) AND main — Release Readiness creates dual PRs
submoduleFlag: false
submoduleBranch: ""
submodulePrUrl: ""
submoduleMerged: false
conflictsResolved: false
jiraIssueType: "{issueType}"
jiraFixVersion: "{fixVersions[0] or ''}"
affectedModules: []
performanceWarnings: []
mcpStatus:
  atlassian: "connected"
  figma: ""
phaseTiming:
  phase1:  {startedAt: "", completedAt: "", durationMinutes: 0}
  phase2:  {startedAt: "", completedAt: "", durationMinutes: 0}
  phase2b: {startedAt: "", completedAt: "", durationMinutes: 0}
  phase3:  {startedAt: "", completedAt: "", durationMinutes: 0}
  phase4:  {startedAt: "", completedAt: "", durationMinutes: 0}
  phase4b: {startedAt: "", completedAt: "", durationMinutes: 0}
  phase5:  {startedAt: "", completedAt: "", durationMinutes: 0}
  phase6:  {startedAt: "", completedAt: "", durationMinutes: 0}
  phase7:  {startedAt: "", completedAt: "", durationMinutes: 0}
gateTiming:
  gate1:        {triggered: false, startedAt: "", completedAt: "", durationMinutes: 0}
  gateWarnings: {triggered: false, startedAt: "", completedAt: "", durationMinutes: 0}
  gate2:        {triggered: false, startedAt: "", completedAt: "", durationMinutes: 0}
  gate3:        {triggered: false, startedAt: "", completedAt: "", durationMinutes: 0}
startedAt: "<ISO timestamp>"
lastUpdatedAt: "<ISO timestamp>"
```

Update `lastUpdatedAt`, `currentPhase`, and the relevant `phaseTiming` or `gateTiming` entry after every phase or gate completes.

---

## Feature Workflow — Steps 1 through 12

### Step 1 — MCP Health Check

Read `.claude/skills/mcp-health-check/skill.md` and follow every instruction in it.

**Workflow note:** Probe Atlassian and Figma. Update `mcpStatus` in the state file.

---

### Step 2 — Spec & Plan

Read `.claude/agents/development/phase-1-spec-and-plan.md` and follow every instruction exactly.

Pass as active context:
- `baseBranch` and `prTargets` from state file
- `workflowType` from state file

---

### ✋ HUMAN GATE 1 — Spec + Plan Approval

Send a `PushNotification`: `{TICKET_ID} — ✋ Spec & plan ready — approve or give feedback`

```
✋ HUMAN GATE 1 — Spec & Plan Ready

Confluence: <specPageUrl from state file>
Track: {track} → targeting {baseBranch}
Ticket: {TICKET_ID} — {summary}

[paste Summary section from the spec]

Assumptions made:
[paste Assumptions Made section]

Reusable components identified:
[paste Reusable Components Found table]

Open the Confluence page to review. Edit it directly there for any structural changes.
Type feedback here for anything that needs revision.

Reply with:
  approve          → proceed to implementation
  <your feedback>  → I will revise and re-present
```

Wait for developer response. Do not proceed to implementation until the developer types `approve`.

---

### Steps 4–12 — Shared phases

See **Running Each Phase** section below.

---

## Bug/Defect Workflow — Steps 1 through 10

### Step 1 — RCA Check

Fire both MCP calls simultaneously — they are independent:
- **Call A**: `searchConfluenceUsingCql` — `title = "{TICKET_ID}-RCA" AND parent = <RCA parent page ID from project-config.md>`
- **Call B**: `getJiraIssue({TICKET_ID})` — to read `fields.comment.comments[]`

Wait for both before proceeding.

**If RCA page found (Call A):**
- Fetch the full page content using `getConfluencePage` (using the page ID from Call A)
- Record in state file: `rcaPageId`, `rcaPageUrl`
- Extract commenter name, date, and body from every entry in `fields.comment.comments[]` (from Call B). Comments frequently contain reproduction details, environment context, decisions made during triage, and constraints that refine or override the original description. Hold this content in context alongside the RCA document.
- Tell the developer:
  > "RCA document found: {rcaPageUrl}. Jira comments loaded. Proceeding directly to implementation."
- **Proceed immediately to Branch & Implementation. Do NOT ask for confirmation, do NOT add notes or warnings about the ticket content, do NOT pause for any reason.**
- The RCA document is the primary implementation context; Jira comments are supplementary — use both when making implementation decisions.

**If not found:**

```
🚫 No RCA Document Found

No RCA document was found for {TICKET_ID} under the <RCA parent page name from project-config.md>:
<Jira base URL from project-config.md>/wiki/spaces/<Confluence space key>/pages/<RCA parent page ID from project-config.md>

An RCA document is required before implementation can begin for defect tickets.
This ensures the fix targets the confirmed root cause rather than a symptom.

💡 Did the RCA agent run with a Confluence connectivity error?
   Check whether a local fallback file was saved in the outputs folder:
     rca-{ticket-id-lowercase}.md  (e.g. rca-{TICKET_ID_LOWER}.md)

   If the file exists:
     1. Open it and copy the content
     2. In Confluence, go to: <RCA parent page name from project-config.md>
        <Jira base URL from project-config.md>/wiki/spaces/<Confluence space key>/pages/<RCA parent page ID from project-config.md>
     3. Create a child page titled exactly "{TICKET_ID}-RCA" and paste the content
     4. Re-run: /dev {TICKET_ID}

   If no local file exists — ask the team to run the RCA agent for {TICKET_ID} first.

Pipeline stopped. No branch has been created and no code has been written.
```

Delete the state file. Stop the pipeline.

Send a `PushNotification`: `{TICKET_ID} — Pipeline stopped: RCA document not found`

---

### Steps 2–10 — Shared phases

See **Running Each Phase** section below.

---

## Desktop Notifications

Send a `PushNotification` at the start and completion of every phase (Auto tasks and Human Gates), and on pipeline end. Format:

- **Phase start**: `{TICKET_ID} — Phase {N} starting: {phase name}`
- **Phase complete**: `{TICKET_ID} — Phase {N} done: {phase name}`
- **Human Gate**: `{TICKET_ID} — ✋ {gate name} — waiting for your input`
- **Pipeline complete**: `{TICKET_ID} — Pipeline complete. PRs ready for review.`
- **Pipeline stopped/aborted**: `{TICKET_ID} — Pipeline stopped: {reason in <10 words}`

Keep each message under 120 characters. No markdown.

---

## Running Each Phase (Both Workflows)

### Standard phase execution (sequential)

For every sequential Auto task:

1. Send a `PushNotification`: `{TICKET_ID} — Phase {N} starting: {phase name}`
2. Tell the developer: "Starting Phase X — <phase name>." Immediately set `phaseTiming.phaseX.startedAt` to the current ISO timestamp in the state file.
3. Read the agent file listed in the task table.
4. Pass the following as active context — these override agent defaults where they conflict:

   | Context key | Value |
   |-------------|-------|
   | `workflowType` | from state file |
   | `baseBranch` | from state file — branch creation base, rebase target, PR target |
   | `releaseBranch` | from state file |
   | `prTargets` | from state file |
   | Branch prefix | `feature/` for features · `bugfix/` for defects |
   | Commit prefix | `feat($TICKET_ID):` for features · `fix($TICKET_ID):` for defects |
   | PR title prefix | same as commit prefix |

5. **For `workflowType: bugfix` or `beta-bugfix` in Phase 2 (Implementation):** The agent reads `rcaPageId` from the state file and fetches the RCA page from Confluence as its primary implementation context (instead of `specPageId`).
6. Follow every instruction in the agent file exactly.
7. When complete, update the state file: `currentPhase`, `completedPhases`, `lastUpdatedAt`. Also set `phaseTiming.phaseX.completedAt` to the current ISO timestamp and `phaseTiming.phaseX.durationMinutes` to the elapsed time in whole minutes.
8. Send a `PushNotification`: `{TICKET_ID} — Phase {N} done: {phase name}`
9. Move to the next task.

---

### Phase 2b — Submodule Compliance (conditional, after Phase 2)

**Run only if `submoduleFlag: true` in the state file after Phase 2 completes.** If `submoduleFlag: false`, skip directly to Parallel Block A.

```
Send PushNotification: "{TICKET_ID} — Phase 2b: Submodule Compliance starting"
Tell the developer: "Starting Phase 2b — Submodule Compliance."
```

Read `.claude/agents/development/phase-2b-submodule-compliance.md` and follow every instruction exactly.

- **All checks pass** → send `PushNotification`: `{TICKET_ID} — Phase 2b: Submodule Compliance done`, continue to Parallel Block A.
- **Any check fails** → stop the pipeline. The developer must resolve the reported violations, then re-run Phase 2b. Do not advance to Phase 3 until all checks pass.

---

### Parallel block A — Impact Analysis + Code Review (after Phase 2)

After Phase 2 (Implementation) commits, run Phases 3 and 4 as concurrent subagents — they are both read-only and fully independent:

```
Send PushNotification: "{TICKET_ID} — Phases 3 + 4 starting in parallel"

Set phaseTiming.phase3.startedAt and phaseTiming.phase4.startedAt to the current ISO timestamp.

Spawn TWO agents simultaneously (run_in_background: false on each, sent in a single message):

  Agent A — model: haiku
    Task: Run phase-3-impact-analysis.md for {TICKET_ID}
    Context: TICKET_ID, state file path, all active context keys above

  Agent B — model: sonnet
    Task: Run phase-4-code-review.md for {TICKET_ID}
    Context: TICKET_ID, state file path, all active context keys above

Wait for both to return before continuing.
```

After both agents return, set `phaseTiming.phase3.completedAt`, `phaseTiming.phase3.durationMinutes`, `phaseTiming.phase4.completedAt`, and `phaseTiming.phase4.durationMinutes`.

**Merging results:**
- If Agent A (3) found **TypeScript errors or regressions** → blocking: fix implementation, re-run Parallel Block A
- If Agent B (4) found **mandatory standard failures** → fix in code, re-run Parallel Block A
- If Agent B (4) found **warnings only** → note for Surface Warnings gate after Phase 4b
- If Agent A (3) produced `affectedModules` → write to state file for Phase 5 to use
- If both clean → proceed to Phase 4b

Send `PushNotification`: `{TICKET_ID} — Impact analysis + code review done`


---

### Phase 4b — Performance Review (after Block A)

Run Phase 4b as a single agent after Parallel Block A completes:

```
Send PushNotification: "{TICKET_ID} — Phase 4b: Performance Review starting"

Spawn agent — model: haiku
  Task: Run phase-4b-performance-review.md for {TICKET_ID}
  Context: TICKET_ID, state file path
```

**Results:**
- Violations found → fix code, re-run Phase 4b
- Warnings found → write to `performanceWarnings` in state file for Phase 7, continue
- Skipped (complexity gate) or clean → continue

Send `PushNotification`: `{TICKET_ID} — Performance review done`

**Surface Warnings gate** — trigger if Phase 4 found warnings OR Phase 4b found warnings.

---

### Phase 5 — Test Writer (after Surface Warnings gate)

```
Send PushNotification: "{TICKET_ID} — Phase 5: Test Writer starting"

Spawn agent — model: sonnet
  Task: Run phase-5-test-writer.md for {TICKET_ID}
  Context: TICKET_ID, state file path, affectedModules from state file
```

- Test failures → fix tests, re-run Phase 5
- Clean → proceed to Phase 6 (Rebase Health)

Send `PushNotification`: `{TICKET_ID} — Tests done`

---

## HUMAN GATE 2 — Conflict Resolution

Triggered by Rebase Health when logic or submodule conflicts are detected.

Send a `PushNotification`: `{TICKET_ID} — ✋ Conflict resolution needed — waiting for your input`

```
✋ HUMAN GATE 2 — Manual Conflict Resolution Required

Conflicts in:
  [list each conflicting file]

Resolve these in your editor's merge tool, then run:
  git rebase --continue

⚠️  abort will delete the branch and state file automatically.
    Confluence spec page must be deleted manually (MCP does not support deletion).

Reply with:
  resolved   → pipeline continues
  abort      → pipeline ends immediately (branch preserved, no further actions taken)
```

- `resolved` → return to Rebase Health and continue
- `abort` → STOP IMMEDIATELY. Do not write any more code or files. Run cleanup in this order:

  ⚠️ **Cleanup scope — strict rules:**
  - Delete ONLY the single state file listed below. Do NOT delete the `.claude/output/` directory or any other files in it.
  - Do NOT run `git clean`, `git reset --hard`, `rm -rf` on a directory, or any command that affects files belonging to other tickets.

  **1. Delete the state file (single file only):**
  ```bash
  rm .claude/output/pipeline-state/$TICKET_ID-state.yml
  ```

  **2. Delete the branch (local + remote):**
  ```bash
  git checkout main && git branch -D [branch name from state file]
  ```
  ```bash
  git push origin --delete [branch name from state file]
  ```
  If `git push origin --delete` fails (branch was never pushed), skip it.

  **3. Confluence spec page:** The Atlassian MCP does not support page deletion. Display:
  ```
  ⚠️ Confluence spec page cannot be deleted automatically (MCP does not support deletion).
  Please delete it manually: [specPageUrl]
  (Skip for bug tickets — no spec page was created.)
  ```

  **4. Display cleanup summary and end:**
  ```
  🧹 Abort cleanup complete

  ✅ State file deleted
  ✅ Branch deleted: [branch name]
  ⚠️  Confluence spec page: delete manually at [specPageUrl] (or N/A for bug tickets)

  Pipeline aborted. No further actions will be taken.
  ```

---

## HUMAN GATE 3 — Submodule PR Merge

Triggered by Release Readiness (Part A) when `submoduleFlag: true`.

Send a `PushNotification`: `{TICKET_ID} — ✋ Submodule PR ready — merge it then reply here`

```
✋ HUMAN GATE 3 — Submodule PR Ready

PR #1 (<submodule repo name from project-config.md>): <PR URL>

This PR must be merged into main in <submodule repo name from project-config.md> before the pipeline
can commit the submodule pointer update in the parent repo.

Steps:
  1. Request review for PR #1 in <submodule repo name from project-config.md>
  2. After it is merged, reply here

⚠️  abort will delete both branches and the state file automatically.
    Confluence spec page must be deleted manually (MCP does not support deletion).

Reply with:
  merged   → pipeline continues with pointer update
  abort    → pipeline ends immediately (both branches preserved, no further actions taken)
```

- `merged` → update state: `submoduleMerged: true`, continue Release Readiness Part B
- `abort` → STOP IMMEDIATELY. Do not write any more code or files. Run cleanup in this order:

  ⚠️ **Cleanup scope — strict rules:**
  - Delete ONLY the single state file listed below. Do NOT delete the `.claude/output/` directory or any other files in it.
  - Do NOT run `git clean`, `git reset --hard`, `rm -rf` on a directory, or any command that affects files belonging to other tickets.

  **1. Delete the state file (single file only):**
  ```bash
  rm .claude/output/pipeline-state/$TICKET_ID-state.yml
  ```

  **2. Delete both branches (local + remote):**
  ```bash
  git checkout main && git branch -D [feature branch from state file]
  ```
  ```bash
  git push origin --delete [feature branch from state file]
  ```
  ```bash
  git -C src/shared checkout main && git -C src/shared branch -D [submodule branch from state file]
  ```
  ```bash
  git -C src/shared push origin --delete [submodule branch from state file]
  ```
  If any `push origin --delete` fails (branch was never pushed), skip it.

  **3. Confluence spec page:** Display:
  ```
  ⚠️ Confluence spec page cannot be deleted automatically (MCP does not support deletion).
  Please delete it manually: [specPageUrl]
  (Skip for bug tickets — no spec page was created.)
  ```

  **4. Display cleanup summary and end:**
  ```
  🧹 Abort cleanup complete

  ✅ State file deleted
  ✅ Branches deleted: [feature branch], [submodule branch]
  ⚠️  Confluence spec page: delete manually at [specPageUrl] (or N/A for bug tickets)

  Pipeline aborted. No further actions will be taken.
  ```

---

## Surface Warnings

Triggered by Code Review when non-blocking issues are found.

Send a `PushNotification`: `{TICKET_ID} — ⚠️ Code review warnings found — proceed or fix?`

```
⚠️ Code review complete — warnings found:

[list each warning with file reference]

Reply with:
  proceed   → create PR with warnings noted in the description
  fix       → return to implementation to address these first
```

- `proceed` → continue to Test Writer
- `fix` → re-run Implementation, then Code Review again before returning here
