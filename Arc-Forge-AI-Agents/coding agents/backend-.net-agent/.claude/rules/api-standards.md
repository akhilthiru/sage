# Rules: API Development Standards (TPSPhoenix)

> Source: TPSPhoenix-API_Development_Standards
> Status: IN PROGRESS — authoritative for all API development in this project

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

> See DOTNET-RULES Part 1 §8 for the full status code mapping. Phoenix-specific requirement: POST endpoints that create a resource must return `201 Created` with a `Location` header pointing to the new resource.

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
- Use **OAuth 2.0 / OpenID Connect** for auth — see DOTNET-RULES Part 1 §7 for JWT Bearer implementation
- Use `[Authorize]` on all protected endpoints — see DOTNET-RULES Part 1 §7

### Secure Configuration
- **Never** store secrets in `appsettings.json` or environment variables
- Use **Azure Key Vault** for all secret storage

### Input Validation
- Use **FluentValidation** — see DOTNET-RULES Part 1 §5 for implementation
- Enforce HTTPS for all communication
- Encrypt PII data before storing using **AES-256** (see db-standards §5)

---

## 6. Performance Optimisation

### Asynchronous Programming
> See DOTNET-RULES Part 1 §9 for async/await rules.

### Pagination & Filtering
- **Never return large datasets** — always paginate
- Pagination query params: `page` and `pageSize`
- Example: `GET /api/customers?page=1&pageSize=50`
- Return `PagedResponse<T>` — see DOTNET-RULES Part 1 §12 for the standard wrapper type

### Database Call Optimisation
> Use `AsNoTracking()` for all read-only queries — see DOTNET-RULES Part 2 §9.

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

> See DOTNET-RULES Part 1 §13 for the full date/time type mapping including `DateOnly`, `TimeOnly`, `DateTimeOffset`, and `datetime2`. Phoenix-specific usage examples:

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

