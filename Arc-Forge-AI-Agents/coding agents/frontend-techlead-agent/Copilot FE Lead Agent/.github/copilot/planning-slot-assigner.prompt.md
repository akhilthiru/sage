---
mode: 'agent'
tools: ['file']
description: 'Planning Phase 3 — Builds the dependency graph, assigns stories to slots, and balances developer workload. Produces the slots-output YAML consumed by the Plan Publisher.'
---

**Role**: You are a Frontend Senior Lead.

# Sprint Slot Assigner

Load `#file:.github/rules/project-config.md` before executing. Use the **Workflow Track Detection** section for fix version keywords, the **File Paths** section for shared file patterns, and the **Sprint Team** section for the developer list.

**Sprint ID**: ${input:sprintId:Numeric Jira sprint ID}

Reads the fetch output and analysis output, builds the dependency graph from four sources, identifies Foundation stories, detects shared file conflicts, assigns stories to slots, and balances workload across developers. All team members are treated as senior developers with equivalent productivity.

No external MCP calls — works entirely from fetched and analysed data.

---

## Instructions

### Step 1: Read the inputs

Read:
- `output/sprint-plan/.${input:sprintId}-fetch-output.yml`
- `output/sprint-plan/.${input:sprintId}-analysis-output.yml`

If either is missing, stop with the appropriate message.

---

### Step 2: Build the dependency graph

Record each dependency as:
`{ from, to, reason, source: "jira|confluence|keyword|description", confidence: "High|Medium|Low" }`

**Source 1 — Jira issue links (weight 4)**
- `A blocks B` → B depends_on A
- `A is blocked by B` → A depends_on B — Confidence: High

**Source 2 — Confluence HLD ordering signals (weight 3)**
- Parse `orderingSignals` from fetch output, match to sprint stories — Confidence: Medium

**Source 3 — Summary keyword ordering within same feature area (weight 2)**

| Summary keywords | Position |
|-----------------|----------|
| `list`, `listing`, `grid`, `view all`, `overview` | 1 |
| `create`, `add`, `new`, `register` | 2 |
| `edit`, `update`, `modify`, `change` | 3 |
| `delete`, `remove`, `archive`, `deactivate` | 4 |
| `report`, `export`, `dashboard`, `summary` | 5 |

Position 1 story → stories at positions 2–5 in the same feature area depend on it.
Confidence: Medium (same feature), Low (uncertain grouping).

**Source 4 — Description cross-references (weight 1)**
- Scan descriptions for mentions of other sprint ticket IDs — Confidence: Low

Consolidate duplicates at the highest confidence level.

---

### Step 3: Identify Foundation stories

Foundation if ANY of these:
1. Two or more sprint stories depend on it
2. Summary at keyword position 1 AND another story in the same feature area is at position 2+
3. Most inbound cross-references

Multiple Foundation stories in the same feature area are sequential. If none qualify, skip the Foundation slot.

---

### Step 4: Detect shared file conflicts and assign slots

**Infer shared files per story:**

| Position | Likely shared files |
|----------|--------------------|
| 1 (listing) | `*-interfaces.ts`, `use*Queries.ts`, `*-service.ts` — creates them |
| 2 (create) | `*-interfaces.ts` (form type), `use*Queries.ts` (mutation), `*-tabs.ts` |
| 3 (edit) | `*-interfaces.ts` (edit type), `use*Queries.ts` (mutation), `*-tabs.ts` |
| 4 (delete) | `use*Queries.ts` (delete mutation) |
| 5 (export) | `use*Queries.ts` (new query) |
| Bug fix | No shared file conflicts unless stated otherwise |

Stories conflict when both modify the same shared file in the same feature folder.

**Slot assignment:**
1. Foundation slot — Foundation stories in dependency order
2. Numbered slots 1, 2, 3... — conflicting stories in the same slot; different feature folders never conflict

Per slot: compute `totalStoryPoints`, `totalEstimatedHours`, `storiesWithNoEstimate`.

---

### Step 5: Determine workflow type per story

Use fix version keywords from **Workflow Track Detection** in `project-config.md`:
- Bug + beta + Highest/Critical → `hotfix`
- Bug + beta → `beta-bugfix`
- Bug + pilot or empty → `bugfix`
- Story/Task + beta → `beta-feature`
- Story/Task + pilot or empty → `feature`

---

### Step 6: Assign developers to stories

All team members have equivalent productivity. Balance `estimatedHours` across the team.

1. Assign all Foundation slot stories to the developer with the most available hours
2. Assign each remaining slot to one developer (they own the full stream)
3. If a slot's `totalEstimatedHours` exceeds one developer's remaining capacity, split at a natural story boundary with no shared file dependency between the two halves
4. Compute each developer's `assignedHours` and `remainingCapacityHours`
5. Flag `overloaded: true` if `assignedHours > capacityHours`

---

### Step 7: Produce output

Write to `output/sprint-plan/.${input:sprintId}-slots-output.yml`:

```yaml
sprintId: "${input:sprintId}"
sprintName: "Sprint 15"
assignedAt: "<ISO timestamp>"
hasFoundationSlot: true
totalStories: 8
riskCount: 2
developerWorkload:
  - name: "Developer 1"
    jiraUsername: "dev1.name"
    capacityHours: 60
    assignedHours: 44.5
    remainingCapacityHours: 15.5
    overloaded: false
    assignedTickets: ["PHNX-XXXX"]
slots:
  - slot: Foundation
    label: "Foundation — Start First"
    totalStoryPoints: 8
    totalEstimatedHours: 18.5
    storiesWithNoEstimate: 0
    stories:
      - ticketId: PHNX-XXXX
        summary: "..."
        workflowType: feature
        storyPoints: 8
        estimatedHours: 18.5
        complexity: Medium
        riskFlag: true
        readinessStatus: ready
        isCarryOver: false
        assignedTo: "Developer 1"
        assignedJiraUsername: "dev1.name"
        sharedFilesCreated:
          - "*-interfaces.ts"
          - "use*Queries.ts"
          - "*-service.ts"
        sharedFilesTouched: []
  - slot: "1"
    label: "Independent stream"
    totalStoryPoints: 5
    totalEstimatedHours: 12.5
    storiesWithNoEstimate: 0
    stories:
      - ticketId: PHNX-YYYY
        summary: "..."
        workflowType: feature
        storyPoints: 5
        estimatedHours: 12.5
        complexity: Medium
        riskFlag: false
        readinessStatus: needs-attention
        isCarryOver: false
        assignedTo: "Developer 2"
        assignedJiraUsername: "dev2.name"
        dependsOnSlot: Foundation
        sharedFilesCreated: []
        sharedFilesTouched:
          - "*-tabs.ts"
dependencies:
  - from: PHNX-YYYY
    to: PHNX-XXXX
    reason: "Edit screen needs interfaces from listing"
    source: keyword
    confidence: Medium
dataSources:
  jiraLinksFound: 1
  confluenceHLDsAnalyzed: 1
  keywordDependencies: 2
  descriptionCrossRefs: 0
```

Report:
```
Slot assignment complete for sprint ${input:sprintId} ({sprintName}):
  Foundation slot: {N} stories — {X} pts — {H}h — {developer}
  Slot 1: {N} stories — {X} pts — {H}h — {developer}
  Dependencies detected: {N} | Risk flags: {N}
  Developer workload:
    Developer 1: {H}h of {C}h capacity
    Developer 2: {H}h of {C}h capacity
Output: output/sprint-plan/.${input:sprintId}-slots-output.yml
```
