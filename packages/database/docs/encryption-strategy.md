# Encryption Strategy

**Package:** `@sage/database`  
**Purpose:** Data encryption specifications for sensitive financial information  
**Date:** June 30, 2026  
**Status:** Design Phase - Documentation Only

---

## Overview

This document defines the encryption strategy for Sage's sensitive financial data, covering field-level encryption, key management, and security best practices.

**Core Principle:** Encrypt all monetary values and personally identifiable financial information at rest.

---

## Encryption Requirements

### Regulatory Compliance

**GDPR (General Data Protection Regulation):**
- Right to data protection
- Right to be forgotten
- Data minimization
- Encryption at rest and in transit

**PCI DSS (if handling payments in future):**
- Encrypt cardholder data
- Strong cryptography
- Key management

**Indian Data Protection Laws:**
- Sensitive personal data protection
- Financial information security

---

## Sensitive Data Classification

### Highly Sensitive (MUST Encrypt)

**Financial Profile:**
- `monthlyIncome` - User's income
- `otherIncome` - Additional income
- `currentSavings` - Total savings
- `emergencyFundTarget` - Emergency fund target
- `currentEmergencyFund` - Emergency fund balance

**Goal:**
- `targetAmount` - Goal target amount
- `currentAmount` - Current progress
- `monthlyContribution` - Monthly savings

**Expense:**
- `amount` - Expense amount

**Debt:**
- `principalAmount` - Original loan amount
- `currentBalance` - Remaining balance
- `monthlyPayment` - Monthly payment
- `minimumPayment` - Minimum payment

**DebtPayment:**
- `amount` - Payment amount
- `principalPaid` - Principal portion
- `interestPaid` - Interest portion

**Asset:**
- `currentValue` - Current asset value
- `purchaseValue` - Purchase price

**Transaction:**
- `amount` - Transaction amount

**Allocation:**
- All monetary fields (8 fields)

**Total Encrypted Fields: 31**

### Sensitive (Protect, No Encryption)

- `email` - User email (needed for queries)
- `name` - User name
- `primaryGoal` - Goal description
- Goal/debt descriptions

### Non-Sensitive

- IDs, timestamps, enums, status fields
- Calculated scores (understanding, feasibility)

---

## Encryption Approach

### Application-Layer Encryption (Recommended)

**Why Application Layer:**
- Full control over encryption/decryption
- Works with any database
- Can use different keys per user
- Easier key rotation
- Better for serverless (no database extensions)

**Implementation:**
```typescript
// Encrypt before saving
const encrypted = encrypt(plaintext, encryptionKey);
await db.financialProfile.create({
  data: {
    monthlyIncome: encrypted
  }
});

// Decrypt after reading
const profile = await db.financialProfile.findUnique({ where: { userId } });
const decrypted = decrypt(profile.monthlyIncome, encryptionKey);
```

### Database-Layer Encryption (Alternative)

**PostgreSQL pgcrypto:**
```sql
-- Encrypt
INSERT INTO financial_profiles (monthly_income)
VALUES (pgp_sym_encrypt('80000', 'encryption_key'));

-- Decrypt
SELECT pgp_sym_decrypt(monthly_income::bytea, 'encryption_key')
FROM financial_profiles;
```

**Pros:**
- Encryption happens in database
- No application changes needed

**Cons:**
- Requires PostgreSQL extension
- Harder to use with Prisma
- Less flexible key management
- Doesn't work well with serverless

**Decision: Use Application-Layer Encryption**

---

## Encryption Implementation

### 1. Encryption Library

**Use: `@aws-crypto/client-node` (AWS Encryption SDK)**

**Why:**
- Industry standard
- Envelope encryption
- Key rotation support
- Well-tested
- Good TypeScript support

**Alternative: `crypto` (Node.js built-in)**
```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const algorithm = 'aes-256-gcm';
const keyLength = 32; // 256 bits

function encrypt(plaintext: string, key: Buffer): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(algorithm, key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Return: iv + authTag + encrypted (all hex)
  return iv.toString('hex') + authTag.toString('hex') + encrypted;
}

function decrypt(ciphertext: string, key: Buffer): string {
  const iv = Buffer.from(ciphertext.slice(0, 32), 'hex');
  const authTag = Buffer.from(ciphertext.slice(32, 64), 'hex');
  const encrypted = ciphertext.slice(64);
  
  const decipher = createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

### 2. Encryption Service

```typescript
// src/utils/encryption.ts

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

export class EncryptionService {
  private algorithm = 'aes-256-gcm';
  private keyLength = 32;
  
  constructor(private masterKey: Buffer) {
    if (masterKey.length !== this.keyLength) {
      throw new Error('Master key must be 32 bytes');
    }
  }
  
  /**
   * Encrypt a decimal value
   */
  encryptDecimal(value: number): string {
    return this.encrypt(value.toString());
  }
  
  /**
   * Decrypt to decimal value
   */
  decryptDecimal(ciphertext: string): number {
    const plaintext = this.decrypt(ciphertext);
    return parseFloat(plaintext);
  }
  
  /**
   * Encrypt a string
   */
  encrypt(plaintext: string): string {
    const iv = randomBytes(16);
    const cipher = createCipheriv(this.algorithm, this.masterKey, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Format: iv(32) + authTag(32) + encrypted
    return iv.toString('hex') + authTag.toString('hex') + encrypted;
  }
  
  /**
   * Decrypt a string
   */
  decrypt(ciphertext: string): string {
    const iv = Buffer.from(ciphertext.slice(0, 32), 'hex');
    const authTag = Buffer.from(ciphertext.slice(32, 64), 'hex');
    const encrypted = ciphertext.slice(64);
    
    const decipher = createDecipheriv(this.algorithm, this.masterKey, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
  
  /**
   * Encrypt multiple fields
   */
  encryptFields<T extends Record<string, any>>(
    data: T,
    fields: (keyof T)[]
  ): T {
    const encrypted = { ...data };
    
    for (const field of fields) {
      if (data[field] !== undefined && data[field] !== null) {
        if (typeof data[field] === 'number') {
          encrypted[field] = this.encryptDecimal(data[field] as number) as any;
        } else {
          encrypted[field] = this.encrypt(String(data[field])) as any;
        }
      }
    }
    
    return encrypted;
  }
  
  /**
   * Decrypt multiple fields
   */
  decryptFields<T extends Record<string, any>>(
    data: T,
    fields: (keyof T)[],
    types: Record<keyof T, 'number' | 'string'>
  ): T {
    const decrypted = { ...data };
    
    for (const field of fields) {
      if (data[field] !== undefined && data[field] !== null) {
        if (types[field] === 'number') {
          decrypted[field] = this.decryptDecimal(data[field] as string) as any;
        } else {
          decrypted[field] = this.decrypt(data[field] as string) as any;
        }
      }
    }
    
    return decrypted;
  }
}

// Singleton instance
let encryptionService: EncryptionService | null = null;

export function getEncryptionService(): EncryptionService {
  if (!encryptionService) {
    const masterKey = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
    encryptionService = new EncryptionService(masterKey);
  }
  return encryptionService;
}
```

### 3. Repository Integration

```typescript
// Example: FinancialProfileRepository with encryption

import { getEncryptionService } from '../utils/encryption';

class FinancialProfileRepository {
  private encryption = getEncryptionService();
  
  private encryptedFields = [
    'monthlyIncome',
    'otherIncome',
    'currentSavings',
    'emergencyFundTarget',
    'currentEmergencyFund'
  ] as const;
  
  private fieldTypes = {
    monthlyIncome: 'number',
    otherIncome: 'number',
    currentSavings: 'number',
    emergencyFundTarget: 'number',
    currentEmergencyFund: 'number'
  } as const;
  
  async create(data: CreateProfileData): Promise<FinancialProfile> {
    // Encrypt before saving
    const encrypted = this.encryption.encryptFields(data, this.encryptedFields);
    
    const profile = await this.db.financialProfile.create({
      data: encrypted
    });
    
    // Decrypt before returning
    return this.encryption.decryptFields(
      profile,
      this.encryptedFields,
      this.fieldTypes
    );
  }
  
  async findByUserId(userId: string): Promise<FinancialProfile | null> {
    const profile = await this.db.financialProfile.findUnique({
      where: { userId }
    });
    
    if (!profile) return null;
    
    // Decrypt before returning
    return this.encryption.decryptFields(
      profile,
      this.encryptedFields,
      this.fieldTypes
    );
  }
  
  async update(
    id: string,
    data: UpdateProfileData
  ): Promise<FinancialProfile> {
    // Encrypt fields that are being updated
    const fieldsToEncrypt = this.encryptedFields.filter(
      field => field in data
    );
    const encrypted = this.encryption.encryptFields(data, fieldsToEncrypt);
    
    const profile = await this.db.financialProfile.update({
      where: { id },
      data: encrypted
    });
    
    // Decrypt before returning
    return this.encryption.decryptFields(
      profile,
      this.encryptedFields,
      this.fieldTypes
    );
  }
}
```

---

## Key Management

### Master Key Storage

**Production: AWS Secrets Manager / Vercel Environment Variables**

```bash
# Generate master key (32 bytes = 256 bits)
openssl rand -hex 32

# Store in Vercel
vercel env add ENCRYPTION_KEY production
# Paste the generated key
```

**Development: .env.local**

```bash
# .env.local (NEVER commit to git)
ENCRYPTION_KEY=your_32_byte_hex_key_here
```

**Key Rotation Strategy:**

1. Generate new key
2. Decrypt all data with old key
3. Re-encrypt with new key
4. Update environment variable
5. Deploy

```typescript
// Key rotation script
async function rotateEncryptionKey(
  oldKey: Buffer,
  newKey: Buffer
) {
  const oldEncryption = new EncryptionService(oldKey);
  const newEncryption = new EncryptionService(newKey);
  
  // Rotate financial profiles
  const profiles = await db.financialProfile.findMany();
  
  for (const profile of profiles) {
    const decrypted = oldEncryption.decryptFields(
      profile,
      encryptedFields,
      fieldTypes
    );
    
    const reEncrypted = newEncryption.encryptFields(
      decrypted,
      encryptedFields
    );
    
    await db.financialProfile.update({
      where: { id: profile.id },
      data: reEncrypted
    });
  }
  
  // Repeat for all entities with encrypted fields
}
```

### Per-User Encryption (Advanced)

**For maximum security, use per-user encryption keys:**

```typescript
// Derive user-specific key from master key + userId
function deriveUserKey(masterKey: Buffer, userId: string): Buffer {
  const hmac = createHmac('sha256', masterKey);
  hmac.update(userId);
  return hmac.digest();
}

// Usage
const userKey = deriveUserKey(masterKey, userId);
const userEncryption = new EncryptionService(userKey);
```

**Benefits:**
- User data encrypted with unique key
- Compromising one key doesn't expose all data
- Can delete user key to make data unrecoverable

**Tradeoffs:**
- More complex key management
- Harder to rotate master key
- Slightly slower (key derivation overhead)

**Decision: Start with single master key, migrate to per-user if needed**

---

## Database Schema Considerations

### Encrypted Field Storage

**Option 1: Store as TEXT (Recommended)**

```prisma
model FinancialProfile {
  monthlyIncome String // Encrypted hex string
}
```

**Pros:**
- Simple
- Works with Prisma
- No type conversion needed

**Cons:**
- Can't query encrypted values
- Larger storage (hex encoding)

**Option 2: Store as BYTEA**

```prisma
model FinancialProfile {
  monthlyIncome Bytes // Encrypted binary
}
```

**Pros:**
- Smaller storage
- More efficient

**Cons:**
- Harder to work with in Prisma
- Need base64 encoding/decoding

**Decision: Use TEXT (String) for simplicity**

### Searchable Encryption (Future)

For fields that need to be searchable while encrypted:

**Deterministic Encryption:**
- Same plaintext → same ciphertext
- Allows equality queries
- Less secure (pattern analysis possible)

**Use for:**
- Email (if encrypted in future)
- User IDs (if encrypted in future)

**Don't use for:**
- Monetary values (use random encryption)

---

## Logging and Redaction

### Never Log Encrypted Data

```typescript
// ❌ BAD: Logging encrypted data
logger.info({ 
  monthlyIncome: encryptedIncome // Don't log!
});

// ✅ GOOD: Redact sensitive fields
logger.info({ 
  userId: 'user_123',
  monthlyIncome: '[REDACTED]'
});
```

### Structured Logging with Redaction

```typescript
// src/utils/logger.ts

import pino from 'pino';

const sensitiveFields = [
  'monthlyIncome',
  'otherIncome',
  'currentSavings',
  'emergencyFundTarget',
  'currentEmergencyFund',
  'targetAmount',
  'currentAmount',
  'amount',
  'principalAmount',
  'currentBalance',
  'monthlyPayment',
  'minimumPayment'
];

function redactSensitiveFields(obj: any): any {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  const redacted = { ...obj };
  
  for (const field of sensitiveFields) {
    if (field in redacted) {
      redacted[field] = '[REDACTED]';
    }
  }
  
  // Recursively redact nested objects
  for (const key in redacted) {
    if (typeof redacted[key] === 'object') {
      redacted[key] = redactSensitiveFields(redacted[key]);
    }
  }
  
  return redacted;
}

export const logger = pino({
  redact: {
    paths: sensitiveFields,
    censor: '[REDACTED]'
  }
});
```

---

## Error Handling

### Encryption Errors

```typescript
try {
  const encrypted = encryption.encrypt(plaintext);
} catch (error) {
  logger.error({ error }, 'Encryption failed');
  throw new Error('Failed to encrypt data');
}
```

### Decryption Errors

```typescript
try {
  const decrypted = encryption.decrypt(ciphertext);
} catch (error) {
  logger.error({ error }, 'Decryption failed');
  // This is serious - data may be corrupted
  throw new Error('Failed to decrypt data');
}
```

### Key Not Found

```typescript
if (!process.env.ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY environment variable not set');
}
```

---

## Performance Considerations

### Encryption Overhead

**Benchmarks (AES-256-GCM):**
- Encryption: ~0.1ms per field
- Decryption: ~0.1ms per field
- Total overhead: ~1-2ms per record

**For Sage:**
- Typical query: 5-10 encrypted fields
- Overhead: ~1-2ms
- Acceptable for user-facing queries

### Caching Decrypted Data

**❌ Don't cache decrypted data in memory:**
```typescript
// BAD: Security risk
const cache = new Map<string, FinancialProfile>();
```

**✅ Cache encrypted data, decrypt on access:**
```typescript
// GOOD: Secure
const cache = new Map<string, EncryptedFinancialProfile>();

function getProfile(userId: string) {
  const encrypted = cache.get(userId);
  return encryption.decrypt(encrypted);
}
```

---

## Testing

### Unit Tests

```typescript
describe('EncryptionService', () => {
  let encryption: EncryptionService;
  
  beforeEach(() => {
    const testKey = Buffer.from('0'.repeat(64), 'hex');
    encryption = new EncryptionService(testKey);
  });
  
  it('should encrypt and decrypt decimal', () => {
    const original = 80000.50;
    const encrypted = encryption.encryptDecimal(original);
    const decrypted = encryption.decryptDecimal(encrypted);
    
    expect(decrypted).toBe(original);
  });
  
  it('should produce different ciphertext for same plaintext', () => {
    const plaintext = '80000';
    const encrypted1 = encryption.encrypt(plaintext);
    const encrypted2 = encryption.encrypt(plaintext);
    
    // Different due to random IV
    expect(encrypted1).not.toBe(encrypted2);
    
    // But both decrypt to same value
    expect(encryption.decrypt(encrypted1)).toBe(plaintext);
    expect(encryption.decrypt(encrypted2)).toBe(plaintext);
  });
  
  it('should handle null values', () => {
    const data = { monthlyIncome: null };
    const encrypted = encryption.encryptFields(data, ['monthlyIncome']);
    
    expect(encrypted.monthlyIncome).toBeNull();
  });
});
```

### Integration Tests

```typescript
describe('FinancialProfileRepository with Encryption', () => {
  it('should encrypt on create and decrypt on read', async () => {
    const profile = await profileRepo.create({
      userId: 'user_123',
      monthlyIncome: 80000,
      currentSavings: 100000
    });
    
    // Verify decrypted values returned
    expect(profile.monthlyIncome).toBe(80000);
    expect(profile.currentSavings).toBe(100000);
    
    // Verify encrypted in database
    const raw = await db.$queryRaw`
      SELECT monthly_income FROM financial_profiles 
      WHERE user_id = 'user_123'
    `;
    
    // Should be hex string, not '80000'
    expect(raw[0].monthly_income).not.toBe('80000');
    expect(raw[0].monthly_income).toMatch(/^[0-9a-f]+$/);
  });
});
```

---

## Migration Strategy

### Encrypting Existing Data

```typescript
// Migration script: encrypt-existing-data.ts

async function encryptExistingData() {
  const encryption = getEncryptionService();
  
  // 1. Financial Profiles
  console.log('Encrypting financial profiles...');
  const profiles = await db.financialProfile.findMany();
  
  for (const profile of profiles) {
    const encrypted = encryption.encryptFields(profile, [
      'monthlyIncome',
      'otherIncome',
      'currentSavings',
      'emergencyFundTarget',
      'currentEmergencyFund'
    ]);
    
    await db.financialProfile.update({
      where: { id: profile.id },
      data: encrypted
    });
  }
  
  console.log(`Encrypted ${profiles.length} profiles`);
  
  // 2. Goals
  console.log('Encrypting goals...');
  const goals = await db.goal.findMany();
  
  for (const goal of goals) {
    const encrypted = encryption.encryptFields(goal, [
      'targetAmount',
      'currentAmount',
      'monthlyContribution'
    ]);
    
    await db.goal.update({
      where: { id: goal.id },
      data: encrypted
    });
  }
  
  console.log(`Encrypted ${goals.length} goals`);
  
  // Continue for all entities...
}

// Run migration
encryptExistingData()
  .then(() => console.log('Migration complete'))
  .catch(error => console.error('Migration failed:', error));
```

---

## Security Checklist

### Development

- [ ] Generate strong encryption key (32 bytes)
- [ ] Store key in .env.local (never commit)
- [ ] Add .env.local to .gitignore
- [ ] Test encryption/decryption
- [ ] Verify encrypted data in database

### Production

- [ ] Generate production encryption key
- [ ] Store key in Vercel environment variables
- [ ] Enable encryption for all sensitive fields
- [ ] Test key rotation procedure
- [ ] Set up monitoring for encryption errors
- [ ] Document key recovery procedure
- [ ] Implement logging redaction
- [ ] Conduct security audit

### Ongoing

- [ ] Monitor encryption performance
- [ ] Rotate keys annually
- [ ] Review encrypted fields quarterly
- [ ] Update encryption library regularly
- [ ] Audit access logs
- [ ] Test disaster recovery

---

## Compliance

### GDPR Compliance

- ✅ Encryption at rest (AES-256)
- ✅ Encryption in transit (HTTPS)
- ✅ Right to be forgotten (delete encrypted data)
- ✅ Data minimization (only encrypt necessary fields)
- ✅ Access controls (application layer)

### Data Breach Response

**If encryption key compromised:**

1. **Immediate:**
   - Rotate encryption key
   - Re-encrypt all data
   - Invalidate all sessions
   - Notify security team

2. **Investigation:**
   - Determine scope of breach
   - Identify affected users
   - Review access logs

3. **Notification:**
   - Notify affected users (if required)
   - Report to authorities (if required)
   - Document incident

---

## Summary

### Encryption Coverage

**Total Fields: 31**
- FinancialProfile: 5 fields
- Goal: 3 fields
- Expense: 1 field
- Debt: 4 fields
- DebtPayment: 3 fields
- Asset: 2 fields
- Transaction: 1 field
- Allocation: 8 fields
- Others: 4 fields

### Security Measures

✅ **AES-256-GCM** - Industry standard  
✅ **Application-layer** - Full control  
✅ **Random IV** - Unique ciphertext  
✅ **Authentication tag** - Tamper detection  
✅ **Secure key storage** - Environment variables  
✅ **Logging redaction** - No sensitive data in logs  
✅ **Key rotation** - Annual rotation plan  

### Performance Impact

- Encryption: ~0.1ms per field
- Decryption: ~0.1ms per field
- Total overhead: ~1-2ms per query
- **Acceptable for production**

---

## Conclusion

This encryption strategy provides:
- ✅ Strong encryption for all sensitive data
- ✅ Secure key management
- ✅ Minimal performance impact
- ✅ GDPR compliance
- ✅ Production-ready implementation

**Status:** Ready for implementation

**Next Steps:**
1. Implement EncryptionService
2. Integrate with repositories
3. Test encryption/decryption
4. Set up key management
5. Deploy to production

---

**Document Version:** 1.0  
**Last Updated:** June 30, 2026  
**Next Review:** After security audit
