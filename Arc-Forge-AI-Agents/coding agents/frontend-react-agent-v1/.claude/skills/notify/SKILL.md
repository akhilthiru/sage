---
name: notify
description: Send a Windows toast notification summarising an agent's outcome after every workflow transition
---

# Notify Skill

Sends a Windows toast notification summarising an agent's outcome. Called by the Dev Orchestrator after every agent transition.

---

## Trigger Points

The orchestrator MUST invoke this skill after each of the following events:

| Event | Status to pass |
|---|---|
| Knowledge Agent completes or is blocked | `Completed` or `Blocked` |
| Planning Agent produces an LLD (awaiting approval) | `Completed` |
| User approves or rejects the LLD | `Completed` or `Blocked` |
| Coding Agent finishes implementation | `Completed` |
| Code Review Agent returns findings | `Completed` or `Blocked` |
| Coding Agent fixes Critical/Major review findings | `Completed` |
| Unit Test Agent achieves green suite | `Completed` |
| Any agent errors out or cannot proceed | `Failed` |

---

## Input

| Parameter | Type | Description |
|---|---|---|
| `AgentName` | string | Display name of the agent (see canonical names below) |
| `Status` | enum | `Completed` \| `Blocked` \| `Failed` |
| `Summary` | string | 1-2 sentence plain-English summary of what the agent did or what is blocking it |

### Canonical Agent Names

- `Knowledge Agent`
- `Planning Agent`
- `Coding Agent`
- `Code Review Agent`
- `Unit Test Agent`

---

## How to Invoke

Run the PowerShell script via Bash from the react-agent project root. Always use `-ExecutionPolicy Bypass` to avoid policy errors.

```bash
powershell -ExecutionPolicy Bypass -File "./scripts/notify.ps1" \
  -AgentName "<AgentName>" \
  -Status "<Status>" \
  -Summary "<Summary>"
```

---

## Summary Authoring Rules

The orchestrator writes the `Summary` string. Follow these rules:

1. **One or two sentences maximum.** The toast is small.
2. **State what was done, not what will happen.** Use past tense.
3. **For `Completed`:** state the key output (e.g. "LLD approved. 6 components planned.").
4. **For `Blocked`:** state the blocker and what is needed (e.g. "Confluence unreachable. Falling back to local doc_store.").
5. **For `Failed`:** state what failed and the error in plain terms (e.g. "Coding Agent failed: TypeScript strict error in useUpload.ts line 12.").
6. **No markdown, no bullet points** — plain text only (the toast renders raw text).

---

## Error Handling

- If the script exits with a non-zero code, log the error to the console but **do not block** the workflow. Notifications are informational only.
- Do not retry on failure.

---

## Required Tools

| Tool | Purpose |
|---|---|
| Bash | Execute `notify.ps1` via PowerShell |
