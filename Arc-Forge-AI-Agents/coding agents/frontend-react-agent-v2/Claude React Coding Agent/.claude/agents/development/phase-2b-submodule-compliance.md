---
agent: submodule-compliance
tools: [Read, Glob, Grep, Write, Bash]
---

**Role**: You are a React Senior Developer.

# Phase 2b — Submodule Compliance

**Project config**: Read `.claude/context/project-config.md` before executing. Use the **Submodule** section for the submodule path, repo name, and branch pattern.

**Only run this phase if `submoduleFlag: true` in the state file. Skip entirely if `submoduleFlag: false`.**

This phase branches, commits, and pushes the changes made to `src/shared/` during Phase 2, then validates compliance before the pipeline continues. Phase 2 (Implementation) wrote files to `src/shared/` but did not commit them inside the submodule — that is this phase's job.

---

## Instructions

### Step 1: Verify submodule has uncommitted changes

```bash
git -C src/shared status
```

Expect modified or new files — these are the changes from Phase 2. If the working tree is clean, something went wrong in Phase 2. Stop and inform the developer before continuing.

### Step 2: Create a feature branch inside the submodule

```bash
git -C src/shared checkout main
git -C src/shared pull origin main
git -C src/shared checkout -b feature/{TICKET_ID}-shared
```

### Step 3: Commit the changes inside the submodule

```bash
git -C src/shared add .
git -C src/shared commit -m "feat({TICKET_ID}): <describe what was added/changed in shared>"
```

Use a message that describes the actual shared changes, not a generic placeholder.

### Step 4: Push the submodule branch

```bash
git -C src/shared push -u origin feature/{TICKET_ID}-shared
```

⚠️ This push must succeed. If it fails, stop and report the error to the developer — Phase 7 cannot create the submodule PR without a pushed branch.

### Step 5: Run compliance checks

Run all checks before reporting. Do NOT stop at the first failure — collect all issues, then report together.

**Check 1 — Submodule is on the feature branch, not main**
```bash
git -C src/shared branch --show-current
```
Must return `feature/{TICKET_ID}-shared`. If it returns `main`, the branching in Step 2 failed — stop immediately.

**Check 2 — No unpushed commits remain**
```bash
git -C src/shared log origin/feature/{TICKET_ID}-shared..HEAD --oneline
```
Must return empty. If not, the push in Step 4 failed — stop immediately.

**Check 3 — No relative cross-boundary imports**

Scan all files changed in this branch for `../../` imports:
```bash
git -C src/shared diff main --name-only | xargs grep -l "from '\.\." 2>/dev/null
```
Any result is a violation. All imports crossing boundaries must use path aliases (`@components/*`, `@hooks/*`, `@stores/*`, `@utils/*`, `@api/*`, etc.).

**Check 4 — No component duplication**

If new components were added to `src/shared/components/`, verify the same component does not already exist in any `src/features/*/screens/*/components/` directory. Shared components must not be duplicated in feature-private folders.

### Step 6: Report and gate

**If any checks failed**: List every failing check with the file or version involved. Stop the pipeline. The developer must resolve all violations before the pipeline proceeds. Do not advance `currentPhase`.

**If all checks passed**: Proceed to Step 7.

### Step 7: Update state

Update `.claude/output/pipeline-state/{TICKET_ID}-state.yml`:
- `currentPhase`: 3  # Impact Analysis is next
- `completedPhases`: add `"2b"`
- `submoduleBranch`: `"feature/{TICKET_ID}-shared"`
- `lastUpdatedAt`: current ISO timestamp

Tell the developer:
```
Submodule compliance passed.
Branch feature/{TICKET_ID}-shared pushed to <submodule repo name from project-config.md>.
Continuing to Rebase Health.
```
