# Seeding Strategy

**Package:** `@sage/database`  
**Purpose:** Database seeding specifications for development and testing  
**Date:** June 30, 2026  
**Status:** Design Phase - Documentation Only

---

## Overview

This document defines the seeding strategy for Sage's database, providing realistic test data for local development, demo accounts, and automated testing.

**Core Principle:** Seed data should be realistic, consistent, and easy to reset.

---

## Seed Data Categories

### 1. Development Seeds

**Purpose:** Local development and manual testing

**Characteristics:**
- Realistic user scenarios
- Multiple user profiles
- Various financial situations
- Edge cases covered

**Users:**
- Conservative saver
- Aggressive investor
- Debt-heavy user
- High-income professional
- Budget-conscious family

### 2. Demo Seeds

**Purpose:** Product demos and screenshots

**Characteristics:**
- Perfect data (no errors)
- Visually appealing numbers
- Complete profiles
- Active goals and allocations

**Users:**
- Demo user with ideal financial health
- Showcase all features

### 3. Test Seeds

**Purpose:** Automated testing

**Characteristics:**
- Minimal data
- Specific test scenarios
- Isolated test cases
- Easy to clean up

---

## Seed Implementation

### Prisma Seed Script

**Location:** `prisma/seed.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');
  
  // Clear existing data
  await clearDatabase();
  
  // Seed users
  await seedUsers();
  
  // Seed financial profiles
  await seedFinancialProfiles();
  
  // Seed goals
  await seedGoals();
  
  // Seed expenses
  await seedExpenses();
  
  // Seed debts
  await seedDebts();
  
  // Seed allocations
  await seedAllocations();
  
  console.log('✅ Database seeded successfully!');
}

async function clearDatabase() {
  console.log('🗑️  Clearing existing data...');
  
  // Order matters (foreign keys)
  await prisma.debtPayment.deleteMany();
  await prisma.debt.deleteMany();
  await prisma.goalMilestone.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.allocation.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.simulation.deleteMany();
  await prisma.financialProfile.deleteMany();
  await prisma.user.deleteMany();
  
  console.log('✅ Database cleared');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### Package.json Script

```json
{
  "scripts": {
    "db:seed": "tsx prisma/seed.ts",
    "db:reset": "npx prisma migrate reset --skip-seed && npm run db:seed"
  },
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

---

## Seed Data Specifications

### User 1: Conservative Saver (Aarav)

**Profile:**
- Age: 28
- Occupation: Software Engineer
- Income: ₹80,000/month
- Risk Tolerance: CONSERVATIVE
- Primary Goal: Emergency Fund

**Financial Profile:**
```typescript
{
  monthlyIncome: 80000,
  otherIncome: 0,
  incomeFrequency: 'MONTHLY',
  currentSavings: 150000,
  emergencyFundTarget: 240000, // 3 months expenses
  currentEmergencyFund: 150000,
  primaryGoal: 'Build emergency fund',
  riskTolerance: 'CONSERVATIVE',
  cfoUnderstandingScore: 85
}
```

**Goals:**
1. Emergency Fund - ₹240,000 (62.5% complete)
2. House Down Payment - ₹1,000,000 (5 years)

**Expenses:**
- Rent: ₹25,000 (MONTHLY, Essential)
- Groceries: ₹8,000 (MONTHLY, Essential)
- Utilities: ₹3,000 (MONTHLY, Essential)
- Transportation: ₹5,000 (MONTHLY, Essential)
- Entertainment: ₹5,000 (MONTHLY, Non-essential)

**Debts:**
- None

**Allocation:**
- Essential Expenses: ₹41,000
- Emergency Fund: ₹15,000
- Goal Savings: ₹15,000
- Investments: ₹5,000
- Discretionary: ₹4,000

---

### User 2: Aggressive Investor (Priya)

**Profile:**
- Age: 32
- Occupation: Marketing Manager
- Income: ₹150,000/month
- Risk Tolerance: AGGRESSIVE
- Primary Goal: Retirement

**Financial Profile:**
```typescript
{
  monthlyIncome: 150000,
  otherIncome: 20000, // Freelance
  incomeFrequency: 'MONTHLY',
  currentSavings: 500000,
  emergencyFundTarget: 300000,
  currentEmergencyFund: 300000,
  primaryGoal: 'Early retirement',
  riskTolerance: 'AGGRESSIVE',
  cfoUnderstandingScore: 95
}
```

**Goals:**
1. Emergency Fund - ₹300,000 (COMPLETED)
2. Retirement - ₹50,000,000 (20 years)
3. Vacation - ₹200,000 (1 year)

**Expenses:**
- Rent: ₹40,000 (MONTHLY, Essential)
- Groceries: ₹12,000 (MONTHLY, Essential)
- Utilities: ₹5,000 (MONTHLY, Essential)
- Transportation: ₹8,000 (MONTHLY, Essential)
- Dining: ₹15,000 (MONTHLY, Non-essential)
- Gym: ₹3,000 (MONTHLY, Non-essential)

**Debts:**
- None

**Allocation:**
- Essential Expenses: ₹65,000
- Goal Savings: ₹40,000
- Investments: ₹50,000
- Discretionary: ₹15,000

---

### User 3: Debt-Heavy (Rohan)

**Profile:**
- Age: 35
- Occupation: Business Owner
- Income: ₹120,000/month
- Risk Tolerance: MODERATE
- Primary Goal: Debt Payoff

**Financial Profile:**
```typescript
{
  monthlyIncome: 120000,
  otherIncome: 0,
  incomeFrequency: 'MONTHLY',
  currentSavings: 50000,
  emergencyFundTarget: 200000,
  currentEmergencyFund: 50000,
  primaryGoal: 'Pay off debts',
  riskTolerance: 'MODERATE',
  cfoUnderstandingScore: 70
}
```

**Goals:**
1. Emergency Fund - ₹200,000 (25% complete)
2. Debt Freedom - ₹500,000 (2 years)

**Expenses:**
- Rent: ₹30,000 (MONTHLY, Essential)
- Groceries: ₹10,000 (MONTHLY, Essential)
- Utilities: ₹4,000 (MONTHLY, Essential)
- Transportation: ₹6,000 (MONTHLY, Essential)

**Debts:**
1. Personal Loan - ₹300,000 balance, ₹15,000/month, 12% interest
2. Credit Card - ₹50,000 balance, ₹5,000/month, 18% interest
3. Car Loan - ₹200,000 balance, ₹10,000/month, 10% interest

**Allocation:**
- Essential Expenses: ₹50,000
- Debt Payments: ₹30,000
- Emergency Fund: ₹10,000
- Goal Savings: ₹15,000
- Discretionary: ₹15,000

---

### User 4: High-Income Professional (Ananya)

**Profile:**
- Age: 40
- Occupation: Senior Executive
- Income: ₹300,000/month
- Risk Tolerance: AGGRESSIVE
- Primary Goal: Multiple Goals

**Financial Profile:**
```typescript
{
  monthlyIncome: 300000,
  otherIncome: 50000, // Consulting
  incomeFrequency: 'MONTHLY',
  currentSavings: 2000000,
  emergencyFundTarget: 500000,
  currentEmergencyFund: 500000,
  primaryGoal: 'Wealth accumulation',
  riskTolerance: 'AGGRESSIVE',
  cfoUnderstandingScore: 100
}
```

**Goals:**
1. Emergency Fund - ₹500,000 (COMPLETED)
2. House Purchase - ₹5,000,000 (3 years)
3. Children's Education - ₹3,000,000 (10 years)
4. Retirement - ₹100,000,000 (15 years)

**Expenses:**
- Rent: ₹60,000 (MONTHLY, Essential)
- Groceries: ₹20,000 (MONTHLY, Essential)
- Utilities: ₹8,000 (MONTHLY, Essential)
- Transportation: ₹15,000 (MONTHLY, Essential)
- Education: ₹30,000 (MONTHLY, Essential)
- Dining: ₹25,000 (MONTHLY, Non-essential)
- Entertainment: ₹20,000 (MONTHLY, Non-essential)

**Debts:**
- None

**Allocation:**
- Essential Expenses: ₹133,000
- Goal Savings: ₹100,000
- Investments: ₹80,000
- Discretionary: ₹37,000

---

### User 5: Budget-Conscious Family (Vikram)

**Profile:**
- Age: 30
- Occupation: Teacher
- Income: ₹50,000/month
- Risk Tolerance: CONSERVATIVE
- Primary Goal: Family Security

**Financial Profile:**
```typescript
{
  monthlyIncome: 50000,
  otherIncome: 5000, // Tuition
  incomeFrequency: 'MONTHLY',
  currentSavings: 80000,
  emergencyFundTarget: 150000,
  currentEmergencyFund: 80000,
  primaryGoal: 'Family security',
  riskTolerance: 'CONSERVATIVE',
  cfoUnderstandingScore: 75
}
```

**Goals:**
1. Emergency Fund - ₹150,000 (53% complete)
2. Children's Education - ₹500,000 (8 years)

**Expenses:**
- Rent: ₹15,000 (MONTHLY, Essential)
- Groceries: ₹10,000 (MONTHLY, Essential)
- Utilities: ₹3,000 (MONTHLY, Essential)
- Transportation: ₹3,000 (MONTHLY, Essential)
- Healthcare: ₹2,000 (MONTHLY, Essential)
- Education: ₹5,000 (MONTHLY, Essential)

**Debts:**
- Education Loan - ₹100,000 balance, ₹3,000/month, 8% interest

**Allocation:**
- Essential Expenses: ₹38,000
- Debt Payments: ₹3,000
- Emergency Fund: ₹5,000
- Goal Savings: ₹5,000
- Discretionary: ₹4,000

---

## Seed Implementation Code

### Seed Users

```typescript
async function seedUsers() {
  console.log('👤 Seeding users...');
  
  const users = [
    {
      id: 'user_aarav',
      clerkId: 'clerk_aarav',
      email: 'aarav@example.com',
      firstName: 'Aarav',
      lastName: 'Sharma',
      imageUrl: 'https://i.pravatar.cc/150?u=aarav'
    },
    {
      id: 'user_priya',
      clerkId: 'clerk_priya',
      email: 'priya@example.com',
      firstName: 'Priya',
      lastName: 'Patel',
      imageUrl: 'https://i.pravatar.cc/150?u=priya'
    },
    {
      id: 'user_rohan',
      clerkId: 'clerk_rohan',
      email: 'rohan@example.com',
      firstName: 'Rohan',
      lastName: 'Kumar',
      imageUrl: 'https://i.pravatar.cc/150?u=rohan'
    },
    {
      id: 'user_ananya',
      clerkId: 'clerk_ananya',
      email: 'ananya@example.com',
      firstName: 'Ananya',
      lastName: 'Singh',
      imageUrl: 'https://i.pravatar.cc/150?u=ananya'
    },
    {
      id: 'user_vikram',
      clerkId: 'clerk_vikram',
      email: 'vikram@example.com',
      firstName: 'Vikram',
      lastName: 'Reddy',
      imageUrl: 'https://i.pravatar.cc/150?u=vikram'
    }
  ];
  
  for (const user of users) {
    await prisma.user.create({ data: user });
  }
  
  console.log(`✅ Created ${users.length} users`);
}
```

### Seed Financial Profiles

```typescript
async function seedFinancialProfiles() {
  console.log('💰 Seeding financial profiles...');
  
  const profiles = [
    {
      userId: 'user_aarav',
      monthlyIncome: new Prisma.Decimal(80000),
      otherIncome: new Prisma.Decimal(0),
      incomeFrequency: 'MONTHLY',
      currentSavings: new Prisma.Decimal(150000),
      emergencyFundTarget: new Prisma.Decimal(240000),
      currentEmergencyFund: new Prisma.Decimal(150000),
      primaryGoal: 'Build emergency fund',
      riskTolerance: 'CONSERVATIVE',
      cfoUnderstandingScore: 85
    },
    // ... other profiles
  ];
  
  for (const profile of profiles) {
    await prisma.financialProfile.create({ data: profile });
  }
  
  console.log(`✅ Created ${profiles.length} financial profiles`);
}
```

### Seed Goals

```typescript
async function seedGoals() {
  console.log('🎯 Seeding goals...');
  
  const goals = [
    {
      userId: 'user_aarav',
      name: 'Emergency Fund',
      type: 'EMERGENCY_FUND',
      targetAmount: new Prisma.Decimal(240000),
      currentAmount: new Prisma.Decimal(150000),
      targetDate: new Date('2025-06-30'),
      priority: 'HIGH',
      status: 'ACTIVE',
      isFeasible: true,
      feasibilityScore: 90
    },
    {
      userId: 'user_aarav',
      name: 'House Down Payment',
      type: 'HOUSE',
      targetAmount: new Prisma.Decimal(1000000),
      currentAmount: new Prisma.Decimal(0),
      targetDate: new Date('2029-12-31'),
      priority: 'MEDIUM',
      status: 'ACTIVE',
      isFeasible: true,
      feasibilityScore: 75
    },
    // ... other goals
  ];
  
  for (const goal of goals) {
    await prisma.goal.create({ data: goal });
  }
  
  console.log(`✅ Created ${goals.length} goals`);
}
```

---

## Running Seeds

### Development

```bash
# Seed database
npm run db:seed

# Reset and seed
npm run db:reset
```

### Testing

```bash
# Before tests
beforeAll(async () => {
  await seedTestData();
});

# After tests
afterAll(async () => {
  await clearTestData();
});
```

---

## Seed Data Best Practices

### 1. Realistic Data

Use realistic values that represent actual user scenarios:
- ✅ Income: ₹50,000 - ₹300,000
- ✅ Savings: ₹50,000 - ₹2,000,000
- ✅ Goals: ₹100,000 - ₹100,000,000
- ❌ Avoid: ₹1, ₹999,999,999

### 2. Consistent IDs

Use predictable IDs for easy testing:
```typescript
userId: 'user_aarav'  // Not: 'clkj234lkj23'
goalId: 'goal_aarav_emergency'  // Not: 'g_123'
```

### 3. Cover Edge Cases

Include scenarios for:
- Zero income
- High debt-to-income ratio
- Infeasible goals
- Completed goals
- Paused goals
- Multiple debts

### 4. Idempotent Seeds

Seeds should be safe to run multiple times:
```typescript
// Clear before seeding
await clearDatabase();

// Or use upsert
await prisma.user.upsert({
  where: { email: 'aarav@example.com' },
  update: {},
  create: { /* user data */ }
});
```

---

## Summary

### Seed Users: 5

1. Aarav - Conservative Saver
2. Priya - Aggressive Investor
3. Rohan - Debt-Heavy
4. Ananya - High-Income Professional
5. Vikram - Budget-Conscious Family

### Seed Data Coverage

- ✅ All user profiles
- ✅ All goal types
- ✅ All expense categories
- ✅ All debt types
- ✅ Various financial situations
- ✅ Edge cases

### Commands

```bash
# Seed database
npm run db:seed

# Reset and seed
npm run db:reset

# Prisma migrate with seed
npx prisma migrate reset
```

---

## Conclusion

This seeding strategy provides:
- ✅ Realistic test data for development
- ✅ Multiple user scenarios
- ✅ Edge case coverage
- ✅ Easy to reset and regenerate
- ✅ Consistent and predictable

**Status:** Ready for implementation

**Next Steps:**
1. Implement seed script
2. Create seed data for all entities
3. Test seed script
4. Document seed users
5. Add to development workflow

---

**Document Version:** 1.0  
**Last Updated:** June 30, 2026  
**Next Review:** After seed implementation
