# Surface decisions that invalidate another card's recorded relationship

- **Status**: Draft
- **Task**: surface-card-invalidating-decisions
- **Last Updated**: 2026-07-23
- **Document Scope**: One unit of work: give the `writer` an obligation to catch, while speccing, any card whose recorded relationship a settled decision now contradicts — including the spec's own source card — and give the `lead` an obligation to relay those contradictions to the human who owns the board. Reporting-only; no board-write access.

---

## Goal

**The problem.** A story card can carry hand-written coordination prose describing its relationship to a sibling — "these two root-structure stories are parallel", "prefer project references over relocating the app". When a spec settles a decision that changes that relationship, only the card being *newly blocked* tends to get updated (by the human). The card the spec was actually written *from* keeps asserting the old, now-contradicted arrangement, and nobody is responsible for noticing. In the incident that motivated this task, a decisions session settled that story A now relocates a subdirectory, making A and B sequential. Card B was updated ("no longer parallel", plus a blocking marker); card A still read "these two are parallel" and "prefer project references over relocating the app" — the exact opposite of the first decision A's own spec settles. The spec's follow-ups named only the *other* card (B), never noticing that A — its own source card — had become the stale side.

**The change.** Two prose edits, to two agent definitions:

- `writer.md` gains a spec-authoring rule: while speccing, the `writer` checks every decision the spec settles against the relationship/dependency prose recorded on **any** card — its own source card included — and reports each contradiction as a named board follow-up in its report. Detection is the `writer`'s own obligation, discharged by searching sibling cards, not something delegated to the `auditor`.
- `lead.md` gains a relay obligation: it carries the `writer`'s board follow-ups into **both** its final report to the user **and** the PR description it writes when opening the PR, so the human who owns the board sees them without opening the spec.

**User value.** The human owning the board is told, in the two places they actually read (the lead's final report and the PR), exactly which card contradicts a just-settled decision, which sentence is now wrong, and what it should say — so a stale card is corrected by its owner instead of silently persisting to mislead the next reader.

**Non-goals.**

- **No card edits, ever.** The pipeline deliberately never writes the board (the board is the human's). This task adds a *report artifact* and a *relay obligation*, not board-write access for either agent. See *Boundary* and Requirement 5.
- Not changing the `analyst`'s existing write-time board reconciliation, nor the `auditor`'s gates. The `writer` no longer relies on an audit to catch the pair, but the `auditor` is not being given a new check here.
- Not touching `ARCHITECTURE.md` or the root `README.md`. Their per-agent prose is the docs pass's job after this ships (see *Boundary*).

## Design

**Where the edits land.**

- `writer.md` → the `### Spec authoring rules` block (currently ends with the **"Shared infrastructure needs a Coordination note"** rule). The new detection/reporting rule is added here as its own rule.
- `writer.md` → the `## Final report` section's **"Spec pass:"** line, so the board follow-ups are named as part of the spec-pass report format (not just buried in the new rule).
- `lead.md` → the `## Final handoff` paragraph (currently line ~105) — add the relay of the writer's board follow-ups to the user.
- `lead.md` → **Workflow step 8 ("Ship")** (currently line ~57) — add the board follow-ups to the enumerated PR-description contents.
- `lead.md` → **Workflow step 3 ("Spec")** — a short clause so the follow-ups the writer returns are retained and carried forward to steps 8 / Final handoff, rather than dropped when the spec is committed. (Retention is what makes the two relay points reachable; without it the follow-ups exist only in the spec-pass return value the lead has already moved past.)

**Design decision — new rule, not an extension of the Coordination-note rule.** Criterion 2's parenthetical asks whether this is a new rule beside the existing **"Shared infrastructure needs a Coordination note"** rule, or an extension of it. It is a **new, distinct rule placed alongside it**, for these reasons:

- **Different trigger.** The Coordination-note rule fires on a *provisioning collision* — two siblings each independently scoping the same new shared infrastructure. This rule fires on a *semantic contradiction* — a decision the spec settles is the logical opposite of relationship/dependency prose already recorded on a card.
- **Different owning artifact.** The Coordination-note rule's remedy is a **coder-facing note inside the spec** ("if `<sibling>` lands first, detect and reuse its `<infra>`"). This rule's remedy is a **human-facing board follow-up in the writer's report**, relayed by the lead — never anything inside the spec's Tasks, and never a card edit.
- **Shared habit, referenced not merged.** Both rules require the same sweep of sibling cards, so the new rule explicitly reuses that "search the sibling story cards" habit the Coordination-note rule already establishes. Folding them into one rule would blur two different triggers and two different remedies; keeping them adjacent and cross-referencing the shared search keeps each single-purpose. The new rule is worded to name that it sits beside the Coordination-note rule and shares its sibling-card sweep.

**Report-only, by construction.** Both edits are worded so the obligation is discharged by *reporting*, and both explicitly disclaim card edits:

- The `writer` rule states the contradiction is surfaced as a board follow-up in the report and that the `writer` does not edit the card (consistent with the pipeline principle that the board is the human's).
- The `lead` relay states it *relays* the follow-ups without acting on them, and `lead.md`'s existing boundary **"Do not write the board. Card status, including Done, is the user's."** is left intact — this task neither removes nor weakens it, and adds no counterpart write-permission.

**A board follow-up's shape.** Each follow-up names three things, precise enough to act on without opening the spec: (1) *which card* (by slug/title), (2) *which sentence* (quoted or its substance), and (3) *what it should now say* given the decision that contradicts it.

**Prose deliverable — falsification is by inspection.** The deliverable is agent-definition Markdown. The repo's own `docs/ARCHITECTURE.md` states the agent `.md` files under `plugins/*/agents/` **are the product**; there is no test runner, no build, and no CI for these files. Every Requirements scenario below is therefore falsifiable by *reading the changed file* and pointing at (or quoting) the exact sentence/section that satisfies it — not by running a suite. This is stated so a reader does not treat the absence of a test command as an unfinished spec. See *Validation* for the real consumers to check instead.

## Boundary

**In scope — the `coder` edits exactly two files, prose only:**

- `plugins/ca77y-engineering/agents/writer.md` — the `### Spec authoring rules` block (new rule) and the `## Final report` "Spec pass:" line.
- `plugins/ca77y-engineering/agents/lead.md` — the `## Final handoff` paragraph, Workflow step 8 ("Ship"), and Workflow step 3 ("Spec") retention clause.

**Out of scope — do not touch:**

- Any card under `docs/tasks/*.md`. This task does not edit the board, and its own card is the human's.
- The two plugin manifests (`plugins/ca77y-engineering/plugin.json`, `plugins/ca77y-engineering/.claude-plugin/plugin.json`) — no version bump, no manifest edit. Version bumps are a human decision (root `CLAUDE.md`).
- The byte-identical **"Addressing the story worktree."** paragraph in `writer.md` and `lead.md` — the edits land *outside* that paragraph, leaving it identical across all five agent files (`lead`, `coder`, `writer`, `qa`, `auditor`).
- `docs/ARCHITECTURE.md` and the root `README.md` — their per-agent prose is reconciled by the **docs pass** after this ships, not by the `coder` in this build. (Left out deliberately to keep the change to the two files the card scopes; see *Deviations*.)

**No test runner.** There is no build, test suite, or validation command for these files. Each scenario is closed by the `coder` making the prose edit and by inspection of the changed file — the `coder` should quote the line that satisfies each scenario, or name what is missing. Failing to find a test runner is the expected result here, not a blocker. Every one of the five acceptance criteria is a `coder`-owned prose edit closable by inspection; none is owned by the docs pass or a manual reproduction, so no criterion needs a separate owning mechanism.

## Coordination

Several sibling cards also plan to touch these two files (both are currently Todo/Backlog, not in-flight — neither has a worktree or branch today — but either may land before or alongside this one). A `coder` building this from one card has no other signal these collisions exist, so:

- **`give-pipeline-a-prose-deliverable-mode`** (priority 🔺) also rewrites `writer.md`'s `### Spec authoring rules` block (it names the prose-deliverable case in those rules). **If it lands first**, the spec-authoring rules block will already carry a prose-deliverable rule and possibly renamed/rephrased neighbours — add this task's contradiction rule as an *additional* rule alongside the existing ones and the Coordination-note rule, detecting the current shape of the block rather than assuming it still ends where this spec's Design says; do not clobber the sibling's rule.
- **`coordinate-shared-doc-edits-across-concurrent-stories`** (priority 🔼) edits `writer.md`'s docs pass and `lead.md` (for detecting collisions and surfacing deferrals). Its `lead.md` edits are in the docs/ship/handoff area this task also touches. **If it lands first**, merge additively into `## Final handoff` and step 8 rather than replacing what it added — both tasks add distinct relay obligations to the same report/PR-description surface.

If this task lands first, the same additive expectation applies in reverse for those siblings.

## Deviations from the card

No card criterion is unsatisfiable, so there is no criterion being overridden. One scoping choice is recorded here for the acceptance gate's benefit:

- The card scopes "exactly two files" (`writer.md`, `lead.md`) and separately asks (Validation, per the lead's dispatch) that cross-references stay consistent with `docs/ARCHITECTURE.md`'s description of the flow. These are compatible: the `coder` **checks** `ARCHITECTURE.md` for consistency (Validation) but does **not edit** it — any needed `ARCHITECTURE.md`/`README.md` reconciliation is left to the docs pass, honouring the two-file scope. This is a deliberate scoping decision, not a narrowed criterion.

## Requirements

### Requirement: A decision contradicting any card's recorded relationship is one two-sided finding

The `writer.md` spec-authoring rule covers the spec's **own source card** as the stale side, not only a counterpart card, and treats both cards as a single finding.

#### Scenario: The rule names the own-source-card case explicitly

- **WHEN** a reader inspects the new rule in `writer.md`'s `### Spec authoring rules` block
- **THEN** it states that a settled decision may contradict a relationship recorded on **any** card, and calls out — in words — that the spec's **own source card** can be the stale side, not just "the other card"

#### Scenario: Both sides are one finding, not a counterpart-only edit

- **WHEN** a reader inspects that same rule
- **THEN** it directs the `writer` to record **both** the newly-affected card and the now-stale card as a **single finding**, explicitly rejecting the failure of surfacing only the counterpart card while missing the source card

### Requirement: The writer searches sibling cards to detect the contradiction, not the auditor

Detection is the `writer`'s own obligation during the spec pass, discharged by searching sibling cards for the relationship/dependency prose a decision changes — not delegated to an audit.

#### Scenario: The rule mandates a sibling-card search

- **WHEN** a reader inspects the new rule
- **THEN** it instructs the `writer` to search the sibling story cards for coordination or dependency prose describing the relationship each settled decision changes, and states the check is the writer's own (it does not rely on the `auditor` to catch the pair)

#### Scenario: The rule is distinct from, and cross-references, the Coordination-note rule

- **WHEN** a reader compares the new rule to the existing **"Shared infrastructure needs a Coordination note"** rule in the same block
- **THEN** the new rule is a separate rule placed alongside it (not an edit that merges the two), and it references the shared sibling-card sweep rather than re-deriving it — matching the Design decision recorded above

### Requirement: Each contradiction is reported as a named board follow-up

The contradiction is surfaced in the `writer`'s spec-pass report as a board follow-up precise enough to act on without opening the spec.

#### Scenario: The follow-up names card, sentence, and correction

- **WHEN** a reader inspects the new rule and the `## Final report` "Spec pass:" line in `writer.md`
- **THEN** together they require each contradiction to be reported as a named board follow-up giving **which card**, **which sentence** (quoted or its substance), and **what it should now say** — and the "Spec pass:" report line names board follow-ups as part of the spec-pass report format

### Requirement: The lead relays the follow-ups in both the final report and the PR description

The `lead` surfaces the writer's board follow-ups in the two places the human reads — its final report and the PR it opens.

#### Scenario: Final handoff lists the follow-ups

- **WHEN** a reader inspects `lead.md`'s `## Final handoff` section
- **THEN** it directs the `lead` to relay the writer's board follow-ups (card / stale sentence / correction) to the user

#### Scenario: The PR description includes the follow-ups

- **WHEN** a reader inspects `lead.md`'s Workflow step 8 ("Ship")
- **THEN** the enumerated PR-description contents include the writer's board follow-ups, so a human sees them on the PR without opening the spec

#### Scenario: The follow-ups are retained from the spec pass

- **WHEN** a reader inspects `lead.md`'s Workflow step 3 ("Spec")
- **THEN** it states the `lead` retains the board follow-ups the writer returns from the spec pass and carries them forward to step 8 and the final handoff, so they are not lost when the spec is committed

### Requirement: Neither agent gains board-write access — the fix is reporting-only

The change adds a report artifact and a relay obligation, and explicitly grants no card-write permission to either agent.

#### Scenario: The writer rule is report-only

- **WHEN** a reader inspects the new `writer.md` rule
- **THEN** it states the `writer` surfaces the contradiction as a board follow-up in its report and does **not** edit the card (the board is the human's)

#### Scenario: The lead relay is report-only and the board-write boundary is intact

- **WHEN** a reader inspects `lead.md`'s new relay wording and its Boundaries section
- **THEN** the relay is worded as relaying the follow-ups without acting on them, and the existing boundary **"Do not write the board. Card status, including Done, is the user's."** remains present and unweakened, with no new clause granting either agent card-write access

## Validation

No test suite exists for these files; validate by inspection of the real consumers:

- **Both changed files parse as before.** `writer.md` and `lead.md` remain valid agent definitions — frontmatter (`name`, `description`, `model`, `effort`) untouched, section structure intact.
- **The "Addressing the story worktree." paragraph is undisturbed.** Confirm the edits land outside that paragraph and it stays byte-identical across all five agent files. Run (must print `1`):
  ```bash
  grep -h '^\*\*Addressing the story worktree\.\*\*' \
    plugins/ca77y-engineering/agents/{lead,coder,writer,qa,auditor}.md | sort -u | wc -l
  ```
- **Cross-references stay consistent.** The new `writer.md` rule and the new `lead.md` relay describe the same artifact (the writer produces board follow-ups; the lead relays them) — check the two files agree with each other, and that neither contradicts `docs/ARCHITECTURE.md`'s description of the flat topology (writer authors and returns; lead orchestrates, commits, relays). The "board is the human's" principle lives in `lead.md`'s Boundaries and `docs/tasks/CLAUDE.md`, not in `ARCHITECTURE.md` — confirm the edits stay consistent with it there. Do not edit `ARCHITECTURE.md`.
- **Manifests untouched.** No change to either `plugin.json`; no version bump. (Named for completeness — this task does not touch them, so they need no re-verification beyond confirming they are unchanged.)

## Tasks

- [ ] In `writer.md`, add a new spec-authoring rule after **"Shared infrastructure needs a Coordination note"** in `### Spec authoring rules`: when a settled decision contradicts relationship/dependency prose on **any** card (own source card included), search the sibling cards, treat both sides as one finding, and report each as a named board follow-up (card / sentence / correction); the `writer` does not edit the card. Reference — do not merge with — the Coordination-note rule's sibling-card sweep.
- [ ] In `writer.md`, extend the `## Final report` "Spec pass:" line to name the board follow-ups (card / stale sentence / correction) as part of the spec-pass report format.
- [ ] In `lead.md`, extend Workflow step 3 ("Spec") so the `lead` retains the writer's board follow-ups and carries them forward.
- [ ] In `lead.md`, extend Workflow step 8 ("Ship") so the PR-description contents include the writer's board follow-ups.
- [ ] In `lead.md`, extend `## Final handoff` so the `lead` relays the board follow-ups to the user.
- [ ] Confirm reporting-only: the new `writer.md` rule and `lead.md` relay disclaim card edits; `lead.md`'s "Do not write the board" boundary is left intact; no new card-write permission is added to either agent.
- [ ] Run the "Addressing the story worktree." grep check (prints `1`); confirm edits landed outside that paragraph; confirm manifests and versions unchanged; confirm `writer.md`/`lead.md`/`ARCHITECTURE.md` cross-references agree.
- [ ] Not the `coder`'s task — docs pass: reconcile `docs/ARCHITECTURE.md` and the root `README.md` per-agent prose with the new writer report artifact and lead relay obligation, after this ships.
