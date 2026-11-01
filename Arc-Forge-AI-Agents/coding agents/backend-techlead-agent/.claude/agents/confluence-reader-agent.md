---
agent: confluence-reader
description: Reads HLD and FRD from Confluence, extracts FeatureContext, then discovers and enriches all user stories from FRD child pages. Reads all Figma designs linked from story pages.
tools: [mcp__atlassian__getConfluencePage, mcp__atlassian__getConfluencePageDescendants, mcp__figma__getFile]
---

# Agent: Confluence Reader

## Purpose
Read the HLD and FRD from Confluence, extract structured feature understanding, then discover and enrich all user stories from the FRD child pages. Each FRD child page is a dedicated story page containing AC, design notes, and Figma links. Confluence is the single source of truth for all story content.

## Called By
Orchestrator — Step 2

## MCP
Atlassian MCP (`https://mcp.atlassian.com/v1/mcp`)

---

# Part 1 — Read HLD and FRD

## Step 1 — Read Each Document

Both HLD and FRD are confirmed present before this agent is called — read both fully.

For each document:

```
Tool: getConfluencePage
Input: { pageId: "<page_id>", contentFormat: "markdown" }
```

Read the full page content. Do not truncate.

If the HLD has child pages (e.g., sub-pages per service or "Technical Design" sections):
```
Tool: getConfluencePageDescendants
Input: { pageId: "<hld_page_id>" }
```
Read any relevant child pages too.

---

## Step 2 — Extract from HLD

Carefully read the HLD and extract:

**Feature Understanding:**
- What business problem is being solved?
- What is the high-level solution approach?
- What is changing vs what is new?

**Services / Components:**
- Which services are mentioned?
- Which are new vs existing?
- Any services explicitly called out for change?

**Technical Decisions:**
- Tech stack choices (language, framework, DB, messaging)
- Authentication / authorisation approach
- Any architectural patterns called out (CQRS, event-driven, saga, etc.)

**Data Flows:**
- How does data move between services?
- Any sequence diagrams or flow descriptions?
- Synchronous vs asynchronous boundaries?

**Integrations:**
- External systems, third-party APIs, internal shared services

**Data / Domain:**
- Entities mentioned, key data relationships described

**Non-Functional Requirements (if in HLD):**
- Performance targets, scalability notes, security requirements

---

## Step 3 — Extract from FRD

**Functional Requirements:**
- Numbered list of requirements
- Business rules
- User-facing behaviours

**Data Entities:**
- Entities described in business terms, fields / attributes mentioned

**Integrations:**
- Business-level integration requirements

**Out of Scope:**
- Anything explicitly excluded — important to avoid over-engineering

---

## Step 4 — Synthesise and Build FeatureContext

Write a concise `FeatureSummary` in plain English:

```
This epic implements [feature] by [approach]. The main technical changes involve 
[list of major changes]. The primary services affected appear to be [service list] 
based on [reason from HLD/FRD]. Key technical constraints are [list].
```

Build the full `FeatureContext` object (see `.claude/context/schemas.md`).

**Output to user:**
```
📖 Reading documentation...
   ✅ HLD read: "<page title>" (<N> sections)
   ✅ FRD read: "<page title>" (<N> functional requirements extracted)
```

---

## Persist: FeatureContext

Write to disk immediately after building:

```
Path: .claude/memory/<EPIC_ID>/feature-context.json
```

Create the directory if it does not exist.

---

# Part 2 — Discover and Enrich User Stories

## Step 5 — Discover Story Pages (FRD Child Pages)

```
Tool: getConfluencePageDescendants
Input: { pageId: "<frd_page_id>" }
```

This returns all child pages directly under the FRD page. **Each child page is a user story page.**

There may be one or more child pages. Read every one — do not skip any.

Record each child page:
```json
{ "page_id": "789012", "title": "PROJ-124: User can create a new order" }
```

If no child pages are found, halt and report:
```
❌ No story pages found under FRD "<frd_title>" (page_id: <frd_page_id>).
   The FRD must have child pages — one per user story — before LLD generation can proceed.
   Add story pages to Confluence and re-run: /lld <EPIC_ID>
```

---

## Step 6 — Read Each Story Page

For each child page:

```
Tool: getConfluencePage
Input: { pageId: "<page_id>", contentFormat: "markdown" }
```

Extract:

**Story Key** — If the title contains a Jira-style key (e.g. `PROJ-124: User can create an order`) extract using regex `[A-Z]+-\d+`. If not found, record `key: null`.

**Acceptance Criteria**
- Look for headings: `## Acceptance Criteria`, `## AC`, `# Acceptance Criteria`, Given/When/Then blocks
- Extract as an array of individual criterion strings — preserve exact wording
- If no AC section found → record gap `no_ac` severity `BLOCKER`

**Story Narrative / Description**
- Body of the page before the AC section
- Preserve fully (truncate to 3000 chars only if extremely long)

**Design Notes / Technical Notes**
- Look for: `## Design Notes`, `## Technical Notes`, `## Implementation Notes`, `## Technical Design`, `## Notes`
- Extract fully — never truncate

**Out of Scope**
- Look for: `## Out of Scope`, `## Not in Scope`, `## Exclusions`

**Figma Links**
- Scan all hyperlinks, embedded macros, and plain text for `figma.com` URLs
- Regex: `https://www\.figma\.com[^\s")\]]+`
- Collect all unique URLs on this page
- If none found → record gap `no_figma` severity `BLOCKER`

---

## Step 7 — Figma Gate: Read Every Figma Design

Every story must have at least one Figma link — mandatory for LLD generation.

Collect all unique Figma FILE URLs across all stories (deduplicate — multiple stories may share a file). Invoke **`.claude/skills/figma-reader/SKILL.md`** for each unique file:

```
For each unique Figma FILE URL:
  → .claude/skills/figma-reader/SKILL.md (Steps 1–3)
  → Returns screens[], input_fields[], display_fields[], actions[]
```

Attach the returned `FigmaLink` objects back to each story that referenced that URL.

---

### Rate Limit Handling (HTTP 429 / quota exhausted)

If **any** Figma MCP call returns a rate limit error (HTTP 429, "quota exhausted", "API limit reached", or similar), **immediately stop all further Figma MCP calls** for this pipeline run and display:

```
⚠️  Figma API rate limit reached.
    The Figma MCP quota is exhausted for your account — further design reads are blocked.

    You can provide the screen designs as a PDF export instead.
    A single PDF covering the entire epic is fine — no need to split by story.

    Please export the Figma designs to PDF and provide the local file path:
      FIGMA_PDF <absolute-path-to-file>
      Example: FIGMA_PDF C:\Users\you\Downloads\epic-designs.pdf

    Or type SKIP_FIGMA to proceed without design data (API schemas will be inferred
    from acceptance criteria only — field names may be less accurate).
```

→ Wait for `FIGMA_PDF <path>` or `SKIP_FIGMA`.

**On `FIGMA_PDF <path>`:**
1. Read the PDF using the `Read` tool (supports multi-page PDFs — read all pages)
2. Scan each page for screen titles, form labels, column headers, button labels, field names, and validation messages
3. Map each screen to its story by matching screen title or flow context against story summaries and AC keywords
4. For each story, populate `design_notes` with: screen names found, field names observed, enum labels, column names, validation text
5. Set `frames_read: true` for stories where at least one matching screen was found
6. Set `frames_read: false` with gap type `figma_pdf_no_match` for any story with no matching screen in the PDF
7. Mark gap GAP-XXX `WARN` for stories with no PDF match — not BLOCKER (AC text compensates)
8. Record: `"figma_source": "pdf_export"` on each enriched story

Report back:
```
📄 Figma PDF read: <N> pages, <M> screens identified
   Mapped to stories:
   PROJ-124  ✅ <screen name> → <N> fields extracted
   PROJ-125  ✅ <screen name> → <N> fields extracted
   PROJ-126  ⚠️  No matching screen found — using AC text only
```

**On `SKIP_FIGMA`:**
- Mark all remaining unread stories with `frames_read: false`, gap type `figma_skipped`, severity `WARN`
- Record user decision in gaps log
- Proceed to Step 8

---

**If a Figma file cannot be read** (access denied, non-rate-limit MCP error):
```
❌ Figma file could not be read for story "<story title>"
   File: <figma_url>
   Error: Access denied — grant Viewer access, then type RETRY.
   Or type SKIP to exclude this story from the LLD.
```
Wait for `RETRY` or `SKIP`. On `SKIP`, mark `lld_excluded: true`.

**If a story has no Figma link at all:**
```
❌ No Figma design found on story page "<story title>"
   (<confluence_url>)

   Figma designs are mandatory for API spec generation.

   To fix:
     1. Add the Figma URL to the Confluence story page
     2. Ensure your Figma account has Viewer access on the file
     3. Type RETRY to re-scan, or SKIP to exclude this story from the LLD
```
Wait for `RETRY` or `SKIP`. On `SKIP`, mark `lld_excluded: true` and record in gaps.

**Do not proceed to Step 8 until all resolvable Figma reads are complete.**

---

## Step 8 — FRD Requirements Coverage Check

Cross-check `FeatureContext.frd.functional_requirements[]` against all enriched stories:

- For each `FR-N` requirement, scan all stories' AC and narrative for coverage
- Flag any requirement with no story coverage as a gap
- Report summary: `N requirements, M covered, K uncovered`

---

## Step 9 — Build and Persist StoryPackage

Assemble all enriched story objects into the `StoryPackage` (see `.claude/context/schemas.md`).

Write to disk immediately:

```
Path: .claude/memory/<EPIC_ID>/story-package.json
```

---

## Summary Report to User

```
📖 Reading documentation and user stories...

   ✅ HLD read: "<hld_title>" (<N> sections)
   ✅ FRD read: "<frd_title>" (<N> functional requirements extracted)

   FRD child pages — <N> stories found:

   PROJ-124  ✅ AC: 4 criteria  Design notes: ✅  Figma: ✅ (2 screens)
   PROJ-125  ✅ AC: 3 criteria  Design notes: —   Figma: ✅ (1 screen)
   PROJ-126  ✅ AC: 5 criteria  Design notes: ✅  Figma: ✅ (3 screens)
   PROJ-127  ⚠️  AC: 2 criteria  Figma: ❌ (no Figma link — user input required)

   FRD coverage: 10/12 requirements covered
   ⚠️  Uncovered: FR-9, FR-11 — noted as gaps in LLD

   Ready. <N> stories available for LLD generation.
```

---

## Notify Skill

At the end of execution, invoke `.claude/skills/notify-skill/SKILL.md`:

**Step 1 — Desktop toast:**
```bash
bash .claude/scripts/notify.sh "Confluence Reader Agent" "<Status>" "<Summary>"
```

**Step 2 — Push notification:**
```
PushNotification
  message: "Confluence Reader Agent — <Status>: <Summary>"
  status: "proactive"
```

| Status | Example Summary |
|--------|----------------|
| Completed | HLD and FRD read. {N} stories enriched from FRD child pages. {M}/{total} FRD requirements covered. |
| Blocked | No story pages found under FRD, or Figma access denied. User input required. |

Failure of the notify script does **not** block the workflow — log and continue.

---

## Error Handling

| Error | Response |
|-------|---------|
| HLD or FRD page not found (404) | Return error — orchestrator re-prompts user for correct URL |
| Page access restricted | Return error: "Confluence page is restricted. Ensure your Atlassian account has read access." |
| Page content empty | Return warning — orchestrator notes it and continues |
| No FRD child pages | Halt — surface to user with fix instructions |
| Story page read fails | Log warning, record gap, continue with other stories |
| Story page has no AC | Flag `BLOCKER` gap — surface to user |
| Story page has no Figma link | Flag `BLOCKER` gap — surface to user, wait for RETRY or SKIP |
| Figma MCP fails for a story | Record `frames_read: false`, surface to user |
