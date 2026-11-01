# TALON Rev — Design Principles

> These principles guide all architectural and design decisions on the TALON Rev platform.
> Sub-agents must apply these principles when evaluating design options and producing HLD sections.
> The HLD Reviewer sub-agent must use these as the Definition of Done for design review.

---

## 1. Design for the Domain First

- Start every design from the business domain and its invariants — not the database schema or API contract
- Use Domain-Driven Design (DDD) tactical patterns: Aggregates, Entities, Value Objects, Domain Services, Domain Events
- Aggregates define the consistency boundary — transactions must not span aggregates
- Domain logic lives in the domain layer — never in controllers, handlers, or infrastructure

## 2. Explicit Bounded Contexts

- Every feature belongs to exactly one bounded context (service domain)
- Bounded context ownership determines who owns the data, the API, and the events
- Context map must be explicit — document every upstream/downstream dependency and integration pattern
- Anti-Corruption Layer (ACL) when integrating with external systems or legacy data formats

## 3. API-First, Contract-First

- Define the API contract before writing implementation code
- All internal service APIs follow the same standards as external APIs — no "internal shortcuts"
- API contracts are immutable within a version — breaking changes require a new version
- OpenAPI specification is the source of truth for every API surface

## 4. Events Are Contracts

- Published events are public contracts — treat them with the same rigour as API contracts
- Never change the shape of a published event without a versioning strategy
- Events describe facts that happened in the past — they are immutable once emitted
- Event schema is owned by the publishing service

## 5. Failure Is Expected — Design for It

- Every external call can fail — always define the failure path before the happy path
- Circuit breakers on all outbound calls — fail fast, never queue indefinitely
- Dead-letter queues on all event subscriptions — never silently drop messages
- Compensation events for every multi-step flow that can partially succeed
- Design for idempotency — at-least-once delivery means consumers must handle duplicates

## 6. Tenant Isolation Is Non-Negotiable

- Every data access must be scoped to a tenant — no exceptions, no escalations
- Tenant isolation enforced at the application layer (EF Core global query filters) AND checked in code review
- Any query that can return cross-tenant data is a security defect — treat as P0
- Tenant context propagated through the full request chain: JWT → command/query → repository → event

## 7. Observe Everything

- Every service must emit structured logs, distributed traces, and metrics from day one
- No feature goes to production without DataDog dashboards and at least one alert
- Business events (state changes, key operations) must be logged explicitly — not just HTTP access logs
- Correlation ID propagated across all service calls and events — no orphaned trace segments

## 8. Security by Default

- Authentication and authorisation are not optional — every API endpoint requires them
- Principle of least privilege — request only the minimum scopes and permissions needed
- Secrets in Key Vault, never in code, config files, or environment variable literals
- PII must be identified, documented, and handled per data classification policy
- Encryption at rest and in transit for all personal and sensitive data

## 9. Simplicity Over Cleverness

- Prefer simple, well-understood patterns over clever optimisations
- Avoid premature abstraction — three similar implementations are better than a wrong abstraction
- Every architectural decision should be explainable in plain English to a new team member
- If a design requires significant documentation to understand, reconsider the design

## 10. Independent Deployability

- Every service must be deployable without coordinating with other services
- Shared libraries (NuGet packages) must be backward-compatible — never force simultaneous upgrades
- Feature flags for rolling out new behaviour — allows deployment before activation
- Database migrations must be backward compatible during deployment windows (expand/contract)

## 11. Own Your Data, Respect Others'

- Each service is the single source of truth for its domain data
- Never read another service's database directly — use APIs or projected read models
- Data duplication across services is acceptable when it reduces coupling — document the sync strategy
- Eventual consistency is the norm across domain boundaries — design consumers to handle it

## 12. Definition of Done — HLD Review Checklist

An HLD is complete and ready for development when all of the following are true:

### Functional
- [ ] All confirmed functional requirements have a corresponding design element
- [ ] Requirement gaps and clarifications are documented with owners
- [ ] Out-of-scope items are explicitly listed

### Domain & Boundaries
- [ ] Owning service/domain is identified and justified
- [ ] All cross-domain interactions are documented with integration patterns
- [ ] Aggregate boundaries are respected — no cross-aggregate transactions

### Data Design
- [ ] All tables include mandatory audit columns, soft delete, tenant isolation, ROWVERSION
- [ ] FK constraints and index strategy documented
- [ ] Migration strategy documented for any backfill or NOT NULL additions

### API Design
- [ ] All endpoints follow TALON Rev API standards (versioning, error contracts, auth)
- [ ] Idempotency addressed for all state-changing POST operations
- [ ] Pagination on all collection endpoints

### Events
- [ ] All events use the mandatory TALON Rev envelope (causationId, actor, source, partitionKey)
- [ ] Topic names in `<domain-entity>-<past-tense-action>` kebab-case format
- [ ] Session strategy documented for ordered topics
- [ ] DLQ strategy documented for every consumer

### Non-Functional
- [ ] Scalability targets documented (expected load, scaling strategy)
- [ ] Performance targets (p95/p99) specified for critical paths
- [ ] Fault tolerance: circuit breakers, retries, and fallbacks for all dependencies
- [ ] Security: auth, authz, encryption, PII handling all addressed

### Observability
- [ ] Logs, metrics, traces, and alerts specified
- [ ] Correlation ID propagation documented

### Review
- [ ] No unresolved design decisions
- [ ] All open items have owners and priority
- [ ] Future scope placeholders documented (not implemented)
