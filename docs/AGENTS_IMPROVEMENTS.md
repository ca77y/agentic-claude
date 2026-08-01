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
