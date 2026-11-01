# Sage: Deployment Strategy

## Overview

This document defines the deployment architecture for Sage, leveraging Vercel's platform for Next.js applications with a focus on simplicity, speed, and scalability.

**Platform:** Vercel (Next.js optimized)  
**Deployment Model:** Serverless with Edge capabilities  
**Database:** Vercel Postgres (Neon)  
**CDN:** Vercel Edge Network  

---

## Why Vercel?

### 1. Next.js Native Platform

**Perfect Match:**
- Built by the Next.js team
- Zero configuration for Next.js apps
- Automatic optimization
- Native support for App Router, Server Actions, Streaming

**Example:**
```bash
# Deploy to Vercel
git push origin main
# That's it! Automatic build, deploy, and CDN distribution
```

### 2. Serverless by Default

**Benefits:**
- **Zero server management** - No EC2 instances, no Kubernetes
- **Automatic scaling** - Handles 0 to millions of requests
- **Pay per use** - No idle server costs
- **Global distribution** - Edge network in 100+ locations

**Cost Comparison:**
```
Traditional (AWS EC2):
- t3.medium: $30/month (always running)
- Load balancer: $20/month
- Total: $50/month minimum (even with 0 users)

Vercel Serverless:
- $0/month for 0 users
- $20/month for 100K requests
- Scales automatically
```

### 3. Developer Experience

**Instant Previews:**
- Every PR gets a preview URL
- Test changes before merging
- Share with stakeholders instantly

**Example Workflow:**
```bash
# Create feature branch
git checkout -b feature/goal-milestones

# Push to GitHub
git push origin feature/goal-milestones

# Vercel automatically:
# 1. Builds the branch
# 2. Deploys to preview URL
# 3. Comments on PR with URL
# → https://sage-pr-123.vercel.app
```

### 4. Integrated Services

**Built-in:**
- **Analytics** - Web Vitals, performance metrics
- **Monitoring** - Error tracking, logs
- **Edge Functions** - Low-latency compute
- **Image Optimization** - Automatic WebP/AVIF
- **Caching** - Intelligent CDN caching

---

## Deployment Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Users                                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Vercel Edge Network                       │
│                  (CDN + Edge Functions)                      │
│                   100+ Global Locations                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Vercel Serverless                          │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Next.js App │  │ Server Actions│  │  API Routes  │     │
│  │   (Pages)    │  │  (Business)   │  │  (Webhooks)  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   External Services                          │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Postgres   │  │    Clerk     │  │   OpenAI     │     │
│  │   (Vercel)   │  │    (Auth)    │  │    (AI)      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Request Flow

**Static Pages (Landing, Marketing):**
```
User Request
    ↓
Edge CDN (cached)
    ↓
Return HTML (< 50ms globally)
```

**Dynamic Pages (Dashboard):**
```
User Request
    ↓
Edge CDN (check cache)
    ↓
Serverless Function (if not cached)
    ↓
Database Query
    ↓
Render Page
    ↓
Return HTML (< 500ms)
```

**Server Actions (Create Goal):**
```
User Action
    ↓
Server Action Function
    ↓
Validate Input (Zod)
    ↓
Database Transaction
    ↓
Calculate Feasibility
    ↓
Return Result
    ↓
Revalidate Cache
```

---

## Environment Configuration

### Environment Variables

**Structure:**
```
.env.local              # Local development (gitignored)
.env.example            # Template (committed)
.env.production         # Vercel dashboard (encrypted)
```

**Required Variables:**
```bash
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."  # For migrations

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."
CLERK_WEBHOOK_SECRET="whsec_..."

# AI (OpenAI)
OPENAI_API_KEY="sk-..."

# Analytics (PostHog)
NEXT_PUBLIC_POSTHOG_KEY="phc_..."
NEXT_PUBLIC_POSTHOG_HOST="https://app.posthog.com"

# Application
NEXT_PUBLIC_APP_URL="https://sage.app"
NODE_ENV="production"
```

**Security:**
- Never commit `.env.local`
- Use Vercel dashboard for production secrets
- Rotate keys quarterly
- Use different keys per environment

### Environment Management

**Vercel Dashboard:**
```bash
# Add environment variable
vercel env add DATABASE_URL production

# Pull environment variables locally
vercel env pull .env.local
```

**Per-Environment Configuration:**
- **Development:** `.env.local`
- **Preview:** Vercel dashboard (Preview)
- **Production:** Vercel dashboard (Production)

---

## Deployment Workflow

### Automatic Deployments

**Git Integration:**
```yaml
# Automatic triggers
main branch → Production deployment
feature/* → Preview deployment
Pull Request → Preview deployment + comment
```

**Build Process:**
```bash
# Vercel automatically runs:
1. npm install
2. npm run build
3. Deploy to Edge Network
4. Invalidate old cache
5. Health check
6. Route traffic
```

### Manual Deployments

**CLI Deployment:**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Promote preview to production
vercel promote <deployment-url>
```

### Deployment Checklist

**Pre-Deployment:**
- [ ] All tests passing
- [ ] Database migrations ready
- [ ] Environment variables configured
- [ ] Feature flags set correctly
- [ ] Monitoring alerts configured

**Post-Deployment:**
- [ ] Health check passes
- [ ] Smoke tests pass
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Verify database connections

---

## Database Strategy

### Vercel Postgres (Neon)

**Why Neon?**
- Serverless Postgres
- Automatic scaling
- Branching for preview deployments
- Connection pooling built-in
- Integrated with Vercel

**Architecture:**
```
┌─────────────────────────────────────────────────────────────┐
│                    Vercel Postgres (Neon)                    │
│                                                              │
│  Production Database                                         │
│  ├── Main branch (production)                               │
│  ├── Preview branch 1 (PR #123)                             │
│  ├── Preview branch 2 (PR #124)                             │
│  └── Development branch (local)                             │
└─────────────────────────────────────────────────────────────┘
```

**Connection Pooling:**
```typescript
// lib/db/client.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const db = globalForPrisma.prisma || new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
```

**Connection Limits:**
- Serverless functions: Use connection pooling
- Max connections: 100 (Neon default)
- Connection timeout: 10 seconds

### Database Migrations

**Migration Strategy:**
```bash
# Development
npx prisma migrate dev --name add_goal_milestones

# Production (via CI/CD)
npx prisma migrate deploy
```

**Deployment Process:**
1. Create migration locally
2. Test migration on preview branch
3. Commit migration files
4. Deploy to production
5. Vercel runs migration automatically

**Rollback Strategy:**
```bash
# If migration fails
npx prisma migrate resolve --rolled-back <migration-name>

# Revert to previous deployment
vercel rollback
```

---

## Caching Strategy

### Edge Caching

**Static Assets:**
```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      }
    ];
  }
};
```

**Dynamic Pages:**
```typescript
// app/dashboard/page.tsx
export const revalidate = 60; // Revalidate every 60 seconds

export default async function DashboardPage() {
  const data = await getData();
  return <Dashboard data={data} />;
}
```

**On-Demand Revalidation:**
```typescript
// features/goals/actions/create-goal.ts
import { revalidatePath } from 'next/cache';

export async function createGoal(input: GoalInput) {
  const goal = await db.goal.create({ data: input });
  
  // Revalidate dashboard cache
  revalidatePath('/dashboard');
  revalidatePath('/goals');
  
  return goal;
}
```

### Data Caching

**Redis (Upstash):**
```typescript
// lib/cache/redis.ts
import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

// Cache allocation calculation
export async function getCachedAllocation(userId: string, month: number, year: number) {
  const key = `allocation:${userId}:${month}:${year}`;
  const cached = await redis.get(key);
  
  if (cached) return cached;
  
  const allocation = await calculateAllocation(userId);
  await redis.set(key, allocation, { ex: 3600 }); // 1 hour TTL
  
  return allocation;
}
```

**Cache Invalidation:**
```typescript
// When goal is created/updated
await redis.del(`allocation:${userId}:${month}:${year}`);
```

---

## Performance Optimization

### Image Optimization

**Next.js Image Component:**
```typescript
import Image from 'next/image';

<Image
  src="/hero.png"
  alt="Sage Dashboard"
  width={1200}
  height={800}
  priority // Load immediately
  placeholder="blur" // Show blur while loading
/>
```

**Automatic Optimization:**
- WebP/AVIF format conversion
- Responsive images
- Lazy loading
- CDN delivery

### Code Splitting

**Dynamic Imports:**
```typescript
// app/dashboard/page.tsx
import dynamic from 'next/dynamic';

// Load chart library only when needed
const AllocationChart = dynamic(
  () => import('@/components/charts/AllocationChart'),
  { loading: () => <ChartSkeleton /> }
);
```

**Route-Based Splitting:**
```
Automatic with Next.js App Router:
- Each route is a separate bundle
- Shared code extracted to chunks
- Parallel loading of dependencies
```

### Edge Functions

**Use Cases:**
- Authentication checks
- A/B testing
- Geolocation-based content
- Rate limiting

**Example:**
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Runs on Edge (globally distributed)
  const country = request.geo?.country;
  
  // Redirect India users to INR version
  if (country === 'IN' && !request.url.includes('/in')) {
    return NextResponse.redirect(new URL('/in', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: '/((?!api|_next/static|_next/image|favicon.ico).*)'
};
```

---

## Monitoring & Observability

### Vercel Analytics

**Built-in Metrics:**
- Page views
- Unique visitors
- Web Vitals (LCP, FID, CLS)
- Conversion funnels

**Configuration:**
```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

### Error Tracking

**Sentry Integration:**
```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  beforeSend(event) {
    // Scrub sensitive data
    if (event.request?.data) {
      delete event.request.data.income;
      delete event.request.data.savings;
    }
    return event;
  }
});
```

### Logging

**Structured Logging:**
```typescript
// lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label })
  },
  redact: ['income', 'savings', 'targetAmount'] // Redact sensitive fields
});

// Usage
logger.info({ userId, goalId }, 'Goal created');
logger.error({ error, userId }, 'Failed to calculate allocation');
```

**Log Aggregation:**
- Vercel logs (built-in)
- Datadog (optional)
- LogDNA (optional)

### Alerts

**Vercel Monitoring:**
```yaml
# vercel.json
{
  "monitoring": {
    "alerts": [
      {
        "name": "High Error Rate",
        "condition": "error_rate > 5%",
        "duration": "5m",
        "channels": ["email", "slack"]
      },
      {
        "name": "Slow Response Time",
        "condition": "p95_response_time > 2s",
        "duration": "10m",
        "channels": ["email"]
      }
    ]
  }
}
```

---

## Security

### HTTPS & Certificates

**Automatic:**
- SSL certificates auto-provisioned
- HTTPS enforced by default
- Certificate renewal automatic
- HTTP → HTTPS redirect

### Environment Security

**Secrets Management:**
- Encrypted at rest
- Encrypted in transit
- Access control via Vercel teams
- Audit logs for secret access

**Best Practices:**
```bash
# Never log secrets
logger.info({ apiKey: process.env.OPENAI_API_KEY }); // ❌ NO!

# Use redaction
logger.info({ apiKey: '[REDACTED]' }); // ✅ YES
```

### DDoS Protection

**Vercel Built-in:**
- Rate limiting at edge
- Automatic traffic filtering
- Attack mitigation
- IP blocking

**Additional Protection:**
```typescript
// middleware.ts - Rate limiting
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s')
});

export async function middleware(request: NextRequest) {
  const ip = request.ip ?? '127.0.0.1';
  const { success } = await ratelimit.limit(ip);
  
  if (!success) {
    return new NextResponse('Too Many Requests', { status: 429 });
  }
  
  return NextResponse.next();
}
```

---

## Disaster Recovery

### Backup Strategy

**Database Backups:**
- Automatic daily backups (Neon)
- Point-in-time recovery (7 days)
- Manual snapshots before major changes

**Code Backups:**
- Git repository (GitHub)
- Vercel deployment history
- Docker images (optional)

### Rollback Procedures

**Instant Rollback:**
```bash
# Via Vercel dashboard
1. Go to Deployments
2. Find previous working deployment
3. Click "Promote to Production"
# Takes < 1 minute

# Via CLI
vercel rollback
```

**Database Rollback:**
```bash
# Restore from backup
neon restore --backup-id <backup-id>

# Or point-in-time recovery
neon restore --timestamp "2024-12-19T10:00:00Z"
```

### Incident Response

**Runbook:**
```markdown
# Incident Response Runbook

## Severity Levels
- P0: Complete outage
- P1: Major feature broken
- P2: Minor feature broken
- P3: Cosmetic issue

## P0 Response (Complete Outage)
1. Check Vercel status page
2. Check database connectivity
3. Check external services (Clerk, OpenAI)
4. Rollback to last known good deployment
5. Notify users via status page
6. Post-mortem within 24 hours

## P1 Response (Major Feature Broken)
1. Identify affected feature
2. Check error logs
3. Deploy hotfix or rollback
4. Monitor error rates
5. Post-mortem within 48 hours
```

---

## Cost Optimization

### Vercel Pricing Tiers

**Hobby (Free):**
- 100GB bandwidth/month
- Unlimited deployments
- Good for: MVP testing

**Pro ($20/month):**
- 1TB bandwidth/month
- Team collaboration
- Analytics
- Good for: Launch to 10K users

**Enterprise (Custom):**
- Unlimited bandwidth
- SLA guarantees
- Dedicated support
- Good for: 100K+ users

### Cost Monitoring

**Expected Costs (First Year):**
```
Month 1-3 (MVP):
- Vercel: $0 (Hobby tier)
- Database: $0 (Free tier)
- Clerk: $0 (10K MAU free)
- OpenAI: ~$50/month
Total: ~$50/month

Month 4-6 (Beta):
- Vercel: $20 (Pro tier)
- Database: $20 (Neon Pro)
- Clerk: $25 (25K MAU)
- OpenAI: ~$200/month
Total: ~$265/month

Month 7-12 (Growth):
- Vercel: $20
- Database: $50 (Neon Scale)
- Clerk: $100 (100K MAU)
- OpenAI: ~$500/month
Total: ~$670/month
```

### Optimization Strategies

**1. Caching:**
- Cache allocation calculations (reduce DB queries)
- Cache AI responses (reduce OpenAI costs)
- Use CDN for static assets

**2. Database:**
- Use connection pooling
- Optimize queries (indexes)
- Archive old data

**3. AI:**
- Cache common questions
- Use smaller models for simple tasks
- Implement rate limiting

---

## Multi-Region Strategy

### Current: Single Region

**Vercel Edge Network:**
- CDN in 100+ locations
- Edge functions globally distributed
- Database in single region (US East)

**Latency:**
- Static content: < 50ms globally
- Dynamic content: 200-500ms (database round-trip)

### Future: Multi-Region Database

**When to implement:**
- Users in multiple continents
- Latency > 500ms for significant users
- Compliance requirements (data residency)

**Architecture:**
```
┌─────────────────────────────────────────────────────────────┐
│                    Vercel Edge Network                       │
│                     (Global CDN)                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  Regional Databases                          │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   US East    │  │   EU West    │  │  Asia Pacific│     │
│  │  (Primary)   │  │  (Replica)   │  │  (Replica)   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

**Implementation:**
- Use PlanetScale or CockroachDB
- Read replicas in each region
- Write to primary, read from nearest

---

## Compliance & Regulations

### GDPR Compliance

**Data Residency:**
- EU users → EU database region
- Data processing agreements with vendors
- Right to deletion implemented

**Implementation:**
```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const country = request.geo?.country;
  
  if (isEUCountry(country)) {
    // Route to EU database
    request.headers.set('x-database-region', 'eu-west-1');
  }
  
  return NextResponse.next();
}
```

### Data Retention

**Policy:**
- Active users: Indefinite
- Deleted accounts: 30 days (soft delete)
- Logs: 90 days
- Backups: 7 days

**Implementation:**
```typescript
// Cron job (Vercel Cron)
export async function cleanupDeletedAccounts() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  await db.user.deleteMany({
    where: {
      deletedAt: {
        lt: thirtyDaysAgo
      }
    }
  });
}
```

---

## CI/CD Pipeline

### GitHub Actions Integration

**Workflow:**
```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test
      - run: npm run build

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

### Quality Gates

**Pre-Deployment Checks:**
- [ ] All tests pass
- [ ] Linting passes
- [ ] Type checking passes
- [ ] Build succeeds
- [ ] No critical vulnerabilities
- [ ] Code coverage > 80%

**Post-Deployment Checks:**
- [ ] Health check passes
- [ ] Smoke tests pass
- [ ] Error rate < 1%
- [ ] Response time < 2s (p95)

---

## Conclusion

### Summary

**Vercel Deployment Benefits:**
1. ✅ Zero configuration for Next.js
2. ✅ Automatic scaling
3. ✅ Global CDN
4. ✅ Preview deployments
5. ✅ Integrated monitoring
6. ✅ Cost-effective for startups

**Trade-offs:**
1. ⚠️ Vendor lock-in (mitigated by standard Next.js)
2. ⚠️ Serverless limitations (15s timeout)
3. ⚠️ Single database region initially

### Decision

**Use Vercel for deployment** with serverless architecture.

**Rationale:**
- Optimizes for startup speed
- Minimal operational overhead
- Automatic scaling
- Excellent developer experience
- Clear migration path if needed

**Review Criteria:**
- Serverless limitations hit (15s timeout)
- Need for multi-region database
- Cost exceeds $1000/month
- Compliance requires specific infrastructure

---

**Document Version:** 1.0  
**Last Updated:** 2024-12-19  
**Next Review:** After 6 months in production  
**Owner:** Technical Architecture Team
