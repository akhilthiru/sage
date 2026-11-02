import { describe, it, expect, vi } from 'vitest';
import { prisma, disconnectPrisma } from '../src/client';
import { PrismaClient } from '@prisma/client';

describe('Prisma Client Singleton', () => {
  it('should export a valid PrismaClient singleton instance', () => {
    expect(prisma).toBeDefined();
    expect(prisma).toBeInstanceOf(PrismaClient);
  });

  it('should gracefully handle disconnectPrisma', async () => {
    const disconnectSpy = vi.spyOn(prisma, '$disconnect').mockResolvedValueOnce(undefined);
    await expect(disconnectPrisma()).resolves.toBeUndefined();
    expect(disconnectSpy).toHaveBeenCalledTimes(1);
    disconnectSpy.mockRestore();
  });
});
