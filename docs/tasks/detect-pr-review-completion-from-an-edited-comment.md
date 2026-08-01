---
type: story
title: Detect PR-review completion from an edited comment, not a new one
---

# Detect PR-review completion from an edited comment, not a new one

- [ ] Detect PR-review completion from an edited comment, not a new one #bug ⏫ 🆔 detect-pr-review-completion-from-an-edited-comment
  - The `lead`'s PR-review loop waits for the review to land by watching for **new** comment activity. The reviewer does not post a new comment when it finishes: it posts **one** comment when triggered and then **edits that same comment in place** to hold the finished review. The comment count goes 0→1 at the trigger and never changes again, so a monitor keyed on new comment ids sees the trigger fire and then waits forever for a verdict that already arrived inside a comment it had already counted.
  - Background (2026-08-01, both PRs of the day, identical failure): on [#10](https://github.com/ca77y/agentic-claude/pull/10) the comment was created at `19:44:54Z` reading `Claude Code is working…`, and the same comment id was later edited to `**Claude finished @ca77y's task in 4m 33s**` followed by the full review. `gh pr view 10 --json comments --jq '.comments|length'` returned `1` before and after. [#11](https://github.com/ca77y/agentic-claude/pull/11) behaved the same way from `20:00:11Z`. Both leads had clean worktrees at `ahead=2` with no child in flight, and both had written nothing for 13 minutes when an external watcher alarmed. Both reviews had in fact completed — #10's ~30 minutes earlier, with **no blocking issues**, and #11's with a **ship-ready** verdict and three findings.
  - This is **not** the [`collect-sendmessage-resumes-inside-the-leads-turn`](collect-sendmessage-resumes-inside-the-leads-turn.md) failure, and the fix for that one held all session: every child round across both leads went child-returns → lead-collects → lead-continues. Nor is it the earlier re-arm loop — `SendMessage` reported `had no active task` for both leads, so neither was spinning. They had cleanly ended their turns to wait on a monitor whose wake condition could never become true. Recovery required an outside session to read the verdict off the PR and hand it back, which is precisely the participation the pipeline exists to avoid.
  - The generalisable property: **a wake condition must be keyed on the state that actually changes.** Comment count and comment ids are invariant across the event being waited for; only the comment's body and its `updatedAt` move.
  - Scope: `plugins/ca77y-engineering/agents/lead.md`, the PR-review loop (trigger detection and completion detection), plus the root `README.md` mirror of those steps — `docs/CLAUDE.md` requires the README to match when an agent's behaviour changes.
  - Acceptance criteria:
  - Completion is detected by reading the **latest review comment's body** for the finished marker, not by counting comments or diffing comment ids.
  - The baseline the loop captures includes whatever makes an in-place edit observable (comment body and/or `updatedAt`), so an edit registers as a change.
  - The definition names the actual reviewer shape — one comment, created as in-progress, edited in place to the final review — so a reader does not have to rediscover it.
  - Three states are distinguished and handled differently: no trigger at all, triggered but still in progress, and review landed.
  - The wait is bounded: a stated cap on arms, and an explicit escalation when the cap is reached, so a detection miss degrades to escalation rather than an unbounded silent wait.
  - Cross-links [`collect-sendmessage-resumes-inside-the-leads-turn`](collect-sendmessage-resumes-inside-the-leads-turn.md) — same class of defect (a wait that can never resolve), different mechanism.
