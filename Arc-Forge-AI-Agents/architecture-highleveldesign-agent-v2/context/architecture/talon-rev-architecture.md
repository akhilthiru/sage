# TALON Rev — Platform Architecture Reference

> This document describes the TALON Rev platform architecture. Sub-agents must use this as the source of truth for all architectural decisions in HLDs. Do not invent new infrastructure components without justification.

## Platform Overview

TALON Rev is a cloud-native, multi-tenant dealer management platform built on Microsoft Azure. It replaces legacy monolithic systems with a microservices architecture designed for scalability, resilience, and dealer operational efficiency.

---

## Compute — Azure Container Apps

All TALON Rev services run on **Azure Container Apps (ACA)**.

| Characteristic | Detail |
|---------------|--------|
| Runtime | Azure Container Apps Environment (shared per region) |
| Scaling | KEDA-based autoscaling — HTTP traffic, queue depth, and custom metrics |
| Ingress | Internal (service-to-service) and external (public API gateway) |
| Revision management | Blue/green deployments via traffic splitting |
| Configuration | Environment variables + Azure Key Vault references |
| Managed identity | System-assigned managed identity per app — used for Key Vault, Service Bus, SQL auth |

### Service Naming Convention
- `talon-{domain}-service` — e.g., `talon-inventory-service`, `talon-repair-service`
- `talon-{domain}-worker` — background/event processor services
- `talon-{domain}-api` — externally exposed API surface (if separated from service)

---

## Messaging — Azure Service Bus

All asynchronous communication uses **Azure Service Bus** with the following topology:

| Component | Detail |
|-----------|--------|
| Namespace | One per environment (dev/staging/prod) |
| Topics | One per event type — `{domain-entity}-{past-tense-action}` (kebab-case) |
| Subscriptions | One per consumer service per topic |
| Sessions | Enabled on topics requiring ordered delivery per entity |
| Dead-letter queue | Every subscription has a DLQ — monitored via DataDog alert |
| Message retention | 14 days (configurable per topic) |
| Max delivery count | 5 (then dead-lettered) |

### Session Strategy
- Use sessions where message ordering per aggregate matters (e.g., all events for a repair order processed in order)
- `SessionId` = entity's natural key (e.g., `repairOrderId`, `stockItemId`)

---

## Primary Data Store — Azure SQL

**Azure SQL** is the OLTP database for all transactional data.

| Characteristic | Detail |
|---------------|--------|
| Tier | General Purpose — serverless for dev, provisioned for prod |
| One database per service | Each service has its own Azure SQL database |
| Authentication | Managed Identity (no connection string passwords) |
| ORM | EF Core (code-first, explicit configuration) |
| Migrations | EF Core migration scripts applied via CI/CD pipeline |
| Backup | Azure-managed automated backups, 35-day retention |

---

## Permissions Store — Cosmos DB (MongoDB API)

**Cosmos DB with MongoDB API** is used for permissions, tenant configuration, and non-transactional reads.

| Characteristic | Detail |
|---------------|--------|
| API | MongoDB (wire protocol compatible) |
| Partition key | `tenantId` (default) or composite per collection |
| Use cases | User permissions documents, tenant feature flags, tenant configuration |
| Consistency | Session consistency (default) |
| Not for | OLTP, ACID transactions, complex joins |

---

## Object Storage — Azure Blob Storage

**Azure Blob Storage** is used for all unstructured file storage.

| Use case | Container naming |
|---------|-----------------|
| Document attachments | `{tenant-id}-documents` |
| Image uploads | `{tenant-id}-images` |
| Report exports | `{tenant-id}-exports` |
| HLD / design artifacts | `architect-artifacts` |

- Access via SAS tokens (short-lived, scoped) — never expose storage account keys
- Lifecycle policies for expiry of temporary exports

---

## Authentication & Authorisation — Entra External ID

All user-facing APIs are secured with **Microsoft Entra External ID (CIAM)**.

| Component | Detail |
|-----------|--------|
| Token type | JWT Bearer (OAuth 2.0 / OIDC) |
| Issuer | `https://login.microsoftonline.com/{tenant-id}/v2.0` |
| Audience | `api://{client-id}` |
| Scopes | Fine-grained per endpoint — e.g., `inventory.read`, `repair.write` |
| Claims | `oid` (user id), `tid` (tenant id), `roles` (app roles), `scp` (scopes) |
| Service-to-service | Managed identity + `DefaultAzureCredential` — no client secrets |

---

## Observability — OpenTelemetry + DataDog

| Signal | Implementation |
|--------|---------------|
| **Traces** | OpenTelemetry SDK → DataDog APM (distributed tracing across services) |
| **Metrics** | OpenTelemetry metrics → DataDog (custom business metrics + system metrics) |
| **Logs** | Structured JSON logs (Serilog) → DataDog Logs |
| **Alerts** | DataDog monitors — threshold and anomaly-based alerts |
| **Dashboards** | DataDog dashboards per service domain |

### Mandatory Instrumentation Per Service
- Trace every inbound HTTP request with `X-Correlation-Id` propagation
- Trace all outbound HTTP calls and Service Bus publish/consume
- Log: request start, completion, errors, and business events (e.g., `StockItemCommitted`)
- Metric: request count, duration histogram, error rate, queue depth

---

## Networking & Security

| Layer | Detail |
|-------|--------|
| API Gateway | Azure API Management (APIM) — external entry point |
| Internal routing | Azure Container Apps internal ingress (FQDN per app) |
| TLS | TLS 1.2+ enforced at APIM and ACA ingress |
| Secrets | Azure Key Vault — referenced in ACA environment variables |
| Network isolation | ACA environment in dedicated VNet |
| Private endpoints | Azure SQL, Cosmos DB, Service Bus, Blob Storage behind private endpoints |

---

## CI/CD Pipeline

| Stage | Tooling |
|-------|---------|
| Source control | Azure DevOps Repos |
| Build | Azure Pipelines |
| Container registry | Azure Container Registry (ACR) |
| Deployment | Azure Pipelines → `az containerapp update` |
| DB migrations | EF Core bundle executed as pipeline step before service deployment |
| Environment promotion | dev → staging → prod with approval gates |

---

## Service Domains

| Domain | Service Name | Primary Responsibility |
|--------|-------------|----------------------|
| Inventory | `talon-inventory-service` | Stock management, parts lookup, quantity tracking |
| Repair | `talon-repair-service` | Work orders, repair jobs, labour lines |
| Parts | `talon-parts-service` | Parts ordering, special orders, vendor integration |
| Pricing | `talon-pricing-service` | Labour rates, parts pricing, discount policies |
| Customer | `talon-customer-service` | Customer profiles, contact info, preferences |
| Finance | `talon-finance-service` | Invoicing, payments, dealer financial reporting |
| Identity | `talon-identity-service` | Tenant provisioning, user roles, permission management |
| Notifications | `talon-notification-service` | Email, SMS, in-app notifications |

---

## Key Architectural Constraints

1. **No cross-service direct DB access** — each service owns its data; cross-domain reads via API or projected read models
2. **No synchronous chains longer than 2 hops** — A calls B which calls C is the maximum synchronous depth; deeper chains use events
3. **Every service must be deployable independently** — no shared libraries that require simultaneous deployment
4. **All external surfaces go through APIM** — no direct ACA ingress exposed publicly
5. **Tenant isolation is non-negotiable** — every DB query must filter by TenantId; every event envelope must include tenantId
