import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as React from 'react';
import { ExpensesDebtsCard } from '@/components/dashboard/expenses-debts-card';
import type { ExpenseSummaryDTO, DebtSummaryDTO } from '@sage/application';

describe('ExpensesDebtsCard Component', () => {
  const mockExpenses = {
    recent: [
      {
        id: 'e1',
        amount: 25000,
        category: 'HOUSING',
        date: new Date(),
        isRecurring: true,
      },
    ] as ExpenseSummaryDTO[],
    monthlyTotal: 25000,
    byCategory: { HOUSING: 25000 },
  };

  const mockDebts = {
    active: [
      {
        id: 'd1',
        name: 'Car Loan',
        currentBalance: 200000,
        monthlyPayment: 8500,
        payoffDate: new Date('2028-01-01'),
        status: 'ACTIVE' as const,
      },
    ] as DebtSummaryDTO[],
    totalBalance: 200000,
    totalMonthlyPayment: 8500,
  };

  it('renders recurring expenses and debts summaries', () => {
    render(<ExpensesDebtsCard expenses={mockExpenses} debts={mockDebts} />);
    expect(screen.getByText('Recurring Expenses')).toBeInTheDocument();
    expect(screen.getByText('housing')).toBeInTheDocument();
    expect(screen.getByText('Active Debts & EMIs')).toBeInTheDocument();
    expect(screen.getByText('Car Loan')).toBeInTheDocument();
  });

  it('renders empty debts state when no active debts exist', () => {
    render(
      <ExpensesDebtsCard
        expenses={mockExpenses}
        debts={{ active: [], totalBalance: 0, totalMonthlyPayment: 0 }}
      />
    );
    expect(screen.getByText(/no active debt obligations/i)).toBeInTheDocument();
  });
});
