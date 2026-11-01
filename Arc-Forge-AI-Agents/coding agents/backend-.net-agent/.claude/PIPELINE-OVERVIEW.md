# Senior Backend Developer Agent — Pipeline Overview

## What it does
End-to-end Jira ticket implementation pipeline for a .NET 8 microservices codebase. Given a ticket, it gathers context, plans, codes, reviews, tests, and raises a PR — with two human approval gates (developer + tech lead) before any code is written.

---

## Entry Points

| Trigger | What changes vs default |
|---|---|
| Paste Jira URL | Standard pipeline |
| `/task PHNX-1234` | Same as URL paste |
| `/dev PHNX-1234 release/0.17.2` | Prefix → `bugfix/`, base branch → `release/0.17.2`, commit type → `fix(...)` |
| `/startup` | Re-runs environment setup only |
| `/task-resume PHNX-1234` | Skips completed stages; asks user where to re-enter |

---

## Full Pipeline Flow

```
╔══════════════════════════════════════════════════════════════════╗
║  USER  →  pastes Jira URL / /task / /dev                        ║
╚══════════════════════════════════════════════════════════════════╝
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  STARTUP GATE  (Orchestrator — once per project)                │
│                                                                 │
│  Read project_startup_status.md                                 │
│   ├─ missing or startupComplete:false → run Startup Agent       │
│   │     • find .sln / .csproj manifest                         │
│   │     • verify Tech Stack packages                           │
│   │     • verify directory structure (warning only, no block)  │
│   │     • authenticate Atlassian (Jira + Confluence)           │
│   │     • collect: Confluence URL → space key                  │
│   │     •          feature branch prefix (default feature/)    │
│   │     •          git base branch (default main)              │
│   │     • scan workspace for README.md → write repository-index│
│   │     • write project_startup_status.md + project_config.md  │
│   │     • [Notify]                                             │
│   └─ startupComplete:true → skip                               │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  ISSUE TYPE CHECK  (Orchestrator)                               │
│                                                                 │
│  /dev used?                                                     │
│   └─ yes → SessionBranchPrefix=bugfix/, SessionBaseBranch=<arg> │
│             pass BaseBranchOverride to Knowledge Agent          │
│  /dev not used → wait for Knowledge Agent IssueType result      │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  KNOWLEDGE AGENT                                                │
│                                                                 │
│  Phase 1 — Jira Traversal                                       │
│   • fetch ticket (getJiraIssue)                                 │
│   • if subtask → fetch parent story                             │
│   • read issuetype.name from STORY (not subtask)               │
│   • if Bug → search Confluence for {StoryTicketId}-RCA          │
│       ├─ found → extract RootCause + RecommendedFix             │
│       └─ not found → record gap, continue                       │
│   • fetch Epic                                                  │
│   • extract domain keywords                                     │
│                                                                 │
│  Phase 2 — Standards                                            │
│   • read DOTNET-RULES.md (always)                               │
│   • read api-standards.md / db-standards.md (if relevant)       │
│                                                                 │
│  Phase 3 — Confluence Hierarchy                                 │
│   • fetch Story Confluence page → AC, requirements              │
│   • fetch Epic Confluence page → links to FRD/HLD/LLD           │
│   • fetch FRD → business rules                                  │
│   • fetch HLD → component contracts, service deps               │
│   • fetch LLD → authoritative implementation spec               │
│                                                                 │
│  Phase 4 — Keyword fallback (only if Phase 3 insufficient)      │
│                                                                 │
│  Phase 5 — Codebase Analysis Agent (sub-delegation)            │
│   • pass: RelevantRepos, DomainKeywords                         │
│   • pass: GitBaseBranch (BaseBranchOverride if /dev, else config)│
│   │                                                             │
│   │  CODEBASE ANALYSIS AGENT                                    │
│   │   • git fetch + pull each relevant repo to latest           │
│   │   • Glob/Grep existing services, domain classes, patterns   │
│   │   • Read 1-3 representative files per repo for conventions  │
│   │   • scan tps-dms-shared per keyword:                        │
│   │       Fully Satisfies / Partially Satisfies / No Match      │
│   │   • return CodebaseFindings + SharedRepoScanResults +       │
│   │     codebaseRef (HEAD SHA)                                   │
│                                                                 │
│  Phase 6 — Synthesize                                           │
│   • compile full context package (Jira+Confluence+Codebase)     │
│   • emit IssueType field + Bug RCA block (if Bug)               │
│   • [Notify]                                                    │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  ISSUE TYPE CHECK  (Orchestrator — after Knowledge Agent)       │
│                                                                 │
│  IssueType == "Bug" AND no /dev override already active?        │
│   └─ yes → SessionBranchPrefix = bugfix/                        │
│             (BaseBranchOverride stays unset → PR targets main)  │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  PLANNING AGENT                                                 │
│                                                                 │
│  • verify repos exist in repository-index.md                    │
│  • targeted Glob/Grep on specific files from Knowledge output   │
│  • if Bug + RcaFound:true → use RecommendedFix as fix approach  │
│  • if Bug + RcaFound:false → note gap in Open Questions         │
│  • ask clarifying questions if AC is ambiguous (wait for reply) │
│  • generate full implementation plan:                           │
│       Bug Context (Bug tickets only)                            │
│       1.  Summary of Change                                     │
│       2.  Scope of Change (CREATE/MODIFY/DELETE/REUSE)          │
│       2.5 Shared Repo Changes (State A / B / C)                 │
│       3.  Layer Flow                                            │
│       4.  Endpoint Specifications                               │
│       5.  Data Contracts                                        │
│       6.  Data Model / Persistence                              │
│       7.  Logic Layer Specs                                     │
│       8.  Data Layer Specs                                      │
│       9.  Cache Strategy                                        │
│       10. Error Handling Plan                                   │
│       11. Migration Plan                                        │
│       12. Test Plan                                             │
│       13. Performance Considerations                            │
│       14. Standards Compliance Checklist                        │
│       15. Open Questions                                        │
│       16. Approval Sign-Off                                     │
│                                                                 │
│  ┌── GATE 1: Developer Review ─────────────────────────────┐   │
│  │  present plan → wait for "PlanApproved"                  │   │
│  │  anything else → refine + re-present (no limit)          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  • ask "Publish to Confluence?" → wait for "Yes"                │
│  • CONFLUENCE PUBLISH SKILL                                     │
│       resolve LLD parent page (by ID or CQL fallback)          │
│       createConfluencePage as child of LLD                      │
│       return PageUrl                                            │
│  • display PageUrl → share with lead                            │
│  • [Notify: plan published, awaiting lead]                      │
│                                                                 │
│  ┌── GATE 2: Lead Review ───────────────────────────────────┐   │
│  │  lead reviews Confluence page (offline / manual)          │   │
│  │  developer relays feedback                                │   │
│  │    ├─ feedback → refine plan → ask "Publish update?"      │   │
│  │    │   → Yes → updateConfluencePage → re-notify lead      │   │
│  │    └─ "LeadApproved" → plan Status:Approved               │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  • plan marked Status:Approved in conversation                  │
│  • [Notify: plan approved, coding begins]                       │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  CODING AGENT                                                   │
│                                                                 │
│  Gate 1 — approved plan exists in context                       │
│  Gate 2 — Orchestrator handoff explicitly names "Coding Agent"  │
│  Gate 3 — branch created in EVERY affected repo:                │
│                                                                 │
│    3a. identify all repos from Scope of Change sections 2.1-2.3 │
│        (+ tps-dms-shared if section 2.5 = State C)             │
│                                                                 │
│    3b. derive branch name:                                      │
│        BranchPrefix = BranchPrefixOverride ?? featureBranchPrefix│
│        → <BranchPrefix><TicketId>-<description>                 │
│                                                                 │
│    3c. per repo → GIT BRANCH SKILL (Create mode):              │
│          resolve BaseBranch = BaseBranchOverride ?? gitBaseBranch│
│          git checkout <BaseBranch> && git pull                  │
│          git checkout -b <BranchName> (or checkout if exists)   │
│          write featureBranch to project_config.md               │
│          return Status: Created | CheckedOut | Failed           │
│                                                                 │
│    3d. git branch --show-current in each repo                   │
│        must equal <BranchName> exactly — hard blocker if not    │
│                                                                 │
│  ┌─ SHARED REPO GATE (only if plan section 2.5 = State C) ───┐  │
│  │  SHARED REPO AGENT                                         │  │
│  │   Phase 1:                                                 │  │
│  │    • implement changes in tps-dms-shared                   │  │
│  │    • dotnet build                                          │  │
│  │    • bump patch version in changed sub-package .csproj     │  │
│  │    • dotnet build again                                    │  │
│  │    • draft PR → wait for "PRApproved"                      │  │
│  │    • GitHub PR Skill → raise PR, post PrUrl                │  │
│  │    • [Notify: Blocked — waiting for merge]                 │  │
│  │    • PAUSE → ask "Has shared PR merged + NuGet published?" │  │
│  │    • wait for "Yes" (indefinitely)                         │  │
│  │                                                            │  │
│  │   Phase 2 (after merge confirmed):                         │  │
│  │    • per dependent repo: edit Directory.Packages.props     │  │
│  │    • dotnet build per repo                                 │  │
│  │    • [Notify: Completed]                                   │  │
│  │    • return Status:Completed to Coding Agent               │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                 │
│  • read standards (DOTNET-RULES, api-standards, db-standards)   │
│  • Glob/Grep for specific files from plan                       │
│  • Read existing files before modifying                         │
│  • implement Scope of Change row by row                         │
│  • dotnet build (main repo) → fix errors                        │
│  • git add <explicit files>                                     │
│  • commit: fix(...) if bugfix/ prefix, feat(...) otherwise      │
│  • [Notify: Completed]                                          │
│  • output completion report (files created/modified, deviations)│
└─────────────────────────────────────────────────────────────────┘
                          │ (same turn — no user prompt)
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  CODE REVIEW AGENT                                              │
│                                                                 │
│  • read standards (DOTNET-RULES, api-standards, db-standards)   │
│  • read BaseBranch: BaseBranchOverride if passed else config    │
│  • Plan Compliance Check:                                       │
│      extract Plan Checksum from Section 2                       │
│      Glob + git diff origin/<BaseBranch>...HEAD → verify plan   │
│      unlisted changed files → Critical finding                  │
│  • Read each changed file                                       │
│  • Grep for risky patterns (.Result, raw SQL, Console.Write…)   │
│  • apply checklists: type safety, security, layer isolation,    │
│    error handling, code quality, C#-specific (async, nullable,  │
│    controller, service, repo, EF Core, validation)             │
│  • produce Review Report (in conversation only — not persisted) │
│  • [Notify]                                                     │
│                                                                 │
│  Decision: Go ──────────────────────────────────────────────┐  │
│  Decision: No-Go (Critical or Major findings)               │  │
└─────────────────────────────────────────────────────────────┘  │
          │ (same turn)                              │ (same turn) │
          ▼                                          ▼             │
┌─────────────────┐               ┌──────────────────────────┐    │
│  UNITTEST AGENT │               │  CODING AGENT rework     │    │
│                 │               │   • fix Critical first,  │    │
│  • read changed │               │     then Major           │    │
│    files + plan │               │   • only files in report │    │
│    Section 12   │               │   • dotnet build         │    │
│  • write tests: │               │   • commit fix(TicketId) │    │
│    happy path   │               │     (round N)            │    │
│    error cases  │               └──────────┬───────────────┘    │
│    auth cases   │                          │ (same turn)         │
│    cache        │               ┌──────────▼───────────────┐    │
│    edge cases   │               │  CODE REVIEW re-review   │◄───┘
│  • dotnet test  │               │  (max 2 consecutive      │
│  • coverage     │               │   No-Go rounds; then     │
│    thresholds   │               │   escalate to user)      │
│  • fix failures │               └──────────────────────────┘
│  • commit       │
│    test(TicketId│
│  • [Notify]     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  PR AGENT                                                       │
│                                                                 │
│  • read project_config.md: featureBranch, gitBaseBranch         │
│  • apply BaseBranchOverride if present (/dev run)               │
│  • draft PR:                                                    │
│      Title: <TicketId> <Title>                                  │
│      Body: Summary / Test Plan / Coverage / References (LLD+Jira│
│  • present draft → wait for "PRApproved"                        │
│  • anything else → refine + re-present (no limit)               │
│  • pre-flight:                                                  │
│      gh auth status                                             │
│      git remote get-url origin (must contain github.com)        │
│      git status --porcelain (no uncommitted tracked changes)     │
│  • GITHUB PR SKILL:                                             │
│      git push -u origin <BranchName>                            │
│      gh pr create --base <BaseBranch> …                         │
│      return PrUrl                                               │
│  • post PrUrl in conversation                                   │
│  • [Notify: PR raised]                                          │
└─────────────────────────────────────────────────────────────────┘
                          │
                        DONE
```

---

## Branching Decision Summary

```
Trigger            BranchPrefix        BaseBranch               CommitType
────────────────────────────────────────────────────────────────────────────
URL / /task        featureBranchPrefix  gitBaseBranch (config)   feat(...)
  + Bug detected   bugfix/              gitBaseBranch (config)   fix(...)
/dev <TB>          bugfix/              <BASE_BRANCH> (arg)      fix(...)
```

---

## Approval Gates Summary

| Gate | Agent | Keyword | Effect |
|---|---|---|---|
| Developer plan review | Planning | `PlanApproved` | Unlocks Confluence publish |
| Publish to Confluence | Planning | `Yes` | Creates/updates LLD child page |
| Lead plan review | Planning | `LeadApproved` | Marks plan Status:Approved; coding begins |
| Shared repo PR | Shared Repo | `PRApproved` | Raises GitHub PR on tps-dms-shared |
| Shared merge confirmation | Shared Repo | `Yes` | Unlocks Phase 2 NuGet bumps |
| PR draft review | PR Agent | `PRApproved` | Triggers pre-flight + push + gh pr create |

---

## Notification Touchpoints

Every agent calls the Notify Skill at its conclusion — desktop toast + phone push:

```
Startup Agent        → Completed / Blocked
Knowledge Agent      → Completed / Blocked
Planning Agent       → Completed (plan published, awaiting lead)
Planning Agent       → Completed (plan approved, coding begins)
Coding Agent         → Completed
Shared Repo Agent    → Blocked (waiting for merge)
Shared Repo Agent    → Completed (NuGet updated)
Code Review Agent    → Completed (Go) / Blocked (No-Go)
Unittest Agent       → Completed / Blocked
PR Agent             → Completed
```

---

## Memory Files Written

| File | Written by | Read by |
|---|---|---|
| `project_startup_status.md` | Startup Agent | Orchestrator (every session) |
| `project_config.md` | Startup Agent; Git Branch Skill (`featureBranch` field) | All agents |
| `.claude/repository-index.md` | Startup Agent | Knowledge, Coding, Planning, Code Review agents |