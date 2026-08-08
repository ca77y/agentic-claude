# Agents improvements

Append-only notes on friction in the pipeline itself — the flow, an agent's instructions, or a
skill. One `###` entry per concrete proposal.

Entries are triaged periodically: a solvable finding becomes an issue on the board (see [`ISSUE_TRACKING.md`](./ISSUE_TRACKING.md))
and a finding already resolved or foreclosed by shipped work is removed. Clearing an entry is part
of converting it, not a follow-up — see *The improvements log is cleared as it is converted* in the
root [`CLAUDE.md`](../CLAUDE.md). The log is empty when every recorded finding has been converted
or retired.

### The citation rule has no path for a claim about the harness itself

**Area**: `agent:writer`

**Observed**: On SMR-184's spec pass every load-bearing claim was about the **harness** —
`EnterWorktree`'s `name` versus `path` forms — not about a package in the project's dependency
tree. `writer.md:56` requires "a path-and-line reference inside that package's own installed or
vendored source", and the harness satisfies neither half: it is not in any dependency tree, and it
ships as one compiled binary (`~/.local/share/claude/versions/<version>`), so no line number
exists. The rule's escape hatch — mark it an assumption — understates what is actually available:
the tool description *is* readable from the installed binary with `grep -a -o`, at a pinned
version, which is a genuine citation, just not a path-and-line one. Marking a citable claim as an
unverified assumption is a worse outcome than citing it in the form that exists.

**Suggested change**: Add one clause to that rule for behaviour of the harness or any other
non-vendored, non-source-shipped dependency: cite the **installed artifact plus the extraction
command that reproduces the quoted text**, at the resolved version, in place of a path-and-line —
and note that a tool description can change between versions, so the spec states the mechanism
rather than pinning behaviour to a version. Keep the assumption marking for what genuinely cannot
be read, such as a runtime policy with no text in the artifact (the write guard in this same
story's case).

### The owning-mechanism rule has no category for the lead's own session

**Area**: `agent:writer`

**Observed**: On SMR-188's spec pass, one acceptance criterion required "a file-tool write to
`tmp/` inside the story worktree, made after the session has entered that worktree by `path`,
[to be] performed during this story's own run rather than asserted". No dispatched agent can
satisfy it: the observation is about the **top-level orchestrating session's own write path**,
so only the `lead` can perform it. `writer.md`'s rule *A criterion no automated build step can
satisfy gets a named owning mechanism* enumerates exactly two owners — "documentation the docs
pass owns, a manual reproduction someone has to run and record the results of" — and the
`lead`'s own session is neither. Worse, three neighbouring criteria needed the `lead`'s
observation (the outcome, and the dispatch mode the run was invoked in) as an **input to a file
the `coder` edits**, which is a shape the rule does not describe at all: the owner of the edit
and the owner of its content are different agents. The spec had to invent both categories to
keep those criteria mappable under the same pass's spec-gate rule.

**Suggested change**: Extend that rule's owner list with two cases. First, **the orchestrating
`lead`'s own session**, for a criterion about the session's own environment — its dispatch
mode, whether a harness guard fired, what its first write did — which no dispatched agent is
positioned to observe. Second, a **split-ownership** case: where a criterion's edit belongs to
one agent but its content is an observation only the `lead` can supply, the spec names both,
and says how the observation reaches the editing agent (the dispatch prompt) and what the
editing agent writes if it has not arrived. Both should keep the existing requirement of a
Tasks entry marked as not the `coder`'s task.

### A sweep-shaped criterion maps validly to a task list that covers only some of the files it sweeps

**Area**: `agent:auditor`

**Observed**: On SMR-188's build, `AC1` was sweep-shaped — "no shipped instruction tells a reader
to discover that path from context" — and the spec's task list enumerated per-file edits (T1–T24).
`auditor.md:24`'s spec-gate rule checks the mapping **both ways** between each `ACn` and the
requirements/scenarios, and that mapping was satisfied: `AC1` had requirements, and every
requirement had an `ACn`. But no rule checks that the *task list* covers every file the sweep
would reach. `plugins/ca77y-engineering/skills/board/references/authoring-issue-tracking.md` was
tasked at T3 for one named sentence only, so four separate sentences in that same file kept
teaching the discovery-from-context model `AC1` abolishes, and the build shipped them.
Requirement↔criterion mapping is the wrong altitude to catch this: the criterion was mapped, the
requirement was mapped, and the gap was between the requirement and the files.

**Suggested change**: Add one clause to the spec gate: where a criterion is phrased as a sweep
over a file class — "no shipped instruction", "no `.md` under `plugins/`", "all N files carrying
X" — verify the Tasks list either names every file that sweep reaches, or names the file set with
the exclusions and the reason. A criterion whose own *Validation* command would fail on a file no
task touches is a not-ready finding, not a build risk to discover afterwards. This is cheap to
check because a sweep-shaped criterion always implies a runnable command, and running it against
the base commit enumerates the file set the tasks have to cover.

### The findings file is the lead's write, but nothing says so where a lead would look

**Area**: `skill:lead`

**Observed**: On SMR-188's qa round 2, the dispatch prompt instructed `qa` to write its own
findings to `tmp/findings-round-2.md` inside the worktree, describing that as the branch's
shipped convention. The harness refused the write outright — a subagent is not permitted to
write report files, and must return findings as text. The shipped text is in fact correct and
unambiguous *about ownership*: `lead/SKILL.md:54` and `:56` are addressed to the `lead`, and it
is the `lead` that writes `tmp/findings-round-<N>.md` from the report a worker returns. But
neither `qa.md` nor `lead/SKILL.md` states that ownership as a rule anyone would notice while
composing a dispatch, so the misreading is easy and it costs a wasted worker round trip. Worse,
the refusal is indistinguishable at a glance from the refusal `lead/SKILL.md:56` says to escalate
as a **blocker on this story** — a lead that took it at face value would have escalated a
non-event and stalled the run.

**Suggested change**: Two clauses. In `lead/SKILL.md`'s *Paths, not content*, say explicitly that
the findings file is written **by the lead** from what the worker returns as text, and that a
dispatched worker is never asked to write it. And qualify the escalation trigger at `:56` so it
fires on a refusal *of the path or location* — the write guard, isolation, or a permission on
`tmp/` — rather than on any refusal whatsoever, since a refusal grounded in the caller's role or
the content's kind says nothing about whether the relocated scratch is writable.

### A cross-file *Validation* item that counts files must enumerate them

**Area**: `agent:writer`

**Observed**: On SMR-188, a *Validation* item asked for a whole-paragraph comparison of one shared
paragraph "across the ten files", giving the expected result (exactly two variants, in a 7/3
split) but never listing the ten paths. The obvious way to collect them — globbing the agent
definitions under `plugins/*/agents/` — yields **nine**, because the tenth carrier is a skill file,
not an agent. Nine files still produce two variants and still show a 3-file minority cluster, so
the under-covered run reports a clean pass that looks exactly like the correct one; only the
majority count differs, from 7 to 6, and nothing in the item says 7 is the number to expect per
cluster rather than just the split's shape. `qa` caught it here only by separately grepping the
tree for the paragraph and finding a tenth carrier the glob had missed.

**Suggested change**: When a *Validation* item asserts a count or a partition **over a file set**,
have the spec enumerate that set — inline, or as the exact command that generates it — rather than
naming its size in prose. A stated cardinality with no stated membership is checkable only by a
reader who independently rediscovers the membership, and the failure mode is silent: a plausible
glob that misses a member still satisfies the item's stated shape. This is the same hazard as the
sweep-shaped-criterion entry above, one layer down: there the tasks under-covered a file set the
criterion swept, here the check itself does.

### A known-stale file placed out of bounds needs a named owner, not just an exclusion

**Area**: `agent:writer`

**Observed**: On SMR-188 the spec's *Boundary* listed `docs/README.md` as out of bounds and a
finding if touched, while that file carried a sentence the story's own part 2 falsified. The build
correctly left it alone, both gates correctly passed — the criteria say nothing about it — and the
stale sentence shipped, surfacing only because `qa` noticed it in round 3 and routed it to the docs
pass by hand. The Boundary is written as a permission list, so a file on the out-of-bounds side
carries no obligation at all, even when the spec's author already knows the merged work makes it
wrong.

**Suggested change**: In the *Boundary*'s out-of-bounds list, distinguish "unaffected, do not
touch" from "affected, but not this pass's job". For the second kind, name the owner the way the
*Criteria no build step can satisfy* table already does — usually the docs pass — and give it a
Tasks entry marked as not the `coder`'s. An out-of-bounds file that the spec's own Design proves
stale is a scheduled edit, not an exclusion, and the pass that keeps it out of the build is the one
positioned to say who fixes it.

### A zero-target token count is a migration gate, and must be retired as one

**Area**: `agent:writer`

**Observed**: SMR-188 removed a mechanism whose name occurred 108 times, and its *Validation*
carried a bare-word occurrence count with a target of zero and, by design, no allow-list — sound as
the wrap-immune half of a migration sweep, since a bare word cannot be split across a line break.
Both `qa` rounds then tripped it on prose that was perfectly correct, because the removed token is
also an ordinary English word, and the docs pass had to keep checking its own new sentences against
a check whose real job had already finished. Worse, a clean `TOTAL 0` was read as "the mechanism is
gone" while a stale sentence asserting that mechanism in none of the counted words survived
untouched.

**Suggested change**: When a spec's *Validation* includes a zero-target token count, mark it in the
spec as a **one-off migration gate that expires when the migration lands**, so no later pass or
standing check inherits it — and pair it with a residue check over the mechanism's *verbs* (what it
did, in the words the docs use for it), stated as a read-through rather than a count. A token sweep
proves the name is gone; only the verb sweep proves the mechanism is.

### A Validation item must state a property, never a reproducible enumeration

**Area**: `agent:writer`

**Observed**: This is the entry *"A cross-file Validation item that counts files must enumerate them"* above,
overturned rather than narrowed. That entry's remedy offers two branches — enumerate the file set "inline,
**or** as the exact command that generates it". On `SMR-188`'s respec I took the inline branch and got it
wrong three separate times, each caught by a different gate round: a five-hit list where the item's own
command returned seven, because I had assembled it from an exploratory variant scoped to three paths; an
entry count that changed under its own citation because the same pass appended to the file it counted; and a
`grep -v '^./docs/specs'` filter that excluded nothing, because that `grep` prints paths with no `./` prefix
for the anchor to match. After the second of those I filed the remedy "paste the command's verbatim output,
with the commit it ran at" — and the very next round broke it: a sixteen-hit enumeration became fifteen
because **this same pass removed the file's only matching line with a later edit of its own.** The output was
captured faithfully and was still wrong by the time anyone read it.

**Suggested change**: Stop putting reproducible enumerations in a spec. A *Validation* item states the
**command** and the **property its output must have** — "every hit attributes the check to the auditor or a
gate" — and nothing else: no counts, no file lists, no line numbers. Where the property is about a count the
*criterion* itself states, cite the criterion rather than restating the number. The reasoning is stronger than
provenance, which is why it replaces it: any enumeration of a thing the same pass edits invalidates itself no
matter how faithfully it was captured, a baseline hit list adds nothing a build cannot recompute, and it is
the only part of the item that can be wrong. Same rule for a spec's own prose: where a count would fix the
scope of a sweep ("exactly five places state this"), have the check enumerate them at build time instead.

### An already-satisfied entry must name its region the way a reader finds it, never by line number

**Area**: `agent:writer`

**Observed**: `writer.md`'s new *Already satisfied criteria* duty requires each entry to name **what
satisfies it** — "the file, or files, that already make it true" — and says nothing about *how* to point
inside that file. On this rule's first use, ten of forty-nine entries pointed at line numbers
(`lead/SKILL.md:54-58`, `auditor.md:24`, `analyst.md:44`, `CLAUDE.md:56-58`, …). `qa` opens these in the
**post-build** tree, and the build had deleted an eight-line section and added a three-line one in one of
those very files, so several citations landed on a heading or on unrelated prose. The failure is silent in
the direction that matters: an entry pointing at the wrong line reads as a checkable claim, and a reader who
resolves it to whatever now sits there can grade a criterion from text that has nothing to do with it. The
spec pass fixed it by writing a *"Entries name regions, never line numbers"* preamble into its own section —
per-spec guidance that the next spec does not inherit, since the rule that creates the section carries no
such requirement.

**Suggested change**: In `writer.md`'s already-satisfied duty, require each entry to address its region the
way a reader finds it — the section heading, the **bold lead-in**, or a phrase quoted from the text itself —
and forbid a line number, with the reason stated: `qa` and the acceptance gate open these against the
post-build tree, where any line number the same pass's edits moved has already rotted. Line citations pinned
to an immutable commit (the spec's own *Edit sites*) are the exception and stay allowed, which is worth
saying in the same breath so the two cases are not confused.

### A lesson recorded as durable method and a lesson converted into a card are not the same act

**Area**: `flow`

**Observed**: A docs pass on `SMR-188` recorded three method lessons in `docs/ARCHITECTURE.md` while the
matching `###` entries here stayed, because each entry's *suggested change* is an edit to an agent
definition that still needs a card, and only the *reasoning* had found a durable home. The previous docs
pass on the same story had already done exactly this — `ARCHITECTURE.md`'s "A zero-target bare-word count is
a one-off migration gate" is the same pairing — so the pattern is established by precedent and written down
nowhere. Read literally, *The improvements log is cleared as it is converted* points the other way: the
lesson now has a durable home, so an entry with no card looks converted, and deleting it would discard the
pending instruction change while leaving its rationale sitting in an architecture doc that no agent obeys.
The rule's two stated exemptions (a `Duplicate`/`Canceled` card, an analyst declining to file) do not cover
this case.

**Suggested change**: State in the clear-as-you-convert rule that recording a finding's *reasoning* as
durable method is not conversion — an entry clears only when a card carries its **suggested change**, or when
shipped work has already made that change — and that the two often happen in different passes, the docs pass
taking the rationale and a later triage taking the instruction edit. Say it in the rule rather than leaving
it to precedent, since the pass positioned to notice the distinction is the one whose own edit creates the
appearance of conversion.

### An entry cleared while filing a card from inside another story's worktree has nowhere to be committed

**Area**: `flow`

**Observed**: Filing `SMR-189` cleared this file's entry *"The acceptance gate can pass a criterion whose
shipped wording does not satisfy it as written"*, and the deletion is sitting **uncommitted** in the
`SMR-188` story worktree (`911619b`), because that is the tree the analyst was working in. Neither
disposition is right. Committed there, it lands inside `SMR-188`'s PR #18 — whose own References state
*"`docs/AGENTS_IMPROVEMENTS.md` carries no entry this story converts or retires"* — and the removal commit's
message would name a card that PR is not about, defeating the rule that the message is the finding's only
surviving trace. Left uncommitted, the entry survives `git worktree remove` and is re-triaged and filed a
second time under a new identifier, which is the exact failure the clear-as-you-convert rule exists to
prevent. The root `CLAUDE.md` rule says removal happens "in the same pass and the same commit" as the
conversion, but the pass that converts is an `analyst` run that owns no branch and creates no commits.

**Suggested change**: Say in the clear-as-you-convert rule where the removal commit goes when the converting
pass is not a `lead` run — the default being a commit on the repository's target branch naming the new card
identifier, made by the human or by the `lead` run that next starts, and explicitly **not** folded into an
unrelated story's branch. Where the analyst cannot commit at all, have it report the pending removal (file,
entry heading, card identifier) in its final report so the clearing is a named handoff rather than an
uncommitted edit in a tree that is about to be deleted.

### Deviations has no entry shape for a criterion satisfied by property but not by literal mechanism

**Area**: `agent:writer`

**Observed**: On SMR-144's spec pass, one criterion prescribed a *mechanism* ("the `lead` formats
it immediately before commit 1") whose literal placement the design had to depart from — an
existing sentence in the file being edited forbids inserting anything between the spec gate and
commit 1 — while fully preserving the *property* the criterion buys (the bytes committed are the
format step's output). `writer.md`'s rule covers only "a criterion the design cannot satisfy as
written", which this is not: it is satisfiable, just not by the route the criterion's wording
sketches. Nothing said whether that belongs in *Deviations from the card*, in Design, or nowhere,
and the choice matters because the acceptance gate reads the card's wording, not the design's
reasoning. The pass had to invent a "None, but two things were examined and deliberately not
treated as deviations" shape to keep the gate from reading the departure as a silent narrowing.

**Suggested change**: Extend the Deviations rule with a second entry shape: where the design
departs from a criterion's *prescribed mechanism* while preserving the property that mechanism
exists to buy, record it in the same section — the criterion's own sentence, the property named
explicitly, the requirement or scenario that pins the property, and why the literal route was not
taken — and say plainly that this is not a criterion correction, so no card edit follows from it.
Distinguish it from the existing unsatisfiable-criterion case, which does license a card edit.

### A process-feedback append is a tracked write into the story worktree that no rule assigns to a commit

**Area**: `flow`

**Observed**: Every worker's *Process feedback* rule — identical prose in `coder.md`, `writer.md`,
`qa.md`, `auditor.md` and `lead/SKILL.md` — directs an append to `docs/AGENTS_IMPROVEMENTS.md`
**inside the story worktree**. That path is tracked, unlike `tmp/` scratch which `.gitignore`
exempts, so the append is uncommitted work sitting in the tree when the `lead` next commits, and
nothing anywhere says which commit carries it. In practice it rides along silently: SMR-144's
commit 1 (`d026da7`) landed the spec **and** a 22-line improvements entry the `writer` had filed
during the same pass, which the commit message then had to explain in a separate paragraph. The
cost is not cosmetic — SMR-144's own design reasons from "at this point in a run the worktree
contains exactly one changed file: the spec", a premise the same pipeline's process-feedback rule
routinely falsifies, and the build shipped a rule that would halt a run on it.

**Suggested change**: State in the `lead`'s *The commit model* which commit carries a
process-feedback append — the simplest being that it rides the next commit the `lead` makes and is
named in that commit's message — and, wherever a rule reasons about "what this run has changed",
say that the improvements log is a pipeline write rather than part of the story's own diff. Any
step that inspects the worktree's modified-path set (a format step's collateral check, a lint
floor's attribution) needs that distinction stated once, centrally, rather than each such step
rediscovering it.

### The commit steps assume a shell form an isolated session is refused

**Area**: `skill:lead`

**Observed**: *Context discipline* settles how run-local scratch is written — ordinary file tools,
never `bash` — but says nothing about the one write that genuinely needs a shell: the commit
message. A `lead` running as a background job is isolated in the story worktree, and that guard
rejects any bash call it cannot verify stays inside the worktree, which includes a heredoc. On
SMR-144 the obvious form — `git commit -F - <<'EOF'` with the message inline — was refused with
*"too complex to verify that it stays inside the worktree; break it into plain, separate
commands"*, and the same refusal would meet `git commit -m $'…\n\n…'` or any other single call
that composes the message and the commit together. Every one of this run's seven commits therefore
took three calls: write the message to `tmp/` with a file tool, `git add` the paths, then
`git commit -F tmp/<file>`. That is fine once discovered, but it is discovered by having a commit
refused mid-run, and a `lead` that reaches for `-m` with a one-line summary instead — the form that
does survive the guard — silently ships commits whose bodies never explain the round they carry,
which *The commit model* explicitly requires them to.

**Suggested change**: State the working form once in *The commit model*, beside the rule that each
round's message names its findings: write the message to `tmp/` with a file tool and pass it as
`git commit -F <path>`, keeping each bash call a single plain command. It costs one sentence, it
generalises (the same guard rejects compound calls for every agent, not only the `lead`), and it
belongs next to the requirement it protects — a message rich enough to name a round's findings is
exactly the message too long for the shell form a `lead` would otherwise reach for.

### The writer's fixed spec-pass board access and its duty to apply card corrections disagree

**Area**: `agent:writer`

**Observed**: On `SMR-189`'s spec pass I had to correct four stale sentences on the card's
`## References` and add a shared-region note to a sibling card. `writer.md` requires exactly that —
"an authorised correction is applied, not described — a fix you were allowed to make and merely
reported is work handed back to the human for no reason", and "Where the declaration's write
authority permits updating a card, apply the correction to both sides yourself" — and
`docs/ISSUE_TRACKING.md` § *What the pipeline may write* does authorise it ("a stale relationship
… **fix it on the issue**"). But the same file's two access statements say something narrower: the
canonical *Board access is granted by your caller* paragraph says "your own board access for this
dispatch is whatever your caller named", and the sentence right after it fixes the spec pass at
"**read and search**", justified by the sibling sweep. A strict reader of those two sentences has
no `update` binding at all and would report every correction instead of applying it, which is the
outcome both rules exist to prevent. The `lead` skill dispatches with exactly that wording, so
the narrow reading is the one that arrives in the prompt.

**Suggested change**: State the spec pass's fixed access as **read, search, and whatever card-content
authority the declaration grants the `writer`** — one clause, in the same sentence that fixes read
and search — rather than leaving the update authority to be inferred from the declaration by a
reader who has just been told their access is whatever the caller named. Same edit in the `lead`
skill's *Reading the tracking declaration*, which restates the writer's grant, so the two agree.
Keep the caller-granted default-deny for every other dispatch; this is about the one pass the
declaration itself names as the legal window for a criterion correction.

### A Validation item whose grep pattern is a string the build rewords passes vacuously

**Area**: `agent:writer`

**Observed**: On `SMR-189` the spec's `V9` reads *"`grep -rn --exclude-dir=specs 'as concrete unmet
criteria' --include='*.md' .` → every hit sits in text that also excludes the mis-worded outcome
from what routes to the `coder`"*. It obeys the standing rule above — it states a command and a
property, with no count, no file list and no line number — and it still cannot fail: the build's
own mandated edit rewrote that exact phrase to *"as a concrete criterion to close"*, so the grep
returns **zero hits** and the universally-quantified property over an empty set is true. A `qa`
round that ran `V9` verbatim and reported it green would be reporting nothing. The pattern was
quoted from the **pre-build** text of the very sentence the task exists to rewrite, and the item's
own *Edit sites* section names that sentence as an edit target, so the spec contained both halves
of the contradiction. This is the same shape as the vacuous-`met` hole `SMR-189` closes one layer
up — a check satisfied only because its antecedent never arose — and the spec pass has no rule
against it.

**Suggested change**: Add one clause to the Validation rule: a **target-state** item must anchor
its command on text the build is expected to **produce**, never on text the build is expected to
**remove or reword** — and where an item's pattern also appears in that spec's *Edit sites* as a
string being changed, that is a defect in the item, not a risk to discover at `qa`. Pair it with a
non-vacuity requirement stated in the item itself: an item whose property is universally quantified
over a command's hits says what a **zero-hit** result means — pass, fail, or *re-derive the anchor*
— so an empty result can never be reported as a green check by default. Baseline-unchanged items
are unaffected, since their anchor is by construction text that survives.

### A tree-wide grep item that requires every hit to be in bounds collides with the improvements log

**Area**: `agent:writer`

**Observed**: On `SMR-189` the spec's `V7` reads *"`grep -rn --exclude-dir=specs 'mis-worded'
--include='*.md' .` → every hit is in a file this spec's *Boundary* lists as in bounds, and no hit
is in `docs/ISSUE_TRACKING.md`"*. By round 2 the grep hit `docs/AGENTS_IMPROVEMENTS.md`, because a
`qa` process-feedback entry quoted a spec sentence containing the new term — and the *Boundary*
lists that file under **out of bounds**, so the item read as failed on a write every agent in the
pipeline is under a standing duty to make and which the same *Boundary* bullet explicitly permits
("adds one only on fresh friction of its own"). The item's real intent — the new vocabulary has not
leaked into a surface that needs reconciling, and none of it reached the declaration — was
satisfied throughout. The collision is structural rather than particular to this card: any
prose task whose validation greps the whole tree for the term it introduces will trip on its own
improvements log the moment an agent files friction that quotes the spec.

**Suggested change**: When a Validation item runs a tree-wide command whose property is *every hit
is in an in-bounds file*, it must exclude the append-only process-feedback log from the command
(`--exclude-dir` or an equivalent), or state in the item itself that a hit there is expected and
does not fail the check. More generally: a *Boundary* that both places a file out of bounds **and**
permits a specific write to it should say which of the two a Validation item is quantifying over,
so `qa` is not left deciding whether a permitted write is a failure.

### The mandated spec section order has no slot for the Validation list the rules keep legislating

**Area**: `flow`

**Observed**: On `SMR-147` the spec pass had to place its *Validation* items somewhere, and the two
authorities disagree about where. `docs/_templates/spec.md` and `docs/_templates/CLAUDE.md` pin the
canonical order as `Goal -> Acceptance criteria (verbatim transcription) -> Design -> Requirements
-> Tasks -> Already satisfied criteria`, say "pipeline agents parse that contract", and carry no
*Validation* heading at all. The `writer`'s own rules meanwhile legislate that list repeatedly —
the whole-spec reconciliation sweep names "the Validation list where the spec carries one" as a
section to sweep, and a separate rule *requires* Validation scenarios to reach every consumer of
what a task changes. Four of the entries already in this log (`A cross-file *Validation* item that
counts files must enumerate them`, `A Validation item must state a property, never a reproducible
enumeration`, `A Validation item whose grep pattern is a string the build rewords passes vacuously`,
`A tree-wide grep item that requires every hit to be in bounds collides with the improvements log`)
are refinements of how those items must be written, so the section is plainly load-bearing in
practice. It has no home in the template, so each spec invents one: `SMR-147` nested it as a `###`
under *Design* to avoid adding a top-level section to a parsed order. A reader or gate looking for
Validation has to guess which spec put it where.

**Suggested change**: Settle it in one direction and say so once. Either give the template an
explicit `## Validation` section with a fixed position in the order, or state in the `writer`'s
Validation rules that where the project's spec format defines no such section the items live as a
named subsection of the section the format does define — and name which one. The cost of leaving it
open is not that a spec omits validation; it is that every spec places it differently, which is
exactly the condition the pinned order exists to prevent.

### A line-based grep over hard-wrapped prose under-reports, and the missing hits look like a pass

**Area**: `agent:writer`

**Observed**: On `SMR-147` the spec's `V5` and `V6` sweep the tree for retired phrases
(`absent or negative`, `not provisioned`, `unprovisioned`) with `grep -rn … --include='*.md'`, and
the *Tasks* list has the docs pass re-run both after its edits, where the expected result tightens
to no hit anywhere. Run verbatim at `qa` round 2 the commands returned **three** hits across
`README.md` and `docs/ARCHITECTURE.md`; a whitespace-normalized sweep of the same two files
returned **seven**. The difference is entirely line wrapping — both files are hard-wrapped at ~80
columns, and four of the seven occurrences straddle a newline (`not\nprovisioned`, `absent or\nnegative`),
which a line-oriented pattern cannot match. Every miss is in the docs pass's own scope, so a docs
pass that edits the three visible hits and re-runs the item gets a clean zero and ships four stale
sentences. The failure is silent in the worst direction: the check that is supposed to certify the
migration finished is the thing that hides the remainder, and no reader of the green result can tell
under-reporting from completion.

**Suggested change**: In the `writer`'s Validation rules, require an item that greps **prose** in a
hard-wrapped format to state a wrap-immune command — normalize whitespace before matching
(`tr '\n' ' '`, `pcregrep -M`, or a per-file read) — or to anchor on a single word that cannot be
split, with the multi-word form named only as a locator. Say why in the rule: a bare-word anchor
survives wrapping, which is exactly the property the existing zero-target-token-count entry above
relies on, and a multi-word phrase does not. Where an item is a **migration gate** whose whole
purpose is proving a phrase is gone, the wrap-immune form is not optional, because a partial match
set is indistinguishable from a completed migration.
