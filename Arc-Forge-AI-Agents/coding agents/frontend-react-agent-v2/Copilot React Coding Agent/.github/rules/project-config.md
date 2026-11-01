# Project Configuration

This file is the **single source of truth for all project-specific values**. When rolling out this pipeline in a new project, swap this file and the other files listed below — all prompt and phase files remain unchanged.

**Files to swap for a new project:**
- `.github/rules/project-config.md` — this file (Jira, Confluence, Git, tech stack)
- `.github/rules/coding-standards.md` — language and framework rules
- `.github/rules/unit-testing-standards.md` — test patterns and coverage targets
- `.github/copilot-instructions.md` — architecture context, folder structure, codebase map

---

## Project Identity

| Key | Value |
|-----|-------|
| **Jira ticket prefix** | `PHNX` |
| **Jira base URL** | `https://harleydavidson.atlassian.net` |
| **Confluence space key** | `TPSPhoenix` |
| **RCA parent page ID** | `2408808451` |
| **RCA parent page name** | `TALON Rev - RCA Documents` |
| **Spec parent page name** | `Frontend Specs` |
| **GitHub organization** | `Harley-Davidson-Inc` |
| **GitHub repo (parent app)** | `tps-dms-app` |

---

## MCP Servers

The health check probes only the servers listed here. Update this table when deploying on a project with different tooling.

| Server key | Role | Required | Probe tool |
|------------|------|----------|------------|
| `atlassian` | Jira (tickets) + Confluence (docs) | **Mandatory** — pipeline cannot start without it | `atlassianUserInfo` |
| `figma` | Design files | Optional — Phase 1 will ask for screenshot/paste fallback if unavailable | `get_figma_data` |
| `filesystem` | State file read/write (pipeline state management) | Optional — pipeline falls back to terminal PowerShell commands if unavailable | `list_directory` with current project path |
| `gitkraken` | Git operations + PR creation | Optional — pipeline falls back to `gh` CLI if unavailable | `get_repository_status` |

---

## Git & Branching

| Key | Value |
|-----|-------|
| **Default base branch** | `main` |
| **Release branch pattern** | `release/X.Y.Z` |
| **Feature branch prefix** | `feature/` |
| **Bug branch prefix** | `bugfix/` |
| **Commit prefix — feature** | `feat({TICKET_ID}):` |
| **Commit prefix — bug fix** | `fix({TICKET_ID}):` |
| **Commit prefix — chore** | `chore({TICKET_ID}):` |
| **Commit prefix — docs** | `docs({TICKET_ID}):` |
| **Commit prefix — test** | `test({TICKET_ID}):` |

---

## Submodule

| Key | Value |
|-----|-------|
| **Submodule enabled** | Yes |
| **Submodule path in parent repo** | `src/shared/` |
| **Submodule repo name** | `tps-dms-ui-shared` |
| **Submodule base branch** | `main` |
| **Submodule feature branch pattern** | `feature/{TICKET_ID}-shared` |

> If this project has no submodule, set **Submodule enabled** to `No`. The pipeline will skip Phase 2b and the submodule PR chain in Phase 7 automatically (via `submoduleFlag: false` in the state file).

---

## Workflow Track Detection

The pipeline auto-detects the track from Jira fix version names. Update the keyword lists below when fix version naming conventions differ.

### Pilot track keywords *(case-insensitive match anywhere in fix version name)*
`Pilot`, `F1`, `F2`, `F3`

No fix version set → also treated as pilot track.
Any `labels` entry containing `pilot` (case-insensitive) → also pilot track.

### Beta track keyword
`Beta` *(case-insensitive match anywhere in fix version name)*

### Hotfix signal
Beta fix version + (`hotfix` label OR priority `Highest` / `Critical`) → `hotfix` workflow.

---

## File Paths

| Artifact | Path |
|----------|------|
| **State files** | `.github/output/pipeline-state/` |
| **Source root** | `src/` |
| **Features folder** | `src/features/` |
| **Shared folder** | `src/shared/` |
| **Locale — English** | `src/i18n/en.json` |
| **Locale — German** | `src/i18n/de.json` |
| **Locale — Russian** | `src/i18n/ru.json` |
| **Primary locale (integrity check)** | `src/i18n/en.json` |
| **Feature test root** | `src/__tests__/features/` |
| **Shared test root** | `src/shared/__tests__/` |
| **Permission constants** | `src/shared/constants/permission.ts` |
| **PR template** | `.github/pull_request_template.md` |

---

## Tech Stack

Update this section when deploying the pipeline on a project with a different stack. These values are used by code review, performance checks, and spec generation.

| Concern | Value |
|---------|-------|
| **Framework** | React 19 + TypeScript + Vite |
| **UI component library** | Kendo UI via `@ui-kit` alias |
| **Primary grid component** | `PxDataGrid` |
| **Primary modal component** | `PxDialogModal` |
| **State factory** | `createStore` from `@stores/utils/createStore` |
| **Global stores** | `useGlobalStore`, `useFeatureStore`, `useToastStore`, `useSignalRStore` |
| **Feature flag provider** | Azure App Configuration via `useFeatureStore` |
| **Localization hook** | `useLocalization()` |
| **Toast hook** | `useToastStore` |
| **Server state** | TanStack Query (key factory pattern) |
| **Real-time transport** | SignalR |
| **Real-time hooks** | `useSignalR`, `useSignalRSubscription`, `useSignalREvent` |
| **Service config source** | `envConfig` from `@/shared/constants/env-config` |
| **Test framework** | Vitest |
| **Coverage threshold** | 80% branch coverage on new files |
| **Feature test project name** | `<feature-folder-name>` (dynamic, matches the feature folder) |
| **Shared test project name** | `shared-ui` |

### Large libraries to flag in performance review (barrel imports are non-tree-shakeable)
`lodash`, `moment`, `date-fns`, `ramda`, `rxjs`, `@mui/material`, `antd`

---

## Pipeline Maintenance

**The following files must all be updated together whenever pipeline commands, phases, MCP servers, npm scripts, or the core tech stack change:**

| File | Role |
|------|------|
| `README.md` | Project quick-start and pipeline overview |
| `.claude/README.md` | Full Claude Code pipeline reference |
| `.github/README.md` | Full Copilot pipeline reference |

Phase 7 (Release Readiness) checks for README staleness before creating any PR.

---
