# Make every writer edit reconcile the rest of the document

- **Status**: Draft
- **Task**: smr-154-make-every-writer-edit-reconcile-the-rest-of-the-document
- **Last Updated**: 2026-08-06
- **Document Scope**: One unit of work: give `writer.md` a whole-document reconciliation duty in both passes, plus the report line that says what it reconciled

---

## Goal

The `writer` edits the section it was sent to edit and leaves the rest of the artifact
asserting the thing that edit supersedes.

- **In a spec** that ships two live contradictory instructions to the `coder`. Observed:
  a spec gained a post-review amendment in *Design* explicitly superseding an earlier
  rule — a probe function must reset its client on **every** failure branch "including
  `timeout`" — while the *Tasks* checklist further down the same file still instructed
  the coder to "reset `client`/`connecting` on rejection only (not on timeout)". Neither
  reads as stale: the amendment announces itself only in Design, and the Tasks entry
  carries no marker that it predates the amendment. A coder working the checklist
  implements the superseded behaviour; a reviewer checking the diff against the checklist
  reports a false finding.
- **In a docs pass** it re-publishes a claim the product document already forbids.
  Observed: two documents stated a component runs "against a synced/exported copy of the
  SQLite DB", contradicting the product document's explicit principle that the phase is
  *not* built against a hand-exported data copy, and contradicting the architecture
  document's own wording. A docs pass rewrote the paragraphs immediately above and below
  that sentence in both files — renaming a package path, updating a tree diagram,
  rewriting an adjacent bullet — and left the contradictory sentence untouched in both.
  It has survived at least two docs passes. Renaming an old path inside a wrong sentence
  still ships the wrong sentence.

Both failures share one shape: the writer treats *the lines it is mechanically editing*
as the unit of work, when the unit is **the document it just changed**.

**The change.** `plugins/ca77y-engineering/agents/writer.md` gains two named
reconciliation rules — one binding the spec pass, one binding the docs pass — and a
report line in both modes naming what was reconciled outside the section dispatched for.
The spec-pass rule makes an amendment enumerate and edit what it invalidates in the same
pass. The docs-pass rule makes the **paragraph** the unit of review and adds the
project's stated principles as a second standard alongside the shipped tree.

**User value.** A spec stops shipping two live instructions for one decision, so the
`coder` cannot implement the superseded one and `qa` cannot report a false finding
against a stale checklist. A docs pass stops re-publishing a claim the product document
forbids, so a wrong sentence is corrected the first time an editor's eyes cross it rather
than surviving pass after pass.

**Non-goals.**

- **No new agent, no new pipeline step, no gate.** The duty belongs to the agent already
  holding the pen; nothing new validates it. (The docs pass remains ungated — see
  `SMR-171`, which is a separate story.)
- **No change to any other agent definition.** `coder`, `qa`, `auditor`, `analyst`,
  `scribe`, `clerk`, `researcher`, `librarian`, and the `lead` and `board` skills are all
  untouched. In particular this task does **not** ask the `auditor` to detect
  contradictions it does not already look for — its readiness checklist already names
  "contradictions (within the artifact or against other docs it must agree with)".
- **No spec-template change.** Where the mandated sections sit in a spec is `SMR-134`'s
  story, not this one (see *Coordination*).
- **No version bump.** Versions are a deliberate human decision per the root
  [`CLAUDE.md`](../../CLAUDE.md); neither manifest is touched.
- **No edit to either canonical duplicated paragraph** — "Addressing the story worktree."
  or "Working from the board profile." — which would force byte-identical edits across
  five and two files respectively.

## Design

### What the file says today, and why it does not cover either failure

Two places in `plugins/ca77y-engineering/agents/writer.md` are the closest existing
statements of the duty, and each falls short in a different way.

**Spec pass — nothing states the duty at all.** `### Applying a finding` governs how a
finding generalizes to its property, and `### Spec authoring rules` governs what a spec
must contain. Neither says that editing one section obliges the writer to reconcile the
others. The single sentence closest to it — *"An instance you cannot close is named in
your report with the reason"* — is about instances of an audit finding, not about the
document's own internal consistency. So the amendment failure is not a rule being ignored;
it is a rule that does not exist.

**Docs pass — the duty exists but is scoped away from both failures.** Step 5 reads:

> Keep docs honest while writing: if a diagram or statement no longer reflects the system,
> update or remove it. Document only what was actually built. Check the docs you touched
> against the wider tree — contradictions, stale cross-references, duplication, and other
> docs the merged work now makes wrong — and fix them in the same pass.

Two gaps. **The standard is the shipped tree only** — "no longer reflects the system",
"only what was actually built". The observed failure was a sentence that reflected no
system at all: it contradicted a *stated principle* about what the phase is deliberately
not built against. Checked against the tree, such a sentence is merely unverifiable, not
wrong. **And there is no unit of sweep.** "The docs you touched" is satisfied by a writer
that read the two paragraphs it edited; nothing says the sentences *inside* an edited
paragraph are in scope. That is precisely how a sentence survived a pass that rewrote the
paragraphs on both sides of it.

### The spec-pass rule

A new authoring rule, placed as the **first** rule under `### Spec authoring rules`
because it governs every rule after it and every revision round, led by a bold sentence in
the house style — proposed: **"An edit to one section of a spec is an edit to the whole
spec."** It must state, in the definition's own voice:

- **The trigger is any superseding edit**, not only an audit revision: a decision settled
  mid-authoring, a `lead` course correction, and an `auditor` finding all produce the same
  hazard. (An amendment arriving through `### Applying a finding` is the common path, so
  that section gains a single cross-reference clause pointing here — a pointer, never a
  second copy of the rule.)
- **Name the decision, then enumerate what it invalidates.** Write the superseding
  decision as one sentence, then search the whole spec for the terms that decision is
  expressed in — the identifiers, the behaviour words, and the negation of both — and read
  every hit. The enumeration is over the spec's own sections, not over the ones the
  amendment happened to mention.
- **The sweep list is every other section the spec carries**: Goal, Design (including the
  Boundary, Coordination, and Deviations content wherever this spec shape places it), every
  Requirements scenario, the **Validation list** where the spec carries one, and every
  Tasks entry.
- **Edit them in the same pass, never as a follow-up.** A superseded entry is rewritten or
  deleted. Annotating it as historical — *"previously we said X"* — is not reconciliation
  unless the document is explicitly a changelog, because a `coder` reading the checklist
  still finds an instruction there.
- **The invariant, stated as such:** the spec never carries two live instructions for one
  decision. Two sections disagreeing about one decision is a defect regardless of which is
  newer, and the newer one wins by being applied, not by being later on the page.
- **An entry that cannot be reconciled in the same pass is named in the report** with the
  reason — a stated gap rather than an unnoticed one, mirroring the wording already used
  by *Applying a finding*.

### The docs-pass rule

Step 5 of `## Docs pass` is **rewritten in place** to one sentence naming the duty and
pointing at a new subsection — proposed `### Reconciling what you touch`, placed after the
numbered list, mirroring how the spec pass carries `### Applying a finding` and
`### Spec authoring rules` after its own numbered steps. Step 5's current content moves
into that subsection; it is not left behind as a weaker second statement of the same duty
(see *Requirement: `writer.md` states each duty exactly once*).

The subsection must state:

- **The unit is the paragraph, and every sentence in it.** Touching a paragraph — a
  prose block, a list item, a table row, or a diagram — means every sentence in it is in
  scope, not only the lines being mechanically edited. Editing a paragraph is vouching for
  it.
- **Two standards, both applied.** The shipped system *and* the project's stated
  principles: a sentence that contradicts either is corrected or removed. The second
  standard is the one today's wording lacks, and it is what catches a sentence describing
  a thing the project has explicitly decided not to build.
- **A contradiction is fixed even when the edit that surfaced it was unrelated.** The
  reason it is in the paragraph is not the test; whether it is true is.
- **Where the stated principles live is discovered from project context**, never
  hardcoded — the project's product or principles document where its context names one,
  and the project's settled source-of-truth docs where it does not. When a project states
  no principles at all, the writer says so in its report and checks against the shipped
  tree alone, so a sweep that could not run is never reported as a sweep that came back
  clean.
- **The guard: when the principle itself is the stale side, report — do not rewrite it.**
  A stated principle is a statement of what the product is *for*, and correcting a
  document to match a doc is not the same as deciding the product changed direction. This
  mirrors the guard already in the board-follow-up rule — *"the one thing you never do
  either way is rewrite what the story is for"* — and keeps the writer from silently
  retiring a principle to make a sentence pass.
- **Diagrams count.** A Mermaid node label or a tree diagram asserting the superseded
  thing is a sentence for this purpose.

### The report line

`## Final report` gains one line in **both** mode lists — the spec pass's and the docs
pass's — naming any contradiction found and fixed outside the section the writer was
dispatched to change, and any left unfixed with the reason. The card's fifth criterion is
unqualified about mode, and both passes can surface one, so a single-mode report line
would leave half the duty invisible.

### Reconciling `writer.md` with itself

The change is small in volume and large in the number of places that must agree, which is
the same hazard the card is about. Every edit below is a **replacement**, not an addition
beside the text it supersedes:

| Site in `writer.md` | Edit |
| --- | --- |
| Frontmatter `description` | Verify it does not state behaviour this change replaces; change only if it does. Expected: no change — it describes the two modes and the gating model, neither of which moves. State the outcome in the report either way. |
| `### Applying a finding` | Append one cross-reference clause to its third rule, pointing at the new spec-pass rule by name. No restatement of it. |
| `### Spec authoring rules` | New rule, first in the section. |
| `## Docs pass` step 5 | Rewritten to a single sentence naming the duty and pointing at the new subsection. Its current content moves into that subsection — it is not duplicated. |
| `## Docs pass`, after step 7 | New `### Reconciling what you touch` subsection. |
| `## Final report` | One new line in each of the two mode lists. |

Nothing else in the file is touched. In particular `## Boundaries` still holds unchanged:
reconciling a document one is already editing is authoring, not gating, so *"You author the
artifact and return it. You do not gate, validate, or dispatch other agents"* remains true.

### How this is validated

**This repository has no test runner, no build, and no validation command** — the
deliverable is a Markdown agent definition, so there is nothing to execute and no scenario
test to write. Every requirement below is therefore verified by **inspection of the shipped
`plugins/ca77y-engineering/agents/writer.md`**, and each scenario names the check
explicitly in a `VERIFIED BY` bullet. The `coder` writes no tests for this task; the
mechanical checks are the greps and reads listed in *Tasks*. (This is the general gap
`SMR-157` exists to close for the pipeline as a whole; this spec states the substitute
locally rather than waiting for it — see *Coordination*.)

**What inspection cannot prove**, stated plainly so a passing gate is not read as more
than it is: that the shipped text is *present and unambiguous* is not evidence that a
future `writer` obeys it. The alternative cause for "no contradiction shipped on the next
run" is simply that the next run's document had none. The only real proof is a live
pipeline run, which the project's own direction requires (`docs/PRODUCT.md`: *"Behavior
changes are validated by running the pipeline on a live project, not by reasoning about
the prompt text"*). That run is owned and scheduled below in *Tasks*; it is **not** a gate
on this card, whose five criteria are all satisfiable by inspection of the shipped file.

**No third-party or vendored dependency behaviour is claimed anywhere in this spec**, so
no dependency citation is owed. The one behavioural claim about tooling — that the root
`CLAUDE.md` drift `grep`s print `1` — is a claim about this repository's own files, and is
verified by running them (below).

### Boundary

- **The `coder` edits exactly one file**: `plugins/ca77y-engineering/agents/writer.md`, at
  the six sites tabled above.
- **Owned by the docs pass, not the `coder`**: the root `README.md` `### writer` section,
  which `docs/CLAUDE.md` makes the user-facing description of every agent, to be updated
  when an agent's behaviour changes. Assigned in *Tasks*.
- **Out of bounds**: every other agent definition and both skills; `docs/_templates/*`;
  both `plugin.json` manifests (`writer.md` is already registered in the Claude manifest's
  `agents` array — no registration change is needed); any `version` field;
  `docs/ARCHITECTURE.md`, which covers structure and dispatch rather than per-agent prose
  and which this change does not alter; and `docs/PRODUCT.md`, whose one-sentence
  correction was already applied during this spec pass (see *Reconciliation applied during
  this spec pass*) and needs nothing further.
- **Both canonical duplicated paragraphs are untouchable here.** "Addressing the story
  worktree." (five files) and "Working from the board profile." (two files) must remain
  byte-identical; the root `CLAUDE.md` drift checks must still print `1` after the build.

### Coordination

Sibling cards were searched through the profile's `search` binding (Linear,
`list_issues` over project `Agentic Claude`). Four touch the same file or the same
obligation and are all unstarted, so whichever lands first must be detected and reused
rather than re-added:

- **`SMR-174` — "Have the docs pass sweep the maintenance files that describe the artifact
  it changed"** is the nearest neighbour: same file, same docs pass, an adjacent sweep
  obligation. The two are genuinely different — this card's sweep is *inside the documents
  being edited* (paragraph-level, against stated principles); `SMR-174`'s is *outward*, to
  maintenance and contributor files that are not documentation at all. If `SMR-174` lands
  first, its docs-pass sweep section already exists: add this card's paragraph-level rule
  to that structure rather than creating a second, competing sweep subsection.
- **`SMR-134` — "Pin where the writer's mandated spec sections live"** owns where Boundary,
  Validation, Deviations, and Coordination sit in a spec. This card's spec-pass rule
  *names* those sections in its sweep list but must not pin their placement; if `SMR-134`
  lands first, the sweep list should be phrased against the placement it settles.
- **`SMR-176` — "Count an agent definition's own frontmatter description as an edit site"**
  is the general form of the frontmatter row in the table above. This build applies its
  lesson once, locally; it does not implement the general rule.
- **`SMR-157` — "Give the pipeline a prose-deliverable mode for tasks with no test
  runner"** is the general form of *How this is validated* above. This spec states the
  inspection-based substitute for itself only.

Two further siblings edit the same file but in regions this change does not touch, so no
collision is expected: `SMR-135` (docs-pass routing table) and `SMR-171` (validating the
docs pass's output). `SMR-151` (coordinating shared-doc edits across concurrent stories)
would, if it landed, own the `README.md` hand-off this spec assigns manually in *Tasks*.

### Reconciliation applied during this spec pass

Practising the rule being specified, one contradiction was found outside the section this
pass was dispatched to change, and **fixed in the same pass**:

`docs/PRODUCT.md`, the *"The human owns the board"* principle, asserted **"Everything else
— terminal states, card content, stale relationships — is reported, never applied."** That
is the logical opposite of what the rest of the shipped product now says: this repo's
`docs/ISSUE_TRACKING.md` declares that agents **edit content** — *"fix it on the issue
rather than reporting it and hoping someone gets to it"* — the root `README.md` says the
`writer` *"applies it where you authorised that"*, and both `writer.md` and `auditor.md`
carry *"an authorised correction is applied, not described"*. The sentence was corrected in
place to keep the principle (terminal states are always the human's) while deferring to the
project's declaration for everything else. The surrounding bullet's other sentences were
re-read against the same standard and hold. This edit is **not** part of the `coder`'s
scope; it is already applied in this worktree.

### Deviations from the card

No criterion is unsatisfiable, and none was narrowed. Two are satisfied by a deliberate
**generalization**, recorded here because the acceptance gate reads the card's literal
wording:

1. Criterion 3 says the docs pass checks a paragraph against **"the product document's
   stated principles"**. The shipped rule must not name `docs/PRODUCT.md` or presume every
   target project has such a document: `docs/PRODUCT.md` itself makes *"Agents discover,
   they do not assume. Hardcoded paths are a defect"* a product principle. The rule
   therefore reads as *the project's stated-principles document where its context names
   one, its settled source-of-truth docs where it does not, and a reported gap where it
   states none*. This is strictly broader than the criterion, and on this repository it
   resolves to exactly the document the criterion means.
2. Criterion 1 names **"the Validation list"** among the sections an amendment must
   reconcile. Specs in this project have no scaffolded Validation section —
   `docs/_templates/spec.md` scaffolds Goal → Design → Requirements → Tasks only, which is
   `SMR-134`'s subject. The shipped rule names the Validation list explicitly in its sweep
   list, qualified as *where the spec carries one*, so the criterion is met without
   asserting a section the template does not yet define.

No card criterion was edited, and none needed to be.

## Requirements

Every scenario is verified by reading the shipped
`plugins/ca77y-engineering/agents/writer.md`; there is no test runner in this repository
(see *How this is validated*).

### Requirement: A spec amendment reconciles the whole spec in the same pass

*Card criterion 1.*

#### Scenario: the sweep list names every section of the spec

- **WHEN** the writer makes an edit to one section of a spec that supersedes a decision
  stated elsewhere in it — from an `auditor` finding, a `lead` course correction, or a
  decision it settles while authoring
- **THEN** `writer.md` requires it to reconcile every other section of that spec in the
  same pass, naming at least the Tasks entries, the Requirements scenarios, and the
  Validation list where the spec carries one, alongside Goal and Design
- **VERIFIED BY** reading the new rule under `### Spec authoring rules` and confirming all
  three named section types appear in its sweep list

#### Scenario: reconciliation is not deferrable

- **WHEN** an amendment's reconciliation would be convenient to leave for a later round
- **THEN** `writer.md` requires it in the same pass and states that an entry which cannot
  be reconciled is named in the report with its reason, rather than left silently stale
- **VERIFIED BY** reading the same rule for the "same pass, not a follow-up" obligation and
  for the report-the-unclosable-entry sentence

### Requirement: An amendment enumerates what it invalidates, and no decision stays live twice

*Card criterion 2.*

#### Scenario: enumeration precedes the fix

- **WHEN** the writer writes an amendment
- **THEN** `writer.md` requires it to state the superseding decision, enumerate the
  existing entries that decision invalidates by searching the whole document for the terms
  the decision is expressed in, and edit each of them in the same pass
- **VERIFIED BY** reading the rule for the name-the-decision, search-the-whole-document,
  and edit-each steps

#### Scenario: two live instructions are a defect

- **WHEN** an amended spec is read end to end
- **THEN** `writer.md` states the invariant that the spec never carries two live
  instructions for one decision, and that annotating a superseded entry as historical does
  not satisfy it — the entry is rewritten or deleted
- **VERIFIED BY** reading the rule for the stated invariant and for the
  rejection of historical annotation

### Requirement: The docs pass reviews every sentence of a paragraph it touches

*Card criterion 3.*

#### Scenario: the paragraph is the unit

- **WHEN** the docs pass edits any part of a paragraph, list item, table row, or diagram
- **THEN** `writer.md` puts every sentence in it in scope — not only the lines being
  mechanically edited
- **VERIFIED BY** reading `### Reconciling what you touch` for the paragraph-as-unit
  statement

#### Scenario: stated principles are the second standard

- **WHEN** the docs pass checks a sentence it now owns
- **THEN** `writer.md` requires it checked against the project's stated principles as well
  as against the shipped tree, with the principles document discovered from project context
  rather than named, and a project that states none reported as such rather than passed
  silently
- **VERIFIED BY** reading the same subsection for both standards, for the
  discover-don't-hardcode phrasing, and for the report-when-absent clause

### Requirement: A sentence contradicting a stated principle is corrected even when unrelated

*Card criterion 4.*

#### Scenario: relevance to the edit is not the test

- **WHEN** a sentence inside a touched paragraph contradicts a stated product principle and
  has nothing to do with the edit that surfaced it
- **THEN** `writer.md` requires it corrected or removed in the same pass anyway
- **VERIFIED BY** reading the subsection for the explicit "even when the edit that surfaced
  it was unrelated" obligation

#### Scenario: the principle itself may be the stale side

- **WHEN** the writer cannot tell whether the sentence or the principle is stale, or
  concludes the principle is
- **THEN** `writer.md` requires it reported rather than rewritten, because a stated
  principle is a statement of what the product is for
- **VERIFIED BY** reading the subsection for that guard

### Requirement: The final report names what was reconciled outside the dispatched section

*Card criterion 5.*

#### Scenario: both modes report it

- **WHEN** the writer finishes either a spec pass or a docs pass
- **THEN** `## Final report` requires it to name any contradiction it found and fixed
  outside the section it was dispatched to change, and any it left unfixed with the reason
- **VERIFIED BY** confirming the line is present in **both** the `**Spec pass:**` and
  `**Docs pass:**` report lists

### Requirement: `writer.md` states each duty exactly once

*Not from the card — the internal-consistency property this change is itself about.*

#### Scenario: the superseded step-5 text is replaced, not duplicated

- **WHEN** the shipped `writer.md` is read end to end
- **THEN** the docs pass's reconciliation duty is stated in exactly one place, with step 5
  pointing at it rather than restating it, and the pre-existing step-5 sentences about
  diagrams, cross-references, and duplication live inside that one place
- **VERIFIED BY** reading `## Docs pass` step 5 and `### Reconciling what you touch`
  together and confirming neither restates the other's obligations

#### Scenario: the spec-pass rule is cross-referenced, not copied

- **WHEN** `### Applying a finding` is read
- **THEN** it points at the new spec-authoring rule by name and does not carry a second
  copy of it
- **VERIFIED BY** reading both sections

### Requirement: The blast radius is exactly one file

*Not from the card — the repo's standing constraints.*

#### Scenario: canonical paragraphs and manifests are untouched

- **WHEN** the build's diff is reviewed
- **THEN** it changes only `plugins/ca77y-engineering/agents/writer.md` (plus the
  docs-pass-owned `README.md` update, later), both root `CLAUDE.md` drift `grep`s still
  print `1`, and no `version` field in either manifest of any plugin has changed
- **VERIFIED BY** `git -C <worktree> diff --stat` against the spec commit, plus running the
  two `grep` pipelines and the manifest-parity loop from the root `CLAUDE.md`

## Tasks

- [ ] Add the new rule as the **first** rule under `### Spec authoring rules` in
      `plugins/ca77y-engineering/agents/writer.md`: trigger, name-the-decision,
      whole-document search, the sweep list (Goal, Design, every Requirements scenario, the
      Validation list where one exists, every Tasks entry), same-pass obligation, the
      no-two-live-instructions invariant, rejection of historical annotation, and the
      report-the-unclosable-entry clause
- [ ] Append the single cross-reference clause to the third rule of
      `### Applying a finding`, pointing at that rule by name — no restatement
- [ ] Rewrite `## Docs pass` step 5 to one sentence naming the duty and pointing at
      `### Reconciling what you touch`; move its current content into that subsection so
      the duty is stated once
- [ ] Add `### Reconciling what you touch` after the docs pass's numbered list: paragraph
      as unit, both standards, corrected-even-when-unrelated, discover-the-principles-doc,
      report-when-a-project-states-none, the do-not-rewrite-a-principle guard, and diagrams
      counting as sentences
- [ ] Add the reconciliation line to **both** mode lists in `## Final report`
- [ ] Check the frontmatter `description` against the shipped behaviour; edit only if it
      now states something this change replaced, and report the outcome either way
- [ ] Verify the blast radius: `git diff --stat` shows only `writer.md`; both root
      `CLAUDE.md` drift `grep`s print `1`; the manifest-parity loop prints `ok` for every
      plugin; no `version` field changed
- [ ] **Docs pass, not the `coder`:** update the root `README.md` `### writer` section to
      describe the reconciliation duty in both modes, per `docs/CLAUDE.md`'s rule that the
      README is the user-facing description of every agent. Nothing in the card's five
      criteria depends on it, so the acceptance gate will not catch its absence — it is
      assigned here so it cannot be dropped
- [ ] **Neither the `coder` nor the docs pass — the next pipeline run on this repo:**
      validate the behaviour change on a live run, per `docs/PRODUCT.md`'s *"Behavior
      changes are validated by running the pipeline on a live project"*. The next story
      whose writer amends a spec or edits a doc paragraph is the observation; report
      whether the shipped wording actually produced a reconciliation. This is **not** a
      gate on this card
