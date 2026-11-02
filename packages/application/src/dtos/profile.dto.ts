import { z } from 'zod';
import { AllocationDTO } from './allocation.dto';

export interface FinancialProfileDTO {
  readonly userId: string;
  readonly profileId: string;
  readonly monthlyIncome: number;
  readonly currency: 'INR';
  readonly riskTolerance: 'LOW' | 'MEDIUM' | 'HIGH';
  readonly hasDebts: boolean;
  readonly hasGoals: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export const UpdateIncomeSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  monthlyIncome: z.number().positive('Monthly income must be positive'),
});

export type UpdateIncomeRequest = z.infer<typeof UpdateIncomeSchema>;

export interface UpdateIncomeResponse {
  readonly profile: FinancialProfileDTO;
  readonly allocation: AllocationDTO;
}

export const UpdateRiskToleranceSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  riskTolerance: z.enum(['LOW', 'MEDIUM', 'HIGH']),
});

export type UpdateRiskToleranceRequest = z.infer<typeof UpdateRiskToleranceSchema>;
