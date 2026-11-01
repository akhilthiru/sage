/**
 * Result type for consistent error handling across all public APIs
 * 
 * Replaces throw Error pattern with explicit success/failure states
 */

export type Result<T, E = FinancialEngineError> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Standardized error types for financial engine
 */
export type FinancialEngineErrorCode =
  | 'VALIDATION_ERROR'
  | 'CALCULATION_ERROR'
  | 'INSUFFICIENT_FUNDS'
  | 'INVALID_DATE'
  | 'PRECISION_ERROR';

export interface FinancialEngineError {
  code: FinancialEngineErrorCode;
  message: string;
  field?: string;
  details?: Record<string, unknown>;
}

/**
 * Helper functions for creating Results
 */
export function success<T>(data: T): Result<T> {
  return { success: true, data };
}

export function failure<E = FinancialEngineError>(error: E): Result<never, E> {
  return { success: false, error };
}

export function validationError(message: string, field?: string): FinancialEngineError {
  return {
    code: 'VALIDATION_ERROR',
    message,
    field
  };
}

export function calculationError(message: string, details?: Record<string, unknown>): FinancialEngineError {
  return {
    code: 'CALCULATION_ERROR',
    message,
    details
  };
}

export function insufficientFundsError(message: string, details?: Record<string, unknown>): FinancialEngineError {
  return {
    code: 'INSUFFICIENT_FUNDS',
    message,
    details
  };
}

export function invalidDateError(message: string, field?: string): FinancialEngineError {
  return {
    code: 'INVALID_DATE',
    message,
    field
  };
}
