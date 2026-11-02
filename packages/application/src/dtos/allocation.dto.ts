import { z } from 'zod';

export interface AllocationBreakdownDTO {
  readonly fixedExpenses: number;
  readonly variableExpenses: number;
  readonly goalContributions: number;
  readonly debtPayments: number;
  readonly discretionary: number;
  readonly emergencyFund: number;
}

export interface AllocationDTO {
  readonly id: string;
  readonly userId: string;
  readonly monthlyIncome: number;
  readonly needs: number;
  readonly wants: number;
  readonly savings: number;
  readonly breakdown: AllocationBreakdownDTO;
  readonly createdAt: Date;
}

export const GenerateAllocationSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

export type GenerateAllocationRequest = z.infer<typeof GenerateAllocationSchema>;

export interface GenerateAllocationResponse {
  readonly allocation: AllocationDTO;
  readonly recommendations: string[];
}
