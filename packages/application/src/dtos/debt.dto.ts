import { z } from 'zod';
import { AllocationDTO } from './allocation.dto';

export type DebtStatus = 'ACTIVE' | 'PAID_OFF' | 'DEFAULTED';

export interface DebtDTO {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly principal: number;
  readonly currentBalance: number;
  readonly interestRate: number;
  readonly termMonths: number;
  readonly monthlyPayment: number;
  readonly minimumPayment: number;
  readonly startDate: Date;
  readonly payoffDate: Date;
  readonly status: DebtStatus;
  readonly totalInterestPaid: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface DebtSummaryDTO {
  readonly id: string;
  readonly name: string;
  readonly currentBalance: number;
  readonly monthlyPayment: number;
  readonly payoffDate: Date;
  readonly status: DebtStatus;
}

export const RecordDebtSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  name: z.string().trim().min(1, 'Debt name is required'),
  principal: z.number().positive('Principal must be positive'),
  interestRate: z.number().min(0, 'Interest rate cannot be negative').max(100, 'Interest rate cannot exceed 100%'),
  termMonths: z.number().int().positive('Term must be at least 1 month'),
  minimumPayment: z.number().positive().optional(),
  startDate: z.coerce.date().default(() => new Date()),
});

export type RecordDebtRequest = z.infer<typeof RecordDebtSchema>;

export interface RecordDebtResponse {
  readonly debt: DebtDTO;
  readonly allocation: AllocationDTO;
  readonly calculations: {
    readonly monthlyPayment: number;
    readonly totalInterest: number;
    readonly payoffDate: Date;
  };
}

export const RecordDebtPaymentSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  debtId: z.string().min(1, 'Debt ID is required'),
  amount: z.number().positive('Payment amount must be positive'),
  paymentDate: z.coerce.date().default(() => new Date()),
});

export type RecordDebtPaymentRequest = z.infer<typeof RecordDebtPaymentSchema>;

export interface RecordDebtPaymentResponse {
  readonly paymentId: string;
  readonly debtId: string;
  readonly amount: number;
  readonly newBalance: number;
  readonly remainingPayments: number;
  readonly isPaidOff: boolean;
  readonly allocation: AllocationDTO;
}

export const ListDebtsSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  status: z.enum(['ACTIVE', 'PAID_OFF', 'DEFAULTED']).optional(),
});

export type ListDebtsRequest = z.infer<typeof ListDebtsSchema>;

export interface ListDebtsResponse {
  readonly debts: DebtDTO[];
  readonly summary: {
    readonly totalDebts: number;
    readonly totalBalance: number;
    readonly totalMonthlyPayment: number;
    readonly debtToIncomeRatio: number;
  };
}
