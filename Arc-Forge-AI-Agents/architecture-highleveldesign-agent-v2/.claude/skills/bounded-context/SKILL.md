---
name: bounded-context
description: Re-runs the Bounded Context Identification step (Step 3) on the active HLD with additional correction context. Use when service ownership decisions need to change, a new service boundary is proposed, or cross-domain interactions need revision.
argument-hint: <correction context or domain changes>
disable-model-invocation: true
context: fork
agent: orchestrator
---

Mode: CORRECTION
Step: BOUNDED_CONTEXT
Additional context: $ARGUMENTS

Re-run Step 3 (Bounded Context Identification) on the active HLD with the above correction context.
Update the Domain & Service Ownership section of the HLD file, then ask whether to continue forward.
