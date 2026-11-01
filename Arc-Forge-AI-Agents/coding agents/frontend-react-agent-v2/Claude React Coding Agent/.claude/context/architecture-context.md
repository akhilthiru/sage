# Architecture Context

This file describes the codebase structure, component inventory, and search strategy for this project. Load it whenever research, planning, or implementation guidance is needed. It is independent of any specific pipeline phase or workflow.

---

## Component & Package Selection Priority

Before recommending or creating anything new, resolve in this order:

1. **Kendo UI (`@ui-kit`)** — grids, modals, inputs, dropdowns, date pickers, tooltips. Check the Kendo React catalogue before anything else.
2. **Shared library (`src/shared/components/`, `src/shared/hooks/`)** — existing shared components and hooks.
3. **External npm package** — only if neither of the above covers the requirement. Must have a permitted open-source license (MIT, Apache-2.0, BSD, ISC — no GPL, commercial, or demo) and must be lightweight (prefer under 10KB gzipped, tree-shakeable). Document the justification.

---

## Codebase Search Guide

Use Glob and Grep to locate existing implementations before recommending new ones.

| What you need | Where to look |
|---------------|---------------|
| UI components | `@ui-kit` first, then `src/features/` similar features |
| Shared components | `src/shared/components/` |
| Data grid or modal | `@ui-kit` — `PxDataGrid`, `PxDialogModal` always preferred |
| Hooks for data | `src/features/*/api/hooks/`, `src/shared/hooks/` |
| Query key factories | `src/features/*/api/hooks/*-keys.ts` |
| Zustand stores | `src/shared/stores/hooks/` |
| SignalR hooks | `src/shared/hooks/useSignalR*` |
| Existing locale keys | locale files listed in `project-config.md` |
| Permission constants | `src/shared/constants/permissions*` |
| Service endpoint constants | `src/shared/constants/env-config*` |

Document each finding as one of:
- **Reuse**: `Use PxDataGrid from @ui-kit for the listing` (with import path)
- **Extend**: `Extend useCustomerMajorUnitQueries.ts to add a new filter param`
- **New**: `New component required — no existing equivalent found`

---

## Git History Investigation

For any file expected to be modified:

```bash
git log --oneline -20 -- <filepath>
```

Use this to understand:
- Why recent changes were made
- Whether any patterns were intentionally chosen (do not "fix" deliberate decisions)
- Which conventions have been established in this area

---

## Implementation Plan Template

When producing an implementation plan, use this structure. It serves as the binding contract for whoever implements the feature — be specific about file names and paths.

```markdown
### Feature Folder
`src/features/<feature-name>/`

### Files to Create
| File | Purpose |
|------|---------|
| `screens/<ScreenName>/<ScreenName>.tsx` | Main screen component |
| `api/<feature>-service.ts` | API functions |
| `api/hooks/<feature>-keys.ts` | TanStack Query key factory |
| `api/hooks/use<Feature>Queries.ts` | Query hooks |
| `interfaces/<feature>-interfaces.ts` | TypeScript interfaces |

### Files to Modify
| File | Change |
|------|--------|
| `<locale EN path from project-config.md>` | Add <N> new locale keys |
| `<locale DE path from project-config.md>` | Same keys (translated) |
| `<locale RU path from project-config.md>` | Same keys (translated) |
| `<tab-definitions-file>` | Register new screen |

### Reusable Components Found
| Component / Hook | Source | How Used |
|-----------------|--------|----------|
| `PxDataGrid` | `@ui-kit` | Listing view |
| `useSignalREvent` | `@hooks/useSignalREvent` | Real-time updates |
| (list all found, or state "None applicable") | | |

### New Locale Keys Required
| Key | English Value |
|-----|--------------|
| `myFeatureListTitle` | "My Feature" |
| (list all) | |

### State Management Approach
<Describe which stores are involved, if any new store is needed, and why>

### API Endpoints
<List the service endpoints this feature will call, based on envConfig constants>

### Feature Flag
<Name of the feature flag to create for this feature>

### Submodule Impact
<"None" or "Yes — changes required in src/shared/ because...">

### Test Cases to Cover
- <Test scenario 1>
- <Test scenario 2>

### Estimated Complexity
Low | Medium | High — <one sentence justification>
```

---

## Planning Rules

- Never recommend a new component when an existing shared one covers the use case
- Never recommend inline query keys — always use the key factory pattern
- If `src/shared/` needs changes, explicitly flag `Submodule Impact: Yes`
- Be specific about file names and paths in the plan — vague plans produce inconsistent implementations
- Do not write feature code during planning — only research and document
