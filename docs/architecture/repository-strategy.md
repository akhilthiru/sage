# Sage: Repository Strategy

## Overview

This document explains Sage's repository architecture, the rationale for choosing a monorepo approach, and how it supports our startup-stage development needs.

**Decision:** Single monorepo with modular monolith architecture

---

## Why Monorepo?

### 1. Startup Velocity

**Context:** As a startup, we need to move fast and iterate quickly.

**Benefits:**
- **Single source of truth** - All code in one place
- **Atomic changes** - Update frontend and backend together
- **No version coordination** - No need to manage package versions across repos
- **Simplified CI/CD** - One pipeline for entire application
- **Faster onboarding** - New developers clone one repo

**Example:**
```bash
# Monorepo: One command to get started
git clone sage
cd sage
npm install
npm run dev

# Multi-repo: Multiple commands, version coordination
git clone sage-frontend
git clone sage-backend
git clone sage-shared
cd sage-frontend && npm install
cd ../sage-backend && npm install
# Ensure compatible versions of shared packages...
```

### 2. Code Sharing & Reuse

**Context:** Financial calculations, types, and business logic are shared across layers.

**Benefits:**
- **Shared types** - TypeScript types used everywhere
- **Shared utilities** - Financial calculations, validation, formatting
- **Shared components** - UI components, hooks, utilities
- **No package publishing** - Direct imports, no npm publish overhead

**Example:**
```typescript
// domain/financial/allocation.ts - Shared calculation
export function calculateAllocation(input: AllocationInput): Allocation {
  // Deterministic calculation logic
}

// features/dashboard/actions.ts - Backend uses it
import { calculateAllocation } from '@/domain/financial/allocation';

// features/dashboard/components/AllocationCard.tsx - Frontend uses types
import type { Allocation } from '@/domain/financial/types';
```

### 3. Refactoring Confidence

**Context:** Early-stage products evolve rapidly; we need to refactor fearlessly.

**Benefits:**
- **Find all usages** - IDE shows all references across codebase
- **Safe renames** - Rename symbols across frontend/backend atomically
- **No breaking changes** - Can't break API contracts accidentally
- **Type safety** - TypeScript catches errors across boundaries

**Example:**
```typescript
// Rename GoalType enum
// Multi-repo: Need to coordinate changes across repos, publish packages
// Monorepo: IDE renames everywhere instantly, TypeScript catches any misses
```

### 4. Simplified Dependency Management

**Context:** Managing dependencies across multiple repos is complex and error-prone.

**Benefits:**
- **Single package.json** - One dependency tree
- **No version conflicts** - All packages use same versions
- **Easier updates** - Update dependencies once
- **Smaller node_modules** - Shared dependencies

**Example:**
```json
// Single package.json for entire project
{
  "dependencies": {
    "next": "14.0.0",
    "prisma": "5.0.0",
    "zod": "3.22.0"
  }
}
```

### 5. Consistent Tooling

**Context:** Linting, formatting, testing should be consistent across codebase.

**Benefits:**
- **Shared configs** - ESLint, Prettier, TypeScript configs
- **Unified CI/CD** - One pipeline, one set of checks
- **Consistent code style** - Same rules everywhere
- **Easier maintenance** - Update tooling once

---

## Why NOT Polyrepo?

### Polyrepo Disadvantages for Startups

**1. Coordination Overhead**
- Need to coordinate changes across repos
- Version management complexity
- Breaking changes require careful orchestration

**2. Slower Development**
- Context switching between repos
- Multiple PRs for single feature
- Waiting for package publishes

**3. Code Duplication**
- Shared code requires publishing packages
- Temptation to duplicate instead of share
- Harder to keep shared code in sync

**4. Tooling Complexity**
- Multiple CI/CD pipelines
- Multiple deployment processes
- Multiple dependency trees

**When Polyrepo Makes Sense:**
- Large organizations with separate teams
- Different release cycles for components
- Different tech stacks for different services
- Clear ownership boundaries

**Our Reality:**
- Small team (< 10 developers initially)
- Shared ownership
- Rapid iteration
- Unified tech stack

---

## Repository Structure

### High-Level Organization

```
sage/
├── app/                    # Next.js App Router (Presentation)
├── features/               # Feature modules (Application)
├── domain/                 # Business logic (Domain)
├── lib/                    # Shared utilities (Infrastructure)
├── components/             # Shared UI components
├── prisma/                 # Database schema & migrations
├── public/                 # Static assets
├── tests/                  # Test suites
├── docs/                   # Documentation
└── scripts/                # Build & utility scripts
```

### Package Structure

**Single Package Approach:**
- One `package.json` at root
- All dependencies in one place
- Simpler for startup stage

**Future: Workspaces (if needed)**
```
sage/
├── packages/
│   ├── web/               # Next.js app
│   ├── domain/            # Business logic
│   ├── database/          # Prisma schema
│   └── shared/            # Shared utilities
└── package.json           # Root package.json
```

**When to split:**
- Team grows beyond 15-20 developers
- Need independent deployment of components
- Different release cycles required

---

## Import Strategy

### Path Aliases

**Configuration:**
```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"],
      "@/app/*": ["./app/*"],
      "@/features/*": ["./features/*"],
      "@/domain/*": ["./domain/*"],
      "@/lib/*": ["./lib/*"],
      "@/components/*": ["./components/*"],
      "@/types/*": ["./types/*"]
    }
  }
}
```

**Usage:**
```typescript
// ✅ Good: Absolute imports with aliases
import { calculateAllocation } from '@/domain/financial/allocation';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/db';

// ❌ Bad: Relative imports
import { calculateAllocation } from '../../../domain/financial/allocation';
```

### Import Rules

**1. Layer Dependencies (Dependency Inversion)**
```
Presentation → Application → Domain → Infrastructure
```

**Allowed:**
- Presentation can import from Application, Domain, Infrastructure
- Application can import from Domain, Infrastructure
- Domain can import from Infrastructure (interfaces only)
- Infrastructure cannot import from other layers

**Example:**
```typescript
// ✅ Allowed: Presentation → Domain
// app/dashboard/page.tsx
import { calculateAllocation } from '@/domain/financial/allocation';

// ✅ Allowed: Application → Domain
// features/goals/actions.ts
import { calculateGoalFeasibility } from '@/domain/financial/goals';

// ❌ Not allowed: Domain → Application
// domain/financial/allocation.ts
import { saveAllocation } from '@/features/allocation/actions'; // NO!
```

**2. Feature Isolation**
```typescript
// ✅ Allowed: Feature imports from domain
import { calculateAllocation } from '@/domain/financial/allocation';

// ❌ Not allowed: Feature imports from another feature
import { GoalCard } from '@/features/goals/components/GoalCard'; // NO!

// ✅ Allowed: Extract to shared components
import { GoalCard } from '@/components/goals/GoalCard';
```

---

## Monorepo Tools

### Current: Simple Monorepo (No Tool)

**Approach:** Single package.json, standard npm/pnpm

**Pros:**
- Zero configuration
- No learning curve
- Fast for small teams
- Works with standard tools

**Cons:**
- No task caching
- No selective builds
- All tests run every time

**Good for:** MVP, < 10 developers, < 100k LOC

### Future: Turborepo (When Needed)

**When to adopt:**
- Team > 10 developers
- Build times > 2 minutes
- Multiple packages/apps
- Need task caching

**Migration:**
```bash
npm install turbo --save-dev
```

```json
// turbo.json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": []
    },
    "lint": {
      "outputs": []
    }
  }
}
```

**Benefits:**
- Task caching (local & remote)
- Parallel execution
- Incremental builds
- Faster CI/CD

---

## Version Control Strategy

### Branching Strategy

**Trunk-Based Development:**
```
main (production)
  ↑
  └── feature/goal-creation
  └── feature/chat-interface
  └── fix/allocation-bug
```

**Rules:**
1. `main` is always deployable
2. Short-lived feature branches (< 2 days)
3. Frequent merges to main
4. Feature flags for incomplete features
5. No long-lived development branches

**Why trunk-based?**
- Reduces merge conflicts
- Faster feedback
- Simpler for small teams
- Encourages small, incremental changes

### Commit Convention

**Format:** `type(scope): description`

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build/tooling changes

**Examples:**
```bash
feat(goals): add goal feasibility calculation
fix(allocation): correct emergency fund priority
docs(architecture): add repository strategy
refactor(domain): extract allocation logic
test(financial): add EMI calculation tests
chore(deps): update Next.js to 14.1.0
```

### Release Strategy

**Semantic Versioning:** `MAJOR.MINOR.PATCH`

**Examples:**
- `1.0.0` - Initial launch
- `1.1.0` - New feature (goal milestones)
- `1.1.1` - Bug fix (allocation calculation)
- `2.0.0` - Breaking change (API restructure)

**Automation:**
```bash
# Automatic version bump based on commits
npm run release
```

---

## CI/CD Pipeline

### Single Pipeline for Entire App

**Workflow:**
```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test
      - run: npm run build
```

**Benefits:**
- Single pipeline to maintain
- All checks run together
- Fast feedback (< 5 minutes)
- Simple to understand

### Deployment Pipeline

**Vercel Integration:**
```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

**Automatic Deployments:**
- Push to `main` → Production
- Pull requests → Preview deployments
- Automatic rollback on errors

---

## Code Organization Principles

### 1. Feature-Based Structure

**Organize by feature, not by type:**

```
✅ Good: Feature-based
features/
  goals/
    components/
    actions/
    hooks/
    types/
  allocation/
    components/
    actions/
    hooks/
    types/

❌ Bad: Type-based
components/
  GoalCard.tsx
  AllocationCard.tsx
actions/
  goalActions.ts
  allocationActions.ts
```

**Benefits:**
- Related code together
- Easy to find code
- Clear ownership
- Easier to delete features

### 2. Domain-Driven Design

**Domain layer is pure business logic:**

```
domain/
  financial/
    allocation.ts       # Pure functions
    goals.ts           # Pure functions
    loans.ts           # Pure functions
    types.ts           # Domain types
  validation/
    schemas.ts         # Zod schemas
  constants/
    financial.ts       # Constants
```

**Rules:**
- No framework dependencies
- No database calls
- No external API calls
- Pure, testable functions

### 3. Shared Components

**Extract reusable components:**

```
components/
  ui/                  # shadcn/ui components
    button.tsx
    card.tsx
    input.tsx
  layout/
    header.tsx
    sidebar.tsx
  goals/               # Domain-specific shared
    goal-card.tsx
    goal-progress.tsx
```

---

## Dependency Management

### Package Manager: pnpm

**Why pnpm?**
- Faster than npm/yarn
- Disk space efficient (content-addressable store)
- Strict dependency resolution
- Better for monorepos

**Installation:**
```bash
npm install -g pnpm
```

**Usage:**
```bash
pnpm install           # Install dependencies
pnpm add <package>     # Add dependency
pnpm update            # Update dependencies
```

### Dependency Categories

**1. Production Dependencies**
```json
{
  "dependencies": {
    "next": "14.0.0",
    "react": "18.2.0",
    "prisma": "5.0.0",
    "@clerk/nextjs": "4.27.0",
    "openai": "4.20.0",
    "zod": "3.22.0"
  }
}
```

**2. Development Dependencies**
```json
{
  "devDependencies": {
    "typescript": "5.3.0",
    "eslint": "8.55.0",
    "prettier": "3.1.0",
    "vitest": "1.0.0",
    "@playwright/test": "1.40.0"
  }
}
```

### Update Strategy

**Regular Updates:**
- Security patches: Immediately
- Minor versions: Weekly
- Major versions: Quarterly (with testing)

**Tools:**
```bash
# Check for updates
pnpm outdated

# Update all to latest
pnpm update --latest

# Update specific package
pnpm update next --latest
```

---

## Testing Strategy

### Test Organization

**Co-located tests:**
```
features/
  goals/
    actions.ts
    actions.test.ts      # Unit tests
    components/
      GoalCard.tsx
      GoalCard.test.tsx  # Component tests
```

**Integration tests:**
```
tests/
  integration/
    goal-creation.test.ts
    allocation-calculation.test.ts
```

**E2E tests:**
```
tests/
  e2e/
    onboarding.spec.ts
    goal-journey.spec.ts
```

### Test Commands

```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run",
    "test:integration": "vitest run tests/integration",
    "test:e2e": "playwright test",
    "test:coverage": "vitest run --coverage"
  }
}
```

---

## Documentation Strategy

### Documentation in Monorepo

**Location:**
```
docs/
  architecture/        # This document
  domain/             # Domain design
  api/                # API documentation
  guides/             # How-to guides
  decisions/          # Architecture Decision Records (ADRs)
```

**Benefits:**
- Documentation versioned with code
- Easy to keep in sync
- Searchable with code
- No separate wiki to maintain

### Architecture Decision Records (ADRs)

**Format:**
```markdown
# ADR-001: Use Monorepo

## Status
Accepted

## Context
Need to choose repository structure for Sage.

## Decision
Use single monorepo with modular monolith.

## Consequences
- Faster development
- Easier refactoring
- Single CI/CD pipeline
- Need to manage growing codebase
```

---

## Migration Path

### Current: Simple Monorepo

**Stage:** MVP (0-6 months)
- Single package.json
- Standard npm/pnpm
- No build tools beyond Next.js

### Stage 2: Optimized Monorepo

**Stage:** Growth (6-12 months)
- Add Turborepo for caching
- Parallel test execution
- Incremental builds

### Stage 3: Workspace Monorepo

**Stage:** Scale (12-24 months)
- Split into packages
- Independent versioning
- Selective deployments

### Stage 4: Distributed System

**Stage:** Enterprise (24+ months)
- Extract microservices if needed
- Keep core as monolith
- Polyglot if required

**Decision Criteria:**
- Team size > 50 developers
- Clear service boundaries
- Independent scaling needs
- Different tech stack requirements

---

## Comparison: Monorepo vs Microservices

### Why NOT Microservices Initially?

**Microservices Overhead:**
1. **Network Complexity**
   - Service discovery
   - Load balancing
   - API gateways
   - Circuit breakers

2. **Data Consistency**
   - Distributed transactions
   - Eventual consistency
   - Data duplication

3. **Deployment Complexity**
   - Multiple deployments
   - Version coordination
   - Rollback complexity

4. **Development Overhead**
   - Multiple repos
   - API contracts
   - Testing complexity

5. **Operational Burden**
   - Multiple databases
   - Multiple monitoring
   - Multiple logs

**Startup Reality:**
- Small team (< 10 people)
- Need to move fast
- Limited ops resources
- Unclear service boundaries

### When to Consider Microservices

**Valid Reasons:**
1. **Independent Scaling**
   - Chat service needs 10x more instances than API
   - Clear, stable boundaries

2. **Team Organization**
   - Multiple autonomous teams
   - Clear ownership

3. **Technology Diversity**
   - Need Python for ML
   - Need Go for performance

4. **Deployment Independence**
   - Different release cycles
   - Different SLAs

**Our Approach:**
- Start with modular monolith
- Design for future extraction
- Extract services when needed, not preemptively

---

## Best Practices

### 1. Keep Modules Loosely Coupled

**Use interfaces:**
```typescript
// domain/financial/types.ts
export interface AllocationEngine {
  calculate(input: AllocationInput): Allocation;
}

// domain/financial/allocation.ts
export class StandardAllocationEngine implements AllocationEngine {
  calculate(input: AllocationInput): Allocation {
    // Implementation
  }
}
```

### 2. Enforce Boundaries with Linting

**ESLint rules:**
```json
{
  "rules": {
    "import/no-restricted-paths": [
      "error",
      {
        "zones": [
          {
            "target": "./domain",
            "from": "./features",
            "message": "Domain cannot import from features"
          }
        ]
      }
    ]
  }
}
```

### 3. Use Feature Flags

**Incomplete features:**
```typescript
// lib/feature-flags.ts
export const features = {
  bankSync: false,        // Not ready yet
  multiCurrency: false,   // Phase 2
  familyAccounts: false   // Phase 3
};

// features/dashboard/page.tsx
{features.bankSync && <BankSyncButton />}
```

### 4. Document Module Boundaries

**README in each module:**
```markdown
# Goals Module

## Purpose
Manage user financial goals.

## Public API
- `createGoal()`
- `updateGoal()`
- `deleteGoal()`

## Dependencies
- `@/domain/financial/goals`
- `@/lib/db`

## Dependents
- Dashboard
- Chat
```

---

## Conclusion

### Summary

**Monorepo Benefits for Sage:**
1. ✅ Faster development velocity
2. ✅ Easier refactoring
3. ✅ Simplified dependency management
4. ✅ Consistent tooling
5. ✅ Single CI/CD pipeline
6. ✅ Better code sharing

**Trade-offs Accepted:**
1. ⚠️ Single point of failure (mitigated by good testing)
2. ⚠️ Growing codebase (manageable with tooling)
3. ⚠️ All-or-nothing deploys (acceptable for startup)

### Decision

**Use monorepo with modular monolith architecture** for Sage's startup stage.

**Rationale:**
- Optimizes for speed and simplicity
- Reduces coordination overhead
- Enables fearless refactoring
- Provides clear migration path

**Review Criteria:**
- Team size reaches 15-20 developers
- Build times exceed 5 minutes
- Clear service boundaries emerge
- Independent scaling needs arise

---

**Document Version:** 1.0  
**Last Updated:** 2024-12-19  
**Next Review:** After 6 months of development  
**Owner:** Technical Architecture Team
