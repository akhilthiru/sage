# Sage: Project Context for AI Development

**Persistent Context for AI-Assisted Development Sessions**

---

## Product Vision

### What We're Building

**Sage is an AI-powered Personal CFO that helps users make confident financial decisions through simulation and personalized guidance.**

**Core Problem:**
- Users struggle with financial decisions: "Can I afford this?" "Should I take this loan?" "Will I reach my goal?"
- Traditional tools only track past spending (backward-looking)
- Users need forward-looking guidance and simulation

**Our Solution:**
- Simulate financial decisions before committing
- Provide personalized, actionable guidance
- Build confidence through transparency and explanation

### Product Philosophy

**What Sage IS:**
- Decision-making system (simulate outcomes)
- Financial advisor (personalized guidance)
- Simulation engine (model future scenarios)
- Learning system (improves with user data)

**What Sage IS NOT:**
- Expense tracker (means to an end, not the goal)
- Budgeting app (means to an end, not the goal)
- Investment platform (may recommend, doesn't execute)
- Accounting tool (organizes for decisions, not compliance)

### Critical Founding Principle

**AI EXPLAINS, ENGINE CALCULATES**

This is the most important rule in the entire system. Never violate this.

```
❌ WRONG: LLM performs calculation
User: "How much should I save?"
LLM: "Based on your income, you should save ₹15,000"

✅ CORRECT: Engine calculates, LLM explains
User: "How much should I save?"
System: Extract intent → Financial engine calculates allocation → LLM explains result
LLM: "Based on your ₹80,000 income and ₹40,000 expenses, the allocation engine 
      recommends ₹15,000 for goals (calculation: surplus ₹40,000 × 60% goal allocation)"
```

**Why This Matters:**
- LLMs hallucinate numbers
- Financial calculations must be deterministic and reproducible
- Users need to trust the math
- Calculations must be auditable and testable

---

## Product Boundaries

### In Scope (Current/Planned)

**MVP (Current Focus):**
- Financial profile setup (2-minute onboarding)
- Monthly income allocation (waterfall algorithm)
- Goal management with feasibility analysis
- AI chat for financial questions
- Decision simulators (purchase, loan, goal changes)
- Dashboard with insights

**Phase 2 (Next 6 Months):**
- Bank account linking (read-only)
- Automatic transaction categorization
- Spending insights and trends
- Bill reminders
- Debt payoff strategies

**Phase 3 (6-12 Months):**
- Investment tracking (read-only)
- Tax planning guidance
- Multi-currency support
- Family/joint accounts

**Phase 4 (12-24 Months):**
- Financial health score
- Personalized recommendations
- Goal sharing and collaboration
- Financial education content

### Out of Scope (Never Build)

**Never:**
- Execute financial transactions (we guide, never execute)
- Become a bank or payment processor
- Execute investment trades
- Provide legal or tax advice (guidance only)
- Guarantee financial outcomes
- Make decisions for users (we inform, they decide)
- Store bank credentials (use read-only APIs only)
- Multi-level marketing or referral schemes

**Why These Are Out of Scope:**
- Regulatory complexity (banking licenses, compliance)
- Liability concerns (legal advice requires certification)
- Trust and safety (we're advisors, not executors)
- Focus (we do one thing exceptionally well)

---

## Target Users

### Primary Persona: Young Indian Professionals

**Demographics:**
- Age: 25-40 years
- Income: ₹50K-₹2L monthly
- Location: Tier 1/2 cities in India
- Education: College graduates
- Tech-savvy, mobile-first

**Characteristics:**
- Time-poor (need quick answers)
- Goal-oriented (house, car, wedding, education)
- Risk-averse to moderate
- Want guidance, not just tracking
- Prefer chat over forms

**Pain Points:**
- "Can I afford this house?"
- "Should I take this loan or save first?"
- "Will I reach my goal on time?"
- "How should I allocate my salary?"
- "Is my emergency fund enough?"

### User Personas

**1. Aarav (28, Software Engineer, ₹1.2L/month)**
- Goal: Buy house in 3 years (₹50L down payment)
- Pain: Unsure if goal is realistic
- Needs: Feasibility analysis, timeline projection
- Quote: "I want to know if I'm on track or dreaming"

**2. Priya (32, Marketing Manager, ₹1.8L/month)**
- Goals: Multiple (house, car, child's education, retirement)
- Pain: Can't prioritize, feels overwhelmed
- Needs: Priority guidance, trade-off analysis
- Quote: "I have 5 goals but can only afford 3. Which ones?"

**3. Rohan (26, Startup Employee, ₹80K-₹1.5L/month)**
- Goal: Emergency fund + car
- Pain: Variable income makes planning hard
- Needs: Flexible planning, worst-case scenarios
- Quote: "My income varies. How do I plan?"

---

## Architectural Constraints

### Non-Negotiable Technical Decisions

**1. Monorepo Structure**
- Single repository for all code
- No package publishing
- Shared dependencies
- **Rationale:** Small team, fast iteration, easy refactoring

**2. Modular Monolith Architecture**
- Clear module boundaries (like microservices)
- Single deployment (like monolith)
- **Rationale:** Startup stage, avoid microservices complexity

**3. TypeScript Everywhere**
- Strict mode enabled
- No `any` types (use `unknown` if needed)
- **Rationale:** Type safety prevents bugs, better DX

**4. Next.js App Router**
- Server Components by default
- Server Actions for mutations
- **Rationale:** Modern React, built-in optimizations

**5. Vercel Deployment**
- Serverless functions
- Global CDN
- **Rationale:** Zero ops, automatic scaling

**6. PostgreSQL Database**
- Single source of truth
- ACID transactions
- **Rationale:** Relational data, complex queries

**7. Deterministic Financial Calculations**
- Pure TypeScript functions
- No LLM involvement
- 100% test coverage
- **Rationale:** Trust, reproducibility, auditability

### Technology Stack (Fixed)

```typescript
// Frontend
Framework: Next.js 14+ (App Router)
Language: TypeScript (strict mode)
UI: React 18, TailwindCSS, shadcn/ui
State: React hooks, Server Components

// Backend
Runtime: Node.js 18+
API: Next.js Server Actions, API Routes
ORM: Prisma
Validation: Zod

// Database
Primary: PostgreSQL (Vercel Postgres/Neon)
Cache: Redis (Upstash) - Stage 2+

// External Services
Auth: Clerk
AI: OpenAI GPT-4
Analytics: Vercel Analytics, PostHog
Monitoring: Sentry

// Deployment
Platform: Vercel
CI/CD: GitHub Actions
```

**Do NOT suggest alternatives to these technologies without strong justification.**

---

## Development Constraints

### Performance Requirements

**Hard Limits (Must Meet):**
- Page load: < 2s (p95)
- Financial calculations: < 500ms
- AI first token: < 2s
- Database queries: < 200ms

**Soft Targets (Should Meet):**
- Page load: < 1s (p50)
- Allocation calculation: < 50ms
- Goal feasibility: < 100ms
- AI full response: < 5s

### Code Quality Requirements

**Required:**
- TypeScript strict mode (no `any`)
- 100% test coverage for financial engines
- 80% test coverage overall
- ESLint passing (no warnings)
- Prettier formatted
- No console.log in production

**Recommended:**
- Meaningful variable names
- Functions < 50 lines
- Files < 300 lines
- Comments for complex logic only

### Security Requirements

**Data Privacy:**
- Encrypt sensitive fields (income, savings, amounts)
- Never log sensitive data
- Redact in error messages
- GDPR compliant (export, delete)

**Authentication:**
- Clerk for auth (managed service)
- Row-level security (filter by userId)
- No custom auth logic

**Input Validation:**
- Zod schemas for all inputs
- Sanitize user content
- Rate limiting on API routes

---

## Project Structure

### Folder Organization (Fixed)

```
sage/
├── app/                    # Next.js App Router (Presentation)
│   ├── (auth)/            # Auth routes
│   ├── (dashboard)/       # Protected routes
│   ├── onboarding/        # Onboarding flow
│   └── api/               # REST endpoints
│
├── features/              # Application layer (Modules)
│   ├── onboarding/
│   ├── goals/
│   ├── allocation/
│   ├── chat/
│   ├── simulation/
│   ├── expenses/
│   └── debts/
│
├── domain/                # Domain layer (Pure logic)
│   ├── financial/         # Financial calculations
│   ├── ai/                # AI integration
│   └── validation/        # Zod schemas
│
├── lib/                   # Infrastructure layer
│   ├── db/                # Prisma client
│   ├── services/          # External services
│   └── utils/             # Utilities
│
├── components/            # Shared UI components
│   ├── ui/                # shadcn/ui
│   └── layout/
│
├── prisma/                # Database
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
└── docs/                  # Documentation
    ├── context/           # AI context (quick reference)
    └── ai-context/        # AI development context
```

**Rules:**
- `app/` = Presentation (Next.js pages, layouts)
- `features/` = Application (business logic, Server Actions)
- `domain/` = Pure logic (no framework dependencies)
- `lib/` = Infrastructure (database, external services)
- `components/` = Shared UI only

### Module Structure (Standard)

```
features/goals/
├── components/          # UI components (specific to goals)
│   ├── GoalCard.tsx
│   ├── GoalForm.tsx
│   └── GoalProgress.tsx
├── actions/             # Server Actions (mutations)
│   ├── create-goal.ts
│   ├── update-goal.ts
│   └── delete-goal.ts
├── hooks/               # React hooks
│   ├── useGoals.ts
│   └── useGoalFeasibility.ts
├── types/               # TypeScript types
│   └── goals.ts
├── index.ts             # Public API (exports only)
└── README.md            # Module documentation
```

**Every module must have:**
- `index.ts` with public API exports
- `README.md` with purpose and usage
- Clear separation of concerns

---

## Key Concepts

### Financial Concepts

**Allocation:**
- Distribution of monthly income across categories
- Waterfall priority: Essentials → Debt → Emergency → Goals → Investments → Discretionary
- Recalculated when financial data changes

**Feasibility:**
- Whether a goal can be achieved with available income
- Score: 0-100 (based on utilization ratio)
- `isFeasible = utilizationRatio <= 1.0`

**Understanding Score:**
- Profile completeness: 0-100
- Based on required, important, optional fields
- Drives personalization quality

**Confidence Score:**
- Prediction reliability: 0-100
- Based on data completeness, income stability, emergency fund, debt load
- Always show to users (acknowledge uncertainty)

### Technical Concepts

**Server Actions:**
- Next.js feature for server-side mutations
- Replace traditional API routes
- Type-safe, automatic serialization

**Server Components:**
- React components that render on server
- No JavaScript sent to client
- Direct database access

**Modular Monolith:**
- Clear module boundaries (like microservices)
- Single deployment (like monolith)
- Event-driven communication

**Deterministic Calculation:**
- Same input always produces same output
- No randomness, no LLM involvement
- Pure functions, fully testable

---

## Development Principles

### 1. Type Safety First

```typescript
// ❌ BAD: Using any
function calculateEMI(principal: any, rate: any): any {
  return principal * rate;
}

// ✅ GOOD: Explicit types
function calculateEMI(
  principal: number,
  annualRate: number,
  tenureMonths: number
): number {
  const monthlyRate = annualRate / 12 / 100;
  return principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths) /
         (Math.pow(1 + monthlyRate, tenureMonths) - 1);
}
```

### 2. Explicit Over Clever

```typescript
// ❌ BAD: Clever but unclear
const a = d.reduce((s, i) => s + (i.e ? i.a : 0), 0);

// ✅ GOOD: Explicit and clear
const essentialExpensesTotal = expenses.reduce(
  (sum, expense) => sum + (expense.isEssential ? expense.amount : 0),
  0
);
```

### 3. Fail Fast with Validation

```typescript
// ❌ BAD: Validation in business logic
function createGoal(input: any) {
  if (!input.name) throw new Error('Name required');
  if (input.targetAmount <= 0) throw new Error('Amount must be positive');
  // ... business logic
}

// ✅ GOOD: Validate at boundary
const GoalSchema = z.object({
  name: z.string().min(1).max(100),
  targetAmount: z.number().positive()
});

function createGoal(input: unknown) {
  const validated = GoalSchema.parse(input); // Throws if invalid
  // ... business logic with validated data
}
```

### 4. Pure Domain Logic

```typescript
// ❌ BAD: Domain logic with framework dependencies
import { db } from '@/lib/db';

function calculateAllocation(userId: string) {
  const profile = await db.financialProfile.findUnique({ where: { userId } });
  // ... calculation
}

// ✅ GOOD: Pure function, no dependencies
function calculateAllocation(input: AllocationInput): Allocation {
  const { monthlyIncome, expenses, debts, goals } = input;
  // ... calculation (pure, testable)
}
```

### 5. Error Handling with Types

```typescript
// ❌ BAD: Throwing errors
function createGoal(input: GoalInput): Goal {
  if (hasDuplicateEmergencyFund) {
    throw new Error('Duplicate emergency fund');
  }
  return goal;
}

// ✅ GOOD: Result type
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

function createGoal(input: GoalInput): Result<Goal> {
  if (hasDuplicateEmergencyFund) {
    return { 
      success: false, 
      error: { code: 'DUPLICATE_EMERGENCY_FUND', message: '...' }
    };
  }
  return { success: true, data: goal };
}
```

---

## Common Pitfalls to Avoid

### 1. LLM Performing Calculations

```typescript
// ❌ NEVER DO THIS
const prompt = `Calculate EMI for ₹500,000 at 12% for 12 months`;
const emi = await llm.complete(prompt);

// ✅ ALWAYS DO THIS
const emi = calculateEMI(500000, 12, 12);
const explanation = await llm.complete(`Explain this EMI: ${emi}`);
```

### 2. Breaking Module Boundaries

```typescript
// ❌ BAD: Importing internal implementation
import { validateGoalInput } from '@/features/goals/lib/validation';

// ✅ GOOD: Using public API
import { createGoal } from '@/features/goals';
```

### 3. Circular Dependencies

```typescript
// ❌ BAD: Circular dependency
// features/goals/actions.ts
import { calculateAllocation } from '@/features/allocation/actions';

// features/allocation/actions.ts
import { getGoals } from '@/features/goals/actions';

// ✅ GOOD: Both depend on domain layer
// features/goals/actions.ts
import { calculateGoalFeasibility } from '@/domain/financial/goals';

// features/allocation/actions.ts
import { calculateAllocation } from '@/domain/financial/allocation';
```

### 4. Logging Sensitive Data

```typescript
// ❌ NEVER DO THIS
logger.info({ income: 80000, savings: 200000 }, 'Profile updated');

// ✅ ALWAYS DO THIS
logger.info({ 
  userId: 'user_123',
  income: '[REDACTED]',
  savings: '[REDACTED]'
}, 'Profile updated');
```

### 5. Hard Deletes

```typescript
// ❌ NEVER DO THIS
await db.user.delete({ where: { id: userId } });

// ✅ ALWAYS DO THIS
await db.user.update({ 
  where: { id: userId },
  data: { deletedAt: new Date() }
});
```

---

## Quick Decision Framework

### When to Add a New Feature

**Ask:**
1. Does it align with product vision? (decision support, not tracking)
2. Is it in scope? (check boundaries above)
3. Does it serve target users? (young professionals, India)
4. Can we maintain it? (team size, complexity)

**If all yes → proceed. If any no → reconsider.**

### When to Add a New Dependency

**Ask:**
1. Is it necessary? (can we build it simply?)
2. Is it maintained? (active development, good support)
3. Is it lightweight? (bundle size impact)
4. Does it align with stack? (TypeScript, React, Next.js)

**Prefer:** Fewer dependencies, more custom code (we control)

### When to Extract a Module

**Ask:**
1. Is there clear boundary? (distinct responsibility)
2. Is it reusable? (used by multiple features)
3. Is it complex enough? (> 500 lines)

**If all yes → extract. Otherwise keep in feature.**

### When to Optimize

**Ask:**
1. Is it slow? (measured, not assumed)
2. Do users notice? (impacts UX)
3. Is it worth the complexity? (cost-benefit)

**Optimize when measured performance < target, not preemptively.**

---

## Success Criteria

### Product Success

**MVP Success (Month 3):**
- 100 active users
- 60% complete onboarding
- 30% create first goal within 24 hours
- NPS > 40

**Beta Success (Month 6):**
- 1,000 active users
- 40% weekly active
- 3+ sessions per week per user
- NPS > 50

### Technical Success

**Code Quality:**
- 100% test coverage (financial engines)
- 80% test coverage (overall)
- 0 TypeScript errors
- 0 ESLint warnings

**Performance:**
- Page load < 2s (p95)
- Calculations < 500ms
- AI response < 5s
- Uptime > 99.5%

---

## Context for AI Sessions

### When Starting a New Task

**Always:**
1. Read this file first
2. Check product boundaries (in scope?)
3. Check architectural constraints (allowed?)
4. Check coding standards (how to implement?)
5. Check glossary (terminology)

### When Making Decisions

**Refer to:**
- Product vision (does it align?)
- Architectural constraints (is it allowed?)
- Development principles (how to implement?)
- Decision log (has this been decided?)

### When Unsure

**Ask yourself:**
1. Does this align with "AI explains, engine calculates"?
2. Does this maintain type safety?
3. Does this respect module boundaries?
4. Does this follow coding standards?

**If any answer is no → reconsider approach.**

---

**Document Version:** 1.0  
**Last Updated:** 2024-12-19  
**Purpose:** Persistent context for AI-assisted development  
**Audience:** Future AI sessions, new developers  
**Update Frequency:** When major decisions change
