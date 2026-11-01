---
name: hld-guidelines
description: "hld design guidelines and standards"
---

## HLD Structure

### 1. Executive Summary
- 3-5 sentences describing the architectural approach
- State the primary architectural pattern chosen (e.g., microservices, modular monolith, event-driven)
- State the key technology choices and why

### 2. Architecture Overview
- **System Context Diagram (C4 Level 1)**: Show the system as a box, with all external actors (users, external systems, third-party APIs) around it. Show the direction of data flow.
- **Container Diagram (C4 Level 2)**: Break the system into containers (web app, API, database, message queue, etc.). Show communication protocols between them (HTTPS, gRPC, AMQP, etc.).
- **Component Diagram (C4 Level 3)** (if needed): Break key containers into components. Show internal structure of complex services.

For each diagram, provide:
- A Mermaid diagram code block
- A text description explaining the diagram
- A table of components with: Name, Type, Technology, Responsibility

### 3. Technology Stack

| Layer             | Technology        | Version  | Justification                              |
|-------------------|-------------------|----------|--------------------------------------------|
| Frontend          | [e.g., React]     | [e.g., 18.x] | [Why this was chosen over alternatives] |
| Backend API       | [e.g., .NET 8]    | [version]| [Justification]                            |
| Database          | [e.g., PostgreSQL] | [version]| [Justification]                           |
| Cache             | [e.g., Redis]     | [version]| [Justification]                            |
| Message Queue     | [e.g., RabbitMQ]  | [version]| [Justification]                            |
| Cloud Provider    | [e.g., Azure]     | N/A      | [Justification]                            |
| CI/CD             | [e.g., GitHub Actions] | N/A | [Justification]                            |

### 4. Key Design Decisions

For each significant decision, use this format:

```
#### Decision: [Title]

**Context:** [What situation or requirement led to this decision]
**Options Considered:**
  1. [Option A] — [Pros] / [Cons]
  2. [Option B] — [Pros] / [Cons]
  3. [Option C] — [Pros] / [Cons]

**Decision:** [Which option was chosen]
**Rationale:** [Why this option was selected over the others]
**Consequences:** [What trade-offs does this decision introduce]
**Revisit Trigger:** [Under what conditions should this decision be re-evaluated]
```

Include decisions for at minimum:
- Architectural pattern (monolith vs microservices vs modular monolith)
- Synchronous vs asynchronous communication
- Data storage strategy (SQL vs NoSQL vs both)
- Authentication and authorization approach
- Caching strategy

### 5. Data Flow
- Show the primary data flows through the system for key use cases
- Use sequence diagrams (Mermaid) for complex flows
- Show both happy path and error paths
- Label each arrow with the protocol and data format (e.g., "HTTPS / JSON", "AMQP / Protobuf")

### 6. Integration Points
For each external system integration:

| System          | Direction    | Protocol | Auth Method | Data Format | SLA           | Fallback Strategy       |
|-----------------|-------------|----------|-------------|-------------|---------------|-------------------------|
| [System name]   | Inbound/Outbound/Both | [REST/gRPC/AMQP] | [OAuth2/API Key/mTLS] | [JSON/XML/Protobuf] | [Response time, availability] | [What happens if this system is down] |

### 7. Security Architecture
- **Authentication**: Method, provider, token strategy (JWT lifetime, refresh mechanism)
- **Authorization**: Model (RBAC, ABAC, PBAC), where enforcement happens
- **Data Protection**: Encryption at rest (algorithm, key management), encryption in transit (TLS version)
- **Secrets Management**: How secrets are stored and rotated
- **Input Validation**: Where validation happens (API gateway, service layer, or both)
- **Audit Logging**: What actions are logged, where logs are stored, retention period

### 8. Scalability and Performance
- **Scaling Strategy**: Horizontal vs vertical, auto-scaling triggers
- **Bottleneck Analysis**: Identify the top 3 potential bottlenecks and mitigation strategies
- **Caching Strategy**: What is cached, where (CDN, application cache, database cache), TTL policies
- **Performance Budget**: Target response times per endpoint category (read, write, search)

### 9. Reliability and Disaster Recovery
- **Availability Target**: e.g., 99.9%
- **Failover Strategy**: Active-passive, active-active, multi-region
- **Backup Strategy**: Frequency, retention, testing schedule
- **RPO/RTO**: Recovery Point Objective and Recovery Time Objective
- **Circuit Breaker Pattern**: Where and how circuit breakers are applied
- **Health Checks**: Endpoint, frequency, what is checked

### 10. Observability
- **Logging**: Structured format, log levels, centralized aggregation tool
- **Metrics**: Key metrics per service, collection tool, alerting thresholds
- **Tracing**: Distributed tracing approach, correlation IDs
- **Dashboards**: Key dashboards to build, what each monitors
- **Alerting**: Alert definitions, severity levels, escalation path

### 11. Deployment Architecture
- **Environment topology**: Dev, QA, Staging, Production
- **Infrastructure-as-Code**: Tool (Terraform, Bicep, CloudFormation), repository location
- **CI/CD Pipeline**: Build, test, deploy stages with quality gates
- **Feature Flags**: Tool and strategy for gradual rollouts
- **Blue-Green / Canary**: Deployment strategy for zero-downtime releases

### 12. Risks and Mitigations

| Risk                                      | Likelihood | Impact | Mitigation                              |
|-------------------------------------------|-----------|--------|-----------------------------------------|
| [e.g., Third-party API rate limiting]     | Medium    | High   | [Implement caching + retry with backoff]|

### 13. Open Items
- Questions requiring further investigation
- Decisions pending stakeholder input
- Proof-of-concept needed before finalizing

---

## Diagram Standards

- Use **Mermaid** syntax for all diagrams
- Use consistent colors: blue for internal services, green for external systems, orange for databases, red for security boundaries
- Every arrow must be labeled with protocol and direction
- Keep diagrams readable — no more than 12 elements per diagram; split into sub-diagrams if larger
- Provide alt-text descriptions for accessibility
