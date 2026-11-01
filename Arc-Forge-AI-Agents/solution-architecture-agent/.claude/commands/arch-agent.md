---
description: Generate solution architecture documentation from one or more Confluence input sources (pages or folders). Interactively asks for input URLs and output folder, then creates an intake form, waits for review, and generates all 7 architecture documents with human review before each publish.
---

# /arch-agent

Generate complete solution architecture documentation for a product.

## Usage

```
/arch-agent
```

No arguments needed. The agent will ask you for everything it needs before starting.

Optionally, URLs can be passed directly to skip the prompts:

```
/arch-agent <url1> [url2] [url3] ... [--parent-id <confluence-folder-id>]
```

## Execution

### Step 0 — Collect inputs (if not provided as arguments)

If the user ran `/arch-agent` with no arguments, ask the following questions **before doing anything else**:

---

**Question 1:**
> "Please paste one or more Confluence URLs to use as input sources. These can be page URLs (`.../pages/<id>/...`) or folder URLs (`.../folder/<id>`). Paste one per line, or space-separated."

Wait for the user's response. Collect all URLs provided.

---

**Question 2:**
> "Where should the architecture pages be published? Please paste the Confluence folder URL or folder ID for the output."

Wait for the user's response.
- If they provide a URL, extract the folder ID from it (numeric segment after `/folder/`)
- If they provide a numeric ID directly, use it as-is

---

Once both answers are collected, confirm before proceeding:

> "Got it. I'll read from:
> - [list each input URL]
>
> And publish output to folder: [folder ID]
>
> Starting now..."

---

### Step 1 onwards — Run the orchestrator

Spawn the `arch-orchestrator` agent with:
- `input_urls`: the list of input URLs collected above (or from arguments)
- `output_parent_id`: the folder ID collected above (or from `--parent-id`)

The orchestrator handles all steps from ingestion through final publishing.

---

## Input URL types supported

| URL pattern | How it's handled |
|---|---|
| `.../wiki/spaces/SPACE/pages/<id>/...` | Reads the page + all child pages |
| `.../wiki/spaces/SPACE/folder/<id>` | Lists all pages in the folder, reads each one |

## What happens next (after inputs are collected)

1. **Reads** all input sources from Confluence
2. **Creates** a pre-filled intake form on Confluence for team review
3. **Waits** for you to complete the intake form and confirm
4. **Generates** 7 architecture documents in sequence with human review before each publish
5. **Publishes** approved pages to the specified Confluence folder
