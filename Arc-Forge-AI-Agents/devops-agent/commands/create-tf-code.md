---
description: Generate or update Terraform infrastructure code from architecture documents. On first run in an empty workspace, generates the full canonical structure. On subsequent runs (when .tf files exist), runs drift detection against the source of truth and only applies changes after explicit user approval. Remembers the project name and document sources between sessions.
---

You are orchestrating **tf-coding-agent**. Follow these steps precisely.

---

## Step 1 — Load stored inputs

Read `C:\Users\ashwin.manikandan\.claude\projects\c--Users-ashwin-manikandan-Project-Files-HF-C-HF-C-Infra\memory\tf_coding_inputs.md`.

If it exists, extract:
- `project_name` — the project / application name
- `infra_arch_type` — `confluence`, `pdf`, or `yaml_json`
- `infra_arch_value` — the stored URL or file path
- `security_arch_type` — `confluence`, `pdf`, or `yaml_json`
- `security_arch_value` — the stored URL or file path

If the file does not exist, all fields are unset.

---

## Step 2 — Inspect the workspace

Use `Glob` to check whether any `.tf` files exist under `infra/` (or any `*.tf` anywhere in the working tree if `infra/` is absent).

| Workspace state | Default mode |
|---|---|
| No `.tf` files anywhere | **First-time generate** |
| `.tf` files exist | **Drift check** (do not modify code without approval) |

This default is offered as a preselection in Step 3 — the user can override it.

---

## Step 3 — Determine intent and confirm document sources

Use `AskUserQuestion` with up to four questions in a single call:

**Question 1** — header: "Action"
- Question: "What would you like to do?"
- Option 1 label: "First-time generate" — description: "Generate the full canonical Terraform structure from architecture documents." *(only show if no `.tf` files exist)*
- Option 2 label: "Drift check" — description: "Compare the existing code against the source of truth and report drift before applying any changes." *(only show if `.tf` files exist)*
- Option 3 label: "Apply change request" — description: "Apply a specific change requested by the infra team (e.g. add a resource, resize an instance, change tagging)." *(only show if `.tf` files exist)*

**Question 2** — header: "Project" *(only if `project_name` is already stored)*
- Question: "Project name — use stored value or update?"
- Option 1 label: "Use stored" — description: show the stored `project_name`
- Option 2 label: "Update" — description: "Provide a new project name"

**Question 3** — header: "Infrastructure" *(only if `infra_arch_value` is already stored)*
- Question: "Infrastructure Architecture source — use stored value or update?"
- Option 1 label: "Use stored" — description: show the stored `infra_arch_type` and `infra_arch_value`
- Option 2 label: "Update" — description: "Provide a new source"

**Question 4** — header: "Security" *(only if `security_arch_value` is already stored)*
- Question: "Security Architecture source — use stored value or update?"
- Option 1 label: "Use stored" — description: show the stored `security_arch_type` and `security_arch_value`
- Option 2 label: "Update" — description: "Provide a new source"

For any answer of "Update" (or if a value was never stored), collect that input in Step 4.

### If intent is "Apply change request"

After this `AskUserQuestion` call, ask a follow-up (free-text via "Other"):
- Question: "Describe the change(s) the infra team wants applied to the Terraform code."
- Header: "Change request"
- Options: "Enter description" (prompt for Other), "Add resource", "Resize / reconfigure", "Update tagging or naming"

Capture the free-text as `changes_requested`.

---

## Step 4 — Collect inputs that are missing or being updated

### 4a — Project name (free-text via "Other")

If `project_name` is not stored or the user chose "Update":
- Question: "Enter the project name (used to scope Confluence reads and naming conventions)"
- Header: "Project name"
- Options: "Enter name" (prompt for Other)

### 4b — Document sources

For each of Infrastructure Architecture and Security Architecture that needs collecting, ask two questions in sequence:

**First question** — source type (header: "Source type"):
- "How is the [Infrastructure / Security] Architecture document provided?"
- Option 1: "Confluence URL" — description: "Fetch from Confluence. Uses Atlassian MCP (OAuth) if connected, otherwise requires CONFLUENCE_USER and CONFLUENCE_TOKEN env vars."
- Option 2: "PDF file" — description: "Path to a local PDF file (Read tool parses PDFs natively)."
- Option 3: "YAML / JSON file" — description: "Path to a local YAML or JSON file already in canonical structure (`resource_inventory`, `cloud_platform_standards`, `environment_config`)."

**Second question** — the value (free-text via "Other"):
- For Confluence: "Paste the Confluence page URL"
- For PDF: "Enter the PDF file path"
- For YAML / JSON: "Enter the YAML or JSON file path"

---

## Step 5 — Save inputs to memory

Write the following to `C:\Users\ashwin.manikandan\.claude\projects\c--Users-ashwin-manikandan-Project-Files-HF-C-HF-C-Infra\memory\tf_coding_inputs.md`, replacing any existing content:

```
---
name: tf-coding-agent inputs
description: Project name and architecture document sources used by /create-tf-code
type: project
---

project_name: <project_name>
infra_arch_type: <infra_arch_type>
infra_arch_value: <infra_arch_value>
security_arch_type: <security_arch_type>
security_arch_value: <security_arch_value>
last_used: <today's date YYYY-MM-DD>
```

Then add (or update) a single line in `C:\Users\ashwin.manikandan\.claude\projects\c--Users-ashwin-manikandan-Project-Files-HF-C-HF-C-Infra\memory\MEMORY.md`:

`- [tf-coding-agent inputs](tf_coding_inputs.md) — project name and architecture document sources used by /create-tf-code`

Skip the MEMORY.md update if an identical line already exists.

---

## Step 6 — Spawn tf-coding-agent

### Confluence credential check

If either source is `confluence`, verify that the Atlassian MCP connector is active by checking that `mcp__claude_ai_Atlassian__getConfluencePage` is available in the tool list. If it is not connected, warn the user before proceeding:
> The Atlassian MCP connector is required for Confluence access. Run `/mcp` and authenticate with **claude.ai Atlassian**, then retry.

### Launch the agent

Use the `Agent` tool with `subagent_type: "tf-coding-agent"` and the following prompt:

```
project_name: <project_name>
infra_arch_source: <infra_arch_type>
infra_arch_value: <infra_arch_value>
security_arch_source: <security_arch_type>
security_arch_value: <security_arch_value>
intent: <first-time-generate | drift-check | change-request>
changes_requested: <changes_requested or omit if not set>

Workspace state at invocation:
  has_existing_tf_files: <true | false>
  scanned_path: <infra/ or working tree root>

Follow the Invocation Behavior in your spec exactly:
  - Empty workspace → generate the full canonical structure.
  - Non-empty workspace → produce a DRIFT REPORT and STOP. Do not modify any
    files until the user explicitly approves the changes via the orchestrator.

Enforce all naming, tagging, sizing, and module-mapping rules from your spec.
Regenerate README.md at every level and iam-policy.json on any change.
```

Wait for the agent to complete, then relay its result to the user:

- **On first-time generate success:** show the canonical structure created, the plan preview, and (if applicable) the PR URL and branch name.
- **On drift check:** show the DRIFT REPORT verbatim and ask: *"Apply these changes?"* If the user approves, re-invoke the agent with `intent: change-request` and `changes_requested: "Apply the drift report from the previous run"` so it applies the changes.
- **On change request success:** show what was modified and the PR URL.
- **On clarification needed:** the agent may ask for sizing, tags, naming variables, or environment values. Surface those questions to the user, collect answers, and re-invoke the agent with the new context.
- **On validation failure:** show the `terraform fmt` / `terraform validate` errors and the agent's correction attempt.
- **On any other error:** show the agent's error output and suggest checking the document sources or environment variables.

### Validation before delivery (orchestrator responsibility)

Before declaring the task complete, run the AGENT.md validation checklist against any code the agent wrote:

- [ ] Naming follows `<app>-<resource>-<env>` pattern
- [ ] All mandatory tags present (`Owner`, `Environment`, `CostCenter`)
- [ ] No hardcoded secrets
- [ ] Sizing extracted from input, not assumed
- [ ] `README.md` updated at every level (root, `network/`, `application/`, `modules/`, each module)
- [ ] `iam-policy.json` regenerated with current resource permissions
- [ ] Network/Application directory separation enforced
- [ ] Confluence reads scoped to permitted documents only

If any item fails, send the agent back with the specific gap before reporting success.
