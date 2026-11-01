# TPS DMS — Coding Standards

This file is the single source of truth for all implementation and code review standards. It is independent of any specific pipeline phase or workflow — load it whenever writing or reviewing code. Every rule here is mandatory unless explicitly marked as a warning.

---

## Mandatory Rules (18 + 1)

These rules apply to every file written or modified. The Code Review agent checks every one of them.

| # | Rule | Quick check |
|---|------|-------------|
| 1 | No `any` TypeScript type | Use `unknown` + narrow, or define a proper interface |
| 2 | No debugging artifacts | No `console.log`, `debugger`, `TODO`, `FIXME` in committed code |
| 3 | Path aliases — no deep relative imports | No `../../` across feature or shared boundaries |
| 4 | Feature flags use optional chaining | `features?.myFlag` — store may not be hydrated on first render |
| 5 | Zustand uses `createStore` factory | Never call `create()` from Zustand directly |
| 6 | TanStack Query key factory | No raw string `queryKey` values anywhere |
| 7 | All 3 locale files updated together | `en.json`, `de.json`, `ru.json` always in the same commit |
| 8 | Toast via `useToastStore` only | Never create a custom toast implementation |
| 9 | Lazy screens wrapped in `TabErrorBoundary` + `Suspense` | Both wrappers required — not one or the other |
| 10 | Context value memoized with `useMemo` | Functions memoized with `useCallback` |
| 11 | `PxDataGrid` and `PxDialogModal` from `@ui-kit` | Never import directly from the shared path |
| 12 | Correct feature folder structure | See Feature Folder Structure section |
| 13 | SignalR — correct hook for each concern | `useSignalR` at app level only |
| 14 | Service endpoints via `envConfig` | Never `import.meta.env` directly in service files |
| 15 | Permission constants — named constants only | Never string literals for permission checks |
| 16 | Null safety — destructure with defaults | Always guard against `null` / `undefined` |
| 17 | No hardcoded user-facing text | All text via `t()` from react-i18next |
| 18 | Currency/date/number via `useLocalization()` | Never format manually in components |
| 19 | Test execution — `--changed main` only | Never run full suite in the pipeline |

---

## TypeScript Path Aliases

**MANDATORY**: Always use path aliases for cross-boundary imports. Never use `../../` to reach across feature or shared boundaries.

| Alias | Resolves To | Use For |
|-------|------------|--------|
| `@/*` | `src/*` | Any app-level import |
| `@components/*` | `src/shared/components/*` | Shared components |
| `@ui-kit` | `src/shared/components/ui-kit/index.ts` | PxDataGrid, PxDialogModal, etc. |
| `@hooks/*` | `src/shared/hooks/*` | Shared hooks |
| `@utils/*` | `src/shared/utils/*` | Shared utilities |
| `@api/*` | `src/shared/api/*` | Shared API layer |
| `@enums/*` | `src/shared/enums/*` | Shared enums |
| `@interfaces/*` | `src/shared/interfaces/*` | Shared interfaces |
| `@styles/*` | `src/shared/styles/*` | Shared styles |
| `@assets/*` | `src/assets/*` | App assets |
| `@features/*` | `src/features/*` | Feature modules |
| `@pages/*` | `src/pages/*` | Page components |
| `@stores/*` | `src/shared/stores/*` | Zustand stores |

```typescript
// ✅ CORRECT
import { PxDataGrid } from '@ui-kit';
import { useGlobalStore } from '@stores/hooks/useGlobalStore';
import { useToastStore } from '@stores/hooks/useToastStore';

// ❌ WRONG
import { PxDataGrid } from '../../shared/components/ui-kit';
```

---

## File Naming & Folder Structure

| Type | Convention | Example |
|------|------------|---------|
| Folders | kebab-case | `customer-major-units/` |
| React Components | PascalCase | `Button.tsx`, `DealerList.tsx` |
| Non-Components | kebab-case | `date-formatter.ts` |
| Hooks | camelCase with `use` prefix | `useSignalR.ts`, `useLocalStorage.ts` |
| Constants | UPPER_SNAKE_CASE | `API_BASE_URL`, `MAX_RETRIES` |
| Types/Interfaces | PascalCase with prefix | `interface IComponentType`, `type TDataType` |

---

## Feature Folder Structure

Every feature module follows this structure exactly:

```
src/features/<feature-name>/
├── api/
│   ├── <feature>-service.ts              # axios calls
│   └── hooks/
│       ├── <feature>-keys.ts             # TanStack Query key factory
│       ├── use<Feature>Queries.ts        # useQuery hooks
│       ├── use<Feature>Create.ts         # useMutation — create
│       └── use<Feature>Update.ts         # useMutation — update
├── constants/
│   └── <feature>-constants.ts
├── interfaces/
│   └── <feature>-interfaces.ts
├── schema/
│   └── <feature>-schema.ts              # Zod / yup validation schemas
└── screens/
    └── <screen-name>/
        ├── <ScreenName>.tsx
        └── components/                  # Private to this screen only
```

**Rules:**
- Hook files under `hooks/` must use camelCase with `use` prefix — never kebab-case
- `<feature>-keys.ts` is the only non-hook file in `api/hooks/` and keeps kebab-case
- `components/` under a screen is private to that screen
- Components used by multiple screens belong in `src/shared/components/`
- Never create a `components/` folder directly under the feature root

---

## State Management

### React Context API

Use for static or rarely-changing global state (Auth, Feature Flags).

**MANDATORY**: Always memoize the context `value` prop to prevent unnecessary re-renders.

```tsx
// ✅ CORRECT
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const login = useCallback((credentials) => { /* login logic */ }, []);
  const value = useMemo(() => ({ user, login }), [user, login]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ❌ WRONG — inline object causes re-renders on every render
<AuthContext.Provider value={{ user, login }}>
```

Custom hooks must guard against usage outside the provider:

```tsx
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```

### Zustand Store — When to Create One

**Do not create a Zustand store per feature by default.** Follow this decision order before creating any new store:

| Step | Question | If yes → use |
|------|----------|-------------|
| 1 | Is the state used only within a single component? | `useState` / `useReducer` |
| 2 | Is the state data fetched from an API? | TanStack Query |
| 3 | Can an existing global store hold it? | Reuse that store |
| 4 | Must the same non-server state be shared across **multiple feature modules**? | Create a new Zustand store |

**Existing global stores to check before creating anything new:**

| Store | Import | Holds |
|-------|--------|-------|
| `useGlobalStore` | `@stores/hooks/useGlobalStore` | Currency, date format, locale config |
| `useFeatureStore` | `@stores/hooks/useFeatureStore` | Azure App Configuration feature flags |
| `useToastStore` | `@stores/hooks/useToastStore` | In-app notifications |
| `useSignalRStore` | `@stores/hooks/useSignalRStore` | SignalR connection state |

```typescript
// ✅ CORRECT — reuse global store instead of creating a feature store
const config = useGlobalStore(state => state.config);

// ❌ WRONG — new store for data used only within one feature
export const useMyFeatureStore = createStore<MyState>(...);
// Use useState or TanStack Query instead
```

**A new store is justified only when:**
- The data is not server-fetched (not suitable for TanStack Query)
- The data must be shared across at least two separate feature modules
- No existing global store is an appropriate fit

### Zustand Store Factory Pattern

When a new store is genuinely required, use the shared `createStore` factory from `@stores/utils/createStore` with `persist` middleware and `secureStorage`. Never call `create()` directly.

```typescript
import { createJSONStorage } from 'zustand/middleware';
import { secureStorage } from '@/shared/utils/secure-storage';
import { createStore } from '@stores/utils/createStore';

interface MyState {
  data: MyData | null;
  setData: (data: MyData) => void;
}

export const useMyStore = createStore<MyState>(
  'my-store-key',          // must be globally unique across the app
  (set) => ({
    data: null,
    setData: (data) => set({ data }),
  }),
  { storage: createJSONStorage(() => secureStorage) }
);
```

**Rules:**
- Store key must be globally unique
- Do not store raw tokens or PII in state (it is persisted in secureStorage)
- Always use selector functions — never subscribe to the whole store:

```typescript
// ✅ CORRECT — only re-renders when data changes
const data = useMyStore(state => state.data);

// ❌ WRONG — re-renders whenever any store field changes
const store = useMyStore();
```

---

## TanStack Query Patterns

### Key Factory (`*-keys.ts`)

Every feature with API calls must define a `*-keys.ts` file. Keys are typed functions, not raw strings.

```typescript
// api/hooks/customer-major-unit-keys.ts
export const customerMajorUnitKeys = {
  all: () => ['customerMajorUnit'] as const,
  list: (filters?: object) => [...customerMajorUnitKeys.all(), 'list', filters] as const,
  detail: (id: string) => [...customerMajorUnitKeys.all(), 'detail', id] as const,
};
```

### Query Hooks

```typescript
// api/hooks/useCustomerMajorUnitQueries.ts
export const useCustomerMajorUnitsQuery = (filters: Filters) =>
  useQuery({
    queryKey: customerMajorUnitKeys.list(filters),
    queryFn: () => getCustomerMajorUnits(filters),
    staleTime: 5 * 60 * 1000,  // always set staleTime — prevents refetch on every mount
  });
```

### Mutation Hooks

```typescript
// api/hooks/useCustomerMajorUnitCreate.ts
export const useCreateCustomerMajorUnit = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToastStore();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: createCustomerMajorUnit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerMajorUnitKeys.all() });
      showToast.success(t('customerMajorUnitSaveSuccess'));
    },
    onError: () => {
      showToast.error(t('customerMajorUnitSaveError'));
    },
  });
};
```

**Rules:**
- Query and mutation hooks live in `api/hooks/` — never inline in components
- Use `invalidateQueries` with the key factory — never raw strings
- Scope `invalidateQueries` to the minimum key prefix needed — never invalidate `all` queries unless necessary
- Always set `staleTime` on query hooks — prevents unnecessary refetches on mount
- Destructure only what the component needs: `const { data, isLoading } = useMyQuery()`

---

## UI Components — PxDataGrid & PxDialogModal

Always import from the `@ui-kit` alias:

```typescript
import { PxDataGrid, PxDialogModal } from '@ui-kit';
```

### PxDataGrid

```tsx
<PxDataGrid
  data={items}
  columns={columns}
  isLoading={isLoading}
  onRowClick={handleRowClick}
  actionMenuItems={actionItems}
/>
```

**Rules:**
- Define `columns` as a typed `const` array in the same file or a sibling `*-columns.ts` — never inline in JSX
- Action menu items must use named handler functions — never inline arrow functions
- Pass `isLoading` from TanStack Query — never manage a separate loading boolean
- Enable virtual scrolling for any list that may exceed 50 rows

### PxDialogModal

```tsx
<PxDialogModal
  isOpen={isModalOpen}
  title={t('modal.title')}
  onClose={handleClose}
  onConfirm={handleConfirm}
>
  {/* Modal content */}
</PxDialogModal>
```

**Rules:**
- All modal state (`isOpen`) lives in the parent component or a Zustand store — never inside the modal
- Modal titles and action labels must use `t()` for localization

---

## Routing — Tab Definitions

Tabs use direct component references for `content` — not `lazy()`. The `title` field accepts a ReactNode, typically a `<Trans>` wrapper.

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

**Rules:**
- Use `i18next.t.bind(i18next, 'key')` for route-level tab labels (legacy pattern) — prefer `<Trans>` for screen-level tabs
- Permission constants from `src/shared/constants/` — never hardcoded strings

---

## Toast Notifications

**MANDATORY**: Use `useToastStore` for all notifications. Never create custom toast implementations.

```typescript
import { useToastStore } from '@stores/hooks/useToastStore';

const { showToast } = useToastStore();
showToast.success(t('saveSuccessMessage'));  // in mutation onSuccess
showToast.error(t('saveErrorMessage'));      // in mutation onError
```

**Rules:**
- Toast messages must use `t()` — never hardcoded strings
- Call `showToast` in mutation `onSuccess` / `onError` callbacks — not in component event handlers

---

## Error Boundaries

| Variant | Import | Use For |
|---------|--------|--------|
| `ErrorBoundary` | `@components/error-boundary/ErrorBoundary` | Full page or feature sections |
| `TabErrorBoundary` | `@components/error-boundary/TabErrorBoundary` | Individual tab content |

```tsx
import { TabErrorBoundary } from '@components/error-boundary/TabErrorBoundary';

<TabErrorBoundary>
  <Suspense fallback={<Loader />}>
    <MyLazyScreen />
  </Suspense>
</TabErrorBoundary>
```

**Rules:**
- Every lazy-loaded tab screen must have both `TabErrorBoundary` and `Suspense`
- Top-level app sections must use `ErrorBoundary`
- Do not create custom error boundary classes — use the two shared variants only

---

## Screen Component Pattern

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

## Code Quality Standards

### Single Responsibility

Each component, module, or function must have one clear responsibility. Never mix display logic and form logic in the same component.

### Object Destructuring & Null Safety

**MANDATORY**: Always destructure with default values.

```typescript
// ✅ CORRECT
const { user: { name = '' } = {} } = loginDetails;
const userName = user?.name ?? 'N/A';

// ❌ WRONG
const userName = loginDetails.user.name;
```

Never render `null` or `undefined` directly — guard with conditional rendering or a fallback value.

### Dependency Arrays

Use specific properties as dependencies, not entire objects:

```tsx
// ✅ CORRECT
useEffect(() => { setValue(obj.name); }, [obj.name]);

// ❌ WRONG — entire object causes unnecessary re-renders
useEffect(() => { setValue(obj.name); }, [obj]);
```

### Inline Functions in Props

Avoid anonymous arrow functions as component props — they create a new reference on every render:

```tsx
// ❌ WRONG
<Button onClick={() => handleClick(id)} />

// ✅ CORRECT
const handleButtonClick = useCallback(() => handleClick(id), [id]);
<Button onClick={handleButtonClick} />
```

---

## Performance Standards

### React.memo

Wrap components with `React.memo` when they are pure, re-render frequently due to parent re-renders, and props are stable. Use `useCallback` for prop functions and `useMemo` for expensive computations.

### Zustand Selectors

Always use selectors — never subscribe to the whole store. A component that subscribes to the whole store re-renders on every state change across the app.

### SignalR Cleanup

Always return a cleanup function from effects that open SignalR connections. Failing to close them causes connection leaks.

### Query Scope

Scope `invalidateQueries` to the minimum key prefix. Invalidating too broadly forces every active query to refetch.

### Virtual Scrolling

Enable virtual scrolling on any `PxDataGrid` that may exceed 50 rows. Rendering the full DOM for large lists causes visible slowness.

---

## Localization & Internationalization

### All Text via `t()`

**MANDATORY**: Use `react-i18next` for all user-facing text.

```tsx
const { t } = useTranslation();
return <p>{t('welcomeMessage', { name: userName })}</p>;
// ❌ NEVER: <p>Welcome, {userName}!</p>
```

### useLocalization Hook

**MANDATORY**: Use for all currency, date, and number formatting. Never format manually.

```tsx
const { formatCurrency, formatDate } = useLocalization();
formatCurrency(amount)     // ✅
'$' + amount.toFixed(2)    // ❌
```

### Locale Key Naming Conventions

All translations live in a **single flat file per locale** (`en.json`, `de.json`, `ru.json`). Keys are globally unique camelCase — no dots, no nesting.

```json
// ✅ CORRECT
{
  "majorUnitsOwnedListTitle": "Owned Units",
  "saveButtonLabel": "Save",
  "saveSuccessMessage": "Record saved successfully."
}

// ❌ WRONG — dot-separated keys are not the project standard
{
  "customerMajorUnits.tabs.list": "Owned Units"
}
```

**Rules:**
- All three locale files must be updated in the same commit — never add a key to only one file
- Search existing locale files before adding a new key — reuse over near-duplicates
- Run `npm run locale:check` to catch orphaned keys before raising a PR
- When removing a feature, delete its locale keys from all three files in the same PR

---

## Feature Flags

Feature flags are loaded from the Azure App Configuration API via `useFeatureStore`. There are no local JSON flag files.

```typescript
import { useFeatureStore } from '@stores/hooks/useFeatureStore';

const MyComponent = () => {
  const features = useFeatureStore(state => state.features);
  return <div>{features?.newDashboard && <NewDashboard />}</div>;
};
```

**Rules:**
- Always use optional chaining `features?.flagName` — the store may not be hydrated on first render
- All new UI must be behind a feature flag
- Do not pass flag values as props deep into a component tree — consume from the store directly
- Do not create local fallback JSON files for feature flags

---

## Service Endpoint Constants

API base URLs come from `envConfig`. Never use `import.meta.env` directly in service files.

```typescript
// ✅ CORRECT
import envConfig from '@/shared/constants/env-config';
axiosInstance.get(`${envConfig.userManagementService}/users`);

// ❌ WRONG
axiosInstance.get(`${import.meta.env.VITE_USER_SERVICE}/users`);
```

---

## Sidebar Menu & Permission Constants

Never use string literals for permission checks or sidebar items. Always use named constants from `src/shared/constants/permissions`.

```typescript
import { CUSTOMER_MAJOR_UNITS_VIEW } from '@/shared/constants/permissions';

export const sidebarMenuItems = [
  {
    label: i18next.t('sidebar.customerMajorUnits'),
    route: '/customer-major-units',
    permission: CUSTOMER_MAJOR_UNITS_VIEW,
  },
];
```

---

## SignalR / Real-Time Pattern

Three hooks are available in `src/shared/hooks/`. Use the correct hook for each concern.

| Hook | Purpose |
|------|---------|
| `useSignalR` | Establishes the hub connection — called once at app level only |
| `useSignalRSubscription` | Joins/leaves a SignalR group (Organization or Store level) |
| `useSignalREvent` | Listens to a named event and calls a typed handler |

```typescript
import { SubscriptionLevel } from '@interfaces/signalR.interface';

useSignalRSubscription(SubscriptionLevel.Organization, false, organizationId);

const handleUnitUpdate = useCallback((payload: UnitUpdatePayload) => {
  // handle real-time payload
}, []);

useSignalREvent<UnitUpdatePayload>('UnitStatusChanged', handleUnitUpdate);
```

**Rules:**
- Never call `useSignalR` inside a feature component — app level only
- Always wrap the event handler in `useCallback` before passing to `useSignalREvent`
- Do not use `useWebSocket` for SignalR-backed data — the two transports are separate concerns

---

## Security — Content Security Policy

CSP is applied via React 19's Native Metadata API in `App.tsx`. Do not add inline scripts or styles outside of Vite HMR requirements.

---

## Package & Dependency Rules

### Component Selection Priority

Before adding any external npm package, check in this order:

1. **Kendo UI (`@ui-kit`)** — all UI components must come from here first. Grids, modals, inputs, dropdowns, date pickers, tooltips — check the Kendo React catalogue before anything else.
2. **Shared library (`src/shared/`)** — check for existing hooks, utilities, and components before creating new ones.
3. **External npm package** — only if neither of the above covers the requirement. Must meet the license and weight rules below.

Never add an external package for functionality already available in Kendo UI or the shared library.

### Permitted Licenses

Only packages with the following open-source licenses may be added:

| License | Permitted |
|---------|-----------|
| MIT | ✅ |
| Apache-2.0 | ✅ |
| BSD-2-Clause | ✅ |
| BSD-3-Clause | ✅ |
| ISC | ✅ |
| GPL (any version) | ❌ — copyleft, may require open-sourcing application code |
| LGPL | ❌ — do not add without explicit legal approval |
| AGPL | ❌ |
| Commercial / proprietary | ❌ |
| Demo / trial / evaluation | ❌ |
| CC BY-NC or similar non-commercial | ❌ |

**How to check before installing**: Run `npx license-checker --onlyAllow 'MIT;Apache-2.0;BSD-2-Clause;BSD-3-Clause;ISC'` after `npm install`. If it fails, the package must not be used.

If a package's license is unclear (dual-licensed, custom terms, missing LICENSE file), do not install it — raise the question with the tech lead.

### Package Weight

When an external package is genuinely necessary:

- Check the gzipped bundle size on [bundlephobia.com](https://bundlephobia.com) before installing
- Prefer packages with **ESM exports and tree-shaking support** — check that `package.json` has a `module` or `exports` field
- Import only what is needed — never import an entire library for one function:

```typescript
// ✅ CORRECT — imports only the function needed (~2KB)
import debounce from 'lodash/debounce';

// ❌ WRONG — pulls the entire library (~70KB gzipped)
import { debounce } from 'lodash';
```

- Packages under **10KB gzipped** are preferred
- Packages **10–50KB gzipped** require a comment in the PR explaining why no lighter alternative exists
- Packages **over 50KB gzipped** require explicit tech lead approval before the PR is raised

Do not add a package that duplicates functionality already provided by React, TypeScript, or an existing project dependency (e.g. do not add `axios-retry` if the shared `axiosInstance` already handles retries).

---

## Implementation Order

When implementing a new feature, always follow this sequence:

1. TypeScript interfaces and types
2. Validation schemas (Zod)
3. API service functions
4. TanStack Query key factory
5. Query hooks
6. Mutation hooks
7. Zustand store (only if shared UI state is genuinely needed)
8. Screen component and sub-components
9. Locale keys — all 3 files in the same commit
10. Tab definition registration (if a new route is added)
11. Feature flag guard around all new UI

Commit after each logical unit. The pre-commit ESLint hook runs automatically — fix lint errors before retrying. Never use `--no-verify`.
