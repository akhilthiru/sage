---
name: db-schema
description: Re-runs the Database Schema & Core Logic Design step (Step 5) on the active HLD with additional correction context. Use when tables, columns, relationships, indexes, or business rules need to be revised.
argument-hint: <correction context or schema changes>
disable-model-invocation: true
context: fork
agent: orchestrator
---

Mode: CORRECTION
Step: DB_SCHEMA
Additional context: $ARGUMENTS

Re-run Step 5 (Database Schema & Core Logic) on the active HLD with the above correction context.
Update the Database Design section of the HLD file, then ask whether to continue forward.
