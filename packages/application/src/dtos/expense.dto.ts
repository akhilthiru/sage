import { z } from 'zod';
import { AllocationDTO } from './allocation.dto';

export type ExpenseFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface ExpenseDTO {
  readonly id: string;
  readonly userId: string;
  readonly amount: number;
  readonly category: string;
  readonly description: string | null;
  readonly date: Date;
  readonly isRecurring: boolean;
  readonly frequency: ExpenseFrequency | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface ExpenseSummaryDTO {
  readonly id: string;
  readonly amount: number;
  readonly category: string;
  readonly date: Date;
  readonly isRecurring: boolean;
}

export const RecordExpenseSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  amount: z.number().positive('Expense amount must be positive'),
  category: z.string().trim().min(1, 'Category is required'),
  description: z.string().trim().max(500).optional().nullable(),
  date: z.coerce.date().default(() => new Date()),
  isRecurring: z.boolean().default(false),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']).optional().nullable(),
});

export type RecordExpenseRequest = z.infer<typeof RecordExpenseSchema>;

export interface RecordExpenseResponse {
  readonly expense: ExpenseDTO;
  readonly allocation: AllocationDTO;
}

export const UpdateExpenseSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  expenseId: z.string().min(1, 'Expense ID is required'),
  amount: z.number().positive('Expense amount must be positive').optional(),
  category: z.string().trim().min(1).optional(),
  description: z.string().trim().max(500).optional().nullable(),
  date: z.coerce.date().optional(),
  isRecurring: z.boolean().optional(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']).optional().nullable(),
});

export type UpdateExpenseRequest = z.infer<typeof UpdateExpenseSchema>;

export interface UpdateExpenseResponse {
  readonly expense: ExpenseDTO;
  readonly allocation: AllocationDTO;
}

export const DeleteExpenseSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  expenseId: z.string().min(1, 'Expense ID is required'),
});

export type DeleteExpenseRequest = z.infer<typeof DeleteExpenseSchema>;

export interface DeleteExpenseResponse {
  readonly expenseId: string;
  readonly deletedAt: Date;
  readonly allocation: AllocationDTO;
}

export const ListExpensesSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  category: z.string().optional(),
  isRecurring: z.boolean().optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export type ListExpensesRequest = z.infer<typeof ListExpensesSchema>;

export interface ListExpensesResponse {
  readonly expenses: ExpenseDTO[];
  readonly summary: {
    readonly totalExpenses: number;
    readonly totalAmount: number;
    readonly byCategory: Record<string, number>;
  };
  readonly pagination?: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly totalPages: number;
  };
}
