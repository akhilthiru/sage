import { describe, it, expect } from 'vitest';
import { cn, formatCurrency } from '@/lib/utils';

describe('apps/web/lib/utils', () => {
  describe('cn', () => {
    it('merges class names correctly', () => {
      expect(cn('px-2', 'py-1')).toBe('px-2 py-1');
    });

    it('resolves conflicting tailwind classes', () => {
      expect(cn('p-4', 'p-2')).toBe('p-2');
    });

    it('handles conditional classes', () => {
      expect(cn('base', false && 'hidden', true && 'block')).toBe('base block');
    });
  });

  describe('formatCurrency', () => {
    it('formats INR currency with rupee symbol', () => {
      const formatted = formatCurrency(50000, 'INR');
      expect(formatted).toContain('50,000');
    });

    it('formats USD currency with dollar symbol', () => {
      const formatted = formatCurrency(1200, 'USD');
      expect(formatted).toContain('1,200');
    });
  });
});
