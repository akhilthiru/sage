# Implementation Context

This file contains the implementation order, key code patterns, and hard rules for this project. Load it whenever writing feature or bug-fix code. It is independent of any specific pipeline phase or workflow.

For the full set of mandatory rules and architecture standards, also load `.claude/context/coding-standards.md`.

---

## Implementation Order

Follow this sequence to minimise broken intermediate states:

1. Interfaces and types (`interfaces/<feature>-interfaces.ts`)
2. Validation schemas (`schema/<feature>-schema.ts`)
3. Service functions (`api/<feature>-service.ts`)
4. Query key factory (`api/hooks/<feature>-keys.ts`)
5. Query and mutation hooks (`api/hooks/use<Feature>*.ts`)
6. Zustand store — **only** if non-server state must be shared across multiple feature modules AND no existing global store fits. Decision order: `useState` → TanStack Query → reuse existing store → new store as last resort
7. Screen component and sub-components
8. Locale keys (all locale files simultaneously — see `project-config.md` for paths)
9. Tab definition registration
10. Feature flag guard around new UI

---

## Key Patterns

### TanStack Query + Mutation

```typescript
// api/hooks/useMyFeatureCreate.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { myFeatureKeys } from './my-feature-keys';

export const useCreateMyFeature = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToastStore();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: createMyFeature,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: myFeatureKeys.all() });
      showToast.success(t('myFeatureSaveSuccess'));
    },
    onError: () => {
      showToast.error(t('myFeatureSaveError'));
    },
  });
};
```

### Tab Definition

Tabs use direct component references for `content` — not `lazy()`. The `title` field accepts a ReactNode, typically a `<Trans>` wrapper for i18n.

```typescript
import { Trans } from 'react-i18next';
import { ITabDefinition } from '@interfaces/tab.interface';
import { MY_FEATURE_VIEW } from '@/shared/constants/permission';
import MyFeatureList from '@features/my-feature/screens/my-feature-list/MyFeatureList';

export const myFeatureTabs: ITabDefinition[] = [
  {
    id: 'my-feature-list',
    title: <Trans default='My Feature' i18nKey='myFeatureListTitle' />,
    content: <MyFeatureList />,
    path: '/my-feature',
    module: 'my-feature',
    permissionKey: MY_FEATURE_VIEW,
  },
];
```

### Screen with Error Boundary

```tsx
// screens/my-feature-list/MyFeatureList.tsx
import { TabErrorBoundary } from '@components/TabErrorBoundary';
import { Suspense } from 'react';

const MyFeatureListContent = () => {
  const features = useFeatureStore(state => state.features);
  const { data: { items = [] } = {}, isLoading } = useMyFeatureQuery();
  const { t } = useTranslation();

  if (!features?.myNewFeature) return null;

  return (
    <PxDataGrid
      data={items}
      columns={columns}
      isLoading={isLoading}
    />
  );
};

const MyFeatureList = () => (
  <TabErrorBoundary>
    <Suspense fallback={<Loader />}>
      <MyFeatureListContent />
    </Suspense>
  </TabErrorBoundary>
);

export default MyFeatureList;
```

---

## Commit Strategy

Commit after each logical unit of work is complete and passes ESLint (the pre-commit hook runs automatically). Use the commit prefix format from `project-config.md`:

```bash
# Interfaces + schema
feat({TICKET_ID}): add MyFeature interfaces and schema

# API layer
feat({TICKET_ID}): add MyFeature service and query hooks

# UI
feat({TICKET_ID}): implement MyFeature list screen with feature flag

# Locale
feat({TICKET_ID}): add MyFeature locale keys to all locale files
```

If the pre-commit ESLint hook rejects a commit, fix the lint errors and retry — do not use `--no-verify`.

---

## Submodule Rule

If implementation requires changes to any file under the submodule path (see `project-config.md` — **Submodule → Submodule path in parent repo**):
1. Make the changes as needed
2. Flag `submoduleFlag: true` in the pipeline state so the submodule PR chain is handled correctly

Do not create PRs for submodule changes manually — the pipeline handles the PR sequence.

---

## What You Must Not Do

- Do not deviate from file names and paths in the implementation plan without documenting the reason
- Do not inline query keys, toast strings, or permission strings as raw values
- Do not add `console.log` for debugging — remove before committing
- Do not skip adding locale keys to any of the locale files (see `project-config.md` for paths)
- Do not create a Zustand store per feature — use `useState` for local state, TanStack Query for server state
- Do not create a new Zustand store without first checking if an existing global store can hold the data
- Do not create a new Zustand store without the `createStore` factory if one is genuinely needed
- Do not use `any` even as a temporary placeholder
