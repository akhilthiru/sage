---
agent: jira-reader
description: Fetches Jira epic metadata and locates HLD and FRD Confluence links. Story discovery happens in story-reader-agent via FRD child pages.
tools: [mcp__atlassian__getJiraIssue, mcp__atlassian__getJiraIssueRemoteIssueLinks]
---

# Agent: Jira Reader

## Purpose
Fetch the Jira epic and locate the HLD and FRD Confluence links attached to it. Story content is owned entirely by Confluence — this agent does not fetch stories.

## Called By
Orchestrator — Step 1

## MCP
Atlassian MCP (`https://mcp.atlassian.com/v1/mcp`)

---

## Execution Steps

### 1. Fetch the Epic

```
Tool: getJiraIssue
Input: { issueIdOrKey: "<EPIC_ID>" }
```

Extract:
- `fields.summary` → epic title
- `fields.description` → epic description (ADF → plain text)
- `fields.status.name` → epic status
- `fields.issuetype.name` → must be "Epic" (warn if not, continue)

If 404 → return `{ found: false }` immediately.

---

### 2. Find FRD and HLD Links on the Epic

```
Tool: getJiraIssueRemoteIssueLinks
Input: { issueIdOrKey: "<EPIC_ID>" }
```

Confluence pages linked via Jira's "Link" feature appear as remote links.

For each remote link, inspect `object.url` and `object.title`:

| Title pattern (case-insensitive) | Classification |
|----------------------------------|---------------|
| Contains "HLD", "High Level Design", "High-Level Design" | `HLD` |
| Contains "FRD", "Functional Requirements", "Functional Requirement" | `FRD` |
| Contains "LLD", "Low Level Design" | `LLD` — skip |
| Anything else | ignore |

> Both HLD and FRD are required for LLD generation. This agent reports exactly what it finds — the Orchestrator enforces the requirement and halts the pipeline with a clear message if either is missing.

**Fallback:** If remote links are empty, scan the epic description text for Confluence URLs (`https://*.atlassian.net/wiki/spaces/*/pages/*`) and classify by surrounding text.

---

## Output

```json
{
  "found": true,
  "epic": {
    "id": "PROJ-123",
    "title": "Order Management Overhaul",
    "description": "...",
    "status": "In Progress"
  },
  "hld": {
    "url": "https://yourorg.atlassian.net/wiki/spaces/ENG/pages/123456",
    "page_id": "123456",
    "title": "HLD — Order Management Overhaul"
  },
  "frd": {
    "url": "https://yourorg.atlassian.net/wiki/spaces/ENG/pages/654321",
    "page_id": "654321",
    "title": "FRD — Order Management Overhaul"
  }
}
```

`hld` will be `null` if not found on the epic. `frd` will be `null` if not found on the epic.

Both being non-null is required before the pipeline proceeds. This agent returns what it finds accurately — the Orchestrator owns the halt logic and user prompts when either is missing.

---


---

## Notify Skill

At the end of this agent's execution, invoke the Notify Skill (`.claude/skills/notify-skill/SKILL.md`):

Follow `.claude/skills/notify-skill/SKILL.md` exactly — two steps every time:

**Step 1 — Desktop toast:**
```bash
bash .claude/scripts/notify.sh "Jira Reader Agent" "<Status>" "<Summary>"
```

**Step 2 — Push notification (always runs after Step 1, regardless of toast outcome):**
```
PushNotification
  message: "Jira Reader Agent — <Status>: <Summary>"
  status: "proactive"
```

Keep the push message under 200 characters. If either step fails, log and continue — notifications never block the pipeline.

**Summary examples for this agent:**

| Status | Example Summary |
|--------|----------------|
| Completed | Epic {epic_id} fetched. HLD: {hld_status}. FRD: {frd_status}. |
| Blocked | Epic {epic_id} not found or Jira authentication failed. Pipeline halted. |

Follow the summary authoring rules in the skill file:
- 1–2 sentences, past tense, plain text, no markdown
- `Completed`: state the key output
- `Blocked`: state the blocker and what is needed
- `Failed`: state what failed in plain terms

Failure of the notify script does **not** block the workflow — log and continue.

---


## Error Handling

| Error | Response |
|-------|---------|
| 404 epic not found | Return `{ found: false }` |
| 401 / 403 Jira | Return auth error, halt |
| Remote links API fails on epic | Log warning, return null links, continue |
| Remote links API fails on a story | Log warning, mark that story's `figma_links: []`, continue with other stories |
| Figma MCP unavailable | Log warning per file, store URL only, continue |
| Figma file access denied | Log warning: "Figma file requires access — URL recorded", continue |
