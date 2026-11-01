---
name: startup-check
description: Verifies that Atlassian MCP and Figma MCP are configured and reachable before starting any HLD workflow. Run this before /hld to ensure all integrations are ready.
argument-hint: (no arguments required)
disable-model-invocation: true
context: fork
agent: orchestrator
---

Mode: STARTUP_CHECK

Run the startup-check sub-agent to verify Atlassian MCP and Figma MCP connectivity.
Report readiness status to the user. Do not start any HLD workflow.
