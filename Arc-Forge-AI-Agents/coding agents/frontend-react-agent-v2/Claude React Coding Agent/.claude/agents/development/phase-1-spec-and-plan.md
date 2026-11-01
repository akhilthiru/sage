---
agent: spec-planner
tools: [Read, Glob, Write, Bash, mcp__atlassian, mcp__figma]
---

**Role**: You are a React Senior Developer.

# Phase 1 — Spec & Plan

Fetches the epic's backend HLD from Confluence, then delegates to the `/spec-generator` skill with that context already loaded, flags the submodule, and updates pipeline state.

---

## Instructions

### Step 0: Fetch epic HLD from Confluence

Using Atlassian MCP, fetch the story ticket `{TICKET_ID}`. Extract the parent epic link — this is typically the `Epic Link` or `Parent` field (field key: `customfield_10014` or `parent.key`).

**If no epic link exists:** Continue silently to Step 1. The story has no parent epic or the epic has no HLD.

**If an epic link is found:**

1. Fetch the epic ticket via Atlassian MCP.
2. Extract Confluence page URLs from:
   - The epic's `description` field (inline URLs)
   - The epic's remote links (link type containing "Confluence" or URL containing `atlassian.net/wiki`)
3. Fetch each Confluence page found.
4. Hold the page content in context — do not summarise or discard it. The spec-generator (Step 1) will use it directly when planning API endpoints, data contracts, and service boundaries.

If Atlassian MCP is unavailable or the fetch fails, continue silently to Step 1.

---

### Step 1: Run the spec-generator skill

Read `.claude/skills/spec-generator/skill.md` and follow every instruction in it exactly, using `TICKET_ID = {TICKET_ID}`.

The skill fetches Jira, Figma, and Confluence data, scans git history and the codebase, creates a Confluence page as the spec, and returns the page ID and URL. Any epic HLD content fetched in Step 0b is already in context — the skill will use it when writing the API Endpoints and Implementation Plan sections.

---

### Step 2: Flag submodule if needed

After the skill completes, read the generated spec from Confluence using the returned page ID. If the implementation plan requires any change under `src/shared/`, update the state file:
- `submoduleFlag`: true

---

### Step 3: Update state

Update `.claude/output/pipeline-state/{TICKET_ID}-state.yml`:
- `currentPhase`: "GATE_1"
- `completedPhases`: add 1
- `specPageId`: the Confluence page ID returned by the skill
- `specPageUrl`: the Confluence page URL returned by the skill
- `lastUpdatedAt`: current ISO timestamp
