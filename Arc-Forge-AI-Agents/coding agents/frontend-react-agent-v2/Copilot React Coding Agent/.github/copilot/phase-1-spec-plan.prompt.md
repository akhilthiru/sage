---
mode: 'agent'
tools: ['codebase', 'file', 'terminal', 'atlassian', 'figma', 'bash', 'filesystem']
description: 'Phase 1 — Generate spec and implementation plan, publish to Confluence. Can run standalone or be called by the dev orchestrator.'
---

**Role**: You are a React Senior Developer.

# Phase 1 — Spec & Plan

Load `#file:.github/copilot-instructions.md`, `#file:.github/rules/coding-standards.md`, and `#file:.github/rules/project-config.md` before proceeding. Use `project-config.md` for: Confluence space key, spec parent page name, locale file paths, and all project-specific identifiers.

**Ticket ID**: ${input:ticketId:Jira ticket ID — e.g. PHNX-1234}

---

## Instructions

### Step 1: Figma gate — MUST complete before any other step

Use the `getJiraIssue` result already in context (fetched by the orchestrator). Do NOT call `searchJiraIssuesUsingJql` — use `getJiraIssue` directly if not yet in context.

**Figma URL search — search ALL of the following exhaustively:**

1. `fields.description` — the Jira description is Atlassian Document Format (ADF), a deeply nested JSON structure. Recursively walk every node and extract any text value or `href` attribute containing `figma.com`. Do not skim the top level only.
2. `fields.remotelinks` — check every remote link object's `url` field for `figma.com`.
3. `fields.comment.comments[].body` — each comment body is also ADF. Recursively search every comment for `figma.com`.
4. Any custom field value that contains a URL string.

If you find a `figma.com` URL anywhere in the above, that is the Figma URL for this ticket.

**If no Figma URL is found after searching all of the above:** Continue to Step 2.

**If a Figma URL is found AND Figma MCP is connected:** Call `get_design_context` with the file key and node ID from the URL. Hold the design context in memory. Continue to Step 2.

**If a Figma URL is found AND Figma MCP is unavailable:**

STOP IMMEDIATELY. This overrides the Fallback Transparency Rule — do NOT proceed automatically. Do not proceed to Step 2 or any later step. Do not fetch Confluence pages. Do not scan the codebase. Do not call `createConfluencePage`. Do not write any part of the spec.

Display this message exactly and wait:

```
🔴 Figma design required — MCP not connected

The Jira ticket links to a Figma design:
  <Figma URL>

Figma MCP is unavailable. The spec cannot be written without the design.

Choose one:
  screenshot  → paste a screenshot of the Figma design into this chat
  paste       → paste the screen names, layouts, and requirements as text

To connect Figma MCP instead: set FIGMA_API_TOKEN in your environment,
restart the Figma MCP server from the IDE MCP panel, then re-run this phase.
```

Do not continue until the developer replies with a screenshot or pasted design content. Only after receiving that input, hold it in memory as the design context and continue to Step 2.

### Step 2: Fetch epic HLD from Confluence

Extract the parent epic link from the ticket (`customfield_10014` or `parent.key`).

If an epic link exists:
1. Fetch the epic ticket via `getJiraIssue`
2. Extract Confluence page URLs from the epic's description and remote links
3. Fetch each Confluence page with `getConfluencePage`
4. Hold the page content in context — it informs the API Endpoints and Implementation Plan sections directly

If no epic link or fetch fails, continue silently.

### Step 3: Fetch Confluence reference page

Read any Confluence URL from the Jira ticket description. If one exists, fetch it with `getConfluencePage`. Use the content to inform acceptance criteria and API contracts. If unavailable, proceed with Jira data only.

### Step 4: Read Jira comments

From the `getJiraIssue` result already in context, read all entries in `fields.comment.comments[]`. Comments frequently contain scope decisions, product owner clarifications, and technical constraints that override the original description. Read every comment before writing any part of the spec.

### Step 5: Analyse git history

For each file expected to be modified, check recent history:

```bash
git log --oneline -10 -- src/features/<expected-feature-folder>
```

Note intentional patterns. Do not plan to "fix" a recently introduced convention.

### Step 6: Scan codebase for reusable components

Search before recommending anything new. Priority order:
1. **`@ui-kit`** — `PxDataGrid`, `PxDialogModal`, and other Kendo components
2. **`src/shared/`** — shared hooks, components, utilities
3. **External npm** — only if nothing above covers it (MIT/Apache/BSD/ISC licence only)

Search for:
- Similar feature folders and patterns
- Existing query hooks: `src/features/*/api/hooks/use*Queries.ts`
- Existing locale keys in the primary locale file (path from project-config.md) — avoid near-duplicates
- Permission constants: `src/shared/constants/permissions*`
- Service endpoint constants: `src/shared/constants/env-config*`

Document each finding as **Reuse**, **Extend**, or **New** (with import path).

### Step 7: Create the spec page in Confluence

`createConfluencePage` and `updateConfluencePage` both enforce a 1000-character limit in the claude.ai Atlassian MCP. Use a three-step approach: create placeholder → write spec to a local file → publish via PowerShell REST call (no character limit).

#### Step 7a: Create page with placeholder

Find the parent page: search for the spec parent page name (from project-config.md — **Project Identity → Spec parent page name**) in the space using `searchConfluenceUsingCql`; if none exists, use the space root.

Call `createConfluencePage`:
- **Space**: space key from project-config.md
- **Title**: `${input:ticketId} — <Jira Ticket Title>`
- **Parent**: page ID found above
- **Content**: `Spec being generated for ${input:ticketId}. Please wait.`

Record the returned **page ID** and **URL**. Do not proceed to Step 7b until you have these.

#### Step 7b: Write spec to local file

Convert the full spec to Confluence wiki markup using this guide:

| Markdown | Wiki markup |
|----------|------------|
| `# Heading` | `h1. Heading` |
| `## Heading` | `h2. Heading` |
| `### Heading` | `h3. Heading` |
| `**bold**` | `*bold*` |
| `` `code` `` | `{{code}}` |
| ` ```block``` ` | `{code}block{code}` |
| `- item` | `* item` |
| `- [ ] item` | `* ☐ item` |
| table header row | `\|\|col1\|\|col2\|\|` |
| table data row | `\|cell1\|cell2\|` |
| `---` | `----` |

Populate every section — do not leave placeholders. Any epic HLD content fetched in Step 2 is already in context — use it when writing the API Endpoints and Implementation Plan sections.

Using the filesystem MCP, write the complete spec in wiki markup to:
`.github/output/specs/${input:ticketId}-spec.wiki`

Create the directory first if it does not exist.

#### Step 7c: Publish to Confluence via PowerShell

Do NOT call `updateConfluencePage` — it also has a 1000-character limit. Run this via `terminal` to send the spec file to Confluence directly:

```powershell
$specContent = Get-Content ".github/output/specs/${input:ticketId}-spec.wiki" -Raw -Encoding UTF8
$bytes = [System.Text.Encoding]::UTF8.GetBytes("$env:ATLASSIAN_EMAIL`:$env:ATLASSIAN_API_TOKEN")
$base64 = [Convert]::ToBase64String($bytes)
$headers = @{ "Authorization" = "Basic $base64"; "Content-Type" = "application/json; charset=utf-8" }
$bodyObj = @{
    version = @{ number = 2 }
    title = "<${input:ticketId} — Jira Ticket Title>"
    type = "page"
    body = @{ wiki = @{ value = $specContent; representation = "wiki" } }
}
$bodyJson = [System.Text.Encoding]::UTF8.GetBytes(($bodyObj | ConvertTo-Json -Depth 5))
$response = Invoke-RestMethod -Uri "<Jira base URL from project-config.md>/wiki/rest/api/content/<pageId from Step 7a>" -Method PUT -Headers $headers -Body $bodyJson
Write-Output "Published: $($response._links.base)$($response._links.webui)"
```

If the command returns **401 Unauthorized**: `ATLASSIAN_EMAIL` and `ATLASSIAN_API_TOKEN` are not set as system environment variables. Display:
```
⚠️  Confluence publish failed — environment variables not set as system variables.

The spec has been saved locally at:
  .github/output/specs/${input:ticketId}-spec.wiki

To publish manually:
  1. Open the Confluence page: <specPageUrl>
  2. Click Edit, paste the content from the local file, and save.

To fix for future runs:
  Set ATLASSIAN_EMAIL and ATLASSIAN_API_TOKEN as system environment variables
  (not just in .vscode/mcp.json) and restart VS Code.
```

If the command succeeds: record the returned page URL as `specPageUrl` and continue to Step 8.

```markdown
# ${input:ticketId}: <Jira Ticket Title>

## Summary
<1–3 sentence description of what this feature/fix does and why>

## Jira Reference
- Ticket: ${input:ticketId}
- Type: Feature | Bug | Task
- Linked tickets: <list or N/A>
- Key decisions from comments: <summarise any decisions or constraints from Jira comments — omit if no substantive comments>

## Figma Reference
- Link: <Figma URL or "Not available">
- Screens: <list of screen names, or "N/A">

## Confluence Reference
- Link: <Confluence URL or "Not available">

## Acceptance Criteria
- [ ] <AC 1 from Jira>
- [ ] <AC 2 from Jira>
- [ ] <add any ACs implied by Figma not listed in Jira>

## Assumptions Made
- <Every decision you made where the ticket was ambiguous>
- <Anything the developer should verify before approving>

## Out of Scope
- <Anything explicitly excluded or deferred>

---

## Implementation Plan

### Feature Folder
`src/features/<feature-name>/`

### Files to Create
| File | Purpose |
|------|---------|
| `screens/<ScreenName>/<ScreenName>.tsx` | Main screen component |
| `api/<feature>-service.ts` | API functions |
| `api/hooks/<feature>-keys.ts` | TanStack Query key factory |
| `api/hooks/use<Feature>Queries.ts` | Query hooks |
| `interfaces/<feature>-interfaces.ts` | TypeScript interfaces |

### Files to Modify
| File | Change |
|------|--------|
| `<locale EN path from project-config.md>` | Add <N> new locale keys |
| `<locale DE path from project-config.md>` | Same keys (translated) |
| `<locale RU path from project-config.md>` | Same keys (translated) |
| `<tab-definitions-file>` | Register new screen |

### Reusable Components Found
| Component / Hook | Source | How Used |
|-----------------|--------|----------|
| `PxDataGrid` | `@ui-kit` | Listing view |
| (list all found, or "None applicable") | | |

### New Locale Keys Required
| Key | English Value |
|-----|--------------|
| `myFeatureListTitle` | "My Feature" |

### State Management Approach
<Describe which stores are involved, if any new store is needed, and why>

### API Endpoints
<List the service endpoints this feature will call, based on envConfig constants>

### Feature Flag
<Name of the Azure App Configuration flag to create for this feature>

### Submodule Impact
<"None" or "Yes — changes required in src/shared/ because...">

### Test Cases to Cover
- <Test scenario 1>
- <Test scenario 2>

### Estimated Complexity
Low | Medium | High — <one sentence justification>
```

**Rules:**
- Do not invent acceptance criteria — derive only from Jira, Figma, or Confluence data
- Flag every assumption in "Assumptions Made"
- If Figma shows UI not in any Jira AC, add it as an implied AC and note it as an assumption
- Any decision or constraint found only in Jira comments must be called out in "Assumptions Made"
- This page serves as both the spec and the LLD for the feature — no separate document is created later

### Step 8: Flag submodule if needed

Read the spec you just created. If the implementation plan requires any change under `src/shared/`, update the state file: `submoduleFlag: true`.

### Step 9: Update state

Update `.github/output/pipeline-state/${input:ticketId}-state.yml`:
- `currentPhase`: `"GATE_1"`
- `completedPhases`: add `1`
- `specPageId`: the Confluence page ID returned by `createConfluencePage`
- `specPageUrl`: the Confluence page URL
- `lastUpdatedAt`: current ISO timestamp

### Step 10: Confirm to developer

```
✅ Spec created in Confluence: <specPageUrl>

Summary:
[Paste the Summary section]

Implementation plan covers:
[Paste the Files to Create and Files to Modify tables]

If running standalone: review the Confluence page and proceed to phase-2-implementation when ready.
If running inside the pipeline: the orchestrator will present Human Gate 1 next.
```
