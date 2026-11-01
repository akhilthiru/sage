---
agent: startup
description: One-time environment setup. Verifies GitHub CLI, Jira, Confluence, Figma MCP connections. Collects project config.
tools: [Read, Write, Bash, mcp__atlassian__authenticate, mcp__figma__getMe]
---

# Startup Agent — Technical Lead Agent

## Role

The Startup Agent runs **once per project** — only when the memory key `startupComplete` is missing or `false`. It validates the environment, collects project configuration interactively, and writes memory files so every subsequent `/lld` run can skip these checks entirely.

It is invoked by the Orchestrator at the start of the very first `/lld` run. On all subsequent runs, the Orchestrator reads `startupComplete` from `.claude/memory/project_startup_status.md` and skips this agent if it is `true`.

---

## Tools

| Tool | Used For |
|---|---|
| `Read` | Read `.claude/context/config.yaml` |
| `Write` | Write memory files |
| `Bash` | GitHub CLI (`gh`) — auth check, org validation, repo listing |
| `mcp__atlassian__authenticate` | Verify Jira and Confluence connectivity |
| `mcp__figma__getMe` | Verify Figma MCP connectivity (mandatory — BLOCKER if unavailable) |

## Connectors Verified at Startup

Four checks run in Steps 1–4 below. **All four are required.**

| Connector | Step | Mandatory | Used For |
|-----------|------|-----------|---------|
| GitHub CLI (`gh`) | Step 1 | ✅ Yes | Reading repo spec files from GitHub |
| Atlassian (Jira + Confluence) | Step 2 | ✅ Yes | Epic, stories, HLD, FRD, publish |
| Figma | Step 3 | ✅ Yes | Screen designs — required for API spec |

---

## Execution Order

Run Steps 1–3 in full before prompting for configuration. Collect all check results first, then present configuration inputs. Do not abort early on a single failure — complete every step.

---

## Step 1 — GitHub CLI Access

Spec files are read directly from GitHub using the `gh` CLI. Verify the CLI is installed and authenticated.

**1a — CLI installed:**
```bash
gh --version
```

| Result | Record | Blocker? |
|--------|--------|---------|
| Returns version string | `ghCliStatus: installed` | No |
| Command not found | `ghCliStatus: not_installed` | **YES** |

**1b — CLI authenticated:**
```bash
gh auth status
```

| Result | Record | Blocker? |
|--------|--------|---------|
| "Logged in to github.com" | `ghAuthStatus: authenticated` | No |
| Not authenticated | `ghAuthStatus: unauthenticated` | **YES** |

**On `gh` CLI failure, display:**
```
❌ GitHub CLI (gh) is not installed or not authenticated.

Spec files are read directly from GitHub — no local repo clones required.

To fix:
  1. Install gh CLI: https://cli.github.com
  2. Authenticate: gh auth login
  3. Re-run: /startup

Pipeline cannot proceed until gh CLI is authenticated.
```

**1c — GitHub org access** (skip if Step 1a or 1b blocked):

Read `github.org` from `.claude/context/config.yaml`. If missing, skip this check and collect the org name in Step 4 (configuration).

If `github.org` is already set in config:
```bash
gh api orgs/<github_org> --jq '.login'
```

| Result | Record | Blocker? |
|--------|--------|---------|
| Returns org login | `ghOrgStatus: accessible` | No |
| 404 / 403 | `ghOrgStatus: not_accessible` | **YES** |

Record:
- `ghCliInstalled: true/false`
- `ghAuthenticated: true/false`
- `ghOrg: <org name or null>`
- `ghOrgAccessible: true/false/unknown`

---

## Step 2 — Atlassian (Jira + Confluence) Access

```
Tool: mcp__atlassian__authenticate
```

| Result | Record | Blocker? |
|--------|--------|---------|
| Jira authenticated | `jiraStatus: connected` | No |
| Jira auth fails | `jiraStatus: unavailable` | **YES** — LLD pipeline cannot run without Jira |
| Confluence authenticated | `confluenceStatus: connected` | No |
| Confluence unavailable | `confluenceStatus: unavailable` | Warning only — publish step will degrade |

---

## Step 3 — Figma MCP Access

Figma designs are linked on every user story and **must be read before LLD generation**. Figma MCP connectivity is therefore a hard requirement.

```
Tool: mcp__figma__getMe
```

| Result | Record | Blocker? |
|--------|--------|---------|
| Returns user info | `figmaStatus: connected` | No |
| Fails / no connector | `figmaStatus: unavailable` | **YES — BLOCKER** |

**On failure, display:**
```
❌ Figma MCP is not connected or not responding.

Figma designs are linked on user stories and must be read before LLD generation.

To fix:
  1. Open Claude Code → Settings → Connectors
  2. Connect the Figma MCP (https://mcp.figma.com/mcp)
  3. Ensure your Figma account has Viewer access on the project files
  4. Re-run: /startup

Pipeline cannot proceed until Figma MCP is connected.
```

`startupComplete` must remain `false` until Figma is connected.

---

## Step 4 — Project Configuration

> Only run after Steps 1–3 have all reported a result.

Display a banner before starting:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Technical Lead Agent — Project Configuration
  4 inputs required. Type your value and press Enter.
  Type `skip` to leave any input blank for now.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Collect each input one at a time. Validate before moving on. If validation fails, show the error and offer `retry` or `skip`.

---

### 4.1 — Jira Project Key

**Display:**
```
[1 / 4]  Jira Project Key
──────────────────────────────────────────────────────
The key prefix for epics in this project.
Used to validate epic IDs entered with /lld.

Example: if your epics are PROJ-123, the key is PROJ

Enter project key (or `skip`):
```

**Validation:** 2–10 uppercase alphanumeric characters (e.g. `PROJ`, `ENG`, `ORD`). No spaces.

**On failure:**
```
✗  "<value>" is not a valid Jira project key.
   Must be 2–10 uppercase letters/numbers (e.g. PROJ, ENG).
   Type `retry` to enter again, or `skip`.
```

Record: `jiraProjectKey` — string or `null` on skip.

---

### 4.2 — HLD Confluence Location

**Display:**
```
[2 / 4]  HLD Confluence Location
──────────────────────────────────────────────────────
Where are the High-Level Design (HLD) documents stored
in Confluence? The agent searches here when an epic's
HLD link is missing.

Accepted formats:
  • Full page URL  →  https://yourorg.atlassian.net/wiki/spaces/ENG/pages/123456
  • Space key      →  ENG

Enter URL or space key (or `skip`):
```

**Validation:** Apply **`.claude/skills/confluence-operations/SKILL.md`** Operation 3. Returns `{ valid, input_type, page_id, space_key }`. Display the skill's error message on failure.

**On failure:**
```
✗  Invalid Confluence input.
   Provide a full Confluence URL or a short space key (e.g. ENG).
   Type `retry` to enter again, or `skip`.
```

Record: `hldConfluenceLocation` — validated string or `null` on skip.

---

### 4.3 — GitHub Organisation

**Display:**
```
[3 / 4]  GitHub Organisation
──────────────────────────────────────────────────────
The GitHub organisation that contains all service repos.
Spec files are read directly from GitHub — no local
repo clones required.

Example: if repos are at github.com/my-org/..., enter: my-org

Enter GitHub org name (or `skip`):
```

**Validation:**
1. Must not contain spaces or `https://`
2. Strip any `github.com/` prefix automatically
3. Verify access:
```bash
gh api orgs/<value> --jq '.login'
```

**If org not found:**
```
✗  GitHub org "<value>" could not be accessed.
   Check the org name and ensure `gh auth status` shows you're logged in.
   Type `retry` to enter again, or `skip`.
```

On `skip` → record `null`. Spec reading will be skipped for this run.

Record: `githubOrg` — string or `null` on skip.

---

### 4.4 — GitHub Base Branch

**Display:**
```
[4 / 4]  GitHub Base Branch
──────────────────────────────────────────────────────
The branch to read spec files from on GitHub.
This should be your main/trunk branch.

Common values: main, master, develop

Enter branch name (or `skip` to default to "main"):
```

**Validation:**
1. Must not be empty or contain spaces
2. No `..`, no leading `/`, no trailing `.lock`

**On invalid format:**
```
✗  "<value>" is not a valid branch name.
   Type `retry` to enter again, or `skip` to use "main".
```

On `skip` → default to `"main"`.

Record: `githubBaseBranch` — string, never null, defaults to `"main"`.

---

### 4.5 — Configuration Summary & Confirm

Display before writing anything:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Configuration Summary — please confirm
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Jira Project Key          <value or not set>
  HLD Confluence Location   <value or not set>
  GitHub Organisation       <value or not set>
  GitHub Base Branch        <value>

  Type `confirm` to save, or `edit <1-4>` to change a value.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

- `confirm` → proceed to memory writing
- `edit 1` / `edit 2` / `edit 3` / `edit 4` → re-run that sub-step, then re-display the summary
- After any edit, re-display the full summary table

---

## Memory Output

Write two memory files to `.claude/memory/`.

---

### File 1 — `.claude/memory/project_startup_status.md`

```markdown
---
name: Project Startup Status
description: Environment check results and startup gate. Read by Orchestrator before every /lld run.
type: project
---

## Startup Result

- **startupComplete:** <true | false>
- **completedAt:** <ISO date YYYY-MM-DD>

## Environment Checks

| Check | Status | Notes |
|---|---|---|
| GitHub CLI (gh) | <Installed + Authenticated \| BLOCKED: not installed \| BLOCKED: not authenticated> | <detail> |
| GitHub org access | <Accessible: <org> \| Not accessible \| Not set> | <detail> |
| Jira access | <Connected \| Unavailable — BLOCKED> | <detail> |
| Confluence access | <Connected \| Unavailable — degraded> | <detail> |
| Figma access | <Connected \| Unavailable — BLOCKED> | <detail> |

## Blockers

<Bullet list of each blocker, or "None".>

## Warnings

<Bullet list of warnings (degraded features), or "None".>
```

**`startupComplete: true`** only when ALL of the following are true:
- `ghCliStatus: installed` AND `ghAuthStatus: authenticated`
- `jiraStatus: connected`
- `figmaStatus: connected`

**`startupComplete: false`** if any blocker remains. Confluence unavailability is a **warning** — it does not block `startupComplete`. Figma unavailability and GitHub CLI issues **are blockers**.

---

### File 2 — `.claude/memory/project_config.md`

```markdown
---
name: Project Configuration
description: User-confirmed project settings. Read by all agents.
type: project
---

## Configuration

| Setting | Value |
|---|---|
| Jira Project Key | <value or `not set`> |
| HLD Confluence Location | <value or `not set`> |
| GitHub Organisation | <org name or `not set`> |
| GitHub Base Branch | <branch name> |

## How Each Agent Uses This

- **Jira Project Key** — Orchestrator validates `/lld <EPIC_ID>` prefix matches
- **HLD Confluence Location** — Confluence reader fallback search when HLD not linked on epic
- **GitHub Organisation** — Used by spec-reader-agent and service-identifier-agent to query repos via `gh` CLI
- **GitHub Base Branch** — Branch spec files are read from on every `/lld` run
```

---

### Update `.claude/memory/MEMORY.md`

Add or update these entries in the index:

```markdown
- [Project Startup Status](.claude/memory/project_startup_status.md) — startup gate: GitHub CLI, Jira/Confluence/Figma access
- [Project Configuration](.claude/memory/project_config.md) — Jira project key, HLD Confluence location, GitHub org and base branch
```

---

## Reporting Back to the Orchestrator

Return a structured summary:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Startup Agent — [COMPLETE | BLOCKED]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  GitHub CLI      [Installed + Authenticated | BLOCKED: <reason>]
  GitHub Org      [Accessible: <org> | Not accessible | Not set]
  Jira            [Connected | Unavailable — BLOCKED]
  Confluence      [Connected | Unavailable — degraded mode]
  Figma           [Connected | Unavailable — BLOCKED]

  Project Config:
    Jira Project Key          <value | not set>
    HLD Confluence Location   <value | not set>
    GitHub Organisation       <value | not set>
    GitHub Base Branch        <branch>

  startupComplete: <true | false>

  Memory written:
    .claude/memory/project_startup_status.md
    .claude/memory/project_config.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

If `startupComplete: false`: list each blocker explicitly and tell the user what must be resolved before `/lld` runs can proceed.

---


---

## Notify Skill

At the end of this agent's execution, invoke the Notify Skill (`.claude/skills/notify-skill/SKILL.md`):

Follow `.claude/skills/notify-skill/SKILL.md` exactly — two steps every time:

**Step 1 — Desktop toast:**
```bash
bash .claude/scripts/notify.sh "Startup Agent" "<Status>" "<Summary>"
```

**Step 2 — Push notification (always runs after Step 1, regardless of toast outcome):**
```
PushNotification
  message: "Startup Agent — <Status>: <Summary>"
  status: "proactive"
```

Keep the push message under 200 characters. If either step fails, log and continue — notifications never block the pipeline.

**Summary examples for this agent:**

| Status | Example Summary |
|--------|----------------|
| Completed | Environment verified. GitHub CLI, Jira, and Figma connected. Ready for LLD runs. |
| Blocked | {N} blocker(s) found — {first_blocker}. Resolve before running /lld. |

Follow the summary authoring rules in the skill file:
- 1–2 sentences, past tense, plain text, no markdown
- `Completed`: state the key output
- `Blocked`: state the blocker and what is needed
- `Failed`: state what failed in plain terms

Failure of the notify script does **not** block the workflow — log and continue.

---


## Rules

1. Run Steps 1–3 in full before presenting configuration inputs — never prompt mid-check
2. Never abort early on a single check failure — collect all results, then report
3. Never write memory files until the user types `confirm` on the configuration summary
4. `startupComplete: true` is the unlock for all `/lld` runs — set it accurately
5. Re-run this agent (and reset `startupComplete: false`) only on explicit `/startup` command or when GitHub org changes
