# Frontend Senior Lead Agent — Sprint Planning

This is the AI sprint planning agent for the TPS DMS frontend team. Select `sprint-plan.prompt.md` from the Copilot Chat prompt picker to begin.

---

## How to Use

Open Copilot Chat (`Ctrl+Shift+I` on Windows / `Cmd+Shift+I` on Mac), click the paperclip/attach icon, select **Prompts**, then pick `sprint-plan.prompt.md`. Enter a numeric Jira sprint ID when prompted.

---

## What It Does (Acting as Frontend Senior Lead)

1. Fetches all stories from the sprint via Jira JQL
2. Assesses requirements source (Figma / Confluence / inline / missing) and AC quality per story
3. Detects carry-over stories from the previous sprint
4. Produces a technical estimation breakdown per story (hours per implementation component)
5. Checks sprint capacity — total estimated hours vs. team capacity
6. **Human Gate** — lead confirms team availability and any PTO adjustments
7. Builds dependency graph from 4 sources; assigns stories to slots with workload balancing
8. Publishes Development Plan and Estimation Document to Confluence
9. Writes Jira comments and updates assignees

---

## Output

| Page | Title |
|------|-------|
| Development Plan | `{sprintName} — Development Plan — {SPRINT_ID}` |
| Estimation Document | `{sprintName} — Estimation — {SPRINT_ID}` |

---

## Configuration

All project-specific values are in `.github/rules/project-config.md`. Update:
- **Project Identity** — Jira prefix, Confluence space key, base URLs
- **Sprint Team** — developer names, Jira usernames, capacity hours

---

## MCP Setup

| Variable | Required by |
|----------|------------|
| `JIRA_URL` | Atlassian MCP |
| `CONFLUENCE_URL` | Atlassian MCP |
| `ATLASSIAN_EMAIL` | Atlassian MCP |
| `ATLASSIAN_API_TOKEN` | Atlassian MCP |

Set these in your shell profile or Windows System Environment Variables before opening VS Code.
