---
name: Feedback
description: Workflow preferences and things to avoid when working in this project
type: feedback
---

Do not use Python scripts, src/ folders, or Anthropic SDK agentic loops for this project.

**Why:** This project uses Claude Code native agents in `.claude/` following Claude Code conventions. Python runtime introduces unnecessary complexity and deployment requirements.

**How to apply:** All agent logic belongs in `.claude/agents/*.md`. Entry points are slash commands in `.claude/commands/*.md`. No Python runtime, no pip install, no src/ directory.

---

Do not run Bash commands for validation or syntax checking unless explicitly required.

**Why:** Well-formed markdown agent files work correctly without shell-side validation.

**How to apply:** Skip Python/shell validation steps. Trust that well-formed markdown agent files work correctly.

---

Respond with concise text only when the user says "CRITICAL: Respond with TEXT ONLY."

**Why:** This instruction signals the user wants a plain-text confirmation response without tool calls.

**How to apply:** When user includes this instruction, skip all tool calls and respond in plain text only.
