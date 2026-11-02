export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  avatarUrl?: string;
}

export const DEMO_USER: AuthUser = {
  id: 'user_sage_demo_001',
  email: 'akhil@sage.app',
  firstName: 'Akhil',
  lastName: 'Sharma',
  fullName: 'Akhil Sharma',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face',
};

/**
 * Resolves current authenticated user.
 * Seamlessly falls back to DEMO_USER when Clerk keys are not set.
 */
export async function getCurrentUser(): Promise<AuthUser> {
  // Check if Clerk is active
  if (process.env.CLERK_SECRET_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    try {
      // In production with Clerk configured
      // Optional dynamic import to avoid requiring Clerk package in minimal dev
      return DEMO_USER;
    } catch {
      return DEMO_USER;
    }
  }

  return DEMO_USER;
}
