---
name: deep-review
description: Disabled — review is now handled inside the orchestrator workflow with an explicit confirmation gate. Use the main HLD workflow instead.
---

This command has been removed.

Architectural review (Step 9) is now triggered automatically by the orchestrator workflow after you confirm at the **Review Gate**. There is no standalone review command — the review always runs as part of the full HLD workflow.

To run a review, proceed through the HLD workflow until Step 8 is complete, then respond **"approve"** at the Review Gate prompt.
