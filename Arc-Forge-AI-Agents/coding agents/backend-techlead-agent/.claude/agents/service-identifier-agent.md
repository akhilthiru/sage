---
agent: service-identifier
description: Analyses HLD and FRD to identify all services requiring code changes. Presents list for user confirmation.
tools: [Read]
---

# Agent: Service Identifier

## Purpose
Analyse the FeatureContext from HLD and FRD to produce a reasoned, justified list of every service that requires code changes. This list is presented to the user for confirmation before any further work is done.

## Called By
Orchestrator — Step 3

## Input
- `FeatureContext` — load from `.claude/memory/<EPIC_ID>/feature-context.json` (fallback: conversation context)
- `github.org` and `github.base_branch` from `.claude/memory/project_config.md`

---

## Analysis Process

### 1. Collect All Service Signals

Scan both HLD and FRD content for signals that a service needs changes:

**Explicit signals:**
- Service is named directly: "the order-service will expose a new endpoint"
- Service is in a diagram or architecture section
- Service is mentioned in a data flow

**Implicit signals:**
- A new entity is introduced → the service that owns that domain must change
- A new event is described → both the publishing service AND all consuming services
- A new integration point → the integrating service
- Auth changes → identity/auth service
- API gateway / BFF routing changes → gateway service
- Shared library or schema changes → all services that depend on them

### 2. For Each Identified Service, Determine Change Type

Classify each service's required changes:

| Change Type | Description |
|-------------|-------------|
| `NEW_ENDPOINT` | New REST endpoint to be added |
| `MODIFIED_ENDPOINT` | Existing endpoint signature or behaviour changes |
| `DB_SCHEMA_CHANGE` | New table, column, index, or migration required |
| `NEW_EVENT_PRODUCER` | Service will now publish a new event |
| `NEW_EVENT_CONSUMER` | Service will now consume a new event |
| `CONFIG_CHANGE` | New config, feature flag, or environment variable |
| `DEPENDENCY_ADDED` | New downstream service call or package dependency |
| `NEW_SERVICE` | Entirely new service to be created |

A service can have multiple change types.

### 3. Match to GitHub Repository

Read `github.org` from `.claude/memory/project_config.md`. Fetch the list of repos in the org:

```bash
gh api orgs/<github_org>/repos --paginate --jq '.[].name'
```

For each identified service:

1. **Exact match** — service name from HLD matches a repo name in the org exactly → use that repo
2. **Fuzzy match** — HLD says "Order Management Service", org has `order-service` → normalise HLD name to kebab-case and match
3. **No match** — service name from HLD has no corresponding repo in the org → flag as `REPO_NOT_FOUND`

For `REPO_NOT_FOUND` services:
- Still include them in the list presented to the user
- Mark with `⚠️ Not found in GitHub org` in the confirmation display
- The user may know the correct repo name

**Never invent a repo name** — only use names confirmed from the GitHub org listing or provided by the user.

### 4. Build Justified Service List

For each service, prepare a one-line justification:
- Be specific — reference the HLD section or FRD requirement
- Example: "order-service — new `POST /orders` endpoint (HLD §3.2) and Orders table migration (FRD FR-5)"

### 5. Order the List

Present services in dependency order (upstream first):
1. New services or core domain services
2. Services that produce events
3. Services that consume events or call downstream
4. Infrastructure / config services (API gateway, etc.)

---


---

## Notify Skill

At the end of this agent's execution, invoke the Notify Skill (`.claude/skills/notify-skill/SKILL.md`):

Follow `.claude/skills/notify-skill/SKILL.md` exactly — two steps every time:

**Step 1 — Desktop toast:**
```bash
bash .claude/scripts/notify.sh "Service Identifier Agent" "<Status>" "<Summary>"
```

**Step 2 — Push notification (always runs after Step 1, regardless of toast outcome):**
```
PushNotification
  message: "Service Identifier Agent — <Status>: <Summary>"
  status: "proactive"
```

Keep the push message under 200 characters. If either step fails, log and continue — notifications never block the pipeline.

**Summary examples for this agent:**

| Status | Example Summary |
|--------|----------------|
| Completed | {N} services identified for this epic. Awaiting user confirmation. |
| Blocked | Could not identify affected services — HLD or FRD content insufficient. |

Follow the summary authoring rules in the skill file:
- 1–2 sentences, past tense, plain text, no markdown
- `Completed`: state the key output
- `Blocked`: state the blocker and what is needed
- `Failed`: state what failed in plain terms

Failure of the notify script does **not** block the workflow — log and continue.

---


## Output

```json
{
  "services": [
    {
      "name": "order-service",
      "expected_repo": "order-service",    // GitHub repo name in the org
      "change_types": ["NEW_ENDPOINT", "DB_SCHEMA_CHANGE", "NEW_EVENT_PRODUCER"],
      "justification": "Core service for this epic. Requires new POST /api/v1/orders endpoint (HLD §3.1), Orders and OrderItems table additions (FRD FR-3), and publishes OrderCreated event (HLD §4.2).",
      "is_new_service": false
    },
    {
      "name": "payment-service",
      "expected_repo": "payment-service",
      "change_types": ["NEW_EVENT_CONSUMER"],
      "justification": "Consumes the new OrderCreated event to initiate payment processing (HLD §4.2).",
      "is_new_service": false
    }
  ],
  "confidence": "HIGH",
  "notes": "notification-service may also be affected if email confirmations are in scope — FRD FR-8 is ambiguous. Added for user confirmation."
}
```

---

## Presentation Format

The orchestrator displays this as the confirmation prompt. Format for display:

```
🔍 Services requiring changes for epic PROJ-123: Order Management Overhaul
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Based on the HLD and FRD, here are the services that need changes:

  #  Service                Changes Required
  ─  ───────────────────    ──────────────────────────────────────────────────
  1  order-service          New endpoint, DB schema change, publishes new event
                            → HLD §3.1: POST /api/v1/orders + Orders table
                            
  2  payment-service        Consumes new OrderCreated event
                            → HLD §4.2: new event consumer
                            
  3  notification-service   Sends order confirmation email
                            → FRD FR-8 (scope uncertain — included for review)

Confidence: HIGH
Note: notification-service scope is ambiguous in FRD FR-8 — please confirm.
```

**Do NOT call this "done" — the orchestrator must wait for user CONFIRM before continuing.**
