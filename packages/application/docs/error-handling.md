# Error Handling

**Package**: `@sage/application`  
**Version**: 1.0.0  
**Last Updated**: 2024

---

## Table of Contents

1. [Overview](#overview)
2. [Error Categories](#error-categories)
3. [Error Classes](#error-classes)
4. [Error Response Format](#error-response-format)
5. [Error Handling by Layer](#error-handling-by-layer)
6. [HTTP Status Code Mapping](#http-status-code-mapping)
7. [Logging Strategy](#logging-strategy)

---

## Overview

Consistent error handling ensures:

- ✅ Clear error messages for users
- ✅ Actionable feedback for developers
- ✅ Proper HTTP status codes
- ✅ Security (no sensitive data leakage)
- ✅ Observability (logging and monitoring)

**Principle**: **Fail Fast, Fail Clearly**

Errors should be caught early, categorized correctly, and communicated clearly.

---

## Error Categories

### 1. **Validation Errors**

**Cause**: Invalid input data

**Examples**:
- Required field missing
- Invalid email format
- Number out of range
- Date in past when future required

**HTTP Status**: `400 Bad Request`

**User Message**: Specific field-level errors

---

### 2. **Business Rule Violations**

**Cause**: Operation violates domain rules

**Examples**:
- Cannot delete completed goal
- Duplicate goal name
- Maximum active goals exceeded
- Debt payment exceeds balance

**HTTP Status**: `400 Bad Request` or `409 Conflict`

**User Message**: Explanation of violated rule

---

### 3. **Authorization Errors**

**Cause**: User lacks permission

**Examples**:
- User not authenticated
- User doesn't own resource
- Session expired

**HTTP Status**: `401 Unauthorized` or `403 Forbidden`

**User Message**: Generic message (security)

---

### 4. **Not Found Errors**

**Cause**: Resource doesn't exist

**Examples**:
- Goal not found
- User profile not found
- Conversation not found

**HTTP Status**: `404 Not Found`

**User Message**: "Resource not found"

---

### 5. **Database Errors**

**Cause**: Database operation failed

**Examples**:
- Connection timeout
- Unique constraint violation
- Transaction deadlock
- Foreign key violation

**HTTP Status**: `500 Internal Server Error` or `503 Service Unavailable`

**User Message**: Generic error (hide details)

---

### 6. **External Service Errors**

**Cause**: External API failed

**Examples**:
- OpenAI API timeout
- Clerk authentication failed
- Rate limit exceeded

**HTTP Status**: `502 Bad Gateway` or `503 Service Unavailable`

**User Message**: "Service temporarily unavailable"

---

### 7. **Unexpected Errors**

**Cause**: Unknown/unhandled errors

**Examples**:
- Null pointer exception
- Type error
- Out of memory

**HTTP Status**: `500 Internal Server Error`

**User Message**: "An unexpected error occurred"

---

## Error Classes

### Base Error Class

```typescript
// packages/application/src/errors/ApplicationError.ts
export abstract class ApplicationError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;
  readonly timestamp: Date;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date();
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      timestamp: this.timestamp,
    };
  }
}
```

---

### ValidationError

```typescript
// packages/application/src/errors/ValidationError.ts
export class ValidationError extends ApplicationError {
  readonly code = 'VALIDATION_ERROR';
  readonly statusCode = 400;
  readonly validationErrors?: Record<string, string>;

  constructor(message: string, validationErrors?: Record<string, string>) {
    super(message);
    this.validationErrors = validationErrors;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      validationErrors: this.validationErrors,
    };
  }
}
```

**Usage**:
```typescript
// Single field error
throw new ValidationError('Goal name is required');

// Multiple field errors
throw new ValidationError('Validation failed', {
  name: 'Goal name is required',
  targetAmount: 'Target amount must be positive',
  targetDate: 'Target date must be in future',
});
```

---

### BusinessRuleError

```typescript
// packages/application/src/errors/BusinessRuleError.ts
export class BusinessRuleError extends ApplicationError {
  readonly code = 'BUSINESS_RULE_VIOLATION';
  readonly statusCode = 400;
  readonly rule?: string;

  constructor(message: string, rule?: string) {
    super(message);
    this.rule = rule;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      rule: this.rule,
    };
  }
}
```

**Usage**:
```typescript
throw new BusinessRuleError(
  'Cannot delete a completed goal',
  'GOAL_DELETION_RULE'
);

throw new BusinessRuleError(
  'Maximum 10 active goals allowed',
  'MAX_ACTIVE_GOALS'
);
```

---

### AuthorizationError

```typescript
// packages/application/src/errors/AuthorizationError.ts
export class AuthorizationError extends ApplicationError {
  readonly code = 'AUTHORIZATION_ERROR';
  readonly statusCode = 403;

  constructor(message: string = 'Access denied') {
    super(message);
  }
}
```

**Usage**:
```typescript
throw new AuthorizationError('You do not own this goal');
throw new AuthorizationError(); // Default message
```

---

### NotFoundError

```typescript
// packages/application/src/errors/NotFoundError.ts
export class NotFoundError extends ApplicationError {
  readonly code = 'NOT_FOUND';
  readonly statusCode = 404;
  readonly resourceType?: string;
  readonly resourceId?: string;

  constructor(message: string, resourceType?: string, resourceId?: string) {
    super(message);
    this.resourceType = resourceType;
    this.resourceId = resourceId;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      resourceType: this.resourceType,
      resourceId: this.resourceId,
    };
  }
}
```

**Usage**:
```typescript
throw new NotFoundError('Goal not found', 'Goal', goalId);
throw new NotFoundError('Financial profile not found');
```

---

### DatabaseError

```typescript
// packages/application/src/errors/DatabaseError.ts
export class DatabaseError extends ApplicationError {
  readonly code = 'DATABASE_ERROR';
  readonly statusCode = 500;
  readonly originalError?: Error;

  constructor(message: string, originalError?: Error) {
    super(message);
    this.originalError = originalError;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      // Don't expose original error details to client
    };
  }
}
```

**Usage**:
```typescript
try {
  await prisma.goal.create({ data });
} catch (error) {
  throw new DatabaseError('Failed to create goal', error);
}
```

---

### ExternalServiceError

```typescript
// packages/application/src/errors/ExternalServiceError.ts
export class ExternalServiceError extends ApplicationError {
  readonly code = 'EXTERNAL_SERVICE_ERROR';
  readonly statusCode = 502;
  readonly serviceName?: string;

  constructor(message: string, serviceName?: string) {
    super(message);
    this.serviceName = serviceName;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      serviceName: this.serviceName,
    };
  }
}
```

**Usage**:
```typescript
try {
  await openai.chat.completions.create({ ... });
} catch (error) {
  throw new ExternalServiceError('AI service unavailable', 'OpenAI');
}
```

---

### ConflictError

```typescript
// packages/application/src/errors/ConflictError.ts
export class ConflictError extends ApplicationError {
  readonly code = 'CONFLICT';
  readonly statusCode = 409;

  constructor(message: string) {
    super(message);
  }
}
```

**Usage**:
```typescript
throw new ConflictError('A goal with this name already exists');
throw new ConflictError('User already has a financial profile');
```

---

## Error Response Format

### Standard Error Response

```typescript
interface ErrorResponse {
  readonly code: string;
  readonly message: string;
  readonly timestamp: Date;
  readonly details?: Record<string, unknown>;
}
```

### Examples

**Validation Error**:
```json
{
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "validationErrors": {
    "name": "Goal name is required",
    "targetAmount": "Target amount must be positive"
  }
}
```

**Business Rule Error**:
```json
{
  "code": "BUSINESS_RULE_VIOLATION",
  "message": "Maximum 10 active goals allowed",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "rule": "MAX_ACTIVE_GOALS"
}
```

**Authorization Error**:
```json
{
  "code": "AUTHORIZATION_ERROR",
  "message": "Access denied",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Not Found Error**:
```json
{
  "code": "NOT_FOUND",
  "message": "Goal not found",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "resourceType": "Goal",
  "resourceId": "goal_123"
}
```

**Database Error** (sanitized):
```json
{
  "code": "DATABASE_ERROR",
  "message": "An error occurred while processing your request",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## Error Handling by Layer

### Presentation Layer (React Components)

**Responsibility**: Display errors to user

```typescript
// apps/web/components/forms/CreateGoalForm.tsx
'use client';

export function CreateGoalForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setErrors({});
    setGlobalError(null);

    const result = await createGoalAction(formData);

    if (!result.success) {
      const error = result.error;

      // Validation errors (field-level)
      if (error.code === 'VALIDATION_ERROR' && error.validationErrors) {
        setErrors(error.validationErrors);
        return;
      }

      // Business rule errors (global)
      if (error.code === 'BUSINESS_RULE_VIOLATION') {
        setGlobalError(error.message);
        return;
      }

      // Authorization errors
      if (error.code === 'AUTHORIZATION_ERROR') {
        setGlobalError('You do not have permission to perform this action');
        return;
      }

      // Generic error
      setGlobalError('An error occurred. Please try again.');
    } else {
      // Success
      toast.success('Goal created successfully!');
      router.push('/dashboard');
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {globalError && <Alert variant="error">{globalError}</Alert>}
      
      <Input
        name="name"
        error={errors.name}
      />
      
      <Input
        name="targetAmount"
        type="number"
        error={errors.targetAmount}
      />
      
      {/* Other fields */}
    </form>
  );
}
```

---

### API Layer (Server Actions)

**Responsibility**: Catch errors, map to HTTP responses

```typescript
// apps/web/actions/goals.ts
'use server';

export async function createGoalAction(formData: FormData) {
  try {
    // 1. Authenticate
    const { userId } = auth();
    if (!userId) {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'You must be logged in',
          timestamp: new Date(),
        },
      };
    }

    // 2. Parse request
    const request: CreateGoalRequest = {
      userId,
      name: formData.get('name') as string,
      targetAmount: Number(formData.get('targetAmount')),
      targetDate: new Date(formData.get('targetDate') as string),
      priority: formData.get('priority') as 'HIGH' | 'MEDIUM' | 'LOW',
      category: formData.get('category') as string,
    };

    // 3. Call Application Layer
    const goalService = new GoalService(dependencies);
    const response = await goalService.createGoal(request);

    // 4. Success
    return { success: true, data: response };
  } catch (error) {
    // 5. Handle errors
    return { success: false, error: mapErrorToResponse(error) };
  }
}

function mapErrorToResponse(error: unknown): ErrorResponse {
  // Application errors
  if (error instanceof ApplicationError) {
    return error.toJSON();
  }

  // Prisma errors
  if (error.code === 'P2002') {
    return {
      code: 'CONFLICT',
      message: 'Resource already exists',
      timestamp: new Date(),
    };
  }

  if (error.code === 'P2025') {
    return {
      code: 'NOT_FOUND',
      message: 'Resource not found',
      timestamp: new Date(),
    };
  }

  // Unknown errors
  console.error('Unexpected error:', error);
  return {
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
    timestamp: new Date(),
  };
}
```

---

### Application Layer (Services)

**Responsibility**: Throw typed errors, handle repository errors

```typescript
// packages/application/src/services/goals/GoalService.ts
export class GoalService {
  async createGoal(request: CreateGoalRequest): Promise<CreateGoalResponse> {
    // 1. Input validation
    if (!request.name || request.name.trim().length === 0) {
      throw new ValidationError('Goal name is required');
    }

    if (request.targetAmount <= 0) {
      throw new ValidationError('Target amount must be positive');
    }

    // 2. Authorization validation
    const profile = await this.financialProfileRepository.findByUserId(
      request.userId
    );

    if (!profile) {
      throw new NotFoundError(
        'Financial profile not found. Please complete onboarding.',
        'FinancialProfile',
        request.userId
      );
    }

    // 3. Business validation
    const existingGoals = await this.goalRepository.findActiveByUserId(
      request.userId
    );

    const duplicate = existingGoals.find(
      (g) => g.name.toLowerCase() === request.name.toLowerCase()
    );

    if (duplicate) {
      throw new ConflictError('A goal with this name already exists');
    }

    if (existingGoals.length >= 10) {
      throw new BusinessRuleError(
        'Maximum 10 active goals allowed',
        'MAX_ACTIVE_GOALS'
      );
    }

    // 4. Execute operation
    try {
      return await this.transactionManager.execute(async (tx) => {
        const goal = await this.goalRepository.create(goalData, tx);
        const allocation = await this.allocationRepository.create(
          allocationData,
          tx
        );
        return { goal, allocation };
      });
    } catch (error) {
      // Wrap database errors
      if (error.code?.startsWith('P')) {
        throw new DatabaseError('Failed to create goal', error);
      }
      throw error;
    }
  }
}
```

---

### Repository Layer

**Responsibility**: Throw database-specific errors (caught by Application Layer)

```typescript
// packages/database/src/repositories/GoalRepository.ts
export class GoalRepository implements IGoalRepository {
  async create(data: CreateGoalInput, tx?: Transaction): Promise<Goal> {
    try {
      const client = tx || this.prisma;
      const goal = await client.goal.create({ data });
      return this.mapToDomain(goal);
    } catch (error) {
      // Let Prisma errors bubble up (Application Layer will handle)
      throw error;
    }
  }

  async findById(id: string): Promise<Goal | null> {
    try {
      const goal = await this.prisma.goal.findUnique({
        where: { id, deletedAt: null },
      });
      return goal ? this.mapToDomain(goal) : null;
    } catch (error) {
      throw error;
    }
  }
}
```

---

### Financial Engine

**Responsibility**: Return error results (not throw exceptions)

```typescript
// packages/financial-engine/src/goals/calculateGoalFeasibility.ts
export function calculateGoalFeasibility(
  input: GoalFeasibilityInput
): GoalFeasibilityResult {
  // Validate input
  if (input.targetAmount <= 0) {
    return {
      feasibility: 'INFEASIBLE',
      reason: 'Target amount must be positive',
      monthlySavingsRequired: 0,
      availableForSavings: 0,
    };
  }

  const monthsToGoal = differenceInMonths(input.targetDate, new Date());
  if (monthsToGoal <= 0) {
    return {
      feasibility: 'INFEASIBLE',
      reason: 'Target date must be in future',
      monthlySavingsRequired: 0,
      availableForSavings: 0,
    };
  }

  // Calculate
  const monthlySavingsRequired = input.targetAmount / monthsToGoal;
  const availableForSavings = input.monthlyIncome - input.expenses - input.debts;

  if (monthlySavingsRequired > availableForSavings) {
    return {
      feasibility: 'INFEASIBLE',
      reason: 'Required savings exceed available income',
      monthlySavingsRequired,
      availableForSavings,
    };
  }

  return {
    feasibility: 'FEASIBLE',
    monthlySavingsRequired,
    availableForSavings,
  };
}
```

Application Layer checks result:

```typescript
const feasibility = this.financialEngine.calculateGoalFeasibility(input);

if (feasibility.feasibility === 'INFEASIBLE') {
  throw new ValidationError(
    `Goal is not financially feasible: ${feasibility.reason}`
  );
}
```

---

## HTTP Status Code Mapping

| Error Type | HTTP Status | Code |
|-----------|-------------|------|
| ValidationError | 400 | VALIDATION_ERROR |
| BusinessRuleError | 400 | BUSINESS_RULE_VIOLATION |
| ConflictError | 409 | CONFLICT |
| AuthorizationError | 403 | AUTHORIZATION_ERROR |
| NotFoundError | 404 | NOT_FOUND |
| DatabaseError | 500 | DATABASE_ERROR |
| ExternalServiceError | 502 | EXTERNAL_SERVICE_ERROR |
| Unexpected | 500 | INTERNAL_ERROR |

### REST API Example

```typescript
// apps/web/app/api/goals/route.ts
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const goalService = new GoalService(dependencies);
    const result = await goalService.createGoal(body);

    return Response.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ApplicationError) {
      return Response.json(error.toJSON(), { status: error.statusCode });
    }

    console.error('Unexpected error:', error);
    return Response.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        timestamp: new Date(),
      },
      { status: 500 }
    );
  }
}
```

---

## Logging Strategy

### Log Levels

- **ERROR**: Unexpected errors, database failures, external service failures
- **WARN**: Business rule violations, authorization failures
- **INFO**: Successful operations, important events
- **DEBUG**: Detailed execution flow (development only)

### What to Log

**Always Log**:
- Error type and message
- User ID (if available)
- Request ID / Trace ID
- Timestamp
- Stack trace (for unexpected errors)

**Never Log**:
- Passwords
- API keys
- Sensitive financial data (raw amounts)
- Personal identifiable information (PII)

### Logging Implementation

```typescript
// packages/application/src/utils/logger.ts
export class Logger {
  static error(message: string, context?: Record<string, unknown>): void {
    console.error({
      level: 'ERROR',
      message,
      timestamp: new Date().toISOString(),
      ...context,
    });
  }

  static warn(message: string, context?: Record<string, unknown>): void {
    console.warn({
      level: 'WARN',
      message,
      timestamp: new Date().toISOString(),
      ...context,
    });
  }

  static info(message: string, context?: Record<string, unknown>): void {
    console.info({
      level: 'INFO',
      message,
      timestamp: new Date().toISOString(),
      ...context,
    });
  }

  static debug(message: string, context?: Record<string, unknown>): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug({
        level: 'DEBUG',
        message,
        timestamp: new Date().toISOString(),
        ...context,
      });
    }
  }
}
```

### Usage in Application Layer

```typescript
export class GoalService {
  async createGoal(request: CreateGoalRequest): Promise<CreateGoalResponse> {
    Logger.info('Creating goal', {
      userId: request.userId,
      goalName: request.name,
    });

    try {
      // Validation
      if (!request.name) {
        Logger.warn('Validation failed: Goal name is required', {
          userId: request.userId,
        });
        throw new ValidationError('Goal name is required');
      }

      // Execute
      const result = await this.transactionManager.execute(async (tx) => {
        // ...
      });

      Logger.info('Goal created successfully', {
        userId: request.userId,
        goalId: result.goal.id,
      });

      return result;
    } catch (error) {
      if (error instanceof ApplicationError) {
        Logger.warn('Application error', {
          userId: request.userId,
          errorCode: error.code,
          errorMessage: error.message,
        });
      } else {
        Logger.error('Unexpected error creating goal', {
          userId: request.userId,
          error: error.message,
          stack: error.stack,
        });
      }
      throw error;
    }
  }
}
```

### Structured Logging for Monitoring

```typescript
// Production: Use structured logging service (e.g., Winston, Pino)
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
});

export class Logger {
  static error(message: string, context?: Record<string, unknown>): void {
    logger.error({ ...context }, message);
  }

  static warn(message: string, context?: Record<string, unknown>): void {
    logger.warn({ ...context }, message);
  }

  static info(message: string, context?: Record<string, unknown>): void {
    logger.info({ ...context }, message);
  }
}
```

---

## Summary

### Error Classes (7 Total)

1. **ValidationError** - Invalid input
2. **BusinessRuleError** - Domain rule violation
3. **AuthorizationError** - Permission denied
4. **NotFoundError** - Resource not found
5. **ConflictError** - Resource conflict
6. **DatabaseError** - Database failure
7. **ExternalServiceError** - External API failure

### Error Handling Flow

```
Error Occurs
    ↓
Application Layer throws typed error
    ↓
API Layer catches error
    ↓
Map to ErrorResponse
    ↓
Set HTTP status code
    ↓
Return to client
    ↓
Presentation Layer displays to user
```

### Key Principles

1. **Fail fast** - Validate early, throw immediately
2. **Typed errors** - Use specific error classes
3. **Consistent format** - Standard ErrorResponse
4. **Security** - Don't expose sensitive details
5. **Logging** - Log all errors with context
6. **User-friendly** - Clear, actionable messages
7. **Developer-friendly** - Include error codes and details

### Best Practices

- ✅ Use specific error classes
- ✅ Include context in error messages
- ✅ Log errors with user ID and trace ID
- ✅ Map Prisma errors to application errors
- ✅ Return user-friendly messages
- ✅ Hide implementation details from users
- ✅ Use proper HTTP status codes
- ❌ Don't expose stack traces to users
- ❌ Don't log sensitive data
- ❌ Don't use generic error messages

---

**Next**: Perform final architecture review with GO/NO-GO recommendation.
