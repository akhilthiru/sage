/**
 * @sage/application
 * 
 * Application Layer for Sage AI Personal CFO
 * 
 * Responsibilities:
 * - Orchestrates use cases and business workflows
 * - Bridges Presentation Layer with Persistence (@sage/database) and Calculations (@sage/financial-engine)
 * - Enforces invariant: "AI Explains, Engine Calculates" (zero calculations here)
 * - In-process Domain Event Bus
 * - DTOs & Zod Validation Schemas
 * - Typed Error Hierarchy & Result Pattern
 */

export * from './errors';
export * from './events';
export * from './dtos';
export * from './services';
