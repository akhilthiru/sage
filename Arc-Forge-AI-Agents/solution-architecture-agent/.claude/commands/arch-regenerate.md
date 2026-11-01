---
description: Regenerate a single architecture page using the existing session context. Use this when you want to revise one document without re-running the full pipeline.
---

# /arch-regenerate

Regenerate a single architecture document using the existing session context.

## Usage

```
/arch-regenerate <page-name> [--feedback "your feedback here"]
```

**Arguments:**
- `<page-name>` — Which page to regenerate. Valid values:
  - `solution-architecture`
  - `infra-architecture`
  - `data-architecture`
  - `integration-architecture`
  - `deployment-architecture`
  - `tech-stack`
  - `security-architecture`
  - `nfr`
- `--feedback` — Optional feedback to guide the regeneration (e.g. "use Azure instead of AWS")

## What this command does

1. Reads `.claude/memory/session_context.md` for existing context
2. Spawns the appropriate sub-agent with the feedback as additional instruction
3. Presents the regenerated draft for your review
4. On approval, updates the existing Confluence page (or creates a new one if not yet published)

## Examples

```
/arch-regenerate nfr

/arch-regenerate infra-architecture --feedback "Switch to Azure AKS instead of AWS EKS, primary region UK South"

/arch-regenerate security-architecture --feedback "Add SOC2 Type II compliance controls"
```

## Execution

1. Read `.claude/memory/session_context.md` to get the existing context and page IDs.
2. Map `<page-name>` to the correct sub-agent:
   - `solution-architecture` → `solution-arch-agent`
   - `infra-architecture` → `infra-arch-agent`
   - `data-architecture` → `data-arch-agent`
   - `integration-architecture` → `integration-arch-agent`
   - `deployment-architecture` → `deployment-arch-agent`
   - `tech-stack` → `tech-stack-agent`
   - `security-architecture` → `security-arch-agent`
   - `nfr` → `nfr-agent`
3. If `--feedback` is provided, append it to the agent prompt: "Additional guidance: [feedback]"
4. Spawn the agent, present the output for review.
5. On approval, call `updateConfluencePage` if the page already exists, or `createConfluencePage` if not.

## Prerequisites

Session context must exist at `.claude/memory/session_context.md`. Run `/arch-agent` first if starting from scratch.
