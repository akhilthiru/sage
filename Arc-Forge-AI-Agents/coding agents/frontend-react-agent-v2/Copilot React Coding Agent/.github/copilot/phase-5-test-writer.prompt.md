---
mode: 'agent'
tools: ['codebase', 'file', 'terminal', 'changes', 'bash', 'filesystem']
description: 'Phase 5 — Write unit tests for all changed files and verify 80% branch coverage.'
---

**Role**: You are a React Senior Developer.

# Phase 5 — Test Writer

Load `#file:.github/rules/project-config.md` and `#file:.github/rules/unit-testing-standards.md` before writing any tests. `project-config.md` provides the feature test root, shared test root, Vitest project names, and coverage threshold. `unit-testing-standards.md` contains all testing patterns, mock conventions, and what to cover for each file type.

**Ticket ID**: ${input:ticketId:Jira ticket ID — e.g. PHNX-1234}

---

## Instructions

### Step 1: Identify all changed source files

```bash
git diff {baseBranch} --name-only -- "src/**/*.ts" "src/**/*.tsx"
```

Read the state file at `.github/output/pipeline-state/${input:ticketId}-state.yml`. If `submoduleFlag: true`, also include:

```bash
git -C src/shared diff {baseBranch}...feature/${input:ticketId}-shared --name-only -- "*.ts" "*.tsx"
```

Exclude test files (files under `__tests__/`). For each changed source file, categorise:

| Category | Condition | Action |
|----------|-----------|--------|
| New file, no test exists | Created in Phase 2, no test file found | Create a new test file |
| Modified file, test exists | Modified in Phase 2, test file exists | Update the existing test file |
| Modified file, no test exists | Modified in Phase 2, no test file found | Create a new test file |

**Test file locations:**
- Feature files at `src/features/<feature>/<path>/<file>.ts` → `src/__tests__/features/<feature>/<path>/<file>.test.ts`
- Shared files at `src/shared/<path>/<file>.ts` → `src/shared/__tests__/<path>/<file>.test.ts`

Also read `specPageId` from the state file and fetch the spec from Confluence using `getConfluencePage(specPageId)` — the `## Implementation Plan → Test Cases to Cover` section lists additional test scenarios specified during planning.

### Step 2: Write or update tests for every changed file

**Minimum test cases per file type** (follow `rules/unit-testing-standards.md` for full patterns):

| File type | Minimum test cases |
|-----------|-------------------|
| Query hook | Success state, error state, loading state |
| Mutation hook | onSuccess (toast + invalidateQueries), onError (toast) |
| Screen / component | Feature flag ON/OFF, loading state, empty state, error state, key user interactions |
| Interface file | No runtime tests needed — TypeScript compilation in Phase 3 is sufficient |
| Service / API file | Mock fetch — success response, error response, correct endpoint called |
| Utility function | All branches — happy path, edge cases, error cases |
| Tab definition file | Correct tabs registered, correct order |

For **modified files with existing tests:**
- Read the existing test file first
- Add test cases only for new behaviour introduced by the modification
- Do not remove or weaken existing test cases
- Update test setup if a function signature changed

**Where to write tests:**
- Feature files → Vitest project: `<feature-name>`
- Shared files → Vitest project: `shared-ui`

### Step 3: Run tests scoped to changed files

```bash
npx vitest run --changed {baseBranch}
```

If tests fail, fix them before proceeding to Step 4. Do not move forward with failing tests.

### Step 4: Check coverage for all changed files

```bash
# For feature changes
npx vitest run --coverage --project <feature-name> --changed {baseBranch}

# For shared changes
npx vitest run --coverage --project shared-ui --changed {baseBranch}
```

Review the coverage report for **every changed source file**. If any changed file falls below **80% branch coverage**, add more tests and re-run until it passes.

The 80% threshold applies equally to new files and modified files. A modified file that already had tests is not exempt — the modification may have introduced new branches that need covering.

### Step 5: Commit

```bash
git add .
git commit -m "test(${input:ticketId}): add and update unit tests for <feature name>"
```

The pre-commit ESLint hook runs automatically — fix any lint errors before retrying. Never use `--no-verify`.

### Step 6: Update state

Update `.github/output/pipeline-state/${input:ticketId}-state.yml`:
- `currentPhase`: `"6"`
- `completedPhases`: add `5`
- `lastUpdatedAt`: current ISO timestamp
