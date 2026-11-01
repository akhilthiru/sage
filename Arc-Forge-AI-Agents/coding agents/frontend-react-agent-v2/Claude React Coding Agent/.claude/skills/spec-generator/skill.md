# Skill: Spec Generator

Generates a complete spec (requirements + full implementation plan) for a Jira ticket. Fetches all available data sources, scans git history and the codebase, then publishes the spec directly to Confluence — where it also serves as the LLD for the feature.

Can be invoked standalone via `/spec-generator PHNX-1234`, or called by Phase 1 (Spec & Plan) of the pipeline.

---

## Instructions

### Step 1: Load context files

Read the following files before doing anything else:
- `.claude/context/project-config.md` — Confluence space key, spec parent page name, locale file paths, Jira base URL, and all project-specific identifiers
- `.claude/context/architecture-context.md` — what to scan for in the codebase
- `.claude/context/coding-standards.md` — patterns the implementation plan must follow

---

### Step 2: Fetch Jira ticket

Call `getJiraIssue` with `issueKey = "{TICKET_ID}"`. Do NOT use `searchJiraIssuesUsingJql` — call `getJiraIssue` directly. Extract:
- Title, description, acceptance criteria
- Labels, type (bug / feature / task)
- Linked tickets and any Figma or Confluence URLs embedded in the ticket
- Fix version / release target
- **Comments**: read all entries in `fields.comment.comments[]` — extract commenter name, date, and body text for each

Comments are a first-class input. They frequently contain decisions that override or refine the original description — product owner clarifications, scope changes agreed mid-ticket, technical constraints surfaced during review, or confirmation of expected behaviour. For bug tickets, comments often hold the most specific reproduction details and environment context. Read every comment before writing any part of the spec. Any decision or constraint found only in comments must be called out explicitly in the "Assumptions Made" section of the spec.

---

### Step 3: Figma gate — MUST resolve before any other step proceeds

**Figma URL search — search ALL of the following exhaustively before concluding no URL exists:**

1. `fields.description` — the Jira description is Atlassian Document Format (ADF), a deeply nested JSON structure. Recursively walk every node and extract any text value or `href` attribute containing `figma.com`. Do not skim the top level only.
2. `fields.remotelinks` — check every remote link object's `url` field for `figma.com`.
3. `fields.comment.comments[].body` — each comment body is also ADF. Recursively search every comment for `figma.com`.
4. Any custom field value that contains a URL string.

If you find a `figma.com` URL anywhere in the above, that is the Figma URL for this ticket.

**If no Figma URL is found in the ticket:** Continue to Step 4.

**If a Figma URL is found AND Figma MCP is connected:** Fetch the design context via Figma MCP. Hold it in context for the spec. Continue to Step 4.

**If a Figma URL is found AND Figma MCP is unavailable:**

STOP IMMEDIATELY. This overrides the Fallback Transparency Rule — do NOT proceed automatically. Do not proceed to Step 4 or any later step. Do not fetch Confluence pages. Do not scan the codebase. Do not call `createConfluencePage`. Do not write any part of the spec.

Display exactly:

```
🔴 Figma design required — MCP not connected

The Jira ticket links to a Figma design:
  <Figma URL>

Figma MCP is unavailable. The spec cannot be written without the design.

Choose one:
  screenshot  → paste a screenshot of the Figma design into this chat
  paste       → paste the screen names, layouts, and requirements as text

To connect Figma MCP instead: set FIGMA_API_TOKEN in your environment and
restart the Figma MCP server from the IDE MCP panel, then re-run this phase.
```

Do not continue until the developer replies with a screenshot or pasted design content. Only after receiving that input, hold it in memory as the design context and continue to Step 4.

---

### Step 4: Fetch Confluence page

Using Atlassian MCP, fetch any Confluence link found in the Jira ticket.

If the link is unavailable or the page cannot be fetched, proceed with Jira data only — no need to ask.

---

### Step 5: Analyse git history

For every file expected to be modified, run:

```bash
git log --oneline -20 -- <filepath>
```

Note any intentional patterns or recent decisions that should be preserved. Do not plan to "fix" a pattern that was recently introduced deliberately.

---

### Step 6: Scan codebase for reusable components

Search the codebase as defined in `.claude/context/architecture-context.md` before recommending anything new. For every UI element, hook, API function, or utility required by the spec — search first.

Document each finding as one of:
- **Reuse**: `Use PxDataGrid from @ui-kit for the listing` (with import path)
- **Extend**: `Extend useCustomerMajorUnitQueries.ts to add a new filter param`
- **New**: `New component required — no existing equivalent found`

---

### Step 7: Create the spec page in Confluence

`createConfluencePage` has a 1000-character content limit on the initial call. Use a two-step approach — create with a placeholder, then update with the full spec.

#### Step 7a: Create page with placeholder

Find the parent page: search for the spec parent page name (from project-config.md — **Project Identity → Spec parent page name**) in the space using `searchConfluenceUsingCql`; if none exists, use the space root.

Call `createConfluencePage`:
- **Space**: space key from project-config.md
- **Title**: `{TICKET_ID} — <Jira Ticket Title>`
- **Parent**: page ID found above
- **Content**: `Spec being generated for {TICKET_ID}. Please wait.`

Record the returned page ID and URL. Do not proceed to Step 7b until you have these.

#### Step 7b: Update page with full spec

Call `updateConfluencePage` with the page ID from Step 7a. Write the complete spec using the structure below. Populate every section — do not leave placeholders. All decisions from Steps 5 and 6 feed directly into the plan.

This page serves as both the spec and the LLD for the feature — no separate LLD is created later.

```markdown
# {TICKET_ID}: <Jira Ticket Title>

## Summary
<1-3 sentence description of what this feature/fix does and why>

## Jira Reference
- Ticket: {TICKET_ID}
- Type: Feature | Bug | Task
- Linked tickets: <list or N/A>
- Key decisions from comments: <summarise any decisions, scope changes, or clarifications found in ticket comments — omit if no substantive comments exist>

## Figma Reference
- Link: <Figma URL or "Not available — developer to provide screenshot">
- Screens: <list of screen names from Figma>

## Confluence Reference
- Link: <Confluence URL or "Not available">

## Acceptance Criteria
- [ ] <AC 1 from Jira>
- [ ] <AC 2 from Jira>
- [ ] <add any ACs implied by Figma design not listed in Jira>

## Assumptions Made
- <List any decisions you made where the ticket was ambiguous>
- <Flag anything the developer should verify before approving>

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
| (list all found, or state "None applicable") | | |

### New Locale Keys Required
| Key | English Value |
|-----|--------------|
| `myFeatureListTitle` | "My Feature" |
| (list all) | |

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
- Do not invent acceptance criteria — only derive them from Jira, Figma, or Confluence
- Flag every assumption you make in the "Assumptions Made" section
- If Figma shows UI not covered by any Jira AC, add it as an implied AC and note it as an assumption
- Keep the summary factual and brief — avoid filler language
- Write the spec for a developer audience, not a PM audience

---

### Step 8: Confirm to developer

```
✅ Spec created in Confluence: <page URL>

Summary:
[paste the Summary section from the spec]

Implementation plan covers:
[paste the Files to Create and Files to Modify tables]

If running standalone: review the Confluence page and proceed to implementation when ready.
If running inside the pipeline: the orchestrator will present Human Gate 1 next.
```
