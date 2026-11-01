# Service Boundaries

**Package**: `@sage/application`  
**Version**: 1.0.0  
**Last Updated**: 2024

---

## Table of Contents

1. [Overview](#overview)
2. [Layer Responsibilities](#layer-responsibilities)
3. [Forbidden Responsibilities](#forbidden-responsibilities)
4. [Boundary Enforcement](#boundary-enforcement)
5. [Communication Contracts](#communication-contracts)

---

## Overview

Clear service boundaries ensure:

- ✅ Single Responsibility Principle
- ✅ Separation of Concerns
- ✅ Testability
- ✅ Maintainability
- ✅ Independent evolution

Each layer has **explicit responsibilities** and **forbidden actions**.

---

## Layer Responsibilities

### 1. Presentation Layer (Next.js, React)

**Location**: `apps/web/app/`, `apps/web/components/`

#### Responsibilities

✅ **Render UI**
- Display data to users
- Handle user interactions
- Manage component state
- Client-side routing

✅ **Form Handling**
- Collect user input
- Client-side validation (UX only)
- Format data for submission

✅ **Call Server Actions**
- Invoke Application Layer via Server Actions
- Handle loading states
- Display errors to users

✅ **Format Data for Display**
- Currency formatting (₹1,00,000)
- Date formatting (DD/MM/YYYY)
- Number formatting
- Localization

✅ **Client-Side State Management**
- UI state (modals, dropdowns)
- Form state
- Optimistic updates

#### Example

```typescript
// apps/web/app/goals/create/page.tsx
'use client';

export default function CreateGoalPage() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    
    // Call Application Layer
    const result = await createGoalAction(formData);
    
    if (result.success) {
      // Display success
      toast.success('Goal created!');
      router.push('/dashboard');
    } else {
      // Display error
      toast.error(result.error.message);
    }
    
    setIsLoading(false);
  }

  return (
    <form action={handleSubmit}>
      {/* Form fields */}
    </form>
  );
}
```

---

### 2. API Routes / Server Actions

**Location**: `apps/web/app/api/`, `apps/web/actions/`

#### Responsibilities

✅ **HTTP Concerns**
- Parse request bodies
- Set response status codes
- Set headers
- Handle CORS

✅ **Authentication**
- Verify JWT tokens
- Extract user ID from session
- Reject unauthenticated requests

✅ **Input Parsing**
- Parse FormData
- Parse JSON bodies
- Extract query parameters

✅ **Instantiate Application Services**
- Create service instances
- Inject dependencies
- Call use cases

✅ **Error Translation**
- Convert application errors to HTTP responses
- Set appropriate status codes
- Format error messages

✅ **Response Formatting**
- Convert DTOs to JSON
- Handle streaming responses (AI chat)

#### Example

```typescript
// apps/web/actions/goals.ts
'use server';

export async function createGoalAction(formData: FormData) {
  try {
    // 1. Authenticate
    const { userId } = auth();
    if (!userId) {
      return { success: false, error: { code: 'UNAUTHORIZED' } };
    }

    // 2. Parse input
    const request: CreateGoalRequest = {
      userId,
      name: formData.get('name') as string,
      targetAmount: Number(formData.get('targetAmount')),
      targetDate: new Date(formData.get('targetDate') as string),
      priority: formData.get('priority') as 'HIGH' | 'MEDIUM' | 'LOW',
      category: formData.get('category') as string,
    };

    // 3. Instantiate service
    const goalService = new GoalService(
      goalRepository,
      allocationRepository,
      financialEngine,
      eventPublisher
    );

    // 4. Call use case
    const response = await goalService.createGoal(request);

    // 5. Return response
    return { success: true, data: response };
  } catch (error) {
    // 6. Handle errors
    return { success: false, error: mapErrorToResponse(error) };
  }
}
```

---

### 3. Application Layer (Services, Use Cases)

**Location**: `packages/application/src/services/`

#### Responsibilities

✅ **Orchestrate Workflows**
- Coordinate multi-step operations
- Call repositories in correct order
- Invoke Financial Engine when needed
- Manage transaction boundaries

✅ **Validate Business Rules**
- Check authorization (user owns resource)
- Verify state transitions are valid
- Enforce domain invariants

✅ **Transform Data**
- Map DTOs to repository inputs
- Map repository outputs to DTOs
- Combine data from multiple sources

✅ **Publish Events**
- Emit domain events
- Notify other modules

✅ **Handle Application Errors**
- Catch repository errors
- Catch Financial Engine errors
- Throw application-specific errors

#### Example

```typescript
// packages/application/src/services/goals/GoalService.ts
export class GoalService {
  constructor(
    private goalRepository: IGoalRepository,
    private allocationRepository: IAllocationRepository,
    private financialEngine: IFinancialEngine,
    private eventPublisher: IEventPublisher
  ) {}

  async createGoal(request: CreateGoalRequest): Promise<CreateGoalResponse> {
    // 1. Validate authorization
    const profile = await this.financialProfileRepository.findByUserId(
      request.userId
    );
    if (!profile) {
      throw new NotFoundError('Financial profile not found');
    }

    // 2. Begin transaction
    return await this.transactionManager.execute(async () => {
      // 3. Create goal
      const goal = await this.goalRepository.create({
        userId: request.userId,
        name: request.name,
        targetAmount: request.targetAmount,
        targetDate: request.targetDate,
        priority: request.priority,
        category: request.category,
      });

      // 4. Fetch data for allocation
      const goals = await this.goalRepository.findActiveByUserId(request.userId);
      const expenses = await this.expenseRepository.findByUserId(request.userId);
      const debts = await this.debtRepository.findActiveByUserId(request.userId);

      // 5. Calculate allocation (Financial Engine)
      const allocationResult = this.financialEngine.calculateAllocation({
        monthlyIncome: profile.monthlyIncome,
        expenses,
        goals,
        debts,
      });

      // 6. Save allocation
      const allocation = await this.allocationRepository.create({
        userId: request.userId,
        ...allocationResult,
      });

      // 7. Publish event
      await this.eventPublisher.publish(
        new GoalCreatedEvent({
          goalId: goal.id,
          userId: goal.userId,
        })
      );

      // 8. Map to DTO
      return {
        goal: this.mapGoalToDTO(goal),
        allocation: this.mapAllocationToDTO(allocation),
      };
    });
  }
}
```

---

### 4. Domain Layer - Financial Engine

**Location**: `packages/financial-engine/src/`

#### Responsibilities

✅ **Pure Calculations**
- Loan payment calculations
- Allocation calculations
- Goal feasibility
- Financial health scoring
- Simulations

✅ **Business Logic**
- Implement 50/30/20 rule
- Priority-based allocation
- Debt payoff strategies
- Risk assessment

✅ **Return Deterministic Results**
- Same input = same output
- No side effects
- No state
- No async operations

#### Example

```typescript
// packages/financial-engine/src/allocation/calculateAllocation.ts
export function calculateAllocation(
  input: AllocationInput
): AllocationResult {
  const { monthlyIncome, expenses, goals, debts } = input;

  // Pure calculation
  const fixedExpenses = sumExpenses(expenses.filter(e => e.isRecurring));
  const debtPayments = sumDebtPayments(debts);
  const goalContributions = calculateGoalContributions(goals, monthlyIncome);

  const needs = fixedExpenses + debtPayments;
  const savings = goalContributions;
  const wants = monthlyIncome - needs - savings;

  return {
    needs,
    wants,
    savings,
    breakdown: {
      fixedExpenses,
      variableExpenses: 0,
      goalContributions,
      debtPayments,
      discretionary: wants,
      emergencyFund: 0,
    },
  };
}
```

---

### 5. Domain Layer - AI Service

**Location**: `packages/ai/src/`

#### Responsibilities

✅ **Prompt Engineering**
- Construct system prompts
- Format user questions
- Include financial context

✅ **LLM Communication**
- Call OpenAI API
- Handle streaming responses
- Parse LLM output

✅ **Context Management**
- Format conversation history
- Include relevant financial data
- Limit context window

✅ **Response Formatting**
- Extract structured data from LLM
- Format markdown responses
- Generate suggested actions

#### Example

```typescript
// packages/ai/src/AIService.ts
export class AIService {
  async generateResponse(input: AIInput): Promise<AIResponse> {
    // 1. Build prompt
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(input);

    // 2. Call LLM
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        ...input.conversationHistory,
        { role: 'user', content: userPrompt },
      ],
    });

    // 3. Parse response
    const response = completion.choices[0].message.content;

    // 4. Extract suggested actions
    const actions = this.extractActions(response);

    return {
      response,
      suggestedActions: actions,
    };
  }

  private buildSystemPrompt(): string {
    return `You are a personal CFO. You explain financial concepts but NEVER perform calculations.`;
  }
}
```

---

### 6. Infrastructure Layer - Repositories

**Location**: `packages/database/src/repositories/`

#### Responsibilities

✅ **Data Persistence**
- Create records
- Update records
- Delete records (soft delete)
- Query records

✅ **Query Optimization**
- Use indexes
- Eager load relations
- Paginate results

✅ **Data Mapping**
- Map Prisma entities to domain entities
- Handle null values
- Convert types

✅ **Transaction Support**
- Execute operations in transactions
- Rollback on errors

#### Example

```typescript
// packages/database/src/repositories/GoalRepository.ts
export class GoalRepository implements IGoalRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: CreateGoalInput): Promise<Goal> {
    const goal = await this.prisma.goal.create({
      data: {
        userId: data.userId,
        name: data.name,
        targetAmount: data.targetAmount,
        targetDate: data.targetDate,
        priority: data.priority,
        category: data.category,
        currentAmount: 0,
        status: 'ACTIVE',
      },
    });

    return this.mapToDomain(goal);
  }

  async findActiveByUserId(userId: string): Promise<Goal[]> {
    const goals = await this.prisma.goal.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        deletedAt: null,
      },
      orderBy: {
        priority: 'desc',
      },
    });

    return goals.map(this.mapToDomain);
  }

  private mapToDomain(entity: PrismaGoal): Goal {
    return {
      id: entity.id,
      userId: entity.userId,
      name: entity.name,
      targetAmount: entity.targetAmount,
      currentAmount: entity.currentAmount,
      targetDate: entity.targetDate,
      priority: entity.priority,
      category: entity.category,
      status: entity.status,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
```

---

### 7. Infrastructure Layer - Prisma Client

**Location**: `packages/database/src/client.ts`

#### Responsibilities

✅ **Database Connection**
- Manage connection pool
- Handle connection errors
- Support transactions

✅ **Query Execution**
- Execute SQL queries
- Return raw results

✅ **Schema Management**
- Apply migrations
- Validate schema

#### Example

```typescript
// packages/database/src/client.ts
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

export async function connectDatabase() {
  await prisma.$connect();
}

export async function disconnectDatabase() {
  await prisma.$disconnect();
}
```

---

## Forbidden Responsibilities

### ❌ Presentation Layer MUST NOT

- ❌ Perform financial calculations
- ❌ Execute database queries
- ❌ Contain business logic
- ❌ Call Financial Engine directly
- ❌ Access Prisma Client
- ❌ Manage transactions
- ❌ Publish domain events

**Example of Violation**:
```typescript
// ❌ WRONG: React component calculating allocation
function GoalCard({ goal, income }) {
  const allocation = income * 0.20; // FORBIDDEN
  return <div>{allocation}</div>;
}
```

**Correct**:
```typescript
// ✅ RIGHT: Display pre-calculated data
function GoalCard({ goal }) {
  return <div>{goal.monthlySavingsRequired}</div>;
}
```

---

### ❌ API Routes MUST NOT

- ❌ Contain business logic
- ❌ Perform calculations
- ❌ Execute database queries directly
- ❌ Manage transactions
- ❌ Publish events

**Example of Violation**:
```typescript
// ❌ WRONG: Server Action with business logic
export async function createGoalAction(formData: FormData) {
  const goal = await prisma.goal.create({ data }); // FORBIDDEN
  const allocation = income * 0.20; // FORBIDDEN
  return { goal, allocation };
}
```

**Correct**:
```typescript
// ✅ RIGHT: Delegate to Application Layer
export async function createGoalAction(formData: FormData) {
  const goalService = new GoalService(dependencies);
  return await goalService.createGoal(request);
}
```

---

### ❌ Application Layer MUST NOT

- ❌ Perform financial calculations
- ❌ Execute SQL queries
- ❌ Use Prisma Client directly
- ❌ Construct AI prompts
- ❌ Format data for UI
- ❌ Handle HTTP concerns

**Example of Violation**:
```typescript
// ❌ WRONG: Application Layer with calculation
class GoalService {
  async createGoal(request) {
    const monthlyPayment = (amount * rate) / months; // FORBIDDEN
    const goal = await prisma.goal.create({ data }); // FORBIDDEN
    return goal;
  }
}
```

**Correct**:
```typescript
// ✅ RIGHT: Delegate to Financial Engine and Repository
class GoalService {
  async createGoal(request) {
    const result = this.financialEngine.calculateGoalPayment(data);
    const goal = await this.goalRepository.create(data);
    return this.mapToDTO(goal);
  }
}
```

---

### ❌ Financial Engine MUST NOT

- ❌ Access database
- ❌ Call APIs
- ❌ Publish events
- ❌ Have side effects
- ❌ Use async operations
- ❌ Maintain state

**Example of Violation**:
```typescript
// ❌ WRONG: Financial Engine with side effects
export function calculateAllocation(input) {
  const result = { needs: 0, wants: 0, savings: 0 };
  
  // FORBIDDEN: Database access
  const goals = await prisma.goal.findMany();
  
  // FORBIDDEN: Side effect
  console.log('Calculating allocation');
  
  return result;
}
```

**Correct**:
```typescript
// ✅ RIGHT: Pure function
export function calculateAllocation(input: AllocationInput): AllocationResult {
  // Pure calculation, no side effects
  return {
    needs: input.monthlyIncome * 0.50,
    wants: input.monthlyIncome * 0.30,
    savings: input.monthlyIncome * 0.20,
  };
}
```

---

### ❌ AI Service MUST NOT

- ❌ Perform financial calculations
- ❌ Access database
- ❌ Manage transactions
- ❌ Make financial decisions

**Example of Violation**:
```typescript
// ❌ WRONG: AI Service calculating
class AIService {
  async generateResponse(input) {
    const canAfford = input.income > input.expense; // FORBIDDEN
    return `You can afford it: ${canAfford}`;
  }
}
```

**Correct**:
```typescript
// ✅ RIGHT: AI explains pre-calculated results
class AIService {
  async generateResponse(input) {
    const prompt = `The user's affordability is ${input.canAfford}. Explain why.`;
    return await this.callLLM(prompt);
  }
}
```

---

### ❌ Repositories MUST NOT

- ❌ Contain business logic
- ❌ Perform calculations
- ❌ Validate business rules
- ❌ Publish events
- ❌ Call Financial Engine
- ❌ Call other repositories

**Example of Violation**:
```typescript
// ❌ WRONG: Repository with business logic
class GoalRepository {
  async create(data) {
    // FORBIDDEN: Business validation
    if (data.targetAmount < 1000) {
      throw new Error('Goal too small');
    }
    
    // FORBIDDEN: Calculation
    const monthlyPayment = data.targetAmount / 12;
    
    return await this.prisma.goal.create({ data });
  }
}
```

**Correct**:
```typescript
// ✅ RIGHT: Repository only persists
class GoalRepository {
  async create(data: CreateGoalInput): Promise<Goal> {
    const goal = await this.prisma.goal.create({ data });
    return this.mapToDomain(goal);
  }
}
```

---

## Boundary Enforcement

### 1. **Import Rules**

Enforce boundaries via import restrictions:

```typescript
// ✅ ALLOWED: Application → Repository
import { IGoalRepository } from '@sage/application/interfaces';

// ✅ ALLOWED: Application → Financial Engine
import { calculateAllocation } from '@sage/financial-engine';

// ❌ FORBIDDEN: Repository → Application
import { GoalService } from '@sage/application'; // FORBIDDEN

// ❌ FORBIDDEN: Financial Engine → Repository
import { GoalRepository } from '@sage/database'; // FORBIDDEN

// ❌ FORBIDDEN: Presentation → Financial Engine
import { calculateAllocation } from '@sage/financial-engine'; // FORBIDDEN
```

### 2. **TypeScript Path Aliases**

Configure `tsconfig.json` to enforce boundaries:

```json
{
  "compilerOptions": {
    "paths": {
      "@sage/application/*": ["packages/application/src/*"],
      "@sage/financial-engine/*": ["packages/financial-engine/src/*"],
      "@sage/database/*": ["packages/database/src/*"]
    }
  }
}
```

### 3. **ESLint Rules**

Use `eslint-plugin-import` to prevent violations:

```javascript
// .eslintrc.js
module.exports = {
  rules: {
    'import/no-restricted-paths': [
      'error',
      {
        zones: [
          {
            target: './packages/financial-engine',
            from: './packages/database',
            message: 'Financial Engine cannot import from Database',
          },
          {
            target: './packages/database',
            from: './packages/application',
            message: 'Database cannot import from Application',
          },
        ],
      },
    ],
  },
};
```

### 4. **Dependency Injection**

Use interfaces to enforce contracts:

```typescript
// Application Layer defines interface
export interface IGoalRepository {
  create(data: CreateGoalInput): Promise<Goal>;
  findById(id: string): Promise<Goal | null>;
}

// Infrastructure Layer implements interface
export class GoalRepository implements IGoalRepository {
  // Implementation
}

// Application Layer depends on interface, not implementation
export class GoalService {
  constructor(private goalRepository: IGoalRepository) {}
}
```

---

## Communication Contracts

### 1. **Application ↔ Repository**

**Contract**: Repository interfaces

```typescript
// Defined in Application Layer
export interface IGoalRepository {
  create(data: CreateGoalInput): Promise<Goal>;
  update(id: string, data: UpdateGoalInput): Promise<Goal>;
  findById(id: string): Promise<Goal | null>;
  findActiveByUserId(userId: string): Promise<Goal[]>;
  softDelete(id: string): Promise<void>;
}
```

### 2. **Application ↔ Financial Engine**

**Contract**: Pure functions with typed inputs/outputs

```typescript
// Defined in Financial Engine
export function calculateAllocation(
  input: AllocationInput
): AllocationResult;

export function calculateGoalFeasibility(
  input: GoalFeasibilityInput
): GoalFeasibilityResult;
```

### 3. **API Routes ↔ Application**

**Contract**: Request/Response DTOs

```typescript
// Defined in Application Layer
export interface CreateGoalRequest {
  userId: string;
  name: string;
  targetAmount: number;
  targetDate: Date;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
}

export interface CreateGoalResponse {
  goal: GoalDTO;
  allocation: AllocationDTO;
}
```

### 4. **Application ↔ AI Service**

**Contract**: AI Service interface

```typescript
// Defined in Application Layer
export interface IAIService {
  generateResponse(input: AIInput): Promise<AIResponse>;
}

export interface AIInput {
  conversationHistory: Message[];
  userQuestion: string;
  financialContext: FinancialContext;
}

export interface AIResponse {
  response: string;
  suggestedActions?: SuggestedAction[];
}
```

---

## Summary

### Clear Responsibilities

| Layer | Primary Responsibility | Key Constraint |
|-------|----------------------|----------------|
| **Presentation** | Render UI, handle user input | No business logic |
| **API Routes** | HTTP, auth, parsing | No calculations |
| **Application** | Orchestrate workflows | No calculations, no SQL |
| **Financial Engine** | Pure calculations | No side effects |
| **AI Service** | Prompt engineering, LLM calls | No calculations |
| **Repositories** | Data persistence | No business logic |
| **Prisma** | Database access | Only used by repositories |

### Enforcement Mechanisms

1. **TypeScript interfaces** - Define contracts
2. **Import restrictions** - Prevent invalid dependencies
3. **ESLint rules** - Catch violations at build time
4. **Code reviews** - Human verification
5. **Architecture tests** - Automated boundary checks

### Benefits

- ✅ **Testability**: Each layer can be tested in isolation
- ✅ **Maintainability**: Changes are localized
- ✅ **Flexibility**: Swap implementations without breaking contracts
- ✅ **Clarity**: Developers know where code belongs
- ✅ **Performance**: Optimizations don't leak across boundaries

---

**Next**: Define dependency rules and import restrictions.
