# Rules: Gap Classification

## Purpose
Define the authoritative severity levels and escalation behaviour for gaps detected across all agents. Every agent that detects a gap must classify it using this scale — no agent may define its own severity meanings.

---

## Severity Levels

### BLOCKER
**Definition:** The pipeline cannot produce a correct LLD without this information. Proceeding would result in a design that is incomplete, incorrect, or untraceable to requirements.

**Behaviour:** Surface to user immediately. Pipeline pauses. User must resolve or explicitly override with a documented reason. The orchestrator logs the override.

**Examples:**
- A user story has no acceptance criteria from any source (Jira + Confluence both empty)
- HLD page is not found and user has not provided a URL
- FRD page is not found and user has not provided a URL
- Figma MCP is not connected (`figmaStatus: unavailable` at startup)
- A user story has no Figma design link — API spec cannot be generated without screen knowledge
- A Figma file linked on a story cannot be read (access denied or MCP error) — schema is unknowable without the design
- A confirmed service repo cannot be found in the GitHub org
- A FRD requirement has no story coverage AND no design element covers it in the LLD
- An LLD DB table has no `TenantId` on a confirmed tenant-scoped entity

---

### WARN
**Definition:** The pipeline can continue, but the LLD will be less accurate or complete in the affected area. The gap is documented in the LLD output and flagged at the human approval gate.

**Behaviour:** Log to `output/<EPIC_ID>/gaps.md`. Report in the agent's summary output. Highlight in the LLD under Section 10 (Assumptions & Gaps). Surface again at Step 7 (human approval) if unresolved.

**Examples:**
- A user story has no linked Confluence page — AC comes from Jira only (less detailed)
- An FRD requirement has partial story coverage (one story covers part of it)
- A spec file (`openapi.yaml`, `asyncapi.yaml`, `db-schema.md`) is missing for a service — LLD designs from scratch
- Git pull failed for a repo — LLD based on local state which may be stale
- Design notes missing from a story's Confluence page

---

### INFO
**Definition:** An observation that does not affect LLD accuracy but is worth recording for completeness or future reference.

**Behaviour:** Log to `output/<EPIC_ID>/gaps.md`. Include in Section 10 of LLD. Does not appear in user-facing progress output unless the user requests a full report.

**Examples:**
- A story was found in a Confluence FRD child page but has no matching Jira story
- Figma file is a PROTOTYPE or BOARD type (no screen data extractable) — not an error
- A story's Confluence page has no Out of Scope section
- FRD child page has no story section boundaries — treated as shared context
- Fuzzy title match used to associate a Confluence story section to a Jira story (not exact key match)
- A DB table that existed before this epic had no index on a column the new LLD queries — noted for developer awareness

---

## Gap Record Format

Every detected gap must be recorded in this structure and written to `output/<EPIC_ID>/gaps.md`:

```json
{
  "id": "GAP-001",
  "severity": "WARN",
  "detected_by": "story-reader-agent",
  "subject": "PROJ-127",
  "type": "no_confluence_page",
  "description": "Story PROJ-127 has no linked Confluence page. Acceptance criteria sourced from Jira custom field only.",
  "impact": "API schema for this story may be less precise than stories with full Confluence documentation.",
  "recommendation": "Link the Confluence story page to PROJ-127 via the Jira 'Link' feature.",
  "resolved": false,
  "resolution": null
}
```

---

## Gap File Format (`output/<EPIC_ID>/gaps.md`)

```markdown
# Gap Log — <Epic Title>
Epic: <EPIC_ID> | Generated: <date>

## BLOCKER Gaps
<List each BLOCKER with id, description, and recommendation — or "None">

## WARN Gaps
<List each WARN with id, description, and recommendation — or "None">

## INFO Gaps
<List each INFO gap — or "None">
```

---

## Agent Responsibilities

| Agent | Gap types it detects |
|-------|---------------------|
| `startup-agent` | Repo not found in GitHub org, Jira unreachable, GitHub CLI not authenticated |
| `jira-reader-agent` | Epic not found, HLD/FRD not linked (both are BLOCKERs), Figma MCP unavailable (BLOCKER — caught at startup) |
| `story-reader-agent` | No Confluence page for story, no AC anywhere, fuzzy match only, FRD requirement uncovered |
| `spec-reader-agent` | Spec file missing, spec parse error |
| `lld-generator-agent` | Story not covered by any design element, assumption made, design notes absent |
| `confluence-publisher-agent` | Publish failed (recorded as WARN — LLD saved locally) |

---

## LLD Section 10 — How Gaps Are Presented

All BLOCKER and WARN gaps are surfaced in Section 10 of the generated LLD:

```markdown
## 10. Assumptions & Gaps

### 10.1 Assumptions Made
| # | Assumption | Reason | Risk if Wrong |
|---|------------|--------|---------------|
| A-1 | Azure Service Bus used for messaging | Detected in payment-service csproj | Low |

### 10.2 Open Gaps
| ID | Severity | Story | Gap | Recommendation |
|----|----------|-------|-----|----------------|
| GAP-001 | ⚠️ WARN | PROJ-127 | No Confluence page — AC from Jira only | Link Confluence page to story |
| GAP-002 | 🔴 BLOCKER | PROJ-128 | No Figma design linked | Link Figma design to story and retry |
```

INFO gaps are omitted from the LLD — they appear only in `output/<EPIC_ID>/gaps.md`.

---

## Escalation at Human Approval Gate (Step 7)

Before displaying the LLD for approval, the Orchestrator summarises outstanding gaps:

```
⚠️  This LLD has open gaps:

   WARN (2):
   GAP-001 — PROJ-127: No Confluence page — AC from Jira only
   GAP-002 — PROJ-128: No Figma design linked (BLOCKER — story excluded from LLD)

   These are documented in Section 10 of the LLD.
   Type APPROVE to accept the LLD with these gaps noted, or REVISE to address them first.
```

BLOCKER gaps must be resolved before the LLD can be generated — they never reach the approval gate unresolved.
