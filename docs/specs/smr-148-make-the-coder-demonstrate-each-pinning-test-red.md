# Make the coder demonstrate each pinning test red, not just name it

- **Status**: Draft
- **Task**: smr-148-make-the-coder-demonstrate-each-pinning-test-red
- **Last Updated**: 2026-08-09
- **Document Scope**: One unit of work: turn the `coder`'s per-finding pinning claim into observed evidence with a three-term outcome vocabulary, and make `qa` consume that evidence instead of re-deriving it

---

## Goal

**The problem.** `plugins/ca77y-engineering/agents/coder.md` already requires that every
behavioural fix be pinned by a test that fails without it, and requires the `coder` to name
that test per finding — the bold lead-in **Every behavioural fix needs a test that fails
without it.** under *Fixing the findings the lead routes to you*. Naming is free and cannot be
contradicted by anything the round produces, so a plausible-looking name survives unfalsified
and an unpinned fix reports identically to a pinned one. On `timer-cue-sync` this shipped: a
real production fix was reported closed with a named test, and the round after, deleting the
fixed line left the whole suite green — the named test covered the *adjacent* finding and
passed with or without the fix. It surfaced only because that `qa` round happened to be
instructed to mutation-test, one round before shipping.

**The change.** Two agent definitions, one on each side of the same evidence:

- **`coder.md` produces the evidence.** The pinning obligation gains a **demonstration**: for
  each behavioural fix, revert the fix in the working tree, run the named test, observe it go
  red, restore the fix, and re-run it green — then report the failure that was *observed*, test
  name plus the assertion that went red, rather than the claim that it would fail. Each fix
  carries exactly one of three outcomes: **demonstrated**, **not demonstrated**, or **nothing
  can reach it**.
- **`qa.md` consumes it.** A **demonstrated** pin is trusted and not re-derived. A **not
  demonstrated** one is probed by the same revert-run-restore. A **nothing can reach it** entry
  is inherited as a known gap and reported as one, rather than rediscovered a round later.

**User value.** The round that closes a finding is the round that proves it closed. Today the
proof, if it happens at all, happens by luck in a later `qa` round or not at all — and an
unpinned fix reaches the PR looking exactly like a covered one. Revert-run-restore costs
seconds per finding and converts a belief into a line the `lead` and `qa` can read; the
evidence then redirects `qa`'s budget onto the fixes that actually lack it.

**Non-goals.**

- **No mutation testing of the suite.** The demonstration is per **behavioural fix on a
  findings round**, over the **named test only**. The initial build's one-scenario-test-per-
  scenario duty is untouched, and no change acquires a demonstration duty by being a change.
- **No second code-only demonstration rule.** `SMR-157` shipped the prose-deliverable branch
  first (PR #22, `1107d98`); this story reconciles with that branch rather than presupposing a
  runnable test everywhere. See *Reconciling with `SMR-157`'s shipped wording*.
- **`writer.md`, `auditor.md`, and the `lead` skill are not edited.** No criterion asks for a
  gate-side or orchestrator-side net, and adding one would put the same obligation in four
  files.
- **`qa` still fixes no feature code.** The probe is a temporary, restored revert; the carve-out
  is stated narrowly and the existing boundary is left in force.
- **No plugin version bump.** Versions are a manual human decision per the root
  [`CLAUDE.md`](../../CLAUDE.md).
- **The root `README.md` and `docs/ARCHITECTURE.md` are not the `coder`'s.** They change, but in
  the docs pass — see `T10`.

## Acceptance criteria (verbatim transcription)

> **Source**: card `SMR-148`, read from Linear (the `Agentic Claude` project, `Smerfy` team) via
> the `read` binding on **2026-08-09**, at status `In Progress`, **after** this spec pass's
> criterion correction was applied to the card (see *Deviations from the card*). This is a
> **copy, not a summary** — one card bullet per `ACn` line, in card order, `n = 5`.
>
> **Why a checked copy is licensed where a paraphrase is not.** Elsewhere this pipeline forbids
> restating a card's criteria into a dispatch prompt, because a paraphrase drifts toward what
> the work already does. A verbatim copy carries exactly the same failure mode unless something
> proves the copy really was verbatim. The `auditor`'s **mechanical equality check** is that
> proof: it compares this section against the card's own criteria character for character,
> normalising only Linear's `-`-to-`*` bullet rewrite and its `<…>`-wrapping of bare URLs, and
> it runs that check itself inside the spec-readiness gate before judging anything and again
> inside the acceptance gate before grading any criterion, on every round of each. The licence
> is that check, not an assurance from this document that the copy is faithful.
>
> **No third normalisation is needed.** `AC1`'s amendment refers to the other card as the code
> span `` `SMR-157` `` precisely so Linear does not store it as an `<issue …>` mention tag; the
> criteria below therefore contain no markup the equality check would have to strip.

- **AC1** — For each behavioural fix, the coder reverts the fix in the working tree, runs the named test, confirms it fails, restores the fix, and reports the **observed** failure — test name plus the assertion that went red — rather than an assertion that it would fail. *(Amended 2026-08-09 during this card's spec pass, per this card's own* `## References` *note below. The card* `SMR-157` *shipped first, so* `coder.md` *now carries a prose-deliverable branch in which there is no runnable test to revert and run. In that branch — and only there — the demonstration takes its prose-mode analogue: the exact line in the changed artifact that carries the fix, quoted and keyed to the finding, with the region a reader finds it by and what a reader would find missing were that line removed, reported with the same observed-versus-asserted distinction. Where the project has a test runner this criterion is unchanged, and the analogue never substitutes for a demonstration that could have been run.)*
- **AC2** — The report distinguishes a demonstrated pin from an undemonstrated one, so an unpinned fix cannot read as a pinned one.
- **AC3** — Where the coder concludes nothing can reach the fix, it says so explicitly and `qa` inherits it as a known gap instead of rediscovering it.
- **AC4** — `qa` is told it can trust a demonstrated pin and must probe an undemonstrated one, so the evidence changes what the next round costs.
- **AC5** — The obligation stays scoped to behavioural fixes and does not turn every change into a mutation-testing exercise.

## Design

### How each criterion is satisfied

Every criterion is closed by the `coder`'s build. No criterion depends on the docs pass or on a
manual step, so none carries a non-`coder` owning mechanism. (`T10` *is* a non-`coder` task —
the docs pass's `README.md`/`ARCHITECTURE.md` update, required by `docs/CLAUDE.md` — but no
criterion depends on it, so the acceptance gate is not blocked by its ordering after that gate.)

| Criterion | Requirements that close it | Tasks |
| --- | --- | --- |
| `AC1` | R1 (all four scenarios), R3 (the prose-mode half of the same criterion) | T1, T3 |
| `AC2` | R2, resting on R1's *the observed failure, not the predicted one* for what a demonstrated entry must carry | T1, T2, T5 |
| `AC3` | R2's *the vocabulary is closed at three terms* and *unrunnable is not unreachable*, R5's *a known gap is inherited, not rediscovered* | T2, T6 |
| `AC4` | R5, with R6 keeping the probe inside `qa`'s boundaries | T6, T7, T8 |
| `AC5` | R4 | T4 |

R7 closes no criterion on its own: it keeps the rest of the two files from contradicting the new
rule. Without it `AC2` fails in practice — `coder.md`'s *Output* section and its numbered
findings step both currently state a naming-only duty, and a reader who reaches either first
obeys the superseded version.

### Boundary

**The deliverable is a non-code artifact: two Markdown agent definitions,**
`plugins/ca77y-engineering/agents/coder.md` and `plugins/ca77y-engineering/agents/qa.md`. This
repository defines no test runner, build, or validation command — it has no `package.json`, no
lockfile, and no `Makefile` (measured in this worktree, 2026-08-09; the worktree's
dependency-provisioning status is *no dependencies required*, which the root
[`CLAUDE.md`](../../CLAUDE.md) records as this repo's expected status). Both facts of the
`coder`'s prose-deliverable branch therefore hold for **this** build: every Requirements
scenario below is falsifiable by reading the changed file, and the `coder` records one
inspectable assertion per scenario rather than a test.

**Edit sites** — the whole changed-file set under `plugins/`:

| File | Region |
| --- | --- |
| `agents/coder.md` | *Fixing the findings the lead routes to you* — the numbered item **2**, and the bold lead-in **Every behavioural fix needs a test that fails without it.** |
| `agents/coder.md` | *Output* — the findings-round sentence naming "the test pinning each behavioural fix" |
| `agents/coder.md` | *Rules* — the bullet "never revert another agent's changes", read for tension with the new revert (there is none: the demonstration reverts the `coder`'s **own** fix, temporarily) |
| `agents/coder.md` | frontmatter `description` |
| `agents/qa.md` | *What you do* — steps **2**, **3**, and **7**, and the sentence **The prose-deliverable branch touches steps 1–4 only.** |
| `agents/qa.md` | *Boundaries* — the **Do not fix feature code.** bullet |
| `agents/qa.md` | frontmatter `description` |

Both frontmatter `description`s are inside this enumeration and inside the `coder`'s scope, per
`writer.md`'s rule that a definition file's edit sites include its own `description`. Read each
in the same pass as the body: change it only where the new behaviour makes it misstate what the
agent does, and record that it was checked either way, so a checked `description` is
distinguishable from one never opened. My own reading is that neither `description` asserts
anything this change falsifies — `coder.md`'s describes how findings reach it and that it
applies them in one go; `qa.md`'s describes validating, filling gaps, and reviewing the diff —
but the check is the `coder`'s to perform against the wording it actually ships, not a
conclusion to inherit from here.

**Not touched, deliberately**: the canonical **Addressing the story worktree.** paragraph in
either file (it is one of five byte-identical copies guarded by a root-`CLAUDE.md` drift check);
`writer.md`, `auditor.md`, `analyst.md`, the `lead` skill, anything under
`plugins/ca77y-library/`; every `plugin.json` and `.claude-plugin/plugin.json`. The root
`README.md` and `docs/ARCHITECTURE.md` **do** need the change described, but they belong to the
docs pass (`T10`), not to this build.

### The three outcomes, and why exactly three

The rule's whole value is that a fix cannot be reported in a way that reads like evidence when
it is not, so the vocabulary is closed at three terms, used verbatim in both files:

| Outcome | Meaning | What the report carries |
| --- | --- | --- |
| **demonstrated** | the fix was reverted, the named test was observed red, the fix was restored, the test re-ran green | the test's name and the assertion that went red, quoted from the real output |
| **not demonstrated** | a test is named but red was never observed here | the reason — the demonstration was not attempted, or the test could not be run (see below) |
| **nothing can reach it** | no test can reach the fix at all | the concrete reason no test can reach it |

**The second and third are not the same thing, and collapsing them is the failure mode.** A test
that exists but could not be run here — an untrustworthy or absent dependency-provisioning
status, a runner that will not start — is **not demonstrated** with that reason, never **nothing
can reach it**. This is deliberately the same distinction `docs/ARCHITECTURE.md` already insists
on for command discovery under *When the deliverable is prose, not code*: **not defined** versus
**defined but not trustworthy here**, where "collapsing them is how an unprovisioned worktree's
failed command gets waved through". Here the same collapse would convert a temporary
environment problem into a permanent, accepted coverage gap.

**Absence defaults to *not demonstrated*.** A behavioural fix reported with no outcome at all is
read as **not demonstrated** by `qa`, never as demonstrated — so silence costs a probe rather
than buying a pass. `AC2`'s "cannot read as a pinned one" is what this sentence exists for.

### The demonstration procedure, and the restore that must not be forgotten

Per behavioural fix, one at a time, never two reverts in flight at once:

1. **Revert** the fix in the working tree — the narrowest edit that undoes it, keeping the
   removed text.
2. **Run the named test** — that test, or at minimum only its file. Not the suite: `AC5`'s cost
   bound is what keeps this from becoming a mutation-testing exercise, and a whole-suite run
   proves nothing the single test does not.
3. **Observe** the failure and record it: the test's name and the assertion that went red, from
   the real output.
4. **Restore** the fix verbatim.
5. **Re-run** the same test and observe it green again.

Step 5 is not bookkeeping. The realistic hazard of this whole rule is a revert that is never
restored — a `coder` that ships the bug it just fixed, with a report claiming the fix is pinned.
An observation is what closes that, not an intention: the restore is proved by the same test
going green, and a revert that cannot be restored is reported to the `lead` as a blocker
immediately, never left in the tree.

### Reconciling with `SMR-157`'s shipped wording

`SMR-157` landed first (merged as PR #22, `1107d98`) and gave `coder.md` a named
**prose-deliverable branch** in *The loop* step 2, fired by a conjunction of two independently
observable facts — the spec's Boundary content declares the deliverable a non-code artifact,
**and** the project's context supplies no test runner or validation command. Its findings-round
half is the existing clause "or, in the prose-deliverable branch, the inspectable assertion the
fix re-satisfies".

Three consequences for this design, all deliberate:

- **The trigger is stated once and pointed at, never restated.** The demonstration rule refers
  to *the prose-deliverable branch* by that name; it does not repeat the two-fact conjunction.
  `docs/ARCHITECTURE.md`'s *Four ways an obligation gets repeated* names this arrangement —
  "stated once, pointed at from everywhere else" — and names what it avoids: two independently
  readable statements of one duty in a single file, where an agent obeys whichever it reaches
  first and an edit to one leaves the other asserting the superseded version. A second copy of
  the trigger is exactly that defect.
- **The analogue extends the existing clause rather than replacing it.** In that branch the
  demonstration is: the exact quoted line in the changed artifact that carries the fix, the
  region a reader finds it by (a heading, a bold lead-in, or a quoted phrase — **never a line
  number**, which the same pass's later edits move), keyed to the finding it closes, and what a
  reader would find missing were that line removed. The last clause is the prose counterpart of
  "the assertion that went red": without it the entry degrades into the quotation the existing
  wording already asks for, and nothing has been demonstrated.
- **The three outcomes are shared, not duplicated per mode.** In the prose branch **nothing can
  reach it** is the stated outcome where no passage in the artifact carries the fix in a
  reader-checkable way — which is what the card's own References ask for — and **not
  demonstrated** covers a fix whose owning passage was never identified. `qa`'s consumption rule
  keys on the three terms and therefore needs no second branch of its own.

**This is the "two sides of one defect" arrangement, not a canonical pair.** `coder.md` produces
the evidence and `qa.md` consumes it: two different jobs, so the surrounding prose is
deliberately different in each file and **no byte-identical drift check applies** — the root
`CLAUDE.md`'s two `sort -u | wc -l` checks are not extended, and adding a third would fail on a
correct pair. What must cross the file boundary unchanged is only the **three outcome terms**,
which is why V4 checks for the terms rather than for a shared paragraph.

### What `qa` does with the evidence

Extending the steps `qa.md` already has, rather than adding a step — renumbering would touch
step 5, step 6, step 7, and the sentence bounding the prose branch to steps 1–4, for no gain:

- **Step 2 (find the gaps)** gains the intake: the `coder`'s report carries one of the three
  outcomes per behavioural fix. **demonstrated** is trusted and not re-derived — that is where
  the cost saving `AC4` asks for actually comes from. **not demonstrated** (including a fix
  reported with no outcome at all) is a gap to probe. **nothing can reach it** is recorded as a
  known gap.
- **Step 3 (add the missing tests)** gains the probe: the same revert-run-restore, on `qa`'s own
  authority, over the named test. If the test goes red, the pin holds and `qa` records it. If it
  stays green — or no test was named — the fix is unpinned: `qa` reports it as a finding naming
  the fix and the test it was claimed to have, and **adds the covering test itself** where one
  is possible, which is squarely its existing mandate to write the tests the coder did not. The
  finding is reported even when `qa` closes it with its own test, because the `coder`'s report
  was wrong and the `lead` needs to see that.
- **A known gap is inherited, not rediscovered.** `qa` carries a **nothing can reach it** entry
  into its report as a stated gap rather than re-deriving whether some test could have reached
  it. Challenging a *stated* reason is cheap and stays open to it — a reachable seam `qa` can
  see, against a claim that none exists, is an ordinary review finding — but that is a judgement
  on a sentence, not a rediscovery of an unstated hole a round later.
- **Prose mode needs no new branch for steps 5–7**, so the sentence **The prose-deliverable
  branch touches steps 1–4 only.** stays true: the probe lives in steps 2 and 3 and takes its
  prose form there (re-read the named region; check the quoted sentence is present and answers
  the finding it is keyed to), and the step-7 report line is an observation either way.

### The `qa` boundary carve-out

`qa.md`'s *Boundaries* say **Do not fix feature code.** A probe edits feature code temporarily,
so the two have to be reconciled in the same pass or the file ships arguing with itself. The
carve-out, stated narrowly:

- A probe is a **temporary, restored revert**, not a fix. It removes a fix to observe an outcome
  and puts it back; it never leaves feature code different from how the `coder` left it.
- **Restoration is verified, not assumed** — the same restore-and-re-run as the `coder`'s, plus
  a check that the worktree carries exactly what it carried before the probe. `qa` runs against
  a tree whose round the `lead` has already committed (*The commit model*, one commit per
  pre-ship round), so "before the probe" is a state `qa` can establish and confirm it has
  returned to. A probe that cannot be restored is a blocking finding reported immediately.
- **Everything else stands**: `qa` still fixes no feature code, still writes tests rather than
  feature changes, and still may not weaken or delete a failing test to make the suite pass.

### Risks and alternatives

- **Risk: an unrestored revert ships the bug.** The single most damaging failure this rule can
  introduce, on both sides. Mitigated by making restoration an *observation* (the test green
  again, the tree as it was) rather than a step someone remembers, and by requiring one fix's
  demonstration to complete before the next begins. R1's fourth and R6's first scenarios pin it.
- **Risk: the rule inflates into whole-suite mutation testing.** Mitigated by three explicit
  bounds — behavioural fixes on a findings round only, the named test only, and an explicit
  exclusion list for the changes that carry no demonstration (R4).
- **Risk: `qa` re-derives everything anyway**, and the evidence saves nothing. Mitigated by
  stating the trust direction as an instruction, not a permission: a **demonstrated** pin is
  *not* re-derived.
- **Alternative rejected — put the demonstration on `qa` alone.** It is where the defect was
  actually caught on `timer-cue-sync`. Rejected because it moves the proof one agent and one
  round away from the person who made the claim, which is the exact distance that let the
  original defect survive; and `AC1` names the `coder`.
- **Alternative rejected — require the demonstration on the initial build too.** Every scenario
  test would need a revert-run-restore, which is `AC5`'s "mutation-testing exercise" almost
  exactly. The build's tests are written *from* the scenarios, so the adjacent-test trap the
  card describes is a findings-round hazard, not a build one.
- **Alternative rejected — a fourth outcome for "test exists but could not be run here".** It
  reads tidier and is worse: `qa`'s rule would need a fourth branch, and the case genuinely
  behaves like **not demonstrated** (probe it) rather than like a permanent gap. It is carried
  as a required *reason* on that outcome instead.

### Deviations from the card

**One, and it was corrected on the card rather than only recorded here.** `AC1`'s procedure —
revert, run the named test, confirm it fails, restore — presupposes a runnable test, and in the
prose-deliverable branch `SMR-157` shipped there is none. Narrowing the criterion silently
inside a scenario was not an option: the acceptance gate reads the card. Within the `update`
authority [`docs/ISSUE_TRACKING.md`](../ISSUE_TRACKING.md) declares, and in the spec-pass window
where correcting a criterion is legal because no code exists yet to reshape it toward:

- **`SMR-148` `AC1`** — a dated amendment records that the prose branch takes the analogue the
  card's own `## References` already specifies, that the code case is unchanged, and that the
  analogue never substitutes for a demonstration that could have been run. The criterion's ask —
  observed evidence rather than an assertion — is untouched.
- **`SMR-148` `## References`** — a dated note records that `SMR-157` landed first (PR #22,
  `1107d98`), so the "whichever lands second reconciles" instruction resolves onto this card.

The transcription above was taken **after** both edits.

**No *Already satisfied criteria* section**, deliberately. Each criterion was checked against
`coder.md` and `qa.md` as they stand on `master` (`2b564ed`). `coder.md`'s pinning obligation
asks only that a test be *named*: its "the test that goes red when the fix is reverted" is a
counterfactual describing which test to name, and nothing in the file asks anyone to perform
that revert, run anything, restore anything, or report an observed failure — so `AC1` fails
today; its report shape offers no way to tell a demonstrated pin from a named one, so `AC2`
fails; its existing "or the concrete reason nothing can reach it" clause is half of `AC3`, but
`qa.md` says nothing about inheriting such a gap, so `AC3` fails as a whole;
`qa.md` contains nothing about trusting or probing a pin, so `AC4` fails; and `AC5` constrains
the scope of an obligation that does not yet exist, so it cannot be satisfied by existing text.
Every criterion needs work, which is the condition under which the project's spec template says
to drop the section.

### Coordination

Neither of these has landed. Both overlap this story's files; the reuse direction is stated per
card, and each card's own note is what a `coder` working from one of them would otherwise lack.

- **[SMR-181](https://linear.app/ca77y/issue/SMR-181) — *Stop a spec's negative constraints
  reaching the artifact as prose in the coder and writer* (`Backlog`).** Edits `coder.md`, and
  its criteria add a tell-sweep over the files each pass created or edited. No collision with
  this story's regions, but its own References already carry the standing instruction —
  "whichever of any overlapping pair lands second reconciles with the other's shipped wording
  rather than restating it". **If `SMR-181` lands first, this story's new prose is written to
  survive its tell-sweep** (no sentence narrating what the rule does not cover — the exclusion
  list in R4 is an operative instruction about what carries no demonstration, not a narration of
  the document's omissions).
- **[SMR-169](https://linear.app/ca77y/issue/SMR-169) — *Hand qa a measured base-commit
  baseline* (`Backlog`).** Edits `qa.md` and the `lead` skill so a red suite is attributable to
  the diff rather than argued from file identity. Different question — that baseline answers
  "was this failure already there?", this probe answers "does this test see this fix?" — but
  both give `qa` a measurement in place of an argument, and both land in `qa.md`. **If
  `SMR-169` lands first, place the probe beside its baseline wording and reuse its vocabulary
  for a measurement `qa` could not take**, rather than introducing a second one. That card
  carried no note of this overlap, so one was added to it during this spec pass (a dated
  `## References` entry, plus the `relatedTo` relation) — a `coder` working from `SMR-169`
  alone would otherwise have no signal the collision exists.

### Validation

**Precondition, measured in this worktree on 2026-08-09.** This repository defines no test
runner, build, or validation command: no `package.json`, no lockfile, no `Makefile`, and
`.github/workflows/` carries only the two Claude workflows. The worktree's
dependency-provisioning status is *no dependencies required*, the root `CLAUDE.md`'s expected
status for this repo. Two consequences: the shipped rule cannot be **exercised** here (no test
exists to revert anything against), and each Requirements scenario is falsifiable by reading the
changed file — quote the line that satisfies it, or name what is missing.

All checks are read-only and run from the story worktree, with `-C <worktree>` or an absolute
path under it:

- **V1** — Read `coder.md` and `qa.md` end to end and, per Requirements scenario below, quote
  the line that satisfies it or name what is missing. This is the primary validation. An entry
  is verified by **opening the region and reading it**, never by accepting a paraphrase: a
  grep hit proves a term is present somewhere, not that the sentence containing it says what the
  scenario asks.
- **V2** — The root `CLAUDE.md`'s five-file **Addressing the story worktree.** grep still prints
  `1`, and its two-file **Board access is granted by your caller.** grep still prints `1`.
  `coder.md` and `qa.md` are both among the five, so an edit that disturbs that paragraph is
  caught here.
- **V3** — The root `CLAUDE.md` manifest-parity loop prints `ok` for both plugins, and both
  versions are unchanged from `master`:
  `git -C <worktree> diff master -- 'plugins/*/plugin.json' 'plugins/*/.claude-plugin/plugin.json'`
  is empty.
- **V4** — Each of the three outcome terms — `demonstrated`, `not demonstrated`, `nothing can
  reach it` — appears in **both** `coder.md` and `qa.md`, in the same words. The property is
  that the vocabulary crosses the file boundary intact; V1 is what confirms each occurrence
  means what the scenario says.
- **V5** — The `coder`'s changed-file set under `plugins/` is exactly `agents/coder.md` and
  `agents/qa.md`:
  `git -C <worktree> diff --name-only master -- plugins/` names those two and nothing else.
  `writer.md`, `auditor.md`, `analyst.md`, the `lead` skill, and everything under
  `plugins/ca77y-library/` are unchanged.
- **V6** — Grep the new prose in both files for a named test tool (`jest`, `vitest`, `pytest`,
  `npm`, `pnpm`, `npx`): it names none, and introduces no fetch-and-run invocation. The rule
  refers to *the named test* and *the project's validation commands*, which is what makes it
  project-agnostic.
- **V7** — `coder.md`'s prose-deliverable trigger (the two-fact conjunction) still appears in
  exactly one place in that file: the demonstration rule points at the branch by name rather
  than restating the conjunction.

**Not validated by this run, and why.** The shipped rule goes unexercised, for two independent
reasons: this repository has no test runner to demonstrate anything against (above), and a
subagent's definition is loaded from the installed plugin at dispatch time, so this run's own
edit to `coder.md`/`qa.md` does not govern this run. *(Assumption, uncited: the loading
behaviour is recorded on [SMR-187](https://linear.app/ca77y/issue/SMR-187) and no path-and-line
citation is available — the harness ships as a compiled binary, not as a readable dependency in
any tree this worktree or the root checkout can reach. What would settle it: exercising the
shipped rule on a later run against a project that has a test suite. Nothing in this design
depends on the claim; it only bounds what this run's validation can honestly assert.)* A live
exercise on a project with a real suite is therefore a **follow-up recorded in the handoff**,
not something this run may claim — the same posture
[SMR-180](https://linear.app/ca77y/issue/SMR-180) already takes for `SMR-154`'s prose-only ship.

## Requirements

### Requirement (R1): The `coder` demonstrates each behavioural fix red, and reports what it observed

#### Scenario: the procedure is stated in full

- **WHEN** a `coder` reads `coder.md` for what it owes per behavioural fix on a findings round
- **THEN** it finds all five steps stated — revert the fix in the working tree, run the named
  test, observe it fail, restore the fix, re-run it green — as the demonstration the pinning
  obligation now requires, not as an optional extra

#### Scenario: the observed failure, not the predicted one

- **WHEN** the `coder` reports a fix as **demonstrated**
- **THEN** `coder.md` requires the entry to carry the test's name **and the assertion that went
  red**, taken from the real output, and states plainly that a claim the test *would* fail is
  not a demonstration

#### Scenario: the named test, not the suite

- **WHEN** the `coder` performs the demonstration
- **THEN** `coder.md` scopes the run to the named test — or at minimum its file — rather than
  the whole suite, and states that one fix's demonstration completes before the next begins

#### Scenario: the restore is proved, and a failed restore stops the round

- **WHEN** the `coder` restores a reverted fix
- **THEN** `coder.md` requires the restoration to be **observed** — the same test green again,
  and the worktree carrying the fix — and requires a revert that cannot be restored to be
  reported to the `lead` as a blocker immediately, never left in the tree

> *Alternative cause, named per the authoring rules.* A green test after the restore is also
> what a `coder` that never reverted anything would see, with this whole procedure absent. What
> distinguishes them is the **red** observation in the second scenario, which cannot be produced
> without a real revert — which is why the demonstration is reported as an observed failure with
> its assertion quoted, and why a report carrying only the green re-run is **not demonstrated**.

### Requirement (R2): Every behavioural fix carries one of exactly three outcomes

#### Scenario: the vocabulary is closed at three terms

- **WHEN** reading `coder.md`'s pinning obligation
- **THEN** it names exactly three per-fix outcomes — **demonstrated**, **not demonstrated**, and
  **nothing can reach it** — as the complete set, and requires each behavioural fix in the
  report to carry one of them

#### Scenario: absence is never demonstrated

- **WHEN** a behavioural fix is reported with no demonstration recorded, whatever the reason
- **THEN** `coder.md` states it is **not demonstrated**, so an unpinned fix cannot read as a
  pinned one, and `qa.md` reads a missing outcome the same way

#### Scenario: unrunnable is not unreachable

- **WHEN** a test exists but red could not be observed here — the demonstration was not
  attempted, the worktree's dependency-provisioning status makes the run untrustworthy, or the
  runner will not start
- **THEN** both files place that case under **not demonstrated** with its reason, and reserve
  **nothing can reach it** for a fix no test can reach at all, with the concrete reason stated

### Requirement (R3): The prose-deliverable branch has its own demonstration, keyed to `SMR-157`'s shipped wording

#### Scenario: the trigger is pointed at, not restated

- **WHEN** reading the demonstration rule in `coder.md`
- **THEN** it refers to the **prose-deliverable branch** by name, and the two-fact conjunction
  that fires that branch remains stated in exactly one place in the file

#### Scenario: the prose analogue

- **WHEN** the prose-deliverable branch is in force and the `coder` closes a behavioural fix
- **THEN** `coder.md` requires, in place of a test run: the exact quoted line in the changed
  artifact that carries the fix, the region a reader finds it by (a heading, a bold lead-in, or
  a quoted phrase — never a line number), the finding it is keyed to, and what a reader would
  find missing were that line removed

#### Scenario: the same three outcomes, in both modes

- **WHEN** no passage in the artifact carries the fix in a reader-checkable way
- **THEN** **nothing can reach it** is the stated outcome, with its reason — and the three terms
  are the same three in either mode, so `qa`'s consumption rule needs no second branch

#### Scenario: the code path is not weakened

- **WHEN** the project has a test runner, including on a task whose deliverable is only partly a
  document
- **THEN** the runnable demonstration is what is required, and `coder.md` states that the prose
  analogue never substitutes for a demonstration that could have been run

### Requirement (R4): The obligation is bounded to behavioural fixes on a findings round

#### Scenario: the initial build is untouched

- **WHEN** the `coder` completes its initial build and reports up
- **THEN** `coder.md`'s one-scenario-test-per-scenario duty carries no demonstration
  requirement, and the demonstration is stated as belonging to a findings round's behavioural
  fixes

#### Scenario: changes that carry no demonstration

- **WHEN** a round's change is a test-quality fix, a documentation, comment, or naming change, or
  a refactor with no behavioural effect
- **THEN** `coder.md` states that no demonstration is owed for it, so the rule does not turn
  every change into a mutation-testing exercise

#### Scenario: a rejected finding demonstrates nothing

- **WHEN** the `coder` rejects a finding with a traced input rather than fixing it
- **THEN** no demonstration is owed, and the existing rejection rule — a traced input, never a
  restated conclusion — is left in force, unmodified

### Requirement (R5): `qa` consumes the evidence instead of re-deriving it

#### Scenario: the intake

- **WHEN** `qa` reads the `coder`'s report at step 2
- **THEN** `qa.md` tells it the report carries one of the three outcomes per behavioural fix, in
  those words, and what each means for the work it is about to do

#### Scenario: a demonstrated pin is trusted

- **WHEN** a fix is reported **demonstrated**
- **THEN** `qa.md` states that `qa` trusts it and does not re-derive it, spending the round on
  the fixes whose pins are unproven

#### Scenario: an undemonstrated pin is probed

- **WHEN** a fix is **not demonstrated**, or carries no outcome at all
- **THEN** `qa.md` requires `qa` to probe it with the same revert-run-restore over the named
  test; where the test stays green, or no test was named, that is a finding naming the fix and
  the claimed test — reported even where `qa` closes it by writing the covering test itself

#### Scenario: a known gap is inherited, not rediscovered

- **WHEN** a fix is reported **nothing can reach it**
- **THEN** `qa.md` requires `qa` to record and report it as a known gap rather than re-derive
  whether some test could reach it, while leaving it free to raise a stated reason it can see to
  be wrong as an ordinary review finding

#### Scenario: the probe in prose mode

- **WHEN** the prose-deliverable branch is in force
- **THEN** `qa`'s probe is to re-read the region the entry names and check that the quoted
  sentence is present and answers the finding it is keyed to, and the sentence bounding that
  branch to steps 1–4 is still true of the file as shipped

#### Scenario: the report carries the result

- **WHEN** `qa` reports at step 7
- **THEN** `qa.md` requires a per-fix pin result — trusted, probed with its outcome, or
  inherited as a known gap — so the `lead` and the acceptance gate read the state of the
  evidence rather than reconstructing it

### Requirement (R6): The probe stays inside `qa`'s boundaries

#### Scenario: the carve-out is narrow and the restore is verified

- **WHEN** reading `qa.md`'s *Boundaries*
- **THEN** the **Do not fix feature code.** bullet is reconciled — a probe is a temporary,
  restored revert rather than a fix — and requires the restoration to be verified against the
  state the tree was in before the probe, with an unrestorable probe reported immediately as a
  blocking finding

#### Scenario: nothing else is loosened

- **WHEN** comparing the shipped *Boundaries* against the ones on `master`
- **THEN** `qa` still fixes no feature code, still writes tests rather than feature changes, and
  still may not weaken or delete a failing test to make the suite pass

### Requirement (R7): Neither file is left stating the superseded duty

#### Scenario: `coder.md`'s findings step and report agree

- **WHEN** reading `coder.md`'s numbered findings step **2** and its *Output* section
- **THEN** each describes the demonstration and its three outcomes rather than a naming-only
  duty, with the rule stated once and the other location pointing at it, so no reader finds two
  live accounts of what a pin requires

#### Scenario: `qa.md`'s prose-branch sentence stays true

- **WHEN** reading **The prose-deliverable branch touches steps 1–4 only.** in the shipped file
- **THEN** it is true of the file as shipped — the probe and its prose form live in steps 2 and
  3, and the step-7 report line is an observation in either mode

#### Scenario: the `coder`'s own revert is distinguished from another agent's changes

- **WHEN** reading `coder.md`'s *Rules* bullet "never revert another agent's changes" beside the
  new demonstration
- **THEN** the demonstration says plainly that what it reverts is the `coder`'s **own** fix, and
  only until the restore, so the two cannot be read as competing instructions and the *Rules*
  bullet is left in force unmodified

#### Scenario: both frontmatter descriptions are checked

- **WHEN** reading the frontmatter `description` of `coder.md` and of `qa.md`
- **THEN** neither misstates what its agent now does, and the `coder`'s report records that each
  was read and whether it needed changing

#### Scenario: the canonical worktree paragraph is untouched

- **WHEN** running the root `CLAUDE.md`'s five-file **Addressing the story worktree.** drift
  check against the shipped tree
- **THEN** it prints `1`, and the same paragraph in both edited files is byte-identical to the
  other three copies

## Tasks

Every task is the `coder`'s unless marked otherwise. All edits are in
`plugins/ca77y-engineering/agents/coder.md` and `plugins/ca77y-engineering/agents/qa.md`; no
other file under `plugins/` changes.

- [ ] **T1** — `coder.md`, *Fixing the findings the lead routes to you*: rewrite the bold
      lead-in **Every behavioural fix needs a test that fails without it.** into the
      demonstration rule — the five steps, the named test only, one fix at a time, the observed
      failure with its assertion, the proved restore, and the blocker on an unrestorable revert.
      Satisfies R1.
- [ ] **T2** — Same region: state the three outcomes as the closed set, what each entry must
      carry, that an absent demonstration is **not demonstrated**, and that an unrunnable test
      lands there with its reason rather than under **nothing can reach it**. Satisfies R2.
- [ ] **T3** — Same region: add the prose-mode analogue, referring to the prose-deliverable
      branch **by name** rather than restating its two-fact trigger, and stating that the
      analogue never substitutes for a demonstration that could have been run. Satisfies R3.
- [ ] **T4** — Same region: state the scope bound — behavioural fixes on a findings round, not
      the initial build's per-scenario tests, and not a test-quality, documentation, comment,
      naming, or behaviour-neutral refactor change; leave the traced-input rejection rule
      unmodified. Satisfies R4.
- [ ] **T5** — `coder.md`, numbered findings step **2** and *Output*: replace the naming-only
      wording with the demonstration and its outcome, keeping the rule stated once and pointing
      at it from the other location. While in the file, state in the demonstration that what is
      reverted is the `coder`'s own fix and only until the restore, leaving the *Rules* bullet
      "never revert another agent's changes" unmodified. Satisfies R7's *findings step and
      report agree* and *the `coder`'s own revert* scenarios.
- [ ] **T6** — `qa.md`, *What you do* steps **2** and **3**: add the intake (three outcomes,
      what each means), the trust rule for **demonstrated**, the probe for **not demonstrated**
      and for a missing outcome, the finding it produces and the covering test `qa` adds, the
      inherited known gap for **nothing can reach it**, and the prose-mode form of the probe.
      Satisfies R5's first five scenarios.
- [ ] **T7** — `qa.md`, step **7**: add the per-fix pin result to the report. Confirm the
      sentence **The prose-deliverable branch touches steps 1–4 only.** is still true of the
      file as shipped, and correct it only if the edits made it false. Satisfies R5's *the report
      carries the result* scenario and R7's *prose-branch sentence stays true* scenario.
- [ ] **T8** — `qa.md`, *Boundaries*: reconcile the **Do not fix feature code.** bullet with the
      probe — temporary, restored, verified, blocking if unrestorable — without loosening the
      other bullets. Satisfies R6.
- [ ] **T9** — Read both files' frontmatter `description` in the same pass as their bodies;
      change either only where the new behaviour makes it misstate what the agent does, and
      record in the report that each was read and what was decided. Then run V2, V3, V4, V5, V6,
      and V7 and report the actual output. Satisfies R7's *both frontmatter descriptions* and
      *canonical worktree paragraph* scenarios, and the mechanical half of *Validation*.
- [ ] **T10** — *(Not the `coder`'s task — the `writer`'s docs pass, step 7.)* Update the root
      `README.md` (the **coder** and **qa** sections) and `docs/ARCHITECTURE.md` (*When the
      deliverable is prose, not code*, whose findings-round sentence — "a behavioural fix is
      pinned by the inspectable assertion it re-satisfies where no test can exist to go red" —
      the prose analogue extends) to describe the demonstration, the three outcomes, and `qa`'s
      consumption of them; then convert and remove this spec. Required by `docs/CLAUDE.md`
      ("when an agent's behavior changes, update the README") — no acceptance criterion depends
      on it, so the acceptance gate is not blocked by its ordering after that gate.
