'use server';

import { simulationService } from '@/lib/services';
import { getCurrentUser } from '@/lib/auth';

export interface PurchaseSimInput {
  name: string;
  amount: number;
}

export async function runPurchaseSimulationAction(input: PurchaseSimInput) {
  try {
    const user = await getCurrentUser();
    const result = await simulationService.simulatePurchase({
      userId: user.id,
      purchaseName: input.name,
      purchaseAmount: input.amount,
    });

    return {
      success: true,
      data: result,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Simulation failed';
    return {
      success: false,
      error: message,
    };
  }
}

export interface LoanSimInput {
  loanAmount: number;
  interestRate: number;
  termMonths: number;
  purpose: string;
}

export async function runLoanSimulationAction(input: LoanSimInput) {
  try {
    const user = await getCurrentUser();
    const result = await simulationService.simulateLoan({
      userId: user.id,
      loanAmount: input.loanAmount,
      interestRate: input.interestRate,
      termMonths: input.termMonths,
      purpose: input.purpose,
    });

    return {
      success: true,
      data: result,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Loan simulation failed';
    return {
      success: false,
      error: message,
    };
  }
}
