---
agent: github-pr-skill
attached_to: unittest-agent
---

# GitHub PR Skill

Pushes the feature branch to the remote and opens a pull request on GitHub using the `gh` CLI. Called by the Unit Test Agent after a green suite.

---

## Trigger Point

The Unit Test Agent MUST invoke this skill after all of the following are true:
- Test suite is fully green
- Test Quality Checklist passes
- Jira ticket has been transitioned to Done

---

## Input

| Parameter | Type | Required | Description |
|---|---|---|---|
| `BranchName` | string | Yes | The feature branch to push (e.g. `PROJ-123-add-order-endpoint`) |
| `BaseBranch` | string | Yes | Target branch for the PR — typically `main` or `develop` |
| `TicketId` | string | No | Jira ticket ID prepended to the PR title (e.g. `PROJ-123`) |
| `Title` | string | Yes | Short PR title ≤ 70 characters (e.g. `PROJ-123 Add order endpoint`) |
| `Summary` | string | Yes | 1–3 bullet points describing what the PR does — plain text, no markdown headers |
| `TestPlan` | string | Yes | Bulleted checklist of what was tested |
| `ConfluenceUrl` | string | No | Confluence LLD page URL — included in PR body if present |

---

## How to Invoke

### Step 1 — Push the branch

```bash
git push -u origin <BranchName>
```

### Step 2 — Create the PR

```bash
gh pr create \
  --title "<Title>" \
  --base "<BaseBranch>" \
  --body "$(cat <<'EOF'
## Summary
<Summary>

## Test plan
<TestPlan>

## References
<if ConfluenceUrl> LLD: <ConfluenceUrl> </if>

🤖 Generated with [Claude Code](https://claude.ai/claude-code)
EOF
)"
```

---

## Output

| Field | Description |
|---|---|
| `PrUrl` | The full GitHub PR URL returned by `gh pr create` |
| `Status` | `Created` \| `Failed` |
| `Error` | Populated only on `Failed` — the raw CLI error message |

Report `PrUrl` back to the Unit Test Agent in the conversation so the Orchestrator can surface it to the user.

---

## Error Handling

- If `git push` fails (e.g. no remote configured, auth error) → set `Status: Failed`, report `Error`. Do not attempt `gh pr create`. Notify the Orchestrator.
- If `gh pr create` fails → set `Status: Failed`, report `Error`. The branch is already pushed — do not re-push on retry.
- If a PR already exists for the branch, `gh pr create` will error. Report the existing PR URL from the error message instead.

---

## Required Tools

| Tool | Purpose |
|---|---|
| Bash | Run `git push` and `gh pr create` |
