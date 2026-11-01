# Claude Bundle — How to Use

This bundle contains the assets used in the HF&C project for the Claude-led design workflow.

---

## What's inside

| File | What it is |
|---|---|
| `product-design-architect-skill.md` | The custom skill used to put Claude into a product design mindset. Built using the skill-creator (not a pre-installed plugin) and refined across use cases. |
| `README.md` | This file. |

---

## How to use the skill

The skill is **portable** — it works as a system prompt across Claude, ChatGPT, Gemini, or any capable LLM. There are two ways to use it.

### Option 1 — Use directly (recommended for first-timers)

1. Open `product-design-architect-skill.md`.
2. Copy the entire contents.
3. Paste it as the **system prompt** (or the first message) in a new Claude chat.
4. Begin your design conversation — the skill takes over and runs its workflow.

### Option 2 — Load as a skill in Claude desktop

1. Open Claude desktop → invoke the **skill-creator**.
2. Create a new skill and paste the contents of `product-design-architect-skill.md` into the SKILL.md.
3. Save — the skill becomes callable from `/` in any chat.
4. Start a new chat and type `/product-design-architect` to invoke it.

> **Note:** This skill was built using the skill-creator and updated over time as new use cases came up. Feel free to edit it for your project.

---

## How to connect Atlassian (Confluence / Jira)

This is what lets Claude read your PRD directly from Confluence — no copy-paste.

1. Open Claude desktop → **Settings → Connectors**.
2. Find **Atlassian** in the list → click **Connect**.
3. Sign in via OAuth and authorise access to your workspace.
4. Once connected, you'll see Atlassian listed as a connected MCP.

**To use it inside a chat:** paste any Confluence page URL — Claude reads the page through the MCP. No download or copy-paste needed.

> The same OAuth flow applies to other connectors like Figma. Authenticate once per tool.

---

## How to connect Figma (for tokens / journey / FigJam work)

1. Open Claude desktop → **Settings → Connectors**.
2. Find **Figma** → click **Connect** → authorise via Figma OAuth.
3. Grant access to the relevant Figma team or files.

Once connected, Claude can create tokens, components, or user-journey diagrams directly in Figma + FigJam.

---

## How to give the prompt

Use this sequence after invoking the skill (Option 1 or 2 above):

1. **Give product context first.** A short paragraph: what the product is, who uses it, the domain.
2. **Share the PRD URL.** Paste the Confluence link — Claude pulls it via the Atlassian MCP.
3. **State the intent.** One sentence on what you want — e.g., "Build a modern futuristic enterprise AI-powered UI, all flows covered, without losing user experience."
4. **Send reference screenshots** if you have a specific visual style in mind.
5. **Iterate with micro-feedback.** Plain natural language is enough — "label not visible," "move export to toolbar," "icons look inconsistent."

---

## Use cases this workflow covers well

- HTML/code-based UI prototypes (single-file, interactive)
- Design audits against modern design benchmarks
- User journey + task flow generation in Figma and FigJam
- Design token generation in Figma

## What it doesn't do well

- Figma component and variant structure — output is messy; rebuild manually.
- Visual UI directly in Figma — struggles with Auto Layout and responsiveness.

---

## Tips

- Authentication is one-time per tool. Reuse the same identity across Claude and Figma Make.
- If you stop and resume later, ask the skill to output project context as markdown — save it, paste back next time.
- For audits, ask Claude to act as critic against current enterprise design standards, then feed the findings back to refine.
