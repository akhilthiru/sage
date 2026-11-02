/**
 * Application Error Hierarchy & Result Pattern
 * 
 * Provides typed, standardized errors across all application services,
 * mapping neatly to HTTP status codes and API responses.
 */

export abstract class ApplicationError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;
  readonly timestamp: Date;
  readonly details?: Record<string, unknown>;

  constructor(message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date();
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      timestamp: this.timestamp.toISOString(),
      ...(this.details ? { details: this.details } : {}),
    };
  }
}

export class ValidationError extends ApplicationError {
  readonly code = 'VALIDATION_ERROR';
  readonly statusCode = 400;
  readonly validationErrors?: Record<string, string>;

  constructor(message: string, validationErrors?: Record<string, string>) {
    super(message, validationErrors ? { validationErrors } : undefined);
    this.validationErrors = validationErrors;
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      ...(this.validationErrors ? { validationErrors: this.validationErrors } : {}),
    };
  }
}

export class BusinessRuleError extends ApplicationError {
  readonly code = 'BUSINESS_RULE_VIOLATION';
  readonly statusCode = 400;
  readonly rule?: string;

  constructor(message: string, rule?: string) {
    super(message, rule ? { rule } : undefined);
    this.rule = rule;
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      ...(this.rule ? { rule: this.rule } : {}),
    };
  }
}

export class AuthorizationError extends ApplicationError {
  readonly code = 'AUTHORIZATION_ERROR';
  readonly statusCode = 403;

  constructor(message: string = 'Access denied') {
    super(message);
  }
}

export class NotFoundError extends ApplicationError {
  readonly code = 'NOT_FOUND';
  readonly statusCode = 404;
  readonly resourceType?: string;
  readonly resourceId?: string;

  constructor(message: string, resourceType?: string, resourceId?: string) {
    super(message, {
      ...(resourceType ? { resourceType } : {}),
      ...(resourceId ? { resourceId } : {}),
    });
    this.resourceType = resourceType;
    this.resourceId = resourceId;
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      ...(this.resourceType ? { resourceType: this.resourceType } : {}),
      ...(this.resourceId ? { resourceId: this.resourceId } : {}),
    };
  }
}

export class ConflictError extends ApplicationError {
  readonly code = 'CONFLICT';
  readonly statusCode = 409;

  constructor(message: string) {
    super(message);
  }
}

export class DatabaseOperationError extends ApplicationError {
  readonly code = 'DATABASE_ERROR';
  readonly statusCode = 500;
  readonly originalError?: unknown;

  constructor(message: string, originalError?: unknown) {
    super(message);
    this.originalError = originalError;
  }
}

export class ExternalServiceError extends ApplicationError {
  readonly code = 'EXTERNAL_SERVICE_ERROR';
  readonly statusCode = 502;
  readonly serviceName?: string;

  constructor(message: string, serviceName?: string) {
    super(message, serviceName ? { serviceName } : undefined);
    this.serviceName = serviceName;
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      ...(this.serviceName ? { serviceName: this.serviceName } : {}),
    };
  }
}

/**
 * Result type for functional error handling without exceptions.
 */
export type Result<T, E = ApplicationError> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: E };

export function success<T>(data: T): Result<T, never> {
  return { success: true, data };
}

export function failure<E = ApplicationError>(error: E): Result<never, E> {
  return { success: false, error };
}
