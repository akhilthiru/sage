import { PrismaClient } from '@prisma/client';
import { prisma, type TransactionClient } from '../client';
import { safePrismaCall, type Result, type DatabaseError } from '../errors/database-error';
import type { PaginationParams } from '../types/pagination.types';

/**
 * Base abstract repository class providing transaction delegation, safe Prisma execution, and pagination helpers.
 */
export abstract class BaseRepository {
  protected readonly db: PrismaClient;

  constructor(client: PrismaClient = prisma) {
    this.db = client;
  }

  /**
   * Returns either the active interactive transaction client or the default Prisma client singleton.
   */
  protected getClient(tx?: TransactionClient): PrismaClient | TransactionClient {
    return tx ?? this.db;
  }

  /**
   * Wraps an async query in safePrismaCall returning a typed Result<T, DatabaseError>.
   */
  protected async safeCall<T>(
    operation: () => Promise<T>,
    fallbackMessage?: string
  ): Promise<Result<T, DatabaseError>> {
    return safePrismaCall(operation, fallbackMessage);
  }

  /**
   * Calculates standardized offset, limit, and bounds for pagination.
   */
  protected getPaginationBounds(pagination?: PaginationParams): {
    page: number;
    pageSize: number;
    skip: number;
    take: number;
  } {
    const page = Math.max(1, pagination?.page ?? 1);
    const pageSize = Math.max(1, Math.min(100, pagination?.pageSize ?? 20));
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    return { page, pageSize, skip, take };
  }
}
