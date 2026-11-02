import type { Result } from '@sage/database';

// ============================================================================
// MEMORY USER REPOSITORY
// ============================================================================

export class MemoryUserRepository {
  private users: Map<string, any> = new Map();

  constructor() {
    const demo = {
      id: 'user_sage_demo_001',
      clerkId: 'user_sage_demo_001',
      email: 'akhil@sage.app',
      firstName: 'Akhil',
      lastName: 'Sharma',
      imageUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };
    this.users.set(demo.id, demo);
  }

  async findById(id: string): Promise<Result<any>> {
    return { success: true, data: this.users.get(id) ?? null };
  }
  async findByClerkId(clerkId: string): Promise<Result<any>> {
    for (const u of this.users.values()) {
      if (u.clerkId === clerkId) return { success: true, data: u };
    }
    return { success: true, data: null };
  }
  async findByEmail(email: string): Promise<Result<any>> {
    for (const u of this.users.values()) {
      if (u.email === email) return { success: true, data: u };
    }
    return { success: true, data: null };
  }
  async isEmailTaken(email: string): Promise<Result<boolean>> {
    const found = Array.from(this.users.values()).some((u) => u.email === email);
    return { success: true, data: found };
  }
  async isClerkIdTaken(clerkId: string): Promise<Result<boolean>> {
    const found = Array.from(this.users.values()).some((u) => u.clerkId === clerkId);
    return { success: true, data: found };
  }
  async create(data: any): Promise<Result<any>> {
    const user = {
      id: data.id ?? `user_${Date.now()}`,
      clerkId: data.clerkId,
      email: data.email,
      firstName: data.firstName ?? 'Sage',
      lastName: data.lastName ?? 'User',
      imageUrl: data.imageUrl ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };
    this.users.set(user.id, user);
    return { success: true, data: user };
  }
  async update(id: string, data: any): Promise<Result<any>> {
    const u = this.users.get(id);
    if (!u) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } as any };
    }
    const updated = { ...u, ...data, updatedAt: new Date() };
    this.users.set(id, updated);
    return { success: true, data: updated };
  }
  async softDelete(id: string): Promise<Result<any>> {
    const u = this.users.get(id);
    if (!u) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } as any };
    }
    u.deletedAt = new Date();
    return { success: true, data: u };
  }
  async restore(id: string): Promise<Result<any>> {
    const u = this.users.get(id);
    if (!u) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } as any };
    }
    u.deletedAt = null;
    return { success: true, data: u };
  }
  async findMany(): Promise<Result<any>> {
    return {
      success: true,
      data: {
        data: Array.from(this.users.values()),
        total: this.users.size,
        page: 1,
        pageSize: 50,
        totalPages: 1,
      },
    };
  }
}

// ============================================================================
// MEMORY FINANCIAL PROFILE REPOSITORY
// ============================================================================

export class MemoryFinancialProfileRepository {
  private profiles: Map<string, any> = new Map();

  constructor() {
    const demoProfile = {
      id: 'profile_001',
      userId: 'user_sage_demo_001',
      monthlyIncome: 80000,
      otherIncome: 0,
      currency: 'INR',
      riskTolerance: 'MODERATE',
      currentSavings: 200000,
      currentEmergencyFund: 150000,
      emergencyFundTarget: 240000,
      cfoUnderstandingScore: 82,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.profiles.set(demoProfile.userId, demoProfile);
  }

  async findByUserId(userId: string): Promise<Result<any>> {
    return { success: true, data: this.profiles.get(userId) ?? null };
  }
  async findById(id: string): Promise<Result<any>> {
    for (const p of this.profiles.values()) {
      if (p.id === id) return { success: true, data: p };
    }
    return { success: true, data: null };
  }
  async create(data: any): Promise<Result<any>> {
    return this.upsert(data.userId, data);
  }
  async update(id: string, data: any): Promise<Result<any>> {
    for (const [uid, p] of this.profiles.entries()) {
      if (p.id === id) return this.upsert(uid, data);
    }
    return { success: false, error: { code: 'NOT_FOUND', message: 'Profile not found' } as any };
  }
  async updateByUserId(userId: string, data: any): Promise<Result<any>> {
    return this.upsert(userId, data);
  }
  async upsert(userId: string, data: any): Promise<Result<any>> {
    const existing = this.profiles.get(userId);
    const updated = {
      id: existing?.id ?? `prof_${Date.now()}`,
      userId,
      monthlyIncome: Number(data.monthlyIncome ?? existing?.monthlyIncome ?? 0),
      otherIncome: Number(data.otherIncome ?? existing?.otherIncome ?? 0),
      currency: data.currency ?? existing?.currency ?? 'INR',
      riskTolerance: data.riskTolerance ?? existing?.riskTolerance ?? 'MODERATE',
      currentSavings: Number(data.currentSavings ?? existing?.currentSavings ?? 0),
      currentEmergencyFund: Number(data.currentEmergencyFund ?? existing?.currentEmergencyFund ?? 0),
      emergencyFundTarget: Number(data.emergencyFundTarget ?? existing?.emergencyFundTarget ?? 0),
      cfoUnderstandingScore: data.cfoUnderstandingScore ?? existing?.cfoUnderstandingScore ?? 75,
      createdAt: existing?.createdAt ?? new Date(),
      updatedAt: new Date(),
    };
    this.profiles.set(userId, updated);
    return { success: true, data: updated };
  }
}

// ============================================================================
// MEMORY GOAL REPOSITORY
// ============================================================================

export class MemoryGoalRepository {
  private goals: Map<string, any> = new Map();

  constructor() {
    const initialGoals = [
      {
        id: 'goal_001',
        userId: 'user_sage_demo_001',
        name: 'House Down Payment',
        description: '3BHK apartment down payment in Bengaluru',
        type: 'HOUSE',
        category: 'HOUSING',
        targetAmount: 2500000,
        currentAmount: 750000,
        monthlyContribution: 45000,
        targetDate: new Date('2028-12-31'),
        priority: 'HIGH',
        status: 'ACTIVE',
        feasibilityScore: 82,
        completedDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
      {
        id: 'goal_002',
        userId: 'user_sage_demo_001',
        name: 'Electric SUV',
        description: 'EV purchase with 40% down payment',
        type: 'CAR',
        category: 'VEHICLE',
        targetAmount: 800000,
        currentAmount: 320000,
        monthlyContribution: 20000,
        targetDate: new Date('2027-06-30'),
        priority: 'MEDIUM',
        status: 'ACTIVE',
        feasibilityScore: 78,
        completedDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
      {
        id: 'goal_003',
        userId: 'user_sage_demo_001',
        name: 'Japan Vacation',
        description: 'Autumn cherry blossom trip',
        type: 'VACATION',
        category: 'VACATION',
        targetAmount: 350000,
        currentAmount: 140000,
        monthlyContribution: 15000,
        targetDate: new Date('2026-10-31'),
        priority: 'LOW',
        status: 'ACTIVE',
        feasibilityScore: 90,
        completedDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
    ];
    for (const g of initialGoals) {
      this.goals.set(g.id, g);
    }
  }

  async findById(id: string): Promise<Result<any>> {
    return { success: true, data: this.goals.get(id) ?? null };
  }
  async findByUserId(userId: string): Promise<Result<any[]>> {
    const list = Array.from(this.goals.values()).filter((g) => g.userId === userId && !g.deletedAt);
    return { success: true, data: list };
  }
  async findActiveByUserId(userId: string): Promise<Result<any[]>> {
    const list = Array.from(this.goals.values()).filter(
      (g) => g.userId === userId && !g.deletedAt && g.status !== 'COMPLETED'
    );
    return { success: true, data: list };
  }
  async findByType(userId: string, type: string): Promise<Result<any[]>> {
    const list = Array.from(this.goals.values()).filter(
      (g) => g.userId === userId && !g.deletedAt && g.type === type
    );
    return { success: true, data: list };
  }
  async findEmergencyFundGoal(userId: string): Promise<Result<any>> {
    const goal = Array.from(this.goals.values()).find(
      (g) => g.userId === userId && !g.deletedAt && (g.type === 'EMERGENCY_FUND' || g.category === 'EMERGENCY_FUND')
    );
    return { success: true, data: goal ?? null };
  }
  async countActiveGoals(userId: string): Promise<Result<number>> {
    const list = Array.from(this.goals.values()).filter(
      (g) => g.userId === userId && !g.deletedAt && g.status !== 'COMPLETED'
    );
    return { success: true, data: list.length };
  }
  async create(data: any): Promise<Result<any>> {
    const goal = {
      id: `goal_${Date.now()}`,
      userId: data.userId,
      name: data.name,
      description: data.description ?? null,
      type: data.type ?? 'OTHER',
      category: data.category ?? data.type ?? 'OTHER',
      targetAmount: Number(data.targetAmount),
      currentAmount: Number(data.currentAmount ?? 0),
      monthlyContribution: Number(data.monthlyContribution ?? 0),
      targetDate: new Date(data.targetDate),
      priority: data.priority ?? 'MEDIUM',
      status: data.status ?? 'ACTIVE',
      feasibilityScore: 75,
      completedDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };
    this.goals.set(goal.id, goal);
    return { success: true, data: goal };
  }
  async update(id: string, data: any): Promise<Result<any>> {
    const g = this.goals.get(id);
    if (!g) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Goal not found' } as any };
    }
    const cleaned: any = {};
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) cleaned[k] = v;
    }
    if (cleaned.targetDate) cleaned.targetDate = new Date(cleaned.targetDate);
    const updated = { ...g, ...cleaned, updatedAt: new Date() };
    this.goals.set(id, updated);
    return { success: true, data: updated };
  }
  async updateProgress(id: string, currentAmount: number): Promise<Result<any>> {
    const g = this.goals.get(id);
    if (!g) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Goal not found' } as any };
    }
    g.currentAmount = currentAmount;
    g.updatedAt = new Date();
    return { success: true, data: g };
  }
  async softDelete(id: string): Promise<Result<any>> {
    const g = this.goals.get(id);
    if (!g) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Goal not found' } as any };
    }
    g.deletedAt = new Date();
    return { success: true, data: g };
  }
  async calculateTotalTarget(userId: string): Promise<Result<number>> {
    const list = Array.from(this.goals.values()).filter((g) => g.userId === userId && !g.deletedAt);
    const sum = list.reduce((acc, g) => acc + Number(g.targetAmount || 0), 0);
    return { success: true, data: sum };
  }
  async findMany(): Promise<Result<any>> {
    const list = Array.from(this.goals.values()).filter((g) => !g.deletedAt);
    return { success: true, data: { data: list, total: list.length, page: 1, pageSize: 50, totalPages: 1 } };
  }
}

// ============================================================================
// MEMORY EXPENSE REPOSITORY
// ============================================================================

export class MemoryExpenseRepository {
  private expenses: Map<string, any> = new Map();

  constructor() {
    const initialExpenses = [
      {
        id: 'exp_001',
        userId: 'user_sage_demo_001',
        amount: 28000,
        category: 'HOUSING',
        description: 'Apartment Rent',
        date: new Date(),
        isRecurring: true,
        frequency: 'MONTHLY',
        isEssential: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'exp_002',
        userId: 'user_sage_demo_001',
        amount: 8500,
        category: 'GROCERIES',
        description: 'Monthly Groceries & Essentials',
        date: new Date(),
        isRecurring: true,
        frequency: 'MONTHLY',
        isEssential: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'exp_003',
        userId: 'user_sage_demo_001',
        amount: 4000,
        category: 'UTILITIES',
        description: 'Electricity & High-speed Broadband',
        date: new Date(),
        isRecurring: true,
        frequency: 'MONTHLY',
        isEssential: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    for (const e of initialExpenses) {
      this.expenses.set(e.id, e);
    }
  }

  async findById(id: string): Promise<Result<any>> {
    return { success: true, data: this.expenses.get(id) ?? null };
  }
  async findByUserId(userId: string): Promise<Result<any[]>> {
    const list = Array.from(this.expenses.values()).filter((e) => e.userId === userId);
    return { success: true, data: list };
  }
  async findActiveByUserId(userId: string): Promise<Result<any[]>> {
    const list = Array.from(this.expenses.values()).filter((e) => e.userId === userId);
    return { success: true, data: list };
  }
  async create(data: any): Promise<Result<any>> {
    const exp = {
      id: `exp_${Date.now()}`,
      userId: data.userId,
      amount: Number(data.amount),
      category: data.category,
      description: data.description ?? null,
      date: new Date(data.date ?? new Date()),
      isRecurring: data.isRecurring ?? false,
      frequency: data.frequency ?? 'MONTHLY',
      isEssential: ['HOUSING', 'GROCERIES', 'UTILITIES', 'TRANSPORTATION', 'HEALTHCARE'].includes(data.category),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.expenses.set(exp.id, exp);
    return { success: true, data: exp };
  }
  async update(id: string, data: any): Promise<Result<any>> {
    const exp = this.expenses.get(id);
    if (!exp) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Expense not found' } as any };
    }
    const cleaned: any = {};
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) cleaned[k] = v;
    }
    const updated = { ...exp, ...cleaned, updatedAt: new Date() };
    this.expenses.set(id, updated);
    return { success: true, data: updated };
  }
  async softDelete(id: string): Promise<Result<any>> {
    const exp = this.expenses.get(id);
    if (!exp) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Expense not found' } as any };
    }
    this.expenses.delete(id);
    return { success: true, data: exp };
  }
  async calculateMonthlyTotal(userId: string): Promise<Result<number>> {
    const list = Array.from(this.expenses.values()).filter((e) => e.userId === userId);
    const sum = list.reduce((acc, e) => acc + Number(e.amount || 0), 0);
    return { success: true, data: sum };
  }
  async calculateTotalMonthly(userId: string): Promise<Result<number>> {
    return this.calculateMonthlyTotal(userId);
  }
  async calculateEssentialMonthly(userId: string): Promise<Result<number>> {
    const essentialCategories = ['HOUSING', 'GROCERIES', 'UTILITIES', 'TRANSPORTATION', 'HEALTHCARE'];
    const list = Array.from(this.expenses.values()).filter(
      (e) => e.userId === userId && essentialCategories.includes(e.category)
    );
    const sum = list.reduce((acc, e) => acc + Number(e.amount || 0), 0);
    return { success: true, data: sum };
  }
  async getExpensesByCategory(userId: string): Promise<Result<Record<string, number>>> {
    const list = Array.from(this.expenses.values()).filter((e) => e.userId === userId);
    const map: Record<string, number> = {};
    for (const e of list) {
      map[e.category] = (map[e.category] ?? 0) + Number(e.amount || 0);
    }
    return { success: true, data: map };
  }
  async findMany(): Promise<Result<any>> {
    const list = Array.from(this.expenses.values());
    return { success: true, data: { data: list, total: list.length, page: 1, pageSize: 50, totalPages: 1 } };
  }
}

// ============================================================================
// MEMORY DEBT REPOSITORY
// ============================================================================

export class MemoryDebtRepository {
  private debts: Map<string, any> = new Map();

  constructor() {
    const initialDebts = [
      {
        id: 'debt_001',
        userId: 'user_sage_demo_001',
        name: 'Auto Loan',
        type: 'CAR_LOAN',
        principalAmount: 600000,
        principal: 600000,
        currentBalance: 320000,
        remainingBalance: 320000,
        interestRate: 8.5,
        termMonths: 48,
        monthlyPayment: 14780,
        minimumPayment: 14780,
        startDate: new Date('2024-01-01'),
        payoffDate: new Date('2027-12-31'),
        status: 'ACTIVE',
        totalInterestPaid: 45000,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    for (const d of initialDebts) {
      this.debts.set(d.id, d);
    }
  }

  async findById(id: string): Promise<Result<any>> {
    return { success: true, data: this.debts.get(id) ?? null };
  }
  async findByUserId(userId: string): Promise<Result<any[]>> {
    const list = Array.from(this.debts.values()).filter((d) => d.userId === userId);
    return { success: true, data: list };
  }
  async findActiveByUserId(userId: string): Promise<Result<any[]>> {
    const list = Array.from(this.debts.values()).filter((d) => d.userId === userId && d.status === 'ACTIVE');
    return { success: true, data: list };
  }
  async create(data: any): Promise<Result<any>> {
    const debt = {
      id: `debt_${Date.now()}`,
      userId: data.userId,
      name: data.name,
      type: data.type ?? 'OTHER',
      principalAmount: Number(data.principal ?? data.principalAmount ?? 0),
      principal: Number(data.principal ?? data.principalAmount ?? 0),
      currentBalance: Number(data.currentBalance ?? data.principal ?? 0),
      remainingBalance: Number(data.currentBalance ?? data.principal ?? 0),
      interestRate: Number(data.interestRate ?? 0),
      termMonths: Number(data.termMonths ?? 12),
      monthlyPayment: Number(data.monthlyPayment ?? data.minimumPayment ?? 0),
      minimumPayment: Number(data.minimumPayment ?? data.monthlyPayment ?? 0),
      startDate: new Date(data.startDate ?? new Date()),
      payoffDate: new Date(data.payoffDate ?? new Date()),
      status: 'ACTIVE',
      totalInterestPaid: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.debts.set(debt.id, debt);
    return { success: true, data: debt };
  }
  async update(id: string, data: any): Promise<Result<any>> {
    const d = this.debts.get(id);
    if (!d) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Debt not found' } as any };
    }
    const cleaned: any = {};
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) cleaned[k] = v;
    }
    const updated = { ...d, ...cleaned, updatedAt: new Date() };
    this.debts.set(id, updated);
    return { success: true, data: updated };
  }
  async softDelete(id: string): Promise<Result<any>> {
    const d = this.debts.get(id);
    if (!d) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Debt not found' } as any };
    }
    this.debts.delete(id);
    return { success: true, data: d };
  }
  async calculateTotalBalance(userId: string): Promise<Result<number>> {
    const list = Array.from(this.debts.values()).filter((d) => d.userId === userId && d.status === 'ACTIVE');
    const sum = list.reduce((acc, d) => acc + Number(d.currentBalance || 0), 0);
    return { success: true, data: sum };
  }
  async calculateTotalMonthlyPayment(userId: string): Promise<Result<number>> {
    const list = Array.from(this.debts.values()).filter((d) => d.userId === userId && d.status === 'ACTIVE');
    const sum = list.reduce((acc, d) => acc + Number(d.monthlyPayment || 0), 0);
    return { success: true, data: sum };
  }
  async calculateTotalMonthlyPayments(userId: string): Promise<Result<number>> {
    return this.calculateTotalMonthlyPayment(userId);
  }
  async createPayment(data: any): Promise<Result<any>> {
    return {
      success: true,
      data: {
        id: `pmt_${Date.now()}`,
        debtId: data.debtId,
        amount: data.amount,
        paymentDate: new Date(),
        status: 'COMPLETED',
      },
    };
  }
  async findWithPayments(id: string): Promise<Result<any>> {
    const debt = this.debts.get(id);
    return { success: true, data: debt ? { ...debt, payments: [] } : null };
  }
  async findMany(): Promise<Result<any>> {
    const list = Array.from(this.debts.values());
    return { success: true, data: { data: list, total: list.length, page: 1, pageSize: 50, totalPages: 1 } };
  }
}

// ============================================================================
// MEMORY ALLOCATION REPOSITORY
// ============================================================================

export class MemoryAllocationRepository {
  private allocations: Map<string, any> = new Map();

  constructor() {
    const initialAllocation = {
      id: 'alloc_001',
      userId: 'user_sage_demo_001',
      month: 11,
      year: 2026,
      totalIncome: 100000,
      monthlyIncome: 100000,
      needs: 50000,
      wants: 10000,
      savings: 40000,
      essentialExpenses: 35000,
      debtPayments: 15000,
      emergencyFund: 10000,
      goalSavings: 20000,
      investments: 10000,
      discretionary: 10000,
      totalAllocated: 100000,
      isActive: true,
      breakdown: {
        fixedExpenses: 35000,
        variableExpenses: 0,
        debtPayments: 15000,
        emergencyFund: 10000,
        goalContributions: 20000,
        discretionary: 10000,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.allocations.set(`${initialAllocation.userId}_2026_11`, initialAllocation);
  }

  async findByMonth(userId: string, month: number, year: number): Promise<Result<any>> {
    return { success: true, data: this.allocations.get(`${userId}_${year}_${month}`) ?? null };
  }
  async findByUserId(userId: string): Promise<Result<any[]>> {
    const list = Array.from(this.allocations.values()).filter((a) => a.userId === userId);
    return { success: true, data: list };
  }
  async findLatest(userId: string): Promise<Result<any>> {
    const userAllocations = Array.from(this.allocations.values()).filter((a) => a.userId === userId);
    if (userAllocations.length === 0) return { success: true, data: null };
    return { success: true, data: userAllocations[userAllocations.length - 1] ?? null };
  }
  async findByYear(userId: string, year: number): Promise<Result<any[]>> {
    const list = Array.from(this.allocations.values()).filter((a) => a.userId === userId && a.year === year);
    return { success: true, data: list };
  }
  async findRecent(userId: string, limit: number = 6): Promise<Result<any[]>> {
    const list = Array.from(this.allocations.values()).filter((a) => a.userId === userId);
    return { success: true, data: list.slice(-limit) };
  }
  async upsert(data: any): Promise<Result<any>> {
    const key = `${data.userId}_${data.year}_${data.month}`;
    const alloc = {
      id: `alloc_${Date.now()}`,
      userId: data.userId,
      month: data.month,
      year: data.year,
      essentialExpenses: Number(data.essentialExpenses ?? 0),
      debtPayments: Number(data.debtPayments ?? 0),
      emergencyFund: Number(data.emergencyFund ?? 0),
      goalSavings: Number(data.goalSavings ?? 0),
      investments: Number(data.investments ?? 0),
      discretionary: Number(data.discretionary ?? 0),
      totalIncome: Number(data.totalIncome ?? 0),
      totalAllocated: Number(data.totalAllocated ?? 0),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.allocations.set(key, alloc);
    return { success: true, data: alloc };
  }
  async create(data: any): Promise<Result<any>> {
    return this.upsert(data);
  }
  async save(data: any): Promise<Result<any>> {
    return this.upsert(data);
  }
}

// ============================================================================
// MEMORY SIMULATION REPOSITORY
// ============================================================================

export class MemorySimulationRepository {
  private simulations: Map<string, any> = new Map();

  async create(data: any): Promise<Result<any>> {
    const sim = {
      id: `sim_${Date.now()}`,
      userId: data.userId,
      type: data.type,
      parameters: data.parameters,
      results: data.results,
      title: data.title ?? null,
      description: data.description ?? null,
      createdAt: new Date(),
    };
    this.simulations.set(sim.id, sim);
    return { success: true, data: sim };
  }
  async findById(id: string): Promise<Result<any>> {
    return { success: true, data: this.simulations.get(id) ?? null };
  }
  async findByUserId(userId: string): Promise<Result<any[]>> {
    const list = Array.from(this.simulations.values()).filter((s) => s.userId === userId);
    return { success: true, data: list };
  }
  async findByType(userId: string, type: any): Promise<Result<any[]>> {
    const list = Array.from(this.simulations.values()).filter((s) => s.userId === userId && s.type === type);
    return { success: true, data: list };
  }
  async findRecent(userId: string, limit: number = 5): Promise<Result<any[]>> {
    const list = Array.from(this.simulations.values()).filter((s) => s.userId === userId);
    return { success: true, data: list.slice(-limit) };
  }
  async delete(id: string): Promise<Result<boolean>> {
    this.simulations.delete(id);
    return { success: true, data: true };
  }
}
