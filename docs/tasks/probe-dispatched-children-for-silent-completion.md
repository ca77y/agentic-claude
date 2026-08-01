---
type: story
title: Make a fan-out parent probe its children instead of trusting notifications
---

# Make a fan-out parent probe its children instead of trusting notifications

- [ ] Make a fan-out parent probe its children instead of trusting notifications #improvement ⏫ 🆔 probe-dispatched-children-for-silent-completion
  - A dispatched child can finish real work and never report back, and from the parent's side silence and still-working are indistinguishable. A fan-out parent that waits on the notification channel alone can wait forever on work that is already done, then synthesize from a subset of its children without knowing it.
  - Background: a parent researcher dispatched six `ca77y-engineering:researcher` children in a single message, `run_in_background: false` on every call. Two returned inline; two arrived later via the async task-notification path; two (PowerSync, TinyBase/enterprise-platforms) never notified at all. Per their raw notes' file timestamps, both silent children had persisted real cited work (2 and 4 notes) 15–40 minutes before the parent gave up — they did not crash or stall, they stopped without reporting. `SendMessage` to their agentIds confirmed the tool layer considered them finished ("no active task"). It surfaced only because the coordinator intervened after the parent reported "still waiting"; otherwise the synthesis would have silently missed two of six subquestions.
  - Part of this is harness behaviour we do not own — whether every agent emits a terminal result is not ours to guarantee. What is ours is the parent's contract: a parent that can detect a finished-but-silent child does not depend on that guarantee.
  - The in-flight `researcher.md` change ("You do the research yourself", two-child minimum) narrows how often fan-out happens; it does not make a fan-out's collection reliable.
  - Scope: `plugins/ca77y-engineering/agents/researcher.md` (fan-out steps 3 and 4). If the mechanism turns out to be harness-side with no toolkit-side mitigation, record it in [`../issues/`](../issues/) per [`../CLAUDE.md`](../CLAUDE.md) instead of leaving a card that cannot close.
  - Acceptance criteria:
  - A parent that fans out is told that a missing notification does not mean a child is still running, and that a child can end its turn having done its work without reporting.
  - The parent has a stated way to distinguish the two before concluding — a liveness probe to each outstanding agentId, and a check of the artifacts the child was supposed to leave behind (persisted raw-note paths), rather than trusting the notification channel alone.
  - A child confirmed finished-but-silent is reconciled from its persisted artifacts rather than dropped from the synthesis or re-dispatched blindly.
  - The parent never reports a synthesis as complete while any dispatched child is unaccounted for; the count of children dispatched and children collected is explicit.
  - Cross-links [`collect-sendmessage-resumes-inside-the-leads-turn`](collect-sendmessage-resumes-inside-the-leads-turn.md): same hazard on the `lead`'s resume path.
