---
name: diagrams
description: Re-runs the Component & Sequence Diagram generation step (Step 7) on the active HLD with additional correction context. Use when diagrams need updating after design changes or additional flows need to be illustrated.
argument-hint: <correction context or diagram changes>
disable-model-invocation: true
context: fork
agent: orchestrator
---

Mode: CORRECTION
Step: DIAGRAMS
Additional context: $ARGUMENTS

Re-run Step 7 (Component & Sequence Diagrams) on the active HLD with the above correction context.
Update the Diagrams section of the HLD file, then ask whether to continue forward.
