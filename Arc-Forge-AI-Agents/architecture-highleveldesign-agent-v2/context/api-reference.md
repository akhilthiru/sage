# API Design — Industry Reference Baseline

> This file contains industry-standard API design principles used as the baseline for `rules/api-standards.md`.
> Do not modify this file. To update TALON Rev-specific standards, run `/sync-rules`.

## RESTful Resource Design

### Resource Naming
- Use nouns, never verbs: `/orders` not `/getOrders`
- Plural for collections: `/orders`, `/customers`
- Singular for sub-resources: `/orders/{id}/status`
- Kebab-case for multi-word paths: `/repair-orders`, `/stock-items`
- Lowercase path segments only

### URL Hierarchy
- Keep URLs shallow — max 3 levels: `/v1/{resource}/{id}/{sub-resource}`
- Use query parameters for filtering, sorting, pagination — not path segments
- Resource identifiers in path, not query string

### HTTP Method Semantics
| Method | Idempotent | Safe | Use for |
|--------|-----------|------|---------|
| GET | Yes | Yes | Read resource or collection |
| POST | No | No | Create resource, or non-idempotent action |
| PUT | Yes | No | Full replacement of a resource |
| PATCH | No | No | Partial update |
| DELETE | Yes | No | Remove resource |
| HEAD | Yes | Yes | Check existence / headers only |
| OPTIONS | Yes | Yes | CORS preflight, capability discovery |

## Versioning Strategies

### URL Path Versioning (Recommended)
```
GET /v1/orders
GET /v2/orders
```
- Most visible, cache-friendly
- Preferred for public and internal APIs

### Header-Based Versioning
```
GET /orders
API-Version: 2.0
```
- Cleaner URLs but harder to test and less discoverable

### Content Negotiation
```
Accept: application/vnd.company.v2+json
```
- Most RESTful but highest implementation cost

### Versioning Rules
- Never break existing clients — additive changes are non-breaking
- Deprecate before removing — minimum 6-month deprecation window
- Communicate breaking changes in advance via changelog and headers
- Return `Deprecation` and `Sunset` headers on deprecated endpoints

## Request Design

### Content Types
- Request bodies: `application/json` for all APIs
- File uploads: `multipart/form-data`
- Always validate `Content-Type` header on POST/PUT/PATCH

### Field Naming
- **camelCase** for JSON fields (most common in REST APIs)
- **snake_case** alternative — choose one and be consistent
- No abbreviations in field names: `firstName` not `fName`

### Date and Time
- Always ISO 8601: `2026-05-06T10:00:00Z`
- Always UTC unless time zone is domain-significant
- Duration: ISO 8601 `PT30M` (30 minutes)

### Numeric Types
- Use `string` for decimal/currency to avoid floating-point precision loss
- Alternatively, use integer with explicit scale documented (e.g., "amount in cents")
- Never use `float` or `double` for financial values

## Response Design

### Envelope Patterns
```json
// Collection response
{
  "items": [...],
  "totalCount": 150,
  "page": 1,
  "pageSize": 20
}

// Single resource — return directly, no wrapper
{
  "id": "abc123",
  "name": "Widget"
}
```

### Null Handling
- Omit optional absent fields from responses (do not include `"field": null`)
- Include null explicitly when absence has semantic meaning

### Status Codes — Common Usage
| Code | Meaning | When to use |
|------|---------|-------------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | POST that created a resource |
| 202 | Accepted | Async operation started |
| 204 | No Content | DELETE, or PUT/PATCH with no body |
| 400 | Bad Request | Validation failure |
| 401 | Unauthorized | Missing or invalid auth credentials |
| 403 | Forbidden | Authenticated but not authorised |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | State conflict (optimistic concurrency, duplicate) |
| 410 | Gone | Resource permanently deleted |
| 422 | Unprocessable Entity | Semantically invalid (business rule violation) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |
| 502 | Bad Gateway | Upstream dependency failure |
| 503 | Service Unavailable | Overloaded or circuit open |

## Error Response Design (RFC 7807 Problem Details)

```json
{
  "type": "https://errors.example.com/validation-failed",
  "title": "Validation Failed",
  "status": 400,
  "detail": "One or more fields failed validation.",
  "instance": "/v1/orders/abc123",
  "errors": {
    "quantity": ["must be greater than 0"],
    "productId": ["required"]
  }
}
```

## Authentication & Authorisation

### Auth Patterns
| Pattern | Use case |
|---------|---------|
| Bearer JWT | User-facing APIs, service-to-service with identity |
| API Key | Machine-to-machine, public data |
| OAuth 2.0 Client Credentials | Service-to-service without user context |
| Mutual TLS | High-security service mesh |

### JWT Best Practices
- Short-lived access tokens (15 min–1 hour)
- Long-lived refresh tokens stored securely
- Validate `iss`, `aud`, `exp`, `iat` claims
- Include roles/scopes as claims — validate per endpoint

## Pagination

### Offset-Based
```
GET /orders?page=2&pageSize=25
```
- Simple, widely understood
- Performance degrades at high offsets

### Cursor-Based
```
GET /orders?after=eyJpZCI6MTIzfQ==&limit=25
```
- Consistent performance at scale
- Preferred for real-time or frequently changing data

## Idempotency

- Use `Idempotency-Key` header for POST operations that create resources
- Server stores and replays responses for duplicate requests within a time window
- Return same response for duplicate idempotent requests

## Rate Limiting

- Return `429 Too Many Requests` when limit exceeded
- Include `Retry-After` header (seconds until reset)
- Include `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers

## Resilience Patterns

### Timeout
- Set explicit timeouts on all outbound calls
- Fail fast — do not block indefinitely

### Retry
- Retry transient failures (network, 429, 5xx) with exponential backoff and jitter
- Do not retry non-idempotent operations without idempotency key

### Circuit Breaker
- Detect repeated failures and short-circuit to protect downstream
- Half-open state for recovery detection

### Bulkhead
- Isolate resource pools (thread pools, connection pools) per downstream dependency

## API Documentation

- OpenAPI/Swagger specification for all REST APIs
- Include: description, parameters, request/response schemas, error codes, auth requirements
- Keep spec in sync with implementation — use code-first generation where possible

## HATEOAS (Hypermedia)

- Optional for most APIs — adds navigability but increases complexity
- Include `_links` with `self`, `next`, `prev` for paginated collections if adopted
