---
agent: figma-reader
attached_to: confluence-reader-agent
---

# Skill: Figma Reader

## Purpose
Detect Figma URLs in a list of remote links or hyperlinks, classify each by type, capture a screenshot of each screen via Figma MCP, and return the screenshots for the LLD generator to visually derive API request/response schemas.

> **Screenshot-only mode:** This skill uses `get_screenshot` only — it does NOT call `get_design_context`, `get_metadata`, or any other Figma MCP tool. One `get_screenshot` call per nodeId is the entire Figma read. This minimises MCP call count and avoids rate limits on View-seat plans.

## Used By
- `.claude/agents/confluence-reader-agent.md` — Step 7 (reads Figma URLs found on FRD child story pages)

---

## Step 1 — Detect Figma URLs

Given a list of URLs (from remote links, hyperlinks, or page content), identify Figma links:

```
A URL is a Figma link if object.url contains "figma.com"
```

For each Figma URL found, record:
- `url` — full URL
- `title` — the link title or surrounding text label
- `type` — classified from the URL path:

| URL path segment | Type | Meaning |
|-----------------|------|---------|
| `/file/` or `/design/` | `FILE` | Design file with frames and components |
| `/proto/` | `PROTOTYPE` | Clickable prototype — extract nodeId if present, screenshot it |
| `/board/` | `BOARD` | FigJam board — skip (no screen data useful for API design) |

**Deduplication:** If the same Figma file URL appears in multiple sources (Jira remote link + Confluence page link), record it once. Track `sources: ["jira_remote_link", "confluence_story_page"]`.

---

## Step 2 — Parse fileKey and nodeId from URL

Extract from the URL:

| URL pattern | fileKey | nodeId |
|------------|---------|--------|
| `figma.com/design/:fileKey/:name?node-id=:nodeId` | `:fileKey` | `:nodeId` (convert `-` to `:`) |
| `figma.com/file/:fileKey/:name?node-id=:nodeId` | `:fileKey` | `:nodeId` (convert `-` to `:`) |
| `figma.com/design/:fileKey/:name` (no nodeId) | `:fileKey` | `null` — screenshot the file cover |
| `figma.com/proto/:fileKey/:name?node-id=:nodeId` | `:fileKey` | `:nodeId` |

If `node-id` contains `-` (URL-encoded), replace with `:` before passing to the MCP tool (e.g. `23-45` → `23:45`).

---

## Step 3 — Capture Screenshot via Figma MCP

For each unique Figma `FILE` or `PROTOTYPE` URL:

```
Tool: mcp__claude_ai_Figma__get_screenshot
Input: {
  fileKey: "<fileKey>",
  nodeId: "<nodeId or null>"
}
```

The tool returns a screenshot image of the specified frame/node (or the file cover if no nodeId).

**One call per URL.** Do not call any other Figma MCP tool (no `get_design_context`, `get_metadata`, `get_variable_defs`, etc.).

Store the result:
```json
{
  "url": "https://www.figma.com/design/abc123/Order-Management?node-id=23:45",
  "title": "Commit Stock Item — Desktop",
  "type": "FILE",
  "fileKey": "abc123",
  "nodeId": "23:45",
  "sources": ["jira_remote_link"],
  "screenshot": "<image data returned by get_screenshot>",
  "frames_read": true
}
```

If `get_screenshot` returns an error or empty result, set `frames_read: false` and record the error message.

---

## Step 4 — Return FigmaLink Objects

Return one `FigmaLink` object per unique URL:

```json
{
  "url": "https://www.figma.com/design/abc123/Order-Management?node-id=23:45",
  "title": "Commit Stock Item — Desktop",
  "type": "FILE",
  "sources": ["jira_remote_link"],
  "frames_read": true,
  "screenshot": "<image data>",
  "note": "Screenshot captured. LLD generator reads this image directly to derive field names, types, and layout."
}
```

---

## Error Handling

| Situation | Action |
|-----------|--------|
| Figma MCP rate limit hit | Return `frames_read: false`, `error: "RATE_LIMIT"`. Do NOT retry — surface to orchestrator. The orchestrator will report rate limit reached and offer resume options. |
| File access denied (no viewer permission) | Return `frames_read: false`, `error: "ACCESS_DENIED: <url>"`. Surface to user: grant Viewer access then retry. |
| `get_screenshot` returns empty / null image | Return `frames_read: false`, `error: "EMPTY_SCREENSHOT"`. Log and continue — do not halt pipeline. |
| `BOARD` type detected | Skip entirely — FigJam boards have no screen data useful for API design. |
| URL has no nodeId | Pass `nodeId: null` to `get_screenshot` — captures the file cover/default frame. |

---

## Usage Notes

- Call this skill once per unique Figma URL, not once per story (multiple stories may link to the same file/node)
- Pass the returned `FigmaLink[]` into `user_stories[].figma_links` keyed by story
- The LLD generator receives the `screenshot` image and reads it visually to derive field names, enums, validation rules, and layout — no structured extraction needed from this skill
- Total MCP calls = number of unique Figma URLs across all stories (typically 1 call per story screen)
