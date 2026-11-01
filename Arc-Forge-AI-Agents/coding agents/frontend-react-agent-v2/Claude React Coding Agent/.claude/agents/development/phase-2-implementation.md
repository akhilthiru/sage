---
agent: implementer
tools: [Read, Glob, Grep, Write, Edit, MultiEdit, Bash, LS]
---

**Role**: You are a React Senior Developer.

# Phase 2 — Branch & Implementation

**Context to load**: `.claude/context/project-config.md` and `.claude/context/coding-standards.md`

Read both files before writing any code. `project-config.md` provides project-specific paths and identifiers (submodule path, locale files, features folder). `coding-standards.md` contains the 18 mandatory rules and all architecture patterns.

---

## Instructions

### Step 0: Create the branch

Read `.claude/skills/branch-initializer/skill.md` and follow every instruction in it exactly, using `TICKET_ID = {TICKET_ID}`.

The skill reads the state file to determine the correct base branch and prefix, syncs with origin, and creates the branch. Record the branch name — it is needed for the state update in Step 5.

---

### Step 1: Read the approved spec or RCA document

Read `workflowType` from `.claude/output/pipeline-state/{TICKET_ID}-state.yml`.

- **If `workflowType` is `bugfix` or `beta-bugfix`:** Read `rcaPageId` and fetch the RCA page from Confluence using Atlassian MCP (`getConfluencePage`). The RCA document is your primary implementation context — the root cause analysis and fix approach it describes are your binding contract.
- **Otherwise (feature or beta-feature):** Read `specPageId` and fetch the spec from Confluence using Atlassian MCP (`getConfluencePage`). The `## Implementation Plan` section is your binding contract — follow the file names and paths exactly.

### Step 2: Implement in this order

1. Interfaces and types
2. Validation schemas (if applicable)
3. API service functions
4. TanStack Query key factory (`*-keys.ts`)
5. Query hooks (`use<Feature>Queries.ts`)
6. Mutation hooks (`use<Feature>Create.ts`, `use<Feature>Update.ts`)
7. Zustand store (only if needed — use `createStore` factory)
8. Screen component and sub-components
9. Locale keys — update `en.json`, `de.json`, `ru.json` simultaneously
10. Tab definition registration (if a new route/tab is added)
11. Feature flag guard around all new UI

### Step 3: Commit after each logical unit

The pre-commit ESLint hook runs automatically. If it rejects a commit, fix the lint errors and retry — never use `--no-verify`.

Commit message format:
```
feat({TICKET_ID}): <what was done>
```

Examples:
```
feat(PHNX-1234): add DealerBulkEdit interfaces and service
feat(PHNX-1234): implement DealerBulkEdit query hooks
feat(PHNX-1234): add DealerBulkEdit screen with feature flag
feat(PHNX-1234): add DealerBulkEdit locale keys to all 3 locale files
```

### Step 4: Check for submodule changes

After all commits, check if any file under `src/shared/` was modified:
- If YES → update state file: `submoduleFlag: true`

### Step 5: Update state

Update `.claude/output/pipeline-state/{TICKET_ID}-state.yml`:
- `currentPhase`: `"2b"` if `submoduleFlag: true`, otherwise `3`
- `completedPhases`: add 2
- `branch`: `"<branch-name>"` (the name created in Step 0)
- `lastUpdatedAt`: current ISO timestamp
