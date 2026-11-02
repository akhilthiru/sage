import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto';
import { DatabaseError } from '../errors/database-error';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

// Fallback key used ONLY for development and automated test environments
const DEV_FALLBACK_KEY = 'sage_dev_secret_key_32bytes_long!';

/**
 * Resolves a 32-byte Buffer key from environment variables or custom key argument.
 */
function resolveKey(customKey?: string): Buffer {
  const envKey =
    customKey ??
    process.env.DATABASE_ENCRYPTION_KEY ??
    process.env.ENCRYPTION_KEY ??
    DEV_FALLBACK_KEY;

  if (Buffer.byteLength(envKey) === 32) {
    return Buffer.from(envKey);
  }

  // If 64 hex characters, parse as hex buffer (32 bytes)
  if (/^[0-9a-fA-F]{64}$/.test(envKey)) {
    return Buffer.from(envKey, 'hex');
  }

  // Derive a deterministic 32-byte key via SHA-256 if key length is not exactly 32 bytes
  return createHash('sha256').update(envKey).digest();
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Output format: `iv:authTag:ciphertext` in hex encoding.
 */
export function encrypt(plaintext: string, customKey?: string): string {
  if (typeof plaintext !== 'string') {
    throw new DatabaseError(
      'VALIDATION_ERROR',
      'Cannot encrypt non-string value'
    );
  }

  const key = resolveKey(customKey);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts an AES-256-GCM ciphertext in `iv:authTag:ciphertext` hex format.
 */
export function decrypt(encryptedText: string, customKey?: string): string {
  if (typeof encryptedText !== 'string' || !encryptedText.includes(':')) {
    throw new DatabaseError(
      'VALIDATION_ERROR',
      'Invalid ciphertext format for decryption. Expected iv:authTag:ciphertext'
    );
  }

  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    throw new DatabaseError(
      'VALIDATION_ERROR',
      'Ciphertext does not contain iv, authTag, and ciphertext components'
    );
  }

  const [ivHex, authTagHex, cipherHex] = parts;

  if (!ivHex || !authTagHex || !cipherHex) {
    throw new DatabaseError(
      'VALIDATION_ERROR',
      'Malformed encryption components'
    );
  }

  try {
    const key = resolveKey(customKey);
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const cipherBuffer = Buffer.from(cipherHex, 'hex');

    if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
      throw new Error('Invalid IV or auth tag length');
    }

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(cipherBuffer),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } catch (error) {
    throw new DatabaseError(
      'VALIDATION_ERROR',
      'Decryption failed. The ciphertext may have been tampered with or key is invalid.',
      undefined,
      error
    );
  }
}

/**
 * Safely encrypts a string or returns null/undefined if input is null/undefined.
 */
export function encryptNullable(
  plaintext: string | null | undefined,
  customKey?: string
): string | null | undefined {
  if (plaintext === null) return null;
  if (plaintext === undefined) return undefined;
  return encrypt(plaintext, customKey);
}

/**
 * Safely decrypts a string or returns null/undefined if input is null/undefined.
 */
export function decryptNullable(
  encryptedText: string | null | undefined,
  customKey?: string
): string | null | undefined {
  if (encryptedText === null) return null;
  if (encryptedText === undefined) return undefined;
  return decrypt(encryptedText, customKey);
}

/**
 * Computes a SHA-256 hash of a string (useful for blind indexing / exact matching of sensitive fields).
 */
export function hash(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}
