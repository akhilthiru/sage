# TPS DMS Frontend Development Instructions

> **Purpose**: This document serves as the comprehensive coding standards, architectural guidelines, and workflow reference for the TPS DMS frontend application. It is designed to guide both developers and AI coding assistants in maintaining consistency, quality, and best practices across the 30+ member frontend team.

---

## 🤖 AI Pipeline Quick Start

When a developer sends a greeting ("hi", "hello", "hey", "help") or asks what you can do **without providing code or a question**, respond with this pipeline guide:

```
Hi! I'm set up as the TPS DMS AI development pipeline on GitHub Copilot.

Here's what I can do:

─────────────────────────────────────────────
CODING PIPELINE — start a feature or bug fix
─────────────────────────────────────────────
  1. Open Copilot Chat (Ctrl+Shift+I)
  2. Click the paperclip icon → Prompts → select dev.prompt.md
  3. Enter your Jira ticket ID (e.g. PHNX-1234)
  4. Optionally enter a release branch (e.g. release/0.3.14) for beta track

  The pipeline reads the ticket from Jira, writes a spec to Confluence,
  gets your approval, then builds the code, tests, and PR automatically.

─────────────────────────────────────────────
HELP
─────────────────────────────────────────────
  Select help.prompt.md for the full pipeline reference and setup instructions.
  Or read: .github/README.md
```

For all other requests (coding questions, debugging, explanations), respond normally using the project standards in this file.

---

## 📋 Table of Contents

1. [Tech Stack & Architecture](#tech-stack--architecture)
2. [TypeScript Path Aliases](#typescript-path-aliases)
3. [File Naming & Folder Structure](#file-naming--folder-structure)
4. [Feature Folder Structure](#feature-folder-structure)
5. [State Management](#state-management)
6. [Zustand Store Factory Pattern](#zustand-store-factory-pattern)
7. [TanStack Query Patterns](#tanstack-query-patterns)
8. [UI Components - PxDataGrid & PxDialogModal](#ui-components---pxdatagrid--pxdialogmodal)
9. [Routing - Tab Definitions](#routing---tab-definitions)
10. [Toast Notifications](#toast-notifications)
11. [Error Boundaries](#error-boundaries)
12. [Code & Testing Standards Reference](#code--testing-standards-reference)
13. [Localization & Internationalization](#localization--internationalization)
14. [Locale Key Naming Conventions](#locale-key-naming-conventions)
15. [Security - Content Security Policy](#security---content-security-policy)
16. [Git Workflow - Trunk-Based Development](#git-workflow---trunk-based-development)
17. [Git Submodule Management](#git-submodule-management)
18. [Hotfix Process](#hotfix-process)
19. [Release Checklist](#release-checklist)
20. [Feature Flags](#feature-flags)
21. [Service Endpoint Constants](#service-endpoint-constants)
22. [Sidebar Menu & Permission Constants](#sidebar-menu--permission-constants)

---

## 🛠 Tech Stack & Architecture

### Core Technologies
- **Framework**: React 19
- **Build Tool**: Vite
- **Language**: TypeScript
- **UI Library**: Kendo UI
- **State Management**: Zustand + React Context API
- **Data Fetching**: TanStack Query (React Query)
- **Routing**: React Router DOM
- **Testing**: Vitest + React Testing Library
- **Internationalization**: react-i18next
- **Linting/Formatting**: ESLint + Prettier

### Project Structure
```
src/
├── features/          # Feature-based modules (see Feature Folder Structure section)
├── shared/            # Git submodule (tps-dms-ui-shared)
│   ├── api/
│   ├── components/
│   │   └── ui-kit/    # PxDataGrid, PxDialogModal, shared wrappers
│   ├── constants/     # Env config, permission constants, service endpoints
│   ├── hooks/         # Shared hooks (useLocalization, useSignalR, etc.)
│   ├── stores/
│   │   ├── hooks/     # useGlobalStore, useToastStore, useFeatureStore
│   │   └── utils/     # createStore factory
│   └── utils/
├── pages/             # Page components (layout wrappers only)
├── layouts/           # Layout components
├── locales/           # Translation files (en.json, de.json, ru.json)
├── utils/             # App-specific utilities
└── __tests__/         # Test files mirroring src structure
```

### Config Files
```
config/
├── features.development.json  # Feature flags for dev environment
├── features.qa.json           # Feature flags for QA environment
└── features.uat.json          # Feature flags for UAT environment
```

---

## 📂 File Naming & Folder Structure

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| **Folders** | kebab-case | `customer-major-units/` |
| **React Components** | PascalCase | `Button.tsx`, `LoginForm.jsx` |
| **Non-Components** | kebab-case | `date-formatter.ts`, `use-local-storage.js` |
| **Hooks** | camelCase | `useSignalR.ts`, `useLocalStorage.ts` |
| **Constants** | UPPER_SNAKE_CASE | `API_BASE_URL`, `MAX_RETRIES` |
| **Types/Interfaces** | PascalCase with prefix | `interface IComponentType`, `type TDataType` |

### Critical Rules

✅ **DO:**
- Group by feature: Keep components, utils, constants, schemas, and interfaces within their feature folder
- Use index files for re-exports: Simplify imports with `index.tsx`
- Import React functions directly: `import { useEffect } from 'react'` (NOT `React.useEffect`)
- Move interfaces/types to dedicated files: Never define inline types in components
- Use shared preloader: Import from `src/shared/` folder

❌ **DON'T:**
- Use nested property access without destructuring
- Define inline interfaces/types in components
- Use inline preloader implementations
- Leave TODO/FIXME comments in committed code

### Object Destructuring & Null Safety

**MANDATORY**: Always destructure objects with default values to prevent null pointer exceptions.

```typescript
// ✅ CORRECT - Safe destructuring with defaults
const { user: { name = '' } = {} } = loginDetails;
const { data: { items = [] } = {} } = apiResponse;

// ❌ WRONG - Prone to null pointer errors
const userName = loginDetails.user.name;
```

**MANDATORY**: All data from backend or state must include guard clauses or conditional rendering to handle `null` and `undefined`. Never render literal `"null"` or `"undefined"` strings.

```tsx
// ✅ CORRECT
const userName = user?.name ?? 'N/A';
{amount !== null && amount !== undefined ? formatCurrency(amount) : '-'}

// ❌ WRONG
<div>{user.name}</div> // Could render "undefined"
```

---

## 🗃 State Management

### Strategy Overview
- **React Context API**: For static/rarely-changing global state (Auth, Feature Flags)
- **Zustand**: For frequently-updated, fine-grained state
- **TanStack Query**: For server state (API data fetching, caching)

### React Context API - Best Practices

#### 1. Strict Memoization

**CRITICAL**: Always memoize the context `value` prop to prevent unnecessary re-renders.

```tsx
// ✅ CORRECT - Memoized value
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  
  const value = useMemo(
    () => ({ user, setUser }),
    [user]
  );
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ❌ WRONG - Inline object causes re-renders
<AuthContext.Provider value={{ user, setUser }}>
```

#### 2. Memoize Functions with useCallback

```tsx
const login = useCallback((credentials) => {
  // login logic
}, []);

const value = useMemo(
  () => ({ user, login }),
  [user, login]
);
```

#### 3. Custom Hooks for Consumption

```tsx
// ✅ CORRECT - Custom hook with error handling
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Usage in components
const { user, login } = useAuth();
```

---

## 🧩 Code & Testing Standards Reference

Full coding and testing standards are defined in the rules files loaded automatically by the Copilot pipeline:

| File | Covers |
|------|--------|
| `.github/rules/coding-standards.md` | 18+1 mandatory rules, state management, TanStack Query, UI components, performance, localization, feature flags, SignalR, package & dependency rules |
| `.github/rules/unit-testing-standards.md` | Test structure, provider wrappers, query/mutation/screen testing patterns, coverage requirements, mock conventions |

These files are the single source of truth for implementation and code review. The sections below provide additional project-specific workflow context.

### Testing Commands Quick Reference

```bash
npm run test                                        # Local watch mode
npx vitest run --project <feature-name>             # Pipeline — scoped to feature project (preferred)
npx vitest run --project shared-ui                  # Pipeline — shared component tests
npx vitest run --changed main                       # Pipeline — changed files fallback
npx vitest run --coverage --project <feature-name>  # Coverage scoped to feature project
npx vitest run --coverage --changed main            # Coverage — changed files fallback
npm run coverage:ui                                 # Local UI-based coverage viewer
```

> **Pipeline rule**: Never run `npm run coverage` (no scope) — it runs the full suite across all 50+ modules and takes 60+ minutes. Always use `--project <name>` or `--changed main`.

---

## 🌍 Localization & Internationalization

### Overview

All localization is managed using:
- **Zustand store**: For region-specific config (currency, date format, etc.)
- **react-i18next**: For text translation
- **Custom Hook**: `useLocalization()` for formatting

### Centralized Configuration (Zustand)

```typescript
// store/globalStore.ts
export interface Config {
  currencySymbol: string;
  decimalPoint: string;
  decimalPlaces: number;
  dateFormat: string;
  timeFormat: string;
  countryCode: string;
}

export interface GlobalState {
  config: Config;
}

export const useGlobalStore = create<GlobalState>(set => ({
  config: {
    currencySymbol: '$',
    decimalPoint: '.',
    decimalPlaces: 2,
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    countryCode: 'USD',
  },
}));
```

### useLocalization Hook

**MANDATORY**: Use this hook for all formatting operations.

```tsx
// hooks/useLocalization.ts
export const useLocalization = () => {
  const config = useGlobalStore(state => state.config);
  
  const formatCurrency = (value: number): string => {
    if (isNaN(value)) return `${config.currencySymbol} 0${config.decimalPoint}00`;
    const roundedValue = roundNumber(value, config);
    const formattedNumber = roundedValue.toLocaleString(undefined, {
      minimumFractionDigits: config.decimalPlaces,
      maximumFractionDigits: config.decimalPlaces,
    });
    const isSymbolLeft = ['USD', 'EUR', 'GBP'].includes(config.countryCode);
    return isSymbolLeft
      ? `${config.currencySymbol} ${formattedNumber}`
      : `${formattedNumber} ${config.currencySymbol}`;
  };
  
  const formatDate = (date: Date | string): string => {
    // Use date-fns or moment for robust formatting
    return date instanceof Date ? date.toLocaleDateString() : String(date);
  };
  
  return { config, formatCurrency, formatDate };
};
```

### Usage in Components

```tsx
const PriceDisplay = ({ amount }: { amount: number }) => {
  const { formatCurrency, formatDate } = useLocalization();
  const { t } = useTranslation();
  
  return (
    <div>
      <p>{t('common.amount')}: {formatCurrency(amount)}</p>
      <p>{t('common.date')}: {formatDate(new Date())}</p>
    </div>
  );
};
```

### Best Practices

✅ **DO:**
- Always use `useLocalization()` for currency, dates, numbers
- Use `useTranslation()` for all text
- Never hardcode currency symbols, date formats, or decimal separators

❌ **DON'T:**
- Manually format currency: `"$" + amount.toFixed(2)`
- Hardcode date formats: `date.getMonth() + "/" + date.getDate()`
- Reinvent formatting logic in components

---

## 🔒 Security - Content Security Policy

### Overview

We use React 19's Native Metadata API to implement CSP headers for XSS protection.

### Implementation (App.tsx)

```tsx
const CSP_POLICY = `
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self' data:;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
`.replace(/\s{2,}/g, ' ').trim();

function App() {
  return (
    <>
      <meta httpEquiv="Content-Security-Policy" content={CSP_POLICY} />
      <div className="app-layout">
        {/* App content */}
      </div>
    </>
  );
}
```

### Policy Directives

| Directive | Setting | Description |
|-----------|---------|-------------|
| `default-src` | `'self'` | Only allow resources from same origin |
| `script-src` | `'self'` | Only allow scripts from our domain |
| `style-src` | `'self' 'unsafe-inline'` | Allow local CSS + inline styles (for Vite HMR) |
| `img-src` | `'self' data: https:` | Allow local images, base64, HTTPS sources |
| `object-src` | `'none'` | Block Flash/Java applets |

### Production Server Configuration

For production, enforce CSP via HTTP headers (Nginx, Apache, etc.):

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self';
```

### External APIs

If fetching from external APIs, add to `connect-src`:

```
connect-src 'self' https://api.example.com;
```

---

## 🌳 Git Workflow - Trunk-Based Development

### Core Principles

1. **Single Source of Truth**: `main` branch is always stable and deployable
2. **Small, Frequent Commits**: Merge small changes daily
3. **Feature Flags**: Hide incomplete features behind flags
4. **Continuous Integration**: Every commit triggers automated tests
5. **Decouple Deployment from Release**: Deploy with features disabled, release by toggling flags

### Workflow Steps

#### 1. Pull Latest main

```bash
git checkout main
git pull origin main
```

#### 2. Create Short-Lived Feature Branch

```bash
git checkout -b feature/JIRA-123-global-search-widget
```

**Naming Convention**: `feature/JIRA-###-descriptive-name` or `bugfix/JIRA-###-description`

#### 3. Develop with Feature Flags

**MANDATORY**: Implement all new features behind feature flags.

```tsx
const MyComponent = () => {
  const { features } = useFeatureContext();
  
  return (
    <div>
      {features.newDashboard ? (
        <NewDashboard />
      ) : (
        <OldDashboard />
      )}
    </div>
  );
};
```

#### 4. Commit Frequently

```bash
git add .
git commit -m "feat: Implement global search widget (behind feature flag)"
```

#### 5. Rebase with main Regularly

```bash
git fetch origin
git rebase origin/main
```

Do this **several times a day** to avoid complex merges.

#### 6. Push and Create PR

```bash
git push origin feature/JIRA-123-global-search-widget
```

Create PR targeting `main` with:
- Clear title and description
- Mention feature flag usage
- Link to JIRA ticket

#### 7. Review & Merge

- Quick code reviews (small PRs review faster)
- Prefer **squash and merge** for clean history
- Delete feature branch after merge

### Mandatory Pre-Merge Checks

✅ All changes from HTML team must be behind feature flags  
✅ Self-review completed before development  
✅ Code review specifically checks feature flag implementation  
✅ Complete dev unit testing with feature flag ON and OFF

---

## 🔗 Git Submodule Management

### Overview

The `tps-dms-ui-shared` repository is included as a Git submodule at `src/shared/`.

### Initial Setup (New Clones)

```bash
git submodule update --init --recursive
npm install
```

### Getting Latest Updates from Submodule

```bash
# From application root
git submodule update src/shared
```

### Making Changes to Shared Code

#### Step 1: Navigate to Submodule

```bash
cd src/shared
```

#### Step 2: Create Feature Branch in Submodule

```bash
git fetch origin
git checkout -b feature/JIRA-456-shared-component
```

#### Step 3: Make Changes and Commit

```bash
git add .
git commit -m "feat(shared): Add new utility function"
```

#### Step 4: Push Submodule Branch

⚠️ **CRITICAL**: Always push submodule changes BEFORE updating the parent repo.

```bash
git push -u origin feature/JIRA-456-shared-component
```

#### Step 5: Create PR for Submodule

Create PR in `tps-dms-ui-shared` from `feature/JIRA-456-shared-component` → `main`

#### Step 6: Update Submodule Pointer in Parent Repo

After submodule PR is merged:

```bash
cd ../..  # Back to application root
git checkout main
git pull origin main

cd src/shared
git checkout main
git pull origin main

cd ../..
git add src/shared
git commit -m "chore: Update src/shared submodule to include feature/JIRA-456"
git push origin feature/submodule-update
```

Create separate PR for pointer update in parent repo.

### Critical Rules

⚠️ **ALWAYS push submodule changes BEFORE updating parent repo**  
⚠️ **Never commit unpushed submodule commits** (breaks other developers' clones)  
⚠️ **Keep React versions consistent** between parent and submodule

---

## 🔥 Hotfix Process

### Workflow 1: Hotfix WITHOUT Shared Component Changes

```bash
# Step 1: Create hotfix branch from release
git checkout release/0.3.14
git pull origin release/0.3.14
git checkout -b hotfix/0.3.14-critical-api-fix

# Step 2: Make changes and commit
git add .
git commit -m "fix(api): Resolve critical timeout issue"

# Step 3: Create two PRs
# PR #1: hotfix/0.3.14-critical-api-fix → release/0.3.14
# PR #2: hotfix/0.3.14-critical-api-fix → main

# Step 4: Deploy after merge
```

### Workflow 2: Hotfix WITH Shared Component Changes

#### Part 1: Fix in Submodule

```bash
# Step 1: Create hotfix branch in submodule
cd src/shared
git checkout main
git pull origin main
git checkout -b hotfix/0.3.14-shared-component-fix

# Step 2: Make changes and commit
git add .
git commit -m "fix(shared): Critical component fix"

# Step 3: Push and create PR
git push -u origin hotfix/0.3.14-shared-component-fix
# Create PR: hotfix/0.3.14-shared-component-fix → main (in tps-dms-ui-shared)

# Step 4: After merge, pull latest
git checkout main
git pull origin main
```

#### Part 2: Update Parent Repo

```bash
# Step 5: Back to application root
cd ../..
git checkout release/0.3.14
git pull origin release/0.3.14
git checkout -b hotfix/0.3.14-shared-component-fix

# Step 6: Update submodule pointer
cd src/shared
git pull origin main
cd ../..

git add src/shared
git commit -m "chore: Update src/shared submodule with hotfix"

# Step 7: Create two PRs
# PR #1: hotfix/0.3.14-shared-component-fix → release/0.3.14
# PR #2: hotfix/0.3.14-shared-component-fix → main
```

---

## ✅ Release Checklist

### Dependencies

- [ ] Run `npm outdated` to check for outdated packages
- [ ] Run `npm audit fix` and address high/critical vulnerabilities
- [ ] Verify `package-lock.json` is committed and clean
- [ ] Check for peer dependency warnings
- [ ] Update linting tools (eslint, prettier)
- [ ] Ensure Kendo UI packages are up to date

### Configurations

- [ ] Feature flags correctly toggled (experimental features OFF in production)
- [ ] Logging level set to `error` or `warn` for production
- [ ] All `console.log`, `console.debug`, and `debugger` statements removed
- [ ] CORS policy correct for production
- [ ] HTTPS enforced (HTTP redirects to HTTPS)

### Code Quality

- [ ] Code reviewed and approved by two developers
- [ ] ESLint and Prettier run successfully with no errors
- [ ] No TODO/FIXME comments in committed code
- [ ] Code block and function spacing correct
- [ ] JSON, YAML, config files properly formatted
- [ ] File name case consistency enforced
- [ ] No trailing whitespace

### Testing

- [ ] All unit tests passing (`npx vitest run --changed main`)
- [ ] Coverage at 80%+ on changed files (`npx vitest run --coverage --changed main`)
- [ ] Integration tests passing
- [ ] Manual QA completed in staging

### Build & Deployment

- [ ] Production build successful (`npm run build`)
- [ ] Build artifacts reviewed
- [ ] Environment variables configured correctly
- [ ] CSP headers configured on server

---

## 🚩 Feature Flags

### Overview

Feature flags enable safe deployment of incomplete features and instant rollbacks.

### Implementation

#### 1. Feature Flag API Endpoint

```json
// GET /api/feature-flags response
{
  "newDashboard": true,
  "darkMode": false,
  "betaAnalytics": true
}
```

#### 2. Feature Provider (Context)

```tsx
// contexts/FeatureProvider.tsx
export const FeatureProvider = ({ children }) => {
  const { data: features, isLoading } = useQuery({
    queryKey: ['featureFlags'],
    queryFn: fetchFeatureFlags,
  });
  
  if (isLoading) return <LoadingSpinner />;
  
  return (
    <FeatureContext.Provider value={{ features }}>
      {children}
    </FeatureContext.Provider>
  );
};
```

#### 3. Consuming Feature Flags

```tsx
import { useFeatureContext } from '../contexts/FeatureProvider';

const MyComponent = () => {
  const { features } = useFeatureContext();
  
  return (
    <div>
      {features.newDashboard && <NewDashboard />}
      {!features.newDashboard && <OldDashboard />}
    </div>
  );
};
```

### Best Practices

✅ **DO:**
- Use descriptive flag names: `enableNewUserOnboarding`, `showExperimentalSearch`
- Define sensible default values (handle API failures gracefully)
- Test with flags both ON and OFF
- Clean up flags after features are fully released (prevent "flag debt")

❌ **DON'T:**
- Leave feature flags in code indefinitely
- Skip testing flag combinations
- Forget to document flag purpose

### Testing with Feature Flags

- Unit tests should cover both enabled/disabled states
- E2E tests should run scenarios for all critical flag combinations
- Manual QA in staging with different flag configurations

### Release Strategy

1. **Deploy to Production**: Code deployed with flags OFF
2. **Gradual Rollout**: Enable flag for 1% → 10% → 100% of users
3. **Monitor**: Track metrics and errors
4. **Rollback**: Toggle flag OFF instantly if issues arise
5. **Clean Up**: Remove flag code once feature is stable

---

## 📚 Additional Resources

- **Confluence**: Higher-level architectural decisions and design patterns
- **README.md**: Project setup, scripts, key architecture decisions
- **React Documentation**: https://react.dev
- **Vite Documentation**: https://vitejs.dev
- **TanStack Query**: https://tanstack.com/query
- **React Testing Library**: https://testing-library.com/react

---

## 🤝 Team Communication

- **Code Reviews**: Required by two developers before merge
- **Feature Flag Updates**: Communicate significant changes to `tps-dms-ui-shared`
- **Release Coordination**: QA and deployment teams notified before releases
- **Hotfix Coordination**: Follow hotfix process strictly for production issues

---

**Last Updated**: May 4, 2026

---

## 📡 SignalR / Real-Time Pattern

The app uses SignalR (via `@microsoft/signalr`) for real-time updates. Three hooks are available in `src/shared/hooks/`. Use the correct hook for each concern — do not use `useWebSocket` for SignalR-backed data.

| Hook | Purpose |
|------|---------|
| `useSignalR` | Establishes the hub connection. Called once at app level only. |
| `useSignalRSubscription` | Joins/leaves a SignalR group (Organization or Store level). |
| `useSignalREvent` | Listens to a named event on the hub and calls a typed handler. |

### Subscription Levels

```typescript
import { SubscriptionLevel } from '@interfaces/signalR.interface';

// Join the group for the current organization
useSignalRSubscription(SubscriptionLevel.Organization, false, organizationId);

// Join the group for a specific store
useSignalRSubscription(SubscriptionLevel.Store, false, organizationId, storeId);
```

### Listening to Events

```typescript
import { useSignalREvent } from '@hooks/useSignalREvent';
import { useCallback } from 'react';

const handleUnitUpdate = useCallback((payload: UnitUpdatePayload) => {
  // handle the real-time payload
}, []);

useSignalREvent<UnitUpdatePayload>('UnitStatusChanged', handleUnitUpdate);
```

### Testing Real-Time Hooks

Mock the SignalR connection in tests — never depend on a live hub connection:

```typescript
vi.mock('@hooks/useSignalREvent', () => ({
  useSignalREvent: vi.fn(),
}));
```

**Rules:**
- Never call `useSignalR` inside a feature component — it is an app-level concern.
- Always wrap the event handler in `useCallback` before passing to `useSignalREvent` to prevent re-subscription on every render.
- `useSignalRSubscription` handles group join/leave cleanup automatically in its effect — do not manually call subscribe/unsubscribe outside it.
- Do not use `useWebSocket` for features that receive data via SignalR groups — the two transports are separate concerns.

---

## 🗂 TypeScript Path Aliases

**MANDATORY**: Always use path aliases for cross-boundary imports. Never use relative paths (`../../`) to import from `src/shared/` or across feature boundaries.

### Available Aliases (defined in `tsconfig.app.json`)

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

## 📁 Feature Folder Structure

Every feature module follows this directory structure:

```
src/features/<feature-name>/
├── api/
│   ├── <feature>-service.ts              # API request functions (axios calls)
│   └── hooks/
│       ├── <feature>-keys.ts             # TanStack Query key factory
│       ├── use<Feature>Queries.ts        # useQuery hooks
│       ├── use<Feature>Create.ts         # useMutation hooks for create operations
│       └── use<Feature>Update.ts         # useMutation hooks for update operations
├── constants/
│   └── <feature>-constants.ts
├── interfaces/
│   └── <feature>-interfaces.ts
├── schema/
│   └── <feature>-schema.ts               # Zod / yup validation schemas
└── screens/
    └── <screen-name>/
        ├── <ScreenName>.tsx
        └── components/                   # Screen-local components only
```

**Hook file naming** — `hooks/` files that export React hooks **must** use camelCase with the `use` prefix:

```
// ✅ CORRECT
use<Feature>Queries.ts
use<Feature>Create.ts
use<Feature>Update.ts

// ❌ WRONG — hyphenated names are not permitted for hook files
customer-major-unit-queries.ts
customer-major-unit-create.ts
```

The key factory file (`<feature>-keys.ts`) is the only file in `api/hooks/` that does not export a hook and therefore keeps the kebab-case naming convention.

- Screens contain only the UI logic for that specific screen.
- Components under `screens/<screen-name>/components/` are **private** to that screen.
- Components needed by multiple screens must live in `src/shared/components/`.
- Never create a `components/` folder directly under a feature root.

---

## 🗃 Zustand Store Factory Pattern

All Zustand stores use the shared `createStore` factory function from `@stores/utils/createStore` with `persist` middleware and `secureStorage` serialization. Do not call `create()` from Zustand directly.

```typescript
import { createJSONStorage } from 'zustand/middleware';
import { secureStorage } from '@/shared/utils/secure-storage';
import { createStore } from '@stores/utils/createStore';

interface MyState {
  data: MyData | null;
  setData: (data: MyData) => void;
}

export const useMyStore = createStore<MyState>(
  'my-store-key',
  (set) => ({
    data: null,
    setData: (data) => set({ data }),
  }),
  { storage: createJSONStorage(() => secureStorage) }
);
```

**Rules:**
- Store key (first argument) must be unique across the app.
- State is persisted in `secureStorage` — do not store raw tokens or PII.
- Use selector functions when consuming stores to prevent unnecessary re-renders:

```typescript
// ✅ CORRECT - selector prevents re-render when unrelated state changes
const data = useMyStore(state => state.data);

// ❌ WRONG - subscribes to full store
const store = useMyStore();
```

---

## 🔍 TanStack Query Patterns

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

### Query Hooks (`use<Feature>Queries.ts`)

```typescript
// api/hooks/useCustomerMajorUnitQueries.ts
import { useQuery } from '@tanstack/react-query';
import { customerMajorUnitKeys } from './customer-major-unit-keys';
import { getCustomerMajorUnits } from '../customer-major-unit-service';

export const useCustomerMajorUnitsQuery = (filters: Filters) =>
  useQuery({
    queryKey: customerMajorUnitKeys.list(filters),
    queryFn: () => getCustomerMajorUnits(filters),
  });
```

### Mutation Hooks (`use<Feature>Create.ts` / `use<Feature>Update.ts`)

```typescript
// api/hooks/useCustomerMajorUnitCreate.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { customerMajorUnitKeys } from './customer-major-unit-keys';

export const useCreateCustomerMajorUnit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCustomerMajorUnit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerMajorUnitKeys.all() });
    },
  });
};
```

**Rules:**
- Query and mutation hooks live in `api/hooks/`, never inline in components.
- Use `invalidateQueries` with the key factory on success — never pass raw strings.
- Destructure only what the component needs: `const { data, isLoading } = useMyQuery()`.

---

## 🖥 UI Components - PxDataGrid & PxDialogModal

Import all shared UI components from the `@ui-kit` alias:

```typescript
import { PxDataGrid, PxDialogModal } from '@ui-kit';
```

### PxDataGrid Usage

```tsx
<PxDataGrid
  data={items}
  columns={columns}
  isLoading={isLoading}
  onRowClick={handleRowClick}
  actionMenuItems={actionItems}
/>
```

- Define `columns` as a typed `const` array in the same file or a sibling `*-columns.ts` file — never inline in JSX.
- Action menu items must use named handler functions, never inline arrow functions.
- Pass `isLoading` from the TanStack Query hook — never manage a separate loading boolean.

### PxDialogModal Usage

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

- All modal state (`isOpen`) lives in the parent component or in a local Zustand store — never in the modal itself.
- Modal titles and action labels must use `t()` for localization.

---

## 🗺 Routing - Tab Definitions

Tabs and routes are declared using the `ITabDefinition` interface pattern with lazy-loaded screen components.

```typescript
import { lazy } from 'react';
import i18next from 'i18next';
import { ITabDefinition } from '@interfaces/tab-definitions';

const CustomerMajorUnitsList = lazy(
  () => import('@features/customer-major-units/screens/major-units-owned-list/MajorUnitsOwnedList')
);

export const customerMajorUnitsTabs: ITabDefinition[] = [
  {
    id: 'major-units-owned-list',
    label: i18next.t.bind(i18next, 'customerMajorUnits.tabs.list'),
    component: CustomerMajorUnitsList,
    permission: CUSTOMER_MAJOR_UNITS_VIEW,
  },
];
```

**Rules:**
- Always use `lazy()` for screen components in tab definitions — never eagerly import.
- Use `i18next.t.bind(i18next, 'key')` for tab labels — never a plain string.
- Permission constants must come from `src/shared/constants/` — never hardcoded strings.

---

## 🔔 Toast Notifications

**MANDATORY**: Use `useToastStore` for all in-app notifications. Never create custom toast implementations.

```typescript
import { useToastStore } from '@stores/hooks/useToastStore';

const { showToast } = useToastStore();

// On success
showToast.success(t('saveSuccessMessage'));

// On error
showToast.error(t('saveErrorMessage'));
```

- Toast messages must use `t()` — never hardcoded strings.
- Call `showToast` in mutation `onSuccess` / `onError` callbacks, not in component event handlers.

---

## 🛡 Error Boundaries

Two error boundary variants are available:

| Variant | Import | Use For |
|---------|--------|--------|
| `ErrorBoundary` | `@components/error-boundary/ErrorBoundary` | Wrapping full page or feature sections |
| `TabErrorBoundary` | `@components/error-boundary/TabErrorBoundary` | Wrapping individual tab content |

```tsx
import { TabErrorBoundary } from '@components/error-boundary/TabErrorBoundary';

<TabErrorBoundary>
  <Suspense fallback={<Loader />}>
    <MyLazyScreen />
  </Suspense>
</TabErrorBoundary>
```

**Rules:**
- Every lazy-loaded tab screen must be wrapped in `TabErrorBoundary` + `Suspense`.
- Top-level app sections must be wrapped in `ErrorBoundary`.
- Do not create custom error boundary classes — use the shared variants.

---

## 🌐 Locale Key Naming Conventions

All translations for all three languages live in a **single flat file per locale** (`en.json`, `de.json`, `ru.json`). Keys are globally unique **camelCase strings** — no dot-separated namespacing, no nested objects.

```json
// ✅ CORRECT — unique camelCase keys, single flat file
{
  "majorUnitsOwnedListTitle": "Owned Units",
  "majorUnitsViewTitle": "View Unit",
  "majorUnitsFormUnitNumber": "Unit Number",
  "saveButtonLabel": "Save",
  "cancelButtonLabel": "Cancel",
  "saveSuccessMessage": "Record saved successfully.",
  "saveErrorMessage": "Failed to save. Please try again."
}
```

```json
// ❌ WRONG — dot-separated namespacing creates duplicate key risk and is not the project standard
{
  "customerMajorUnits.tabs.list": "Owned Units",
  "common.save": "Save"
}
```

**Rules:**
- All keys are **globally unique camelCase** — no dots, no namespaces, no nested objects.
- Keys must be descriptive enough to be unique without a prefix: prefer `majorUnitsFormUnitNumber` over `unitNumber`.
- All three locale files (`en.json`, `de.json`, `ru.json`) must be updated together — never add a key to only one file.
- Before adding a new key, search the locale file for an existing key that covers the same label. Reuse it rather than adding a near-duplicate.
- Never use the key string itself as fallback UI text — provide a proper English label in `en.json`.

---

## 🔧 Service Endpoint Constants

API base URLs and service names are declared as constants in `src/shared/constants/` and imported where needed. Never hardcode service URLs in hook or component files.

```typescript
// src/shared/constants/env-config.ts (generated from env)
export const USER_MANAGEMENT_SERVICE = envConfig.userManagementService;
export const INVENTORY_SERVICE = envConfig.inventoryService;
```

```typescript
// In a service file
import envConfig from '@/shared/constants/env-config';

export const getUsers = () =>
  axiosInstance.get(`${envConfig.userManagementService}/users`);
```

**Rules:**
- Service base URLs come from `envConfig` — never from `import.meta.env` directly in service files.
- Use the named constant when referencing a service in multiple places.

---

## 🗄 Sidebar Menu & Permission Constants

Sidebar menu items are constructed from permission constant arrays defined in `src/shared/constants/`. Menu visibility is permission-driven.

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

**Rules:**
- Never use string literals for permission checks — always use named constants.
- Do not conditionally render sidebar items with feature flags unless the feature is behind a flag by intent; use permissions for access control.

---

## 🚩 Feature Flag Hydration

Feature flags are loaded at runtime from the **Azure App Configuration API** via `getFeatureFlags()` and stored in `useFeatureStore`. There are no local JSON flag files. The `FeatureFlagProvider` calls `loadFeatureFlags()` after the user authenticates.

### How It Works

```
Azure App Configuration API
  ↓
getFeatureFlags()  (src/shared/api/feature-flags)
  ↓
useFeatureStore.loadFeatureFlags()
  ↓
features state hydrated in secureStorage
```

### Consuming Feature Flags in Components

```typescript
import { useFeatureStore } from '@stores/hooks/useFeatureStore';

const MyComponent = () => {
  const features = useFeatureStore(state => state.features);

  return (
    <div>
      {features?.newDashboard && <NewDashboard />}
    </div>
  );
};
```

**Rules:**
- Always use optional chaining `features?.flagName` — the store may not be hydrated yet on first render.
- Flag keys are strings defined in Azure App Configuration — coordinate with the backend/DevOps team when adding a new flag.
- Do not pass flag values as props deep into a component tree — consume from the store where needed.
- Do not create local fallback JSON files for feature flags — the API is the single source of truth.
**Locale Cleanup (MANDATORY)**: When removing or renaming a feature, delete the corresponding locale keys from **all three** locale files in the same PR. Run `npm run locale:check` to detect orphaned keys before raising a PR. The CI pipeline will block merge if orphaned keys are found.

```bash
npm run locale:check   # Fails if any key in en.json has no static t('key') reference in source
```

