---
type: story
title: Commit each fix round so a fresh reviewer can see what changed
---

# Commit each fix round so a fresh reviewer can see what changed

- [-] Commit each fix round so a fresh reviewer can see what changed #improvement 🔼 🆔 commit-each-fix-round-in-the-worktree
  - **Cancelled** — there is no longer a fresh local reviewer per round. Code review is folded into `qa` (in-loop, same worktree) and the independent review runs on the PR against committed diffs, so the premise (a fresh reviewer cannot see an uncommitted prior round) no longer applies.
  - `lead.md`'s commit model commits only the spec (commit 1) and then everything else at ship (commit 2), so a review or acceptance fix round's pre-fix wording exists nowhere — not in `git log`, `git stash`, or the reflog. A `reviewer` dispatched fresh each round can only see the post-fix text, so it cannot verify a reworded fix against what it replaced, and the simplify pass cannot tell a round's remediation from unmandated filler.
  - Background: on round 2 of `generalize-audit-findings-to-the-property`, the round-2 `reviewer` was asked to verify two round-1 findings had been correctly reworded, but round 1's pre-fix text was gone. The simplify pass then proposed cutting a sentence that was plausibly *itself* the round-1 remediation; with no way to tell remediation from filler, the only safe call was to skip a legitimate cleanup. The simplify pass is silently degraded on every round after the first.
  - Scope: `plugins/ca77y-engineering/agents/lead.md`, `## The commit model`. Pick one resolution.
  - Acceptance criteria:
  - `lead.md` either commits after the `coder` applies each review/acceptance fix round in the story worktree — mirroring the existing "one commit per PR-review fix round" — **or** the `lead` passes the previous round's findings verbatim into the next `reviewer` dispatch. The story states which and why.
  - With the commit resolution, a fresh `reviewer` can diff round N against round N-1 and verify a reworded fix against the text it replaced.
  - The simplify pass is no longer silently degraded after round 1: a fresh `reviewer` can distinguish a round's remediation from unmandated, cuttable filler.
  - The change stays consistent with the two-commit ship model (commit 1 spec, commit 2 everything else) and with the three-round caps.
  - Cross-links [`feed-the-simplify-pass-the-governing-spec`](feed-the-simplify-pass-the-governing-spec.md): both protect the simplify pass from cutting required or remediating content.
