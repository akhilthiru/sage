# Sage: Development Workflow Guide

**Development Processes for AI-Assisted Development**

---

## Development Workflow

### Starting a New Feature

**1. Understand Requirements**
```
Read:
- User story or feature request
- Product boundaries (is it in scope?)
- Business rules (what constraints apply?)
- Existing related code
```

**2. Plan Implementation**
```
Identify:
- Which module does this belong to?
- What entities are affected?
- What calculations are needed?
- What validations are required?
- What tests are needed?
```

**3. Create Branch**
```bash
# Branch naming: feature/description or fix/description
git checkout -b feature/goal-milestones
git checkout -b fix/allocation-calculation-bug
```

**4. Implement**
```
Order:
1. Domain layer (pure logic, calculations)
2. Validation schemas (Zod)
3. Application layer (Server Actions)
4. Presentation layer (UI components)
5. Tests (throughout, not at end)
```

**5. Test**
```bash
# Run tests
npm run test

# Run type check
npm run type-check

# Run linter
npm run lint

# Run formatter
npm run format
```

**6. Commit**
```bash
# Commit message format: type(scope): description
git commit -m "feat(goals): add milestone tracking"
git commit -m "fix(allocation): correct emergency fund calculation"
git commit -m "docs(api): update goal endpoints"
```

**7. Push and Create PR**
```bash
git push origin feature/goal-milestones
# Create PR on GitHub
```

---

## Feature Implementation Pattern

### Example: Adding Goal Milestones

**Step 1: Domain Model (Prisma Schema)**
```prisma
// prisma/schema.prisma

model GoalMilestone {
  id           String   @id @default(cuid())
  goalId       String
  goal         Goal     @relation(fields: [goalId], references: [id])
  name         String
  targetAmount Decimal
  targetDate   DateTime
  isCompleted  Boolean  @default(false)
  completedAt  DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

**Step 2: Run Migration**
```bash
npx prisma migrate dev --name add_goal_milestones
```

**Step 3: Validation Schema**
```typescript
// domain/validation/schemas/goal-milestone.ts

import { z } from 'zod';

export const GoalMilestoneSchema = z.object({
  goalId: z.string().cuid(),
  name: z.string().min(1).max(100),
  targetAmount: z.number().positive(),
  targetDate: z.string().datetime()
}).refine(
  data => new Date(data.targetDate) > new Date(),
  'Target date must be in future'
);

export type GoalMilestoneInput = z.infer<typeof GoalMilestoneSchema>;
```

**Step 4: Types**
```typescript
// features/goals/types/milestone.ts

export interface GoalMilestone {
  id: string;
  goalId: string;
  name: string;
  targetAmount: number;
  targetDate: string;
  isCompleted: boolean;
  completedAt: string | null;
}
```

**Step 5: Server Action**
```typescript
// features/goals/actions/create-milestone.ts

'use server';

import { auth } from '@clerk/nextjs';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { GoalMilestoneSchema } from '@/domain/validation/schemas/goal-milestone';
import type { GoalMilestone } from '../types/milestone';

type Result = 
  | { success: true; data: GoalMilestone }
  | { success: false; error: string; code: string };

export async function createMilestone(input: unknown): Promise<Result> {
  // Auth
  const { userId } = auth();
  if (!userId) {
    return { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' };
  }
  
  // Validate
  const validated = GoalMilestoneSchema.parse(input);
  
  // Check goal ownership
  const goal = await db.goal.findFirst({
    where: { id: validated.goalId, userId }
  });
  
  if (!goal) {
    return { success: false, error: 'Goal not found', code: 'NOT_FOUND' };
  }
  
  // Create milestone
  const milestone = await db.goalMilestone.create({
    data: validated
  });
  
  // Revalidate
  revalidatePath('/goals');
  
  return { success: true, data: milestone };
}
```

**Step 6: UI Component**
```typescript
// features/goals/components/MilestoneForm.tsx

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createMilestone } from '../actions/create-milestone';

interface MilestoneFormProps {
  goalId: string;
  onSuccess?: () => void;
}

export function MilestoneForm({ goalId, onSuccess }: MilestoneFormProps) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = await createMilestone({
      goalId,
      name,
      targetAmount: parseFloat(amount),
      targetDate: new Date(date).toISOString()
    });
    
    if (result.success) {
      onSuccess?.();
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <Input 
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Milestone name"
      />
      <Input 
        type="number"
        value={amount}
        onChange={e => setAmount(e.target.value)}
        placeholder="Target amount"
      />
      <Input 
        type="date"
        value={date}
        onChange={e => setDate(e.target.value)}
      />
      <Button type="submit">Create Milestone</Button>
    </form>
  );
}
```

**Step 7: Tests**
```typescript
// features/goals/actions/__tests__/create-milestone.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { createMilestone } from '../create-milestone';

describe('createMilestone', () => {
  it('should create milestone successfully', async () => {
    const result = await createMilestone({
      goalId: 'goal_123',
      name: 'Save 50%',
      targetAmount: 250000,
      targetDate: '2025-12-31T00:00:00Z'
    });
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Save 50%');
    }
  });
  
  it('should reject future date in past', async () => {
    await expect(
      createMilestone({
        goalId: 'goal_123',
        name: 'Test',
        targetAmount: 100000,
        targetDate: '2020-01-01T00:00:00Z'
      })
    ).rejects.toThrow();
  });
});
```

**Step 8: Update Public API**
```typescript
// features/goals/index.ts

export { createGoal } from './actions/create-goal';
export { updateGoal } from './actions/update-goal';
export { deleteGoal } from './actions/delete-goal';
export { createMilestone } from './actions/create-milestone'; // NEW
export type { Goal, GoalInput, GoalMilestone } from './types';
```

---

## Bug Fix Workflow

### 1. Reproduce Bug

```typescript
// Create failing test first
describe('calculateAllocation', () => {
  it('should handle zero income correctly', () => {
    const result = calculateAllocation({
      monthlyIncome: 0,
      expenses: [],
      debts: [],
      goals: []
    });
    
    // This test fails, reproducing the bug
    expect(result.totalAllocated).toBe(0);
  });
});
```

### 2. Identify Root Cause

```typescript
// Add logging to understand issue
function calculateAllocation(input: AllocationInput): Allocation {
  console.log('Input:', input); // Debug
  
  // Find the problematic line
  const essentialExpenses = sumExpenses(input.expenses);
  console.log('Essential expenses:', essentialExpenses); // Debug
  
  // ...
}
```

### 3. Fix Issue

```typescript
// Fix the bug
function calculateAllocation(input: AllocationInput): Allocation {
  // Add validation
  if (input.monthlyIncome <= 0) {
    return {
      warning: 'INCOME_INSUFFICIENT',
      totalIncome: input.monthlyIncome,
      totalAllocated: 0,
      // ... zero allocations
    };
  }
  
  // Continue normal flow
}
```

### 4. Verify Fix

```bash
# Test passes now
npm run test

# Manual testing
npm run dev
# Test in browser
```

### 5. Add Regression Test

```typescript
// Ensure bug doesn't come back
describe('calculateAllocation edge cases', () => {
  it('should handle zero income', () => {
    const result = calculateAllocation({
      monthlyIncome: 0,
      expenses: [],
      debts: [],
      goals: []
    });
    
    expect(result.warning).toBe('INCOME_INSUFFICIENT');
    expect(result.totalAllocated).toBe(0);
  });
  
  it('should handle negative income', () => {
    // Additional edge case
  });
});
```

---

## Database Workflow

### Adding New Field

**1. Update Prisma Schema**
```prisma
model Goal {
  // ... existing fields
  notes String? // NEW FIELD
}
```

**2. Create Migration**
```bash
npx prisma migrate dev --name add_goal_notes
```

**3. Update Types**
```typescript
// features/goals/types/goal.ts
export interface Goal {
  // ... existing fields
  notes?: string; // NEW
}
```

**4. Update Validation**
```typescript
// domain/validation/schemas/goal.ts
export const GoalSchema = z.object({
  // ... existing fields
  notes: z.string().max(500).optional() // NEW
});
```

**5. Update UI**
```typescript
// Add field to form
<Textarea
  value={notes}
  onChange={e => setNotes(e.target.value)}
  placeholder="Notes (optional)"
/>
```

### Modifying Existing Field

**1. Update Schema**
```prisma
model Goal {
  targetAmount Decimal @db.Decimal(12, 2) // Changed precision
}
```

**2. Create Migration**
```bash
npx prisma migrate dev --name update_target_amount_precision
```

**3. Test Migration**
```bash
# Test on development database
npx prisma migrate deploy

# Verify data integrity
npx prisma studio
```

---

## Testing Workflow

### Unit Tests (Domain Layer)

```typescript
// domain/financial/__tests__/allocation.test.ts

import { describe, it, expect } from 'vitest';
import { calculateAllocation } from '../allocation';

describe('calculateAllocation', () => {
  // Test happy path
  it('should allocate income correctly', () => {
    const result = calculateAllocation({
      monthlyIncome: 80000,
      expenses: [{ amount: 40000, isEssential: true }],
      debts: [],
      goals: []
    });
    
    expect(result.essentialExpenses).toBe(40000);
    expect(result.totalAllocated).toBe(80000);
  });
  
  // Test edge cases
  it('should cap essential expenses at 50%', () => {
    const result = calculateAllocation({
      monthlyIncome: 80000,
      expenses: [{ amount: 50000, isEssential: true }],
      debts: [],
      goals: []
    });
    
    expect(result.essentialExpenses).toBeLessThanOrEqual(40000);
  });
  
  // Test error conditions
  it('should handle insufficient income', () => {
    const result = calculateAllocation({
      monthlyIncome: 30000,
      expenses: [{ amount: 40000, isEssential: true }],
      debts: [{ minimumPayment: 5000 }],
      goals: []
    });
    
    expect(result.warning).toBe('INCOME_INSUFFICIENT');
  });
});
```

### Integration Tests (Application Layer)

```typescript
// features/goals/__tests__/create-goal.integration.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { createGoal } from '../actions/create-goal';
import { db } from '@/lib/db';

describe('createGoal integration', () => {
  beforeEach(async () => {
    // Clean up test data
    await db.goal.deleteMany({ where: { userId: 'test_user' } });
  });
  
  it('should create goal and calculate feasibility', async () => {
    const result = await createGoal({
      name: 'House',
      targetAmount: 500000,
      targetDate: '2026-12-31T00:00:00Z',
      priority: 'HIGH'
    });
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isFeasible).toBeDefined();
      expect(result.data.feasibilityScore).toBeGreaterThanOrEqual(0);
    }
  });
  
  it('should prevent duplicate emergency fund goals', async () => {
    // Create first emergency fund goal
    await createGoal({
      name: 'Emergency Fund',
      type: 'EMERGENCY_FUND',
      targetAmount: 240000,
      targetDate: '2025-12-31T00:00:00Z'
    });
    
    // Try to create second
    const result = await createGoal({
      name: 'Another Emergency Fund',
      type: 'EMERGENCY_FUND',
      targetAmount: 300000,
      targetDate: '2025-12-31T00:00:00Z'
    });
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('DUPLICATE_EMERGENCY_FUND');
    }
  });
});
```

### E2E Tests (User Journeys)

```typescript
// tests/e2e/goal-creation.spec.ts

import { test, expect } from '@playwright/test';

test('user can create a goal', async ({ page }) => {
  // Navigate to goals page
  await page.goto('/goals');
  
  // Click create button
  await page.click('text=Create Goal');
  
  // Fill form
  await page.fill('[name="name"]', 'House Down Payment');
  await page.fill('[name="targetAmount"]', '500000');
  await page.fill('[name="targetDate"]', '2026-12-31');
  await page.selectOption('[name="priority"]', 'HIGH');
  
  // Submit
  await page.click('button[type="submit"]');
  
  // Verify success
  await expect(page.locator('text=House Down Payment')).toBeVisible();
  await expect(page.locator('text=₹5,00,000')).toBeVisible();
});

test('user sees feasibility warning for unrealistic goal', async ({ page }) => {
  await page.goto('/goals/new');
  
  await page.fill('[name="name"]', 'Mansion');
  await page.fill('[name="targetAmount"]', '50000000'); // 5 crores
  await page.fill('[name="targetDate"]', '2025-01-01'); // 1 month
  
  await page.click('button[type="submit"]');
  
  // Should show warning
  await expect(page.locator('text=not feasible')).toBeVisible();
});
```

---

## Code Review Process

### Self-Review Checklist

**Before Creating PR:**
- [ ] Code follows coding standards
- [ ] All tests pass
- [ ] TypeScript compiles without errors
- [ ] ESLint passes without warnings
- [ ] Code is formatted with Prettier
- [ ] No console.log statements
- [ ] No commented-out code
- [ ] Sensitive data is redacted in logs
- [ ] Error handling is implemented
- [ ] Documentation is updated

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issue
Closes #123

## Changes Made
- Added goal milestone tracking
- Updated goal feasibility calculation
- Added validation for milestone dates

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed

## Screenshots (if applicable)
[Add screenshots]

## Checklist
- [ ] Code follows project standards
- [ ] Self-review completed
- [ ] Tests pass
- [ ] Documentation updated
```

### Review Guidelines

**What to Look For:**
1. **Correctness:** Does it work as intended?
2. **Architecture:** Follows layer dependencies?
3. **Type Safety:** No `any` types?
4. **Testing:** Adequate test coverage?
5. **Security:** Input validation, auth checks?
6. **Performance:** Any obvious bottlenecks?
7. **Maintainability:** Clear, readable code?

**Common Issues:**
- LLM performing calculations (Rule #1 violation)
- Breaking module boundaries
- Missing input validation
- Logging sensitive data
- Hard deletes instead of soft deletes
- Missing error handling
- Insufficient test coverage

---

## Deployment Workflow

### Development

```bash
# Run locally
npm run dev

# Access at http://localhost:3000
```

### Preview (PR Deployments)

```
Automatic on PR creation:
1. Push branch to GitHub
2. Create PR
3. Vercel automatically deploys preview
4. Preview URL posted as comment on PR
```

### Production

```
Automatic on merge to main:
1. Merge PR to main
2. Vercel automatically deploys to production
3. Monitor deployment in Vercel dashboard
```

### Rollback

```
If deployment fails:
1. Go to Vercel dashboard
2. Find previous working deployment
3. Click "Promote to Production"
4. Deployment rolls back in < 1 minute
```

---

## Git Workflow

### Branch Naming

```
feature/description    - New features
fix/description        - Bug fixes
docs/description       - Documentation
refactor/description   - Code refactoring
test/description       - Test additions
chore/description      - Maintenance tasks
```

### Commit Messages

**Format:** `type(scope): description`

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `test`: Tests
- `chore`: Maintenance

**Examples:**
```bash
git commit -m "feat(goals): add milestone tracking"
git commit -m "fix(allocation): correct emergency fund calculation"
git commit -m "docs(api): update goal endpoints documentation"
git commit -m "refactor(goals): extract validation logic"
git commit -m "test(allocation): add edge case tests"
git commit -m "chore(deps): update dependencies"
```

### Pull Request Workflow

```
1. Create feature branch
   git checkout -b feature/goal-milestones

2. Make changes and commit
   git add .
   git commit -m "feat(goals): add milestone tracking"

3. Push to GitHub
   git push origin feature/goal-milestones

4. Create PR on GitHub
   - Fill out PR template
   - Request review
   - Link related issues

5. Address review comments
   git add .
   git commit -m "fix: address review comments"
   git push

6. Merge when approved
   - Squash and merge (preferred)
   - Delete branch after merge
```

---

## AI Development Guidelines

### Starting an AI Session

**1. Load Context**
```
Read in order:
1. /docs/ai-context/project-context.md
2. /docs/ai-context/business-rules.md
3. /docs/ai-context/coding-standards.md
4. /docs/ai-context/workflow-guide.md (this file)
5. /docs/ai-context/glossary.md
```

**2. Understand Task**
```
Ask:
- What is the goal?
- Is it in scope?
- What constraints apply?
- What files are affected?
```

**3. Plan Approach**
```
Identify:
- Which layer? (Domain, Application, Presentation)
- Which module? (Goals, Allocation, Chat, etc.)
- What needs to change?
- What tests are needed?
```

### During Development

**Always:**
- Follow coding standards
- Respect module boundaries
- Use public APIs only
- Validate all inputs
- Handle errors properly
- Write tests
- Redact sensitive data in logs

**Never:**
- Use LLM for calculations
- Break layer dependencies
- Use `any` types
- Hard delete data
- Log sensitive information
- Skip validation
- Ignore errors

### Code Generation Patterns

**Server Action:**
```typescript
'use server';

import { auth } from '@clerk/nextjs';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { Schema } from '@/domain/validation/schemas';

export async function action(input: unknown) {
  const { userId } = auth();
  if (!userId) throw new Error('Unauthorized');
  
  const validated = Schema.parse(input);
  
  const result = await db.model.create({ data: validated });
  
  revalidatePath('/path');
  
  return result;
}
```

**React Component:**
```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { action } from '../actions';

export function Component() {
  const [state, setState] = useState('');
  
  const handleSubmit = async () => {
    await action({ state });
  };
  
  return <Button onClick={handleSubmit}>Submit</Button>;
}
```

**Financial Calculation:**
```typescript
// domain/financial/calculation.ts

export function calculate(input: Input): Output {
  // Pure function
  // No side effects
  // Fully testable
  return result;
}
```

---

## Troubleshooting

### Common Issues

**TypeScript Errors:**
```bash
# Clear cache and rebuild
rm -rf .next
npm run build

# Check for type errors
npm run type-check
```

**Database Issues:**
```bash
# Reset database (development only)
npx prisma migrate reset

# Generate Prisma client
npx prisma generate

# View database
npx prisma studio
```

**Test Failures:**
```bash
# Run specific test
npm run test -- allocation.test.ts

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

**Build Failures:**
```bash
# Check for errors
npm run build

# Clear cache
rm -rf .next node_modules
npm install
npm run build
```

---

## Quick Reference

### Common Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server

# Database
npx prisma migrate dev   # Create migration
npx prisma migrate deploy # Apply migrations
npx prisma generate      # Generate client
npx prisma studio        # Open database GUI

# Testing
npm run test             # Run tests
npm run test:watch       # Watch mode
npm run test:coverage    # With coverage

# Code Quality
npm run lint             # Run ESLint
npm run format           # Run Prettier
npm run type-check       # TypeScript check

# Git
git status               # Check status
git add .                # Stage changes
git commit -m "message"  # Commit
git push                 # Push to remote
```

### File Locations

```
Domain Logic:     domain/financial/
Validation:       domain/validation/schemas/
Server Actions:   features/*/actions/
Components:       features/*/components/
Types:            features/*/types/
Tests:            **/__tests__/
Database:         prisma/schema.prisma
Config:           *.config.js, tsconfig.json
```

---

**Document Version:** 1.0  
**Last Updated:** 2024-12-19  
**Purpose:** Development workflow guide for AI sessions  
**Audience:** AI assistants, developers  
**Update:** When processes change
