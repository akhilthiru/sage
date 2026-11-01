---
name: api-design
description: Re-runs the API & Integration Design step (Step 6) on the active HLD with additional correction context. Use when API endpoints, request/response contracts, error codes, or external integration specs need revision.
argument-hint: <correction context or API changes>
disable-model-invocation: true
context: fork
agent: orchestrator
---

Mode: CORRECTION
Step: API_DESIGN
Additional context: $ARGUMENTS

Re-run Step 6 (API & Integration Design) on the active HLD with the above correction context.
Update the API & Integration Design section of the HLD file, then ask whether to continue forward.
