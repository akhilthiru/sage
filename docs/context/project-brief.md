# Sage: Project Brief

**AI Personal CFO | Financial Decision Support System**

---

## What Is Sage?

Sage is an AI-powered Personal CFO that helps users make better financial decisions through simulation, guidance, and personalized recommendations.

**Core Value Proposition:** Answer "Can I afford this?" and "What should I do financially?" with confidence.

---

## Product Philosophy

### What Sage IS
- **Decision-making system** - Simulates outcomes before users commit
- **Financial advisor** - Provides personalized, actionable guidance
- **Simulation engine** - Models how decisions affect financial future
- **Learning system** - Improves accuracy as it understands user better

### What Sage IS NOT
- Not just an expense tracker (means to an end)
- Not just a budgeting app (means to an end)
- Not an investment platform (may recommend, doesn't execute)
- Not an accounting tool (organizes for decisions, not compliance)

### Critical Principle: AI Explains, Engine Calculates

**NEVER let LLM perform financial calculations.**

```
User Question → Extract Intent → Financial Engine (deterministic) → LLM Explains Result
```

- **Financial Engine:** Pure TypeScript functions, 100% testable, reproducible
- **AI Layer:** Explains results in natural language, provides context
- **Separation:** LLM never invents numbers, only interprets calculations

---

## Core Features (MVP)

### 1. 2-Minute Onboarding
- Collect: Income, savings, primary goal, risk tolerance
- Calculate: Understanding score (0-100)
- Deliver: Immediate allocation recommendation

### 2. Smart Allocation Engine
- Waterfall algorithm: Essentials → Debt → Emergency → Goals → Investments → Discretionary
- Monthly income distribution
- Automatic recalculation on data changes

### 3. Goal Management
- Create goals with target amount and date
- Feasibility calculation (can you achieve this?)
- Confidence scoring (how likely?)
- Progress tracking with milestones

### 4. AI CFO Chat
- Natural language financial questions
- Intent extraction → Calculation → Explanation
- Context-aware (knows user's financial state)
- Cites calculations, never invents data

### 5. Decision Simulator
- "Can I afford this?" - Purchase affordability
- "Should I take this loan?" - Loan feasibility
- "What if I change my goal?" - Goal timeline simulation
- 3 scenarios per simulation: Buy now, loan, save first

### 6. Dashboard
- Financial health score
- Current month allocation
- Active goals with progress
- Insights and recommendations

---

## Target Users

**Primary:** Young professionals (25-40) in India
- Monthly income: ₹50K-₹2L
- Tech-savvy, mobile-first
- Want guidance, not just tracking
- Time-poor, need quick answers

**Personas:**
1. **Aarav (28, Software Engineer)** - Wants to buy house, unsure about affordability
2. **Priya (32, Marketing Manager)** - Multiple goals, needs prioritization help
3. **Rohan (26, Startup Employee)** - Variable income, needs flexible planning

---

## Tech Stack

**Frontend:** Next.js 14+ (App Router), React, TypeScript, TailwindCSS, shadcn/ui  
**Backend:** Next.js Server Actions, Prisma ORM  
**Database:** PostgreSQL (Vercel Postgres/Neon)  
**Auth:** Clerk  
**AI:** OpenAI GPT-4  
**Deployment:** Vercel (serverless)  
**Monitoring:** Vercel Analytics, Sentry, PostHog  

---

## Architecture Decisions

### Monorepo
- Single repository, all code together
- Faster development, easier refactoring
- No package coordination overhead

### Modular Monolith
- Clear module boundaries (like microservices)
- Single deployment (like monolith)
- Future extraction path to microservices

### Serverless (Vercel)
- Zero server management
- Automatic scaling
- Pay per use
- Global CDN

### Feature-Based Organization
```
features/
  goals/
    components/
    actions/
    hooks/
    types/
```

---

## Key Constraints

### Performance
- Page load: < 2s (p95)
- Allocation calculation: < 50ms
- Goal feasibility: < 100ms
- AI response: < 5s (streaming)

### Data Privacy
- Encrypt sensitive fields (income, savings, amounts)
- GDPR compliant
- User data never shared
- Right to deletion

### Financial Accuracy
- 100% test coverage on financial engines
- Deterministic calculations (no randomness)
- Reproducible results
- Independent verification of formulas

### User Experience
- Onboarding: < 2 minutes
- Mobile-first design
- WCAG 2.1 AA accessibility
- Offline-capable (cached data)

---

## Success Metrics

**Product-Market Fit:**
- 40% weekly active users
- 60% complete onboarding
- 30% create first goal within 24 hours
- NPS > 50

**Engagement:**
- 3+ sessions per week
- 2+ AI chat interactions per session
- 1+ simulation per week

**Financial:**
- CAC < ₹500
- LTV > ₹5,000
- Churn < 5% monthly

---

## Product Boundaries

### In Scope (MVP)
- Financial planning and guidance
- Goal tracking and feasibility
- Decision simulation
- AI-powered chat
- Allocation recommendations

### Out of Scope (MVP)
- Bank account linking (Phase 2)
- Actual transactions (never)
- Investment execution (never)
- Tax filing (never)
- Bill payments (never)
- Multi-currency (Phase 3)
- Family/joint accounts (Phase 4)

### Never in Scope
- Become a bank
- Execute trades
- Provide legal/tax advice
- Guarantee returns
- Make decisions for users

---

## Development Phases

**Phase 0: Foundation (Month 1)**
- Project setup, database schema
- Authentication, basic UI
- Core domain models

**Phase 1: MVP (Months 2-3)**
- Onboarding flow
- Allocation engine
- Goal management
- Basic dashboard

**Phase 2: AI & Simulation (Month 4)**
- AI chat integration
- Decision simulators
- Confidence scoring

**Phase 3: Beta Launch (Month 5)**
- Polish, testing
- Performance optimization
- User feedback integration

**Phase 4: Public Launch (Month 6)**
- Marketing, onboarding
- Scale infrastructure
- Monitor and iterate

---

## Critical Rules

### Financial Calculations
1. **Never use LLM for calculations** - Always use deterministic functions
2. **Always show formulas** - Users should understand how numbers are derived
3. **Include confidence scores** - Acknowledge uncertainty
4. **Cite data sources** - "Based on your ₹80,000 monthly income..."

### AI Behavior
1. **Explain, don't calculate** - LLM interprets results from engine
2. **Admit limitations** - "I don't have enough information to..."
3. **No financial advice** - Guidance, not recommendations
4. **Transparent reasoning** - Show calculation steps

### Data Handling
1. **Encrypt sensitive data** - Income, savings, debt amounts
2. **Soft deletes only** - Never hard delete user data
3. **Audit trail** - Log all financial calculations
4. **User owns data** - Export and delete on request

### Code Quality
1. **Type safety** - TypeScript strict mode everywhere
2. **Test coverage** - 100% for financial engines, 80% overall
3. **No magic numbers** - Constants defined and documented
4. **Explicit over clever** - Readable code over clever code

---

## Competitive Differentiation

**vs. Mint/YNAB (Tracking Apps):**
- Sage: Forward-looking (what should I do?)
- Them: Backward-looking (what did I do?)

**vs. Robo-Advisors:**
- Sage: Holistic financial decisions
- Them: Investment-only focus

**vs. Human Financial Advisors:**
- Sage: Instant, affordable, always available
- Them: Expensive, scheduled, limited access

**Unique Value:** AI-powered decision simulation + personalized guidance at consumer scale

---

## Long-Term Vision

**Financial Digital Twin:** Complete digital representation of user's financial life that can:
- Simulate any financial scenario
- Predict future financial state
- Optimize for user's goals
- Learn from user's behavior
- Provide proactive guidance

**Timeline:** 3-5 years post-launch

---

## Team & Ownership

**Current Stage:** Startup (2-5 people)  
**Target (6 months):** 10-15 people  
**Target (12 months):** 20-30 people  

**Roles Needed:**
- Full-stack engineers (TypeScript/React)
- Financial domain expert
- AI/ML engineer
- Product designer
- DevOps/Infrastructure

---

## Quick Reference

**Repository:** Monorepo (single repo, all code)  
**Architecture:** Modular monolith (clear boundaries, single deployment)  
**Deployment:** Vercel serverless (zero ops)  
**Database:** PostgreSQL (Vercel Postgres)  
**Primary Language:** TypeScript (strict mode)  
**Framework:** Next.js 14+ (App Router)  
**AI:** OpenAI GPT-4 (explanation only)  
**Auth:** Clerk (managed authentication)  

**Core Principle:** AI explains, engine calculates. Never mix them.

---

**Document Version:** 1.0  
**Last Updated:** 2024-12-19  
**Purpose:** Quick project understanding for AI sessions and new developers
