---
agent: confluence-operations
attached_to: jira-reader-agent, story-reader-agent, startup-agent, confluence-publisher-agent
---

# Skill: Confluence Operations

## Purpose
Two capabilities in one skill:
1. **URL Parsing** — extract numeric page IDs from Confluence URLs, classify links by document type (HLD, FRD, LLD, story), and validate Confluence location inputs.
2. **Page Writing** — ready-to-use Confluence Storage Format (XHTML-based) HTML snippets for every macro and element pattern used when publishing LLD pages.

## Used By
- `.claude/agents/jira-reader-agent.md` — classifying remote links on the epic
- `.claude/agents/story-reader-agent.md` — extracting page IDs from Jira story remote links
- `.claude/agents/startup-agent.md` — validating the HLD Confluence Location input
- `.claude/agents/confluence-publisher-agent.md` — building the LLD page body

---

# Part 1 — URL Parsing

## Operation 1 — Extract Page ID from URL

Confluence page URLs follow this pattern:

```
https://{org}.atlassian.net/wiki/spaces/{SPACE_KEY}/pages/{PAGE_ID}/{optional-title-slug}
```

The `PAGE_ID` is the **numeric segment immediately after `/pages/`**.

```
Input:  https://yourorg.atlassian.net/wiki/spaces/ENG/pages/789012/HLD-Order-Management
Output: "789012"
```

**Edge cases:**

| URL form | How to handle |
|----------|--------------|
| `/pages/789012` (no slug) | Extract `789012` directly |
| `/pages/789012/Any-Title-Slug` | Extract `789012`, ignore slug |
| `/wiki/x/AbCdEf` (Confluence tiny link) | This is a short link — cannot extract numeric ID directly. Store the full URL; use it as-is with `getConfluencePage` which accepts tiny link IDs too |
| URL contains no `/pages/` | Not a standard page URL — store full URL, flag as `unparseable_page_id: true` |
| Space key in URL | Extract for context: segment after `/spaces/` and before `/pages/` |

**Regex pattern:**
```
/\/pages\/(\d+)/
```

Apply to the URL string. First capture group is the page ID.

---

## Operation 2 — Classify Confluence Link by Document Type

Given a remote link object with `object.url` and `object.title`, classify it:

```
Input:  { url: "https://...atlassian.net/wiki/...", title: "HLD — Order Management" }
Output: { type: "HLD", page_id: "789012", url: "...", title: "..." }
```

**Classification rules** (apply in order, case-insensitive title matching):

| Title contains | Classification | Action |
|----------------|---------------|--------|
| "HLD", "High Level Design", "High-Level Design" | `HLD` | Record as HLD |
| "FRD", "Functional Requirements", "Functional Requirement" | `FRD` | Record as FRD |
| "LLD", "Low Level Design", "Low-Level Design" | `LLD` | Skip — already exists |
| "User Story", "US-", story key pattern (`[A-Z]+-\d+`) | `STORY` | Record as story page |
| None of the above, but URL is a Confluence page | `OTHER` | Ignore for epic-level docs; keep for story-level links |

**Story key pattern** — a title like "PROJ-124: User can create an order" matches the Jira story key regex `[A-Z]+-\d+`.

---

## Operation 3 — Validate Confluence Location Input (startup use)

When the user provides a Confluence location (during startup configuration):

**Input formats accepted:**

| Format | Valid? | How to normalise |
|--------|--------|-----------------|
| Full URL `https://yourorg.atlassian.net/wiki/spaces/ENG/pages/123` | ✅ | Extract page_id and space_key |
| Space key `ENG` | ✅ | Store as `space_key`, `page_id: null` |
| Space key lowercase `eng` | ✅ | Normalise to uppercase |
| URL without `/wiki` | ❌ | Reject — not a Confluence URL |
| Arbitrary string | ❌ | Reject |

**Validation rules:**
- Full URL: must start with `https://` and contain `atlassian.net/wiki` or `/confluence`
- Space key: 2–10 uppercase alphanumeric characters (`^[A-Z0-9]{2,10}$`)
- Empty string: reject

**Return:**
```json
{
  "valid": true,
  "input_type": "url",
  "page_id": "123456",
  "space_key": "ENG",
  "full_url": "https://yourorg.atlassian.net/wiki/spaces/ENG/pages/123456"
}
```

or:

```json
{
  "valid": true,
  "input_type": "space_key",
  "page_id": null,
  "space_key": "ENG",
  "full_url": null
}
```

or on failure:

```json
{
  "valid": false,
  "reason": "Not a valid Confluence URL or space key"
}
```

---

# Part 2 — Page Writing (Confluence Storage Format)

## Macro: Info Panel

```html
<ac:structured-macro ac:name="info">
  <ac:parameter ac:name="title">{title}</ac:parameter>
  <ac:rich-text-body>
    <p>{body_html}</p>
  </ac:rich-text-body>
</ac:structured-macro>
```

Use for: auto-generated notices, standards references, explanatory context.

---

## Macro: Warning Panel

```html
<ac:structured-macro ac:name="warning">
  <ac:parameter ac:name="title">{title}</ac:parameter>
  <ac:rich-text-body>
    <p>{body_html}</p>
  </ac:rich-text-body>
</ac:structured-macro>
```

Use for: open review notes, APPROVED_WITH_NOTES state, action-required items.

---

## Macro: Note Panel

```html
<ac:structured-macro ac:name="note">
  <ac:parameter ac:name="title">{title}</ac:parameter>
  <ac:rich-text-body>
    <p>{body_html}</p>
  </ac:rich-text-body>
</ac:structured-macro>
```

Use for: assumptions, gaps, informational callouts that don't require action.

---

## Macro: Status Badge

```html
<ac:structured-macro ac:name="status">
  <ac:parameter ac:name="colour">{colour}</ac:parameter>
  <ac:parameter ac:name="title">{label}</ac:parameter>
</ac:structured-macro>
```

**Standard colours and uses:**

| Colour | Label examples | Use for |
|--------|---------------|---------|
| `Green` | `NEW`, `APPROVED` | New design elements, approved LLD |
| `Yellow` | `MODIFIED`, `APPROVED WITH NOTES` | Changed existing elements, partial approval |
| `Red` | `REJECTED`, `BLOCKER` | Blocked items, critical review issues |
| `Blue` | `MINOR`, `INFO` | Low-severity notes |
| `Grey` | `EXISTING`, `PENDING` | Unchanged elements shown for context |

---

## Macro: Code Block

```html
<ac:structured-macro ac:name="code">
  <ac:parameter ac:name="language">{language}</ac:parameter>
  <ac:parameter ac:name="theme">Midnight</ac:parameter>
  <ac:parameter ac:name="linenumbers">true</ac:parameter>
  <ac:plain-text-body><![CDATA[
{code_content}
  ]]></ac:plain-text-body>
</ac:structured-macro>
```

**Language values:**

| Content | Language param |
|---------|---------------|
| Mermaid diagram | `mermaid` |
| OpenAPI / AsyncAPI YAML | `yaml` |
| C# code | `csharp` |
| SQL | `sql` |
| JSON | `json` |
| Bash / shell | `bash` |
| Plain text | `none` |

> Note: `linenumbers` and `theme` are optional — omit if Confluence instance does not support them.

---

## Macro: Table of Contents

```html
<ac:structured-macro ac:name="toc">
  <ac:parameter ac:name="maxLevel">2</ac:parameter>
  <ac:parameter ac:name="style">disc</ac:parameter>
  <ac:parameter ac:name="indent">10px</ac:parameter>
</ac:structured-macro>
```

Always place immediately after the header info panel, before Section 1.

---

## Macro: Expand (collapsible section)

```html
<ac:structured-macro ac:name="expand">
  <ac:parameter ac:name="title">{expand_label}</ac:parameter>
  <ac:rich-text-body>
    {content}
  </ac:rich-text-body>
</ac:structured-macro>
```

Use for: long YAML spec blocks, full migration scripts — keeps the page scannable.

---

## Headings

```html
<h1>1. Overview</h1>
<h2>1.1 Sub-section</h2>
<h3>Detail heading</h3>
```

Always use `<h1>` for top-level numbered sections. This ensures the Table of Contents macro picks them up correctly at `maxLevel: 2`.

---

## Tables

```html
<table>
  <tbody>
    <tr>
      <th>Column A</th>
      <th>Column B</th>
    </tr>
    <tr>
      <td>Value 1</td>
      <td>Value 2</td>
    </tr>
  </tbody>
</table>
```

Always include `<tbody>`. Do not use `<thead>` — Confluence renders `<th>` in the first row as a header row automatically.

---

## Links

**Internal Confluence page link:**
```html
<a href="{full_confluence_url}">{link_text}</a>
```

**Jira issue link:**
```html
<a href="https://{org}.atlassian.net/browse/{ISSUE_KEY}">{ISSUE_KEY}</a>
```

---

## Markdown to Confluence Conversion Rules

When converting the generated `lld.md` to Confluence HTML:

| Markdown | Confluence HTML |
|----------|----------------|
| `# Heading` | `<h1>Heading</h1>` |
| `## Sub-heading` | `<h2>Sub-heading</h2>` |
| `### Detail` | `<h3>Detail</h3>` |
| `**bold**` | `<strong>bold</strong>` |
| `*italic*` | `<em>italic</em>` |
| `` `code` `` | `<code>code</code>` |
| `[text](url)` | `<a href="url">text</a>` |
| ` ```yaml ... ``` ` | Code block macro with `language: yaml` |
| ` ```mermaid ... ``` ` | Code block macro with `language: mermaid` |
| ` ```csharp ... ``` ` | Code block macro with `language: csharp` |
| ` ```sql ... ``` ` | Code block macro with `language: sql` |
| `\| table \|` | HTML `<table>` (see Tables section above) |
| `[NEW]` text tag | Status badge macro — Green, `NEW` |
| `[MODIFIED]` text tag | Status badge macro — Yellow, `MODIFIED` |
| `[EXISTING]` text tag | Status badge macro — Grey, `EXISTING` |
| `[ASSUMPTION]` text tag | Status badge macro — Blue, `ASSUMPTION` |

---

## Full LLD Page Skeleton

Use this as the outer wrapper when building the page body:

```html
<!-- Auto-generated info panel -->
<ac:structured-macro ac:name="info">
  <ac:parameter ac:name="title">Auto-Generated by Technical Lead Agent</ac:parameter>
  <ac:rich-text-body>
    <p>Generated on <strong>{date}</strong> from Epic
    <a href="{jira_url}"><strong>{epic_id}: {epic_title}</strong></a>.
    Source: <a href="{hld_url}">HLD</a>{frd_link}.</p>
    <p><em>Regenerate: <code>/lld {epic_id}</code></em></p>
  </ac:rich-text-body>
</ac:structured-macro>

<!-- Optional: warning panel if APPROVED_WITH_NOTES -->
<!-- {warning_panel_if_needed} -->

<!-- Table of contents -->
<ac:structured-macro ac:name="toc">
  <ac:parameter ac:name="maxLevel">2</ac:parameter>
  <ac:parameter ac:name="style">disc</ac:parameter>
</ac:structured-macro>

<!-- Sections 1–11 follow (see .claude/templates/lld-confluence-template.md) -->
{section_content}
```

---

## Page Create / Update API Calls

**Create new page (child of HLD):**
```
Tool: createConfluencePage
Input: {
  spaceKey: "<SPACE_KEY>",
  parentId: "<hld_page_id>",
  title: "LLD — <epic_title>",
  body: "<full_html>",
  contentFormat: "html"
}
```

**Update existing page:**
```
Tool: updateConfluencePage
Input: {
  pageId: "<existing_page_id>",
  title: "LLD — <epic_title>",
  body: "<full_html>",
  contentFormat: "html",
  version: <current_version + 1>
}
```

**Check if LLD page already exists:**
```
Tool: searchConfluenceUsingCql
Input: {
  cql: "title = \"LLD — <epic_title>\" AND parent = <hld_page_id>",
  limit: 1
}
```
