import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import * as React from 'react';
import { Button } from '@/components/ui/button';

describe('Button Component', () => {
  it('renders children correctly', () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Submit</Button>);
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders disabled state when disabled prop is passed', () => {
    render(<Button disabled>Disabled Button</Button>);
    const button = screen.getByRole('button', { name: /disabled button/i });
    expect(button).toBeDisabled();
  });

  it('renders loading state and disables button when isLoading is true', () => {
    render(<Button isLoading>Saving...</Button>);
    const button = screen.getByRole('button', { name: /saving.../i });
    expect(button).toBeDisabled();
  });

  it('applies variant classes correctly', () => {
    const { container: c1 } = render(<Button variant="danger">Delete</Button>);
    expect(c1.firstChild).toHaveClass('bg-rose-600');

    const { container: c2 } = render(<Button variant="outline">Outline</Button>);
    expect(c2.firstChild).toHaveClass('border-slate-700');
  });
});
