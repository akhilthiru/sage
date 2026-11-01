# Figma Make Bundle — How to Use

This bundle contains the assets used in the HF&C project for the Figma Make–led design workflow.

---

## What's inside

| File | What it is |
|---|---|
| `product-overview-ARSR.md` | A short product description with a generic project name (ARSR). Used as product context so Figma Make understands the domain, users, and platform without exposing client-specific details. |
| `ux-architect-playbook.md` | A reusable UX architect workflow — phases, deliverables, quality gates. Used as the UX guideline file Figma Make follows on every generation. |
| `figma-ui-kit-guidelines.md` | The HF&C / AutoChain design-system rules and component specs. Used as the basis for building the Figma UI Kit that Figma Make designs against. |
| `README.md` | This file. |

---

## How to attach guidelines in Figma Make

Figma Make uses any attached file as its working context. This is how we got it to think like a UX architect on every generation.

1. Open Figma Make.
2. In the prompt input, click the **`+`** icon (left of the prompt text field).
3. Choose **Add images and files**.
4. Upload these two files from this bundle:
   - `product-overview-ARSR.md`
   - `ux-architect-playbook.md`
5. Confirm they appear as attached project files — Figma Make now references them on every prompt.

---

## How to connect the Atlassian MCP inside Figma Make

This lets Figma Make pull the PRD directly from Confluence.

1. In the prompt input, click the **`+`** icon.
2. Choose **Connectors**.
3. Find **Atlassian** → click **Connect**.
4. Authorise via OAuth (same Atlassian account you use elsewhere).
5. Once connected, paste any Confluence PRD URL in the prompt — Figma Make reads it via the MCP.

> Authentication is OAuth-based and reused across tools. If you've already connected Atlassian in Claude, the same identity works here.

---

## How to use the Figma UI Kit

Figma Make no longer accepts a design system file directly. It expects a published **Design UI Kit**.

### Step 1 — Build the UI Kit

1. Use `figma-ui-kit-guidelines.md` from this bundle as the source of truth for tokens (colour, typography, spacing) and component rules.
2. Create a Figma file → set up the tokens as **Figma Variables**.
3. Build the components and variants based on the guideline.
4. Arrange the file in the format Figma Make's UI Kit guideline expects (frames, naming, structure).

> *Tip:* We used Claude to generate the foundation (tokens + base components) and ChatGPT + Figma's UI Kit format guide to arrange it. The output here is the source of truth.

### Step 2 — Publish the UI Kit

1. In Figma → **Assets panel → Publish library**.
2. Confirm — the kit is now available organisation-wide.

### Step 3 — Attach it inside Figma Make

1. In Figma Make → click the **`+`** icon → **Attach a design**.
2. Select the published HF&C UI Kit.
3. From now on, Figma Make designs against this kit.

---

## How to give the prompt

1. **Attach the guidelines** (product overview + UX playbook). One-time per project.
2. **Attach the UI Kit.** One-time per project.
3. **Connect the Atlassian MCP** if you want to pull PRDs live.
4. **Prompt:** describe the screen or flow. Paste the PRD URL if available. Include any visualization details you have in mind — Figma Make will build to your description.
5. **Generate variants.** Figma Make produces multiple options — pick a direction.
6. **Refine via prompt.** Any edit needs a prompt — you can't directly edit inline.

---

## Skills in Figma Make (May 11 release)

Figma Make now supports **Skills** the same way Claude does.

1. Click the **`+`** icon → **Skills**.
2. Select a skill (the `product-design-architect` skill from the Claude bundle can be used here too).
3. The skill takes over — it asks discovery questions first, builds the user flow and journey in chat, and only then begins designing.
4. Designs are built against the published UI Kit you attached.

Result: noticeably higher consistency and a stronger first-exploration output.

---

## Workflow we followed in HF&C

1. **PRD + UX Markdown** — source of truth via Atlassian MCP + the playbook guideline.
2. **Figma Make** — generates initial designs against the UI Kit.
3. **Variants & Review** — pick the direction.
4. **Design System** — UI Kit components applied; drift fixed via prompt.
5. **AI Content & Naming** — Figma's AI fills content + cleans layer names.

**Reuse loop:** for new requirements sharing the same UI pattern, duplicate the screen and use Figma's **Replace content** feature — no rework.

---

## Known limitations

- Prototype responsiveness is weak.
- Minor edits still need a prompt — no direct inline editing as in Figma.
- Consistency can drift between iterations; correct with a follow-up prompt.
- GitHub integration is basic — no org-level merging or collaboration yet.

## Workarounds we adopted

- Copy the Figma Make design into Figma → swap drift with UI Kit components for polish.
- Use Figma's built-in **Add interaction** AI for cleaner prototype interactions.
- For repeat screens, duplicate and use **Replace content**.
- For production-grade React code, hand the Figma file to **Claude Code** — use Figma's **Rename layer** AI feature first to ensure clean layer names.
- For new PRDs, run them through Figma Make first to get a usable first/second draft, then finalize in Figma.
