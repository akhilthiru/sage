# TALON Rev — Technical Architect Agent

This Claude Code agent automates the creation of High-Level Design (HLD) documents for the TALON Rev platform (also known as **Phoenix**). It orchestrates a 9-step design workflow using specialist sub-agents, enforces platform standards, and publishes the final HLD to Confluence.

> **TALONes** is the legacy application being re-engineered into TALON Rev / Phoenix.

---

## Quick Start

Open a new conversation — the agent greets you automatically and asks for input. No slash command needed.

Alternatively:
```
/hld <JIRA Epic URL or Confluence FRD URL> [optional: <Figma URL>]
```

Before your first HLD, verify integrations are ready:
```
/startup-check
```

---

## How It Works

```
User provides FRD/JIRA/plain-text input
     |
     v
[startup-check]          Verify Atlassian + Figma MCP
     |
     v
[Author check]           Read/save hldAuthor from settings.local.json
     |
     v
[Orchestrator resolves input]
  - JIRA Epic  → fetch via Atlassian MCP
  - FRD URL    → fetch via Atlassian MCP (strip "FRD:" prefix for title)
  - Figma URL  → fetch screenshots via Figma MCP
     |
     v
[Optional intake extension]          Reviewer name (per HLD), Technical Recommendations,
                                     Additional Reference URLs (Confluence/external/GitHub)
     |
     v
[Additional URL resolution]
  - GitHub URLs  → ask to clone to context/github/<repo>/ for code-aware design
  - Confluence   → fetch via Atlassian MCP (supplementary context)
  - External     → fetch via WebFetch (vendor API docs, specs, guidelines)
  - Failures     → offer recovery options (paste / alternative URL / skip / retry)
     |
     v
[Pre-context fetch]      Load Microservices registry, Business Capability Map, NFR baselines,
                         Product Context, Product Strategy
     |
     v
[Pre-generation validation]          Intake completeness, URL resolution status,
                                     context files loaded, GitHub clones ready
     |
     v
Step 1: requirements-analyst         → Requirements Summary
Step 2: scope-definer                → Scope & Boundaries
Step 3: bounded-context-mapper       → Domain & Service Ownership
Step 4: service-communication-designer → Service Communication
Step 5: db-schema-designer           → Database Design
Step 6: api-designer                 → API & Integration Design
Step 7: diagram-generator            → Diagrams (ASCII only)
Step 8: nfr-analyzer                 → Non-Functional Requirements
     |
     v
[REVIEW GATE] ← User must type "approve" or "feedback: ..."
               (lists which rule sets will be applied before asking)
     |
     v
Step 9: hld-reviewer                 → Standalone Architectural Review Report (screen only, never written to HLD)
     |
     v
[REVIEWER FEEDBACK LOOP] ← Full report shown; user must respond "revise: ...", "accept-as-is", or "continue"
                            Hard stop applies for ALL verdicts, including "Ready for Development"
     |
     v
[PUBLISH GATE] ← Full HLD content displayed; user must type "publish" or "revise: ..."
     |
     v
Confluence: space TPSPhoenix, parent folder 1473413558
Title: "{FRD Name} - HLD"
JIRA Epic: linked via remote link (or comment as fallback)
```

At each step the orchestrator shows the output and waits for **"continue"** or corrections before proceeding. All gates are hard stops — they cannot be bypassed by any instruction:

| Gate | What Happens |
|------|-------------|
| **Step Confirmation** (after each step 1–8) | Section output shown; wait for "continue" or corrections |
| **Review Gate** (after Step 8) | Lists rule sets that will be applied; wait for "approve" or "feedback: ..." |
| **Reviewer Feedback Loop** (after Step 9, all verdicts) | Full Architectural Review Report shown on-screen; wait for "revise: ...", "accept-as-is", or "continue" |
| **Publish Gate** (after feedback loop) | Full HLD content displayed in full; wait for "publish" or "revise: ..." |

---

## Skills (Slash Commands)

| Command | What It Does |
|---------|-------------|
| `/hld <url or description>` | Start a fresh HLD workflow for a new feature |
| `/startup-check` | Verify Atlassian and Figma MCP connectivity |
| `/sync-rules` | Fetch latest standards from Confluence and regenerate `rules/` files |
| `/requirements` | Rerun Step 1 — Requirements Summary |
| `/scope` | Rerun Step 2 — Scope & Boundaries |
| `/bounded-context` | Rerun Step 3 — Domain & Service Ownership |
| `/service-comms` | Rerun Step 4 — Service Communication |
| `/db-schema` | Rerun Step 5 — Database Design |
| `/api-design` | Rerun Step 6 — API & Integration Design |
| `/diagrams` | Rerun Step 7 — Diagrams |
| `/nfr` | Rerun Step 8 — Non-Functional Requirements |

All correction skills accept optional context: `/scope The feature is now scoped to a single dealer only`

> **Note:** Standalone review commands (`/review-hld`, `/deep-review`) have been removed. The architectural review runs only through the orchestrator workflow, behind the Review Gate, after explicit user approval.

---

## Sub-Agents

| Agent | Model | Role |
|-------|-------|------|
| `orchestrator` | sonnet | Central coordinator — manages the full workflow, delegates to all other agents |
| `startup-check` | haiku | Verifies Atlassian and Figma MCP connectivity before any workflow starts |
| `requirements-analyst` | sonnet | Extracts functional requirements from FRDs, JIRA epics, and Figma screenshots |
| `scope-definer` | sonnet | Defines in-scope/out-of-scope items, assumptions, dependencies, and risks |
| `bounded-context-mapper` | sonnet | Maps features to TALON Rev service domains and identifies cross-domain interactions |
| `service-communication-designer` | sonnet | Designs sync REST and async Service Bus event communication patterns |
| `db-schema-designer` | sonnet | Designs Azure SQL schemas, Cosmos DB collections, EF Core configuration |
| `api-designer` | sonnet | Designs REST API contracts, error envelopes, and external integrations |
| `diagram-generator` | sonnet | Generates ASCII component and sequence diagrams |
| `nfr-analyzer` | sonnet | Defines feature-specific NFRs — cross-references the platform NFR baseline and includes only deviations |
| `hld-reviewer` | opus | Deep review across 10 dimensions + Definition of Done + `rules/architecture-review.md` checklists. Produces a standalone **Architectural Review Report** — never written into the HLD file |

---

## Rules Files

Rules are injected into every sub-agent call by the orchestrator. Every design decision must comply.

| File | What It Covers |
|------|---------------|
| `rules/api-standards.md` | REST conventions, versioning, HTTP methods, error contracts, auth, idempotency, Refit+Polly |
| `rules/db-standards.md` | Naming, audit columns, soft delete, tenant isolation, ROWVERSION, EF Core config, Cosmos DB usage |
| `rules/event-standards.md` | Azure Service Bus topics, event envelope (causationId/actor/source/partitionKey), session strategy |
| `rules/architecture-review.md` | Primary review ruleset: HLD completeness/soundness, DB design, API design, security, observability, resilience checklists, and the Inventory & Transaction Atomicity Rule |

To update `api-standards.md` and `db-standards.md` from Confluence: `/sync-rules`

---

## Context Files

Context files provide background knowledge to sub-agents. They are read-only references.

| File | What It Contains |
|------|-----------------|
| `context/architecture/talon-rev-architecture.md` | Azure infrastructure, service domains, tech stack, naming conventions, architectural constraints |
| `context/architecture/talon-rev-design-principles.md` | 12 design principles + Definition of Done checklist for HLD review |
| `context/api-reference.md` | Industry baseline API design principles (REST, versioning, error design, pagination) |
| `context/db-reference.md` | Industry baseline database design principles (normalisation, indexing, migrations, NoSQL) |
| `context/frd/` | FRD documents for features (place Confluence-exported FRDs here as `.md` files) |
| `context/api-specs/` | External vendor API specs referenced by integration designs |

---

## Output

Each HLD is written flat to `outputs/` using versioned filenames:

| File | Purpose |
|------|---------|
| `outputs/<slug>-v1.0.md` | Initial HLD draft |
| `outputs/<slug>-v1.1.md` | After first review revision, and so on |
| `outputs/<slug>-latest.md` | Text pointer to the current version filename — always updated on version increment |
| `outputs/<slug>-state.json` | Workflow state: current step, version, reviewer, TSR, context limitations |

Minor version increments (v1.0 → v1.1 → v1.2) occur automatically after each `revise:` cycle in the Reviewer Feedback Loop. All prior versions are retained. The state file is deleted on successful publish.

After user approval at the publish gate, the current version is published to:
- **Confluence Space**: TPSPhoenix
- **Parent Folder ID**: `1473413558`
- **Page Title**: `{FRD Name} - HLD` (e.g., "Manage Stock Items - HLD")
- **JIRA Epic**: linked via remote link; comment added as fallback

---

## HLD Template

The HLD template is at `templates/hld-template.md`. Key characteristics:

- **No top-level H1** — Confluence uses the page title; the template starts with a governance header table
- **ASCII diagrams only** — no Mermaid, no PlantUML; all diagrams use plain text with `[SYNC: ...]` and `[ASYNC: ...]` labels
- **Only include sections derivable from the FRD** — omit sections not applicable to the feature
- **Governance header** includes: Status, Version, Author, Last Updated, Feature Slug, JIRA Epic, FRD link
- **9 sections only** — the HLD ends at section 9 (Non-Functional Requirements); there is no section 10
- **Review report is separate** — Step 9 produces a standalone Architectural Review Report shown on-screen; it is never part of the HLD file

---

## HLD Content Rules

These rules keep HLDs concise and reviewable:

| Rule | Detail |
|------|--------|
| **NFRs** | Include only feature-specific, non-default requirements. Cross-reference the platform NFR baseline first; include only deviations, stricter targets, or additional constraints. |
| **API & Event specs** | Formal specs only for external system boundaries. Internal service communication is documented as prose or sequence diagrams. |
| **Review report** | Step 9 produces a standalone **Architectural Review Report** (sections R1–R6) shown on-screen during the reviewer feedback loop. It is never written into the HLD file. The HLD has 9 sections only. |
| **Inventory atomicity** | Any transaction affecting inventory quantity that is triggered from the UI must be atomic. Internal REST API calls handle rollback and update together. Non-atomic designs are a blocking review failure. |

---

## Resilient Fetch Behaviour

The orchestrator fetches URLs from multiple sources during a workflow. Each type uses the appropriate tool:

| URL Type | Tool | Notes |
|----------|------|-------|
| Confluence pages (mandatory pre-context) | Atlassian MCP `getConfluencePage` | Always fetched; failure blocks workflow |
| Confluence pages (user-supplied additional) | Atlassian MCP `getConfluencePage` | Supplementary; failure triggers recovery |
| GitHub repositories | `git clone` via Bash | User must approve clone; failure triggers recovery |
| External URLs (vendor docs, specs, guidelines) | `WebFetch` | Parsed and passed as context; failure triggers recovery |
| Figma frames | Figma MCP `get_screenshot` | Screenshots only; failure triggers recovery |

**When a fetch fails**, the orchestrator never silently skips or errors — it presents recovery options:

> - **A)** Paste the content directly
> - **B)** Provide an alternative URL
> - **C)** Skip (URL documented in Context Limitations section of the HLD)
> - **D)** Retry with credentials (auth errors)
> - **E)** Retry

Multiple failures are batched into a single prompt. Skipped URLs are recorded in `contextLimitations` in the state file and noted in the HLD's Scope & Boundaries section. The workflow is never blocked by optional URL failures.

---

## External Confluence References

All Confluence pages used by the agent are listed here. Pages in the "Fetched automatically" group are loaded live before every HLD — the agent never relies on cached content for these.

| Page | URL | When Used |
|------|-----|-----------|
| **Product Context** — product vision, goals, and background for TALON Rev | https://harleydavidson.atlassian.net/wiki/spaces/TPSPhoenix/pages/2183299153/Product+Context | Fetched automatically before every HLD; informs requirements framing and scope decisions |
| **Product Strategy** — TALON Rev strategic direction and priorities | https://harleydavidson.atlassian.net/wiki/spaces/TPSPhoenix/pages/2394357805/TALON+Revolution+Product+Strategy | Fetched automatically before every HLD; informs design decisions and trade-offs |
| **Microservices Registry** — authoritative list of all TALON Rev microservices | https://harleydavidson.atlassian.net/wiki/spaces/TPSPhoenix/pages/1454932363/Microservices | Fetched automatically before every HLD; governs service ownership (Step 3) and communication design (Step 4) |
| **Business Capability Map** — bounded contexts and business capabilities | https://harleydavidson.atlassian.net/wiki/spaces/TPSPhoenix/pages/1463157568/Phoenix+-+Business+Capability+Map | Fetched automatically before every HLD; used to validate domain ownership and service boundaries |
| **Non-Functional Requirements** — platform-agreed NFR baselines | https://harleydavidson.atlassian.net/wiki/spaces/TPSPhoenix/pages/1479999615/Non-Functional+Requirements | Fetched automatically before every HLD; nfr-analyzer cross-references this and only includes feature-specific deviations |
| **API Development Standards** — TALON Rev REST, versioning, auth, idempotency, and error contract standards | https://harleydavidson.atlassian.net/wiki/spaces/TPSPhoenix/pages/1463091264/API+Development+Standards | Fetched by `/sync-rules`; regenerates `rules/api-standards.md` |
| **SQL Database Design Guidelines** — naming conventions, audit columns, indexing, and migration standards | https://harleydavidson.atlassian.net/wiki/spaces/TPSPhoenix/pages/1463222370/SQL+Database+Design+Guidelines+for+Micro-Services | Fetched by `/sync-rules`; regenerates `rules/db-standards.md` |
| **HLD Publish Destination** — parent folder where all HLDs are published | Space: `TPSPhoenix`, Parent folder ID: `1473413558` | Used at the Publish Gate |

---

## Integrations Required

| Integration | Purpose | Required |
|------------|---------|---------|
| Atlassian MCP (`harleydavidson.atlassian.net`) | Fetch JIRA epics, Confluence FRDs and pre-context pages, publish HLD pages, link to JIRA epics | Yes |
| Figma MCP | Fetch Figma screen screenshots for requirements context | Optional |

Run `/startup-check` to verify both are configured before starting any HLD.

---

## Memory

The agent automatically saves non-obvious design decisions to `.claude/memory/` after every successful publish. These memories carry forward into future conversations so the agent builds institutional knowledge over time.

Saved per feature: owning service, key design decisions, standards clarifications, review iterations needed.

---

*TALON Rev Technical Architect Agent — powered by Claude Code*
