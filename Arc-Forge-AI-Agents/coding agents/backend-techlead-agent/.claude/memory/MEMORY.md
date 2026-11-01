# Memory Index

> This file is the index of all memory files for the Technical Lead Agent.
> Updated by the Startup Agent on every startup run.

## Project Memory

- [Project Startup Status](project_startup_status.md) — startup gate: repos_root_dir, Jira/Confluence/Figma access, repo preparation result
- [Project Configuration](project_config.md) — Jira project key, HLD Confluence location, git base branch

## Epic State (per-epic, under `.claude/memory/<EPIC_ID>/`)

Each epic run writes four files into its own subdirectory (e.g. `memory/PROJ-123/`):

| File | Written By | Read By |
|------|-----------|---------|
| `state.json` | Orchestrator (every step) | Orchestrator on `/lld-resume` |
| `feature-context.json` | Confluence Reader Agent (Part 1) | Service Identifier, LLD Generator, LLD Reviewer |
| `story-package.json` | Confluence Reader Agent (Part 2) | LLD Generator, LLD Reviewer, Confluence Publisher |
| `service-state.json` | Spec Reader Agent | LLD Generator, LLD Reviewer |

These files make the pipeline resumable and decouple agents from conversation context.

---

> Project memory files are written by the Startup Agent.
> Epic state files are written by the Orchestrator.
