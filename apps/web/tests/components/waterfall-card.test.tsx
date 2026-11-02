import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as React from 'react';
import { WaterfallCard } from '@/components/dashboard/waterfall-card';
import type { AllocationDTO } from '@sage/application';

describe('WaterfallCard Component', () => {
  const mockAllocation: AllocationDTO = {
    id: 'alloc_001',
    userId: 'user_001',
    monthlyIncome: 100000,
    needs: 50000,
    wants: 10000,
    savings: 40000,
    breakdown: {
      fixedExpenses: 35000,
      variableExpenses: 15000,
      debtPayments: 10000,
      emergencyFund: 10000,
      goalContributions: 20000,
      discretionary: 10000,
    },
    createdAt: new Date(),
  };

  it('renders total income and breakdown values', () => {
    render(<WaterfallCard allocation={mockAllocation} />);
    expect(screen.getByText('Monthly Waterfall Allocation')).toBeInTheDocument();
    expect(screen.getByText('Essential Needs')).toBeInTheDocument();
    expect(screen.getByText('Debt Payments')).toBeInTheDocument();
    expect(screen.getByText('Emergency Fund')).toBeInTheDocument();
    expect(screen.getByText('Goal Savings')).toBeInTheDocument();
    expect(screen.getByText('Free Cash')).toBeInTheDocument();
  });

  it('renders correct percentage tags', () => {
    render(<WaterfallCard allocation={mockAllocation} />);
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('20%')).toBeInTheDocument();
  });
});
