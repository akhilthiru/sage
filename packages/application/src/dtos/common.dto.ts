import { z } from 'zod';
import { ValidationError } from '../errors/application-error';

export const PaginationRequestSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export type PaginationRequest = z.infer<typeof PaginationRequestSchema>;

export interface PaginatedResponse<T> {
  readonly data: T[];
  readonly pagination: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly totalPages: number;
  };
}

export interface MoneyDTO {
  readonly amount: number;
  readonly currency: 'INR';
}

export const DateRangeSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
}).refine((data) => data.endDate >= data.startDate, {
  message: 'endDate must be greater than or equal to startDate',
  path: ['endDate'],
});

export type DateRangeDTO = z.infer<typeof DateRangeSchema>;

/**
 * Validates data against a Zod schema and throws a domain ValidationError on failure.
 */
export function validateWithZod<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join('.') || 'input';
      fieldErrors[path] = issue.message;
    }
    throw new ValidationError('Validation failed', fieldErrors);
  }
  return result.data;
}
