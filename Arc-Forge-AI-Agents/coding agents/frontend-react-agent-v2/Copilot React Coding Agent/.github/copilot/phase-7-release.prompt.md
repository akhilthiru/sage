---
mode: 'agent'
tools: ['codebase', 'file', 'terminal', 'atlassian', 'githubRepo', 'bash', 'filesystem', 'gitkraken']
description: 'Phase 7 — Release readiness. Pushes the branch and creates GitHub PRs via gh CLI.'
---

**Role**: You are a React Senior Developer.

# Phase 7 — Release Readiness

Load `#file:.github/rules/project-config.md` before executing. Use the values defined there for: submodule repo name, Jira base URL, Confluence space key, and submodule path.

**Ticket ID**: ${input:ticketId:Jira ticket ID — e.g. PHNX-1234}

Read `.github/output/pipeline-state/${input:ticketId}-state.yml` before starting. Check:
- `submoduleFlag` — whether a submodule PR chain is required
- `submoduleMerged` — if `true`, skip Part A
- `branch` — parent feature branch name
- `baseBranch` — PR target branch
- `releaseBranch` — release branch (beta track only)
- `specPageId` — Confluence spec page ID (used to fetch spec content)
- `specPageUrl` — Confluence spec page URL (used in PR body and handover)
- `performanceWarnings` — warnings to include in PR

---

## Part A — Submodule PR

**Run Part A only if `submoduleFlag: true` AND `submoduleMerged: false`.**
If `submoduleFlag: false` or `submoduleMerged: true`, skip directly to Part B.

### Step A1: Verify the submodule branch is pushed

```bash
git -C src/shared log origin/{submoduleBranch}..HEAD --oneline
```

Should return empty. If not:
```bash
git -C src/shared push -u origin {submoduleBranch}
```

### Step A2: Create PR #1 — Submodule changes

```bash
gh pr create \
  --repo <submodule org/repo from project-config.md — Submodule → Submodule full repo path> \
  --base main \
  --head {submoduleBranch} \
  --title "${input:ticketId}: shared component changes for <spec summary>" \
  --body "Shared component changes for ${input:ticketId}. Parent feature: <spec summary>."
```

Record the PR URL in state as `submodulePrUrl`.

### Step A3: Trigger HUMAN GATE 3

```
✋ HUMAN GATE 3 — Submodule PR Ready

PR (<submodule repo name from project-config.md>): <submodulePrUrl>

This PR must be merged into main in the submodule repo (name from project-config.md) before the pipeline
can commit the submodule pointer update in the parent repo.

Steps:
  1. Request review for the submodule PR
  2. After it is merged, reply here

⚠️  abort will delete both branches and the state file automatically.
    Confluence spec page must be deleted manually (MCP does not support deletion).

Reply with:
  merged   → pipeline continues with pointer update
  abort    → pipeline ends immediately (both branches preserved, no further actions taken)
```

- `merged` → update state: `submoduleMerged: true`, continue to Part B
- `abort` → STOP IMMEDIATELY. Do not write any more code or files. Run cleanup in this order:

  ⚠️ **Cleanup scope — strict rules:**
  - Delete ONLY the single state file listed below. Do NOT delete the `.github/output/` directory or any other files in it.
  - Do NOT run `git clean`, `git reset --hard`, `Remove-Item` on a directory, or any command that affects files belonging to other tickets.

  **1. Delete the state file (single file only):**
  ```bash
  Remove-Item -Force ".github/output/pipeline-state/${input:ticketId}-state.yml"
  ```

  **2. Delete both branches (local + remote):**
  ```bash
  git checkout main
  ```
  ```bash
  git branch -D [feature branch from state file]
  ```
  ```bash
  git push origin --delete [feature branch from state file]
  ```
  ```bash
  git -C src/shared checkout main
  ```
  ```bash
  git -C src/shared branch -D [submodule branch from state file]
  ```
  ```bash
  git -C src/shared push origin --delete [submodule branch from state file]
  ```
  If any `push origin --delete` fails (branch was never pushed), skip it.

  **3. Confluence spec page:** Display:
  ```
  ⚠️ Confluence spec page cannot be deleted automatically (MCP does not support deletion).
  Please delete it manually: [specPageUrl]
  (Skip for bug tickets — no spec page was created.)
  ```

  **4. Display cleanup summary and end:**
  ```
  🧹 Abort cleanup complete

  ✅ State file deleted
  ✅ Branches deleted: [feature branch], [submodule branch]
  ⚠️  Confluence spec page: delete manually at [specPageUrl] (or N/A for bug tickets)

  Pipeline aborted. No further actions will be taken.
  ```

---

## Part B — Feature PR

### Step B1: Pull merged submodule hash and commit pointer (only if submoduleFlag: true)

```bash
git -C src/shared checkout main
git -C src/shared pull origin main
git add src/shared
git commit -m "chore(${input:ticketId}): update src/shared submodule pointer"
```

### Step B2: Create PR #2 — Submodule pointer update (only if submoduleFlag: true)

Create a PR in the parent repo:
- From: `{branch}` → To: `{baseBranch}`
- Title: `chore(${input:ticketId}): update src/shared submodule pointer`
- Body: `Updates the submodule pointer to include changes merged in {submodulePrUrl}. Merge after PR #1 is confirmed merged.`

Use `gh pr create`. If it fails, display the reason and continue:
```
⚠️ Submodule PR creation could not complete automatically
Reason: [exact error — e.g. "gh: not authenticated — run: gh auth login", "GitKraken MCP: sign-in required"]
Action needed: Create the PR manually at https://github.com/<GitHub organization from project-config.md>/<submodule repo name from project-config.md>/compare/main...{submoduleBranch}
Continuing to Step A3...
```

### Step B3: README staleness check

Open `README.md`. Check whether any of the following changed in this feature:
- A new npm script was added to `package.json`
- Core tech stack dependencies changed
- Pipeline phase list changed
- MCP server environment variables changed

If any apply, update the relevant section of `README.md` and commit:
```bash
git add README.md
git commit -m "docs(${input:ticketId}): update README to reflect changes in this feature"
```

### Step B4: Push the feature branch

```bash
git push -u origin {branch}
```

### Step B5: Create the feature PR

Read `specPageId` from the state file. Fetch the spec page from Confluence using `getConfluencePage(specPageId)` to extract: summary, acceptance criteria, feature flag name.
Read `performanceWarnings` from the state file.

Read `.github/pull_request_template.md` if it exists and use it as the PR body template.

Build the PR body:
```
## Description
<paste spec Summary + Acceptance Criteria>

## Type of change
- [ ] Bug fix
- [x] New feature (tick the correct one)
- [ ] Breaking change
- [ ] Documentation update

## Checklist
- [x] One logical change: focused PR
- [x] Clean code: ESLint passed via pre-commit hook
- [x] TypeScript: no `any` types (verified in Phase 3)
- [x] State management: correct level used (verified in Phase 4)
- [x] API interaction: loading and error states handled
- [x] Design system: uses global theme via `@ui-kit`
- [x] Unit/integration tests: written and passing at 80%+ coverage
- [ ] Screenshots added
- [ ] Responsive design: tested on different browsers
- [ ] Browser compatibility: Chrome, Safari
- [ ] Semantic HTML and keyboard navigation
- [ ] Screen readers: aria attributes added

## Notes for Reviewers
Spec / LLD: {specPageUrl}

{if submoduleFlag — add merge sequence warning}

{if performanceWarnings not empty — list each warning}
```

```bash
gh pr create \
  --base {baseBranch} \
  --head {branch} \
  --title "${input:ticketId}: <spec summary title>" \
  --body "<PR body from above>"
```

If `gh pr create` fails, display the reason and continue:
```
⚠️ PR creation could not complete automatically
Reason: [exact error — e.g. "gh: not authenticated — run: gh auth login", "GitKraken MCP: sign-in required"]
Action needed: Create the PR manually at https://github.com/<GitHub organization from project-config.md>/<GitHub repo from project-config.md>/compare/{baseBranch}...{branch}
Continuing to Step B6...
```

### Step B6: Update Jira ticket

Using the Atlassian MCP, add a comment to Jira ticket `${input:ticketId}`:
```
PR raised: <PR URL>
Spec (LLD): {specPageUrl}
```

Then use `getTransitionsForJiraIssue` to find the "In Review" transition ID and call `transitionJiraIssue` to move the ticket to In Review.

### Step B7: Final handover to developer

**⛔ MANDATORY FORMAT — NO EXCEPTIONS.**
You MUST present the handover using EXACTLY the template below — for EVERY ticket, whether feature or defect.
Do NOT generate a "Final Summary", a bullet list of deliverables, or any other format.
Do NOT skip the UI Testing Guide section — it is required for every single pipeline run.
Do NOT omit any section of the template. If a value is not in the spec/RCA, derive it from the codebase.

**Pre-work — extract all content before composing the output.**

Read `workflowType` from the state file to determine whether this is a feature or bug fix.

**If feature (`workflowType: feature` or `beta-feature`):**

Fetch the spec page using `getConfluencePage(specPageId)`. Read the **entire page** — not just the Acceptance Criteria section. Extract and hold in memory:

1. **Spec title** — the page title
2. **Feature flag name** — from the "Feature Flag" section (e.g. `myNewFeatureFlag`)
3. **Navigation path** — from the "Navigation" or "Tab Definition" section. Write it as a numbered sequence of clicks the developer must make in the running app:
   - e.g. `1. In the left sidebar, click "Customer" → 2. Click "Major Units" → 3. Click the "Owned Units" tab`
   - If not listed explicitly in the spec, derive it from the feature folder name and screen name:
     `src/features/customer-major-units/screens/major-units-owned-list` → sidebar "Customer" → "Major Units" → "Owned Units" tab
4. **Acceptance criteria** — every item from the "Acceptance Criteria" section without exception. Count them. If there are 8 ACs in the spec, 8 blocks must appear in the output.
5. **Additional test scenarios** — scan every section of the spec page for any of the following:
   - A "Test Scenarios", "Scenarios", "Business Scenarios", "User Flows", or "Test Cases" section distinct from the AC list
   - An AC that contains multiple explicit sub-scenarios or flow variants (e.g. AC says "User can filter records by date range, by status, and by dealer" — treat each filter type as its own scenario block)
   - Business rules or constraints called out anywhere in the spec (e.g. "maximum 10 attachments", "read-only for non-admin roles") — each distinct rule becomes a test scenario

   Collect all of these as an additional list, separate from the ACs. Each item generates a test block in the `TEST SCENARIOS` section of the output.

6. **For each AC (step 4) and each additional scenario (step 5)**, derive TWO sets of numbered test steps — a positive path and a negative path. Every item must have both; do not skip the negative path. Each step = one concrete action or one verification.

   - **The first step of every positive and negative path must be a Navigate step** — the exact click sequence from the app's left sidebar or landing page to reach the screen or dialog where the test begins. Do not assume the developer is already on the right screen. Example: `Navigate: Left sidebar → "Customer" → "Major Units" → "Owned Units" tab`
   - **Positive path** (4–9 steps including navigate): the happy path confirming the requirement is satisfied — real values, valid inputs, expected flow
   - **Negative path** (3–6 steps including navigate): inputs, states, or actions that must NOT succeed — confirm the correct error message, validation, or blocked behaviour. Derive negatives directly from the requirement wording:
     - Says "only when required fields are filled" → negative: submit with each required field empty
     - Says "duplicate entries are rejected" → negative: submit a value that already exists, verify error
     - Says "only authorised roles can access" → negative: test with a role that should be denied
     - Says "value must be within a range" → negative: enter values outside the range boundaries

   Example for AC "User can add a new major unit":
   ```
   Positive path:
     1. Navigate: Left sidebar → "Customer" → "Major Units" → "Owned Units" tab
     2. Click the "Add" button in the toolbar
     3. Fill in "Unit Number" with a valid value (e.g. "U-001")
     4. Select a "Unit Type" from the dropdown
     5. Click "Save"
     6. Verify a success toast appears: "Record saved successfully."
     7. Verify the new unit appears in the grid with the correct values

   Negative path:
     1. Navigate: Left sidebar → "Customer" → "Major Units" → "Owned Units" tab
     2. Click the "Add" button
     3. Leave "Unit Number" empty and click "Save"
     4. Verify an inline validation error appears on the "Unit Number" field: "Unit Number is required"
     5. Verify the record is NOT created and the form remains open
     6. Enter a unit number that already exists and click "Save"
     7. Verify an error is shown: "A unit with this number already exists"
   ```

**If bug fix (`workflowType: bugfix` or `beta-bugfix`):**

Fetch the RCA page using `getConfluencePage(rcaPageId)`. Extract:

1. **RCA title** — the page title
2. **Steps to reproduce** — the exact reproduction steps from the RCA
3. **Expected behaviour** — what the fix should now produce
4. **Affected screen / navigation path** — from the "Affected Component" or "Root Cause" section
5. **Negative scenarios** — derive 3–5 specific negative test cases from the RCA root cause and affected component. These go beyond the original repro steps and probe related boundary conditions. Examples:
   - If the bug was a null reference when no record is selected → negative: navigate to the screen with zero records, verify no crash and the empty-state UI is shown
   - If the bug was a calculation error on a specific value → negative: enter zero, a negative number, and the maximum allowed value; verify each is handled correctly
   - If the bug was a missing permission check → negative: log in as a lower-privilege role and verify the restricted action is blocked with the correct message
   - If the bug was data not saving → negative: close the form without saving and verify no partial data is persisted; also submit invalid data and verify the save is rejected

There is no feature flag step for bug fixes. The test guide for bugs has the developer reproduce the original broken scenario, confirm it is now fixed, and then run all negative scenarios.

---

**Compose the output. IMPORTANT: every field below must be filled in with actual content extracted above. Do NOT output any angle-bracket placeholders or template hint text — if a value was not found in the spec, make your best inference from the codebase context.**

Present:

```
✅ Pipeline complete — ${input:ticketId}: <spec/RCA title>

─────────────────────────────────────────────
LINKS
─────────────────────────────────────────────
  GitHub PR:  <PR URL>
  Confluence: {specPageUrl}
  Jira:       <Jira base URL from project-config.md>/browse/${input:ticketId}

{if submoduleFlag:}
  ⚠️  3-PR merge sequence — order matters:
      1. ✅ PR #1 already merged (<submodule repo name from project-config.md>)
      2. Merge PR #2 (submodule pointer update) first
      3. Merge PR #3 (feature) after PR #2 is merged

Read `phaseTiming` and `gateTiming` from the state file. Build the timing table:
- Show a phase row only if `phaseTiming.phaseX.startedAt` is not empty (i.e. the phase actually ran). This naturally handles both workflows: Phase 1 is omitted for defect tickets, Phase 2b is omitted when `submoduleFlag: false`.
- Only show gate rows where `gateTiming.gateX.triggered: true`
- Compute **Agent work time** = sum of all phase durationMinutes
- Compute **Gate wait time** = sum of all triggered gate durationMinutes
- Compute **Total elapsed** = Agent work time + Gate wait time

─────────────────────────────────────────────
PIPELINE TIMING
─────────────────────────────────────────────
  Phase 1  — Spec & Plan         : {phaseTiming.phase1.durationMinutes} min
  ⏸ Gate 1  — Spec Approval      : {gateTiming.gate1.durationMinutes} min   ← only if triggered
  Phase 2  — Implementation      : {phaseTiming.phase2.durationMinutes} min
  Phase 2b — Submodule           : {phaseTiming.phase2b.durationMinutes} min  ← only if run
  Phase 3  — Impact Analysis     : {phaseTiming.phase3.durationMinutes} min
  Phase 4  — Code Review         : {phaseTiming.phase4.durationMinutes} min
  Phase 4b — Performance         : {phaseTiming.phase4b.durationMinutes} min
  ⏸ Warnings Gate                : {gateTiming.gateWarnings.durationMinutes} min  ← only if triggered
  Phase 5  — Test Writer         : {phaseTiming.phase5.durationMinutes} min
  Phase 6  — Rebase Health       : {phaseTiming.phase6.durationMinutes} min
  ⏸ Gate 2  — Conflict Resolve   : {gateTiming.gate2.durationMinutes} min   ← only if triggered
  Phase 7  — Release Readiness   : {phaseTiming.phase7.durationMinutes} min
  ⏸ Gate 3  — Submodule PR Merge : {gateTiming.gate3.durationMinutes} min   ← only if triggered
  ─────────────────────────────────────────
  Agent work time  : {sum of phase rows} min  ({hours}h {remainder}m)
  Gate wait time   : {sum of gate rows} min   ({hours}h {remainder}m)
  Total elapsed    : {agent + gate total} min ({hours}h {remainder}m)
  Pipeline started : {startedAt from state file}
  Pipeline ended   : {current ISO timestamp}
```

**Feature workflow output:**
```
─────────────────────────────────────────────
UI TESTING GUIDE
─────────────────────────────────────────────
Before requesting reviewers, verify the feature manually in the browser.
Complete every step below — if the developer follows this guide, all UI testing is done.

Setup:
  1. git checkout {branch} && git pull && npm run dev
  2. Enable feature flag: <actual flag name from spec>
     Azure App Configuration → Features → find "<flag name>" → set to true

Navigation:
  <actual numbered navigation steps derived from spec — e.g.:
  1. In the left sidebar, click "Customer"
  2. Click "Major Units"
  3. Click the "Owned Units" tab — the list screen appears>

─────────────────────────────────────────────
ACCEPTANCE CRITERIA CHECKLIST
─────────────────────────────────────────────
Every AC from the spec appears below — do not skip any.
Each AC has a positive path (happy path) and a negative path (what must NOT work).
Complete both paths before marking an AC checked.

  [ ] AC 1: <exact AC text from spec>

      Positive path:
        1. Navigate: <exact click path from sidebar/landing to the starting screen, e.g. Left sidebar → "Finance" → "OTC" → "Deposits" tab>
        2. <first concrete action with real example values>
        3. <second concrete action>
        4. <further action if needed>
        5. Verify: <expected outcome — exact UI feedback, toast, state change>

      Negative path:
        1. Navigate: <same as above, or a different screen if this negative scenario starts elsewhere>
        2. <action with invalid, missing, or boundary input>
        3. <submit or trigger the action>
        4. Verify: <expected rejection — inline error, toast, blocked action, no state change>
        5. <additional negative scenario if applicable — with its own Navigate if screen differs>
        6. Verify: <expected error or blocked behaviour>

  [ ] AC 2: <exact AC text from spec>

      Positive path:
        1. Navigate: <exact click path>
        2. <first concrete action>
        3. Verify: <expected outcome>

      Negative path:
        1. Navigate: <exact click path>
        2. <invalid or boundary input>
        3. Verify: <expected error or rejection>

  (continue — one block per AC until ALL ACs from the spec are listed)

─────────────────────────────────────────────
TEST SCENARIOS
─────────────────────────────────────────────
Scenarios from the spec beyond the AC list — sub-flow variants, business rules, and
explicit "Test Scenarios" or "User Flows" sections. Omit this section only if the spec
defines no additional scenarios beyond the ACs above.

  [ ] Scenario 1: <scenario title from spec — e.g. "Filter by date range", "Read-only for Viewer role">

      Positive path:
        1. Navigate: <exact click path to the starting screen for this scenario>
        2. <concrete action covering this specific scenario>
        3. Verify: <expected outcome>

      Negative path:
        1. Navigate: <exact click path>
        2. <boundary or invalid input for this scenario>
        3. Verify: <expected error or blocked behaviour>

  [ ] Scenario 2: <next scenario title>

      Positive path:
        1. Navigate: <exact click path>
        2. <action>
        3. Verify: <outcome>

      Negative path:
        1. Navigate: <exact click path>
        2. <invalid input>
        3. Verify: <rejection behaviour>

  (one block per additional scenario — include ALL scenarios collected in pre-work step 5)

─────────────────────────────────────────────
EDGE CASES
─────────────────────────────────────────────
  [ ] Feature flag OFF — disable the flag and confirm the screen/component is hidden entirely
  [ ] Empty state — navigate to the screen with no existing data, verify the empty-state UI is shown
  [ ] Loading state — in DevTools Network tab, throttle to Slow 3G, verify skeleton/spinner appears
  [ ] Error state — in DevTools Network tab, block the API request, verify the error message is shown
  [ ] Form validation — submit with each required field missing one at a time; verify inline errors

Cross-browser:
  [ ] Chrome
  [ ] Safari (or Edge)

─────────────────────────────────────────────
AFTER TESTING
─────────────────────────────────────────────
  1. Add screenshots to the PR description
  2. Request reviewers on the PR(s)
```

**Bug fix workflow output:**
```
─────────────────────────────────────────────
UI TESTING GUIDE
─────────────────────────────────────────────
Before requesting reviewers, verify the fix manually in the browser.
Complete every step below — if the developer follows this guide, all UI testing is done.

Setup:
  1. git checkout {branch} && git pull && npm run dev

Navigation:
  <actual numbered navigation steps to reach the affected screen — e.g.:
  1. In the left sidebar, click "Finance"
  2. Click "OTC Transactions"
  3. Select an existing transaction to open the view screen>

─────────────────────────────────────────────
REPRODUCE & VERIFY FIX
─────────────────────────────────────────────
Follow the original bug scenario step by step — confirm the bug no longer occurs:

  <paste the exact numbered "Steps to Reproduce" from the RCA — each step as a concrete action>

  Expected result (after fix): <exact expected behaviour from RCA>

─────────────────────────────────────────────
NEGATIVE SCENARIOS
─────────────────────────────────────────────
Test boundary conditions and adjacent inputs to ensure the fix is robust and does not
introduce regressions. Each item must be tested and confirmed.

  [ ] Scenario 1: <specific negative scenario derived from RCA root cause>
      Steps:
        1. Navigate: <exact click path from sidebar/landing to reach the starting screen for this scenario>
        2. <concrete action with boundary or invalid input>
        3. Verify: <expected safe behaviour — no crash, correct message, correct state>

  [ ] Scenario 2: <second negative scenario>
      Steps:
        1. Navigate: <exact click path>
        2. <concrete action>
        3. Verify: <expected outcome>

  [ ] Scenario 3: <third negative scenario — e.g. zero records, empty state, maximum value>
      Steps:
        1. Navigate: <exact click path>
        2. <concrete action>
        3. Verify: <expected outcome>

  (include ALL negative scenarios derived from the RCA in pre-work step 5 above)

─────────────────────────────────────────────
REGRESSION CHECK
─────────────────────────────────────────────
Verify surrounding functionality was not broken by the fix:

  [ ] <adjacent screen or workflow that uses the same component or API endpoint>
      Navigate to it and confirm it still behaves correctly
  [ ] Error state — in DevTools Network tab, block the API request, verify error handling still works
  [ ] Empty state — navigate to the affected screen with no data, verify no crash and empty-state UI is shown
  [ ] Edge inputs — enter boundary values in the affected field(s), confirm no unexpected behaviour

Cross-browser:
  [ ] Chrome
  [ ] Safari (or Edge)

─────────────────────────────────────────────
AFTER TESTING
─────────────────────────────────────────────
  1. Add screenshots to the PR description
  2. Request reviewers on the PR(s)
```

### Step B8: Cleanup

Delete the state file:
```bash
Remove-Item ".github/output/pipeline-state/${input:ticketId}-state.yml"
```
