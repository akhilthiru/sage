import { z } from 'zod';

export const CompleteOnboardingSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  monthlyIncome: z.number().positive('Monthly income must be positive'),
  currency: z.literal('INR').default('INR'),
  hasDebts: z.boolean().default(false),
  hasGoals: z.boolean().default(false),
  riskTolerance: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
});

export type CompleteOnboardingRequest = z.infer<typeof CompleteOnboardingSchema>;

export interface CompleteOnboardingResponse {
  readonly userId: string;
  readonly profileId: string;
  readonly allocationId: string;
  readonly monthlyIncome: number;
  readonly allocation: {
    readonly needs: number;
    readonly wants: number;
    readonly savings: number;
  };
}
