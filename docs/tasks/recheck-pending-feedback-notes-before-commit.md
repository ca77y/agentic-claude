---
type: story
title: Re-check pending pipeline-feedback notes against the diff that ships them
---

# Re-check pending pipeline-feedback notes against the diff that ships them

- [ ] Re-check pending pipeline-feedback notes against the diff that ships them #improvement 🔽 🆔 recheck-pending-feedback-notes-before-commit
  - A pipeline-feedback note is drafted mid-round as an accurate observation, then carried unchanged into the commit that closes the very gap it describes. The improvement log is explicitly a durable record read by later agents, so a note written in the present tense becomes a false record of the repository the moment the same round fixes it.
  - Background: one commit did three things at once. It added a guard to an error handler; it added the fake-server mode and the test that pins that guard; and it added a feedback entry asserting that the guard "shipped as a production-code change plus a long rationale comment, with no test", that "nothing in the probe test file can produce a non-2xx POST", and that "reverting the guard leaves 14/14 green". All three assertions were true at the parent commit — that file had 14 tests — and false at the commit that carried them, which had 15, the new one being exactly the missing discriminator.
  - Nothing in the flow re-reads a pending note against the diff it is about to ship in. The note is treated as commentary alongside the change rather than as part of the change under review.
  - Scope: `plugins/ca77y-engineering/agents/lead.md` (it is the only agent that commits) and the shared process-feedback paragraph carried by every agent.
  - Acceptance criteria:
  - Before committing, the `lead` re-checks each pending feedback entry's observations against the final diff.
  - An entry the round resolved is deleted, rewritten in the past tense scoped to the round it describes, or reduced to the residual general lesson — the definition states which of the three applies when.
  - An entry stating a falsifiable check, such as "reverting X leaves N of N green", has that check re-run against the commit being made rather than the state the note was drafted in.
  - The shared feedback paragraph tells agents to write observations so they stay true after the round closes.
  - The existing append-only rule is preserved: entries belonging to a concurrent story are never reverted or discarded.
