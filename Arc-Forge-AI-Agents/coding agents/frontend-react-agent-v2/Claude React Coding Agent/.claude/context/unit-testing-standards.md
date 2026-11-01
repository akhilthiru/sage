# TPS DMS — Unit Testing Standards

This file is the single source of truth for all test writing standards. It is independent of any specific pipeline phase or workflow — load it whenever writing or reviewing tests. Tests must reach 80% branch coverage on every new file added during implementation.

---

## Quick Reference

| Rule | Requirement |
|------|------------|
| Test command | `npx vitest run --changed main` — never full suite |
| Coverage check | `npx vitest run --coverage --changed main` or scoped to feature folder — never full `npm run coverage` |
| Coverage threshold | 80% branch coverage on new files |
| Test location | Feature tests: `src/__tests__/features/<feature>/` · Shared tests: `src/shared/__tests__/` |
| QueryClient | Fresh instance per test — `retry: false` always set |
| Mocking approach | `vi.mock` for unit tests; MSW for integration tests |
| Query style | `getByRole` / `findByRole` over `getByTestId` |
| Event simulation | `userEvent` over `fireEvent` for all user interactions |
| Snapshots | Avoid for UI components — test behaviour, not markup |
| Describe structure | One `describe` per file, nested describes for complex scenarios |

---

## Test File Location

The Vitest config (`vite.config.ts`) defines three named test projects. Write tests in the correct location based on what was implemented.

### Feature tests — `src/__tests__/features/<feature-name>/`

Mirror `src/features/<feature-name>/` under `src/__tests__/features/<feature-name>/`:

```
src/
├── features/my-feature/
│   ├── api/hooks/useMyFeatureQueries.ts
│   └── screens/my-feature-list/MyFeatureList.tsx
└── __tests__/
    └── features/
        └── my-feature/
            ├── api/hooks/useMyFeatureQueries.test.ts
            └── screens/MyFeatureList.test.tsx
```

Vitest project name: `my-feature` (matches the feature folder name, created dynamically).

### Shared component tests — `src/shared/__tests__/`

Mirror `src/shared/` under `src/shared/__tests__/`. Used for both parent-repo changes to `src/shared/` **and** changes made directly in the `tps-dms-ui-shared` submodule (the `/shared` workflow):

```
src/shared/
├── components/MySharedComponent/
│   └── MySharedComponent.tsx
├── hooks/useMySharedHook.ts
└── __tests__/
    ├── components/
    │   └── MySharedComponent/
    │       └── MySharedComponent.test.tsx
    └── hooks/
        └── useMySharedHook.test.ts
```

Vitest project name: `shared-ui`.

---

## Test Commands

```bash
# Run tests for a specific feature project (preferred in pipeline — fast and scoped)
npx vitest run --project <feature-name>

# Run tests for shared components
npx vitest run --project shared-ui

# Run tests for changed files only (alternative — works across all projects)
npx vitest run --changed main

# Coverage scoped to a feature project
npx vitest run --coverage --project <feature-name>

# Coverage scoped to shared components
npx vitest run --coverage --project shared-ui

# Coverage scoped to changed files only
npx vitest run --coverage --changed main

# Local watch mode — never use in pipeline
npm run test

# ❌ NEVER use in pipeline — runs full suite across all 50+ modules (60+ minutes)
npm run coverage
```

Use `--project <name>` in the pipeline — it is scoped, fast, and unambiguous. The `--changed main` flag is an acceptable fallback when the project name is not known. Never run the full suite.

---

## Describe Block Structure

Every test file must have a top-level `describe` matching the component or hook name. Use nested `describe` blocks for distinct scenarios.

```typescript
describe('useMyFeatureQuery', () => {
  describe('on success', () => {
    it('returns data in the expected shape', async () => { ... });
  });

  describe('on error', () => {
    it('sets isError to true', async () => { ... });
  });
});

describe('MyFeatureList', () => {
  describe('when feature flag is ON', () => {
    it('renders the data grid', () => { ... });
    it('shows loading state while data is fetching', () => { ... });
    it('shows empty state when items array is empty', () => { ... });
  });

  describe('when feature flag is OFF', () => {
    it('renders nothing', () => { ... });
  });
});
```

Use `it('...')` with a plain-English description that reads as a sentence: `it('shows an error toast when the save fails')`.

---

## Standard Provider Wrapper

Create a reusable `createWrapper` function in each test file (or in a shared test utility) rather than repeating provider setup:

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n'; // test i18n instance with en.json loaded

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
      mutations: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        {children}
      </I18nextProvider>
    </QueryClientProvider>
  );

  return { Wrapper, queryClient };
};
```

**Always create a fresh `QueryClient` per test.** A shared instance carries cache state between tests and causes flaky results.

---

## Testing Query Hooks

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMyFeatureQuery } from '@features/my-feature/api/hooks/useMyFeatureQueries';
import { getMyFeature } from '@features/my-feature/api/my-feature-service';
import { vi } from 'vitest';

vi.mock('@features/my-feature/api/my-feature-service');

describe('useMyFeatureQuery', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  it('returns data on success', async () => {
    vi.mocked(getMyFeature).mockResolvedValue({ items: [{ id: '1', name: 'Test' }] });

    const { result } = renderHook(() => useMyFeatureQuery(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toHaveLength(1);
  });

  it('sets isError true on failure', async () => {
    vi.mocked(getMyFeature).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useMyFeatureQuery(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
```

---

## Testing Mutation Hooks

Always verify:
- `invalidateQueries` is called with the correct key factory on success
- `showToast.success` fires on success
- `showToast.error` fires on failure

```typescript
import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';

const mockShowToast = { success: vi.fn(), error: vi.fn() };
vi.mock('@stores/hooks/useToastStore', () => ({
  useToastStore: () => ({ showToast: mockShowToast }),
}));

const mockInvalidateQueries = vi.fn();
vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
  };
});

describe('useCreateMyFeature', () => {
  it('invalidates queries and shows success toast on success', async () => {
    vi.mocked(createMyFeature).mockResolvedValue({ id: '1' });

    const { result } = renderHook(() => useCreateMyFeature(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ name: 'New Item' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: myFeatureKeys.all(),
    });
    expect(mockShowToast.success).toHaveBeenCalledTimes(1);
  });

  it('shows error toast on failure', async () => {
    vi.mocked(createMyFeature).mockRejectedValue(new Error('Server error'));

    const { result } = renderHook(() => useCreateMyFeature(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ name: 'New Item' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockShowToast.error).toHaveBeenCalledTimes(1);
  });
});
```

---

## Testing Screen Components

Always mock feature flags and TanStack Query hooks. Cover all states: flag ON, flag OFF, loading, empty, error, and user interactions.

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import MyFeatureList from '@features/my-feature/screens/my-feature-list/MyFeatureList';

// Always mock feature flags
vi.mock('@stores/hooks/useFeatureStore', () => ({
  useFeatureStore: vi.fn((selector) =>
    selector({ features: { myNewFeature: true } })
  ),
}));

// Always mock TanStack Query hooks used by the screen
vi.mock('@features/my-feature/api/hooks/useMyFeatureQueries', () => ({
  useMyFeatureQuery: vi.fn(),
}));

// Always mock toast to prevent side effects
vi.mock('@stores/hooks/useToastStore', () => ({
  useToastStore: () => ({ showToast: { success: vi.fn(), error: vi.fn() } }),
}));

describe('MyFeatureList', () => {
  describe('when feature flag is ON', () => {
    beforeEach(() => {
      vi.mocked(useMyFeatureQuery).mockReturnValue({
        data: { items: [{ id: '1', name: 'Item 1' }] },
        isLoading: false,
        isError: false,
      } as any);
    });

    it('renders the data grid with items', () => {
      render(<MyFeatureList />, { wrapper: createWrapper().Wrapper });
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });

    it('shows loading state', () => {
      vi.mocked(useMyFeatureQuery).mockReturnValue({ isLoading: true } as any);
      render(<MyFeatureList />, { wrapper: createWrapper().Wrapper });
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('shows empty state when no items', () => {
      vi.mocked(useMyFeatureQuery).mockReturnValue({
        data: { items: [] },
        isLoading: false,
      } as any);
      render(<MyFeatureList />, { wrapper: createWrapper().Wrapper });
      expect(screen.getByText(/no records/i)).toBeInTheDocument();
    });
  });

  describe('when feature flag is OFF', () => {
    it('renders nothing', () => {
      vi.mocked(useFeatureStore).mockImplementation((selector) =>
        selector({ features: { myNewFeature: false } })
      );
      const { container } = render(<MyFeatureList />, { wrapper: createWrapper().Wrapper });
      expect(container).toBeEmptyDOMElement();
    });
  });
});
```

---

## userEvent over fireEvent

Always use `userEvent` for simulating user interactions. It fires the full sequence of events (pointerdown, mousedown, focus, click, etc.) just like a real browser. `fireEvent` only fires a single synthetic event and misses intermediary events.

```typescript
import userEvent from '@testing-library/user-event';

const user = userEvent.setup();

// ✅ CORRECT — simulates real user click
await user.click(screen.getByRole('button', { name: /save/i }));

// ✅ CORRECT — simulates real user typing
await user.type(screen.getByRole('textbox', { name: /name/i }), 'John Doe');

// ❌ AVOID for user interactions
fireEvent.click(screen.getByRole('button', { name: /save/i }));
```

---

## getByRole over getByTestId

Query by role and accessible name first. Only use `getByTestId` when no semantic query is possible.

```typescript
// ✅ PREFERRED — semantic, tests accessibility too
screen.getByRole('button', { name: /save changes/i });
screen.getByRole('textbox', { name: /dealer name/i });
screen.getByRole('grid');
screen.getByRole('dialog', { name: /confirm delete/i });

// ⚠️ ACCEPTABLE — when role queries aren't specific enough
screen.getByLabelText('Dealer Name');
screen.getByText('No records found');

// ❌ AVOID — fragile, couples tests to implementation detail
screen.getByTestId('save-button');
```

---

## waitFor Patterns

Use `findBy*` queries instead of `waitFor` + `getBy*` for async element appearance. Reserve `waitFor` for non-element assertions.

```typescript
// ✅ CORRECT — findBy waits automatically
const saveButton = await screen.findByRole('button', { name: /save/i });

// ✅ CORRECT — waitFor for non-element assertions
await waitFor(() => expect(mockFn).toHaveBeenCalledTimes(1));

// ❌ AVOID — verbose equivalent of findBy
await waitFor(() => expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument());

// ❌ WRONG — multiple assertions inside waitFor, only the first failure retries
await waitFor(() => {
  expect(screen.getByText('Success')).toBeInTheDocument();
  expect(mockToast).toHaveBeenCalled();
});
```

---

## Testing Form Submission

```typescript
describe('MyFeatureForm', () => {
  it('submits the form with valid data and shows success toast', async () => {
    vi.mocked(useCreateMyFeature).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);

    const user = userEvent.setup();
    render(<MyFeatureForm />, { wrapper: createWrapper().Wrapper });

    await user.type(screen.getByRole('textbox', { name: /name/i }), 'Test Item');
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(vi.mocked(useCreateMyFeature)().mutate).toHaveBeenCalledWith({
        name: 'Test Item',
      })
    );
  });

  it('shows validation error when name is empty', async () => {
    const user = userEvent.setup();
    render(<MyFeatureForm />, { wrapper: createWrapper().Wrapper });

    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
  });
});
```

---

## Testing SignalR Hooks

Always mock SignalR hooks — never depend on a live hub connection in tests.

```typescript
vi.mock('@hooks/useSignalREvent', () => ({
  useSignalREvent: vi.fn(),
}));

vi.mock('@hooks/useSignalRSubscription', () => ({
  useSignalRSubscription: vi.fn(),
}));
```

To verify a SignalR handler was registered:

```typescript
it('subscribes to UnitStatusChanged events', () => {
  render(<MyComponent />, { wrapper: createWrapper().Wrapper });
  expect(vi.mocked(useSignalREvent)).toHaveBeenCalledWith(
    'UnitStatusChanged',
    expect.any(Function)
  );
});
```

---

## Testing Translation Keys

Verify that `t()` calls reference keys that exist in `en.json`. Import the real i18n instance in tests rather than mocking `useTranslation`, so missing keys surface as failing tests rather than silently displaying the key name.

```typescript
// In test setup or createWrapper — use the real i18n instance
import i18n from '@/i18n/config'; // configured with en.json

// ✅ This will render the actual translation value, not the key
render(<MyComponent />, {
  wrapper: ({ children }) => (
    <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
  ),
});

// Assertion uses the expected English text, not the key
expect(screen.getByText('Save Changes')).toBeInTheDocument();
```

---

## Testing Feature Flags

Every screen component must have tests for both the feature flag ON and OFF states.

```typescript
const mockFeatureStore = (flags: Record<string, boolean>) => {
  vi.mocked(useFeatureStore).mockImplementation((selector) =>
    selector({ features: flags })
  );
};

it('renders when flag is on', () => {
  mockFeatureStore({ myNewFeature: true });
  render(<MyComponent />);
  expect(screen.getByRole('region')).toBeInTheDocument();
});

it('renders nothing when flag is off', () => {
  mockFeatureStore({ myNewFeature: false });
  const { container } = render(<MyComponent />);
  expect(container).toBeEmptyDOMElement();
});
```

---

## Testing Error Boundaries

Test that a component wrapped in `TabErrorBoundary` shows the fallback UI when a child throws.

```typescript
import { TabErrorBoundary } from '@components/error-boundary/TabErrorBoundary';

const ThrowingComponent = () => {
  throw new Error('Test error');
};

it('shows fallback UI when child throws', () => {
  // Suppress the expected console.error from React
  const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  render(
    <TabErrorBoundary>
      <ThrowingComponent />
    </TabErrorBoundary>
  );

  expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  consoleSpy.mockRestore();
});
```

---

## Snapshot Testing Policy

**Avoid snapshot tests for UI components.** Snapshots break on every styling or markup change, creating noise and encouraging `--updateSnapshot` reflexes that skip real review.

Use behaviour assertions instead:

```typescript
// ❌ AVOID
expect(container).toMatchSnapshot();

// ✅ PREFERRED — specific, meaningful assertions
expect(screen.getByRole('heading', { name: /dealer list/i })).toBeInTheDocument();
expect(screen.getAllByRole('row')).toHaveLength(4); // 3 data rows + header
```

Snapshots are acceptable for pure utility functions that return structured data (not JSX).

---

## MSW vs vi.mock

| Use Case | Approach |
|----------|----------|
| Unit testing a single hook or component | `vi.mock` the service module |
| Integration test covering the full data flow (component → hook → service) | MSW (Mock Service Worker) to intercept HTTP |
| Testing error responses from the API | Either approach — `mockRejectedValue` for `vi.mock`, `res(ctx.status(500))` for MSW |

For most pipeline-generated tests, `vi.mock` at the service layer is sufficient and faster to set up. Use MSW when the test needs to exercise the actual axios instance, interceptors, or response transformation logic.

---

## Test Isolation Rules

- **Never share a `QueryClient` instance between tests** — stale cache from one test contaminates the next
- **Reset all mocks between tests** — use `beforeEach(() => vi.clearAllMocks())` or configure `clearMocks: true` in `vite.config.ts`
- **Do not mutate module-level variables** inside tests — if state must change, use `beforeEach`/`afterEach` to set and restore
- **Never use `describe.only` or `it.only` in committed code** — they silently skip all other tests in the file

---

## Accessibility Assertions

Every screen component test must verify at least one accessibility concern:

```typescript
// Verify interactive elements have accessible names
expect(screen.getByRole('button', { name: /delete dealer/i })).toBeInTheDocument();

// Verify form inputs are labelled
expect(screen.getByRole('textbox', { name: /dealer name/i })).toBeInTheDocument();

// Verify dialog has an accessible title
expect(screen.getByRole('dialog', { name: /confirm deletion/i })).toBeInTheDocument();

// Verify images have alt text
expect(screen.getByRole('img', { name: /dealer logo/i })).toBeInTheDocument();
```

---

## Coverage Requirements

- **80% branch coverage** on every new file created during implementation
- Check coverage using one of these commands — never `npm run coverage`:

```bash
# Option A — scoped to the feature project (preferred in pipeline)
npx vitest run --coverage --project <feature-name>

# Option B — scoped to shared components (use for /shared workflow or src/shared/ changes)
npx vitest run --coverage --project shared-ui

# Option C — changed files only (fallback when project name is unknown)
npx vitest run --coverage --changed main
```

- If coverage falls below 80%, add tests targeting the uncovered branches and re-run
- Do not add meaningless tests purely to hit the number — cover real edge cases: empty states, error states, flag-off states, null/undefined inputs

---

## Mock File Conventions

Place mocks in one of these locations:
- **Inline in the test file** — for mocks specific to a single test file
- **`src/__tests__/__mocks__/`** — for mocks reused across feature test files (e.g., a standard `createWrapper` factory, `useToastStore` mock)
- **`src/shared/__tests__/__mocks__/`** — for mocks reused across shared component test files

Do not put mocks inside `src/__mocks__/` (Vitest's automatic mock directory) unless the intent is to auto-mock every import of that module across all tests.
