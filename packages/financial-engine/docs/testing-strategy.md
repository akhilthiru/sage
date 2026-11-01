# Financial Engine: Testing Strategy

**Package:** `@sage/financial-engine`  
**Version:** 1.0.0  
**Status:** Testing Requirements Definition  
**Date:** 2024-12-19

---

## Overview

This document defines the comprehensive testing strategy for the Financial Engine package. Given that this package is the **source of truth** for all financial calculations, testing is critical.

**Testing Philosophy:** Test like money depends on it. Because it does.

---

## Coverage Requirements

### Critical Financial Paths (100% Coverage Required)

These functions handle money calculations and must have **perfect test coverage**:

1. `calculateEMI()` - Loan EMI calculation
2. `simulateLoan()` - Loan affordability assessment
3. `calculateAllocation()` - Income distribution
4. `projectGoalTimeline()` - Goal feasibility
5. `calculateFinancialHealth()` - Financial wellness score

**Enforcement:**
- CI/CD blocks merge if coverage < 100%
- Branch coverage required
- Statement coverage required
- Function coverage required

### Overall Package (85%+ Coverage Required)

**Target:** 85% overall coverage  
**Minimum:** 80% overall coverage

**Enforcement:**
- CI/CD warns if coverage < 85%
- CI/CD blocks if coverage < 80%

---

## Test Categories

### 1. Unit Tests

**Purpose:** Test individual functions in isolation

**Location:** Each domain owns its tests
```
src/allocation/__tests__/
src/loan/__tests__/
src/goal/__tests__/
etc.
```

**Requirements:**
- Test happy path
- Test all edge cases
- Test error conditions
- Test boundary values
- Mock external dependencies (none in our case)

**Example:**
```typescript
// src/loan/__tests__/calculate-emi.test.ts
import { describe, it, expect } from 'vitest';
import { calculateEMI } from '../calculate-emi';

describe('calculateEMI', () => {
  describe('Happy Path', () => {
    it('should calculate EMI correctly for standard loan', () => {
      const result = calculateEMI(500000, 12, 24);
      expect(result.emi).toBeCloseTo(23539.23, 2);
      expect(result.totalPayable).toBeCloseTo(564941.52, 2);
      expect(result.totalInterest).toBeCloseTo(64941.52, 2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero interest rate', () => {
      const result = calculateEMI(120000, 0, 12);
      expect(result.emi).toBe(10000);
      expect(result.totalInterest).toBe(0);
    });

    it('should handle very small principal', () => {
      const result = calculateEMI(100, 12, 12);
      expect(result.emi).toBeGreaterThan(0);
      expect(result.totalPayable).toBeGreaterThan(100);
    });

    it('should handle very long tenure', () => {
      const result = calculateEMI(1000000, 12, 360);
      expect(result.emi).toBeGreaterThan(0);
      expect(result.tenure).toBe(360);
    });
  });

  describe('Error Conditions', () => {
    it('should throw error for negative principal', () => {
      expect(() => calculateEMI(-100000, 12, 12))
        .toThrow('Principal must be positive');
    });

    it('should throw error for invalid interest rate', () => {
      expect(() => calculateEMI(100000, -5, 12))
        .toThrow('Interest rate must be between 0 and 50');
      expect(() => calculateEMI(100000, 60, 12))
        .toThrow('Interest rate must be between 0 and 50');
    });

    it('should throw error for invalid tenure', () => {
      expect(() => calculateEMI(100000, 12, 0))
        .toThrow('Tenure must be a positive integer');
      expect(() => calculateEMI(100000, 12, -12))
        .toThrow('Tenure must be a positive integer');
      expect(() => calculateEMI(100000, 12, 12.5))
        .toThrow('Tenure must be a positive integer');
    });
  });

  describe('Precision', () => {
    it('should round to 2 decimal places', () => {
      const result = calculateEMI(500000, 12, 24);
      expect(result.emi.toString()).toMatch(/^\d+\.\d{2}$/);
    });
  });
});
```

---

### 2. Integration Tests

**Purpose:** Test domain interactions and workflows

**Location:** `tests/integration/`

**Requirements:**
- Test realistic user scenarios
- Test cross-domain interactions
- Test data flow through multiple functions
- Use realistic test data

**Example:**
```typescript
// tests/integration/purchase-decision.test.ts
import { describe, it, expect } from 'vitest';
import { calculateAllocation } from '@/allocation';
import { simulatePurchase } from '@/purchase';
import { calculateEMI } from '@/loan';

describe('Purchase Decision Workflow', () => {
  it('should recommend save-first for affordable purchase', () => {
    // Step 1: Calculate current allocation
    const allocation = calculateAllocation({
      userId: 'user_123',
      month: 12,
      year: 2024,
      monthlyIncome: 80000,
      essentialExpenses: [
        { amount: 40000, frequency: 'MONTHLY', isActive: true }
      ],
      discretionaryExpenses: [],
      debts: [],
      emergencyFundTarget: 240000,
      currentEmergencyFund: 240000,
      goals: [],
      riskTolerance: 'MODERATE'
    });

    // Step 2: Simulate purchase
    const purchase = simulatePurchase({
      purchaseAmount: 50000,
      itemName: 'Laptop',
      currentSavings: 300000,
      emergencyFundTarget: 240000,
      currentEmergencyFund: 240000,
      monthlyIncome: 80000,
      monthlyExpenses: 40000,
      activeGoals: [],
      existingDebts: []
    });

    // Step 3: Verify recommendation
    expect(purchase.recommended).toBe('SAVE_FIRST');
    expect(purchase.canAfford).toBe(true);
    
    // Step 4: Verify save-first scenario
    const saveFirst = purchase.scenarios.find(s => s.type === 'SAVE_FIRST');
    expect(saveFirst?.isViable).toBe(true);
    expect(saveFirst?.timeline).toBeLessThanOrEqual(3); // < 3 months
  });

  it('should recommend buy-from-savings when emergency fund safe', () => {
    const purchase = simulatePurchase({
      purchaseAmount: 30000,
      currentSavings: 500000,
      emergencyFundTarget: 240000,
      currentEmergencyFund: 300000,
      monthlyIncome: 80000,
      monthlyExpenses: 40000,
      activeGoals: [],
      existingDebts: []
    });

    expect(purchase.recommended).toBe('BUY_FROM_SAVINGS');
    
    const fromSavings = purchase.scenarios.find(s => s.type === 'BUY_FROM_SAVINGS');
    expect(fromSavings?.isViable).toBe(true);
    expect(fromSavings?.immediateImpact.newEmergencyFund).toBeGreaterThanOrEqual(240000);
  });
});
```

---

### 3. Edge Case Tests

**Purpose:** Test boundary conditions and unusual inputs

**Requirements:**
- Test minimum/maximum values
- Test zero values
- Test negative values (where applicable)
- Test very large numbers
- Test very small numbers
- Test date boundaries
- Test empty arrays
- Test null/undefined handling

**Example:**
```typescript
// src/allocation/__tests__/edge-cases.test.ts
import { describe, it, expect } from 'vitest';
import { calculateAllocation } from '../calculate-allocation';

describe('Allocation Edge Cases', () => {
  it('should handle zero income', () => {
    const result = calculateAllocation({
      userId: 'user_123',
      month: 12,
      year: 2024,
      monthlyIncome: 0,
      essentialExpenses: [],
      discretionaryExpenses: [],
      debts: [],
      emergencyFundTarget: 0,
      currentEmergencyFund: 0,
      goals: [],
      riskTolerance: 'MODERATE'
    });

    expect(result.totalIncome).toBe(0);
    expect(result.totalAllocated).toBe(0);
    expect(result.warning).toBeUndefined();
  });

  it('should handle income insufficient for essentials', () => {
    const result = calculateAllocation({
      userId: 'user_123',
      month: 12,
      year: 2024,
      monthlyIncome: 30000,
      essentialExpenses: [
        { amount: 40000, frequency: 'MONTHLY', isActive: true }
      ],
      discretionaryExpenses: [],
      debts: [
        { minimumPayment: 5000, status: 'ACTIVE' }
      ],
      emergencyFundTarget: 0,
      currentEmergencyFund: 0,
      goals: [],
      riskTolerance: 'MODERATE'
    });

    expect(result.warning).toBe('INCOME_INSUFFICIENT');
    expect(result.shortfall).toBe(10000);
  });

  it('should handle empty goals array', () => {
    const result = calculateAllocation({
      userId: 'user_123',
      month: 12,
      year: 2024,
      monthlyIncome: 80000,
      essentialExpenses: [
        { amount: 40000, frequency: 'MONTHLY', isActive: true }
      ],
      discretionaryExpenses: [],
      debts: [],
      emergencyFundTarget: 240000,
      currentEmergencyFund: 240000,
      goals: [],
      riskTolerance: 'MODERATE'
    });

    expect(result.goalSavings).toBe(0);
    expect(result.goalAllocations).toEqual({});
    expect(result.investments).toBeGreaterThan(0); // Should invest instead
  });

  it('should handle very large income', () => {
    const result = calculateAllocation({
      userId: 'user_123',
      month: 12,
      year: 2024,
      monthlyIncome: 10000000, // 1 crore
      essentialExpenses: [
        { amount: 100000, frequency: 'MONTHLY', isActive: true }
      ],
      discretionaryExpenses: [],
      debts: [],
      emergencyFundTarget: 600000,
      currentEmergencyFund: 600000,
      goals: [],
      riskTolerance: 'AGGRESSIVE'
    });

    expect(result.totalAllocated).toBe(10000000);
    expect(result.essentialExpenses).toBe(100000);
    expect(result.investments).toBeGreaterThan(0);
  });
});
```

---

### 4. Performance Tests

**Purpose:** Ensure calculations meet performance targets

**Requirements:**
- Benchmark all critical functions
- Verify performance targets met
- Test with realistic data volumes
- Test with maximum data volumes

**Example:**
```typescript
// tests/performance/benchmarks.test.ts
import { describe, it, expect } from 'vitest';
import { calculateAllocation } from '@/allocation';
import { calculateEMI } from '@/loan';
import { forecastCashFlow } from '@/forecast';

describe('Performance Benchmarks', () => {
  it('calculateEMI should complete in < 1ms', () => {
    const start = performance.now();
    
    for (let i = 0; i < 1000; i++) {
      calculateEMI(500000, 12, 24);
    }
    
    const end = performance.now();
    const avgTime = (end - start) / 1000;
    
    expect(avgTime).toBeLessThan(1); // < 1ms per call
  });

  it('calculateAllocation should complete in < 50ms', () => {
    const input = {
      userId: 'user_123',
      month: 12,
      year: 2024,
      monthlyIncome: 80000,
      essentialExpenses: Array(100).fill(null).map((_, i) => ({
        amount: 1000 + i,
        frequency: 'MONTHLY' as const,
        isActive: true
      })),
      discretionaryExpenses: [],
      debts: Array(10).fill(null).map((_, i) => ({
        minimumPayment: 1000 + i,
        status: 'ACTIVE' as const
      })),
      emergencyFundTarget: 240000,
      currentEmergencyFund: 150000,
      goals: Array(20).fill(null).map((_, i) => ({
        id: `goal_${i}`,
        targetAmount: 100000 + i * 10000,
        currentAmount: 50000,
        targetDate: '2026-12-31T00:00:00Z',
        priority: 'HIGH' as const,
        status: 'ACTIVE' as const
      })),
      riskTolerance: 'MODERATE' as const
    };

    const start = performance.now();
    calculateAllocation(input);
    const end = performance.now();
    
    expect(end - start).toBeLessThan(50); // < 50ms
  });

  it('forecastCashFlow(60mo) should complete in < 300ms', () => {
    const input = {
      startDate: '2024-01-01T00:00:00Z',
      months: 60,
      currentBalance: 200000,
      monthlyIncome: 80000,
      expenses: Array(50).fill(null).map((_, i) => ({
        amount: 1000 + i,
        frequency: 'MONTHLY' as const,
        isActive: true
      })),
      debts: Array(5).fill(null).map((_, i) => ({
        minimumPayment: 5000 + i,
        status: 'ACTIVE' as const
      })),
      goals: Array(10).fill(null).map((_, i) => ({
        id: `goal_${i}`,
        targetAmount: 100000,
        currentAmount: 0,
        targetDate: '2026-12-31T00:00:00Z',
        priority: 'HIGH' as const,
        status: 'ACTIVE' as const
      })),
      allocation: {
        userId: 'user_123',
        month: 1,
        year: 2024,
        essentialExpenses: 40000,
        debtPayments: 10000,
        emergencyFund: 5000,
        goalSavings: 15000,
        investments: 5000,
        discretionary: 5000,
        totalIncome: 80000,
        totalAllocated: 80000,
        goalAllocations: {}
      }
    };

    const start = performance.now();
    forecastCashFlow(input);
    const end = performance.now();
    
    expect(end - start).toBeLessThan(300); // < 300ms
  });
});
```

---

### 5. Property-Based Tests

**Purpose:** Test mathematical properties and invariants

**Requirements:**
- Test commutative properties
- Test associative properties
- Test identity properties
- Test inverse properties
- Test range properties

**Example:**
```typescript
// src/loan/__tests__/properties.test.ts
import { describe, it, expect } from 'vitest';
import { calculateEMI } from '../calculate-emi';

describe('EMI Property Tests', () => {
  it('total payable should always be >= principal', () => {
    // Test with random inputs
    for (let i = 0; i < 100; i++) {
      const principal = Math.random() * 1000000 + 10000;
      const rate = Math.random() * 20;
      const tenure = Math.floor(Math.random() * 360) + 1;
      
      const result = calculateEMI(principal, rate, tenure);
      
      expect(result.totalPayable).toBeGreaterThanOrEqual(principal);
    }
  });

  it('EMI should decrease as tenure increases (same principal, rate)', () => {
    const principal = 500000;
    const rate = 12;
    
    const emi12 = calculateEMI(principal, rate, 12).emi;
    const emi24 = calculateEMI(principal, rate, 24).emi;
    const emi36 = calculateEMI(principal, rate, 36).emi;
    
    expect(emi12).toBeGreaterThan(emi24);
    expect(emi24).toBeGreaterThan(emi36);
  });

  it('total interest should increase as tenure increases', () => {
    const principal = 500000;
    const rate = 12;
    
    const interest12 = calculateEMI(principal, rate, 12).totalInterest;
    const interest24 = calculateEMI(principal, rate, 24).totalInterest;
    const interest36 = calculateEMI(principal, rate, 36).totalInterest;
    
    expect(interest24).toBeGreaterThan(interest12);
    expect(interest36).toBeGreaterThan(interest24);
  });

  it('EMI * tenure should equal total payable', () => {
    for (let i = 0; i < 100; i++) {
      const principal = Math.random() * 1000000 + 10000;
      const rate = Math.random() * 20;
      const tenure = Math.floor(Math.random() * 360) + 1;
      
      const result = calculateEMI(principal, rate, tenure);
      
      expect(result.emi * tenure).toBeCloseTo(result.totalPayable, 0);
    }
  });
});
```

---

## Test Data Strategy

### Test Fixtures

**Location:** `tests/fixtures/`

**Structure:**
```typescript
// tests/fixtures/test-users.ts
export const TEST_USERS = {
  standard: {
    userId: 'user_standard',
    monthlyIncome: 80000,
    monthlyExpenses: 50000,
    currentSavings: 200000,
    emergencyFundTarget: 300000,
    currentEmergencyFund: 200000
  },
  
  lowIncome: {
    userId: 'user_low_income',
    monthlyIncome: 30000,
    monthlyExpenses: 25000,
    currentSavings: 50000,
    emergencyFundTarget: 150000,
    currentEmergencyFund: 30000
  },
  
  highIncome: {
    userId: 'user_high_income',
    monthlyIncome: 200000,
    monthlyExpenses: 100000,
    currentSavings: 1000000,
    emergencyFundTarget: 600000,
    currentEmergencyFund: 600000
  },
  
  highDebt: {
    userId: 'user_high_debt',
    monthlyIncome: 80000,
    monthlyExpenses: 40000,
    currentSavings: 100000,
    debts: [
      { minimumPayment: 15000, status: 'ACTIVE' },
      { minimumPayment: 10000, status: 'ACTIVE' }
    ]
  }
};

// tests/fixtures/test-goals.ts
export const TEST_GOALS = {
  house: {
    id: 'goal_house',
    name: 'House Down Payment',
    targetAmount: 500000,
    currentAmount: 150000,
    targetDate: '2026-12-31T00:00:00Z',
    priority: 'HIGH',
    status: 'ACTIVE'
  },
  
  vacation: {
    id: 'goal_vacation',
    name: 'Europe Trip',
    targetAmount: 100000,
    currentAmount: 30000,
    targetDate: '2025-06-30T00:00:00Z',
    priority: 'MEDIUM',
    status: 'ACTIVE'
  },
  
  emergency: {
    id: 'goal_emergency',
    name: 'Emergency Fund',
    targetAmount: 300000,
    currentAmount: 200000,
    targetDate: '2025-12-31T00:00:00Z',
    priority: 'HIGH',
    status: 'ACTIVE'
  }
};
```

### Test Scenarios

```typescript
// tests/fixtures/test-scenarios.ts
export const TEST_SCENARIOS = {
  // Scenario: New user, just started
  newUser: {
    user: TEST_USERS.standard,
    goals: [],
    debts: [],
    expenses: [
      { amount: 20000, frequency: 'MONTHLY', isActive: true, isEssential: true }
    ]
  },
  
  // Scenario: User with multiple goals
  multipleGoals: {
    user: TEST_USERS.standard,
    goals: [TEST_GOALS.house, TEST_GOALS.vacation],
    debts: [],
    expenses: [
      { amount: 40000, frequency: 'MONTHLY', isActive: true, isEssential: true }
    ]
  },
  
  // Scenario: User with high debt
  highDebtScenario: {
    user: TEST_USERS.highDebt,
    goals: [TEST_GOALS.emergency],
    debts: TEST_USERS.highDebt.debts,
    expenses: [
      { amount: 40000, frequency: 'MONTHLY', isActive: true, isEssential: true }
    ]
  }
};
```

---

## Test Organization

### File Naming Convention

```
Domain tests:
  calculate-allocation.test.ts
  calculate-emi.test.ts
  simulate-purchase.test.ts

Edge case tests:
  edge-cases.test.ts
  boundary-values.test.ts

Integration tests:
  allocation-flow.test.ts
  purchase-decision.test.ts
  goal-lifecycle.test.ts

Performance tests:
  benchmarks.test.ts
  stress-tests.test.ts

Property tests:
  properties.test.ts
  invariants.test.ts
```

### Test Structure

```typescript
describe('FunctionName', () => {
  describe('Happy Path', () => {
    it('should do X when Y', () => {});
  });

  describe('Edge Cases', () => {
    it('should handle edge case 1', () => {});
    it('should handle edge case 2', () => {});
  });

  describe('Error Conditions', () => {
    it('should throw when invalid input', () => {});
  });

  describe('Precision', () => {
    it('should round correctly', () => {});
  });
});
```

---

## Mocking Strategy

### No External Dependencies to Mock

Since Financial Engine has no external dependencies (except Zod), we don't need mocking for:
- Database calls (none)
- API calls (none)
- File system (none)
- Network (none)

### Internal Mocking (If Needed)

```typescript
// Only mock if testing in isolation
import { vi } from 'vitest';

// Mock date for deterministic tests
vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));

// Test
const result = projectGoalTimeline({...});

// Restore
vi.useRealTimers();
```

---

## Continuous Integration

### CI/CD Pipeline

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Check coverage
        run: npm run test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
      
      - name: Fail if coverage < 80%
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "Coverage $COVERAGE% is below 80%"
            exit 1
          fi
```

### Coverage Gates

```json
// package.json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui"
  },
  "vitest": {
    "coverage": {
      "thresholds": {
        "lines": 85,
        "functions": 85,
        "branches": 85,
        "statements": 85,
        "src/loan/calculate-emi.ts": {
          "lines": 100,
          "functions": 100,
          "branches": 100,
          "statements": 100
        },
        "src/allocation/calculate-allocation.ts": {
          "lines": 100,
          "functions": 100,
          "branches": 100,
          "statements": 100
        }
      }
    }
  }
}
```

---

## Test Maintenance

### When to Update Tests

**Always update tests when:**
- Adding new features
- Fixing bugs
- Changing behavior
- Refactoring code

**Test-Driven Development:**
1. Write failing test
2. Implement feature
3. Test passes
4. Refactor
5. Tests still pass

### Test Review Checklist

Before merging:
- [ ] All tests pass
- [ ] Coverage meets requirements
- [ ] No skipped tests (`.skip`)
- [ ] No focused tests (`.only`)
- [ ] Test names are descriptive
- [ ] Edge cases covered
- [ ] Error conditions tested
- [ ] Performance benchmarks met

---

## Documentation

### Test Documentation

Each test file should have:

```typescript
/**
 * Tests for calculateEMI function
 * 
 * Coverage:
 * - Happy path: Standard loan calculation
 * - Edge cases: Zero interest, small principal, long tenure
 * - Error conditions: Invalid inputs
 * - Precision: Rounding to 2 decimals
 * - Properties: Mathematical invariants
 * 
 * Performance target: < 1ms per call
 */
```

---

## Summary

### Testing Pyramid

```
        /\
       /  \        E2E Tests (None - pure calculations)
      /────\
     /      \      Integration Tests (20%)
    /────────\
   /          \    Unit Tests (80%)
  /────────────\
```

### Coverage Breakdown

- **Unit Tests:** 80% of tests
- **Integration Tests:** 20% of tests
- **E2E Tests:** 0% (no UI, no external systems)

### Key Principles

1. **Test like money depends on it** - Because it does
2. **100% coverage for critical paths** - No exceptions
3. **Test edge cases exhaustively** - Financial edge cases are common
4. **Benchmark performance** - Calculations must be fast
5. **Use realistic test data** - Real-world scenarios
6. **Property-based testing** - Verify mathematical properties
7. **No mocking needed** - Pure functions, no dependencies

---

**Status:** Final  
**Implementation Ready:** Yes  
**Review Status:** Pending Approval

---

**Document Version:** 1.0  
**Last Updated:** 2024-12-19  
**Next Review:** After implementation
