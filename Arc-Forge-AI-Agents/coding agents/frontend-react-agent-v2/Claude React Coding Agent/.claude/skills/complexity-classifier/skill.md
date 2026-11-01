# Skill: Complexity Classifier

Analyses Jira ticket data (and RCA content for bug tickets) to assign a complexity tier, choose a spec mode, and identify which pipeline phases to skip or run in lightweight mode. Writes results to the pipeline state file.

Called by the orchestrator immediately after the state file is created (features) or after Defect Owner Analysis (bugs). Can also be invoked standalone.

---

## Instructions

### Step 1: Gather data already in context

Do NOT make new MCP calls to re-fetch the Jira ticket or RCA — both are already in context. Use:

- **Jira ticket**: `summary`, `description` text (extracted from ADF), `labels[]`, story points (`customfield_10016`), `issueType`, `fields.comment.comments[]`
- **RCA** (bug tickets only): full page text already fetched and held in context

---

### Step 2: Evaluate complexity signals

Apply signals in order. Use the **conservative rule** — when signals are ambiguous or mixed, always round up to the next tier.

#### Tier 0 — `text-only`

**All of the following must hold:**

- Keyword match (case-insensitive) in summary or description: `text`, `label`, `copy`, `translation`, `typo`, `i18n`, `wording`, `rename label`, `update copy`, `update text`, `update label`, `string constant`
- OR Jira label matches any of: `text-change`, `i18n`, `l10n`
- AND no tier-2 blockers present (see below)
- For bug tickets: RCA mentions only locale files (`.json`) or string constants — no `.tsx`/`.ts` component logic, no API endpoints, no store changes

#### Tier 1 — `ui-minor`

**All of the following must hold:**

- Keyword match in summary or description: `button`, `style`, `css`, `spacing`, `layout`, `alignment`, `icon`, `color`, `minor`, `visual`, `display`, `show`, `hide`, `tooltip`, `placeholder`
- Story points ≤ 3 (if set; if unset, cannot use story points alone to classify as ui-minor)
- For bug tickets: RCA mentions only 1–2 component files (`.tsx`/`.ts`), no service, API, or store changes
- AND no tier-2 blockers present (see below)

#### Tier-2 blockers — presence of any of these floors the tier at `standard`

Regardless of other signals, assign tier 2 if:

- API endpoint URLs or HTTP method references (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`) appear in description or RCA
- Service file references appear: `.service.ts`, `tps-dms-accounting`, `tps-dms-sale-integration`, `tps-dms-parts-*`
- State store references appear: `createStore`, `useGlobalStore`, `useFeatureStore`, `Zustand`, `useSignalR`
- TanStack Query references appear: `useQuery`, `useMutation`, `queryKey`, `queryClient`, `invalidateQueries`
- 3 or more distinct component files are mentioned in the RCA
- Story points ≥ 5

#### Tier 3 — `complex` (upgrade from standard)

Upgrade from standard when any of:

- Story points ≥ 8
- Jira label matches: `complex` or `large`
- Scope explicitly requires simultaneous changes in API layer + state store + UI components + submodule

#### Default

If tier 0 and tier 1 conditions are not met and no complex signals exist → assign **tier 2 (`standard`)**.

---

### Step 3: Determine outputs per tier

| Tier | Name | `specMode` | `hldGateMode` | Phases to skip | Phases to lighten |
|------|------|------------|----------------|---------------|-------------------|
| 0 | `text-only` | `lite-text` | `skip` | `performance-review`, `test-writer` | `impact-analysis` (locale check only), `code-review` (i18n rules only) |
| 1 | `ui-minor` | `lite-ui` | `skip` | `performance-review` | `impact-analysis` (tsc + locale, no regression run), `test-writer` (update existing tests only) |
| 2 | `standard` | `full` | `required` | — | — |
| 3 | `complex` | `full` | `required` | — | — |

**Spec mode descriptions for transparency block:**

- `lite-text` — Summary + change table + locale keys only; no architecture, API, or performance sections
- `lite-ui` — Summary + component scope + Figma reference + acceptance criteria; no API or state sections
- `full` — Complete spec with all sections

---

### Step 4: Display transparency block and wait briefly

Display exactly:

```
📊 Complexity Assessment — {TICKET_ID}
   Tier:             {tier number} — {tier name}
   Reason:           {one sentence: which signals triggered this tier}

   Spec mode:        {specMode} — {spec mode description}
   Phases skipped:   {comma-separated list, or "none"}
   Phases lightened: {comma-separated list with one-line note each, or "none"}
   Always runs:      Implementation · Code Review · Rebase Health · Release Readiness

   Override: Reply "tier 0", "tier 1", "tier 2", "tier 3", or "full pipeline" to change.
   Continuing in 10 seconds if no reply...
```

Wait up to 10 seconds. If the developer replies with an override before the pipeline continues:
- Recalculate `specMode`, `hldGateMode`, `skipPhases`, and `lightweightPhases` for the new tier
- Set `tierOverride: true` in the state file
- Confirm: "Tier updated to {new tier name}. Continuing."

If no reply within 10 seconds, continue immediately.

---

### Step 5: Write complexity fields to the state file

Update the existing state file (do not recreate it). Add these fields:

```yaml
complexityTier: "{text-only | ui-minor | standard | complex}"
complexityReason: "{one-sentence justification — which signal matched}"
specMode: "{lite-text | lite-ui | full}"
hldGateMode: "{skip | required}"
skipPhases:
  - performance-review    # tier 0 and tier 1
  - test-writer           # tier 0 only
lightweightPhases:
  - impact-analysis       # tier 0: locale check only; tier 1: tsc + locale, no regression run
  - code-review           # tier 0 only: i18n key rules only
  - test-writer           # tier 1 only: update existing tests, no 80% target
tierOverride: false
```

For tiers 2 and 3: `skipPhases: []` and `lightweightPhases: []`.

Update `lastUpdatedAt` to the current ISO timestamp.
