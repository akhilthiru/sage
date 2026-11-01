---
name: Project Arch Agent System Design
description: Architecture decisions for the solution architecture agent itself — approach, constraints, key design choices
type: project
---

This project is a Claude Code native multi-agent system. It does NOT use Python scripts or the Anthropic SDK directly. Everything runs through Claude Code's native agent/command infrastructure.

**Key design decisions:**

- **Runtime**: Claude Code terminal or desktop only — no cloud deployment
- **Entry point**: Slash commands in `.claude/commands/` (e.g. `/arch-agent`)
- **Agents**: Sub-agents defined in `.claude/agents/*.md` with frontmatter and system prompts
- **Confluence**: Read via `getConfluencePage` / `getConfluencePageDescendants` MCP tools; write via `createConfluencePage` / `updateConfluencePage` MCP tools
- **Shared context**: Orchestrator writes to `.claude/memory/session_context.md`; sub-agents read it with the `Read` tool
- **Human-in-loop**: Natural Claude Code conversation — user types `publish` / `revise: ...` / `skip`
- **Diagrams**: Mermaid in Confluence storage format using the `mermaid` structured macro
- **Product agnosticism**: Cloud provider, tech stack, compliance — all from intake form. Nothing hardcoded.
- **Templates**: In `templates/` at project root (outside `.claude/`). Sub-agents read them with the `Read` tool.

**MCP plugin**: Atlassian MCP — the plugin UUID in agent frontmatter (`mcp__<uuid>__*`) is resolved at runtime from the user's own Claude Code MCP configuration and will differ per machine.

**Why no Python:** This project deliberately avoids Python. Claude Code agents using MCP tools are sufficient for reading Confluence, generating content with Claude, and publishing back.
