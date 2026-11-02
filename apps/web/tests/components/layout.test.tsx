import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import * as React from 'react';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}));

describe('Layout Components', () => {
  describe('Navbar', () => {
    it('renders logo and navigation links', () => {
      render(<Navbar />);
      expect(screen.getByText('Sage')).toBeInTheDocument();
      expect(screen.getByText('CFO')).toBeInTheDocument();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Goals')).toBeInTheDocument();
      expect(screen.getByText('Simulators')).toBeInTheDocument();
      expect(screen.getByText('Onboarding')).toBeInTheDocument();
    });

    it('toggles mobile menu on button click', () => {
      render(<Navbar />);
      const toggle = screen.getByLabelText(/toggle navigation menu/i);
      fireEvent.click(toggle);
      // Menu is now open
      fireEvent.click(toggle);
    });
  });

  describe('Footer', () => {
    it('renders principle and features', () => {
      render(<Footer />);
      expect(screen.getByText('Sage Personal CFO')).toBeInTheDocument();
      expect(screen.getByText(/ai explains, engine calculates/i)).toBeInTheDocument();
      expect(screen.getByText('Deterministic Math')).toBeInTheDocument();
    });
  });
});
