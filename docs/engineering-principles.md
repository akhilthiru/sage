# Sage: Engineering Principles

## Overview

This document defines the engineering principles that guide all technical decisions in Sage. These principles ensure we build a maintainable, scalable, and high-quality product.

## Core Principles

### 1. Simplicity Over Cleverness

**Principle:** Write code that is easy to understand, not code that shows off technical prowess.

**Why:**
- New developers onboard faster
- Bugs are easier to find and fix
- Maintenance is straightforward
- Code reviews are more effective

**Examples:**

❌ **Clever but Complex:**
```typescript
const total = items.reduce((a, b) => a + b.amount, 0);
const avg = total / items.length;
const result = items.filter(i => i.amount > avg).map(i => ({...i, flag: true}));
```

✅ **Simple and Clear:**
```typescript
const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
const averageAmount = totalAmount / items.length;

const aboveAverageItems = items
  .filter(item => item.amount > averageAmount)
  .map(item => ({ ...item, isAboveAverage: true }));
```

### 2. Explicit Over Implicit

**Principle:** Make behavior obvious. Avoid magic and hidden side effects.

**Why:**
- Reduces cognitive load
- Makes debugging easier
- Prevents unexpected behavior
- Improves testability

**Examples:**

❌ **Implicit:**
```typescript
function saveGoal(goal) {
  // Hidden side effect: also updates allocation
  db.goal.create(goal);
  updateAllocation(); // Surprise!
}
```

✅ **Explicit:**
```typescript
function saveGoal(goal: Goal) {
  return db.goal.create(goal);
}

function saveGoalAndUpdateAllocation(goal: Goal) {
  const savedGoal = saveGoal(goal);
  updateAllocation(savedGoal.userId);
  return savedGoal;
}
```

### 3. Type Safety

**Principle:** Use TypeScript's type system to catch errors at compile time.

**Why:**
- Prevents runtime errors
- Improves IDE autocomplete
- Serves as documentation
- Enables safe refactoring

**Examples:**

❌ **Unsafe:**
```typescript
function calculateTotal(items: any) {
  return items.reduce((sum, item) => sum + item.amount, 0);
}
```

✅ **Type Safe:**
```typescript
interface Item {
  amount: number;
}

function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.amount, 0);
}
```

### 4. Fail Fast

**Principle:** Detect and report errors as early as possible.

**Why:**
- Easier to debug
- Prevents cascading failures
- Improves user experience
- Maintains data integrity

**Examples:**

❌ **Fail Late:**
```typescript
function createGoal(data) {
  const goal = await db.goal.create(data);
  // Error happens here, after database write
  if (data.targetAmount <= 0) {
    throw new Error('Invalid amount');
  }
}
```

✅ **Fail Fast:**
```typescript
function createGoal(data: CreateGoalInput) {
  // Validate first
  if (data.targetAmount <= 0) {
    throw new ValidationError('Target amount must be positive');
  }
  
  // Then proceed
  return db.goal.create(data);
}
```

### 5. Single Responsibility

**Principle:** Each function, class, or module should do one thing well.

**Why:**
- Easier to test
- Easier to reuse
- Easier to modify
- Clearer purpose

**Examples:**

❌ **Multiple Responsibilities:**
```typescript
function processGoal(goalData) {
  // Validates
  if (!goalData.name) throw new Error('Invalid');
  
  // Calculates
  const monthly = goalData.amount / 12;
  
  // Saves to database
  const goal = db.goal.create(goalData);
  
  // Sends email
  sendEmail(goal.userId, 'Goal created');
  
  return goal;
}
```

✅ **Single Responsibility:**
```typescript
function validateGoal(data: GoalInput): void {
  if (!data.name) throw new ValidationError('Name required');
}

function calculateMonthlyRequired(amount: number, months: number): number {
  return amount / months;
}

function saveGoal(data: GoalInput): Goal {
  return db.goal.create(data);
}

function notifyGoalCreated(userId: string): void {
  sendEmail(userId, 'Goal created');
}

// Orchestrate in a separate function
function createGoal(data: GoalInput): Goal {
  validateGoal(data);
  const goal = saveGoal(data);
  notifyGoalCreated(goal.userId);
  return goal;
}
```

### 6. Don't Repeat Yourself (DRY)

**Principle:** Avoid code duplication. Extract common logic.

**Why:**
- Single source of truth
- Easier to maintain
- Reduces bugs
- Improves consistency

**Examples:**

❌ **Repetitive:**
```typescript
function formatIncome(amount: number) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function formatExpense(amount: number) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function formatGoal(amount: number) {
  return `₹${amount.toLocaleString('en-IN')}`;
}
```

✅ **DRY:**
```typescript
function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

// Use everywhere
const income = formatCurrency(80000);
const expense = formatCurrency(30000);
const goal = formatCurrency(500000);
```

### 7. Composition Over Inheritance

**Principle:** Prefer composing small functions over complex class hierarchies.

**Why:**
- More flexible
- Easier to test
- Avoids inheritance pitfalls
- Better for functional programming

**Examples:**

❌ **Inheritance:**
```typescript
class FinancialCalculator {
  calculate() { /* base logic */ }
}

class GoalCalculator extends FinancialCalculator {
  calculate() { /* goal logic */ }
}

class AllocationCalculator extends FinancialCalculator {
  calculate() { /* allocation logic */ }
}
```

✅ **Composition:**
```typescript
function calculateGoalFeasibility(input: GoalInput): GoalOutput {
  // Specific logic
}

function calculateAllocation(input: AllocationInput): AllocationOutput {
  // Specific logic
}

function calculateAffordability(input: AffordabilityInput): AffordabilityOutput {
  // Specific logic
}

// Compose as needed
function analyzeFinancialDecision(input: DecisionInput) {
  const affordability = calculateAffordability(input);
  const goalImpact = calculateGoalFeasibility(input);
  const allocation = calculateAllocation(input);
  
  return { affordability, goalImpact, allocation };
}
```

### 8. Immutability

**Principle:** Prefer immutable data structures. Avoid mutations.

**Why:**
- Prevents bugs
- Easier to reason about
- Enables time-travel debugging
- Better for React

**Examples:**

❌ **Mutable:**
```typescript
function addGoal(goals: Goal[], newGoal: Goal) {
  goals.push(newGoal); // Mutates array
  return goals;
}
```

✅ **Immutable:**
```typescript
function addGoal(goals: Goal[], newGoal: Goal): Goal[] {
  return [...goals, newGoal]; // Returns new array
}
```

### 9. Error Handling

**Principle:** Handle errors explicitly and gracefully.

**Why:**
- Improves user experience
- Easier to debug
- Prevents crashes
- Maintains data integrity

**Examples:**

❌ **Unhandled:**
```typescript
async function getProfile(userId: string) {
  const profile = await db.profile.findUnique({ where: { userId } });
  return profile.monthlyIncome; // Crashes if profile is null
}
```

✅ **Handled:**
```typescript
async function getProfile(userId: string): Promise<Profile> {
  const profile = await db.profile.findUnique({ where: { userId } });
  
  if (!profile) {
    throw new NotFoundError('Profile not found');
  }
  
  return profile;
}

// Usage
try {
  const profile = await getProfile(userId);
  console.log(profile.monthlyIncome);
} catch (error) {
  if (error instanceof NotFoundError) {
    // Handle missing profile
  }
}
```

### 10. Performance Matters

**Principle:** Write performant code, but don't prematurely optimize.

**Why:**
- Better user experience
- Lower costs
- Scalability
- But: readability first

**Guidelines:**

1. **Measure first:** Use profiling before optimizing
2. **Optimize hot paths:** Focus on frequently executed code
3. **Use appropriate data structures:** Arrays vs Sets vs Maps
4. **Avoid unnecessary work:** Memoization, caching
5. **Database optimization:** Proper indexes, query optimization

**Examples:**

❌ **Inefficient:**
```typescript
function findGoal(goals: Goal[], id: string) {
  // O(n) lookup every time
  return goals.find(g => g.id === id);
}

// Called in a loop
for (const id of goalIds) {
  const goal = findGoal(goals, id); // O(n * m)
}
```

✅ **Efficient:**
```typescript
function createGoalMap(goals: Goal[]): Map<string, Goal> {
  return new Map(goals.map(g => [g.id, g]));
}

const goalMap = createGoalMap(goals); // O(n)

// Called in a loop
for (const id of goalIds) {
  const goal = goalMap.get(id); // O(1)
}
```

---

## Code Organization Principles

### 11. Feature-Based Structure

**Principle:** Organize code by feature, not by type.

**Why:**
- Related code stays together
- Easier to find things
- Better encapsulation
- Scales better

**Structure:**

❌ **Type-Based:**
```
src/
  components/
    GoalCard.tsx
    GoalForm.tsx
    ChatInterface.tsx
    Dashboard.tsx
  actions/
    goalActions.ts
    chatActions.ts
  types/
    goalTypes.ts
    chatTypes.ts
```

✅ **Feature-Based:**
```
src/
  features/
    goals/
      components/
        GoalCard.tsx
        GoalForm.tsx
      actions.ts
      types.ts
      hooks.ts
    chat/
      components/
        ChatInterface.tsx
      actions.ts
      types.ts
```

### 12. Dependency Direction

**Principle:** Dependencies should flow inward. Core logic should not depend on UI or infrastructure.

**Architecture:**
```
UI Layer (components)
    ↓ depends on
Application Layer (server actions)
    ↓ depends on
Domain Layer (business logic)
    ↓ depends on
Infrastructure Layer (database, APIs)
```

**Example:**

✅ **Correct:**
```typescript
// Domain layer (no dependencies)
export function calculateAllocation(input: AllocationInput): AllocationOutput {
  // Pure business logic
}

// Application layer (depends on domain)
export async function getAllocation(userId: string) {
  const profile = await db.profile.findUnique({ where: { userId } });
  return calculateAllocation(profile); // Uses domain logic
}

// UI layer (depends on application)
export function AllocationCard() {
  const allocation = await getAllocation(userId);
  return <div>{/* Display */}</div>;
}
```

### 13. Naming Conventions

**Principle:** Use clear, descriptive names that reveal intent.

**Guidelines:**

**Variables:**
```typescript
// ❌ Bad
const d = new Date();
const x = 80000;

// ✅ Good
const currentDate = new Date();
const monthlyIncome = 80000;
```

**Functions:**
```typescript
// ❌ Bad
function process(data) { }
function doStuff() { }

// ✅ Good
function calculateGoalFeasibility(goal: Goal) { }
function validateUserInput(input: UserInput) { }
```

**Components:**
```typescript
// ❌ Bad
function Card() { }
function Thing() { }

// ✅ Good
function GoalCard() { }
function AllocationChart() { }
```

**Constants:**
```typescript
// ❌ Bad
const max = 100;

// ✅ Good
const MAX_GOAL_AMOUNT = 100000000;
const EMERGENCY_FUND_MONTHS = 6;
```

**Boolean Variables:**
```typescript
// ❌ Bad
const active = true;
const data = false;

// ✅ Good
const isActive = true;
const hasData = false;
const canAfford = true;
```

---

## Testing Principles

### 14. Test Behavior, Not Implementation

**Principle:** Test what the code does, not how it does it.

**Why:**
- Tests survive refactoring
- Focus on user value
- More maintainable
- Better coverage

**Examples:**

❌ **Testing Implementation:**
```typescript
test('uses reduce to calculate total', () => {
  const spy = jest.spyOn(Array.prototype, 'reduce');
  calculateTotal(items);
  expect(spy).toHaveBeenCalled();
});
```

✅ **Testing Behavior:**
```typescript
test('calculates total amount correctly', () => {
  const items = [
    { amount: 100 },
    { amount: 200 },
    { amount: 300 },
  ];
  
  const total = calculateTotal(items);
  
  expect(total).toBe(600);
});
```

### 15. Test Coverage

**Principle:** Aim for high coverage on critical paths, not 100% everywhere.

**Priority:**
1. **Critical:** Financial calculations (100% coverage)
2. **High:** Business logic (80%+ coverage)
3. **Medium:** UI components (60%+ coverage)
4. **Low:** Simple utilities (as needed)

**Example:**

```typescript
// Critical: Must have 100% coverage
describe('calculateAllocation', () => {
  it('handles zero income');
  it('handles negative values');
  it('handles missing data');
  it('prioritizes correctly');
  it('handles edge cases');
});

// High: Should have 80%+ coverage
describe('createGoal', () => {
  it('creates goal successfully');
  it('validates input');
  it('handles errors');
});

// Medium: 60%+ coverage
describe('GoalCard', () => {
  it('renders goal data');
  it('handles click events');
});
```

### 16. Arrange-Act-Assert

**Principle:** Structure tests clearly with three sections.

**Pattern:**
```typescript
test('description', () => {
  // Arrange: Set up test data
  const input = {
    income: 80000,
    expenses: 30000,
  };
  
  // Act: Execute the code
  const result = calculateSurplus(input);
  
  // Assert: Verify the result
  expect(result).toBe(50000);
});
```

---

## Security Principles

### 17. Never Trust User Input

**Principle:** Always validate and sanitize user input.

**Why:**
- Prevents injection attacks
- Maintains data integrity
- Prevents crashes
- Ensures business rules

**Examples:**

❌ **Trusting Input:**
```typescript
async function createGoal(data: any) {
  return db.goal.create({ data });
}
```

✅ **Validating Input:**
```typescript
const createGoalSchema = z.object({
  name: z.string().min(1).max(100),
  targetAmount: z.number().positive().max(100000000),
  targetDate: z.date().min(new Date()),
});

async function createGoal(input: unknown) {
  const data = createGoalSchema.parse(input); // Throws if invalid
  return db.goal.create({ data });
}
```

### 18. Principle of Least Privilege

**Principle:** Grant minimum necessary permissions.

**Examples:**

**Database Queries:**
```typescript
// ❌ Bad: Returns all user data
const user = await db.user.findUnique({
  where: { id },
  include: { profile: true, goals: true, debts: true }
});

// ✅ Good: Returns only what's needed
const userName = await db.user.findUnique({
  where: { id },
  select: { firstName: true, lastName: true }
});
```

**API Endpoints:**
```typescript
// ❌ Bad: Anyone can access
export async function GET(req: Request) {
  const users = await db.user.findMany();
  return Response.json(users);
}

// ✅ Good: Authenticated and authorized
export async function GET(req: Request) {
  const userId = await getCurrentUserId();
  const user = await db.user.findUnique({ where: { id: userId } });
  return Response.json(user);
}
```

### 19. Secure by Default

**Principle:** Default to secure settings.

**Examples:**

```typescript
// ❌ Bad: Insecure default
function createSession(userId: string, options = { secure: false }) {
  // ...
}

// ✅ Good: Secure default
function createSession(userId: string, options = { secure: true }) {
  // ...
}
```

---

## Performance Principles

### 20. Optimize Database Queries

**Principle:** Minimize database round trips and query complexity.

**Techniques:**

**Use Includes:**
```typescript
// ❌ Bad: N+1 queries
const goals = await db.goal.findMany({ where: { userId } });
for (const goal of goals) {
  const milestones = await db.milestone.findMany({ where: { goalId: goal.id } });
}

// ✅ Good: Single query
const goals = await db.goal.findMany({
  where: { userId },
  include: { milestones: true }
});
```

**Use Indexes:**
```prisma
model Goal {
  @@index([userId])
  @@index([status])
  @@index([userId, status])
}
```

**Select Only Needed Fields:**
```typescript
// ❌ Bad: Fetches everything
const goals = await db.goal.findMany({ where: { userId } });

// ✅ Good: Fetches only needed fields
const goals = await db.goal.findMany({
  where: { userId },
  select: { id: true, name: true, targetAmount: true }
});
```

### 21. Cache Wisely

**Principle:** Cache expensive operations, but invalidate appropriately.

**Examples:**

```typescript
import { unstable_cache } from 'next/cache';

// Cache financial profile for 5 minutes
export const getFinancialProfile = unstable_cache(
  async (userId: string) => {
    return await db.financialProfile.findUnique({
      where: { userId },
      include: { expenses: true, debts: true }
    });
  },
  ['financial-profile'],
  { revalidate: 300 }
);

// Invalidate cache when profile updates
import { revalidateTag } from 'next/cache';

export async function updateProfile(userId: string, data: any) {
  await db.financialProfile.update({ where: { userId }, data });
  revalidateTag('financial-profile');
}
```

---

## Documentation Principles

### 22. Code Should Be Self-Documenting

**Principle:** Write code that explains itself. Use comments for "why", not "what".

**Examples:**

❌ **Over-commented:**
```typescript
// Get the user's monthly income
const income = profile.monthlyIncome;

// Calculate the total expenses
const total = expenses.reduce((sum, e) => sum + e.amount, 0);

// Subtract expenses from income
const surplus = income - total;
```

✅ **Self-documenting:**
```typescript
const monthlyIncome = profile.monthlyIncome;
const totalExpenses = calculateTotalExpenses(expenses);
const monthlySurplus = monthlyIncome - totalExpenses;
```

**Good Use of Comments:**
```typescript
// We use 6 months as the standard emergency fund target because
// research shows this covers most unexpected situations without
// being overly conservative. Users can customize this later.
const EMERGENCY_FUND_MONTHS = 6;

function calculateEmergencyFundTarget(monthlyExpenses: number): number {
  return monthlyExpenses * EMERGENCY_FUND_MONTHS;
}
```

### 23. Document Complex Logic

**Principle:** Add comments for non-obvious business logic.

**Example:**

```typescript
/**
 * Calculates goal feasibility using a confidence-based approach.
 * 
 * Confidence decreases when:
 * - Timeline is tight (< 12 months)
 * - Required monthly amount is > 50% of surplus
 * - User has multiple high-priority goals
 * 
 * This helps users understand the risk level of their goals.
 */
function calculateGoalFeasibility(input: FeasibilityInput): FeasibilityOutput {
  let confidence = 100;
  
  // Reduce confidence for tight timelines
  if (input.monthsUntilTarget < 12) {
    confidence -= 20;
  }
  
  // Reduce confidence for high monthly requirements
  const percentageOfSurplus = input.monthlyRequired / input.monthlyAvailable;
  if (percentageOfSurplus > 0.5) {
    confidence -= 30;
  }
  
  return {
    isAchievable: confidence > 50,
    confidence,
    // ...
  };
}
```

---

## Conclusion

These engineering principles ensure that Sage is:

✅ **Maintainable** - Easy to understand and modify
✅ **Reliable** - Robust error handling and testing
✅ **Performant** - Optimized for speed and efficiency
✅ **Secure** - Protected against common vulnerabilities
✅ **Scalable** - Can grow with user base
✅ **Developer-Friendly** - Easy to onboard and contribute

When in doubt, refer to these principles. They are the foundation of quality engineering at Sage.
