# Architecture

How `ca77y-agentic` is assembled. Per-agent behavior is documented in the root
[`README.md`](../README.md); this file covers structure, contracts, and the constraints
that shape them.

## Repository shape

```text
ca77y-agentic/
|-- .claude-plugin/marketplace.json      # marketplace entry, lists both plugins
|-- plugins/
|   |-- ca77y-engineering/
|   |   |-- .claude-plugin/plugin.json   # Claude manifest (agents whitelist)
|   |   |-- plugin.json                  # root manifest, mirrors the Claude one
|   |   |-- skills/lead/SKILL.md         # the lead skill - the pipeline orchestrator
|   |   |-- skills/board/SKILL.md        # helps write/repair the ISSUE_TRACKING.md declaration
|   |   |   `-- references/              # loaded only to author an ISSUE_TRACKING.md
|   |   `-- agents/*.md                  # analyst, auditor, coder, qa, writer
|   `-- ca77y-library/
|       |-- .claude-plugin/plugin.json   # Claude manifest (agents whitelist)
|       |-- plugin.json                  # root manifest, mirrors the Claude one
|       `-- agents/*.md                  # clerk, librarian, researcher, scribe
|-- docs/                                # this documentation (work is tracked in Linear)
|-- .obsidian/                           # vendored vault config and plugins
`-- CLAUDE.md                            # repo maintenance rules
```

The agent Markdown files under `plugins/*/agents/` and the skills under
`plugins/ca77y-engineering/skills/` **are the product**. Everything else
is packaging, documentation, or vault state.

## The dual manifest

Each plugin carries two manifests in different locations so neither harness trips over
the other:

- `plugins/<plugin>/.claude-plugin/plugin.json` — the manifest Claude Code reads, and the
  only one that registers agents (it carries the `agents` array).
- `plugins/<plugin>/plugin.json` — the root manifest, which mirrors it; it carries
  `name`, `description`, and `version` only.

They must always carry the same `version`. They have silently drifted before; the root
[`CLAUDE.md`](../CLAUDE.md) carries the check to run before any push that touches a
version.

## How scoping works

Each plugin is its own root with its own `plugin.json`, and scoping must live there. A
marketplace entry's component fields are **not** honored as an override — a shared pool
with marketplace-level whitelists silently loads everything.

The `agents` whitelist *replaces* the default `agents/` directory scan. Only listed files
load, so unrelated Markdown in the plugin is never picked up as a phantom agent. That
whitelist lives in `.claude-plugin/plugin.json` and nowhere else — the root manifest has
no `agents` array and registers nothing — so adding an agent file without adding it to
the Claude manifest means it does not exist at runtime.

## The agent roster

Nine agents and two skills across **two plugins**, one group each:

| Plugin | Agents | Role |
| --- | --- | --- |
| `ca77y-engineering` | the `lead` and `board` **skills**, plus `analyst`, `writer`, `coder`, `qa`, `auditor` | idea → shipped PR |
| `ca77y-library` | `researcher`, `librarian`, `scribe`, `clerk` | grows and maintains the target project's Markdown research library |

The flow is `researcher → analyst → lead → writer → coder → writer`, with `qa`
(validation plus the local code review) and the `auditor` gating, and the independent
code review running on the opened PR. The `lead` is not an agent: it is a **skill the
user invokes in the main session** (`/ca77y-engineering:lead <task>`), and the main
session then orchestrates. Under it, `writer`, `coder`, `qa`, and `auditor` are all
**leaves it dispatches directly** — no pipeline agent dispatches or resumes another.
The library crew is dispatched directly by whichever agent needs library work — the
`researcher` within its own plugin, and the `analyst` across the plugin boundary,
optionally (see *Two plugins, one optional edge* below).

`board` is the second skill, and the only one nothing dispatches automatically: the
`lead` and the `analyst` **read** `docs/ISSUE_TRACKING.md` directly, at that fixed path,
rather than invoking anything — bindings for locate/read/search/create/transition (plus
comment and update where the project authorises them), the card shape, the status
vocabulary, the visibility rule, and the write authority all come straight from that one
file. Every other role reaches it the same way, with whatever access its caller granted —
see *Board access is granted per dispatch* below. It keeps the board a *declared*
dependency rather than a structural one — repo-local Markdown, a hosted tracker, or
nothing changes what the declaration says and nothing else in the pipeline.

**The skill itself remains, narrowed to authoring.** It no longer resolves anything per
run — there is nothing left to resolve, since every agent reads the fixed declaration
itself — but it stays a skill rather than collapsing into a line of prose, because its
authoring half is substantial: it owns `references/authoring-issue-tracking.md`,
[`PRODUCT.md`](PRODUCT.md) advertises it as the tool for writing a declaration, and it
remains a legitimate user-invocable setup and inspection entry point — collapsing it to
one line would orphan that reference. That reference is loaded on the **job**, not on the
declaration's absence: the skill pulls it in only when it is actually writing **or
repairing** a declaration — repair operates on a file that is present — and never when it
is only reading one back, which is what keeps an inspection invocation cheap. A user
invokes it directly to write or repair the
declaration, or to see what it currently says; the `lead` may reach it mid-run as a
**fallback**, never as a per-run step, when it finds no declaration at all — and even then
the skill refuses to write the file mid-pipeline, putting the recommendation in its report
instead. The `analyst` has no such route at all: its definition states outright that
reading the declaration is a file read with no skill to invoke, and where the declaration
is absent it returns its shaped stories in its report rather than reaching for anything.

## Board access is granted per dispatch, not held by role

Which agents can reach the board is a property of **the dispatch**, not of the agent. The
`lead` reads the declaration itself and holds whatever the declaration grants it. Every
other role is told what it has when it is dispatched:

| Role | Board access |
| --- | --- |
| `lead` | read, the two status transitions, comment, PR attachment, and the card-content updates the declaration authorises |
| `writer`, spec pass | read **and** search |
| `auditor`, in the `lead`'s spec-readiness gate | read **and** search |
| `auditor`, in the `lead`'s acceptance gate | **read** only |
| `auditor`, in the `analyst`'s story-advisor gate | read and search, granted by that caller |
| `analyst` | search, read, create |
| `coder`, `qa` | none |

The `auditor`'s three rows are the point of the model: one definition is dispatched by two
callers for three different needs, so its access cannot be a fact about the file — and
none of the three grants is empty. In the `lead`'s spec-readiness gate it needs read and
search: it performs the mechanical equality check against the card's own criteria (below)
and the readiness gate's own board-side duplicate detection. In the `lead`'s acceptance
gate it needs read but not search: the equality check still needs the card's own
criteria, but grading needs nothing about its siblings, so widening that gate to search
would let unrelated board content bear on grading. In the `analyst`'s advisor gate it
keeps read and search, because that gate's job includes board-side duplicate detection
too.

**One consequence has to be stated rather than left to lapse.** A `lead` run's board-side
duplicate check now has **two** homes: the `writer`'s sibling sweep during the spec pass —
searching sibling cards for provisioning collisions, and for relationship prose a settled
decision contradicts — and the `auditor`'s spec-readiness gate, checking whether the
artifact under review itself duplicates or overlaps work already on the board. Neither
subsumes the other. That is why the `writer` keeps **search** and not only read, and why a
sweep that could not run is reported as not run: a run where the sweep was impossible and a
run where it came back empty are otherwise indistinguishable in a report that states only
the result.

**The two agents whose access is decided by the caller that dispatches them, rather
than being a fixed fact about the agent, carry one canonical paragraph.**
`**Board access is granted by your caller.**` is byte-identical in `writer.md` and
`auditor.md`, guarded by the second `grep` in the root [`CLAUDE.md`](../CLAUDE.md) — the
first arrangement in *Four ways an obligation gets repeated* below. One statement is true
of both without divergence: your access is whatever the caller named, you read the
declaration yourself at its fixed path, and where the caller named nothing you have none
and say so. The `lead` skill deliberately does **not** join that pair — it reads the
declaration unconditionally, and says so in its own voice — so the pair stays two files,
not three.

## The card's acceptance criteria are pinned into the spec

The spec carries the card's `## Acceptance criteria` **verbatim**, one behaviour per line,
labelled `AC1`…`ACn`, stamped with the card identifier and the state it was read at.
[`_templates/spec.md`](_templates/spec.md) carries the section, and the spec's order is
`Goal → Acceptance criteria (verbatim transcription) → Design → Requirements → Tasks →
Already satisfied criteria`. The transcription section is dropped only where there are no
criteria to copy — a trackerless run, or a task naming no card, where the spec's own
requirements and scenarios are the standard; the already-satisfied section is dropped only
where every criterion needs work.

**What licenses the copy is a check, not a promise that it is faithful.** The standing
rule elsewhere in the pipeline is to name the card rather than restate its criteria,
because a paraphrase drifts toward what the work already does. A verbatim copy carries the
same failure mode unless something proves the drift did not happen — so the `auditor` runs
a **mechanical equality check** between the transcription and the card's own criteria,
itself, inside each gate that uses it: once inside the spec-readiness gate, before it judges
the mapping, and again inside the acceptance gate, before it grades any criterion —
including every re-audit round of either, since a fresh auditor each round would otherwise
grade an unguarded copy. It normalises only the rewrites the board itself performs on save
(on this repo's board, `-` bullets to `*` and bare URLs wrapped in `<…>`) and nothing else.
A mismatch is a **blocking finding** that routes to a **respec**, never to grading a stale
list. The check is mechanical, which is why it can sit ahead of grading in the same
dispatch — and the `lead` itself performs no check of its own over the card's criteria: no
comparison, no classification, no per-criterion read.

**Why the check lives in the gate and not in the orchestrator.** It sat in the `lead` for
one iteration and was moved back deliberately, so the reasoning is recorded here rather
than left in a spec that no longer exists. Three things decided it. The `lead`'s founding
boundary is that it never does an agent's work, and licensing it to compare the
transcription against the card took a carve-out written for exactly one caller —
*comparing two strings is not judging whether a criterion is met* — and a rule that needs
an exemption for one caller is a rule under strain; the carve-out is deleted rather than
defended. Every gate round is a **fresh dispatch**, so "on every round, including each
re-audit round" holds *by construction* once the duty sits inside the gate, where it was
previously an instruction the orchestrator had to remember twice per loop. And the reader
that grades against the transcription is then the reader that proved it matches, with no
trust hop between the checking party and the grading party. One cost is accepted and
named rather than hidden: the first check now happens inside the readiness gate rather
than at the spec-commit point, so nothing re-checks the copy between that gate passing and
the commit — the acceptance gate's own check is the next one. That window is also why the
spec-commit **format step** runs before the gate rather than immediately before the
commit (see *The commit model*): a formatter can rewrite text inside the transcription
block, and run in that window it would edit the copy after the only check standing
between it and history.

**A gate that can read the card still grades the copy.** Giving the `auditor` read access
raises the obvious question of why a frozen copy survives at all, and it survives for
reasons the access does not touch. The `AC1`…`ACn` labels are the pipeline's addressing
scheme — what a per-criterion verdict names, what a finding is filed against so the
`coder` knows which criterion it failed, what the mapping rule is stated over, and what
the already-satisfied section refers to — and a live card supplies no stable labels. The
`coder` and `qa` hold **no** board access at all, so the transcription is the only path by
which a criterion reaches the agents that must satisfy and validate it. And freezing is
what makes drift *detectable*: a gate grading the live card directly would absorb a
mid-build criterion edit as the new standard instead of failing on it.

One shipped constraint carries the independence of the whole arrangement: the `auditor`
**never edits the card it is gating**, whatever the declaration's write authority permits.
Against a gate with no board access that rule was inert; with read access it is what keeps
the judge separate from the standard, so it is the one sentence a later change to the
`auditor`'s access must not quietly relax.

**Ordering matters, because the spec pass may correct a criterion.** The `writer` is
authorised to fix a criterion the design proves unsatisfiable, on the card, during the
spec pass — the only safe moment, since no code exists yet to reshape it toward. The
transcription is taken **after** any such correction: taken before, it would freeze into
the spec exactly the criterion the design has just disproved, and the equality check would
then fail on the precise path the pipeline exists to support.

**Both gates work per label, and the mapping rule now admits a third disposition.** The
readiness gate checks the mapping both ways — every `ACn` maps to at least one requirement,
one scenario, **or an entry in the spec's *Already satisfied criteria* section**, and a
requirement mapped to no `ACn` is a finding unless the spec marks it deliberate scope — and
a criterion whose owning mechanism is **not a build step** maps validly under that rule
too: documentation the docs pass owns, a manual reproduction, or a step only the `lead`'s
own session can take. The third disposition is verified, not trusted: the gate opens the
file each entry names, and an entry it cannot verify is a **blocking finding, not a pass**,
at the same severity as a criterion with no disposition at all — an unchecked section would
otherwise be a way to retire a criterion without speccing it. The acceptance gate returns a
verdict **per `ACn`**, grading against the transcription rather than the card, reading the
card only as evidence about the copy; for an `ACn` in the already-satisfied section it
grades from that section's evidence plus `qa`'s reported re-validation result. Its
vocabulary is **four labels and no more — met, partially met, unmet, and mis-worded** —
the fourth for a criterion whose shipped work does what the design intends while the
criterion *as worded* does not describe it; the first three all grade the work, and
without a fourth the gate facing that case has to either fail correct work or pass
wording the work does not satisfy. And **every verdict it returns names the observation
that establishes it, `met` included** — the file and region read and what it said, or,
for a criterion in the already-satisfied section, that section's evidence plus `qa`'s
re-validation result. That obligation is what makes a `met` checkable rather than
asserted, and it is also how a criterion satisfied only because its antecedent never
arose says so in its own words: it is graded met with an observation recording that the
antecedent was false and nothing was exercised, rather than earning a fifth label.

**Why the fourth label is a verdict and not a correction.** The obvious repair — let the
gate fix the wording it found wrong — is barred from both ends: the `auditor` never edits
the card it is gating (above), and the declaration forbids correcting a criterion in the
window between the build and the gate that judges it. So the outcome cannot close inside
the run that finds it. The gate reports it in the verdict it returns — naming which
sub-case applies and quoting the criterion's own sentence beside the shipped text, since a
paraphrase bent into agreement is exactly how this defect hides — the `lead` escalates it
to the human in the PR description, the final handoff, and a comment on the card, and the
correction lands in a **later run's spec pass**, the window where correcting a criterion
is legal because no code exists yet to reshape it toward. That escalation is also the one
gate outcome a run proceeds past: the gate's own verdict is still *not ready*, and every
criterion graded unmet or partially met blocks exactly as before, but a run whose work is
right and whose wording is not ships having escalated rather than looping on a finding no
round can clear. Because the label is an escape hatch — an auditor that merely could not
verify something could reach for it instead of failing — it is bounded on all four sides:
failing work, a wrong design, and a criterion the gate could not verify are each graded
unmet (or reported unverified, the existing mechanism-verification mode) rather than
mis-worded, and its severity ranks *with* unmet, never below it. The same defect one gate
earlier — the spec's Design, or the region an already-satisfied entry names, contradicting
a criterion as worded — is a readiness finding routed straight to the `writer`'s spec
pass, because there the window is still open. The declaration records only that
consequence and names no verdict label: the vocabulary lives in the `auditor`'s own
definition, and a second copy of it in a document about write authority would drift.

**The already-satisfied section is shaped by what checks it.** Each entry names three
things, because each answers a different reader: **what satisfies it** — the file, or
files, that already make it true, and the commit where a commit is what settled it, which
is what makes the entry checkable rather than asserted; **what `qa` re-validates** against
the post-build tree, an observation and not a promise that the criterion was true once;
and **whether the task's own changes touch that surface**, since an entry that is also an
edit site is satisfied *and* at risk, and `qa` needs to know which entries those are
rather than treating all of them as inert. Re-validation sits with `qa` rather than with
the acceptance gate because `qa` runs the project's validation against the built tree as
its whole job, runs *before* the acceptance gate and on every fix round, and an
already-satisfied criterion the build broke is a regression — and regressions are `qa`'s.
The asymmetry is the point: parking a criterion here is *cheaper* to write than a
requirement but *more* exposed to checking, at two gates instead of one, which is what
stops the section becoming a place to retire work nobody wanted to spec. Entries are
marked `→` rather than the transcription's `—`, so the transcription's `- **ACn** — `
lines stay the only lines of that shape in the spec: the equality check is a mechanical
comparison, and a second `ACn` list sharing that prefix would put every entry in reach of
a comparator that greps for it.

**The transcription is run-local; the card stays the durable source.** It dies with the
spec at the docs pass, so a later fix run against an open PR grades against the card
again. The live drift window is therefore readiness gate → build: between the build and
the gate that judges it, the declaration already forbids editing a criterion at all.

## Two plugins, one optional edge

The library crew ships as its own plugin, `ca77y-library`, installable with or without
the pipeline. The seam is a **file** — a wiki page in the target repository — not an
agent call: `researcher` hands the `analyst` pages, not a return value.

The split was reconsidered and taken because the dependency graph across that seam is
almost empty. `ca77y-library` references nothing in `ca77y-engineering` — no board
declaration, no auditor, no worktree contract. In the other direction there is exactly one
edge: the `analyst` optionally dispatching `ca77y-library:librarian` and
`ca77y-library:clerk` for extra library context. That edge is **soft by construction** —
the `analyst` already reads wiki pages directly, so when the dispatch does not resolve it
reads them itself and reports that it worked without the librarian.

That softness is the invariant to protect, because nothing in a plugin manifest can
declare a dependency on another plugin. Two rules follow:

- **`ca77y-library` must never dispatch or assume a `ca77y-engineering` agent or skill.**
  It is the standalone half; keep it that way.
- **Every `ca77y-engineering` → `ca77y-library` dispatch must degrade.** A new one is
  only allowed where the caller has a documented fallback and reports having used it.
  A hard cross-plugin call would make the pipeline silently broken for anyone who
  installed it alone.

What the split buys: two independently versioned rosters, and a smaller agent set loaded
into the context of a session that only wants one of them.

## A flat topology — the orchestrator is the main session

The pipeline is deliberately flat, and the orchestrator is the **main session**,
running the `lead` skill. It dispatches every pipeline agent directly — `writer`,
`coder`, `qa`, `auditor` — and **no pipeline agent dispatches or resumes another**:
every worker is a leaf at depth 1. Each leaf does its one job and returns; the lead
**trusts that result** and never does the work itself, never re-checks it, and never
steps in when a dispatch fails (it retries or escalates). The `writer`'s docs are
trusted outright; its spec is gated by the lead's `auditor` before the build. The
carve-outs are commit hygiene on the lead's **own** commits — the step-3 format step and
lint floor over commit 1, and the step-8 validation run over the tree immediately before
the ship commit — and each of them routes a failure by owner rather than judging the work
itself; none grades a criterion or replaces a `qa` round. See *The commit model*.

The flatness exists because the harness does not support a nested orchestrator: a
subagent's children detach regardless of `run_in_background`, their completion
notifications route to the root session from any depth, a resumed child's report never
reaches a subagent parent, and subagents have no `TaskOutput` to collect with. The
`lead` ran as a subagent orchestrator until 1.9.0 and hit exactly that; the evidence
and upstream references are recorded in
[`issues/nested-subagent-result-routing.md`](issues/nested-subagent-result-routing.md).
Running the orchestrator in the main session puts it where the harness actually
delivers, by every collection path the pipeline uses: a fresh synchronous dispatch
returns its report as the tool result, a fresh background dispatch and a resumed worker
both wake the orchestrating session with a completion notification carrying theirs, and
`TaskOutput`/`TaskList` exist there for lost-report recovery. The trade is accepted:
one story per session, with parallel stories as parallel sessions over their own
per-story worktrees. Flatness is the skill's design, not a machine-enforced cap — no
depth-limiting environment variable is set anywhere.

The skill keeps its orchestration state on disk, **inside** the story worktree, at
`tmp/` (`tmp/ledger.md` for the pipeline ledger, `tmp/findings-round-<N>.md` for
oversized findings), and hands workers **paths, not content** — so a compaction or
restart mid-pipeline recovers from the ledger plus `git log`, and the committed `tmp/`
ignore entry keeps orchestration files from ever entering a story commit. See *Run-local
scratch lives inside the story worktree* below for the rationale and the rejected
alternatives.

Three alternatives were evaluated against this one and rejected, and are recorded here
so they are not re-litigated from scratch. **Agent teams** were tried with the flag
enabled: experimental, 13–22% idle-notification token burn, no teammate restore on
`/resume`, and a poor fit for a sequential hub-and-spoke pipeline — they also fix the
lead to the main session and forbid nested teams, so they do not restore the sealed
orchestrator either. **Staying nested with file-poll workarounds** means fighting an
open harness defect indefinitely, and no prose can reroute notification delivery.
**Dynamic workflows** are a larger rebuild; they remain a viable follow-up for
restoring the sealed-unit property — hand the lead a card, get back a PR — and nothing
in the flat topology forecloses that.

The heavy, fan-out **code review runs on the PR** (the Claude GitHub review), outside
the dispatch tree entirely; `qa`'s local review is a single-context pass.

The `analyst` and `researcher` are separate top-level orchestrators, **not** part of
the lead's tree: they run their own sub-dispatch — the analyst's advisor gate and
library lookups, the researcher's subquestion decomposition and library writes. Their
fresh, synchronous depth-2 dispatches are the pattern the harness delivers correctly;
the worker definitions' report-channel hygiene (final text is the report, never
`SendMessage` as a reporting or escalation channel) keeps those trees clean too.

## The dispatch model — mode is the lead's choice, per dispatch

The `lead` dispatches each of its workers in one of two modes, and the skill prescribes
**neither**. A **synchronous** call (`run_in_background: false`) blocks until the worker finishes and
its tool result *is* the report, in the dispatching turn — it keeps a gate sequential
and lands the answer immediately. A **background** dispatch frees the turn and delivers
the report later as a completion notification; its spawn result is also what hands back
the agentId that makes that worker resumable. The skill states what each mode buys and
leaves the choice to the lead, dispatch by dispatch. Those two collection paths — an
in-turn tool result, and a completion notification (from a background dispatch or a
resume) — are the lead's only waits, both bounded by an agent finishing, which is why no
sleep and no background Bash poll is a waiting mechanism anywhere in the pipeline.

Resumability is documented as a **fact that follows from the dispatch mode**, never as a
rule. A resume is a `SendMessage` by agentId, so it needs an id the dispatch actually
produced, and the lead's test is simply whether it holds one. What a resume buys is the
worker's preserved context across rounds — a benefit, not the only route. Every step
that routes findings back to a worker therefore names two carry-forwards of equal
standing: resume the worker whose agentId is held, or dispatch a **fresh** worker of the
same role carrying the spec path, the worktree path and its provisioning status, the
round's commit references, and the findings (inline, or by the findings-file path). The
only thing the fresh route loses is the previous worker's own context.

**Which roles are resumable at all is part of the model, and each definition states its
own side of it.** The two authoring roles carry context worth preserving across
rounds, so a findings round reaches the `coder` or the `writer` by whichever route the
lead has. Both definitions name the two routes as facts of **equal standing**, neither as
the exception, and give a freshly dispatched worker its inventory in both signs: what the
dispatch handed it — the findings inline or by path, the spec's path, the worktree and its
provisioning status, the round's commit references — and what it does **not** hold,
namely the previous round's context, its
reasoning and rationale and which findings it already rejected. With the negative half
stated, the direction that follows is enforceable: read the spec from its path and the
round's changes from the worktree and the commit references rather than recalling them.
Their reporting contracts are keyed on **the round, however it reached them**, never on
the route, so a fresh worker never has to infer that a rule written for a resume covers
the round it is actually running.

The two gates are single-route: every `qa` and every `auditor` round is a **fresh
dispatch, never a resume**, and both definitions say so outright rather than leaving it
to be inferred from how the lead happens to dispatch. For `qa` that is exactly what the
pre-ship round commits serve (see *The commit model*) — a fresh context diffs round N
against round N−1 instead of recalling it. For the `auditor` it is the point of the gate:
an independent critique re-reads the artifact on its own terms instead of anchoring on
the verdict it already gave. Neither file carries a "when resumed …" branch, since a file that states it is
never resumed cannot also instruct itself on being one; the report-channel rules those
branches used to carry — the final text *is* the report, and `SendMessage` is never a
reporting or escalation channel — survive on the single route.

**The routing contract is a semantic mirror, not a byte-identical one.**
`skills/lead/SKILL.md` is its authority, being the file that actually chooses a route;
the four worker definitions and the root [`README.md`](../README.md) restate it in each
reader's own voice. Unlike the worktree paragraph below, those wordings differ **by
design**, so no `sort -u` check can cover them and the mirror is held by rule instead: a
definition may assert a routing behaviour only where `SKILL.md` asserts it too, and a
change to one side enumerates every other side and says, per side, whether it changes now
or is carried as a named follow-up. The failure this guards against is not documentation
drift but a worker believing something false about its own situation — a definition
telling a freshly dispatched coder it was resumed with a build context it never had. A
mechanical guard is still unbuilt; making the rule bind is tracked as `SMR-183` on the
board (see [`ISSUE_TRACKING.md`](ISSUE_TRACKING.md)).

**Why the prescription was removed rather than inverted.** The skill once mandated
`run_in_background: false` on every fresh dispatch and, six lines later, called a resume
the only way to preserve a worker's context across rounds. Both could not hold: a lead
that obeyed the mandate held no agentId to resume by. The conflict stayed invisible until
the first findings round — by which point the coder's whole build context had been spent
— and was then observed failing exactly that way (`No transcript found for agent ID`,
role-name addressing rejected, an empty `TaskList`), leaving the lead to improvise a
recovery mid-pipeline. Mandating background everywhere would have reproduced the defect
with the opposite sign, forbidding the synchronous gate dispatches the pipeline's
sequencing relies on. What the files now hold is the absence of both prescriptions: no
sentence fixes a mode, and none assumes unconditional resumability.

The asymmetry underneath that — a synchronous dispatch surfacing no agentId to resume by
— is recorded as an **observation** from two runs, not a certified harness mechanism; a
controlled probe would settle it. The design deliberately does not rest on it: the
invariant that survives either answer is that a lead can only resume a worker whose
agentId it actually holds.

## Model and effort assignment

Models are pinned per agent in the agent definitions. The current split: `opus` for
`analyst`, `qa`, and `writer`; `sonnet` for `auditor`, `clerk`, `coder`, and
`researcher`; `haiku` for `librarian` and `scribe`. Effort is set on every
agent except the two haiku ones — it is unsupported there and setting it breaks dispatch.
The `lead` skill has no model of its own — a skill runs on the session's model, so
orchestration cost moves with the user's model choice (accepted: orchestration is
low-volume when handoffs are paths).

The frontmatter is the only source of truth for both. Note that nesting resolves a
subagent's model against the *main conversation* rather than the dispatching agent, so
an agent reached through a chain and carrying no `model:` of its own inherits the
session model.

## The story worktree contract

A story worktree is the pipeline's only workspace, and the `lead` owns making it usable.
`git worktree add` copies no installed dependencies, so **provisioning is part of
creating the workspace** — it happens in the `lead`'s workspace-creation step, before any
agent is dispatched into the worktree, and it is provisioning only: not running the
project's tests, validation, or build, which stay `qa`'s.

Provisioning **prefers inheriting the main checkout's already-resolved dependency state
over re-deriving it**, wherever the project's dependency layout allows; otherwise it runs
the project's own install/bootstrap step, discovered from project context. The rule is
stated as a shape, never as a command — the toolkit runs against arbitrary projects, so no
package manager, installer, or ecosystem may be named. The preference is not cosmetic: an
install that re-resolves can produce a different dependency layout than the main checkout
*from the same lockfile*, and so can break pre-existing tests the task never touched.
The recorded status is one of **three** values: **provisioned**, when the project's
install/bootstrap step ran and completed; **no dependencies required**, when the project
has no such step to detect; and **provisioning failed**, with the reason, when it has one
and the step did not complete. The run proceeds in every case. The middle value is stated
affirmatively — a property of the project, not the absence of an action — because any
label shaped as a negation of provisioning collapses it with the failure case, and
the two mean opposite things: nothing was needed, versus something was needed and is
missing.

**The resulting status is part of the handover, and the receiver branches on it.** Every
dispatch that names a worktree names its dependency-provisioning status alongside the
path, so a receiving agent knows *before* it runs a command whether the result is
trustworthy. **Provisioned** and **no dependencies required** are both trustworthy — the
agent runs the project's commands and draws conclusions from their output as it would
anywhere — and **no dependencies required** additionally generates **no report**, because
there is no gap to describe and a provisioning caveat there would describe nothing. An
agent handed **provisioning failed**, or a dispatch naming no status at all, treats
dependency-sensitive command output as untrustworthy and **reports that**, and does
**not** provision the worktree itself — self-repair by fresh install is
the exact move that breaks untouched tests, and only the `lead`'s creation step can prefer
inheritance over re-resolution.

Two further rules complete the contract. The repository root checkout is **readable** for
dependency and vendor sources — resolved dependency trees, installed type definitions,
vendored packages — when something is missing or ambiguous in the worktree, and **never
writable**; reading it that way never substitutes the root for the worktree as the review
or build target. And a project CLI is never invoked through a **bare fetch-and-run**
(`npx`-style, or any ecosystem's equivalent) from inside a worktree: the fetched CLI is
not the project's toolchain, and it fails with errors that read exactly like a real defect
in the file under review.

**All of this lives in one physical line.** The contract is a single canonical
`**Addressing the story worktree.**` paragraph duplicated byte-identically across
`coder.md`, `writer.md`, `qa.md`, `auditor.md`, and the `lead` skill's `SKILL.md` —
the skill creates the worktree and names it to every dispatch, so it carries the
paragraph verbatim; there is no shared-include mechanism across these `.md` files.
That placement is a constraint, not a style choice:
the drift check in the root [`CLAUDE.md`](../CLAUDE.md) compares exactly one line per
file, so a *sibling* shared paragraph would be invisible to it and would drift freely
across five copies. Carrying the obligation in the shared paragraph rather than at each of
the `lead`'s dispatch steps also makes it bind by construction — including sub-dispatches
the `lead` does not make itself — and puts the rule in the receiving agent's own
definition, which is where a "is this result trustworthy?" decision is taken.

**A harness may refuse writes until the session has isolated itself, and only one form of
entry is compatible with this contract.** `EnterWorktree`'s two forms are not
interchangeable. The **`name` form creates** a worktree — inside the harness's own
`.claude/worktrees/` directory, on a new branch — so using it on a story would leave the
story's own tree and branch behind. That is why relocating a story worktree to satisfy the
tool is refused outright: `SMR-140` weighed exactly that alignment and settled on
absolute-path addressing instead. The **`path` form enters** a worktree that already
exists, and on a session's **first entry from the launch directory** it accepts any path
registered in `git worktree list` for the owning repository — which is precisely what
`git worktree add` produces. So a `lead` whose harness refuses file writes until the
session has isolated itself has a move available that relocates nothing: enter the
worktree it just created, by `path`.

That move belongs to the `lead`'s own session and to no worker. A dispatched agent's
working directory is pinned at launch, and from there the `path` form is restricted to
worktrees under `.claude/worktrees/` — so the workers keep addressing the story worktree by
absolute path exactly as the canonical paragraph above says, and nothing in their handover
changes.

**The write guard itself is a stated assumption, not a documented contract.** No tool
description documents it; the only earlier record was a single background run that met
it and reported the refusal. This story's own run supplies a second, fresh data point
rather than leaving the record at that one.

**This run's observation: a background job whose guard never fired.** This session's
harness context stated it was configured to work **in place** rather than isolating into
a worktree, and its first write of the run — before any `EnterWorktree` call — succeeded
outside any worktree. **Dispatch mode: background job. Outcome: the write guard never
fired.** That is one branch of the guard's four-way partition — *background job, guard
never fired* — and it settles nothing about whether `path`-form entry clears the guard,
because the mechanism the guard would gate was never exercised. Recording the mode
alongside the outcome is what makes "the guard never fired" distinguishable from "the
guard was never attempted" — a bare outcome, with no mode attached, cannot tell the two
apart.

**The `path`-form question stays open, and here is why.** "Nothing shipped verifies that
`path`-form entry clears it either" — the sentence stood at `f87eedc`, and it **stays**.
Both that sentence and the write guard's own existence are written as *what the remedy is
when a harness demands isolation*, never as an instruction to isolate: an unguarded
session keeps working from the launch directory as before. The two outcomes that would
settle the open question are a run whose guard fires and finds entry by
`path` clears it, or one whose guard fires and finds it does not, and this run's guard did
not fire at all, so it is neither. Of the two branches that leave the question open, a
**background run whose guard never fired** is the one this run demonstrates; a
**foreground** run could not have met the guard in the first place, and is not what
happened here. Should a future run instead meet the guard and find `path`-form entry does
**not** clear it, that outcome is escalated as a **blocker** on this story, in addition to
recording which outcome occurred — never shipped as a quietly closed fact — per
`lead/SKILL.md`'s *Context discipline*. What would settle the open question is a live
background `lead` run that meets the guard and reports whether entry by `path` clears it —
the treatment [`PRODUCT.md`](PRODUCT.md) requires of any behaviour change, validated by
running the pipeline on a live project rather than by reasoning about prompt text.

**The write below was demonstrated, not asserted — and it does not touch the question
above.** Once this story's `.gitignore` entry landed, the `lead`'s own session performed a
real file-tool write to `tmp/` inside the story worktree and reported the result. That
write proves the **relocated scratch location is writable**. It is **not** evidence that
`path`-form entry clears the write guard, because on this run the guard never fired — a
write in a session no guard ever applied to would look identical whether or not `path`
entry clears anything. That mechanism stays the open assumption above.

**Where the remedy is stated.** For this repo's own maintenance, in the root
[`CLAUDE.md`](../CLAUDE.md)'s Worktrees section, which may name `.worktrees/<branch>`
concretely. In the product prose it is stated exactly once — in the `lead` skill's
workspace-creation step, where a `lead` is standing when the guard hits, its first write
being that step's ledger — with the open-PR fix run's recovery step pointing at it rather
than restating it, the third arrangement in *Four ways an obligation gets repeated* below.
The root [`README.md`](../README.md) describes the same step in the user's voice, as it does
every other agent behaviour. It sits deliberately
**outside** the canonical `**Addressing the story worktree.**` paragraph: the remedy is one
role's and reachable by no worker, and carrying it inside would force a five-file
byte-identical edit and put the drift check at risk for no gain.

## Run-local scratch lives inside the story worktree, at `tmp/`

The pipeline ledger and any oversized findings file live at `tmp/ledger.md` and
`tmp/findings-round-<N>.md`, **inside** the story worktree rather than beside it, kept
untracked by one committed `.gitignore` entry (`/tmp/`, alongside `.worktrees/`). Neither
name carries a branch qualifier: the earlier naming scheme — a per-branch filename in one
shared directory outside every worktree — existed only because that one directory held
every story's scratch at once, and it also nested unpleasantly whenever a branch name
itself contained a `/` (a `tokwieci/smr-…` branch produced a further subdirectory). Once
scratch moves inside its own worktree, each worktree already holds only its own story's
files, so the qualifier has nothing left to disambiguate.

**The rationale is the write boundary.** A session refused writes until it isolates (see
above) can write inside the worktree it just entered, and could never write a file
sitting in the old shared directory beside it — moving scratch inside the boundary is
what lets the ordinary file tools reach it, with no `bash` escape hatch required for any
scratch write. The guarantee that a commit step can never sweep either file into a story
commit is the **committed ignore entry itself**: any non-force staging command skips an
ignored path outright, a fact stated at that level rather than pinned to one specific
`git` invocation, since `lead/SKILL.md`'s commit model names no specific one either.

**The cost is durability, and it is real.** Scratch inside the worktree dies with it:
`git worktree remove` takes it, and this repo removes the worktree once a story's PR
merges. So `lead/SKILL.md`'s *Invoked on an open PR* recovery step rests on records
durable by construction instead — the card's handoff comment, the PR description, and
`git log` — treating a surviving `tmp/ledger.md` as a **bonus**, never something recovery
depends on. The SMR-184 ledger reached roughly 19 KB, which is exactly why the durable
record has to be the card and the PR rather than a file that can vanish with its
worktree.

**Four alternatives were rejected:**

1. **Keep the previous location — the shared directory beside every worktree — writing
   through plain single `bash` commands.** Rejected
   **on principle**: if the design must reach for a shell escape hatch because the tool
   that exists for writing files is refused, on a path taken before every dispatch and
   every turn end, the design itself is broken. It also rests on an unverified claim —
   that `bash` reaches outside the isolation boundary at all — evidenced only by the one
   background run above.
2. **A per-clone `.git/info/exclude` entry.** Unnecessary once a single committed entry
   is accepted, unverified for linked worktrees, and writing the main repo's `.git/` sits
   uneasily with the never-write-the-root-checkout rule even though `.git` is not the
   working tree.
3. **A pathspec exclusion at commit time** (`git add -A ':(exclude)tmp/'`). Needs no
   ignore file, but every commit step has to remember it, and forgetting once sweeps
   scratch into a story commit. The ignore entry buys the same outcome with nothing to
   forget.
4. **Reusing the worktree directory's own name inside the worktree.** Rejected: it
   depends on the target project's own ignore pattern being depth-agnostic rather than
   anchored, which the toolkit cannot dictate, and a `.worktrees/` nested inside a
   worktree reads as a mistake to whoever finds it.

## Two nets around published library prose

A dispatcher that cannot know the vault's state in advance writes an if/then into the
dispatch prompt — *"if a dedicated page on X exists by now, link it; if not, say a
deep-dive is in progress"*. Reproduced verbatim, that wording turns a reader-facing page
into instructions to its own author, and nothing in the crew was positioned to notice: it
is not a broken link, a missing tag, or an uncited claim.

The obligation sits with the **receiving** side, as two independent nets — a write-time
self-check in `scribe.md`, and a named default category in the `clerk`'s audit checklist
ranked as a critical library-integrity issue. Neither is gated on a dispatcher naming the
defect, on a human re-reading the page, or on the other net having run; the per-agent
wording is in the root [`README.md`](../README.md). No dispatcher-side constraint on
**conditionals** accompanies them: `researcher.md` and any other caller may keep writing
state-dependent conditionals, because a dispatcher genuinely cannot know a racing
sibling's state in advance — which is exactly why the check belongs to the agent that can
perform it. That claim is narrower than it once was. A dispatcher-side constraint does now
exist for **prohibitions**: a caller suppressing the `scribe`'s writes names raw-note-only
mode rather than prohibiting them in prose (see *One writer for the shared library files*
below). The two cases differ in who can settle them — a state-dependent conditional is a
question only the receiver can answer, while a prohibition is a decision the dispatcher
has already made and can therefore state as a mode.

Three constraints shape where that wording lives.

**The write-side sweep is scoped by authorship, not by file.** It covers the prose the
`scribe` writes in its own voice — wiki pages, `_meta/` prose, its own wording inside a raw
note — wherever that lives, and never the verbatim source text preserved under
`library/raw/`, which the crew exists to keep intact. It also governs published prose only:
a prohibition addressed to the `scribe` in a dispatch puts the `scribe` into raw-note-only
mode (see *One writer for the shared library files* below); the prohibition itself simply
never appears in a page.

**A defect class this toolkit defines belongs in the `clerk`'s audit-only checks.** Its
*Convention compliance* item is a checklist entry in `clerk.md` like any other, but the
detailed validity rules behind it are deliberately delegated to the target project's
`library/_meta/librarian.md`, and a second copy of them here is forbidden. A class the
toolkit defines — rather than one a target project's conventions define — therefore has to
be named in the audit-only list, the part of the checklist `clerk.md` owns outright.

**The two nets are not a canonical paragraph pair.** Unlike the worktree contract above,
they describe one defect from two sides — a self-check and an audit finding — and are
deliberately *not* required to match byte for byte. No drift check covers them and none
should be added; unifying the wording would fuse two different jobs.

## One writer for the shared library files

A `researcher` fan-out runs several children at once, and every child persists what its
dive turns up. Raw notes survive that: each is a distinct new file. The wiki page and the
three shared `_meta/` files — index, taxonomy, log — do not. They are single targets that
every child's `scribe` would write, so concurrent ingests are a lost-update race, not
merely a protocol violation.

Only the dispatching half of the answer existed. `researcher.md` already stated that
children write neither wiki pages nor the shared meta files, and that those are written
once, by the parent. The receiving half did not: `scribe.md`'s ingest workflow ended in
three unconditional meta-update steps, and nothing in the file said what happens when a
caller forbids exactly those steps. A prohibition in a dispatch was therefore prose
competing with a built-in step, with no stated precedence between them — and the built-in
step can win silently. It did: in a five-way fan-out, four children's scribes complied and
one updated all three meta files, with no signal that its default and its instructions had
collided.

**The fix is a named mode in the receiving definition, not a stronger prompt.**
`scribe.md` defines **raw-note-only mode**: it writes and updates raw notes under
`library/raw/` and does nothing else — no wiki page, no index, no taxonomy, no log.
Reading is untouched, because reading is not writing: resolving a wikilink target or
checking a tag still requires the vault's `README.md` and `_meta/` files, and the mode
suppresses writes to them only. Three properties make it do the job the incident exposed:

- **Precedence is unconditional.** An explicit caller prohibition on those writes always
  wins over the default step — no exception, no escape clause, no judgement call left to
  the `scribe` about whether the caller meant it. The whole failure was a default silently
  winning a contest the file never said it could lose.
- **A prose prohibition triggers the mode by itself.** Naming the mode is the tidy path,
  not the only one. Callers that predate the mode, or live outside this toolkit, keep
  wording the prohibition however they like and get the same outcome.
- **The conflict is signalled, not just obeyed.** The `scribe` reports which default steps
  it suppressed and on whose instruction, so a complying pass is distinguishable from a
  lucky one. A rule that changed only the outcome would leave the caller exactly where the
  incident's parent stood: unable to tell the two apart.

**The mode suppresses the wiki write as well**, which is more than the meta-file race
needs. It has to. The prose it replaces forbade children both halves, so a mode covering
only the meta updates would drop the wiki prohibition on the floor as the prose came out —
and would make the name "raw-note-only" false.

**The return closes the loop.** The mode reports the paths of the notes it left
un-indexed, as their own output item, stated to be the complete set the caller must index
later. The parent's single serialized write is handed that set as what to index instead of
rescanning `library/raw/` for it, and names any collected path the write leaves un-indexed
rather than reporting the run complete over it. What supplies that last part is the
full-ingest `scribe`'s own return: handed a set, it reports which paths it incorporated
into a wiki page and which it left un-indexed — a concept not durable enough to reuse
stays behind — so the parent's obligation to name the gap has a data source rather than a
guess. A rescan re-derives a worklist that was already known; a handed set is checkable
against what came back, in both directions.

**What the return depends on.** A child's report reaching the parent that dispatched it is
exactly the routing this harness does not guarantee for nested dispatch (see
[`issues/nested-subagent-result-routing.md`](issues/nested-subagent-result-routing.md)),
which is why `researcher.md` keeps a fallback of researching the subquestions sequentially
itself — and in that mode the parent persisted every note, so it already holds the set.
Where a fan-out does run, a path that never comes back is a missing-accounting problem the
fan-out parent owns; the `scribe`'s side of the contract is discharged by returning what it
wrote to whoever dispatched it.

**Every eager persistence uses the mode, the parent's own included.** `researcher.md`
claims the wiki write and the shared-meta updates happen once, serialized at the parent —
and that claim was false about its own file while the parent's own eager persistence ran
in the default mode, updating index, taxonomy, and log on each dispatch. Routing all of it
through the mode is what makes the claim true, and it makes the serialized write's
worklist complete: the set handed over is every note persisted during the run, not only
the children's. The post-audit fix rounds are the deliberate exception to the mode rule —
they are full-ingest, and the top-level parent's alone, because they run after the
serialized write with nothing else in flight and may need to touch a meta file to close a
`clerk` finding. Completeness holds across tiers rather than one level down: a mid-tier
child that fanned out forwards its own children's returned paths upward alongside its own,
and only the top-level parent ever hands the accumulated set to a full-ingest dispatch —
at any step, a child never dispatches a full-ingest `scribe` at all.

Two alternatives were rejected. A `no-meta` flag named in the dispatch prompt leaves the
default winning whenever a caller forgets the flag — the incident's exact failure under a
new name. Making the meta updates opt-in for every caller fixes the race by breaking the
common case: an ordinary single ingest would stop indexing itself, and every caller would
have to learn a flag to get the behaviour it already has.

**The mode's name is a shared literal token across two definitions.** `scribe.md` defines
it, `researcher.md` invokes it, and an invocation naming a mode the other file does not
define is a no-op that reads as satisfied — so when either file changes, the two spellings
are compared literally rather than by eye. No standing drift check covers this: the root
[`CLAUDE.md`](../CLAUDE.md) greps pin whole canonical paragraphs, not a token inside a
sentence.

## Four ways an obligation gets repeated

An obligation sometimes has to appear in more than one place. This repo uses four
arrangements deliberately, and reaching for the wrong one is how wording drifts:

- **Byte-identical duplication, with a drift check.** One canonical paragraph, one
  physical line per file, and a `grep` in the root [`CLAUDE.md`](../CLAUDE.md) that
  catches the moment two copies differ. Used when every copy must bind identically,
  because each agent acts on its own copy alone. Two paragraphs use it: the worktree
  contract above, across five files, and the caller-granted board-access paragraph across
  `writer.md` and `auditor.md`.
- **Deliberately different wording for two sides of one defect.** The two library nets
  above: a write-time self-check and an audit finding. No drift check covers them and
  none should — unifying the wording would fuse two different jobs.
- **Stated once, pointed at from everywhere else.** Used *within* a single definition,
  where no drift check exists at all. `writer.md` carries the docs pass's reconciliation
  duty in one subsection, and the numbered step that used to hold that content is now a
  pointer at it; `### Applying a finding` likewise cross-references the spec-authoring
  rule it hands off to instead of restating it; and the frontmatter-`description` rule
  below names the owning-mechanism rule it reuses rather than restating what an owning
  mechanism must contain. The `lead` skill's isolation step is the
  same arrangement: the isolation remedy stated once in workspace creation, pointed at
  from the open-PR fix run's recovery step (see *The story worktree contract* above).
  The spec-commit format step and lint floor are the same again, and there the
  single-statement property is not just tidiness but the criterion itself — *the
  definition names one owner* — so the rule lives whole in step 3 and *Boundaries*,
  *When a gate finds a problem*, and *Final handoff* carry only what each needs
  (the carve-out, the two routings, the outcomes to report) with the mechanism named
  once. What this avoids is a second,
  independently readable statement of the same duty in one file: both copies read as
  live, so an agent obeys whichever it reaches first and an edit to one silently leaves
  the other asserting the superseded version.
- **Derived text — one wording carried into another file under a closed substitution
  set.** Used where the same obligation binds two roles in different files, so pointing is
  impossible: an agent is loaded with its own definition alone and cannot follow a pointer
  into another agent's file. The three-outcome vocabulary for discovering a project's
  command is the case: `SKILL.md` step 3 states it, and `writer.md`'s *Checking your own
  output* carries the same sentences with exactly three substitutions — *say so in the
  handoff* → *say so in your report*, *concluding the spec is clean* → *concluding your
  docs are clean*, and *over commit 1's path set* → *over the files this pass authored,
  changed, or removed* — with the outcome labels and the `no dependencies required` clause
  crossing unchanged. Note that both of the other cross-file arrangements are unavailable
  here rather than merely unattractive: byte-identity is **false by construction**, since
  the two passages govern different commands, different scopes, and different report
  surfaces, so a `sort -u | wc -l` check would fail on a correct pair; and the two-sides
  arrangement above deliberately lets wording diverge, which is the opposite of what a
  reused vocabulary needs. **No mechanical check covers it today**, and that is a real
  hole rather than a design choice: the property is machine-checkable in principle —
  extract both passages by their stable anchors, `diff` them, and permit only the
  substitution set's spans — but nothing does it, so a fourth unlisted substitution or a
  dropped clause is caught only by reading the two passages side by side.

## Verifying that a mechanism was really removed

Removing a mechanism from the toolkit is a documentation problem as much as an editing
one, and the two halves fail differently. The mechanism's **name** occurs in a countable
number of places; the **claims about it** occur wherever prose happens to describe how
something is reached. Three lessons from the run that removed the per-run
board-resolution artifact are worth keeping, because the next such removal meets all
three again.

**A name sweep has to be wrap-aware and file-type-agnostic.** A per-line `grep` misses a
phrase split across a line break — two occurrences hid exactly that way on the last
removal, one in the root [`CLAUDE.md`](../CLAUDE.md) and one in this file — and an
`--include='*.md'` sweep misses both plugin manifests, whose `description` strings
describe skills in prose. The sweep that works normalises every whitespace run to one
space *before* matching, and selects files from `git ls-files` by extension rather than by
a glob over one type.

**A zero-target bare-word count is a one-off migration gate, never a standing check.** It
is the stronger of the two sweeps *during* a removal, because a bare word cannot be split
by a line break at all and so cannot be fooled by wrapping. But it has no allow-list by
construction: the moment the migration lands, the next piece of ordinary prose that
happens to use the word fails it — which happened twice on the last removal, to prose that
was perfectly correct. Retire such a count with the migration rather than promoting it to
a drift check.

**Neither sweep finds a claim that never uses the word.** A removed mechanism can still be
asserted in prose naming none of the removed tokens — "how the board is reached; the skill
resolves it" survives any count of the artifact's own name, and did, through a clean
`TOTAL 0`. So a removal also needs a **residue sweep over the verbs**: what the mechanism
*did*, in the words the docs use for it (resolve, discover, probe, cache), read across the
whole tree and judged by hand. There is no mechanical form of it yet, and it is precisely
what a green name sweep does not cover.

## When the deliverable is prose, not code

The build and validation steps were written for a repo with a test runner: the `coder`
writes one scenario test per spec scenario, and `qa` runs the project's validation
commands over the result. A toolkit whose deliverable is a Markdown agent definition has
neither, so on those tasks all three worker definitions were wrong about the medium, and
every run paid to override them in an ephemeral dispatch prompt the next `lead` never
saw. That override is now text in the product: `writer.md`, `coder.md`, and `qa.md` each
carry a named **prose-deliverable branch**, stated once per definition.

**The trigger is a conjunction of two independently observable facts**, so no agent has
to guess: the spec's Boundary content declares the deliverable a non-code artifact,
**and** the project's context supplies no test runner or validation command. Both must
hold. A deliverable that is only partly a document, on a project that has a test runner,
leaves the second fact false — so its code portions keep their per-scenario tests, and a
document in the change set never converts the whole task into a prose build.

**The first fact is new, and it is the `writer`'s half.** Without a declaration the
`coder`'s trigger is unreachable: it cannot infer "non-code artifact" from a spec that
never says so, and inferring it from the file extensions in the Tasks list is exactly the
guesswork the branch exists to remove. So the `writer`'s authoring rules require the
medium stated as a plain sentence in the Boundary content, in words a later agent can key
a branch off, and require every scenario's **THEN** to name an observation a reader can
make in the changed artifact itself rather than output a build would produce. That
content is referred to by **what it is**, never by a fixed heading name, so a project
whose spec shape places Boundary elsewhere is unaffected. Validation takes the matching
substitution: for a document deliverable the artifact's real consumers — the manifests
and loaders that read the file, its frontmatter, and the Boundary's changed-file set —
are what Validation must reach, in place of a build or typecheck step. It is written as
an extension of the existing consumer rule, not a second rule beside it.

**One inspectable assertion replaces one scenario test.** For each Requirements scenario
the `coder` records the file, the region a reader finds it by (a heading, a bold lead-in,
or a quoted phrase — never a line number, which the same pass's own later edits move),
and the exact quoted sentence in the changed artifact that satisfies it. The entry is
**per scenario, keyed to that scenario's own name**, because a quotation is otherwise
satisfiable by any plausible-looking line elsewhere in the file — the prose analogue of
the adjacent-test trap the `coder`'s pinning rule already warns about. A scenario nothing
satisfies is named as missing rather than omitted. Findings rounds take the same
substitution: a behavioural fix is pinned by the inspectable assertion it re-satisfies
where no test can exist to go red.

**The spec's own Validation checklist is what `qa` runs.** Where the project defines no
validation command, the checklist **is** the validation: `qa` runs every check it lists
and captures real output for each, the same way it would from a command — not a pass, and
not a missing prerequisite. Its gap-filling keeps its shape and changes its medium: the
gap becomes read-only checks the checklist should have had and did not — a real consumer
it never names, a criterion no line accounts for — which `qa` runs itself and reports **as
additions to that checklist**, never as new test files, leaving the spec for the `writer`
to amend. The branch reaches its validate, gap-find, add, and re-run steps only;
re-validating the spec's *Already satisfied criteria*, reviewing the diff, and reporting
need no branch, because each is already an observation made over files in the worktree in
either mode.

**A missing runner is an expected outcome, not a blocker — and it is the same
three-outcome vocabulary the spec-commit format and lint steps use** (see *The commit
model* below). Extending that vocabulary rather than inventing a parallel one is what
keeps its second and third outcomes apart, which matters more here than anywhere: **not
defined** is recorded and reported as the expected result, never escalated, and never a
reason to invent a command, add a test file the Boundary forbids, or keep searching;
**defined but not trustworthy here** — the worktree's provisioning is absent or negative,
or the command will not run — is reported as unrunnable, never concluded clean and never
folded into the first. Collapsing them is how an unprovisioned worktree's failed command
gets waved through as "this project just has no runner".

**The code path is the default and the branch is the exception**, stated that way round in
all three definitions. Where a project has a test suite, per-scenario tests and a `qa` run
are exactly what they were.

## A spec is written against a tree the same pass is editing

Several gate failures on one card came from a single root: the spec asserted something
about the tree that the pass's own later edits made false. They are recorded here because
the shape recurs on any task whose deliverable is the prose being checked, and one of them
survived a green acceptance grade.

**A *Validation* item states a command and a property, never a reproducible enumeration.**
"Every hit attributes the check to the `auditor` or to a gate" stays checkable; a hit list,
an entry count, or a line number is checkable only until the same pass edits what it
counted. Four rounds on one card failed on enumerations that were captured faithfully and
were stale by the time anyone read them — the last of them a baseline naming a line the
pass itself had deleted. A baseline hit list adds nothing a build cannot recompute at check
time, and it is the only part of an item that can be wrong. Where the property really is
about a count, cite the criterion that states the number rather than restating it.

**An already-satisfied entry names its region the way a reader finds it.** The section
heading, the **bold lead-in**, or a phrase quoted from the text itself — never a line
number, because `qa` and the acceptance gate open these against the **post-build** tree,
where any line the pass's own edits moved has already rotted: on this rule's first use a
removed section and an added one shifted a whole region, and entries citing it pointed at a
heading instead. Line citations pinned to an **immutable commit** — a spec's *Edit sites*,
read at the commit it was written against — are the exception and stay allowed, because a
commit cannot rot.

**An entry is verified by opening the region it names, never accepted on its paraphrase.**
Twice on one card an entry named a real file while the words in the entry were not the
words in the file, and one of those reached the acceptance gate and was graded *met*: a
paraphrase bent into agreement with the criterion reads exactly like a verified claim,
since the file it names is real. That is why the readiness gate's third disposition is
stated as *open the file and look*, and why an entry it cannot verify is a blocking finding
rather than a pass (see *The card's acceptance criteria are pinned into the spec* above).
It is also where a criterion whose own *wording* was the defect was first caught — the
criterion that forced the file open was the one that turned out to be wrong, not the
shipped text. That is no longer where such a criterion has to be discovered: both gates
now carry a named outcome for it — **mis-worded** at the acceptance gate, a finding routed
to the `writer`'s spec pass at the readiness gate, both stated in that same section — and
this duty is one place that outcome gets reached from, not the incidental route it once
was.

## A spec's claims about the current tree are measured, not inherited

The section above covers a spec asserting something about the tree that the pass's own
later edits made false. This one covers the neighbouring root: a spec asserting something
about the tree that **was never observed at all**, taken over from the card that asked for
the work. Two failure modes come out of it, and both cost a whole run. Acceptance
scenarios can be green before a line is written, because the gap the card described was
already closed. And a Boundary can exclude the very file the build must edit, because it
rested on a check somebody assumed was passing. The `writer`'s spec-authoring rules
therefore require the measurement rather than the claim, and the obligation is authoring
prose in `writer.md` — there is no mechanical guard and no CI check behind it.

**Declared state is not effective state.** A claim that the system *lacks* a capability is
checked against the **built, merged, or effective** artifact that would carry it, never
only against the source that declares it: the two come apart at any layer that transforms
one into the other — plugin defaults, codegen, framework auto-configuration. The layers
are named generically, because the toolkit runs against arbitrary projects: naming a
framework a project does not use, as a thing the rule requires, would be exactly the
hardcoded assumption the rest of the pipeline forbids. Where the project has a command
that renders effective state — an introspect or resolved-config dump, a build output, a
`--showConfig`-style dump — it runs against the **unmodified** tree during the spec pass
and the measured baseline goes into the spec, so the `coder` and the acceptance gate scope
their assertions against observed state rather than against the card's.

**A Boundary exclusion resting on an existing command's current result is measured before
it is written.** That is the second trigger, and it is a different one: a CI gate, a
pre-commit hook, or a smoke check whose *current* result the spec's value depends on. The
command runs in the story worktree first, and its observed result is recorded. An
equivalent baseline **already measured and handed to the `writer`** satisfies the run in
place of a fresh invocation — provided the spec records which of the two its stated result
came from, since "we ran it" and "we were told" fail differently. That clause is what lets
a future lead-side base-commit baseline (`SMR-169` on the board) compose with this rule
instead of duplicating its run.

**When that command fails, the failing file is in scope by definition.** The spec's
Boundary names it as in scope and the spec's Deviations content records it, rather than
deferring it to an escalation the build has to override anyway. A boundary the build is
guaranteed to breach is not a boundary; it is a defect handed forward one stage, where the
acceptance gate then reports the omission.

**The measurement never mutates the tree it measures.** Any such command runs through the
project's own provisioned toolchain — never a fetch-and-run substitute, by reference to
the ban the canonical worktree paragraph already carries rather than a second copy of it —
and in its check-only or otherwise non-writing form where one exists. And it records which
of the pipeline's **existing three outcomes** it took: *defined and runnable*, *not
defined*, or *defined but not trustworthy here*. That is the same vocabulary the
prose-deliverable branch and the spec-commit format and lint steps use (see *When the
deliverable is prose, not code* and *The commit model*), extended rather than paralleled,
which is what keeps its second and third values apart here too: a project that defines no
such command is the expected case, recorded and never escalated, while a command that
exists but cannot be trusted — the worktree's dependency-provisioning status *provisioning
failed*, or no status named at all — is reported unrunnable and never written down as a
clean baseline.

**Where nothing can render the state, the claim is a marked assumption.** It is neither
dropped nor asserted as fact: it says why it could not be measured and what would settle
it, exactly as the dependency-citation rule already handles a claim it cannot cite. The
mirroring is deliberate — a second, unrelated convention for unverifiable claims would
leave a reader deciding which one applies. The same reasoning fixes where the rules sit:
both new rules go inside the span the dependency-citation rule opens and the
alternative-cause rule closes — four consecutive paragraphs in `writer.md`, in this
order: dependency-citation, the current-state measurement rule, the pre-handoff
self-check, the alternative-cause rule. Three of those four are the evidence-discipline
list proper, and reading them in order gives the intended sequence — a dependency's
behaviour, then the project's own current state, then what else could have produced the
outcome — rather than a second citation regime bolted on elsewhere. The self-check is the
third of the four paragraphs, sitting inside that span while deliberately **not** being
one of the three list items: it is a check the `writer` runs over its own draft, not a
rule about what evidence a claim must carry, and it is placed directly after the
measurement rule because both turn on the same question of what the tree already does.

**The draft is then self-checked against today's tree.** Before handoff the `writer` asks
of **every** requirement: *would this scenario pass against the tree as it is today?* A
scenario that would already pass is not testing this task. The check names a disposition
rather than only diagnosing: a criterion needing nothing built moves into *Already
satisfied criteria* with the evidence that section already requires (see *The card's
acceptance criteria are pinned into the spec* above), and otherwise the scenario is aimed
at the wrong observation and is rewritten so it would fail against today's tree. It is
the runnability rule's complement, not a restatement of it — *"every
acceptance scenario must be runnable inside the spec's own Boundary"* asks whether a
scenario **can execute**; this one asks whether it would **already pass**, and a scenario
can fail the second while passing the first.

**Requiring the measurement forced one boundary to be redrawn in the same pass.**
`writer.md`'s *Boundaries* said outright *"do not run the test suite"*, which would have
left the definition carrying one instruction requiring a measurement and another
forbidding it — the precise defect the `writer`'s own reconciliation rule exists to
prevent, in the file that states the rule. The line now drawn is between two different
runs: the `writer` may run the project's own commands **read-only, in their non-writing
form, against the unmodified tree**, and validating a build stays `qa`'s. Measuring what
the tree already does before a line is written is not validating a build, and it leaves
[`PRODUCT.md`](PRODUCT.md)'s *nothing signs off on itself* untouched — there is no work of
the `writer`'s own for the measurement to sign off on yet.

**What is deliberately not built: a gate-side check.** The `auditor`'s readiness checklist
carries no matching item, so an unmeasured gap claim is not *reported* by the gate — it is
only prevented by the authoring rule. That asymmetry is stated rather than left to be
discovered, and closing it is a follow-up on the board rather than part of this mechanism.

**On this repository the rule takes its quietest form, and that is worth stating.** An
agent definition has no build, merge, or codegen layer between the file and what the
harness loads — the Claude manifest registers `./agents/<name>.md` **by path**, and the
root manifest registers nothing (see *How scoping works*) — so declared and effective
coincide and reading the definition end to end *is* the measurement. And the repo defines
no command that renders effective state and no repository command at all, so a run here
takes the *not defined* outcome, the same way it does for validation, format, and lint
(see *Working on this repo with the pipeline*). The mechanism therefore ships largely
unexercised on its own source, like the format and lint steps before it.

## A definition file's frontmatter is inside its edit-site enumeration

A spec that enumerates the edit sites inside a definition file is drawing the scope the
`coder` is dispatched to, and anything in the file outside that list has no owner by
construction — a `coder` leaving it alone is correct behaviour, not an oversight. The
frontmatter `description` sat outside every such list, and it is the one field in the file
that is not prose about the work: it is the surface other agents read when choosing a
dispatch, so a behaviour change landing in the body while the `description` keeps stating
the behaviour it replaced ships **wrong product surface**, not merely stale prose. Nothing
in a run closed that gap unless a human named the field by hand in a dispatch prompt.

The `writer`'s spec-authoring rules therefore fold the field into the enumeration instead
of adding a pass over it — one line at the top of a file the enumeration already has open,
read while the sites are being listed. Where the task changes behaviour the `description`
also states, the spec's author, never the `coder`, takes one of exactly two dispositions:
the `description` joins the enumerated sites, inside the scope the `coder` is dispatched
to; or it gets a named owning mechanism and a Tasks entry marked as not the `coder`'s
task, the same treatment a criterion no build step can close already gets (see *The card's
acceptance criteria are pinned into the spec* above). Between them no case survives in
which a `coder` must choose between staying in scope and knowingly leaving a contradiction
behind. The unaffected case is recorded rather than left silent — a `description` the
change falsifies nothing in is written down as checked — so *checked and unaffected* stays
distinguishable from *never opened*, which a later reader cannot otherwise recover from
the spec.

The rule governs **any** definition file whose frontmatter carries a `description`, an
agent or a skill, rather than agent definitions alone: a skill's `description` is what
decides when it is invoked, so the mechanism is identical and a rule split by file type
would leave the same gap open one type over. As with the rest of the spec-authoring rules
there is no mechanical guard behind it, and deliberately no gate-side counterpart — the
`auditor`'s readiness checklist carries no matching item, so a stale `description` is
prevented at authoring time or not at all.

## The commit model

The `lead` — the orchestrating main session — is the only place commits happen; no
worker commits. Work happens in one worktree on one story
branch under the repo's worktree directory; the repo root stays on its base branch, and
that worktree is provisioned at creation (above).

The commits a run produces, in order: the spec; the **spec-format-fix commit**, on the
runs where the lint floor below finds something to fix; one per **pre-ship round** — the
`coder`'s initial build, then each `qa` and acceptance-gate fix round; the **ship
commit**, carrying whatever is still uncommitted at PR time (by then mainly the docs and
the spec's removal, plus any fix the ship-time validation run below surfaces — that run
happens *before* this commit is created, precisely so its fix folds in rather than
becoming a commit of its own); then one per PR-review fix round. The count therefore varies with
how many rounds ran, rather than being fixed at two. The spec gets its own commit
precisely because the docs pass later folds it into durable docs and deletes it; without
that commit it would never appear in history.

The pre-ship round commits exist because every `qa` and acceptance-gate dispatch is a
**fresh** context. Without them, a round-2 dispatch inherits one undifferentiated
working tree holding the build and every round folded together, and cannot answer the
question its own dispatch asks — *what did the coder change in response to round 1?*
With them, the `lead` hands each fresh dispatch two commit references and it diffs round
N against round N−1: cheap, exact, and enough to check the coder changed **only** what
was reported. It is the same mechanism the PR-review loop already used, applied one
phase earlier. Round commits stay local in the worktree — there is no remote branch to
push to until the PR opens.

Three details of the design are deliberate. The **build** is committed before the *first*
`qa` dispatch, not just after each fix round: without it, round 1's fix lands fused with
the build and the first isolable diff only arrives at round 3 — exactly the blindness the
rule exists to remove. A round is committed **when the `coder` reports back**, whether or
not another dispatch follows, since the terminal round — the 3× cap reached and the
`lead` escalating to a human — is when the diffable history is needed most. And a round
stays **one** commit whose message names its composition (which round's findings it
applies, and any tests the previous `qa` added), rather than being split into coder and
qa commits: the reader of the diff needs to tell the hunks apart, which the message does,
without doubling the commit count. Keeping the branch at literally two commits by
amending and recording the pre-amend SHA was rejected — it makes the baseline a dangling,
unreachable commit that `git gc` may prune, and the PR-review loop already put the count
above two, so "two commits" described the model's *shape*, not a ceiling.

A consequence worth stating: an interrupted run now has each completed round in git, not
just in the worktree. The worktree already made an interruption lossless; the round
commits also make the work *legible* after one — the history shows which rounds landed
and what each changed, instead of one working tree of merged edits.

**Commit 1 is formatted before it lands, and linted once after.** The spec commit was one
of the two commits in a run that nothing had ever checked — the ship commit, below, is the
other, and it was closed later and separately. The `writer` creates no commits
and the `lead` committed without formatting, so nothing
between them owned the project's format step — and on any project whose gate covers
documentation, that commit could turn the gate red before the `coder` wrote a line. The
first agent to meet the failure was `qa`, at step 5, two agents and one build
downstream, and it had to bisect back to a document nobody had told it about before it
could report the build honestly.

Both halves of the fix are the `lead`'s and are stated once, in `lead/SKILL.md` step 3.
It runs the project's **format step** over commit 1's path set before **every** dispatch
of the spec-readiness gate — including each re-audit round, so every gate judges the
bytes that would be committed if it passed — and the project's **lint command** once as
a **floor** after commit 1 and before the `coder` is dispatched at step 4. The
alternative — the `writer` returning a spec already formatted to the project's style —
is deliberately not taken, because a `writer`-side rule covers only text that `writer`
itself last wrote, while a rule anchored at the collection point covers every route a
revision can arrive by; naming both would leave the owner ambiguous, which is the whole
defect.

**The scope is commit 1's path set, not the spec path.** The set is every non-ignored
path the worktree shows as modified or added at that point: the spec, plus whatever else
the spec pass left behind. In practice the other member is
`docs/AGENTS_IMPROVEMENTS.md` — every worker's *Process feedback* rule directs an append
there inside the story worktree, and that path is tracked, while the pipeline's own
`tmp/` scratch is ignored and never joins the set. This is the normal case rather than an
edge one, and stating the rules over the spec path alone left a real hole: commit 1 can
land a document that fails the gate without the spec being it. The same set serves three
rules — the format step's scope, its collateral check, and the floor's attribution — so
it is defined once. The set is read afresh from the worktree's status each time it is
needed, including **immediately before staging**, since the `auditor` carries the same
*Process feedback* rule and can append to `docs/AGENTS_IMPROVEMENTS.md` — normally
already a member of the set from the writer's own pass — or add a new path, while the
gate is in flight; the format step runs over whatever is **newly added or newly
modified among the set's non-spec members**, never over the spec the gate has just
judged.

**The collateral check is before-and-after, not a snapshot.** The `lead` captures the
modified-path set immediately before invoking the format command and compares after; only
a **newly** modified path is collateral, and it stops and reports rather than committing
it. A snapshot rule — *after the step, nothing but the spec is modified* — halts on
writes the format step never made, which is what a path already modified when the step
began, `docs/AGENTS_IMPROVEMENTS.md` being the usual one, always is.

**The format step sits before the gate, not immediately before the commit.** Step 3's
closing clause — *the gate that just passed already proved the transcription matches the
card, so there is nothing left for you to check first* — forbids inserting anything
between the passed gate and the commit that re-checks the criteria or modifies the spec,
so formatting there would make the file argue with itself two screens apart. Placing the
step earlier is not merely compatible, it is better: nothing writes to the spec between
the format step and commit 1 (the gate reads and returns a verdict), so every path the
commit lands still carries that step's output wherever the step ran at all — and it puts
the one dangerous interaction in front of the agent that owns detecting it. A Markdown
formatter can rewrite text *inside* the verbatim transcription block; run before the
gate, that surfaces as the `auditor`'s mechanical equality check failing, routed to the
`writer` for a respec, capped by the 3× rule. Run after, the same rewrite would be
committed and then rejected by the *acceptance* gate at the far end of the run, for a
purely cosmetic reason. One route escapes the gate and is named rather than left
implicit: a `writer` fix made in response to the floor, after commit 1. It is
re-formatted like any other spec edit, re-enters the spec-readiness gate where it touched
the transcription block, and where it did not, the acceptance gate's own equality check
is the stated backstop.

**Both commands are the project's, and both take the same three outcomes.** The rule
names no tool — not a formatter, not a linter, not a package-manager script — and
discovers each command from project context, the same way the rest of the pipeline
discovers a project's validation commands. The outcomes are: **defined and runnable**,
run it and act on the result, using the path-scoped form where the command accepts paths
and the check-only form where it cannot be scoped, never a repo-wide write; **not
defined**, a stated outcome rather than a failure, skipped and said so in the handoff,
and never a reason to invent a command — a gate that exists only in CI is this case, and
reporting it as such is what keeps *`qa` found no spec-caused failure* from being read as
*the spec was checked and passed*; and **defined but not trustworthy here**, where the
worktree's dependency-provisioning status is *provisioning failed* or absent and the
command depends on it, or the command will not run — reported as unrunnable rather than
concluded clean, with the standing ban on a fetch-and-run substitute still in force. A
status of *no dependencies required* is **not** this case: nothing the command needs is
missing, so it is trusted the same as *provisioned*. The floor takes all three, not
merely the absence handling, and that matters most for the third: a lint run whose
worktree status is *provisioning failed* or absent typically emits output naming the
file it was pointed at, which a naive
attribution would read as a commit-1 failure and misroute to the `writer` as a spec
defect. Trustworthiness is therefore settled **before** attribution, and an untrusted run
is attributed to nobody. Every other command the pipeline discovers now takes the same
three outcomes, for the same reason, stated in each definition rather than in a dispatch
prompt: the `coder`'s and `qa`'s **validation** (see *When the deliverable is prose, not
code* above), the `writer`'s **docs-pass self-check**, and the `lead`'s **ship-time
validation run**. One vocabulary across all of them is what keeps its second and third
outcomes from collapsing into each other — *not defined* reported as a stated outcome, and
*defined but not trustworthy here* reported as unrunnable rather than waved through as
clean.

**The floor runs unscoped but attributes narrowly.** A repo-wide lint is not
automatically attributable — a base branch that was not already clean fails on files the
run never touched. At this point attribution is still cheap, because the run has landed
exactly one commit and its path set is known: a failure naming **any** path commit 1
landed is this run's, routed to the `writer` and committed as the spec-format-fix commit
before the `coder` is dispatched; a failure naming **only** paths outside commit 1 is
pre-existing, recorded and relayed in the handoff, never routed, never fixed, and never
allowed to stop the run. Silently fixing the second kind would put collateral into a
story branch that did not ask for it. The floor runs **once per run**, at that one point
— not per round.

**The ship commit was the other one nothing had ever read, and it is now validated before
it is created.** Formatting and linting commit 1 closed the front of the run; the back of
it stayed open, for two reasons that compound. The **docs pass writes after `qa`'s last
round and after the acceptance gate**, so the one pass whose whole output is documentation
produced files no agent in the run was positioned to read — on a project whose gate covers
documentation, that could turn a PR red with the run already over. And an
**acceptance-gate fix round's commit** is committed and then judged only by the `auditor`,
which grades criteria and runs no validation, so it too is unread unless a further `qa`
round happens to follow. What each commit is checked by:

| Commit | What checks it |
| --- | --- |
| Commit 1, the spec | step 3's format step (before every gate dispatch) and the post-commit-1 lint floor |
| The spec-format-fix commit (conditional) | re-formatted before it is committed |
| The `coder`'s build | committed before the **first** `qa` dispatch, so `qa` validates it |
| A `qa` fix round | committed, then the next fresh `qa` round validates it |
| An **acceptance-gate** fix round | the `auditor`, which runs no validation — nothing else, unless a later `qa` round follows |
| The **ship** commit | the step-8 validation run, over the whole tree, before the commit exists |

**Two steps close it, one on each side, and the pairing is the design.** The `writer`'s
docs pass ends with a **self-check** over the files that pass authored, changed, or
removed (`### Checking your own output` in `writer.md`), and the `lead`'s *Ship and hand
off* step 1 runs the project's **validation once over the whole worktree** before the ship
commit is created. Neither subsumes the other: the writer's is scoped by **authorship**,
so it catches a break while the pass that made it is still loaded and can fix it, and a
failure naming only files outside its own set is relayed as pre-existing rather than
fixed; the lead's is scoped to the **tree**, so it catches this class whichever agent
introduced it — including the acceptance-round commit above, which a run over one commit's
path set would miss. That tree scope is also why the card's own framing of the ship commit
as *the only commit no validation has ever seen* is close but not exact, and why the step
was built over the tree anyway: the inexactness is in the appositive, not in the ask.

**Neither step is a gate, and the surrounding statements are unchanged because of it.**
The `writer`'s docs stay trusted — `SKILL.md` step 7 still says there is no
docs-consistency gate, and `writer.md` still says its docs are trusted with no gate — and
the acceptance gate is still the **last gate the lead runs**, with the mis-worded
escalation still the one gate outcome a run ships past. A self-check judges only the files
the pass itself produced, adds no round, and reviews nobody else's work; the ship-time run
routes a failure **by owner** — docs to the `writer`, code to the `coder`, per *When a gate
finds a problem* — with the fix folding into the ship commit, and attributes a failure
naming only untouched paths to nobody. The 3× rule bounds retries on either; a failure that
survives it is named in the PR description and the handoff rather than looped on. This is
also why the arrangement does not violate *Nothing signs off on itself*
([`PRODUCT.md`](PRODUCT.md)): the writer is not gating its own artifact, it is running a
mechanical command over files it just wrote, and the artifact's only judge is still the
human reading the PR.

**Why these carve-outs survive where the equality-check one did not.** *The card's
acceptance criteria are pinned into the spec* records a carve-out to the `lead`'s founding
boundary being deleted rather than defended, on the reasoning that a rule needing an
exemption for one caller is a rule under strain. The distinction is what the exemption
lets the `lead` do. That one licensed it to *compare a criterion against the card* — a
judgement, on the standard the gates grade against. All three of these are commit hygiene
on the `lead`'s **own** commits: they read no criterion, replace no `qa` round, and
pre-empt no gate that already ran, and each routes a failure by owner instead of judging
the work itself. The step-3 pair is bounded by a path set the `lead` already owns, writing
only inside it and looking at no build; the step-8 run is scoped differently — over the
whole tree, immediately before the ship commit, with any fix folding into that same commit
— but it is hygiene on the commit it is about to create in exactly the same sense, and it
runs at a point where every gate has already returned. The format step
**authors nothing** — it is a mechanical normalisation of files about to be committed,
and where its output would change a document's *content* rather than its formatting, that
is explicitly not the `lead`'s to reconcile: the `auditor` surfaces it and the `writer`
fixes it.

**This repository cannot exercise any of these steps, and says so.** It defines no format,
lint, or validation command — no `package.json`, no lockfile, no `Makefile`, no formatter
or linter config, and no CI workflow that runs one — so every run of the pipeline here
takes the *not defined* outcome for the step-3 format step, the lint floor, the `writer`'s
docs-pass self-check, and the step-8 ship-time run alike. The `grep` drift and
cross-plugin checks in the root [`CLAUDE.md`](../CLAUDE.md) are **not** a substitute: they
are targeted verification snippets for specific paragraphs and dispatch names, not a
project-wide gate, and
pressing them into service as "the project's lint command" would report a check that was
never run. Taking *not defined* is the correct behaviour rather than a gap, but it does
mean each of these mechanisms ships unexercised on its own repo; the same caveat as *A run
does not exercise the definitions it is editing* below, from a second direction.
Exercising them against a project that does define a format, lint, or validation command
is a follow-up.

## The self-improvement channel

Any agent may append a concrete pipeline improvement to `docs/AGENTS_IMPROVEMENTS.md`, at
that fixed path in the target project's documentation area, created on first use. It is
opt-in: an agent writes only when it has something specific, and only after reading the
file so a point is never duplicated.

The notes are about *how the agents work*, never about the product feature being built.
They are harvested back into this repository by hand.

## Working on this repo with the pipeline

This repository is itself an Obsidian vault with the layout the pipeline expects, so the
toolkit can be run on its own definitions: in-flight specs in `specs/`, the spec and
story scaffolds in `_templates/`.

Its board is **Linear** — the `Agentic Claude` project in team `Smerfy` — declared in
[`ISSUE_TRACKING.md`](./ISSUE_TRACKING.md): bindings onto the Linear MCP tools, the card
shape, the two permitted transitions, the visibility rule, and the write authority. That
declaration is what every board-touching agent reads directly, at its fixed path, when
the pipeline runs here, so the repo doubles as the worked example of a **hosted** board
reached over MCP. The Markdown board that preceded it (`docs/tasks/`, 35 cards) was
migrated to Linear on 2026-08-03 and removed; git history holds the originals.

**Almost every task here is a prose deliverable**, which is why the branch above exists:
the product is a set of Markdown definitions, and the repo defines no test runner, no
build, and no validation command (no `package.json`, no lockfile). A run on this
repository therefore takes the *not defined* outcome everywhere the pipeline discovers a
command — validation, the step-3 format step and lint floor, the `writer`'s docs-pass
self-check, and the step-8 ship-time run — the `coder` records inspectable assertions
instead of scenario tests, and the
spec's own *Validation* section is what `qa` runs. That is the mode working, not a gap —
and it is why adding a test runner here to make the pipeline comfortable would falsify the
very case the branch was written for.

**A run does not exercise the definitions it is editing, and that is easy to forget here.**
A dispatched agent appears to be loaded from the **installed** plugin rather than from the
story worktree, so a story that rewrites an agent definition is gated and built by the
*previous* wording — a run of the pipeline on its own source is never a test of the change
it ships. The mechanism is an **assumption** about the harness, not something this
repository can cite: what was actually observed on the run that reversed the criteria
checks is the consequence, where the spec-readiness `auditor` compared the transcription
against the live card programmatically in two separate rounds while the wording in the
worktree gave it no board access to do so with. Two practical rules follow from it: a
rule shipped by a story cannot be relied on by that same story's own gates —
where it is needed there, the `lead` grants it explicitly in the dispatch and the spec says
so — and the first pass that can lean on a newly shipped rule is the next task's. Making
that hazard visible from inside a run is tracked as its own card (`SMR-187`).
