---
name: check
description: Standalone connectivity check — directly invokes the startup-check agent to verify Atlassian MCP and Figma MCP without going through the orchestrator workflow.
argument-hint: (no arguments required)
disable-model-invocation: true
context: fork
agent: startup-check
---

Verify Atlassian MCP and Figma MCP connectivity.
Report readiness status directly to the user.
