# Financial Engine: Dependency Rules

**Package:** `@sage/financial-engine`  
**Version:** 1.0.0  
**Status:** Module Boundary Definition  
**Date:** 2024-12-19

---

## Overview

This document defines strict dependency rules and module boundaries for the Financial Engine package. These rules ensure:

- **Maintainability:** Clear ownership and responsibilities
- **Testability:** Isolated modules can be tested independently
- **Scalability:** Modules can be extracted to services if needed
- **Simplicity:** No circular dependencies or tight coupling

**Enforcement:** TypeScript imports + CI/CD validation

---

## Module Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│  (purchase, forecast, financial-health)                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      Domain Layer                            │
│  (allocation, loan, goal, confidence)                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      Shared Layer                            │
│  (types, utils, constants, validation)                       │
└─────────────────────────────────────────────────────────────┘
```

**Dependency Direction:** Top → Bottom only (never reverse)

---

## Domain Definitions

### 1. Allocation Domain
**Path:** `src/allocation/`  
**Purpose:** Income distribution logic  
**Exports:** `calculateAllocation()`  
**Public API:** Yes

### 2. Loan Domain
**Path:** `src/loan/`  
**Purpose:** Loan calculations  
**Exports:** `calculateEMI()`, `simulateLoan()`, `generateAmortization()`, `calculatePrepayment()`  
**Public API:** Yes

### 3. Goal Domain
**Path:** `src/goal/`  
**Purpose:** Goal feasibility & projection  
**Exports:** `projectGoalTimeline()`, `calculateFeasibility()`  
**Public API:** Yes

### 4. Purchase Domain
**Path:** `src/purchase/`  
**Purpose:** Purchase affordability simulation  
**Exports:** `simulatePurchase()`  
**Public API:** Yes

### 5. Forecast Domain
**Path:** `src/forecast/`  
**Purpose:** Cash flow projection  
**Exports:** `forecastCashFlow()`, `analyzeGoalImpact()`  
**Public API:** Yes

### 6. Confidence Domain
**Path:** `src/confidence/`  
**Purpose:** Prediction reliability scoring  
**Exports:** `calculateConfidence()`  
**Public API:** Yes

### 7. Financial Health Domain
**Path:** `src/financial-health/`  
**Purpose:** Overall financial wellness  
**Exports:** `calculateFinancialHealth()`  
**Public API:** Yes

### 8. Shared Domain
**Path:** `src/shared/`  
**Purpose:** Common utilities, types, constants  
**Exports:** Types, utilities, constants, validation  
**Public API:** Partial (types exported, internals hidden)

---

## Allowed Dependencies

### Layer 1: Shared (No Dependencies)

```typescript
// ✅ ALLOWED: No dependencies
src/shared/
  - No imports from other domains
  - Only Node.js built-ins
  - Only external dependencies (Zod)
```

**Rationale:** Shared is the foundation. It cannot depend on anything.

---

### Layer 2: Domain Layer

#### Allocation Domain

```typescript
// ✅ ALLOWED
import { ... } from '../shared/types';
import { ... } from '../shared/utils';
import { ... } from '../shared/constants';
import { ... } from '../shared/validation';

// ❌ FORBIDDEN
import { ... } from '../loan';
import { ... } from '../goal';
import { ... } from '../purchase';
import { ... } from '../forecast';
import { ... } from '../confidence';
import { ... } from '../financial-health';
```

**Rationale:** Allocation is a core domain. It should be independent.

---

#### Loan Domain

```typescript
// ✅ ALLOWED
import { ... } from '../shared/types';
import { ... } from '../shared/utils';
import { ... } from '../shared/constants';
import { ... } from '../shared/validation';

// ❌ FORBIDDEN
import { ... } from '../allocation';
import { ... } from '../goal';
import { ... } from '../purchase';
import { ... } from '../forecast';
import { ... } from '../confidence';
import { ... } from '../financial-health';
```

**Rationale:** Loan is a core domain. It should be independent.

---

#### Goal Domain

```typescript
// ✅ ALLOWED
import { ... } from '../shared/types';
import { ... } from '../shared/utils';
import { ... } from '../shared/constants';
import { ... } from '../shared/validation';

// ❌ FORBIDDEN
import { ... } from '../allocation';
import { ... } from '../loan';
import { ... } from '../purchase';
import { ... } from '../forecast';
import { ... } from '../confidence';
import { ... } from '../financial-health';
```

**Rationale:** Goal is a core domain. It should be independent.

---

#### Confidence Domain

```typescript
// ✅ ALLOWED
import { ... } from '../shared/types';
import { ... } from '../shared/utils';
import { ... } from '../shared/constants';
import { ... } from '../shared/validation';

// ❌ FORBIDDEN
import { ... } from '../allocation';
import { ... } from '../loan';
import { ... } from '../goal';
import { ... } from '../purchase';
import { ... } from '../forecast';
import { ... } from '../financial-health';
```

**Rationale:** Confidence is a core domain. It should be independent.

---

### Layer 3: Application Layer

#### Purchase Domain

```typescript
// ✅ ALLOWED
import { ... } from '../shared/types';
import { ... } from '../shared/utils';
import { ... } from '../shared/constants';
import { ... } from '../shared/validation';
import { calculateEMI } from '../loan';  // EXCEPTION: Needs EMI calculation

// ❌ FORBIDDEN
import { ... } from '../allocation';
import { ... } from '../goal';
import { ... } from '../forecast';
import { ... } from '../confidence';
import { ... } from '../financial-health';
```

**Rationale:** Purchase simulates loan scenarios, so it needs EMI calculation.

**Exception Justification:**
- Purchase domain simulates 3 scenarios
- Scenario 2 requires EMI calculation
- Loan domain provides `calculateEMI()` as a utility
- This is a one-way dependency (purchase → loan)
- No circular dependency risk

---

#### Forecast Domain

```typescript
// ✅ ALLOWED
import { ... } from '../shared/types';
import { ... } from '../shared/utils';
import { ... } from '../shared/constants';
import { ... } from '../shared/validation';
import { calculateAllocation } from '../allocation';  // EXCEPTION: Needs allocation for projection

// ❌ FORBIDDEN
import { ... } from '../loan';
import { ... } from '../goal';
import { ... } from '../purchase';
import { ... } from '../confidence';
import { ... } from '../financial-health';
```

**Rationale:** Forecast projects future state based on current allocation.

**Exception Justification:**
- Forecast projects month-by-month cash flow
- Each month requires allocation calculation
- Allocation domain provides `calculateAllocation()` as a utility
- This is a one-way dependency (forecast → allocation)
- No circular dependency risk

---

#### Financial Health Domain

```typescript
// ✅ ALLOWED
import { ... } from '../shared/types';
import { ... } from '../shared/utils';
import { ... } from '../shared/constants';
import { ... } from '../shared/validation';

// ⚠️ OPTIONAL (for detailed analysis)
import type { AllocationResult } from '../allocation';  // Type-only import

// ❌ FORBIDDEN
import { calculateAllocation } from '../allocation';  // No runtime dependency
import { ... } from '../loan';
import { ... } from '../goal';
import { ... } from '../purchase';
import { ... } from '../forecast';
import { ... } from '../confidence';
```

**Rationale:** Financial health calculates metrics from raw data, not from other engines.

**Type-Only Import:**
- Financial health accepts optional `AllocationResult` for detailed analysis
- This is a **type-only** import (no runtime dependency)
- Caller provides allocation result if available
- Financial health does NOT call `calculateAllocation()` itself

---

## Forbidden Dependencies

### Circular Dependencies

```typescript
// ❌ NEVER ALLOWED
allocation → goal → allocation  // Circular
loan → purchase → loan          // Circular
```

**Enforcement:** TypeScript compiler will error on circular imports.

---

### Reverse Dependencies

```typescript
// ❌ NEVER ALLOWED
shared → allocation             // Shared cannot depend on domains
shared → loan                   // Shared cannot depend on domains
allocation → purchase           // Domain cannot depend on application
loan → forecast                 // Domain cannot depend on application
```

**Rationale:** Dependencies flow top-down only.

---

### Cross-Domain Dependencies (Except Allowed)

```typescript
// ❌ FORBIDDEN
allocation → goal               // Core domains are independent
goal → allocation               // Core domains are independent
loan → goal                     // Core domains are independent
confidence → allocation         // Confidence is independent
```

**Rationale:** Core domains should be independently testable and extractable.

---

## Import Rules

### Public API Imports

```typescript
// ✅ GOOD: Import from domain index
import { calculateAllocation } from '../allocation';
import { calculateEMI } from '../loan';

// ❌ BAD: Import from internal files
import { calculateAllocation } from '../allocation/calculate-allocation';
import { calculateEMI } from '../loan/calculate-emi';
```

**Rationale:** Domain index defines public API. Internal structure can change.

---

### Type Imports

```typescript
// ✅ GOOD: Type-only imports when possible
import type { AllocationResult } from '../allocation';
import type { EMIResult } from '../loan';

// ⚠️ ACCEPTABLE: Runtime import if needed
import { calculateEMI } from '../loan';
```

**Rationale:** Type-only imports don't create runtime dependencies.

---

### Shared Imports

```typescript
// ✅ GOOD: Import from shared submodules
import { roundToTwo } from '../shared/utils';
import { FINANCIAL_CONSTANTS } from '../shared/constants';
import type { Goal } from '../shared/types';

// ❌ BAD: Import from shared root
import { roundToTwo, FINANCIAL_CONSTANTS, Goal } from '../shared';
```

**Rationale:** Explicit imports improve tree-shaking and clarity.

---

## Module Boundaries

### What Each Domain Owns

#### Allocation Domain Owns:
- Allocation calculation logic
- Waterfall priority algorithm
- Goal allocation distribution
- Investment allocation by risk tolerance
- Allocation types
- Allocation validation

#### Loan Domain Owns:
- EMI calculation formula
- Amortization schedule generation
- Affordability assessment
- Prepayment impact calculation
- Loan types
- Loan validation

#### Goal Domain Owns:
- Feasibility calculation
- Timeline projection
- Recommendation generation
- Goal types
- Goal validation

#### Purchase Domain Owns:
- Purchase simulation orchestration
- Scenario generation (3 scenarios)
- Recommendation logic
- Purchase types
- Purchase validation

#### Forecast Domain Owns:
- Cash flow projection logic
- Goal impact analysis
- Month-by-month calculation
- Forecast types
- Forecast validation

#### Confidence Domain Owns:
- Confidence score calculation
- Factor calculation
- Improvement suggestions
- Confidence types
- Confidence validation

#### Financial Health Domain Owns:
- Health score calculation
- Metric calculations
- Risk assessment
- Recommendation generation
- Health types
- Health validation

#### Shared Domain Owns:
- Common types (Frequency, Priority, etc.)
- Date utilities
- Frequency utilities
- Math utilities
- Financial constants
- Validation schemas
- Validation utilities

---

## Dependency Graph

```
┌──────────────────┐
│  financial-health│
└────────┬─────────┘
         │
         ↓
┌──────────────────┐     ┌──────────────────┐
│    purchase      │     │    forecast      │
└────────┬─────────┘     └────────┬─────────┘
         │                        │
         ↓                        ↓
┌──────────────────┐     ┌──────────────────┐
│      loan        │     │   allocation     │
└────────┬─────────┘     └────────┬─────────┘
         │                        │
         └────────┬───────────────┘
                  │
         ┌────────┴─────────┐
         │                  │
         ↓                  ↓
┌──────────────────┐  ┌──────────────────┐
│      goal        │  │   confidence     │
└────────┬─────────┘  └────────┬─────────┘
         │                     │
         └──────────┬──────────┘
                    │
                    ↓
           ┌──────────────────┐
           │     shared       │
           └──────────────────┘
```

**Arrows:** Dependency direction (A → B means A depends on B)

---

## Validation Strategy

### CI/CD Validation

```bash
# Check for circular dependencies
npm run check:circular

# Check for forbidden imports
npm run check:dependencies

# Validate module boundaries
npm run check:boundaries
```

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "paths": {
      "@/allocation": ["src/allocation/index.ts"],
      "@/loan": ["src/loan/index.ts"],
      "@/goal": ["src/goal/index.ts"],
      "@/purchase": ["src/purchase/index.ts"],
      "@/forecast": ["src/forecast/index.ts"],
      "@/confidence": ["src/confidence/index.ts"],
      "@/financial-health": ["src/financial-health/index.ts"],
      "@/shared/*": ["src/shared/*"]
    }
  }
}
```

**Benefit:** Path aliases make imports explicit and enforceable.

---

## External Dependencies

### Allowed External Dependencies

**Production:**
- `zod`: ^3.22.4 (validation at boundaries)

**Development:**
- `typescript`: ^5.3.3
- `tsup`: ^8.0.1
- `vitest`: ^1.0.4
- `@types/node`: ^20.10.0

### Forbidden External Dependencies

**Never Add:**
- React (UI framework)
- Express (web framework)
- Prisma (database ORM)
- OpenAI (AI service)
- Axios (HTTP client)
- Any database driver
- Any network library
- Any UI library

**Rationale:** Financial Engine must remain pure calculation logic.

---

## Migration Path

### If Domain Needs to Become a Service

**Example: Extract Loan Domain to Microservice**

1. **Current State:**
   ```
   src/loan/ (in monorepo)
   ```

2. **Extract to Service:**
   ```
   services/loan-service/
   ├── src/
   │   ├── loan/          # Copy from monorepo
   │   ├── shared/        # Copy only what's needed
   │   └── api/           # Add REST/GraphQL layer
   ```

3. **Update Financial Engine:**
   ```typescript
   // Before
   import { calculateEMI } from '../loan';
   
   // After
   import { calculateEMI } from '@sage/loan-client';
   ```

**Benefit:** Clean domain boundaries make extraction straightforward.

---

## Dependency Decision Framework

### When to Add a Dependency

**Ask these questions:**

1. **Is it a cross-cutting concern?**
   - Yes → Add to `shared`
   - No → Keep in domain

2. **Is it reusable across domains?**
   - Yes → Add to `shared`
   - No → Keep in domain

3. **Does it create a circular dependency?**
   - Yes → Refactor to remove cycle
   - No → Proceed

4. **Does it violate layer hierarchy?**
   - Yes → Refactor architecture
   - No → Proceed

5. **Can it be avoided with composition?**
   - Yes → Use composition instead
   - No → Add dependency

### Example: Should Purchase depend on Allocation?

**Question:** Purchase simulation needs to know available monthly surplus.

**Option 1:** Import `calculateAllocation()` from allocation domain
- ❌ Creates dependency: purchase → allocation
- ❌ Purchase becomes application layer (depends on domain)
- ❌ Harder to test in isolation

**Option 2:** Accept `availableMonthlySurplus` as input parameter
- ✅ No dependency
- ✅ Purchase remains independent
- ✅ Caller provides allocation result
- ✅ Easier to test

**Decision:** Option 2 (accept as parameter)

---

## Testing Boundaries

### Unit Tests

Each domain tests in isolation:

```typescript
// allocation/__tests__/calculate-allocation.test.ts
import { calculateAllocation } from '../calculate-allocation';
// No imports from other domains
```

### Integration Tests

Integration tests can import multiple domains:

```typescript
// tests/integration/purchase-decision.test.ts
import { calculateAllocation } from '@/allocation';
import { simulatePurchase } from '@/purchase';
import { calculateEMI } from '@/loan';
```

**Rationale:** Integration tests validate domain interactions.

---

## Documentation Requirements

### Each Domain Must Document:

1. **Public API** - What functions are exported
2. **Dependencies** - What it imports from other domains
3. **Types** - What types it exports
4. **Validation** - What validation it performs
5. **Error Handling** - What errors it throws

### Example: Loan Domain README

```markdown
# Loan Domain

## Public API
- `calculateEMI()`
- `simulateLoan()`
- `generateAmortization()`
- `calculatePrepayment()`

## Dependencies
- `shared/types`
- `shared/utils`
- `shared/constants`

## Types
- `EMIResult`
- `LoanSimulationResult`
- `AmortizationEntry`

## Validation
- Validates at public API boundary using Zod
- Throws on invalid input

## Error Handling
- Throws `Error` for validation failures
- Returns results for business warnings
```

---

## Enforcement Checklist

Before merging any code:

- [ ] No circular dependencies
- [ ] No reverse dependencies (shared → domain)
- [ ] No forbidden cross-domain dependencies
- [ ] All imports use public API (domain index)
- [ ] Type-only imports where possible
- [ ] No external dependencies added without approval
- [ ] Dependency graph updated if needed
- [ ] Documentation updated

---

## Future Considerations

### V2 Potential Changes

**May Add:**
- `tax` domain (tax calculations)
- `investment` domain (portfolio analysis)
- `insurance` domain (insurance recommendations)

**Dependency Rules Will Remain:**
- All new domains depend only on `shared`
- Application layer can depend on domain layer
- No circular dependencies

**Migration Path:**
- Each domain can become a microservice
- Shared becomes a library
- Clean boundaries enable extraction

---

## Summary

### Key Principles

1. **Shared is the foundation** - No dependencies
2. **Domains are independent** - Only depend on shared
3. **Application layer orchestrates** - Can depend on domains
4. **No circular dependencies** - Ever
5. **Dependencies flow downward** - Never upward

### Allowed Dependency Pattern

```
Application Layer (purchase, forecast, financial-health)
    ↓
Domain Layer (allocation, loan, goal, confidence)
    ↓
Shared Layer (types, utils, constants, validation)
```

### Forbidden Patterns

```
shared → domain          ❌
domain → application     ❌
domain ↔ domain          ❌ (except purchase → loan, forecast → allocation)
```

---

**Status:** Final  
**Enforcement:** TypeScript + CI/CD  
**Review Frequency:** Every major version  
**Last Updated:** 2024-12-19

---

**Document Version:** 1.0  
**Next Review:** Before v2.0.0
