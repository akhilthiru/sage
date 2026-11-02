'use server';

import { goalService } from '@/lib/services';
import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export interface CreateGoalInput {
  name: string;
  category: string;
  targetAmount: number;
  currentAmount?: number;
  targetDate: string; // ISO string
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
}

export async function createGoalAction(input: CreateGoalInput) {
  try {
    const user = await getCurrentUser();
    const result = await goalService.createGoal({
      userId: user.id,
      name: input.name,
      category: input.category,
      targetAmount: input.targetAmount,
      currentAmount: input.currentAmount ?? 0,
      targetDate: new Date(input.targetDate),
      priority: input.priority ?? 'MEDIUM',
    });

    revalidatePath('/goals');
    revalidatePath('/dashboard');

    return {
      success: true,
      data: result,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create goal';
    return {
      success: false,
      error: message,
    };
  }
}

export async function updateGoalProgressAction(goalId: string, additionalAmount: number) {
  try {
    const user = await getCurrentUser();
    const goal = await goalService.getGoal(user.id, goalId);

    const newAmount = goal.currentAmount + additionalAmount;
    const result = await goalService.updateGoal({
      userId: user.id,
      goalId,
      currentAmount: newAmount,
      status: newAmount >= goal.targetAmount ? 'COMPLETED' : 'ACTIVE',
    });

    revalidatePath('/goals');
    revalidatePath('/dashboard');

    return {
      success: true,
      data: result,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update goal progress';
    return {
      success: false,
      error: message,
    };
  }
}

export async function deleteGoalAction(goalId: string) {
  try {
    const user = await getCurrentUser();
    const result = await goalService.deleteGoal({
      userId: user.id,
      goalId,
    });

    revalidatePath('/goals');
    revalidatePath('/dashboard');

    return {
      success: true,
      data: result,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete goal';
    return {
      success: false,
      error: message,
    };
  }
}
