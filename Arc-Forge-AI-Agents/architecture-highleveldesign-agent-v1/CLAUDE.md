# CLAUDE.md — Project-wide rules

This file is read automatically by Claude Code before every agent run.
All agents in this project must follow every rule here.
Do not repeat these rules inside individual agent files.

---

## Project context

| Field | Value |
|---|---|
| Diagram tool | Mermaid |
| Document destination | Confluence |
| Active agents | orchestrator (workflow coordinator), knowledge → hld_generator → reviewer → publisher |

---

## Confluence setup

No manual setup required.

When the publisher agent runs, it will ask you to paste the Confluence page URL
where the HLD should be published. It resolves the cloud ID, space key, and page
version automatically from that URL.

You only need a Confluence page that already exists.

---

## Rules every agent must follow

### Before starting any task
- Read `.claude/memory/shared_state.json` first
- Confirm `project.phase` matches what each agent expects before running
- If phase is wrong — stop and print the current phase, do not proceed

### While working
- Never skip a section or quality gate
- Never write placeholders like "TBD" or "Coming soon" in output documents
  — [TBD] is only allowed for items genuinely awaiting external input
- Never invent requirements — only use what is in shared_state
- If data is missing — infer it, mark it [INFERRED — needs confirmation],
  and add it to Open Items Section

### After completing any task
- Always write outputs back to shared_state.json
- Always update `project.phase` to the next phase
- Always print a completion summary with output locations

---

## List of Skills used in the sub agents

| Standard | Skill name | How to invoke |
|---|---|---|
| Mermaid diagram layout | `mermaid-guidelines` | Skill tool with name `mermaid-guidelines` |
| HLD document structure | `hld-guidelines` | Skill tool with name `hld-guidelines` |
| API design standards | `api-design-guidelines` | Skill tool with name `api-design-guidelines` |
| Database design standards | `db-design-guidelines` | Skill tool with name `db-design-guidelines` |

Invoke skills on demand using the Skill tool — only when that section is being worked on.
Do not invoke all skills at the start of a run.

---

## Output locations

| Output type | Location |
|---|---|
| Architecture documents | `docs/architecture/` |
| Diagrams | Embedded as Mermaid code blocks in the HLD document |
| Published docs | Confluence space |
| Pipeline state | `.claude/memory/shared_state.json` |

---

## Workflow Phase

```
knowledge      ← knowledge agent
hld_generation ← hld_generator agent
hld_review     ← reviewer agent
publishing     ← publisher agent
complete
```

If phase is set to anything not listed above — stop and report.

---

## Team conventions

- All document filenames use kebab-case with version at end: Example `HLD-my-project-v1.0.md`
- If the document filenames already available, then increment to next version like `HLD-my-project-v2.0.md` and so on.
- One agent runs at a time — do not run two agents in parallel

---
