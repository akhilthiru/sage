---
description: TPS DMS Claude Code Pipeline — quick reference and setup guide
---

# TPS DMS — Claude Code Pipeline Quick Reference

Welcome to the TPS DMS AI development pipeline running on Claude Code.

---

## How to Start the Pipeline

Type a slash command in Claude Code chat:

| Command | When to use |
|---------|------------|
| `/dev PHNX-1234` | Feature or bug fix targeting `main` (pilot track) |
| `/dev PHNX-1234 release/0.3.14` | Feature or bug fix targeting a release branch (beta track) — dual PRs created automatically |

Track and workflow type are auto-detected from the Jira ticket — no need to choose between feature/bugfix/beta manually.

For bug tickets: the RCA agent must have been run first. `/dev` will look for the `{TICKET_ID}-RCA` page under TALON Rev - RCA Documents in Confluence and stop with a clear message if it is not found.

---

## What the Pipeline Does

```
/dev PHNX-1234
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
       ├─ Phase 4: Code Review              full coding-standards.md check
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

### Step 1 — Claude Code

- **Claude Code CLI** — installed and authenticated (`claude` command available in terminal)
- Or **Claude Code VS Code extension** — installed and signed in

### Step 2 — Create your API tokens

**Atlassian API token (mandatory)**

1. Go to [id.atlassian.com](https://id.atlassian.com) → **Security** → **API tokens**
2. Click **Create API token**, give it a name (e.g. `Claude Code MCP`), copy the token
3. Note your **Atlassian base URL** (`https://harleydavidson.atlassian.net`) and **email address**

**Figma personal access token (optional — needed only if Figma designs are linked in Jira tickets)**

1. In Figma, go to **Settings** → **Security** → **Personal access tokens**
2. Click **Generate new token**, give it a name, set expiry as needed, copy the token

### Step 3 — Set environment variables

Set these in Windows System Environment Variables (System Properties → Environment Variables) or your shell profile (`.bashrc` / `.zshrc`). Restart your terminal and IDE after setting them.

| Variable | Value |
|----------|-------|
| `ATLASSIAN_BASE_URL` | `https://harleydavidson.atlassian.net` |
| `ATLASSIAN_EMAIL` | Your Harley-Davidson Atlassian email |
| `ATLASSIAN_API_TOKEN` | Token from Step 2 |
| `FIGMA_API_KEY` | Token from Step 2 (optional) |

> **Note:** The Figma MCP package uses `FIGMA_API_KEY` — not `FIGMA_API_TOKEN`.

### Step 4 — Configure MCP servers in `.claude/settings.json`

This file is already gitignored in this project. Create it at `.claude/settings.json` if it does not exist:

```json
{
  "mcpServers": {
    "atlassian": {
      "command": "npx",
      "args": ["-y", "mcp-atlassian"],
      "env": {
        "ATLASSIAN_BASE_URL": "${ATLASSIAN_BASE_URL}",
        "ATLASSIAN_EMAIL": "${ATLASSIAN_EMAIL}",
        "ATLASSIAN_API_TOKEN": "${ATLASSIAN_API_TOKEN}"
      }
    },
  }
}
```

The `${ENV_VAR}` syntax reads from your system environment variables — tokens are never stored in the file itself.

> `.claude/settings.json` is gitignored — never commit it.

### Step 5 — Install gh CLI

Required for PR creation:

```
winget install GitHub.cli    # Windows
brew install gh              # macOS
```

Then authenticate: `gh auth login`

### Troubleshooting MCP connections

If a server still fails to connect after setting environment variables:
- In Claude Code, run `/mcp` to see server status and restart individual servers
- On Windows, environment variables set via System Properties require a **full terminal and IDE restart**
- Verify your token is valid: open `https://harleydavidson.atlassian.net/rest/api/3/myself` in a browser — it should return your user details

---

## Pipeline Files

```
.claude/
  commands/
    dev.md              ← pipeline entry point (/dev PHNX-1234)
    help.md             ← this file (/help)

  agents/development/   ← sub-agents (spawned automatically by /dev)
    phase-1-spec-and-plan.md
    phase-2-implementation.md
    phase-2b-submodule-compliance.md
    phase-3-impact-analysis.md
    phase-4-code-review.md
    phase-4b-performance-review.md
    phase-5-test-writer.md
    phase-6-final-rebase-health.md
    phase-7-release-readiness.md

  context/              ← focused context slices loaded per phase
    project-config.md
    coding-standards.md
    unit-testing-standards.md
    architecture-context.md

  settings.json         ← MCP server config (gitignored — never commit)
```

---

## Resume After Interruption

If VS Code closes or the session ends mid-pipeline, run `/dev PHNX-1234` again with the same ticket ID. The pipeline reads the state file at `.claude/output/pipeline-state/{TICKET_ID}-state.yml` and resumes from the last completed phase. No work is lost.

The state file is deleted automatically when the pipeline completes.

---

## Full Documentation

See `.claude/README.md` for the complete pipeline reference.
