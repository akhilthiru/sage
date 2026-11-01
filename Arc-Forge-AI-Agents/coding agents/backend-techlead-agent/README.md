# Technical Lead Agent

An intelligent agent that generates Low Level Design (LLD) documents from Jira epics, reading your HLD and FRD from Confluence and your repo spec files directly from GitHub, then publishing the approved LLD as a Confluence child page under the HLD.

No local repo clones required — spec files are read from GitHub via the `gh` CLI.

---

## Quick Start

### 1. Prerequisites

- [Claude Code](https://claude.ai/code) installed locally
- Atlassian (Jira + Confluence) connected as MCP in Claude Code
- Figma connected as MCP in Claude Code (Viewer access on project files)
- [`gh` CLI](https://cli.github.com) installed and authenticated (`gh auth login`)

### 2. Minimal Config

```bash
cp .claude/context/config.yaml.example .claude/context/config.yaml
```

Edit `.claude/context/config.yaml` — **only three things are required before first run:**
```yaml
github:
  org: "your-github-org"                     # ← GitHub org containing all service repos
jira:
  base_url: "https://yourorg.atlassian.net"  # ← your Atlassian domain
confluence:
  base_url: "https://yourorg.atlassian.net/wiki"
```

Everything else (Jira project key, HLD location, base branch) is collected interactively during the first run.

### 3. Run — First Time

Open this directory in Claude Code, then type:

```
/lld PROJ-123
```

**The first run will automatically trigger the Startup Agent**, which will:
- Verify your connections (GitHub CLI, Jira, Confluence, Figma)
- Ask you for 4 configuration values (takes ~2 minutes)
- Write memory files so all future runs skip this entirely

### 4. Run — Subsequent Times

```
/lld PROJ-456
```

Startup is skipped. The pipeline goes straight to reading the epic.

### 5. Force Re-setup (when GitHub org changes, MCP connections change, etc.)

```
/startup
```

---

## How It Works — Step by Step

```
/lld PROJ-123
     │
     ▼
[Step 1] Read Jira epic PROJ-123
         └─ Look for HLD and FRD links on the epic
         └─ Both required — prompts for URL if either is missing
     │
     ▼
[Step 2] Read HLD, FRD, and all user stories from Confluence
         └─ Reads HLD and FRD pages: feature context, tech decisions, requirements
         └─ Discovers stories from FRD child pages (one child page per story)
         └─ Reads each story: AC, design notes, Figma links
         └─ Reads all Figma designs linked from stories (mandatory)
     │
     ▼
[Step 3] ⏸ CONFIRM WITH YOU
         └─ Shows list of services that need changes + reasons
         └─ You can add/remove services
         └─ Type CONFIRM to proceed
     │
     ▼
[Step 4] Verify service repos on GitHub
         └─ Checks each confirmed service exists in your GitHub org
         └─ If repo not found → asks you to verify name or SKIP
     │
     ▼
[Step 5] Read spec files from GitHub
         └─ Reads specifications/openapi.yaml, asyncapi.yaml, db-schema.md per repo
         └─ No local clones needed — reads directly via gh CLI
         └─ Extracts current DB tables, API endpoints, events as delta baseline
     │
     ▼
[Step 6] Generate LLD
         └─ Designs ONLY the changes needed for this epic (delta-based)
         └─ Covers: DB changes, API changes, event changes, diagrams, traceability
     │
     ▼
[Step 6b] Automated review (up to 3 rounds)
         └─ Checks Phoenix DB + API standards, traceability, Figma coverage
         └─ Auto-corrects MINOR issues; sends MAJOR/BLOCKER fixes to generator
         └─ If blockers remain after 3 rounds → asks you to REGENERATE or OVERRIDE
     │
     ▼
[Step 7] ⏸ YOUR APPROVAL
         └─ Shows the review-cleaned LLD inline
         └─ APPROVE → continue
         └─ REVISE <feedback> → regenerate with your notes
         └─ REJECT → cancel
     │
     ▼
[Step 8] Estimation & sequencing (automated, local only)
         └─ Breaks each story into backend tasks, estimates in developer hours
         └─ Adds Senior Dev Review + Tech Lead Review overhead
         └─ Sequences stories into development waves by dependency
         └─ Saved to output/ — never published to Confluence
     │
     ▼
[Step 9] Publish to Confluence
         └─ Creates "<HLD title> - LLD" as child page of HLD
         └─ Adds LLD remote link on Jira epic
         └─ Done!
```

---

## Spec Files — What Each Repo Needs

Each repo should have a `specifications/` folder with three files documenting its current state. The agent reads these files to understand what already exists before designing new changes for the epic.

```
your-service/
└── specifications/
    ├── openapi.yaml      ← full current OpenAPI 3.x spec
    ├── asyncapi.yaml     ← full current AsyncAPI spec (omit if no events)
    └── db-schema.md      ← current DB tables and indexes
```

### `specifications/openapi.yaml`
A complete OpenAPI 3.x document. The agent reads existing endpoints and schema names to avoid conflicts.

```yaml
openapi: 3.1.0
info:
  title: Order Service API
  version: 1.0.0
paths:
  /api/v1/customers/{id}:
    get:
      operationId: GetCustomerById
      ...
components:
  schemas:
    CustomerResponse: ...
```

### `specifications/asyncapi.yaml`
A complete AsyncAPI 3.x (or 2.x) document. The agent reads existing channels and message schemas.

```yaml
asyncapi: 3.0.0
info:
  title: Order Service Events
  version: 1.0.0
channels:
  customers.customer.created:
    address: customers.customer.created
    ...
```

### `specifications/db-schema.md`
Markdown document describing the current DB schema. Markdown tables are the preferred format.

```markdown
# DB Schema — Order Service

**Last migration:** 20260101_AddCustomerTable
**Migration tool:** EF Core

## Tables

### Customers
| Column | Type | Nullable | Default | PK | FK |
|--------|------|----------|---------|----|----|
| Id | uniqueidentifier | No | NEWSEQUENTIALID() | ✓ | |
| Email | nvarchar(255) | No | — | | |
| CreatedAt | datetimeoffset | No | GETUTCDATE() | | |

**Indexes:**
| Name | Columns | Unique |
|------|---------|--------|
| IX_Customers_Email | Email | Yes |
```

Any of the three files may be absent — the agent will design that area from scratch for the epic.

---

## Agents

| Agent | Step | Role |
|-------|------|------|
| `orchestrator` | All | Drives the pipeline, talks to you |
| `startup-agent` | Pre-pipeline | Verifies GitHub CLI, Jira, Confluence, Figma connections |
| `jira-reader-agent` | 1 | Fetches epic + finds HLD/FRD links |
| `confluence-reader-agent` | 2 | Reads HLD, FRD, all story pages, and Figma designs |
| `service-identifier-agent` | 3 | Identifies affected services with justification |
| `spec-reader-agent` | 5 | Reads specification files directly from GitHub |
| `lld-generator-agent` | 6 + revisions | Generates the LLD |
| `lld-reviewer-agent` | 6b | Reviews LLD against Phoenix standards, drives fix rounds |
| `estimation-sequencing-agent` | 8 | Estimates effort, sequences stories into development waves |
| `confluence-publisher-agent` | 9 | Publishes LLD to Confluence, adds remote link on Jira epic |

---

## Resume After Interruption

```
/lld-resume PROJ-123
```

Resumes from the last completed step. State is always saved in `.claude/memory/PROJ-123/state.json`.

---

## Output Files

Pipeline state is saved to `.claude/memory/<EPIC_ID>/`. All generated documents are written to `output/<EPIC_ID>/`.

| Location | File | Description |
|----------|------|-------------|
| `.claude/memory/<EPIC_ID>/` | `state.json` | Live pipeline state — used by `/lld-resume` |
| `.claude/memory/<EPIC_ID>/` | `feature-context.json` | HLD + FRD context (inter-agent handoff) |
| `.claude/memory/<EPIC_ID>/` | `story-package.json` | Enriched stories with AC + Figma (inter-agent handoff) |
| `.claude/memory/<EPIC_ID>/` | `service-state.json` | Parsed spec baselines per service (inter-agent handoff) |
| `output/<EPIC_ID>/` | `<HLD title> - LLD.md` | The generated LLD (local copy before publish) |
| `output/<EPIC_ID>/` | `gaps.md` | All BLOCKER / WARN / INFO gaps detected |
| `output/<EPIC_ID>/` | `review-report.md` | Automated review findings and fix log |
| `output/<EPIC_ID>/` | `estimation.md` | Full task breakdown per story |
| `output/<EPIC_ID>/` | `sequence.md` | Development wave diagram + dependency reasoning |
| `output/<EPIC_ID>/` | `estimation-summary.md` | Sprint planning view |
| `output/<EPIC_ID>/` | `lld-analysis.md` | Pre-generation entity analysis (internal) |

---

## Troubleshooting

**"HLD not found on epic"**
→ Type `HLD <confluence_url>` when prompted. Both HLD and FRD are required.

**"FRD not found on epic"**
→ Type `FRD <confluence_url>` when prompted.

**"No FRD child pages found"**
→ User stories must exist as child pages under the FRD in Confluence. Check the FRD page structure.

**"Repo not found in GitHub org"**
→ Verify the repo name and that `gh auth status` shows you are authenticated. Type `SKIP` to exclude that service.

**"Figma MCP is not connected"**
→ Open Claude Code → Settings → Connectors → connect Figma MCP. Then re-run `/startup`.

**"Automated review: blockers remain after 3 rounds"**
→ Type `REGENERATE` to restart LLD generation with all review findings as constraints, or `OVERRIDE` to proceed and log the reason.

**"Confluence publish failed"**
→ Your LLD is saved at `output/<EPIC_ID>/<HLD title> - LLD.md`. Type `RETRY` or paste the content manually.

**"Spec file not found"**
→ Not an error — the agent designs that area from scratch. Add a `specifications/` folder to the repo after the LLD is delivered.
