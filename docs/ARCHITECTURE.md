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
file. `writer` and the `auditor` (when its caller grants it access) reach the board the
same way; `coder` and `qa` get no board access at all. It keeps the board a *declared*
dependency rather than a structural one — repo-local Markdown, a hosted tracker, or
nothing changes what the declaration says and nothing else in the pipeline.

**The skill itself remains, narrowed to authoring.** It no longer resolves anything per
run — there is nothing left to resolve, since every agent reads the fixed declaration
itself — but it stays a skill rather than collapsing into a line of prose, because its
authoring half is substantial: it owns `references/authoring-issue-tracking.md`,
[`PRODUCT.md`](PRODUCT.md) advertises it as the tool for writing a declaration, and it
remains a legitimate user-invocable setup and inspection entry point — collapsing it to
one line would orphan that reference. A user invokes it directly to write or repair the
declaration, or to see what it currently says; the `lead` and `analyst` invoke it only as
a fallback, and never as a per-run step, when they find no declaration at all.

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
trusted outright; its spec is gated by the lead's `auditor` before the build.

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
When a project has no install step, or provisioning fails, the status is recorded as **not
provisioned, with the reason**, and the run proceeds.

**The resulting status is part of the handover.** Every dispatch that names a worktree
names its dependency-provisioning status alongside the path, so a receiving agent knows
*before* it runs a command whether the result is trustworthy. An agent handed an absent or
negative status treats dependency-sensitive command output as untrustworthy and **reports
that**, and does **not** provision the worktree itself — self-repair by fresh install is
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
than restating it, the third arrangement in *Three ways an obligation gets repeated* below.
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
wording is in the root [`README.md`](../README.md). No dispatcher-side constraint
accompanies them: `researcher.md` and any other caller may keep writing state-dependent
conditionals, because a dispatcher genuinely cannot know a racing sibling's state in
advance — which is exactly why the check belongs to the agent that can perform it.

Three constraints shape where that wording lives.

**The write-side sweep is scoped by authorship, not by file.** It covers the prose the
`scribe` writes in its own voice — wiki pages, `_meta/` prose, its own wording inside a raw
note — wherever that lives, and never the verbatim source text preserved under
`library/raw/`, which the crew exists to keep intact. It also governs published prose only:
a prohibition addressed to the `scribe` in a dispatch is still obeyed as an instruction; it
simply never appears in a page.

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

## Three ways an obligation gets repeated

An obligation sometimes has to appear in more than one place. This repo uses three
arrangements deliberately, and reaching for the wrong one is how wording drifts:

- **Byte-identical duplication, with a drift check.** The worktree contract above: one
  canonical paragraph, one physical line per file, and a `grep` in the root
  [`CLAUDE.md`](../CLAUDE.md) that catches the moment two copies differ. Used when every
  copy must bind identically, because each agent acts on its own copy alone.
- **Deliberately different wording for two sides of one defect.** The two library nets
  above: a write-time self-check and an audit finding. No drift check covers them and
  none should — unifying the wording would fuse two different jobs.
- **Stated once, pointed at from everywhere else.** Used *within* a single definition,
  where no drift check exists at all. `writer.md` carries the docs pass's reconciliation
  duty in one subsection, and the numbered step that used to hold that content is now a
  pointer at it; `### Applying a finding` likewise cross-references the spec-authoring
  rule it hands off to instead of restating it. The `lead` skill's isolation step is the
  same arrangement: the isolation remedy stated once in workspace creation, pointed at
  from the open-PR fix run's recovery step (see *The story worktree contract* above).
  What this avoids is a second,
  independently readable statement of the same duty in one file: both copies read as
  live, so an agent obeys whichever it reaches first and an edit to one silently leaves
  the other asserting the superseded version.

## The commit model

The `lead` — the orchestrating main session — is the only place commits happen; no
worker commits. Work happens in one worktree on one story
branch under the repo's worktree directory; the repo root stays on its base branch, and
that worktree is provisioned at creation (above).

The commits a run produces, in order: the spec; one per **pre-ship round** — the
`coder`'s initial build, then each `qa` and acceptance-gate fix round; the **ship
commit**, carrying whatever is still uncommitted at PR time (by then mainly the docs and
the spec's removal); then one per PR-review fix round. The count therefore varies with
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
