# Sage: Scaling Strategy

## Overview

This document outlines the scaling roadmap for Sage from MVP (100 users) to enterprise scale (1M+ users), detailing technical, architectural, and operational changes required at each growth stage.

**Philosophy:** Scale when needed, not preemptively. Optimize for current stage while designing for future growth.

---

## Growth Stages

### Stage 0: MVP (0-100 users)
**Timeline:** Months 0-3  
**Focus:** Product-market fit  
**Architecture:** Simple monolith  

### Stage 1: Early Traction (100-1,000 users)
**Timeline:** Months 3-6  
**Focus:** Core features, stability  
**Architecture:** Optimized monolith  

### Stage 2: Growth (1K-10K users)
**Timeline:** Months 6-12  
**Focus:** Performance, reliability  
**Architecture:** Modular monolith + caching  

### Stage 3: Scale (10K-100K users)
**Timeline:** Months 12-24  
**Focus:** Horizontal scaling  
**Architecture:** Distributed monolith  

### Stage 4: Enterprise (100K-1M+ users)
**Timeline:** Months 24+  
**Focus:** Global scale, compliance  
**Architecture:** Microservices (selective)  

---

## Stage 0: MVP (0-100 users)

### Current Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Vercel Serverless                         │
│                   (Single Region: US)                        │
│                                                              │
│  Next.js App (Monolith)                                     │
│  ├── Pages (SSR)                                            │
│  ├── Server Actions                                         │
│  └── API Routes                                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Vercel Postgres (Neon) - Free Tier                         │
│  - 0.5 GB storage                                           │
│  - 100 hours compute/month                                  │
└─────────────────────────────────────────────────────────────┘
```

### Capacity

**Limits:**
- **Users:** 100 concurrent
- **Requests:** 100K/month
- **Database:** 0.5 GB
- **Bandwidth:** 100 GB/month

**Cost:** ~$50/month
- Vercel: $0 (Hobby)
- Database: $0 (Free tier)
- Clerk: $0 (10K MAU)
- OpenAI: ~$50

### Bottlenecks

**None expected at this stage**

### Monitoring

**Key Metrics:**
- Response time (p95 < 2s)
- Error rate (< 1%)
- Database size
- API usage

**Tools:**
- Vercel Analytics (built-in)
- Console logs
- Manual testing

---

## Stage 1: Early Traction (100-1,000 users)

### Architecture Changes

```
┌─────────────────────────────────────────────────────────────┐
│                    Vercel Serverless                         │
│                   (Single Region: US)                        │
│                                                              │
│  Next.js App (Monolith)                                     │
│  ├── Pages (SSR + ISR)                                      │
│  ├── Server Actions                                         │
│  └── API Routes                                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Vercel Postgres (Neon) - Pro Tier                          │
│  - 10 GB storage                                            │
│  - Autoscaling compute                                      │
│  - Connection pooling                                       │
└─────────────────────────────────────────────────────────────┘
```

### Optimizations

**1. Implement ISR (Incremental Static Regeneration)**
```typescript
// app/dashboard/page.tsx
export const revalidate = 60; // Revalidate every 60 seconds

export default async function DashboardPage() {
  const data = await getData();
  return <Dashboard data={data} />;
}
```

**2. Add Database Indexes**
```sql
-- Critical indexes for performance
CREATE INDEX idx_goals_user_status ON "Goal"(userId, status);
CREATE INDEX idx_expenses_user_active ON "Expense"(userId, isActive);
CREATE INDEX idx_allocations_user_month ON "Allocation"(userId, month, year);
CREATE INDEX idx_transactions_user_date ON "Transaction"(userId, transactionDate DESC);
```

**3. Optimize Queries**
```typescript
// Before: N+1 query
const goals = await db.goal.findMany({ where: { userId } });
for (const goal of goals) {
  goal.milestones = await db.goalMilestone.findMany({ where: { goalId: goal.id } });
}

// After: Single query with includes
const goals = await db.goal.findMany({
  where: { userId },
  include: { milestones: true }
});
```

### Capacity

**Limits:**
- **Users:** 1,000 concurrent
- **Requests:** 1M/month
- **Database:** 10 GB
- **Bandwidth:** 1 TB/month

**Cost:** ~$265/month
- Vercel: $20 (Pro)
- Database: $20 (Neon Pro)
- Clerk: $25 (25K MAU)
- OpenAI: ~$200

### Bottlenecks

**Potential:**
- Database connection limits
- OpenAI rate limits

**Mitigation:**
- Connection pooling (Prisma)
- OpenAI request queuing

### Monitoring Upgrades

**Add:**
- Sentry (error tracking)
- PostHog (product analytics)
- Database query monitoring

---

## Stage 2: Growth (1K-10K users)

### Architecture Changes

```
┌─────────────────────────────────────────────────────────────┐
│                  Vercel Edge Network                         │
│                  (Global Distribution)                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Vercel Serverless                         │
│                                                              │
│  Next.js App (Modular Monolith)                             │
│  ├── Edge Functions (Auth, Routing)                         │
│  ├── Server Actions (Business Logic)                        │
│  └── API Routes (Webhooks)                                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────┐    ┌──────────────────┐
│  Redis Cache     │    │  Postgres DB     │
│  (Upstash)       │    │  (Neon Scale)    │
│                  │    │                  │
│  - Allocations   │    │  - User data     │
│  - AI responses  │    │  - Transactions  │
│  - Session data  │    │  - 50 GB storage │
└──────────────────┘    └──────────────────┘
```

### Major Optimizations

**1. Add Redis Caching**
```typescript
// lib/cache/allocation.ts
import { redis } from '@/lib/cache/redis';

export async function getCachedAllocation(
  userId: string,
  month: number,
  year: number
) {
  const key = `allocation:${userId}:${month}:${year}`;
  
  // Try cache first
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);
  
  // Calculate if not cached
  const allocation = await calculateAllocation(userId);
  
  // Cache for 1 hour
  await redis.set(key, JSON.stringify(allocation), { ex: 3600 });
  
  return allocation;
}
```

**2. Implement Background Jobs**
```typescript
// lib/jobs/queue.ts
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

const connection = new Redis(process.env.REDIS_URL);

export const allocationQueue = new Queue('allocation-calculation', {
  connection
});

// Enqueue job
await allocationQueue.add('calculate', {
  userId,
  month,
  year
});

// Worker processes jobs
const worker = new Worker('allocation-calculation', async (job) => {
  const { userId, month, year } = job.data;
  await calculateAndSaveAllocation(userId, month, year);
}, { connection });
```

**3. Database Read Replicas**
```typescript
// lib/db/client.ts
import { PrismaClient } from '@prisma/client';

// Write to primary
export const dbWrite = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } }
});

// Read from replica
export const dbRead = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_REPLICA_URL } }
});

// Usage
const goals = await dbRead.goal.findMany({ where: { userId } }); // Read
await dbWrite.goal.create({ data: goalData }); // Write
```

**4. AI Response Caching**
```typescript
// domain/ai/cache.ts
export async function getCachedAIResponse(
  intent: string,
  context: string
): Promise<string | null> {
  const hash = createHash('sha256')
    .update(intent + context)
    .digest('hex');
  
  return await redis.get(`ai:${hash}`);
}

export async function cacheAIResponse(
  intent: string,
  context: string,
  response: string
): Promise<void> {
  const hash = createHash('sha256')
    .update(intent + context)
    .digest('hex');
  
  // Cache for 24 hours
  await redis.set(`ai:${hash}`, response, { ex: 86400 });
}
```

### Capacity

**Limits:**
- **Users:** 10,000 concurrent
- **Requests:** 10M/month
- **Database:** 50 GB
- **Bandwidth:** 5 TB/month

**Cost:** ~$670/month
- Vercel: $20 (Pro)
- Database: $50 (Neon Scale)
- Redis: $30 (Upstash)
- Clerk: $100 (100K MAU)
- OpenAI: ~$500
- Monitoring: $20

### Bottlenecks

**Expected:**
- Database write throughput
- OpenAI API rate limits
- Single region latency

**Mitigation:**
- Batch database writes
- OpenAI tier upgrade
- Consider multi-region

### Monitoring Enhancements

**Add:**
- APM (Application Performance Monitoring)
- Database query profiling
- Cache hit rate tracking
- Cost monitoring dashboard

---

## Stage 3: Scale (10K-100K users)

### Architecture Changes

```
┌─────────────────────────────────────────────────────────────┐
│                  Vercel Edge Network                         │
│              (Global CDN + Edge Functions)                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                 Regional Serverless                          │
│                                                              │
│  US Region          EU Region          APAC Region          │
│  ├── Next.js App    ├── Next.js App    ├── Next.js App     │
│  └── Workers        └── Workers        └── Workers          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│                    Data Layer                                 │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Redis Cluster│  │  PostgreSQL  │  │  S3 Storage  │      │
│  │ (Multi-AZ)   │  │ (Multi-Region│  │ (Documents)  │      │
│  │              │  │  Read Replicas│  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└──────────────────────────────────────────────────────────────┘
```

### Major Changes

**1. Multi-Region Database**
```typescript
// lib/db/routing.ts
export function getDatabase(region: string) {
  const databases = {
    'us-east-1': dbUSEast,
    'eu-west-1': dbEUWest,
    'ap-south-1': dbAPSouth
  };
  
  return databases[region] || dbUSEast;
}

// middleware.ts
export function middleware(request: NextRequest) {
  const region = getRegionFromRequest(request);
  request.headers.set('x-db-region', region);
  return NextResponse.next();
}
```

**2. Separate Background Workers**
```
┌─────────────────────────────────────────────────────────────┐
│                    Worker Services                           │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Allocation   │  │  AI Chat     │  │ Notifications│      │
│  │ Calculator   │  │  Processor   │  │  Sender      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

**Implementation:**
```typescript
// workers/allocation-calculator/index.ts
import { Worker } from 'bullmq';

const worker = new Worker('allocation', async (job) => {
  const { userId, month, year } = job.data;
  
  // Calculate allocation
  const allocation = await calculateAllocation(userId);
  
  // Save to database
  await db.allocation.create({ data: allocation });
  
  // Invalidate cache
  await redis.del(`allocation:${userId}:${month}:${year}`);
  
  // Emit event
  await eventBus.emit('allocation.calculated', { userId, allocation });
}, {
  connection: redis,
  concurrency: 10
});
```

**3. CDN for Static Assets**
```typescript
// next.config.js
module.exports = {
  images: {
    domains: ['cdn.sage.app'],
    loader: 'custom',
    loaderFile: './lib/image-loader.ts'
  },
  assetPrefix: process.env.CDN_URL
};
```

**4. Database Sharding (if needed)**
```typescript
// lib/db/sharding.ts
export function getShardForUser(userId: string): string {
  const hash = createHash('md5').update(userId).digest('hex');
  const shardNumber = parseInt(hash.substring(0, 8), 16) % SHARD_COUNT;
  return `shard_${shardNumber}`;
}

export function getShardedDatabase(userId: string) {
  const shard = getShardForUser(userId);
  return databases[shard];
}
```

### Capacity

**Limits:**
- **Users:** 100,000 concurrent
- **Requests:** 100M/month
- **Database:** 500 GB
- **Bandwidth:** 50 TB/month

**Cost:** ~$3,500/month
- Vercel: $20 (Pro) or $500 (Enterprise)
- Database: $500 (Multi-region)
- Redis: $200 (Cluster)
- Clerk: $500 (500K MAU)
- OpenAI: ~$2,000
- Workers: $200
- Monitoring: $100
- S3: $50

### Bottlenecks

**Expected:**
- Database write contention
- Cross-region latency
- OpenAI rate limits

**Mitigation:**
- Database sharding
- Regional routing
- OpenAI enterprise tier

### Team Structure

**Engineering Team (10-15 people):**
- Backend: 4 engineers
- Frontend: 3 engineers
- Infrastructure: 2 engineers
- Data/ML: 2 engineers
- QA: 2 engineers
- DevOps: 1 engineer

---

## Stage 4: Enterprise (100K-1M+ users)

### Architecture Changes

```
┌─────────────────────────────────────────────────────────────┐
│                    Global Load Balancer                      │
│                    (Cloudflare / AWS)                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  API Gateway (Kong)                          │
│         Rate Limiting, Auth, Routing, Analytics              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Service Mesh                              │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Web App     │  │  Chat Service│  │ Calculation  │      │
│  │  (Monolith)  │  │ (Microservice│  │  Service     │      │
│  │              │  │  Extracted)  │  │ (Extracted)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Notification │  │  Analytics   │  │   Search     │      │
│  │   Service    │  │   Service    │  │   Service    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                              │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  PostgreSQL  │  │  TimescaleDB │  │ Elasticsearch│      │
│  │  (Sharded)   │  │  (Time Series│  │   (Search)   │      │
│  │  Multi-Region│  │   Analytics) │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Redis Cluster│  │    Kafka     │  │   S3/CDN     │      │
│  │  (Caching)   │  │ (Event Bus)  │  │  (Storage)   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Extracted Microservices

**1. Chat Service**
```
Why Extract:
- High traffic volume
- Independent scaling needs
- Different tech stack (Python for NLP)

Technology:
- Python/FastAPI
- LangChain for LLM orchestration
- Vector database for context

Deployment:
- Kubernetes on AWS/GCP
- Auto-scaling based on queue depth
```

**2. Financial Calculation Service**
```
Why Extract:
- CPU-intensive calculations
- Need for high availability
- Potential for Go/Rust optimization

Technology:
- Go or Rust for performance
- gRPC for communication
- In-memory caching

Deployment:
- Kubernetes with HPA
- Dedicated compute instances
```

**3. Notification Service**
```
Why Extract:
- Asynchronous processing
- Multiple channels (email, SMS, push)
- Third-party integrations

Technology:
- Node.js/TypeScript
- Queue-based processing
- Retry logic

Deployment:
- Serverless (AWS Lambda)
- SQS for queuing
```

### Data Architecture

**1. Database Sharding Strategy**
```sql
-- Shard by user ID
CREATE TABLE users_shard_0 (LIKE users INCLUDING ALL);
CREATE TABLE users_shard_1 (LIKE users INCLUDING ALL);
CREATE TABLE users_shard_2 (LIKE users INCLUDING ALL);
CREATE TABLE users_shard_3 (LIKE users INCLUDING ALL);

-- Routing logic
function getShardForUser(userId) {
  return hash(userId) % SHARD_COUNT;
}
```

**2. Event Sourcing (for critical data)**
```typescript
// Store all state changes as events
interface Event {
  id: string;
  aggregateId: string;
  type: string;
  data: any;
  timestamp: Date;
  userId: string;
}

// Rebuild state from events
function rebuildGoalState(goalId: string): Goal {
  const events = await eventStore.getEvents(goalId);
  return events.reduce((state, event) => {
    return applyEvent(state, event);
  }, initialState);
}
```

**3. CQRS (Command Query Responsibility Segregation)**
```
Write Model (Commands):
- PostgreSQL (normalized, transactional)
- Handles: createGoal, updateGoal, deleteGoal

Read Model (Queries):
- Elasticsearch (denormalized, optimized for reads)
- Handles: searchGoals, getGoalAnalytics, getDashboard
- Updated via event stream
```

### Capacity

**Limits:**
- **Users:** 1M+ concurrent
- **Requests:** 1B+/month
- **Database:** 5 TB+
- **Bandwidth:** 500 TB/month

**Cost:** ~$25,000/month
- Infrastructure: $10,000 (Kubernetes, databases)
- CDN/Bandwidth: $5,000
- Third-party services: $5,000
- Monitoring/Logging: $2,000
- OpenAI: $3,000

### Team Structure

**Engineering Team (30-50 people):**
- Platform: 8 engineers
- Backend: 10 engineers
- Frontend: 8 engineers
- Mobile: 4 engineers
- Data/ML: 6 engineers
- Infrastructure/DevOps: 6 engineers
- QA: 4 engineers
- Security: 2 engineers

---

## Scaling Metrics & Triggers

### When to Scale

**Trigger Matrix:**

| Metric | Stage 1 Trigger | Stage 2 Trigger | Stage 3 Trigger | Stage 4 Trigger |
|--------|----------------|----------------|----------------|----------------|
| **Active Users** | 500 | 5,000 | 50,000 | 500,000 |
| **Database Size** | 5 GB | 25 GB | 250 GB | 2.5 TB |
| **Response Time (p95)** | > 2s | > 1.5s | > 1s | > 500ms |
| **Error Rate** | > 2% | > 1% | > 0.5% | > 0.1% |
| **Cost/User** | > $1 | > $0.50 | > $0.25 | > $0.10 |

### Monitoring Dashboard

**Key Metrics:**
```typescript
interface ScalingMetrics {
  // Traffic
  requestsPerSecond: number;
  activeUsers: number;
  newUsersPerDay: number;
  
  // Performance
  responseTimeP50: number;
  responseTimeP95: number;
  responseTimeP99: number;
  
  // Reliability
  errorRate: number;
  uptime: number;
  
  // Resources
  databaseSize: number;
  databaseConnections: number;
  cacheHitRate: number;
  
  // Cost
  monthlyInfrastructureCost: number;
  costPerUser: number;
  costPerRequest: number;
}
```

---

## Performance Optimization Roadmap

### Database Optimization

**Stage 1:**
- Add indexes
- Optimize queries
- Connection pooling

**Stage 2:**
- Read replicas
- Query caching
- Batch operations

**Stage 3:**
- Database sharding
- Materialized views
- Partitioning

**Stage 4:**
- Multi-region replication
- Event sourcing
- CQRS

### Caching Strategy

**Stage 1:**
- Next.js ISR
- Browser caching

**Stage 2:**
- Redis caching
- CDN caching

**Stage 3:**
- Multi-layer caching
- Cache warming

**Stage 4:**
- Distributed caching
- Edge caching

### Code Optimization

**Stage 1:**
- Code splitting
- Lazy loading
- Image optimization

**Stage 2:**
- Bundle optimization
- Tree shaking
- Dead code elimination

**Stage 3:**
- Worker threads
- Streaming responses
- Parallel processing

**Stage 4:**
- WebAssembly for calculations
- Service workers
- HTTP/3

---

## Cost Optimization

### Cost Breakdown by Stage

**Stage 1 ($265/month):**
- 80% OpenAI
- 10% Database
- 10% Hosting

**Stage 2 ($670/month):**
- 75% OpenAI
- 15% Database + Cache
- 10% Hosting + Monitoring

**Stage 3 ($3,500/month):**
- 60% OpenAI
- 20% Database
- 15% Infrastructure
- 5% Monitoring

**Stage 4 ($25,000/month):**
- 40% Infrastructure
- 30% Third-party APIs
- 20% Database
- 10% Monitoring/Tools

### Optimization Strategies

**1. AI Cost Reduction**
```typescript
// Cache common responses
const cachedResponse = await getCachedAIResponse(question);
if (cachedResponse) return cachedResponse;

// Use cheaper models for simple tasks
const model = isComplexQuery(question) ? 'gpt-4' : 'gpt-3.5-turbo';

// Batch requests
const responses = await openai.chat.completions.create({
  messages: batchedMessages
});
```

**2. Database Cost Reduction**
```typescript
// Archive old data
await archiveOldTransactions(90); // Archive > 90 days

// Compress historical data
await compressHistoricalAllocations();

// Use cheaper storage for archives
await moveToS3Glacier(archivedData);
```

**3. Bandwidth Cost Reduction**
```typescript
// Aggressive caching
Cache-Control: public, max-age=31536000, immutable

// Image optimization
<Image
  src="/hero.png"
  quality={75} // Reduce quality slightly
  format="webp" // Use modern formats
/>

// Compression
app.use(compression({ level: 6 }));
```

---

## Disaster Recovery at Scale

### Backup Strategy

**Stage 1-2:**
- Daily automated backups
- 7-day retention
- Single region

**Stage 3-4:**
- Continuous backups
- 30-day retention
- Multi-region replication
- Point-in-time recovery

### High Availability

**Stage 1-2:**
- Vercel automatic failover
- Database automatic failover
- RTO: 5 minutes
- RPO: 1 hour

**Stage 3-4:**
- Multi-region active-active
- Automatic failover
- RTO: 30 seconds
- RPO: 0 (synchronous replication)

### Incident Response

**Escalation Levels:**

**Level 1 (Minor):**
- Single feature degraded
- < 5% users affected
- Response: 1 hour
- Resolution: 4 hours

**Level 2 (Major):**
- Core feature down
- 5-25% users affected
- Response: 15 minutes
- Resolution: 1 hour

**Level 3 (Critical):**
- Complete outage
- All users affected
- Response: Immediate
- Resolution: 30 minutes

---

## Conclusion

### Scaling Philosophy

**Principles:**
1. **Scale when needed** - Don't over-engineer early
2. **Measure everything** - Data-driven decisions
3. **Optimize incrementally** - Small, continuous improvements
4. **Keep it simple** - Complexity is the enemy of scale

### Decision Framework

**When to scale:**
```
IF (performance degraded OR cost inefficient OR reliability issues)
  AND (optimization exhausted)
  AND (business justifies investment)
THEN scale to next stage
```

**When NOT to scale:**
- Premature optimization
- Theoretical future needs
- Following trends
- Without measurement

### Success Metrics

**Stage 1:** Product-market fit achieved  
**Stage 2:** 10K active users, < 1% error rate  
**Stage 3:** 100K active users, < 500ms p95  
**Stage 4:** 1M+ users, 99.99% uptime  

---

**Document Version:** 1.0  
**Last Updated:** 2024-12-19  
**Next Review:** Quarterly  
**Owner:** Technical Architecture Team
