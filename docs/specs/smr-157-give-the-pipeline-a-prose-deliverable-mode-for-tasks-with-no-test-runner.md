# Give the pipeline a prose-deliverable mode for tasks with no test runner

- **Status**: Draft
- **Task**: smr-157-give-the-pipeline-a-prose-deliverable-mode-for-tasks-with-no-test-runner
- **Last Updated**: 2026-08-09
- **Document Scope**: One unit of work: the `writer`, `coder`, and `qa` definitions gain a named branch for a deliverable that is a document rather than code, so a project with no test runner is a stated mode instead of a per-dispatch renegotiation

---

## Goal

`writer.md`, `coder.md`, and `qa.md` are written for a repo with a build and a test suite. This toolkit's deliverable is almost always a Markdown agent definition, and the repo has no test runner, no build, and no validation command — so on nearly every task here the definitions are wrong about the medium, and each run pays to renegotiate them in an ephemeral dispatch prompt that the next `lead` never sees.

The change is a **named branch**, stated once per definition, keyed off a fact the spec declares and a fact the project's context supplies:

- the `writer` names the prose-deliverable case in its spec-authoring rules — the spec declares the deliverable's medium, each Requirements scenario is falsifiable by reading the changed file, and Validation covers the artifact's real consumers instead of a build;
- the `coder` substitutes **one inspectable assertion per Requirements scenario** for "one scenario test per scenario" when the spec declares a non-code deliverable and the project has no test runner;
- `qa` treats the spec's own Validation checklist as the validation when the project defines no command, and its gap-filling becomes finding and running the read-only checks that checklist should have had;
- both state that **failing to find a test runner is the expected result** in that mode, not a blocker.

**User value.** A prose task stops depending on the `lead` remembering to override three definitions in prose. The override that used to live in a dispatch prompt ("there is NO test suite, NO test runner, NO build — do not hunt for one") becomes text in the product.

**Non-goals.**

- Changing what the code path does. The branch is conditional; where a project has a test suite, per-scenario tests and a `qa` run are unchanged.
- Adding a test runner, a build, or any validation command to this repo.
- Touching the `lead` skill or `auditor.md`. The card scopes the change to three worker definitions, and `qa.md` carrying the fallback is what makes the `lead`'s existing "`qa` runs the project's validation" sentence correct in both modes.
- Mirroring the change into the root `README.md`. `docs/CLAUDE.md` keeps the README the user-facing description of every agent, and that mirror is the **docs pass's** standing job — it runs after the build whether or not a criterion names it. Building it here would widen the graded work past the card's own `## Scope`, which names three files and no README.
- Touching the canonical **"Addressing the story worktree."** and **"Board access is granted by your caller."** paragraphs, which are byte-identical across their carrier files and guarded by drift checks (see *Boundary*).
- Any version bump. The root `CLAUDE.md` makes that a deliberate human decision.

## Acceptance criteria (verbatim transcription)

> **Source**: card `SMR-157`, read from Linear (the `Agentic Claude` project in the `Smerfy` team) via the `read` binding in `docs/ISSUE_TRACKING.md`, on **2026-08-09**, at status `In Progress`, **after** this spec pass's criterion correction was applied to the card (see *Deviations from the card*). This is a **copy, not a summary** — one card bullet per `ACn` line, in card order, `n = 6`. The `auditor`'s mechanical equality check, performed in each gate that uses this section, licenses the copy — not a promise that it is faithful. That is the whole reason a copy is allowed here where a paraphrase is not: elsewhere this pipeline names a card rather than restating its criteria, because a restatement drifts toward what the work already does; a verbatim copy has the same failure mode unless something proves it did not happen, and the mechanical check is that proof.
>
> **One normalization, applied uniformly and stated so the equality check has a rule**: Linear stores a referenced issue identifier as an inline `<issue id="…" href="…">SMR-nnn</issue>` element (a save-time rewrite, like the `-` → `*` bullet rewrite the declaration's *Quirk* note records). Each such element is transcribed as its rendered text — the bare identifier. Nothing else is altered: wording, order, emphasis, and the parenthetical correction notes are the card's own.

- **AC1** — `writer.md`'s spec-authoring rules name the prose-deliverable case: when the deliverable is a document rather than code, each Requirements scenario must be falsifiable by reading the changed file, and Validation covers the artifact's real consumers (manifests, loaders, frontmatter, the changed-file set) instead of a build.
- **AC2** — `coder.md`'s build loop carries a named branch: when the spec's Boundary says the deliverable is a non-code artifact and the repo has no test runner, "one scenario test per scenario" becomes one inspectable assertion per Requirements scenario — quote the line that satisfies it, or name what is missing.
- **AC3** — The validation contract in `coder.md` and `qa.md` names the fallback in the definitions rather than in each dispatch prompt: where the project has a validation command `qa` runs it, and where it has none the spec's own stated validation procedure **is** the validation. *(Corrected 2026-08-06 during the* SMR-178 *spec pass. The original wording read "run the project's validation — via* `ca77y-engineering:qa` *where the project has one, or the spec's stated validation procedure where it does not", which presupposed the* `coder` *dispatching* `qa` *itself.* SMR-166 *made the pipeline flat —* `coder.md` *now reads "You do not dispatch other pipeline agents — the* `lead` *runs* `qa`*" — so that route no longer exists and the criterion was unbuildable as written. The goal is unchanged.)* *(Corrected again 2026-08-08 during this card's spec pass: "the validation step in* `coder.md`*/*`qa.md`*" named a step* `coder.md` *does not have — after* SMR-166 *its loop is Prepare / Implement / Report up, and the only validation-shaped sentence left in it is the* `## Rules` *line "Report up once qa is green", which is itself stale for the same reason. "The validation contract in* `coder.md` *and* `qa.md`*" is what the criterion always meant and is checkable against both files. The goal is unchanged.)*
- **AC4** — `qa.md` states what its gap-filling steps mean for a prose build: where the spec carries its own Validation checklist that checklist **is** the validation — run it and capture real output — and filling the gap becomes checking that checklist for missing read-only checks and running the ones it should have had, reported as additions to the checklist rather than as new test files. The diff-review step is already medium-agnostic and needs no branch.
- **AC5** — Failing to find a test runner or validation command is stated as the expected result for a prose deliverable, not a blocker to report.
- **AC6** — The branch does not weaken the code path: a task with a real test suite still gets scenario tests and a `qa` run.

## Design

### The shape: one declared fact, three consumers

The branch needs a trigger that every downstream agent can evaluate without guessing. AC2 supplies it: *"when the spec's Boundary says the deliverable is a non-code artifact and the repo has no test runner"*. That is a **conjunction of two independently observable facts**:

1. **The spec declares the deliverable's medium.** This is new, and it is the `writer`'s half (AC1). Without it the `coder`'s trigger is unreachable — a `coder` cannot infer "non-code artifact" from a spec that never says so, and inferring it from the file extensions in the Tasks list is exactly the guesswork this card removes.
2. **The project has no test runner / validation command.** This is discovered from project context, the way the pipeline already discovers every other project command.

Where the Boundary content lives is the project's business, not this rule's: in this repo's spec shape it sits under `## Design`, and `writer.md` already speaks of *"the Boundary, Coordination, and Deviations content wherever this spec's shape places it"*. The shipped wording must key off **what the spec declares**, not off a heading name, so a project whose spec shape puts Boundary elsewhere is unaffected. (`SMR-134`, open, is the card that would pin section placement generally; this change must not pre-empt it.)

### Reuse the vocabulary the repo already has for a missing command

`docs/ARCHITECTURE.md` (*"Both commands are the project's, and both take the same three outcomes"*) already settles how this repo talks about a project command that may not exist, for the `lead`'s format and lint steps: **defined and runnable** — run it and act on the result; **not defined** — a stated outcome rather than a failure, skipped and said so, and never a reason to invent one; **defined but not trustworthy here** — the worktree's provisioning is absent or negative, or the command will not run, reported as unrunnable rather than concluded clean.

AC5 is the same distinction one layer down, for validation rather than formatting. The shipped wording should therefore **extend that three-outcome vocabulary to the `coder`'s and `qa`'s validation**, not invent a parallel one — and must keep the second and third outcomes apart, because collapsing them is how an unprovisioned worktree's failed command would get waved through as "this project just has no runner". That separation is a behavioural claim about the shipped text, so it is a scenario (R5.2), not a Design aside.

### What "one inspectable assertion" means

For each Requirements scenario, the `coder` records the observation that makes that scenario true in the changed artifact: the file, the region (a heading, a bold lead-in, or a quoted phrase — not a line number, which the same pass's own later edits rot), and the quoted sentence that satisfies it. Where nothing in the artifact satisfies it, it names what is missing. The pairing is **per scenario, keyed to the scenario's own name**, because a quotation is otherwise satisfiable by any plausible-looking line elsewhere in the file — the prose analogue of the adjacent-test trap `coder.md`'s pinning rule already warns about.

### A stale sentence this change has to reconcile

`coder.md`'s `## Rules` carries *"Report up once qa is green; do not sit on the work trying to pre-empt the review."* Under the flat topology the `coder` never sees a `qa` result — its own step 3 says *"The `lead` then runs `qa`"* — so the file already carries two live instructions about one thing, and the prose branch makes the contradiction worse (in this mode there is no `qa` run for the coder to wait on). It is inside the card's `## Scope` (`coder.md` … and Rules) and is the coder-side sentence AC3 attaches to, so it is reconciled here rather than left for another card. This is R3.3.

### Criterion-to-requirement map

| Criterion | Where it is built | Owner |
| --- | --- | --- |
| AC1 | R1 (all four scenarios) | `coder` |
| AC2 | R2 | `coder` |
| AC3 | R3 | `coder` |
| AC4 | R4 | `coder` |
| AC5 | R5 | `coder` |
| AC6 | R6 | `coder` |

No criterion is satisfied by the tree as it stands — each names text that does not exist in any of the three files today (verified by reading them at `76f9cad`) — so this spec carries no *Already satisfied criteria* section, per the template's rule for dropping it. Every criterion is closed by the `coder`'s build; the two pieces of work that are **not** its task — the root `README.md` mirror and the `docs/ARCHITECTURE.md` fold — both belong to the docs pass and are recorded as such in *Tasks*.

### Boundary

**The deliverable of this task is a non-code artifact: three Markdown documents.** There is no test runner, no build, and no validation command in this repository — the root `CLAUDE.md` records it has no install or bootstrap step of its own (no `package.json`, no lockfile). The *Validation* section below is therefore this spec's stated validation procedure, and it is the validation `qa` runs. This spec is written under the very rules it ships; that is deliberate, and it is the first exercise of them.

**Edit sites** (paths relative to the worktree root; regions named by heading and quoted lead-in, pinned to commit `76f9cad`):

- `plugins/ca77y-engineering/agents/writer.md` — `### Spec authoring rules`: a new rule, plus reconciliation of *"Validation must reach every consumer of what the task changes."* and the opening sentence of *"Behaviour asserted outside Requirements gets no test."*
- `plugins/ca77y-engineering/agents/coder.md` — `## The loop` step 2 (*"Implement."*), and the `## Rules` bullet *"Report up once qa is green"*.
- `plugins/ca77y-engineering/agents/qa.md` — `## What you do` steps 1–4, and a statement of which steps the branch does and does not change.
**Must not touch:**

- The root `README.md`. Its `coder`, `qa`, and `writer` sections and the *"Verification is layered"* paragraph under `## Conventions that tie it together` all describe the code-only form and will need the branch — but that mirror is the docs pass's, per the `lead`'s decision recorded in *Non-goals*. The four regions are named here so the docs pass has them, not so the `coder` edits them.

- The canonical **"Addressing the story worktree."** paragraph in any of its five carriers, and the canonical **"Board access is granted by your caller."** paragraph in either of its two. Both are byte-identical single physical lines guarded by the root `CLAUDE.md` drift checks, and `SMR-147` is editing them **concurrently** (see *Coordination*).
- `plugins/ca77y-engineering/skills/lead/SKILL.md` and `agents/auditor.md`, `agents/analyst.md`, and every file under `plugins/ca77y-library/`.
- Any `plugin.json` or `.claude-plugin/plugin.json` — no version changes.
- `docs/ARCHITECTURE.md`, which the docs pass folds this spec into after the build.

**No test file, test config, or test runner is added anywhere.** In this repo that is not a limitation to work around — it is the mode the change exists to describe, and adding one would falsify the change's own premise.

### Coordination

Sibling cards were swept through the declaration's `search` binding on 2026-08-09 (`list_issues` over the `Agentic Claude` project). Overlaps, all in the same files:

- **`SMR-147` — `In Progress` right now, in a concurrent worktree.** It rewrites the canonical *"Addressing the story worktree."* paragraph across all five carriers, three of which this task also edits. The two changes touch disjoint regions of those files; whichever lands second must **not** re-flow or re-wrap the canonical paragraph, and must re-run both drift checks (below) after merging.
- **`SMR-156` — `Make a spec's Validation section scoped and reproducible`.** Also edits `writer.md`'s Validation authoring rule and the `coder.md`/`qa.md` report contracts, and its own criteria say it *"extends the existing rule … rather than restating it"*. Whichever lands second reconciles with the other's shipped wording rather than adding a second Validation rule beside it.
- **`SMR-169` — `Hand qa a measured base-commit baseline`.** Edits `qa.md`'s validate step, where this task's fallback lands. Its "where no baseline could be measured" case and this task's "not defined" outcome are the same fact from two sides; the second to land states them once.
- **`SMR-148` — `Make the coder demonstrate each pinning test red`.** Its revert-run-restore obligation presupposes a runnable test, which the prose mode does not have. Recorded on that card as a board follow-up during this pass (see *Deviations from the card*).
- **`SMR-181`, `SMR-179`, `SMR-176`, `SMR-134`, `SMR-135`, `SMR-171`, `SMR-174`** all also scope `writer.md`; `SMR-181` additionally scopes `coder.md` and already records `SMR-157` in its own shared-region note. Same rule: the second to land reconciles.

No sibling card asserts a relationship this spec's decisions reverse. The sweep ran and returned the overlaps above.

### Deviations from the card

Two corrections were applied **to the card itself** during this pass, under the `update` binding and the declaration's *"a criterion the design proves unsatisfiable … fix it on the issue"* authority. Both were made **before** the transcription above was taken. Neither changes what the story is for.

1. **`## Scope`** read *"`coder.md` (build loop, step 3 and Rules)"*. `SMR-166` renumbered that loop to Prepare / Implement / Report up, so step 3 is now the report step and the scenario-test mandate the branch qualifies sits in step 2. The scope note now names the loop and Rules without the stale ordinal, with a dated correction note in the card's established style.
2. **AC3** opened *"The validation step in `coder.md`/`qa.md`"*. `coder.md` has no validation step — post-`SMR-166` its only validation-shaped sentence is the `## Rules` line reconciled in R3.3 — so the criterion named a location that does not exist. It now reads *"The validation contract in `coder.md` and `qa.md`"*, with a second dated correction note. The obligation is unchanged and is now checkable against both files.

The card's correction notes carry the stamp `2026-08-08`, the date they were written; this spec is stamped `2026-08-09`, the date it was completed. Same pass, across midnight.

**No dependency claims.** This spec asserts nothing about a third-party or vendored package: the repo has no dependency tree (no manifest, no lockfile), and every claim it makes about behaviour is a claim about files in this repository, cited above by path and region at commit `76f9cad`.

## Requirements

### Requirement: `writer.md` names the prose-deliverable case

#### Scenario: The spec declares the deliverable's medium

- **WHEN** a `writer` in its spec pass reads `### Spec authoring rules` in `writer.md` after this change, for a task whose deliverable is a document rather than code
- **THEN** the rules direct it to state the deliverable's medium in the spec's Boundary content — in words a later agent can key a branch off, such as "the deliverable is a non-code artifact" — and refer to that content by what it is rather than by a fixed heading name, so a project whose spec shape places Boundary elsewhere is still covered

#### Scenario: Every scenario is falsifiable by reading the changed file

- **WHEN** the same `writer` writes Requirements scenarios for that task
- **THEN** the rule requires each scenario's **THEN** to name an observation a reader can make in the changed artifact itself — a passage present, absent, or saying a specific thing — rather than the output of a program

#### Scenario: Validation covers the artifact's consumers instead of a build

- **WHEN** the same `writer` writes that spec's Validation content
- **THEN** the rule names the artifact's real consumers as what Validation must reach — the manifests and loaders that read the file, its frontmatter, and the changed-file set — in place of a build step

#### Scenario: No sentence in `writer.md` still asserts the code-only form unconditionally

- **WHEN** a reader searches `writer.md` after this change for the sentences that presuppose a build or a test suite — *"Validation must reach every consumer of what the task changes."* and the opening of *"Behaviour asserted outside Requirements gets no test."*
- **THEN** each either carries the prose branch or is scoped to the code case, no sentence states unconditionally that the `coder` writes one scenario test per Requirements scenario, and the new rule is written as an extension of the existing consumer rule rather than a second rule contradicting it

### Requirement: `coder.md`'s build loop carries the named branch

#### Scenario: The branch's trigger is both facts, stated

- **WHEN** a `coder` reads step 2 of `## The loop` in `coder.md` after this change
- **THEN** the branch names both conditions it fires on — the spec declares the deliverable a non-code artifact **and** the project has no test runner — and says what supplies each (the spec's Boundary content; the project's context)

#### Scenario: One inspectable assertion replaces one scenario test

- **WHEN** the branch fires
- **THEN** the text substitutes **one inspectable assertion per Requirements scenario** for "one scenario test per spec scenario", and defines the assertion as the file, the region named the way a reader finds it (a heading, a bold lead-in, or a quoted phrase — not a line number), and the quoted sentence that satisfies that scenario

#### Scenario: An assertion is bound to the scenario it answers

- **WHEN** the `coder` records those assertions
- **THEN** the text requires one entry **per scenario, named by that scenario**, so a quotation cannot be credited to a scenario it does not satisfy — the prose analogue of the adjacent-test trap the file's existing pinning rule warns about

#### Scenario: A scenario nothing satisfies is named, not silently dropped

- **WHEN** no passage in the changed artifact satisfies a Requirements scenario
- **THEN** the text requires the `coder` to name what is missing for that scenario in its report, rather than omitting the entry

### Requirement: The validation fallback lives in the definitions

#### Scenario: `qa.md` states both outcomes at its validate step

- **WHEN** a `qa` reads step 1 of `## What you do` in `qa.md` after this change
- **THEN** it reads both halves in the definition itself: where the project defines validation commands it runs them; where it defines none, the spec's own stated Validation procedure **is** the validation, run and captured the same way

#### Scenario: `coder.md` states which validation governs its build

- **WHEN** a `coder` reads `coder.md` after this change
- **THEN** the definition names, without needing a dispatch prompt to supply it, that the project's validation command is `qa`'s to run where one exists, and that where none exists the spec's stated Validation procedure is what its own work is checked against before it reports up

#### Scenario: The stale `qa`-green rule is reconciled, not left beside the new text

- **WHEN** a reader searches `coder.md` after this change for instructions about waiting on `qa`
- **THEN** the `## Rules` bullet *"Report up once qa is green"* no longer stands — the file gives exactly one live instruction about when the `coder` reports up, consistent with step 3's *"The `lead` then runs `qa`"* — and it is rewritten or removed rather than annotated as historical

#### Scenario: Neither definition delegates the fallback to a prompt

- **WHEN** a reader checks whether the fallback is stated in the definitions
- **THEN** both files state it in their own text, and neither says or implies that the dispatching `lead` must supply it

### Requirement: `qa.md`'s gap-filling has a prose form

#### Scenario: The spec's checklist is the validation

- **WHEN** `qa` validates a build whose project defines no validation command and whose spec carries its own Validation checklist
- **THEN** `qa.md` tells it that checklist **is** the validation — run it and capture real output — rather than treating "no command found" as either a pass or a missing prerequisite

#### Scenario: Filling the gap means finding missing read-only checks

- **WHEN** `qa` reaches its gap-filling steps on such a build
- **THEN** `qa.md` defines the gap as read-only checks the spec's checklist should have had and did not, requires `qa` to run the ones it identifies, and requires them reported **as additions to that checklist** rather than written as new test files — with the spec itself left for the `writer` to amend, consistent with `qa`'s existing boundary that specs are not its to write

#### Scenario: `qa.md` says which of its steps the branch changes

- **WHEN** a reader compares `qa.md`'s steps against the branch after this change
- **THEN** the file states that the branch changes its validate, gap-find, add, and re-run steps, and that its already-satisfied re-validation, diff review, and report steps need no branch because each is already an observation over files

### Requirement: A missing runner is an expected outcome, not a blocker

#### Scenario: Both agents are told what "no runner" means

- **WHEN** a `coder` or a `qa` looks for a test runner or validation command on a prose-deliverable task and finds none
- **THEN** each definition states that this is the **expected** result in that mode — recorded and reported as an outcome, never escalated as a blocker, and never a reason to invent a runner, add a test file the spec's Boundary forbids, or search further

#### Scenario: An untrustworthy command is still reported

- **WHEN** a project **does** define a validation command but the worktree's dependency-provisioning status makes its output untrustworthy, or the command will not run
- **THEN** the wording keeps that case distinct from "no command is defined" — it is reported as unrunnable rather than concluded clean or absorbed into the prose branch

### Requirement: The code path is not weakened

#### Scenario: A project with a test suite is unaffected

- **WHEN** a `coder` or `qa` works a task whose project has a test runner
- **THEN** the branch does not fire, `coder.md` still requires one scenario test per spec scenario, and `qa.md` still requires running the project's validation and adding the missing tests — each stated as the default with the branch as the exception, not the reverse

#### Scenario: A mixed deliverable keeps tests for its code

- **WHEN** a spec declares a deliverable that is partly code and partly document, on a project that has a test runner
- **THEN** the wording makes the branch's trigger a conjunction that does not fire — so the code scenarios keep their scenario tests — rather than letting a document in the change set turn the whole task into a prose build

## Validation

This project defines **no test runner, no build, and no validation command** — the root `CLAUDE.md` records that it has no install or bootstrap step of its own. That is the expected outcome here, not a gap: the list below **is** this spec's validation procedure, and it is what `qa` runs.

**Preconditions.** Every command runs from the story worktree root, `/Users/catty/Workspace/agentic-claude/.worktrees/tokwieci/smr-157-give-the-pipeline-a-prose-deliverable-mode-for-tasks-with-no`, with paths relative to it. Nothing here depends on installed dependencies, so the worktree's "nothing to provision" status affects no result below. Every command is read-only; none writes to the tree.

**Precondition discovered while writing this spec (2026-08-09).** The root `CLAUDE.md` states its two drift checks with brace expansion (`agents/{coder,writer,qa,auditor}.md`). In a **worktree-isolated session** that form is refused before it runs — *"this command is too complex to verify that it stays inside the worktree"* — and so is any `&&`-joined pair, and `git -C .`. The forms below are therefore written **expanded, one command per invocation**, and are the ones to run; they were executed in this worktree at `76f9cad` and both printed `1`. This is the same defect `SMR-186` (*Make the root `CLAUDE.md`'s three verification snippets runnable under session isolation*) owns for the `CLAUDE.md` copies; nothing in that file is edited by this task.

1. **Read each changed file against each Requirements scenario.** For every scenario above, open the file it names, find the region, and record the quoted sentence that satisfies it — or name what is missing. This is the primary check; the greps below are guards, not substitutes.
2. **The canonical worktree paragraph is undisturbed** — prints `1`:
   ```bash
   grep -h '^\*\*Addressing the story worktree\.\*\*' plugins/ca77y-engineering/agents/coder.md plugins/ca77y-engineering/agents/writer.md plugins/ca77y-engineering/agents/qa.md plugins/ca77y-engineering/agents/auditor.md plugins/ca77y-engineering/skills/lead/SKILL.md | sort -u | wc -l
   ```
3. **The canonical board paragraph is undisturbed** — prints `1`:
   ```bash
   grep -h '^\*\*Board access is granted by your caller\.\*\*' plugins/ca77y-engineering/agents/writer.md plugins/ca77y-engineering/agents/auditor.md | sort -u | wc -l
   ```
4. **No cross-plugin dispatch name was introduced** — both print nothing:
   ```bash
   grep -rn 'ca77y-engineering:\(researcher\|librarian\|scribe\|clerk\)' plugins/
   grep -rn 'ca77y-library:\(analyst\|auditor\|coder\|qa\|writer\|lead\|board\)' plugins/
   ```
5. **Both manifests of every plugin still agree, and no version changed.** The root `CLAUDE.md` parity loop is a shell `for` loop and is refused under session isolation for the same reason as the greps above, so read the four values directly and confirm they pair up — `ca77y-engineering` root with Claude, `ca77y-library` root with Claude:
   ```bash
   grep -n '"version"' plugins/ca77y-engineering/plugin.json plugins/ca77y-engineering/.claude-plugin/plugin.json plugins/ca77y-library/plugin.json plugins/ca77y-library/.claude-plugin/plugin.json
   ```
   The property is the pairing, not a particular number — and `git diff --name-only master...HEAD` naming no `plugin.json` is what establishes that neither pair moved during this task.
6. **The changed-file set is exactly what the Boundary allows.** `git status --porcelain` plus `git diff --name-only master...HEAD` name only the three agent definitions — `plugins/ca77y-engineering/agents/writer.md`, `coder.md`, `qa.md` — this spec, and, where a worker appended one, `docs/AGENTS_IMPROVEMENTS.md`. Any other path is a boundary violation, and `README.md` appearing in the build's set is specifically the one to catch: it is real work, owned by the docs pass, not by this build.
7. **No test infrastructure was added.** The changed-file set contains no test file, test config, or runner manifest, and the repo still has no `package.json` or lockfile.
8. **The loader's view of each definition is unchanged.** Each of the three agent files still opens with exactly one frontmatter block delimited by `---`, and its `name:` value is unchanged. Each `description:` is read and confirmed still true of the file's shipped body; where the branch makes a description's sentence false, it is corrected in the same change.
9. **The files render as intended.** Each new rule reads as a bold lead-in paragraph under the heading the Boundary names, matching the surrounding convention, with no broken fence or list nesting.

## Tasks

- [x] Add the prose-deliverable rule to `writer.md`'s `### Spec authoring rules` (R1.1–R1.3).
- [x] Reconcile `writer.md`'s existing code-shaped sentences with it — the consumer rule and the opening of *"Behaviour asserted outside Requirements gets no test."* (R1.4).
- [x] Add the named branch to `coder.md` step 2, with its two-fact trigger and the per-scenario inspectable assertion (R2.1–R2.4).
- [x] State the validation fallback in `coder.md`, and reconcile the `## Rules` bullet *"Report up once qa is green"* (R3.2, R3.3).
- [x] State the validation fallback at `qa.md`'s validate step (R3.1), and confirm neither file defers it to a dispatch prompt (R3.4).
- [x] Give `qa.md`'s gap-filling steps their prose form, and state which steps the branch does and does not change (R4.1–R4.3).
- [x] State the expected-outcome rule for a missing runner in both `coder.md` and `qa.md`, keeping the untrustworthy-command case distinct (R5.1, R5.2).
- [x] Check both files read with the branch as the exception and the code path as the default, including the mixed-deliverable case (R6.1, R6.2).
- [x] Run the *Validation* list and record each result, including each scenario's quoted satisfying line.
- [ ] **Not the `coder`'s task** — the docs pass mirrors the branch into the root `README.md`'s `coder`, `qa`, and `writer` sections and its *"Verification is layered"* paragraph, per `docs/CLAUDE.md` and the `lead`'s scope decision in *Non-goals*.
- [ ] **Not the `coder`'s task** — the docs pass folds this spec's durable content into `docs/ARCHITECTURE.md` (the branch, its trigger, and why the three-outcome vocabulary is reused rather than duplicated) and removes the spec, per `docs/CLAUDE.md`.
