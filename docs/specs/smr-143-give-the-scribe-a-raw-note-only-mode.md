# Give the scribe a raw-note-only mode so a caller prohibition cannot be overridden

- **Status**: Draft
- **Task**: smr-143-give-the-scribe-a-raw-note-only-mode
- **Last Updated**: 2026-08-09
- **Document Scope**: One unit of work: give `scribe.md` a named mode that writes raw notes and nothing else, make an explicit caller prohibition beat the default meta-update step unconditionally, and repoint the `researcher`'s fan-out contract at the mode instead of the prose it uses today

---

## Goal

**The problem.** `plugins/ca77y-library/agents/scribe.md` ends its `## Ingest workflow` with three
unconditional steps — 9 "Update `library/_meta/index.md`.", 10 "Update
`library/_meta/taxonomy.md` only when a useful durable tag is missing.", 11 "Update
`library/_meta/log.md` with date, inputs, and changed pages" (lines 42–44 at `2b564ed`). Nothing
in the file says what happens when the caller forbids exactly those steps. A dispatch that says
*"do NOT touch the shared meta files (index, taxonomy, log) — the parent owns those"* is therefore
prose competing against a built-in step, with no stated precedence between them, and the built-in
step can win silently.

It has. In a five-way parallel second-pass research fan-out, four of five children's scribes
complied with that prohibition and said so; one reported having updated all three meta files, and
the working tree confirmed all three modified. With five children in flight on three shared files
that is a lost-update race, not merely a protocol violation — and the agent had **no way to signal
the conflict** between its default and the prohibition, so it just took the default.

The parent side of the contract already exists: `researcher.md` line 76 states "**Children do not
write wiki pages or the shared meta files** (index, taxonomy, log) — those are written once, by
the parent, so concurrent edits cannot corrupt the vault." Only the receiving side is unenforced.

**The change.** Two files, in one pass:

- **`scribe.md`** gains a named **raw-note-only mode**: it writes and updates raw notes under
  `library/raw/` and does nothing else — no wiki page, no index, no taxonomy, no log. It gains a
  standing precedence rule stating that an explicit caller prohibition on those writes **always
  wins** over the default step, whether or not the caller names the mode; and it reports what it
  suppressed and which raw notes it left un-indexed, so the conflict is signalled rather than
  silently resolved.
- **`researcher.md`** stops describing the prohibition in prose and **invokes the mode by name** in
  the dispatches that need it, and its single serialized parent-side meta update **consumes the
  un-indexed paths its children returned** instead of rediscovering them.

**User value.** The vault stops being corruptible by a fan-out, without the caller having to trust
that prose beat a built-in step; and the parent's serialized meta pass gets an explicit, checkable
worklist instead of a rescan.

**Non-goals.**

- Any change to `clerk.md` or `librarian.md`. The `clerk`'s audit check 5, "Raw notes not yet
  synthesized into any wiki page" (`clerk.md` line 34), still describes exactly what a raw-note-only
  pass leaves behind, and that is correct: within the `researcher`'s workflow the parent closes
  those notes at step 6, before it dispatches the `clerk` at step 7, so the audit never sees a
  transient gap it should not flag. No new audit category is needed and none is added.
- Any change under `plugins/ca77y-engineering/`. Both sides of this change sit inside
  `ca77y-library`, so it creates no cross-plugin edge.
- Any `version` change in any manifest. Root `CLAUDE.md` § *Version management is a manual human
  process* makes a bump a human decision that no story rides along with.
- Re-stating or re-scoping the tell-sweep that shipped with `SMR-149`. This spec repoints exactly
  one sentence of it and leaves the rest intact — see *Reconciling the sentence `SMR-149` shipped*.
- A liveness/accounting contract for a fan-out parent's dispatched children. That is
  [SMR-152](https://linear.app/ca77y/issue/SMR-152)'s story — see *Coordination*.

## Acceptance criteria (verbatim transcription)

> **Source**: card `SMR-143`, read from Linear (the `Agentic Claude` project, `Smerfy` team) via
> the `read` binding on **2026-08-09**, at status `In Progress`, **after** this spec pass's
> criterion correction was applied to the card — **no criterion needed correcting**, so the card's
> `## Acceptance criteria` is byte-identical to what it held before this pass (see *Deviations from
> the card*). This is a **copy, not a summary** — one card bullet per `ACn` line, in card order,
> `n = 5`.
>
> **Why a checked copy is licensed where a paraphrase is not.** Elsewhere this pipeline forbids
> restating a card's criteria into a dispatch prompt, because a paraphrase drifts toward what the
> work already does. A verbatim copy carries exactly the same failure mode unless something proves
> the copy really was verbatim. The `auditor`'s **mechanical equality check** is that proof: it
> compares this section against the card's own criteria character for character, normalising only
> Linear's `-`-to-`*` bullet rewrite and its `<…>`-wrapping of bare URLs, and it runs that check
> itself inside the spec-readiness gate before judging anything and again inside the acceptance
> gate before grading any criterion, on every round of each. The licence is that check, not an
> assurance from this document that the copy is faithful.

- **AC1** — The `scribe` has a named raw-note-only mode in which it writes the raw note and performs no index, taxonomy, or log update.
- **AC2** — The definition states that an explicit caller prohibition on meta updates always wins over the default update step, so the conflict resolves the same way every time.
- **AC3** — In that mode the `scribe` returns the paths of the notes it left un-indexed, so the caller can batch the meta update itself.
- **AC4** — The `researcher`'s fan-out dispatches invoke the mode by name instead of relying on a prose instruction to suppress a built-in step.
- **AC5** — The `researcher`'s parent-side serialized meta update consumes the returned un-indexed paths rather than rediscovering them.

## Design

### Boundary, and the deliverable's medium

**The deliverable is a non-code artifact: two agent-definition Markdown files.** This repository
ships Markdown agent definitions as its product; it has no `package.json`, no lockfile, no
`Makefile`, and no formatter or linter config at any level, and `.github/workflows/` contains only
`claude.yml` and `claude-code-review.yml` — no CI gate that builds or lints these files. The
worktree's dependency-provisioning status is *not provisioned — none required*, which is the
expected state here per the root `CLAUDE.md`. Consequently there is no test runner to write
scenario tests in: each Requirements scenario below is falsifiable by **reading the changed file**
and quoting the sentence that satisfies it, or naming what is missing. Finding no validation
command is the expected result of this task, not a blocker.

**May change** (the `coder`'s whole edit-site set):

| Path | Sites |
| --- | --- |
| `plugins/ca77y-library/agents/scribe.md` | frontmatter `description`; `## Ingest workflow` steps 9–11; a new mode section; `## Verify before you report done` (the "State the sweep in the log", "Grep-verify additive claims", and tell-sweep bullets); `## Output` |
| `plugins/ca77y-library/agents/researcher.md` | frontmatter `description` (checked; see R7.2); `### 3. Decompose complex topics (fan-out)`; `### 5. Persist valuable findings as raw sources (eager)`; `### 6. Synthesize into a wiki entry (parent only)`; `### 7. Verify library health` |

**Must not change**: `plugins/ca77y-library/agents/clerk.md`, `plugins/ca77y-library/agents/librarian.md`,
anything under `plugins/ca77y-engineering/`, any `plugin.json` or `.claude-plugin/plugin.json`,
the root `README.md`, and `docs/ARCHITECTURE.md`. The last two are the **docs pass's**, per T9 and
T10 below and `docs/CLAUDE.md` § *Rules*; the card's own `## Scope` names only the two agent
definitions, so keeping the README out of the build also keeps this story clear of
[SMR-153](https://linear.app/ca77y/issue/SMR-153), which owns the README's `### researcher`
section exclusively.

Every scenario in *Requirements* is an inspection of one of the two files this Boundary permits
changing, so every scenario is runnable inside it. Nothing below asks for an observation in a file
the Boundary excludes.

### The mode, and what it suppresses

The mode's name is the literal string **`raw-note-only mode`** — the card's own words, and the
string the `researcher` must use to "invoke the mode by name" (`AC4`). Both files spell it
identically; V6 checks that mechanically.

**The mode suppresses the wiki write as well as the three meta updates.** `AC1` names only the
index, taxonomy, and log, but the prose `AC4` requires the `researcher` to *replace* covers both
halves: `researcher.md` line 76 forbids children writing "wiki pages **or** the shared meta files".
A mode that suppressed only the meta updates would make that replacement lossy — the child
wiki-page prohibition would vanish from the file with nothing carrying it — and would also make the
name "raw-note-only" false. So the mode is defined as: **raw notes only.** That is a superset of
`AC1`, not a narrowing of it, and it is what makes `AC4` satisfiable without regression.

What the mode leaves untouched: **reading** is not writing. `## Source of truth` still has the
`scribe` read `index.md`, `taxonomy.md`, and `librarian.md` before writing, and it must — that is
how it resolves wikilink targets and checks tags. The mode suppresses writes to those files only.

### The precedence rule, and why the shipped file does not already carry it

`AC2` asks for a standing statement that an explicit caller prohibition **always wins** over the
default update step. Three properties make it do the job the incident exposed:

1. **Unconditional.** No "unless", no escape clause, no judgement call about whether the caller
   really meant it. The whole failure was a default silently winning a contest the file never said
   it could lose.
2. **It binds whether or not the caller names the mode.** The incident's dispatch was prose
   (*"do NOT touch the shared meta files"*), and prose dispatches will keep arriving from callers
   that predate this mode or live outside this toolkit. So an explicit prohibition on the wiki
   write or on any of the three meta writes **puts the `scribe` into raw-note-only mode**, by
   itself. Naming the mode is the tidy path, not the only path.
3. **The conflict is signalled, not just obeyed.** The `scribe` reports which default steps it
   suppressed and why. The card's `## Why` names this precisely — "The agent had no way to signal
   the conflict between its default behaviour and the prohibition" — so a rule that only changed
   the outcome, without making it visible in the report, would leave the caller unable to tell a
   complying pass from a lucky one.

**Why the sentence shipped by `SMR-149` does not already satisfy `AC2`.** `scribe.md` line 66
closes its tell-sweep bullet with: *"This check governs **published page prose only**: a
prohibition addressed to you in the dispatch ("do NOT touch the shared meta files — the parent owns
those") is still obeyed as an instruction; it simply never appears in a page."* That sentence is
scoped to what may appear **in a page**; its subject is the sweep, and "still obeyed" is an aside
protecting the prohibition from being swept away, not a precedence rule over `## Ingest workflow`
steps 9–11. A reader following the workflow never reaches it. `AC2` is therefore unsatisfied today,
and the fix belongs where the default lives.

### Reconciling the sentence `SMR-149` shipped

Both cards record the same direction, from opposite sides. `SMR-143`'s `## Scope`: "once this
card's named mode exists, `SMR-149`'s sentence should point at the mode instead of describing the
prohibition in prose." `SMR-149`'s `## Scope`: "its 'a caller prohibition is still obeyed as an
instruction' sentence should be repointed at `SMR-143`'s named mode once that mode exists."

So the change to line 66 is exactly one clause: the closing sentence names the mode as what such a
prohibition puts the `scribe` into, instead of describing the prohibition generically. Everything
else in that bullet — the authorship scoping, the literal tells, the judgement forms, the
`library/raw/` carve-out, the quotation exemption, the "resolve or remove" rule — is unchanged. V7
pins the bullet's surviving parts so a repoint cannot quietly become a rewrite.

### Reconciling the rest of `scribe.md` in the same pass

The mode is not a local addition: four other places in `scribe.md` state the meta updates as
unconditional, and leaving any of them ships a file that argues with itself — a `scribe` reading
the checklist still finds an instruction there. All move together:

| Site | What changes |
| --- | --- |
| frontmatter `description` (line 3) | it reads "…while preserving raw notes and **updating** synthesis pages, links, taxonomy, index entries, and the maintenance log" — an unconditional claim this change falsifies. It becomes conditional on the mode. This is an enumerated edit site inside the `coder`'s scope, not a later pass. |
| `## Ingest workflow` steps 9–11 (lines 42–44) | conditioned on full-ingest mode, with the raw-note-only branch stated at the point the reader meets the step |
| `## Verify before you report done` → "State the sweep in the log" (line 63) | the sweep's class-and-count still has to land somewhere; in raw-note-only mode there is no log entry, so it goes to the caller in the report |
| `## Verify before you report done` → "Grep-verify additive claims before logging them" (line 64) | same: the verification obligation is unchanged, its destination is the report when no log entry is written |
| `## Verify before you report done` → tell-sweep bullet (line 66) | its "The `library/_meta/log.md` entry states the count swept" clause takes the same branch; and its closing sentence is repointed per the section above |
| `## Output` (lines 72–75) | item 3 "Meta files changed." becomes honest in both modes, and the un-indexed raw-note paths become their own reported item (`AC3`) |

The three `Verify` bullets matter more than they look: as shipped they make a `log.md` write a
**precondition of reporting done**. A mode that forbids the log write without conditioning them
would leave the `scribe` unable to report done at all in the very mode this story adds.

### Reconciling `researcher.md`, including a claim it already makes and does not keep

| Site | What changes |
| --- | --- |
| `### 3.` child contract (line 56–57) | children dispatch the `scribe` in raw-note-only mode and return the un-indexed paths, alongside the synthesis, evidence, and labels they already return |
| `### 5.` line 74 (the parent's own eager persistence) | dispatched in raw-note-only mode too — see below |
| `### 5.` line 76 (the prose prohibition) | replaced by naming the mode, keeping both halves (no wiki page, no shared meta file) and the "written once, by the parent" rationale |
| `### 6.` line 84 | the single serialized `scribe` dispatch is **handed** the collected un-indexed paths as the set to index (`AC5`), and any it does not index is named in the report |
| `### 7.` line 90 | stated as full-ingest: the post-audit fix rounds run after the serialized write, so they may and should touch meta files |

**A guard, closing no criterion: the parent's own step-5 dispatches use the mode too.**
`researcher.md` line 85 asserts "This wiki write and the shared-meta updates happen **once,
serialized at the parent**." As shipped that is false about its own file: line 74 has the parent
dispatch the `scribe` eagerly, "whenever the dive turns up something of durable value", and in the
default mode each such dispatch updates the index, taxonomy, and log — so meta updates happen many
times, not once. Routing every step-5 persistence through raw-note-only mode, the parent's own
included, is what makes line 85 true, and it makes the parent's step-6 worklist complete: the set
handed to the serialized write is *every* note persisted during the run, not only the children's.
No acceptance criterion asks for this; it is built anyway, as R6, because the alternative is
shipping a file that states a serialization it does not perform.

### How each criterion is satisfied

**No criterion is already satisfied**, so this spec carries no *Already satisfied criteria*
section. Checked one at a time against the tree at `2b564ed`: `scribe.md` has no mode section and
no precedence rule (`AC1`, `AC2` — see *why the `SMR-149` sentence does not already satisfy `AC2`*
above); its `## Output` has no un-indexed-path item (`AC3`); `researcher.md` line 76 is the prose
instruction `AC4` exists to replace (`AC4`); and line 84 dispatches the wiki-and-meta write with no
input set at all, so nothing is consumed (`AC5`). `AC5` is the closest to partially standing —
lines 56 and 76 already have children return "the paths of the raw notes it persisted" — but the
parent's meta update does not take them, which is the whole of what `AC5` asks.

Every criterion is closed by the `coder`'s build. None needs the docs pass, a manual reproduction,
or any other non-`coder` mechanism. T9 and T10 *are* non-`coder` tasks, and no criterion depends on
either — checked against all five above, one at a time, not inferred from the first.

The map is stated at **scenario** granularity, and the invariant is mechanical: every scenario
`Rn.m` below appears in at least one task's *Satisfies* line, and no row claims a scenario no task
names. V8 checks it.

| Criterion | Scenarios that close it | Tasks |
| --- | --- | --- |
| `AC1` | R1.1–R1.5 | T1, T2 |
| `AC2` | R2.1–R2.4, R7.1, R7.3 | T3, T2, T4, T5, T7 |
| `AC3` | R3.1–R3.4 | T4, T5 |
| `AC4` | R4.1–R4.4 | T6, T9 |
| `AC5` | R5.1–R5.3 | T6 |
| *(none — guard)* | R6.1–R6.2 | T6 |
| *(none — guard)* | R7.2, R7.4 | T7, T8 |

### Deviations from the card

**None.** Every criterion is satisfiable as written by the design above, so no criterion was
corrected and the card's `## Acceptance criteria` was not edited by this spec pass. Two
clarifications that are *not* deviations, recorded so the acceptance gate reads them as design
rather than drift:

- **`AC1` is satisfied by a superset.** The mode suppresses the wiki write in addition to the three
  meta updates. `AC1` asks that it "performs no index, taxonomy, or log update"; it does not, and
  a mode that also writes no wiki page still satisfies that sentence exactly. The reason it must is
  in *The mode, and what it suppresses*.
- **`AC2` is implemented as a rule that binds prose prohibitions too**, not only dispatches that
  name the mode. `AC2` says "an explicit caller prohibition on meta updates always wins" — it says
  nothing about the prohibition having to name a mode, and the incident's prohibition did not.

### Coordination

The sibling sweep ran on **2026-08-09** through the declaration's `search` binding (`list_issues`
over the `Agentic Claude` project), across four queries — `scribe`, `researcher fan-out parallel
children`, `index taxonomy log meta`, and `raw note mode prohibition override caller`. **No
duplicate was found**: no other card scopes a `scribe` mode, a precedence rule over the meta
updates, or an un-indexed-path return. **No shared-infrastructure provisioning collision was
found** either — this story adds no test runner, helper, or config knob that a sibling could be
independently scoping. Four file- or paragraph-level overlaps did surface:

- **[SMR-152](https://linear.app/ca77y/issue/SMR-152) — *Make a fan-out parent probe its children
  instead of trusting notifications* (`Backlog`).** The real collision: it scopes
  `plugins/ca77y-library/agents/researcher.md` at `### 3. Decompose complex topics (fan-out)` and
  `### 4. Run the deep dive`, and this story edits `### 3.` as well (plus `### 5.`–`### 7.`, which
  it does not touch). They share a file and a bullet list, not a rule — its subject is dispatched-
  versus-collected accounting for **children**; this story's is what a **scribe** writes.
  **Whichever lands second rebases onto the other's `### 3.` bullets rather than restoring its
  own**, and neither should re-add the other's contract. The two cards did not record each other;
  a `relatedTo` relation was added between them during this spec pass.
- **[SMR-153](https://linear.app/ca77y/issue/SMR-153) — *Document the researcher's evidence
  discipline in the README* (`Backlog`).** Its `## Scope` is the root `README.md`'s
  `### researcher` section **only**, and its `## Out of scope` explicitly excludes `### scribe`.
  This story's build touches no README at all (see *Boundary*), so there is **no build-time
  collision**. The exposure is in the docs pass: T10 may need to touch `### researcher`'s step-5/6
  wording. **T10 changes only what this story makes stale and leaves the evidence-discipline gap
  `SMR-153` owns untouched**; if `SMR-153` lands first, T10 edits around its new prose rather than
  displacing it.
- **[SMR-177](https://linear.app/ca77y/issue/SMR-177) — *Align the clerk's severity gloss*
  (`Backlog`).** Same defect family (leaked instructions), different file: `clerk.md`'s `## Output`
  severity item 1. `clerk.md` is a stated non-goal here. **No overlap; either order.**
- **[SMR-181](https://linear.app/ca77y/issue/SMR-181) — *Stop a spec's negative constraints
  reaching the artifact as prose* (`Backlog`).** Scoped to `coder.md` and `writer.md`, both
  excluded here. **No overlap; either order.** Noted only because this spec deliberately states
  negative constraints (the Boundary's *must not change* table) that are constraints on the
  artifact, not sentences to reproduce in it.

Shipped work this story reconciles with rather than re-stating:
[SMR-149](https://linear.app/ca77y/issue/SMR-149) (`Done`) — one clause of the tell-sweep bullet,
per *Reconciling the sentence `SMR-149` shipped*; and
[SMR-161](https://linear.app/ca77y/issue/SMR-161) (`Done`) — the three `Verify before you report
done` bullets whose log-write obligation this story conditions rather than removes.

### Validation

All checks are read-only and run from the story worktree with `git -C <worktree>` or an absolute
path under it. There is no build to run: no manifest, no lockfile, no formatter, no linter, and no
CI workflow that consumes either changed file by name — the only two workflows are `claude.yml` and
`claude-code-review.yml`. The plugin manifests
(`plugins/ca77y-library/plugin.json`, `plugins/ca77y-library/.claude-plugin/plugin.json`) do not
enumerate agent files, so no consumer needs updating when an agent definition's body changes; V4
confirms both stay untouched. Nothing else in this repository reads these files.

- **V1** *(primary)* — Read both changed files end to end and, per Requirements scenario below,
  quote the sentence that satisfies it or name what is missing. One entry per scenario, keyed to
  that scenario's own name.
- **V2** — The root `CLAUDE.md` duplication greps still print `1` each: the five-file "Addressing
  the story worktree." grep and the two-file "Board access is granted by your caller." grep.
  Neither changed file is among those seven, so this is a regression guard.
- **V3** — The root `CLAUDE.md` cross-plugin greps print **nothing**:
  `grep -rn 'ca77y-engineering:\(researcher\|librarian\|scribe\|clerk\)' plugins/` and
  `grep -rn 'ca77y-library:\(analyst\|auditor\|coder\|qa\|writer\|lead\|board\)' plugins/`.
  This story renames no agent and moves none between plugins; the check proves the new prose
  introduced no wrong-plugin dispatch string.
- **V4** — The root `CLAUDE.md` manifest-parity loop prints `ok` for both plugins, **and** both
  versions are unchanged from `master`:
  `git -C <worktree> diff master -- 'plugins/*/plugin.json' 'plugins/*/.claude-plugin/plugin.json'`
  is empty.
- **V5** — Under `plugins/`, the changed-file set is exactly
  `plugins/ca77y-library/agents/scribe.md` and `plugins/ca77y-library/agents/researcher.md`.
  `clerk.md`, `librarian.md`, and everything under `plugins/ca77y-engineering/` are unchanged.
  Outside `plugins/`, the run's tree legitimately also carries this spec and any
  `docs/AGENTS_IMPROVEMENTS.md` append a worker made — that is the *Process feedback* rule working,
  not collateral; V5 checks only that nothing else appears.
- **V6** — The mode name matches across both files, checked literally, not by eye:
  `grep -c 'raw-note-only mode' plugins/ca77y-library/agents/scribe.md` and the same against
  `researcher.md` both report ≥ 1, and `grep -oh 'raw-note-only[a-z -]*mode' <both files> | sort -u`
  returns exactly one distinct string. A name the `researcher` invokes that the `scribe` does not
  define is `AC4` failing while reading as satisfied.
- **V7** — The tell-sweep bullet (`scribe.md` line 66 at `2b564ed`) still carries every part this
  story does not repoint: `grep -F` each of "published page prose only", "check whether", "do NOT",
  "at this time", "will supersede", "TODO", and "library/raw/" and confirm each is still present in
  that bullet. A repoint that deleted the tells would break the `SMR-149` behaviour this story is
  required to leave intact.
- **V8** — Coverage, checked mechanically rather than asserted: every scenario label `Rn.m` in
  *Requirements* appears in at least one task's *Satisfies* line; no *Satisfies* line names a
  scenario that does not exist; and every scenario a row in *How each criterion is satisfied*
  claims is one a task names. Run against the spec as it stands, not against recollection. Every
  task keeps its whole *Satisfies* list on **one physical line**, so a line-oriented `grep` cannot
  report a covered scenario as uncovered because the list wrapped; a run of this check that reports
  a gap must first confirm the gap is not a wrapped line.
- **V9** — No unconditional meta-update sentence survives in `scribe.md`: read each of lines 3,
  42–44, 63, 64, 66, and 72–75 (at `2b564ed`) in their post-build form and confirm each either
  names the mode branch or is scoped to full ingest. A grep alone cannot settle this — it is a
  read, per scenario R2.4 and R7.1.

**Not validated by this run, and why.** The mode itself goes unexercised: this repository is the
toolkit, not a project with a `library/` vault, so no `scribe` run happens here, and a fan-out with
five concurrent children cannot be staged as part of this story. The behaviour is prose in an agent
definition and is checked by inspection. *(Assumption, uncited: a subagent definition is read from
the installed plugin at dispatch time, so this run's own edits do not govern this run — recorded on
[SMR-187](https://linear.app/ca77y/issue/SMR-187), and no path-and-line citation is available
because the harness ships as a compiled binary rather than as readable source in any tree this
worktree or the root checkout can reach. What would settle it: exercising the shipped definitions
on a later library run. Nothing in this design depends on the claim; it only bounds what this run's
validation can honestly assert.)*

**What a green validation here does and does not prove.** Every check above is an inspection of
prose, so all of them can pass while the real behaviour — a `scribe` under a concurrent fan-out
declining to touch the meta files — remains unobserved. The alternative cause is plain: a file can
state the mode perfectly and an agent can still take its default, which is precisely the incident
this story responds to. No scenario below observes the runtime behaviour, and none can inside this
Boundary. The mechanism is therefore covered by inspection only, and the first real evidence will
be a later fan-out run on a project that has a vault.

### Risks and alternatives

- **Rejected: a `no-meta` flag named in the dispatch prompt only.** It leaves the default winning
  whenever the caller forgets the flag — the incident's exact failure with a new name.
- **Rejected: making the meta updates opt-in for every caller.** It fixes the race by breaking the
  common case: a normal single ingest would stop indexing itself, and every caller would have to
  learn a flag to get the behaviour they already have.
- **Rejected: leaving `researcher.md`'s prose in place beside the mode.** Two live instructions for
  one decision is the defect, not the fix; the prose is replaced, not annotated.
- **Risk: the repoint of line 66 grows into a rewrite of the tell-sweep.** V7 pins the bullet's
  surviving parts, and the Boundary names the change as one clause.

## Requirements

### Requirement (R1): The `scribe` has a named raw-note-only mode

#### Scenario: R1.1 — the mode exists and is named

- **WHEN** a reader opens `scribe.md`
- **THEN** it carries a section defining a mode under the literal name **raw-note-only mode**, in
  which the `scribe` writes and updates raw notes under `library/raw/` and does nothing else

#### Scenario: R1.2 — no meta write in the mode

- **WHEN** the `scribe` is invoked in raw-note-only mode
- **THEN** the definition states it performs no `library/_meta/index.md`, no
  `library/_meta/taxonomy.md`, and no `library/_meta/log.md` update — all three named

#### Scenario: R1.3 — no wiki write in the mode

- **WHEN** the `scribe` is invoked in raw-note-only mode
- **THEN** the definition states it creates and updates no wiki page either, so the mode's name is
  true and the prohibition `researcher.md` line 76 carries today survives its replacement

#### Scenario: R1.4 — reading is still allowed

- **WHEN** the `scribe` works in raw-note-only mode and needs to resolve a wikilink target or check
  a tag
- **THEN** the definition still has it read `library/README.md`, `_meta/index.md`,
  `_meta/taxonomy.md`, and `_meta/librarian.md`; the mode suppresses writes to those files, not
  reads of them

#### Scenario: R1.5 — the default is unchanged

- **WHEN** no mode is named and no prohibition is given
- **THEN** `## Ingest workflow` still performs steps 9, 10, and 11 exactly as it does today, so an
  ordinary ingest keeps indexing, tagging, and logging itself

### Requirement (R2): An explicit caller prohibition always wins over the default update step

#### Scenario: R2.1 — the precedence rule is stated, unconditionally

- **WHEN** a reader looks for what happens when a dispatch forbids the meta updates
- **THEN** `scribe.md` states that an explicit caller prohibition on those updates **always wins**
  over the default update step, with no exception, escape clause, or judgement call left to the
  `scribe`

#### Scenario: R2.2 — a prose prohibition triggers the mode without naming it

- **WHEN** a dispatch says *"do NOT touch the shared meta files (index, taxonomy, log) — the parent
  owns those"* and never mentions the mode
- **THEN** the definition states that this puts the `scribe` into raw-note-only mode by itself, so
  a caller that predates the mode gets the same outcome as one that names it

#### Scenario: R2.3 — the conflict is signalled, not silently resolved

- **WHEN** the `scribe` suppresses a default step because of a prohibition
- **THEN** the definition requires it to say so in its report — which default steps it suppressed
  and on whose instruction — so a complying pass is distinguishable from a lucky one

#### Scenario: R2.4 — no sentence in the file still states the meta updates unconditionally

- **WHEN** a reader reads `## Ingest workflow` steps 9–11, the "State the sweep in the log" bullet,
  the "Grep-verify additive claims" bullet, the tell-sweep bullet's log clause, and `## Output`
  item 3
- **THEN** each either names the raw-note-only branch or is explicitly scoped to full ingest, and
  none instructs a `scribe` in raw-note-only mode to write a meta file

### Requirement (R3): The mode returns the paths it left un-indexed

#### Scenario: R3.1 — the un-indexed paths are a reported item

- **WHEN** a raw-note-only pass finishes
- **THEN** `## Output` requires the `scribe` to return the paths of the raw notes it wrote and left
  un-indexed, as its own named item rather than folded into a prose summary

#### Scenario: R3.2 — the caller can batch the meta update from what it gets back

- **WHEN** the caller receives that report
- **THEN** the returned paths are stated to be the complete set the caller must index later, so
  batching the meta update needs no rescan of `library/raw/`

#### Scenario: R3.3 — the deferred log content goes to the caller

- **WHEN** a raw-note-only pass has swept a defect class, or verified an additive claim, that would
  normally be recorded in `library/_meta/log.md`
- **THEN** the definition has it report the class and the files-swept count (and the verified
  claim) to the caller instead, so the obligation survives the suppressed log write rather than
  disappearing with it

#### Scenario: R3.4 — reporting done is possible in the mode

- **WHEN** a raw-note-only pass reaches `## Verify before you report done`
- **THEN** no check there requires a `library/_meta/log.md` entry as a precondition of reporting
  done; each log-writing obligation is conditioned on the mode

### Requirement (R4): The `researcher`'s fan-out dispatches invoke the mode by name

#### Scenario: R4.1 — the prose prohibition is replaced

- **WHEN** a reader opens `### 5. Persist valuable findings as raw sources (eager)`
- **THEN** the sentence "**Children do not write wiki pages or the shared meta files** (index,
  taxonomy, log) — those are written once, by the parent…" no longer instructs by prohibition:
  children dispatch the `scribe` in raw-note-only mode, named

#### Scenario: R4.2 — the replacement loses neither half

- **WHEN** the replacement is read
- **THEN** it still forbids a child writing a wiki page and a child writing any of the three meta
  files, and still states the rationale that these are written once, by the parent, so concurrent
  edits cannot corrupt the vault

#### Scenario: R4.3 — the child contract names the mode and the return

- **WHEN** a reader opens `### 3. Decompose complex topics (fan-out)`
- **THEN** the child's stated contract includes dispatching the `scribe` in raw-note-only mode and
  returning the un-indexed raw-note paths, alongside the synthesis, cited evidence, and absence
  labels it already returns

#### Scenario: R4.4 — the name resolves

- **WHEN** the name `researcher.md` invokes is compared against the name `scribe.md` defines
- **THEN** they are the same literal string, so the invocation names a mode that exists

### Requirement (R5): The parent's serialized meta update consumes the returned paths

#### Scenario: R5.1 — step 6 is handed the worklist

- **WHEN** the parent reaches `### 6. Synthesize into a wiki entry (parent only)`
- **THEN** it passes the un-indexed raw-note paths collected from its children to the single
  serialized `scribe` dispatch, as the set to index, taxonomy-check, and log

#### Scenario: R5.2 — it does not rediscover them

- **WHEN** the parent needs to know which notes are un-indexed
- **THEN** the definition has it use the returned set rather than scanning `library/raw/` or
  re-deriving the list from the vault

#### Scenario: R5.3 — nothing collected is silently dropped

- **WHEN** the serialized write leaves any collected path un-indexed
- **THEN** the parent names that path in its report rather than reporting the run complete over it

### Requirement (R6): One serialized meta update, as the file already claims *(guard — closes no criterion)*

#### Scenario: R6.1 — the parent's own eager persistence uses the mode

- **WHEN** the parent itself dispatches the `scribe` at step 5 to persist a finding
- **THEN** that dispatch is in raw-note-only mode too, and its paths join the set step 6 consumes —
  so line 85's "the shared-meta updates happen once, serialized at the parent" is true of the file
  that says it

#### Scenario: R6.2 — the post-audit fix rounds stay full-ingest

- **WHEN** the parent dispatches the `scribe` at `### 7. Verify library health` to fix what the
  `clerk` raised
- **THEN** the definition states that those dispatches are ordinary full-ingest ones: they run
  after the serialized write, nothing else is in flight, and they may need to touch the meta files
  to close a finding

### Requirement (R7): Both definitions state one contract, on every surface *(R7.2 and R7.4 are guards — they close no criterion)*

#### Scenario: R7.1 — `scribe.md`'s frontmatter `description` is an edit site

- **WHEN** the `description` is read after the change
- **THEN** it no longer claims the `scribe` updates taxonomy, index entries, and the maintenance log
  unconditionally; it states that behaviour as the default and names the raw-note-only mode as the
  case where it does not

#### Scenario: R7.2 — `researcher.md`'s frontmatter `description` is checked

- **WHEN** the `researcher`'s `description` is read against this change
- **THEN** it is confirmed to state nothing this change falsifies — it describes fan-out and wiki
  entries, not the shared meta files — and is left unchanged, with the check recorded in the
  `coder`'s report so a checked `description` is distinguishable from one never opened

#### Scenario: R7.3 — the `SMR-149` sentence points at the mode

- **WHEN** the tell-sweep bullet's closing sentence is read
- **THEN** it names raw-note-only mode as what such a dispatch prohibition puts the `scribe` into,
  rather than describing the prohibition generically, while the rest of that bullet — authorship
  scoping, the literal tells, the judgement forms, the `library/raw/` carve-out, the quotation
  exemption, and the resolve-or-remove rule — is unchanged

#### Scenario: R7.4 — no second, competing account survives

- **WHEN** both files are read end to end
- **THEN** no sentence in either still describes the child prohibition as prose competing with a
  built-in step, and no sentence contradicts the mode's contract

## Tasks

Every task below is the `coder`'s unless marked otherwise. All edits are in
`plugins/ca77y-library/agents/scribe.md` and `plugins/ca77y-library/agents/researcher.md`; no other
file under `plugins/` changes.

- [ ] **T1** — `scribe.md`: add the mode section defining **raw-note-only mode** — raw notes under
      `library/raw/` only; no wiki page; no index, taxonomy, or log update; reading the source-of-truth
      files still required. Satisfies R1.1, R1.2, R1.3, R1.4.
- [ ] **T2** — `scribe.md` `## Ingest workflow`: condition steps 9–11 on the mode at the point the
      reader meets each step, leaving the default behaviour untouched when no mode and no prohibition
      is given. Satisfies R1.5, R2.4 (workflow half).
- [ ] **T3** — `scribe.md`: add the precedence rule — an explicit caller prohibition on the meta (or
      wiki) writes always wins over the default step, unconditionally; a prose prohibition puts the
      `scribe` into the mode without naming it. Satisfies R2.1, R2.2.
- [ ] **T4** — `scribe.md` `## Output`: state what the `scribe` reports when it suppressed a default
      step (which steps, on whose instruction) and add the un-indexed raw-note paths as their own
      named output item, described as the complete set the caller indexes later.
      Satisfies R2.3, R3.1, R3.2.
- [ ] **T5** — `scribe.md` `## Verify before you report done`: condition the log-writing obligations
      in the "State the sweep in the log" bullet, the "Grep-verify additive claims" bullet, and the
      tell-sweep bullet's log clause, routing the class-and-count and the verified claims to the
      caller's report in raw-note-only mode, so no check requires a log entry as a precondition of
      reporting done. Satisfies R3.3, R3.4, R2.4 (verify half).
- [ ] **T6** — `researcher.md` steps 3, 5, 6, and 7: name the mode in the child contract and add the
      un-indexed-path return (step 3); replace line 76's prose prohibition with the named mode,
      keeping both halves and the rationale, and route the parent's own step-5 persistence through the
      mode as well (step 5); hand the collected paths to the single serialized dispatch and name any
      it does not index (step 6); state that the post-audit fix dispatches are full-ingest (step 7).
      Spell the mode's name in `researcher.md` exactly as T1 spells it in `scribe.md`, character for
      character. Satisfies R4.1, R4.2, R4.3, R4.4, R5.1, R5.2, R5.3, R6.1, R6.2.
- [ ] **T7** — Frontmatter and the `SMR-149` repoint: update `scribe.md`'s `description` so it no
      longer states the meta updates unconditionally; read `researcher.md`'s `description`, confirm
      this change falsifies nothing in it, leave it unchanged, and record the check in the report;
      repoint the tell-sweep bullet's closing sentence at the mode, changing that one clause only.
      Satisfies R7.1, R7.2, R7.3.
- [ ] **T8** — Read both files end to end and remove or reconcile any remaining sentence that
      describes the child prohibition as prose competing with a built-in step, or that contradicts the
      mode's contract. Satisfies R7.4.
- [ ] **T9** — Run V2, V3, V4, V6, and V7 and report the actual output. Satisfies part of
      *Validation*. *(V1, V5, V8, and V9 are reads performed while reporting the per-scenario
      inspectable assertions.)*
- [ ] **T10** — *(Not the `coder`'s task — the `writer`'s docs pass, step 7.)* Update the root
      `README.md` (`### scribe`, and `### researcher`'s steps 5–6 wording) and `docs/ARCHITECTURE.md`
      — including *Two nets around published library prose*, whose sentence "No dispatcher-side
      constraint accompanies them: `researcher.md` and any other caller may keep writing
      state-dependent conditionals" needs narrowing to conditionals now that a dispatcher-side
      constraint exists for prohibitions — then convert and remove this spec. Required by
      `docs/CLAUDE.md` § *Rules*; no acceptance criterion depends on it, so the acceptance gate is
      not blocked by its ordering after that gate. Touch only what this story makes stale in
      `### researcher`, leaving the evidence-discipline gap
      [SMR-153](https://linear.app/ca77y/issue/SMR-153) owns.
