# Agents improvements

Append-only notes on friction in the pipeline itself — the flow, an agent's instructions, or a
skill. One `###` entry per concrete proposal.

Entries are triaged periodically: a solvable finding becomes a story on the board (`docs/tasks/`)
and a finding already resolved or foreclosed by shipped work is removed. The log is empty when
every recorded finding has been converted or retired.

### The docs pass should sweep repo-maintenance files that describe the changed artifact

**Area**: `agent:writer`

**Observed**: The docs pass routes durable content to documentation (features / flows / designs, or
whatever the project's conventions name) and says nothing about *maintenance* files that describe
the artifact just changed. On `install-dependencies-in-story-worktrees` the change widened the
shared "Addressing the story worktree." paragraph, which the root `CLAUDE.md` describes in prose
("That **addressing** convention lives as one canonical … paragraph") — now an understatement, and
next to a parity check contributors run before pushing. Nothing in the docs pass would have found
it: it was caught only because the spec pass noticed it, wrote it into *Deviations*, and the `lead`
repeated it in the docs-pass dispatch prompt. Two manual hand-offs to reach a file whose staleness
is mechanically discoverable from the diff. (Distinct from
`soften-the-docs-pass-routing-table`, which is about doc *categories* the project may not have.)

**Suggested change**: Add a step to the docs pass: for each file the build changed, grep the repo's
maintenance and contributor files (root `CLAUDE.md`/`AGENTS.md`, `CONTRIBUTING`, and any file the
project's context names as repo-maintenance) for prose or checks describing that file or the
convention it carries, and reconcile whatever the change made narrow or wrong — reporting it
alongside the docs updated, in the same pass.
### `qa` has no defined validation path for a prose/definition-only build

**Area**: `agent:qa`

**Observed**: `qa.md` steps 1–4 assume a test suite exists — run the validation commands, find
the coverage gaps, *add the missing tests*, re-run. A story whose whole build is prose (an agent
definition, a doc) has no suite to run and no test to add, and this toolkit repo has no test
runner at all. On `collect-sendmessage-resumes-inside-the-leads-turn` the `lead` had to hand-write
a long custom prompt explaining that "validation" meant running the spec's own read-only checklist
and reading the resulting prose against each scenario. Without that prompt a `qa` following its
definition literally would either report "no tests to run" as a pass, or invent a test harness the
repo does not have.

**Suggested change**: add a clause to step 1 (and a matching one to steps 2–3) for builds whose
artifact is prose rather than code: when the spec carries its own Validation checklist, that
checklist *is* the validation — run it and capture real output; the gap-filling step becomes
"check the spec's checklist for missing read-only checks and run the ones it should have had",
reported as additions to the checklist rather than as new test files. Step 5's diff review is
already medium-agnostic and needs no change.

### A fix to an agent definition after the docs pass leaves the README silently stale

**Area**: `flow`

**Observed**: the root `README.md` mirrors agent-definition prose (docs/CLAUDE.md makes it the
user-facing description of every agent), but the docs pass runs *before* the PR opens, while the
PR-review loop keeps editing agent definitions afterwards. On
`collect-sendmessage-resumes-inside-the-leads-turn` the `lead` had to dispatch the `writer` for a
README-only re-mirror **three separate times in one PR-review round**, each time after a fix round
changed `lead.md`'s PR review loop section. Round 2 left the README asserting the exact opposite of
the shipped definition (`persistent: true` "is reserved for the wait on a review already underway"
where `lead.md` now forbids it outright) — a correctness contradiction that survived until a human
noticed, because nothing in the loop re-checks the README against a definition changed after the
docs pass.

**Suggested change**: make the mirror check part of the fix round rather than a separate dispatch.
In `lead.md` step 5 of the PR review loop, when a round's findings change any file under
`plugins/*/agents/`, route the same round to the `writer` for a README consistency pass alongside
the `coder` fix — the docs half of a fix round, not a follow-up to it. Alternatively (or in
addition) give `qa` a standing check: when the diff touches an agent definition, verify the root
README's corresponding prose does not contradict it, and report the drift as a finding.

### An agent definition's own frontmatter `description` is not counted as an edit site

**Area**: `agent:writer`

**Observed**: on `commit-each-fix-round-in-the-worktree` the spec enumerated five edit sites inside
`lead.md` and scoped the `coder` to exactly those. None was the file's frontmatter `description`,
which restated the very behaviour being replaced ("Commits the spec, commits everything else, opens
the PR"). Both `qa` and the acceptance `auditor` flagged it as stale during the build; the `coder`
correctly declined to touch it (out of the scoped sites), the spec had no owner for it, and it
survived to the docs pass only because the human named it in the dispatch prompt. That description
is not incidental metadata — it is what other agents read when choosing a dispatch, so a stale one
is wrong product surface, not just wrong prose.

**Suggested change**: in the spec pass, when the task changes behaviour described in an agent
definition under `plugins/*/agents/`, check that file's frontmatter `description` for the same claim
and either include it in the enumerated edit sites or name its owner (docs pass) with a Tasks entry
— the same treatment already required for a criterion no build step can close. Cheap to check: the
description is one line at the top of the file being edited.
