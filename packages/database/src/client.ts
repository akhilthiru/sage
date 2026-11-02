import { PrismaClient, Prisma } from '@prisma/client';

// Global singleton declaration for development hot-reloading
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Global Prisma Client singleton.
 * Prevents connection pool exhaustion in Next.js development and serverless environments.
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Type alias for an interactive transaction client.
 * Repositories accept this to support atomic multi-repository workflows.
 */
export type TransactionClient = Prisma.TransactionClient;

/**
 * Helper to gracefully disconnect Prisma client on process termination.
 */
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
