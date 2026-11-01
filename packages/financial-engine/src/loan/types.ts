/**
 * Loan domain types
 */

export interface EMIResult {
  emi: number;
  totalPayable: number;
  totalInterest: number;
  principal: number;
  tenure: number;
  interestRate: number;
}

export interface AmortizationEntry {
  month: number;
  emi: number;
  principal: number;
  interest: number;
  balance: number;
}

export type Affordability = 'COMFORTABLE' | 'MANAGEABLE' | 'RISKY' | 'UNAFFORDABLE';

export interface AffordabilityAssessment {
  affordability: Affordability;
  debtToIncomeRatio: number;
  monthlySurplus: number;
  recommendation: string;
  maxAffordableEMI: number;
}

export interface ExistingDebt {
  monthlyPayment: number;
  status: 'ACTIVE' | 'PAID_OFF' | 'DEFAULTED';
}

export interface LoanSimulationInput {
  principal: number;
  annualInterestRate: number;
  tenureMonths: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  existingDebts: ExistingDebt[];
}

export interface LoanSimulationResult {
  emi: number;
  totalPayable: number;
  totalInterest: number;
  affordability: Affordability;
  debtToIncomeRatio: number;
  monthlySurplus: number;
  amortizationSchedule: AmortizationEntry[];
  recommendation: string;
  maxAffordableEMI: number;
  suggestedTenure?: number;
}

export interface PrepaymentImpact {
  originalEMI: number;
  newEMI: number;
  emiReduction: number;
  originalTotalInterest: number;
  newTotalInterest: number;
  interestSaved: number;
  newTenure: number;
}
