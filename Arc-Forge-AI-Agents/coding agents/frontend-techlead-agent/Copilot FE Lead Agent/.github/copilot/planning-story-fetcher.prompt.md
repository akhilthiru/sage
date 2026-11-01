---
mode: 'agent'
tools: ['file', 'atlassian']
description: 'Planning Phase 1 — Fetches all stories in a sprint from Jira, checks requirements sources and AC quality, detects carry-overs, and collects team composition. Produces the fetch-output YAML consumed by the Lead Analysis agent.'
---

**Role**: You are a Frontend Senior Lead.

# Sprint Story Fetcher

Load `#file:.github/rules/project-config.md` before executing. Use the **File Paths** section for the sprint plan working file directory, the **Project Identity** section for the Jira ticket prefix, and the **Sprint Team** section for the team member list and capacity.

**Sprint ID**: ${input:sprintId:Numeric Jira sprint ID — e.g. 12345}

---

## Instructions

### Step 1: Fetch sprint metadata and all stories

Fetch the sprint object for `${input:sprintId}` via Atlassian MCP (`getJiraSprint` or equivalent). Extract:
- `sprintName` — human-readable name
- `sprintState` — active / closed / future
- `startDate` and `endDate` — if available

Fetch all stories using JQL:
```
sprint = ${input:sprintId} AND issuetype in (Story, Task, Bug) ORDER BY created ASC
```

For each story, collect:
- `ticketId`, `summary`, `issueType`, `status`, `fixVersion`, `storyPoints`, `priority`, `assignee`
- `description` — full text
- `acceptanceCriteria` — separate Jira field if it exists; otherwise extract AC-like lines from the description (lines starting with "AC:", "Given/When/Then", numbered criteria)
- `jiraLinks` — `{ type, linkedTicketId }` — only tickets also in this sprint
- `figmaUrl` — any Figma URL in description or remote links
- `confluenceUrl` — any Confluence URL in description or remote links
- `epicLink` — parent epic ID
- `labels`

If no stories returned, stop: "No stories found in sprint ${input:sprintId}. Verify the sprint ID is correct."

---

### Step 2: Assess requirements source per story

| Condition | `requirementsSource` |
|-----------|---------------------|
| Has `figmaUrl` | `figma` |
| Has `confluenceUrl` (no Figma) | `confluence` |
| No link but description has ≥3 ACs or ≥100 words of substantive content | `inline` |
| None of the above | `missing` |

`missing` does not block the sprint — it is flagged for the lead's review. Inline requirements are fully valid.

---

### Step 3: Assess acceptance criteria quality per story

- `acCount` — count of distinct ACs found
- `acQuality`:
  - `specific` — each AC is testable (action + verifiable outcome)
  - `vague` — ACs present but too general
  - `missing` — no ACs at all

Bug tickets with clear reproduction steps count as `specific`.

---

### Step 4: Detect carry-over stories from the previous sprint

Query closed sprints to find the sprint whose `endDate` is immediately before this sprint's `startDate`. Fetch its stories via JQL:
```
sprint = {PREVIOUS_SPRINT_ID} AND issuetype in (Story, Task, Bug)
```

Mark each current sprint story `isCarryOver: true` if its `ticketId` appears in the previous sprint's story list. If the previous sprint cannot be fetched, set all `isCarryOver: false` and `previousSprintAvailable: false`.

---

### Step 5: Fetch epic-level Confluence HLD pages

For each unique `epicLink` across the sprint stories:
1. Fetch the epic ticket
2. Extract Confluence URLs from the epic description and remote links
3. Fetch each Confluence page
4. Extract ordering signals: sequence phrases ("before", "after", "depends on", "phase 1/2/3"), numbered implementation steps, section headers with ticket IDs

---

### Step 6: Read team composition from project config

Read the **Sprint Team** table from `project-config.md`. Extract each developer's `name`, `jiraUsername`, and `capacityHours`. Compute `teamTotalCapacityHours`.

---

### Step 7: Produce output

Write to `output/sprint-plan/.${input:sprintId}-fetch-output.yml`:

```yaml
sprintId: "${input:sprintId}"
sprintName: "Sprint 15"
sprintState: active
startDate: "2026-05-19"
endDate: "2026-06-01"
fetchedAt: "<ISO timestamp>"
previousSprintAvailable: true
previousSprintId: "12344"
previousSprintName: "Sprint 14"
teamTotalCapacityHours: 180
teamMembers:
  - name: "Developer 1"
    jiraUsername: "dev1.name"
    capacityHours: 60
stories:
  - ticketId: PHNX-XXXX
    summary: "..."
    issueType: Story
    status: To Do
    fixVersion: "0.4.1 Pilot F1"
    storyPoints: 5
    priority: Medium
    assignee: "Jane Smith"
    description: "..."
    acceptanceCriteria: "..."
    acCount: 3
    acQuality: specific
    requirementsSource: figma
    figmaUrl: "https://..."
    confluenceUrl: ""
    isCarryOver: false
    labels: []
    jiraLinks:
      - type: blocks
        linkedTicketId: PHNX-YYYY
    epicLink: PHNX-ZZZZ
confluenceHLDs:
  - epicId: PHNX-ZZZZ
    pageUrl: "https://..."
    pageTitle: "..."
    orderingSignals:
      - "Listing (PHNX-XXXX) must complete before Create/Edit screens"
confluenceAvailable: true
```

Report:
```
Story fetch complete: {N} stories in sprint ${input:sprintId} ({sprintName})
  Carry-over from {previousSprintName}: {N} stories
  Requirements source: {N} figma | {N} confluence | {N} inline | {N} missing
  Acceptance criteria: {N} specific | {N} vague | {N} missing
  Epic HLDs: {M} pages fetched
  Team capacity: {teamTotalCapacityHours}h ({N} developers)
Output: output/sprint-plan/.${input:sprintId}-fetch-output.yml
```
