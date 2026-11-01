# Sage: System Architecture

## Architecture Overview

Sage follows a **layered architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────┐
│                     Presentation Layer                   │
│              (Next.js Pages & Components)                │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                    Application Layer                     │
│            (Server Actions & API Routes)                 │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                      Domain Layer                        │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│   │   Financial  │  │  Simulation  │  │  AI Service  │ │
│   │    Engine    │  │    Engine    │  │              │ │
│   └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                   Infrastructure Layer                   │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│   │  PostgreSQL  │  │    OpenAI    │  │    Clerk     │ │
│   │   (Prisma)   │  │     API      │  │    Auth      │ │
│   └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Core Architectural Principles

### 1. Deterministic Financial Logic

**Principle:** All financial calculations must be deterministic and testable.

**Implementation:**
- Financial engine is pure TypeScript functions
- No LLM involvement in calculations
- All logic is unit-testable
- Results are reproducible

**Example:**
```typescript
// ❌ Wrong: LLM-based calculation
const allocation = await ai.generateAllocation(income);

// ✅ Correct: Deterministic calculation
const allocation = calculateAllocation({
  income,
  expenses,
  goals,
  debts
});
```

### 2. AI as Explanation Layer

**Principle:** LLMs explain results, they don't generate financial data.

**Data Flow:**
```
User Question
    ↓
Extract Intent & Parameters
    ↓
Financial Engine (deterministic calculation)
    ↓
Simulation Engine (scenario modeling)
    ↓
Structured Results
    ↓
LLM (natural language explanation)
    ↓
User Response
```

### 3. Feature-Based Organization

**Principle:** Code is organized by feature, not by type.

**Structure:**
```
src/
  features/
    onboarding/
      components/
      actions/
      hooks/
      types/
    goals/
      components/
      actions/
      hooks/
      types/
    chat/
      components/
      actions/
      hooks/
      types/
```

### 4. Type Safety

**Principle:** Strong typing throughout the application.

**Implementation:**
- TypeScript strict mode
- Prisma for type-safe database access
- Zod for runtime validation
- No `any` types

## System Components

### 1. Presentation Layer

**Technology:** Next.js 14+ with App Router

**Responsibilities:**
- Render UI components
- Handle user interactions
- Manage client state
- Display data from server

**Key Patterns:**

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
// components/chat-interface.tsx
'use client';

export function ChatInterface() {
  const [messages, setMessages] = useState([]);
  // Interactive UI logic
}
```

**Component Structure:**
```
components/
  ui/              # Reusable UI components (shadcn/ui)
    button.tsx
    card.tsx
    input.tsx
  features/        # Feature-specific components
    dashboard/
    goals/
    chat/
  layouts/         # Layout components
    main-layout.tsx
    auth-layout.tsx
```

---

### 2. Application Layer

**Technology:** Next.js Server Actions & API Routes

**Responsibilities:**
- Handle HTTP requests
- Validate input
- Orchestrate domain logic
- Return responses

**Server Actions Pattern:**
```typescript
// features/goals/actions.ts
'use server';

export async function createGoal(data: CreateGoalInput) {
  // 1. Validate input
  const validated = createGoalSchema.parse(data);
  
  // 2. Get user context
  const userId = await getCurrentUserId();
  
  // 3. Execute domain logic
  const goal = await goalService.create(userId, validated);
  
  // 4. Return result
  return { success: true, goal };
}
```

**API Routes (for external integrations):**
```typescript
// app/api/webhooks/clerk/route.ts
export async function POST(req: Request) {
  const payload = await req.json();
  await handleClerkWebhook(payload);
  return new Response('OK', { status: 200 });
}
```

---

### 3. Domain Layer

The core business logic layer. This is where the magic happens.

#### 3.1 Financial Engine

**Purpose:** Deterministic financial calculations

**Modules:**

**Allocation Calculator:**
```typescript
// domain/financial/allocation.ts

interface AllocationInput {
  income: number;
  expenses: Expense[];
  debts: Debt[];
  goals: Goal[];
  emergencyFundTarget: number;
  currentEmergencyFund: number;
}

interface AllocationOutput {
  essentialExpenses: number;
  debtPayments: number;
  emergencyFund: number;
  goalSavings: GoalAllocation[];
  investments: number;
  discretionary: number;
  breakdown: AllocationBreakdown;
}

export function calculateAllocation(
  input: AllocationInput
): AllocationOutput {
  // Pure, deterministic logic
  // No external dependencies
  // Fully testable
}
```

**Goal Feasibility Calculator:**
```typescript
// domain/financial/goals.ts

interface FeasibilityInput {
  goalAmount: number;
  targetDate: Date;
  currentSavings: number;
  monthlyAvailable: number;
}

interface FeasibilityOutput {
  isAchievable: boolean;
  confidence: number;
  monthlyRequired: number;
  projectedCompletion: Date;
  recommendations: string[];
  alternatives: Alternative[];
}

export function calculateGoalFeasibility(
  input: FeasibilityInput
): FeasibilityOutput {
  // Deterministic feasibility calculation
}
```

**Affordability Calculator:**
```typescript
// domain/financial/affordability.ts

interface AffordabilityInput {
  purchaseAmount: number;
  currentSavings: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  emergencyFundTarget: number;
  currentEmergencyFund: number;
  activeGoals: Goal[];
}

interface AffordabilityOutput {
  canAffordFromSavings: boolean;
  canAffordWithLoan: boolean;
  recommendedApproach: 'savings' | 'loan' | 'save-first';
  impactOnGoals: GoalImpact[];
  alternatives: Alternative[];
}

export function calculateAffordability(
  input: AffordabilityInput
): AffordabilityOutput {
  // Deterministic affordability logic
}
```

#### 3.2 Simulation Engine

**Purpose:** Model financial scenarios and future outcomes

**Modules:**

**Scenario Simulator:**
```typescript
// domain/simulation/scenarios.ts

interface Scenario {
  type: 'purchase' | 'loan' | 'income-change' | 'expense-change';
  parameters: Record<string, any>;
}

interface SimulationResult {
  timeline: TimelinePoint[];
  finalState: FinancialState;
  goalImpacts: GoalImpact[];
  risks: Risk[];
  opportunities: Opportunity[];
}

export function simulateScenario(
  currentState: FinancialState,
  scenario: Scenario,
  timeHorizon: number // months
): SimulationResult {
  // Month-by-month simulation
  // Track all changes
  // Identify impacts
}
```

**Timeline Projector:**
```typescript
// domain/simulation/timeline.ts

export function projectFinancialTimeline(
  currentState: FinancialState,
  timeHorizon: number
): Timeline {
  const timeline: TimelinePoint[] = [];
  
  for (let month = 0; month < timeHorizon; month++) {
    const point = calculateMonthState(currentState, month);
    timeline.push(point);
  }
  
  return {
    points: timeline,
    milestones: identifyMilestones(timeline),
    warnings: identifyWarnings(timeline)
  };
}
```

#### 3.3 AI Service

**Purpose:** Natural language interface to financial engine

**Architecture:**

```typescript
// domain/ai/chat.ts

interface ChatContext {
  userId: string;
  financialProfile: FinancialProfile;
  conversationHistory: Message[];
}

interface ChatResponse {
  message: string;
  data?: any; // Structured data if applicable
  suggestions?: string[];
}

export async function processUserQuery(
  query: string,
  context: ChatContext
): Promise<ChatResponse> {
  // 1. Extract intent and parameters
  const intent = await extractIntent(query);
  
  // 2. Execute financial calculations (deterministic)
  const results = await executeFinancialLogic(intent, context);
  
  // 3. Generate natural language explanation
  const response = await generateExplanation(results, context);
  
  return response;
}
```

**Intent Extraction:**
```typescript
// domain/ai/intent.ts

type Intent = 
  | { type: 'affordability'; amount: number; item?: string }
  | { type: 'goal-progress'; goalId?: string }
  | { type: 'allocation-advice' }
  | { type: 'loan-feasibility'; amount: number; tenure: number }
  | { type: 'explanation'; topic: string };

export async function extractIntent(query: string): Promise<Intent> {
  // Use LLM to extract structured intent
  // Validate and normalize parameters
  // Return typed intent object
}
```

**Response Generation:**
```typescript
// domain/ai/response.ts

export async function generateExplanation(
  calculationResults: any,
  context: ChatContext
): Promise<string> {
  const prompt = buildPrompt(calculationResults, context);
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
  });
  
  return response.choices[0].message.content;
}
```

**System Prompt (Version Controlled):**
```typescript
// domain/ai/prompts.ts

export const SYSTEM_PROMPT = `
You are Sage, an AI-powered Personal CFO.

Your role:
- Explain financial calculations in simple terms
- Provide actionable recommendations
- Be honest about limitations
- Never invent financial data

Guidelines:
- Use the user's actual financial data
- Show your reasoning
- Provide specific numbers
- Suggest alternatives when applicable
- Admit when you need more information

Tone:
- Professional but friendly
- Clear and concise
- Encouraging but realistic
- No financial jargon

CRITICAL: Never make up financial information. Only use data provided in the context.
`;
```

---

### 4. Infrastructure Layer

#### 4.1 Database (PostgreSQL + Prisma)

**Schema Design Principles:**
- Normalized data structure
- Audit trails for financial data
- Soft deletes
- Timestamps on all tables

**Key Tables:**
```prisma
model User {
  id            String   @id @default(cuid())
  clerkId       String   @unique
  email         String   @unique
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  profile       FinancialProfile?
  goals         Goal[]
  transactions  Transaction[]
  conversations Conversation[]
}

model FinancialProfile {
  id                    String   @id @default(cuid())
  userId                String   @unique
  monthlyIncome         Decimal
  currentSavings        Decimal
  emergencyFundTarget   Decimal?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  user                  User     @relation(fields: [userId], references: [id])
  expenses              Expense[]
  debts                 Debt[]
  assets                Asset[]
}

model Goal {
  id              String   @id @default(cuid())
  userId          String
  name            String
  targetAmount    Decimal
  currentAmount   Decimal  @default(0)
  targetDate      DateTime
  priority        Priority
  status          GoalStatus @default(ACTIVE)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  user            User     @relation(fields: [userId], references: [id])
}
```

**Prisma Client Usage:**
```typescript
// lib/db.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const db = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}
```

#### 4.2 Authentication (Clerk)

**Integration:**
```typescript
// middleware.ts
import { authMiddleware } from '@clerk/nextjs';

export default authMiddleware({
  publicRoutes: ['/'],
  ignoredRoutes: ['/api/webhooks/(.*)'],
});

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
```

**User Context:**
```typescript
// lib/auth.ts
import { auth } from '@clerk/nextjs';

export async function getCurrentUserId(): Promise<string> {
  const { userId } = auth();
  if (!userId) throw new Error('Unauthorized');
  return userId;
}
```

#### 4.3 AI Provider (OpenAI)

**Configuration:**
```typescript
// lib/openai.ts
import OpenAI from 'openai';

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Rate limiting and error handling
export async function callOpenAI(params: any) {
  try {
    return await openai.chat.completions.create(params);
  } catch (error) {
    // Handle rate limits, errors, etc.
    throw new AIServiceError('AI service unavailable');
  }
}
```

#### 4.4 Analytics (PostHog)

**Integration:**
```typescript
// lib/analytics.ts
import { PostHog } from 'posthog-node';

export const analytics = new PostHog(
  process.env.NEXT_PUBLIC_POSTHOG_KEY!,
  { host: process.env.NEXT_PUBLIC_POSTHOG_HOST }
);

export function trackEvent(
  userId: string,
  event: string,
  properties?: Record<string, any>
) {
  analytics.capture({
    distinctId: userId,
    event,
    properties,
  });
}
```

---

## Data Flow Examples

### Example 1: User Asks "Can I afford X?"

```
1. User types question in chat
   ↓
2. ChatInterface component sends to server action
   ↓
3. Server action: processUserQuery()
   ↓
4. AI Service: extractIntent()
   - Uses OpenAI to parse question
   - Returns: { type: 'affordability', amount: 50000 }
   ↓
5. Financial Engine: calculateAffordability()
   - Gets user's financial profile from DB
   - Runs deterministic calculation
   - Returns structured result
   ↓
6. AI Service: generateExplanation()
   - Takes calculation results
   - Uses OpenAI to generate natural language
   - Returns formatted response
   ↓
7. Server action returns response
   ↓
8. ChatInterface displays to user
   ↓
9. Analytics: Track event
```

### Example 2: User Creates a Goal

```
1. User fills goal form
   ↓
2. Form submits to server action: createGoal()
   ↓
3. Validate input with Zod
   ↓
4. Financial Engine: calculateGoalFeasibility()
   - Calculate monthly required
   - Check against available funds
   - Return feasibility analysis
   ↓
5. Save goal to database (Prisma)
   ↓
6. Simulation Engine: projectGoalTimeline()
   - Simulate month-by-month progress
   - Identify milestones
   ↓
7. Return goal + feasibility + timeline
   ↓
8. UI updates with new goal
   ↓
9. Analytics: Track goal creation
```

---

## Error Handling Strategy

### Error Types

```typescript
// lib/errors.ts

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number
  ) {
    super(message);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

export class AIServiceError extends AppError {
  constructor(message: string) {
    super(message, 'AI_SERVICE_ERROR', 503);
  }
}
```

### Error Handling Pattern

```typescript
// Server action with error handling
export async function createGoal(data: unknown) {
  try {
    // Validate
    const validated = createGoalSchema.parse(data);
    
    // Authorize
    const userId = await getCurrentUserId();
    
    // Execute
    const goal = await goalService.create(userId, validated);
    
    return { success: true, data: goal };
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, error: 'Invalid input' };
    }
    if (error instanceof UnauthorizedError) {
      return { success: false, error: 'Unauthorized' };
    }
    // Log unexpected errors
    console.error('Unexpected error:', error);
    return { success: false, error: 'Something went wrong' };
  }
}
```

---

## Performance Optimization

### 1. Database Optimization

**Indexing Strategy:**
```prisma
model Goal {
  @@index([userId])
  @@index([status])
  @@index([userId, status])
}
```

**Query Optimization:**
```typescript
// ❌ N+1 query problem
const goals = await db.goal.findMany({ where: { userId } });
for (const goal of goals) {
  const progress = await db.transaction.findMany({ 
    where: { goalId: goal.id } 
  });
}

// ✅ Single query with include
const goals = await db.goal.findMany({
  where: { userId },
  include: { transactions: true }
});
```

### 2. Caching Strategy

**Server-side caching:**
```typescript
import { unstable_cache } from 'next/cache';

export const getFinancialProfile = unstable_cache(
  async (userId: string) => {
    return await db.financialProfile.findUnique({
      where: { userId },
      include: { expenses: true, debts: true, assets: true }
    });
  },
  ['financial-profile'],
  { revalidate: 300 } // 5 minutes
);
```

### 3. AI Response Streaming

```typescript
export async function streamChatResponse(query: string) {
  const stream = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [...],
    stream: true,
  });

  return new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || '';
        controller.enqueue(text);
      }
      controller.close();
    },
  });
}
```

---

## Security Architecture

### 1. Authentication Flow

```
User → Clerk → JWT Token → Next.js Middleware → Protected Route
```

### 2. Authorization Pattern

```typescript
// lib/authorization.ts

export async function authorizeGoalAccess(
  goalId: string,
  userId: string
): Promise<boolean> {
  const goal = await db.goal.findUnique({
    where: { id: goalId },
    select: { userId: true }
  });
  
  return goal?.userId === userId;
}

// Usage in server action
export async function updateGoal(goalId: string, data: any) {
  const userId = await getCurrentUserId();
  
  if (!await authorizeGoalAccess(goalId, userId)) {
    throw new UnauthorizedError();
  }
  
  // Proceed with update
}
```

### 3. Input Validation

```typescript
import { z } from 'zod';

export const createGoalSchema = z.object({
  name: z.string().min(1).max(100),
  targetAmount: z.number().positive().max(100000000),
  targetDate: z.date().min(new Date()),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']),
});

// Usage
const validated = createGoalSchema.parse(userInput);
```

### 4. Rate Limiting

```typescript
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
});

export async function checkRateLimit(userId: string) {
  const { success } = await ratelimit.limit(userId);
  if (!success) {
    throw new AppError('Rate limit exceeded', 'RATE_LIMIT', 429);
  }
}
```

---

## Deployment Architecture

### Vercel Deployment

```
┌─────────────────────────────────────────┐
│           Vercel Edge Network           │
│         (Global CDN + Edge Runtime)     │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         Next.js Application             │
│    (Serverless Functions + SSR)         │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│      External Services                  │
│  ┌──────────┐  ┌──────────┐            │
│  │PostgreSQL│  │  OpenAI  │            │
│  │(Neon/    │  │   API    │            │
│  │Supabase) │  └──────────┘            │
│  └──────────┘                           │
└─────────────────────────────────────────┘
```

### Environment Configuration

```bash
# .env.local

# Database
DATABASE_URL="postgresql://..."

# Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."

# AI
OPENAI_API_KEY="sk-..."

# Analytics
NEXT_PUBLIC_POSTHOG_KEY="phc_..."
NEXT_PUBLIC_POSTHOG_HOST="https://app.posthog.com"

# App
NEXT_PUBLIC_APP_URL="https://sage.app"
```

---

## Testing Strategy

### Unit Tests (Financial Engine)

```typescript
// domain/financial/__tests__/allocation.test.ts

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
  });
});
```

### Integration Tests (Server Actions)

```typescript
// features/goals/__tests__/actions.test.ts

describe('createGoal', () => {
  it('should create goal and calculate feasibility', async () => {
    const result = await createGoal({
      name: 'House Down Payment',
      targetAmount: 500000,
      targetDate: new Date('2028-01-01'),
      priority: 'HIGH',
    });

    expect(result.success).toBe(true);
    expect(result.data.feasibility).toBeDefined();
  });
});
```

### E2E Tests (Playwright)

```typescript
// e2e/onboarding.spec.ts

test('user can complete onboarding', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Get Started');
  
  await page.fill('[name="income"]', '80000');
  await page.fill('[name="savings"]', '100000');
  await page.selectOption('[name="goal"]', 'house');
  
  await page.click('text=Continue');
  
  await expect(page.locator('text=Your Monthly Allocation')).toBeVisible();
});
```

---

## Monitoring & Observability

### Application Monitoring

```typescript
// lib/monitoring.ts

export function logError(error: Error, context?: any) {
  console.error('Error:', {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
  });
  
  // Send to monitoring service (e.g., Sentry)
}

export function logPerformance(metric: string, duration: number) {
  console.log('Performance:', {
    metric,
    duration,
    timestamp: new Date().toISOString(),
  });
  
  // Send to analytics
}
```

### Health Checks

```typescript
// app/api/health/route.ts

export async function GET() {
  const checks = {
    database: await checkDatabase(),
    ai: await checkAI(),
    timestamp: new Date().toISOString(),
  };
  
  const healthy = Object.values(checks).every(c => c === true);
  
  return Response.json(checks, {
    status: healthy ? 200 : 503,
  });
}
```

---

## Scalability Considerations

### Current Architecture (MVP)
- Supports: 10,000 users
- Serverless functions scale automatically
- Database: Single PostgreSQL instance

### Future Scaling (Phase 2+)
- Read replicas for database
- Redis caching layer
- Background job processing (BullMQ)
- CDN for static assets
- Multi-region deployment

---

## Technology Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 14+ | React framework with SSR |
| UI Components | shadcn/ui + Tailwind | Component library + styling |
| Backend | Next.js Server Actions | Server-side logic |
| Database | PostgreSQL | Primary data store |
| ORM | Prisma | Type-safe database access |
| Authentication | Clerk | User auth & management |
| AI | OpenAI GPT-4 | Natural language processing |
| Analytics | PostHog | Product analytics |
| Email | Resend | Transactional emails |
| Hosting | Vercel | Deployment platform |
| Monitoring | Vercel Analytics | Performance monitoring |

---

## Conclusion

This architecture is designed to:
- ✅ Keep financial logic deterministic and testable
- ✅ Use AI for explanation, not calculation
- ✅ Scale from MVP to production
- ✅ Maintain code quality and developer experience
- ✅ Ensure security and privacy
- ✅ Enable fast iteration and deployment

The architecture is simple enough for MVP but flexible enough to evolve as the product grows.
