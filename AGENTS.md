# Antigravity Workspace Configuration — Sage

Sage is an AI-powered Personal CFO built with a modular monolith architecture.

## Primary Instructions
1. **Core Principle:** AI Explains, Engine Calculates. All financial calculations must be deterministic in `packages/financial-engine`.
2. **Architecture:** Modular Monolith using TypeScript strict mode, Prisma ORM, and Next.js 14+ App Router.
3. **Workflow:** 
   - Planning first (Sage-Planner).
   - Implementation follows approved specs (Sage-Dev).
   - Code review verifies quality, types, and security (Sage-Reviewer & Sage-Architect).
   - Comprehensive Vitest test suites must pass with >85% coverage (Sage-Tester).
4. **Environment:** Node.js v22.17.0 (`~/.nvm/versions/node/v22.17.0/bin`) and npm 10.9.2.

## Agent Invocation Shortcuts
- `Dev:` or `Sage-Dev:` -> Direct implementation.
- `Test:` or `Sage-Tester:` -> Test creation & coverage verification.
- `Review:` or `Sage-Reviewer:` -> Adversarial code & security review.
- `Architect:` or `Sage-Architect:` -> Architecture & boundary validation.
- `Plan:` or `Sage-Planner:` -> Spec planning (Human Gate 1).
- `Council:` or `Sage-Council:` -> Full council lifecycle orchestration.
