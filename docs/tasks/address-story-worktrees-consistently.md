---
type: story
title: Give agents one convention for addressing a story worktree
---

# Give agents one convention for addressing a story worktree

- [?] Give agents one convention for addressing a story worktree #improvement ⏫ 🆔 address-story-worktrees-consistently
  - An agent dispatched to work in a story worktree cannot make that worktree its working directory, and nothing states the fallback once, so every git call has to carry `-C <path>` by hand and every subagent prompt has to repeat it — or the agent silently reads the root checkout on `master` and reviews or builds the wrong tree.
  - Background: the `reviewer` was dispatched at `.worktrees/give-reviewer-a-worktree-review-contract` while its session cwd stayed at the repository root, and cwd resets between bash calls anyway. `EnterWorktree` refuses the switch — it only accepts worktrees under `.claude/worktrees/`, whereas the root `CLAUDE.md` places story worktrees in `.worktrees/<branch>`. The two conventions do not meet. This is a per-dispatch correctness hazard, not a papercut: nothing in the transcript distinguishes a clean pass from a pass that read the wrong tree.
  - Scope: the shared worktree paragraph every dispatched agent carries (`lead`, `coder`, `writer`, `qa`, `auditor`), and the worktree convention in the root [`CLAUDE.md`](../../CLAUDE.md). Pick one resolution rather than both.
  - Acceptance criteria:
  - The convention for addressing a caller-named worktree is stated once, in the shared paragraph every dispatched agent carries: treat the named path as the review/build root, prefix every git command with `-C <path>`, use absolute paths under it for file tools, and pass the path plus that instruction into every subagent prompt.
  - **Or** the two conventions are aligned so `EnterWorktree` can take the handoff — story worktrees relocated to the directory it accepts, updated in the root `CLAUDE.md` and wherever the `lead` creates them, so a dispatched agent can switch cwd once instead of threading `-C` through every call.
  - After the change, a dispatched agent can no longer silently operate on the root `master` checkout when it was handed a worktree; the definition makes the correct target unambiguous.
  - The `lead`'s worktree-creation step and the addressing convention stay consistent with each other and with the root `CLAUDE.md` worktree rules.
