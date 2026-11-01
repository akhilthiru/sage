---
mode: 'agent'
tools: ['file', 'terminal', 'changes', 'bash', 'filesystem']
description: 'Phase 6 — Final rebase health check. Syncs with the target branch and verifies tests still pass before PR creation.'
---

**Role**: You are a React Senior Developer.

# Phase 6 — Final Rebase Health

**Ticket ID**: ${input:ticketId:Jira ticket ID — e.g. PHNX-1234}

Read `.github/output/pipeline-state/${input:ticketId}-state.yml` to get `baseBranch` before starting.

---

## Instructions

### Step 1: Fetch and rebase

```bash
git fetch origin
git rebase origin/{baseBranch}
```

### Step 2: Assess conflicts

**No conflicts** → skip to Step 3.

**Conflicts in locale files only** (`src/locales/`) or feature flag config files:
- Accept both sides — keep all keys from both versions
- Continue: `git rebase --continue`
- Tell the developer: "Auto-resolved locale/flag conflicts."

**Conflicts in logic files or `src/shared/`:**

For each conflicting file, check both sides of the conflict:

```bash
git log --format="%B" -1 HEAD -- <filepath>
git log --format="%B" -1 origin/{baseBranch} -- <filepath>
```

Look for `Co-Authored-By: GitHub Copilot` in the commit body of each side.

**Case A — Both sides are agent-authored (Copilot commits on both sides):**

Determine the file type:
- **Additive types** (`*-interfaces.ts`, `*-tabs.ts`, `use*Queries.ts`):
  Accept all additions from both sides — keep every exported type, tab entry, and hook function from both versions.
  ```bash
  git show :2:<filepath>   # "ours" version
  git show :3:<filepath>   # "theirs" version
  ```
  Merge manually: include all exports from both. Stage and continue:
  ```bash
  git add <filepath>
  git rebase --continue
  ```
  Tell the developer: "Auto-resolved agent-agent conflict in [file] — all additions kept from both branches."

- **Structural files** (components, service files, other logic):
  Abort and trigger HUMAN GATE 2:
  ```bash
  git rebase --abort
  ```

**Case B — At least one side is human-authored:**
```bash
git rebase --abort
```
Trigger HUMAN GATE 2. List every conflicting file, noting which side is agent-authored and which is human-authored.

After HUMAN GATE 2 resolves, re-run this phase from Step 1.

### Step 3: Verify tests still pass after rebase

```bash
npx vitest run --changed {baseBranch}
```

Runs only tests affected by the post-rebase state. If any tests broke due to the rebase, fix them and commit before proceeding.

### Step 4: Update state

Update `.github/output/pipeline-state/${input:ticketId}-state.yml`:
- `currentPhase`: `7`
- `completedPhases`: add `6`
- `lastUpdatedAt`: current ISO timestamp
