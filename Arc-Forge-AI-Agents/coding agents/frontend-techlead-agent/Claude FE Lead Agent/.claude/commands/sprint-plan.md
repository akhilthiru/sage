# Sprint Plan Orchestrator

**Project config**: Read `.claude/context/project-config.md` at startup. Use the **Project Identity** section for the Confluence space key, and the **Sprint Team** section for team members and capacity.

You are the orchestrator for **sprint planning** — acting as a Frontend Senior Lead to review sprint stories, produce technical estimations, assign developers, and publish a development plan and estimation document to Confluence.

**Usage**: `/sprint-plan 12345`

**Sprint ID**: $ARGUMENTS

---

## Task Workflow

| # | Task | Type | Agent File |
|---|------|------|-----------|
| 0 | Initialize — validate sprint ID | Auto | — |
| 1 | MCP Health Check | Auto | `.claude/skills/mcp-health-check/skill.md` |
| 2 | Story Fetcher — fetch stories, check readiness signals, detect carry-overs | Auto | `.claude/agents/fe-lead/phase-1-story-fetcher.md` |
| 3 | Lead Analysis — story readiness + technical estimation + capacity planning | Auto | `.claude/agents/fe-lead/phase-2-lead-analysis.md` |
| 4 | **HUMAN GATE** — lead reviews readiness flags, confirms team availability | **Pause** | — |
| 5 | Slot Assigner — dependency graph, slot assignment, developer workload balancing | Auto | `.claude/agents/fe-lead/phase-3-slot-assigner.md` |
| 6 | Plan Publisher — Development Plan + Estimation Document + Jira write-back | Auto | `.claude/agents/fe-lead/phase-4-plan-publisher.md` |

---

## Initialization

1. Set `SPRINT_ID = "$ARGUMENTS"`. Strip any leading/trailing whitespace.
2. If `SPRINT_ID` is empty or contains non-numeric characters, stop:
   > "Please provide a numeric sprint ID — e.g. `/sprint-plan 12345`. You can find it in the Jira sprint URL."
3. Ensure `.claude/output/sprint-plan/` exists. Create it if not.
4. Tell the developer: "Building sprint plan for sprint $SPRINT_ID."

---

## Running Each Phase

For every Auto task:
1. Tell the developer: "Starting Phase X — <phase name>."
2. Read the agent file listed in the table.
3. Follow every instruction exactly, using `SPRINT_ID = $SPRINT_ID`.
4. When complete, move to the next task.

---

## Phase 1 — MCP Health Check

Read `.claude/skills/mcp-health-check/skill.md` and follow every instruction.

Only Atlassian MCP is required for sprint planning. Skip Figma. If Atlassian is unavailable, stop — sprint planning cannot proceed without Jira access.

---

## Phase 2 — Story Fetcher

Read `.claude/agents/fe-lead/phase-1-story-fetcher.md` and follow every instruction.

Output: `.claude/output/sprint-plan/.$SPRINT_ID-fetch-output.yml`

---

## Phase 3 — Lead Analysis

Read `.claude/agents/fe-lead/phase-2-lead-analysis.md` and follow every instruction.

Output: `.claude/output/sprint-plan/.$SPRINT_ID-analysis-output.yml`

---

## ✋ HUMAN GATE — Lead Review

After Lead Analysis completes, present the following to the developer and wait for a response before continuing:

```
✋ Lead Review — Sprint {SPRINT_ID} ({sprintName})

─── READINESS FLAGS ───────────────────────────
{N} stories ready | {N} need attention | {N} blocked

(List each needs-attention or blocked story with its readiness notes)

─── CAPACITY ──────────────────────────────────
Total estimated effort: {totalEstimatedHours}h
Team capacity: {teamTotalCapacityHours}h
Utilisation: {utilizationPercent}% — {capacityStatus}
{capacityNote}

─── CARRY-OVERS ───────────────────────────────
{carryOverNote or "No carry-over stories."}

─── ESTIMATION MISMATCHES ─────────────────────
{N} stories flagged (review the estimation document for details)

─── TEAM AVAILABILITY ─────────────────────────
Default capacity loaded from project-config.md:
{list each developer with capacityHours}

If any developer has reduced availability this sprint (PTO, part-time),
reply with adjustments — e.g.:
  "Developer 1 is out 2 days — reduce their capacity by 12 hours"
  "Developer 3 is not in this sprint"

Otherwise reply "proceed" to continue with default capacity.
```

Wait for the developer's response:
- `proceed` → continue with default team capacity from project-config.md
- Any capacity adjustment → update the team capacity values in context before continuing
- `abort` → stop the pipeline; temporary files are preserved for inspection

Do not continue to the Slot Assigner until the developer responds.

---

## Phase 5 — Slot Assigner

Read `.claude/agents/fe-lead/phase-3-slot-assigner.md` and follow every instruction.

If the developer adjusted team capacity at the Human Gate, pass those updated values as active context — they override project-config.md defaults for this run.

Output: `.claude/output/sprint-plan/.$SPRINT_ID-slots-output.yml`

---

## Phase 6 — Plan Publisher

Read `.claude/agents/fe-lead/phase-4-plan-publisher.md` and follow every instruction.

The agent publishes two Confluence pages, writes Jira comments, and updates Jira assignees.

---

## After Completion

Once Phase 6 completes, relay the publisher's final report exactly as formatted.
