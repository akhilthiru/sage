import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as React from 'react';
import { HealthCard } from '@/components/dashboard/health-card';
import type { FinancialHealthDTO } from '@sage/application';

describe('HealthCard Component', () => {
  const mockHealth: FinancialHealthDTO = {
    score: 82,
    status: 'EXCELLENT',
    grade: 'A',
    factors: {
      incomeStability: 0.9,
      debtToIncome: 0.12,
      savingsRate: 0.31,
      emergencyFund: 4.5,
    },
    recommendations: [
      'Your emergency fund covers 4.5 months of expenses.',
      'Consider directing excess free cash toward your house down payment goal.',
    ],
  };

  it('renders health score, status, and grade', () => {
    render(<HealthCard health={mockHealth} />);
    expect(screen.getByText('82')).toBeInTheDocument();
    expect(screen.getByText(/grade a • excellent/i)).toBeInTheDocument();
  });

  it('renders sub-metrics factors correctly', () => {
    render(<HealthCard health={mockHealth} />);
    expect(screen.getByText('31%')).toBeInTheDocument();
    expect(screen.getByText('12%')).toBeInTheDocument();
    expect(screen.getByText('4.5 mo')).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();
  });

  it('renders recommendations', () => {
    render(<HealthCard health={mockHealth} />);
    expect(
      screen.getByText('Your emergency fund covers 4.5 months of expenses.')
    ).toBeInTheDocument();
  });

  it('renders FAIR and POOR status badges correctly', () => {
    const fairHealth = { ...mockHealth, status: 'FAIR' as const, grade: 'C' };
    const { rerender } = render(<HealthCard health={fairHealth} />);
    expect(screen.getByText(/grade c • fair/i)).toBeInTheDocument();

    const poorHealth = { ...mockHealth, status: 'POOR' as const, grade: 'D' };
    rerender(<HealthCard health={poorHealth} />);
    expect(screen.getByText(/grade d • poor/i)).toBeInTheDocument();
  });
});
