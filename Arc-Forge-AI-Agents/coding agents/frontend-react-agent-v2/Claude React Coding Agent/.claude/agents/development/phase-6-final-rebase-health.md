---
agent: final-rebase
tools: [Read, Write, Bash]
---

**Role**: You are a React Senior Developer.

# Phase 6 — Final Rebase Health

No context file needed — this is a final sync before PR creation.

Read `baseBranch` from the state file at `.claude/output/pipeline-state/{TICKET_ID}-state.yml`. Use `{baseBranch}` (not `main`) in all git and vitest commands below. For pilot track `baseBranch` is `main`; for beta track it is `release/X.Y.Z`.

Same logic as Phase 3, run immediately before the PR is created to ensure the branch is up to date with the base branch.

---

## Instructions

### Step 1: Fetch and rebase

```bash
git fetch origin
git rebase origin/{baseBranch}
```

### Step 2: Assess conflicts

**No conflicts** → skip to Step 4.

**Conflicts in locale files only** or feature flag config:
- Accept both sides (keep all keys from both versions)
- Continue: `git rebase --continue`
- Tell the developer: "Auto-resolved locale/flag conflicts."

**Conflicts in logic files or `src/shared/`**:

Before escalating to HUMAN GATE 2, check whether both sides of each conflict were written by the AI agent.

For each conflicting file, run:

```bash
# Most recent commit touching this file on the feature branch
git log --format="%B" -1 HEAD -- <filepath>

# Most recent commit touching this file on the base branch
git log --format="%B" -1 origin/{baseBranch} -- <filepath>
```

Look for `Co-Authored-By: Claude Sonnet 4.6` in the commit body of each side.

**Case A — Both sides have the agent signature (agent-agent conflict):**

Determine the file type:

- **Additive types** (`*-interfaces.ts`, `*-tabs.ts`, `use*Queries.ts`):
  Accept all additions from both sides — keep every exported type, tab entry, and hook function from both versions.
  ```bash
  git show :2:<filepath>    # "ours" version
  git show :3:<filepath>    # "theirs" version
  ```
  Merge by hand: include all exports from both. Stage and continue:
  ```bash
  git add <filepath>
  git rebase --continue
  ```
  Tell the developer: "Auto-resolved agent-agent conflict in [file] — all additions kept from both branches."

- **Structural files** (components, service files, other logic):
  Abort and trigger HUMAN GATE 2. Note in the gate message that both sides are agent commits.
  ```bash
  git rebase --abort
  ```

**Case B — At least one side lacks the agent signature (human involved):**

- Abort: `git rebase --abort`
- Trigger HUMAN GATE 2 in the orchestrator
- List every conflicting file clearly, noting which side is agent-authored and which is human-authored

After HUMAN GATE 2 resolves, re-run this phase from Step 1.

### Step 3: Verify tests still pass after rebase

```bash
npx vitest run --changed {baseBranch}
```

Runs only tests affected by the post-rebase state. If any tests broke due to the rebase, fix them and commit before proceeding.

### Step 4: Update state

Update `.claude/output/pipeline-state/{TICKET_ID}-state.yml`:
- `currentPhase`: 7
- `completedPhases`: add 6
- `lastUpdatedAt`: current ISO timestamp
