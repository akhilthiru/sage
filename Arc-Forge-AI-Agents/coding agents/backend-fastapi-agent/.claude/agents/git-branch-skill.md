---
agent: git-branch-skill
attached_to: coding-agent
---

# Git Branch Skill

Creates or checks out a feature branch before any code is written. Called by the Coding Agent as Gate 3 of its PRE-CONDITIONS.

---

## Trigger Point

The Coding Agent MUST invoke this skill during Gate 3, before any file operation, passing the data below from the approved plan context.

---

## Input

| Parameter | Type | Required | Description |
|---|---|---|---|
| `TicketId` | string | No | Jira ticket ID (e.g. `PROJ-123`). Omit if no ticket. |
| `Description` | string | Yes | Short feature description — lowercase, hyphen-separated, ≤ 5 words (e.g. `add-order-endpoint`) |

### Branch Name Rules

- Ticket available → `<TicketId>-<Description>` (e.g. `PROJ-123-add-order-endpoint`)
- No ticket → `feature/<Description>` (e.g. `feature/add-order-endpoint`)

---

## How to Invoke

```bash
# Derive the branch name from input, then run:

# If branch does not exist:
git checkout -b <BranchName>

# If branch already exists:
git checkout <BranchName>
```

Check whether the branch exists first:

```bash
git show-ref --verify --quiet refs/heads/<BranchName> \
  && git checkout <BranchName> \
  || git checkout -b <BranchName>
```

---

## Output

| Field | Description |
|---|---|
| `BranchName` | The full branch name created or checked out (e.g. `PROJ-123-add-order-endpoint`) |
| `Status` | `Created` \| `CheckedOut` \| `Failed` |
| `Error` | Populated only on `Failed` — the raw git error message |

Report output back to the Coding Agent in the conversation so it can confirm Gate 3 is cleared.

---

## Error Handling

- If git returns a non-zero exit code → set `Status: Failed`, report `Error`, and **do not proceed**. The Coding Agent must STOP and notify the Orchestrator.
- Do not retry silently. Surface the error immediately.

---

## Required Tools

| Tool | Purpose |
|---|---|
| Bash | Run `git checkout` / `git show-ref` commands |
