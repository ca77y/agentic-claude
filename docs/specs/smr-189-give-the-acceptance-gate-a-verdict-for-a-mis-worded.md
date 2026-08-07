# Give the acceptance gate a verdict for a mis-worded criterion, and make every verdict name its evidence

- **Status**: Draft
- **Task**: smr-189-give-the-acceptance-gate-a-verdict-for-a-mis-worded
- **Last Updated**: 2026-08-07
- **Document Scope**: One unit of work — a fourth acceptance-gate outcome for a criterion whose shipped work is right and whose wording is not, the routing and terminal disposition that outcome needs across the `lead`, the consequence sentence the tracking declaration is missing, and an evidence obligation on every verdict the gate returns.

---

## Goal

**The problem.** `plugins/ca77y-engineering/agents/auditor.md` gives the acceptance gate three outcomes — "judge that criterion met, partially met, or unmet" — and all three describe **the work**. None describes the case where the work is right and the *criterion* is wrong. Faced with it, the gate must either fail correct work or pass wording the work does not satisfy as written. On `SMR-188` it took the second: a criterion requiring an authoring reference to be "read only when the file is absent" was graded **met** against a shipped clause that deliberately also loads it while *repairing* a file that is present. A board-side wording defect shipped behind a green gate, and surfaced a story later only because the already-satisfied section's verify-by-opening duty forced someone to read the clause against the criterion's actual words.

**Why a fourth outcome and not a bug fix.** The obvious repair — let the gate correct the criterion — is barred: `docs/ISSUE_TRACKING.md` § *What the pipeline may write* forbids correcting a criterion "in the window between the build and the gate that judges it", and the acceptance gate **is** that gate; `auditor.md`'s *Constraints* separately forbid the `auditor` editing the card it gates. The window where correction *is* legal is the `writer`'s spec pass, before any code exists. So the outcome cannot close inside the run that finds it. It has to be **reported, escalated, and corrected in a later run's spec pass** — which is the route `SMR-188` actually took, its corrections landing in a second run's spec pass ahead of that run's own build.

**Why the evidence obligation ships with it.** "The criterion is wrong" is an escape hatch: an auditor that merely *cannot verify* something could relabel it rather than fail it. The same failure mode already has a guard elsewhere — the readiness gate's third disposition makes an unverifiable already-satisfied entry "a **blocking finding, not a pass**, at the same severity as a criterion with no disposition at all" — and this outcome needs the equivalent. Requiring **every** verdict, `met` included, to name the observation that establishes it is that guard, and it closes a second hole in the same stroke: a criterion satisfied only because its antecedent never arose is logically `met`, and the gate has been calling it that with nothing recording that nothing was exercised. The observation makes a vacuous `met` say so in its own words, with no fifth label to grade.

**The change.** Four surfaces, one behaviour.

1. `auditor.md` gains a fourth acceptance-gate outcome, **mis-worded**, with the sub-case it must name, the side-by-side quoting it must carry, four bars that stop it substituting for `unmet`, and the rule that here it is reported and escalated in the returned verdict and never corrected. Its spec-readiness gate gains the same defect as a finding that routes to the `writer`'s spec pass, where correction is legal. And every verdict it returns per `ACn` names its establishing observation.
2. `lead/SKILL.md` stops routing every acceptance-gate finding to the `coder`: a **mis-worded** outcome is an escalation the run carries to the human, recorded in the PR description, the final handoff, and a comment on the card; the step-6 enumeration, the § *When a gate finds a problem* routing map, and the Boundary rule against shipping "with an acceptance criterion unmet" are all reconciled with it.
3. `docs/ISSUE_TRACKING.md` states what a gate does with mis-wording it finds inside the barred window — without restating the gate's verdict vocabulary, which stays in `auditor.md`, and without weakening the prohibition by a word.
4. `docs/ARCHITECTURE.md` and the root `README.md` are reconciled with what shipped. **These are the docs pass's, not the `coder`'s** — see *The seven criteria no build step closes*.

**The value.** The gate gains an honest answer for a case it currently has to lie about in one direction or the other; the run gains a stated terminal disposition instead of a loop no round can clear; the human gains a named, durable escalation instead of a silent pass; and every `met` becomes checkable rather than asserted.

**Non-goals.** The declaration's window prohibition is not relaxed. The `auditor` still never edits the card it gates. The acceptance gate's board access stays **read**, with no search. No fifth verdict label. The three-round cap and the `lead`'s 3× hard stop are untouched. Classifying a criterion as code- or documentation-satisfied stays `SMR-133`'s (see *Coordination*). No plugin `version` changes.

## Acceptance criteria (verbatim transcription)

> **Source**: card `SMR-189`, read from Linear via the `read` binding (`get_issue`) on **2026-08-07**,
> at status `In Progress`, **after** this spec pass's card corrections were applied (see *Deviations
> from the card* — all four were to `## References`; **no acceptance criterion was edited**, so the
> list below is the card's as it stood before and after). This is a **copy, not a summary** — one
> card bullet per `ACn` line, in card order, `n = 41`.
>
> **Why a checked copy is licensed where a paraphrase is not.** The standing rule elsewhere in this
> pipeline is to name the card rather than restate its criteria into a prompt, because a paraphrase
> drifts toward what the work already does. A verbatim copy carries that same failure mode unless
> something proves the drift did not happen. What proves it is not this note and not a promise of
> faithfulness: it is the `auditor`'s **mechanical equality check**, run by the gate itself, inside
> the spec-readiness gate before it judges the mapping and inside the acceptance gate before it
> grades anything, on every round of each.

- **AC1** — `auditor.md`'s acceptance gate carries a fourth outcome, alongside met / partially met / unmet, for a criterion whose shipped work is right and whose wording does not hold as written.
- **AC2** — That outcome requires the report to name which sub-case applies — the criterion is narrower or broader than the design intends, it contradicts a specific other `ACn`, or its antecedent cannot arise in any run — rather than only asserting that the criterion is wrong.
- **AC3** — That outcome requires the report to quote the criterion's own sentence and the shipped text that does the right thing, side by side.
- **AC4** — The shipped wording states that work failing is never grounds for that outcome.
- **AC5** — The shipped wording states that a criterion whose *design* is wrong is graded unmet rather than mis-worded.
- **AC6** — The shipped wording states that a criterion the gate cannot verify — the named region cannot be opened, or a cited dependency source cannot be read at the version cited — is graded unmet or reported unverified, never mis-worded.
- **AC7** — The shipped wording identifies "reported unverified" as the existing mechanism-verification reporting mode rather than a fifth grade.
- **AC8** — The shipped wording states this outcome's severity relative to unmet, so it cannot serve as a lower-severity substitute for one.
- **AC9** — At the acceptance gate the outcome does not pass.
- **AC10** — At the acceptance gate the outcome is not graded met.
- **AC11** — At the acceptance gate the outcome does not license correcting the criterion.
- **AC12** — The shipped wording states that the `auditor`'s escalation is carried in the verdict it returns, and not sent through any other channel.
- **AC13** — At the spec-readiness gate the same defect — a criterion contradicted as worded by the spec's Design, or by the region an *Already satisfied criteria* entry names — is reported as a finding that routes to the `writer`'s spec pass for a criterion correction.
- **AC14** — The shipped wording says why the spec pass is the window where that correction is legal.
- **AC15** — The shipped wording states what a run does after this outcome at the acceptance gate — whether the `lead` proceeds to the docs pass and the PR having escalated, or the run halts — so the gate's loop has a stated terminal disposition rather than one no round can clear.
- **AC16** — The shipped wording states that a criterion this outcome names at the **acceptance gate** is corrected in a later run's spec pass, not in the run that graded it.
- **AC17** — The shipped wording states why the `lead`'s existing mid-run respec route — back to the `writer` for a revised spec — cannot carry a criterion correction.
- **AC18** — `lead/SKILL.md`'s acceptance-gate step no longer routes every acceptance-gate finding to the `coder`: this outcome is escalated to the human, because neither the `coder` nor a mid-run respec can close it.
- **AC19** — `lead/SKILL.md`'s § *When a gate finds a problem* routing map carries a row for this outcome, carved out of step 6's route-to-the-`coder` default the way that map's mechanical-equality-check row already is — the precedent is the carve-out, not that row's destination.
- **AC20** — `lead/SKILL.md`'s step 6 sentence "each unmet or partially met one is a finding" accounts for the fourth outcome, so a finding that is neither unmet nor partially met does not leave that enumeration wrong.
- **AC21** — Wherever the stated disposition lets the run continue, the escalation is recorded in the PR description rather than only in the gate's returned verdict.
- **AC22** — Wherever the stated disposition lets the run continue, the escalation is recorded in the `lead`'s final handoff rather than only in the gate's returned verdict.
- **AC23** — The escalation is also recorded on the card itself, through the comment the declaration authorises, so the later run's spec pass reads it from the durable source rather than from a PR body.
- **AC24** — `lead/SKILL.md`'s Boundary rule against shipping "with an acceptance criterion unmet" is consistent with the terminal disposition the change states.
- **AC25** — The acceptance gate's three-round cap is unchanged by the addition.
- **AC26** — The `lead`'s 3× hard stop is unchanged by the addition.
- **AC27** — `docs/ISSUE_TRACKING.md`'s rule against correcting a criterion "in the window between the build and the gate that judges it" states what a gate does when it finds mis-wording inside that window.
- **AC28** — That addition leaves the prohibition on correcting a criterion inside the window unchanged.
- **AC29** — `docs/ISSUE_TRACKING.md` states the window consequence without restating the gate's verdict vocabulary, which stays in `auditor.md`.
- **AC30** — Every `met` verdict the acceptance gate returns names the observation that establishes it.
- **AC31** — A criterion satisfied only because its antecedent never arose is graded met with an observation stating that the antecedent was false and nothing was exercised.
- **AC32** — No fifth verdict label is introduced for a vacuously satisfied criterion.
- **AC33** — `auditor.md`'s constraint that the `auditor` never edits the card it gates is intact after the change.
- **AC34** — The acceptance gate's board access is unchanged after the change — read, and no search.
- **AC35** — `docs/ARCHITECTURE.md`'s paragraph on how both gates work per label describes the fourth outcome. This criterion is the docs pass's to close, not the `coder`'s.
- **AC36** — That same paragraph describes the evidence obligation on a `met` verdict. This criterion is the docs pass's to close, not the `coder`'s.
- **AC37** — `docs/ARCHITECTURE.md`'s *An entry is verified by opening the region it names* paragraph points at the shipped outcome rather than leaving this defect's discovery to the incidental coverage it records today. This criterion is the docs pass's to close, not the `coder`'s.
- **AC38** — The root `README.md`'s `auditor` section describes the fourth outcome. This criterion is the docs pass's to close, not the `coder`'s.
- **AC39** — That same section describes the evidence obligation on a `met` verdict. This criterion is the docs pass's to close, not the `coder`'s.
- **AC40** — The root `README.md`'s lead-flow acceptance-gate step agrees with the shipped routing. This criterion is the docs pass's to close, not the `coder`'s.
- **AC41** — That same step's "Docs do not start while a criterion is unmet" sentence agrees with the stated terminal disposition. This criterion is the docs pass's to close, not the `coder`'s.

**Where each of the 41 is answered.** Thirty-seven map to a Requirement below (`R1`–`R12`). The other four — `AC25`, `AC26`, `AC33`, `AC34` — need nothing built and live in *Already satisfied criteria* at the bottom, each naming what satisfies it, what `qa` re-validates, and whether this task also edits that surface. The two homes are disjoint and together cover all 41: no criterion is carried by prose alone, and none is left to "out of scope".

## Design

### The fourth outcome, and what it is called

The acceptance gate's verdict vocabulary becomes **met / partially met / unmet / mis-worded** — four labels, no more (`AC1`, `AC32`). The card's own prose fixes the name: `AC5` and `AC6` both read "never mis-worded", so the shipped label is that word and the build does not invent a synonym.

**mis-worded** applies to exactly one situation: the shipped work does what the design intends, and the criterion as *worded* does not describe it. Both halves are load-bearing, which is what the four bars below enforce.

### The three sub-cases, and the one that is not one

`AC2` fixes the sub-case list at three, and the report names which applies:

| Sub-case | What it means | The instance behind it |
| --- | --- | --- |
| **narrower or broader than the design intends** | the criterion forbids something the design deliberately does, or demands something wider than the design's stated scope | `SMR-188`'s authoring-reference criterion: "read only when the file is absent", against a clause that also loads it while *repairing* a file that is present |
| **contradicts a specific other `ACn`** | two criteria on one card cannot both hold against the real system; the report names the other label | `SMR-188`'s `AC48` against `AC51`: a write demonstrated after a `path` entry, versus a legitimate branch in which no `path` entry is ever made |
| **its antecedent cannot arise in any run** | the criterion is conditional and no run can make its condition true, so it is unfalsifiable rather than satisfied | a criterion conditioned on a branch the design forecloses |

**The third sub-case is not the vacuous case, and the shipped wording says so.** A criterion whose antecedent *could* arise but did not in this run is `met`, with an observation recording that nothing was exercised (`AC31`). A criterion whose antecedent *cannot* arise in any run is **mis-worded**. Collapsing the two would either hide a real wording defect behind a green `met` or fail a run for a branch it correctly did not take, and both are the failures this card exists to end. The distinction is *in this run* versus *in any run*, and it is stated in the shipped text rather than left to be inferred.

### Side by side, because a paraphrase is how this defect hides

`AC3` requires the report to quote **the criterion's own sentence** and **the shipped text that does the right thing**, adjacent. This is the same reasoning `docs/ARCHITECTURE.md` already records under *An entry is verified by opening the region it names, never accepted on its paraphrase*: "a paraphrase bent into agreement with the criterion reads exactly like a verified claim". A mis-worded verdict argued in paraphrase is unfalsifiable by the human who receives it; two quotations side by side either show the mismatch or fail to.

### Four bars, because the outcome is an escape hatch

An auditor that cannot do its job could reach for this label instead of failing. Four bars, all stated in the shipped wording:

- **Work failing is never grounds for it** (`AC4`). If any part of the shipped work does not do what the design intends, the grade is `unmet` or `partially met`. `mis-worded` requires the work to be *right*.
- **A wrong design is `unmet`, not `mis-worded`** (`AC5`). Where the criterion is right and the design is what fails it, the criterion has done its job and the grade is `unmet`.
- **Inability to verify is never `mis-worded`** (`AC6`). Where the named region cannot be opened, or a cited dependency source cannot be read at the version cited, the grade is `unmet` or the claim is **reported unverified**. A verdict you could not reach is not a verdict that the criterion is wrong.
- **Severity ranks with `unmet`, never below it** (`AC8`). `mis-worded` is a blocking finding at the same severity as `unmet`, and it additionally costs a human escalation and a later run's spec pass. It is never the cheaper label, which is what stops it substituting for one. This mirrors the bar the readiness gate's third disposition already sets: "a **blocking finding, not a pass**, at the same severity as a criterion with no disposition at all."

**"Reported unverified" is the mechanism it already has, not a fifth grade** (`AC7`). `auditor.md`'s dependency-mechanism paragraph already instructs the gate to "report the claim as unverified, naming the criterion it affects" when a cited source cannot be read, and to report a claim the spec marks as an assumption as unverified rather than established. The new wording names that existing mode by pointing at it, so the vocabulary stays four labels plus one pre-existing reporting mode.

### What the outcome does *at* the acceptance gate

Four properties, all about this gate specifically (`AC9`–`AC12`):

- It **does not pass**. The criterion's verdict is not a pass and the gate's overall verdict is not *ready*.
- It is **not graded met**. That is the whole point: `met` is what the gate wrongly returned on `SMR-188`.
- It **does not license correcting the criterion** here. `auditor.md`'s *Constraints* already forbid the `auditor` editing the card it gates, and the declaration separately bars any correction inside the build-to-gate window. The new text points at both rather than restating either.
- The escalation is **carried in the verdict the gate returns**, and sent through no other channel (`AC12`). `auditor.md`'s *Your verdict is your return value* paragraph already says a verdict is the final message and that `SendMessage` is never used "to report or escalate"; the new outcome's text points at that rule by name, so the connection between a new noun — *escalation* — and an existing prohibition is stated rather than inferred. (This is why `AC12` is a requirement and not an already-satisfied entry: the existing paragraph is true and sufficient, but nothing in it is about *this* outcome, and a reader meeting "escalate" for the first time in the new paragraph has no reason to look for it.)

### The gate says not-ready; the run ships anyway. Both, and how they fit

The owner has settled the disposition `AC15` demands: **the run ships, having escalated** (recorded on the card, 2026-08-07). That has to be reconciled with `AC9`, which says the outcome does not pass, and with the `lead`'s Boundary rule (`AC24`). It reconciles cleanly, and the shipped wording states the reconciliation rather than leaving two surfaces to be read against each other:

- The **gate's** verdict is unchanged by the disposition: that `ACn` is not passed, and the gate returns not-ready. A gate does not decide what a run does next.
- The **`lead`'s** routing is what the disposition governs. A `mis-worded` outcome is the one gate finding the `lead` may proceed past — because no round can clear it, and the work is right. It proceeds to the docs pass and the PR, carrying the escalation.
- **Only that outcome.** Any criterion graded `unmet` or `partially met` still blocks exactly as it does today, and the run only proceeds when every other criterion is `met`. Without this clause the disposition would read as a general licence to ship a failing gate, which it is not.
- The **Boundary** sentence gains the distinction rather than an exception: a criterion the acceptance gate grades **mis-worded** *is not unmet* — the work is right and the wording is not — and it is the one outcome the run ships past, escalated per step 6. The prohibition on shipping with a criterion **unmet** is untouched.

### Why no route inside the run can close it, and where it does close

`AC16` and `AC17` require the shipped wording to say this, because the obvious routes all look available and none is:

- The **`coder`** cannot reword a card, and holds no board access at all.
- The **mid-run respec** — § *When a gate finds a problem*'s "a problem big enough that the built approach itself is wrong → back to the `writer` for a revised **spec**" — can revise the spec but cannot carry a criterion correction: `writer.md` grounds the correction authority in the spec pass happening "before any code exists, so nothing can be reshaped to match what was built", and a respec after a build is squarely inside the window `docs/ISSUE_TRACKING.md` bars. A respec satisfies neither condition (`AC17`).
- What is legal is **a later run's spec pass on the corrected card** (`AC16`) — a fresh run whose spec pass again precedes its own code. This is the route `SMR-188` took, not a new invention.

### The same defect, one gate earlier

At the **spec-readiness gate** the window is open, so the defect is a finding rather than an escalation (`AC13`). The gate already reads the spec's Design and already opens the region each *Already satisfied criteria* entry names; where either **contradicts a criterion as worded**, that is a not-ready finding routed to the `writer`'s spec pass for a criterion correction. The shipped wording says why that window is the legal one (`AC14`): no code exists yet, so nothing can be reshaped to match what was built — the same ground `writer.md` and `docs/ARCHITECTURE.md` already state.

This is not a new duty bolted on: it is the readiness-gate half of one rule whose acceptance-gate half is the fourth outcome, and the file states them as such.

### Every verdict names its evidence

`AC30` puts the obligation on **every** verdict the acceptance gate returns per `ACn`, `met` included: the observation that establishes it — the file and the region read, and what it said. Two consequences the shipped wording states:

- A **vacuously satisfied** criterion is graded `met` with an observation saying the antecedent was false and nothing was exercised (`AC31`). The verdict is honest and the non-exercise is visible, with no label to add.
- **No fifth label** (`AC32`). The vacuous case is handled by what the observation says, not by what the verdict is called.

The obligation is the guardrail that makes `mis-worded` safe as much as it is a fix in its own right: a gate that must name an observation for every verdict cannot quietly relabel a criterion it failed to check.

### The declaration states a consequence, not a vocabulary

`docs/ISSUE_TRACKING.md` § *What the pipeline may write* today says only that correction is barred inside the window. It gains what a gate **does** with mis-wording it finds there: report it in the verdict it returns and let the run escalate it, unresolved, to the human; the correction happens in a later run's spec pass (`AC27`).

Two constraints on that sentence:

- **The prohibition is not weakened by a word** (`AC28`). The addition sits beside "never in the window between the build and the gate that judges it" and leaves it exactly as it stands.
- **It names no verdict label** (`AC29`). *met*, *partially met*, *unmet* and *mis-worded* are `auditor.md`'s vocabulary and stay there; the declaration describes the situation ("a gate that finds a criterion's own wording defective") and the consequence, and nothing else. This keeps the declaration a statement about write authority rather than a second, drifting copy of the gate's grading rules.

### The seven criteria no build step closes

`AC35`–`AC41` are `docs/ARCHITECTURE.md` and `README.md` reconciliations. **Their owning mechanism is the `writer`'s docs pass, at the `lead`'s workflow step 7 — not the `coder`.** Each has a Tasks entry below, marked as not the `coder`'s.

The consequence is stated rather than discovered: the acceptance gate runs at **step 6**, before the docs pass at step 7, so on this run those seven criteria will be **reported pending the docs pass**. That ordering defect is `SMR-133`'s, it is still open, and the card's References settle which branch this build takes — name the owning mechanism and accept the report, rather than waiting for `SMR-133`. What the `lead` does with that report is: run the docs pass, take the `writer`'s report as what closes those seven, and record in the handoff that they closed at step 7. They are **not** `coder` findings and must not be routed as such, and they are **not** `mis-worded` outcomes either — the criteria are correctly worded, they are simply graded before the pass that satisfies them.

Having named that owner, every remaining criterion on the card was re-read for the same shape — present on the card, absent from the Tasks checklist, no stated owner. Two more have owners that are not the `coder`, both discharged in this spec pass and both carrying a Tasks entry: the card corrections under *Deviations from the card*, and the sibling-card coordination note under *Coordination*. No other criterion is left unassigned.

### Claims this spec rests on, and what backs each

Every claim about this repository's own files is cited by path and line at **`31988b7`**, the commit this story branch is cut from, and was read at that commit. Line numbers here are pinned to that immutable commit, which is the allowed form; nothing in this spec cites a line number against the post-build tree.

**This spec asserts nothing about a third-party or vendored dependency** — the deliverable is prose in this repository, and there is no package to cite. Two claims are not file-citable and are marked as assumptions:

- **Assumption A1 — a dispatched subagent's definition is loaded from the *installed* plugin, not from the story worktree.** It is a property of the harness, not of this repository, so no path-and-line reference exists for it. Its consequence for this run is concrete and must not be papered over: **the `auditor` that grades this build will run the pre-change `auditor.md`**, with three outcomes and no evidence obligation. So this run's own acceptance gate cannot exercise the behaviour it ships, and a green gate here is not evidence the fourth outcome works. `SMR-187` is the open card for making that hazard visible from inside a run; `docs/PRODUCT.md` (Direction) already requires behaviour changes to be validated on a live run rather than by reasoning about prompt text, and the first run that can exercise this one is the next task's.
- **Assumption A2 — the harness dispatches each gate round as a fresh context with no memory of the previous round.** The instruction side is citable (`auditor.md:41-43` at `31988b7`); that the harness cannot smuggle context between two dispatches is not. Nothing in this spec's requirements depends on A2 beyond what `auditor.md` already states in its own voice.

### Edit sites, verified at `31988b7`

**`plugins/ca77y-engineering/agents/auditor.md`**
- `:14`, `:16` — the two canonical paragraphs. **Not edited**; verified after the build (see *Boundary*).
- `:18` the per-gate grant paragraph — **not edited.** The acceptance gate keeps **read** and no search (`AC34`).
- `:24` step 3, the spec-gate duty — gains the readiness-gate half of the defect: a criterion contradicted as worded by the spec's Design, or by the region an already-satisfied entry names, is a finding routed to the `writer`'s spec pass, with why that window is the legal one.
- `:35` the three-outcome sentence — becomes four, with the fourth outcome's full statement: the sub-case list, the side-by-side quoting, the four bars, and the at-this-gate properties.
- `:37` the no-card branch — gains one clause: this outcome is for card-backed runs, since a run gating against the spec's own requirements has no criterion to correct and no later spec pass to route one to.
- `:39` the dependency-mechanism paragraph — **not edited**; the new text points at its "reported unverified" mode by name (`AC7`).
- `:49` *Your verdict is your return value* — **not edited**; the new text points at it for `AC12`.
- `:54` the never-edit-the-card constraint — **not edited**, and now load-bearing for `AC11`/`AC33`.
- Grading section, wherever the fourth outcome lands: the evidence obligation on every verdict, the vacuous-`met` rule, and the four-labels-only statement (`AC30`–`AC32`).

**`plugins/ca77y-engineering/skills/lead/SKILL.md`**
- `:103` step 6, "each unmet or partially met one is a finding" — accounts for the fourth outcome (`AC20`).
- `:107` step 6, "Route findings to the same `coder` **as concrete unmet criteria**" — carves out the `mis-worded` outcome, which is escalated rather than routed (`AC18`), and states the terminal disposition (`AC15`, `AC16`).
- `:111-121` § *When a gate finds a problem* — a new row for this outcome, carved out the way the mechanical-equality-check row at `:119` already is (`AC19`). The 3× rule at `:121` is **not edited** (`AC26`).
- `:128` § *Ship and hand off* item 2 — the PR description carries the escalation (`AC21`).
- `:130` § *Ship and hand off* item 4 — the card comment carries it (`AC23`), through the declaration's `comment` binding, with the existing "where the authority permits neither" fallback covering a board that authorises no comment.
- `:162` Boundaries — the shipping rule gains the mis-worded/unmet distinction (`AC24`).
- `:172-183` § *Final handoff* — a bullet for the escalation (`AC22`).

**`docs/ISSUE_TRACKING.md`**
- `:106-112` § *What the pipeline may write*, the "Never edit an acceptance criterion" bullet — gains the window consequence (`AC27`), leaves the prohibition untouched (`AC28`), and names no verdict label (`AC29`).

**`docs/ARCHITECTURE.md`** *(docs pass, not the `coder`)*
- `:220-232` *Both gates work per label…* — the fourth outcome and the evidence obligation (`AC35`, `AC36`).
- `:730-738` *An entry is verified by opening the region it names…* — its closing sentence today records that a mis-worded criterion surfaces only incidentally, through this duty; it points at the shipped outcome instead (`AC37`).

**`README.md`** *(docs pass, not the `coder`)*
- `:503-524` the `auditor` section — the fourth outcome and the evidence obligation (`AC38`, `AC39`).
- `:342-354` the lead-flow acceptance-gate step — the routing (`AC40`), and its "Docs do not start while a criterion is unmet" sentence reconciled with the terminal disposition (`AC41`).

## Boundary

**In bounds — the files named under *Edit sites*, and only the regions named there:**
`plugins/ca77y-engineering/agents/auditor.md`, `plugins/ca77y-engineering/skills/lead/SKILL.md`, `docs/ISSUE_TRACKING.md`, `docs/ARCHITECTURE.md`, `README.md`, plus this spec file. The last two are the **docs pass's**, not the `coder`'s.

**Out of bounds, and why:**

- **`plugins/ca77y-engineering/agents/writer.md`** — verify-only. `AC13` routes the readiness finding *to* the `writer`'s spec pass, and that pass's correction authority is already stated there ("A criterion the design cannot satisfy as written goes in a Deviations section — and, where authorised, is corrected on the card itself"), grounded in the pass happening before any code exists. Nothing in this card asks the `writer` to do something new; the routing statement belongs in the gate that emits it. This file is also claimed by `SMR-179`, `SMR-181`, `SMR-183`, `SMR-185` and `SMR-157`, so leaving it alone avoids a collision for no gain.
- **`plugins/ca77y-engineering/agents/{coder,qa,analyst}.md`** — untouched. The `coder` and `qa` hold no board access and receive no mis-worded finding; the `analyst`'s advisor gate is a third dispatch this card does not change.
- **The two canonical paragraphs** — `**Addressing the story worktree.**` and `**Board access is granted by your caller.**`. Neither changes. Both root-`CLAUDE.md` drift checks must still print the value that file states beside them (V1, V2).
- **Any plugin `version`** — all four manifests stay at `ca77y-engineering` `2.4.0` / `ca77y-library` `1.1.0`. The manifests describe the `auditor` at role level and name no verdict vocabulary, so they need no reconciliation; verify rather than assume (V4, V5).
- **`docs/_templates/`** — the spec scaffold is unaffected: this card changes what a gate returns, not what a spec contains.
- **`docs/AGENTS_IMPROVEMENTS.md`** — append-only. The entry this card converts was already removed and committed in `bdd75e9`; nothing is owed to this run's commits on that point. The build changes no existing entry and adds one only on fresh friction of its own. **One entry is added by this spec pass** — see *Deviations from the card*.
- **`SMR-188`'s own criteria** — already corrected on that card, with dated rationale. This card generalises the gate and does not revisit them.

**No test files.** This repository has no `package.json`, no lockfile and no test runner; the worktree's dependency-provisioning status is *not provisioned — no install step*, which is this repo's expected steady state rather than a failure. The deliverable is prose, so every scenario below is an **inspection scenario**, discharged by reading a named file region or running a named command. `SMR-157` is the open card for a first-class prose-deliverable mode.

**Every scenario runs inside this Boundary.** Each names a file listed under *In bounds*; none requires opening a file the build may not touch, and none requires observing a live pipeline run. The one behaviour that genuinely cannot be observed from inside this run — whether a dispatched `auditor` acts on the shipped text — is Assumption A1, stated as an assumption rather than smuggled into a scenario.

**Validation reaches every consumer.** The only machine-read files in this repository are the four plugin manifests, and they are untouched and verified (V4, V5). There is no build script, no `Dockerfile`, no compose file, and the two GitHub workflows (`.github/workflows/claude-code-review.yml`, `claude.yml`) reference no file this task edits by name. There is therefore no consumer the root-level checks miss.

## Coordination

- **`lead/SKILL.md`** is claimed by four open cards. `SMR-133` **rewrites the same two sentences this card carves out of** — step 6's finding enumeration and its route-to-the-`coder` default — from a different axis; a coordination note was added to that card during this spec pass (see *Deviations from the card*). `SMR-144` is **`In Progress`** and touches the spec-commit point in step 3, a disjoint region — but a live concurrent run on the same file is a real merge hazard, and whichever lands second reconciles rather than restates. `SMR-187` and `SMR-182` claim step 7 and the final handoff; `SMR-187` in particular scopes the very § *Final handoff* this card adds a bullet to.
- **`auditor.md`** is claimed by `SMR-183` and `SMR-185`, both of which add to the readiness checklist that `AC13` also extends, and by `SMR-133`. Neither card's own shared-region list names this one, because both predate it; the Linear relations carry the edge.
- **`docs/ARCHITECTURE.md`** is claimed by `SMR-183`; **`README.md`** by `SMR-181` and `SMR-182`. Those regions look section-disjoint from this card's.
- **`docs/ISSUE_TRACKING.md`** has no other open claimant.
- **No shared infrastructure is in scope** — this card adds no test runner, no logging helper, no config knob — so the provisioning-collision half of the sibling sweep found nothing to coordinate. The sweep itself **ran**: the board was searched through the declaration's `search` binding on 2026-08-07 across the `Agentic Claude` project.
- **`SMR-187` is the reason this run cannot validate its own change** (Assumption A1). Not a blocker, and not this card's to fix.

## Deviations from the card

**No acceptance criterion was corrected.** All 41 are satisfiable as written against the design above, including the two phrased "Wherever the stated disposition lets the run continue…", which the owner's *ship, having escalated* decision makes live rather than vacuous. The transcription above is therefore identical before and after this pass's card edits.

**Four corrections were applied to the card's `## References`**, under the `update` authority `docs/ISSUE_TRACKING.md` § *What the pipeline may write* grants ("a stale relationship… **fix it on the issue**"), on **2026-08-07**:

| # | What it said | What it says now |
| --- | --- | --- |
| 1 | The source improvements-log entry's removal "is **uncommitted** in the `SMR-188` worktree… The clearing is pending a commit, not done." | PR #18 merged as `bdd75e9`, which carried the removal; the entry is absent from `master` at `31988b7`; the clearing is done. |
| 2 | "Verified against the `SMR-188` branch at head `911619b`, PR #18, **open and not merged**… which is why this card is blocked by `SMR-188` rather than buildable today." | PR #18 merged as `bdd75e9`, `SMR-188` is `Done`, `master` carries the labelling and per-label grading, the card is buildable, and where it describes a surface as it stood at `911619b`, `31988b7` is the authority. |
| 3 | "One decision left to the owner, deliberately" — ship or halt, unresolved. | Records the owner's settlement of 2026-08-07 — **ship, having escalated** — and the two consequences it has for the criteria. |
| 4 | The `SMR-133` interaction — "Either build this after `SMR-133`, or have the spec name the owning mechanism…" | Records which branch was taken: the second, with the docs pass named as owner and the step-6 report accepted. |

None of the four touches `## Acceptance criteria`, so the `auditor`'s mechanical equality check is unaffected by them.

**One sibling card was corrected.** `SMR-133`'s Scope gained a dated shared-region note recording that this card carves a routing exception out of the same two `lead/SKILL.md` sentences `SMR-133` rewrites, that the two are different axes, and that this card is being built first. Its goal, its criteria, and its own two open notes were left exactly as they stand — a criterion's goal is the human's.

**Nothing was rewritten that states what a story is for.** Where a correction would have shaded into that — most obviously `SMR-133`'s third criterion, which routes a documentation NOT-READY to "the `writer`'s own auditor gate", a gate `SMR-145` records no longer exists — it was **left alone**; that card already carries a note flagging it for whoever builds it.

**One improvements-log entry is added by this pass**, on fresh friction of its own: `writer.md` fixes the spec pass's board access at "always read and search" while the same file requires an authorised card correction to be *applied*, which needs `update`. Both readings are defensible and the two sentences should agree.

## Requirements

### Requirement: R1 — the acceptance gate has a fourth outcome

Covers **AC1**.

#### Scenario: the vocabulary is four labels

- **WHEN** `plugins/ca77y-engineering/agents/auditor.md`'s grading instruction (the sentence reading "judge that criterion met, partially met, or unmet" at `:35`, `31988b7`) is read
- **THEN** it names four outcomes — met, partially met, unmet, and **mis-worded**
- **AND** the fourth is defined as a criterion whose shipped work is right and whose wording does not hold as written

#### Scenario: the outcome is for card-backed runs

- **WHEN** `auditor.md`'s no-card branch is read
- **THEN** it states that this outcome applies to a run gating against a card's transcribed criteria
- **AND** it states that a run gating against the spec's own requirements has no criterion to correct and no later spec pass to route one to

### Requirement: R2 — the outcome's report names a sub-case and shows both texts

Covers **AC2**, **AC3**.

#### Scenario: the report names which sub-case applies

- **WHEN** the fourth outcome's instruction in `auditor.md` is read
- **THEN** it requires the report to name one of exactly three sub-cases — the criterion is narrower or broader than the design intends; it contradicts a specific other `ACn`; its antecedent cannot arise in any run
- **AND** it states that asserting only that the criterion is wrong, without naming a sub-case, is not the outcome
- **AND** where the sub-case is a contradiction, it requires the other `ACn` label to be named

#### Scenario: the antecedent sub-case is distinguished from a vacuous met

- **WHEN** the third sub-case is read
- **THEN** it distinguishes an antecedent that cannot arise in **any** run from one that merely did not arise in **this** run
- **AND** it states that the latter is graded met with an observation, per R11

#### Scenario: the criterion and the shipped text are quoted side by side

- **WHEN** the fourth outcome's instruction is read
- **THEN** it requires the report to quote the criterion's own sentence and the shipped text that does the right thing, adjacent to each other
- **AND** it states why a paraphrase is not accepted in their place

### Requirement: R3 — four bars keep the outcome from substituting for unmet

Covers **AC4**, **AC5**, **AC6**, **AC7**, **AC8**.

#### Scenario: failing work is never this outcome

- **WHEN** the fourth outcome's bars are read
- **THEN** they state that work that fails to do what the design intends is never grounds for it, and is graded unmet or partially met

#### Scenario: a wrong design is unmet

- **WHEN** the same bars are read
- **THEN** they state that a criterion whose *design* is wrong is graded unmet rather than mis-worded

#### Scenario: inability to verify is never this outcome

- **WHEN** the same bars are read
- **THEN** they state that a criterion the gate cannot verify — the named region cannot be opened, or a cited dependency source cannot be read at the version cited — is graded unmet or reported unverified, never mis-worded

#### Scenario: reported unverified is named as the existing mode

- **WHEN** the clause naming "reported unverified" is read
- **THEN** it identifies that as the mechanism-verification reporting mode `auditor.md` already carries, pointing at it rather than restating it
- **AND** it states that it is not a fifth grade

#### Scenario: the severity is stated relative to unmet

- **WHEN** the same bars are read
- **THEN** they state that this outcome ranks at the same severity as unmet and never below it
- **AND** they state that it additionally costs a human escalation and a later run's spec pass, so it is never the cheaper label

### Requirement: R4 — what the outcome does at the acceptance gate

Covers **AC9**, **AC10**, **AC11**, **AC12**.

#### Scenario: it does not pass and is not met

- **WHEN** the fourth outcome's at-this-gate properties are read
- **THEN** they state that the criterion does not pass
- **AND** they state that it is not graded met

#### Scenario: it does not license a correction here

- **WHEN** the same properties are read
- **THEN** they state that this outcome does not license correcting the criterion at this gate
- **AND** they point at `auditor.md`'s existing constraint against editing the card being gated, and at the declaration's bar on correcting inside the build-to-gate window

#### Scenario: the escalation travels in the returned verdict only

- **WHEN** the same properties are read
- **THEN** they state that the escalation is carried in the verdict the gate returns
- **AND** they state that it is sent through no other channel, pointing at `auditor.md`'s existing rule that a verdict is the final message and `SendMessage` is never used to report or escalate

### Requirement: R5 — the same defect is a finding at the spec-readiness gate

Covers **AC13**, **AC14**.

#### Scenario: the readiness gate reports it as a finding

- **WHEN** `auditor.md`'s spec-gate duty (`:24`, `31988b7`) is read
- **THEN** it states that a criterion contradicted as worded by the spec's Design, or by the region an *Already satisfied criteria* entry names, is a finding
- **AND** it states that the finding routes to the `writer`'s spec pass for a criterion correction

#### Scenario: why that window is the legal one is stated

- **WHEN** the same duty is read
- **THEN** it states that the spec pass is where correcting a criterion is legal because it happens before any code exists, so nothing can be reshaped to match what was built

### Requirement: R6 — the run has a stated terminal disposition

Covers **AC15**, **AC16**, **AC17**.

#### Scenario: the disposition is stated and is to ship

- **WHEN** `lead/SKILL.md`'s step 6 is read
- **THEN** it states that after this outcome the `lead` proceeds to the docs pass and the PR, having escalated
- **AND** it states that this is the one gate outcome the run proceeds past

#### Scenario: every other outcome still blocks

- **WHEN** the same step is read
- **THEN** it states that a criterion graded unmet or partially met still blocks, unchanged
- **AND** it states that the run proceeds only when every criterion other than the mis-worded one is met

#### Scenario: the correction happens in a later run

- **WHEN** the same step, or the `auditor.md` outcome it acts on, is read
- **THEN** it states that a criterion this outcome names at the acceptance gate is corrected in a later run's spec pass, not in the run that graded it

#### Scenario: why a mid-run respec cannot carry it

- **WHEN** `lead/SKILL.md`'s statement of this outcome is read
- **THEN** it states that the existing mid-run respec route — back to the `writer` for a revised spec — cannot carry a criterion correction
- **AND** it gives the reason: the spec pass's correction authority rests on no code existing yet, and a respec after a build falls inside the window the declaration bars

### Requirement: R7 — the lead routes this outcome away from the coder

Covers **AC18**, **AC19**, **AC20**.

#### Scenario: step 6 no longer routes every finding to the coder

- **WHEN** `lead/SKILL.md`'s step 6 routing sentence ("Route findings to the same `coder` **as concrete unmet criteria**" at `:107`, `31988b7`) is read
- **THEN** it excludes a mis-worded outcome from what routes to the `coder`
- **AND** it states that this outcome is escalated to the human because neither the `coder` nor a mid-run respec can close it

#### Scenario: the routing map carries a row for it

- **WHEN** `lead/SKILL.md`'s § *When a gate finds a problem* map is read
- **THEN** it carries a row for a criterion the acceptance gate grades mis-worded, carved out of step 6's route-to-the-`coder` default
- **AND** that row's destination is the human, with the correction owned by a later run's spec pass

#### Scenario: step 6's enumeration accounts for the fourth outcome

- **WHEN** step 6's sentence "each unmet or partially met one is a finding" (`:103`, `31988b7`) is read
- **THEN** the enumeration accounts for a finding that is neither unmet nor partially met
- **AND** no sentence in that step implies findings are exhausted by unmet and partially met

### Requirement: R8 — the escalation is recorded where a human will find it

Covers **AC21**, **AC22**, **AC23**.

#### Scenario: the PR description carries it

- **WHEN** `lead/SKILL.md`'s § *Ship and hand off* PR-description item is read
- **THEN** it names the escalation among what the description carries

#### Scenario: the final handoff carries it

- **WHEN** `lead/SKILL.md`'s § *Final handoff* list is read
- **THEN** it carries an item for the escalation — which `ACn`, the sub-case, and that the correction belongs to a later run's spec pass

#### Scenario: the card carries it through the declaration's comment binding

- **WHEN** `lead/SKILL.md`'s § *Ship and hand off* card-comment item is read
- **THEN** it states that the escalation is recorded on the card through the declaration's `comment` binding, so a later run's spec pass reads it from the durable source rather than from a PR body
- **AND** the existing fallback covers a board whose declaration authorises no comment: the escalation lives in the report and the `lead` says so

### Requirement: R9 — the Boundary rule agrees with the disposition

Covers **AC24**.

#### Scenario: mis-worded is distinguished from unmet in the Boundary

- **WHEN** `lead/SKILL.md`'s Boundary line "Do not build from a spec the `auditor` has not passed, or ship with an acceptance criterion unmet" (`:162`, `31988b7`) is read
- **THEN** it states that a criterion graded mis-worded is not unmet, because the work is right and the wording is not
- **AND** it states that this is the one outcome the run ships past, escalated per step 6
- **AND** the prohibition on shipping with a criterion unmet is otherwise unchanged

### Requirement: R10 — the declaration states the window consequence

Covers **AC27**, **AC28**, **AC29**.

#### Scenario: the window rule says what a gate does

- **WHEN** `docs/ISSUE_TRACKING.md` § *What the pipeline may write*'s "Never edit an acceptance criterion to match what was built" bullet (`:106-112`, `31988b7`) is read
- **THEN** it states what a gate does when it finds a criterion's own wording defective inside the window between the build and the gate that judges it: it reports the defect in the verdict it returns and the run escalates it to the human, unresolved
- **AND** it states that the correction happens in a later run's spec pass

#### Scenario: the prohibition is unweakened

- **WHEN** the same bullet is read
- **THEN** the clause "never in the window between the build and the gate that judges it" is present and unqualified
- **AND** nothing in the addition creates an exception to it

#### Scenario: the declaration names no verdict label

- **WHEN** the same bullet is read
- **THEN** it names none of the gate's verdict labels — met, partially met, unmet, mis-worded
- **AND** it describes the situation and its consequence rather than restating the gate's grading rules

### Requirement: R11 — every verdict names its establishing observation

Covers **AC30**, **AC31**, **AC32**.

#### Scenario: the obligation covers met as well

- **WHEN** `auditor.md`'s per-`ACn` grading instruction is read
- **THEN** it requires every verdict the acceptance gate returns, met included, to name the observation that establishes it
- **AND** the observation names what was read — the file and the region — and what it said

#### Scenario: a vacuous met says so

- **WHEN** the same instruction is read
- **THEN** it states that a criterion satisfied only because its antecedent never arose is graded met with an observation stating that the antecedent was false and nothing was exercised

#### Scenario: no fifth label

- **WHEN** the verdict vocabulary is read
- **THEN** it names exactly four outcomes
- **AND** no separate label exists for a vacuously satisfied criterion

### Requirement: R12 — the durable docs describe what shipped

Covers **AC35**, **AC36**, **AC37**, **AC38**, **AC39**, **AC40**, **AC41**.

**Owning mechanism: the `writer`'s docs pass, at the `lead`'s workflow step 7. Not the `coder`'s.** The acceptance gate runs at step 6 and will report these seven pending that pass; see *The seven criteria no build step closes*.

#### Scenario: the per-label paragraph describes the fourth outcome and the evidence obligation

- **WHEN** `docs/ARCHITECTURE.md`'s *Both gates work per label…* paragraph (`:220-232`, `31988b7`) is read
- **THEN** it describes the fourth outcome
- **AND** it describes the evidence obligation on a met verdict

#### Scenario: the verify-by-opening paragraph points at the shipped outcome

- **WHEN** `docs/ARCHITECTURE.md`'s *An entry is verified by opening the region it names…* paragraph (`:730-738`, `31988b7`) is read
- **THEN** its closing sentence points at the shipped outcome as how a mis-worded criterion surfaces
- **AND** it no longer leaves that discovery to this duty's incidental coverage

#### Scenario: the README's auditor section describes both

- **WHEN** the root `README.md`'s `auditor` section (`:503-524`, `31988b7`) is read
- **THEN** it describes the fourth outcome
- **AND** it describes the evidence obligation on a met verdict

#### Scenario: the README's lead-flow step agrees with the shipped routing and disposition

- **WHEN** the root `README.md`'s lead-flow acceptance-gate step (`:342-354`, `31988b7`) is read
- **THEN** it agrees with the shipped routing — this outcome is not routed to the `coder`
- **AND** its "Docs do not start while a criterion is unmet" sentence agrees with the stated terminal disposition

## Validation

Run from the story worktree at its absolute path. No test runner and no install step, so each item is an inspection or a command; a refused compound command is a command to split, not a failed check (`SMR-186`).

**No item states a count, a file list, or a line number.** Each states the **command** and the **property its output must have**, and nothing else — an enumeration of anything this same pass edits invalidates itself however faithfully it was captured.

**Two kinds of item, and each says which it is.** *Baseline-unchanged* items hold at `31988b7` and must still hold after the build; a difference is a regression this task caused. *Target-state* items state a post-build expectation and are deliberately **false** before the build.

- **V1** — *Baseline-unchanged.* The root `CLAUDE.md`'s `**Addressing the story worktree.**` five-file drift check prints the value that file states beside it.
- **V2** — *Baseline-unchanged.* The root `CLAUDE.md`'s `**Board access is granted by your caller.**` drift check prints the value that file states beside it.
- **V3** — *Baseline-unchanged.* The root `CLAUDE.md`'s two cross-plugin dispatch-name `grep`s → no output.
- **V4** — *Baseline-unchanged.* The root `CLAUDE.md`'s manifest-parity loop prints `ok` for every plugin under `plugins/*`, with no `DRIFT` line.
- **V5** — *Baseline-unchanged.* `git -C <worktree> diff 31988b7..HEAD -- 'plugins/*/plugin.json' 'plugins/*/.claude-plugin/plugin.json'` shows no `version` line.
- **V6** — **Target-state.** `grep -rn --exclude-dir=specs 'partially met' --include='*.md' .` → every hit that enumerates the acceptance gate's outcomes names all four, and none enumerates only three.
- **V7** — **Target-state.** `grep -rn --exclude-dir=specs 'mis-worded' --include='*.md' .` → every hit is in a file this spec's *Boundary* lists as in bounds, and **no hit is in `docs/ISSUE_TRACKING.md`** (`AC29`).
- **V8** — *Baseline-unchanged.* `git -C <worktree> diff 31988b7..HEAD -- docs/ISSUE_TRACKING.md` → the diff adds to the "Never edit an acceptance criterion" bullet and removes nothing from it; the clause "never in the window between the build and the gate that judges it" is present in the post-build file.
- **V9** — **Target-state.** `grep -rn --exclude-dir=specs 'as concrete unmet criteria' --include='*.md' .` → every hit sits in text that also excludes the mis-worded outcome from what routes to the `coder`.
- **V10** — *Baseline-unchanged.* `docs/AGENTS_IMPROVEMENTS.md` — no existing entry is changed or removed by the build. (This spec pass adds one; see *Deviations from the card*.)

## Tasks

- [x] `auditor.md`: add the fourth outcome to the grading instruction — the label, its definition, the three sub-cases with the *any run* versus *this run* distinction, and the side-by-side quoting requirement.
- [x] `auditor.md`: add the four bars — failing work, wrong design, cannot-verify, and the severity statement — with "reported unverified" named as the existing mechanism-verification mode rather than a fifth grade.
- [x] `auditor.md`: add the at-this-gate properties — does not pass, not met, no correction here, escalation carried in the returned verdict — each pointing at the existing constraint it rests on rather than restating it.
- [x] `auditor.md`: add the evidence obligation on every verdict, the vacuous-met rule, and the four-labels-only statement.
- [x] `auditor.md`: extend the no-card branch with the clause limiting this outcome to card-backed runs.
- [x] `auditor.md`: extend the spec-gate duty with the readiness-gate half — the finding, its route to the `writer`'s spec pass, and why that window is the legal one.
- [x] `auditor.md`: leave `:14`, `:16`, `:18`, `:39`, `:49` and `:54` untouched; verify each after editing.
- [x] `lead/SKILL.md`: reword step 6's finding enumeration and its routing sentence — the carve-out, the escalation, the terminal disposition, that every other outcome still blocks, and why a mid-run respec cannot carry the correction.
- [x] `lead/SKILL.md`: add the routing-map row in § *When a gate finds a problem*, leaving the 3× rule untouched.
- [x] `lead/SKILL.md`: add the escalation to § *Ship and hand off* (PR description, and the card comment through the declaration's `comment` binding) and to § *Final handoff*.
- [x] `lead/SKILL.md`: reconcile the Boundary shipping rule with the disposition, without weakening the bar on shipping with a criterion unmet.
- [x] `docs/ISSUE_TRACKING.md`: add the window consequence to the "Never edit an acceptance criterion" bullet — no verdict labels, prohibition untouched.
- [x] Run V1–V10, reporting baseline-unchanged items against their `31988b7` result and target-state items against their post-build expectation.
- [ ] *(Not the `coder`'s: done in this spec pass.)* The four card `## References` corrections and the `SMR-133` shared-region note — see *Deviations from the card*. No acceptance criterion was edited.
- [ ] *(Not the `coder`'s: done in this spec pass.)* The `docs/AGENTS_IMPROVEMENTS.md` entry on the spec pass's board-access wording.
- [ ] *(Not the `coder`'s: the docs pass, at step 7.)* `docs/ARCHITECTURE.md` — the *Both gates work per label…* paragraph and the *An entry is verified by opening the region it names…* paragraph (**AC35**, **AC36**, **AC37**).
- [ ] *(Not the `coder`'s: the docs pass, at step 7.)* Root `README.md` — the `auditor` section and the lead-flow acceptance-gate step (**AC38**–**AC41**).
- [ ] *(Not the `coder`'s: the docs pass, at step 7.)* Fold this spec's durable content into `docs/ARCHITECTURE.md` and remove the spec.

## Already satisfied criteria

Four of the forty-one transcribed criteria need nothing built: each is a no-regression check over a sentence that already exists, and this task's only obligation is not to break it. **All four sit in a file this task edits**, which is exactly the *satisfied and at risk* case — `qa` re-validates each against the post-build tree rather than treating it as inert.

**Entries use `→`, not the `—` the transcription uses**, so the transcription's `- **ACn** — ` lines stay the only lines of that shape in this spec: the equality check is a mechanical comparison, and a second `ACn` list sharing that prefix would put these entries in reach of a comparator that greps for it.

**Entries name their region the way a reader finds it** — a heading or a phrase quoted from the text — never a post-build line number.

- **AC25** → `plugins/ca77y-engineering/skills/lead/SKILL.md`, step 6's closing "Capped at 3 rounds, then escalate what remains", unchanged since `31988b7`. · **`qa` re-validates**: that sentence is present in the post-build step 6 and still names three rounds. · **Edit site: yes** — step 6 is rewritten around it, which is what puts it at risk.
- **AC26** → `lead/SKILL.md` § *When a gate finds a problem*'s "**The 3× rule is the one hard stop.**" paragraph and the matching Boundaries bullet ("The **3× rule** is the one hard stop"). · **`qa` re-validates**: both are present post-build and neither's round count or escalation destination has changed. · **Edit site: yes** — the routing map above the paragraph gains a row, and the Boundaries list is edited two bullets away.
- **AC33** → `plugins/ca77y-engineering/agents/auditor.md` § *Constraints*, the bullet beginning "**Never edit the card you are gating, whatever the declaration's write authority permits.**" · **`qa` re-validates**: the bullet is present and unweakened post-build, and nothing in the fourth outcome's text creates an exception to it. · **Edit site: yes** — the file is heavily edited, and the new outcome is precisely the temptation this bullet forbids, so it is the likeliest entry here to be quietly relaxed.
- **AC34** → `auditor.md`'s per-gate grant paragraph, "**In the `lead`'s two gates, your access differs by gate.**", which grants the acceptance gate "**read** only, and no search"; corroborated by `lead/SKILL.md` step 6's "granting it **read** access to the board" and `docs/ARCHITECTURE.md`'s access table row for the acceptance gate. · **`qa` re-validates**: all three still say read and no search post-build. · **Edit site: yes** — `auditor.md` and `lead/SKILL.md` are both edited, in other regions; `docs/ARCHITECTURE.md` is edited by the docs pass, in another paragraph.
