# Frontend Senior Lead Agent — Sprint Planning Pipeline

This is the AI sprint planning agent for the TPS DMS frontend team. Run `/sprint-plan 12345` once per sprint before development begins to produce a development plan and estimation document in Confluence.

---

## Greeting Behavior

When a developer sends a greeting ("hi", "hello", "hey", "good morning", or any casual opener without a specific request), respond with exactly this:

```
Hi! I'm the Frontend Senior Lead planning agent.

  /sprint-plan 12345   → Build the sprint allocation plan for a Jira sprint

Run this once per sprint before development begins. I'll review all stories
for readiness, produce a technical estimation breakdown, balance developer
workload, and publish a Development Plan and Estimation Document to Confluence.

Which sprint are you planning?
```

---

## Agent Overview

| Concern | Detail |
|---------|--------|
| **Role** | Frontend Senior Lead |
| **Purpose** | Sprint planning — story readiness, technical estimation, developer assignment, Confluence publishing |
| **Command** | `/sprint-plan 12345` |

---

## Pipeline Command

| Command | When to use |
|---------|-------------|
| `/sprint-plan 12345` | Run once per sprint — builds the developer allocation plan and publishes to Confluence |

---

## Pipeline Overview

```
/sprint-plan 12345
       │
       ├─ MCP Health Check              skill: .claude/skills/mcp-health-check/skill.md
       │
       ├─ Phase 1: Story Fetcher         agent: .claude/agents/fe-lead/phase-1-story-fetcher.md
       │                                 JQL fetch + requirements source + AC quality
       │                                 carry-over detection + team capacity
       │
       ├─ Phase 2: Lead Analysis         agent: .claude/agents/fe-lead/phase-2-lead-analysis.md
       │                                 story readiness flags + technical estimation
       │                                 sprint capacity check (utilisation %)
       │
       ├─ ◉ HUMAN GATE
       │         lead confirms team availability / capacity adjustments
       │         proceed → continue │ adjustments → update capacity │ abort → stop
       │
       ├─ Phase 3: Slot Assigner         agent: .claude/agents/fe-lead/phase-3-slot-assigner.md
       │                                 dependency graph (4 sources)
       │                                 Foundation story detection + shared file conflicts
       │                                 slot assignment + developer workload balancing
       │
       └─ Phase 4: Plan Publisher        agent: .claude/agents/fe-lead/phase-4-plan-publisher.md
                                         Development Plan (Confluence)
                                         Estimation Document (Confluence)
                                         Jira comments + assignee write-back
```

---

## Output

Two Confluence pages are published per sprint run:

| Page | Title Pattern | Content |
|------|--------------|---------|
| Development Plan | `{sprintName} — Development Plan — {SPRINT_ID}` | Story assignments, readiness flags, carry-overs, workload summary, risk flags, dependencies, slot details |
| Estimation Document | `{sprintName} — Estimation — {SPRINT_ID}` | Per-story hour breakdowns, capacity analysis, mismatch flags, developer allocation |

Jira stories also receive a comment and assignee update automatically.

---

## Context Files

| File | Loaded by |
|------|-----------|
| `.claude/context/project-config.md` | All phases — project identity, sprint team, estimation baseline, workflow detection |

---

## MCP Servers

| Server | Package | Environment Variables Required |
|--------|---------|-------------------------------|
| Atlassian | `@atlassian/mcp-atlassian` | `JIRA_URL`, `CONFLUENCE_URL`, `ATLASSIAN_EMAIL`, `ATLASSIAN_API_TOKEN` |

Set these in your shell profile (`.bashrc`, `.zshrc`, or Windows System Environment Variables) before starting Claude Code.

---

## Configuration

All project-specific values are in `.claude/context/project-config.md`. Update this file when:
- **Team members change** — update the Sprint Team table
- **Deploying on a new project** — update the Project Identity section
- **Velocity assumptions change** — update the Estimation Baseline section
- **Fix version naming conventions change** — update the Workflow Track Detection section
