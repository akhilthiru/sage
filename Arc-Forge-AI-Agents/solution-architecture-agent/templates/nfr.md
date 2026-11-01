# [PRODUCT NAME] — Non-Functional Requirements

| Field | Value |
|---|---|
| **Document Status** | In Progress |
| **Document Owner** | [Owner] |
| **Reviewer(s)** | [Reviewer] |
| **Approver(s)** | [Approver] |

---

## Overview

This document defines the quality attributes of the platform, establishing measurable targets that must be met for the system to be considered production-ready. These requirements serve as acceptance criteria for performance testing, security review, and go-live validation.

---

## NFR Summary

| Category | Requirement | Target / Standard | Validation Method | Notes / TBD |
|---|---|---|---|---|
| Performance | API response time | ≤ 2s for p95 | Load testing (k6 / JMeter) | Excludes external API latency |
| Performance | Dashboard render time | ≤ 3s for standard datasets | Browser performance test | |
| Scalability | Horizontal scaling | Auto-scale via HPA | Load test to 2× peak | |
| Availability | Production uptime | ≥ 99.9% | Monitoring / SLA report | Excludes maintenance window |
| Reliability | Idempotency | All write operations idempotent | Integration tests | Critical for external integrations |
| Security | Authentication | OIDC / OAuth2 with short-lived tokens | Security review | Access token ≤ 15 min |
| Accessibility | WCAG compliance | WCAG 2.1 AA | Automated + manual audit | |
| Observability | Centralised logging | Structured JSON logs | Log pipeline validation | |
| Rate Limiting | API abuse prevention | [N] req/min per user / IP | Load testing | |
| Backup & DR | RPO | ≤ [N] hours | DR drill | |
| Backup & DR | RTO | ≤ [N] hours | DR drill | |

---

## Performance

| Requirement | Target | Notes / To Confirm |
|---|---|---|
| API response time (p95) | ≤ 2s | Response times may depend on external systems |
| API response time (p50) | ≤ 500ms | For internal service calls |
| Dashboard render time | ≤ 3s for standard datasets | Heavier datasets may require pagination |
| File upload processing | ≤ 30s for files ≤ 10MB | Asynchronous with progress indicator |
| External data ingestion | **[TBD]** | End-to-end pipeline latency |

---

## Scalability

| Requirement | Target | Notes |
|---|---|---|
| Horizontal scaling | Auto-scale via HPA on CPU ≥ 70% | Stateless services only |
| Min / Max pods | **[TBD]** (production) | Confirm with load testing |
| Max concurrent users | **[TBD]** concurrent users | Confirm with business |
| Data volume | **[TBD]** records at scale | Confirm with product team |
| DB connection pooling | PgBouncer / connection pool configured | Required to avoid connection exhaustion under load |

---

## Availability & Reliability

| Requirement | Target | Notes |
|---|---|---|
| Production uptime SLA | ≥ 99.9% | Excludes planned maintenance window |
| Maintenance window | **[TBD]** | To be agreed with stakeholders |
| MTTR | ≤ [N] hours | Mean time to recovery for Sev1 incidents |
| MTBF | ≥ [N] hours between Sev1 incidents | Steady-state target post go-live; review monthly |
| Health checks | Kubernetes liveness + readiness probes | All services |
| Circuit breaker | Applied to all external API calls | Prevents cascade failures |

---

## Idempotency & Data Integrity

| Requirement | Target | Notes |
|---|---|---|
| Write operation idempotency | All create/update/delete operations idempotent | External integrations must check state before acting |
| Failure handling for async jobs | Dead-letter queue + alerting | Async failures must alert operations team |
| Retry strategy | Exponential backoff (3 retries) for transient failures | External API calls only |

---

## Security NFRs

| Requirement | Standard | Notes |
|---|---|---|
| Authentication | OIDC / OAuth2 | |
| Access token expiry | ≤ 15 minutes | Configurable but never > 1 hour |
| Refresh token expiry | 7–30 days | Rotation on use |
| Encryption in transit | TLS 1.2+ | No TLS 1.0/1.1 |
| Encryption at rest | AES-256 | Cloud-managed keys |
| SAST coverage | Critical/High issues block pipeline | Every PR |
| SCA scanning | Critical vulnerabilities block pipeline | Every PR |
| Vulnerability patching | Critical: ≤ 48h; High: ≤ 7 days | From disclosure to patch |
| Audit log retention | ≥ 7 years | Regulatory requirement |

---

## Observability

| Requirement | Standard | Notes |
|---|---|---|
| Structured logging | JSON format | All services |
| Log retention | **[TBD]** hot / **[TBD]** cold | |
| Alerting — High 5xx rate | Error rate > [N]% for 5 min | [On-call alerting platform] / Email |
| Alerting — CPU sustained | CPU > 80% for 5 min | Cloud monitoring alarm |
| Alerting — Pod CrashLoop | Any CrashLoopBackOff | Immediate alert |
| Alerting — External API failure | Consecutive failures > [N] | For all critical external integrations |

---

## Rate Limiting

| Scope | Limit | Burst | On Exceed |
|---|---|---|---|
| Per authenticated user | [100] req/min | [200] | 429 Too Many Requests |
| Per IP (unauthenticated) | [20] req/min | [40] | 429 |
| File upload | [5–10] uploads/hour per tenant | — | 429 |
| AI / LLM generation | [N] req/hour per tenant | — | 429 — cost control; configurable per tenant |
| External API ingestion | [N] calls/hour per source | — | Queued — scheduled, not user-triggered |

---

## Backup & Disaster Recovery

| Data Type | Backup Frequency | Retention | RPO | RTO |
|---|---|---|---|---|
| Primary database | Continuous PITR + daily snapshot | 30 days | **[TBD]** | **[TBD]** |
| Time-series DB | Daily snapshot | 30 days | **[TBD]** | **[TBD]** |
| File storage | Versioning enabled | 90 days | N/A | Immediate |
| Restore testing | Monthly DR drill | — | — | — |

---

## Accessibility

| Requirement | Standard | Notes |
|---|---|---|
| WCAG compliance | WCAG 2.1 Level AA | Validated via Axe + manual review |
| Keyboard navigation | Full keyboard operability | All interactive elements |
| Colour contrast | ≥ 4.5:1 (AA) | All text on backgrounds |
| Screen reader support | ARIA labels on all interactive elements | |

---

## Compatibility

| Requirement | Target | Notes |
|---|---|---|
| Browser support | Chrome (latest 2), Firefox (latest 2), Safari (latest 2), Edge (latest 2) | |
| Responsive design | Desktop + tablet (1024px+) | Mobile scope to be confirmed |
| Minimum resolution | 1280 × 800 | |

---

## Compliance

| Regulation | Target | Implementation Deadline |
|---|---|---|
| [GDPR] | Full compliance | Before go-live |
| [SOC2 Type II] | Roadmap item | **[TBD]** |
| [ISO 27001] | **[TBD]** | **[TBD]** |
