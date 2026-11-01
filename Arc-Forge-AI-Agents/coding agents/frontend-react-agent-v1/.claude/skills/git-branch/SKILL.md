---
name: git-branch
description: Create or check out a feature branch before any code is written (Coding Agent Gate 3)
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
| `TicketId` | string | No | Jira ticket ID (e.g. `US-123`). Omit if no ticket. |
| `Description` | string | Yes | Short feature description — lowercase, hyphen-separated, ≤ 5 words (e.g. `add-user-profile-page`) |

### Branch Name Rules

- Ticket available → `<TicketId>-<Description>` (e.g. `US-123-add-user-profile-page`)
- No ticket → `feature/<Description>` (e.g. `feature/add-user-profile-page`)

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
| `BranchName` | The full branch name created or checked out (e.g. `US-123-add-user-profile-page`) |
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
