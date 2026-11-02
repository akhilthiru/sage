import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import {
  DatabaseError,
  mapPrismaError,
  safePrismaCall,
  success,
  failure,
} from '../../src/errors/database-error';

describe('DatabaseError & Error Mapping', () => {
  it('should instantiate DatabaseError correctly', () => {
    const err = new DatabaseError('NOT_FOUND', 'Record missing', { field: 'userId' });
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(DatabaseError);
    expect(err.name).toBe('DatabaseError');
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('Record missing');
    expect(err.details).toEqual({ field: 'userId' });
  });

  describe('mapPrismaError', () => {
    it('should return DatabaseError instances directly', () => {
      const err = new DatabaseError('QUERY_ERROR', 'Direct error');
      expect(mapPrismaError(err)).toBe(err);
    });

    it('should map P2002 to UNIQUE_VIOLATION with array target', () => {
      const pError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '5.22.0',
        meta: { target: ['email', 'clerkId'] },
      });

      const mapped = mapPrismaError(pError);
      expect(mapped.code).toBe('UNIQUE_VIOLATION');
      expect(mapped.details?.target).toEqual(['email', 'clerkId']);
      expect(mapped.message).toContain('email, clerkId');
    });

    it('should map P2002 with string target', () => {
      const pError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '5.22.0',
        meta: { target: 'email' },
      });

      const mapped = mapPrismaError(pError);
      expect(mapped.code).toBe('UNIQUE_VIOLATION');
      expect(mapped.details?.target).toEqual(['email']);
    });

    it('should map P2002 without target meta', () => {
      const pError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '5.22.0',
      });

      const mapped = mapPrismaError(pError);
      expect(mapped.code).toBe('UNIQUE_VIOLATION');
      expect(mapped.details?.target).toBeUndefined();
    });

    it('should map P2025 to NOT_FOUND with cause', () => {
      const pError = new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: '5.22.0',
        meta: { cause: 'User record does not exist' },
      });

      const mapped = mapPrismaError(pError);
      expect(mapped.code).toBe('NOT_FOUND');
      expect(mapped.message).toBe('User record does not exist');
      expect(mapped.details?.cause).toBe('User record does not exist');
    });

    it('should map P2025 to NOT_FOUND default message when cause is missing', () => {
      const pError = new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: '5.22.0',
      });

      const mapped = mapPrismaError(pError);
      expect(mapped.code).toBe('NOT_FOUND');
      expect(mapped.message).toBe('The requested record was not found');
    });

    it('should map P2003 to FOREIGN_KEY_VIOLATION with field name', () => {
      const pError = new Prisma.PrismaClientKnownRequestError('Foreign key violation', {
        code: 'P2003',
        clientVersion: '5.22.0',
        meta: { field_name: 'userId' },
      });

      const mapped = mapPrismaError(pError);
      expect(mapped.code).toBe('FOREIGN_KEY_VIOLATION');
      expect(mapped.details?.field).toBe('userId');
      expect(mapped.message).toContain('userId');
    });

    it('should map P2014 to FOREIGN_KEY_VIOLATION relation violation', () => {
      const pError = new Prisma.PrismaClientKnownRequestError('Relation violation', {
        code: 'P2014',
        clientVersion: '5.22.0',
      });

      const mapped = mapPrismaError(pError);
      expect(mapped.code).toBe('FOREIGN_KEY_VIOLATION');
      expect(mapped.message).toContain('required relation between records');
    });

    it('should map connection codes (P1001) to CONNECTION_ERROR', () => {
      const pError = new Prisma.PrismaClientKnownRequestError('Connection timeout', {
        code: 'P1001',
        clientVersion: '5.22.0',
      });

      const mapped = mapPrismaError(pError);
      expect(mapped.code).toBe('CONNECTION_ERROR');
      expect(mapped.message).toContain('Unable to reach database server');
    });

    it('should map unhandled Prisma error codes to QUERY_ERROR', () => {
      const pError = new Prisma.PrismaClientKnownRequestError('Unknown query issue', {
        code: 'P2099',
        clientVersion: '5.22.0',
      });

      const mapped = mapPrismaError(pError);
      expect(mapped.code).toBe('QUERY_ERROR');
      expect(mapped.details?.prismaCode).toBe('P2099');
    });

    it('should map PrismaClientValidationError to VALIDATION_ERROR', () => {
      const vError = new Prisma.PrismaClientValidationError('Invalid argument format', {
        clientVersion: '5.22.0',
      });

      const mapped = mapPrismaError(vError);
      expect(mapped.code).toBe('VALIDATION_ERROR');
      expect(mapped.message).toContain('Prisma validation failed');
    });

    it('should map PrismaClientInitializationError to CONNECTION_ERROR', () => {
      const iError = new Prisma.PrismaClientInitializationError('Auth failed', '5.22.0', 'P1000');

      const mapped = mapPrismaError(iError);
      expect(mapped.code).toBe('CONNECTION_ERROR');
      expect(mapped.details?.prismaCode).toBe('P1000');
    });

    it('should map PrismaClientRustPanicError to UNKNOWN_ERROR', () => {
      const panic = new Prisma.PrismaClientRustPanicError('Engine crashed', '5.22.0');

      const mapped = mapPrismaError(panic);
      expect(mapped.code).toBe('UNKNOWN_ERROR');
      expect(mapped.message).toContain('fatal error');
    });

    it('should map standard Error to UNKNOWN_ERROR', () => {
      const err = new Error('Generic failure');
      const mapped = mapPrismaError(err);
      expect(mapped.code).toBe('UNKNOWN_ERROR');
      expect(mapped.message).toBe('Generic failure');
    });

    it('should handle non-Error thrown objects', () => {
      const mapped = mapPrismaError('String exception', 'Default fallback');
      expect(mapped.code).toBe('UNKNOWN_ERROR');
      expect(mapped.message).toBe('Default fallback');
    });
  });

  describe('safePrismaCall & Result helpers', () => {
    it('should wrap successful resolution in success result', async () => {
      const result = await safePrismaCall(async () => ({ id: '123', name: 'Test' }));
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ id: '123', name: 'Test' });
      }
    });

    it('should catch error and return mapped failure result', async () => {
      const result = await safePrismaCall(async () => {
        throw new Prisma.PrismaClientKnownRequestError('Not found', {
          code: 'P2025',
          clientVersion: '5.22.0',
        });
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });

    it('should return typed objects from success and failure helpers', () => {
      const okRes = success(42);
      expect(okRes).toEqual({ success: true, data: 42 });

      const err = new DatabaseError('QUERY_ERROR', 'Fail');
      const errRes = failure(err);
      expect(errRes).toEqual({ success: false, error: err });
    });
  });
});
