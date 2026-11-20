# SMR-379 rationale

## The problem

In SMR-370 round 1 a task's test failed on files another task wrote. The task's coder may write only its own `files`, so it returned a spec problem and revision `a31e417` removed the task. That revision recorded the lesson only as a ruling in its own RATIONALE (d21), never in the workflow, so the challenge never checked it. Nothing in the spec recorded what a test reads: only `firstTest` and `todo` prose.

## Chosen design

The smallest change that fits the existing patterns: a required `testReads` field on each task, a pure rule in rules.ts, and a judge-free `spec` blocker in the challenge next to the irreversible-decision rule. A blocker left open after the last revision goes through the existing exhausted result to the H3 stop before runLoop, so it needs no new phase, halt, or result shape. It runs on fresh specs and on committed but unchallenged ones (challengeCommitted). A rerun whose ledger shows `done challenge` skips the challenge, which matches "existing specs are not rechecked."

Why a task field: the issue counts reads and ownership per task, and `files` is already the "may write" set, which the issue calls "owns". Comparing structured paths gives the same flag for the same spec. Parsing paths from prose could not.

## Grafts from the other designs and the advisors

- Containment ownership (design 3, architecture, testability). The scheduler's overlap check is symmetric, so with it a task owning src/a.ts and reading src/ would count as owning the read even when another task writes src/b.ts. Ownership is equality or "under one of my files". The symmetric overlap is kept only for finding the writers.
- Recheck after the closing rewrites (design 3's gate, narrowed by architecture and risk). Both challenge exits that rewrite the spec after the last check (record open decisions, record open risks) return it unchecked today, and the decisions brief tells the writer to build the spec on its reading. A cross-read brought in there would reach the build. The recheck runs inside challenge() so the rules live in one place. The irreversible-decision rule's behavior is left unchanged, since the issue doesn't mention it.
- An end-to-end deliverStory test (testability) proves AC3 past the how-phase boundary: blocked, the issue comment names task and file, no coder dispatched.
- Problem wording that needs no singular/plural agreement (every advisor flagged the no-op ternary in design 1).
- Direct reads only, literal paths (risk). Listing transitive imports would over-flag dependent tasks.
- Legacy specs read nothing, handled inside the rule, not the parser (security, architecture, simplify).

## Rejected

- CRITERION.reads unioned over task.criteria, plus a judged completeness check (design 2). Criteria map to tasks many-to-many, so a shared criterion charges its reads to both tasks and falsely flags one on files the other writes. A task with no criteria declares no reads. CRITERION is shared with the small, bugfix, and validate flows, which have no tasks. The judged check adds model work the issue doesn't ask for ("The check judges the spec as written").
- A halting gate in challengeSpec over both rules, a parseBuild default, and a path normalizer (design 3, rest). The gate re-runs the irreversible-decision rule, adding a halt path for a rule the issue never mentions, and registers rules in a second place. A parser default is a fallback for every reader of the build, against .claude/rules/architecture.md. A normalizer used only by this rule could match differently from the scheduler. Its "the code they import or run" wording invites transitive imports.

## Rulings in force

- A read of a dependency's file is flagged (issue Assumptions), even when legitimate. Restructuring is the writer's choice.
- A read no task writes is not flagged, and `build.docs` files count as written by no task: writer-docs writes them after the inner loops.
- A spec revised mid-build is not rechecked ("before the build starts").
- No plugin version bump.

## Task split

This spec follows the rule it adds. t1 owns the schema, the rule, the challenge, every test that reads them, the fixtures that need the new field, and the regenerated bundles, so its own files can make its tests pass. t2 owns only the writer-spec instruction and the docs, and has no criteria. The existing doc tests read t2's docs, so t2 must keep them passing.

## Open risks

- The writer may leave `testReads` incomplete. A read the spec doesn't list goes unflagged, which the issue accepts. The required field and the writer-spec instruction mitigate it.
- Any flag, even a legitimate one, costs at least one revision. It ends in H3 if the writer can't restructure in three, and brokenWorkflow's "the workflow is broken" wording overstates that case. It is left as is to stay small.
- A closing rewrite that brings in a cross-read halts the run with no further revision. This is intended: a flagged spec is never built.
- A spec revised mid-build can bring a cross-read back. Out of scope.
- lens-altitude or the judge could object to `testReads` as detail below the code. It is a file list at the same altitude as `files`, and its blockers skip the judge.
