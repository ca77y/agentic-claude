# Generalize an audit finding to its property before fixing or verifying it

- **Status**: Draft
- **Task**: generalize-audit-findings-to-the-property
- **Last Updated**: 2026-07-22
- **Document Scope**: One unit of work: prose changes to `writer.md` and `auditor.md` so a finding is fixed and re-verified as a general property over its full instance set, not as the examples its prose named

---

## Goal

An audit finding names a few instances of a broken pattern. Today the revision fixes exactly those instances and the re-audit verifies exactly those instances, so the property the finding was illustrating stays broken everywhere the finding's prose did not happen to point — and each later round rediscovers one more instance of the same defect.

**The change.** Two agent definitions gain prose:

- `writer.md` (the revision side) — restate a finding as the general property it is an instance of *before* writing the fix, then check the fix against every instance of that property in the full set the artifact enumerates. Plus a spec-authoring rule: when the spec gives one out-of-scope acceptance criterion an owning mechanism, sweep the card's remaining criteria for the same shape in the same pass.
- `auditor.md` (the verification side) — perform the same generalization when re-checking a revision, and verify the property across the enumerated set rather than the named examples.

Both definitions state plainly that a finding's examples are illustrative unless the finding says otherwise.

**Value.** A finding is closed once instead of N times. The round that fixes it and the round that verifies it work against the same generalized statement, so "applied" means the defect is gone from the set, not from the sample.

**Non-goals.**

- No behavior change to any agent other than `writer` and `auditor`. `reviewer.md` and `researcher.md` are being edited by sibling stories and are out of bounds here.
- No version bump — both `ca77y-engineering` manifests stay at `1.6.2`. See *Why the version stays at 1.6.2* in Design; this is a deliberate break from the repo's otherwise unbroken bump-per-agent-edit precedent.
- No new report field, no new gate, no change to how many audit rounds run. The card asks for a change to how an existing finding is fixed and re-verified, not for new pipeline machinery; a new report field or gate would add surface the criteria do not ask for and that the sibling stories editing the same two files would then have to reconcile against.
- No change to the `auditor`'s *first-round* readiness or acceptance procedure beyond how it writes a finding's instance list; the generalization requirement is scoped to re-checking a revision, per the card.
- No `README.md` or `docs/ARCHITECTURE.md` edit — see Design.

## Design

### Where each rule lands

Both files are prose contracts. Every change is an insertion into an existing section, phrased in that section's voice, with no section renamed or removed.

`plugins/ca77y-engineering/agents/writer.md`

| # | Anchor | Change |
|---|---|---|
| W1 | `## The auditor gate`, after the *"Dispatch it by qualified name"* paragraph | New `### Applying a finding` subsection: examples are illustrative; restate as the property; fix against every instance |
| W2 | Spec pass, step 4 | Point the "apply its valid findings" step at W1 |
| W3 | Docs pass, step 6 | Point the "apply its valid findings" step at W1 |
| W4 | `### Spec authoring rules`, immediately after the *Deviations section* rule | New authoring rule: a criterion the `coder` cannot close needs a named owner, and so do its siblings on the same card |

W1 sits under `## The auditor gate` rather than under `### Spec authoring rules` because findings arrive in **both** modes — spec pass step 4 and docs pass step 6 — and the gate section is the only part of the definition both passes already share. W2 and W3 exist so a writer working the numbered steps reaches the rule from either mode; without them the rule is reachable only by reading the file top to bottom.

W4 sits in `### Spec authoring rules` because it constrains what a spec must contain, and directly after the *Deviations* rule because both govern what the spec does with a card criterion it cannot satisfy head-on.

`plugins/ca77y-engineering/agents/auditor.md`

| # | Anchor | Change |
|---|---|---|
| A1 | `## Re-audits are fresh dispatches`, after the *"Resolve a prior round's finding against the exact file and section it cited"* paragraph, before *"Your verdict is your return value"* | New paragraph: re-check the property, not the examples |
| A2 | `## Constraints`, after the *"Ground every finding in something you actually read"* bullet | New bullet: write a finding as property-plus-instances and say when a list is exhaustive |

A1 is placed *after* the existing cited-instance paragraph and defers to it explicitly, because the two rules would otherwise read as contradictory. The existing rule says an unmet instance the original finding never named is a **new** finding, not a not-applied verdict on the old one. A1 keeps that grading intact and adds only the search: generalize, enumerate, check all — then grade the old finding against its cited instances and raise the remaining unmet instances as a new finding at their own severity. A revision can be a correctly applied fix *and* leave an open finding; A1 says so in as many words, so neither rule can be read as overturning the other.

A2 covers the writing side rather than the checking side: because the `writer` will now generalize every finding, the `auditor` has to be explicit when it genuinely does mean "this one instance only". Without A2, "illustrative unless the finding says otherwise" gives the `auditor` no instruction for the case where it wants to say otherwise.

### Why the `writer` needs W4 to state the owner rule, not just the sweep

The card's third criterion says the sweep happens "when a spec resolves one out-of-scope acceptance criterion by naming its owning mechanism". `writer.md` today carries no rule that a spec names owning mechanisms at all — that practice exists only in past specs. W4 therefore states the practice (owner, when, Tasks entry marked as not the coder's task) and then attaches the sweep to it, so the sweep has a stated trigger inside the definition rather than depending on a convention the file never mentions.

### Why `README.md` and `docs/ARCHITECTURE.md` stay untouched

`docs/CLAUDE.md` requires the root `README.md` to be updated when an agent's behavior changes. Read against the README's actual text, no sentence becomes wrong: its `auditor` section (lines ~280-288) describes the gate's role, callers, verdict shape, and report-only constraint; its `writer` section (lines ~290-304) describes the two modes and the delegation of consistency checks. Neither enumerates authoring rules or finding-handling procedure, and this change adds no mode, caller, gate, or verdict. `docs/ARCHITECTURE.md` describes structure — roster, dispatch model, model/effort assignment — none of which moves. Both files are therefore in the **must not touch** list below rather than in Tasks, and the Validation set asserts that neither changed. If the acceptance gate reads criterion 5 as requiring a user-facing statement, that is a scope question for the `lead`, not a silent edit here.

### Why the version stays at 1.6.2

Every prior commit touching a file under `plugins/*/agents/` also bumped both manifests, including the two most recent, which are prose-only agent edits exactly like this one. This story deliberately breaks that precedent: six sibling cards are in flight against this plugin's agent definitions — `require-citations-for-dependency-claims` on both files this story edits, `sequence-acceptance-gate-around-docs-pass` conditionally on `auditor.md`, and the other four on `writer.md`, `lead.md`, or `analyst.md` — and the plugin version is one number per manifest regardless of which agent file a story touches, so a bump inside each story's branch produces a collision on every merge after the first, with each branch claiming the same number for different prose. The version is bumped once, by whoever integrates the batch, after the last of these stories lands. Leaving `plugin.json` and `.claude-plugin/plugin.json` untouched here keeps the merge conflict-free and keeps the manifest-parity check in the root `CLAUDE.md` green throughout — the two manifests stay equal at `1.6.2` because neither moves.

### Boundary

May change — the only two files this task writes:

- `plugins/ca77y-engineering/agents/writer.md`
- `plugins/ca77y-engineering/agents/auditor.md`

Must not touch:

- Every other file under `plugins/ca77y-engineering/agents/` — in particular `reviewer.md` and `researcher.md`, owned by concurrent sibling stories
- `plugins/ca77y-engineering/plugin.json` and `plugins/ca77y-engineering/.claude-plugin/plugin.json` — both stay at `1.6.2`
- `README.md` and `docs/ARCHITECTURE.md`, for the reasons argued above; and `docs/PRODUCT.md`, because this change alters how two agents handle a finding, not the toolkit's direction or boundaries
- `docs/tasks/**` — the board is the human's

Not applicable: there is no application code and no test suite in scope. Every requirement below is verified by reading the two files and by read-only `git`/`grep` commands. No Validation command writes to a file, so nothing in this spec can produce collateral outside the boundary.

## Requirements

### Requirement: The writer restates a finding as its general property before fixing it

#### Scenario: writer.md carries the restatement rule

- **WHEN** a reader opens `plugins/ca77y-engineering/agents/writer.md` and reads the `### Applying a finding` subsection under `## The auditor gate`
- **THEN** it instructs the writer to restate the finding as the general property it is an instance of **before** writing the fix, and to write that property out in one sentence in the form the requirement would take
- **AND** it contrasts a property statement against an example statement concretely — a whole-set sentence such as *"every one of the nine tool functions the unit routes through the wrapper is exercised by a scenario that would fail if the wrapping were skipped"* against the finding's own wording *"these three functions have no coverage"*
- **AND** it says the restatement is what the fix is written against and the named examples only say where to start looking

#### Scenario: the rule reaches both passes

- **WHEN** a reader reads spec pass step 4 and docs pass step 6 of the same file
- **THEN** each step's "apply its valid findings" instruction points at the `Applying a finding` rule by name
- **AND** the rule itself sits in a section shared by both modes rather than inside `### Spec authoring rules`, so it is not readable as spec-pass-only

### Requirement: The fix is checked against every instance of the property, not the named examples

#### Scenario: writer.md requires enumerating the full set

- **WHEN** a reader reads the third paragraph of `### Applying a finding`
- **THEN** it instructs the writer to enumerate the instances the property applies to **from the artifact itself** — the full set of functions, files, criteria, or scenarios the spec names — and to check the fix against each one before calling the finding closed
- **AND** it states the failure it prevents: repairing only the named instances leaves the finding's own defect live in the rest of the set, where each later round rediscovers one more

#### Scenario: an instance that cannot be closed is named, not dropped

- **WHEN** a reader reads the same paragraph
- **THEN** it instructs the writer that an instance the pass cannot close is named in the report with the reason, so it is a stated gap rather than an unnoticed one

### Requirement: A card criterion the coder cannot close gets an owner, and its siblings are swept in the same pass

#### Scenario: writer.md carries the owner-and-sweep authoring rule

- **WHEN** a reader reads `### Spec authoring rules` in `plugins/ca77y-engineering/agents/writer.md`
- **THEN** a rule stands immediately after the *"A criterion the design cannot satisfy as written goes in a Deviations section"* rule, stating that when the card carries a criterion no automated build step can satisfy — documentation the docs pass owns, a manual reproduction someone has to run and record the results of — the spec names its owning mechanism: what closes it, when in the pipeline, and a Tasks entry marked as not the coder's task
- **AND** it requires that, having named an owner for one such criterion, the same pass re-reads **every remaining criterion on the card** for the same shape — *present on the card, absent from the Tasks checklist, no stated owner* — and resolves each of them in that pass
- **AND** it states the failure it prevents: acknowledging such a criterion in Validation without an owner and a Tasks entry leaves it for a later audit round to find one criterion at a time

### Requirement: The auditor re-checking a revision verifies the property, not the named examples

#### Scenario: auditor.md carries the generalized re-check rule

- **WHEN** a reader reads `## Re-audits are fresh dispatches` in `plugins/ca77y-engineering/agents/auditor.md`
- **THEN** a paragraph follows the existing *"Resolve a prior round's finding against the exact file and section it cited"* paragraph instructing the auditor, before judging a revision, to restate the prior finding as the general property it was an instance of, to enumerate every instance that property covers in the artifact **as it now stands** — the full set the spec names, not the names the finding used — and to verify each
- **AND** it makes the same concrete contrast the writer's rule makes: *"these three functions have no coverage"* is a sample of *"every function the unit routes through the wrapper is covered by a scenario"*

#### Scenario: the new rule does not overturn the existing cited-instance grading

- **WHEN** a reader reads the new paragraph together with the paragraph above it
- **THEN** the new paragraph states that the prior finding is graded applied or not-applied against the instances it actually cited, and that instances of the same property left unmet elsewhere are a **new** finding at their own severity — deferring to the existing rule rather than restating or contradicting it
- **AND** it says in as many words that a revision can be both a correctly applied fix and an open finding
- **AND** reading `auditor.md` end to end (it is under 60 lines), no sentence anywhere in the file tells the auditor to return a not-applied verdict for an instance the original finding did not name

### Requirement: Both definitions state that a finding's examples are illustrative unless the finding says otherwise

#### Scenario: writer.md states it

- **WHEN** a reader reads the first paragraph of `### Applying a finding`
- **THEN** it states that a finding's examples are illustrative unless the finding says otherwise — the sample that made the defect visible, not its definition
- **AND** it states that only an explicit narrowing in the finding itself makes the list exhaustive

#### Scenario: auditor.md states it, and says how to say otherwise

- **WHEN** a reader reads the new paragraph in `## Re-audits are fresh dispatches` and the `## Constraints` bullets
- **THEN** the paragraph states that a finding's named instances are illustrative unless the finding itself says the list is exhaustive
- **AND** a `## Constraints` bullet, following the *"Ground every finding in something you actually read"* bullet, requires the auditor to write a finding as the property plus the instances that show it, and to say explicitly when a list of instances **is** exhaustive — because otherwise the examples are read as illustrative and the fix will be generalized to the whole set

### Requirement: The change stays inside its boundary

#### Scenario: exactly two files changed

- **WHEN** `git -C <worktree> diff --name-only master...HEAD -- plugins/ README.md docs/ARCHITECTURE.md docs/PRODUCT.md` is run after the edits
- **THEN** the output lists exactly `plugins/ca77y-engineering/agents/writer.md` and `plugins/ca77y-engineering/agents/auditor.md`
- **AND** `reviewer.md`, `researcher.md`, and every other agent definition are absent from it

#### Scenario: versions and frontmatter untouched

- **WHEN** the manifest-parity loop from the root `CLAUDE.md` is run, and the YAML frontmatter of both edited files is read
- **THEN** every plugin prints `ok`, `ca77y-engineering` prints `1.6.2`
- **AND** the `name`, `description`, `model`, `effort`, and `disallowedTools` fields of `writer.md` and `auditor.md` are byte-identical to their pre-change values

#### Scenario: additions only, in the existing structure

- **WHEN** `git -C <worktree> diff master...HEAD -- plugins/ca77y-engineering/agents/` is read
- **THEN** every hunk is an insertion or an in-place extension of an existing sentence at one of the six anchors named in Design (W1-W4, A1-A2)
- **AND** no existing `##`/`###` heading is renamed, reordered, or deleted, and no existing rule paragraph is deleted

## Validation

Read-only. No command in this list writes to a file, so none can produce collateral outside the boundary. Run from the worktree root, substituting its absolute path.

1. `git diff --name-only master...HEAD` — expect exactly the two agent files (plus this spec, which the `lead` commits separately).
2. `git diff master...HEAD -- plugins/ca77y-engineering/agents/` — read every hunk against the Design anchor table.
3. `grep -n "illustrative" plugins/ca77y-engineering/agents/writer.md plugins/ca77y-engineering/agents/auditor.md` — expect at least one hit in each file.
4. `grep -n "Applying a finding" plugins/ca77y-engineering/agents/writer.md` — expect the heading plus the two step cross-references (three hits).
5. Manifest parity: run the loop in the root `CLAUDE.md`; expect `ok` for every plugin and `1.6.2` for `ca77y-engineering`.
6. Criterion-by-criterion read: for each of the card's five acceptance criteria, read the corresponding Requirement's scenarios above against the edited files and record met / not met. This is the acceptance evidence — there is no test suite for this task.

Nothing here runs a build, a test runner, or a formatter; the repo ships no application code that consumes these files, so there is no downstream consumer (Dockerfile, CI config, package build) that a prose edit could break. The plugin manifests reference the `agents/` directory as a whole, not individual files by name, so no manifest edit is implied.

## Coordination

Six sibling cards on the board scope edits into the same two files. Any of them may land first. Before editing, re-locate each anchor by its quoted text rather than by line number, and if a sibling has already added a rule covering the same ground, extend it in place rather than adding a second rule beside it.

- `make-spec-validation-scoped-and-reproducible` — adds to `writer.md` `### Spec authoring rules`. Overlaps W4's neighbourhood, not its content.
- `reconcile-whole-document-on-every-writer-edit` — edits `writer.md` in **both** passes; most likely to touch the same numbered steps as W2/W3. Keep both cross-references; do not drop one to make room.
- `require-citations-for-dependency-claims` — adds an authoring rule to `writer.md` **and** a verification rule to `auditor.md`. The closest neighbour to this story: if it lands first, its `auditor.md` rule may already sit in `## Re-audits are fresh dispatches`. Place A1 after the existing cited-instance paragraph regardless, and check that neither rule reads as overturning the other.
- `surface-card-invalidating-decisions` — adds to `writer.md`'s spec pass and report.
- `own-issue-note-shaping` — may assign the issue-note area to `writer.md`.
- `sequence-acceptance-gate-around-docs-pass` — may edit `auditor.md`'s acceptance-gate section. Disjoint from A1/A2, which touch the re-audit and constraints sections.

If a sibling has already introduced an `### Applying a finding`-equivalent subsection under `## The auditor gate`, fold W1's three paragraphs into it instead of creating a second subsection.

## Deviations from the card

None. All five acceptance criteria are satisfiable as written. Criterion 3 presumes a practice (`a spec resolves one out-of-scope acceptance criterion by naming its owning mechanism`) that `writer.md` does not currently state; W4 states the practice and attaches the sweep to it rather than treating the criterion as unsatisfiable.

## Tasks

- [ ] **W1** — In `plugins/ca77y-engineering/agents/writer.md`, after the *"Dispatch it by qualified name"* paragraph in `## The auditor gate`, add a `### Applying a finding` subsection with three bolded-lead paragraphs matching the surrounding voice:
  - a finding's examples are illustrative unless it says otherwise; they are the sample that made the defect visible, not its definition; only an explicit narrowing in the finding makes the list exhaustive
  - restate the finding as its general property before writing the fix, in one sentence in the form the requirement would take, with the nine-functions-vs-three-functions contrast as the worked example; the restatement is what the fix is written against
  - fix against every instance of the property: enumerate the set from the artifact itself, check the fix against each, name any instance the pass cannot close and why
- [ ] **W2** — In the same file, spec pass step 4: point "Apply its valid findings and rewrite" at `Applying a finding` by name, leaving the rest of the step (discard only with concrete evidence; rerun as a fresh dispatch) intact.
- [ ] **W3** — In the same file, docs pass step 6: point "Apply its valid findings" at `Applying a finding` by name, leaving the rest of the step intact.
- [ ] **W4** — In the same file, in `### Spec authoring rules`, immediately after the *Deviations section* rule, add the bolded-lead rule: a criterion no automated build step can satisfy gets a named owning mechanism (what closes it, when, a Tasks entry marked not the coder's task), and naming one triggers a sweep of every remaining criterion on the card for the same shape — present on the card, absent from Tasks, no stated owner — resolved in the same pass; ending with the failure it prevents.
- [ ] **A1** — In `plugins/ca77y-engineering/agents/auditor.md`, in `## Re-audits are fresh dispatches`, after the *"Resolve a prior round's finding against the exact file and section it cited"* paragraph and before *"Your verdict is your return value"*, add the bolded-lead paragraph: restate the prior finding as its general property, enumerate every instance in the artifact as it now stands, verify each; grade the old finding against its cited instances only; unmet instances elsewhere are a new finding at their own severity per the paragraph above; a revision can be both a correctly applied fix and an open finding.
- [ ] **A2** — In the same file, in `## Constraints`, after the *"Ground every finding in something you actually read"* bullet, add a bullet requiring findings to be written as the property plus the instances that show it, and requiring an explicit statement when a list of instances is exhaustive.
- [ ] **V** — Run the Validation list: `git diff --name-only`, hunk read against the anchor table, the two greps, the manifest-parity loop, and the criterion-by-criterion read. Do not edit `README.md`, `docs/ARCHITECTURE.md`, any other agent definition, or either `plugin.json`.
