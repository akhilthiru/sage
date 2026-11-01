---
name: requirements
description: Re-runs the Requirements Analysis step (Step 1) on the active HLD with additional correction context. Use when functional requirements need updating, gaps need addressing, or BA/PO feedback must be incorporated.
argument-hint: <correction context or additional requirements>
disable-model-invocation: true
context: fork
agent: orchestrator
---

Mode: CORRECTION
Step: REQUIREMENTS
Additional context: $ARGUMENTS

Re-run Step 1 (Requirements Analysis) on the active HLD with the above correction context.
Update the Requirements Summary section of the HLD file, then ask whether to continue forward.
