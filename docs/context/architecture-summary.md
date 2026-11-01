# Sage: Architecture Summary

**Modular Monolith on Vercel Serverless**

---

## Architecture Philosophy

**Monorepo + Modular Monolith + Serverless**

- **Monorepo:** Single repository, all code together
- **Modular Monolith:** Clear module boundaries, single deployment
- **Serverless:** Zero ops, automatic scaling, pay-per-use

**Why NOT Microservices:** Startup stage, small team, unclear boundaries, unnecessary complexity

---

## Tech Stack

```
Frontend:  Next.js 14+ (App Router), React 18, TypeScript, TailwindCSS, shadcn/ui
Backend:   Next.js Server Actions, API Routes
Database:  PostgreSQL (Vercel Postgres/Neon), Prisma ORM
Auth:      Clerk (managed authentication)
AI:        OpenAI GPT-4 (explanation layer only)
Cache:     Redis (Upstash) - Stage 2+
Deploy:    Vercel (serverless, global CDN)
Monitor:   Vercel Analytics, Sentry, PostHog
```

---

## Layered Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│              (Next.js Pages & Components)                    │
│                   Client-side React                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Application Layer                          │
│           (Server Actions & API Routes)                      │
│                                                              │
│  Features: Onboarding, Goals, Allocation, Chat,             │
│            Simulation, Expenses, Debts                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     Domain Layer                             │
│              (Pure Business Logic)                           │
│                                                              │
│  Financial Engine, AI Service, Validation Rules             │
│  (No framework dependencies, 100% testable)                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                 Infrastructure Layer                         │
│         (Database, External APIs, Services)                  │
│                                                              │
│  PostgreSQL, Clerk, OpenAI, Redis, Analytics                │
└─────────────────────────────────────────────────────────────┘
```

**Dependency Rule:** Upper layers can depend on lower layers, never reverse.

---

## Folder Structure

```
sage/
├── app/                        # Next.js App Router
│   ├── (auth)/                 # Auth routes (sign-in, sign-up)
│   ├── (dashboard)/            # Protected routes
│   │   ├── dashboard/
│   │   ├── goals/
│   │   ├── chat/
│   │   └── simulator/
│   ├── onboarding/
│   └── api/                    # REST endpoints (webhooks, streaming)
│
├── features/                   # Application layer (feature modules)
│   ├── onboarding/
│   │   ├── components/
│   │   ├── actions/            # Server Actions
│   │   ├── hooks/
│   │   └── types/
│   ├── goals/
│   ├── allocation/
│   ├── chat/
│   ├── simulation/
│   ├── expenses/
│   └── debts/
│
├── domain/                     # Domain layer (pure logic)
│   ├── financial/              # Financial calculations
│   │   ├── allocation.ts
│   │   ├── goals.ts
│   │   ├── loans.ts
│   │   ├── projection.ts
│   │   └── confidence.ts
│   ├── ai/                     # AI integration
│   │   ├── intent-extraction.ts
│   │   └── response-generation.ts
│   └── validation/             # Zod schemas
│       └── schemas/
│
├── lib/                        # Infrastructure layer
│   ├── db/                     # Prisma client
│   ├── services/               # External services
│   │   ├── clerk/
│   │   ├── openai/
│   │   └── cache/
│   └── utils/
│
├── components/                 # Shared UI components
│   ├── ui/                     # shadcn/ui components
│   └── layout/
│
├── prisma/                     # Database
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
└── docs/                       # Documentation
```

---

## Module Boundaries

### 7 Core Modules

**1. Onboarding** - User registration, profile setup  
**2. Goals** - Goal management, feasibility  
**3. Allocation** - Monthly budget calculation  
**4. Chat** - AI conversation  
**5. Simulation** - What-if scenarios  
**6. Expenses** - Expense tracking  
**7. Debts** - Debt management  

### Module Rules

**Public API Only:**
```typescript
// features/goals/index.ts (public API)
export { createGoal } from './actions/create-goal';
export { updateGoal } from './actions/update-goal';
export type { Goal, GoalInput } from './types';

// Other modules import from public API
import { createGoal } from '@/features/goals';
```

**No Cross-Module Internals:**
```typescript
// ❌ BAD: Importing internal implementation
import { validateGoalInput } from '@/features/goals/lib/validation';

// ✅ GOOD: Using public API
import { createGoal } from '@/features/goals';
```

**Module Communication:**
- **Events** for write operations (decoupling)
- **Direct calls** for read operations (simplicity)
- **Never** circular dependencies

---

## Data Flow

### Read Operation (Dashboard)
```
User Request
    ↓
Next.js Page (SSR)
    ↓
Server Action (getGoals)
    ↓
Database Query (Prisma)
    ↓
Return Data
    ↓
Render Page
```

### Write Operation (Create Goal)
```
User Action
    ↓
Server Action (createGoal)
    ↓
Validate Input (Zod)
    ↓
Database Transaction
    ├─ Create Goal
    ├─ Recalculate Allocation
    └─ Create Notification
    ↓
Emit Event (goal.created)
    ↓
Revalidate Cache
    ↓
Return Result
```

### AI Chat Flow
```
User Message
    ↓
Extract Intent (LLM)
    ↓
Fetch Context (Goals, Allocation, Profile)
    ↓
Financial Engine (Deterministic Calculation)
    ↓
Generate Explanation (LLM)
    ↓
Stream Response (SSE)
```

**Critical:** LLM never performs calculations, only explains results.

---

## Database Strategy

### Prisma ORM
```typescript
// lib/db/client.ts
import { PrismaClient } from '@prisma/client';

export const db = new PrismaClient();
```

### Connection Pooling
- Serverless: Use Prisma connection pooling
- Max connections: 100 (Neon default)
- Timeout: 10 seconds

### Migrations
```bash
# Development
npx prisma migrate dev --name add_feature

# Production (automatic via Vercel)
npx prisma migrate deploy
```

### Indexes (Critical)
```sql
CREATE INDEX idx_goals_user_status ON "Goal"(userId, status);
CREATE INDEX idx_expenses_user_active ON "Expense"(userId, isActive);
CREATE INDEX idx_allocations_user_month ON "Allocation"(userId, month, year);
CREATE INDEX idx_transactions_user_date ON "Transaction"(userId, transactionDate DESC);
```

---

## Caching Strategy

### Stage 1 (MVP): Next.js ISR
```typescript
// app/dashboard/page.tsx
export const revalidate = 60; // 60 seconds

export default async function DashboardPage() {
  const data = await getData();
  return <Dashboard data={data} />;
}
```

### Stage 2 (Growth): Redis
```typescript
// lib/cache/allocation.ts
import { redis } from '@/lib/cache/redis';

export async function getCachedAllocation(userId: string) {
  const key = `allocation:${userId}:${month}:${year}`;
  const cached = await redis.get(key);
  
  if (cached) return JSON.parse(cached);
  
  const allocation = await calculateAllocation(userId);
  await redis.set(key, JSON.stringify(allocation), { ex: 3600 });
  
  return allocation;
}
```

### Cache Invalidation
```typescript
// On data change
await redis.del(`allocation:${userId}:${month}:${year}`);
revalidatePath('/dashboard');
```

---

## API Patterns

### Server Actions (Primary)
```typescript
'use server';

import { auth } from '@clerk/nextjs';
import { db } from '@/lib/db';

export async function createGoal(input: GoalInput) {
  const { userId } = auth();
  if (!userId) throw new Error('Unauthorized');
  
  // Validate
  const validated = GoalSchema.parse(input);
  
  // Create
  const goal = await db.goal.create({ data: validated });
  
  // Revalidate
  revalidatePath('/goals');
  
  return goal;
}
```

### REST Endpoints (Webhooks, Streaming)
```typescript
// app/api/webhooks/clerk/route.ts
export async function POST(request: Request) {
  const payload = await request.json();
  
  // Verify signature
  const isValid = await verifyWebhook(payload);
  if (!isValid) return new Response('Unauthorized', { status: 401 });
  
  // Process
  await handleClerkWebhook(payload);
  
  return new Response('OK', { status: 200 });
}
```

### Streaming (AI Chat)
```typescript
// app/api/chat/route.ts
export async function POST(request: Request) {
  const { message } = await request.json();
  
  const stream = new ReadableStream({
    async start(controller) {
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: message }],
        stream: true
      });
      
      for await (const chunk of response) {
        controller.enqueue(chunk.choices[0]?.delta?.content || '');
      }
      
      controller.close();
    }
  });
  
  return new Response(stream);
}
```

---

## Authentication & Authorization

### Clerk Integration
```typescript
// middleware.ts
import { authMiddleware } from '@clerk/nextjs';

export default authMiddleware({
  publicRoutes: ['/', '/sign-in', '/sign-up']
});

// Server Actions
import { auth } from '@clerk/nextjs';

const { userId } = auth();
if (!userId) throw new Error('Unauthorized');
```

### Row-Level Security
```typescript
// Always filter by userId
const goals = await db.goal.findMany({
  where: { userId } // Ensures users only see their data
});
```

---

## Error Handling

### Standard Error Response
```typescript
type Result<T, E> = 
  | { success: true } & T
  | { success: false; error: string; code: string } & E;

// Usage
export async function createGoal(input: GoalInput): Promise<Result<GoalResult, GoalError>> {
  try {
    const goal = await db.goal.create({ data: input });
    return { success: true, goal };
  } catch (error) {
    return { 
      success: false, 
      error: 'Failed to create goal',
      code: 'CREATE_GOAL_ERROR'
    };
  }
}
```

### Error Codes
```typescript
enum ErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  SERVER_ERROR = 'SERVER_ERROR',
  RATE_LIMITED = 'RATE_LIMITED'
}
```

---

## Performance Targets

**Page Load:**
- Initial: < 2s (p95)
- Subsequent: < 500ms (cached)

**Calculations:**
- Allocation: < 50ms
- Goal feasibility: < 100ms
- Loan EMI: < 10ms

**AI Response:**
- First token: < 2s
- Full response: < 5s (streaming)

**Database:**
- Simple query: < 50ms
- Complex query: < 200ms

---

## Deployment

### Vercel Serverless
```
Git Push → Vercel Build → Deploy → CDN Distribution
```

**Automatic:**
- SSL certificates
- Global CDN
- Preview deployments (PRs)
- Rollback (instant)

**Environments:**
- Development: Local
- Preview: PR deployments
- Production: main branch

### Environment Variables
```bash
# Database
DATABASE_URL=
DIRECT_URL=

# Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# AI
OPENAI_API_KEY=

# App
NEXT_PUBLIC_APP_URL=
NODE_ENV=
```

---

## Monitoring

### Metrics
- Response time (p50, p95, p99)
- Error rate
- Active users
- Database query performance
- Cache hit rate

### Alerts
- Error rate > 1%
- Response time > 2s
- Database connections > 80%

### Logging
```typescript
import { logger } from '@/lib/logger';

logger.info({ userId, goalId }, 'Goal created');
logger.error({ error, userId }, 'Failed to calculate allocation');
```

**Redact sensitive data:** income, savings, amounts

---

## Security

### Data Encryption
- Sensitive fields encrypted at rest
- All traffic HTTPS
- Environment variables encrypted

### Rate Limiting
```typescript
// middleware.ts
import { Ratelimit } from '@upstash/ratelimit';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s')
});

const { success } = await ratelimit.limit(ip);
if (!success) return new Response('Too Many Requests', { status: 429 });
```

### Input Validation
```typescript
import { z } from 'zod';

const GoalSchema = z.object({
  name: z.string().min(1).max(100),
  targetAmount: z.number().positive(),
  targetDate: z.string().datetime()
});

const validated = GoalSchema.parse(input); // Throws if invalid
```

---

## Testing Strategy

### Unit Tests (Domain Layer)
```typescript
// domain/financial/__tests__/allocation.test.ts
describe('calculateAllocation', () => {
  it('should allocate income correctly', () => {
    const result = calculateAllocation({
      monthlyIncome: 80000,
      expenses: 40000,
      debts: [],
      goals: []
    });
    
    expect(result.essentialExpenses).toBe(40000);
  });
});
```

**Coverage:** 100% for financial engines

### Integration Tests (Application Layer)
```typescript
// features/goals/__tests__/create-goal.test.ts
describe('createGoal', () => {
  it('should create goal and recalculate allocation', async () => {
    const goal = await createGoal({
      name: 'House',
      targetAmount: 500000,
      targetDate: '2026-12-31'
    });
    
    expect(goal.isFeasible).toBeDefined();
  });
});
```

**Coverage:** 80% overall

### E2E Tests (User Journeys)
```typescript
// tests/e2e/onboarding.spec.ts
test('user can complete onboarding', async ({ page }) => {
  await page.goto('/onboarding');
  await page.fill('[name="monthlyIncome"]', '80000');
  await page.click('text=Continue');
  // ... complete flow
  await expect(page).toHaveURL('/dashboard');
});
```

---

## Scaling Roadmap

### Stage 1: MVP (0-1K users)
- Simple monolith
- Vercel Hobby/Pro
- No caching

### Stage 2: Growth (1K-10K users)
- Add Redis caching
- Database indexes
- Background jobs

### Stage 3: Scale (10K-100K users)
- Multi-region database
- Separate workers
- CDN optimization

### Stage 4: Enterprise (100K+ users)
- Extract microservices (selective)
- Database sharding
- Multi-region active-active

**Trigger:** Performance degradation, cost inefficiency, team growth

---

## Migration Paths

### To Microservices
**When:** Team > 50 engineers, clear boundaries, independent scaling needs  
**Strategy:** Strangler fig pattern (gradual extraction)  
**First Service:** Chat (high traffic, different tech stack)

### To Self-Hosted
**When:** Cost > $5K/month, compliance requirements  
**Target:** AWS ECS/Kubernetes  
**Savings:** ~50% at scale

### To Multi-Database
**When:** Data > 1TB, different data models  
**Add:** TimescaleDB (analytics), Elasticsearch (search), Redis (cache)

---

## Critical Constraints

### Serverless Limits
- Function timeout: 15s (Vercel)
- Payload size: 4.5MB
- Concurrent executions: Auto-scaled

**Mitigation:**
- Background jobs for long tasks
- Streaming for large responses
- Chunking for large payloads

### Database Limits
- Connections: 100 (Neon)
- Storage: 10GB (free), unlimited (paid)
- Query timeout: 10s

**Mitigation:**
- Connection pooling
- Query optimization
- Read replicas

---

## Quick Reference

**Architecture:** Modular Monolith  
**Deployment:** Vercel Serverless  
**Database:** PostgreSQL (Prisma)  
**Auth:** Clerk  
**AI:** OpenAI (explanation only)  
**Caching:** Redis (Stage 2+)  

**Layers:** Presentation → Application → Domain → Infrastructure  
**Modules:** Onboarding, Goals, Allocation, Chat, Simulation, Expenses, Debts  
**Communication:** Events (writes), Direct calls (reads)  

**Key Principle:** AI explains, engine calculates. Never mix.

---

**Document Version:** 1.0  
**Last Updated:** 2024-12-19  
**Purpose:** Quick architecture reference for AI sessions
