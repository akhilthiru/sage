# Technical Lead Agent

## What This Agent Does

Generates Low Level Design (LLD) documents from Jira epics. Given an epic ID, it reads the HLD, FRD, all user stories (from Jira and Confluence), Figma designs linked to each story, and existing repo specs — then produces a complete LLD and publishes it to Confluence as a child page of the HLD.

---

## Commands

### `/lld <EPIC_ID>`
Start LLD generation for a Jira epic.

**What happens:**
1. Startup gate — verifies all MCP connections (Jira, Confluence, Figma) and repo state. Runs once; skipped on future runs.
2. Reads the Jira epic → finds HLD and FRD links (both required). Halts if either is missing.
3. Reads all user stories under the epic from Jira. For each story, reads the linked Confluence page and the linked Figma design. Figma is mandatory — pipeline halts if a story has no readable Figma.
4. Reads HLD, FRD, and FRD child pages (which may contain additional story sections).
5. Identifies affected services → asks you to confirm the list.
6. Reads `specifications/openapi.yaml`, `specifications/asyncapi.yaml`, `specifications/db-schema.md` directly from GitHub for each confirmed repo (no local clones needed).
7. Generates LLD: DB design (Phoenix standards), OpenAPI spec, AsyncAPI spec, component diagram, sequence diagrams, traceability matrix.
8. **Automated review** — checks standards compliance, traceability completeness, Figma coverage, design consistency. Auto-corrects MINOR issues. Returns fix instructions to the LLD generator for MAJOR/BLOCKER issues. Loops up to 3 rounds until clean.
9. Presents the review-cleaned LLD for your approval.
10. **Estimation & sequencing** (runs immediately after your approval) — breaks each story into backend tasks, estimates each in developer hours, adds Senior Dev + Tech Lead review overhead, sequences stories into development waves by technical dependency. Saved locally — never published.
11. Publishes to Confluence as `<hld_core_name> - LLD` child page under the HLD. Adds remote link on Jira epic.

**Delegates to:** `.claude/agents/orchestrator.md`

---

### `/startup`
Re-run the full environment setup.

Use when: GitHub org changed, MCP connections changed, or first time setup.

**What it checks:**
- `gh` CLI installed and authenticated (`gh auth status`)
- GitHub org accessible and configured
- Jira MCP connected and authenticated
- Confluence MCP connected and authenticated
- **Figma MCP connected and authenticated** (mandatory — pipeline cannot run without this)

**Delegates to:** `.claude/agents/startup-agent.md`

---

### `/lld-resume <EPIC_ID>`
Resume a pipeline that was interrupted.

Reads `.claude/memory/<EPIC_ID>/state.json` and continues from the last completed step.

**Delegates to:** `.claude/agents/orchestrator.md`

---

## Setup (First Time)

```bash
cp .claude/context/config.yaml.example .claude/context/config.yaml
```

Edit `.claude/context/config.yaml` and set at minimum:
- `github.org` — your GitHub organisation name (repos are read directly from GitHub — no local clones needed)
- `jira.base_url` — your Atlassian domain (e.g. `https://yourorg.atlassian.net`)
- `confluence.base_url` — your Confluence base URL

Ensure `gh` CLI is installed and authenticated (`gh auth login`) before running `/lld`.

Then run `/lld <EPIC_ID>`. Startup runs automatically on first use and collects remaining config interactively.

---

## MCP Connectors Required

| Connector | Required | Used For |
|-----------|----------|---------|
| Atlassian | ✅ Yes | Jira epics, stories, Confluence pages |
| Figma | ✅ Yes | Reading screen designs for API spec generation |

Connect both in Claude Code → Settings → Connectors before running `/lld`.

Additionally, install and authenticate the **`gh` CLI** (`gh auth login`) — used to read spec files directly from GitHub without needing local repo clones.

---

## Project Standards

- **DB:** TPSPhoenix SQL Database Design Guidelines (`.claude/rules/db-standards.md`)
- **API:** TPSPhoenix API Development Standards (`.claude/rules/api-standards.md`)
- **Gaps:** `.claude/rules/gap-classification.md`
- **Pipeline:** `.claude/rules/pipeline-rules.md`

---

## Project Structure

```
tech-lead-agent/
│
├── CLAUDE.md                          ← Entry point — commands, overview
├── README.md                          ← Human setup guide
│
├── .claude/                           ← All Claude Code configuration
│   ├── agents/                        ← Sub-agent instruction files
│   │   ├── orchestrator.md            ← Pipeline controller
│   │   ├── startup-agent.md           ← Environment setup (runs once)
│   │   ├── jira-reader-agent.md       ← Epic metadata + HLD/FRD links
│   │   ├── confluence-reader-agent.md ← HLD + FRD + story pages + Figma
│   │   ├── service-identifier-agent.md← Affected services
│   │   ├── spec-reader-agent.md       ← Repo spec files
│   │   ├── lld-generator-agent.md     ← LLD generation
│   │   └── confluence-publisher-agent.md ← Publish to Confluence
│   │
│   ├── commands/                      ← Slash commands
│   │   ├── lld.md                     ← /lld <EPIC_ID>
│   │   └── lld-resume.md              ← /lld-resume <EPIC_ID>
│   │
│   ├── skills/                        ← Reusable capabilities
│   │   ├── notify-skill/SKILL.md      ← Desktop + push notifications
│   │   ├── figma-reader/SKILL.md      ← Figma MCP reading
│   │   ├── confluence-operations/SKILL.md
│   │   ├── mermaid-diagram/SKILL.md
│   │   ├── git-operations/SKILL.md
│   │   └── spec-file-parser/SKILL.md
│   │
│   ├── rules/                         ← Project standards (read by agents)
│   │   ├── db-standards.md            ← TPSPhoenix DB guidelines
│   │   ├── api-standards.md           ← TPSPhoenix API standards
│   │   ├── gap-classification.md      ← BLOCKER/WARN/INFO definitions
│   │   └── pipeline-rules.md          ← Pipeline behaviour rules
│   │
│   ├── context/                       ← Reference data (read by agents)
│   │   ├── config.yaml.example        ← Copy to config.yaml and fill in
│   │   └── schemas.md                 ← Shared data contracts between agents
│   │
│   ├── templates/                     ← Page and document templates
│   │   └── lld-confluence-template.md ← LLD Confluence page structure
│   │
│   ├── scripts/                       ← Shell utilities
│   │   └── notify.sh                  ← Cross-platform desktop toast
│   │
│   └── memory/                        ← Runtime state (written at startup)
│       ├── MEMORY.md                  ← Memory index
│       ├── project_startup_status.md  ← Startup gate flag
│       └── project_config.md          ← Jira key, HLD location, base branch
│
└── output/                            ← Generated per-epic (git-ignored)
    └── <EPIC_ID>/
        ├── <hld_core_name> - LLD.md
        └── gaps.md
```

---

## Memory

| File | Written By | Read By |
|------|-----------|---------|
| `.claude/memory/project_startup_status.md` | Startup Agent | Orchestrator (startup gate) |
| `.claude/memory/project_config.md` | Startup Agent | All agents |
| `.claude/memory/<EPIC_ID>/state.json` | Orchestrator | Orchestrator (resume) |
| `.claude/memory/<EPIC_ID>/feature-context.json` | Confluence Reader Agent (Part 1) | Service Identifier, LLD Generator, LLD Reviewer |
| `.claude/memory/<EPIC_ID>/story-package.json` | Confluence Reader Agent (Part 2) | LLD Generator, LLD Reviewer, Confluence Publisher |
| `.claude/memory/<EPIC_ID>/service-state.json` | Spec Reader Agent | LLD Generator, LLD Reviewer |

---

## Output

All pipeline outputs are written to `output/<EPIC_ID>/`:

| File | Description |
|------|-------------|
| `lld-analysis.md` | Pre-generation entity and design analysis |
| `<hld_core_name> - LLD.md` | The generated LLD (local copy before publish) |
| `gaps.md` | All gaps and assumptions detected |
| `error.log` | Error log if any failures occurred |
