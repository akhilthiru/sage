import { z } from 'zod';
import { AllocationDTO } from './allocation.dto';

export type GoalPriority = 'HIGH' | 'MEDIUM' | 'LOW';
export type GoalStatus = 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
export type GoalFeasibility = 'FEASIBLE' | 'STRETCH' | 'INFEASIBLE';

export interface GoalDTO {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly description: string | null;
  readonly targetAmount: number;
  readonly currentAmount: number;
  readonly targetDate: Date;
  readonly priority: GoalPriority;
  readonly category: string;
  readonly status: GoalStatus;
  readonly monthlySavingsRequired: number;
  readonly progressPercentage: number;
  readonly feasibility: GoalFeasibility;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface GoalSummaryDTO {
  readonly id: string;
  readonly name: string;
  readonly targetAmount: number;
  readonly currentAmount: number;
  readonly progressPercentage: number;
  readonly targetDate: Date;
  readonly priority: GoalPriority;
  readonly status: GoalStatus;
}

export const CreateGoalSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  name: z.string().trim().min(1, 'Goal name is required').max(100, 'Goal name must be 100 characters or less'),
  description: z.string().trim().max(500).optional().nullable(),
  targetAmount: z.number().positive('Target amount must be positive'),
  currentAmount: z.number().min(0, 'Current amount cannot be negative').default(0),
  targetDate: z.coerce.date().refine((d) => d.getTime() > Date.now(), {
    message: 'Target date must be in the future',
  }),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
  category: z.string().trim().min(1).default('GENERAL'),
});

export type CreateGoalRequest = z.infer<typeof CreateGoalSchema>;

export interface CreateGoalResponse {
  readonly goal: GoalDTO;
  readonly allocation: AllocationDTO;
}

export const UpdateGoalSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  goalId: z.string().min(1, 'Goal ID is required'),
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(500).optional().nullable(),
  targetAmount: z.number().positive().optional(),
  currentAmount: z.number().min(0).optional(),
  targetDate: z.coerce.date().optional(),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
  category: z.string().trim().min(1).optional(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'ABANDONED']).optional(),
});

export type UpdateGoalRequest = z.infer<typeof UpdateGoalSchema>;

export interface UpdateGoalResponse {
  readonly goal: GoalDTO;
  readonly allocation: AllocationDTO;
}

export const DeleteGoalSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  goalId: z.string().min(1, 'Goal ID is required'),
});

export type DeleteGoalRequest = z.infer<typeof DeleteGoalSchema>;

export interface DeleteGoalResponse {
  readonly goalId: string;
  readonly deletedAt: Date;
  readonly allocation: AllocationDTO;
}

export const ListGoalsSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  status: z.enum(['ACTIVE', 'COMPLETED', 'ABANDONED']).optional(),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
});

export type ListGoalsRequest = z.infer<typeof ListGoalsSchema>;

export interface ListGoalsResponse {
  readonly goals: GoalDTO[];
  readonly summary: {
    readonly totalGoals: number;
    readonly activeGoals: number;
    readonly completedGoals: number;
    readonly totalTargetAmount: number;
    readonly totalCurrentAmount: number;
  };
}
