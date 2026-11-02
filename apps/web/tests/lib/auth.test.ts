import { describe, it, expect } from 'vitest';
import { getCurrentUser, DEMO_USER } from '@/lib/auth';

describe('Auth Helper', () => {
  it('returns DEMO_USER when clerk keys are not set', async () => {
    const user = await getCurrentUser();
    expect(user.id).toBe(DEMO_USER.id);
    expect(user.firstName).toBe('Akhil');
    expect(user.email).toBe('akhil@sage.app');
  });

  it('handles clerk env vars by returning DEMO_USER in fallback mode', async () => {
    const origSecret = process.env.CLERK_SECRET_KEY;
    const origPub = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    try {
      process.env.CLERK_SECRET_KEY = 'sk_test_123';
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_123';
      const user = await getCurrentUser();
      expect(user.id).toBe(DEMO_USER.id);
    } finally {
      process.env.CLERK_SECRET_KEY = origSecret;
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = origPub;
    }
  });
});
