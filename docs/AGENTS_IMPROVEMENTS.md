# Agents improvements

Append-only notes on friction in the pipeline itself — the flow, an agent's instructions, or a
skill. One `###` entry per concrete proposal.

### The spec template does not scaffold the sections the writer is required to produce

**Area**: `agent:writer`

**Observed**: `plugins/ca77y-engineering/agents/writer.md` requires every spec to carry a
**Boundary** section (its authoring rules check each scenario against it by name), **Validation**
scenarios, a **Deviations from the card** section when a criterion is unsatisfiable, and a
**Coordination** note when siblings collide. `docs/_templates/spec.md` scaffolds only
Goal → Design → Requirements → Tasks, and `docs/_templates/CLAUDE.md` pins that order because
"pipeline agents parse that contract". Nothing says where the four mandated sections go relative
to it, so each writer invents a placement — Boundary as a Design subsection here, a top-level
section there — and an auditor or coder looking for one has to search rather than expect it.

**Suggested change**: pin the placement in one of the two places. Either add the four sections to
`docs/_templates/spec.md` as named optional subsections in a fixed position, or state in
`writer.md` where each sits relative to Goal → Design → Requirements → Tasks (e.g. Boundary and
Coordination as the last subsections of Design, Validation as the last Requirement, Deviations
between Design and Requirements).

### The spec-authoring rules assume application code, and read as unsatisfiable on a prose deliverable

**Area**: `agent:writer`

**Observed**: two of the writer's authoring rules are written for a repo with a build and a test
suite — "the `coder` writes one scenario test per Requirements scenario", and Validation must
"include building through that consumer (`docker build .` / `docker compose build`)". On a
prompt-engineering task whose entire deliverable is one Markdown agent definition, there is no
test to write and no consumer to build through, so the rules have to be reinterpreted on the fly
as "one inspectable assertion per scenario" and "check the manifests and the changed-file set".
The task prompt happened to say so explicitly; without that, a writer could reasonably conclude
the spec was unfinishable or invent a test runner for a repo that has none.

**Suggested change**: add a sentence to each of those two rules naming the prose-deliverable case
— when the deliverable is a document rather than code, each scenario must be falsifiable by
reading the changed file, and Validation covers the artifact's real consumers (manifests,
loaders, anything that parses it) instead of a build.

### The build loop has no prose-deliverable mode, so the coder must talk `qa` out of hunting for a test runner

**Area**: `agent:coder`

**Observed**: the same gap as the entry above, one stage later in the flow. The `coder`'s loop
mandates "one scenario test per spec scenario, in the location the project's tests conventions
require" and then "hand the result to the `qa` subagent: it runs the project's validation and adds
the coverage the spec implies". On a task whose entire deliverable is one Markdown agent
definition there is no test to write and no validation command to run — this repo has neither.
Both steps have to be renegotiated inside the dispatch prompt: the `lead` spelled out that qa here
means reading the revised file requirement by requirement, and the `coder` had to repeat that in
capitals to `qa` ("there is NO test suite, NO test runner, NO build — do not hunt for one, do not
write one") to keep it from searching for a command that does not exist or introducing a test file
the spec's Boundary forbids. That renegotiation is re-derived per task rather than stated once.

**Suggested change**: give `coder.md` and `qa.md` a named prose-deliverable branch — when the
spec's Boundary says the deliverable is a document and the repo ships no test runner, the scenario
tests become one inspectable assertion per Requirements scenario (quote the line that satisfies
it, or name what is missing), and `qa`'s validation becomes that inspection plus the artifact's
real consumers (manifest parity, changed-file set, frontmatter integrity). State that failing to
find a validation command is then the expected result, not a blocker to report.

### An agent handed a story worktree cannot make it its working directory

**Area**: `flow`

**Observed**: the `reviewer` was dispatched at `.worktrees/give-reviewer-a-worktree-review-contract`
while its session cwd stayed at the repository root, and cwd is reset between bash calls anyway.
`EnterWorktree` refuses the switch — "the current working directory is the repository root, not an
isolated worktree" — because it only accepts worktrees under `.claude/worktrees/`, whereas the root
`CLAUDE.md` places story worktrees in `.worktrees/<branch>`. The two conventions do not meet, so
every git invocation has to carry `-C <worktree>` by hand, and every subagent prompt has to repeat
that instruction or the subagent silently reads the root checkout on `master` and reviews the wrong
tree. That is a per-dispatch correctness hazard, not just a papercut: nothing in the transcript
distinguishes "clean pass" from "read the wrong tree".

**Suggested change**: state the worktree-addressing convention once, in the shared paragraph every
agent already carries — when the caller names a worktree path, treat it as the review/build root,
prefix every git command with `-C <path>`, use absolute paths under it for file tools, and pass the
path plus that instruction into every subagent prompt. Alternatively, align the two conventions so
`EnterWorktree` can take the handoff: either place story worktrees under `.claude/worktrees/` in the
root `CLAUDE.md`, or have the `lead` create them there, so a dispatched agent can switch cwd once
instead of threading `-C` through every call.

### The docs-pass gate blocks on the spec the writer is told to remove only after it passes

**Area**: `agent:writer`

**Observed**: `writer.md`'s docs pass says to leave the spec in place while the gate runs — "removal
happens only after the gate passes (step 7), so a blocked audit leaves the run resumable" — but the
`auditor` reads the still-present spec as the pass's headline defect and returns **not ready** on it.
That happened here even though the gate dispatch stated the spec was "still present, slated for
removal": the auditor called it "the one filesystem action that makes it a docs pass" and blocked,
and the finding cost a full extra audit round (~80k subagent tokens) to clear something that was
never a defect. The two instructions are individually reasonable and jointly guarantee one wasted
round on every docs pass whose only remaining step is the deletion.

**Suggested change**: settle the ordering in `writer.md`. Either move the removal ahead of the gate
and have the writer state in the dispatch that the spec was deleted in commit-pending state (the
`lead` has not committed, so a blocked audit is still recoverable by `git checkout`), or keep the
current order and require the gate dispatch to put the spec's presence explicitly **out of scope** —
"the spec is deleted by this pass after your verdict; do not report its presence as a finding, judge
only whether its content has a home" — rather than merely mentioning it in passing.

### Three concurrent stories each owe an edit to the same per-agent prose region of `README.md`

**Area**: `flow`

**Observed**: `docs/CLAUDE.md` makes the root `README.md` the user-facing description of **every**
agent and requires it to be updated whenever an agent's behavior changes. Three sibling stories were
in flight at once, each changing a different agent definition
(`give-reviewer-a-worktree-review-contract`, `harden-researcher-evidence-discipline`,
`generalize-audit-findings-to-the-property`), so all three docs passes owed an edit to adjacent
`### <agent>` sections of one file across three unmerged PRs. The only coordination mechanism the
pipeline offers is a prose note in each spec ("whoever runs last must re-read the file"), which is
advisory and unenforceable — nothing detects the collision at dispatch time. The lead resolved it by
forbidding the README edit outright and having the docs pass flag it as undone, which is safe but
leaves the README drifting behind the definitions with no ticket tracking the debt.

**Suggested change**: give the flow a real mechanism for shared-surface docs under concurrency.
Cheapest option: when the `lead` detects a sibling story in flight that also changes agent behavior,
have the docs pass write the owed README hunk to a per-story file (e.g.
`docs/_pending-readme/<slug>.md`) instead of editing `README.md`, and add a board card to fold the
pending hunks in once the PRs merge — so the debt is tracked as work rather than as a paragraph in a
final report that disappears when the PR closes.
