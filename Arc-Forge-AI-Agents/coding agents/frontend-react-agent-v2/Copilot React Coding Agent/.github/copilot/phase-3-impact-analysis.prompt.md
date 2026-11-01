---
mode: 'agent'
tools: ['codebase', 'file', 'terminal', 'changes', 'bash', 'filesystem']
description: 'Phase 3 — Impact analysis and regression guard. Runs tsc, vitest, and locale key checks against the branch diff.'
---

**Role**: You are a React Senior Developer.

# Phase 3 — Impact Analysis & Regression Guard

Load `#file:.github/rules/project-config.md` before executing. Use the **File Paths** section for the primary locale file path and the features/shared folder paths used in diff and grep commands.

**Ticket ID**: ${input:ticketId:Jira ticket ID — e.g. PHNX-1234}

Read the state file at `.github/output/pipeline-state/${input:ticketId}-state.yml` to get the branch name before starting.

---

## How to report

Collect results from all checks before reporting.

**Violations** (blocking — must fix before proceeding):
- TypeScript compilation errors
- Test failures in existing test files (regressions)
- Locale key removals or renames

**Informational** (non-blocking — forwarded to Test Writer):
- List of existing feature modules that consume changed files

---

## Instructions

### Check 1 — TypeScript compilation

Run TypeScript across the full codebase — type changes propagate globally so this cannot be scoped:

```bash
npx tsc --noEmit
```

Any error is a blocking violation. Report file, line, and error message for each.

### Check 2 — Targeted regression tests

Run only the tests whose dependency tree includes a changed file:

```bash
npx vitest run --changed {baseBranch}
```

Any test failure is a regression in an existing module — block and route back to Phase 2 to fix the implementation, not the test.

### Check 3 — Reverse dependency scan

Get the list of changed source files:

```bash
git diff {baseBranch} --name-only -- "src/**/*.ts" "src/**/*.tsx"
```

For each changed file in `src/shared/`, find which existing feature modules import it:

```bash
# Repeat for each changed shared file — adjust alias pattern to match the file's location
grep -rl "from '@components/ChangedComponent'" src/features/
grep -rl "from '@hooks/changedHook'" src/features/
grep -rl "from '@stores/changedStore'" src/features/
```

Produce a table:
```
Changed file                              Consumed by (existing modules)
src/shared/components/SomeWrapper.tsx     features/dealer, features/inventory
src/shared/hooks/useSomeHook.ts           features/sales, features/reports
```

This is **informational only** — it does not block the pipeline. Store in state as `affectedModules` for Phase 5 (Test Writer) to prioritise regression coverage.

If no shared files were changed, skip Check 3.

### Check 4 — Locale key integrity

```bash
git diff {baseBranch} -- '<primary locale file from project-config.md>'
```

Scan the diff for removed or renamed keys (lines beginning with `-` that are not replaced by a corresponding `+` line with the same key name).

**Flag as violation if any existing key was deleted or renamed.** Adding new keys is always safe.

---

### Step 2: Report

**If violations found:**

```
🚫 Impact analysis — pipeline paused

[TypeScript errors:]
  <file>:<line> — <error message>

[Regression failures:]
  <test file> — <test name> — <failure reason>
  ↳ Fix the implementation in Phase 2, not the test.

[Locale key violations:]
  Removed key: <key name>

Fix the implementation and re-run phase-3-impact-analysis.
```

**If clean (or only informational findings):**

```
✅ Impact analysis complete

TypeScript: no errors
Locale keys: no removals
Regression tests: all passing

[If shared files changed:]
Affected existing modules:
  <table from Check 3>
These modules are forwarded to the Test Writer for prioritised regression coverage.

Proceeding to Code Review.
```

---

### Step 3: Update state

Update `.github/output/pipeline-state/${input:ticketId}-state.yml`:
- `completedPhases`: add `"3"`
- `affectedModules`: array of feature folder names from Check 3 (empty array if no shared changes)
- `lastUpdatedAt`: current ISO timestamp
