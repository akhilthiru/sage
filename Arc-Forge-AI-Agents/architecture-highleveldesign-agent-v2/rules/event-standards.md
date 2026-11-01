# Integration Event Standards — TALON Rev Platform

> These rules are mandatory. Every event designed in an HLD must conform to these standards.
> The Service Communication Designer sub-agent must validate its output against every rule here before returning.

## MassTransit — Eventing Framework (MANDATORY)

**MassTransit is the eventing framework for TALON Rev.** The framework manages outbox, transport bindings, and message infrastructure via its built-in conventions.

- **Do NOT design or generate `OutboxMessage` tables** as part of HLD database design. MassTransit's outbox is framework-managed and does not require a manually designed table in the HLD.
- **Do NOT design outbox relay workers** as separate services or background workers in HLD diagrams or service communication sections. MassTransit handles relay internally.
- **Do NOT design Azure Service Bus topic/subscription bindings** as explicit HLD artefacts. Transport topology is declared in code via MassTransit conventions and does not belong in the HLD.
- Event publishing in HLD should be described as: "Event publishing is handled by MassTransit using [existing / new] domain events."
- Only include an event in the HLD if it is a genuinely new domain event introduced by the feature or an existing event being consumed for the first time by a service involved in the feature.

## Audit Trail — Standing Rule (MANDATORY)

- **Do NOT design dedicated API calls to `tps-dms-audit-trail`** as part of feature communication design (e.g., do not include a `POST /v1/audit-events` call in the Service Communication section or API design).
- Reference the existing Audit Trail framework generically where audit logging is applicable, e.g.: "The existing Audit Trail framework is used wherever audit logging is required (e.g. manager override approvals)."
- Do not list `tps-dms-audit-trail` as a named call in the interaction summary table unless there is an explicit architectural reason to deviate from this rule.

## Infrastructure

- TALON Rev uses **Azure Service Bus** for all asynchronous messaging
- Each event type maps to a dedicated **Topic** with subscriptions per consumer
- Session-enabled topics must be used where message ordering per entity is required (e.g., per repair order, per tenant)

## When to Use Events (vs. Sync API)

| Use events when | Use sync API when |
|----------------|------------------|
| Operation does not require immediate confirmation | Caller needs an immediate, consistent response |
| Cross-domain eventual consistency is acceptable | Operation is atomic and must succeed or fail together |
| Fan-out to multiple consumers is needed | Single consumer, tight coupling is acceptable |
| Workflows are long-running or asynchronous | Low-latency user-facing operations |

## Topic Naming

- Format: `<domain-or-entity>-<past-tense-action>` — lowercase kebab-case
- Examples: `stock-item-committed`, `repair-order-created`, `special-order-approved`
- Domain prefix matches the owning service domain (e.g., `inventory-`, `repair-`, `pricing-`)
- Never use PascalCase or camelCase for topic names
- Never abbreviate — full descriptive names only

## Event Type Naming

- Format: `{Aggregate}{PastTenseVerb}` — PascalCase
- Examples: `StockItemCommitted`, `RepairOrderCreated`, `SpecialOrderApproved`
- Always past tense — events describe something that already happened
- No abbreviations — full descriptive names only

## Event Envelope — Mandatory Structure

Every event published to Azure Service Bus must use this envelope:

```json
{
  "eventId": "uuid — unique per event emission",
  "eventType": "StockItemCommitted",
  "version": "1.0",
  "occurredAtUtc": "2026-05-06T10:00:00Z",
  "correlationId": "uuid — propagated from the originating HTTP request",
  "causationId": "uuid — id of the event or command that directly caused this event",
  "source": "talon-inventory-service",
  "actor": {
    "userId": "uuid",
    "tenantId": "string"
  },
  "partitionKey": "string — entity id used for Service Bus session/partition (e.g., repairOrderId, tenantId)",
  "tenantId": "string",
  "payload": {
    // domain-specific fields
  }
}
```

### Envelope Field Rules

| Field | Required | Notes |
|-------|----------|-------|
| `eventId` | Yes | UUID v4, unique per emission — used by consumers for deduplication |
| `eventType` | Yes | PascalCase aggregate + past-tense verb |
| `version` | Yes | Semantic version string (`"1.0"`) |
| `occurredAtUtc` | Yes | ISO 8601 UTC timestamp |
| `correlationId` | Yes | Propagated from the originating HTTP `X-Correlation-Id` header |
| `causationId` | Yes | ID of the command/event that directly caused this event |
| `source` | Yes | Publishing service name (kebab-case) |
| `actor.userId` | Yes | User who triggered the action |
| `actor.tenantId` | Yes | Tenant context of the actor |
| `partitionKey` | Yes | Used as the Service Bus **session key** for ordered delivery |
| `tenantId` | Yes | Tenant scoping at envelope level |
| `payload` | Yes | Domain-specific fields — see payload rules below |

### Payload Field Rules

- Include only the data consumers need — do not dump entire entity state
- Field names in camelCase
- Dates in ISO 8601 UTC
- Amounts/quantities in decimal string format — never float
- Never include PII in event payloads unless encryption is explicitly addressed in the HLD

## Session Strategy

- Use Service Bus **sessions** (session-enabled topics) where message ordering per entity is required
- Set `partitionKey` = the entity's natural key (e.g., `repairOrderId`, `stockItemId`) for ordering
- For tenant-level ordering, set `partitionKey` = `tenantId`
- Document the session strategy choice in the HLD Event Catalogue

## Event Versioning

- Include a `version` field in every event envelope
- Additive changes (new optional fields) are backward compatible — increment minor version (`1.0` → `1.1`)
- Breaking changes require a new event type or major version — document migration in HLD
- Publishers must support old and new versions during the migration window

## Publisher Responsibilities

- Publisher owns the event contract — must document it in the HLD Event Catalogue
- Publisher must guarantee at-least-once delivery
- Publisher must set `correlationId` from the originating request's `X-Correlation-Id` header
- Publisher must set `causationId` from the triggering command or event id
- Publisher must not publish events before the transaction that caused them is committed (MassTransit outbox handles this)
- Publisher must set the Service Bus message's `SessionId` to `partitionKey`

## Consumer Responsibilities

- Consumers must be idempotent — duplicate events must not cause duplicate side effects
- Use `eventId` for deduplication
- Consumers must not call back to the publisher synchronously within event handling
- Consumers must handle schema evolution — ignore unknown fields gracefully
- Each consumer must have a named subscription on the topic

## Failure & Compensation

- Define **dead-letter queue (DLQ)** strategy for every event consumer
- Document max retry attempts and backoff policy in the HLD
- For compensating events: name them clearly — e.g., `SpecialOrderCancelled` compensates `RepairSpecialOrderCreated`
- Compensation flows must be documented in the HLD sequence diagrams

## Orchestration vs. Choreography

- **Orchestration**: one service coordinates the flow via commands/sync calls — use when steps must be sequential and atomic
- **Choreography**: services react to events independently — use when loose coupling and scalability matter more than strict ordering
- Document which pattern is used and justify the choice in the HLD

## Event Catalogue Format

Every HLD must document events in this format:

| Event Name | Topic | Publisher | Subscriber(s) | Trigger Condition | Payload (key fields) | Session Key | Compensation Event |
|-----------|-------|----------|--------------|------------------|---------------------|------------|-------------------|
| `StockItemCommitted` | `stock-item-committed` | `talon-inventory-service` | `talon-repair-service` | When stock is committed to a repair job | `stockItemId`, `quantity`, `repairOrderId` | `repairOrderId` | `StockItemUncommitted` |
