import { PrismaClient } from '@prisma/client';
import { beforeEach } from 'vitest';
import { mockDeep, mockReset, DeepMockProxy } from 'vitest-mock-extended';
import type { TransactionClient } from '../../src/client';

export type MockPrismaClient = DeepMockProxy<PrismaClient>;
export type MockTransactionClient = DeepMockProxy<TransactionClient>;

export const prismaMock = mockDeep<PrismaClient>();
export const txMock = mockDeep<TransactionClient>();

beforeEach(() => {
  mockReset(prismaMock);
  mockReset(txMock);
});
