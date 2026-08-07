# Stop the spec commit from breaking the gate the spec demands

- **Status**: Draft
- **Task**: smr-144-stop-the-spec-commit-from-breaking-the-gate
- **Last Updated**: 2026-08-07
- **Document Scope**: One unit of work: give the project's format step an owner in the spec-commit sequence, and put a lint floor between commit 1 and the `coder` so a doc-only gate failure is found while it is still attributable to the spec pass

---

## Goal

**The problem.** `plugins/ca77y-engineering/skills/lead/SKILL.md` commits the spec as commit 1
and says nothing about the project's formatter — not in workflow step 3, not in *The commit
model*. On any project whose lint gate covers documentation, that commit can turn the gate red
before the `coder` writes a line. Nothing between the `writer` (which "creates no commits") and
the `lead` (which commits without formatting) owns the step, so the first agent to meet the
failure is `qa`, at step 5, two agents and one build downstream — and it has to bisect the
failure back to a document nobody told it about before it can report the build honestly.

**The change.** `SKILL.md` gains one named owner and one floor, both the `lead`'s:

- **The owner.** After collecting each `writer` spec-pass round and **before** dispatching the
  `auditor`'s spec-readiness gate, the `lead` runs the project's format step, scoped to the spec
  path. Because nothing modifies the spec between the last format run and commit 1 — the gate
  reads, it does not write — the bytes that land in commit 1 are always that step's output.
- **The floor.** Once commit 1 lands and before the `coder` is dispatched, the `lead` runs the
  project's lint command once, and attributes what it reports.

Both commands are whatever the project defines, discovered from project context; where the
project defines neither, both steps are stated as skipped rather than treated as failures.

**User value.** A spec commit stops being able to redden a gate that no later agent can
attribute. The failure, where it happens at all, surfaces at step 3 — while it is unambiguously
the spec pass's, with the `writer` still the obvious owner of the fix — instead of arriving as
an unexplained red suite in `qa`'s round-1 report or, worse, as a red CI check on the PR.

**Non-goals.**

- **The docs pass and the ship commit are not in scope.** They are [SMR-171](https://linear.app/ca77y/issue/SMR-171)'s,
  which owns both the `writer`-side formatter step at the end of the docs pass and the optional
  `lead`-side validation before the ship commit. See *Coordination*.
- **`writer.md` is not edited by this story.** The card requires one owner "stated once"; naming
  the `lead` and also giving the `writer` a spec-formatting duty would be two.
- **`qa.md`, `coder.md`, and `auditor.md` are not edited.** `AC5` is satisfied by where the floor
  sits in `SKILL.md`'s own step order, not by telling `qa` anything.
- **No new checking authority for the `lead` over the card's acceptance criteria.** The format
  step is a mechanical file operation. Detecting that a formatter changed the transcription stays
  the `auditor`'s mechanical equality check, unchanged.
- **No plugin version bump.** Versions are a manual human decision per the root
  [`CLAUDE.md`](../../CLAUDE.md).
- **No formatter, linter, or config is added to this repository.** This repo defines no
  format/lint command and this story does not give it one; see *Validation*.

## Acceptance criteria (verbatim transcription)

> **Source**: card `SMR-144`, read from Linear (the `Agentic Claude` project, `Smerfy` team) via
> the `read` binding on **2026-08-07**, at status `In Progress`, **after** this spec pass's
> corrections were applied to the card. Those corrections touched the `## Scope` note only and
> left `## Acceptance criteria` byte-identical (see *Deviations from the card*: no criterion
> needed correcting). This is a **copy, not a summary** — one card bullet per `ACn` line, in card
> order, `n = 5`.
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

- **AC1** — Committing the spec includes running the project's format/lint step over the spec path, so commit 1 never lands a document that fails the project's own gate.
- **AC2** — The owner is unambiguous: either the `writer` returns a spec already formatted to the project's style, or the `lead` formats it immediately before commit 1 — the definition names one.
- **AC3** — As a floor, if the project has a lint command, the `lead` runs it once after commit 1 and before dispatching the `coder`, so a doc-only gate failure is caught while it is still attributable to the spec pass.
- **AC4** — The rule is project-agnostic: it refers to whatever format/lint command the project defines, not to prettier or `make lint` specifically.
- **AC5** — `qa` is not the first agent to discover a spec-commit gate failure.

## Design

### How each criterion is satisfied

Every criterion is closed by the `coder`'s build; none needs the docs pass or a manual step, so
no criterion carries a non-`coder` owning mechanism. (T10 *is* a non-`coder` task, but no
criterion depends on it — see the task itself.)

| Criterion | Requirements that close it | Tasks |
| --- | --- | --- |
| `AC1` | R1 (all four scenarios), R6 | T1 |
| `AC2` | R2, plus R1's first scenario for where the owner acts | T1, T8 |
| `AC3` | R3 | T2, T3, T5, T6 |
| `AC4` | R5 | T1, T2, T9 |
| `AC5` | R4, resting on R3's first scenario for the ordering | T2 |

R7 and R8 close no criterion on their own: R7 keeps the rest of `SKILL.md` from contradicting the
new sequence — without it `AC2`'s "unambiguous" fails, because a reader finds two accounts of what
happens around commit 1 — and R8 keeps the change from quietly widening the `lead`'s authority
over the card's criteria, which no criterion asks for and *The criteria checks are the auditor's*
forbids.

### The owner is the `lead`

`AC2` offers a choice — the `writer` returns formatted output, or the `lead` formats before
commit 1 — and requires the definition to name exactly one. This spec names the **`lead`**, and
the whole rule lives in `SKILL.md`, the file the card's `## Scope` names first.

Three reasons, in order of weight:

1. **It holds on every route a spec can arrive by.** A `writer`-side rule covers only text the
   `writer` itself last wrote. A revision reaches the `writer` either as a resume or as a fresh
   dispatch, and a `lead` course correction can settle a decision between rounds; a rule anchored
   at the collection point covers all of them without enumerating them.
2. **It is one moment with one actor.** The `lead` is the only place commits happen, so there is
   exactly one instant at which the file enters history, and exactly one agent standing there.
3. **The card's other two criteria already address the commit-side actor.** `AC1` frames the step
   as part of committing and `AC3` puts the floor on the `lead` explicitly; splitting the owner
   away from those would put the rule in two files.

### Where the format step sits, and why not "immediately before the commit"

`AC2`'s phrasing is "the `lead` formats it immediately before commit 1". This spec places the
format step slightly earlier — after each `writer` round is collected, **before** the
spec-readiness gate is dispatched — and the reason is a hard constraint in the file being edited.

`SKILL.md` step 3 currently ends:

> Once ready, **commit the spec** (commit 1) — the gate that just passed already proved the
> transcription matches the card, so there is nothing left for you to check first.

That clause, and *The criteria checks are the auditor's* which it belongs to, forbid inserting
anything between the passed gate and the commit. A format step placed there would contradict a
sentence two screens up in the same file — the exact "two live instructions for one decision"
defect the pipeline already treats as blocking.

Placing it before the gate is strictly better, not merely compatible:

- **The invariant `AC1` actually asks for still holds.** `AC1` wants commit 1 never to land a
  document that fails the project's own gate. Nothing writes to the spec between the format step
  and commit 1: the `auditor` reads and returns a verdict, and the `lead` commits. Any `writer`
  revision restarts the cycle — revise, re-format, re-gate — so the committed bytes are always
  the format step's output. This is stated as R1's third scenario rather than left implicit.
- **It puts the one dangerous interaction in front of the agent that owns detecting it.** A
  Markdown formatter can rewrite text *inside* the verbatim transcription block. If it does, the
  transcription no longer matches the card, and the `auditor`'s mechanical equality check — which
  normalises only Linear's two rewrites and nothing else — returns a blocking mismatch that routes
  to the `writer` for a respec, capped by the 3× rule. Formatting **after** the gate would commit
  a transcription that the *acceptance* gate later rejects, at the far end of the run, for a
  purely cosmetic reason. Formatting before the gate converts that from a late, confusing failure
  into an early, correctly-routed one, and it does so without giving the `lead` any new authority
  over the criteria.

> **Assumption (uncited).** That a Markdown formatter can alter text inside the transcription
> block is recorded on this story's own card — "Prettier normalises `*emphasis*` to `_emphasis_`
> and the spec used `*…*` throughout — 78 differing lines", observed on the `timer-cue-sync` run —
> and independently on [SMR-138](https://linear.app/ca77y/issue/SMR-138) ("the project's formatter
> reformats code embedded in Markdown differently from the real file"). It **cannot be cited to a
> path and line here**: this repository has no `package.json`, no lockfile and no `node_modules`
> in either the worktree or the root checkout, so no formatter is installed to read. What would
> settle it: a path-and-line reference into a resolved `prettier` (or equivalent) install on a
> project that has one, read at the version that project pins. The design does not depend on the
> claim being true — if no formatter ever touches the block, the gate simply passes — only on it
> being *possible*, which is what R1's fourth scenario covers.

### The floor, and making its failures attributable

`AC3`: where the project defines a lint command, the `lead` runs it **once**, after commit 1 and
before the step-4 `coder` dispatch. Once per run, not once per round.

A repo-wide lint is not automatically attributable: a base branch that was already not clean makes
the command fail on files this run has never touched. [SMR-156](https://linear.app/ca77y/issue/SMR-156)
records exactly that hazard from the other side (a mandated repo-wide format command rewriting
eleven files no in-flight unit owned). At this point in a run the attribution is available for
free, because the worktree contains exactly one changed file: the spec. So:

- A reported failure **naming the spec's own path** is this run's. It routes to the `writer` — a
  spec problem, per *When a gate finds a problem* — and the fix is committed as its own commit
  before the `coder` is dispatched.
- A reported failure naming **only paths this run has not touched** is pre-existing. It is
  recorded and relayed in the handoff, and it does not stop the run or route to anyone. Silently
  "fixing" it would put collateral into a story branch that never asked for it.

If [SMR-169](https://linear.app/ca77y/issue/SMR-169) lands first, the `lead` will already hold a
measured base-commit validation result recorded at workspace creation, and the floor should
attribute by diffing that baseline rather than by inspecting which paths a failure names. See
*Coordination*.

### Discovery, absence, and unrunnability

`AC4` requires the rule to be project-agnostic. The definition names no tool: it says *the
project's format command* and *the project's lint command*, **discovered from project context** —
the same phrasing `qa.md` already uses for "the project's tests conventions and validation
commands are in your context". Three outcomes, all stated:

1. **Defined and runnable** — run it; act on the result.
2. **Not defined** — skip, and say so in the handoff. Absence is a stated outcome, not a failure,
   and never a reason to invent a command. This repository is that case.
3. **Defined but not trustworthy here** — the worktree's dependency-provisioning status is absent
   or negative and the command depends on it, or the command fails to run at all. Report that
   rather than concluding the spec is clean, exactly as *Addressing the story worktree* already
   requires for any dependency-dependent command. Reaching for a fetch-and-run substitute
   (`npx`-style) is already forbidden by that same paragraph and stays forbidden: a fetched CLI is
   not the project's toolchain, and its errors read exactly like a real defect in the file.

A fourth case is worth naming because it bounds `AC5` honestly: a project whose gate exists
**only in CI**, with no locally runnable command, cannot be checked by the `lead` at all. That is
outcome 2 as far as the steps go, and the handoff says so — so the run reports "no local gate to
check" rather than implying the spec was checked and passed.

### Keeping the format command inside the spec's own boundary

The format step must not write outside the file it is formatting. The definition requires the
**path-scoped** form where the project's command accepts a path; where it cannot be scoped to a
path, the `lead` runs the **check-only** form instead and routes a failure to the `writer`, rather
than running a repo-wide write. After the step, the worktree must show no path other than the spec
modified; anything else is collateral, and the `lead` stops and reports rather than committing it.

### Sections of `SKILL.md` that must move together

The change is small but it is not local — several sections of `SKILL.md` state the commit
sequence, and leaving any of them describing the old one reproduces the contradiction defect the
pipeline already treats as blocking. All of these move in the same pass:

| Section | What changes |
| --- | --- |
| Workflow step 3 | the format step before each (re-)audit dispatch; the floor after commit 1, before step 4; the existing "nothing left for you to check first" clause left intact and unmoved |
| *The commit model* | commit 1's bullet states the format precondition; the model gains the spec-format-fix commit that a floor failure produces |
| *When a gate finds a problem* | a floor failure naming the spec path routes to the `writer` |
| *Boundaries* | the carve-out (below) |
| *Final handoff* | the floor's outcome is reported; the commit enumeration includes a spec-format-fix commit |
| frontmatter `description` | read it; change it only if it now misstates what the skill does |

### The Boundaries carve-out

`SKILL.md`'s *Boundaries* currently say the `lead` never does an agent's work and never runs or
re-runs tests or validation. Both new steps have to be reconciled with that in the same pass, or
the file ships arguing with itself. The carve-out to state, narrowly:

- Both steps are **commit hygiene on the `lead`'s own commit**, not `qa`'s validation of the
  build. `qa` validates what the `coder` built; neither of these looks at the build, and neither
  replaces or pre-empts a `qa` round.
- The format step **authors nothing**. It is a mechanical normalisation of a file the `lead` is
  about to commit. Where a formatter's output would change the document's *content* rather than
  its formatting, that is not the `lead`'s to reconcile: the `auditor`'s equality check surfaces
  it and the `writer` fixes it.
- The `lead` still performs **no** check of its own over the card's acceptance criteria. Running a
  formatter over a file is not reading, comparing, or classifying a criterion.

### Deviations from the card

**None.** All five criteria are satisfiable as written, and the transcription above is the card's
text unmodified. Two things were examined and deliberately *not* treated as deviations:

- `AC2`'s "immediately before commit 1" is a description of the option being chosen, not a
  placement mandate that the design breaks. The property it exists to buy — the committed bytes
  are the format step's output — is preserved exactly, and is pinned by R1's third scenario. The
  reasoning is above, and it was also written back onto the card's `## Scope` note (below) so the
  acceptance gate meets it there too.
- `AC5` is an ordering property, not a behaviour, and is falsifiable by reading `SKILL.md`'s step
  order. Where a project has no locally runnable gate, nobody discovers a spec-commit gate failure
  locally and the criterion holds vacuously; R4's second scenario makes the pipeline *say* which
  of the two it is, so a vacuous pass is never reported as a real one.

**No *Already satisfied criteria* section**, deliberately. Each of the five was checked against
`SKILL.md` as it stands on `master`: it contains no occurrence of *format*, *formatter*, *lint*,
or *linter* anywhere, so nothing already satisfies `AC1`–`AC4`, and `AC5` fails today by the same
absence. Every criterion needs work, which is the condition under which the project's spec
template says to drop the section.

**Corrections applied to the board during this spec pass** (within the `update` authority
[`docs/ISSUE_TRACKING.md`](../ISSUE_TRACKING.md) declares), neither touching any acceptance
criterion's ask:

- **`SMR-144`** — its `## Scope` note claimed workflow step 3 "still ends" at "Once ready,
  **commit the spec** (commit 1)". [SMR-188](https://linear.app/ca77y/issue/SMR-188) extended that
  sentence, so the note is stale on that word. A dated amendment records the current wording, that
  the note's substantive point (step 3 says nothing about the formatter) still stands, and that
  the added clause is what makes the format step's placement load-bearing.
- **`SMR-171`** — its optional criterion called the ship commit "the only commit in a run that no
  validation has ever seen", which is false today: commit 1 is the other one, and that is this
  card's entire premise. A dated correction records that, notes that it becomes true once this
  story lands, and carries the coordination note below.

### Coordination

None of these have landed. The collisions are real and the reuse direction is stated per card.

- **[SMR-171](https://linear.app/ca77y/issue/SMR-171) — *Validate the docs pass's own output
  before it ships* (`Todo`).** The closest sibling. It scopes the same two mechanisms into
  `writer.md`'s docs pass: discovering the project's formatter/linter from project context rather
  than hardcoding it, and treating its absence as a stated outcome rather than a failure. It also
  carries an optional `lead`-side validation before the ship commit, which lands in the same file
  as this story's floor. **If `SMR-171` lands first, detect and reuse its discovery-and-absence
  wording rather than re-adding a second, differently-worded copy** — and place this story's floor
  beside its ship-commit run, not in competition with it. If this story lands first, `SMR-171`
  reuses this wording (a note to that effect is now on that card). The two floors are genuinely
  different checks — commit 1 versus the ship commit — and both should exist.
- **[SMR-169](https://linear.app/ca77y/issue/SMR-169) — *Hand qa a measured base-commit baseline*
  (`Backlog`).** It has the `lead` measure the project's validation against the base commit at
  workspace creation. That measurement is a strictly better attribution mechanism for this story's
  floor. **If `SMR-169` lands first, the floor compares against the recorded baseline instead of
  inspecting which paths a failure names**, and the path-inspection rule becomes the fallback for
  when no baseline could be measured.
- **[SMR-157](https://linear.app/ca77y/issue/SMR-157) — *Give the pipeline a prose-deliverable
  mode* (`Todo`).** It states, across `writer.md`/`coder.md`/`qa.md`, what "the project has no
  validation command" means and that failing to find one is the expected result rather than a
  blocker. That is the same absence-handling stance, for the worker agents. **Whichever lands
  second reuses the other's wording** rather than introducing a second vocabulary for the same
  fact.
- **[SMR-156](https://linear.app/ca77y/issue/SMR-156) — *Make a spec's Validation section scoped
  and reproducible* (`Backlog`).** Same hazard (a writing command escaping its boundary), a
  different owner: that card scopes commands a *spec* prescribes; this one scopes a command the
  `lead` itself invokes. No file overlap; the rationale above cites its evidence.
- **[SMR-187](https://linear.app/ca77y/issue/SMR-187) — *Make a shipped agent-definition change
  govern the run that ships it* (`Backlog`).** Relevant to *this* story's validation rather than
  to its design: the change ships as prose in `SKILL.md`, and the run that ships it will not
  execute the new steps. See *Validation*.

### Validation

**Precondition, measured 2026-08-07 in this worktree.** This repository defines **no format and no
lint command**: there is no `package.json`, no lockfile, no `Makefile`, and no formatter or linter
config at any level, and `.github/workflows/` contains only `claude.yml` and
`claude-code-review.yml` — no CI gate that runs a formatter. The worktree's
dependency-provisioning status is *not provisioned — no install step*, which is expected here per
the root [`CLAUDE.md`](../../CLAUDE.md). Two consequences, both deliberate:

1. The new steps **cannot be exercised on this repository**. Every run here takes outcome 2 —
   "not defined, skip and say so". That is the correct behaviour, and it is what the validation
   below checks for.
2. The deliverable is prose, so each Requirements scenario is falsifiable by **reading the changed
   file** — quote the line that satisfies it, or name what is missing — rather than by a test.
   There is no test runner in this repository to write one in.

The checks, all read-only, all run from the story worktree with `-C <worktree>` or an absolute
path under it:

- **V1** — Read `SKILL.md` end to end and, per Requirements scenario below, quote the line that
  satisfies it or name what is missing. This is the primary validation.
- **V2** — The root `CLAUDE.md` duplication checks still print `1` each: the five-file
  "Addressing the story worktree." grep, and the two-file "Board access is granted by your
  caller." grep. `SKILL.md` is one of the five, so an edit that disturbs that paragraph is caught
  here.
- **V3** — The root `CLAUDE.md` manifest-parity loop prints `ok` for both plugins, with both
  versions unchanged from `master` (`git -C <worktree> diff master -- 'plugins/*/plugin.json' 'plugins/*/.claude-plugin/plugin.json'` is empty).
- **V4** — The `coder`'s changed-file set is exactly
  `plugins/ca77y-engineering/skills/lead/SKILL.md` (plus this spec, committed as commit 1). No
  formatter, linter, or config is added to this repository; `writer.md`, `qa.md`, `coder.md`, and
  `auditor.md` are unchanged.
- **V5** — Grep `SKILL.md` for `prettier`, `eslint`, `make lint`, `pnpm`, `npm`, and `npx`: the
  new prose names no concrete tool (`AC4`), and introduces no fetch-and-run invocation.
- **V6** — Confirm `SKILL.md` step 3 still carries the sentence "the gate that just passed already
  proved the transcription matches the card, so there is nothing left for you to check first",
  unmoved and un-negated, and that no new step is described as happening between the passed gate
  and commit 1.

**Not validated by this run, and why.** The steps themselves go unexercised, for two independent
reasons: this repository defines no format or lint command (above), and a skill's body is read
from the installed plugin at invocation, so a run's own edit to `SKILL.md` does not govern that
run. *(Assumption, uncited: the loading behaviour is recorded on
[SMR-187](https://linear.app/ca77y/issue/SMR-187) for subagent definitions, and no path-and-line
citation is available here — the harness ships as a compiled binary, not as a readable dependency
in any tree this worktree or the root checkout can reach. What would settle it: exercising the
shipped skill on a later run. Nothing in this design depends on the claim; it only bounds what
this run's validation can honestly assert.)* A live exercise on a project that does define a
format/lint command is therefore a **follow-up**, recorded in the handoff rather than claimed here
— the same posture [SMR-180](https://linear.app/ca77y/issue/SMR-180) already takes for
`SMR-154`'s prose-only ship.

### Risks and alternatives

- **Risk: a formatter-versus-transcription deadlock.** On a project whose formatter rewrites text
  inside the transcription block, the `writer` re-transcribes, the `lead` re-formats, and the gate
  fails again — three times, then the 3× rule stops the run and escalates. That is the correct
  outcome for a genuine conflict between the project's formatter config and the pipeline's
  verbatim contract; it is a human decision, and it now surfaces at step 3 with no code built,
  rather than at the acceptance gate with a finished build behind it. Deliberately **not** solved
  here by teaching the equality check to normalise more (that weakens the check, and belongs to
  whoever owns `auditor.md`) or by emitting a formatter-suppression directive (tool-specific,
  which `AC4` forbids).
- **Risk: the carve-out is read as licence.** "The `lead` may run the project's tooling" could be
  stretched into the `lead` running the test suite and pre-empting `qa`. Mitigated by stating the
  carve-out as two named steps over one named path at two named moments, and by R8's scenario.
- **Alternative rejected — the `writer` as owner.** Symmetrical with `SMR-171`'s docs-pass step
  and it would put both formatting duties in one file. Rejected because it covers only text the
  `writer` itself last wrote, and because `AC1`/`AC3` both put the surrounding obligations on the
  commit-side actor, which would split one rule across two definitions.
- **Alternative rejected — format immediately before commit 1, after the gate.** The literal
  reading of `AC2`. Rejected because it contradicts step 3's existing closing clause, and because
  it defers detection of a format-induced transcription change to the acceptance gate at the far
  end of the run.
- **Alternative rejected — format before every commit the `lead` makes.** Superficially tidier.
  Rejected because silently reformatting the `coder`'s output before a round commit hides a
  convention failure from the `qa` review that exists to catch it.

## Requirements

### Requirement (R1): The `lead` formats the spec before the gate that precedes commit 1

#### Scenario: format on collection, before the gate

- **WHEN** the `lead` collects a `writer` spec-pass report and is about to dispatch the
  `auditor`'s spec-readiness gate
- **THEN** `SKILL.md` directs it to first run the project's format step, scoped to the spec path,
  and only then dispatch the gate

#### Scenario: every round, not only the first

- **WHEN** a spec-readiness gate returns findings and a revised spec comes back — by a resumed
  `writer`, a fresh `writer`, or any other route
- **THEN** the format step runs again before the fresh re-audit, so every gate judges the bytes
  that would be committed if it passed

#### Scenario: the committed bytes are the format step's output

- **WHEN** the gate passes and the `lead` commits the spec
- **THEN** `SKILL.md` states that nothing modifies the spec between the format step and commit 1 —
  the gate reads and returns a verdict — so commit 1 always carries the format step's output, and
  no step is inserted between the passed gate and the commit

#### Scenario: a formatter that alters the transcription is caught by the gate

- **WHEN** the format step changes text inside the spec's *Acceptance criteria (verbatim
  transcription)* section
- **THEN** the `auditor`'s mechanical equality check — run inside the gate that follows, on the
  formatted bytes — returns it as a blocking mismatch that routes to the `writer` for a respec,
  and `SKILL.md` adds no check of its own for this

### Requirement (R2): One owner, named once

#### Scenario: the definition names the `lead`

- **WHEN** reading `SKILL.md` for who is responsible for the spec being formatted
- **THEN** it names the `lead`, in one place, and states the alternative it is not taking (the
  `writer` returning pre-formatted output), so a reader cannot conclude both

#### Scenario: no second owner elsewhere

- **WHEN** searching `writer.md`, `coder.md`, `qa.md`, and `auditor.md` in the shipped diff
- **THEN** none of them gains a duty to format the spec, and none is modified by this story

### Requirement (R3): A lint floor between commit 1 and the `coder`

#### Scenario: the floor runs

- **WHEN** the project defines a lint command and commit 1 has landed
- **THEN** `SKILL.md` directs the `lead` to run it once, before dispatching the `coder` at step 4

#### Scenario: once per run

- **WHEN** the run later commits the build, a fix round, or the ship commit
- **THEN** the floor is not re-run — `SKILL.md` states it as a single run at that one point, not a
  per-round step

#### Scenario: a failure naming the spec path

- **WHEN** the floor reports a failure that names the spec's own path
- **THEN** it routes to the `writer` per *When a gate finds a problem*, the fix is committed as its
  own commit before the `coder` is dispatched, and *The commit model* and *Final handoff* both
  account for that commit

#### Scenario: a failure naming only untouched paths

- **WHEN** the floor reports failures only in files this run has not touched
- **THEN** `SKILL.md` directs the `lead` to record them as pre-existing and relay them in the
  handoff — not to route them to any agent, not to fix them, and not to stop the run

### Requirement (R4): `qa` is not the first to discover a spec-commit gate failure

#### Scenario: the ordering makes it structural

- **WHEN** commit 1 lands a spec that the project's lint command would reject
- **THEN** the floor at step 3 surfaces it before the step-4 `coder` dispatch and therefore before
  any `qa` dispatch at step 5 — the ordering is stated in `SKILL.md`, not left to inference

#### Scenario: a vacuous pass is reported as vacuous

- **WHEN** the project defines no locally runnable lint command — including a gate that exists only
  in CI
- **THEN** the handoff says the floor was skipped and why, rather than reporting a clean check,
  so "`qa` found no spec-caused failure" is never mistaken for "the spec was checked and passed"

> *Alternative cause, named per the authoring rules.* "`qa` reported no spec-caused gate failure"
> is also what a project with no lint command at all produces, with this whole mechanism absent.
> The second scenario is what distinguishes the two, by making the pipeline state which case it
> was in.

### Requirement (R5): The rule is project-agnostic and degrades honestly

#### Scenario: no tool is named

- **WHEN** reading the new prose in `SKILL.md`
- **THEN** it refers to *the project's* format and lint commands, discovered from project context,
  and names no concrete tool — no `prettier`, `eslint`, `make lint`, or package-manager script

#### Scenario: the project defines neither

- **WHEN** no format or lint command can be discovered from project context
- **THEN** both steps are skipped, the handoff says so, and `SKILL.md` states plainly that the
  absence is a stated outcome rather than a failure and never a reason to invent a command

#### Scenario: defined but not trustworthy here

- **WHEN** a command exists but the worktree's dependency-provisioning status is absent or negative
  and the command depends on it, or the command fails to run
- **THEN** `SKILL.md` directs the `lead` to report that rather than conclude the spec is clean, and
  the existing ban on a fetch-and-run substitute is left in force

### Requirement (R6): The format command cannot write outside the spec path

#### Scenario: scoped, or check-only

- **WHEN** the `lead` invokes the project's format command
- **THEN** `SKILL.md` requires the path-scoped form where the command accepts a path, and the
  check-only form — with a failure routed to the `writer` — where it cannot be scoped, rather than
  a repo-wide write

#### Scenario: collateral stops the run

- **WHEN** after the format step the worktree shows any path other than the spec modified
- **THEN** `SKILL.md` directs the `lead` to stop and report rather than commit it

### Requirement (R7): `SKILL.md` states one commit sequence, everywhere

#### Scenario: the commit model agrees

- **WHEN** reading *The commit model*
- **THEN** commit 1's bullet states the format precondition, and the enumeration of a run's commits
  includes the spec-format-fix commit a floor failure can produce

#### Scenario: the boundaries agree

- **WHEN** reading *Boundaries*
- **THEN** it carries the carve-out — both steps are commit hygiene on the `lead`'s own commit,
  not `qa`'s validation of the build; the format step authors nothing; the `lead` still runs no
  check of its own over the card's criteria — reconciled with the existing "never do an agent's
  work" and "do not run or re-run tests" lines rather than contradicting them

#### Scenario: routing and handoff agree

- **WHEN** reading *When a gate finds a problem* and *Final handoff*
- **THEN** the first routes a floor failure naming the spec path to the `writer`, and the second
  reports the floor's outcome — ran clean, failed and how it closed, or skipped with the reason —
  and enumerates the spec-format-fix commit alongside the run's other commits

#### Scenario: no section is left describing the old sequence

- **WHEN** searching `SKILL.md` for every sentence that describes what happens around commit 1
- **THEN** each one describes the new sequence, and the frontmatter `description` does not
  misstate what the skill does

### Requirement (R8): The `lead` gains no authority over the card's criteria

#### Scenario: the format step is not a criteria check

- **WHEN** reading the new prose against *The criteria checks are the auditor's*
- **THEN** neither new step reads, compares, or classifies an acceptance criterion, that section
  is unmodified and un-negated, and the new prose says explicitly that a format-induced change to
  the transcription is the `auditor`'s to detect and the `writer`'s to fix

## Tasks

Every task below is the `coder`'s unless marked otherwise. All edits are in
`plugins/ca77y-engineering/skills/lead/SKILL.md`; no other file under `plugins/` changes.

- [ ] **T1** — Workflow step 3: add the format step on collection of every `writer` spec-pass
      round, before the (re-)audit dispatch — path-scoped or check-only, the project's own command
      discovered from project context, the three outcomes (runnable / not defined / not
      trustworthy), and the statement that nothing modifies the spec between it and commit 1.
      Leave the existing closing clause ("…nothing left for you to check first") intact and
      unmoved. Satisfies R1, R5, R6.
- [ ] **T2** — Workflow step 3: add the post-commit-1 lint floor before the step-4 `coder`
      dispatch — once per run, with the attribution rule (spec path → `writer`, plus its own
      commit; untouched paths → recorded as pre-existing and relayed), and the CI-only case.
      Satisfies R3, R4.
- [ ] **T3** — *The commit model*: state the format precondition on commit 1's bullet, and add the
      spec-format-fix commit to the model. Satisfies R7's first scenario.
- [ ] **T4** — *Boundaries*: add the carve-out, reconciled with the existing "never do an agent's
      work" and "do not run or re-run tests" lines. Satisfies R7's second scenario and R8.
- [ ] **T5** — *When a gate finds a problem*: route a floor failure naming the spec path to the
      `writer`. Satisfies the first half of R7's third scenario.
- [ ] **T6** — *Final handoff*: report the floor's outcome, and include the spec-format-fix commit
      in the commit enumeration. Satisfies the second half of R7's third scenario.
- [ ] **T7** — Read the frontmatter `description` and the whole of `SKILL.md`; change the
      description only if it now misstates what the skill does, and fix any other sentence left
      describing the old sequence. Satisfies R7's fourth scenario.
- [ ] **T8** — Confirm the owner is named exactly once and that `writer.md`, `coder.md`, `qa.md`,
      and `auditor.md` are untouched. Satisfies R2.
- [ ] **T9** — Run V2 and V3 (the root `CLAUDE.md` duplication greps and the manifest-parity
      loop) and V5 (the tool-name grep); report the actual output. Satisfies part of *Validation*.
- [ ] **T10** — *(Not the `coder`'s task — the `writer`'s docs pass, step 7.)* Update the root
      `README.md` (the lead's pipeline step 3 and its **The commit model** paragraph) and
      `docs/ARCHITECTURE.md` (*The commit model*) to describe the format step, the floor, and the
      spec-format-fix commit; then convert and remove this spec. Required by `docs/CLAUDE.md`
      ("when an agent's behavior changes, update the README") — no acceptance criterion depends on
      it, so the acceptance gate at step 6 is not blocked by its ordering after that gate.
