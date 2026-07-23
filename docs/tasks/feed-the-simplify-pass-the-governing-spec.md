---
type: story
title: Feed the simplify pass the governing spec so it does not cut required content
---

# Feed the simplify pass the governing spec so it does not cut required content

- [-] Feed the simplify pass the governing spec so it does not cut required content #improvement ⏫ 🆔 feed-the-simplify-pass-the-governing-spec
  - **Cancelled** — the pipeline no longer runs a local simplify pass. The `reviewer` was removed and code review folded into `qa`, which surfaces findings but does not run `/simplify`; the independent code review runs on the PR. No simplify pass remains to feed a spec to.
  - The `reviewer` runs `/simplify` over the diff alone. When the artifact is prose whose exact propositions are mandated clause by clause by the spec's Requirements scenarios, the cleanup agents correctly identify spec-required clauses as redundant and cut them — every cut a genuine redundancy, every one breaking an acceptance scenario. The pass cannot know which redundancy is mandated without the spec in hand.
  - Background: on `generalize-audit-findings-to-the-property`, the cleanup agents cut three spec-mandated clauses. The `reviewer` only caught it because it happened to read the spec afterwards to size the code review; had it not, a clean-looking simplify pass would have silently failed the acceptance gate a round later. This matters most for docs and agent-definition work, where the artifact is prose the spec quotes directly.
  - Scope: `plugins/ca77y-engineering/agents/reviewer.md`, the simplify step (step 2).
  - Acceptance criteria:
  - The simplify step locates the task's spec first and passes it to `/simplify` as a constraint: propositions required by the spec's Requirements are intentional and out of bounds for redundancy-cutting.
  - The constraint is scoped to redundancy the spec mandates, so genuine cleanup elsewhere in the diff is unaffected.
  - The rule states this matters most for prose and agent-definition deliverables, where the spec quotes the artifact clause by clause.
  - When no spec governs the target — a target mode without one — the step degrades gracefully rather than blocking.
  - The `reviewer` reports whether it applied a spec as a simplify constraint, or that none applied, so a silently-degraded pass is visible.
  - Cross-links [`commit-each-fix-round-in-the-worktree`](commit-each-fix-round-in-the-worktree.md): both protect the simplify pass from cutting a previous round's remediation.
