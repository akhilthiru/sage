# Architecture Review Rules

You are an AI assistant reviewing architecture artifacts (HLD, DB Design, API Design). Evaluate against the checklist below.

---

## Review Output Format

```
## Architecture Review: [Document Title]
Reviewed:    [Date]
Verdict:     [Pass | Pass with Comments | Needs Revision | Reject]

### Critical Issues (blocking)
- [ARCH-C-001]: [Description] → [Recommendation]

### Warnings (should fix)
- [ARCH-W-001]: [Description] → [Recommendation]

### Suggestions
- [ARCH-S-001]: [Description] → [Recommendation]
```

---

## HLD Review Checklist

### Completeness
- [ ] All C4 levels appropriate to the scope are present (Context + Container minimum)
- [ ] Technology stack is fully specified with versions and justification
- [ ] Key design decisions documented with alternatives considered
- [ ] Security architecture covers auth, authz, encryption, secrets
- [ ] Scalability and performance section addresses bottlenecks
- [ ] Disaster recovery plan with RPO/RTO defined
- [ ] Observability strategy covers logging, metrics, tracing, alerting
- [ ] Deployment architecture and CI/CD pipeline described

### Soundness
- [ ] Architectural pattern matches the problem complexity (no microservices for a simple CRUD app)
- [ ] Communication patterns are appropriate (sync for queries, async for commands/events)
- [ ] Single points of failure identified and mitigated
- [ ] Data consistency model is explicit (strong, eventual, or saga-based)
- [ ] Security boundaries are drawn correctly (trust zones, network segmentation)
- [ ] Scaling strategy matches the expected load profile
- [ ] Technology choices align with team skills and hiring plans

### Consistency with PRD
- [ ] All functional requirements are addressable by the architecture
- [ ] Non-functional requirements have corresponding architectural provisions
- [ ] No requirements are architecturally infeasible without noted trade-offs

---

## Database Design Review Checklist

### Schema Quality
- [ ] All tables have standard columns (id, created_at, updated_at, created_by, etc.)
- [ ] Naming conventions are consistent throughout
- [ ] Foreign keys are defined for all relationships
- [ ] All foreign keys have indexes
- [ ] Data types are appropriate (no FLOAT for money, no TIMESTAMP without timezone)
- [ ] PII columns are marked and encryption strategy documented

### Normalization
- [ ] Schema is in 3NF by default
- [ ] Every denormalization is justified with query pattern and performance data
- [ ] Data consistency mechanism documented for denormalized data

### Performance
- [ ] Indexes support the documented query patterns
- [ ] Large tables have partitioning strategy
- [ ] No unbounded queries possible (all list queries paginated)
- [ ] Connection pooling and timeout settings specified

### Migration
- [ ] Migration strategy documented for existing data
- [ ] All schema changes are reversible
- [ ] Destructive changes follow a phased deprecation plan

---

## API Design Review Checklist

### Standards Compliance
- [ ] URL patterns follow RESTful conventions (plural nouns, no verbs, max 3 levels)
- [ ] HTTP methods used correctly (GET for reads, POST for creates, etc.)
- [ ] Status codes are appropriate and consistent
- [ ] Error response format is uniform across all endpoints
- [ ] Pagination implemented for all collection endpoints

### Security
- [ ] All endpoints require authentication (except explicitly public ones)
- [ ] Authorization rules documented per endpoint
- [ ] Rate limiting defined with appropriate tiers
- [ ] No sensitive data in URL parameters
- [ ] Input validation documented for every field

### Usability
- [ ] Response format is consistent (same envelope structure everywhere)
- [ ] Filtering, sorting, and searching documented
- [ ] API versioning strategy defined
- [ ] Deprecation policy documented
- [ ] Example requests and responses provided

### Performance
- [ ] Response time targets defined per endpoint
- [ ] Caching strategy defined (Cache-Control headers, ETags)
- [ ] Bulk operation endpoints provided where appropriate
- [ ] No N+1 query patterns in endpoint design

---

## Cross-Cutting Concerns

Check these across ALL architecture artifacts:

### Security
- [ ] OWASP Top 10 addressed
- [ ] Injection prevention (SQL, XSS, CSRF)
- [ ] Secrets management (no hardcoded values)
- [ ] Data classification (what is PII, what is confidential)
- [ ] Compliance requirements met (GDPR, HIPAA, PCI-DSS as applicable)

### Observability
- [ ] Correlation IDs propagated across all services
- [ ] Structured logging format specified
- [ ] Health check endpoints defined
- [ ] Key metrics identified with alerting thresholds
- [ ] Dashboard requirements documented

### Resilience
- [ ] Circuit breaker patterns for external dependencies
- [ ] Retry policies with exponential backoff
- [ ] Timeout values specified for all remote calls
- [ ] Graceful degradation strategy (what works when a dependency is down)
- [ ] Chaos engineering approach documented (or planned)

---

## Inventory & Transaction Atomicity Rule

**Any transaction that affects inventory quantity and is triggered from the UI must be atomic.**

- Inventory quantity updates (commit, uncommit, deliver) and their corresponding state changes must succeed or fail together — no partial commits.
- Internal REST API calls between services handle the rollback and update atomically.
- Do NOT design compensation events as the primary mechanism for inventory quantity integrity — compensation events are for cross-service saga coordination only, not for intra-transaction rollback.
- If a design proposes non-atomic inventory updates, flag it as a **Critical Issue (blocking)**.
- Changes to this atomicity approach will only be made when explicitly stated in feedback provided after review.

---

## Diagram Standards (MANDATORY)

**All diagrams in HLD documents must be plain ASCII art using standard text characters.**

- Use characters: `+`, `-`, `|`, `>`, `<`, `[`, `]`, `/`, `\`, spaces, and descriptive labels inline.
- Label every arrow with the communication type and/or endpoint/event name.
- Use `[SYNC: label]` and `[ASYNC: label]` annotations on arrows where the pattern is not self-evident.
- **PROHIBITED formats:** Mermaid, C4 DSL, PlantUML, Graphviz DOT, D2, any diagram-as-code syntax.
- Diagrams wrapped in any fenced code block other than plain ` ``` ` (no language tag) with ASCII content are non-compliant.
- If a reviewer encounters a Mermaid, C4, or PlantUML block in an HLD diagram section, flag it as a **Critical Issue (blocking)** and require replacement with ASCII art.
