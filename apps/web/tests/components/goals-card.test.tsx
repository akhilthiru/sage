import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as React from 'react';
import { GoalsCard } from '@/components/dashboard/goals-card';
import type { GoalSummaryDTO } from '@sage/application';

describe('GoalsCard Component', () => {
  const mockGoals: GoalSummaryDTO[] = [
    {
      id: 'g1',
      name: 'House Down Payment',
      targetAmount: 500000,
      currentAmount: 300000,
      progressPercentage: 60,
      targetDate: new Date('2027-01-01'),
      priority: 'HIGH',
      status: 'ACTIVE',
    },
    {
      id: 'g2',
      name: 'New Car',
      targetAmount: 300000,
      currentAmount: 300000,
      progressPercentage: 100,
      targetDate: new Date('2026-12-01'),
      priority: 'MEDIUM',
      status: 'COMPLETED',
    },
  ];

  const mockSummary = {
    totalGoals: 2,
    onTrack: 2,
    atRisk: 0,
    totalProgress: 80,
  };

  it('renders goals and summary counts', () => {
    render(<GoalsCard goals={mockGoals} summary={mockSummary} />);
    expect(screen.getByText('Active Goals (2)')).toBeInTheDocument();
    expect(screen.getByText('House Down Payment')).toBeInTheDocument();
    expect(screen.getByText('New Car')).toBeInTheDocument();
  });

  it('renders empty state when no goals exist', () => {
    render(<GoalsCard goals={[]} summary={{ totalGoals: 0, onTrack: 0, atRisk: 0, totalProgress: 0 }} />);
    expect(screen.getByText('No active goals found.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create first goal/i })).toBeInTheDocument();
  });
});
