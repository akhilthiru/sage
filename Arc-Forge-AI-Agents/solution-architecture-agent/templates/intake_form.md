# {{PRODUCT_NAME}} — Architecture Intake Form

> **Instructions for the team**: This form has been pre-filled with information extracted from the product strategy. Please review all fields, complete anything marked **[Please complete]**, and correct any pre-filled values that are inaccurate.
>
> When done, notify your Solution Architect so architecture generation can proceed.

---

## 1. Project Metadata

| Field | Value |
|---|---|
| Product Name | {{PRODUCT_NAME}} |
| Product Strategy URL | {{STRATEGY_URL}} |
| Target Users / Personas | {{TARGET_USERS}} |
| MVP Scope | {{MVP_SCOPE}} |
| Document Owner | **[Please complete]** |
| Reviewer(s) | **[Please complete]** |
| Approver(s) | **[Please complete]** |

---

## 2. Cloud & Infrastructure

| Field | Value |
|---|---|
| Cloud Provider | **[Please complete]** — AWS / Azure / GCP / Other |
| Primary Region | **[Please complete]** — e.g. eu-west-2 (London) |
| DR / Secondary Region | **[Please complete]** — or "Not applicable for MVP" |
| Account Structure | **[Please complete]** — e.g. Single account / Separate Dev+Staging+Prod accounts |
| Compute Model | **[Please complete]** — EKS / ECS / AKS / GKE / Lambda / VM / Other |
| Multi-AZ Requirement | **[Please complete]** — Yes (production) / No |
| Environments | **[Please complete]** — e.g. Dev / QA / Stage / Prod (list all required) |

---

## 3. Technology Stack

| Layer | Technology Choice | Notes |
|---|---|---|
| Frontend Framework | **[Please complete]** — e.g. React / Next.js / Vue / Angular | |
| Backend Framework | **[Please complete]** — e.g. NestJS / FastAPI / Spring Boot / Express | |
| Backend Language | **[Please complete]** — e.g. TypeScript / Python / Java / Go | |
| Primary Database | **[Please complete]** — e.g. PostgreSQL / MySQL / SQL Server / MongoDB | |
| Time-series / Analytics DB | **[Please complete]** — e.g. TimescaleDB / InfluxDB / N/A | |
| Cache Layer | **[Please complete]** — e.g. Redis / Memcached / N/A | |
| Caching Approach | **[Please complete]** — Dedicated cache service (Redis etc.) / Pre-computed summary tables in primary DB / N/A | |
| Message Broker | **[Please complete]** — e.g. Kafka / SQS+SNS / RabbitMQ / N/A | |
| Object Storage | **[Please complete]** — e.g. S3 / Azure Blob / GCS | |
| AI / LLM Service | **[Please complete]** — e.g. AWS Bedrock / Azure OpenAI / OpenAI API / N/A | |
| Product Analytics Tool | **[Please complete]** — e.g. PostHog / Mixpanel / Amplitude / N/A | |

---

## 4. Identity & Access Management

| Field | Value |
|---|---|
| IDP / Auth Provider | **[Please complete]** — e.g. Auth0 / AWS Cognito / Azure AD / Okta / Keycloak / Custom |
| Auth Protocol | **[Please complete]** — OIDC / OAuth2 / SAML |
| MFA Required | **[Please complete]** — Yes / No / Optional |
| Multi-tenant (multiple client organisations) | **[Please complete]** — Yes / No |
| Multi-tenancy Isolation Model | **[Please complete]** — Logical isolation (row-level security on shared DB) / Separate schema per tenant / Separate DB per tenant / N/A |

---

## 5. External Integrations

List all external systems the platform must integrate with:

| System / API | Provider | Purpose | Integration Type |
|---|---|---|---|
| **[Please complete]** | | | REST API / File / WebSocket / SDK |
| **[Please complete]** | | | |
| **[Please complete]** | | | |

---

## 6. Scale & Performance Targets

| Requirement | Target | Notes |
|---|---|---|
| Expected concurrent users (MVP) | **[Please complete]** | |
| Expected concurrent users (scale target) | **[Please complete]** | |
| API response time target (p95) | **[Please complete]** — e.g. ≤2s | |
| API response time target (p99) | **[Please complete]** — e.g. ≤5s | |
| Dashboard / page render time | **[Please complete]** — e.g. ≤3s | |
| Data volume at scale | **[Please complete]** — e.g. 5M records / 50 client organisations | |

---

## 7. Availability & Reliability

| Requirement | Target | Notes |
|---|---|---|
| Production uptime SLA | **[Please complete]** — e.g. 99.9% | |
| Acceptable maintenance window | **[Please complete]** — e.g. Sundays 02:00–04:00 UTC | |
| MTTR target (Sev1) | **[Please complete]** — e.g. ≤4 hours | |
| MTBF target | **[Please complete]** — e.g. ≥30 days between Sev1 incidents / Not defined | |
| RPO (Recovery Point Objective) | **[Please complete]** — e.g. ≤1 hour | |
| RTO (Recovery Time Objective) | **[Please complete]** — e.g. ≤4 hours | |

---

## 8. Security & Compliance

### Regulations & Data

| Requirement | Value |
|---|---|
| Applicable regulations | **[Please complete]** — GDPR (UK/EU) / SOC2 / ISO27001 / HIPAA / CSRD / CSDDD / REACH / None |
| PII scope | **[Please complete]** — e.g. User name + work email only / Consumer PII / Special category data / None |
| Data classification tiers | **[Please complete]** — e.g. Restricted / Confidential / Internal / Public (list tiers and what data falls in each) |
| Penetration testing required before go-live | **[Please complete]** — Yes / No |

### Audit Log Retention

Different log types often have different regulatory retention requirements. Complete per row:

| Log Type | Retention Period |
|---|---|
| User login & session logs | **[Please complete]** — e.g. 12 months |
| Data upload / mutation events | **[Please complete]** — e.g. 24 months |
| Export & download logs | **[Please complete]** — e.g. 24 months |
| Admin & configuration changes | **[Please complete]** — e.g. 36 months |
| Error & validation logs | **[Please complete]** — e.g. 90 days |
| GDPR / data subject request logs | **[Please complete]** — e.g. 36 months |
| Regulatory disclosure records | **[Please complete]** — e.g. 5–7 years / N/A |

### AI / LLM Data Handling (complete if AI/LLM service is used)

| Field | Value |
|---|---|
| Data sent to LLM provider | **[Please complete]** — e.g. Aggregated risk summaries only / No PII / Full tenant records |
| LLM provider data residency requirement | **[Please complete]** — EU only / No restriction / N/A |
| Data Processing Agreement (DPA) with LLM provider required | **[Please complete]** — Yes (must cover: no training on tenant data, no retention beyond API call) / No / N/A |

---

## 9. DevOps & Tooling

| Tool | Choice |
|---|---|
| CI/CD Platform | **[Please complete]** — GitHub Actions / GitLab CI / Jenkins / Azure DevOps |
| Source Control | **[Please complete]** — GitHub / GitLab / Bitbucket |
| Repository Structure | **[Please complete]** — Monorepo / Multi-repo |
| IaC Tool | **[Please complete]** — Terraform / Pulumi / CDK / Bicep / CloudFormation |
| Container Registry | **[Please complete]** — ECR / GCR / ACR / Docker Hub |
| SAST Tool | **[Please complete]** — SonarCloud / SonarQube / CodeQL / Other |
| SCA Tool | **[Please complete]** — Snyk / Dependabot / OWASP Dependency-Check |
| Container Scanning Tool | **[Please complete]** — Trivy / Snyk Container / Prisma Cloud / Other |
| On-call / Alerting Platform | **[Please complete]** — PagerDuty / Opsgenie / Email only / Other |

---

## 10. Additional Notes

_Anything else the architecture team should know — team structure, delivery timeline, known constraints, decisions already made, decisions still open._

**[Please complete — or write "None"]**
