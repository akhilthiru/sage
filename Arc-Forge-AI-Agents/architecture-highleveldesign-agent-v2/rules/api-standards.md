# API Design Standards — TALON Rev Platform

> These rules are mandatory. Every API designed in an HLD must conform to these standards.
> The API Designer sub-agent must validate its output against every rule here before returning.

## REST Conventions

- Use nouns for resource paths, never verbs: `/stock-items` not `/getStockItems`
- Use kebab-case for path segments: `/repair-orders/{id}/stock-items`
- Resource identifiers always in path: `/v1/repair-orders/{repairOrderId}`
- Tenant and organisation scope filters are mandatory on all reads and writes
- Correlation/request IDs must be propagated across service boundaries via `X-Correlation-Id` header
- All internal service names use kebab-case: `talon-inventory-service`, `talon-repair-service`

## Versioning

- URL path versioning: `/v1/`, `/v2/` — never header-based versioning
- Breaking changes require a new version; additive changes do not
- Deprecation notice must be included in HLD when superseding an existing version

## HTTP Methods

| Operation | Method | Success Code | Notes |
|-----------|--------|-------------|-------|
| Fetch single resource | GET | 200 | |
| Fetch collection | GET | 200 | Use query params for filter/sort/page |
| Create | POST | 201 | Return created resource in body |
| Full replace | PUT | 200 | Idempotent |
| Partial update | PATCH | 200 | Only changed fields |
| Delete | DELETE | 204 | Soft delete at DB layer |
| Domain action (non-CRUD) | POST | 200 | Use action suffix: `/commit`, `/approve`, `/bulk-commit` |

## Request / Response

- All request/response bodies are JSON (`Content-Type: application/json`)
- Field names in camelCase
- Dates in ISO 8601 UTC: `2026-05-06T10:00:00Z`
- Amounts/quantities in `DECIMAL` — never float
- Null fields must be explicitly included when relevant; omit truly optional absent fields
- Response envelopes must not wrap single-resource GET responses — return the resource directly

## Authentication & Authorisation

- Entra External ID JWT authentication required on all endpoints
- All requests must include `Authorization: Bearer <token>` header
- Authorisation scopes enforced per endpoint operation — document required scope in the HLD
- Never expose internal database IDs in public-facing responses without an authorisation check
- Service-to-service calls use managed identity tokens — document in HLD where applicable

## Pagination

- All collection endpoints must support: `?page={n}&pageSize={n}` (default `pageSize=20`, max `pageSize=100`)
- Response envelope for collections:
  ```
  {
    "items": [...],
    "totalCount": 150,
    "page": 1,
    "pageSize": 20
  }
  ```

## Error Responses

Standard error envelope — all errors must use this shape:

```json
{
  "type": "https://errors.talon-rev.internal/{error-code}",
  "title": "Human-readable error title",
  "status": 400,
  "detail": "Specific explanation of what went wrong",
  "correlationId": "uuid",
  "errors": {
    "fieldName": ["validation message"]
  }
}
```

| Status | Use for |
|--------|---------|
| 400 | Validation failure — missing or invalid fields |
| 401 | Unauthenticated — missing or invalid JWT |
| 403 | Unauthorised scope — valid token but insufficient permissions |
| 404 | Resource not found |
| 409 | Optimistic concurrency conflict — client must refresh and retry |
| 422 | Business rule violation |
| 502 | Downstream dependency failure |
| 503 | Circuit breaker open / dependency unavailable |

## Idempotency

- All POST endpoints for quantity-affecting or state-changing operations must support an `Idempotency-Key` header
- Idempotency window: 24 hours minimum
- Bulk endpoints must process per-item and return per-item outcomes — partial success is valid

## Headers

| Header | Direction | Purpose |
|--------|-----------|---------|
| `X-Correlation-Id` | In + Out | Propagate across all service calls and events |
| `Authorization` | In | Bearer JWT from Entra External ID |
| `Idempotency-Key` | In | UUID for idempotent POST operations |
| `X-Tenant-Id` | In | Explicit tenant override where multi-tenant routing applies |

## Resilience (Refit + Polly)

- Outbound API timeout: 5 seconds per call
- Retry: exponential backoff — 3 retries for transient HTTP 5xx and network faults
- Circuit breaker: open after 5 consecutive failures, half-open after 30 seconds, return 503 when open
- All outbound clients registered in DI with named `HttpClient` and Polly policies

## .NET Implementation Notes

- Use `[ApiController]` with `[Route("v1/[controller]")]` — no attribute routing on individual actions unless needed
- Return `IActionResult` or typed `ActionResult<T>`
- Use `ProblemDetails` for error responses — configure `InvalidModelStateResponseFactory` for 400s
- Validate request models with `FluentValidation` — never null-check inside controller actions
- Use `MediatR` for command/query dispatch — controllers must not contain business logic
