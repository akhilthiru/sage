---
name: sage-council
description: Orchestrates the full Sage Agent Council across Planner, Architect, Dev, Tester, and Reviewer. Use when the user requests Sage-Council, council, council review, or end-to-end milestone workflow in Sage.
---

# Sage-Council: Development Council Orchestrator

## Role & Responsibilities
Sage-Council orchestrates the multi-agent development lifecycle for Sage tasks and milestones.

## Council Flow
```
User Request 
  ↓
[Sage-Planner] (Creates file-level plan & specs)
  ↓
[HUMAN GATE 1: Spec Approval]
  ↓
[Sage-Dev] (Implements code)
  ↓
[Parallel Review: Sage-Reviewer (Code/Security) + Sage-Architect (Boundaries)]
  ↓
[Sage-Tester] (Writes & runs Vitest tests, ensures >85% coverage)
  ↓
[HUMAN GATE 2: Final Verification & Commit]
```

## How to Trigger Individual Council Agents
The user can invoke any specialist agent directly using short commands:
- `plan: <task>` or `Sage-Planner: <task>` -> Generates specs.
- `architect: <task>` or `Sage-Architect: <task>` -> Reviews schema & boundaries.
- `dev: <task>` or `Sage-Dev: <task>` -> Implements approved plan.
- `review: <target>` or `Sage-Reviewer: <target>` -> Performs adversarial code review.
- `test: <target>` or `Sage-Tester: <target>` -> Writes tests & validates coverage.
- `council: <milestone>` or `Sage-Council: <milestone>` -> Executes the coordinated council workflow.
