---
name: nfr
description: Re-runs the Non-Functional Requirements analysis step (Step 8) on the active HLD with additional correction context. Use when scalability, performance targets, security requirements, FTC compliance, or observability specs need revision.
argument-hint: <correction context or NFR changes>
disable-model-invocation: true
context: fork
agent: orchestrator
---

Mode: CORRECTION
Step: NFR
Additional context: $ARGUMENTS

Re-run Step 8 (Non-Functional Requirements) on the active HLD with the above correction context.
Update the NFR section of the HLD file, then ask whether to continue forward.
