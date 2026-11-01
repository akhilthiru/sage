# ADR-001: Pure Functions Only

**Status:** Accepted  
**Date:** 2024-12-19  
**Deciders:** Sage Development Team  
**Priority:** CRITICAL

---

## Context

The Financial Engine is the source of truth for all financial calculations in Sage. It must be:
- Deterministic (same input = same output)
- Testable (100% coverage achievable)
- Reliable (no side effects, no surprises)
- Portable (can run anywhere)

We need to decide on the programming paradigm for this critical package.

---

## Decision

**We will implement the Financial Engine using pure functions only.**

All exported functions must be:
1. **Pure** - No side effects
2. **Deterministic** - Same input always produces same output
3. **Stateless** - No internal state
4. **Synchronous** - No async operations
5. **Self-contained** - No external dependencies (except Zod)

---

## Rationale

### Why Pure Functions?

**1. Determinism**
```typescript
// ✅ PURE: Always returns same result
function calculateEMI(principal: number, rate: number, tenure: number): number {
  const r = rate / 12 / 100;
  return principal * r * Math.pow(1 + r, tenure) / (Math.pow(1 + r, tenure) - 1);
}

calculateEMI(500000, 12, 24); // Always 23539.23

// ❌ IMPURE: Result depends on external state
let globalRate = 12;
function calculateEMI(principal: number, tenure: number): number {
  const r = globalRate / 12 / 100; // Depends on global state
  return principal * r * Math.pow(1 + r, tenure) / (Math.pow(1 + r, tenure) - 1);
}
```

**2. Testability**
```typescript
// ✅ EASY TO TEST: No setup, no mocking
test('calculateEMI', () => {
  expect(calculateEMI(500000, 12, 24)).toBe(23539.23);
});

// ❌ HARD TO TEST: Requires setup, mocking, cleanup
test('calculateEMI', async () => {
  const db = await setupDatabase();
  const config = await loadConfig();
  const result = await calculateEMI(db, config, 500000, 24);
  expect(result).toBe(23539.23);
  await cleanupDatabase(db);
});
```

**3. Reliability**
```typescript
// ✅ PURE: No surprises
const emi1 = calculateEMI(500000, 12, 24);
const emi2 = calculateEMI(500000, 12, 24);
assert(emi1 === emi2); // Always true

// ❌ IMPURE: Can fail unexpectedly
const emi1 = await calculateEMI(500000, 12, 24); // Success
const emi2 = await calculateEMI(500000, 12, 24); // Network error!
```

**4. Portability**
```typescript
// ✅ PURE: Runs anywhere
// - Web browser
// - Node.js server
// - React Native mobile app
// - Edge functions
// - Web workers

// ❌ IMPURE: Platform-specific
// - Requires database connection
// - Requires file system access
// - Requires network access
```

**5. Parallelization**
```typescript
// ✅ PURE: Safe to parallelize
const results = await Promise.all([
  calculateEMI(500000, 12, 24),
  calculateEMI(300000, 10, 36),
  calculateEMI(1000000, 15, 60)
]);

// ❌ IMPURE: Race conditions
// Multiple calls might interfere with each other
```

---

## Alternatives Considered

### Alternative 1: Class-Based Architecture

```typescript
class EMICalculator {
  private config: Config;
  
  constructor(config: Config) {
    this.config = config;
  }
  
  calculate(principal: number, tenure: number): number {
    // Uses this.config
  }
}
```

**Rejected because:**
- Requires instantiation
- Harder to test (need to mock config)
- State management complexity
- Not necessary for pure calculations

---

### Alternative 2: Async Functions

```typescript
async function calculateEMI(
  principal: number,
  rate: number,
  tenure: number
): Promise<number> {
  // Async for future extensibility
}
```

**Rejected because:**
- No I/O operations needed
- Adds unnecessary complexity
- Harder to use (must await)
- Performance overhead
- Not truly pure (async = side effect)

---

### Alternative 3: Dependency Injection

```typescript
function calculateEMI(
  principal: number,
  rate: number,
  tenure: number,
  logger: Logger,
  metrics: Metrics
): number {
  logger.log('Calculating EMI');
  const result = /* calculation */;
  metrics.record('emi_calculated');
  return result;
}
```

**Rejected because:**
- Side effects (logging, metrics)
- Not pure
- Harder to test
- Unnecessary for calculations

---

## Consequences

### Positive

✅ **100% Testable**
- No mocking required
- No setup/teardown
- Fast test execution
- Property-based testing possible

✅ **Deterministic**
- Same input = same output (always)
- Reproducible results
- Easy to debug
- Cacheable results

✅ **Portable**
- Runs in any JavaScript environment
- No platform dependencies
- Can be extracted to microservice easily
- Can run in web workers

✅ **Parallel-Safe**
- No race conditions
- Safe to call concurrently
- Scalable by default

✅ **Simple**
- Easy to understand
- Easy to maintain
- No hidden state
- No surprises

### Negative

⚠️ **No Logging**
- Cannot log internally
- Caller must log if needed
- Harder to debug production issues

**Mitigation:** Return detailed results with metadata

⚠️ **No Caching**
- Cannot cache internally
- Caller must cache if needed

**Mitigation:** Results are deterministic, so caching is straightforward

⚠️ **No Configuration**
- Cannot read config files
- All parameters must be passed

**Mitigation:** Use constants for defaults, accept overrides as parameters

⚠️ **No External Data**
- Cannot fetch data from APIs
- Cannot read from database

**Mitigation:** This is actually a positive - keeps engine pure

---

## Implementation Guidelines

### DO

```typescript
// ✅ Pure function
export function calculateEMI(
  principal: number,
  annualInterestRate: number,
  tenureMonths: number
): EMIResult {
  const r = annualInterestRate / 12 / 100;
  const emi = principal * r * Math.pow(1 + r, tenureMonths) / 
              (Math.pow(1 + r, tenureMonths) - 1);
  
  return {
    emi: roundToTwo(emi),
    totalPayable: roundToTwo(emi * tenureMonths),
    totalInterest: roundToTwo(emi * tenureMonths - principal),
    principal,
    tenure: tenureMonths,
    interestRate: annualInterestRate
  };
}

// ✅ Pure utility
function roundToTwo(num: number): number {
  return Math.round(num * 100) / 100;
}
```

### DON'T

```typescript
// ❌ Impure: Reads from database
export async function calculateEMI(userId: string, loanId: string): Promise<number> {
  const loan = await db.loan.findUnique({ where: { id: loanId } });
  return calculateEMIInternal(loan.principal, loan.rate, loan.tenure);
}

// ❌ Impure: Logs to console
export function calculateEMI(principal: number, rate: number, tenure: number): number {
  console.log('Calculating EMI', { principal, rate, tenure });
  return /* calculation */;
}

// ❌ Impure: Uses Date.now()
export function calculateEMI(principal: number, rate: number, tenure: number): number {
  const timestamp = Date.now(); // Non-deterministic!
  return /* calculation */;
}

// ❌ Impure: Mutates input
export function calculateAllocation(input: AllocationInput): Allocation {
  input.goals.sort((a, b) => a.priority - b.priority); // Mutation!
  return /* calculation */;
}
```

---

## Validation

### How to Verify Purity

**1. Same Input Test**
```typescript
const result1 = calculateEMI(500000, 12, 24);
const result2 = calculateEMI(500000, 12, 24);
assert(result1 === result2); // Must be true
```

**2. No Side Effects Test**
```typescript
const input = { /* ... */ };
const inputCopy = JSON.parse(JSON.stringify(input));

calculateAllocation(input);

assert(JSON.stringify(input) === JSON.stringify(inputCopy)); // Input unchanged
```

**3. Isolation Test**
```typescript
// Can run in any order
const a = calculateEMI(500000, 12, 24);
const b = calculateEMI(300000, 10, 36);
const c = calculateEMI(500000, 12, 24);

assert(a === c); // Order doesn't matter
```

---

## Exceptions

### When Impurity is Acceptable

**NEVER** in the Financial Engine package.

If you need impure operations:
- Do them in the application layer
- Pass results as parameters to pure functions

```typescript
// ❌ DON'T: Mix impure and pure
export async function calculateAllocationFromDB(userId: string): Promise<Allocation> {
  const user = await db.user.findUnique({ where: { id: userId } });
  return calculateAllocation(user.financialData);
}

// ✅ DO: Keep pure and impure separate
// In application layer:
export async function getAllocationForUser(userId: string): Promise<Allocation> {
  const user = await db.user.findUnique({ where: { id: userId } });
  return calculateAllocation(user.financialData); // Pure function
}
```

---

## Monitoring

### How to Ensure Compliance

**1. Code Review Checklist**
- [ ] No async/await
- [ ] No database calls
- [ ] No API calls
- [ ] No file system access
- [ ] No console.log
- [ ] No Date.now() or Math.random()
- [ ] No mutation of inputs
- [ ] No global state

**2. Automated Checks**
```typescript
// ESLint rules
{
  "rules": {
    "no-console": "error",
    "no-restricted-globals": ["error", "Date", "Math.random"],
    "no-param-reassign": "error"
  }
}
```

**3. Test Coverage**
- 100% coverage for critical functions
- Property-based tests for mathematical properties
- Determinism tests (same input = same output)

---

## Related Decisions

- ADR-002: Deterministic Calculations
- ADR-003: Confidence Engine

---

## References

- [Pure Functions (Wikipedia)](https://en.wikipedia.org/wiki/Pure_function)
- [Functional Programming Principles](https://en.wikipedia.org/wiki/Functional_programming)
- [Why Pure Functions Matter](https://www.freecodecamp.org/news/what-is-a-pure-function-in-javascript-acb887375dfe/)

---

**Status:** Accepted  
**Review Date:** Before v2.0.0  
**Last Updated:** 2024-12-19
