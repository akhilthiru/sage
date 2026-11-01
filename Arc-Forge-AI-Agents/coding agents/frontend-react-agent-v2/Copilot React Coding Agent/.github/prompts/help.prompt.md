---
mode: 'agent'
tools: ['file', 'bash']
description: 'TPS DMS Copilot Pipeline — quick reference guide. Select this prompt to see how to use the AI development pipeline.'
---

# TPS DMS — Copilot AI Pipeline Quick Reference

Welcome to the TPS DMS AI development pipeline running on GitHub Copilot.

---

## How to Start the Pipeline

Open Copilot Chat in VS Code (`Ctrl+Shift+I` or `Cmd+Shift+I`) and type `@` followed by selecting a prompt, or use the paperclip / attach icon to pick a prompt file.

### Coding Pipeline

**Select: `dev.prompt.md`**

| What you provide | What the pipeline does |
|-----------------|----------------------|
| Jira ticket ID (e.g. `PHNX-1234`) | Auto-detects issue type (feature / bug), track (pilot / beta), and base branch from Jira |
| Release branch (optional, e.g. `release/0.3.14`) | Forces beta track and targets that branch instead of deriving from fix version |

Examples:
```
Ticket ID: PHNX-1234
Release branch: (leave blank for pilot / main)
```

```
Ticket ID: PHNX-5678
Release branch: release/0.3.14
```

---

## What the Coding Pipeline Does

```
dev.prompt.md
       │
       ├─ Phase 1: Spec & Plan              reads Jira + Figma + Confluence, scans codebase
       │                                    writes complete spec as Confluence page
       │
       ├─ ◉ HUMAN GATE 1: Spec Approval
       │         approve → continue
       │         feedback → revise spec → re-present
       │
       ├─ Phase 2: Branch & Implementation  creates branch, writes all code
       ├─ Phase 3: Impact Analysis         tsc + regression tests + locale check
       ├─ Phase 4: Code Review              all 18 mandatory standards
       │
       ├─ ◉ Surface Warnings (non-blocking issues only)
       │         proceed → continue │ fix → back to Phase 2
       │
       ├─ Phase 5: Test Writer              vitest, 80% coverage on new files
       ├─ Phase 4b: Performance Review      bundle, Zustand, SignalR, query checks
       ├─ Phase 6: Final Rebase Health      sync with base branch before PR
       │
       ├─ ◉ HUMAN GATE 2 (merge conflicts only)
       │
       └─ Phase 7: Release Readiness
             Part A (if shared library changed): submodule PR → HUMAN GATE 3
             Part B: feature PR → Jira update → cleanup
```

---

## Pipeline Prerequisites

**The pipeline checks MCP connectivity automatically before doing anything.** If a required server is not connected it will stop immediately and show you exactly what to fix.

### Step 1 — VS Code 1.99+ and GitHub Copilot

- **VS Code 1.99+** — required for MCP server support in Copilot agent mode. Check: `Help → About`.
- **GitHub Copilot extension** — installed from the VS Code marketplace and signed in.

### Step 2 — Create your API tokens

**Atlassian API token (mandatory)**

1. Go to [id.atlassian.com](https://id.atlassian.com) → **Security** → **API tokens**
2. Click **Create API token**, give it a name (e.g. `VS Code MCP`), copy the token
3. Note your **Atlassian base URL** (`https://harleydavidson.atlassian.net`) and **email address**

**Figma personal access token (optional — needed only if Figma designs are linked in Jira tickets)**

1. In Figma, go to **Settings** → **Security** → **Personal access tokens**
2. Click **Generate new token**, give it a name, set expiry as needed, copy the token

### Step 3 — Set environment variables

Set these in Windows System Environment Variables (System Properties → Environment Variables) or your shell profile. Restart VS Code after setting them.

| Variable | Value |
|----------|-------|
| `ATLASSIAN_BASE_URL` | `https://harleydavidson.atlassian.net` |
| `ATLASSIAN_EMAIL` | Your Harley-Davidson Atlassian email |
| `ATLASSIAN_API_TOKEN` | Token from Step 2 |
| `FIGMA_API_KEY` | Token from Step 2 (optional) |

> **Note:** The Figma MCP package uses `FIGMA_API_KEY` — not `FIGMA_API_TOKEN`.

### Step 4 — Create `.vscode/mcp.json`

Create this file at the project root. It is already gitignored — never commit it.

```json
{
  "servers": {
    "atlassian": {
      "command": "npx",
      "args": ["-y", "mcp-atlassian"],
      "env": {
        "ATLASSIAN_BASE_URL": "${ATLASSIAN_BASE_URL}",
        "ATLASSIAN_EMAIL": "${ATLASSIAN_EMAIL}",
        "ATLASSIAN_API_TOKEN": "${ATLASSIAN_API_TOKEN}"
      },
      "type": "stdio"
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "."],
      "type": "stdio"
    }
  }
}
```

The `${ENV_VAR}` syntax reads from your system environment variables — tokens are never stored in the file itself.

### Step 5 — Install gh CLI

Required for PR creation:

```
winget install GitHub.cli    # Windows
brew install gh              # macOS
```

Then authenticate: `gh auth login`

### Troubleshooting MCP connections

If a server still fails to connect after setting environment variables:
- Open the VS Code command palette → **"MCP: List Servers"** → find `atlassian` → **Restart**
- On Windows, environment variables set via System Properties require a **full VS Code restart** (not just reload window)
- Verify your token is valid: open `https://harleydavidson.atlassian.net/rest/api/3/myself` in a browser — it should return your user details

---

## Pipeline Files

```
.github/
  prompts/            ← entry points — select these in Copilot Chat
    dev.prompt.md           start a feature or bug fix
    help.prompt.md          this file

  copilot/            ← sub-agents (loaded automatically by the pipeline)
    phase-1-spec-plan.prompt.md
    phase-2-implementation.prompt.md
    phase-2b-submodule-compliance.prompt.md
    phase-3-impact-analysis.prompt.md
    phase-4-code-review.prompt.md
    phase-4b-performance.prompt.md
    phase-5-test-writer.prompt.md
    phase-6-rebase-health.prompt.md
    phase-7-release.prompt.md

  rules/              ← coding and testing standards loaded by agents
    coding-standards.md
    unit-testing-standards.md

.vscode/
  mcp.json            ← MCP server configuration for VS Code
```

---

## Resume After Interruption

If VS Code closes or the session ends mid-pipeline, run `dev.prompt.md` again with the same ticket ID. The pipeline reads the state file at `.github/output/pipeline-state/{TICKET_ID}-state.yml` and resumes from the last completed phase.

---

## Full Documentation

See `.github/README.md` for the complete guide.
