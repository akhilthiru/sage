# Sage: Architectural Decision Log

**Record of Key Technical Decisions**

---

## How to Use This Document

**Purpose:** Record architectural decisions to prevent revisiting settled questions and maintain consistency.

**When to Add:**
- Major technology choices
- Architecture patterns adopted
- Significant trade-offs made
- Rejected alternatives (and why)

**Format:**
```
## ADR-XXX: Decision Title

**Date:** YYYY-MM-DD
**Status:** Accepted | Superseded | Deprecated
**Context:** What problem are we solving?
**Decision:** What did we decide?
**Rationale:** Why this choice?
**Consequences:** What are the trade-offs?
**Alternatives Considered:** What else did we evaluate?
```

---

## ADR-001: Monorepo Structure

**Date:** 2024-12-19  
**Status:** Accepted  

**Context:**
Need to decide repository structure for Sage codebase. Options: monorepo vs polyrepo (multiple repositories).

**Decision:**
Use monorepo - single repository containing all code (frontend, backend, domain logic, infrastructure).

**Rationale:**
1. **Startup Stage:** Small team (2-5 people) needs fast iteration
2. **Shared Code:** Significant code sharing between features (domain logic, types)
3. **Atomic Changes:** Changes often span multiple modules (e.g., add field to entity → update schema, validation, UI)
4. **Refactoring:** Easy to refactor across entire codebase with IDE support
5. **No Versioning Overhead:** No need to publish/version internal packages
6. **Single Source of Truth:** All code in one place, easier to understand

**Consequences:**
- ✅ Faster development (no cross-repo coordination)
- ✅ Easier refactoring (IDE finds all usages)
- ✅ Simpler CI/CD (single pipeline)
- ⚠️ Larger repository size (manageable at our scale)
- ⚠️ All code visible to all developers (acceptable for small team)

**Alternatives Considered:**
- **Polyrepo:** Rejected due to coordination overhead, versioning complexity, slower development
- **Turborepo/Nx:** Deferred until team > 10 developers (unnecessary complexity now)

**Migration Path:**
If team grows > 20 developers, consider Turborepo for better caching and task orchestration while maintaining monorepo structure.

---

## ADR-002: Modular Monolith Architecture

**Date:** 2024-12-19  
**Status:** Accepted  

**Context:**
Need to decide application architecture. Options: monolith, modular monolith, microservices.

**Decision:**
Use modular monolith - clear module boundaries with single deployment.

**Rationale:**
1. **Startup Reality:** Small team, need speed over scalability
2. **Unclear Boundaries:** Service boundaries will emerge over time
3. **Avoid Complexity:** Microservices add network, data consistency, deployment overhead
4. **Future-Proof:** Design modules as if they were microservices (easy extraction later)
5. **ACID Transactions:** Need database transactions across entities (goals + allocation)
6. **Development Speed:** Single process, instant feedback, simple debugging

**Consequences:**
- ✅ Fast development (no network calls, simple debugging)
- ✅ ACID transactions (data consistency guaranteed)
- ✅ Simple deployment (single process)
- ✅ Easy local development (npm run dev)
- ✅ Future extraction path (modules → microservices)
- ⚠️ Cannot scale modules independently (acceptable at current scale)
- ⚠️ Single point of failure (mitigated by Vercel's infrastructure)

**Alternatives Considered:**
- **Pure Monolith:** Rejected due to lack of boundaries (hard to extract later)
- **Microservices:** Rejected due to premature complexity, small team, unclear boundaries

**Migration Triggers:**
Extract to microservices when:
- Team > 50 engineers
- Clear independent scaling needs (e.g., chat service needs 10x instances)
- Different technology requirements (e.g., Python for ML)
- Multiple autonomous teams

---

## ADR-003: TypeScript Strict Mode

**Date:** 2024-12-19  
**Status:** Accepted  

**Context:**
Need to decide TypeScript configuration. Options: loose mode, strict mode.

**Decision:**
Use TypeScript strict mode with all strict flags enabled.

**Rationale:**
1. **Type Safety:** Catch bugs at compile time, not runtime
2. **Financial Application:** Money calculations require precision and correctness
3. **Refactoring Confidence:** Types make refactoring safe
4. **Better DX:** IDE autocomplete, inline documentation
5. **No `any` Escape Hatch:** Force explicit typing

**Consequences:**
- ✅ Fewer runtime errors (caught at compile time)
- ✅ Safer refactoring (TypeScript finds all usages)
- ✅ Better documentation (types are self-documenting)
- ✅ Improved IDE support (autocomplete, type hints)
- ⚠️ Slower initial development (must define types upfront)
- ⚠️ Learning curve for junior developers (acceptable trade-off)

**Alternatives Considered:**
- **Loose Mode:** Rejected due to lack of type safety
- **JavaScript:** Rejected due to no compile-time checking

**Configuration:**
```json
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "noImplicitReturns": true,
  "noFallthroughCasesInSwitch": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true
}
```

---

## ADR-004: Next.js App Router

**Date:** 2024-12-19  
**Status:** Accepted  

**Context:**
Need to choose Next.js routing approach. Options: Pages Router, App Router.

**Decision:**
Use Next.js App Router (Next.js 14+).

**Rationale:**
1. **Modern React:** Server Components, Suspense, streaming
2. **Better Performance:** Less JavaScript to client, faster page loads
3. **Server Actions:** Type-safe mutations without API routes
4. **Future-Proof:** Pages Router is legacy, App Router is future
5. **Better DX:** Layouts, loading states, error boundaries built-in

**Consequences:**
- ✅ Better performance (Server Components)
- ✅ Type-safe mutations (Server Actions)
- ✅ Built-in features (layouts, loading, error handling)
- ✅ Future-proof (active development)
- ⚠️ Learning curve (new paradigm)
- ⚠️ Some libraries not compatible yet (acceptable, most work)

**Alternatives Considered:**
- **Pages Router:** Rejected as legacy, missing modern features
- **Remix:** Rejected to stay within Next.js ecosystem

---

## ADR-005: Vercel Deployment

**Date:** 2024-12-19  
**Status:** Accepted  

**Context:**
Need to choose deployment platform. Options: Vercel, AWS, self-hosted.

**Decision:**
Deploy on Vercel serverless platform.

**Rationale:**
1. **Next.js Native:** Built by Next.js team, zero configuration
2. **Zero Ops:** No server management, automatic scaling
3. **Global CDN:** 100+ edge locations, fast worldwide
4. **Preview Deployments:** Automatic preview for every PR
5. **Cost-Effective:** Pay per use, no idle costs
6. **Developer Experience:** Best DX for Next.js apps

**Consequences:**
- ✅ Zero operational overhead
- ✅ Automatic scaling (0 to millions)
- ✅ Global performance (edge network)
- ✅ Preview deployments (test before merge)
- ✅ Fast deployment (< 1 minute)
- ⚠️ Vendor lock-in (mitigated: standard Next.js, can migrate)
- ⚠️ 15s function timeout (acceptable for our use case)
- ⚠️ Cost at scale (monitor, migrate if > $5K/month)

**Alternatives Considered:**
- **AWS ECS/Lambda:** Rejected due to operational complexity
- **Self-hosted:** Rejected due to ops overhead, small team
- **Railway/Render:** Rejected due to less Next.js optimization

**Migration Path:**
If cost > $5K/month or need > 15s functions, migrate to AWS ECS/Kubernetes.

---

## ADR-006: PostgreSQL Database

**Date:** 2024-12-19  
**Status:** Accepted  

**Context:**
Need to choose database. Options: PostgreSQL, MongoDB, MySQL.

**Decision:**
Use PostgreSQL (via Vercel Postgres/Neon).

**Rationale:**
1. **Relational Data:** Financial data is highly relational (users, goals, expenses, debts)
2. **ACID Transactions:** Need strong consistency for financial operations
3. **Complex Queries:** Need joins, aggregations, window functions
4. **Data Integrity:** Foreign keys, constraints, triggers
5. **Mature Ecosystem:** Excellent tooling, ORMs, monitoring

**Consequences:**
- ✅ Strong consistency (ACID)
- ✅ Data integrity (constraints, foreign keys)
- ✅ Complex queries (joins, aggregations)
- ✅ Mature ecosystem (Prisma, pgAdmin)
- ⚠️ Vertical scaling (acceptable at our scale)
- ⚠️ Schema migrations (manageable with Prisma)

**Alternatives Considered:**
- **MongoDB:** Rejected due to lack of ACID, weak consistency
- **MySQL:** Rejected due to less advanced features than PostgreSQL
- **SQLite:** Rejected due to lack of concurrency, not suitable for production

**Provider:**
Vercel Postgres (Neon) for serverless PostgreSQL with connection pooling.

---

## ADR-007: Prisma ORM

**Date:** 2024-12-19  
**Status:** Accepted  

**Context:**
Need to choose database ORM. Options: Prisma, Drizzle, raw SQL.

**Decision:**
Use Prisma ORM.

**Rationale:**
1. **Type Safety:** Generated TypeScript types from schema
2. **Developer Experience:** Excellent autocomplete, migrations
3. **Schema-First:** Single source of truth (schema.prisma)
4. **Migrations:** Built-in migration system
5. **Next.js Integration:** Works seamlessly with Next.js

**Consequences:**
- ✅ Type-safe database queries
- ✅ Excellent DX (autocomplete, inline docs)
- ✅ Automatic migrations
- ✅ Single source of truth (schema)
- ⚠️ Abstraction layer (acceptable, rarely need raw SQL)
- ⚠️ Bundle size (acceptable for server-side)

**Alternatives Considered:**
- **Drizzle:** Rejected due to less mature ecosystem
- **Raw SQL:** Rejected due to lack of type safety, manual migrations

---

## ADR-008: Clerk Authentication

**Date:** 2024-12-19  
**Status:** Accepted  

**Context:**
Need to choose authentication solution. Options: Clerk, NextAuth, custom.

**Decision:**
Use Clerk for authentication.

**Rationale:**
1. **Managed Service:** No auth code to maintain
2. **Security:** Built by security experts, regularly audited
3. **Features:** Email/password, social login, MFA out of box
4. **Next.js Integration:** Excellent Next.js support
5. **User Management:** Built-in user management UI
6. **Free Tier:** 10K MAU free (sufficient for MVP)

**Consequences:**
- ✅ No auth code to maintain
- ✅ Security best practices built-in
- ✅ Multiple auth methods (email, social, MFA)
- ✅ User management UI included
- ⚠️ Vendor dependency (acceptable, auth is critical)
- ⚠️ Cost at scale ($25 for 25K MAU)

**Alternatives Considered:**
- **NextAuth:** Rejected due to more code to maintain
- **Custom Auth:** Rejected due to security complexity, time investment
- **Auth0:** Rejected due to higher cost

---

## ADR-009: OpenAI for AI

**Date:** 2024-12-19  
**Status:** Accepted  

**Context:**
Need to choose LLM provider. Options: OpenAI, Anthropic, open-source.

**Decision:**
Use OpenAI GPT-4 for AI explanations.

**Rationale:**
1. **Best Quality:** GPT-4 produces highest quality explanations
2. **Reliability:** Stable API, good uptime
3. **Streaming:** Supports streaming for better UX
4. **Function Calling:** Supports structured outputs
5. **Ecosystem:** Best documentation, libraries

**Consequences:**
- ✅ High-quality explanations
- ✅ Reliable service
- ✅ Streaming support
- ✅ Good documentation
- ⚠️ Cost ($0.03/1K tokens input, $0.06/1K output)
- ⚠️ Vendor dependency (mitigated: abstraction layer)

**Alternatives Considered:**
- **Anthropic Claude:** Rejected due to higher cost, less ecosystem
- **Open-source (Llama):** Rejected due to hosting complexity, lower quality

**Cost Optimization:**
- Cache common responses
- Use GPT-3.5-turbo for simple queries
- Implement rate limiting

**Critical Rule:**
LLM ONLY for explanations, NEVER for calculations. All financial math done by deterministic TypeScript functions.

---

## ADR-010: AI Explains, Engine Calculates

**Date:** 2024-12-19  
**Status:** Accepted  
**Priority:** CRITICAL - Never violate this rule

**Context:**
Need to decide how AI and financial calculations interact. Options: LLM does calculations, engine does calculations, hybrid.

**Decision:**
**Strict separation:** Financial engine (TypeScript) calculates, AI (LLM) only explains results.

**Rationale:**
1. **LLMs Hallucinate Numbers:** Cannot trust LLM for financial math
2. **Reproducibility:** Same input must always produce same output
3. **Auditability:** Users must be able to verify calculations
4. **Testability:** Pure functions are 100% testable
5. **Trust:** Users must trust the math, not AI-generated numbers

**Implementation:**
```typescript
// ✅ CORRECT
const allocation = calculateAllocation(input); // Deterministic engine
const explanation = await llm.explain(allocation); // AI explains

// ❌ WRONG
const allocation = await llm.calculate(input); // AI calculates - NEVER!
```

**Consequences:**
- ✅ Trustworthy calculations (deterministic)
- ✅ Reproducible results (testable)
- ✅ Auditable (show formulas)
- ✅ No hallucinated numbers
- ⚠️ More code to write (engines + AI layer)
- ⚠️ Must maintain both (acceptable trade-off)

**Enforcement:**
- 100% test coverage for financial engines
- Code review checks for LLM in calculation code
- Architectural boundary: domain/financial/ has no LLM imports

**This is the most important architectural decision. Never violate it.**

---

## ADR-011: Zod for Validation

**Date:** 2024-12-19  
**Status:** Accepted  

**Context:**
Need to choose validation library. Options: Zod, Yup, Joi, custom.

**Decision:**
Use Zod for all input validation.

**Rationale:**
1. **TypeScript-First:** Infers TypeScript types from schemas
2. **Type Safety:** Validation and types always in sync
3. **Composable:** Easy to compose complex schemas
4. **Error Messages:** Good error messages out of box
5. **Next.js Integration:** Works well with Server Actions

**Consequences:**
- ✅ Type-safe validation
- ✅ Inferred types (DRY)
- ✅ Good error messages
- ✅ Composable schemas
- ⚠️ Bundle size (acceptable for server-side)

**Alternatives Considered:**
- **Yup:** Rejected due to less TypeScript integration
- **Joi:** Rejected due to less TypeScript support
- **Custom:** Rejected due to maintenance overhead

**Pattern:**
```typescript
const GoalSchema = z.object({
  name: z.string().min(1).max(100),
  targetAmount: z.number().positive()
});

type GoalInput = z.infer<typeof GoalSchema>;
```

---

## ADR-012: Soft Deletes Only

**Date:** 2024-12-19  
**Status:** Accepted  

**Context:**
Need to decide deletion strategy. Options: hard delete, soft delete.

**Decision:**
Always use soft deletes (set `deletedAt` timestamp, never actually delete).

**Rationale:**
1. **Data Recovery:** Can recover accidentally deleted data
2. **Audit Trail:** Maintain history of all operations
3. **Compliance:** GDPR requires ability to restore data
4. **Analytics:** Can analyze deleted data patterns
5. **Relationships:** Avoid cascade delete issues

**Consequences:**
- ✅ Data recovery possible
- ✅ Full audit trail
- ✅ Compliance-friendly
- ⚠️ Larger database (acceptable, storage is cheap)
- ⚠️ Must filter deletedAt in queries (Prisma middleware helps)

**Implementation:**
```typescript
// ✅ CORRECT
await db.goal.update({
  where: { id },
  data: { deletedAt: new Date() }
});

// ❌ WRONG
await db.goal.delete({ where: { id } });
```

**Alternatives Considered:**
- **Hard Delete:** Rejected due to data loss risk, compliance issues

**Cleanup:**
Permanently delete data > 90 days old (automated job).

---

## ADR-013: Feature-Based Code Organization

**Date:** 2024-12-19  
**Status:** Accepted  

**Context:**
Need to decide code organization. Options: layer-based, feature-based.

**Decision:**
Use feature-based organization within features/ directory.

**Rationale:**
1. **Colocation:** Related code lives together
2. **Ownership:** Clear module ownership
3. **Discoverability:** Easy to find feature code
4. **Scalability:** Can extract features to services later
5. **Mental Model:** Matches product features

**Structure:**
```
features/
  goals/
    components/
    actions/
    hooks/
    types/
    index.ts (public API)
```

**Consequences:**
- ✅ Related code together
- ✅ Clear ownership
- ✅ Easy to find code
- ✅ Future extraction path
- ⚠️ Some code duplication (acceptable, prefer duplication over coupling)

**Alternatives Considered:**
- **Layer-Based:** Rejected due to scattered feature code
- **Domain-Driven Design Folders:** Too complex for startup stage

---

## ADR-014: Server Actions over API Routes

**Date:** 2024-12-19  
**Status:** Accepted  

**Context:**
Need to decide API pattern. Options: REST API routes, Server Actions, GraphQL.

**Decision:**
Use Next.js Server Actions as primary API pattern.

**Rationale:**
1. **Type Safety:** End-to-end type safety (client to server)
2. **Simplicity:** No need to define API routes
3. **Automatic Serialization:** Handles data serialization
4. **Progressive Enhancement:** Works without JavaScript
5. **Next.js Native:** Built into Next.js 14+

**Consequences:**
- ✅ Type-safe client-server communication
- ✅ Less boilerplate (no API routes)
- ✅ Automatic serialization
- ✅ Progressive enhancement
- ⚠️ Next.js specific (acceptable, we're committed to Next.js)

**When to Use API Routes:**
- Webhooks (Clerk, payment providers)
- Streaming responses (AI chat)
- Third-party integrations

**Alternatives Considered:**
- **REST API Routes:** Rejected due to more boilerplate, less type safety
- **GraphQL:** Rejected due to complexity, overkill for our use case

---

## ADR-015: No Premature Optimization

**Date:** 2024-12-19  
**Status:** Accepted  

**Context:**
Need to decide optimization strategy. Options: optimize upfront, optimize when needed.

**Decision:**
Optimize only when measured performance is below target.

**Rationale:**
1. **Startup Stage:** Speed of development > performance optimization
2. **Unknown Bottlenecks:** Don't know what will be slow until measured
3. **Premature Complexity:** Optimization adds complexity
4. **Good Enough:** Most code is fast enough without optimization

**Performance Targets:**
- Page load: < 2s (p95)
- Calculations: < 500ms
- AI response: < 5s

**Process:**
1. Build feature (simple, readable)
2. Measure performance
3. If below target → optimize
4. If above target → ship

**Consequences:**
- ✅ Faster development
- ✅ Simpler code
- ✅ Optimize real bottlenecks
- ⚠️ May need refactoring later (acceptable)

**When to Optimize:**
- Measured performance < target
- User-visible slowness
- Cost optimization opportunity

**Alternatives Considered:**
- **Optimize Upfront:** Rejected due to unknown bottlenecks, wasted effort

---

## Decision Template

**Use this template for new decisions:**

```markdown
## ADR-XXX: Decision Title

**Date:** YYYY-MM-DD  
**Status:** Proposed | Accepted | Superseded | Deprecated  

**Context:**
What problem are we solving? What options do we have?

**Decision:**
What did we decide to do?

**Rationale:**
Why this choice? What are the key reasons?
1. Reason 1
2. Reason 2
3. Reason 3

**Consequences:**
What are the trade-offs?
- ✅ Benefit 1
- ✅ Benefit 2
- ⚠️ Trade-off 1
- ⚠️ Trade-off 2

**Alternatives Considered:**
- **Option A:** Why rejected
- **Option B:** Why rejected

**Migration Path:** (if applicable)
When/how to change this decision in future.
```

---

## Superseded Decisions

**None yet.**

When a decision is superseded, move it here and link to the new decision.

---

## Quick Reference

**Critical Decisions (Never Violate):**
1. **ADR-010:** AI explains, engine calculates
2. **ADR-003:** TypeScript strict mode
3. **ADR-012:** Soft deletes only

**Architecture:**
- ADR-001: Monorepo
- ADR-002: Modular monolith
- ADR-013: Feature-based organization

**Technology:**
- ADR-004: Next.js App Router
- ADR-005: Vercel deployment
- ADR-006: PostgreSQL
- ADR-007: Prisma ORM
- ADR-008: Clerk auth
- ADR-009: OpenAI

**Development:**
- ADR-011: Zod validation
- ADR-014: Server Actions
- ADR-015: No premature optimization

---

**Document Version:** 1.0  
**Last Updated:** 2024-12-19  
**Purpose:** Record architectural decisions  
**Audience:** AI sessions, developers, future team  
**Update:** Add new ADR when making significant decisions
