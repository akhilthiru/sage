---
name: sync-rules
description: Fetches the latest TALON Rev API Standards and DB Design Standards from Confluence, combines them with the industry reference baselines in context/, and regenerates rules/api-standards.md and rules/db-standards.md. Run when platform standards are updated in Confluence.
argument-hint: (no arguments required)
disable-model-invocation: true
context: fork
agent: orchestrator
---

Mode: SYNC_RULES

Fetch the latest TALON Rev standards from Confluence and regenerate the rules files.

Instructions:
1. Run the startup-check sub-agent first to verify Atlassian MCP is available.
2. Fetch Confluence page https://harleydavidson.atlassian.net/wiki/spaces/TPSPhoenix/pages/1463091264/API+Development+Standards (TALON Rev API Standards) using the Atlassian MCP.
3. Fetch Confluence page https://harleydavidson.atlassian.net/wiki/spaces/TPSPhoenix/pages/1463222370/SQL+Database+Design+Guidelines+for+Micro-Services (TALON Rev DB Design Standards) using the Atlassian MCP.
4. Read the current industry reference baselines:
   - context/api-reference.md
   - context/db-reference.md
5. Regenerate rules/api-standards.md by combining:
   - TALON Rev-specific rules from the Confluence API Standards page (authoritative — these take precedence)
   - Industry baseline principles from context/api-reference.md (supplementary)
   - Ensure all TALON Rev technology specifics are preserved: Entra External ID, Azure Container Apps, Refit + Polly, MediatR, FluentValidation
6. Regenerate rules/db-standards.md by combining:
   - TALON Rev-specific rules from the Confluence DB Design Standards page (authoritative)
   - Industry baseline principles from context/db-reference.md (supplementary)
   - Ensure all TALON Rev technology specifics are preserved: Azure SQL, Cosmos DB (MongoDB API), EF Core, ROWVERSION, global query filters
7. Write the updated files to rules/api-standards.md and rules/db-standards.md.
8. Report a summary of what changed.

Do not modify rules/event-standards.md — event standards are managed separately.
Do not modify the context/ reference files — those are static industry baselines.
