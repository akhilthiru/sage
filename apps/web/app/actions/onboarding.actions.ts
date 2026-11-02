'use server';

import { onboardingService, goalService } from '@/lib/services';
import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export interface OnboardingFormInput {
  monthlyIncome: number;
  currentSavings: number;
  emergencyFundTarget: number;
  riskTolerance: 'LOW' | 'MEDIUM' | 'HIGH';
  goal?: {
    name: string;
    targetAmount: number;
    category: 'EMERGENCY_FUND' | 'DEBT_PAYOFF' | 'HOUSING' | 'VEHICLE' | 'RETIREMENT' | 'VACATION' | 'EDUCATION' | 'WEDDING' | 'OTHER';
    targetMonths: number;
  };
}

export async function submitOnboarding(data: OnboardingFormInput) {
  try {
    const user = await getCurrentUser();

    // 1. Complete basic onboarding
    const result = await onboardingService.completeOnboarding({
      userId: user.id,
      monthlyIncome: data.monthlyIncome,
      riskTolerance: data.riskTolerance,
      currency: 'INR',
      hasDebts: false,
      hasGoals: !!(data.goal && data.goal.targetAmount > 0),
    });

    // 2. If goal was specified, create goal
    if (data.goal && data.goal.targetAmount > 0) {
      const now = new Date();
      const targetDate = new Date(
        now.getFullYear(),
        now.getMonth() + data.goal.targetMonths,
        1
      );

      await goalService.createGoal({
        userId: user.id,
        name: data.goal.name,
        category: data.goal.category,
        priority: 'HIGH',
        targetAmount: data.goal.targetAmount,
        currentAmount: 0,
        targetDate,
      });
    }

    revalidatePath('/dashboard');
    revalidatePath('/goals');

    return {
      success: true,
      data: result,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to complete onboarding';
    return {
      success: false,
      error: message,
    };
  }
}
