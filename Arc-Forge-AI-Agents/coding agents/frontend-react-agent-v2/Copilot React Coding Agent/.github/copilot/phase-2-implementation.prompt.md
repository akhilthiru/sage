---
mode: 'agent'
tools: ['codebase', 'file', 'terminal', 'changes', 'atlassian', 'bash', 'filesystem']
description: 'Phase 2 — Create branch and implement code from the approved Confluence spec or RCA document.'
---

**Role**: You are a React Senior Developer.

# Phase 2 — Branch & Implementation

Load `#file:.github/rules/project-config.md` and `#file:.github/rules/coding-standards.md` before writing any code. `project-config.md` provides project-specific paths and identifiers (submodule path, locale files). `coding-standards.md` contains the 18 mandatory rules and architecture patterns.

**Ticket ID**: ${input:ticketId:Jira ticket ID — e.g. PHNX-1234}

---

## Instructions

### Step 0: Create the branch

Read `.github/output/pipeline-state/${input:ticketId}-state.yml`. Extract `baseBranch`, `workflowType`, and `jiraIssueType`.

Determine the branch prefix:
- `workflowType` is `feature` or `beta-feature` → prefix `feature/`
- `workflowType` is `bugfix` or `beta-bugfix` → prefix `bugfix/`

Derive the branch name from the ticket ID and summary (kebab-case, max 50 chars total):
`{prefix}{ticketId}-{short-description}`

Example: `feature/PHNX-1234-dealer-bulk-edit`

**Run these commands to create the branch** (click Allow when VS Code prompts).
⚠️ Use `{baseBranch}` from the state file — do NOT substitute `main` or any other value. If `baseBranch` is `claude-ai-setup`, check out `claude-ai-setup`.

```bash
git fetch origin
```

```bash
git checkout {baseBranch}
```

```bash
git pull origin {baseBranch}
```

```bash
git checkout -b {branchName}
```

If any command could not run or returned an error, display this and continue:
```
⚠️ Branch creation could not complete automatically
Reason: [exact error returned — e.g. "terminal unavailable", "git: authentication failed"]
Action needed: Run the 4 git commands above in your terminal before writing any code.
Continuing to Step 1...
```

### Step 1: Read the approved spec or RCA document from Confluence

Read `workflowType` from the state file.

- **`bugfix` or `beta-bugfix`**: Read `rcaPageId` from the state file. Fetch the RCA page using `getConfluencePage(rcaPageId)`. The root cause analysis and fix approach it describes are your binding contract.
- **`feature` or `beta-feature`**: Read `specPageId` from the state file. Fetch the spec using `getConfluencePage(specPageId)`. The `## Implementation Plan` section is your binding contract — follow the file names and paths exactly.

### Step 2: Implement in this order

Follow the spec/RCA fetched in Step 1 exactly. Implement in this order:

1. Interfaces and types (`interfaces/<feature>-interfaces.ts`)
2. Validation schemas (`schema/<feature>-schema.ts`) — if applicable
3. API service functions (`api/<feature>-service.ts`)
4. TanStack Query key factory (`api/hooks/<feature>-keys.ts`)
5. Query hooks (`api/hooks/use<Feature>Queries.ts`)
6. Mutation hooks (`api/hooks/use<Feature>Create.ts`, `use<Feature>Update.ts`)
7. Zustand store — only if the spec explicitly requires one; use `createStore` factory from `@stores/utils/createStore`
8. Screen component and sub-components (`screens/<ScreenName>/`)
9. Locale keys — update `en.json`, `de.json`, `ru.json` simultaneously
10. Tab definition registration — if a new route/tab is added
11. Feature flag guard — wrap all new UI with `features?.flagName`

### Step 3: Commit after each logical unit

The pre-commit ESLint hook runs automatically. If it rejects a commit, fix lint errors and retry — **never use `--no-verify`**.

Commit message format: `{commitPrefix} <what was done>`
Where `commitPrefix` is `feat(${input:ticketId}):` for features or `fix(${input:ticketId}):` for bugs.

After each logical unit, stage and commit:

```bash
git add <specific files — list only the files changed in this unit>
```

```bash
git commit -m "{commitPrefix} <what was done>"
```

If a command could not run or returned an error, display this and continue:
```
⚠️ Commit could not complete automatically
Reason: [exact error — e.g. "pre-commit hook: ESLint errors in src/features/...", "terminal unavailable"]
Action needed: Run the git add and commit commands above in your terminal.
Continuing...
```

### Step 4: Check for submodule changes

After all commits, check if any file under `src/shared/` was modified:

```bash
git diff {baseBranch} --name-only -- src/shared/
```

If any files are listed → update state file: `submoduleFlag: true`.
If the command could not run, ask the developer to paste the output and continue.

### Step 5: Update state

Update `.github/output/pipeline-state/${input:ticketId}-state.yml`:
- `currentPhase`: `"2b"` if `submoduleFlag: true`, otherwise `3`
- `completedPhases`: add `2`
- `branch`: `"{branchName}"`
- `lastUpdatedAt`: current ISO timestamp
