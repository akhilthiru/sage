---
mode: 'agent'
tools: ['codebase', 'file', 'terminal', 'changes', 'bash', 'filesystem']
description: 'Phase 4b — Performance review. Scans the branch diff for bundle, rendering, and query performance violations specific to the TPS DMS stack.'
---

**Role**: You are a React Senior Developer.

# Phase 4b — Performance Review

Load `#file:.github/rules/project-config.md` before executing. Use the **Tech Stack** section for the PxDataGrid component name, large library identifiers, and Zustand store naming patterns.

**Ticket ID**: ${input:ticketId:Jira ticket ID — e.g. PHNX-1234}

Read the state file at `.github/output/pipeline-state/${input:ticketId}-state.yml` to get the branch name before starting.

---

## How to report

Collect results from all checks before reporting. Do NOT stop at the first finding.

**Violations** (blocking — must fix before proceeding):
List each with file, line, and what to change.

**Warnings** (non-blocking — noted in PR description):
Pipeline continues automatically. Phase 7 includes them in the PR's Notes for Reviewers.

---

## Instructions

### Step 0: Complexity gate

Before running any checks, assess the change scope:

```bash
git diff {baseBranch} --name-only -- "*.ts" "*.tsx"
```

Count changed files and scan for performance-sensitive patterns:

```bash
git diff {baseBranch} -- "*.ts" "*.tsx" | grep -cE "useQuery|useInfiniteQuery|useSignalR|import .+ from '(lodash|date-fns|moment|rxjs|@mui|antd)|useMyFeatureStore\(\)"
```

**Auto-skip if ALL of the following are true:**
- Changed files ≤ 3
- Zero matches for the grep above (no new queries, hooks, SignalR, large library imports, or store subscriptions)

If skipping:
```
✅ Performance review skipped — trivial change (≤3 files, no performance-sensitive patterns)
```
Update state and proceed to Final Rebase Health.

### Step 1: Get the diff scope

```bash
git diff {baseBranch} --name-only -- "*.ts" "*.tsx"
```

If `submoduleFlag: true`, also include submodule changes:

```bash
git -C src/shared diff {baseBranch}...feature/${input:ticketId}-shared --name-only -- "*.ts" "*.tsx"
```

Work only on files in this diff.

### Check 1 — Non-tree-shakeable imports (Violation)

Scan changed files for barrel imports of large libraries.

**Flag as violation:**
```typescript
import _ from 'lodash'
import { debounce, throttle } from 'lodash'
import * as dateFns from 'date-fns'
```

**Expected fix:**
```typescript
import debounce from 'lodash/debounce'
import { format } from 'date-fns'
```

Libraries to flag if imported as a barrel: `lodash`, `moment`, `date-fns`, `ramda`, `rxjs`, `@mui/material`, `antd`.

### Check 2 — Whole-store Zustand subscriptions (Violation)

**Flag as violation:**
```typescript
const store = useMyFeatureStore()
const { data, isLoading, setData } = useMyFeatureStore()
```

**Expected fix:**
```typescript
const data = useMyFeatureStore(s => s.data)
const isLoading = useMyFeatureStore(s => s.isLoading)
```

Exception: acceptable in a parent/screen-root component that already re-renders for other reasons. Flag only in leaf components or expensive-render components.

### Check 3 — SignalR connection cleanup (Violation)

Scan changed files for `.on(` calls without a corresponding `.off(` in the same component or hook.

The shared hooks (`useSignalRSubscription`, `useSignalREvent`) handle cleanup automatically — flag only custom SignalR implementations that manually call `hubConnection.on()` without a matching `hubConnection.off()`.

### Check 4 — TanStack Query: missing staleTime (Warning)

**Flag as warning** if `useQuery` or `useInfiniteQuery` has no `staleTime`:
```typescript
// ⚠️ will refetch on every mount
useQuery({ queryKey: myKeys.list(), queryFn: fetchList })

// ✅
useQuery({ queryKey: myKeys.list(), queryFn: fetchList, staleTime: 30_000 })
```

Mutations and SignalR-driven real-time data are exempt.

### Check 5 — Overly broad query invalidation (Warning)

**Flag as warning:**
```typescript
queryClient.invalidateQueries({ queryKey: [] })
queryClient.invalidateQueries()
queryClient.invalidateQueries({ queryKey: myFeatureKeys.all() })
```

**Expected fix:**
```typescript
queryClient.invalidateQueries({ queryKey: myFeatureKeys.list() })
queryClient.invalidateQueries({ queryKey: myFeatureKeys.detail(id) })
```

### Check 6 — PxDataGrid without virtual scrolling (Warning)

**Flag as warning** if `<PxDataGrid>` is used without `scrollable="virtual"` on a data source that could exceed 50 rows:
```tsx
// ⚠️
<PxDataGrid data={items} />

// ✅
<PxDataGrid data={items} scrollable="virtual" rowHeight={40} />
```

Exception: tables explicitly limited to a small fixed dataset.

### Check 7 — Unstable props causing memo bypass (Warning)

**Flag as warning** when object/array literals or inline arrow functions are passed to a `React.memo`-wrapped child or a known heavy renderer (`PxDataGrid`, `PxDialogModal`):

```tsx
// ⚠️
<ChildComponent config={{ pageSize: 20 }} onChange={(val) => handleChange(val)} />

// ✅
const config = useMemo(() => ({ pageSize: 20 }), [])
const handleChangeMemo = useCallback((val) => handleChange(val), [handleChange])
<ChildComponent config={config} onChange={handleChangeMemo} />
```

### Step 2: Report findings

**If violations found:**
```
🚫 Performance violations — pipeline paused

[For each violation:]
  File: <path>:<line>
  Issue: <what was found>
  Fix: <what to change>

Fix these issues and re-run phase-4b-performance.
```

**If only warnings or fully clean:**
```
✅ Performance review complete

[If warnings:]
⚠️ Warnings (non-blocking — will be noted in PR):
  - <file>:<line> — <warning description>

Proceeding to Test Writer.
```

### Step 3: Update state

Update `.github/output/pipeline-state/${input:ticketId}-state.yml`:
- `completedPhases`: add `"4b"`
- `performanceWarnings`: array of warning strings (empty array if clean)
- `lastUpdatedAt`: current ISO timestamp
