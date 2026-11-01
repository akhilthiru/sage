# Solution Architecture Agent

A reusable, product-agnostic multi-agent system that generates complete solution architecture documentation in Confluence from your existing product strategy pages.

Built as a **Claude Code native project** — runs entirely from Claude Code terminal or desktop using slash commands and sub-agents. No Python, no deployment, no infrastructure required.

---

## What it produces

8 Confluence pages published under a folder of your choice:

| Page | Content |
|---|---|
| Solution Architecture | Executive summary, actors, capabilities, business + solution diagrams |
| Infrastructure Architecture | Cloud infra, VPC layout, compute, storage, scaling, IaC |
| Data Architecture | ERD, data flow diagram, DB selection rationale, caching, retention |
| Integration Architecture | Integration topology diagram, per-integration specs, resilience patterns, security controls |
| Deployment Architecture | CI/CD pipeline, branch strategy, environments, rollback |
| Technology Stack | Full inventory — every technology across every layer |
| Security Architecture | IAM, API security, secrets, encryption, compliance controls |
| Non-Functional Requirements | Measurable targets for performance, availability, DR, and more |

All architecture diagrams are generated in **Mermaid** format.

---

## Prerequisites

- [Claude Code](https://claude.ai/code) — terminal or desktop
- Atlassian MCP connected in Claude Code (for reading/writing Confluence)
- Confluence Cloud with Mermaid support (native or via the [Mermaid Diagrams for Confluence](https://marketplace.atlassian.com/apps/1219440) app)

---

## Quick start

Open this project in Claude Code and run:

```
/arch-agent
```

The agent will interactively ask you for:
1. **Input URLs** — one or more Confluence page or folder URLs to read context from
2. **Output folder** — the Confluence folder where pages will be published (or press Enter for the default)

Alternatively, pass URLs directly to skip the prompts:

```
/arch-agent \
  https://yourorg.atlassian.net/wiki/spaces/PROD/pages/12345/Conceptual+Architecture \
  https://yourorg.atlassian.net/wiki/spaces/PROD/folder/67890 \
  --parent-id <confluence-folder-id>
```

---

## Full workflow

```
You type: /arch-agent <url1> <url2> <url3>
        │
        ▼
┌─────────────────────────────────────────────────────────┐
│  ORCHESTRATOR reads all input sources                   │
│  ├── Page URLs → reads page + all child pages           │
│  └── Folder URLs → lists all pages in folder, reads each│
│                                                         │
│  Extracts: product name, users, MVP scope,              │
│  capabilities, integrations, compliance context         │
└─────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────┐
│  ORCHESTRATOR creates intake form on Confluence         │
│  Pre-fills everything it found from the input sources.  │
│  Leaves blanks for: cloud provider, tech stack,         │
│  IDP, NFR targets, team names, DevOps tooling           │
└─────────────────────────────────────────────────────────┘
        │
        ▼
╔═════════════════════════════════════════════════════════╗
║  *** HUMAN GATE 1 ***                                   ║
║                                                         ║
║  Claude shows you the intake form URL and pauses.       ║
║  Open it in Confluence, review pre-filled fields,       ║
║  complete the blanks (cloud, stack, team, NFRs, etc.)   ║
║  Come back and type: "done" or "ready"                  ║
╚═════════════════════════════════════════════════════════╝
        │
        ▼
┌─────────────────────────────────────────────────────────┐
│  ORCHESTRATOR re-reads the completed intake form        │
│  Parses all answers into structured context             │
│  Writes everything to .claude/memory/session_context.md │
│                                                         │
│  Creates top-level parent page in Confluence            │
│  (all 7 docs will be children of this page)             │
└─────────────────────────────────────────────────────────┘
        │
        ▼
        For each of the 7 pages (in order):
        │
        ▼
┌─────────────────────────────────────────────────────────┐
│  SUB-AGENT spawned for this page                        │
│  1. Reads session_context.md                            │
│  2. Reads its template (e.g. templates/nfr.md)          │
│  3. Generates the full page using Claude                │
│     — real content, no unfilled placeholders            │
│     — Mermaid diagrams, tables, narrative sections      │
│     — actual technology names from intake answers       │
└─────────────────────────────────────────────────────────┘
        │
        ▼
╔═════════════════════════════════════════════════════════╗
║  *** HUMAN GATE 2 (×7 — once per page) ***              ║
║                                                         ║
║  Claude shows you the generated page as a preview.      ║
║  Reply with one of:                                     ║
║                                                         ║
║    publish           → page goes to Confluence, next    ║
║    revise: <notes>   → regenerates with your feedback,  ║
║                        shows preview again              ║
║    skip              → skip this page for now           ║
╚═════════════════════════════════════════════════════════╝
        │
        ▼
┌─────────────────────────────────────────────────────────┐
│  ORCHESTRATOR publishes approved page to Confluence     │
│  Records page ID and URL in session_context.md          │
│  Moves to the next page                                 │
└─────────────────────────────────────────────────────────┘
        │
        ▼  (after all 7)
┌─────────────────────────────────────────────────────────┐
│  Final status report — table of all 7 pages with URLs   │
└─────────────────────────────────────────────────────────┘
```

---

## Human gates explained

| Gate | When | What you do |
|---|---|---|
| **Gate 1** | After intake form is created | Open the Confluence page, fill in cloud provider, tech stack, team names, NFR targets, DevOps tooling. Come back and say "ready" |
| **Gate 2** | After each page is generated (×7) | Read the preview in terminal. Type `publish`, `revise: [your feedback]`, or `skip` |

Gate 2 repeats once per document. You can revise any page as many times as needed before publishing.

---

## All slash commands

### `/arch-agent` — full pipeline

```
/arch-agent
```

Interactively asks for input URLs and output folder, then runs the full pipeline. No arguments needed.

Optionally pass URLs directly to skip the prompts:

```
/arch-agent <url1> [url2] [url3] ... [--parent-id <folder-id>]
```

**Input URL types supported:**

| URL pattern | How it's handled |
|---|---|
| `.../wiki/spaces/SPACE/pages/<id>/...` | Reads the page + all child pages |
| `.../wiki/spaces/SPACE/folder/<id>` | Lists all pages in the folder, reads each one |

---

### `/arch-regenerate` — redo a single page

```
/arch-regenerate <page-name> [--feedback "your guidance"]
```

Regenerates one page using the existing session context. Useful when a tech decision changes or you want to improve a specific document.

**Valid page names:**

| Name | Page |
|---|---|
| `solution-architecture` | Solution Architecture |
| `infra-architecture` | Infrastructure Architecture |
| `data-architecture` | Data Architecture |
| `integration-architecture` | Integration Architecture |
| `deployment-architecture` | Deployment Architecture |
| `tech-stack` | Technology Stack |
| `security-architecture` | Security Architecture |
| `nfr` | Non-Functional Requirements |

**Examples:**

```
/arch-regenerate nfr

/arch-regenerate infra-architecture --feedback "Switch to Azure AKS, primary region UK South"

/arch-regenerate security-architecture --feedback "Add SOC2 Type II compliance controls"
```

---

### `/arch-status` — check progress

```
/arch-status
```

Shows a table of all 7 pages with their publish status and Confluence URLs for the current session.

---

## Project structure

```
.claude/
  agents/
    orchestrator.md              Master coordinator — reads sources, creates intake form,
                                 writes session context, spawns sub-agents
    solution-arch-agent.md       Generates Solution Architecture page
    infra-arch-agent.md          Generates Infrastructure Architecture page
    data-arch-agent.md           Generates Data Architecture page
    integration-arch-agent.md   Generates Integration Architecture page
    deployment-arch-agent.md     Generates Deployment Architecture page
    tech-stack-agent.md          Generates Technology Stack page
    security-arch-agent.md       Generates Security Architecture page
    nfr-agent.md                 Generates Non-Functional Requirements page
  commands/
    arch-agent.md             /arch-agent slash command
    arch-regenerate.md        /arch-regenerate slash command
    arch-status.md            /arch-status slash command
  memory/
    session_context.md        Runtime context — written by orchestrator, read by all sub-agents
    MEMORY.md                 Memory index

templates/
  intake_form.md              Intake questionnaire template (pre-filled by orchestrator)
  solution_architecture.md    Page template
  infra_architecture.md       Page template
  data_architecture.md        Page template
  deployment_architecture.md  Page template
  tech_stack.md               Page template
  security_architecture.md    Page template
  nfr.md                      Page template
```

---

## How context flows between agents

The orchestrator is the only agent that reads Confluence and the intake form. After parsing, it writes everything to `session_context.md`. All 7 sub-agents read only that file — they never re-fetch Confluence.

This means:
- Sub-agents are fast (no redundant API calls)
- All 7 pages are consistent (single source of truth)
- Any page can be regenerated independently via `/arch-regenerate` without re-reading anything

---

## Product agnosticism

This system works for any product. Nothing is hardcoded:

| What it needs | Where it comes from |
|---|---|
| Cloud provider (AWS / Azure / GCP) | Intake form |
| Technology stack (framework, DB, IDP) | Intake form |
| Compliance requirements (GDPR, SOC2, HIPAA) | Intake form |
| Domain entities for data architecture | Product strategy pages |
| Team names (owner, reviewer, approver) | Intake form |

---

## Default Confluence configuration

These defaults are configured in `CLAUDE.md`. Update them when using this project for a different Atlassian instance.

| Setting | Default value |
|---|---|
| Atlassian instance | `https://experionglobal.atlassian.net` |
| Confluence Space ID | `5466816532` |
| Default output folder ID | `5581570056` |

---

## Adding a new architecture page type

1. Add a sub-agent in `.claude/agents/<name>-agent.md` following the pattern of an existing agent
2. Add a template in `templates/<name>.md`
3. Register the agent in `.claude/agents/orchestrator.md` Step 6 (sub-agent list)
4. Add the page name mapping in `.claude/commands/arch-regenerate.md`
