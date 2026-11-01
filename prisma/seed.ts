import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create test user
  const testUser = await prisma.user.upsert({
    where: { email: 'test@sage.app' },
    update: {},
    create: {
      clerkId: 'test_user_1',
      email: 'test@sage.app',
      firstName: 'Test',
      lastName: 'User',
      profile: {
        create: {
          monthlyIncome: 80000,
          currentSavings: 100000,
          emergencyFundTarget: 240000,
          currentEmergencyFund: 50000,
          primaryGoal: 'house',
          riskTolerance: 'MODERATE',
          cfoUnderstandingScore: 65,
        },
      },
    },
  });

  console.log('✅ Created test user:', testUser.email);

  // Create test goals
  const houseGoal = await prisma.goal.create({
    data: {
      userId: testUser.id,
      name: 'House Down Payment',
      description: 'Save for 20% down payment on a house',
      type: 'HOUSE',
      targetAmount: 500000,
      currentAmount: 100000,
      monthlyContribution: 15000,
      targetDate: new Date('2028-01-01'),
      priority: 'HIGH',
      status: 'ACTIVE',
      isFeasible: true,
      feasibilityScore: 85,
    },
  });

  const carGoal = await prisma.goal.create({
    data: {
      userId: testUser.id,
      name: 'Car Purchase',
      description: 'Buy a new car',
      type: 'CAR',
      targetAmount: 200000,
      currentAmount: 0,
      monthlyContribution: 10000,
      targetDate: new Date('2027-06-01'),
      priority: 'MEDIUM',
      status: 'ACTIVE',
      isFeasible: true,
      feasibilityScore: 90,
    },
  });

  console.log('✅ Created test goals');

  // Create goal milestones
  await prisma.goalMilestone.createMany({
    data: [
      {
        goalId: houseGoal.id,
        name: '25% Progress',
        targetAmount: 125000,
        targetDate: new Date('2026-12-01'),
        isCompleted: true,
        completedDate: new Date('2026-11-15'),
      },
      {
        goalId: houseGoal.id,
        name: '50% Progress',
        targetAmount: 250000,
        targetDate: new Date('2027-06-01'),
        isCompleted: false,
      },
      {
        goalId: houseGoal.id,
        name: '75% Progress',
        targetAmount: 375000,
        targetDate: new Date('2027-09-01'),
        isCompleted: false,
      },
    ],
  });

  console.log('✅ Created goal milestones');

  // Create test expenses
  await prisma.expense.createMany({
    data: [
      {
        userId: testUser.id,
        name: 'Rent',
        amount: 25000,
        category: 'RENT',
        frequency: 'MONTHLY',
        isEssential: true,
        isActive: true,
      },
      {
        userId: testUser.id,
        name: 'Groceries',
        amount: 8000,
        category: 'GROCERIES',
        frequency: 'MONTHLY',
        isEssential: true,
        isActive: true,
      },
      {
        userId: testUser.id,
        name: 'Transportation',
        amount: 5000,
        category: 'TRANSPORTATION',
        frequency: 'MONTHLY',
        isEssential: true,
        isActive: true,
      },
      {
        userId: testUser.id,
        name: 'Entertainment',
        amount: 3000,
        category: 'ENTERTAINMENT',
        frequency: 'MONTHLY',
        isEssential: false,
        isActive: true,
      },
    ],
  });

  console.log('✅ Created test expenses');

  // Create test debt
  const homeLoan = await prisma.debt.create({
    data: {
      userId: testUser.id,
      name: 'Home Loan',
      type: 'HOME_LOAN',
      principalAmount: 2000000,
      currentBalance: 1500000,
      interestRate: 8.5,
      monthlyPayment: 15000,
      minimumPayment: 15000,
      startDate: new Date('2020-01-01'),
      status: 'ACTIVE',
    },
  });

  console.log('✅ Created test debt');

  // Create test assets
  await prisma.asset.createMany({
    data: [
      {
        userId: testUser.id,
        name: 'Savings Account',
        type: 'SAVINGS_ACCOUNT',
        currentValue: 100000,
        isLiquid: true,
      },
      {
        userId: testUser.id,
        name: 'Mutual Funds',
        type: 'MUTUAL_FUNDS',
        currentValue: 150000,
        purchaseValue: 120000,
        purchaseDate: new Date('2023-01-01'),
        expectedReturn: 12,
        isLiquid: true,
      },
      {
        userId: testUser.id,
        name: 'PPF',
        type: 'PPF',
        currentValue: 80000,
        purchaseValue: 70000,
        purchaseDate: new Date('2022-04-01'),
        expectedReturn: 7.1,
        isLiquid: false,
      },
    ],
  });

  console.log('✅ Created test assets');

  // Create test allocation
  await prisma.allocation.create({
    data: {
      userId: testUser.id,
      month: 6,
      year: 2026,
      essentialExpenses: 38000,
      debtPayments: 15000,
      emergencyFund: 5000,
      goalSavings: 15000,
      investments: 5000,
      discretionary: 2000,
      totalIncome: 80000,
      totalAllocated: 80000,
      isActive: true,
    },
  });

  console.log('✅ Created test allocation');

  // Create test conversation
  const conversation = await prisma.conversation.create({
    data: {
      userId: testUser.id,
      title: 'First Conversation',
      messages: {
        create: [
          {
            role: 'USER',
            content: 'Can I afford a ₹50,000 laptop?',
          },
          {
            role: 'ASSISTANT',
            content:
              'Based on your ₹80,000 monthly income and ₹60,000 expenses, you have ₹20,000 surplus. You can afford the laptop, but I recommend saving for 3 months instead of buying from your emergency fund.',
            metadata: {
              calculationType: 'affordability',
              purchaseAmount: 50000,
            },
          },
        ],
      },
    },
  });

  console.log('✅ Created test conversation');

  // Create test simulation
  await prisma.simulation.create({
    data: {
      userId: testUser.id,
      type: 'PURCHASE_AFFORDABILITY',
      title: 'Laptop Purchase Simulation',
      description: 'Checking affordability of ₹50,000 laptop',
      parameters: {
        purchaseAmount: 50000,
        item: 'laptop',
      },
      results: {
        canAfford: true,
        confidence: 85,
        recommendedApproach: 'save-first',
        timeline: 3,
        impact: {
          emergencyFund: -50000,
          goals: [],
        },
      },
    },
  });

  console.log('✅ Created test simulation');

  console.log('🎉 Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
