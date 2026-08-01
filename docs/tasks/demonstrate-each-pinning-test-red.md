---
type: story
title: Make the coder demonstrate each pinning test red, not just name it
---

# Make the coder demonstrate each pinning test red, not just name it

- [ ] Make the coder demonstrate each pinning test red, not just name it #improvement ⏫ 🆔 demonstrate-each-pinning-test-red
  - `coder.md` already requires each behavioural fix to be pinned by a test that fails without it, and requires the coder to name that test per finding. Naming costs nothing and cannot be wrong out loud, so a plausible-looking name survives the round unfalsified and an unpinned fix ships as a covered one.
  - Background: in `timer-cue-sync` round 2, finding F-D — a teardown window where an already-dispatched `scheduleNotificationAsync` could register a cue after `cancelAllScheduledNotificationsAsync` resolved — was closed with a real production fix (a trailing sweep chained onto the sync chain in `stopIntervalCues`) and reported as fixed with a named test. In round 3, `qa` deleted the sweep line and ran the whole `apps/mobile/platform/notifications.test.ts` suite: all 17 tests still passed. The fix was pinned by nothing. The nearest test covered the *other* round-2 finding, F-C, and passes identically with or without the sweep — exactly the adjacent-test trap the existing rule warns about. It surfaced only because that `qa` round was explicitly instructed to mutation-test, one round before shipping.
  - The requirement is not missing; what is missing is a step that makes the claim falsifiable. Revert-run-restore is seconds per finding and converts "I believe this is covered" into evidence the `lead` and `qa` can read.
  - Scope: `plugins/ca77y-engineering/agents/coder.md` (the pinning obligation and the per-finding report), with whatever `qa.md` needs so it consumes the evidence instead of re-deriving it.
  - Acceptance criteria:
  - For each behavioural fix, the coder reverts the fix in the working tree, runs the named test, confirms it fails, restores the fix, and reports the **observed** failure — test name plus the assertion that went red — rather than an assertion that it would fail.
  - The report distinguishes a demonstrated pin from an undemonstrated one, so an unpinned fix cannot read as a pinned one.
  - Where the coder concludes nothing can reach the fix, it says so explicitly and `qa` inherits it as a known gap instead of rediscovering it.
  - `qa` is told it can trust a demonstrated pin and must probe an undemonstrated one, so the evidence changes what the next round costs.
  - The obligation stays scoped to behavioural fixes and does not turn every change into a mutation-testing exercise.
