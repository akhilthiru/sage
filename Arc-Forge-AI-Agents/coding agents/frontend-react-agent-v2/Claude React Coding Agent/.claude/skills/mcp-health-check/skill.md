# Skill: MCP Health Check

Probes all configured MCP servers with a lightweight call and reports connectivity status. Used by Phase 0 (Jira Validator) and the Sprint Planner before any data fetching begins. Can also be invoked standalone via `/mcp-check`.

---

## Instructions

### Step 1: Read MCP server list from project-config.md

Read `.claude/context/project-config.md` → **MCP Servers** table. This table defines which servers this project uses, whether each is required or optional, and which probe tool to call. Only probe the servers listed there — do not assume Atlassian or Figma are always present.

### Step 2: Probe each server

Read the MCP Servers table from project-config.md. For each server listed, run the probe defined below. Do not skip any server — do not default to 🔍 unless explicitly told to.

**Atlassian probe**: call `atlassianUserInfo`. Success = ✅ connected. Any failure = ❌ unavailable.

**Figma probe**: call `get_figma_data` with `fileKey = "PROBE"`.
- **Do NOT check `availableDeferredTools` or any tool list before attempting this call.** Always call `get_figma_data` directly — the tool may be available in the session even if it does not appear in the deferred tools list.
- Any response from the server — including API errors like "Invalid file key", "Not found", or "Forbidden" — means the server IS running → record ✅ connected.
- Only a tool-level failure at the infrastructure level (MCP server not available, connection refused) means the server is down → record ⚠️ unavailable.

---

### Step 3: Report status

Display one line per server:

```
🔌 MCP Connectivity Check

  Atlassian (Jira + Confluence) : ✅ connected  |  ❌ unavailable
  Figma (Design)                : ✅ connected  |  ⚠️ unavailable
```

---

### Step 4: Handle failures

**All mandatory servers connected** → return control to the caller.

**Optional server unavailable** → note it and return control to the caller. For Figma: add a warning that Phase 1 will ask for a screenshot or paste if a design URL is found. Update `mcpStatus.figma: "unavailable"` in the state file if one exists. Continue — do not stop.

**Any mandatory server unavailable** → STOP immediately. Do not return control. Do not create or modify any state file. Do NOT offer any manual alternative.

```
🚫 Pipeline cannot start — <server role> MCP is not connected.

The pipeline requires this connection throughout every phase.

To fix:
  1. Ensure the required environment variables are set in your system or
     shell profile, then restart your IDE.
  2. Restart the MCP server from the IDE MCP panel.
  3. Re-run this command once the server shows as connected.

No action has been taken.
```
