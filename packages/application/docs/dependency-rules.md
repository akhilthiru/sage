# Dependency Rules

**Package**: `@sage/application`  
**Version**: 1.0.0  
**Last Updated**: 2024

---

## Table of Contents

1. [Overview](#overview)
2. [Dependency Graph](#dependency-graph)
3. [Allowed Dependencies](#allowed-dependencies)
4. [Forbidden Dependencies](#forbidden-dependencies)
5. [Import Rules](#import-rules)
6. [Enforcement Mechanisms](#enforcement-mechanisms)

---

## Overview

Dependency rules ensure:

- ✅ **Unidirectional flow**: Dependencies point downward only
- ✅ **Loose coupling**: Layers depend on interfaces, not implementations
- ✅ **Independent evolution**: Lower layers can change without breaking upper layers
- ✅ **Testability**: Easy to mock dependencies

**Core Principle**: **Dependency Inversion**

> High-level modules should not depend on low-level modules. Both should depend on abstractions.

---

## Dependency Graph

### System-Wide Dependencies

```
┌─────────────────────────────────────────────────────────┐
│                  Presentation Layer                      │
│              (Next.js, React, Server Actions)            │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓ depends on
┌─────────────────────────────────────────────────────────┐
│                  Application Layer                       │
│              (Services, Use Cases, DTOs)                 │
└──────────┬──────────────────────┬───────────────────────┘
           │                      │
           ↓ depends on           ↓ depends on
┌──────────────────────┐   ┌──────────────────────────────┐
│   Domain Layer       │   │   Infrastructure Layer       │
│                      │   │                              │
│ • Financial Engine   │   │ • Repositories (interfaces)  │
│ • AI Service (intf)  │   │ • Prisma Client             │
│ • Domain Events      │   │ • External APIs             │
└──────────────────────┘   └──────────┬───────────────────┘
                                      │
                                      ↓ implements
                           ┌──────────────────────────┐
                           │  Repository Implementations │
                           │  (Database Package)         │
                           └──────────────────────────┘
```

### Application Layer Dependencies

```
┌─────────────────────────────────────────────────────────┐
│              @sage/application                           │
│                                                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐       │
│  │  Services  │  │    DTOs    │  │ Interfaces │       │
│  └─────┬──────┘  └────────────┘  └─────┬──────┘       │
│        │                                │              │
│        └────────────────┬───────────────┘              │
└─────────────────────────┼──────────────────────────────┘
                          │
         ┌────────────────┴────────────────┐
         ↓                                 ↓
┌──────────────────────┐        ┌──────────────────────┐
│ @sage/financial-engine│        │   @sage/database     │
│                      │        │                      │
│ • Pure functions     │        │ • Repository impls   │
│ • No dependencies    │        │ • Prisma Client      │
└──────────────────────┘        └──────────────────────┘
```

### Module Dependencies (Within Application Layer)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Onboarding  │────▶│  Allocation  │◀────│    Goals     │
│   Service    │     │   Service    │     │   Service    │
└──────────────┘     └──────────────┘     └──────────────┘
                            ▲
                            │
                     ┌──────┴──────┐
                     │             │
              ┌──────────────┐ ┌──────────────┐
              │   Expenses   │ │    Debts     │
              │   Service    │ │   Service    │
              └──────────────┘ └──────────────┘

Legend:
────▶ Event-based dependency (loose coupling)
```

---

## Allowed Dependencies

### ✅ Presentation → Application

**Allowed**:
```typescript
// apps/web/actions/goals.ts
import { GoalService } from '@sage/application/services/goals';
import { CreateGoalRequest } from '@sage/application/dtos';
```

**Why**: Presentation layer orchestrates application services.

---

### ✅ Application → Financial Engine

**Allowed**:
```typescript
// packages/application/src/services/goals/GoalService.ts
import { calculateAllocation } from '@sage/financial-engine';
import { AllocationInput } from '@sage/financial-engine/types';
```

**Why**: Application layer delegates calculations to domain logic.

---

### ✅ Application → Repository Interfaces

**Allowed**:
```typescript
// packages/application/src/services/goals/GoalService.ts
import { IGoalRepository } from '@sage/application/interfaces/repositories';
```

**Why**: Application depends on abstractions, not implementations.

---

### ✅ Application → AI Service Interface

**Allowed**:
```typescript
// packages/application/src/services/chat/ChatService.ts
import { IAIService } from '@sage/application/interfaces/services';
```

**Why**: Application depends on abstractions.

---

### ✅ Infrastructure → Application Interfaces

**Allowed**:
```typescript
// packages/database/src/repositories/GoalRepository.ts
import { IGoalRepository } from '@sage/application/interfaces/repositories';

export class GoalRepository implements IGoalRepository {
  // Implementation
}
```

**Why**: Infrastructure implements contracts defined by application.

---

### ✅ Application → Domain Events

**Allowed**:
```typescript
// packages/application/src/services/goals/GoalService.ts
import { GoalCreatedEvent } from '@sage/application/events';
```

**Why**: Application publishes domain events.

---

### ✅ Application → Common DTOs

**Allowed**:
```typescript
// packages/application/src/services/goals/GoalService.ts
import { PaginationRequest, ErrorResponse } from '@sage/application/dtos/common';
```

**Why**: Shared data structures within application layer.

---

## Forbidden Dependencies

### ❌ Repository → Application

**Forbidden**:
```typescript
// packages/database/src/repositories/GoalRepository.ts
import { GoalService } from '@sage/application/services/goals'; // ❌ FORBIDDEN
```

**Why**: Creates circular dependency. Repositories are lower-level than application services.

**Solution**: Use dependency injection. Application injects repositories into services.

---

### ❌ Financial Engine → Repository

**Forbidden**:
```typescript
// packages/financial-engine/src/allocation/calculateAllocation.ts
import { GoalRepository } from '@sage/database'; // ❌ FORBIDDEN
```

**Why**: Financial Engine must be pure. No side effects, no database access.

**Solution**: Application layer fetches data and passes it to Financial Engine.

```typescript
// ✅ Correct approach
const goals = await goalRepository.findActiveByUserId(userId);
const result = calculateAllocation({ goals, ... });
```

---

### ❌ Financial Engine → Application

**Forbidden**:
```typescript
// packages/financial-engine/src/allocation/calculateAllocation.ts
import { GoalService } from '@sage/application'; // ❌ FORBIDDEN
```

**Why**: Financial Engine is domain logic, should have no dependencies.

---

### ❌ Presentation → Financial Engine

**Forbidden**:
```typescript
// apps/web/components/GoalCard.tsx
import { calculateGoalProgress } from '@sage/financial-engine'; // ❌ FORBIDDEN
```

**Why**: Presentation should not perform calculations. Get pre-calculated data from Application layer.

**Solution**:
```typescript
// ✅ Correct: Application calculates, Presentation displays
// In Application Layer
const progress = calculateGoalProgress({ goal });
return { ...goalDTO, progressPercentage: progress };

// In Presentation Layer
function GoalCard({ goal }) {
  return <div>{goal.progressPercentage}%</div>;
}
```

---

### ❌ Presentation → Repository

**Forbidden**:
```typescript
// apps/web/app/goals/page.tsx
import { GoalRepository } from '@sage/database'; // ❌ FORBIDDEN

const goals = await goalRepository.findByUserId(userId); // ❌ FORBIDDEN
```

**Why**: Presentation should not access data layer directly.

**Solution**: Use Application layer services.

```typescript
// ✅ Correct
import { GoalService } from '@sage/application';

const goalService = new GoalService(dependencies);
const goals = await goalService.listGoals({ userId });
```

---

### ❌ Repository → Financial Engine

**Forbidden**:
```typescript
// packages/database/src/repositories/GoalRepository.ts
import { calculateGoalProgress } from '@sage/financial-engine'; // ❌ FORBIDDEN

async create(data) {
  const progress = calculateGoalProgress(data); // ❌ FORBIDDEN
  return await this.prisma.goal.create({ data: { ...data, progress } });
}
```

**Why**: Repositories should only handle persistence, not calculations.

**Solution**: Application layer calculates, then persists.

```typescript
// ✅ Correct
// In Application Layer
const progress = calculateGoalProgress({ goal });
await goalRepository.create({ ...data, progress });
```

---

### ❌ AI Service → Financial Engine

**Forbidden**:
```typescript
// packages/ai/src/AIService.ts
import { calculateAllocation } from '@sage/financial-engine'; // ❌ FORBIDDEN

async generateResponse(input) {
  const allocation = calculateAllocation(input); // ❌ FORBIDDEN
  return `Your allocation is ${allocation.needs}`;
}
```

**Why**: AI should explain, not calculate.

**Solution**: Application calculates, passes results to AI for explanation.

```typescript
// ✅ Correct
// In Application Layer
const allocation = calculateAllocation({ ... });
const aiResponse = await aiService.generateResponse({
  question: input.question,
  context: { allocation }, // Pre-calculated
});
```

---

### ❌ Cross-Module Direct Dependencies

**Forbidden**:
```typescript
// packages/application/src/services/goals/GoalService.ts
import { ExpenseService } from '@sage/application/services/expenses'; // ❌ FORBIDDEN

async createGoal(request) {
  await this.expenseService.recalculate(); // ❌ FORBIDDEN
}
```

**Why**: Creates tight coupling between modules.

**Solution**: Use events for cross-module communication.

```typescript
// ✅ Correct: Event-based
async createGoal(request) {
  const goal = await this.goalRepository.create(data);
  
  // Publish event
  await this.eventPublisher.publish(new GoalCreatedEvent({ goalId: goal.id }));
  
  // ExpenseService subscribes to GoalCreatedEvent
}
```

---

## Import Rules

### 1. **Application Layer Imports**

**Allowed Imports**:
```typescript
// From Financial Engine
import { calculateAllocation } from '@sage/financial-engine';

// From own interfaces
import { IGoalRepository } from '@sage/application/interfaces/repositories';

// From own DTOs
import { CreateGoalRequest, GoalResponse } from '@sage/application/dtos';

// From own events
import { GoalCreatedEvent } from '@sage/application/events';

// From own errors
import { NotFoundError, ValidationError } from '@sage/application/errors';
```

**Forbidden Imports**:
```typescript
// ❌ From Prisma
import { PrismaClient } from '@prisma/client'; // FORBIDDEN

// ❌ From Database package
import { GoalRepository } from '@sage/database'; // FORBIDDEN (use interface)

// ❌ From Presentation
import { GoalCard } from '@/components/goals'; // FORBIDDEN
```

---

### 2. **Financial Engine Imports**

**Allowed Imports**:
```typescript
// Only internal imports
import { sumExpenses } from './utils';
import { AllocationInput } from './types';
```

**Forbidden Imports**:
```typescript
// ❌ No external dependencies
import { GoalRepository } from '@sage/database'; // FORBIDDEN
import { GoalService } from '@sage/application'; // FORBIDDEN
import { PrismaClient } from '@prisma/client'; // FORBIDDEN
```

---

### 3. **Repository Imports**

**Allowed Imports**:
```typescript
// From Prisma
import { PrismaClient } from '@prisma/client';

// From Application interfaces (to implement)
import { IGoalRepository } from '@sage/application/interfaces/repositories';

// From Application DTOs (for type definitions)
import { CreateGoalInput, Goal } from '@sage/application/types';
```

**Forbidden Imports**:
```typescript
// ❌ From Application services
import { GoalService } from '@sage/application/services'; // FORBIDDEN

// ❌ From Financial Engine
import { calculateAllocation } from '@sage/financial-engine'; // FORBIDDEN
```

---

### 4. **Presentation Layer Imports**

**Allowed Imports**:
```typescript
// From Application
import { GoalService } from '@sage/application/services/goals';
import { CreateGoalRequest, GoalResponse } from '@sage/application/dtos';

// React, Next.js
import { useState } from 'react';
import { useRouter } from 'next/navigation';
```

**Forbidden Imports**:
```typescript
// ❌ From Financial Engine
import { calculateAllocation } from '@sage/financial-engine'; // FORBIDDEN

// ❌ From Database
import { GoalRepository } from '@sage/database'; // FORBIDDEN
import { PrismaClient } from '@prisma/client'; // FORBIDDEN
```

---

## Enforcement Mechanisms

### 1. **TypeScript Configuration**

**tsconfig.json** (Application Layer):
```json
{
  "compilerOptions": {
    "paths": {
      "@sage/financial-engine": ["../financial-engine/src"],
      "@sage/application/*": ["./src/*"]
    }
  },
  "exclude": [
    "../database",
    "../../apps/web"
  ]
}
```

---

### 2. **ESLint Rules**

**.eslintrc.js**:
```javascript
module.exports = {
  rules: {
    'import/no-restricted-paths': [
      'error',
      {
        zones: [
          // Financial Engine cannot import anything
          {
            target: './packages/financial-engine/src',
            from: './packages',
            except: ['./financial-engine/src'],
            message: 'Financial Engine must have no external dependencies',
          },
          
          // Repositories cannot import from Application
          {
            target: './packages/database/src/repositories',
            from: './packages/application/src/services',
            message: 'Repositories cannot import Application services',
          },
          
          // Application cannot import Repository implementations
          {
            target: './packages/application/src',
            from: './packages/database/src/repositories',
            message: 'Application must depend on interfaces, not implementations',
          },
          
          // Presentation cannot import Financial Engine
          {
            target: './apps/web',
            from: './packages/financial-engine',
            message: 'Presentation cannot import Financial Engine directly',
          },
          
          // Presentation cannot import Database
          {
            target: './apps/web',
            from: './packages/database',
            message: 'Presentation cannot import Database directly',
          },
        ],
      },
    ],
  },
};
```

---

### 3. **Architecture Tests**

**tests/architecture.test.ts**:
```typescript
import { describe, it, expect } from 'vitest';
import { checkDependencies } from './utils/dependency-checker';

describe('Architecture Rules', () => {
  it('Financial Engine has no external dependencies', () => {
    const violations = checkDependencies(
      'packages/financial-engine/src',
      {
        allowed: [],
        forbidden: ['@sage/application', '@sage/database', '@prisma/client'],
      }
    );
    
    expect(violations).toHaveLength(0);
  });

  it('Application does not import Repository implementations', () => {
    const violations = checkDependencies(
      'packages/application/src',
      {
        allowed: ['@sage/financial-engine'],
        forbidden: ['@sage/database/repositories', '@prisma/client'],
      }
    );
    
    expect(violations).toHaveLength(0);
  });

  it('Repositories do not import Application services', () => {
    const violations = checkDependencies(
      'packages/database/src/repositories',
      {
        allowed: ['@prisma/client', '@sage/application/interfaces'],
        forbidden: ['@sage/application/services', '@sage/financial-engine'],
      }
    );
    
    expect(violations).toHaveLength(0);
  });

  it('Presentation does not import Financial Engine', () => {
    const violations = checkDependencies(
      'apps/web',
      {
        allowed: ['@sage/application'],
        forbidden: ['@sage/financial-engine', '@sage/database', '@prisma/client'],
      }
    );
    
    expect(violations).toHaveLength(0);
  });
});
```

---

### 4. **Dependency Injection**

**Enforce via constructor injection**:

```typescript
// Application Layer
export class GoalService {
  // Depend on interfaces, not implementations
  constructor(
    private goalRepository: IGoalRepository, // Interface
    private allocationRepository: IAllocationRepository, // Interface
    private financialEngine: IFinancialEngine, // Interface
    private eventPublisher: IEventPublisher // Interface
  ) {}
}

// API Layer (dependency injection)
export async function createGoalAction(formData: FormData) {
  // Instantiate implementations
  const goalRepository = new GoalRepository(prisma);
  const allocationRepository = new AllocationRepository(prisma);
  const financialEngine = new FinancialEngine();
  const eventPublisher = new EventPublisher();

  // Inject into service
  const goalService = new GoalService(
    goalRepository,
    allocationRepository,
    financialEngine,
    eventPublisher
  );

  return await goalService.createGoal(request);
}
```

---

### 5. **Package.json Dependencies**

**packages/application/package.json**:
```json
{
  "name": "@sage/application",
  "dependencies": {
    "@sage/financial-engine": "workspace:*"
  },
  "devDependencies": {
    "@sage/database": "workspace:*"
  }
}
```

**Note**: Database is `devDependency` for type definitions only, not runtime.

---

### 6. **Module Boundaries via Barrel Exports**

**packages/application/src/index.ts**:
```typescript
// Only export public API
export * from './services';
export * from './dtos';
export * from './interfaces';
export * from './events';
export * from './errors';

// Do NOT export internal implementation details
```

**packages/financial-engine/src/index.ts**:
```typescript
// Only export pure functions
export * from './allocation';
export * from './goals';
export * from './loans';
export * from './simulations';
export * from './health';

// Do NOT export internal utilities
```

---

## Summary

### Dependency Flow

```
Presentation
    ↓
Application
    ↓         ↓
Financial   Infrastructure
Engine      (Repositories)
```

### Key Rules

1. **Dependencies flow downward only**
2. **Depend on abstractions (interfaces), not implementations**
3. **Financial Engine has ZERO dependencies**
4. **No circular dependencies**
5. **Cross-module communication via events**
6. **Presentation never imports Financial Engine or Repositories**
7. **Application never imports Repository implementations**
8. **Repositories never import Application services**

### Enforcement

- ✅ TypeScript path aliases
- ✅ ESLint import restrictions
- ✅ Architecture tests
- ✅ Dependency injection
- ✅ Package.json dependencies
- ✅ Code reviews

### Benefits

- **Testability**: Mock dependencies easily
- **Flexibility**: Swap implementations without breaking contracts
- **Maintainability**: Changes are localized
- **Clarity**: Clear dependency direction
- **Performance**: No circular dependencies, faster builds

---

**Next**: Define validation strategy across layers.
