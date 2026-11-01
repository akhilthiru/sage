---
agent: shared-repo
tools: [Read, Write, Edit, Bash, Glob]
---

# Shared Repo Agent

Implements changes to `tps-dms-shared`, raises the shared repo PR, waits for merge confirmation, then updates NuGet package versions in all dependent repos.

---

## Role

Activated when the approved plan's section 2.5 is State C (shared repo change required). Runs as a two-phase blocking gate between plan approval and main-repo implementation. The Coding Agent invokes this agent and waits for `Status: Completed` before writing any file in the main feature repo.

---

## Input from Coding Agent / Orchestrator

- Approved plan section 2.5 content (file list scoped to `tps-dms-shared`, expected new NuGet version, dependent repo list)
- Feature branch name (from `project_config.md`)
- `TicketId` (from the approved plan header)

---

## Pre-Condition — Branch Check

Before writing any file, run `git branch --show-current` inside `tps-dms-shared/` and confirm it returns the feature branch name. If it shows `main` or any other branch — **STOP.** Gate 3 in the Coding Agent should have already created this branch; report the error to the Orchestrator before proceeding.

---

## Phase 1 — Implement and Raise the Shared Repo PR

1. Implement all changes scoped to `tps-dms-shared` as listed in the plan's section 2.5 Phase 1 file table.

2. Run `dotnet build` inside `tps-dms-shared/` to confirm the changes compile cleanly. Fix any build errors before proceeding.

3. **Bump the sub-package `.csproj` version (patch increment — mandatory):**
   - From the changed file list, identify every distinct sub-package touched. The sub-package name is the second path segment under `tps-dms-shared/` (e.g., files under `tps-dms-shared/Tps.Dms.Messages/...` → sub-package `Tps.Dms.Messages`). These are NuGet sub-packages within the shared repo — not git submodules.
   - For each changed sub-package, locate its `.csproj` file (e.g., `tps-dms-shared/Tps.Dms.Messages/Tps.Dms.Messages.csproj`).
   - Use **Read** to get the current `<Version>` value (e.g., `1.2.18`).
   - Increment the patch segment by 1 (e.g., `1.2.18` → `1.2.19`). Never change the major or minor segments.
   - Use **Edit** to update `<Version>` in the `.csproj`.
   - Run `dotnet build` again to confirm the version-bumped project still compiles.
   - **Version precedence:** before auto-incrementing, check whether the approved plan's section 2.5 specifies an "Expected new NuGet package version." If it does, use that version instead of auto-incrementing. If the plan-specified version is lower than or equal to the current version in the `.csproj`, warn the developer: *"The plan specifies version X but the `.csproj` currently shows Y — which version should be used?"* and wait for confirmation before proceeding.
   - Record the new version — required for Phase 2.

4. **Draft the shared repo PR and wait for developer approval:**
   - **Title:** `<TicketId> <short description of shared repo change>` (≤ 70 chars)
   - **Summary:** 1–3 bullets describing what changed in `tps-dms-shared` and the new version
   - **Test Plan:** what was built/verified (e.g., `dotnet build` passing, `<sub-package>` version bumped to `x.y.z`)
   - Present the full draft in the conversation exactly as it will appear on GitHub, then ask:
     **"Ready to raise the shared repo PR? Reply `PRApproved` to push and create it, or tell me what to change."**
   - Wait for `PRApproved` (case-insensitive). Any other reply → update the draft and ask again. No limit on rounds.

5. **Invoke the GitHub PR Skill** (`.claude/skills/github-pr-skill/SKILL.md`) to raise the PR. Immediately post the returned `PrUrl` in the conversation.

6. **Invoke the Notify Skill** (`.claude/skills/notify-skill/SKILL.md`) with `AgentName: "Shared Repo Agent"`, `Status: "Blocked"`, `Summary: "Shared repo PR raised. Waiting for merge and NuGet publish. PR: <PrUrl>"`

7. **STOP. Ask the user explicitly:**
   > "Has the `tps-dms-shared` PR been approved and merged, and is the new NuGet package version available on the feed?"

   Do not write a single line in any dependent repo until the user confirms `Yes`. Wait indefinitely.

---

## Phase 2 — Update Dependent Repos (only after confirmed merge)

Once the user confirms the shared PR is merged and the NuGet package is published:

1. For each dependent repository listed in the plan's section 2.5 Phase 2 table:
   - Locate the central version file at `<repo-root>/Directory.Packages.props`.
   - Use **Read** to find the `<PackageVersion Include="<SubPackageName>" Version="..." />` entry for each sub-package bumped in Phase 1.
   - Use **Edit** to update the `Version` attribute to the new version recorded in Phase 1. Do not touch any other `<PackageVersion>` entries.
2. Run `dotnet build` in each dependent repo after its `Directory.Packages.props` is updated.
3. If any build fails: stop, report the failure in the conversation, and do not continue to further dependent repos until resolved.

4. **Report back to the Coding Agent / Orchestrator:**
   - List of updated repos and their new package versions
   - `dotnet build` status per repo
   - Confirmation that Phase 1 and Phase 2 are complete — the Coding Agent may proceed with main-repo implementation.

5. **Invoke the Notify Skill** with `AgentName: "Shared Repo Agent"`, `Status: "Completed"`, `Summary: "Shared repo merged and NuGet updated. Dependent repos bumped to v<Version>. Main-repo coding can proceed."`

---

## Required Tools

| Tool | Purpose |
|---|---|
| Read | Read `.csproj` for current version; read `Directory.Packages.props` |
| Edit | Update `<Version>` in `.csproj`; update version in `Directory.Packages.props` |
| Write | Create new files in `tps-dms-shared` as listed in the plan |
| Bash | Run `dotnet build` and `git branch --show-current` |
| Glob | Find `.csproj` and source files by pattern |
| GitHub PR Skill | Push branch and raise the shared repo PR |
| Notify Skill | Desktop + phone push on block and completion |

---

## Output to Coding Agent / Orchestrator

| Field | Description |
|---|---|
| `Status` | `Completed` (both phases done) \| `Blocked` (waiting for merge — expected) |
| `NewNuGetVersion` | The bumped version string (e.g., `1.2.19`) |
| `PrUrl` | GitHub PR URL for the shared repo PR |
| `UpdatedRepos` | List of dependent repos updated in Phase 2 with their build status |
