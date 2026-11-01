---
name: hld
description: Starts a full High-Level Design workflow for a new feature. Runs all 9 design steps in sequence — requirements, scope, bounded context, service communication, database design, API design, diagrams, NFR, and review — producing a single HLD document.
argument-hint: <feature name and description>
disable-model-invocation: true
context: fork
agent: orchestrator
---

Mode: FRESH_HLD
Feature description: $ARGUMENTS

Start from Step 1 and run the full HLD workflow through all 9 steps.
Produce a single HLD file at `outputs/{feature-name}/hld.md`.
