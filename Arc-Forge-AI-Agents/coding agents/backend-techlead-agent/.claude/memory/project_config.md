---
name: Project Configuration
description: User-confirmed project settings. Read by all agents.
type: project
---

## Configuration

| Setting | Value |
|---|---|
| Jira Project Key | PHNX |
| HLD Confluence Location | not set |
| GitHub Organisation | Harley-Davidson-Inc |
| GitHub Base Branch | main |

## How Each Agent Uses This

- **Jira Project Key** — Orchestrator validates `/lld <EPIC_ID>` prefix matches
- **HLD Confluence Location** — Confluence reader fallback search when HLD not linked on epic
- **GitHub Organisation** — Used by spec-reader-agent and service-identifier-agent to query repos via `gh` CLI
- **GitHub Base Branch** — Branch spec files are read from on every `/lld` run
