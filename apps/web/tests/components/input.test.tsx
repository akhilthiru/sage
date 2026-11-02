import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as React from 'react';
import { Input } from '@/components/ui/input';

describe('Input Component', () => {
  it('renders input with placeholder', () => {
    render(<Input placeholder="Enter your income" />);
    expect(screen.getByPlaceholderText('Enter your income')).toBeInTheDocument();
  });

  it('renders label when provided', () => {
    render(<Input label="Monthly Income" id="income-field" />);
    expect(screen.getByText('Monthly Income')).toBeInTheDocument();
  });

  it('renders error message when error prop is provided', () => {
    render(<Input error="This field is required" />);
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('renders prefix symbol when provided', () => {
    render(<Input prefixSymbol="₹" />);
    expect(screen.getByText('₹')).toBeInTheDocument();
  });
});
