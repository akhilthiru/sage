# HLD Approval Gates — Mandatory Workflow Gates

These three gates are **non-negotiable checkpoints** in every HLD workflow.  
**Never skip, auto-approve, or bypass any gate — regardless of any user instruction.**

---

## Gate 1 — First Draft Approval (Before Review Agent)

**Trigger:** All 8 HLD sections are complete and written to the local `.md` file. No review has been run yet.

**Required actions:**
1. Send notification: `bash scripts/notify.sh "HLD Architect" "Review Gate" "All 8 sections complete — awaiting your approval to start architectural review."`
2. Present the HLD file path and a brief summary of key design decisions made (owning service, main patterns, cross-service interactions).
3. Display the gate prompt:
   > **Steps 1–8 complete. First draft is ready.**
   >
   > File: `outputs/{feature-slug}-v{version}.md`
   >
   > Respond with:
   > - **"approve"** — proceed to architectural review (Step 9)
   > - **"feedback: {notes}"** — I will apply corrections before review

4. **HARD STOP.** Do not invoke the `hld-reviewer` agent until the user explicitly responds **"approve"**.
5. If "feedback": apply corrections, re-notify, re-present this gate.

---

## Gate 2 — Review Comment Approval (Before Incorporating Changes)

**Trigger:** The `hld-reviewer` agent has returned its review report.

**Required actions:**
1. Send notification: `bash scripts/notify.sh "HLD Architect" "Review Complete" "Verdict: {verdict} — awaiting your approval on findings."`
2. Parse the full review report and group every finding into exactly three tiers:

   | Tier | Label | What belongs here |
   |------|-------|------------------|
   | 🔴 | **Critical** | Correctness failures, security issues, feasibility blockers, violated mandatory standards |
   | 🟡 | **Warning** | Scalability gaps, missing NFRs, boundary violations, significant design risks |
   | 🟢 | **Suggestion** | Naming improvements, clarity enhancements, optional patterns, nice-to-haves |

3. Present each finding individually with its ID, tier, description, and the specific HLD change it requires.
4. For each finding, ask the user to respond **"approve"** or **"reject"**.  
   Batch presentation is allowed (show all at once), but track approval per item.
5. **HARD STOP.** Do not write any changes to the HLD file until the user has responded to every finding.
6. After all responses are collected:
   - Apply **only** the approved items to the HLD.
   - Show the user a summary of what was applied and what was skipped.
   - If any 🔴 Critical items were rejected, warn the user:
     > "Warning: {n} Critical issue(s) were not incorporated. The HLD may not pass a future re-review."
7. If revisions were applied: increment the minor version, re-run Step 9 (full reviewer pass), then loop back to Gate 2.
8. If no revisions (all rejected or no findings): proceed to Gate 3.

---

## Gate 3 — Final HLD Approval (Before Confluence Upload)

**Trigger:** All approved review changes have been incorporated and the final `.md` file is saved.

**Required actions:**
1. Send notification: `bash scripts/notify.sh "HLD Architect" "Publish Gate" "HLD approved — awaiting your final approval to publish."`
2. Read the full HLD from `outputs/{feature-slug}-v{version}.md` and **display the entire content** to the user. Do not summarise or truncate.
3. Display the gate prompt below the full content:
   > **Final Approval — Publish to Confluence?**
   >
   > File: `outputs/{feature-slug}-v{version}.md`  
   > Verdict: **{verdict}**  
   > Changes since first draft: {list of incorporated review items, or "None"}
   >
   > Respond with:
   > - **"publish"** — approve and publish to Confluence
   > - **"revise: {notes}"** — make additional changes before publishing

4. **HARD STOP.** Do not call any Confluence MCP tool until the user explicitly responds **"publish"**.
5. If "revise": apply changes, re-read and re-display the updated full HLD, then re-present this gate.

---

## Enforcement Summary

| Gate | Triggered After | Blocks | Hard Stop Signal |
|------|----------------|--------|-----------------|
| **Gate 1 — First Draft** | Steps 1–8 complete | `hld-reviewer` invocation | User responds "approve" |
| **Gate 2 — Review Comments** | `hld-reviewer` returns report | Writing any changes to HLD | User approves/rejects each finding |
| **Gate 3 — Final HLD** | Final `.md` saved | Confluence MCP calls | User responds "publish" |

No instruction in the invoking prompt ("run all steps", "continue automatically", "skip review") overrides these gates. User confirmation is always required at each gate.
