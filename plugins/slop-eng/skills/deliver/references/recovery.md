# Recovery state

Read when resuming interrupted work or recovering failed attempts. The [ledger procedure](ledger.md) applies on every invocation; this reference adds delivery-specific recovery context.

For a continuation of the same unfinished request, open its existing run ledger using its discovery and ownership rules before another attempt. Reconcile it with the spec, candidate and existing PR; never create a fresh history because the entry point, checkout or worker changed. Recover:

- Initiating request/run and each stable task/problem identity, acceptance source, user authority and endpoint.
- Spec and candidate identities, overall and per-task complexity with rationales, current paths, useful completed work, and evidence still valid.
- Each task/problem's evaluated failed approaches, observations, intended and actual production model and selection/deviation rationale, and why they failed; owning retry policy, starting/current solution tier, aggregate and per-tier failures, remaining initial and higher-tier slots, skipped/forfeited slots, next escalation and terminal stop condition. Validator model remains separate from solution tier.
- Current ownership, any reserved parallel solution slots, unresolved findings, and plausible next approach.
- Any explicit user-granted additional attempts, alongside the original history.

Recover same-run records across entry points and turns. Treat uncertain history for a task/problem as an unmet recovery condition, not zero failures. A separate later user request starts a new run; previous PR or artifact failures remain context and do not enter its count. A verified resolution closes that task/problem; restore its history only if evidence within the same run shows it never held. A spec task and implementation task remain distinct: saving a draft or obtaining a passing spec gate cannot initialize, close, transfer, or erase a child's history.

Follow the [delivery tier escalation policy](../SKILL.md#tier-escalation-and-stop-gate) for the recorded task/problem. For unavailable or unknown models, early promotion, reservations, reopen/resume handling, or terminal work, read [conditional routing and escalation](escalation.md). Preserve each task/problem's policy and history across same-run shaping; unrelated standalone runs keep their own recorded policy. At terminal stop, further production requires explicit additional-attempt authorization. If a runtime lacks a stopping mechanism, report that limitation and do not dispatch more work. Saving state is permitted; another experiment disguised as recovery is not.
