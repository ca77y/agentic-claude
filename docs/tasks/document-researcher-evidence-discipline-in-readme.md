---
type: story
title: Document the researcher's evidence discipline in the README
---

# Document the researcher's evidence discipline in the README

- [ ] Document the researcher's evidence discipline in the README #improvement 🔼 🆔 document-researcher-evidence-discipline-in-readme ⛔ harden-researcher-evidence-discipline,give-reviewer-a-worktree-review-contract,generalize-audit-findings-to-the-property
  - [`docs/CLAUDE.md`](../CLAUDE.md) makes the root [`README.md`](../../README.md) the user-facing description of every agent, to be updated whenever an agent's behavior changes. Story `harden-researcher-evidence-discipline` changed the `researcher`'s behavior — it added a `## Evidence discipline` section (empty-search-result fault handling with a control query and the two absence labels `confirmed absent` / `unretrieved, not absent`, named fallback endpoints, and the current-source-versus-dated-reports timeline rule), a pointer from workflow step 4, fan-out label carry-through in workflow steps 3 and 6, and two `## Output shape` items — but deliberately did **not** touch the README.
  - Why it was deferred: two sibling stories (`give-reviewer-a-worktree-review-contract`, `generalize-audit-findings-to-the-property`) were editing the README concurrently in their own worktrees. A three-way conflict on one shared file cost more than it bought. The README's `### researcher — deep-dive research that grows the library` section stays factually correct after that story — it is *less complete*, not wrong.
  - Scope: the root `README.md`, `### researcher — deep-dive research that grows the library` section only. Fold in the evidence-discipline behavior at the README's existing altitude — user-facing prose, not a restatement of the definition. The rules themselves stay in `plugins/ca77y-engineering/agents/researcher.md`, which is the product.
  - Acceptance criteria:
  - The `### researcher` section states that an empty search result is treated as a suspected retrieval fault checked by a control query, not as evidence of absence.
  - It names the two absence labels the researcher applies, `confirmed absent` and `unretrieved, not absent`, and that a fan-out parent carries a child's labels through rather than upgrading them silently.
  - It states that the researcher reads a vendor's current source against dated practitioner reports as a timeline question.
  - The section's "Output:" line reflects the two added `## Output shape` items (retrieval status with fallbacks used, and the timeline resolution of a contradiction).
  - Sequencing: ride this along with the shared `ca77y-engineering` version bump that lands after `harden-researcher-evidence-discipline` and its two sibling PRs have all merged. All three of those PRs leave both manifests at `1.6.2`; one bump lands afterwards. Verify manifest parity with the check in the root [`CLAUDE.md`](../../CLAUDE.md).
  - Coordination: the two sibling stories owe the same kind of README update for `### reviewer`, `### writer`, and `### auditor`. If a sibling card already covers the shared version-bump PR, fold this card into it rather than opening a second PR against the same file.
