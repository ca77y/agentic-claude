# Conditional routing and escalation

Read only when a requested production model is unavailable, the actual production model is unknown, early promotion or parallel solutions are considered, a task is reopened or resumed, or delivery reaches a terminal condition. The ordinary model matrix and allowance are in the [delivery skill](../SKILL.md).

## Resolve production models

Routing recognizes only the `Agent` dispatch aliases `haiku`, `sonnet`, and `opus`. If a dispatch on the requested alias fails because that model is unavailable, choose another listed alias and start at that alias's tier. Do not infer a tier for any other model from its name or task complexity. If no listed alias is available, report unsupported routing before solution work. The actual model is the one the dispatch ran on, as the harness reports it or the ledger recorded it at dispatch; a gateway or proxy that silently serves a different model makes the actual model unknown.

An unknown actual production model blocks further routing and attempt allocation until it is resolved; retain the task's recorded history and do not guess a tier. A reused artifact is an input. Its read-only revalidation, validator model, and unknown historical author are evidence-only and never initialize a production tier. A newly produced or revised spec uses its current supported production model only for its own spec task's evaluated attempt.

## Exceptional escalation

For a reasoned early promotion, close and forfeit unused slots at the old tier, record skipped tiers, and allow one attempt at the selected higher tier and each remaining higher tier. Do not return to lower or skipped tiers or reset the initial allowance. If a needed next tier is unavailable, record it as skipped; its slot is not transferable. Return earlier when a prerequisite, a supported next tier, or a plausible corrective approach is absent.

Reserve every parallel alternative solution slot before dispatch. Settle or stop active solutions before promotion, retaining uncertain reservations until reconciled. Validators and revalidations have no production reservation. The main agent aggregates evaluated failures; leaves receive only their assigned remaining allocation.

## Reopen, resume, and stop

Within the same run, retain a stable task/problem's tier and failures across workers, gates, entry points, checkouts and interruptions. Renaming, splitting or reparenting a failed task cannot reset its history. Genuinely separate tasks start independently. When a resolved spec defect reopens in the same run, reopen the original spec task and pause affected implementation; do not transfer or erase either task's failures. An uncertain history is a recovery gap, never a fresh allowance.

At terminal stop, stop active workers with `TaskStop` where available and production, preserve actual statuses and useful artifacts, and return the unresolved task/problem, blocking evidence, approaches/models and per-tier failures, current candidate, and the decision, access, information or explicit additional-attempt authorization needed. Record an inability to stop a worker honestly. Further attempts require explicit user authorization alongside the existing history. Saving state is allowed; another experiment disguised as recovery is not.
