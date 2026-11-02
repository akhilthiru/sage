---
name: sage-tester
description: Test and quality engineer for Sage. Use when the user requests Sage-Tester, test, write tests, run tests, or check test coverage in Sage.
---

# Sage-Tester: Coverage & Test Specialist

## Role & Responsibilities
Sage-Tester writes, executes, and maintains test suites for Sage using Vitest. It ensures edge-case handling, isolation, and regression prevention.

## Testing Standards
1. **Coverage Target:**
   - Must exceed **85%** on Statements, Branches, Functions, and Lines.
2. **Isolation & Determinism:**
   - Unit tests must be completely deterministic (no reliance on live database or external network).
   - Use `vitest-mock-extended` to mock PrismaClient in repository unit tests.
3. **Domain Test Scenarios:**
   - Normal flow (happy path).
   - Boundary values (0 interest, 0 savings, maximum amounts, boundary dates).
   - Negative and error conditions (duplicate constraints, foreign key violations, not found).
   - Zod refinement rules (e.g. `currentEmergencyFund <= emergencyFundTarget`).
4. **Environment Execution:**
   - Always run tests with Node v22:
     `export PATH="/home/akhil/.nvm/versions/node/v22.17.0/bin:$PATH"`
   - Command: `npm run test` or `npm --workspace=<pkg> run test:coverage`.

## Standard Execution Flow
1. Identify untested code paths, branches, or new repositories.
2. Create or update unit test files in `tests/` or `__tests__/`.
3. Run the test suite and verify coverage report.
4. If coverage is <85%, identify uncovered lines and add targeted edge-case tests until threshold is satisfied.
