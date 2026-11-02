import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as React from 'react';
import { Badge } from '@/components/ui/badge';

describe('Badge Component', () => {
  it('renders text correctly', () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('applies variant classes correctly', () => {
    const { container: c1 } = render(<Badge variant="success">Completed</Badge>);
    expect(c1.firstChild).toHaveClass('text-emerald-400');

    const { container: c2 } = render(<Badge variant="warning">At Risk</Badge>);
    expect(c2.firstChild).toHaveClass('text-amber-300');

    const { container: c3 } = render(<Badge variant="error">Infeasible</Badge>);
    expect(c3.firstChild).toHaveClass('text-rose-400');
  });
});
