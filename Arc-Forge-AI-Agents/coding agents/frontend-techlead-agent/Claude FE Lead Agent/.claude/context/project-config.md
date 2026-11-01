# Project Configuration — Frontend Senior Lead Agent

This file is the **single source of truth for all project-specific values**. Update the **Project Identity** and **Sprint Team** sections when deploying this agent on a new project.

---

## Project Identity

| Key | Value |
|-----|-------|
| **Jira ticket prefix** | `PHNX` |
| **Jira base URL** | `https://harleydavidson.atlassian.net` |
| **Confluence space key** | `TPSPhoenix` |
| **GitHub organization** | `Harley-Davidson-Inc` |
| **GitHub repo** | `tps-dms-app` |

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
| **Sprint plan working files** | `.claude/output/sprint-plan/` |
| **Source root** | `src/` |
| **Features folder** | `src/features/` |
| **Shared folder** | `src/shared/` |

---

## Tech Stack

Used by the Lead Analysis agent to determine which implementation components apply per story type.

| Concern | Value |
|---------|-------|
| **Framework** | React 19 + TypeScript + Vite |
| **UI component library** | Kendo UI via `@ui-kit` alias |
| **State factory** | `createStore` from `@stores/utils/createStore` |
| **Server state** | TanStack Query (key factory pattern) |
| **Real-time transport** | SignalR |
| **Test framework** | Vitest |
| **Coverage threshold** | 80% branch coverage on new files |

---

## Sprint Team

All team members are treated as senior React developers with equivalent productivity. Update this table each sprint if headcount changes.

| Developer | Jira Username | Sprint Capacity (hours) |
|-----------|--------------|------------------------|
| Developer 1 | dev1.name | 60 |
| Developer 2 | dev2.name | 60 |
| Developer 3 | dev3.name | 60 |

> **Per-sprint capacity**: 60 hours assumes a 2-week sprint with ~6 productive hours/day after meetings, reviews, and overhead. Adjust per developer for PTO or part-time availability.

---

## Estimation Baseline

Senior React developer velocity on this stack. Used by the Lead Analysis agent to produce a technical estimation breakdown per story.

**Velocity reference**: 1 story point ≈ 2 hours for a senior developer on this stack.

### Hours per implementation component (by complexity tier)

| Component | Low (1–3 SP) | Medium (4–8 SP) | High (>8 SP) |
|-----------|-------------|----------------|-------------|
| Interfaces & Types | 0.5 | 1 | 2 |
| Validation Schema | 0.5 | 1 | 1.5 |
| API Service | 0.5 | 1.5 | 3 |
| TanStack Query Keys | 0.25 | 0.5 | 0.5 |
| Query / Mutation Hooks | 0.5 | 1.5 | 3 |
| Zustand Store (if needed) | 0 | 1 | 2 |
| Screen Component | 2 | 4 | 8 |
| Sub-components | 0 | 2 | 5 |
| Locale Keys (3 files) | 0.25 | 0.5 | 1 |
| Feature Flag guard | 0.25 | 0.25 | 0.25 |
| Unit Tests (80% coverage) | 1 | 2.5 | 5 |
| PR description + review cycle | 0.5 | 1 | 1.5 |

**Bug fix estimation:**
| Bug complexity | Estimated hours |
|---------------|----------------|
| Low (≤2 SP or no estimate) | 2–4 hours |
| Medium (3–5 SP) | 5–10 hours |
| High (>5 SP) | 12–20 hours |

**Story size thresholds:**
- Stories with `storyPoints > 8` should be flagged for splitting before sprint kickoff.
- Stories with `storyPoints` null are treated as Medium for estimation purposes — flag for product owner to estimate.
