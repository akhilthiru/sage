---
agent: test-writer
model: sonnet
tools: [Read, Glob, Write, Bash]
---

**Role**: You are a React Senior Developer.

# Phase 5 — Test Writer

**Context to load**: `.claude/context/project-config.md` and `.claude/context/unit-testing-standards.md`

Read both files before writing any tests. `project-config.md` provides the feature test root, shared test root, Vitest project names, and coverage threshold. `unit-testing-standards.md` contains all testing patterns, mock conventions, and what to cover for each file type.

---

## Instructions

### Step 1: Identify all changed source files

Read `baseBranch` from the state file at `.claude/output/pipeline-state/{TICKET_ID}-state.yml`. Use `{baseBranch}` (not `main`) as the merge base in all git and vitest commands below.

Get the full list of source files changed compared to base:

```bash
git diff {baseBranch} --name-only -- 'src/**/*.ts' 'src/**/*.tsx'
```

If `submoduleFlag: true` in the state file, also include submodule changes (submodule always targets `main`):
```bash
git -C src/shared diff main...feature/{TICKET_ID}-shared --name-only -- '*.ts' '*.tsx'
```

Submodule files are physically present at `src/shared/` — read and test them from there. Include both lists when building the file inventory below.

Exclude test files from this list (files under `__tests__/`). For each changed source file, categorise it as one of:

| Category | Condition | Action in Step 2 |
|----------|-----------|-----------------|
| **New file, no test exists** | File was created in Phase 2, no corresponding test file found | Create a new test file |
| **Modified file, test exists** | File was modified in Phase 2, existing test file found | Update the existing test file |
| **Modified file, no test exists** | File was modified in Phase 2, no corresponding test file found | Create a new test file |

To find the corresponding test file for a source file at `src/features/<feature>/<path>/<file>.ts`, look for:
- `src/__tests__/features/<feature>/<path>/<file>.test.ts`
- `src/__tests__/features/<feature>/<path>/<file>.test.tsx`

For shared files at `src/shared/<path>/<file>.ts`, look for:
- `src/shared/__tests__/<path>/<file>.test.ts`

Also read the spec's `## Implementation Plan → Test Cases to Cover` section for any additional test scenarios specified during planning.

---

### Step 2: Write or update tests for every changed file

For every file identified in Step 1, write or update its test file. No changed source file should be left without test coverage after this phase.

**Where to write tests:**

- Feature files (`src/features/<feature-name>/`) → `src/__tests__/features/<feature-name>/` mirroring the feature folder structure — Vitest project: `<feature-name>`
- Shared files (`src/shared/`) → `src/shared/__tests__/` mirroring the `src/shared/` structure — Vitest project: `shared-ui`

**What to cover per file type** (follow `.github/rules/unit-testing-standards.md` for full patterns):

| File type | Minimum test cases |
|-----------|-------------------|
| Query hook | Success state, error state, loading state |
| Mutation hook | onSuccess (toast + invalidateQueries), onError (toast) |
| Screen / component | Feature flag ON/OFF, loading state, empty state, error state, key user interactions |
| Interface file | No runtime tests needed — TypeScript compilation in Phase 3 is sufficient |
| Service / API file | Mock fetch — success response, error response, correct endpoint called |
| Utility function | All branches covered — happy path, edge cases, error cases |
| Tab definition file | Correct tabs registered, correct order |

**For modified files with existing tests:**
- Read the existing test file first
- Add test cases for any new behaviour introduced by the modification (new parameters, new branches, new return values)
- Do not remove or weaken existing test cases
- If the modification changed a function signature, update the existing test setup to match — but keep coverage complete

---

### Step 3: Run tests scoped to changed files

Use `--changed` to run only the tests whose dependency tree includes a changed file — far faster than running the full project:

```bash
npx vitest run --changed {baseBranch}
```

If tests fail, fix them before proceeding. Do not move to Step 4 with failing tests.

---

### Step 4: Check coverage for all changed files

Run coverage scoped to the affected project and filtered to changed files only:

```bash
# For feature changes
npx vitest run --coverage --project <feature-name> --changed {baseBranch}

# For shared changes
npx vitest run --coverage --project shared-ui --changed {baseBranch}
```

Review the coverage report for **every changed source file** — both new and modified. If any changed file falls below 80% branch coverage, add more tests and re-run until it passes.

The 80% threshold applies equally to new files and modified files. A modified file that already had tests is not exempt — the modification may have introduced new branches that need covering.

---

### Step 5: Commit

```bash
git add .
git commit -m "test({TICKET_ID}): add and update unit tests for <feature name>"
```

The pre-commit ESLint hook runs automatically — fix any lint errors before retrying.

---

### Step 6: Update state

Update `.claude/output/pipeline-state/{TICKET_ID}-state.yml`:
- `currentPhase`: 6
- `completedPhases`: add 5
- `lastUpdatedAt`: current ISO timestamp
