# Skill: MCP Health Check

Probes all configured MCP servers with a lightweight call and reports connectivity status. Used by Phase 0 (Jira Validator) and the Sprint Planner before any data fetching begins. Can also be invoked standalone via `/mcp-check`.

---

## Instructions

### Step 1: Probe each server

Run a lightweight call against each MCP server:

**Atlassian (Jira + Confluence):**
Using Atlassian MCP, fetch the current user's profile or any trivial endpoint that confirms the connection is alive.

**Figma:**
Using Figma MCP, fetch the current user's profile or a trivial endpoint.

For each server, record the result as either `connected` or `unavailable`.

---

### Step 2: Report status

Present the result to the developer:

```
🔌 MCP Connectivity Check

  Atlassian (Jira + Confluence) : ✅ connected  |  ❌ unavailable
  Figma                         : ✅ connected  |  ❌ unavailable
```

---

### Step 3: Handle failures

**All servers connected** → tell the developer "All MCP servers connected." and return control to the caller.

**One or more servers unavailable**:

If called from a pipeline command (state file exists), update `mcpStatus` in the state file with the result of each server (`"connected"` or `"unavailable"`).

Present to the developer:

```
⚠️ One or more MCP servers are unavailable.

Unavailable: [list each]

Options:
  continue   → proceed with available servers (affected phases will offer fallbacks)
  abort      → stop here
```

Wait for response:
- `continue` → return control to the caller with the connectivity status noted
- `abort` → stop execution

**If called standalone** (no state file context): report the results and exit. No further action required.
