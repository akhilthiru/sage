# Financial Engine: Implementation Plan

**Package:** `@sage/financial-engine`  
**Version:** 1.0.0  
**Status:** Final Design Review  
**Date:** 2024-12-19

---

## Executive Summary

This document outlines the implementation plan for the Financial Engine package - the deterministic calculation core of Sage AI Personal CFO. This package is the **source of truth** for all financial calculations and must remain completely independent of AI, databases, and external services.

**Core Principle:** AI explains. Engine calculates. Never mix them.

---

## Package Architecture

### Domain-First Organization

The package follows **Domain-Driven Design** principles with clear domain boundaries:

```
packages/financial-engine/
├── src/
│   ├── allocation/              # Income distribution engine
│   │   ├── calculate-allocation.ts
│   │   ├── types.ts
│   │   ├── validation.ts
│   │   ├── index.ts
│   │   └── __tests__/
│   │       ├── calculate-allocation.test.ts
│   │       └── edge-cases.test.ts
│   │
│   ├── loan/                    # Loan & EMI calculations
│   │   ├── calculate-emi.ts
│   │   ├── generate-amortization.ts
│   │   ├── assess-affordability.ts
│   │   ├── calculate-prepayment.ts
│   │   ├── types.ts
│   │   ├── validation.ts
│   │   ├── index.ts
│   │   └── __tests__/
│   │
│   ├── goal/                    # Goal feasibility & projection
│   │   ├── calculate-feasibility.ts
│   │   ├── project-timeline.ts
│   │   ├── generate-recommendations.ts
│   │   ├── types.ts
│   │   ├── validation.ts
│   │   ├── index.ts
│   │   └── __tests__/
│   │
│   ├── purchase/                # Purchase affordability simulation
│   │   ├── simulate-purchase.ts
│   │   ├── simulate-buy-from-savings.ts
│   │   ├── simulate-loan.ts
│   │   ├── simulate-save-first.ts
│   │   ├── determine-recommendation.ts
│   │   ├── types.ts
│   │   ├── validation.ts
│   │   ├── index.ts
│   │   └── __tests__/
│   │
│   ├── forecast/                # Cash flow projection (V1: Linear only)
│   │   ├── project-cash-flow.ts
│   │   ├── analyze-goal-impact.ts
│   │   ├── types.ts
│   │   ├── validation.ts
│   │   ├── index.ts
│   │   └── __tests__/
│   │
│   ├── confidence/              # Prediction reliability scoring
│   │   ├── calculate-confidence.ts
│   │   ├── calculate-factors.ts
│   │   ├── types.ts
│   │   ├── validation.ts
│   │   ├── index.ts
│   │   └── __tests__/
│   │
│   ├── financial-health/        # Overall financial wellness
│   │   ├── calculate-health.ts
│   │   ├── calculate-metrics.ts
│   │   ├── generate-recommendations.ts
│   │   ├── types.ts
│   │   ├── validation.ts
│   │   ├── index.ts
│   │   └── __tests__/
│   │
│   ├── shared/                  # Shared utilities & types
│   │   ├── types/
│   │   │   ├── common.ts
│   │   │   ├── goal.ts
│   │   │   ├── expense.ts
│   │   │   ├── debt.ts
│   │   │   └── index.ts
│   │   ├── validation/
│   │   │   ├── schemas.ts
│   │   │   └── index.ts
│   │   ├── constants/
│   │   │   ├── financial-constants.ts
│   │   │   ├── validation-constants.ts
│   │   │   └── index.ts
│   │   └── utils/
│   │       ├── date-utils.ts
│   │       ├── frequency-utils.ts
│   │       ├── math-utils.ts
│   │       └── index.ts
│   │
│   └── index.ts                 # Main package export
│
├── docs/
│   ├── implementation-plan.md           # This file
│   ├── financial-engine-contracts.md    # Public API contracts
│   ├── dependency-rules.md              # Module boundaries
│   ├── testing-strategy.md              # Testing approach
│   ├── readiness-review.md              # GO/NO-GO assessment
│   ├── adr/
│   │   ├── adr-001-pure-functions.md
│   │   ├── adr-002-deterministic-calculations.md
│   │   └── adr-003-confidence-engine.md
│   └── API.md                           # API reference
│
├── tests/
│   ├── integration/
│   │   ├── allocation-flow.test.ts
│   │   ├── goal-lifecycle.test.ts
│   │   ├── purchase-decision.test.ts
│   │   └── financial-health.test.ts
│   └── fixtures/
│       ├── test-users.ts
│       ├── test-goals.ts
│       ├── test-expenses.ts
│       └── test-scenarios.ts
│
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
└── README.md
```

---

## Domain Ownership

### 1. Allocation Domain
**Owner:** Income distribution logic  
**Responsibility:** Distribute monthly income across financial priorities  
**Public API:** `calculateAllocation()`  
**Dependencies:** `shared` only

### 2. Loan Domain
**Owner:** Loan calculations  
**Responsibility:** EMI, amortization, affordability assessment  
**Public API:** `calculateEMI()`, `simulateLoan()`, `generateAmortization()`, `calculatePrepayment()`  
**Dependencies:** `shared` only

### 3. Goal Domain
**Owner:** Goal feasibility & projection  
**Responsibility:** Calculate if goals are achievable and when  
**Public API:** `projectGoalTimeline()`, `calculateFeasibility()`  
**Dependencies:** `shared` only

### 4. Purchase Domain
**Owner:** Purchase affordability simulation  
**Responsibility:** Simulate 3 purchase scenarios  
**Public API:** `simulatePurchase()`  
**Dependencies:** `shared`, `loan` (for EMI calculation)

### 5. Forecast Domain
**Owner:** Cash flow projection  
**Responsibility:** Linear month-by-month projection  
**Public API:** `forecastCashFlow()`, `analyzeGoalImpact()`  
**Dependencies:** `shared`, `allocation`  
**V1 Scope:** Deterministic linear projection only (no ML, no trends)

### 6. Confidence Domain
**Owner:** Prediction reliability  
**Responsibility:** Calculate confidence scores for predictions  
**Public API:** `calculateConfidence()`  
**Dependencies:** `shared` only

### 7. Financial Health Domain
**Owner:** Overall financial wellness  
**Responsibility:** High-level financial health assessment  
**Public API:** `calculateFinancialHealth()`  
**Dependencies:** `shared` only  
**New in V1:** Dashboard metric

### 8. Shared Domain
**Owner:** Common utilities, types, constants  
**Responsibility:** Provide reusable primitives  
**Public API:** Types, utilities, constants  
**Dependencies:** None (leaf node)

---

## Technology Stack

```yaml
Language: TypeScript 5.3+
Runtime: Node.js 18+ (development/testing only)
Build: tsup 8.0+
Testing: Vitest 1.0+
Validation: Zod 3.22+ (boundaries only)
```

### Dependencies

**Production:**
- `zod`: ^3.22.4 (input validation at boundaries)

**Development:**
- `typescript`: ^5.3.3
- `tsup`: ^8.0.1
- `vitest`: ^1.0.4
- `@types/node`: ^20.10.0

**Zero Runtime Dependencies** (except Zod)

---

## Build Strategy

### Build Configuration (tsup)

```typescript
// tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false,
  target: 'es2022'
});
```

### Output Formats
- **CommonJS** - For Node.js compatibility
- **ESM** - For modern bundlers
- **TypeScript Declarations** - Full type support

### Bundle Size Target
- **Unminified:** < 100KB
- **Minified:** < 50KB
- **Gzipped:** < 15KB

---

## Testing Strategy

### Coverage Requirements

**Critical Financial Paths (100% coverage required):**
- `calculateEMI()`
- `simulateLoan()`
- `calculateAllocation()`
- `projectGoalTimeline()`
- `calculateFinancialHealth()`

**Overall Package:**
- **Target:** 85%+ coverage
- **Minimum:** 80% coverage

### Test Categories

1. **Unit Tests** - Test individual functions
2. **Integration Tests** - Test domain workflows
3. **Edge Case Tests** - Boundary conditions
4. **Performance Tests** - Calculation speed
5. **Property Tests** - Mathematical properties

### Test Organization

```
Each domain owns its tests:
- allocation/__tests__/
- loan/__tests__/
- goal/__tests__/
etc.

Integration tests in tests/integration/
```

---

## Development Phases

### Phase 1: Foundation (Days 1-2)
**Goal:** Set up package infrastructure

**Tasks:**
1. Initialize package structure
2. Configure TypeScript (strict mode)
3. Configure build (tsup)
4. Configure testing (vitest)
5. Create shared types
6. Create shared utilities
7. Create shared constants
8. Create shared validation schemas

**Deliverables:**
- Working build pipeline
- Test infrastructure
- Shared domain complete
- 100% test coverage on utilities

**Risk:** Low

---

### Phase 2: Core Engines (Days 3-5)
**Goal:** Implement critical calculation engines

**Priority Order:**
1. **Loan Domain** (Day 3)
   - `calculateEMI()` - Most critical, used by other domains
   - `generateAmortization()`
   - `assessAffordability()`
   - Tests: 100% coverage required

2. **Allocation Domain** (Day 4)
   - `calculateAllocation()` - Core waterfall logic
   - Tests: 100% coverage required

3. **Goal Domain** (Day 5)
   - `calculateFeasibility()`
   - `projectGoalTimeline()`
   - `generateRecommendations()`
   - Tests: 100% coverage required

**Deliverables:**
- 3 core engines complete
- 100% test coverage
- All edge cases handled

**Risk:** Medium (complex business logic)

---

### Phase 3: Simulation Engines (Days 6-7)
**Goal:** Implement simulation and analysis

**Tasks:**
1. **Purchase Domain** (Day 6)
   - `simulatePurchase()`
   - 3 scenario simulations
   - Recommendation logic
   - Tests: 85%+ coverage

2. **Forecast Domain** (Day 7)
   - `forecastCashFlow()` - Linear projection only
   - `analyzeGoalImpact()`
   - Tests: 85%+ coverage

**Deliverables:**
- Purchase simulation complete
- Cash flow projection complete
- Integration tests passing

**Risk:** Low (builds on core engines)

---

### Phase 4: Supporting Engines (Day 8)
**Goal:** Implement confidence and health scoring

**Tasks:**
1. **Confidence Domain**
   - `calculateConfidence()`
   - Factor calculation
   - Tests: 85%+ coverage

2. **Financial Health Domain** (NEW)
   - `calculateFinancialHealth()`
   - Metric calculations
   - Recommendation generation
   - Tests: 100% coverage (dashboard critical)

**Deliverables:**
- Confidence engine complete
- Financial health engine complete
- All 8 engines implemented

**Risk:** Low

---

### Phase 5: Integration & Polish (Days 9-10)
**Goal:** Integration testing, documentation, review

**Tasks:**
1. Integration tests for all workflows
2. Performance benchmarking
3. API documentation
4. Usage examples
5. README completion
6. Final review

**Deliverables:**
- All tests passing
- Performance benchmarks met
- Complete documentation
- Package ready for publishing

**Risk:** Low

---

## Risk Assessment

### Technical Risks

**Risk 1: Complex Allocation Logic**
- **Severity:** Medium
- **Probability:** Medium
- **Mitigation:** Extensive unit tests, property-based testing
- **Contingency:** Simplify waterfall algorithm if needed

**Risk 2: EMI Calculation Precision**
- **Severity:** High
- **Probability:** Low
- **Mitigation:** Validate against known calculators, financial expert review
- **Contingency:** Use well-tested formula from specification

**Risk 3: Edge Case Coverage**
- **Severity:** Medium
- **Probability:** Medium
- **Mitigation:** Comprehensive edge case test suite
- **Contingency:** Add tests as edge cases discovered

**Risk 4: Performance Targets**
- **Severity:** Low
- **Probability:** Low
- **Mitigation:** Benchmark early, optimize if needed
- **Contingency:** Most calculations are simple math (< 1ms)

### Process Risks

**Risk 5: Scope Creep**
- **Severity:** Medium
- **Probability:** Medium
- **Mitigation:** Strict adherence to V1 scope (no ML, no advanced forecasting)
- **Contingency:** Defer to V2

**Risk 6: Solo Development**
- **Severity:** Low
- **Probability:** N/A
- **Mitigation:** AI-assisted development, clear documentation
- **Contingency:** Well-defined contracts enable parallel work later

---

## Module Boundaries

### Dependency Rules

**Allowed:**
- Any domain → `shared`
- `purchase` → `loan` (for EMI calculation)
- `forecast` → `allocation` (for projection)

**Forbidden:**
- `shared` → any domain
- Cross-domain dependencies (except allowed above)
- Circular dependencies

**Validation:**
- Enforced by TypeScript imports
- Validated in CI/CD
- Documented in dependency-rules.md

---

## Validation Strategy

### Zod Usage: Boundaries Only

**Use Zod for:**
- Public API input validation
- External data parsing
- Type inference at boundaries

**Do NOT use Zod for:**
- Internal function validation
- Deep validation in calculation chains
- Performance-critical paths

**Rationale:**
- Keep core engine lightweight
- Deterministic performance
- Validation overhead only at entry points

### Example

```typescript
// ✅ GOOD: Validate at boundary
export function calculateAllocation(input: unknown): Allocation {
  const validated = AllocationInputSchema.parse(input);
  return calculateAllocationInternal(validated);
}

// ✅ GOOD: Internal function trusts input
function calculateAllocationInternal(input: AllocationInput): Allocation {
  // No validation, just calculation
}

// ❌ BAD: Validating inside calculation chain
function calculateAllocationInternal(input: AllocationInput): Allocation {
  AllocationInputSchema.parse(input); // Unnecessary overhead
}
```

---

## Performance Targets

| Function | Target | Max Acceptable |
|----------|--------|----------------|
| `calculateAllocation()` | < 50ms | 100ms |
| `calculateEMI()` | < 1ms | 10ms |
| `simulatePurchase()` | < 100ms | 200ms |
| `projectGoalTimeline()` | < 10ms | 50ms |
| `forecastCashFlow(60mo)` | < 300ms | 500ms |
| `calculateConfidence()` | < 50ms | 100ms |
| `calculateFinancialHealth()` | < 50ms | 100ms |

---

## Future Extensibility

### V2 Considerations

**Deferred to V2:**
- Machine learning forecasting
- Spending behavior prediction
- Trend analysis
- Probabilistic projections
- Tax optimization
- Investment recommendations

**V1 Foundation:**
- Clean domain boundaries enable future extraction
- Pure functions enable parallel computation
- Type safety enables refactoring
- Comprehensive tests enable confident changes

### Migration Paths

**To Microservices:**
- Each domain can become a service
- Shared domain becomes a library
- Contracts already defined

**To Mobile:**
- Pure TypeScript runs in React Native
- No platform-specific code
- Same calculations everywhere

**To API:**
- Expose engines as REST/GraphQL endpoints
- Validation already at boundaries
- Stateless functions enable horizontal scaling

---

## Success Criteria

### Functional Requirements
- ✅ All 8 engines implemented
- ✅ All public APIs defined
- ✅ All edge cases handled
- ✅ All validations in place

### Quality Requirements
- ✅ 100% coverage on critical paths
- ✅ 85%+ overall coverage
- ✅ All tests passing
- ✅ Zero TypeScript errors (strict mode)

### Performance Requirements
- ✅ All benchmarks met
- ✅ Bundle size < 50KB (minified)
- ✅ Zero runtime dependencies (except Zod)

### Documentation Requirements
- ✅ Complete API documentation
- ✅ Usage examples for all engines
- ✅ Architecture Decision Records
- ✅ Dependency rules documented

---

## Development Guidelines

### For Solo Founder
- **Start simple:** Implement core engines first
- **Test early:** Write tests alongside code
- **Document decisions:** Capture rationale in ADRs
- **Avoid over-engineering:** No premature optimization

### For AI-Assisted Development
- **Clear contracts:** Well-defined types enable AI assistance
- **Comprehensive tests:** Tests validate AI-generated code
- **Domain isolation:** Each domain can be implemented independently
- **Pure functions:** Easy for AI to understand and generate

### For Future Team
- **Domain ownership:** Clear boundaries for parallel work
- **Self-contained domains:** Each domain has everything it needs
- **Comprehensive docs:** Onboarding without tribal knowledge
- **Type safety:** Compiler catches integration errors

---

## Implementation Order

**Recommended sequence:**

1. **Shared domain** (foundation)
2. **Loan domain** (used by others)
3. **Allocation domain** (core logic)
4. **Goal domain** (depends on allocation)
5. **Purchase domain** (depends on loan)
6. **Forecast domain** (depends on allocation)
7. **Confidence domain** (independent)
8. **Financial Health domain** (uses multiple domains)

**Rationale:** Dependency order minimizes rework

---

## Monitoring & Metrics

### Development Metrics
- Test coverage (target: 85%+)
- Build time (target: < 10s)
- Test execution time (target: < 5s)
- Bundle size (target: < 50KB)

### Quality Metrics
- TypeScript errors (target: 0)
- Linting errors (target: 0)
- Test failures (target: 0)
- Performance regressions (target: 0)

---

## Approval Checklist

Before implementation begins:

- [ ] Architecture reviewed and approved
- [ ] All 8 engines scoped correctly
- [ ] Domain boundaries validated
- [ ] Dependency rules clear
- [ ] Testing strategy approved
- [ ] Performance targets realistic
- [ ] Timeline acceptable (10 days)
- [ ] Risk assessment reviewed
- [ ] Success criteria agreed

---

**Status:** Ready for Final Review  
**Next Step:** Review financial-engine-contracts.md  
**Blocking Issues:** None  
**Recommendation:** Proceed to contract definition

---

**Document Version:** 1.0  
**Last Updated:** 2024-12-19  
**Author:** Sage Development Team
