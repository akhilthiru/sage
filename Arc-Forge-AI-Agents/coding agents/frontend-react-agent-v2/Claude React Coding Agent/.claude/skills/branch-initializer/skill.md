# Skill: Branch Initializer

**Project config**: Read `.claude/context/project-config.md` before executing. Use the **Git & Branching** section for branch prefixes and the **File Paths** section for the state file directory.

Creates a correctly-named feature or bugfix branch from the latest base branch for a given ticket.

Can be invoked standalone via `/branch-initializer PHNX-1234`, or called by Phase 2 (Branch Initializer) of the pipeline.

---

## Instructions

### Step 1: Determine base branch and prefix

Check if a pipeline state file exists at `.claude/output/pipeline-state/{TICKET_ID}-state.yml`:
- **EXISTS** → read `baseBranch` and `workflowType` from it
  - `workflowType: "bugfix"` or `workflowType: "hotfix"` → prefix `bugfix/`
  - all others → prefix `feature/`
  - use `baseBranch` as the checkout target (e.g. `main` or a release branch)
- **MISSING** (standalone use) → default to base branch `main`, prefix `feature/`

---

### Step 2: Get latest base branch

⚠️ Use the exact `baseBranch` value from the state file — do NOT substitute `main` or any other value. If `baseBranch` is `release/0.3.14` or `claude-ai-setup`, check out that branch.

```bash
git checkout <baseBranch>
git pull origin <baseBranch>
```

---

### Step 3: Derive branch name

Use the Jira ticket summary already in context (fetched during Step 0 of the pipeline) to form a short description. Kebab-case it, strip stop words, and limit to 2–4 words. If no summary is available, use the ticket ID only.

Create a kebab-case branch name (2–4 words max, no stop words):

```
<prefix>{TICKET_ID}-<short-description>
```

Examples:
- `feature/PHNX-1234-dealer-bulk-edit`
- `bugfix/PHNX-1234-null-pointer-on-save`

---

### Step 4: Create the branch

```bash
git checkout -b <branch-name>
```

If the branch already exists locally, check it out and report this to the developer. Do not force-create over an existing branch.

---

### Step 5: Confirm to developer

```
Branch <branch-name> created from latest <baseBranch>.

If running standalone: you are now on the new branch — start your changes.
If running inside the pipeline: implementation starts next.
```
