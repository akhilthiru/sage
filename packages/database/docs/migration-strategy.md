# Migration Strategy

**Package:** `@sage/database`  
**Purpose:** Database migration workflow and best practices  
**Date:** June 30, 2026  
**Status:** Design Phase - Documentation Only

---

## Overview

This document defines the migration strategy for Sage's PostgreSQL database, covering naming conventions, workflow, rollback procedures, and production deployment.

**Core Principle:** Migrations are immutable, versioned, and reversible.

---

## Migration Fundamentals

### What is a Migration?

A database migration is a versioned change to the database schema:
- Add/remove tables
- Add/remove columns
- Modify column types
- Add/remove indexes
- Add/remove constraints
- Data transformations

### Prisma Migrate

Sage uses Prisma Migrate for database migrations:

```bash
# Create migration
npx prisma migrate dev --name add_feature

# Apply migrations
npx prisma migrate deploy

# Reset database (dev only)
npx prisma migrate reset
```

---

## Naming Conventions

### Migration Names

**Format:** `YYYYMMDDHHMMSS_descriptive_name`

**Examples:**
```
20240630100000_initial_schema
20240630110000_add_goal_milestones
20240630120000_add_encryption_fields
20240630130000_add_indexes_for_performance
20240630140000_add_soft_delete_to_goals
```

**Rules:**
- Use snake_case
- Be descriptive but concise
- Start with action verb (add, remove, modify, rename)
- Include entity name
- Max 50 characters

**Good Names:**
- `add_user_profile_relationship`
- `add_goal_feasibility_fields`
- `remove_deprecated_columns`
- `rename_amount_to_target_amount`

**Bad Names:**
- `migration1` (not descriptive)
- `update` (too vague)
- `add_some_fields_to_goals_table_for_new_feature` (too long)

---

## Migration Workflow

### Development Workflow

**1. Modify Prisma Schema**

```prisma
// prisma/schema.prisma

model Goal {
  id              String @id @default(cuid())
  userId          String
  name            String
  targetAmount    Decimal @db.Decimal(12, 2)
  
  // NEW: Add feasibility tracking
  isFeasible      Boolean @default(true)
  feasibilityScore Int @default(100) @db.SmallInt
  
  user User @relation(fields: [userId], references: [id])
}
```

**2. Create Migration**

```bash
npx prisma migrate dev --name add_goal_feasibility_fields
```

This will:
- Generate SQL migration file
- Apply migration to development database
- Regenerate Prisma Client

**3. Review Migration SQL**

```bash
cat prisma/migrations/20240630120000_add_goal_feasibility_fields/migration.sql
```

```sql
-- AlterTable
ALTER TABLE "goals" 
ADD COLUMN "isFeasible" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "feasibilityScore" SMALLINT NOT NULL DEFAULT 100;
```

**4. Test Migration**

```bash
# Reset and reapply all migrations
npx prisma migrate reset

# Verify schema
npx prisma db pull
```

**5. Commit Migration**

```bash
git add prisma/migrations/
git add prisma/schema.prisma
git commit -m "feat: add goal feasibility tracking"
```

### Production Workflow

**1. Review Migration**

Before deploying to production:
- Review SQL for correctness
- Check for breaking changes
- Verify rollback plan
- Test on staging environment

**2. Backup Database**

```bash
# PostgreSQL backup
pg_dump -h localhost -U postgres sage_production > backup_$(date +%Y%m%d_%H%M%S).sql
```

**3. Apply Migration**

```bash
# Production deployment
npx prisma migrate deploy
```

**4. Verify Migration**

```bash
# Check migration status
npx prisma migrate status

# Verify schema
npx prisma db pull
```

**5. Monitor Application**

- Check error logs
- Monitor query performance
- Verify data integrity
- Test critical workflows

---

## Migration Types

### 1. Additive Migrations (Safe)

**Add new table:**
```sql
CREATE TABLE "goal_milestones" (
  "id" TEXT NOT NULL,
  "goalId" TEXT NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "targetAmount" DECIMAL(12,2) NOT NULL,
  "targetDate" TIMESTAMP(3) NOT NULL,
  "isCompleted" BOOLEAN NOT NULL DEFAULT false,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  
  CONSTRAINT "goal_milestones_pkey" PRIMARY KEY ("id")
);
```

**Add new column:**
```sql
ALTER TABLE "goals" 
ADD COLUMN "description" VARCHAR(500);
```

**Add new index:**
```sql
CREATE INDEX "idx_goals_userId_status" ON "goals"("userId", "status");
```

**Characteristics:**
- No data loss
- No breaking changes
- Can be applied online
- Easy to rollback

### 2. Destructive Migrations (Dangerous)

**Remove column:**
```sql
ALTER TABLE "goals" 
DROP COLUMN "oldField";
```

**Remove table:**
```sql
DROP TABLE "deprecated_table";
```

**Characteristics:**
- Potential data loss
- Breaking changes
- Requires application update
- Hard to rollback

**Mitigation:**
1. Deprecate first (mark as unused)
2. Deploy application without using field
3. Wait for deployment to stabilize
4. Remove field in separate migration

### 3. Data Migrations

**Transform existing data:**
```sql
-- Add new column
ALTER TABLE "financial_profiles" 
ADD COLUMN "totalIncome" DECIMAL(12,2);

-- Populate from existing data
UPDATE "financial_profiles"
SET "totalIncome" = "monthlyIncome" + COALESCE("otherIncome", 0);

-- Make required
ALTER TABLE "financial_profiles"
ALTER COLUMN "totalIncome" SET NOT NULL;
```

**Characteristics:**
- Can be slow on large tables
- May lock table
- Requires careful testing
- May need batching

### 4. Schema Changes

**Rename column:**
```sql
ALTER TABLE "goals" 
RENAME COLUMN "amount" TO "targetAmount";
```

**Change column type:**
```sql
-- Requires data conversion
ALTER TABLE "goals" 
ALTER COLUMN "targetAmount" TYPE DECIMAL(12,2) 
USING "targetAmount"::DECIMAL(12,2);
```

**Characteristics:**
- May require application update
- Can break existing queries
- Needs coordination with code changes

---

## Migration Patterns

### Pattern 1: Expand-Contract

**Problem:** Renaming a column breaks existing code

**Solution:** Three-phase migration

**Phase 1: Expand (Add new column)**
```sql
ALTER TABLE "goals" 
ADD COLUMN "targetAmount" DECIMAL(12,2);

UPDATE "goals" 
SET "targetAmount" = "amount";
```

**Phase 2: Migrate (Update application)**
- Deploy application using `targetAmount`
- Keep reading/writing both columns

**Phase 3: Contract (Remove old column)**
```sql
ALTER TABLE "goals" 
DROP COLUMN "amount";
```

### Pattern 2: Dual-Write

**Problem:** Changing data format

**Solution:** Write to both old and new format

**Phase 1: Add new column**
```sql
ALTER TABLE "users" 
ADD COLUMN "fullName" TEXT;
```

**Phase 2: Dual-write**
```typescript
// Application writes to both
await db.user.update({
  where: { id },
  data: {
    firstName: 'John',
    lastName: 'Doe',
    fullName: 'John Doe' // New field
  }
});
```

**Phase 3: Backfill**
```sql
UPDATE "users" 
SET "fullName" = "firstName" || ' ' || "lastName"
WHERE "fullName" IS NULL;
```

**Phase 4: Remove old columns**
```sql
ALTER TABLE "users" 
DROP COLUMN "firstName",
DROP COLUMN "lastName";
```

### Pattern 3: Feature Flag

**Problem:** Large migration needs testing

**Solution:** Deploy behind feature flag

```typescript
// Application code
if (featureFlags.useNewSchema) {
  // Use new schema
} else {
  // Use old schema
}
```

**Benefits:**
- Can test in production
- Easy rollback (toggle flag)
- Gradual rollout

---

## Rollback Strategy

### Automatic Rollback

Prisma Migrate doesn't support automatic rollback. Must be done manually.

### Manual Rollback

**Option 1: Restore from Backup**

```bash
# Restore database
psql -h localhost -U postgres sage_production < backup_20240630_120000.sql
```

**Option 2: Create Reverse Migration**

```sql
-- Original migration: add_goal_feasibility_fields
ALTER TABLE "goals" 
ADD COLUMN "isFeasible" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "feasibilityScore" SMALLINT NOT NULL DEFAULT 100;

-- Reverse migration: remove_goal_feasibility_fields
ALTER TABLE "goals" 
DROP COLUMN "isFeasible",
DROP COLUMN "feasibilityScore";
```

**Option 3: Mark Migration as Rolled Back**

```bash
# Mark migration as not applied
npx prisma migrate resolve --rolled-back 20240630120000_add_goal_feasibility_fields
```

### Rollback Checklist

- [ ] Stop application traffic
- [ ] Backup current database
- [ ] Apply reverse migration
- [ ] Verify schema
- [ ] Deploy previous application version
- [ ] Resume traffic
- [ ] Monitor for errors
- [ ] Document incident

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] Migration tested in staging
- [ ] Backup created
- [ ] Rollback plan documented
- [ ] Team notified
- [ ] Maintenance window scheduled (if needed)
- [ ] Monitoring alerts configured

### Deployment Steps

**1. Maintenance Mode (if needed)**

```typescript
// Enable maintenance mode
await redis.set('maintenance_mode', 'true');
```

**2. Backup Database**

```bash
pg_dump -h $DB_HOST -U $DB_USER $DB_NAME > backup_$(date +%Y%m%d_%H%M%S).sql
```

**3. Apply Migration**

```bash
# Dry run (check what will be applied)
npx prisma migrate status

# Apply migration
npx prisma migrate deploy
```

**4. Verify Migration**

```bash
# Check migration status
npx prisma migrate status

# Verify schema matches
npx prisma db pull
npx prisma format
git diff prisma/schema.prisma # Should be empty
```

**5. Deploy Application**

```bash
# Deploy new application version
vercel --prod
```

**6. Disable Maintenance Mode**

```typescript
await redis.del('maintenance_mode');
```

**7. Monitor**

- Check error rates
- Monitor query performance
- Verify critical workflows
- Watch for anomalies

### Post-Deployment Checklist

- [ ] Migration applied successfully
- [ ] Application deployed
- [ ] No errors in logs
- [ ] Critical workflows tested
- [ ] Performance metrics normal
- [ ] Team notified of completion

---

## Migration Best Practices

### 1. Small, Incremental Changes

**❌ Bad: Large migration**
```sql
-- Too many changes at once
ALTER TABLE "goals" 
ADD COLUMN "description" VARCHAR(500),
ADD COLUMN "isFeasible" BOOLEAN DEFAULT true,
ADD COLUMN "feasibilityScore" SMALLINT DEFAULT 100,
DROP COLUMN "oldField",
RENAME COLUMN "amount" TO "targetAmount";
```

**✅ Good: Multiple small migrations**
```sql
-- Migration 1: Add description
ALTER TABLE "goals" ADD COLUMN "description" VARCHAR(500);

-- Migration 2: Add feasibility
ALTER TABLE "goals" 
ADD COLUMN "isFeasible" BOOLEAN DEFAULT true,
ADD COLUMN "feasibilityScore" SMALLINT DEFAULT 100;

-- Migration 3: Rename column (expand-contract pattern)
-- ... separate migrations
```

### 2. Always Add Defaults for NOT NULL

**❌ Bad: No default**
```sql
ALTER TABLE "goals" 
ADD COLUMN "priority" VARCHAR(10) NOT NULL;
-- ERROR: column "priority" contains null values
```

**✅ Good: With default**
```sql
ALTER TABLE "goals" 
ADD COLUMN "priority" VARCHAR(10) NOT NULL DEFAULT 'MEDIUM';
```

### 3. Use Transactions

Prisma Migrate automatically wraps migrations in transactions, but for custom SQL:

```sql
BEGIN;

ALTER TABLE "goals" ADD COLUMN "newField" TEXT;
UPDATE "goals" SET "newField" = 'default';
ALTER TABLE "goals" ALTER COLUMN "newField" SET NOT NULL;

COMMIT;
```

### 4. Test on Staging First

**Never apply untested migrations to production.**

```bash
# Staging
npx prisma migrate deploy

# Test application
# Verify data integrity
# Check performance

# Production (only after staging success)
npx prisma migrate deploy
```

### 5. Document Breaking Changes

```sql
-- Migration: rename_goal_amount_to_target_amount
-- BREAKING CHANGE: Column "amount" renamed to "targetAmount"
-- Application must be updated before applying this migration

ALTER TABLE "goals" 
RENAME COLUMN "amount" TO "targetAmount";
```

---

## Common Migration Scenarios

### Scenario 1: Add New Entity

**Prisma Schema:**
```prisma
model GoalMilestone {
  id          String   @id @default(cuid())
  goalId      String
  name        String
  targetAmount Decimal @db.Decimal(12, 2)
  targetDate  DateTime
  isCompleted Boolean  @default(false)
  completedAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  goal Goal @relation(fields: [goalId], references: [id], onDelete: Cascade)
  
  @@index([goalId])
}
```

**Migration:**
```bash
npx prisma migrate dev --name add_goal_milestones
```

### Scenario 2: Add Soft Delete

**Prisma Schema:**
```prisma
model Goal {
  // ... existing fields
  deletedAt DateTime?
  
  @@index([deletedAt])
}
```

**Migration:**
```bash
npx prisma migrate dev --name add_soft_delete_to_goals
```

### Scenario 3: Add Encryption Support

**Prisma Schema:**
```prisma
model FinancialProfile {
  // Change Decimal to String for encrypted storage
  monthlyIncome String // Was: Decimal @db.Decimal(12, 2)
}
```

**Migration (manual):**
```sql
-- Step 1: Add new column
ALTER TABLE "financial_profiles" 
ADD COLUMN "monthlyIncome_encrypted" TEXT;

-- Step 2: Migrate data (application code)
-- Encrypt existing values and populate new column

-- Step 3: Drop old column
ALTER TABLE "financial_profiles" 
DROP COLUMN "monthlyIncome";

-- Step 4: Rename new column
ALTER TABLE "financial_profiles" 
RENAME COLUMN "monthlyIncome_encrypted" TO "monthlyIncome";
```

### Scenario 4: Add Composite Unique Constraint

**Prisma Schema:**
```prisma
model Allocation {
  // ... fields
  
  @@unique([userId, month, year])
}
```

**Migration:**
```bash
npx prisma migrate dev --name add_unique_constraint_to_allocation
```

---

## Troubleshooting

### Migration Failed

**Error:** Migration failed to apply

**Solution:**
```bash
# Check migration status
npx prisma migrate status

# Mark as rolled back
npx prisma migrate resolve --rolled-back MIGRATION_NAME

# Fix migration SQL
# Reapply
npx prisma migrate deploy
```

### Schema Drift

**Error:** Schema drift detected

**Solution:**
```bash
# Pull current database schema
npx prisma db pull

# Compare with schema.prisma
git diff prisma/schema.prisma

# Create migration to align
npx prisma migrate dev --name fix_schema_drift
```

### Migration Out of Sync

**Error:** Migrations out of sync

**Solution:**
```bash
# Reset development database
npx prisma migrate reset

# Reapply all migrations
npx prisma migrate deploy
```

---

## Summary

### Migration Workflow

1. **Modify schema** - Update `schema.prisma`
2. **Create migration** - `npx prisma migrate dev`
3. **Review SQL** - Check generated migration
4. **Test** - Verify on staging
5. **Deploy** - Apply to production
6. **Monitor** - Watch for issues

### Best Practices

✅ **Small migrations** - One change at a time  
✅ **Always test** - Staging before production  
✅ **Backup first** - Before every production migration  
✅ **Use defaults** - For NOT NULL columns  
✅ **Document** - Breaking changes and rollback plans  
✅ **Monitor** - After deployment  

### Key Commands

```bash
# Development
npx prisma migrate dev --name MIGRATION_NAME
npx prisma migrate reset

# Production
npx prisma migrate deploy
npx prisma migrate status

# Troubleshooting
npx prisma migrate resolve --rolled-back MIGRATION_NAME
npx prisma db pull
```

---

## Conclusion

This migration strategy provides:
- ✅ Clear workflow for development and production
- ✅ Naming conventions for consistency
- ✅ Rollback procedures for safety
- ✅ Best practices for reliability
- ✅ Troubleshooting guides

**Status:** Ready for implementation

**Next Steps:**
1. Set up Prisma Migrate
2. Create initial migration
3. Test migration workflow
4. Document team procedures
5. Establish production deployment process

---

**Document Version:** 1.0  
**Last Updated:** June 30, 2026  
**Next Review:** After first production migration
