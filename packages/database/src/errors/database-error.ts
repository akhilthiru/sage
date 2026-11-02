import { Prisma } from '@prisma/client';

export type DatabaseErrorCode =
  | 'NOT_FOUND'
  | 'UNIQUE_VIOLATION'
  | 'FOREIGN_KEY_VIOLATION'
  | 'CONNECTION_ERROR'
  | 'QUERY_ERROR'
  | 'VALIDATION_ERROR'
  | 'TRANSACTION_ERROR'
  | 'UNKNOWN_ERROR';

export interface DatabaseErrorDetails {
  target?: string[];
  field?: string;
  cause?: string;
  prismaCode?: string;
  [key: string]: unknown;
}

/**
 * Standardized database error representation.
 */
export class DatabaseError extends Error {
  public readonly code: DatabaseErrorCode;
  public readonly details?: DatabaseErrorDetails;
  public readonly originalError?: unknown;

  constructor(
    code: DatabaseErrorCode,
    message: string,
    details?: DatabaseErrorDetails,
    originalError?: unknown
  ) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.details = details;
    this.originalError = originalError;

    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

/**
 * Standardized Result type for all persistence operations.
 * Aligns with @sage/financial-engine's Result pattern.
 */
export type Result<T, E = DatabaseError> =
  | { success: true; data: T }
  | { success: false; error: E };

export function success<T>(data: T): Result<T, never> {
  return { success: true, data };
}

export function failure<E = DatabaseError>(error: E): Result<never, E> {
  return { success: false, error };
}

/**
 * Maps any unknown caught error or Prisma error into a strongly typed DatabaseError.
 */
export function mapPrismaError(
  error: unknown,
  fallbackMessage = 'Database operation failed'
): DatabaseError {
  if (error instanceof DatabaseError) {
    return error;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002': {
        const target = Array.isArray(error.meta?.target)
          ? (error.meta.target as string[])
          : typeof error.meta?.target === 'string'
            ? [error.meta.target]
            : undefined;
        const targetStr = target ? ` on field(s): ${target.join(', ')}` : '';
        return new DatabaseError(
          'UNIQUE_VIOLATION',
          `A record with this unique identifier already exists${targetStr}`,
          { target, prismaCode: error.code },
          error
        );
      }
      case 'P2025': {
        const cause = typeof error.meta?.cause === 'string' ? error.meta.cause : undefined;
        return new DatabaseError(
          'NOT_FOUND',
          cause ?? 'The requested record was not found',
          { cause, prismaCode: error.code },
          error
        );
      }
      case 'P2003': {
        const field = typeof error.meta?.field_name === 'string' ? error.meta.field_name : undefined;
        return new DatabaseError(
          'FOREIGN_KEY_VIOLATION',
          `Foreign key constraint failed${field ? ` on field: ${field}` : ''}`,
          { field, prismaCode: error.code },
          error
        );
      }
      case 'P2014': {
        return new DatabaseError(
          'FOREIGN_KEY_VIOLATION',
          'The change you are trying to make would violate the required relation between records',
          { prismaCode: error.code },
          error
        );
      }
      case 'P1000':
      case 'P1001':
      case 'P1002':
      case 'P1008':
      case 'P1017': {
        return new DatabaseError(
          'CONNECTION_ERROR',
          'Unable to reach database server. Please check connection and credentials.',
          { prismaCode: error.code },
          error
        );
      }
      default: {
        return new DatabaseError(
          'QUERY_ERROR',
          error.message || fallbackMessage,
          { prismaCode: error.code, meta: error.meta },
          error
        );
      }
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return new DatabaseError(
      'VALIDATION_ERROR',
      `Prisma validation failed: ${error.message}`,
      undefined,
      error
    );
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return new DatabaseError(
      'CONNECTION_ERROR',
      `Prisma initialization error: ${error.message}`,
      { prismaCode: error.errorCode },
      error
    );
  }

  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return new DatabaseError(
      'UNKNOWN_ERROR',
      'Underlying database engine experienced a fatal error',
      undefined,
      error
    );
  }

  if (error instanceof Error) {
    return new DatabaseError('UNKNOWN_ERROR', error.message, undefined, error);
  }

  return new DatabaseError('UNKNOWN_ERROR', fallbackMessage, undefined, error);
}

/**
 * Safely executes an asynchronous Prisma operation and maps any thrown error into a Result.
 */
export async function safePrismaCall<T>(
  operation: () => Promise<T>,
  fallbackMessage = 'Database operation failed'
): Promise<Result<T, DatabaseError>> {
  try {
    const data = await operation();
    return success(data);
  } catch (error) {
    return failure(mapPrismaError(error, fallbackMessage));
  }
}
