# Distinguish a worktree that needs no dependencies from one whose provisioning failed

- **Status**: Draft
- **Task**: smr-147-distinguish-a-worktree-that-needs-no-dependencies-from-one
- **Last Updated**: 2026-08-09
- **Document Scope**: One unit of work: replacing the pipeline's two-state dependency-provisioning status with a three-value vocabulary, and branching every rule that reads it

---

## Goal

The `lead` provisions a story worktree when it creates it, records a **dependency-provisioning status**, and names that status in every dispatch. Today that status has two effective values — provisioned, or *not provisioned, with the reason* — and the second one collapses two situations that mean opposite things:

- the project has **no install or bootstrap step at all**, so nothing was needed and nothing is missing; and
- the project **needs dependencies and the install did not complete**, so anything depending on them is untrustworthy.

Every rule that reads the status keys off the phrase *"absent or negative"*, so a receiving agent handed the benign case cannot distinguish it from the real gap. This does not currently produce a wrong result — the distrust rule is already scoped to *"the output of any command that depends on the project's installed dependencies"*, and a project with no dependencies has no such command — but a reader has to reconstruct that reasoning instead of being told it. The hazard is an over-literal reader that hesitates, or reports a provisioning problem, on a project that never had dependencies to provision. **This repo is itself such a project**, so the benign case is the first one an agent meets here.

**The change**: replace the two-state reading with a three-value vocabulary — `provisioned`, `no dependencies required`, `provisioning failed` — where the middle value is affirmative rather than a negation; branch the receiver rule so a `no dependencies required` worktree is trusted and generates no report, while `provisioning failed` (and an absent status) keeps today's distrust-report-do-not-self-remedy behaviour; and update every site that emits or consumes the status so the repo carries one live vocabulary rather than two.

**User value**: an agent working a no-dependency project runs the project's commands and reports on the work, instead of hedging every result behind a provisioning caveat that describes nothing.

**Non-goals**:

- Changing *what* the `lead` does when provisioning — the inherit-over-reinstall preference, and the rule that provisioning is not verification, are untouched.
- Changing when a receiving agent distrusts output on a genuinely unprovisioned worktree. That behaviour is preserved exactly; only its trigger is narrowed.
- Introducing a machine-readable status format, an enum, or a schema. The status is prose named in a dispatch prompt, and stays so.
- Removing the paragraph's existing `npx`-style fetch-and-run example (see *Deviations from the card*).
- Making any agent detect that its own definition changed mid-run — that is `SMR-187`, and it is not this story (see *Coordination*).

## Acceptance criteria (verbatim transcription)

> **Source**: card `SMR-147`, read from Linear via the `read` binding in `docs/ISSUE_TRACKING.md` on **2026-08-09**, at status `In Progress`, **after** this spec pass's criterion correction was applied to the card (see *Deviations from the card*). This is a **copy, not a summary** — one card bullet per `ACn` line, in card order, `n = 5`.
>
> **Why a copy is licensed here, and what proves it.** A paraphrase of a card's criteria drifts toward what the work already does; that is why this pipeline names cards rather than restating them into prompts. A verbatim copy carries the same failure mode unless something checks it, so the licence is not the promise below — it is the `auditor`'s **mechanical equality check**, run inside the spec-readiness gate that gates this pass and again inside the acceptance gate before every dispatch of it. Assert nothing about faithfulness; the check is what settles it.
>
> **One normalization, declared so the equality check can allow for it.** Linear stores an inline issue reference as an `<issue id="…" href="…">SMR-160</issue>` element, so the raw card text of `AC5` carries that markup where the prose reads `SMR-160`. It is the same class of rendering artifact as the `-`→`*` bullet rewrite the declaration already records as cosmetic. `AC5` below renders it as the bare identifier `SMR-160`; nothing else in any line is altered, and no clause is dropped.

- **AC1** — "No dependencies required" is a distinct status from a provisioning failure, and is not phrased as a negative or a deficiency.
- **AC2** — The receiver rule reacts to the two differently: a no-dependency worktree is trustworthy and needs no report, a failed provisioning is reported and not self-remedied.
- **AC3** — The `lead`'s worktree-creation step states which of the two it emits when the project has no install step it can detect.
- **AC4** — The paragraph stays one physical line and byte-identical across all five files, so the drift check still prints `1`.
- **AC5** — Stays project-agnostic: the new status vocabulary, and every sentence this story adds or rewords in the plugin text, names no ecosystem, package manager, installer, or lockfile. *(Corrected 2026-08-08, spec pass. As literally written — "no ecosystem or package manager is named" — this criterion is unsatisfiable: the paragraph already carries a deliberate* `npx`*-style fetch-and-run example that* SMR-160 *shipped as one of its own acceptance criteria, and this story does not touch it, so an acceptance gate reading the criterion literally would mark it unmet for a pre-existing, intended mention. Narrowed to the wording this story authors; the* `npx` *example stays. Likewise untouched: the root* `CLAUDE.md`*'s own parenthetical describing this repo's toolchain, which is a repo-specific maintenance file rather than plugin text.)*

**No criterion is already satisfied**, so this spec carries no *Already satisfied criteria* section. Each was checked against the tree at `76f9cad` before the section was dropped: `AC1`, `AC2`, `AC3` and `AC5` describe wording that does not exist yet; `AC4` is *currently* true — the drift check prints `1` at `76f9cad` — but the build rewrites the paragraph in all five carriers, so post-build it holds only if the build re-establishes it. A criterion the build must re-establish is work, and belongs in *Requirements* (`R5`), not in a section for criteria needing nothing built.

## Design

### The vocabulary

Three values, plus the pre-existing fourth case of a dispatch that names none:

| Status | Meaning | Receiver behaviour |
| --- | --- | --- |
| `provisioned` | The project's dependencies are in place in the worktree. | Trust dependency-sensitive output. |
| `no dependencies required` | The project has no install or bootstrap step to run. Nothing was needed; nothing is missing. | Trust dependency-sensitive output. **Report nothing about provisioning** — there is no gap to report. |
| `provisioning failed` | The project has such a step and it did not complete. The reason is named. | Distrust dependency-sensitive output, report it, do not self-remedy. |
| *(absent)* | No status named in the dispatch. | As `provisioning failed` — an unknown state is not a safe one. |

Three naming properties carry the criteria and must survive any rewording:

1. **`no dependencies required` is affirmative** — it states a property of the project ("requires none"), never an absence of an action ("not provisioned", "no install run", "unprovisioned"). This is `AC1`, and it is why a simple relabel such as *"not provisioned: no install step"* does not satisfy the card: the grammar is still a negation of provisioning.
2. **The three names are project-agnostic** — no ecosystem, package manager, installer, lockfile, or runtime appears in any of them, nor in the sentences introducing them (`AC5`).
3. **`provisioning failed` and *absent* group together; `no dependencies required` does not group with them.** The old phrase *"absent or negative"* is retired wherever it gates trust, because under the new vocabulary "negative" would silently re-absorb the benign case.

### Where the vocabulary is defined, and where it is read

Sites enumerated from a sweep of the worktree at `76f9cad` for `provision`, `absent or negative`, `not provisioned`, `unprovisioned`, and `install step`. Regions are named by their heading or a quoted anchor phrase, never by line number, so a reader finds them the way the file presents them.

**Emitter** (one site):

- **E-emit** — `plugins/ca77y-engineering/skills/lead/SKILL.md`, workflow step 2 *Create the workspace*, the bullet **"Record the provisioning status"**. This is where `AC3` lands.

**The canonical paragraph** — five carriers, byte-identical, one physical line each; the receiver rule lives here (`AC2`), and so does the vocabulary as a receiving agent meets it (`AC1`):

- **E-p1** — `plugins/ca77y-engineering/agents/coder.md`
- **E-p2** — `plugins/ca77y-engineering/agents/writer.md`
- **E-p3** — `plugins/ca77y-engineering/agents/qa.md`
- **E-p4** — `plugins/ca77y-engineering/agents/auditor.md`
- **E-p5** — `plugins/ca77y-engineering/skills/lead/SKILL.md`

**Other consumers that branch on the status today** (each would otherwise keep the two-state reading):

- **E-fmt** — `SKILL.md`, step 3, the format step's third outcome **"Defined but not trustworthy here"**, which reads *"the worktree's dependency-provisioning status is absent or negative and the command depends on it"*. Left alone, the `lead` would mistrust its own format command on a project that simply has nothing to install.
- **E-floor** — `SKILL.md`, step 3, **"The floor"**, in the sentence *"Settle trustworthiness before attribution — an **unprovisioned** lint run whose error output happens to name a file it was pointed at…"*. The floor's *conditions* delegate to the format step and so need no separate branch; the word `unprovisioned` is the defect, because it reads as covering a no-dependency project.
- **E-aud** — `plugins/ca77y-engineering/agents/auditor.md`, the rule **"A criterion or its fix that rests on a claim about a dependency's behaviour is verified at the mechanism, not the symptom"**, whose unreadable-source trigger reads *"the package is absent, or the worktree's dependency-provisioning status is absent or negative"*.
- **E-md** — the root `CLAUDE.md`, **"## Worktrees"**, the sentence *"a `lead` running the pipeline on this repo records the status as **not provisioned: no install step** and proceeds"*. This is the repo's own instance of the emitted status, and it is a **maintenance** file, not documentation — no shipped rule directs the docs pass to sweep maintenance files (that is `SMR-174`, still `Backlog`), so it is the build's, not the docs pass's.

**Documentation sites, owned by the docs pass** — see *Owners outside the build*:

- **D1** — `README.md`, the `lead` workflow's step 2: *"records the **provisioning status**, including *not provisioned, with the reason*"*.
- **D2** — `README.md`, the `auditor` section: *"the worktree's provisioning status absent or negative"*.
- **D3** — `README.md`, the **Isolation** paragraph: *"Handed an absent or negative status, an agent reports the gap…"*.
- **D4** — `docs/ARCHITECTURE.md`, **"## The story worktree contract"**: both the recording sentence (*"the status is recorded as **not provisioned, with the reason**"*) and the handover paragraph (*"An agent handed an absent or negative status…"*).
- **D5** — `docs/ARCHITECTURE.md`, the lint floor's third outcome: *"the worktree's dependency provisioning is absent or negative"* and *"an **unprovisioned** lint run"*.

### The paragraph, in full

The paragraph must be byte-identical across five files and occupy exactly one physical line, so this spec states the target text **normatively** rather than describing it. Reproducing prose from a description five times is exactly how the copies drift. The text below is what each of `E-p1`…`E-p5` carries after the build, as a single line:

```text
**Addressing the story worktree.** Every task runs in one story worktree at an absolute path — the `lead` creates it, provisions its dependencies, and names that path together with the resulting dependency-provisioning status to every agent it dispatches. Do not assume it is your working directory: an agent thread's working directory can stay at the repository root and resets between bash calls, so cwd is never a reliable way to reach the worktree. Treat the named path as the review/build root instead — prefix every git command with `-C <path>`, and give every file tool an absolute path under `<path>`. When you dispatch a subagent, pass the worktree path, its dependency-provisioning status, and this instruction into its prompt. That status is one of three, and two of them mean opposite things: **provisioned**, the project's dependencies are in place; **no dependencies required**, the project has no install or bootstrap step to run, so nothing was needed and nothing is missing; or **provisioning failed**, with the reason. *No dependencies required* is an affirmative status, not a gap and not a weaker form of *provisioned*: a worktree carrying it is trustworthy, so run the project's commands and draw conclusions from their output as you would anywhere, and report nothing about provisioning, because nothing is missing to report. If instead you were handed a worktree whose status is *provisioning failed*, or that names no status at all, treat the output of any command that depends on the project's installed dependencies as untrustworthy, report that rather than drawing a conclusion from it, and do not provision it yourself — a fresh re-resolving install can change the dependency layout and break tests the task never touched; provisioning is the `lead`'s workspace-creation step. The repository root checkout may be read — for dependency and vendor sources such as resolved dependency trees, installed type definitions, or vendored packages, when something is missing or ambiguous in the worktree — but must never be written, with no exception; reading it that way never substitutes the root for the worktree as the review or build target. Never invoke a project CLI through a bare fetch-and-run — an `npx`-style invocation, or the equivalent in any other ecosystem — from inside a worktree: the fetched CLI is not the project's toolchain, and it fails with errors that read exactly like a real defect in the file under review; run project CLIs through the worktree's own provisioned dependencies instead, and when a project that requires dependencies is missing them, report the missing provisioning rather than concluding anything from the failure. An agent that skips this silently operates on the repository root on its base branch, reviewing or building the wrong tree, with nothing to distinguish that from a clean pass.
```

Three edits distinguish it from the text at `76f9cad`, and no others:

1. Two new sentences after *"…and this instruction into its prompt."* introducing the three values and the trust-and-say-nothing rule for `no dependencies required`.
2. *"If you were handed a worktree whose dependency-provisioning status is absent or negative"* becomes *"If instead you were handed a worktree whose status is *provisioning failed*, or that names no status at all"*. Everything after that comma is unchanged.
3. The closing fetch-and-run sentence's fallback, *"and when those are absent, report the missing provisioning"*, becomes *"and when a project that requires dependencies is missing them, report the missing provisioning"*. **This is the same defect as (2), in a clause the card's examples do not name**: as written it fires on a project that has no dependencies to be absent. The property `AC2` states — *the two states are reacted to differently* — is checked against every clause in the paragraph that conditions behaviour on dependencies being absent, not only against the sentence that made the defect visible.

The `npx`-style example in the fetch-and-run sentence is **retained deliberately**; see *Deviations from the card*.

If the `coder` finds the text above needs adjustment, the adjustment is applied to all five carriers in the same edit — never to one file and then propagated.

### Boundary

**In bounds for the `coder`**: `E-emit`, `E-p1`…`E-p5`, `E-fmt`, `E-floor`, `E-aud`, `E-md`, and this spec file.

**In bounds for the docs pass**: `D1`…`D5`.

**Out of bounds**:

- Any `plugins/*/plugin.json` or `plugins/*/.claude-plugin/plugin.json` — the repo makes a version bump a deliberate human decision, and no agent may make one as part of finishing a task.
- `docs/ISSUE_TRACKING.md` — the tracking declaration says nothing about provisioning and must not learn to.
- `docs/PRODUCT.md`, `docs/issues/`, `docs/_templates/`, and the `ca77y-library` agents — none reads or writes this status.
- The three fenced verification snippets in the root `CLAUDE.md`, and the prose describing them. `E-md` is one sentence in the same **section**, several paragraphs above the first fence; the snippets themselves are `SMR-186`'s.
- The `lead`'s provisioning *mechanics* — the inherit-over-reinstall preference and the provisioning-is-not-verification rule in the same step 2 bullet list. Only the status-recording bullet changes.

**`docs/AGENTS_IMPROVEMENTS.md` is a special case, stated here so no *Validation* item has to guess.** Its existing entries are out of bounds — this story converts none of them. But every agent in the pipeline, this one included, is under a standing duty to *append* a process-feedback entry on fresh friction, and such an entry may legitimately quote a phrase this story is retiring. A hit there is expected and fails nothing; the *Validation* items below quantify over the in-bounds sets above and exclude that file explicitly.

**Every scenario below is runnable inside this Boundary.** The project ships no test runner and no automated suite — the artifact is prose in agent definitions — so each scenario is discharged by reading a named in-bounds file, or by a command over the enumerated in-bounds paths. Nothing here needs a package, a fixture, or a file outside the sets above.

### Owners outside the build

Two criteria-adjacent obligations are not the `coder`'s, and are named here rather than left to be rediscovered:

- **`D1`…`D5` belong to the docs pass.** `docs/CLAUDE.md` makes `README.md` the user-facing description of every agent and `ARCHITECTURE.md` the structural model, and the docs pass is the step that reconciles both after a build. None of `AC1`…`AC5` is graded against those files, so the acceptance gate — which runs before the docs pass — is not blocked by them. `Tasks` carries them as non-`coder` entries.
- **`E-md` is *not* the docs pass's**, despite being a Markdown file the build does not otherwise touch. The root `CLAUDE.md` is a maintenance file, and the rule that would make the docs pass sweep maintenance files is `SMR-174`, still `Backlog`. Left unassigned it would fall through both passes, so it is explicitly the `coder`'s.

### Validation

Run against the post-build tree. Each item states what a zero-hit result means, so an empty result is never reported as green by default.

- **V1 — the five carriers each still carry the paragraph.** For each of the five paths enumerated as `E-p1`…`E-p5`, one plain command per path: `grep -c '^\*\*Addressing the story worktree\.\*\*' <path>` → each prints exactly `1`. Zero from any path is a **fail** (a carrier lost the paragraph); more than one is a fail (a duplicate crept in).
- **V2 — the five copies are identical.** The root `CLAUDE.md`'s drift check, run as documented, prints `1`. **`V1` and `V2` are both required and neither substitutes for the other**: `sort -u | wc -l` prints `1` when *one* file carries the paragraph just as it does when five carry it identically, so `V2` alone would pass on a build that dropped four carriers. `V1` establishes the membership `V2` compares. *(`AC4`.)*
- **V3 — one physical line.** For each of the five paths, the line matched in `V1` ends with `…with nothing to distinguish that from a clean pass.` — i.e. the paragraph did not acquire an internal newline. A match that ends anywhere else is a fail. *(`AC4`.)*
- **V4 — the new vocabulary landed.** `grep -rn 'no dependencies required' --include='*.md' .`, excluding `docs/specs/` and `docs/AGENTS_IMPROVEMENTS.md` → hits appear in every one of `E-emit`, `E-p1`…`E-p5`, `E-md`, and no hit sits outside the in-bounds sets. **A zero-hit result is a fail, not a pass** — it means the build did not land. This item is anchored on text the build *produces*, which is why a zero result is unambiguous here.
- **V5 — the old trust trigger is gone from the build's scope.** `grep -rn 'absent or negative' --include='*.md' .`, excluding `docs/specs/` and `docs/AGENTS_IMPROVEMENTS.md` → at `qa` time, no hit in `E-p1`…`E-p5`, `E-fmt`, or `E-aud`. Hits in `D1`…`D5` are **expected** at `qa` time and are not a failure: those are the docs pass's, which runs later. After the docs pass, the same command returns no hit in any file outside the two exclusions.
- **V6 — the negation-shaped labels are gone.** Same scoping and same two-stage reading as `V5`, for `grep -rn 'not provisioned' …` and `grep -rn 'unprovisioned' …`.
- **V7 — the retained example survives.** For each of `E-p1`…`E-p5`: `grep -c 'npx' <path>` → `1`. A zero is a fail; it means the build deleted the deliberate example `AC5`'s correction preserves. *(`AC5`.)*
- **V8 — no version moved.** Every `plugins/*/plugin.json` and `plugins/*/.claude-plugin/plugin.json` carries the same `version` as at `76f9cad`. Not an acceptance criterion; a guard, because the repo treats a bump as a human decision.

**Assumption, not an established fact — the drift check under session isolation.** `SMR-186` (`Backlog`) records that the harness refuses the root `CLAUDE.md`'s `grep … | sort -u | wc -l` snippet from a worktree-isolated session, because of the brace expansion and the pipeline. This spec pass could not settle that: this session is not isolated, and the snippet ran normally here. `V1` is therefore written as five plain per-path commands, which need no brace expansion or pipeline and should survive either way. If `V2`'s documented form is refused, that is **a refusal, not a failed check** — report it as such, discharge the identity property by extracting the five lines and comparing them pairwise, and note `SMR-186` as the open card. What would settle the assumption: running the documented snippet once from an isolated session.

### Coordination

Four open siblings share files or claims with this story. Board read 2026-08-09.

- **`SMR-187`** (`Backlog`) — *Make a shipped agent-definition change govern the run that ships it*. It carries the criterion *"The canonical `**Addressing the story worktree.**` paragraph is unchanged"*, meaning unchanged by **its own** diff. That stays true; but the baseline it is measured against becomes this story's rewritten paragraph if this lands first. Recorded on `SMR-187` during this spec pass. It also touches `SKILL.md`, in different sections than `E-emit` / `E-fmt` / `E-floor`; whichever lands second reads the other's shipped wording rather than reapplying a stale copy.
- **`SMR-186`** (`Backlog`) — its *Out of scope* claims the root `CLAUDE.md`'s Worktrees prose has no concurrent claimant. `E-md` makes that false. Recorded on `SMR-186` during this spec pass. Its own scope is unchanged: `E-md` is prose, not one of the three snippets.
- **`SMR-183`** (`Backlog`) — *Enumerate a semantic mirror's other sides in the spec's Boundary*. It edits `writer.md` and `auditor.md` in their spec-authoring and readiness-checklist sections, not the canonical paragraph or `E-aud`. **Its rule is not yet shipped**, so nothing obliged this spec to enumerate the mirror sides — the `D1`…`D5` enumeration above is voluntary and should not be read as evidence the rule exists.
- **`SMR-174`** (`Backlog`) — would give the docs pass a maintenance-file sweep. It is the reason `E-md` is assigned to the `coder` here rather than left to the docs pass; if `SMR-174` ships first, `E-md` is covered either way and the duplicate assignment is harmless.

**No provisioning-infrastructure collision was found.** The sibling sweep, run through the declaration's `search` binding, found `SMR-160` (`Done`) as the only other card scoping provisioning itself; it is the story that introduced this status, and it is shipped. No open card scopes adding a provisioning step, a status format, or a dependency-inheritance mechanism, so there is nothing for a *"detect and reuse rather than re-add"* note to point at.

**`SMR-160`'s criterion is refined, not contradicted.** It reads *"The worktree path the `lead` hands to each agent states **whether dependencies are installed**"* — a binary framing this story replaces with three values. The criterion stays satisfied (the status still says whether they are installed, and now says more); `SMR-160` is `Done`, and no edit was made to it.

### Deviations from the card

**`AC5`, corrected on the card during this spec pass.** Its original sentence read, in full:

> Stays project-agnostic: no ecosystem or package manager is named.

Read literally against the artifact it governs, that cannot hold. The canonical paragraph already names one: *"an `npx`-style invocation, or the equivalent in any other ecosystem"*. That mention is deliberate — `SMR-160` shipped it as one of its own acceptance criteria (*"Agents are told not to invoke a project CLI through a bare `npx`-style fetch"*) — and this story neither touches it nor has a reason to. So the criterion as written would be graded **unmet** at the acceptance gate for a pre-existing, intended mention, no matter what this story builds.

The correction narrows the criterion to the wording **this story authors**, which is what it was evidently reaching for, and states the two carve-outs explicitly: the `npx` example stays, and so does the root `CLAUDE.md`'s own parenthetical describing this repo's toolchain, which is repo-specific maintenance prose rather than plugin text. The goal — that the toolkit's status vocabulary works on any project — is untouched.

Two things this deliberately did **not** do: it did not quietly narrow the criterion inside a scenario's wording, because the acceptance gate reads the card and would never see the dropped clause; and it did not rewrite what the criterion is *for*. The correction was taken **before** the transcription above, so `AC5` there is the corrected text, not the superseded one.

**No other criterion needed correcting.** `AC1`, `AC2`, `AC3` and `AC4` were each checked against the design above and are satisfiable as written.

## Requirements

### Requirement: A three-value status vocabulary, whose no-dependency value is affirmative

#### Scenario: The three values are named where a receiving agent meets them

- **WHEN** a reader opens the canonical paragraph in any of `E-p1`…`E-p5`
- **THEN** it names exactly three statuses — `provisioned`, `no dependencies required`, `provisioning failed` — and says of `no dependencies required` that the project has no install or bootstrap step to run, so nothing was needed and nothing is missing

#### Scenario: The no-dependency value is not phrased as a deficiency

- **WHEN** the sentences introducing the vocabulary are read for how they frame `no dependencies required`
- **THEN** it is stated as an affirmative property of the project and explicitly not a gap or a weaker form of `provisioned`, and it is not labelled with a negation of provisioning such as *not provisioned*, *unprovisioned*, or *no install run*

### Requirement: The receiver rule branches on which of the two negatives it was handed

#### Scenario: A no-dependency worktree is trusted and generates no report

- **WHEN** an agent is handed a worktree whose status is `no dependencies required`
- **THEN** the paragraph directs it to run the project's commands and draw conclusions from their output as it would anywhere, and to report nothing about provisioning

#### Scenario: A failed provisioning keeps today's behaviour

- **WHEN** an agent is handed a worktree whose status is `provisioning failed`, or a dispatch that names no status at all
- **THEN** the paragraph directs it to treat the output of any command depending on the project's installed dependencies as untrustworthy, to report that rather than concluding from it, and not to provision the worktree itself

#### Scenario: The fetch-and-run fallback does not fire on a project with nothing to install

- **WHEN** the paragraph's closing fetch-and-run sentence is read on a project that requires no dependencies
- **THEN** its fallback clause is conditioned on a project that *requires* dependencies missing them, not on dependencies merely being absent, so it does not direct a report on a worktree where nothing is missing

### Requirement: The workspace-creation step names which status it emits

#### Scenario: No detectable install step

- **WHEN** a reader consults `E-emit` for what the `lead` records when the project has no install or bootstrap step it can detect
- **THEN** the step says it records `no dependencies required`, names it as the affirmative outcome rather than a failure, and says the run proceeds

#### Scenario: An install step that did not complete

- **WHEN** a reader consults `E-emit` for what the `lead` records when the project has such a step and it does not complete
- **THEN** the step says it records `provisioning failed` with the reason, and says the run proceeds

#### Scenario: The status travels

- **WHEN** `E-emit` is read to the end of its bullet
- **THEN** it still states that every dispatch into the worktree from that point names the recorded status

### Requirement: Every rule that gates trust on the status branches the same way

#### Scenario: The lead's format step trusts a no-dependency worktree

- **WHEN** the *"Defined but not trustworthy here"* outcome at `E-fmt` is read
- **THEN** its trigger is a status of `provisioning failed` or an absent status, and it states that `no dependencies required` is not that case because nothing the command needs is missing

#### Scenario: The lint floor names the untrusted case precisely

- **WHEN** the trustworthiness-before-attribution sentence at `E-floor` is read
- **THEN** it refers to a lint run whose worktree status is `provisioning failed` or absent, rather than to an *"unprovisioned"* run, and the floor still inherits the format step's three outcomes rather than restating them

#### Scenario: The auditor's unreadable-source trigger excludes the benign case

- **WHEN** the unreadable-source clause at `E-aud` is read
- **THEN** it triggers on a `provisioning failed` or absent status, and not on `no dependencies required`

#### Scenario: The repo's own status is stated in the new vocabulary

- **WHEN** the root `CLAUDE.md`'s Worktrees section is read at `E-md` for what a `lead` records when running the pipeline on this repo
- **THEN** it says `no dependencies required`, and no longer says *not provisioned: no install step*

### Requirement: The paragraph remains one physical line, identical in five files

#### Scenario: Every carrier still carries it, exactly once

- **WHEN** `V1` is run over the five enumerated carrier paths
- **THEN** each path reports exactly one occurrence of the paragraph's opening

#### Scenario: The five copies are byte-identical

- **WHEN** `V2` is run
- **THEN** it reports a single distinct copy across the five files — and, because that result would also hold if only one carrier survived, it is read together with the per-path membership `V1` establishes

#### Scenario: No carrier's copy acquired a line break

- **WHEN** `V3` is run over the five carrier paths
- **THEN** the matched line in each ends with the paragraph's final sentence

### Requirement: The new wording names no ecosystem or toolchain

#### Scenario: The authored wording is agnostic

- **WHEN** the sentences this story adds or rewords in `E-emit`, `E-p1`…`E-p5`, `E-fmt`, `E-floor` and `E-aud` are read
- **THEN** none names an ecosystem, package manager, installer, lockfile, or runtime

#### Scenario: The deliberate pre-existing example is retained

- **WHEN** `V7` is run over the five carrier paths
- **THEN** each still carries the `npx`-style fetch-and-run example, unchanged, per `AC5`'s recorded correction

## Tasks

- [ ] Rewrite the canonical paragraph in `plugins/ca77y-engineering/agents/coder.md` to the normative text in *The paragraph, in full*, as a single physical line.
- [ ] Apply the identical line to `plugins/ca77y-engineering/agents/writer.md`.
- [ ] Apply the identical line to `plugins/ca77y-engineering/agents/qa.md`.
- [ ] Apply the identical line to `plugins/ca77y-engineering/agents/auditor.md`.
- [ ] Apply the identical line to `plugins/ca77y-engineering/skills/lead/SKILL.md`.
- [ ] Rewrite `E-emit` — the *"Record the provisioning status"* bullet in `SKILL.md` step 2 — to name all three values, to state `no dependencies required` as what it records when it detects no install or bootstrap step, and to state `provisioning failed`, with the reason, for the other case; keep "proceed regardless" and keep the sentence that every later dispatch names the status. Leave the neighbouring provisioning-mechanics bullets untouched.
- [ ] Rewrite `E-fmt` — the format step's *"Defined but not trustworthy here"* outcome in `SKILL.md` step 3 — to trigger on `provisioning failed` or an absent status, and to say that `no dependencies required` is not that case.
- [ ] Reword `E-floor` — the *"Settle trustworthiness before attribution"* sentence in `SKILL.md` step 3 — so it names the failed-or-absent case instead of *"unprovisioned"*. Leave the floor's delegation to the format step's three outcomes as it stands.
- [ ] Rewrite `E-aud` — the unreadable-source clause in `auditor.md`'s dependency-claim rule — to trigger on `provisioning failed` or an absent status.
- [ ] Update `E-md` — the root `CLAUDE.md`'s Worktrees sentence — to say the `lead` records `no dependencies required` for this repo. Do not touch the fenced snippets or the prose describing them.
- [ ] Run `V1`, `V2`, `V3`, `V4`, `V5`, `V6`, `V7` and `V8` and report each result, reading `V2` per the isolation assumption recorded in *Validation*.
- [ ] **Not the `coder`'s — the docs pass owns this.** Update `D1`, `D2` and `D3` in `README.md` to the three-value vocabulary and the branched receiver rule.
- [ ] **Not the `coder`'s — the docs pass owns this.** Update `D4` and `D5` in `docs/ARCHITECTURE.md`: the status-recording sentence and the handover/receiver paragraph in *The story worktree contract*, and the lint floor's third outcome including its *"unprovisioned"* wording.
- [ ] **Not the `coder`'s — the docs pass owns this.** Re-run `V5` and `V6` after the docs edits, where the expected result tightens to no hit anywhere outside `docs/specs/` and `docs/AGENTS_IMPROVEMENTS.md`.
