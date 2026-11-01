---
description: Show the status of all architecture pages for the current session — which have been published, their Confluence URLs, and which are pending.
---

# /arch-status

Show the current status of all architecture documentation pages.

## Usage

```
/arch-status
```

## What this command does

Reads `.claude/memory/session_context.md` and displays a status table showing all 7 architecture documents with their publish status and Confluence URLs.

## Execution

1. Read `.claude/memory/session_context.md`
2. Extract the `Output` section for product name and parent URL
3. Extract any published page URLs recorded during the session
4. Display the following table:

```markdown
## Architecture Documentation Status — [PRODUCT NAME]

| Document | Status | URL |
|---|---|---|
| Solution Architecture | Published / Pending / Skipped | [url or —] |
| Infrastructure Architecture | Published / Pending / Skipped | [url or —] |
| Data Architecture | Published / Pending / Skipped | [url or —] |
| Deployment Architecture | Published / Pending / Skipped | [url or —] |
| Technology Stack | Published / Pending / Skipped | [url or —] |
| Security Architecture | Published / Pending / Skipped | [url or —] |
| Non-Functional Requirements | Published / Pending / Skipped | [url or —] |

**Parent folder:** [parent URL]
**Session context:** .claude/memory/session_context.md
```

If no session context exists, say:
> "No active session found. Run `/arch-agent <strategy-url>` to start."
