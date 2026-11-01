---
agent: notify-skill
attached_to: all-agents
---

# Notify Skill

Sends a cross-platform system-level desktop toast **and** a phone push notification summarising an agent's outcome. Each agent invokes this skill at the end of its Behavior steps.

---

## Trigger Points

| Event | Status to pass |
|---|---|
| Startup Agent completes or is blocked | `Completed` or `Blocked` |
| Jira Reader Agent fetches epic and stories | `Completed` or `Blocked` |
| Confluence Reader Agent reads HLD and FRD | `Completed` or `Blocked` |
| Story Reader Agent reads all user stories + Figma | `Completed` or `Blocked` |
| Service Identifier Agent produces service list | `Completed` |
| Spec Reader Agent reads repo specs | `Completed` |
| LLD Generator Agent produces LLD (awaiting approval) | `Completed` |
| Confluence Publisher Agent publishes or fails | `Completed` or `Failed` |
| Orchestrator: pipeline paused at human checkpoint | `Completed` |
| Orchestrator: full pipeline complete | `Completed` |
| Orchestrator: unresolvable blocker | `Blocked` |
| Any agent errors out or cannot proceed | `Failed` |

---

## Input

| Parameter | Type | Description |
|---|---|---|
| `AgentName` | string | Canonical name of the invoking agent (see list below) |
| `Status` | enum | `Completed` \| `Blocked` \| `Failed` |
| `Summary` | string | 1–2 sentence plain-English summary — no markdown, no bullet points |

### Canonical Agent Names
- `Technical Lead Agent`
- `Startup Agent`
- `Jira Reader Agent`
- `Confluence Reader Agent`
- `Story Reader Agent`
- `Service Identifier Agent`
- `Spec Reader Agent`
- `LLD Generator Agent`
- `Confluence Publisher Agent`

---

## How to Invoke

### Step 1 — System Toast (cross-platform)

Run the notify script via Bash from the **project root**:

```bash
bash .claude/scripts/notify.sh "<AgentName>" "<Status>" "<Summary>"
```

The script detects the OS automatically and sends the appropriate toast:

| OS | Mechanism | Requirement |
|---|---|---|
| **Windows** | PowerShell `NotifyIcon` balloon tip | None — built-in |
| **macOS** | `osascript` notification centre | None — built-in |
| **Linux** | `notify-send` | `libnotify-bin` (`apt install libnotify-bin`) |

If the script exits non-zero, log the error but **do not block** — proceed to Step 2.

### Step 2 — Phone Push

After the system toast (regardless of its outcome), call `PushNotification`:

```
message: "<AgentName> — <Status>: <Summary>"
status: "proactive"
```

Keep the combined message under 200 characters. If the call fails, log and continue.

---

## Summary Authoring Rules

1. **One or two sentences maximum.**
2. **Past tense** — state what was done, not what will happen.
3. **For `Completed`:** state the key output (e.g., "LLD ready for review. 6 files planned across 3 layers.").
4. **For `Blocked`:** state the blocker and what is needed (e.g., "Confluence unreachable. Falling back to local context.").
5. **For `Failed`:** state what failed and the error in plain terms (e.g., "Type error in order_service.py line 42.").
6. **No markdown, no bullet points, no quotes** — plain text only.

### Examples

```
Knowledge Agent — Completed: Jira ticket fetched, 3 Confluence pages loaded, 2 gaps noted.
Planning Agent — Completed: LLD ready for review. 6 files planned across 3 layers.
Coding Agent — Completed: 4 files created, 2 modified. Branch US-123-add-user-profile.
Code Review Agent — Blocked: 2 critical findings in order_service.py. Rework required.
Unittest Agent — Completed: 24 tests passing, 91% coverage. PR opened.
```

---

## Error Handling

- Script exits non-zero → log the error, proceed to Step 2
- `PushNotification` fails → log the error, continue the workflow
- Neither failure blocks the workflow — notifications are informational only

---

## Required Tools

| Tool | Purpose |
|---|---|
| Bash | Run `.claude/scripts/notify.sh` for system-level desktop toast |
| `PushNotification` | Send terminal + phone push notification |
