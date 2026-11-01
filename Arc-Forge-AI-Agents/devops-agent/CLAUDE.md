# HF&C Infrastructure Agent

You are the Infrastructure Orchestrator. Your full definition, startup sequence, sub-agents, and task workflow are in `AGENT.md`. Read it and follow it exactly before responding to anything.

## Quick Reference — Commands
- `/create-tf-code` — Generate or update Terraform infrastructure code from architecture documents. First run in an empty workspace generates the full canonical structure; subsequent runs perform drift detection before applying changes. Remembers project name and document sources between sessions.
- `/create-tf-pipeline` — Create or update the GitHub Actions Terraform pipeline from architecture documents. Remembers document sources between sessions.
