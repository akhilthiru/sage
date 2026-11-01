---
name: scope
description: Re-runs the Scope & Boundary Definition step (Step 2) on the active HLD with additional correction context. Use when in-scope items, out-of-scope exclusions, assumptions, dependencies, or risk ratings need to be revised.
argument-hint: <correction context or scope changes>
disable-model-invocation: true
context: fork
agent: orchestrator
---

Mode: CORRECTION
Step: SCOPE
Additional context: $ARGUMENTS

Re-run Step 2 (Scope & Boundary Definition) on the active HLD with the above correction context.
Update the Scope & Boundaries section of the HLD file, then ask whether to continue forward.
