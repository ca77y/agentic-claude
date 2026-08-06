# Offload the criteria checks onto the auditor, give it board access in both of the lead's gates, and give the spec a section for criteria already satisfied

- **Status**: Draft
- **Task**: smr-188-offload-the-criteria-checks-onto-the-auditor
- **Last Updated**: 2026-08-06
- **Document Scope**: One delta on the already-open PR #18 for `SMR-188` — the reversal of part 6's `auditor` board access and part 5's ownership of the criteria checks, plus a new spec-shape section for criteria a task does not have to build. Parts 1, 2, 3, 4 and 7 are shipped baseline, not restated here.

---

## Goal

**Problem one — the check sat in the wrong agent.** PR #18 shipped an `auditor` with **zero** board access in both gates the `lead` dispatches, and moved the transcription's mechanical equality check into the `lead`. Two costs came with that. The `lead` skill had to carve out that "comparing two strings is not judging whether a criterion is met" *purely* to license itself doing the check at all, against its own founding boundary that it never does an agent's work — a rule that needs an exemption written for one caller is a rule under strain. And the check became something the `lead` must *remember* before every dispatch of two separate gate loops, rather than something that happens because the reader who uses the transcription is the one who proves it.

**Problem two — the spec has no way to say "this criterion is already true".** `auditor.md:24`'s mapping rule admits two dispositions for a criterion: it maps to a requirement, or it maps to a scenario. A criterion that needs nothing built has neither, so today the only way past the gate is to invent a requirement or a bespoke validation item for it — and this card is the proof. Its own **AC39**, "`coder.md` and `qa.md` still grant no board access", was described on the card from the outset as "a **no-regression check** for them, not a change". Nineteen of this delta's criteria are in that shape, and an earlier revision of this very spec fabricated **seven** hand-written validation items to carry them. Every miscount that failed a gate round came out of that fabrication: five-versus-seven `findings-round` hits, a self-invalidating entry count, and a `grep -v '^./docs/specs'` filter that never filtered because the paths it anchored against carry no `./` prefix. The rule created the fabrication, and the fabrication created the defects.

**The change.** Two things, and the second deletes more than it adds.

1. The `auditor` regains board access in both of the `lead`'s gates — **read and search** in spec readiness, **read** in acceptance — and performs the mechanical equality check itself, in each gate, before it does anything else with the transcription. The `lead` performs **no** check over the card's acceptance criteria at all: no comparison, no classification, no per-criterion read. The carve-out is deleted rather than defended. Board-side duplicate detection returns to the spec-readiness gate alongside the `writer`'s sibling sweep.
2. The spec gains a bottom section, **Already satisfied criteria**, holding every `ACn` that needs nothing built. The `writer` determines its membership by checking each criterion against the code and prose that already exist; the spec gate accepts membership as a **third disposition** under its mapping rule; and `qa` **re-validates every entry against the post-build tree** as part of the pass it already runs. This is a general spec-shape addition, not a delta-spec special case: a first spec pass has already-satisfied criteria too, and the same rule forces the same fabrication there.

**The value.**

1. The check moves to where board access already is, so it stops being a special dispensation for the orchestrator.
2. Every gate round is a **fresh dispatch** (`auditor.md:37-39`, *Every round is a fresh dispatch*), so "run it on every round, including each re-audit round" holds **by construction** instead of by an instruction the `lead` has to obey twice per loop.
3. The reader that grades against the transcription is the reader that proved it matches — one dispatch, no trust hop between the checking party and the grading party.
4. An already-satisfied criterion stops being a spec-authoring problem and becomes a validation duty, held by the agent that already runs validation against the built tree. Nothing is hand-counted at authoring time, so nothing can be miscounted at authoring time.
5. The honest cost: the first equality check now sits *inside* the readiness gate rather than at the spec-commit point, so the window between that gate passing and the spec commit is covered by no check. The acceptance gate's own check is the next one. This is accepted deliberately and recorded on the card.

**Non-goals.** The transcription is **not** removed (see *Design → Why the transcription stays*), and the new section does not replace it — the section says which transcribed criteria need no work, and cannot exist without the transcription to refer to. Nothing in parts 1, 2, 3, 4 or 7 is reopened. No plugin `version` changes. The `analyst`'s story-advisor gate is untouched.

## Acceptance criteria (verbatim transcription)

> **Source**: card `SMR-188`, read from Linear via the `read` binding (`get_issue`) on **2026-08-06**,
> at status `In Review`, **after** this spec pass's criterion corrections were applied to the card
> (see *Deviations from the card*). This is a **copy, not a summary** — one card bullet per `ACn`
> line, in card order, `n = 68` — **retaken from a fresh live read after four criteria were added to
> the card, and again after **AC3** and **AC48** were each corrected in this same pass**, per part 5's
> own ordering rule.
> Every retake was a fresh live read. The four additions landed at the end of
> the card's list and both corrections changed wording in place, so **no label shifted** in any retake
> and every citation in this spec still points where it did.
> Producing it is copy-paste, not research. What licenses the copy is
> not a promise that it is faithful but the `auditor`'s mechanical equality check against the card,
> performed in each gate that uses this section — see *Design*. Which of these criteria this delta
> builds, and which are already satisfied, is settled in *Already satisfied criteria* at the bottom.

- **AC1** — Every agent and skill that reaches the board names the declaration at the fixed path `docs/ISSUE_TRACKING.md`, and no shipped instruction tells a reader to discover that path from context.
- **AC2** — A run on a project whose `docs/ISSUE_TRACKING.md` is absent is not blocked, and the shipped wording names what happens instead.
- **AC3** — The authoring reference that carries the declaration template is loaded only when the skill is writing or repairing a declaration, never when it is only reading one back.
- **AC4** — The `lead` carries wording for a project with no declaration that does not depend on invoking the `board` skill.
- **AC5** — Neither `lead` nor `analyst` instructs invoking the `board` skill as a per-run step.
- **AC6** — The decision whether `board` remains a skill is recorded in `docs/ARCHITECTURE.md` with its rationale.
- **AC7** — The shipped `board` skill names `references/authoring-issue-tracking.md` and states which of its jobs loads it.
- **AC8** — The `board` skill's frontmatter `description` no longer describes resolving a profile for the pipeline to work from.
- **AC9** — No `.md` file under `plugins/`, under `docs/`, or at the repository root refers to a board profile or `board-profile.md`, in body prose or in frontmatter, including where the phrase is split across a line break.
- **AC10** — Neither `plugins/ca77y-engineering/plugin.json` nor `plugins/ca77y-engineering/.claude-plugin/plugin.json` describes the `board` skill as resolving a board profile.
- **AC11** — Those two manifests carry the same `version` as each other.
- **AC12** — `docs/CLAUDE.md` no longer states that the `board` skill resolves the tracking declaration.
- **AC13** — No shipped instruction tells any agent to probe a binding, and none forbids writing through an unprobed binding.
- **AC14** — `docs/ISSUE_TRACKING.md` binds `comment` and `update` to concrete calls.
- **AC15** — The shipped wording states, for each run-local fact the deleted profile carried, whether it is now recorded in the ledger or dropped.
- **AC16** — The phrase "discover that folder from context, never hardcode it" appears nowhere under `plugins/`.
- **AC17** — All ten files carrying the *Process feedback* paragraph name `docs/AGENTS_IMPROVEMENTS.md` at a fixed path.
- **AC18** — That paragraph still resolves to exactly two distinct variants across those ten files.
- **AC19** — The root `CLAUDE.md` section *The improvements log is cleared as it is converted* is byte-identical to its state at `f87eedc`.
- **AC20** — `README.md` and `docs/ARCHITECTURE.md` no longer assert that the improvements-log path is resolved from context or never hardcoded.
- **AC21** — `docs/_templates/spec.md` carries a section for the verbatim acceptance-criteria transcription, with per-criterion labels and a stamp naming the card identifier and the state it was read at.
- **AC22** — The `writer`'s spec pass is instructed to transcribe the card's `## Acceptance criteria` verbatim, one behaviour per line, labelled `AC1`…`ACn`.
- **AC23** — The shipped wording states that the transcription is taken after any criterion correction the spec pass makes on the card.
- **AC24** — The `auditor` performs a mechanical equality check between the spec's transcription and the card's criteria in both gates the `lead` dispatches — spec readiness and acceptance — on every round of each, including each re-audit round.
- **AC25** — The equality check normalises only the `-`-to-`*` bullet rewrite and the bare-URL wrapping.
- **AC26** — The `lead` performs no check of its own over the card's acceptance criteria — no comparison, no classification, no per-criterion read — and the `lead` skill carries no carve-out licensing one.
- **AC27** — A failed equality check is a blocking gate finding that routes to a respec rather than to grading.
- **AC28** — The shipped wording explains why a checked verbatim copy is permitted where a paraphrase is not, rather than asserting the copy is faithful.
- **AC29** — The spec gate verifies every `ACn` maps to at least one requirement or scenario, and treats a requirement mapped to no `ACn` as a finding unless it is explicitly marked deliberate scope.
- **AC30** — A criterion whose owning mechanism is not a build step maps validly under that rule.
- **AC31** — The acceptance gate returns a verdict per `ACn` label.
- **AC32** — `auditor.md` grants read and search in the `lead`'s spec-readiness gate and read in its acceptance gate, and states in the file which of the two each gate has.
- **AC33** — `auditor.md` states that its board access is granted per dispatch by the caller.
- **AC34** — The story-advisor gate the `analyst` dispatches retains board read and search, and board-side duplicate detection is still performed somewhere in an `analyst` run.
- **AC35** — `analyst.md` names no board profile in its advisor-gate dispatch.
- **AC36** — `auditor.md` instructs reading the card's criteria to check the spec's transcription against them, still refuses criteria restated into its dispatch prompt, and states how the two coexist — the transcription is the standard it grades against, and the card is evidence about that copy rather than a second standard.
- **AC37** — The shipped wording names both places board-side duplicate detection happens in a `lead` run — the `writer`'s spec-pass sibling sweep and the spec-readiness gate — and says what each covers that the other does not.
- **AC38** — `writer.md` retains both read and search access to the board.
- **AC39** — `coder.md` and `qa.md` still grant no board access.
- **AC40** — The canonical caller-granted board paragraph is byte-identical in `plugins/ca77y-engineering/agents/writer.md` and `plugins/ca77y-engineering/agents/auditor.md`.
- **AC41** — The root `CLAUDE.md`'s drift check for that paragraph matches its new opening and prints `1`.
- **AC42** — The root `CLAUDE.md` prose describing that paragraph names the same two files the check covers.
- **AC43** — Every drift check the root `CLAUDE.md` still carries prints the value that file says it prints.
- **AC44** — The shipped wording names, for a session the harness has isolated into the story worktree, the directory, both filenames, and the tool used to write the ledger and each findings file.
- **AC45** — The stated method writes the ledger and each findings file with the ordinary file tools, and needs no `bash` command for any scratch write.
- **AC46** — The shipped wording names the mechanism that guarantees no commit step can sweep a scratch file into a story commit.
- **AC47** — The resolution requires exactly one committed ignore entry in a target project, documented as a setup requirement alongside the entry for that project's worktree directory.
- **AC48** — A file-tool write to `tmp/` inside the story worktree is performed during this story's own run rather than asserted, and the shipped record states what that write does and does not establish.
- **AC49** — `docs/ARCHITECTURE.md` records that write's outcome together with the dispatch mode the run was invoked in, so that "the guard never fired" is distinguishable from "the guard was never attempted".
- **AC50** — `docs/ARCHITECTURE.md` stops stating that nothing shipped verifies whether `path`-form entry clears the write guard on either outcome that settles the question — the run met the guard and entering by `path` cleared it, or the run met the guard and entering by `path` did not clear it — and it records which of the two occurred.
- **AC51** — On either outcome that does not settle the question — a background run whose guard never fired, or a foreground run that could not have met it — `docs/ARCHITECTURE.md` states that the question is still open and names which of the two left it open.
- **AC52** — An outcome where the guard was met and entering by `path` did not clear it is escalated as a blocker on this story rather than shipped as a quietly closed fact, because it falsifies the premise that the relocated scratch can be written at all. The escalation is **in addition to** recording which outcome occurred, not instead of it.
- **AC53** — `docs/ARCHITECTURE.md` records the rationale for the settled scratch location, and names each of the four rejected alternatives with the reason it was rejected.
- **AC54** — The `lead`'s *Invoked on an open PR* recovery step recovers from the card's handoff comment, the PR description, and `git log`, and treats a surviving `tmp/ledger.md` as a bonus rather than something recovery depends on.
- **AC55** — `docs/ARCHITECTURE.md` and `README.md` describe the same scratch location and the same reason as the `lead` skill.
- **AC56** — The ledger and the findings files are written at `tmp/ledger.md` and `tmp/findings-round-<N>.md`, with no branch qualifier in either name.
- **AC57** — This repository's committed `.gitignore` carries a `tmp/` entry alongside its `.worktrees/` entry.
- **AC58** — `docs/PRODUCT.md` § *Requirements it places on target repos* states both ignore entries — the worktree directory and `tmp/` — as setup requirements a target repo must satisfy, and the `README.md` setup prose agrees with it.
- **AC59** — No shipped instruction states that run-local scratch lives beside, or outside, the story worktree.
- **AC60** — The shipped wording states that run-local scratch does not outlive the story worktree, and names the durable records recovery uses instead.
- **AC61** — The root `CLAUDE.md`, `docs/PRODUCT.md`, `docs/ARCHITECTURE.md`, and `README.md` contain no statement that a fixed declaration path is a defect or that the declaration may live anywhere the project's context documents it.
- **AC62** — `docs/PRODUCT.md` states that the declaration's location is a convention while which board is used, and how it is reached, stay resolved from the declaration.
- **AC63** — No file in `plugins/ca77y-library/` dispatches, or declares a dependency on, any `ca77y-engineering` agent or skill.
- **AC64** — The `version` in every `plugins/*/plugin.json` and every `plugins/*/.claude-plugin/plugin.json` is unchanged by this story.
- **AC65** — The spec template carries a bottom section for acceptance criteria already satisfied, with per-entry places for what satisfies the criterion and what `qa` re-validates.
- **AC66** — The `writer`'s spec pass is instructed to check each transcribed criterion against existing code and prose, and to place the ones needing no work in that section.
- **AC67** — The spec gate accepts an entry in that section as a valid disposition for a criterion, and treats an entry it cannot verify as a finding rather than a pass.
- **AC68** — `qa` re-validates every entry in that section against the built tree and reports a result per `ACn`.

**Where each of the 68 is answered.** Nineteen are this delta's work and map to a Requirement below: `AC1`, `AC21`-`AC29`, `AC31`, `AC32`, `AC36`, `AC37`, `AC42`, plus `AC65`-`AC68`, the four the owner added for the new section. The other forty-nine need nothing built and live in **Already satisfied criteria** at the bottom of this spec, each naming what satisfies it and what `qa` re-validates. The two homes are disjoint and together cover all 68: no criterion is left to "out of scope", and none is carried by prose alone.

## Design

### What moves, and to where

| Duty | Before this delta (`77532e1`) | After |
| --- | --- | --- |
| Equality check, after the spec pass | `lead`, at the spec-commit point (`lead/SKILL.md:104`) | `auditor`, **inside** the spec-readiness gate, every round |
| Equality check, before grading | `lead`, before every acceptance dispatch (`lead/SKILL.md:109`) | `auditor`, **inside** the acceptance gate, every round, before it grades |
| Board access, `lead`'s spec-readiness gate | none | **read and search** |
| Board access, `lead`'s acceptance gate | none | **read** |
| Board-side duplicate detection in a `lead` run | the `writer`'s sibling sweep only (`lead/SKILL.md:28`) | the `writer`'s sibling sweep **and** the spec-readiness gate |
| Carve-out licensing the `lead` to compare strings | `lead/SKILL.md:36` | deleted |
| A criterion needing nothing built | no disposition; a requirement or validation item is fabricated for it | an entry in the spec's **Already satisfied criteria**, accepted by the gate and re-validated by `qa` |

**The acceptance gate gets read and not search, deliberately.** Grading a criterion needs that card's criteria; it does not need its siblings. Widening the acceptance gate to search would let unrelated board content bear on grading, which is the one part of the original card's reasoning that survives its reversal.

### The already-satisfied section, and the loophole it must not open

**Shape.** A `## Already satisfied criteria` section, last in the spec, listing `ACn` labels drawn from the transcription above it. Per entry, three things, because each answers a different reader:

1. **What satisfies it** — the file, or files, that already make it true, and the commit where a commit is what settled it. This is what makes the claim checkable rather than asserted.
2. **What `qa` re-validates** — the concrete observation against the **post-build** tree. Not a promise that it was true once; a check that it is still true after the build.
3. **Whether this task's own changes touch that surface.** An entry whose file is also an edit site is the interesting case: the criterion is satisfied *and* at risk, and `qa` needs to know which entries those are rather than treating all of them as inert.

**The loophole, stated plainly so the shipped wording closes it.** A `writer` could move a criterion it did not want to spec into this section and let it pass unbuilt. Three things stop that, and all three must ship:

- Every entry names what satisfies it, so an entry with nothing behind it is visibly empty rather than merely unexamined.
- **`auditor.md` must state that an entry the gate cannot verify is a finding, not a pass.** The gate opens the named file and looks; where the named thing does not satisfy the criterion, or the entry names nothing specific, that is a blocking finding at the readiness gate — the same severity as an unmapped criterion, because that is exactly what it is.
- `qa` re-validates every entry against the built tree, so a false entry fails a second time, later, in front of a different agent.

The asymmetry is deliberate: putting a criterion in this section is *cheaper* to write than a requirement but *more* exposed to checking, at two gates instead of one.

**Why `qa` and not the acceptance gate.** The acceptance gate grades per `ACn` and already reads the transcription; it could in principle re-check these too. `qa` is the better home because it runs the project's validation against the built tree as its whole job, it runs **before** the acceptance gate and on every fix round, and it is already the agent that compares the spec against what exists. An already-satisfied criterion that broke during the build is a regression, and regressions are `qa`'s. The acceptance gate still grades every `ACn` including these, from the section's evidence plus `qa`'s reported result.

### Why the transcription stays

The owner asked whether an `auditor` with board access makes the transcription redundant. It does not, and this delta's new section depends on it:

1. **The labels are the addressing scheme.** `AC1`…`ACn` is what a per-criterion verdict names (AC31), what a finding is filed against so the `coder` knows which criterion it failed (`lead/SKILL.md:113`), what the readiness gate's mapping check is stated over (AC29), and now what the already-satisfied section refers to. A live card supplies no stable labels.
2. **The `coder` and `qa` have no board access at all** (AC39, `coder.md:22`), so the transcription is the only path by which a criterion reaches the agents that must satisfy and validate it. `qa`'s new duty is unrunnable without it.
3. **Freezing is what makes drift detectable.** A gate grading the live card directly would silently absorb a mid-build criterion edit as the new standard.
4. **The card stays the durable source** (`ARCHITECTURE.md:180-183`): the transcription dies with the spec at the docs pass, so a later fix run grades against the card again.

The owner has separately confirmed that producing the transcription is **copy-paste** and not a research task. That is consistent with what changed here: the per-criterion citations this spec carries were always a **coverage** mechanism — proof that every criterion is answered somewhere — never a fidelity mechanism. Fidelity is the equality check's job, and it is mechanical.

### The trap: reading the card without weakening the anti-restatement rule

The original card spent a `## Why` paragraph on this, and it is the one place this delta can produce a self-contradicting file. `auditor.md` must state the resolution in its own voice rather than leave it to be inferred:

- **A restatement is criteria paraphrased into a dispatch prompt.** Refused, absolutely, exactly as before. The `lead` still names the spec and not the criteria (`lead/SKILL.md:109`).
- **The standard the gate grades against is the spec's labelled transcription.** Not the card. That is what keeps labels, per-`ACn` verdicts and the frozen build target coherent.
- **The card is read for exactly one purpose: evidence about the copy.** A mechanical comparison, normalising only the two board-side rewrites (AC25). Never a second standard, and a criterion appearing only on the card is a *mismatch finding*, not a criterion the gate quietly grades.
- **A mismatch blocks.** The gate returns not-ready rather than grading, and the `lead` routes it to the `writer` for a respec (AC27).

One shipped constraint becomes load-bearing again and must survive untouched: `auditor.md:50` forbids the `auditor` from editing the card it gates. With zero access that rule was inert; with read access it is what keeps the gate independent of the standard.

### Two shipped sentences the reversal repairs

Both are inconsistencies PR #18 introduced and neither was caught by its gates. Each becomes true again under this delta, so the delta must **leave them alone** rather than "fix" them in the other direction:

- `lead/SKILL.md:54` — "the `writer` and the `auditor` read the card themselves, from the board" — contradicts the same file's lines 22 and 109 today.
- `writer.md:48` — "the acceptance gate reads the card, so a dropped clause it never sees is a criterion silently retired" — the justification for correcting a criterion on the card rather than narrowing it in a scenario. Hollow under PR #18 as shipped; holds again now.

### The spec shape is stated in five places, and all five change

Adding a mandated section means the shape statement changes **wherever it appears** — and the build enumerates those places itself rather than trusting a count written here, because a count of a thing this same task edits is the one claim that can go stale between authoring and building. The new order is `Goal → Acceptance criteria (verbatim transcription) → Design → Requirements → Tasks → Already satisfied criteria`. `grep` for the order's own arrow-separated shape across `*.md` outside the specs area finds every statement of it; at authoring time that included the scaffold `docs/_templates/spec.md`, `docs/_templates/CLAUDE.md`, `docs/ARCHITECTURE.md`, `plugins/ca77y-engineering/agents/writer.md`, **and two separate statements in `README.md`** — one in the writer's bullet and one in the specs-lifecycle paragraph. The second `README.md` statement carries the *same* omission as `writer.md`: it names `Goal → Design →` with no transcription section. Treat that pair as the reason the check is a property and not a list.

**This drags one owner-queued item into scope, and the spec says so rather than shipping the contradiction.** `writer.md:29` is one of the two known-stale sentences the owner queued for a future pass, because it names the shape without the transcription section. It is the *same sentence* that must now name the already-satisfied section — so either it changes here, or `writer.md` ships describing a spec shape that its own rules, the scaffold, `ARCHITECTURE.md`, the README and `_templates/CLAUDE.md` all contradict. This delta therefore edits it, and closing the queued transcription omission is an unavoidable consequence of doing so, not a separate scope grab. The other queued item, `writer.md:52`, is untouched and stays out of bounds.

### Edit sites, verified at `77532e1`

**`plugins/ca77y-engineering/agents/auditor.md`**
- `:16` canonical paragraph — **not edited** (see below).
- `:18` the per-gate grant sentence — flips: read-and-search for spec readiness, read for acceptance, named per gate; the `analyst`'s advisor gate keeps read and search.
- `:24` step 3, the spec-gate mapping duty — gains the equality check, the readiness gate's board-side duplicate detection, and the **third disposition** with its unverifiable-entry-is-a-finding clause.
- `:29`, `:31` `## The acceptance gate` — rewritten per *The trap*, and grading an `ACn` that sits in the already-satisfied section reads the section's evidence plus `qa`'s reported result.
- `:50` never-edit-the-card constraint — **unchanged**, now load-bearing.

**`plugins/ca77y-engineering/skills/lead/SKILL.md`**
- `:22` downstream grants — the `auditor` line flips.
- `:28` "duplicate detection … happens once, and it is the writer's" — becomes false; names both homes.
- `:30-38` `## The mechanical equality check` — the section moves out. What remains is routing, not checking; the carve-out at `:36` is deleted rather than reworded.
- `:54` — unchanged (see above).
- `:58` the ledger's "the mechanical equality check's results" — becomes the gate-reported transcription-check outcome, recorded as reported.
- `:104` step 3 — the lead's check run goes; a mismatch arrives as the readiness gate's verdict.
- `:109` step 6 — the re-run instruction goes; the dispatch names the gate's own duty and its granted read.
- `:125` routing table — a transcription mismatch reported by either gate routes to the `writer`.

**`plugins/ca77y-engineering/agents/writer.md`**
- `:29` the spec-shape sentence — names the new section (and, unavoidably, the transcription section).
- `:50` — the two clauses attributing the check and the proof to the `lead` re-attribute to the `auditor`'s gates.
- **New duty** — check each transcribed `ACn` against the code and prose that already exist, and populate the already-satisfied section: what satisfies it, what `qa` re-validates, whether it is also an edit site. Placed with the transcription rule it follows from, since the section addresses the labels that rule creates.
- `:12`, `:14` — **not edited.**

**`plugins/ca77y-engineering/agents/qa.md`** — a new numbered step under `## What you do`, after *Validate*, re-validating every already-satisfied entry against the post-build tree, with the following steps renumbered; and `## What you do`'s report step gains the per-`ACn` result. A failed entry is reported as a regression finding with its `path:line`, exactly as its other findings are.

**`docs/_templates/spec.md`** — `:20`'s licensing note re-attributes to the `auditor`; the scaffold gains the bottom section with its per-entry shape.

**`docs/_templates/CLAUDE.md`** — `:9`'s spec order.

**`README.md`** — `:304-306` (downstream grants), `:340-362` (step 6 and the equality-check paragraph), `:507-512` (the `auditor`'s board-access paragraph), `:541` and `:680` (the spec shape), `:545` (the writer bullet's attribution), plus the `qa` section for its new duty.

**`docs/ARCHITECTURE.md`** — `:108-115` (the access table's two `auditor` rows), `:117-123` (the per-dispatch rationale: three dispatches, two distinct grants, not one of them empty), `:125-131` (the duplicate-detection consequence inverts to two homes), `:148` (spec order), `:152-163` (who runs the check; the `lead`-carve-out sentence goes), `:172-178` (both gates work per label; transcription-as-standard plus card-as-evidence), and a record of the third disposition. `:133-141` and `:578-583` need no change if the canonical paragraph is unedited — verify rather than assume.

**`CLAUDE.md`** (root) — `:56-58` only: "carried by the two agents whose board access varies with who dispatched them" misdescribes both agents after this delta (the `writer`'s never varies; the `auditor`'s varies between two gates of the *same* caller). Reconcile to a grant-not-a-property phrasing. The `grep` snippet at `:62-65` is **unchanged**, and § *The improvements log is cleared as it is converted* stays byte-identical to `f87eedc`.

### The canonical paragraph is verified, not edited

Read against the amended grants, every sentence in `**Board access is granted by your caller.**` (`auditor.md:16`, `writer.md:12`) is already true of both agents: access is whatever the caller named, the declaration is read at its fixed path, and where the caller named nothing there is none. The sentence that flips is the *per-agent grant* sentence that follows it (`auditor.md:18`), which is not part of the canonical pair; `writer.md:14` is its counterpart and is untouched. So this delta **verifies** the pair byte-identical and leaves the root `CLAUDE.md` `grep` pattern alone. The "named nothing" branch is now unreachable from inside this pipeline — all three dispatches grant something — but it stays as the default-deny contract for any other caller.

### Claims this spec rests on, and what backs each

Every claim about this repository's own files is cited by path and line at `77532e1` and was read at that commit. This delta asserts nothing about a third-party or vendored dependency. Three claims are **not** file-citable and are marked as assumptions:

- **Assumption A1 — a dispatched subagent's definition is loaded from the *installed* plugin, not from the story worktree.** The premise behind the owner's "this run is the evidence" argument: PR #18's zero-access spec gate was never exercised, because every agent this run dispatched ran from the installed `2.2.2`. It is a property of the harness, not of this repository, so it cannot be cited to a file here. What *was* observed is the consequence: the spec-readiness `auditor` diffed the transcription against the live card programmatically in rounds 1 and 3, which the shipped `77532e1` text forbids it from being able to do. `SMR-187` is the open card for making that hazard visible from inside a run.
- **Assumption A2 — the harness dispatches each gate round as a fresh context with no memory of the previous round.** The instruction side is citable (`auditor.md:37-39`; `lead/SKILL.md:104`, `:113`); that the harness cannot smuggle context between two `Agent` dispatches is not. The design consequence — "the check happens every round by construction" — rests on the shipped instruction plus this assumption, and R1's scenarios observe the instruction, which is the falsifiable part.
- **Assumption A3 — this spec uses the already-satisfied section under an explicit exception, not under the rule.** The rule authorising the section ships **in this delta**, so by A1 the `auditor` gating this spec runs from a plugin that does not carry it. The `lead` has granted the disposition explicitly in its dispatch of the spec gate, and this spec relies on that grant and on nothing else. The rule does **not** govern the run that ships it, and this spec does not pretend otherwise. The first spec pass that can legitimately rely on the shipped rule is the next task's.

## Boundary

**In bounds — the surfaces named under *Edit sites*, and only the regions named there:**
`plugins/ca77y-engineering/agents/{auditor,writer,qa}.md`, `plugins/ca77y-engineering/skills/lead/SKILL.md`, `docs/_templates/spec.md`, `docs/_templates/CLAUDE.md`, `README.md`, `docs/ARCHITECTURE.md`, `CLAUDE.md` (root, `:56-58` only), plus this spec file.

**Out of bounds, and why:**

- **Everything parts 1, 2, 3, 4 and 7 shipped.** The fixed declaration path; the deleted profile and probe; the `tmp/` relocation and its anchored `/tmp/` ignore entry; the whole write-guard record in `docs/ARCHITECTURE.md`, including its retained "nothing shipped verifies that `path`-form entry clears it" sentence about `f87eedc`, the dispatch-mode-plus-outcome record, and the restored constraint that isolation wording is a *remedy when a harness demands it* and never an instruction to isolate. Verified across three qa rounds and an acceptance gate.
- **Any plugin `version`.** All four manifests stay at `ca77y-engineering` `2.3.0` / `ca77y-library` `1.0.0`.
- **Root `CLAUDE.md` § *The improvements log is cleared as it is converted*** — byte-identical to `f87eedc`. Note the irony and get it right: this pass is *acting on* that rule (below), which is not licence to edit it.
- **`docs/AGENTS_IMPROVEMENTS.md`** — append-only, and **no entry count appears anywhere in this spec**, deliberately: a count stated in a file this same pass appends to invalidated itself twice in this run's gate rounds. What the build must do is bounded by property, not arithmetic: **change no existing entry**, and leave in place the entries this delta does not convert — including *"A Validation item must state a property, never a reproducible enumeration"*, *"The acceptance gate can pass a criterion whose shipped wording does not satisfy it as written"*, and *"An already-satisfied entry must name its region the way a reader finds it, never by line number"*, all three added during this pass by the round that found the friction. An entry this pass drafted and then **withdrew in the same pass**, once the scope change absorbed its point, was never committed and so never entered the log — nothing was converted and no commit trace is owed for it (see *Deviations from the card*). The build adds an entry only if it hits fresh friction of its own; it does not re-file the `writer.md:52` owning-mechanism gap, which is already logged.
- **`plugins/ca77y-engineering/agents/analyst.md`** — verify-only. Its advisor-gate dispatch at `:44` already grants read and search and says the default is none.
- **`plugins/ca77y-engineering/agents/coder.md`** — verify-only: `:22`'s zero board access must not change. Its `findings-round` mention at `:74` is adjectival, not a path.
- **`writer.md:52`'s owning-mechanism rule**, which omits the "a step only the `lead`'s own session can perform" category. *Owner: `docs/AGENTS_IMPROVEMENTS.md`, awaiting triage into a card.* Not this delta's, and not the `coder`'s. (`writer.md:29`, the other queued item, **is** in scope — see *The spec shape is stated in five places*.)

**No test files.** This repository has no `package.json`, no lockfile and no test runner; the worktree's dependency-provisioning status is *not provisioned — no install step*. The deliverable is prose, so every scenario below is an **inspection scenario**, discharged by reading a named file region or running a named command. `SMR-157` is the open card for a first-class prose-deliverable mode.

## Coordination

- **`lead/SKILL.md`** is also claimed by `SMR-187` (step 7, Final handoff), `SMR-182` (step 7) and `SMR-144` (the spec-commit point in step 3 — *this delta removes the equality-check run from exactly that point*, so a `SMR-144` build written against `77532e1` would reinstate it).
- **`auditor.md`** is also claimed by `SMR-183` and `SMR-185`; **`writer.md`** by `SMR-183`, `SMR-185`, `SMR-179`, `SMR-181`, `SMR-157`; **`qa.md`** by `SMR-157` and `SMR-181`; **`README.md`** by `SMR-181`, `SMR-182`; **`docs/ARCHITECTURE.md`** by `SMR-183`; **`docs/_templates/`** by `SMR-136`. Whichever lands second reconciles with the other's shipped text.
- **`SMR-134`** — "Pin where the writer's mandated spec sections live" — is now directly adjacent: this delta pins one section's position (last) and the shape statements name it, which is a partial answer to that card for one section only. It is not blocked and not closed by this delta.
- **`SMR-133`** wants each acceptance criterion classified as code- or documentation-satisfied. Its first criterion named the `lead` as the classifier, which AC26 forecloses; **corrected on that card during this spec pass**. The already-satisfied section is a third class beside its two, and whoever builds `SMR-133` should reconcile with it rather than re-deriving one.
- **`SMR-186`** owns the root `CLAUDE.md` snippets as a runnability problem. This delta changes no snippet, only the prose sentence above the second one.
- No shared-infrastructure provisioning is in scope, so the provisioning-collision half of the sibling sweep found nothing to coordinate.

## Deviations from the card

The card as it stood at `77532e1` argued *against* the design the owner has now directed: its `## Why` paragraph opened "**The auditor re-reads the board three times a run for no gain**" and six of its criteria assigned the checks to the `lead` or denied the `auditor` any access. Applied to the card on **2026-08-06**, under the `update` authority `docs/ISSUE_TRACKING.md` grants the `writer`'s spec pass, with the transcription above taken **after**:

| # | Before | After |
| --- | --- | --- |
| 1 | "The `lead` performs a mechanical equality check … after the spec pass, and again before every acceptance-gate dispatch including each re-audit round." | AC24 — the `auditor` performs it in both gates, on every round of each. |
| 2 | "The `lead` skill states that the equality check is a comparison and not a judgement of whether any criterion is met." | AC26 — the `lead` performs **no** check over the criteria, and the skill carries no carve-out licensing one. |
| 3 | "A failed equality check routes to a respec rather than to grading." | AC27 — the same, plus that it is a **blocking gate finding**. |
| 4 | "`auditor.md` grants no board access in the two gates the `lead` dispatches, and states that it has none there." | AC32 — read and search in spec readiness, read in acceptance, stated per gate. |
| 5 | "`auditor.md` no longer instructs reading criteria from the board or refusing a restatement." | AC36 — it reads the card's criteria to check the transcription, still refuses a prompt restatement, and states how the two coexist. |
| 6 | "The shipped wording names where board-side duplicate detection happens in a `lead` run, given the auditor no longer performs it there." | AC37 — names **both** homes and what each covers that the other does not. |

Also rewritten on the card as prose: the `## Why` paragraph; Scope part 5's check-ownership and mismatch bullets; Scope part 6's `lead` bullet, `auditor`-access bullet, third-caller rationale, named-rewrite bullet and canonical-paragraph bullet; the summary paragraph; and a References entry recording the directive verbatim, the date, what stays, and the accepted consequence.

**Four criteria added to the card for the already-satisfied section.** The section is the mechanism forty-nine of this card's criteria now depend on, so it ships **graded rather than asserted**. I raised the gap rather than closing it myself — correcting a criterion is the spec pass's job, but deciding what a story is *for* is the owner's, and four new criteria is a scope expansion rather than a correction — and the owner approved the wording. Added on **2026-08-06** from the directive *"can the writer check AC against already existing code? put a section at the bottom for AC that are already satisfied and when qa is validating the implementation it should validate them as well"*, they are **`AC65`-`AC68`**, appended at the end of the card's `## Acceptance criteria`:

| Label | Criterion | Requirement |
| --- | --- | --- |
| `AC65` | The spec template carries a bottom section for acceptance criteria already satisfied, with per-entry places for what satisfies the criterion and what `qa` re-validates. | R7 |
| `AC66` | The `writer`'s spec pass is instructed to check each transcribed criterion against existing code and prose, and to place the ones needing no work in that section. | R8 |
| `AC67` | The spec gate accepts an entry in that section as a valid disposition for a criterion, and treats an entry it cannot verify as a finding rather than a pass. | R9 |
| `AC68` | `qa` re-validates every entry in that section against the built tree and reports a result per `ACn`. | R10 |

**Appending them was the whole point of where they went.** Had they landed anywhere but the end, `AC1`-`AC64` would have shifted and every citation in both of this spec's sections would have moved with them. Verified against a fresh read: the first sixty-four are byte-identical to what they were before the edit, so no label moved. R7-R10 are therefore **mapped requirements, not deliberate scope**, and the acceptance gate grades the new section like everything else.

**AC3 corrected, and the mistake that found it is on the record.** AC3 read *"The template used to author a missing declaration is read only when the file is absent."* The shipped design does not satisfy that as written: `board/SKILL.md`'s clause says the authoring reference is loaded *"only when you are actually writing **or repairing** a declaration"*, and **repairing operates on a file that is present** — the skill's *Two ways you are invoked* distinguishes the two paths explicitly. There is also no separate template artifact to read: the template lives inside `references/authoring-issue-tracking.md`, the very file that clause governs. Forbidding the load while repairing is not what anyone wants, so this is a **criterion-correction case, not a build defect** — the wording was narrower than the design intends. Corrected on the card on **2026-08-07** to: *"The authoring reference that carries the declaration template is loaded only when the skill is writing or repairing a declaration, never when it is only reading one back."* The transcription above was retaken afterwards, per part 5's ordering rule; only AC3's wording changed and no label moved.

**How it was found, and what I got wrong first.** An earlier revision of this spec put AC3 in *Already satisfied criteria* with an entry claiming the skill "reads its template only at create time" — a paraphrase of the shipped clause bent into agreement with the criterion. That is precisely the failure R9 exists to catch, and I committed it on the rule's first use: the entry named a file, so it looked verifiable, but the words I put in the entry were not the words in the file. The spec gate caught it by opening the clause. Two things follow. **The section's value is demonstrated rather than argued** — a criterion parked there gets opened and read, which is how a mis-worded criterion surfaced at all. And **the acceptance gate had already graded AC3 as met** against wording that does not satisfy it as written, which is a genuine gate miss on shipped work, logged as such in `docs/AGENTS_IMPROVEMENTS.md`.

**AC48 corrected, and the reason is stronger than over-specification.** AC48 required the `tmp/` write to be *"made **after the session has entered that worktree by** `path`"*. **That qualifier and AC51 cannot both be satisfied on the branch that actually occurred.** This run was a background job whose write guard never fired, so it made no `EnterWorktree` call at all — and AC51 declares that branch legitimate, asking only that the record state the question is still open and name which branch left it open. A run cannot simultaneously satisfy AC51's guard-never-fired branch and demonstrate a write *after* a `path` entry it had no reason to make. That is two of the card's own statements being mutually exclusive against the real system, which is the case *Deviations from the card* exists for.

The qualifier was written when the guard was expected to fire — an assumption about **how** the demonstration would happen, not about what it had to prove. What AC48 is for, that the write was **performed rather than asserted**, was satisfied: one `Write` call, no `bash`, verified ignored and unswept. Corrected on the card on **2026-08-07** to: *"A file-tool write to `tmp/` inside the story worktree is performed during this story's own run rather than asserted, and the shipped record states what that write does and does not establish."* The second clause is the part the qualifier was reaching for — that the demonstration must not overclaim — and the shipped record already satisfies it, stating the write proves the location **writable** and is **not** evidence about the guard.

**The residual gap is stated, not closed.** Nothing on this branch evidences the isolated-session case the relocation was designed for. That gap belongs to AC50 and AC51, which record the question as open and name this run's branch; only a future run whose guard actually fires can close it. I considered leaving AC48 out of the section with the deviation stated instead — the alternative offered — and rejected it: an unsatisfiable criterion left on the card would fail the next acceptance gate for the same reason, and the demonstration AC48 asks for genuinely happened.

**Corrected on a sibling card.** `SMR-133`'s first criterion read "The `lead` classifies each acceptance criterion as code-satisfied or documentation-satisfied before the gate runs" — the logical opposite of AC26. Corrected to name the `auditor` in the gate, with a dated note pointing at that card's own Scope, which already contemplated `auditor.md` as the owner. A second, unrelated staleness there was **reported and not edited**: its third criterion routes a documentation NOT-READY to "the `writer`'s own auditor gate", which `SMR-145` records no longer exists.

**No improvements-log entry was converted, and no commit trace is owed.** An earlier round of this pass drafted an entry — *"A second spec pass on one card needs a rule for the criteria the first pass already closed"* — and **withdrew it in the same pass**, once this scope change absorbed the point it was making. It was never committed, so it never entered the log: `git diff` against `77532e1` shows the file's entries only added to, never removed. The root `CLAUDE.md`'s clear-as-you-convert rule exists so that a **committed** finding's removal stays traceable through the message that removes it; a draft that never landed has no history to preserve and settles no card. Nothing is therefore owed to the ship commit on this point, and any instruction to name `SMR-188` as what settled that entry would be vacuous.

## Requirements

### Requirement: R1 — the auditor performs the equality check in both of the lead's gates

Covers **AC24**, **AC25**, **AC27**.

#### Scenario: the spec-readiness gate checks the transcription against the card

- **WHEN** `plugins/ca77y-engineering/agents/auditor.md`'s spec-gate duty (`:24` at `77532e1`) is read
- **THEN** it instructs the gate to compare the spec's `AC1`…`ACn` transcription against the card's `## Acceptance criteria`, read through the declaration's `read` binding, before judging the mapping
- **AND** it names the two normalisations — the `-`-to-`*` bullet rewrite and the `<…>`-wrapping of a bare URL — and states that nothing else is normalised

#### Scenario: the acceptance gate checks before it grades

- **WHEN** `auditor.md`'s `## The acceptance gate` section is read
- **THEN** it instructs the gate to perform the same comparison **before** grading any criterion
- **AND** it states that a mismatch is a **blocking** finding returned instead of a grade

#### Scenario: every round performs it, because every round is a fresh dispatch

- **WHEN** `auditor.md` is read for what binds a re-audit round
- **THEN** the equality duty binds **every** dispatch of either gate, including each re-audit round, in the same terms `auditor.md:35` already uses for the dependency-mechanism check
- **AND** no wording makes it conditional on a prior round having run it

#### Scenario: a mismatch routes to a respec

- **WHEN** `lead/SKILL.md`'s *When a gate finds a problem* list is read
- **THEN** a transcription mismatch reported by **either** gate routes to the `writer` for a respec
- **AND** the entry describes it as something a gate reported, not as the outcome of a check the `lead` ran

### Requirement: R2 — the auditor's board access in the lead's gates is read-and-search, then read

Covers **AC32**.

#### Scenario: auditor.md states its grant per gate

- **WHEN** `auditor.md`'s per-gate grant paragraph (`:18` at `77532e1`) is read
- **THEN** it states that the `lead`'s spec-readiness gate grants **read and search**, and its acceptance gate grants **read**
- **AND** it states why the acceptance gate gets no search — grading needs that card's criteria, not its siblings
- **AND** it still states that the `analyst`'s advisor gate grants read and search

#### Scenario: the lead's dispatch matches what auditor.md expects

- **WHEN** `lead/SKILL.md:22` and its steps 3 and 6 are read
- **THEN** each names the same grant for the gate it dispatches as `auditor.md` states for that gate
- **AND** no step describes the `auditor` as carrying no board access

### Requirement: R3 — reading the card does not weaken the anti-restatement rule

Covers **AC28**, **AC29**, **AC31**, **AC36**.

#### Scenario: the three roles are stated distinctly

- **WHEN** `auditor.md`'s `## The acceptance gate` section is read
- **THEN** it states that criteria restated into a dispatch prompt are refused
- **AND** that the spec's labelled transcription is the standard it grades against
- **AND** that the card is read as evidence about that copy, never as a second standard
- **AND** it says what makes the transcription the standard rather than the card: the labels the verdicts address, and the fact that the frozen list is what the build was built against

#### Scenario: a criterion present only on the card is a mismatch, not a graded criterion

- **WHEN** the same section is read for what happens when the card carries a criterion the transcription does not
- **THEN** it is a mismatch finding that blocks, not a criterion the gate grades on its own initiative

#### Scenario: the gate still cannot edit the card

- **WHEN** `auditor.md`'s `## Constraints` are read
- **THEN** the prohibition on editing the card it gates is present and unweakened

#### Scenario: a verdict is still returned per label

- **WHEN** `auditor.md`'s `## The acceptance gate` section is read
- **THEN** it still returns a verdict per `ACn` label, one gate per criterion
- **AND** for an `ACn` the spec places in *Already satisfied criteria*, it grades from that section's evidence plus `qa`'s reported result

#### Scenario: the licensing rationale is stated where the transcription lives

- **WHEN** `docs/_templates/spec.md`'s transcription note, `writer.md:50`, `README.md` and `docs/ARCHITECTURE.md` are read
- **THEN** each explains that a checked copy is licensed by a check rather than by a promise of faithfulness
- **AND** each attributes that check to the `auditor`'s gate, and none to the `lead`

### Requirement: R4 — the lead performs no check over the card's acceptance criteria

Covers **AC26**.

#### Scenario: the skill carries no criteria check

- **WHEN** `lead/SKILL.md` is read end to end
- **THEN** it contains no instruction for the `lead` to compare the transcription against the card, to classify a criterion, or to read the criteria one at a time
- **AND** its `## The mechanical equality check` section is gone rather than reworded

#### Scenario: the carve-out is gone rather than restated

- **WHEN** `lead/SKILL.md` is searched for the string-comparison justification at `:36` (`77532e1`)
- **THEN** it is absent, and nothing else licenses the `lead` to perform a criteria check
- **AND** the standing rule that the `lead` never judges acceptance is present without an exemption attached

#### Scenario: what the lead still does with criteria is routing and recording only

- **WHEN** `lead/SKILL.md`'s ledger rule (`:58`) and steps 3 and 6 are read
- **THEN** the ledger records the transcription-check outcome **as the gate reported it**
- **AND** the `lead` still reads the card for the task, the two transitions, the comment and the PR attachment — none of which is a check over the criteria

### Requirement: R5 — a lead run has two named homes for board-side duplicate detection

Covers **AC37**.

#### Scenario: the lead skill names both

- **WHEN** `lead/SKILL.md:28` (`77532e1`) is read
- **THEN** it names the `writer`'s spec-pass sibling sweep **and** the spec-readiness gate
- **AND** it no longer says duplicate detection happens once

#### Scenario: each home's coverage is distinguished

- **WHEN** `lead/SKILL.md`, `auditor.md` and `docs/ARCHITECTURE.md` are read on this point
- **THEN** each states what the `writer`'s sweep covers that the gate cannot — provisioning collisions and relationship prose a settled decision contradicts, across sibling cards — and what the gate covers that the sweep does not: whether the artifact under review duplicates or overlaps work already on the board
- **AND** the `writer` still holds **search** and still reports a sweep that could not run as not run

### Requirement: R6 — every surface describing the check agrees with the amended design

Covers **AC1**, **AC21**, **AC22**, **AC23**, **AC42**.

#### Scenario: no surface still attributes the check to the lead

- **WHEN** `grep -rn --exclude-dir=specs 'equality check' --include='*.md' .` is run over the worktree
- **THEN** every hit attributes the check to the `auditor` or to a gate, and none to the `lead` — except in `docs/AGENTS_IMPROVEMENTS.md`, which is an append-only record and is never rewritten to match a later design

#### Scenario: the root CLAUDE.md prose matches the amended grants

- **WHEN** the root `CLAUDE.md`'s second drift-check paragraph (`:56-58` at `77532e1`) is read
- **THEN** it no longer says the two agents' board access "varies with who dispatched them"
- **AND** it still names `writer` and `auditor` as the two files the check covers
- **AND** the `grep` snippet below it is unchanged

#### Scenario: the architecture record describes the amended model

- **WHEN** `docs/ARCHITECTURE.md` § *Board access is granted per dispatch, not held by role* and § *The card's acceptance criteria are pinned into the spec* are read
- **THEN** the access table's `auditor` rows read read-and-search for spec readiness and read for acceptance
- **AND** the paragraph motivating the per-dispatch model argues from three dispatches with two distinct grants, not from one of them being empty
- **AND** the duplicate-detection consequence paragraph names two homes
- **AND** the check is attributed to the gates, with no sentence licensing the `lead` to hold it

#### Scenario: the writer's and the template's instructions still stand up

- **WHEN** `writer.md:50` and `docs/_templates/spec.md`'s transcription note are read
- **THEN** both still require the verbatim, one-behaviour-per-line, `AC1`…`ACn` transcription taken **after** any criterion correction
- **AND** the ordering argument still explains what the check would otherwise have nothing correct to check against, now naming the gate as the checker

#### Scenario: every changed file still names the declaration at its fixed path

- **WHEN** each file this delta edits is read for its references to the tracking declaration
- **THEN** each names `docs/ISSUE_TRACKING.md`, and no changed sentence tells a reader to discover that path

### Requirement: R7 — the spec template carries the already-satisfied section

Covers **AC65**.

#### Scenario: the scaffold carries the section, last

- **WHEN** `docs/_templates/spec.md` is read
- **THEN** a `## Already satisfied criteria` section is present, after `## Tasks`
- **AND** its placeholder shows one entry per `ACn` label, with the label, what satisfies it, what `qa` re-validates, and whether the named surface is also an edit site
- **AND** the placeholder marks each entry with `→` rather than the `—` the transcription uses, and says why: the `auditor`'s equality check compares the transcription against the card mechanically, so the transcription's `- **ACn** — ` lines must stay the only lines of that shape in the spec
- **AND** it says the section is dropped when every criterion needs work, the same way the transcription section is dropped when there are no criteria

#### Scenario: every statement of the spec order agrees, with none missed

- **WHEN** every place the spec order is stated is enumerated by searching the worktree for the order's own arrow-separated shape, outside the specs area, rather than from a list written in this spec
- **THEN** each such statement names the order `Goal → Acceptance criteria (verbatim transcription) → Design → Requirements → Tasks → Already satisfied criteria`
- **AND** no statement omits a section another one names — including the two separate statements `README.md` carries, and `writer.md`'s, which at authoring time both omitted the transcription section
- **AND** the enumeration is redone at build time, so a statement added or moved since this spec was written is still caught

### Requirement: R8 — the writer checks each criterion against what already exists, and populates the section

Covers **AC66**.

#### Scenario: the duty is stated as a check, not a judgement call

- **WHEN** `plugins/ca77y-engineering/agents/writer.md`'s spec-authoring rules are read
- **THEN** the spec pass is instructed to test each transcribed `ACn` against the code and prose that already exist, and to place in the section every criterion that needs nothing built
- **AND** the instruction requires each entry to name what satisfies it — the file, and the commit where a commit is what settled it
- **AND** it requires each entry to name what `qa` re-validates against the post-build tree

#### Scenario: an entry that is also an edit site is flagged as such

- **WHEN** the same rules are read
- **THEN** an entry whose named surface the task also edits must say so, because that criterion is satisfied *and* at risk
- **AND** the wording says why: `qa` needs to know which entries the build could have broken

#### Scenario: the section is not a place to put work the writer did not want to spec

- **WHEN** the same rules are read
- **THEN** they state that a criterion needing any change belongs in Requirements, and that the section is only for criteria already true
- **AND** they state that the gate treats an unverifiable entry as a finding, so the section is cheaper to write but more exposed to checking

### Requirement: R9 — the spec gate accepts the section as a third disposition, and an unverifiable entry is a finding

Covers **AC67**.

#### Scenario: the mapping rule admits three dispositions

- **WHEN** `auditor.md`'s spec-gate duty (`:24` at `77532e1`) is read
- **THEN** a criterion satisfies the mapping rule by mapping to a requirement, by mapping to a scenario, **or** by carrying an entry in the spec's *Already satisfied criteria*
- **AND** the existing not-a-build-step provision is still present alongside it

#### Scenario: the gate verifies each entry rather than accepting it

- **WHEN** the same section is read
- **THEN** it instructs the gate to open the file each entry names and confirm the named thing does satisfy that criterion
- **AND** an entry the gate cannot verify — the named thing does not satisfy the criterion, or the entry names nothing specific — is a **blocking finding, not a pass**, at the same severity as a criterion with no disposition at all
- **AND** the wording says why: an unchecked section is a way to retire a criterion without speccing it

### Requirement: R10 — qa re-validates the already-satisfied criteria against the built tree

Covers **AC68**.

#### Scenario: the duty sits inside the pass qa already runs

- **WHEN** `plugins/ca77y-engineering/agents/qa.md`'s `## What you do` is read
- **THEN** a step re-validates every entry in the spec's *Already satisfied criteria* against the worktree as it now stands, after the project's validation commands have run
- **AND** the step is part of the pass `qa` already performs on the first build and on every fix round, not a separate mode

#### Scenario: a broken entry is reported as a regression

- **WHEN** the same section and `qa.md`'s report step are read
- **THEN** an entry that no longer holds is reported as a finding with its `path:line` and a fix direction, exactly as `qa`'s other findings are
- **AND** the report names a result per `ACn`, so the acceptance gate can grade those criteria from it
- **AND** entries flagged as edit sites are named as the ones most likely to have broken

## Validation

Run from the story worktree at its absolute path. No test runner and no install step, so each item is an inspection or a command; `qa` should treat a refused compound command as a command to split, not as a failed check (`SMR-186`).

**No item states a count, a file list, or a line number.** Each states the **command** and the **property its output must have**, and nothing else. This is not a style preference, it is the third correction of one defect: three separate gate rounds failed on enumerations that were accurate when captured and stale by the time they were read, because **any count of a thing this same pass edits invalidates itself no matter how faithfully it was captured** — the last instance was an enumeration this pass broke with its own later edit. A baseline hit list adds nothing a build cannot recompute, and it is the only part of an item that can be wrong.

**Two kinds of item, and each says which it is.** **Baseline-unchanged** items hold at `77532e1` and must still hold after the build; a difference is a regression this delta caused. **Target-state** items state a post-build expectation and are deliberately **false** before the build, because the reversal is not built yet — so a target-state item must never be graded as a regression check.

The criteria this delta does not build are **not** covered by items here — they are in *Already satisfied criteria* below, and re-validating them is `qa`'s step under R10. That is the collapse this scope change bought: seven hand-enumerated regression items replaced by one duty held where validation already happens.

- **V1** — *Baseline-unchanged.* The root `CLAUDE.md`'s drift check for the caller-granted paragraph prints the value that file states beside it.
- **V2** — *Baseline-unchanged.* The root `CLAUDE.md`'s worktree-paragraph drift check prints the value that file states beside it, across the files that file names.
- **V3** — *Baseline-unchanged.* The two cross-plugin dispatch-name `grep`s → no output.
- **V4** — *Baseline-unchanged.* The manifest-parity loop prints `ok` for every plugin under `plugins/*`, with no `DRIFT` line.
- **V5** — *Baseline-unchanged.* `git diff f87eedc..HEAD -- CLAUDE.md` shows no change inside § *The improvements log is cleared as it is converted*.
- **V6** — *Baseline-unchanged.* `git diff f87eedc..HEAD -- plugins/*/plugin.json plugins/*/.claude-plugin/plugin.json` shows no `version` line.
- **V7** — *Baseline-unchanged.* `grep -rn -i --exclude-dir=specs 'board.profile' --include='*.md' --include='*.json' .` → no output.
- **V8** — **Target-state.** `grep -rn --exclude-dir=specs 'equality check' --include='*.md' .` → every hit attributes the check to the `auditor` or to a gate, and none to the `lead`. `docs/AGENTS_IMPROVEMENTS.md` is exempt if it appears: it is an append-only record and is never rewritten to match a later design.
- **V9** — **Target-state.** `grep -rn --exclude-dir=specs 'no board access\|has none there' --include='*.md' .` → no hit claims the `auditor` has none in a `lead` gate, and `coder.md`'s own zero-access statement is unchanged from `77532e1`.
- **V10** — **Target-state.** Every statement of the spec order, enumerated at build time per R7's second scenario rather than from a list, names the order including the new section, and none omits a section another names.

## Tasks

- [x] `auditor.md`: flip the per-gate grant sentence (`:18`) to read-and-search for spec readiness, read for acceptance, with the reason the acceptance gate has no search; keep the `analyst` clause.
- [x] `auditor.md`: add the equality duty and the readiness gate's board-side duplicate detection to the spec-gate step (`:24`).
- [x] `auditor.md`: add the **third disposition** to that same rule, with the clause making an unverifiable entry a blocking finding rather than a pass.
- [x] `auditor.md`: rewrite `## The acceptance gate` per *The trap* — transcription as standard, card as evidence, prompt restatement still refused, mismatch blocks, duty binding every round, and per-`ACn` grading that uses the section's evidence plus `qa`'s result.
- [x] `auditor.md`: leave `:16` and `:50` untouched; verify both after editing.
- [x] `lead/SKILL.md`: delete `## The mechanical equality check` (`:30-38`), including the carve-out, and remove the check runs from steps 3 (`:104`) and 6 (`:109`).
- [x] `lead/SKILL.md`: flip the downstream grants (`:22`), name both duplicate-detection homes (`:28`), re-point the ledger entry (`:58`), reword the routing entry (`:125`).
- [x] `lead/SKILL.md`: leave `:54` as it stands — the reversal makes it true again.
- [x] `writer.md`: re-attribute the check and the proof in `:50`; add the already-satisfied duty (what satisfies it, what `qa` re-validates, the edit-site flag, and the not-a-dumping-ground clause); name the new section in the spec-shape sentence (`:29`).
- [x] `qa.md`: add the re-validation step under `## What you do` after *Validate*, renumber the following steps, and extend the report step with the per-`ACn` result and the edit-site emphasis.
- [x] `docs/_templates/spec.md`: re-attribute the licensing note (`:20`); add the `## Already satisfied criteria` scaffold after `## Tasks`.
- [x] `docs/_templates/CLAUDE.md`: update the spec order (`:9`).
- [x] `README.md`: update `:304-306`, `:340-362`, `:507-512`, `:541`, `:545`, `:680`, and the `qa` section for its new duty.
- [x] `docs/ARCHITECTURE.md`: update the access table's `auditor` rows, the per-dispatch rationale, the duplicate-detection consequence, the spec order (`:148`), the check's attribution, and record the third disposition.
- [x] Root `CLAUDE.md`: reconcile `:56-58` only.
- [x] Run `V1`-`V10`, reporting baseline-unchanged items against their `77532e1` result and the three target-state items against their post-build expectation, never against their quoted baseline.
- [ ] *(Not the `coder`'s: done in this spec pass.)* The card corrections — the six from the reversal, the four criteria added for the new section, and the AC3 correction — plus the `SMR-133` reconciliation. No improvements-log entry was converted, so the ship commit owes no removal trace.
- [ ] *(Not the `coder`'s: the docs pass.)* Fold this delta into `docs/ARCHITECTURE.md`'s durable record and remove this spec.

## Already satisfied criteria

Forty-nine of the sixty-eight transcribed criteria need nothing built: they were satisfied on this branch by the shipped commits `a8af0ee`…`77532e1`, and this delta's only obligation is not to break them. Each entry names the surface that satisfies it — which is what `qa` re-validates against the post-build tree under R10 — and flags whether this delta also edits that surface.

**Entries name regions, never line numbers.** `qa` opens these in the **post-build** tree, so a line number written here rots the moment the build edits the file above it — which is exactly what happened on this delta: removing an eight-line section and adding a three-line one moved the whole scratch region, and entries citing it pointed at a heading instead. The *Validation* preamble's own rule — no counts, no file lists, no line numbers — applies here in full, and this is the correction of having applied it to the items and not to these entries. So an entry names its region the way a reader finds it: the **bold lead-in**, the section heading, or a quoted phrase from the text itself. The line citations under *Edit sites* in the Design stay, because they are pinned to `77532e1` — an immutable commit cannot rot.

**Entry marker.** Entries here use `→`, not the `—` the transcription uses, so the transcription's `- **ACn** — ` lines stay the only lines with that shape. The `auditor`'s equality check compares the transcription against the card mechanically; a section that reused the same prefix would put 49 extra lines in reach of a comparator that greps for it.

**On provenance:** the commit range is the branch's, not a per-criterion claim. Attributing each criterion to one commit would be exactly the fabricated precision that failed this spec's earlier gate rounds; where a single criterion's origin matters, `git log -S` on the named file settles it. The **file** is the load-bearing part of every entry, because the file is what `qa` opens.

**Used under a lead-granted exception.** By Assumption A3 this section's authorising rule ships in this very delta, so the gate reviewing this spec does not carry it. The `lead` granted the disposition explicitly in its spec-gate dispatch; this section relies on that grant alone and claims no other authority.

### Satisfied by the tracking declaration and the narrowed `board` skill — not edit sites

- **AC2** → `plugins/ca77y-engineering/skills/lead/SKILL.md`'s *An absent declaration does not stop the run*. *Edit site: the file, not this region.*
- **AC3** → `plugins/ca77y-engineering/skills/board/SKILL.md`'s clause governing when `references/authoring-issue-tracking.md` is loaded — "only when you are actually writing or repairing a declaration". **`qa` opens that clause and reads it against the criterion as worded, not as intended.** This entry is here only because the criterion was corrected in this same pass: as it read before, it required the load to happen only when the declaration is *absent*, which the shipped clause does not do and should not — repairing operates on a present file. See *Deviations from the card*.
- **AC4** → the same `lead/SKILL.md` paragraph as AC2, which needs no skill invocation. *Edit site: the file, not this region.*
- **AC5** → `lead/SKILL.md`'s *An absent declaration does not stop the run* paragraph and `plugins/ca77y-engineering/agents/analyst.md`, neither instructing a per-run `board` invocation. *Edit site: `lead/SKILL.md`, not this paragraph.*
- **AC6** → `docs/ARCHITECTURE.md`'s *The skill itself remains, narrowed to authoring*. *Edit site: the file, not this region.*
- **AC7** → `plugins/ca77y-engineering/skills/board/SKILL.md`, which names `references/authoring-issue-tracking.md` and which job loads it.
- **AC8** → `plugins/ca77y-engineering/skills/board/SKILL.md`'s frontmatter `description`.
- **AC12** → `docs/CLAUDE.md`'s layout entry for `ISSUE_TRACKING.md`.
- **AC13** → no shipped instruction to probe a binding, and none forbidding a write through an unprobed one. `qa` runs `grep -rn -i --exclude-dir=specs 'probe' --include='*.md' .` and reads every hit: the property is that **no hit is an instruction** — the surviving uses are a statement that the step is gone, an unrelated observation that a controlled probe would settle the dispatch-mode/agentId-resumability question, a verb list naming the removed mechanism, and a reproduction note. The check is the reading, not the number of hits.
- **AC14** → `docs/ISSUE_TRACKING.md`'s *Operations*, which binds `comment` and `update`.
- **AC15** → `docs/ISSUE_TRACKING.md`'s *What the old per-run artifact used to carry* table.

### Satisfied by the improvements-log path migration — some carriers are edit sites

- **AC16** → the phrase is absent from `plugins/`: `grep -rn 'discover that folder from context' plugins/` → no output.
- **AC17** → the *Process feedback* paragraph, in every file carrying it, each naming `docs/AGENTS_IMPROVEMENTS.md` at that fixed path. **`qa` enumerates the carriers itself** with `grep -rl '^When you hit real friction in the \*\*pipeline itself\*\*' plugins/`, rather than working from a list here — the root `CLAUDE.md` documents drift checks for two other canonical paragraphs but none for this one. *Edit sites: yes — `auditor.md`, `writer.md` and `lead/SKILL.md` all carry it.*
- **AC18** → those same carriers resolving to exactly two distinct variants — the count that matters is the criterion's own, not one this spec restates. `qa` pipes the same paragraph `grep -h` over the carriers it just enumerated through `sort -u | wc -l`; there is no root-`CLAUDE.md` snippet for this paragraph to reuse. *Edit sites: yes, the same three — the likeliest entry in this whole section to break, since an edit to any carrier can split a cluster.*
- **AC19** → the root `CLAUDE.md` § *The improvements log is cleared as it is converted*, byte-identical to `f87eedc`; V5 is the check. *Edit site: the file, not this section — and this pass acts on that rule, which is not licence to edit it.*
- **AC20** → `README.md` and `docs/ARCHITECTURE.md`, neither asserting the improvements-log path is context-resolved. *Edit sites: both files, other regions.*

### Satisfied by the profile deletion — the per-entry flags say which are edit sites

- **AC9** → no `.md` under `plugins/`, `docs/`, or the root refers to a board profile; V7 is the check. *Edit sites: several files, so `qa` re-runs V7 rather than assuming.*
- **AC10** → `plugins/ca77y-engineering/plugin.json` and `plugins/ca77y-engineering/.claude-plugin/plugin.json` descriptions.
- **AC11** → the same two manifests carrying one `version`; V4 is the check.
- **AC35** → `plugins/ca77y-engineering/agents/analyst.md`'s *Run the advisor gate* step, which names no profile in its dispatch.

### Satisfied by the shipped access model — mostly adjacent to edit sites

- **AC30** → the not-a-build-step provision inside `auditor.md`'s spec-gate step under *What you do* — the clause beginning "A criterion whose owning mechanism is not a build step". *Edit site: **yes**, this exact rule gains the third disposition — R9 must extend it, not replace it.*
- **AC33** → `auditor.md`'s canonical **Board access is granted by your caller.** paragraph, stating access is caller-granted. *Edit site: the file, not this paragraph. Note what proves what: V1 shows the two copies are identical **to each other**, which is AC40's property, not that either is unchanged. That neither changed is a separate observation — compare the paragraph's checksum against `77532e1` — and `qa` should make it directly rather than reading it out of V1.*
- **AC34** → `analyst.md`'s *Run the advisor gate* step, granting it read and search, and that run's duplicate detection.
- **AC38** → `writer.md`'s canonical **Board access is granted by your caller.** paragraph and the **In the spec pass, that access is always read and search.** sentence beneath it. *Edit site: the file, not these two paragraphs.*
- **AC39** → two different observations, because the two files satisfy it differently. `coder.md`'s own statement that it carries no board access is a sentence `qa` can open and read. **`qa.md` states nothing, and that is the check**: `grep -i 'board' plugins/ca77y-engineering/agents/qa.md` returns no output at all, so there is no board mention to be wrong. *Edit site: **`qa.md` is**, under R10 — so this is among the entries most likely to break, and the grep returning nothing is exactly what proves the new validation step introduced no board access.*
- **AC40** → the pair byte-identical across `writer.md` and `auditor.md`; V1 is the check. *Edit site: both files.*
- **AC41** → the root `CLAUDE.md`'s drift snippet for the caller-granted paragraph, whose pattern matches that paragraph's opening; V1 is the check. *Edit site: **yes** — the prose immediately above that snippet, in the same section. The snippet itself must not change.*
- **AC43** → all four output-asserting snippets in the root `CLAUDE.md`; V1-V4 are the checks. *Edit site: as AC41.*

### Satisfied by part 7's scratch relocation — none is an edit site for its own content

- **AC44** → `lead/SKILL.md`'s *Context discipline* section, across its **Paths, not content**, **Run-local scratch lives inside the story worktree, at `tmp/`** and **The ledger** lead-ins, which together name the directory, both filenames and the file tools. *Edit site: **yes** — the ledger paragraph is one of this delta's edit sites, and the region moved when the equality-check section was removed above it, so `qa` re-reads all three paragraphs by their lead-ins.*
- **AC45** → the same *Run-local scratch* paragraph's "no scratch write ever needs `bash`". *Edit site: as AC44.*
- **AC46** → the same paragraph's **committed ignore entry itself** clause, naming `/tmp/` in this repository's `.gitignore`. *Edit site: as AC44.*
- **AC47** → `docs/PRODUCT.md` § *Requirements it places on target repos*, stating both ignore entries, and the agreeing `README.md` setup prose.
- **AC48** → `docs/ARCHITECTURE.md`'s write-guard record, at its **The write below was demonstrated, not asserted — and it does not touch the question above.** lead-in, which carries **both** clauses the corrected criterion asks for: that the write was performed rather than asserted, and that the record says what it does and does not establish — it proves the relocated location **writable**, and is **not** evidence that `path`-form entry clears the guard. Closed by this story's earlier run and not re-demonstrated here; `qa` reads that paragraph rather than re-running the write. *Criterion corrected in this pass — see Deviations from the card; this entry was rewritten to match both of its clauses.*
- **AC49** → the same record, carrying the outcome and the dispatch mode together.
- **AC50** → the same record's *The `path`-form question stays open* paragraph. The obligation is **conditional and its condition did not occur**: the criterion binds only on an outcome that settles the question, and this run's guard never fired, so the "Nothing shipped verifies…" sentence correctly **stays** and the record says which of the two settling outcomes would have retired it. AC51's branch is the live one — read the two entries together.
- **AC51** → the same record, on the non-settling outcomes.
- **AC52** → the same record's escalation clause.
- **AC53** → `docs/ARCHITECTURE.md`'s scratch rationale and its four rejected alternatives. *Edit site: the file, other regions.*
- **AC54** → `lead/SKILL.md`'s *Invoked on an open PR* recovery step. *Edit site: the file, not this region.*
- **AC55** → `docs/ARCHITECTURE.md`, `README.md` and `lead/SKILL.md` agreeing on location and reason. *Edit sites: all three, other regions — so `qa` re-reads the three together.*
- **AC56** → the scratch paths, unqualified by branch, in `README.md`, `lead/SKILL.md`, `docs/ARCHITECTURE.md` and the friction log. *Edit sites: the first three.*
- **AC57** → this repository's committed `.gitignore`, carrying `/tmp/` beside `.worktrees/`.
- **AC58** → `docs/PRODUCT.md` § *Requirements it places on target repos*, and the agreeing `README.md` prose.
- **AC59** → no shipped instruction placing scratch outside the worktree. *Edit sites: several files, so `qa` re-runs the phrase search rather than assuming.*
- **AC60** → the same *Run-local scratch* paragraph's durability sentence — "Scratch inside the worktree does not outlive it" — naming the card's handoff comment, the PR description and `git log`. *Edit site: **yes**, the same region as AC44.*

### Satisfied by the tenet reconciliation — the per-entry flags say which are edit sites

- **AC61** → the root `CLAUDE.md`, `docs/PRODUCT.md`, `docs/ARCHITECTURE.md` and `README.md`, none calling a fixed declaration path a defect. *Edit sites: three of the four, other regions.*
- **AC62** → `docs/PRODUCT.md` § *Principles*, on location-as-convention.
- **AC63** → no `ca77y-engineering` dispatch or dependency under `plugins/ca77y-library/`; the root `CLAUDE.md`'s cross-plugin `grep`s are the check, and V3 runs them.
- **AC64** → all four manifests' `version` unchanged; V4 and V6 are the checks.
