---
name: Project Configuration
description: User-confirmed project configuration — feature branch prefix, git base branch, and Atlassian details
type: project
---

## Project Configuration

| Setting | Value |
|---|---|
| Developer Name | Adithya Susa |
| Atlassian Base URL | https://harleydavidson.atlassian.net |
| Confluence Space Key | TPSPhoenix |
| Feature Branch Prefix | feature/ |
| Branch Naming Convention | {prefix}{jira-ticket-id}-{short-description} |
| Git Base Branch | main |
| Feature Branch | |

## How to Apply

- **Developer Name** — used by the Planning Agent as the `Author` field in every implementation plan; sourced from Atlassian authentication at startup
- **Atlassian Base URL** — used by the GitHub PR Skill to generate the Jira issue link in PR bodies; sourced from Atlassian authentication at startup; null means the Jira line is omitted from PR bodies
- **Confluence Space Key** — used by the Knowledge Agent and Confluence Publish Skill as the `space` filter in CQL fallback searches; extracted automatically from the pasted Confluence URL; null means fallback searches are skipped (hierarchy traversal still works)
- **Feature Branch Prefix** — all feature branches must start with this prefix; used by the Git Branch Skill when creating branches for every task
- **Branch Naming Convention** — the full pattern for feature branch names
- **Git Base Branch** — used by the Git Branch Skill as the branch-from target when creating feature branches
- **Feature Branch** — the active feature branch for the current task; written by the Git Branch Skill after branch creation; read by the PR Agent and Unittest Agent. This field is overwritten each time the Git Branch Skill runs for a new task. Before using it, agents should verify it matches the current task's expected branch name. A stale value from a previous task indicates the Git Branch Skill has not yet run for the current task.