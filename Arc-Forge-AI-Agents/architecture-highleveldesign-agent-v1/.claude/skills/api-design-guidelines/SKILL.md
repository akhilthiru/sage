---
name: api-design-guidelines
description: "api design guidelines and standards"
---

## API Specification Document Structure

### 1. Overview
- API style: REST / GraphQL / gRPC (justify the choice)
- Base URL pattern: `https://api.[domain].com/v{version}/`
- Authentication method: OAuth 2.0 / API Key / JWT (reference HLD security section)
- Rate limiting: Requests per minute per consumer tier
- API documentation tool: OpenAPI 3.1 / AsyncAPI / gRPC proto files

### 2. Resource Design (REST)

#### URL Conventions

| Pattern | Use | Example |
|---------|-----|---------|
| `/{resource}` | Collection | `/users` |
| `/{resource}/{id}` | Single item | `/users/123` |
| `/{resource}/{id}/{sub-resource}` | Related collection | `/users/123/orders` |
| `/{resource}/{id}/{sub-resource}/{id}` | Specific related item | `/users/123/orders/456` |

#### Rules
- Use **plural nouns** for resources: `/users` not `/user`
- Use **kebab-case** for multi-word resources: `/order-items` not `/orderItems`
- **Never use verbs** in URLs: `/users/123/activate` → Use `PATCH /users/123` with `{"status": "active"}`
- Maximum URL depth: **3 levels**
- Query parameters for filtering: `GET /orders?status=pending&created_after=2025-01-01`
- Query parameters use **camelCase**: `?pageSize=20&sortBy=createdAt`

### 3. HTTP Methods

| Method | Use | Idempotent | Request Body | Response |
|--------|-----|------------|-------------|----------|
| GET | Read resource(s) | Yes | None | 200 with data |
| POST | Create resource | No | Required | 201 with created resource + Location header |
| PUT | Full replace | Yes | Required | 200 with updated resource |
| PATCH | Partial update | Yes | Required (partial) | 200 with updated resource |
| DELETE | Remove resource | Yes | None | 204 (no content) or 200 with confirmation |

### 4. Request/Response Format

#### Request Headers (required)
```
Content-Type: application/json
Accept: application/json
Authorization: Bearer {token}
X-Request-Id: {uuid}
X-Correlation-Id: {uuid}
Accept-Language: en-US
```

#### Response Envelope — Success
```json
{
  "data": { ... },
  "meta": {
    "requestId": "uuid",
    "timestamp": "2025-01-15T10:30:00Z"
  }
}
```

#### Response Envelope — Collection with Pagination
```json
{
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 143,
    "totalPages": 8,
    "hasNext": true,
    "hasPrevious": false
  },
  "meta": {
    "requestId": "uuid",
    "timestamp": "2025-01-15T10:30:00Z"
  }
}
```

#### Response Envelope — Error
```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "One or more fields failed validation.",
    "details": [
      {
        "field": "email",
        "message": "Must be a valid email address.",
        "code": "INVALID_FORMAT"
      }
    ],
    "traceId": "uuid"
  }
}
```

### 5. Status Codes

| Code | Meaning | When to Use |
|------|---------|-------------|
| 200 | OK | Successful GET, PUT, PATCH, or DELETE that returns data |
| 201 | Created | Successful POST that creates a resource |
| 204 | No Content | Successful DELETE with no response body |
| 400 | Bad Request | Invalid request format, missing required fields, validation failure |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | Valid auth but insufficient permissions |
| 404 | Not Found | Resource does not exist |
| 409 | Conflict | Resource state conflict (duplicate, version mismatch) |
| 422 | Unprocessable Entity | Syntactically valid but semantically invalid request |
| 429 | Too Many Requests | Rate limit exceeded — include Retry-After header |
| 500 | Internal Server Error | Unexpected server failure |
| 502 | Bad Gateway | Upstream service failure |
| 503 | Service Unavailable | Temporary overload or maintenance — include Retry-After |

### 6. Pagination

- Default page size: 20
- Maximum page size: 100
- Use **cursor-based pagination** for large or frequently changing datasets
- Use **offset-based pagination** only for small, stable datasets
- Always return `totalItems` and `totalPages` for offset-based
- Always return `nextCursor` for cursor-based

### 7. Filtering, Sorting, and Searching

```
# Filtering
GET /orders?status=pending&customerId=123

# Sorting (prefix with - for descending)
GET /orders?sort=createdAt
GET /orders?sort=-createdAt
GET /orders?sort=-priority,createdAt

# Searching
GET /users?search=john

# Date ranges
GET /orders?createdAfter=2025-01-01T00:00:00Z&createdBefore=2025-02-01T00:00:00Z
```

### 8. Versioning

- Use **URL path versioning**: `/v1/users`, `/v2/users`
- Major version only — minor and patch changes are backward-compatible
- Support at most **2 concurrent major versions**
- Deprecation: Announce 6 months before sunset, include `Sunset` and `Deprecation` headers

### 9. Authentication and Authorization

- Use **OAuth 2.0** with JWT tokens for user-facing APIs
- Use **API keys** for service-to-service communication only
- Token lifetime: Access token 15 minutes, refresh token 7 days
- Include required scopes for each endpoint

| Endpoint | Method | Required Role | Required Scope |
|----------|--------|--------------|----------------|
| /users | GET | admin, manager | users:read |
| /users | POST | admin | users:write |
| /users/{id} | GET | self, admin | users:read |

### 10. Rate Limiting

| Consumer Tier | Rate Limit | Burst Limit |
|--------------|-----------|-------------|
| Free | 60 req/min | 10 req/sec |
| Standard | 600 req/min | 30 req/sec |
| Enterprise | 6000 req/min | 100 req/sec |

Include these headers in every response:
```
X-RateLimit-Limit: 600
X-RateLimit-Remaining: 587
X-RateLimit-Reset: 1705312200
```

### 11. Endpoint Specification Template

```
#### [METHOD] /v1/[resource]

**Purpose:** [One-line description]
**Authorization:** [Required role/scope]
**Rate Limit:** [Standard | Custom]

**Request:**
- Path params: [if any]
- Query params: [if any]
- Body: [JSON schema]

**Responses:**
- 200: [Schema + example]
- 400: [When this occurs]
- 401: [When this occurs]
- 404: [When this occurs]

**Business Rules:**
- [Rule 1]
- [Rule 2]

**Example:**
[curl or HTTP request example]
```

### 12. API Documentation Requirements

- Generate an **OpenAPI 3.1 specification** file alongside the design document
- Every endpoint must have: summary, description, request schema, response schemas
  for all status codes, and at least one example
- Every schema property must have: type, description, example value,
  and constraints (min/max/pattern)
- Group endpoints by resource using tags