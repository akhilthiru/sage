import { describe, it, expect } from 'vitest';
import type { User } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { UserRepository } from '../../src/repositories/user.repository';
import { prismaMock, txMock } from '../mocks/prisma.mock';

describe('UserRepository Unit Tests', () => {
  const repository = new UserRepository(prismaMock as unknown as never);

  const mockUser: User = {
    id: 'user_123',
    clerkId: 'clerk_123',
    email: 'user@sage.app',
    firstName: 'Jane',
    lastName: 'Doe',
    imageUrl: 'https://img.sage.app/avatar.png',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    deletedAt: null,
  };

  describe('create', () => {
    it('should create user with lowercase email and default nulls', async () => {
      prismaMock.user.create.mockResolvedValueOnce(mockUser);

      const result = await repository.create({
        clerkId: 'clerk_123',
        email: '  User@Sage.APP  ',
        firstName: 'Jane',
        lastName: 'Doe',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockUser);
      }
      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: {
          clerkId: 'clerk_123',
          email: 'user@sage.app',
          firstName: 'Jane',
          lastName: 'Doe',
          imageUrl: null,
        },
      });
    });

    it('should use transaction client tx when provided', async () => {
      txMock.user.create.mockResolvedValueOnce(mockUser);

      const result = await repository.create(
        {
          clerkId: 'clerk_123',
          email: 'user@sage.app',
        },
        txMock as unknown as never
      );

      expect(result.success).toBe(true);
      expect(txMock.user.create).toHaveBeenCalledTimes(1);
      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });

    it('should return failure with DatabaseError when unique constraint fails', async () => {
      prismaMock.user.create.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '5.22.0',
          meta: { target: ['email'] },
        })
      );

      const result = await repository.create({
        clerkId: 'clerk_123',
        email: 'duplicate@sage.app',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('UNIQUE_VIOLATION');
      }
    });
  });

  describe('findById, findByClerkId & findByEmail', () => {
    it('should find user by id', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce(mockUser);

      const result = await repository.findById('user_123');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockUser);
      }
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user_123' } });
    });

    it('should find user by clerkId', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce(mockUser);

      const result = await repository.findByClerkId('clerk_123');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockUser);
      }
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { clerkId: 'clerk_123' } });
    });

    it('should find user by email with trimming and lowercase', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce(mockUser);

      const result = await repository.findByEmail('  USER@sage.APP ');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockUser);
      }
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { email: 'user@sage.app' } });
    });

    it('should return null when user is not found', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce(null);

      const result = await repository.findById('non_existent');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });
  });

  describe('findMany', () => {
    it('should return paginated user results with default pagination and filters', async () => {
      prismaMock.user.findMany.mockResolvedValueOnce([mockUser]);
      prismaMock.user.count.mockResolvedValueOnce(1);

      const result = await repository.findMany({ deleted: false });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.data).toEqual([mockUser]);
        expect(result.data.total).toBe(1);
        expect(result.data.page).toBe(1);
        expect(result.data.pageSize).toBe(20);
        expect(result.data.totalPages).toBe(1);
      }
      expect(prismaMock.user.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by deleted: true and date range', async () => {
      prismaMock.user.findMany.mockResolvedValueOnce([mockUser]);
      prismaMock.user.count.mockResolvedValueOnce(25);

      const after = new Date('2026-01-01');
      const before = new Date('2026-02-01');

      const result = await repository.findMany(
        { deleted: true, createdAfter: after, createdBefore: before },
        { page: 2, pageSize: 10, orderBy: 'email', orderDirection: 'asc' }
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.total).toBe(25);
        expect(result.data.totalPages).toBe(3);
        expect(result.data.page).toBe(2);
      }
      expect(prismaMock.user.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: { not: null },
          createdAt: { gte: after, lte: before },
        },
        skip: 10,
        take: 10,
        orderBy: { email: 'asc' },
      });
    });
  });

  describe('update, softDelete & restore', () => {
    it('should update all user fields', async () => {
      prismaMock.user.update.mockResolvedValueOnce(mockUser);

      const result = await repository.update('user_123', {
        firstName: 'Updated',
        lastName: 'Name',
        imageUrl: 'https://new-image.png',
      });

      expect(result.success).toBe(true);
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user_123' },
        data: {
          firstName: 'Updated',
          lastName: 'Name',
          imageUrl: 'https://new-image.png',
        },
      });
    });

    it('should handle update with empty object', async () => {
      prismaMock.user.update.mockResolvedValueOnce(mockUser);
      const result = await repository.update('user_123', {});
      expect(result.success).toBe(true);
    });

    it('should soft delete user by setting deletedAt timestamp', async () => {
      const deletedUser = { ...mockUser, deletedAt: new Date() };
      prismaMock.user.update.mockResolvedValueOnce(deletedUser);

      const result = await repository.softDelete('user_123');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.deletedAt).toBeDefined();
      }
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user_123' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should restore user by resetting deletedAt to null', async () => {
      prismaMock.user.update.mockResolvedValueOnce(mockUser);

      const result = await repository.restore('user_123');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.deletedAt).toBeNull();
      }
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user_123' },
        data: { deletedAt: null },
      });
    });
  });

  describe('isEmailTaken & isClerkIdTaken', () => {
    it('should return true if email exists', async () => {
      prismaMock.user.count.mockResolvedValueOnce(1);
      const result = await repository.isEmailTaken('user@sage.app');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(true);
      }
    });

    it('should return false if clerkId does not exist', async () => {
      prismaMock.user.count.mockResolvedValueOnce(0);
      const result = await repository.isClerkIdTaken('clerk_999');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(false);
      }
    });
  });
});
