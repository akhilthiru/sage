// Prisma Client & Transactions
export * from '@prisma/client';
export { prisma, disconnectPrisma, type TransactionClient } from './client';

// Standardized Database Errors & Result Pattern
export {
  DatabaseError,
  type DatabaseErrorCode,
  type DatabaseErrorDetails,
  type Result,
  success,
  failure,
  mapPrismaError,
  safePrismaCall,
} from './errors/database-error';

// Utilities
export {
  toNumber,
  toOptionalNumber,
  toRequiredNumber,
  toDecimal,
  toOptionalDecimal,
  toRequiredDecimal,
  roundCurrency,
} from './utils/decimal-converter';

export {
  encrypt,
  decrypt,
  encryptNullable,
  decryptNullable,
  hash,
} from './utils/encryption';
