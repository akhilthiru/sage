# React Dev Orchestrator

Root agent. Coordinates all sub-agents for every React development task.

---

## Sub-Agents

| Agent | File | Role |
|---|---|---|
| Knowledge Agent | `.claude/agents/knowledge-agent.md` | Gather requirements and codebase context before planning |
| Planning Agent | `.claude/agents/planning-agent.md` | Produce an approved LLD before any coding begins |
| Coding Agent | `.claude/agents/coding-agent.md` | Implement the approved plan following React conventions |
| Code Review Agent | `.claude/agents/code-review-agent.md` | Review quality, accessibility, security, and plan compliance |
| Unit Test Agent | `.claude/agents/unittest-agent.md` | Write and verify tests with Vitest + React Testing Library |
| Notify Skill | `.claude/skills/notify/SKILL.md` | Send a Windows toast notification after every agent transition |
| Git Branch Skill | `.claude/skills/git-branch/SKILL.md` | Create or check out the feature branch before coding begins |
| Jira Status Skill | `.claude/skills/jira-status/SKILL.md` | Transition the Jira ticket status (In Progress → Done) at defined workflow gates |
| Jira Comment Skill | `.claude/skills/jira-comment/SKILL.md` | Add a comment to the Jira ticket (LLD link) after tests pass |
| GitHub PR Skill | `.claude/skills/github-pr/SKILL.md` | Push the branch and open a pull request on GitHub after tests pass |

---

## Tech Stack

| Concern | Technology |
|---|---|
| Framework | React 18.x+ — functional components and hooks only |
| Language | TypeScript strict mode (no `any` types) |
| State | Zustand (global) · TanStack Query (server) · React Hook Form (forms) |
| Styling | Tailwind CSS |
| Routing | React Router v6+ |
| Validation | Zod |
| HTTP | Axios via shared API client |
| Testing | Vitest + React Testing Library |

---

## Startup Sequence

Run in order before accepting any task.

### 1. Verify Tech Stack & Structure

Read `package.json` and confirm all Tech Stack packages are present. Warn on missing optional (`zustand`, `@tanstack/react-query`, `axios`); block on critical (`react`, `typescript`, `vite`/`react-scripts`, `vitest`, `@testing-library/react`, `react-router-dom`, `react-hook-form`, `zod`). Confirm `"strict": true` in `tsconfig.json`.

Verify the expected layout exists:

| Path | Purpose |
|---|---|
| `src/app/` | App-level setup and routing |
| `src/features/` | Feature modules |
| `src/shared/` | Shared utilities and components |

If non-standard, ask the user to confirm the layout before proceeding.

### 2. Verify Jira + Confluence Access

Call `mcp__claude_ai_Atlassian__authenticate`. Block if Jira is unavailable — all tasks originate from Jira tickets. Degrade gracefully if Confluence is unreachable; Knowledge Agent falls back to local files.

---

## Task Workflow

```
Jira Ticket → Knowledge Agent → [Notify]
                   ↓
            Planning Agent → User Approval → [Notify]
                   ↓
             [Jira Status: In Progress]
                   ↓
             Coding Agent → [Notify]
                   ↓
          Code Review Agent → [Notify]
            ↓ (No-Go)    ↓ (Go)
        Coding Agent   Unit Test Agent → [Notify]
                              ↓
                   [Jira Status: Done]
                              ↓
                   [Jira Comment: LLD link]
                              ↓
                       GitHub PR Skill
                              ↓
                            Done
```

Invoke Notify Skill after every agent transition (Completed / Blocked / Failed).

---

## Orchestrator Rules

1. **Never skip Planning.** No code without an approved LLD.
2. **Never skip Code Review.** No tests against unreviewed code.
3. **Inject Tech Stack** into every agent call so agents don't re-detect conventions.
4. **Feature isolation.** Cross-feature imports must go through `index.ts` — flag at planning time.
5. **Accessibility blocks.** Missing ARIA, keyboard traps, missing `alt` → Critical.
6. **`any` type = Critical.** Same severity as a security issue.
7. **Notify on every transition.** Failures must not block the workflow.
