# Raise production hazards the coder worked around as findings

- **Status**: Draft
- **Task**: raise-production-hazards-as-findings
- **Last Updated**: 2026-07-23
- **Document Scope**: One unit of work: give the `coder` a channel to raise a production hazard it worked around as an explicit finding, and make the `lead` carry that finding into the PR — by editing two agent-definition files.

---

## Goal

**Problem.** When the `coder` works around a spec scenario because a *production* dependency behaves badly — not because the test harness is awkward — the finding has no channel out of the unit except the diff itself. It gets written up as a rationale comment on a test fixture, where it reads as a justification for a fixture choice rather than as a reported production risk. A rationale comment and a reported production defect are different artifacts with different readers: the comment alone routes a production risk to whoever next edits that test file, not to the human shipping the change.

**Change.** Two prose edits to the engineering plugin's agent definitions:

1. `plugins/ca77y-engineering/agents/coder.md` — teach the coder to distinguish a test-harness inconvenience from a production hazard when it works around a scenario, and to raise any production hazard as an explicit finding in its report to the `lead` (naming the dependency and version, the observed behaviour, and the affected spec scenario or acceptance step) in addition to any code/test comment it warrants. This **extends the existing escalation rule and the Output report contract** rather than opening a competing channel.
2. `plugins/ca77y-engineering/agents/lead.md` — make the `lead` carry any hazard findings the coder reports into the pull request (at open, and via PR update when a hazard surfaces in a later round) and into its final handoff, so the hazard reaches the human via the PR rather than being lost in the agent transcript.

**User value.** A production risk the coder discovered while building reaches the human reviewer through the durable PR record, not only through a comment on a test file that a future editor might read.

**Non-goals.**
- No change to any of the other three agents that carry the byte-identical *Addressing the story worktree.* paragraph (`writer.md`, `qa.md`, `auditor.md`). This task deliberately does **not** touch that shared paragraph, so the five-file byte-identical invariant is untouched and must stay intact.
- No product/runtime code, no plugin `version` bump (version changes are a separate human decision).
- No new escalation channel, mechanism, or report section that competes with or duplicates the existing escalation rule / Output contract — the requirement is to broaden what already exists.
- Updating the user-facing `README.md` / `ARCHITECTURE.md` to reflect the changed coder/lead behaviour is **not the coder's task** — it is owned by the `writer`'s docs pass (see *Deviations & ownership* below).

## Design

Both deliverables are prose edits to Markdown agent-definition files. There is no code path and no automated test that can exercise instruction prose, so every acceptance scenario below is **verified by inspection of the edited agent-definition text** — the WHEN/THEN reads as "WHEN a reader in situation X consults the edited file THEN the file instructs them to do Y." This is stated plainly here so the Requirements are read as text-content assertions, not runtime behaviours. The one mechanical check available is the repo's CLAUDE.md invariant that the shared worktree paragraph stays byte-identical across five files; it is included as a Validation task because this task edits two of those five files and must not perturb that paragraph.

### The existing text this extends

In `coder.md` the current escalation rule is a single sentence (currently at line 28, standalone after *The loop*):

> Escalate to the `lead` only what you cannot resolve, or what the spec gets wrong.

and the Output report contract (currently the first paragraph under *## Output*, line 64):

> Report to the `lead`: files changed, tasks completed, scenario tests added, qa result, any external docs consulted, and any blocker or spec mismatch. When resumed with findings: which you applied and how, the test pinning each behavioural fix, the qa result afterwards, and any evidence-backed rejection with its trace.

The escalation rule as written covers only *unresolved* problems and *spec-wrong* problems. A production hazard is neither: the coder may have fully resolved the immediate test workaround yet still needs to surface the underlying production risk. So the broadening must add a third category **and** make explicit that this category is raised *even when the workaround itself is resolved* — otherwise a coder reads "escalate only what you cannot resolve" and correctly concludes a resolved workaround is not escalatable. The distinguishing guidance (harness inconvenience vs. production hazard) lives with the broadened rule so the two are read together.

In `lead.md` the two homes are the *Ship* step's PR-contents list (currently line 57) and the *Final handoff* report list (currently line 105). Because hazards can also surface in a later coder round (qa, acceptance, or PR-review fix rounds — see Risks), the PR-review loop's fix-application step (currently line 79) must also carry a newly-reported hazard into a PR update, not only the initial open.

### Risks

- **Hazards surface after the initial build report.** The `lead` resumes the *same* coder for qa, acceptance-gate, and PR-review fix rounds; a production hazard can be discovered (or first understood) in any of those rounds, not only the first build. The acceptance criterion says "a production hazard is raised in the completion report" without restricting it to the first report. **Decision (adopted by this spec): the reporting obligation applies to every report the coder sends the `lead` — the initial build report and every findings-round reply — and the `lead` carries every hazard it is told about into the PR: those known at open go into the opening description, and any surfaced in a later round go into a PR update on that round.** The Requirements below encode both halves (coder: every report; lead: open + subsequent updates).
- **Duplicate-channel risk.** The natural failure mode is to bolt on a separate "Production hazards" heading/section, creating a second escalation path competing with the existing rule. The Requirements forbid this: the change must be an extension of the existing escalation sentence and the existing Output paragraph.
- **Perturbing the shared paragraph.** Editing `coder.md`/`lead.md` risks accidentally touching the byte-identical *Addressing the story worktree.* paragraph. Validation re-runs the repo's grep invariant (expects `1`) to catch any drift.

### Deviations & ownership

- **Card scope vs. docs reconciliation.** The card scopes the work to `coder.md` and `lead.md` only. But `docs/CLAUDE.md` states the root `README.md` is the user-facing description of every agent and must be updated when an agent's behaviour changes — and this task changes coder and lead behaviour. That reconciliation is **not** a criterion the `coder`'s build closes; it is owned by the **`writer`'s docs pass**, which runs after acceptance and folds the shipped change into `README.md`/`ARCHITECTURE.md`. It is listed under Tasks as a non-coder item so the ownership is stated rather than dropped. No card criterion is being narrowed here; the card's five acceptance criteria are all coder/lead prose edits, all owned by the build.

### Coordination with concurrent stories

Several sibling story cards edit the **same two files**, some in the **same sections** this task touches. None of these specs may exist yet when this one is built, so the coder must **re-read the current text of `coder.md` and `lead.md` in the worktree and merge into whatever is there, never clobbering a sibling's landed edit**:

- `make-spec-validation-scoped-and-reproducible` and `give-pipeline-a-prose-deliverable-mode` both edit **`coder.md`** — the former the *report contract* (the same `## Output` paragraph this task broadens), the latter the *build loop step 3 and Rules*. If either has landed, extend the paragraph as it then reads rather than replacing it.
- `surface-card-invalidating-decisions`, `recheck-pending-feedback-notes-before-commit`, `sequence-acceptance-gate-around-docs-pass`, `coordinate-shared-doc-edits-across-concurrent-stories`, and `commit-each-fix-round-in-the-worktree` all edit **`lead.md`** — `surface-card-invalidating-decisions` touches the **Final handoff** report list this task also extends. If it has landed, add the hazard clause to the list as it then reads.

Mirroring how file-edit overlaps are already surfaced elsewhere in the board: if a sibling above lands first, detect its edit and reuse/extend it rather than re-introducing a conflicting version.

## Requirements

### Requirement: The coder distinguishes a test-harness inconvenience from a production hazard

`coder.md` must instruct the coder, when it works around a scenario during implementation, to decide whether the workaround was needed only because the test harness/fixture setup is awkward (a test-harness inconvenience, with no effect on the shipped system) or because a real production dependency, service, or library misbehaves in a way that affects the shipped system (a production hazard) — and that only the latter is a reportable finding.

#### Scenario: Guidance defines both categories and the test between them

- **WHEN** a reader consults the edited `coder.md` after working around a scenario
- **THEN** the file defines a test-harness inconvenience as a workaround needed only because the test fixture/harness is awkward with no effect on the shipped system, defines a production hazard as a workaround needed because a real production dependency/service/library misbehaves in a way that affects the shipped system (not just the test rig), and states that only the production hazard is raised as a finding

### Requirement: A production hazard is raised as an explicit finding in the report to the lead

`coder.md` must instruct the coder that when it identifies a production hazard it raises it as an explicit finding in its report to the `lead`, **in addition to** (not instead of) any code/test comment documenting it, and that this is required **even when the coder's own workaround fully resolved the immediate problem**.

#### Scenario: Hazard is reported to the lead in addition to any comment

- **WHEN** a reader consults the edited `coder.md` having worked around a scenario because of a production dependency's behaviour
- **THEN** the file instructs the coder to raise the hazard as an explicit finding in its report to the `lead`, in addition to any code or test comment, and makes clear this holds even when the workaround itself was resolved

### Requirement: The hazard finding names dependency+version, behaviour, and affected scenario/step

The finding the coder is told to raise must name three things: the dependency and its version, the observed behaviour, and which spec scenario or acceptance-criteria step it affects.

#### Scenario: The required contents of the finding are enumerated

- **WHEN** a reader consults the edited `coder.md` for what a production-hazard finding must contain
- **THEN** the file requires the finding to name the dependency and its version, the observed behaviour, and the spec scenario or acceptance step it affects

### Requirement: The change extends the existing escalation rule and Output contract, not a new channel

The coder-side change must broaden the existing escalation sentence (currently "Escalate to the `lead` only what you cannot resolve, or what the spec gets wrong.") and the existing Output report-contract paragraph, rather than introducing a separate, competing, or duplicate escalation channel or report section.

#### Scenario: Existing escalation sentence is broadened in place

- **WHEN** a reader compares the edited `coder.md` escalation rule to the original
- **THEN** the original sentence has been broadened to also cover a production hazard the coder worked around — explicitly including the case where the workaround was otherwise resolved — and no separate/parallel escalation channel or heading has been added alongside it

#### Scenario: Output report contract lists the hazard finding

- **WHEN** a reader consults the `## Output` report-contract paragraph of the edited `coder.md`
- **THEN** its list of what the coder reports to the `lead` includes any production hazard worked around, expressed as a finding naming the dependency+version, behaviour, and affected scenario/step, extended into the existing report list rather than added as a separate section

### Requirement: The reporting obligation applies to every report the coder sends the lead

Because the coder is resumed for qa, acceptance, and PR-review fix rounds, `coder.md` must make the hazard-reporting obligation apply to every report the coder sends the `lead` — the initial build report and every findings-round reply — not only the first build report.

#### Scenario: Obligation covers findings-round replies, not just the first build

- **WHEN** a reader consults the edited `coder.md` for when the hazard-reporting obligation applies
- **THEN** the file makes the obligation apply to every report the coder sends the `lead` (initial build report and each findings-round reply), not only the initial build report

### Requirement: The lead carries reported hazards into the pull request

`lead.md` must instruct the `lead` to carry any production-hazard findings the coder reports into the pull request — into the opening PR description for hazards known at open, and into a PR update for hazards the coder surfaces in a later round — so the hazard reaches the human via the PR rather than staying in the agent transcript.

#### Scenario: Ship step's PR contents include reported hazards

- **WHEN** a reader consults the *Ship* step's PR-contents list in the edited `lead.md`
- **THEN** the list includes any production hazards the coder reported, so they appear in the opening PR description

#### Scenario: Later-round hazards are carried into a PR update

- **WHEN** a reader consults the PR-review fix-application step of the edited `lead.md`
- **THEN** the file instructs the `lead` to carry any hazard the coder reports in a later round into a PR update, not only hazards known at the initial open

### Requirement: The lead's final handoff reports reported hazards

`lead.md`'s *Final handoff* report list must include any production hazards the coder reported, so the handoff to the user names them.

#### Scenario: Final handoff list names reported hazards

- **WHEN** a reader consults the *Final handoff* report list in the edited `lead.md`
- **THEN** the list includes any production hazards the coder reported

### Requirement: The shared worktree paragraph is left byte-identical across all five agent files

Editing `coder.md` and `lead.md` must not alter the byte-identical *Addressing the story worktree.* paragraph they share with `writer.md`, `qa.md`, and `auditor.md`.

#### Scenario: The five-file byte-identical invariant still holds

- **WHEN** the repo's invariant check is run after the edits: `grep -h '^\*\*Addressing the story worktree\.\*\*' plugins/ca77y-engineering/agents/{lead,coder,writer,qa,auditor}.md | sort -u | wc -l`
- **THEN** it prints `1`, confirming the shared paragraph was not perturbed

## Tasks

Edit locations are quoted/paraphrased so the checklist is unambiguous. Re-read the current worktree text of each file first (see *Coordination*) and merge into it.

- [ ] **`coder.md` — broaden the escalation rule (currently line 28).** Extend `Escalate to the `lead` only what you cannot resolve, or what the spec gets wrong.` to also cover a production hazard the coder worked around, stating it is raised as a finding **even when the workaround itself was resolved** (so a resolved workaround is not silently treated as non-escalatable).
- [ ] **`coder.md` — add the distinguish-and-report guidance next to that rule.** Define a *test-harness inconvenience* (workaround needed only because the fixture/harness is awkward; no effect on the shipped system) vs. a *production hazard* (workaround needed because a real production dependency/service/library misbehaves in a way that affects the shipped system, not just the test rig); state only the production hazard is a finding; require the finding to name the **dependency and its version**, the **observed behaviour**, and the **spec scenario or acceptance step it affects**; and state it is raised **in addition to** any code/test comment.
- [ ] **`coder.md` — extend the `## Output` report contract (currently line 64).** Add "any production hazard worked around (as a finding naming the dependency+version, the behaviour, and the affected spec scenario/acceptance step)" into the existing "Report to the `lead`: …" list, and make clear the obligation applies to **every** report — the initial build report and each findings-round reply — not just the first. Extend the existing paragraph; do not add a separate section.
- [ ] **`lead.md` — extend the *Ship* step's PR-contents list (currently line 57).** Add reported production hazards to `what the task was, the spec, what was built, tests, the acceptance result, docs, risks, and follow-ups`, so hazards known at open land in the opening PR description.
- [ ] **`lead.md` — extend the PR-review fix-application step (currently step 5, line 79).** Instruct the `lead` to carry any hazard the coder reports in a later round into the PR update it pushes that round, not only hazards known at open.
- [ ] **`lead.md` — extend the *Final handoff* report list (currently line 105).** Add any production hazards the coder reported to the handoff report list.
- [ ] **Validation — shared-paragraph invariant.** Run `grep -h '^\*\*Addressing the story worktree\.\*\*' plugins/ca77y-engineering/agents/{lead,coder,writer,qa,auditor}.md | sort -u | wc -l` and confirm it prints `1`.
- [ ] **Validation — scope & no-duplicate-channel check.** Confirm the diff touches only `coder.md` and `lead.md`, adds no plugin `version` change, and broadened the existing escalation rule / Output paragraph in place rather than adding a competing channel or heading.
- [ ] **(Not the coder's task — `writer` docs pass)** Reconcile the user-facing `README.md` (and `ARCHITECTURE.md` if structure is affected) with the changed coder/lead behaviour, per `docs/CLAUDE.md`. Owned by the `writer`'s docs pass after acceptance, not the build.
