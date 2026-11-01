# Sage: Development Workflow

## Overview

This document defines the development workflow, processes, and best practices for building Sage.

## Development Environment Setup

### Prerequisites

```bash
# Required
- Node.js 18+ 
- npm or pnpm
- Git
- PostgreSQL (local or cloud)

# Recommended
- VS Code with extensions:
  - Prisma
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
```

### Initial Setup

```bash
# 1. Clone repository
git clone <repository-url>
cd sage

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# 4. Set up database
npx prisma generate
npx prisma migrate dev
npx prisma db seed

# 5. Run development server
npm run dev

# 6. Open browser
# Navigate to http://localhost:3000
```

### Environment Variables

```bash
# .env.local

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/sage_dev"

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/dashboard"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/onboarding"

# AI (OpenAI)
OPENAI_API_KEY="sk-..."

# Analytics (PostHog)
NEXT_PUBLIC_POSTHOG_KEY="phc_..."
NEXT_PUBLIC_POSTHOG_HOST="https://app.posthog.com"

# Email (Resend)
RESEND_API_KEY="re_..."

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

---

## Git Workflow

### Branch Strategy

```
main
  ├── develop
  │   ├── feature/onboarding
  │   ├── feature/goals
  │   ├── feature/chat
  │   └── feature/simulator
  └── hotfix/critical-bug
```

**Branches:**
- `main` - Production-ready code
- `develop` - Integration branch
- `feature/*` - New features
- `bugfix/*` - Bug fixes
- `hotfix/*` - Critical production fixes

### Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Format
<type>(<scope>): <description>

# Types
feat:     New feature
fix:      Bug fix
docs:     Documentation
style:    Formatting, missing semicolons, etc.
refactor: Code restructuring
test:     Adding tests
chore:    Maintenance

# Examples
feat(onboarding): add income input step
fix(goals): correct feasibility calculation
docs(readme): update setup instructions
refactor(allocation): extract calculation logic
test(goals): add feasibility tests
chore(deps): update dependencies
```

### Feature Development Workflow

```bash
# 1. Create feature branch from develop
git checkout develop
git pull origin develop
git checkout -b feature/goal-management

# 2. Develop feature
# Make changes, commit frequently

# 3. Keep branch updated
git fetch origin
git rebase origin/develop

# 4. Push to remote
git push origin feature/goal-management

# 5. Create Pull Request
# Via GitHub/GitLab interface

# 6. Code review and merge
# After approval, merge to develop

# 7. Delete feature branch
git branch -d feature/goal-management
```

### Pull Request Guidelines

**PR Title:**
```
feat(goals): Add goal feasibility calculator
```

**PR Description Template:**
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] New feature
- [ ] Bug fix
- [ ] Breaking change
- [ ] Documentation update

## Changes Made
- Added goal feasibility calculation
- Created GoalService class
- Added unit tests
- Updated documentation

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] No console errors

## Screenshots (if applicable)
[Add screenshots]

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings
- [ ] Tests added/updated
```

---

## Code Organization

### Project Structure

```
sage/
├── app/                      # Next.js app directory
│   ├── (auth)/              # Auth routes
│   │   ├── sign-in/
│   │   └── sign-up/
│   ├── (dashboard)/         # Protected routes
│   │   ├── dashboard/
│   │   ├── goals/
│   │   ├── profile/
│   │   └── chat/
│   ├── api/                 # API routes
│   │   ├── webhooks/
│   │   └── health/
│   ├── layout.tsx
│   └── page.tsx
├── components/              # React components
│   ├── ui/                  # Base UI components (shadcn)
│   ├── features/            # Feature-specific components
│   │   ├── onboarding/
│   │   ├── goals/
│   │   ├── chat/
│   │   └── dashboard/
│   └── layouts/
├── domain/                  # Business logic
│   ├── financial/           # Financial calculations
│   │   ├── allocation.ts
│   │   ├── goals.ts
│   │   ├── affordability.ts
│   │   └── __tests__/
│   ├── simulation/          # Scenario simulation
│   │   ├── scenarios.ts
│   │   ├── timeline.ts
│   │   └── __tests__/
│   └── ai/                  # AI services
│       ├── chat.ts
│       ├── intent.ts
│       ├── prompts/
│       └── __tests__/
├── features/                # Feature modules
│   ├── onboarding/
│   │   ├── actions.ts       # Server actions
│   │   ├── hooks.ts         # React hooks
│   │   ├── types.ts         # TypeScript types
│   │   └── utils.ts         # Utilities
│   ├── goals/
│   ├── chat/
│   └── profile/
├── lib/                     # Shared utilities
│   ├── db.ts               # Prisma client
│   ├── auth.ts             # Auth utilities
│   ├── openai.ts           # OpenAI client
│   ├── analytics.ts        # PostHog
│   ├── errors.ts           # Error classes
│   └── utils.ts            # General utilities
├── prisma/
│   ├── schema.prisma       # Database schema
│   ├── migrations/         # Database migrations
│   └── seed.ts             # Seed data
├── public/                 # Static assets
├── docs/                   # Documentation
├── tests/                  # E2E tests
│   ├── e2e/
│   └── integration/
├── .env.example
├── .env.local
├── .gitignore
├── next.config.js
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── README.md
```

### File Naming Conventions

```
# Components (PascalCase)
GoalCard.tsx
AllocationChart.tsx
ChatInterface.tsx

# Utilities (camelCase)
calculateAllocation.ts
formatCurrency.ts
validateGoal.ts

# Types (PascalCase)
types.ts (exports: Goal, Allocation, etc.)

# Tests (*.test.ts or *.spec.ts)
allocation.test.ts
goals.spec.ts

# Server Actions (camelCase)
actions.ts (exports: createGoal, updateGoal, etc.)
```

---

## Development Practices

### TypeScript Guidelines

**Use Strict Mode:**
```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true
  }
}
```

**Define Types:**
```typescript
// ❌ Bad
function calculateTotal(items: any) {
  return items.reduce((sum, item) => sum + item.amount, 0);
}

// ✅ Good
interface Item {
  amount: number;
}

function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.amount, 0);
}
```

**Use Zod for Validation:**
```typescript
import { z } from 'zod';

export const createGoalSchema = z.object({
  name: z.string().min(1).max(100),
  targetAmount: z.number().positive(),
  targetDate: z.date().min(new Date()),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']),
});

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
```

### Component Guidelines

**Server Components (Default):**
```typescript
// app/dashboard/page.tsx
export default async function DashboardPage() {
  const profile = await getFinancialProfile();
  
  return <Dashboard profile={profile} />;
}
```

**Client Components (When Needed):**
```typescript
// components/features/chat/ChatInterface.tsx
'use client';

import { useState } from 'react';

export function ChatInterface() {
  const [messages, setMessages] = useState([]);
  
  return (
    // Interactive UI
  );
}
```

**Component Structure:**
```typescript
// 1. Imports
import { useState } from 'react';
import { Button } from '@/components/ui/button';

// 2. Types
interface Props {
  goal: Goal;
  onUpdate: (goal: Goal) => void;
}

// 3. Component
export function GoalCard({ goal, onUpdate }: Props) {
  // 4. Hooks
  const [isEditing, setIsEditing] = useState(false);
  
  // 5. Handlers
  const handleSave = () => {
    // ...
  };
  
  // 6. Render
  return (
    // JSX
  );
}
```

### Server Actions

```typescript
// features/goals/actions.ts
'use server';

import { z } from 'zod';
import { getCurrentUserId } from '@/lib/auth';
import { db } from '@/lib/db';

const createGoalSchema = z.object({
  name: z.string().min(1),
  targetAmount: z.number().positive(),
  targetDate: z.date(),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']),
});

export async function createGoal(input: unknown) {
  try {
    // 1. Validate input
    const data = createGoalSchema.parse(input);
    
    // 2. Authenticate
    const userId = await getCurrentUserId();
    
    // 3. Execute business logic
    const goal = await db.goal.create({
      data: {
        ...data,
        userId,
      },
    });
    
    // 4. Return result
    return { success: true, data: goal };
  } catch (error) {
    // 5. Handle errors
    console.error('Error creating goal:', error);
    return { success: false, error: 'Failed to create goal' };
  }
}
```

### Database Operations

**Use Prisma Client:**
```typescript
import { db } from '@/lib/db';

// ❌ Bad: Multiple queries
const user = await db.user.findUnique({ where: { id } });
const goals = await db.goal.findMany({ where: { userId: id } });

// ✅ Good: Single query with include
const user = await db.user.findUnique({
  where: { id },
  include: {
    goals: {
      where: { status: 'ACTIVE' },
    },
  },
});
```

**Handle Errors:**
```typescript
try {
  const goal = await db.goal.create({ data });
} catch (error) {
  if (error.code === 'P2002') {
    // Unique constraint violation
    throw new ValidationError('Goal already exists');
  }
  throw error;
}
```

---

## Testing Strategy

### Unit Tests

**Financial Engine Tests:**
```typescript
// domain/financial/__tests__/allocation.test.ts
import { describe, it, expect } from 'vitest';
import { calculateAllocation } from '../allocation';

describe('calculateAllocation', () => {
  it('should allocate correctly with basic inputs', () => {
    const result = calculateAllocation({
      income: 80000,
      expenses: [{ amount: 30000, category: 'rent' }],
      debts: [],
      goals: [],
      emergencyFundTarget: 180000,
      currentEmergencyFund: 0,
    });

    expect(result.essentialExpenses).toBe(30000);
    expect(result.emergencyFund).toBeGreaterThan(0);
    expect(result.totalAllocated).toBeLessThanOrEqual(80000);
  });

  it('should prioritize emergency fund', () => {
    const result = calculateAllocation({
      income: 80000,
      expenses: [{ amount: 30000, category: 'rent' }],
      debts: [],
      goals: [{ targetAmount: 500000, monthlyRequired: 20000 }],
      emergencyFundTarget: 180000,
      currentEmergencyFund: 0,
    });

    expect(result.emergencyFund).toBeGreaterThan(result.goalSavings);
  });
});
```

**Run Tests:**
```bash
npm run test              # Run all tests
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage
```

### Integration Tests

**Server Action Tests:**
```typescript
// features/goals/__tests__/actions.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createGoal } from '../actions';
import { db } from '@/lib/db';

describe('createGoal', () => {
  beforeEach(async () => {
    // Clean up database
    await db.goal.deleteMany();
  });

  it('should create goal successfully', async () => {
    const result = await createGoal({
      name: 'House',
      targetAmount: 500000,
      targetDate: new Date('2028-01-01'),
      priority: 'HIGH',
    });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.name).toBe('House');
  });

  it('should validate input', async () => {
    const result = await createGoal({
      name: '',
      targetAmount: -1000,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
```

### E2E Tests

**Playwright Tests:**
```typescript
// tests/e2e/onboarding.spec.ts
import { test, expect } from '@playwright/test';

test('user can complete onboarding', async ({ page }) => {
  // Navigate to app
  await page.goto('/');
  
  // Click get started
  await page.click('text=Get Started');
  
  // Fill onboarding form
  await page.fill('[name="income"]', '80000');
  await page.fill('[name="savings"]', '100000');
  await page.selectOption('[name="goal"]', 'house');
  await page.fill('[name="loans"]', '0');
  
  // Submit
  await page.click('text=Continue');
  
  // Verify dashboard loads
  await expect(page.locator('text=Your Monthly Allocation')).toBeVisible();
  await expect(page.locator('text=CFO Understanding')).toBeVisible();
});

test('user can create a goal', async ({ page }) => {
  // Assume user is logged in
  await page.goto('/dashboard');
  
  // Navigate to goals
  await page.click('text=Goals');
  
  // Create new goal
  await page.click('text=Add Goal');
  await page.fill('[name="name"]', 'Vacation');
  await page.fill('[name="amount"]', '50000');
  await page.fill('[name="date"]', '2027-06-01');
  await page.selectOption('[name="priority"]', 'MEDIUM');
  
  // Submit
  await page.click('text=Create Goal');
  
  // Verify goal appears
  await expect(page.locator('text=Vacation')).toBeVisible();
});
```

**Run E2E Tests:**
```bash
npm run test:e2e          # Run E2E tests
npm run test:e2e:ui       # With UI
```

---

## Code Quality

### Linting

**ESLint Configuration:**
```json
// .eslintrc.json
{
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended"
  ],
  "rules": {
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "error"
  }
}
```

**Run Linter:**
```bash
npm run lint              # Check for issues
npm run lint:fix          # Auto-fix issues
```

### Formatting

**Prettier Configuration:**
```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "tabWidth": 2,
  "printWidth": 80
}
```

**Run Formatter:**
```bash
npm run format            # Format all files
```

### Type Checking

```bash
npm run type-check        # Check TypeScript types
```

### Pre-commit Hooks

**Husky + lint-staged:**
```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

---

## Database Workflow

### Creating Migrations

```bash
# 1. Modify schema.prisma
# Add/modify models

# 2. Create migration
npx prisma migrate dev --name add_goal_milestones

# 3. Review migration SQL
# Check prisma/migrations/[timestamp]_add_goal_milestones/migration.sql

# 4. Apply migration
# Already applied by migrate dev

# 5. Generate Prisma Client
npx prisma generate
```

### Seeding Database

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create test users
  const user = await prisma.user.upsert({
    where: { email: 'test@sage.app' },
    update: {},
    create: {
      clerkId: 'test_user_1',
      email: 'test@sage.app',
      firstName: 'Test',
      lastName: 'User',
      profile: {
        create: {
          monthlyIncome: 80000,
          currentSavings: 100000,
          emergencyFundTarget: 240000,
        },
      },
    },
  });

  console.log('Seed completed:', user);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

**Run Seed:**
```bash
npx prisma db seed
```

### Resetting Database

```bash
# WARNING: This deletes all data
npx prisma migrate reset
```

---

## Deployment Workflow

### Pre-deployment Checklist

- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] Performance tested
- [ ] Security reviewed

### Vercel Deployment

**Automatic Deployment:**
```bash
# Push to main branch
git push origin main

# Vercel automatically:
# 1. Builds the application
# 2. Runs tests
# 3. Deploys to production
```

**Manual Deployment:**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Environment Variables (Production)

Set in Vercel dashboard:
- `DATABASE_URL`
- `CLERK_SECRET_KEY`
- `OPENAI_API_KEY`
- `RESEND_API_KEY`
- `NEXT_PUBLIC_*` variables

### Database Migrations (Production)

```bash
# Run migrations on production database
npx prisma migrate deploy
```

---

## Monitoring & Debugging

### Logging

```typescript
// lib/logger.ts
export function logError(error: Error, context?: any) {
  console.error('Error:', {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
  });
}

export function logInfo(message: string, data?: any) {
  console.log('Info:', {
    message,
    data,
    timestamp: new Date().toISOString(),
  });
}
```

### Error Tracking

**Sentry Integration (Future):**
```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

### Performance Monitoring

**Vercel Analytics:**
```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

---

## Documentation

### Code Documentation

**JSDoc Comments:**
```typescript
/**
 * Calculates monthly allocation based on income, expenses, and goals
 * 
 * @param input - Financial profile and goals
 * @returns Allocation breakdown by category
 * 
 * @example
 * const allocation = calculateAllocation({
 *   income: 80000,
 *   expenses: [...],
 *   goals: [...]
 * });
 */
export function calculateAllocation(input: AllocationInput): AllocationOutput {
  // Implementation
}
```

### README Updates

Keep README.md updated with:
- Setup instructions
- Development commands
- Architecture overview
- Contributing guidelines

### Changelog

Maintain CHANGELOG.md:
```markdown
# Changelog

## [1.0.0] - 2026-06-17

### Added
- Initial MVP release
- Onboarding flow
- Goal management
- AI chat interface
- Allocation engine

### Changed
- N/A

### Fixed
- N/A
```

---

## Team Collaboration

### Daily Workflow

1. **Morning:**
   - Pull latest changes
   - Review assigned tasks
   - Plan day's work

2. **Development:**
   - Work on feature branch
   - Commit frequently
   - Push to remote

3. **Code Review:**
   - Create PR
   - Address feedback
   - Merge when approved

4. **End of Day:**
   - Push all changes
   - Update task status
   - Document blockers

### Communication

**Slack Channels:**
- `#engineering` - Technical discussions
- `#product` - Product updates
- `#bugs` - Bug reports
- `#deploys` - Deployment notifications

**Stand-ups:**
- Daily async updates
- What did you do?
- What will you do?
- Any blockers?

---

## Troubleshooting

### Common Issues

**Database Connection Error:**
```bash
# Check DATABASE_URL
echo $DATABASE_URL

# Test connection
npx prisma db pull
```

**Build Errors:**
```bash
# Clear cache
rm -rf .next
rm -rf node_modules
npm install
npm run build
```

**Type Errors:**
```bash
# Regenerate Prisma types
npx prisma generate

# Check types
npm run type-check
```

---

## Conclusion

This workflow ensures:
- ✅ Consistent code quality
- ✅ Efficient collaboration
- ✅ Reliable deployments
- ✅ Maintainable codebase
- ✅ Fast iteration

Follow these practices to build Sage efficiently and effectively.
