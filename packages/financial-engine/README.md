# @sage/financial-engine

Deterministic financial calculation engine for Sage AI Personal CFO.

## Features

- ✅ Pure TypeScript - No dependencies on React, databases, or external APIs
- ✅ 100% Test Coverage - Every function fully tested
- ✅ Type-Safe - Strict TypeScript with Zod validation
- ✅ Deterministic - Same input always produces same output
- ✅ Zero Side Effects - Pure functions only
- ✅ Framework Agnostic - Use anywhere

## Installation

```bash
npm install @sage/financial-engine
```

## Quick Start

```typescript
import { calculateEMI, calculateAllocation } from '@sage/financial-engine';

// Calculate loan EMI
const emi = calculateEMI({
  principal: 500000,
  annualInterestRate: 12,
  tenureMonths: 24
});
console.log(emi.emi); // 23539.23

// Calculate monthly allocation
const allocation = calculateAllocation({
  userId: 'user_123',
  month: 12,
  year: 2024,
  monthlyIncome: 80000,
  // ... other parameters
});
console.log(allocation.goalSavings); // 15000
```

## Available Functions

### Core Engines

- `calculateAllocation()` - Distribute income across financial priorities
- `calculateEMI()` - Calculate loan EMI
- `simulateLoan()` - Loan affordability assessment with amortization
- `projectGoalTimeline()` - Goal feasibility and timeline projection

### Simulation Engines

- `simulatePurchase()` - 3 purchase affordability scenarios
- `forecastCashFlow()` - Month-by-month cash flow projection

### Analysis Engines

- `calculateConfidence()` - Prediction reliability scoring
- `calculateFinancialHealth()` - Overall financial wellness assessment

## Documentation

- [API Reference](./docs/financial-engine-contracts.md)
- [Implementation Plan](./docs/implementation-plan.md)
- [Testing Strategy](./docs/testing-strategy.md)
- [Architecture Decisions](./docs/adr/)

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Build package
npm run build

# Type check
npm run type-check
```

## License

MIT
