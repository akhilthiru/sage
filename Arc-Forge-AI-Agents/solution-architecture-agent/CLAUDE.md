# Solution Architecture Agent

A reusable, product-agnostic multi-agent system that generates complete solution architecture documentation in Confluence from a product strategy page.

Built as a Claude Code native project — runs entirely from Claude Code terminal or desktop using slash commands and sub-agents. No Python, no deployment required.

---

## What it does

1. Reads a Confluence product strategy page (and all child pages)
2. Creates a pre-filled intake form on Confluence for team input
3. Waits for the intake form to be completed by a human
4. Generates 8 architecture documents with human review before each publish
5. Publishes approved pages to a Confluence folder

## Output pages created

| Page | Content |
|---|---|
| Solution Architecture | Business context, actors, capabilities, solution diagram |
| Infrastructure Architecture | Cloud infra, VPC, compute, storage, scaling |
| Data Architecture | ERD, data flows, DB selection, caching, retention |
| Integration Architecture | Per-integration specs, topology diagram, resilience patterns, security controls |
| Deployment Architecture | CI/CD pipeline, environments, IaC, branching strategy |
| Technology Stack | Full tech inventory — frontend, backend, DBs, tooling |
| Security Architecture | IAM, encryption, API security, compliance controls |
| Non-Functional Requirements | Performance, scalability, availability, DR targets |

---

## How to run

### Full pipeline (start here)

```
/arch-agent <url1> [url2] [url3] ... [--parent-id <folder-id>]
```

Accepts Confluence **page** URLs (`.../pages/<id>/...`) and **folder** URLs (`.../folder/<id>`).

Example — multiple input sources (one page + two folders):
```
/arch-agent \
  https://your-instance.atlassian.net/wiki/spaces/SPACE/pages/<page-id>/Page+Title \
  https://your-instance.atlassian.net/wiki/spaces/SPACE/folder/<folder-id-1> \
  https://your-instance.atlassian.net/wiki/spaces/SPACE/folder/<folder-id-2>
```

### Regenerate a single page

```
/arch-regenerate <page-name> [--feedback "your guidance"]
```

Valid page names: `solution-architecture`, `infra-architecture`, `data-architecture`, `integration-architecture`, `deployment-architecture`, `tech-stack`, `security-architecture`, `nfr`

### Check status

```
/arch-status
```

---

## Project structure

```
.claude/
  agents/
    orchestrator.md           Orchestrates the full pipeline (reads strategy, creates intake form, spawns sub-agents)
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
  solution_architecture.md      Page template
  infra_architecture.md         Page template
  data_architecture.md          Page template
  integration_architecture.md  Page template
  deployment_architecture.md    Page template
  tech_stack.md                 Page template
  security_architecture.md      Page template
  nfr.md                        Page template
```

---

## Confluence configuration

This system works with any Atlassian Cloud instance. No configuration files need to be updated — the orchestrator prompts for all required values at runtime:

- **Atlassian instance** — derived from the input URLs you provide
- **Output folder** — prompted by `/arch-agent` before each run (or pass via `--parent-id`)

---

## Product agnosticism

This system is fully product-agnostic:
- Cloud provider (AWS / Azure / GCP / other) comes from the intake form
- Technology stack (framework, DB, IDP, CI/CD) comes from the intake form
- Compliance requirements (GDPR, SOC2, ISO27001, HIPAA) come from the intake form
- Domain entities in data architecture are derived from the product strategy
- No technology assumptions are hardcoded in any agent or template

---

## Human-in-loop gates

- **Gate 1**: After intake form is created → team fills it in Confluence → confirm in Claude Code terminal
- **Gate 2**: After each of the 8 sub-agents generates a draft → review in terminal → `publish` / `revise: [feedback]` / `skip`

---

## Diagrams

All architecture diagrams use Mermaid. Confluence must have either:
- Native Mermaid support (Confluence Cloud with Mermaid enabled), or
- The [Mermaid Diagrams for Confluence](https://marketplace.atlassian.com/apps/1219440) marketplace app

---

## Adding a new architecture page type

1. Add a sub-agent file in `.claude/agents/<name>-agent.md` following the existing pattern
2. Add a template in `templates/<name>.md`
3. Register the agent in `.claude/agents/orchestrator.md` Step 6
4. Add it to the `arch-regenerate` command page name mapping
