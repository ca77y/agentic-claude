# Require citations for third-party behaviour claims in specs

- **Status**: Draft
- **Task**: require-citations-for-dependency-claims
- **Last Updated**: 2026-08-01
- **Document Scope**: One unit of work: make a spec's claims about how a third-party or vendored dependency behaves carry evidence (`package@version` plus file-and-line into that package's own source), make an uncitable claim visibly an assumption, and make the round that verifies the work check the cited mechanism rather than only a scenario's observable outcome.

---

## Goal

**The problem.** A spec can assert how a vendored or third-party dependency behaves as plain fact. Nothing requires evidence for the claim, and nothing re-checks it once the code exists — so a false claim propagates into the implementation, the commit message, and the docs.

The incident on the card: a post-review amendment stated as fact that "closing aborts the EventSource, which both stops the retry loop and settles a wedged in-flight connect". The first half was true. The second was not — in that package's pinned version the fetch-error handler skips both the reconnect and the `error` event when the error is an abort, and `close()` sets the ready state to closed so a later reconnect schedule returns early, meaning the transport's connect promise (which settles only on that error event or on an endpoint event) never settles when a hung connect is closed. The claim reached the fix's commit message unchallenged. It survived because the scenario written for it asserted an **observable outcome** — a later probe recovers — that held for an entirely different reason: the shared state was nulled, not because the connect settled.

A spec claim about a dependency is load-bearing in exactly the way a test assertion is, but only the assertion is required to be checkable.

**The change.** Two prose edits, to two agent definitions:

- `plugins/ca77y-engineering/agents/writer.md` gains **two adjacent spec-authoring rules**: one requiring a dependency-behaviour claim to carry a `package@version` and a file-and-line citation into that package's own source (one per distinct mechanism claimed), or to be written as an explicitly marked assumption; one requiring a scenario whose observable outcome could hold without the claimed mechanism to be identified as such while the spec is being written.
- `plugins/ca77y-engineering/agents/auditor.md` gains the matching verification obligations: the readiness gate's check list catches an uncited claim and a coincidence-prone scenario at the spec gate, and the acceptance gate reads the **cited source at the cited version** and confirms the mechanism is what the spec says — a passing scenario is not, on its own, evidence for the mechanism it was written for.

**User value.** A dependency claim in a spec becomes falsifiable by whoever reads it next: either it names a line someone can open, or it says out loud that nobody checked. The gate that proves the work done stops accepting a symptom as proof of a mechanism, so a false half-claim is caught before it reaches a commit message.

**Non-goals.**

- **Not a documentation-lookup instruction.** `coder.md` already tells the `coder` to "Consult current third-party docs via context7 when external library or API behavior matters" — guidance about *researching while implementing*. This task adds neither agent a research tool and does not touch that line. The evidence this task requires is a citation into the dependency's **own installed or vendored source at the resolved version**, readable by the next human, not a documentation lookup.
- **Not a new obligation on the `coder` or `qa`.** The card scopes the authoring rule to `writer.md` and the verification rule to `auditor.md`. See *Deviations from the card* for the `qa` question, raised rather than silently taken.
- Not provisioning: neither agent installs dependencies to obtain a citation. An unreachable source makes the claim an assumption (writer) or an unverified criterion (auditor) — see the *Boundary*.
- Not touching `docs/ARCHITECTURE.md` or the root `README.md` in this build; their per-agent prose is the docs pass's job (see *Boundary* and *Tasks*).

## Design

**Where the edits land.**

- `writer.md` → the `### Spec authoring rules` block. Two new rules appended after the block's current last rule (**"A settled decision that contradicts a card's recorded relationship is a board follow-up…"**), in the same shape as their neighbours: a bolded imperative lead sentence followed by the reasoning and the failure it prevents.
- `auditor.md` → `## What you do`, step 2's enumeration of what to check for. Two additions: a dependency-behaviour claim asserted without a citation and without being marked an assumption; and a scenario whose observable outcome would still hold with the claimed mechanism absent.
- `auditor.md` → `## The acceptance gate`. A new paragraph: when a criterion, or the fix under it, rests on a claim about a dependency's behaviour, verify the **cited mechanism** in the cited source at the cited version, not only that the scenario passes.

**Design decision — two rules, not one.** The card is one mechanism but covers two different authoring questions with two different remedies:

- The **citation** rule governs a *claim* (a sentence of prose in Goal, Design, Deviations, or a scenario's THEN). Its remedy is evidence: `pkg@version path:line`, or an explicit assumption marker.
- The **coincidence** rule governs a *scenario* (a test the `coder` will write). Its remedy is test design: name the alternative cause, and either observe the mechanism directly or say plainly that only the citation covers it.

Keeping them adjacent and single-purpose matches how the existing block reads (each rule is one trigger, one remedy) and lets the `auditor`'s two check-list additions map one-to-one onto them. Merging them would produce a rule with two triggers whose second half a reader applies only when the first half fired.

**Design decision — citation form.** `<package>@<resolved-version> <path-inside-the-package>:<line>`. Three properties make it usable:

- The **resolved/installed** version, not the range in the manifest — the incident's claim was true or false depending on which version was pinned, and a range does not identify a file's contents.
- A **path and line inside the package's own source** — the thing the next reader opens. Documentation is not a substitute: documentation is what the incident's claim would have passed under.
- **One per distinct mechanism.** A distinct mechanism is each independently-falsifiable behaviour the sentence asserts — if one half of the sentence could be false while the other is true, that is two claims and two citations. The incident's sentence asserted three (close aborts the request; the abort stops the retry loop; the abort settles the in-flight connect promise) and shipped with none.

**Design decision — where the source is read from.** The `writer` and `auditor` read the dependency's source through the story worktree's own provisioned dependency tree, or read-only in the repository root when the worktree has none — exactly the allowance the shared *"Addressing the story worktree."* paragraph already grants for "dependency and vendor sources". Neither agent provisions anything; that is the `lead`'s creation step. When the source is reachable nowhere, the claim is an assumption (writer) or an unverified criterion reported as such (auditor). This is why the rules are stated as *"cite it or mark it"* rather than *"cite it"*: on a project with no installed dependency tree the second form would be unsatisfiable.

**Design decision — the writer's promise is honoured by a named auditor sentence.** The citation rule's payoff — *"so the round that verifies it knows it is untested"* — is a consequence only some *other* agent can realize. It is realized by the new `auditor.md` acceptance-gate paragraph, which this same task adds; Requirement 2's second scenario checks that sentence exists rather than trusting the promise. (This is the discipline the sibling card [`cite-cross-agent-promises-in-specs`](../tasks/cite-cross-agent-promises-in-specs.md) proposes making a standing rule; it is applied here by hand.)

**Prose deliverable — falsification is by inspection.** The deliverable is agent-definition Markdown. [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) states the agent `.md` files under `plugins/*/agents/` **are the product**; this repo has no test runner, no build, and no CI for them. Every Requirements scenario below is therefore falsified or satisfied by *reading the changed file* and quoting the sentence that satisfies it — not by running a suite. Finding no test command is the expected result here, not a blocker. See *Validation* for the real consumers to check instead.

The boundary-preservation properties — the shared *"Addressing the story worktree."* paragraph staying byte-identical, the manifests and versions untouched, no card or README path in the changed set — are deliberately **not** written as Requirements scenarios. They are mechanical rather than behavioural, and *Validation* closes each with a command whose real output the `coder` records; a scenario would restate the command less precisely.

**Illustrative wording, not a contract.** Sample rule wording appears in *Tasks* to show the intended register. It is **illustrative only**: the Requirements scenarios are the contract, and the `coder` may word the rules differently as long as every scenario is satisfied.

## Boundary

**In scope — the `coder` edits exactly two files, prose only:**

- `plugins/ca77y-engineering/agents/writer.md` — the `### Spec authoring rules` block only.
- `plugins/ca77y-engineering/agents/auditor.md` — `## What you do` step 2, and `## The acceptance gate`.

**Out of scope — do not touch:**

- `plugins/ca77y-engineering/agents/coder.md`, `qa.md`, `lead.md`. In particular `coder.md`'s context7 sentence stays exactly as it is; a concurrent story is in flight on `lead.md`.
- Any card under `docs/tasks/*.md`. The board is the human's; contradictions go in the `writer`'s report as board follow-ups.
- Both plugin manifests (`plugins/ca77y-engineering/plugin.json`, `plugins/ca77y-engineering/.claude-plugin/plugin.json`) — no version bump, no manifest edit. Version bumps are a human decision (root [`CLAUDE.md`](../../CLAUDE.md)).
- The byte-identical **"Addressing the story worktree."** paragraph, which both changed files carry. All edits land outside it, leaving it identical across all five agent files (`lead`, `coder`, `writer`, `qa`, `auditor`).
- `docs/ARCHITECTURE.md` and the root `README.md` — their per-agent prose is reconciled by the **docs pass** after this ships, not by the `coder`. See *Tasks*.

**No dependency tree in this repo.** This repo has no `package.json` and no lockfile, so its story worktrees are recorded *not provisioned: no install step*. That is expected and benign: nothing in this build reads a dependency's source. It is also the reason the rules must survive the no-dependency-tree case at all (see the Design decision above) — a rule that assumed an installed tree would be unfollowable on this very repo.

**No test runner.** There is no build, test suite, or validation command for these files. Each scenario is closed by the `coder` making the prose edit and quoting the line that satisfies it, or naming what is missing.

## Coordination

Several sibling cards also edit `writer.md`'s `### Spec authoring rules` block or `auditor.md`. A `coder` working from one card has no other signal these collisions exist, so in every case below: **detect the block's current shape and add additively; never clobber or reword a sibling's rule.**

- [`cite-cross-agent-promises-in-specs`](../tasks/cite-cross-agent-promises-in-specs.md) (Todo) adds another rule to the same `writer.md` block and explicitly names this card as the thing it must not duplicate. If it lands first, add these two rules alongside its rule.
- [`give-pipeline-a-prose-deliverable-mode`](../tasks/give-pipeline-a-prose-deliverable-mode.md) (Todo, 🔺) rewrites parts of the same block for the prose-deliverable case. If it lands first, the block may carry renamed or rephrased neighbours — locate the block by its heading rather than by the rule this spec names as "last".
- [`measure-the-specs-baseline-before-asserting-a-gap`](../tasks/measure-the-specs-baseline-before-asserting-a-gap.md) (Todo), [`make-spec-validation-scoped-and-reproducible`](../tasks/make-spec-validation-scoped-and-reproducible.md) (Todo), [`scaffold-the-writers-mandated-spec-sections`](../tasks/scaffold-the-writers-mandated-spec-sections.md) (Todo), [`define-what-verbatim-means-in-a-spec-fence`](../tasks/define-what-verbatim-means-in-a-spec-fence.md) (Todo), [`reconcile-whole-document-on-every-writer-edit`](../tasks/reconcile-whole-document-on-every-writer-edit.md) (Todo) all add or move spec-authoring rules in the same block.
- [`sequence-acceptance-gate-around-docs-pass`](../tasks/sequence-acceptance-gate-around-docs-pass.md) (**Ready to start** — may be in flight now) may edit `auditor.md` "if the gate needs to distinguish criterion classes", which is the same `## The acceptance gate` section this task appends a paragraph to. If it lands first, append after whatever it added rather than replacing it.

The root [`README.md`](../../README.md) is a known multi-story collision point ([`coordinate-shared-doc-edits-across-concurrent-stories`](../tasks/coordinate-shared-doc-edits-across-concurrent-stories.md)); the docs-pass task below must check whether a sibling PR already holds the `### writer` / `### auditor` sections before editing them, and re-home the obligation if so.

## Deviations from the card

No card criterion is unsatisfiable, so nothing is being overridden. Two scoping decisions are recorded here for the acceptance gate's benefit:

- **Criterion 3 says "the round verifying a fix"; this spec implements it in `auditor.md` only.** The pipeline has more than one such round: the `auditor`'s acceptance gate and re-audits, `qa`'s local diff review, and the PR review. The card's own Scope line assigns the verification rule to `auditor.md`, so that is where it lands, worded to bind every acceptance/re-audit round the `auditor` is dispatched for. Whether `qa.md` should carry the same check on its diff review is raised to the `lead` as an open scope question rather than decided here — it is not in the card's scope and `qa.md` is untouched.
- **The root `README.md` mirror is owned by the docs pass, not the `coder`.** [`docs/CLAUDE.md`](../CLAUDE.md) makes the root `README.md` the user-facing description of every agent, to be updated when an agent's behavior changes — so this change owes edits to the README's `### writer` and `### auditor` sections. That is not a card criterion and no automated step closes it; it is assigned to the docs pass with a Tasks entry marked *not the `coder`'s task*. Every other criterion on the card is a `coder`-owned prose edit closable by inspection, so no other criterion needs a separate owning mechanism.

## Requirements

### Requirement: A dependency-behaviour claim carries a version-pinned, file-and-line citation

`writer.md` requires every spec sentence asserting how a third-party or vendored dependency behaves to carry evidence a reader can open, at the granularity of one citation per distinct mechanism claimed.

#### Scenario: The rule mandates a package, a resolved version, a file, and a line

- **WHEN** a reader inspects the new citation rule in `writer.md`'s `### Spec authoring rules` block
- **THEN** it requires a claim about a third-party or vendored dependency's behaviour to carry the package identifier with the **resolved/installed** version it was read at (not a manifest range) **and** a path-and-line reference inside that package's own source

#### Scenario: One citation per distinct mechanism, with "distinct" defined

- **WHEN** a reader inspects the same rule
- **THEN** it requires one citation per **distinct mechanism** claimed and defines what makes a mechanism distinct — each independently-falsifiable behaviour the sentence asserts, such that a compound sentence whose halves could differ in truth is several claims needing several citations

#### Scenario: The evidence is the dependency's own source, not its documentation

- **WHEN** a reader inspects the same rule
- **THEN** it states that the citation points into the dependency's installed or vendored source, and that documentation is not a substitute for it

#### Scenario: The rule says where the source may be read from, and forbids provisioning to get it

- **WHEN** a reader inspects the same rule
- **THEN** it directs the source to be read through the story worktree's own dependency tree, or read-only in the repository root when the worktree has none, and does not instruct the `writer` to install or provision anything

#### Scenario: The rule reaches every claim in the spec, not only those in Requirements

- **WHEN** a reader inspects the same rule
- **THEN** it applies to any sentence in the spec that asserts a dependency's behaviour — in Goal, Design, Deviations, or a scenario's THEN alike — so a claim living outside Requirements is not exempt, and no such sentence may stand as a bare assertion of fact rather than a cited claim or a marked assumption

### Requirement: An uncitable claim is written as a marked assumption, and the verifying round is told to treat it as one

A claim that cannot be traced to a line is not dropped and not asserted — it is written as an assumption the next reader can see, and `auditor.md` carries the sentence that makes that marking do something.

#### Scenario: The rule requires the assumption marking

- **WHEN** a reader inspects the citation rule in `writer.md`
- **THEN** it requires a claim that cannot be traced to a file and line — because the source is unreachable, or because the behaviour could not be located in it — to be written in the spec as an explicitly marked assumption rather than as fact

#### Scenario: The marking states what would settle it

- **WHEN** a reader inspects the same rule
- **THEN** the assumption marking it prescribes carries why the claim could not be cited and what would settle it, so a later round knows what evidence is missing rather than only that some evidence is

#### Scenario: The auditor honours the marking

- **WHEN** a reader inspects `auditor.md`'s `## The acceptance gate` section
- **THEN** it states that a claim the spec marks as an assumption is **not** treated as established, and is reported as unverified against the criterion that rests on it — so the `writer.md` rule's promise that "the round that verifies it knows it is untested" is realized by a sentence that actually exists in `auditor.md`

### Requirement: The verifying round checks the cited mechanism, not only the scenario's outcome

`auditor.md`'s acceptance gate reads the cited source at the cited version and judges the mechanism itself.

#### Scenario: The gate reads the citation

- **WHEN** a reader inspects `auditor.md`'s `## The acceptance gate` section
- **THEN** it directs the auditor, when a criterion or the fix under it rests on a claim about a dependency's behaviour, to open the cited source at the cited version and confirm the mechanism is what the spec says

#### Scenario: A passing scenario is not evidence for the mechanism

- **WHEN** a reader inspects that same paragraph
- **THEN** it states that a scenario passing on its observable outcome is not on its own evidence that the claimed mechanism holds, because the outcome can be produced by an unrelated cause

#### Scenario: An unreachable citation is reported, not assumed

- **WHEN** a reader inspects that same paragraph
- **THEN** it directs the auditor to report the claim as unverified — naming the criterion it affects — when the cited source cannot be read (the package is absent, or the worktree's dependency-provisioning status is absent or negative), and not to provision anything in order to check it

#### Scenario: The obligation binds every round, including a fresh re-audit

- **WHEN** a reader inspects that same paragraph
- **THEN** it is worded to apply to each round the auditor is dispatched for — the acceptance gate and any re-audit of it — so a fresh dispatch carrying no prior context still performs the check rather than inheriting an earlier round's conclusion

### Requirement: A scenario that could pass for the wrong reason is identified at authoring time

`writer.md` makes the coincidence check part of writing the scenario, and `auditor.md`'s readiness gate catches what the check missed.

#### Scenario: The rule requires asking what else produces the outcome

- **WHEN** a reader inspects the new coincidence rule in `writer.md`'s `### Spec authoring rules` block
- **THEN** it requires the `writer`, for a scenario asserting an observable outcome, to ask what else could produce that outcome with the claimed mechanism absent or broken

#### Scenario: The alternative cause is named, and the mechanism is either observed or declared uncovered

- **WHEN** a reader inspects the same rule
- **THEN** it requires that where such an alternative cause exists it is named in or beside the scenario, and that the spec either adds a scenario observing the mechanism directly or states plainly that the mechanism is covered only by its citation

#### Scenario: The rule names the failure it prevents

- **WHEN** a reader inspects the same rule
- **THEN** it states why it exists — a green scenario is otherwise read as confirming the claim it was written for, which is how a false dependency claim reaches the implementation, commit message, and docs unchallenged

#### Scenario: The readiness gate catches both defects at the spec gate

- **WHEN** a reader inspects `auditor.md`'s `## What you do` step 2 check list
- **THEN** it includes both a dependency-behaviour claim asserted with neither a citation nor an assumption marking, and a scenario whose observable outcome would still hold with the claimed mechanism absent

### Requirement: The rules sit with the existing ones and add no documentation-tool guidance

The additions extend the two definitions in place, and duplicate nothing already given to the `coder`.

#### Scenario: Placement and shape match the existing rules

- **WHEN** a reader inspects `writer.md`'s `### Spec authoring rules` block
- **THEN** the two new rules sit inside that block alongside the existing ones, each in the same shape (a bolded imperative lead sentence followed by its reasoning), and every pre-existing rule in the block is still present and unmodified

#### Scenario: No documentation-lookup tool is introduced

- **WHEN** a reader searches the changed `writer.md` and `auditor.md` for `context7` or any instruction to consult a documentation-lookup tool
- **THEN** neither file contains one, and `coder.md`'s existing sentence "Consult current third-party docs via context7 when external library or API behavior matters." is unchanged

#### Scenario: The auditor additions extend their sections rather than replacing them

- **WHEN** a reader inspects `auditor.md`'s `## What you do` step 2 and `## The acceptance gate`
- **THEN** the pre-existing content of both — step 2's existing enumeration and the acceptance gate's criterion-by-criterion paragraphs — is still present and unweakened, with the new material added to it

## Validation

No test suite exists for these files; this is the expected result, not a blocker. Validate the artifact's real consumers, from the story worktree (`git -C <worktree>` / absolute paths):

- **Both changed files remain valid agent definitions.** Frontmatter (`name`, `description`, `model`, `effort`) untouched in both; section headings intact.
- **The shared worktree paragraph is undisturbed.** Both changed files carry it. Run from the worktree root — must print `1`:
  ```bash
  grep -h '^\*\*Addressing the story worktree\.\*\*' \
    plugins/ca77y-engineering/agents/{lead,coder,writer,qa,auditor}.md | sort -u | wc -l
  ```
- **No documentation-tool duplication.** Must produce no output:
  ```bash
  grep -in 'context7' plugins/ca77y-engineering/agents/writer.md plugins/ca77y-engineering/agents/auditor.md
  ```
  And `coder.md` must be unchanged in the diff:
  ```bash
  git -C <worktree> diff --stat -- plugins/ca77y-engineering/agents/
  ```
  should list `writer.md` and `auditor.md` only.
- **Manifests untouched, versions unchanged.** No edit to either `plugin.json`; the parity loop in the root `CLAUDE.md` still prints `ok`.
- **Cross-file consistency.** The `writer.md` citation rule's promise (an uncitable claim is marked so the verifying round knows) and the `auditor.md` acceptance-gate paragraph describe the same artifact — read both and confirm they agree, and that neither contradicts `docs/ARCHITECTURE.md`'s flat topology (writer authors and returns; auditor gates report-only; lead orchestrates). Do not edit `ARCHITECTURE.md`.
- **Boundary check.** `git -C <worktree> status --short` shows changes only under `plugins/ca77y-engineering/agents/` (plus this spec) — no card, manifest, README, or `ARCHITECTURE.md` edits.

## Tasks

- [ ] In `writer.md`'s `### Spec authoring rules`, add the **citation** rule alongside the existing ones. Substance: a claim about how a third-party or vendored dependency behaves carries `<package>@<resolved-version>` plus a path-and-line inside that package's own source, one citation per distinct mechanism (each independently-falsifiable behaviour — a compound sentence whose halves could differ in truth is several claims); documentation is not a substitute; read the source through the worktree's dependency tree or read-only in the repository root, never by provisioning; a claim that cannot be traced to a line is written as an explicitly marked assumption saying why it could not be cited and what would settle it. Illustrative register: *"A claim about how a dependency behaves is load-bearing exactly the way a test assertion is, but nothing makes it checkable unless you make it so."*
- [ ] In the same block, add the **coincidence** rule: for a scenario asserting an observable outcome, ask what else could produce that outcome with the claimed mechanism absent or broken; name any such alternative cause in or beside the scenario; either add a scenario observing the mechanism directly or state plainly that the mechanism is covered only by its citation; and name the failure it prevents (a green scenario read as confirming the claim it was written for, which is how a false claim reaches the implementation, commit message, and docs).
- [ ] In `auditor.md`'s `## What you do` step 2, extend the check list with: a dependency-behaviour claim carrying neither a citation nor an assumption marking; and a scenario whose observable outcome would still hold with the claimed mechanism absent. Leave the existing enumeration intact.
- [ ] In `auditor.md`'s `## The acceptance gate`, add a paragraph: when a criterion or the fix under it rests on a claim about a dependency's behaviour, open the cited source at the cited version and confirm the mechanism itself; a passing scenario's observable outcome is not on its own evidence for the mechanism; a claim the spec marks as an assumption is not treated as established and is reported as unverified against the criterion it affects; an unreadable citation (package absent, or provisioning status absent/negative) is reported as unverified rather than provisioned around. Word it to bind every round the auditor is dispatched for, including a fresh re-audit.
- [ ] Confirm placement and non-duplication: the two new `writer.md` rules sit inside `### Spec authoring rules` with every pre-existing rule intact; `auditor.md`'s step 2 and acceptance-gate content are extended, not replaced; neither file mentions `context7` or any documentation-lookup tool; `coder.md` is not in the diff.
- [ ] Run the Validation checks and record their real output: the "Addressing the story worktree." grep (prints `1`), the `context7` grep (no output), `git diff --stat` over the agents directory (two files), the manifest parity loop (all `ok`), and `git status --short` (no out-of-boundary paths).
- [ ] **Not the `coder`'s task — docs pass.** Reconcile the root `README.md`'s `### writer` and `### auditor` sections with the new citation/coincidence authoring rules and the new verification obligation, per `docs/CLAUDE.md`'s rule that the README is the user-facing description of every agent. Check first whether a concurrent sibling PR holds those sections; if so, re-home the obligation rather than editing them. `docs/ARCHITECTURE.md` covers structure, not per-agent prose — check it for contradiction, edit only if one exists.
