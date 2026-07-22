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

### The simplify pass needs the governing spec, or it cuts spec-required content

**Area**: agent:reviewer

**Observed**: On `generalize-audit-findings-to-the-property`, `/simplify` was dispatched over the diff alone. The task's artifact was prose whose exact propositions are mandated clause by clause by the spec's Requirements scenarios (e.g. *"it says the restatement is what the fix is written against and the named examples only say where to start looking"*). The cleanup agents correctly identified that several of those clauses are restatements of neighbouring sentences and cut three of them. Every cut was a genuine redundancy and every one broke an acceptance scenario. The `reviewer` only caught it because it happened to read the spec afterwards to size the code review; had it not, a clean-looking simplify pass would have silently failed the acceptance gate a round later.

**Suggested change**: In `reviewer.md`, require the simplify step to locate the task's spec first and pass it to the pass as a constraint — *"these propositions are required by the spec's Requirements; redundancy between them is intentional and out of bounds for cleanup"*. Redundancy that a spec mandates is not a cleanup target, and the pass cannot know which redundancy is mandated without the spec in hand. This matters most for docs and agent-definition work, where the artifact is prose and the spec quotes it directly.

### A spec scenario that mandates a cross-agent promise needs the other agent's text cited

**Area**: agent:writer

**Observed**: On `generalize-audit-findings-to-the-property`, a Requirements scenario mandated that `writer.md` state a specific payoff — *"acknowledging such a criterion in Validation without an owner and a Tasks entry leaves it for a later audit round to find one criterion at a time"* — and the implementation stated it verbatim. The payoff is only real if some *other* agent honors the named owner. It does not: `auditor.md`'s acceptance-gate paragraph is unconditional (*"A criterion nothing in the work addresses is a finding even when everything that was built works perfectly"*), and grepping `owning mechanism` / `not the coder` / `Tasks entry` across `auditor.md`, `lead.md`, and `coder.md` returns zero hits. The scenario passed the readiness gate and the code review caught it only by tracing the claim into the sibling definitions by hand.

**Suggested change**: Add a `### Spec authoring rules` rule: when a scenario requires a definition to assert a consequence that some other agent has to realize — a gate treating something differently, a downstream pass picking work up — cite the sentence in that agent's definition that realizes it, or state the payoff only in terms the edited agent achieves on its own. A cross-agent promise no other definition carries reads as implemented while changing nothing, and the acceptance gate reads the card, not the sibling file that would have to honor it.

### A fresh reviewer cannot see what the previous round's fix replaced

**Area**: agent:lead

**Observed**: On round 2 of `generalize-audit-findings-to-the-property`, the caller asked the `reviewer` to verify that two round-1 findings had been correctly reworded. Per `lead.md`'s `## The commit model`, only the spec is committed (commit 1); everything else stays uncommitted until ship (commit 2). So round 1's pre-fix wording existed nowhere — not in `git log`, `git stash`, or the reflog — and the round-2 `reviewer` could only see the post-fix text. This has a concrete cost beyond weaker verification: the simplify pass proposed cutting a sentence in `writer.md`'s W4 rule that three of four cleanup agents independently confirmed was unmandated by the spec and redundant, but that sentence was plausibly *itself* the round-1 remediation for the flagged overclaim. With no way to tell a remediation from filler, the only safe call was to skip a legitimate cleanup — the simplify pass is silently degraded on every round after the first.

**Suggested change**: In `lead.md`'s `## The commit model`, commit each fix round in the story worktree the way the PR-review loop already does ("One commit per PR-review fix round"), or at minimum commit once after the `coder` applies a review round's findings. Then a fresh `reviewer` can diff round N against round N-1 and verify a reworded fix against the text it replaced. Alternatively, have the `lead` pass the previous round's findings verbatim when it dispatches the next `reviewer`, so the reviewer at least knows which sentences are remediations and must not be simplified away.

### The docs pass routes to doc categories the project may not have

**Area**: agent:writer

**Observed**: On the docs pass of `generalize-audit-findings-to-the-property`, `writer.md` step 3 gives a fixed routing table — capability behavior to "the feature docs", journeys to "the flow docs", UI/system design to "the design docs" — and step 4 says to fold the spec into "the right permanent home above", with the final report asking "which content went to features / flows / designs". This project has no such categories: `docs/CLAUDE.md` routes durable content to `PRODUCT.md`, `ARCHITECTURE.md`, and the root `README.md`, and additionally states that prose about how an agent should behave belongs in the agent definition and *not* in docs at all — so the correct outcome here was to create no doc. Followed literally, the routing table produces an invented `features/` entry restating the agent prose. The `lead` had evidently hit this before: its dispatch prompt spent a paragraph pre-empting it ("Do NOT invent a features/flows/designs doc entry that just restates the agent prose"), which is a manual workaround for something the definition should say itself.

**Suggested change**: In `writer.md`'s docs pass, state the categories as an example mapping rather than the target set — "route by kind (behavior / journey / design); the project's documentation conventions name the actual documents, which may be a different set entirely" — and add the case the table has no row for: when the project's conventions say the durable home for this content *is* the artifact that was already changed, the correct output is no new doc, reported as such. Mirror the same softening in the final-report template so it does not ask which of features/flows/designs received content when the project has none.
