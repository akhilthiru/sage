# ADR-002: Deterministic Calculations

**Status:** Accepted  
**Date:** 2024-12-19  
**Deciders:** Sage Development Team  
**Priority:** CRITICAL

---

## Context

Financial calculations must be accurate, reproducible, and verifiable. Users need to trust that:
- The same calculation always produces the same result
- Results can be independently verified
- No randomness or approximation affects outcomes
- Calculations are transparent and explainable

We need to decide how to ensure determinism in all financial calculations.

---

## Decision

**All financial calculations must be 100% deterministic.**

This means:
1. **No randomness** - No Math.random(), no probabilistic algorithms
2. **No time-based variation** - No Date.now(), no timestamps in calculations
3. **No external data** - No API calls, no database queries during calculation
4. **Fixed precision** - Consistent rounding rules
5. **Reproducible** - Same input always produces same output

---

## Rationale

### Why Determinism Matters

**1. Trust**
```typescript
// ✅ User can verify
User: "Why is my EMI ₹23,539?"
AI: "Based on ₹5L principal, 12% rate, 24 months"
User: *calculates independently* "Yes, that's correct"

// ❌ User cannot verify
User: "Why is my EMI ₹23,539?"
AI: "Based on market conditions and risk factors"
User: *cannot verify* "I have to trust this?"
```

**2. Debugging**
```typescript
// ✅ Easy to debug
Bug report: "EMI calculation wrong for ₹5L, 12%, 24mo"
Developer: calculateEMI(500000, 12, 24) // Always reproduces bug

// ❌ Hard to debug
Bug report: "EMI calculation sometimes wrong"
Developer: calculateEMI(500000, 12, 24) // Cannot reproduce
```

**3. Testing**
```typescript
// ✅ Reliable tests
test('calculateEMI', () => {
  expect(calculateEMI(500000, 12, 24)).toBe(23539.23);
  // Always passes or always fails
});

// ❌ Flaky tests
test('calculateEMI', () => {
  const result = calculateEMI(500000, 12, 24);
  expect(result).toBeCloseTo(23539, 100); // Sometimes passes, sometimes fails
});
```

**4. Auditability**
```typescript
// ✅ Auditable
Calculation log:
  Input: { principal: 500000, rate: 12, tenure: 24 }
  Output: { emi: 23539.23 }
  Formula: P × r × (1+r)^n / ((1+r)^n - 1)
  Verification: ✓ Correct

// ❌ Not auditable
Calculation log:
  Input: { userId: "123" }
  Output: { emi: 23539.23 }
  Formula: "ML model prediction"
  Verification: ❓ Cannot verify
```

---

## Implementation Rules

### Rule 1: No Random Numbers

```typescript
// ❌ FORBIDDEN
function simulatePurchase(amount: number): Scenario[] {
  const randomFactor = Math.random(); // NO!
  return scenarios.map(s => ({
    ...s,
    probability: randomFactor * s.baseProbability
  }));
}

// ✅ ALLOWED
function simulatePurchase(amount: number): Scenario[] {
  return scenarios.map(s => ({
    ...s,
    isViable: s.cost <= amount // Deterministic
  }));
}
```

---

### Rule 2: No Time-Based Calculations

```typescript
// ❌ FORBIDDEN
function calculateConfidence(): number {
  const now = Date.now(); // NO!
  const age = now - user.createdAt;
  return age > 30_DAYS ? 80 : 50;
}

// ✅ ALLOWED
function calculateConfidence(
  profileCreatedAt: Date,
  currentDate: Date
): number {
  const age = currentDate.getTime() - profileCreatedAt.getTime();
  return age > 30_DAYS ? 80 : 50;
}
```

**Rationale:** Accept dates as parameters, don't read current time internally.

---

### Rule 3: Fixed Precision

```typescript
// ❌ INCONSISTENT
function calculateEMI(principal: number, rate: number, tenure: number): number {
  return principal * rate / tenure; // No rounding
}
// Result: 23539.234567890123 (varies by platform)

// ✅ CONSISTENT
function calculateEMI(principal: number, rate: number, tenure: number): number {
  const emi = principal * rate / tenure;
  return Math.round(emi * 100) / 100; // Always 2 decimals
}
// Result: 23539.23 (always)
```

**Rounding Rules:**
- **Monetary values:** 2 decimal places (Math.round)
- **Percentages:** 2 decimal places
- **Ratios:** 4 decimal places
- **Scores:** Integer (0-100)

---

### Rule 4: Explicit Inputs

```typescript
// ❌ IMPLICIT
function calculateAllocation(userId: string): Allocation {
  const user = getUser(userId); // External data
  const config = loadConfig(); // External config
  return calculate(user, config);
}

// ✅ EXPLICIT
function calculateAllocation(input: AllocationInput): Allocation {
  // All data passed as parameters
  return calculate(input);
}
```

---

### Rule 5: No Approximations

```typescript
// ❌ APPROXIMATION
function calculateEMI(principal: number, rate: number, tenure: number): number {
  // Approximate formula
  return principal / tenure + (principal * rate / 2);
}

// ✅ EXACT FORMULA
function calculateEMI(principal: number, rate: number, tenure: number): number {
  const r = rate / 12 / 100;
  return principal * r * Math.pow(1 + r, tenure) / (Math.pow(1 + r, tenure) - 1);
}
```

---

## Alternatives Considered

### Alternative 1: Probabilistic Forecasting

```typescript
function forecastCashFlow(input: Input): Forecast {
  // Monte Carlo simulation
  const scenarios = [];
  for (let i = 0; i < 10000; i++) {
    const randomIncome = input.income * (0.9 + Math.random() * 0.2);
    const randomExpenses = input.expenses * (0.9 + Math.random() * 0.2);
    scenarios.push(simulate(randomIncome, randomExpenses));
  }
  return {
    p10: percentile(scenarios, 10),
    p50: percentile(scenarios, 50),
    p90: percentile(scenarios, 90)
  };
}
```

**Rejected because:**
- Non-deterministic (different results each run)
- Cannot be verified by user
- Harder to test
- Adds complexity
- V1 doesn't need probabilistic forecasting

**Deferred to:** V2 (with seeded random for determinism)

---

### Alternative 2: Machine Learning Predictions

```typescript
async function predictExpenses(userId: string): Promise<number> {
  const model = await loadModel();
  const features = await getUserFeatures(userId);
  return model.predict(features);
}
```

**Rejected because:**
- Non-deterministic (model updates change results)
- Cannot be verified by user
- Requires external dependencies
- Black box (not explainable)
- V1 doesn't need ML

**Deferred to:** V2 (for behavior prediction)

---

### Alternative 3: Market Data Integration

```typescript
async function calculateInvestmentReturns(amount: number): Promise<number> {
  const marketRate = await fetchCurrentMarketRate();
  return amount * marketRate;
}
```

**Rejected because:**
- Non-deterministic (market changes)
- Requires network calls
- Not pure function
- V1 doesn't include investments

**Deferred to:** V2 (pass market rate as parameter)

---

## Consequences

### Positive

✅ **Reproducible**
- Same input = same output (always)
- Can verify calculations independently
- Debugging is straightforward

✅ **Testable**
- No flaky tests
- Property-based testing possible
- 100% coverage achievable

✅ **Transparent**
- Users can verify results
- Calculations are explainable
- Audit trail is clear

✅ **Cacheable**
- Results can be cached indefinitely
- No cache invalidation needed
- Performance optimization possible

✅ **Portable**
- Works in any environment
- No platform-specific behavior
- Consistent across devices

### Negative

⚠️ **No Probabilistic Forecasting**
- Cannot do Monte Carlo simulations
- Cannot provide confidence intervals
- Limited to point estimates

**Mitigation:** V1 uses linear projections. V2 can add probabilistic forecasting with seeded random.

⚠️ **No Real-Time Data**
- Cannot fetch current market rates
- Cannot use live exchange rates
- All data must be passed as parameters

**Mitigation:** Caller fetches data, passes as parameters.

⚠️ **No Adaptive Behavior**
- Cannot learn from user behavior
- Cannot adjust based on patterns
- Fixed algorithms only

**Mitigation:** V2 can add ML predictions as separate functions.

---

## Validation Strategy

### How to Verify Determinism

**1. Repeatability Test**
```typescript
test('determinism', () => {
  const input = { /* ... */ };
  
  const result1 = calculateAllocation(input);
  const result2 = calculateAllocation(input);
  const result3 = calculateAllocation(input);
  
  expect(result1).toEqual(result2);
  expect(result2).toEqual(result3);
});
```

**2. Cross-Platform Test**
```typescript
// Run on different platforms
// - Node.js
// - Browser
// - React Native
// All should produce identical results
```

**3. Independent Verification**
```typescript
test('EMI matches external calculator', () => {
  // Verify against known EMI calculators
  const result = calculateEMI(500000, 12, 24);
  expect(result.emi).toBe(23539.23); // Matches external calculator
});
```

**4. Property-Based Test**
```typescript
test('EMI properties', () => {
  for (let i = 0; i < 1000; i++) {
    const principal = randomPrincipal();
    const rate = randomRate();
    const tenure = randomTenure();
    
    const result = calculateEMI(principal, rate, tenure);
    
    // Property: Total payable >= principal
    expect(result.totalPayable).toBeGreaterThanOrEqual(principal);
    
    // Property: EMI * tenure = total payable
    expect(result.emi * tenure).toBeCloseTo(result.totalPayable, 2);
  }
});
```

---

## Edge Cases

### Handling Non-Deterministic Inputs

**Problem:** User provides current date

```typescript
// ❌ BAD: Reads current date internally
function projectGoalTimeline(goal: Goal): Timeline {
  const now = new Date(); // Non-deterministic!
  const monthsRemaining = monthsBetween(now, goal.targetDate);
  return { monthsRemaining };
}

// ✅ GOOD: Accepts current date as parameter
function projectGoalTimeline(
  goal: Goal,
  currentDate: Date
): Timeline {
  const monthsRemaining = monthsBetween(currentDate, goal.targetDate);
  return { monthsRemaining };
}
```

**Caller responsibility:**
```typescript
// Application layer provides current date
const timeline = projectGoalTimeline(goal, new Date());
```

---

### Handling Floating Point Precision

**Problem:** JavaScript floating point arithmetic is imprecise

```typescript
0.1 + 0.2 === 0.3 // false (0.30000000000000004)
```

**Solution:** Round to fixed precision

```typescript
function roundToTwo(num: number): number {
  return Math.round(num * 100) / 100;
}

// Usage
const result = roundToTwo(0.1 + 0.2); // 0.30
```

---

## Monitoring

### Determinism Checks in CI/CD

```yaml
# .github/workflows/determinism.yml
name: Determinism Check

on: [push, pull_request]

jobs:
  determinism:
    runs-on: ubuntu-latest
    
    steps:
      - name: Run calculations 100 times
        run: npm run test:determinism
      
      - name: Verify all results identical
        run: |
          # All results must be identical
          if [ $(cat results.json | sort | uniq | wc -l) -ne 1 ]; then
            echo "Non-deterministic behavior detected!"
            exit 1
          fi
```

---

## Documentation Requirements

### Every Function Must Document

1. **Determinism guarantee**
   ```typescript
   /**
    * Calculate EMI for a loan
    * 
    * @deterministic This function is deterministic.
    * Same inputs always produce the same output.
    */
   ```

2. **Precision rules**
   ```typescript
   /**
    * @precision Results are rounded to 2 decimal places
    */
   ```

3. **Formula used**
   ```typescript
   /**
    * @formula EMI = P × r × (1+r)^n / ((1+r)^n - 1)
    */
   ```

---

## Future Considerations

### V2: Probabilistic Features

When adding probabilistic features in V2:

**Use seeded random for determinism:**
```typescript
function forecastCashFlow(
  input: Input,
  seed: number // Deterministic seed
): Forecast {
  const rng = seedRandom(seed);
  
  const scenarios = [];
  for (let i = 0; i < 10000; i++) {
    const randomIncome = input.income * (0.9 + rng() * 0.2);
    scenarios.push(simulate(randomIncome));
  }
  
  return aggregate(scenarios);
}

// Same seed = same results
forecastCashFlow(input, 12345); // Always same result
```

---

## Related Decisions

- ADR-001: Pure Functions Only
- ADR-003: Confidence Engine

---

## References

- [IEEE 754 Floating Point](https://en.wikipedia.org/wiki/IEEE_754)
- [Deterministic Algorithm](https://en.wikipedia.org/wiki/Deterministic_algorithm)
- [Financial Calculations Best Practices](https://www.investopedia.com/terms/e/emi.asp)

---

**Status:** Accepted  
**Review Date:** Before v2.0.0  
**Last Updated:** 2024-12-19
