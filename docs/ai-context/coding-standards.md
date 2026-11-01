# Sage: Coding Standards for AI Development

**Code Style, Patterns, and Conventions**

---

## TypeScript Standards

### Strict Mode (Required)

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### Type Safety Rules

**1. No `any` Type**
```typescript
// ❌ NEVER use any
function processData(data: any) {
  return data.value;
}

// ✅ Use specific types
function processData(data: GoalInput): Goal {
  return createGoal(data);
}

// ✅ Use unknown if type is truly unknown
function processData(data: unknown): Goal {
  const validated = GoalSchema.parse(data);
  return createGoal(validated);
}
```

**2. Explicit Return Types**
```typescript
// ❌ BAD: Implicit return type
function calculateEMI(principal: number, rate: number, tenure: number) {
  return principal * rate;
}

// ✅ GOOD: Explicit return type
function calculateEMI(
  principal: number,
  rate: number,
  tenure: number
): number {
  return principal * rate;
}
```

**3. Strict Null Checks**
```typescript
// ❌ BAD: Assuming value exists
function getGoalName(goal: Goal) {
  return goal.name.toUpperCase();
}

// ✅ GOOD: Handle null/undefined
function getGoalName(goal: Goal | null): string {
  return goal?.name?.toUpperCase() ?? 'Unnamed Goal';
}
```

**4. Type Guards**
```typescript
// ✅ Use type guards for narrowing
function isGoal(value: unknown): value is Goal {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'targetAmount' in value
  );
}

if (isGoal(data)) {
  // TypeScript knows data is Goal here
  console.log(data.targetAmount);
}
```

---

## Naming Conventions

### Files and Folders

**Files:**
```
kebab-case for all files
create-goal.ts          ✅
createGoal.ts           ❌
CreateGoal.ts           ❌
```

**Folders:**
```
kebab-case for folders
features/goals/         ✅
features/Goals/         ❌
features/goal-module/   ✅
```

**Components:**
```
PascalCase.tsx for React components
GoalCard.tsx            ✅
goal-card.tsx           ❌
goalCard.tsx            ❌
```

### Variables and Functions

**Variables:**
```typescript
// camelCase for variables
const monthlyIncome = 80000;          ✅
const MonthlyIncome = 80000;          ❌
const monthly_income = 80000;         ❌
```

**Functions:**
```typescript
// camelCase for functions
function calculateAllocation() {}     ✅
function CalculateAllocation() {}     ❌
function calculate_allocation() {}    ❌
```

**Constants:**
```typescript
// UPPER_SNAKE_CASE for true constants
const MAX_GOALS = 10;                 ✅
const DEFAULT_EMERGENCY_FUND_MONTHS = 6;  ✅
const maxGoals = 10;                  ❌
```

**Types and Interfaces:**
```typescript
// PascalCase for types/interfaces
interface Goal {}                     ✅
type AllocationInput = {};            ✅
interface goal {}                     ❌
type allocation_input = {};           ❌
```

**Enums:**
```typescript
// PascalCase for enum name, UPPER_SNAKE_CASE for values
enum GoalStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED'
}                                     ✅

enum goalStatus {
  active = 'active'
}                                     ❌
```

### Naming Patterns

**Boolean Variables:**
```typescript
// Prefix with is/has/should/can
const isActive = true;                ✅
const hasMilestones = false;          ✅
const shouldRecalculate = true;       ✅
const canAfford = false;              ✅

const active = true;                  ❌
const milestones = false;             ❌
```

**Arrays:**
```typescript
// Plural nouns
const goals = [];                     ✅
const expenses = [];                  ✅

const goalList = [];                  ❌
const expenseArray = [];              ❌
```

**Functions:**
```typescript
// Verb + noun
function createGoal() {}              ✅
function calculateAllocation() {}     ✅
function validateInput() {}           ✅

function goal() {}                    ❌
function allocation() {}              ❌
```

---

## Code Organization

### File Structure

**Server Action File:**
```typescript
// features/goals/actions/create-goal.ts

'use server';

import { auth } from '@clerk/nextjs';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { GoalSchema } from '@/domain/validation/schemas/goal';
import { calculateGoalFeasibility } from '@/domain/financial/goals';
import type { Goal, GoalInput } from '../types';

// 1. Type definitions
type CreateGoalResult = 
  | { success: true; data: Goal }
  | { success: false; error: string; code: string };

// 2. Main function
export async function createGoal(input: unknown): Promise<CreateGoalResult> {
  // Auth check
  const { userId } = auth();
  if (!userId) {
    return { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' };
  }
  
  // Validation
  const validated = GoalSchema.parse(input);
  
  // Business logic
  const goal = await db.goal.create({
    data: { ...validated, userId }
  });
  
  // Side effects
  revalidatePath('/goals');
  
  return { success: true, data: goal };
}

// 3. Helper functions (if needed)
function isEmergencyFundGoal(type: string): boolean {
  return type === 'EMERGENCY_FUND';
}
```

**React Component File:**
```typescript
// features/goals/components/GoalCard.tsx

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Goal } from '../types';

// 1. Type definitions
interface GoalCardProps {
  goal: Goal;
  onEdit?: (goal: Goal) => void;
  onDelete?: (goalId: string) => void;
}

// 2. Component
export function GoalCard({ goal, onEdit, onDelete }: GoalCardProps) {
  // Hooks first
  const [isEditing, setIsEditing] = useState(false);
  
  // Derived state
  const progress = (goal.currentAmount / goal.targetAmount) * 100;
  
  // Event handlers
  const handleEdit = () => {
    setIsEditing(true);
    onEdit?.(goal);
  };
  
  // Render
  return (
    <Card>
      {/* JSX */}
    </Card>
  );
}

// 3. Helper components (if needed)
function GoalProgress({ progress }: { progress: number }) {
  return <div>{progress}%</div>;
}
```

### Import Order

```typescript
// 1. External dependencies
import { useState, useEffect } from 'react';
import { z } from 'zod';

// 2. Internal absolute imports (by layer)
import { db } from '@/lib/db';
import { calculateAllocation } from '@/domain/financial/allocation';
import { GoalSchema } from '@/domain/validation/schemas/goal';

// 3. Relative imports
import { GoalCard } from './GoalCard';
import type { Goal } from '../types';

// 4. CSS/styles (if any)
import './styles.css';
```

### Export Patterns

**Named Exports (Preferred):**
```typescript
// ✅ GOOD: Named exports
export function createGoal() {}
export function updateGoal() {}
export type { Goal, GoalInput };
```

**Default Exports (Components Only):**
```typescript
// ✅ OK: Default export for page components
export default function GoalsPage() {
  return <div>Goals</div>;
}

// ❌ BAD: Default export for utilities
export default function calculateEMI() {}
```

**Public API (index.ts):**
```typescript
// features/goals/index.ts

// Export only public API
export { createGoal } from './actions/create-goal';
export { updateGoal } from './actions/update-goal';
export { deleteGoal } from './actions/delete-goal';
export type { Goal, GoalInput } from './types';

// Do NOT export internal utilities
// Internal: ./lib/validation.ts (not exported)
```

---

## Function Standards

### Function Length

**Target:** < 50 lines  
**Maximum:** 100 lines (with justification)

```typescript
// ❌ BAD: Too long (150+ lines)
function createGoalWithEverything() {
  // validation
  // business logic
  // database operations
  // side effects
  // error handling
  // logging
  // notifications
  // cache invalidation
  // ... 150 lines
}

// ✅ GOOD: Focused functions
async function createGoal(input: GoalInput): Promise<Goal> {
  const validated = validateGoalInput(input);
  const goal = await saveGoal(validated);
  await handleGoalCreated(goal);
  return goal;
}

async function validateGoalInput(input: GoalInput): Promise<ValidatedGoal> {
  // validation logic
}

async function saveGoal(data: ValidatedGoal): Promise<Goal> {
  // database logic
}

async function handleGoalCreated(goal: Goal): Promise<void> {
  // side effects
}
```

### Function Parameters

**Maximum:** 3 parameters  
**Use object for > 3 parameters**

```typescript
// ❌ BAD: Too many parameters
function calculateEMI(
  principal: number,
  rate: number,
  tenure: number,
  startDate: Date,
  endDate: Date,
  type: string
) {}

// ✅ GOOD: Object parameter
interface EMIInput {
  principal: number;
  rate: number;
  tenure: number;
  startDate: Date;
  endDate: Date;
  type: string;
}

function calculateEMI(input: EMIInput): number {}
```

### Pure Functions (Domain Layer)

```typescript
// ✅ Pure function (no side effects)
function calculateAllocation(input: AllocationInput): Allocation {
  // Only calculations, no:
  // - Database calls
  // - API calls
  // - Logging
  // - State mutations
  return result;
}

// ❌ Impure function (has side effects)
function calculateAllocation(userId: string): Allocation {
  const profile = await db.findProfile(userId); // Side effect!
  logger.info('Calculating'); // Side effect!
  return result;
}
```

---

## React Patterns

### Server Components (Default)

```typescript
// app/goals/page.tsx

// Server Component (default in App Router)
export default async function GoalsPage() {
  // Direct database access
  const goals = await db.goal.findMany({
    where: { userId }
  });
  
  return <GoalList goals={goals} />;
}
```

### Client Components (When Needed)

```typescript
// features/goals/components/GoalForm.tsx

'use client'; // Only when needed

import { useState } from 'react';

export function GoalForm() {
  // Client-side state
  const [name, setName] = useState('');
  
  // Event handlers
  const handleSubmit = async () => {
    await createGoal({ name });
  };
  
  return <form onSubmit={handleSubmit}>...</form>;
}
```

**Use Client Components for:**
- Interactive state (useState, useReducer)
- Browser APIs (localStorage, window)
- Event handlers (onClick, onChange)
- React hooks (useEffect, useContext)

**Use Server Components for:**
- Data fetching
- Direct database access
- Sensitive operations
- SEO-critical content

### Hooks

**Custom Hook Pattern:**
```typescript
// features/goals/hooks/useGoals.ts

import { useQuery } from '@tanstack/react-query';
import { getGoals } from '../actions';

export function useGoals() {
  return useQuery({
    queryKey: ['goals'],
    queryFn: () => getGoals()
  });
}

// Usage
const { data: goals, isLoading, error } = useGoals();
```

**Hook Rules:**
- Prefix with `use`
- Only call at top level
- Only call from React functions
- Extract complex logic from components

---

## Error Handling

### Result Type Pattern

```typescript
// Preferred pattern for operations that can fail
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

// Usage
async function createGoal(input: GoalInput): Promise<Result<Goal>> {
  try {
    const goal = await db.goal.create({ data: input });
    return { success: true, data: goal };
  } catch (error) {
    return { 
      success: false, 
      error: { 
        code: 'CREATE_GOAL_ERROR',
        message: 'Failed to create goal'
      }
    };
  }
}

// Calling code
const result = await createGoal(input);
if (result.success) {
  console.log(result.data); // TypeScript knows this is Goal
} else {
  console.error(result.error); // TypeScript knows this is Error
}
```

### Try-Catch Pattern

```typescript
// Use for unexpected errors
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  // Log with context
  logger.error({ error, userId, operation: 'createGoal' }, 'Operation failed');
  
  // Rethrow or return error result
  throw new Error('Operation failed');
}
```

### Validation Errors

```typescript
// Use Zod for validation
import { z } from 'zod';

const GoalSchema = z.object({
  name: z.string().min(1).max(100),
  targetAmount: z.number().positive()
});

try {
  const validated = GoalSchema.parse(input);
} catch (error) {
  if (error instanceof z.ZodError) {
    return {
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: error.flatten().fieldErrors
    };
  }
}
```

---

## Database Patterns

### Query Patterns

**Select Specific Fields:**
```typescript
// ✅ GOOD: Select only needed fields
const goals = await db.goal.findMany({
  where: { userId },
  select: {
    id: true,
    name: true,
    targetAmount: true,
    currentAmount: true
  }
});

// ❌ BAD: Select all fields when not needed
const goals = await db.goal.findMany({
  where: { userId }
});
```

**Use Includes for Relations:**
```typescript
// ✅ GOOD: Include related data
const goals = await db.goal.findMany({
  where: { userId },
  include: {
    milestones: true
  }
});

// ❌ BAD: N+1 query
const goals = await db.goal.findMany({ where: { userId } });
for (const goal of goals) {
  goal.milestones = await db.goalMilestone.findMany({ where: { goalId: goal.id } });
}
```

**Transactions:**
```typescript
// ✅ Use transactions for multiple related operations
await db.$transaction([
  db.goal.create({ data: goalData }),
  db.allocation.update({ where: { userId }, data: newAllocation }),
  db.notification.create({ data: notificationData })
]);

// ❌ Separate operations (can fail partially)
await db.goal.create({ data: goalData });
await db.allocation.update({ where: { userId }, data: newAllocation });
await db.notification.create({ data: notificationData });
```

### Soft Deletes

```typescript
// ✅ ALWAYS soft delete
await db.goal.update({
  where: { id: goalId },
  data: { deletedAt: new Date() }
});

// ❌ NEVER hard delete
await db.goal.delete({ where: { id: goalId } });
```

---

## Testing Standards

### Test File Naming

```
Same name as file being tested, with .test.ts suffix
calculate-emi.ts       → calculate-emi.test.ts
GoalCard.tsx           → GoalCard.test.tsx
```

### Test Structure

```typescript
// domain/financial/__tests__/allocation.test.ts

import { describe, it, expect } from 'vitest';
import { calculateAllocation } from '../allocation';

describe('calculateAllocation', () => {
  // Group related tests
  describe('essential expenses', () => {
    it('should cap essential expenses at 50% of income', () => {
      const result = calculateAllocation({
        monthlyIncome: 80000,
        expenses: [{ amount: 50000, isEssential: true }],
        debts: [],
        goals: []
      });
      
      expect(result.essentialExpenses).toBeLessThanOrEqual(40000);
    });
    
    it('should prioritize essential expenses', () => {
      // Test implementation
    });
  });
  
  describe('edge cases', () => {
    it('should handle zero income', () => {
      // Test implementation
    });
    
    it('should handle insufficient income', () => {
      // Test implementation
    });
  });
});
```

### Test Naming

```typescript
// Pattern: should [expected behavior] when [condition]
it('should return feasible when utilization < 1.0', () => {});
it('should throw error when target date is in past', () => {});
it('should calculate EMI correctly for zero interest', () => {});
```

### Test Coverage

**Required:**
- Financial calculations: 100%
- Business logic: 80%
- UI components: 60%

**What to Test:**
- Happy path
- Edge cases
- Error conditions
- Boundary values
- State transitions

**What NOT to Test:**
- Third-party libraries
- Framework code
- Trivial getters/setters

---

## Comments and Documentation

### When to Comment

**DO Comment:**
- Complex algorithms
- Business rules
- Non-obvious decisions
- Workarounds
- TODOs

**DON'T Comment:**
- Obvious code
- What code does (code should be self-explanatory)
- Commented-out code (delete it)

### Comment Style

```typescript
// ✅ GOOD: Explain WHY, not WHAT
// Emergency fund takes priority over goals when below target
// This ensures users maintain financial safety net
if (currentEmergencyFund < emergencyFundTarget) {
  prioritize(emergencyFund, goals);
}

// ❌ BAD: Explains WHAT (obvious from code)
// Check if emergency fund is less than target
if (currentEmergencyFund < emergencyFundTarget) {
  prioritize(emergencyFund, goals);
}
```

### JSDoc for Public APIs

```typescript
/**
 * Calculates monthly EMI for a loan
 * 
 * @param principal - Loan amount in rupees
 * @param annualRate - Annual interest rate (e.g., 12 for 12%)
 * @param tenureMonths - Loan tenure in months
 * @returns Monthly EMI amount
 * 
 * @example
 * const emi = calculateEMI(500000, 12, 12);
 * // Returns 44424
 */
export function calculateEMI(
  principal: number,
  annualRate: number,
  tenureMonths: number
): number {
  // Implementation
}
```

### TODO Comments

```typescript
// TODO: Add support for variable interest rates
// TODO(alice): Optimize this query for large datasets
// FIXME: This breaks when tenure is 0
// HACK: Temporary workaround until API is fixed
```

---

## Performance Guidelines

### Avoid Premature Optimization

```typescript
// ❌ BAD: Premature optimization
const memoizedCalculation = useMemo(
  () => calculateSimpleAddition(a, b),
  [a, b]
);

// ✅ GOOD: Optimize when measured
// Only memoize expensive calculations
const memoizedAllocation = useMemo(
  () => calculateAllocation(profile), // Expensive
  [profile]
);
```

### Lazy Loading

```typescript
// ✅ Lazy load heavy components
import dynamic from 'next/dynamic';

const AllocationChart = dynamic(
  () => import('@/components/charts/AllocationChart'),
  { loading: () => <ChartSkeleton /> }
);
```

### Pagination

```typescript
// ✅ Always paginate large lists
const goals = await db.goal.findMany({
  where: { userId },
  take: 20,
  skip: page * 20,
  orderBy: { createdAt: 'desc' }
});
```

---

## Security Guidelines

### Input Validation

```typescript
// ✅ ALWAYS validate user input
const validated = GoalSchema.parse(input);

// ❌ NEVER trust user input
const goal = await db.goal.create({ data: input });
```

### Authentication

```typescript
// ✅ ALWAYS check auth in Server Actions
'use server';

import { auth } from '@clerk/nextjs';

export async function createGoal(input: GoalInput) {
  const { userId } = auth();
  if (!userId) {
    throw new Error('Unauthorized');
  }
  
  // Proceed with authenticated user
}
```

### Row-Level Security

```typescript
// ✅ ALWAYS filter by userId
const goals = await db.goal.findMany({
  where: { userId } // Ensures users only see their data
});

// ❌ NEVER query without userId filter
const goals = await db.goal.findMany(); // Exposes all users' data!
```

### Sensitive Data

```typescript
// ✅ Redact sensitive data in logs
logger.info({ 
  userId,
  income: '[REDACTED]',
  savings: '[REDACTED]'
});

// ❌ Never log sensitive data
logger.info({ userId, income: 80000, savings: 200000 });
```

---

## Code Review Checklist

**Before Submitting PR:**
- [ ] TypeScript strict mode passing
- [ ] ESLint passing (no warnings)
- [ ] Prettier formatted
- [ ] Tests written and passing
- [ ] No console.log statements
- [ ] No commented-out code
- [ ] Sensitive data redacted in logs
- [ ] Error handling implemented
- [ ] Types exported from public API
- [ ] Documentation updated (if needed)

**Code Quality:**
- [ ] Functions < 50 lines
- [ ] No `any` types
- [ ] Explicit return types
- [ ] Meaningful variable names
- [ ] Comments explain WHY, not WHAT
- [ ] No duplicate code

**Architecture:**
- [ ] Follows layer dependencies
- [ ] Uses public APIs only
- [ ] No circular dependencies
- [ ] Domain logic is pure
- [ ] AI explains, engine calculates

---

## Quick Reference

### File Naming
- Files: `kebab-case.ts`
- Components: `PascalCase.tsx`
- Tests: `same-name.test.ts`

### Variable Naming
- Variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Types: `PascalCase`
- Booleans: `isActive`, `hasValue`

### Function Guidelines
- Max 50 lines
- Max 3 parameters
- Explicit return types
- Pure functions in domain layer

### Import Order
1. External dependencies
2. Internal absolute imports
3. Relative imports
4. Styles

### Testing
- Financial: 100% coverage
- Business logic: 80% coverage
- UI: 60% coverage

---

**Document Version:** 1.0  
**Last Updated:** 2024-12-19  
**Purpose:** Coding standards for consistent AI-generated code  
**Enforcement:** ESLint, Prettier, TypeScript, code review
