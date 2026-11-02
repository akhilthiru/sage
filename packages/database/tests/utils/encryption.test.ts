import { describe, it, expect } from 'vitest';
import {
  encrypt,
  decrypt,
  encryptNullable,
  decryptNullable,
  hash,
} from '../../src/utils/encryption';
import { DatabaseError } from '../../src/errors/database-error';

describe('Encryption Utilities (AES-256-GCM)', () => {
  const samplePlaintext = 'Sensitive financial chat note: balance = 50000';
  const custom32ByteKey = '12345678901234567890123456789012';
  const customHexKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  it('should encrypt and decrypt plaintext successfully with default key', () => {
    const ciphertext = encrypt(samplePlaintext);
    expect(ciphertext).toBeDefined();
    expect(ciphertext).not.toBe(samplePlaintext);
    expect(ciphertext.split(':')).toHaveLength(3);

    const decrypted = decrypt(ciphertext);
    expect(decrypted).toBe(samplePlaintext);
  });

  it('should encrypt and decrypt with custom 32-byte key', () => {
    const ciphertext = encrypt(samplePlaintext, custom32ByteKey);
    const decrypted = decrypt(ciphertext, custom32ByteKey);
    expect(decrypted).toBe(samplePlaintext);
  });

  it('should encrypt and decrypt with custom 64-char hex key', () => {
    const ciphertext = encrypt(samplePlaintext, customHexKey);
    const decrypted = decrypt(ciphertext, customHexKey);
    expect(decrypted).toBe(samplePlaintext);
  });

  it('should encrypt and decrypt with arbitrary length key (SHA-256 derived)', () => {
    const shortKey = 'short-secret';
    const ciphertext = encrypt(samplePlaintext, shortKey);
    const decrypted = decrypt(ciphertext, shortKey);
    expect(decrypted).toBe(samplePlaintext);
  });

  it('should produce different ciphertexts for the same plaintext due to random IV', () => {
    const cipher1 = encrypt(samplePlaintext);
    const cipher2 = encrypt(samplePlaintext);
    expect(cipher1).not.toBe(cipher2);
    expect(decrypt(cipher1)).toBe(samplePlaintext);
    expect(decrypt(cipher2)).toBe(samplePlaintext);
  });

  it('should throw when decrypting with wrong key', () => {
    const ciphertext = encrypt(samplePlaintext, custom32ByteKey);
    const wrongKey = 'different_key_32bytes_long_here!';
    expect(() => decrypt(ciphertext, wrongKey)).toThrow(DatabaseError);
  });

  it('should detect tampered ciphertext and throw DatabaseError(VALIDATION_ERROR)', () => {
    const ciphertext = encrypt(samplePlaintext);
    const [iv, authTag, data] = ciphertext.split(':');

    // Tamper with data payload
    const tamperedData = (data?.slice(0, -2) ?? '') + 'ff';
    const tamperedCipher = `${iv}:${authTag}:${tamperedData}`;

    expect(() => decrypt(tamperedCipher)).toThrow(DatabaseError);
  });

  it('should detect tampered authTag and throw DatabaseError(VALIDATION_ERROR)', () => {
    const ciphertext = encrypt(samplePlaintext);
    const [iv, authTag, data] = ciphertext.split(':');

    // Tamper with authTag
    const tamperedTag = (authTag?.slice(0, -2) ?? '') + '00';
    const tamperedCipher = `${iv}:${tamperedTag}:${data}`;

    expect(() => decrypt(tamperedCipher)).toThrow(DatabaseError);
  });

  it('should throw when ciphertext has invalid format', () => {
    expect(() => decrypt('not_a_valid_ciphertext')).toThrow(DatabaseError);
    expect(() => decrypt('only:two_parts')).toThrow(DatabaseError);
    expect(() => decrypt('::')).toThrow(DatabaseError);
    expect(() => decrypt('aabb:ccdd:eeff')).toThrow(DatabaseError); // invalid IV & authTag length
    expect(() => decrypt(123 as unknown as string)).toThrow(DatabaseError);
  });

  it('should throw when encrypting non-string input', () => {
    expect(() => encrypt(12345 as unknown as string)).toThrow(DatabaseError);
    expect(() => encrypt(null as unknown as string)).toThrow(DatabaseError);
  });

  describe('encryptNullable & decryptNullable', () => {
    it('should pass through null and undefined unchanged', () => {
      expect(encryptNullable(null)).toBeNull();
      expect(encryptNullable(undefined)).toBeUndefined();
      expect(decryptNullable(null)).toBeNull();
      expect(decryptNullable(undefined)).toBeUndefined();
    });

    it('should encrypt and decrypt valid strings normally', () => {
      const encrypted = encryptNullable('secret text');
      expect(encrypted).toBeDefined();
      const decrypted = decryptNullable(encrypted);
      expect(decrypted).toBe('secret text');
    });
  });

  describe('hash', () => {
    it('should generate deterministic SHA-256 hash', () => {
      const h1 = hash('test@sage.app');
      const h2 = hash('test@sage.app');
      expect(h1).toBe(h2);
      expect(h1).toHaveLength(64);
      expect(hash('different@sage.app')).not.toBe(h1);
    });
  });
});
