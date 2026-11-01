# Rules: API Development Standards (TPSPhoenix)

> Source: TPSPhoenix-API_Development_Standards
> Status: IN PROGRESS — authoritative for all LLD API design in this project

---

## 1. API Design Standards

### RESTful Principles — HTTP Methods

| Method | Use |
|--------|-----|
| `GET` | Retrieve data |
| `POST` | Create a resource |
| `PUT` | Update a resource (full replace) |
| `PATCH` | Partial update |
| `DELETE` | Remove a resource |

### URI Design

| Rule | Good | Bad |
|------|------|-----|
| Use nouns, not verbs | `/customers`, `/products/123` | `/getCustomers`, `/updateProduct` |
| Use **plural nouns** for collections | `/customers`, `/orders` | `/customer`, `/order` |
| Use hierarchical URIs for relationships | `/customers/123/orders` | `/getOrdersByCustomer?id=123` |
| Use **hyphens** for multi-word segments | `/product-categories` | `/productCategories`, `/product_categories` |
| No file extensions in URIs | `/customers/123` | `/customers/123.json` |
| URL versioning | `/api/v1/customers` | `/customers?version=1` |

### Statelessness
Every request must contain all information needed to process it. No stored client context between requests.

### Data Exchange Format
JSON only — all request and response bodies.

---

## 2. HTTP Status Codes

| Code | Meaning | When to Use |
|------|---------|------------|
| `200 OK` | Successful GET | Read operations |
| `201 Created` | Resource created | POST success — include `Location` header |
| `204 No Content` | Successful DELETE | No body returned |
| `400 Bad Request` | Invalid input | Malformed request |
| `401 Unauthorized` | Authentication required | Missing/invalid token |
| `403 Forbidden` | Insufficient permissions | Valid token, wrong role |
| `404 Not Found` | Resource not found | ID doesn't exist |
| `500 Internal Server Error` | Unhandled exception | Unexpected server error |

---

## 3. DTOs (Data Transfer Objects)

- **Never expose database entities directly** in API responses
- Always use dedicated DTO classes for request and response bodies
- DTO naming: `{Entity}Dto` for responses, `Create{Entity}Request` / `Update{Entity}Request` for inputs

```csharp
// Response DTO example
public class CustomerDto
{
    public int Id { get; set; }
    public string Name { get; set; }
    public string Email { get; set; }
}
```

---

## 4. API Documentation — Swagger / Swashbuckle

- Use latest stable `Swashbuckle.AspNetCore` NuGet package
- Register Swagger generator and UI middleware in `Program.cs`
- Use XML Comments (`///`) on all controllers, actions, and models
- Enable XML documentation generation in project settings
- **Restrict Swagger UI to Development environment only:**

```csharp
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
```

---

## 5. Security Standards

### Authentication & Authorisation
- Use **OAuth 2.0 / OpenID Connect** for auth
- Implement **JWT (JSON Web Tokens)** for stateless authentication:

```csharp
services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = "https://your-auth-server";
        options.Audience = "your-api";
    });
```

- Use `[Authorize]` attribute on all protected endpoints:

```csharp
[Authorize]
[HttpGet("orders")]
public async Task<IActionResult> GetOrders() { ... }
```

### Secure Configuration
- **Never** store secrets in `appsettings.json`
- **Never** use environment variables for highly sensitive data
- Use **Azure Key Vault** for all secret storage

### Input Validation
- Use **FluentValidation** (preferred) or Data Annotations
- Validate all inputs to prevent SQL injection and XSS

```csharp
public class ProductValidator : AbstractValidator<ProductDto>
{
    public ProductValidator()
    {
        RuleFor(x => x.Name).NotEmpty();
        RuleFor(x => x.Price).GreaterThan(0);
    }
}
```

- Enforce HTTPS for all communication
- Encrypt PII data before storing using **AES-256**

---

## 6. Performance Optimisation

### Asynchronous Programming
- Use `async`/`await` for all I/O-bound operations — no blocking calls:

```csharp
public async Task<IActionResult> GetCustomer(int id)
{
    var customer = await _customerService.GetCustomerByIdAsync(id);
    return customer != null ? Ok(customer) : NotFound();
}
```

### Pagination & Filtering
- **Never return large datasets** — always paginate
- Pagination query params: `page` and `pageSize`
- Example: `GET /api/customers?page=1&pageSize=50`
- Implement using LINQ `.Skip((pageNumber - 1) * pageSize).Take(pageSize)`

### Database Call Optimisation
- Use `AsNoTracking()` for all read-only queries:

```csharp
var customers = await _context.Customers.AsNoTracking().ToListAsync();
```

- Implement caching where appropriate

---

## 7. Error Handling

- Use **`Hellang.Middleware.ProblemDetails`** NuGet package for RFC 7807-compliant error responses
- Map custom exceptions to appropriate HTTP status codes:

```csharp
builder.Services.AddProblemDetails(options =>
{
    options.IncludeExceptionDetails = (_, __) => env.IsDevelopment();
    options.Map<NotImplementedException>(_ => new StatusCodeProblemDetails(501));
    options.Map<PhoenixValidationException>(ex => new ValidationProblemDetails(ex.Failures)
    {
        Status = StatusCodes.Status400BadRequest
    });
    options.Map<PhoenixException>(ex => MapPhoenixExceptionToProblemDetails(ex));
});
app.UseExceptionHandler(); // Required to activate IExceptionHandler
```

- Return structured error responses with clear error codes and messages
- Log all errors for debugging and monitoring
- **Error response format:** RFC 7807 `ProblemDetails` — not custom error schemas

---

## 8. Logging

- Use **Serilog** with structured logging
- Configure via `appsettings.json` Serilog block
- Enrich with: `FromLogContext`, `WithThreadId`, `WithProcessId`, `WithMachineName`
- Export logs to **Azure App Insights** (APM tool)

### Log Levels

| Level | Purpose |
|-------|---------|
| `Debug` | Debugging only — lowest level |
| `Information` | Normal operation records |
| `Warning` | Potential issues |
| `Error` | Errors preventing correct functioning |
| `Fatal` | Critical errors causing crash |

- **Never log sensitive information** — no passwords, API keys, or personal data
- Log format: `[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj} {Properties:j}{NewLine}{Exception}`

---

## 9. Date and Time Handling

| Scenario | C# Type | SQL Column Type | EF Core Mapping |
|----------|---------|----------------|-----------------|
| Full timestamp with timezone | `DateTimeOffset` | `datetimeoffset` | Default |
| Date-only (no time) | `DateOnly` | `date` | `.HasColumnType("date")` |
| Time-only (no date) | `TimeOnly` | `time` | `.HasColumnType("time")` |

### Use `DateOnly` when:
- Date of Birth: `DateOnly DateOfBirth`
- Contract Start/End Date: `DateOnly ContractStartDate`
- Holiday/Calendar Dates: `DateOnly HolidayDate`

### Use `TimeOnly` when:
- Business Opening/Closing Times: `TimeOnly OpeningTime`
- Scheduled daily tasks: `TimeOnly RunAtTime`

### EF Core Mapping:
```csharp
modelBuilder.Entity<StoreHours>(entity =>
{
    entity.Property(e => e.EffectiveDate).HasColumnType("date");
    entity.Property(e => e.OpeningTime).HasColumnType("time");
    entity.Property(e => e.ClosingTime).HasColumnType("time");
});
```

---

## LLD API Design Output Checklist

Before submitting API design in any LLD, verify:

- [ ] All URIs use plural nouns (`/orders`, `/customers`)
- [ ] No verbs in URIs (`/getOrders` is invalid)
- [ ] Multi-word segments use hyphens (`/product-categories`)
- [ ] URL versioning used: `/api/v1/...`
- [ ] HTTP methods used correctly (no POST for reads, no GET for mutations)
- [ ] All endpoints return correct status codes (201 + Location for POST, 204 for DELETE)
- [ ] Request bodies use Create/Update DTOs — never expose entities directly
- [ ] Response bodies use Dto classes
- [ ] All endpoints decorated with `[Authorize]` unless explicitly public
- [ ] All controller actions are `async Task<IActionResult>`
- [ ] All list endpoints paginated with `page` + `pageSize` query params
- [ ] Read-only queries use `.AsNoTracking()`
- [ ] Error responses use `ProblemDetails` (RFC 7807) via `Hellang.Middleware.ProblemDetails`
- [ ] `PhoenixValidationException` mapped to 400 `ValidationProblemDetails`
- [ ] `PhoenixException` mapped via `MapPhoenixExceptionToProblemDetails`
- [ ] Swagger restricted to Development environment
- [ ] No secrets in `appsettings.json` — Azure Key Vault referenced
- [ ] PII fields encrypted with AES-256 before storage
- [ ] Date-only fields use `DateOnly` + `.HasColumnType("date")`
- [ ] Time-only fields use `TimeOnly` + `.HasColumnType("time")`
