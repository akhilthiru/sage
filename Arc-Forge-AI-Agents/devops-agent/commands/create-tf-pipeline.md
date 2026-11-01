---
description: Create or update the GitHub Actions Terraform pipeline. On first run, generates the pipeline from architecture documents. On subsequent runs, updates it from changed architecture docs or applies specific DevOps team change requests. Remembers document sources between sessions.
---

You are orchestrating **tf-pipeline-agent**. Follow these steps precisely.

---

## Step 1 — Load stored inputs

Read `C:\Users\vishnu.mohan\.claude\projects\d--SourceCode-scm-rm-iac\memory\tf_pipeline_inputs.md`.

If it exists, extract:
- `deployment_type` — `confluence` or `pdf`
- `deployment_value` — the stored URL or file path
- `security_type` — `confluence` or `pdf`
- `security_value` — the stored URL or file path

If the file does not exist, all four fields are unset.

---

## Step 2 — Determine intent and confirm document sources

### Check if the pipeline file already exists

Use `Glob` to check for `.github/workflows/terraform.yml`.

### Ask intent + document sources in one call

Use `AskUserQuestion` with up to three questions in a single call:

**Question 1** — header: "Action"
- Question: "What would you like to do?"
- Option 1 label: "Regenerate from docs" — description: "Re-read the architecture documents and update the pipeline to reflect any changes."
- Option 2 label: "Apply change request" — description: "Apply a specific change requested by the DevOps team (e.g. add a new stage, rotate secrets, add an environment)."
- Option 3 label: "First-time generate" — description: "Generate the pipeline for the first time from architecture documents." *(only show this option if the pipeline file does not yet exist)*

**Question 2** — header: "Deployment" *(only if `deployment_value` is already stored)*
- Question: "Deployment Architecture source — use stored value or update?"
- Option 1 label: "Use stored" — description: show the stored `deployment_type` and `deployment_value`
- Option 2 label: "Update" — description: "Provide a new source"

**Question 3** — header: "Security" *(only if `security_value` is already stored)*
- Question: "Security Architecture source — use stored value or update?"
- Option 1 label: "Use stored" — description: show the stored `security_type` and `security_value`
- Option 2 label: "Update" — description: "Provide a new source"

For any document source answer of "Update", collect that input in Step 3.
If no document sources are stored yet, skip Questions 2 & 3 and go straight to Step 3.

### If intent is "Apply change request"

After this `AskUserQuestion` call, ask a follow-up (free-text via "Other"):
- Question: "Describe the change(s) the DevOps team wants applied to the pipeline."
- Header: "Change request"
- Options: "Enter description" (prompt for Other), "Minor tweak", "New environment", "New stage"

Capture the free-text as `changes_requested`.

---

## Step 3 — Collect inputs that are missing or being updated

For each input to collect, ask two questions in sequence:

**First question** — source type (header: "Source type"):
- "How is the [Deployment / Security] Architecture document provided?"
- Option 1: "Confluence URL" — description: "Fetch from Confluence. Uses Atlassian MCP (OAuth) if connected, otherwise requires CONFLUENCE_USER and CONFLUENCE_TOKEN env vars."
- Option 2: "PDF file" — description: "Path to a local PDF file (Read tool parses PDFs natively — no extra dependencies)."

**Second question** — the value (free-text via "Other"):
- For Confluence: "Paste the Confluence page URL"
- For PDF: "Enter the PDF file path"

---

## Step 4 — Save inputs to memory

Write the following to `C:\Users\vishnu.mohan\.claude\projects\d--SourceCode-scm-rm-iac\memory\tf_pipeline_inputs.md`, replacing any existing content:

```
---
name: tf-pipeline-agent document sources
description: Deployment and Security Architecture document sources used by /tf-pipeline
type: project
---

deployment_type: <deployment_type>
deployment_value: <deployment_value>
security_type: <security_type>
security_value: <security_value>
last_used: <today's date YYYY-MM-DD>
```

---

## Step 5 — Spawn tf-pipeline-agent

### Confluence credential check

If either source is `confluence`, verify that the Atlassian MCP connector is active by checking that `mcp__claude_ai_Atlassian__getConfluencePage` is available in the tool list. If it is not connected, warn the user before proceeding:
> The Atlassian MCP connector is required for Confluence access. Run `/mcp` and authenticate with **claude.ai Atlassian**, then retry.

### Launch the agent

Use the `Agent` tool to launch `tf-pipeline-agent` with the following prompt:

```
deployment_source: <deployment_type>
deployment_value: <deployment_value>
security_source: <security_type>
security_value: <security_value>
changes_requested: <changes_requested or omit if not set>
```

Wait for the agent to complete, then relay its result to the user:

- **On success:** show the PR URL and a one-line summary of what the agent did (created / updated from architecture / applied change request).
- **On missing sections:** show the user exactly which sections are absent from which document and ask them to update the source document before retrying.
- **On any other error:** show the agent's error output and suggest checking the environment variables or document sources.
