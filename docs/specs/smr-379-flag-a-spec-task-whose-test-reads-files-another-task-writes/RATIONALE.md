# SMR-379 rationale

## The problem

In SMR-370 round 1 a task's test failed on files another task wrote. The task's coder may write only its own `files`, so it returned a spec problem and revision `a31e417` removed the task. That revision recorded the lesson only as a ruling in its own RATIONALE (d21), never in the workflow, so the challenge never checked it. Nothing in the spec recorded what a test reads: only `firstTest` and `todo` prose.

## Chosen design

The smallest change that fits the existing patterns: a required `testReads` field on each task, a pure rule in rules.ts, and a judge-free `spec` blocker in the challenge next to the irreversible-decision rule. A blocker left open after the last revision goes through the existing exhausted result to the H3 stop before runLoop, so it needs no new phase, halt, or result shape. It runs on fresh specs and on committed but unchallenged ones (challengeCommitted). A rerun whose ledger shows `done challenge` skips the challenge, which matches "existing specs are not rechecked."

Why a task field: the issue counts reads and ownership per task, and `files` is already the "may write" set, which the issue calls "owns". Comparing structured paths gives the same flag for the same spec. Parsing paths from prose could not.

## Grafts from the other designs and the advisors

- Containment ownership (design 3, architecture, testability). The scheduler's overlap check is symmetric, so with it a task owning src/a.ts and reading src/ would count as owning the read even when another task writes src/b.ts. Ownership is equality or "under one of my files". The symmetric overlap is kept only for finding the writers.
- Recheck after the closing rewrites (design 3's gate, narrowed by architecture and risk). Both challenge exits that rewrite the spec after the last check (record open decisions, record open risks) return it unchecked today, and the decisions brief tells the writer to build the spec on its reading. A cross-read brought in there would reach the build. The recheck runs inside challenge() so the rules live in one place. Each exit has its own how test (revision 2): with only the decisions exit tested, a coder could recheck that exit alone, every test would pass, and a cross-read from the open-risks rewrite would reach the build. The irreversible-decision rule's behavior is left unchanged, since the issue doesn't mention it.
- An end-to-end deliverStory test (testability) proves AC3 past the how-phase boundary: blocked, the issue comment names task and file, no coder dispatched.
- Direct reads only, literal paths (risk). Listing transitive imports would over-flag dependent tasks.
- Legacy specs read nothing, handled inside the rule, not the parser (security, architecture, simplify).

## What clears a flag (d7, revision 2)

`testReads` is the check's only input, and the writer who must clear the flag writes it. The challenge hands the writer the blocker with "Revise the spec for these problems" and rechecks only the edited `testReads`, so the shortest edit that passes is deleting the flagged entry while `firstTest`/`todo` still describe a test that reads the file. The challenge would then be recorded as done and the SMR-370 task would be built. The blocker and the writer-spec instruction therefore both say that `testReads` lists what the tests actually read and that a flag is cleared only by changing which task writes or tests the file. This says what counts as a fix without prescribing the restructure, which the issue leaves to the writer. A check comparing `testReads` with the prose was not added: it would need a judge or prose parsing, which d1 rules out for determinism.

## Altitude (revision 2)

The task names what the blocker must convey (task, file, writing tasks, and what clears it) but not its wording, its grammar, a prefix for the closing-rewrite case, or code comments: those are inside t1's own files and are the coder's choice. The test cases are listed once, in validate.json c1-c3; t1's todo names the test files and the behaviours they cover, which keeps it under lens-altitude's 300-word task budget.

## Rejected

- CRITERION.reads unioned over task.criteria, plus a judged completeness check (design 2). Criteria map to tasks many-to-many, so a shared criterion charges its reads to both tasks and falsely flags one on files the other writes. A task with no criteria declares no reads. CRITERION is shared with the small, bugfix, and validate flows, which have no tasks. The judged check adds model work the issue doesn't ask for ("The check judges the spec as written").
- A halting gate in challengeSpec over both rules, a parseBuild default, and a path normalizer (design 3, rest). The gate re-runs the irreversible-decision rule, adding a halt path for a rule the issue never mentions, and registers rules in a second place. A parser default is a fallback for every reader of the build, against .claude/rules/architecture.md. A normalizer used only by this rule could match differently from the scheduler. Its "the code they import or run" wording invites transitive imports.

## Rulings in force

- A read of a dependency's file is flagged (issue Assumptions), even when legitimate. Restructuring is the writer's choice.
- A read no task writes is not flagged, and `build.docs` files count as written by no task: writer-docs writes them after the inner loops.
- A spec revised mid-build is not rechecked ("before the build starts").
- No plugin version bump.

## Task split

One task. This spec follows the rule it adds: t1 owns the schema, the rule, the challenge, the writer-spec instruction, every test that reads them, the fixtures that need the new field, and the regenerated bundles, so its own files can make its tests pass. No test of t1's reads writer-spec.md.

Revision 2 merged the former docs task into t1. It had no criteria, so it still cost a full coder and qa loop, and two of its three files, docs/deliver/STORY.md and docs/ARCHITECTURE.md, are in `build.docs`, which writer-docs updates after each round that changes something; the docs task and writer-docs would have edited the same documents. The writer-spec instruction is the one behavioural rule among those files, so it moved into t1 rather than being left to writer-docs. The existing doc tests only check that removed wordings stay absent, so they don't depend on the new doc entries.

## Open risks

- The writer may leave `testReads` incomplete, by accident or by deleting a flagged read under revision pressure. A read the spec doesn't list goes unflagged, which the issue accepts ("The check judges the spec as written"). The required field, the writer-spec instruction, and the blocker's statement of what clears a flag (d7) mitigate it; nothing enforces it.
- writer-docs, not a task, adds the `testReads` and rule entries to docs/deliver/STORY.md and docs/ARCHITECTURE.md. Their quality rests on writer-docs.
- Any flag, even a legitimate one, costs at least one revision. It ends in H3 if the writer can't restructure in three, and brokenWorkflow's "the workflow is broken" wording overstates that case. It is left as is to stay small.
- A closing rewrite that brings in a cross-read halts the run with no further revision. This is intended: a flagged spec is never built.
- A spec revised mid-build can bring a cross-read back. Out of scope.
- lens-altitude or the judge could object to `testReads` as detail below the code. It is a file list at the same altitude as `files`, and its blockers skip the judge.
