---
mode: 'agent'
tools: ['codebase', 'file', 'terminal', 'changes', 'bash', 'filesystem']
description: 'Phase 4 — Full code review against TPS DMS coding standards. Fixes failures directly; surfaces warnings to the developer.'
---

**Role**: You are a React Senior Developer.

# Phase 4 — Code Review

Load `#file:.github/rules/project-config.md` and `#file:.github/rules/coding-standards.md` before reviewing. `project-config.md` provides project-specific identifiers (locale paths, features folder). `coding-standards.md` contains all 18 mandatory rules, architecture patterns, and the full checklist.

**Ticket ID**: ${input:ticketId:Jira ticket ID — e.g. PHNX-1234}

---

## Instructions

### Step 1: Get the diff

```bash
git diff {baseBranch}...HEAD --name-only
```

Read the state file at `.github/output/pipeline-state/${input:ticketId}-state.yml`. If `submoduleFlag: true`, also include:

```bash
git -C src/shared diff {baseBranch}...feature/${input:ticketId}-shared --name-only
```

Submodule files are physically present at `src/shared/` — read them from there.

Review **all** changed files against the full standards below.

### Step 2: Run through this checklist for every changed file

**Mandatory Standards (18 rules)**
- [ ] No `any` TypeScript type used
- [ ] No `console.log`, `debugger`, `TODO`, or `FIXME`
- [ ] Path aliases used — no `../../` cross-boundary imports
- [ ] Feature flags via `features?.flagName` with optional chaining
- [ ] No Zustand store created for single-feature use — use `useState` or TanStack Query instead
- [ ] If a new Zustand store exists: confirm data is genuinely shared across multiple modules AND no existing global store (`useGlobalStore`, `useFeatureStore`, `useSignalRStore`) could have been reused
- [ ] Any new Zustand store uses `createStore` factory — no raw `create()`
- [ ] TanStack Query key factory used — no raw string query keys
- [ ] All 3 locale files updated together with globally unique camelCase keys
- [ ] Toast notifications via `useToastStore` only
- [ ] Lazy-loaded screens wrapped in `TabErrorBoundary` + `Suspense`
- [ ] Context values memoized with `useMemo`, functions with `useCallback`
- [ ] `PxDataGrid` and `PxDialogModal` from `@ui-kit` for grids and modals
- [ ] Correct feature folder structure followed
- [ ] SignalR uses the correct hook for each concern (`useSignalR` / `useSignalRSubscription` / `useSignalREvent`)
- [ ] Service endpoints via `envConfig` — not `import.meta.env` directly
- [ ] Permission constants from `src/shared/constants/permission.ts` — no string literals
- [ ] Null safety — destructuring with defaults, optional chaining
- [ ] No hardcoded user-facing text — all via `t()`
- [ ] Currency/date/number formatting via `useLocalization()` hook

**Package & Dependencies**
- [ ] No new package that duplicates Kendo UI (`@ui-kit`) or shared library functionality
- [ ] Any new external package has a permitted licence (MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC) — no GPL, LGPL, commercial, demo, or trial
- [ ] External package imports use tree-shaking-friendly subpath imports — no whole-library imports for a single function

**Architecture & Patterns**
- [ ] No duplicate components — existing shared components used where applicable
- [ ] `columns` defined as typed `const` — not inline in JSX for PxDataGrid
- [ ] `isLoading` from TanStack Query — no separate loading boolean
- [ ] Modal state in parent component or Zustand store — not inside the modal
- [ ] `useCallback` wrapping event handlers passed as props
- [ ] Specific hook dependencies — not entire objects in dependency arrays
- [ ] Query/mutation hooks in `api/hooks/` — not inline in components
- [ ] `invalidateQueries` uses key factory — not raw strings
- [ ] Tab labels use `i18next.t.bind(i18next, 'key')` — not plain strings
- [ ] Screen-level tabs: `title` as ReactNode with `<Trans>`, `content` as direct component reference
- [ ] `useSignalR` only at app level — not inside feature components
- [ ] SignalR event handlers wrapped in `useCallback`

**Locale**
- [ ] All new locale keys exist in `en.json`, `de.json`, and `ru.json`
- [ ] No near-duplicate keys — existing keys reused where appropriate
- [ ] No dot-separated or nested locale keys

### Step 3: Classify findings

**Failures** (blocking — must fix before PR):
- Any violation of the 18 mandatory standards
- Missing locale keys in any of the 3 files
- Duplicate component that should use an existing shared one
- Raw string query keys or permission literals
- New package that duplicates Kendo UI or shared library functionality
- New package with a non-permitted licence
- Whole-library import where a subpath import was required

**Warnings** (non-blocking — surface to developer):
- Missing `aria-label` or accessibility attributes
- `useCallback` missing on a handler that could cause unnecessary re-renders
- Minor style or naming inconsistencies not covered by ESLint

### Step 4: Act on findings

**If failures exist:**
- Fix them directly in the code
- Re-run the checklist on the fixed files
- If fixing requires significant structural changes, loop back to Phase 2 via the orchestrator

**If only warnings exist:**
- Do not fix them — surface them to the developer via the orchestrator (Surface Warnings gate)

**If clean:**
- Proceed directly to Phase 5 (Test Writer)

### Step 5: Update state

Update `.github/output/pipeline-state/${input:ticketId}-state.yml`:
- `currentPhase`: `5` (or `"WARNINGS"` if warnings exist)
- `completedPhases`: add `4`
- `lastUpdatedAt`: current ISO timestamp
