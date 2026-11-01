# Sage: Project Structure

## Overview

This document outlines the complete folder structure for the Sage project. The structure follows Next.js 14+ conventions with feature-based organization.

## Root Structure

```
sage/
├── .github/                    # GitHub configuration
│   └── workflows/              # CI/CD workflows
│       ├── ci.yml
│       └── deploy.yml
├── .husky/                     # Git hooks
│   ├── pre-commit
│   └── pre-push
├── .vscode/                    # VS Code settings
│   ├── settings.json
│   └── extensions.json
├── app/                        # Next.js app directory
├── components/                 # React components
├── domain/                     # Business logic
├── features/                   # Feature modules
├── lib/                        # Shared utilities
├── prisma/                     # Database
├── public/                     # Static assets
├── tests/                      # Tests
├── docs/                       # Documentation
├── .env.example                # Environment variables template
├── .env.local                  # Local environment variables (gitignored)
├── .eslintrc.json              # ESLint configuration
├── .gitignore                  # Git ignore rules
├── .prettierrc                 # Prettier configuration
├── next.config.js              # Next.js configuration
├── package.json                # Dependencies
├── postcss.config.js           # PostCSS configuration
├── tailwind.config.ts          # Tailwind configuration
├── tsconfig.json               # TypeScript configuration
├── vitest.config.ts            # Vitest configuration
├── playwright.config.ts        # Playwright configuration
├── README.md                   # Project README
├── CONTRIBUTING.md             # Contribution guidelines
├── CHANGELOG.md                # Version history
└── LICENSE                     # License file
```

---

## App Directory (`/app`)

Next.js 14+ App Router structure:

```
app/
├── (auth)/                     # Auth route group
│   ├── sign-in/
│   │   └── [[...sign-in]]/
│   │       └── page.tsx
│   └── sign-up/
│       └── [[...sign-up]]/
│           └── page.tsx
├── (dashboard)/                # Protected routes group
│   ├── dashboard/
│   │   ├── page.tsx
│   │   └── loading.tsx
│   ├── goals/
│   │   ├── page.tsx
│   │   ├── [id]/
│   │   │   ├── page.tsx
│   │   │   └── edit/
│   │   │       └── page.tsx
│   │   ├── new/
│   │   │   └── page.tsx
│   │   └── loading.tsx
│   ├── profile/
│   │   ├── page.tsx
│   │   └── edit/
│   │       └── page.tsx
│   ├── chat/
│   │   ├── page.tsx
│   │   └── [conversationId]/
│   │       └── page.tsx
│   ├── simulator/
│   │   ├── page.tsx
│   │   ├── affordability/
│   │   │   └── page.tsx
│   │   └── loan/
│   │       └── page.tsx
│   └── layout.tsx              # Dashboard layout
├── onboarding/
│   ├── page.tsx
│   └── layout.tsx
├── api/                        # API routes
│   ├── webhooks/
│   │   ├── clerk/
│   │   │   └── route.ts
│   │   └── stripe/             # Future
│   │       └── route.ts
│   ├── health/
│   │   └── route.ts
│   └── chat/
│       └── route.ts            # Streaming endpoint
├── layout.tsx                  # Root layout
├── page.tsx                    # Landing page
├── error.tsx                   # Error boundary
├── not-found.tsx               # 404 page
└── global.css                  # Global styles
```

---

## Components Directory (`/components`)

Reusable React components:

```
components/
├── ui/                         # Base UI components (shadcn/ui)
│   ├── button.tsx
│   ├── card.tsx
│   ├── input.tsx
│   ├── label.tsx
│   ├── select.tsx
│   ├── dialog.tsx
│   ├── dropdown-menu.tsx
│   ├── toast.tsx
│   ├── progress.tsx
│   ├── badge.tsx
│   ├── separator.tsx
│   ├── skeleton.tsx
│   ├── tabs.tsx
│   ├── chart.tsx
│   └── ...
├── features/                   # Feature-specific components
│   ├── onboarding/
│   │   ├── OnboardingFlow.tsx
│   │   ├── IncomeStep.tsx
│   │   ├── SavingsStep.tsx
│   │   ├── GoalStep.tsx
│   │   ├── LoanStep.tsx
│   │   └── ProgressIndicator.tsx
│   ├── dashboard/
│   │   ├── DashboardOverview.tsx
│   │   ├── HealthScoreCard.tsx
│   │   ├── CFOUnderstandingCard.tsx
│   │   ├── QuickActions.tsx
│   │   └── InsightsList.tsx
│   ├── goals/
│   │   ├── GoalCard.tsx
│   │   ├── GoalForm.tsx
│   │   ├── GoalList.tsx
│   │   ├── GoalProgress.tsx
│   │   ├── FeasibilityIndicator.tsx
│   │   └── MilestoneList.tsx
│   ├── allocation/
│   │   ├── AllocationCard.tsx
│   │   ├── AllocationChart.tsx
│   │   ├── AllocationBreakdown.tsx
│   │   └── AllocationRecommendations.tsx
│   ├── chat/
│   │   ├── ChatInterface.tsx
│   │   ├── MessageList.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── MessageInput.tsx
│   │   ├── TypingIndicator.tsx
│   │   └── ConversationList.tsx
│   ├── simulator/
│   │   ├── AffordabilityChecker.tsx
│   │   ├── LoanCalculator.tsx
│   │   ├── ScenarioComparison.tsx
│   │   └── ImpactVisualization.tsx
│   └── profile/
│       ├── ProfileForm.tsx
│       ├── IncomeSection.tsx
│       ├── ExpenseSection.tsx
│       ├── DebtSection.tsx
│       └── AssetSection.tsx
├── layouts/
│   ├── MainLayout.tsx
│   ├── DashboardLayout.tsx
│   ├── AuthLayout.tsx
│   └── OnboardingLayout.tsx
└── shared/
    ├── Header.tsx
    ├── Sidebar.tsx
    ├── Footer.tsx
    ├── Navigation.tsx
    ├── UserMenu.tsx
    ├── LoadingSpinner.tsx
    ├── EmptyState.tsx
    └── ErrorMessage.tsx
```

---

## Domain Directory (`/domain`)

Core business logic (pure functions, no dependencies):

```
domain/
├── financial/
│   ├── allocation.ts           # Allocation calculations
│   ├── goals.ts                # Goal feasibility
│   ├── affordability.ts        # Affordability checks
│   ├── loans.ts                # Loan calculations
│   ├── health-score.ts         # Financial health
│   ├── types.ts                # Domain types
│   └── __tests__/
│       ├── allocation.test.ts
│       ├── goals.test.ts
│       ├── affordability.test.ts
│       └── loans.test.ts
├── simulation/
│   ├── scenarios.ts            # Scenario simulation
│   ├── timeline.ts             # Timeline projection
│   ├── impact.ts               # Impact analysis
│   ├── types.ts
│   └── __tests__/
│       ├── scenarios.test.ts
│       └── timeline.test.ts
└── ai/
    ├── chat.ts                 # Chat orchestration
    ├── intent.ts               # Intent extraction
    ├── response.ts             # Response generation
    ├── context.ts              # Context management
    ├── prompts/
    │   ├── system.ts           # System prompts
    │   ├── affordability.ts    # Affordability prompts
    │   ├── goals.ts            # Goal prompts
    │   └── index.ts
    ├── types.ts
    └── __tests__/
        ├── intent.test.ts
        └── response.test.ts
```

---

## Features Directory (`/features`)

Feature modules with server actions and hooks:

```
features/
├── onboarding/
│   ├── actions.ts              # Server actions
│   ├── hooks.ts                # React hooks
│   ├── types.ts                # TypeScript types
│   ├── utils.ts                # Utilities
│   ├── validation.ts           # Zod schemas
│   └── __tests__/
│       └── actions.test.ts
├── goals/
│   ├── actions.ts
│   ├── hooks.ts
│   ├── types.ts
│   ├── utils.ts
│   ├── validation.ts
│   └── __tests__/
│       └── actions.test.ts
├── profile/
│   ├── actions.ts
│   ├── hooks.ts
│   ├── types.ts
│   ├── utils.ts
│   ├── validation.ts
│   └── __tests__/
│       └── actions.test.ts
├── chat/
│   ├── actions.ts
│   ├── hooks.ts
│   ├── types.ts
│   ├── utils.ts
│   └── __tests__/
│       └── actions.test.ts
├── allocation/
│   ├── actions.ts
│   ├── hooks.ts
│   ├── types.ts
│   └── __tests__/
│       └── actions.test.ts
└── simulator/
    ├── actions.ts
    ├── hooks.ts
    ├── types.ts
    └── __tests__/
        └── actions.test.ts
```

---

## Lib Directory (`/lib`)

Shared utilities and configurations:

```
lib/
├── db.ts                       # Prisma client
├── auth.ts                     # Auth utilities
├── openai.ts                   # OpenAI client
├── analytics.ts                # PostHog
├── email.ts                    # Resend
├── errors.ts                   # Error classes
├── utils.ts                    # General utilities
├── constants.ts                # App constants
├── validators.ts               # Common validators
├── formatters.ts               # Data formatters
└── __tests__/
    ├── utils.test.ts
    └── formatters.test.ts
```

---

## Prisma Directory (`/prisma`)

Database schema and migrations:

```
prisma/
├── schema.prisma               # Database schema
├── migrations/                 # Migration files
│   ├── 20260617000000_init/
│   │   └── migration.sql
│   ├── 20260618000000_add_goals/
│   │   └── migration.sql
│   └── migration_lock.toml
└── seed.ts                     # Seed data
```

---

## Public Directory (`/public`)

Static assets:

```
public/
├── images/
│   ├── logo.svg
│   ├── logo-dark.svg
│   ├── hero.png
│   └── illustrations/
│       ├── onboarding.svg
│       ├── goals.svg
│       └── success.svg
├── icons/
│   ├── favicon.ico
│   ├── icon-192.png
│   ├── icon-512.png
│   └── apple-touch-icon.png
└── fonts/                      # Custom fonts (if any)
```

---

## Tests Directory (`/tests`)

E2E and integration tests:

```
tests/
├── e2e/
│   ├── onboarding.spec.ts
│   ├── goals.spec.ts
│   ├── chat.spec.ts
│   ├── simulator.spec.ts
│   └── dashboard.spec.ts
├── integration/
│   ├── api/
│   │   ├── goals.test.ts
│   │   └── profile.test.ts
│   └── database/
│       └── queries.test.ts
├── fixtures/
│   ├── users.ts
│   ├── goals.ts
│   └── profiles.ts
└── helpers/
    ├── setup.ts
    └── teardown.ts
```

---

## Docs Directory (`/docs`)

Project documentation:

```
docs/
├── vision.md
├── project-constitution.md
├── product-requirements.md
├── system-architecture.md
├── database-design.md
├── ai-behavior.md
├── development-workflow.md
├── engineering-principles.md
├── roadmap.md
├── tasks.md
├── project-structure.md
├── milestones.md
└── api/                        # API documentation
    └── endpoints.md
```

---

## Configuration Files

### TypeScript Configuration (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "preserve",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowJs": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"],
      "@/components/*": ["./components/*"],
      "@/domain/*": ["./domain/*"],
      "@/features/*": ["./features/*"],
      "@/lib/*": ["./lib/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### ESLint Configuration (`.eslintrc.json`)

```json
{
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended"
  ],
  "rules": {
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": "off"
  }
}
```

### Prettier Configuration (`.prettierrc`)

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "tabWidth": 2,
  "printWidth": 80,
  "arrowParens": "avoid"
}
```

### Tailwind Configuration (`tailwind.config.ts`)

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './features/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        // ... other colors
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
```

---

## File Naming Conventions

### Components
- PascalCase: `GoalCard.tsx`, `ChatInterface.tsx`
- Co-located styles: `GoalCard.module.css` (if needed)

### Utilities
- camelCase: `formatCurrency.ts`, `calculateTotal.ts`

### Types
- PascalCase for interfaces/types: `Goal`, `Allocation`
- File: `types.ts`

### Tests
- Same name as file being tested: `allocation.test.ts`
- Or: `allocation.spec.ts`

### Server Actions
- File: `actions.ts`
- Exports: `createGoal`, `updateGoal`, etc.

---

## Import Path Aliases

```typescript
// Absolute imports using @ alias
import { Button } from '@/components/ui/button';
import { calculateAllocation } from '@/domain/financial/allocation';
import { createGoal } from '@/features/goals/actions';
import { db } from '@/lib/db';

// Relative imports for co-located files
import { GoalCard } from './GoalCard';
import { formatCurrency } from './utils';
```

---

## Environment Variables

### Development (`.env.local`)
```bash
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
OPENAI_API_KEY="sk-..."
NEXT_PUBLIC_POSTHOG_KEY="phc_..."
RESEND_API_KEY="re_..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

### Production (Vercel)
Same variables but with production values

---

## Build Output

```
.next/                          # Next.js build output (gitignored)
node_modules/                   # Dependencies (gitignored)
.vercel/                        # Vercel config (gitignored)
coverage/                       # Test coverage (gitignored)
playwright-report/              # Playwright reports (gitignored)
```

---

## Key Principles

1. **Feature-based organization** - Related code stays together
2. **Clear separation of concerns** - UI, logic, data separate
3. **Consistent naming** - Easy to find files
4. **Scalable structure** - Can grow without reorganization
5. **Type safety** - TypeScript throughout
6. **Testability** - Easy to test each layer
7. **Documentation** - Well-documented structure

---

## Developer Onboarding

New developers should:

1. Read `README.md`
2. Review this structure document
3. Understand the layered architecture
4. Follow the development workflow
5. Use the established patterns

The structure is designed to be intuitive and self-documenting.

---

## Conclusion

This structure provides:
- ✅ Clear organization
- ✅ Easy navigation
- ✅ Scalability
- ✅ Maintainability
- ✅ Developer-friendly
- ✅ Best practices

Follow this structure for all new code to maintain consistency.
