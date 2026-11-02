import type { User, Prisma } from '@prisma/client';
import { BaseRepository } from './base.repository';
import type {
  IUserRepository,
  CreateUserData,
  UpdateUserData,
  UserFilter,
} from '../types/repository.types';
import type { PaginationParams, PaginatedResult } from '../types/pagination.types';
import type { Result } from '../errors/database-error';
import type { TransactionClient } from '../client';

export class UserRepository extends BaseRepository implements IUserRepository {
  async create(data: CreateUserData, tx?: TransactionClient): Promise<Result<User>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      return client.user.create({
        data: {
          clerkId: data.clerkId,
          email: data.email.toLowerCase().trim(),
          firstName: data.firstName ?? null,
          lastName: data.lastName ?? null,
          imageUrl: data.imageUrl ?? null,
        },
      });
    }, 'Failed to create user');
  }

  async findById(id: string, tx?: TransactionClient): Promise<Result<User | null>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      return client.user.findUnique({
        where: { id },
      });
    }, `Failed to find user by id: ${id}`);
  }

  async findByClerkId(clerkId: string, tx?: TransactionClient): Promise<Result<User | null>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      return client.user.findUnique({
        where: { clerkId },
      });
    }, `Failed to find user by clerkId: ${clerkId}`);
  }

  async findByEmail(email: string, tx?: TransactionClient): Promise<Result<User | null>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      return client.user.findUnique({
        where: { email: email.toLowerCase().trim() },
      });
    }, `Failed to find user by email: ${email}`);
  }

  async findMany(
    filter?: UserFilter,
    pagination?: PaginationParams,
    tx?: TransactionClient
  ): Promise<Result<PaginatedResult<User>>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      const { page, pageSize, skip, take } = this.getPaginationBounds(pagination);

      const where: Prisma.UserWhereInput = {};

      if (filter?.deleted === false) {
        where.deletedAt = null;
      } else if (filter?.deleted === true) {
        where.deletedAt = { not: null };
      }

      if (filter?.createdAfter) {
        where.createdAt = { ...where.createdAt as Prisma.DateTimeFilter, gte: filter.createdAfter };
      }
      if (filter?.createdBefore) {
        where.createdAt = { ...where.createdAt as Prisma.DateTimeFilter, lte: filter.createdBefore };
      }

      const [data, total] = await Promise.all([
        client.user.findMany({
          where,
          skip,
          take,
          orderBy: { [pagination?.orderBy ?? 'createdAt']: pagination?.orderDirection ?? 'desc' },
        }),
        client.user.count({ where }),
      ]);

      return {
        data,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
      };
    }, 'Failed to query users');
  }

  async update(id: string, data: UpdateUserData, tx?: TransactionClient): Promise<Result<User>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      return client.user.update({
        where: { id },
        data: {
          ...(data.firstName !== undefined ? { firstName: data.firstName } : {}),
          ...(data.lastName !== undefined ? { lastName: data.lastName } : {}),
          ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl } : {}),
        },
      });
    }, `Failed to update user: ${id}`);
  }

  async softDelete(id: string, tx?: TransactionClient): Promise<Result<User>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      return client.user.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    }, `Failed to soft delete user: ${id}`);
  }

  async restore(id: string, tx?: TransactionClient): Promise<Result<User>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      return client.user.update({
        where: { id },
        data: { deletedAt: null },
      });
    }, `Failed to restore user: ${id}`);
  }

  async isEmailTaken(email: string, tx?: TransactionClient): Promise<Result<boolean>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      const count = await client.user.count({
        where: { email: email.toLowerCase().trim() },
      });
      return count > 0;
    }, 'Failed to verify email uniqueness');
  }

  async isClerkIdTaken(clerkId: string, tx?: TransactionClient): Promise<Result<boolean>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      const count = await client.user.count({
        where: { clerkId },
      });
      return count > 0;
    }, 'Failed to verify clerkId uniqueness');
  }
}
