---
name: service-comms
description: Re-runs the Service Communication & Transaction Design step (Step 4) on the active HLD with additional correction context. Use when sync/async patterns need revision, events need to be added or changed, or failure/compensation handling needs updating.
argument-hint: <correction context or communication pattern changes>
disable-model-invocation: true
context: fork
agent: orchestrator
---

Mode: CORRECTION
Step: SERVICE_COMMS
Additional context: $ARGUMENTS

Re-run Step 4 (Service Communication & Transaction Design) on the active HLD with the above correction context.
Update the Service Communication section of the HLD file, then ask whether to continue forward.
