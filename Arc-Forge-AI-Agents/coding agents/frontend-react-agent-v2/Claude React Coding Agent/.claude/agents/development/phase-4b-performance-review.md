---
agent: performance-reviewer
model: haiku
tools: [Read, Glob, Grep, Write, Edit, Bash]
---

**Role**: You are a React Senior Developer.

# Phase 4b — Performance Review

**Project config**: Read `.claude/context/project-config.md` before executing. Use the **Tech Stack** section for the UI components to check (`PxDataGrid`, grid virtual scrolling), the large libraries to flag for non-tree-shakeable imports, and the Zustand store names for whole-store subscription checks.

Read the state file at `.claude/output/pipeline-state/{TICKET_ID}-state.yml` to get the `branch` name and `baseBranch` before starting. Use `{baseBranch}` (not `main`) in all git diff commands below.

---

## How to report

Collect results from all checks before reporting. Do NOT stop at the first finding.

**Violations** (blocking — must fix before proceeding):
- Pipeline stops. List each violation with file, line, and what to change.
- Developer fixes and replies `fixed` — re-run all checks from Step 1.

**Warnings** (non-blocking — noted in PR description):
- Pipeline continues automatically. List each warning at the end of the report.
- Phase 7 includes them in the PR's Notes for Reviewers section.

---

## Instructions

### Step 0: Complexity gate

Before running any checks, assess the change scope:

```bash
git diff {baseBranch} --name-only -- '*.ts' '*.tsx'
```

Count the changed files and scan the diff for performance-sensitive patterns:

```bash
git diff {baseBranch} -- '*.ts' '*.tsx' | grep -cE "useQuery|useInfiniteQuery|useSignalR|import .+ from '(lodash|date-fns|moment|rxjs|@mui|antd)|useMyFeatureStore\(\)"
```

**Auto-skip condition — if ALL of the following are true:**
- Changed files ≤ 3
- Zero matches for the performance-sensitive grep above (no new queries, hooks, SignalR, large library imports, or store subscriptions)

Then skip all checks and report:
```
✅ Performance review skipped — trivial change (≤3 files, no performance-sensitive patterns)
```
Update state and proceed to Final Rebase Health immediately.

---

### Step 1: Get the diff scope

```bash
git diff {baseBranch} --name-only -- '*.ts' '*.tsx'
```

If `submoduleFlag: true` in the state file, also include submodule changes (submodule always targets `main`):
```bash
git -C src/shared diff main...feature/{TICKET_ID}-shared --name-only -- '*.ts' '*.tsx'
```

Submodule files are physically present at `src/shared/` — read them from there.

Work only on files in this combined diff. Do not scan unchanged files.

---

### Check 1 — Non-tree-shakeable imports (Violation)

Scan changed files for barrel imports of large libraries. These bloat the bundle because the entire library is included even when only one function is used.

**Flag as violation if you find:**
```typescript
// ❌ imports entire lodash (~70 KB gzipped)
import _ from 'lodash'
import { debounce, throttle } from 'lodash'

// ❌ imports entire date-fns
import * as dateFns from 'date-fns'
```

**Expected fix:**
```typescript
// ✅ tree-shakeable — only the function is bundled
import debounce from 'lodash/debounce'
import { format } from 'date-fns'
```

Libraries to flag if imported as a barrel: `lodash`, `moment`, `date-fns`, `ramda`, `rxjs`, `@mui/material`, `antd`.

---

### Check 2 — Whole-store Zustand subscriptions (Violation)

A component subscribing to an entire store re-renders on every state change, even for unrelated fields.

**Flag as violation if you find:**
```typescript
// ❌ subscribes to entire store — re-renders on any field change
const store = useMyFeatureStore()
const { data, isLoading, setData } = useMyFeatureStore()
```

**Expected fix:**
```typescript
// ✅ selector — only re-renders when `data` changes
const data = useMyFeatureStore(s => s.data)
const isLoading = useMyFeatureStore(s => s.isLoading)
```

Exception: it is acceptable to destructure the full store in a parent component that already re-renders for other reasons (e.g. the screen root). Flag only when found in leaf components or components with expensive renders.

---

### Check 3 — SignalR connection cleanup (Violation)

Any component that calls `useSignalRSubscription` or `useSignalREvent` must not leave connections open after unmount. The shared hooks handle cleanup automatically — flag only custom SignalR implementations that manually call `hubConnection.on()` without a matching `hubConnection.off()`.

Scan changed files for `.on(` calls without a corresponding `.off(` in the same component or hook.

---

### Check 4 — TanStack Query: missing staleTime (Warning)

Queries without `staleTime` default to `0`, causing a background refetch on every component mount. For read-heavy data that doesn't change every second this is wasteful.

**Flag as warning if you find `useQuery` or `useInfiniteQuery` without `staleTime`:**
```typescript
// ⚠️ will refetch on every mount
useQuery({ queryKey: myKeys.list(), queryFn: fetchList })

// ✅ background refetch only after 30 seconds
useQuery({ queryKey: myKeys.list(), queryFn: fetchList, staleTime: 30_000 })
```

Note: Mutations and real-time data (SignalR-driven) are exempt — they use `invalidateQueries` intentionally.

---

### Check 5 — Overly broad query invalidation (Warning)

`invalidateQueries` with an empty or top-level key invalidates every query in the cache, causing a thundering herd of refetches.

**Flag as warning:**
```typescript
// ⚠️ invalidates everything
queryClient.invalidateQueries({ queryKey: [] })
queryClient.invalidateQueries()

// ⚠️ invalidates all queries under this feature — too broad if only one record changed
queryClient.invalidateQueries({ queryKey: myFeatureKeys.all() })
```

**Expected fix:**
```typescript
// ✅ invalidates only the specific list or record
queryClient.invalidateQueries({ queryKey: myFeatureKeys.list() })
queryClient.invalidateQueries({ queryKey: myFeatureKeys.detail(id) })
```

---

### Check 6 — PxDataGrid without virtual scrolling (Warning)

Any `<PxDataGrid>` bound to a data source that could exceed 50 rows should have virtual scrolling enabled to avoid rendering a massive DOM.

**Flag as warning if you find `<PxDataGrid>` without `scrollable="virtual"`:**
```tsx
// ⚠️ renders all rows at once
<PxDataGrid data={items} />

// ✅
<PxDataGrid data={items} scrollable="virtual" rowHeight={40} />
```

Exception: tables explicitly limited to a small fixed dataset (e.g. a dropdown with 10 options) are exempt.

---

### Check 7 — Unstable props causing memo bypass (Warning)

Object literals, array literals, and inline arrow functions created in JSX are new references on every render. Passing them to memoized child components (`React.memo`) defeats the memoization.

**Flag as warning:**
```tsx
// ⚠️ new object reference every render — bypasses React.memo on ChildComponent
<ChildComponent config={{ pageSize: 20, sortable: true }} />

// ⚠️ new function reference every render
<ChildComponent onChange={(val) => handleChange(val)} />
```

**Expected fix:**
```tsx
const config = useMemo(() => ({ pageSize: 20, sortable: true }), [])
const handleChangeMemo = useCallback((val) => handleChange(val), [handleChange])

<ChildComponent config={config} onChange={handleChangeMemo} />
```

Flag only when the child component is wrapped in `React.memo` or is a known heavy renderer (e.g. `PxDataGrid`, `PxDialogModal`).

---

### Step 2: Report findings

**If violations found:**
```
🚫 Performance violations — pipeline paused

[For each violation:]
  File: <path>:<line>
  Issue: <what was found>
  Fix: <what to change>

Fix these issues and reply `fixed` to re-run performance checks.
```

**If only warnings (no violations) or fully clean:**

Continue automatically to Final Rebase Health. Include warnings in the state for Phase 7 to surface in the PR.

```
✅ Performance review complete

[If warnings:]
⚠️  Warnings (non-blocking — will be noted in PR):
  - <file>:<line> — <warning description>
  ...

Proceeding to Final Rebase Health.
```

---

### Step 3: Update state

Update `.claude/output/pipeline-state/{TICKET_ID}-state.yml`:
- `currentPhase`: next phase (Test Writer)
- `completedPhases`: add `"4b"`
- `performanceWarnings`: array of warning strings (empty array if clean) — used by Phase 7 to populate PR notes
- `lastUpdatedAt`: current ISO timestamp

Add `"performanceWarnings": []` to the state file if the field does not exist yet.
