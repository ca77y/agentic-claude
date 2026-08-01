# Commit each fix round so a fresh reviewer can see what changed

- **Status**: Draft
- **Task**: commit-each-fix-round-in-the-worktree
- **Last Updated**: 2026-08-01
- **Document Scope**: One unit of work: give `lead.md` a commit per pre-ship round, so every fresh `qa` and acceptance-gate `auditor` dispatch inherits a diffable baseline instead of one undifferentiated working tree

---

## Goal

**The problem.** `lead.md`'s commit model commits the spec (commit 1) and then everything else at PR time (commit 2). Every `qa` dispatch and every acceptance-gate `auditor` dispatch in between is a **fresh** context — that is deliberate, so the critique is independent — but each one inherits a working tree in which the coder's initial build and every fix round's changes are folded together with no boundary between them. The round-N dispatch's own question, *what did the coder change in response to round N−1's findings?*, is unanswerable: the pre-fix text exists nowhere in `git log`, `git stash`, or the reflog.

Two recorded incidents:

- On `timer-cue-sync`, a round-2 `qa` was asked to verify four round-1 findings were fixed and to re-review the whole diff. `git log master..HEAD` in the worktree held only the spec commit; both rounds of code sat as one undifferentiated working tree (6 modified, 3 untracked). It could verify the tree was internally correct but not that the coder changed **only** what was reported — a round that quietly altered an unrelated assertion or reverted a passing behaviour is invisible. It re-derived every finding from scratch and fell back on mutation testing to establish which tests discriminated: sound, but several times the cost of reading a diff, and the cost compounds on every round after the first.
- On `generalize-audit-findings-to-the-property`, the round-2 reviewer was asked to verify two round-1 findings had been correctly reworded. Round 1's pre-fix text was gone, so the quality/simplification part of its review could not tell a legitimate reword — the round-1 remediation itself — from unmandated filler, and the only safe call was to skip a cleanup it could not judge.

**The change.** One prose edit, to one agent definition: `plugins/ca77y-engineering/agents/lead.md`. Its `## The commit model` gains a commit per pre-ship round, positioned between the spec commit and the ship commit; the ship commit is reworded to stop claiming it carries literally everything; workflow steps 5 (qa loop) and 6 (acceptance gate) commit the round's work **before** dispatching the next fresh agent and hand that agent the commit references to diff against; step 8's commit label and the `## Final handoff`'s "two commits" clause are reconciled with the new model.

**User value.** A fresh `qa` or `auditor` opens round N by reading a diff of round N−1's commit against round N−2's — cheap, exact, and sufficient to prove the coder changed only what was reported — instead of re-deriving every finding from scratch at several times the cost. The quality/simplification judgement inside `qa`'s review step regains the pre-fix text it needs to tell a round's remediation from cuttable filler.

**Non-goals.**

- Not changing the spec-revision loop (step 3). The spec is committed once, after its gate passes; there is no in-flight "round" to commit there, and per-round spec commits are explicitly not wanted.
- Not changing the existing PR-review fix-round commit rule. That rule is the **model being mirrored**, not something being modified.
- Not changing any round cap. The 3× rule is untouched; committing is not a gate and adds no round.
- Not editing `qa.md`, `auditor.md`, or `coder.md`, and not touching the board or either plugin manifest (see *Boundary*).
- Not reconciling the root `README.md` or `docs/ARCHITECTURE.md` in this build — the docs pass owns those, and this spec names that ownership explicitly (see *Tasks*).

## Resolution chosen and why

The card names three candidate resolutions and requires exactly one, not a blend. **Resolution 1 — commit after each qa/acceptance fix round — is chosen.** This is settled; it is recorded here so the rationale ships with the spec and can be lifted into the PR description.

- **It mirrors a pattern `lead.md` already has.** The PR-review loop already commits once per fix round, post-ship. Extending the same mechanism one phase earlier, to the qa and acceptance-gate loops, is the smallest conceptually-consistent change — one more bullet in an existing list, not a new bespoke mechanism.
- **It produces real, non-fragile git history.** A fresh `qa`/`auditor` diffs two ordinary reachable commits. This is what the card's criterion 2 actually asks for: it ties the diffability guarantee to "the commit resolution".

**Resolution 2 — pass the previous round's findings verbatim, no new commits — rejected.** It tells a fresh reviewer what a prior finding *said*, but not what the coder actually *changed* in response. It therefore cannot catch a fix round that quietly altered something unrelated or reverted a passing behaviour — which is precisely the gap the reopened card documents ("could verify the tree was correct but not that the coder changed **only** what it reported").

**Resolution 3 — `git commit --amend` per round plus recording the pre-amend SHA — rejected.** The card itself frames it as the weaker fallback ("minimum acceptable... if per-round commits are rejected again"). It reaches a similar diffability property through more fragile plumbing: the baseline is a dangling, unreachable commit that only a recorded SHA points at and that `git gc` may eventually prune. Its sole benefit is keeping the visible branch at two commits before ship, which is not a real requirement — the existing PR-review loop already adds commits beyond the nominal two, so the "two-commit" language describes the **shape** of the model (the spec committed separately first, the rest bundled at ship) rather than a hard ceiling on commit count. See *Deviations from the card*.

## Design

**Where the edits land** — all five inside `plugins/ca77y-engineering/agents/lead.md`:

1. `## The commit model` — a new bullet between **"Commit 1 — the spec"** and the existing **"Commit 2 — everything else"**; the reword of that "everything else" bullet; and the closing push sentence, which currently says "Push when you open the PR, and again on each fix round" and must not be read as promising a push per pre-ship round (no remote branch exists before the PR opens).
2. Workflow **step 5** (*Validate and review* — the qa loop).
3. Workflow **step 6** (*Acceptance gate*).
4. Workflow **step 8** (*Ship*) — only its `(commit 2)` label, which becomes wrong once round commits sit between commit 1 and it.
5. `## Final handoff` — only the clause "the two commits and the PR link".

**The rule, stated once.** Before every **fresh** `qa` or acceptance-gate `auditor` dispatch, the `lead` commits whatever is uncommitted in the story worktree; if nothing is uncommitted, the current `HEAD` is the baseline and the `lead` says so in the dispatch. Each such dispatch is handed two references — the commit its predecessor reviewed, and the new one — so it can diff round N against round N−1.

**Design decision — the coder's initial build is committed too, before the *first* `qa` dispatch.** This is the one piece of mechanism the card's headline wording ("commit after each fix round") does not spell out, and without it the change does not fix the incident that reopened the card. Traced out:

| | build commit **absent** | build commit **present** |
|---|---|---|
| after round-1 findings applied | commit holds *build + fix 1* | commit holds *fix 1* only |
| what round-2 `qa` can diff | the whole build — i.e. nothing it did not already see in the working tree | exactly what round 1 changed |

Without the build commit, the first useful diff arrives at round **3**, and a round-2 `qa` is left exactly where the `timer-cue-sync` incident left it. Committing the build before dispatching round-1 `qa` costs one commit and makes every round's diff isolable, including round 1's. It is the same rule applied at round 0 — commit what the coder produced, then dispatch — rather than a second mechanism.

**Design decision — the round is committed whether or not another dispatch follows.** Stating the rule purely as "commit before the next fresh dispatch" leaves the terminal cases undefined, and one of them is the case that matters most: when the **3× cap** is reached, the `coder` has just applied a third round of fixes and the `lead` escalates to the user instead of dispatching again. That is exactly when a human needs the diffable history of what the last round actually changed. The rule is therefore worded around the *round*, not the dispatch: the `lead` commits the round's work when the `coder` reports back, and — when a dispatch does follow — hands the references to it. The same holds for the other terminal case, a loop ending because the gate came back clean: there is then nothing uncommitted from a fix, and the `lead` simply carries the current `HEAD` forward as the baseline.

**Design decision — one commit per round, with a message that names its composition.** `qa` adds tests of its own (`qa.md` step 5: it fills the test gaps the coder did not cover), so the tree at the moment of the round commit generally holds the coder's fixes **and** the previous `qa`'s added tests. Splitting these into two commits per round would give the crispest possible diff but doubles the commit count and adds bookkeeping the card never asks for. Instead the round stays one commit and its **message** names both parts — which findings it applies, and which tests `qa` added that round — so the next reviewer reading the diff knows which hunks it is looking at.

**Prose deliverable — falsification is by inspection.** The deliverable is agent-definition Markdown. `docs/ARCHITECTURE.md` states the agent `.md` files under `plugins/*/agents/` **are the product**; this repo has no `package.json`, no test runner, no build, and no CI for these files, and its story worktrees are correctly provisioned as *not provisioned: no install step*. Every Requirements scenario below is therefore falsifiable by **reading the changed file** and quoting the sentence that satisfies it — not by running a suite. Finding no test command is the expected result here, not a blocker. See *Validation* for the real consumers to check instead.

**Illustrative target wording.** The prose below is a **sample, not a fence** — the Requirements scenarios are the contract, and the `coder` may word it better as long as every scenario's proposition is present.

> - **One commit per pre-ship round.** Before every **fresh** `qa` or acceptance-gate `auditor` dispatch, commit whatever is uncommitted in the worktree — the `coder`'s initial build before the first `qa` dispatch, then each round's fixes (plus any tests the previous `qa` added) before the next fresh dispatch. This mirrors the "one commit per PR-review fix round" rule below, one phase earlier, and it exists because every one of those dispatches is a **fresh** context: without it, round 2 inherits one undifferentiated tree holding the build and every round folded together, and cannot answer what its own dispatch asks — *what did the coder change since round 1?* With it, the next dispatch diffs this round's commit against the last one instead of re-deriving every finding from scratch, and can check the coder changed **only** what was reported. Name in the message which round's findings the commit applies and any tests `qa` added that round. **Commit the round's work when the `coder` reports back whether or not another dispatch follows** — including when the **3×** cap is reached and you escalate instead of re-dispatching, which is exactly when a human most needs to see what the last round changed.

## Boundary

**In scope — the `coder` edits exactly one file, prose only:** `plugins/ca77y-engineering/agents/lead.md`, and within it only the five locations listed under *Design*.

**Out of scope — do not touch:**

- `plugins/ca77y-engineering/agents/auditor.md` — **excluded because of a live collision.** The concurrent story `require-citations-for-dependency-claims` (`[<]` Ready to start, with a live worktree at `.worktrees/require-citations-for-dependency-claims`) is being built right now, and its Scope line names `plugins/ca77y-engineering/agents/writer.md` for the authoring rule and `auditor.md` for the verification rule. Editing `auditor.md` risks a collision with that build.
- `plugins/ca77y-engineering/agents/qa.md` — **excluded on its own merits, not because of a collision.** That same story does *not* touch `qa.md`, and no story is in flight that does: the three cards that name `qa.md` in their scope (`demonstrate-each-pinning-test-red`, `give-pipeline-a-prose-deliverable-mode`, `make-spec-validation-scoped-and-reproducible`) are all Todo with no worktree. `qa.md` is out of scope because the mechanism is entirely lead-side and `qa.md` needs no change to consume it — see *Risks and open questions*.
- `plugins/ca77y-engineering/agents/writer.md`. Not involved in this change, and also named in the Scope line of the concurrent `require-citations-for-dependency-claims` build above.
- `plugins/ca77y-engineering/agents/coder.md`. The card scopes one file. `coder.md:10` does carry a clause this change makes stale; it is recorded in *Risks and open questions* for the `lead` to route, not fixed here.
- The byte-identical **"Addressing the story worktree."** paragraph (`lead.md:18` and its four siblings). All five edit sites are outside it; the root `CLAUDE.md` parity check must still print `1` (see *Validation*).
- Both plugin manifests (`plugins/ca77y-engineering/plugin.json`, `plugins/ca77y-engineering/.claude-plugin/plugin.json`). **No version bump** — version bumps are a deliberate human decision per the root `CLAUDE.md`, never triggered by a shipped story.
- Any card under `docs/tasks/*.md`. The board is the human's; contradictions are reported, not edited (see *Board follow-ups*).
- The root `README.md` and `docs/ARCHITECTURE.md` — the **docs pass** reconciles them after this ships (see *Tasks*).

**No test runner.** There is no build, test suite, or validation command for these files. Each scenario is closed by making the prose edit and by inspection; the `coder` should quote the line that satisfies each scenario, or name what is missing.

## Coordination

Several sibling cards also edit `lead.md`, some of them in or beside the very sections this task changes. A `coder` working from one card has no other signal these collisions exist. None of them is in flight today, but any may land first; in every case merge **additively** rather than replacing what the sibling added:

- **`sequence-acceptance-gate-around-docs-pass`** (Ready to start, 🔼) rewrites the relationship between step 6 (acceptance gate) and step 7 (docs pass), possibly reordering them. If it lands first, apply this task's step-6 commit rule to wherever the acceptance gate then lives, detecting the current shape of the step rather than assuming the numbering in this spec; do not undo its classification of criteria.
- **`recheck-pending-feedback-notes-before-commit`** (Ready to start, 🔽) adds a `lead` obligation to re-check pending `AGENTS_IMPROVEMENTS.md` entries **before committing**. Its rule and this one compose: after this ships there are more commit points, so that re-check applies at each pre-ship round commit too. If it lands first, add the round commits without weakening or duplicating its re-check wording; if this lands first, that task should expect a per-round commit list rather than two commits.
- **`format-the-spec-before-the-lead-commits-it`** (Todo, ⏫) also edits `## The commit model` (and step 3), for the spec commit specifically. Its concern is commit 1 only and does not overlap this task's bullets, but it rewrites the same list — add this task's bullet alongside whatever shape the list then has.
- **`coordinate-shared-doc-edits-across-concurrent-stories`** (Todo, 🔼) edits `lead.md` around collision detection and deferral surfacing; keep both additions.
- **`distinguish-no-dependencies-from-failed-provisioning`** (Todo, 🔽) edits the canonical "Addressing the story worktree." paragraph across all five agent files. This task deliberately does not touch that paragraph, so the two do not conflict — but if that task lands mid-flight, re-run the parity check in *Validation* rather than assuming it still passes.

## Deviations from the card

**Criterion 4 — "The change stays consistent with the two-commit ship model (commit 1 spec, commit 2 everything else) and with the three-round caps."**

The chosen resolution cannot satisfy the first half of that sentence as literally written: per-round commits mean the branch no longer holds exactly two commits before ship. The override, and its reasoning, are recorded here rather than quietly narrowed inside a scenario, because the acceptance gate reads the card.

- **What is preserved:** the *shape* the two-commit model describes — the spec gets its own commit first (so it survives the docs pass deleting it), and everything still uncommitted at ship time is bundled into one ship commit. The `lead` remains the only agent that commits, in one worktree, on one branch, opening one PR.
- **What changes:** the total commit count, which now varies with how many pre-ship rounds ran. This is not a new kind of exception — the existing "one commit per PR-review fix round" rule already puts the total above two, so a literal two-commit ceiling was never the operating model.
- **Why the deviation is required rather than avoidable:** the only resolution that keeps a literal two-commit branch is resolution 3 (amend + recorded SHA), which the card itself ranks as the fallback and which the chosen decision rejects for the fragility reasons under *Resolution chosen and why*.
- **The second half of criterion 4 is met unchanged:** the three-round caps are untouched (Requirement 6). Committing is bookkeeping between rounds, not a gate, and adds no round.

**The card's Scope line names one section; the edit necessarily spans five.** The card scopes *"`plugins/ca77y-engineering/agents/lead.md`, `## The commit model`"*. The **file** scope is honoured exactly — one file, nothing else — but the edit cannot be confined to that one section: a commit model that is never acted on in the workflow changes nothing, so Workflow steps 5 and 6 must carry the ordering and the hand-off, step 8's `(commit 2)` label becomes wrong the moment round commits land before it, and `## Final handoff`'s "the two commits and the PR link" becomes a false statement of what the run produced. Leaving any of the four unedited would ship a `lead.md` that contradicts itself. This is a section-scope expansion within the one file the card names, deliberate and minimal — the five sites are enumerated under *Design*, and no other part of `lead.md` is touched.

**The `coder`'s initial build is committed, which goes beyond the card's "after each fix round".** The card's criterion 1 says the `lead` "commits after the `coder` applies each review/acceptance fix round". Committing the build *before the first `qa` dispatch* is one commit more than that literal wording. It is required, not additive polish: without it round 1's fix lands fused with the build, the first isolable diff arrives at round 3, and the round-2 blindness that reopened this card survives the fix. The reasoning and the round-by-round trace are under *Design*; it is recorded here so the acceptance gate sees the expansion stated rather than discovering it in the diff.

**Criteria 1–3 say `reviewer`; the pipeline's local-review role is now `qa`.** There is no `reviewer.md` in the plugin — the roster is analyst, auditor, clerk, coder, lead, librarian, qa, researcher, scribe, writer, and the card's own 2026-08-01 reopening note already argues in terms of `qa`. Throughout this spec, the card's "reviewer" is read as **the fresh local-review dispatch — `qa` — and, for acceptance criteria, the fresh `auditor`**. This is a naming reconciliation, not a narrowing.

**Criterion 3 says "the simplify pass".** The standalone local `/simplify` pass no longer exists: the sibling card `feed-the-simplify-pass-the-governing-spec` was cancelled on exactly that ground ("`qa` ... surfaces findings but does not run `/simplify`"). What survives is the quality/simplification judgement inside `qa`'s review step (`qa.md` step 5: "quality — needless complexity, duplication, weak naming, wrong altitude — naming the concrete simplification where there is one"). Criterion 3 is read against that judgement and is satisfied in substance: with a per-round baseline, the reviewer can see the pre-fix text and so tell a round's remediation from unmandated filler. Requirement 3 pins this into step 5's wording so the property is stated in the product, not only here. Both cards are named as board follow-ups below.

## Risks and open questions

- **`qa.md` / `auditor.md` need no edit — stated explicitly, since the card's scope note asks.** The mechanism is entirely `lead`-side: the `lead` creates the commits and names the references in the dispatch prompt. `qa.md` step 5 already says "Read the coder's changes" without prescribing where they live, and `auditor.md` already handles resolving a prior round's finding; a dispatch prompt naming "diff `<prev>..<new>`" is consumable by both as written. **No change to either file is required, and this spec does not request one.** A later story could optionally teach `qa.md` to *expect* a baseline reference and to say so when none is given — that is a nice-to-have, not a dependency, and it is deliberately not scoped here because this task's card scopes one file. (`auditor.md` carries the additional reason that a concurrent story is editing it right now; `qa.md` does not — see *Boundary*.)
- **`coder.md:10` becomes stale.** It reads: *"You never commit. Your work stays in the story worktree and the `lead` commits it — the task ships as one commit, so there is nothing for you to stage."* After this change the task does not ship as one commit. The **obligation** (the coder never commits) is unaffected and stays correct; only the rationale clause is wrong. `coder.md` is outside this task's one-file scope, so this is **not** fixed here. The `lead` should decide: either add the one-clause fix to this task's scope, or raise a follow-up card. The root `README.md` repeats the same rationale ("because the task ships as one commit", ~line 305) — whichever way the `lead` decides, the docs pass must not leave `README.md` and `coder.md` disagreeing.
- **Interrupted-run behaviour changes, for the better.** `ARCHITECTURE.md` currently records the accepted tradeoff that "between the two commits the entire build lives only in the worktree ... it has nothing in git either". After this ships, an interrupted run has each completed round in git. That is an improvement, not a regression, but the recorded tradeoff becomes false and the docs pass must update it.

## Requirements

### Requirement: The commit model documents a commit per pre-ship round

`lead.md`'s `## The commit model` carries a bullet mandating one commit per `qa` fix round and per acceptance-gate fix round, placed between the spec commit and the ship commit, with its reason and its payoff both stated.

#### Scenario: The bullet exists and is positioned between the spec commit and the ship commit

- **WHEN** a reader inspects `lead.md`'s `## The commit model` bullet list
- **THEN** a bullet mandating a commit per pre-ship round sits **after** the "Commit 1 — the spec" bullet and **before** the ship-commit bullet, and it covers both loops by name — `qa` fix rounds and acceptance-gate fix rounds

#### Scenario: The bullet states why the commit exists

- **WHEN** a reader inspects that bullet
- **THEN** it states that it mirrors the existing "one commit per PR-review fix round" rule one phase earlier, and that without it a fresh round-2 dispatch inherits one undifferentiated tree holding the build and every round's changes folded together

#### Scenario: The bullet states what the commit enables

- **WHEN** a reader inspects that bullet
- **THEN** it states that the next fresh dispatch diffs this round's commit against the previous one instead of re-deriving every finding from scratch, and that this is what lets it check the coder changed **only** what was reported

#### Scenario: The coder's initial build is committed before the first fresh qa dispatch

- **WHEN** a reader inspects that bullet (or step 5, wherever the `coder` places it)
- **THEN** it states that the `coder`'s initial build is committed before the **first** `qa` dispatch, so that round 1's fix lands as a commit containing only that round's changes and a round-2 dispatch can diff it in isolation

#### Scenario: The round is committed even when no further dispatch follows

- **WHEN** a reader inspects that bullet (or steps 5 and 6, wherever the `coder` places it)
- **THEN** it states that the round's work is committed when the `coder` reports back **whether or not another fresh dispatch follows** — naming the case where the **3×** cap has been reached and the `lead` escalates instead of re-dispatching, and giving the reason: escalation is exactly when a human needs the diffable history of what the last round changed

#### Scenario: The round commit's composition is named in its message

- **WHEN** a reader inspects that bullet
- **THEN** it requires the commit message to name which round's findings the commit applies and any tests `qa` added that round, so a later reader of the diff can tell the coder's hunks from `qa`'s

### Requirement: The ship commit no longer claims to carry everything

The bullet that today reads "Commit 2 — everything else" is reworded to describe what actually remains uncommitted at ship time once pre-ship rounds have committed code and tests.

#### Scenario: The ship-commit bullet is scoped to what is left

- **WHEN** a reader inspects the ship-commit bullet in `## The commit model`
- **THEN** it describes the commit as whatever is still uncommitted at PR time — docs, the spec's removal, and any code or tests no round already committed — and no longer asserts that it carries literally everything else

#### Scenario: The ship label stays consistent with the workflow

- **WHEN** a reader compares the ship-commit bullet with Workflow step 8 ("Ship")
- **THEN** the two use the same label for that commit, and neither calls it "commit 2" in a way that contradicts round commits landing before it

### Requirement: The qa loop commits each round before the next fresh dispatch and hands over the baseline

Workflow step 5 orders the commit **before** the next fresh `qa` dispatch and requires the commit references to be passed into that dispatch. The commit itself is unconditional — it happens when the `coder` reports back, even in the terminal round where the cap is reached and no further dispatch follows (Requirement 1).

#### Scenario: Commit precedes the next fresh dispatch

- **WHEN** a reader inspects Workflow step 5
- **THEN** it states that after the `coder` applies a round's findings and reports back, the `lead` commits that round's work **before** dispatching the next fresh `ca77y-engineering:qa`

#### Scenario: The fresh dispatch is given what to diff

- **WHEN** a reader inspects Workflow step 5
- **THEN** it requires the `lead` to pass the commit references into the fresh `qa` dispatch — the state the previous round reviewed and the new commit — so `qa` can diff round N against round N−1 rather than re-deriving every finding from scratch

#### Scenario: The baseline is named even when there is nothing to commit

- **WHEN** a reader inspects Workflow step 5
- **THEN** it says what to do when nothing is uncommitted at that point: name the current `HEAD` as the baseline in the dispatch and say so, rather than creating an empty commit or omitting the reference

#### Scenario: Step 5 names the remediation-versus-filler use of the baseline

- **WHEN** a reader inspects Workflow step 5
- **THEN** it states that the baseline lets the fresh `qa` verify a reworded fix against the text it replaced and tell a round's remediation from unmandated, cuttable filler — so the quality/simplification judgement in its review is not silently degraded after round 1

### Requirement: The acceptance gate loop gets the same treatment

Workflow step 6 commits the round's fix before the re-audit and passes the commit reference to the fresh `auditor`. As in step 5, the commit is unconditional — including the terminal round where the acceptance cap is reached and the `lead` escalates the remaining unmet criteria instead of re-auditing (Requirement 1).

#### Scenario: Commit precedes the fresh re-audit

- **WHEN** a reader inspects Workflow step 6
- **THEN** it states that after the `coder` applies the acceptance findings, the `lead` commits that round's fix **before** dispatching the fresh `ca77y-engineering:auditor`

#### Scenario: The fresh auditor is given what to diff

- **WHEN** a reader inspects Workflow step 6
- **THEN** it requires the commit references to be passed into the fresh `auditor` dispatch, so the re-audit can diff the round's changes against the state it previously judged

### Requirement: The final handoff reports a commit count that varies

`## Final handoff` no longer implies exactly two commits.

#### Scenario: The handoff enumerates the commit kinds

- **WHEN** a reader inspects `lead.md`'s `## Final handoff`
- **THEN** the clause that today reads "the two commits and the PR link" instead names the commits the run actually produced — the spec, one per pre-ship `qa`/acceptance fix round, the ship commit, and one per PR-review fix round — making clear the count varies with how many rounds ran

### Requirement: The spec loop, the round caps, and the push points are unchanged

The change is confined to the pre-ship `qa` and acceptance-gate loops; nothing about the spec-revision loop, the 3× rule, or where pushes happen is loosened.

#### Scenario: The spec is still committed exactly once, after its gate

- **WHEN** a reader inspects Workflow step 3 and the "Commit 1 — the spec" bullet
- **THEN** both are unchanged in substance: the spec is committed once, after the `auditor`'s spec gate passes, and no per-round commit is introduced into the spec-revision loop

#### Scenario: The three-round caps are untouched

- **WHEN** a reader inspects Workflow steps 5 and 6 and the **3× rule** in *When a gate finds a problem*
- **THEN** the caps still read "capped at 3 rounds" for the qa loop and the acceptance gate, and nothing in the new commit wording presents committing as a gate, an extra round, or a reason to stop

#### Scenario: Pre-ship commits are local until the PR opens

- **WHEN** a reader inspects the closing sentence of `## The commit model` ("Push when you open the PR, and again on each fix round")
- **THEN** it is disambiguated so the per-round push applies to **PR-review** fix rounds, and the pre-ship round commits are stated to stay local until the PR is opened — no push is implied before a remote branch exists

### Requirement: The change stays inside one file and disturbs nothing shared

The edit touches `lead.md` only, leaving the shared worktree paragraph, the manifests, the board, and the counterpart agent definitions untouched.

#### Scenario: Only lead.md changed

- **WHEN** a reader inspects the build's diff (`git status` / `git diff` over the worktree)
- **THEN** `plugins/ca77y-engineering/agents/lead.md` is the only file changed by the `coder` — no edit to `qa.md`, `auditor.md`, `coder.md`, `writer.md`, the root `README.md`, `docs/ARCHITECTURE.md`, any card under `docs/tasks/`, or either plugin manifest, and no version bump (the `README.md`/`ARCHITECTURE.md` reconciliation is the docs pass's, per *Tasks*)

#### Scenario: The shared worktree paragraph is still byte-identical across five files

- **WHEN** the parity check from the root `CLAUDE.md` is run over the worktree — `grep -h '^\*\*Addressing the story worktree\.\*\*' plugins/ca77y-engineering/agents/{lead,coder,writer,qa,auditor}.md | sort -u | wc -l`
- **THEN** it prints `1`, confirming the edits landed outside that paragraph

## Validation

There is no test suite, build, or lint step for these files, and this repo has no install step (the worktree's *not provisioned: no install step* status is expected and benign). Validate against the real consumers instead:

- **`lead.md` still parses as an agent definition.** Frontmatter (`name`, `description`, `model`, `effort`) untouched; heading structure intact; the bullet list in `## The commit model` still a well-formed list.
- **The "Addressing the story worktree." parity check still prints `1`.** Run, from the worktree root:
  ```bash
  grep -h '^\*\*Addressing the story worktree\.\*\*' \
    plugins/ca77y-engineering/agents/{lead,coder,writer,qa,auditor}.md | sort -u | wc -l
  ```
  This should be a non-issue — none of the five edit sites is inside that paragraph — but it is cheap and the root `CLAUDE.md` requires it before any push, so run it and report the output.
- **Manifest versions unchanged.** Confirm both `plugins/ca77y-engineering/plugin.json` and `plugins/ca77y-engineering/.claude-plugin/plugin.json` are untouched. (Named for completeness; this task does not edit them.)
- **Internal consistency of `lead.md`.** The `## The commit model` bullets, steps 5, 6 and 8, and `## Final handoff` must agree with one another: the same name for the ship commit, no surviving "two commits" claim, no step that commits after the dispatch it is supposed to precede.
- **Cross-file consistency, checked but not edited.** The root `README.md` and `docs/ARCHITECTURE.md` both state the old model and will contradict `lead.md` until the docs pass fixes them — this is expected mid-build. The `coder` **checks and reports** the contradiction; it does not edit those files. The known invalidated statements, found while writing this spec:
  - `README.md` ~L234–238 — "Nothing is committed while work is in flight ... There are exactly two commits — the spec, then everything else — plus one per PR-review fix round."
  - `README.md` ~L209 — step 8, "**commits everything else** (commit 2)".
  - `README.md` ~L451–453 — "Nothing is committed until the lead ships: two commits (the spec, then everything else) plus one per PR-review fix round."
  - `README.md` ~L304–305 — the `coder` paragraph, "its work stays in the tree for the lead, because the task ships as one commit" (see *Risks and open questions*).
  - `docs/ARCHITECTURE.md` L155–161 — "There are exactly two commits ..." and the accepted-tradeoff paragraph "between the two commits the entire build lives only in the worktree ... it has nothing in git either. That is the price of a clean two-commit history."
- **Acceptance criteria ownership.** Card criteria 1–3 and the second half of 4 are closed by the `coder`'s prose edit and are checkable by inspection. Criterion 1's "The story states which and why" is closed on two surfaces the `coder` does not own: this spec's *Resolution chosen and why* section (already written), and the PR description the `lead` writes at step 8 — plus the "why" clause the `coder` puts in the commit-model bullet itself. The first half of criterion 4 is deliberately overridden — see *Deviations from the card*.

## Tasks

- [ ] In `lead.md` `## The commit model`, add the pre-ship round-commit bullet between "Commit 1 — the spec" and the ship-commit bullet: one commit per `qa` fix round and per acceptance-gate fix round; the `coder`'s initial build committed before the first `qa` dispatch; the reason (mirrors the PR-review rule; otherwise round 2 inherits an undifferentiated tree); the payoff (the next fresh dispatch diffs round N against N−1 and can check only the reported changes were made); the message requirement naming the round's findings plus any tests `qa` added; and the clause that the round is committed when the `coder` reports back whether or not another dispatch follows, including when the 3× cap is reached and the `lead` escalates instead.
- [ ] In the same list, reword "Commit 2 — everything else" into the ship commit: whatever is still uncommitted at PR time — docs, the spec's removal, and any code or tests no round already committed.
- [ ] In the same section, disambiguate the closing push sentence so per-round pushes apply to PR-review fix rounds and pre-ship round commits are stated to stay local until the PR opens.
- [ ] In Workflow step 5, require the round's work to be committed **before** the next fresh `qa` dispatch, the commit references to be handed to that dispatch, the current `HEAD` to be named as baseline when nothing is uncommitted, and state the remediation-versus-filler use of the baseline.
- [ ] In Workflow step 6, apply the same rule to the acceptance gate: commit the round's fix before the fresh `auditor` dispatch, and pass it the commit references to diff against.
- [ ] In Workflow step 8, replace the `(commit 2)` label so it matches the reworded ship-commit bullet.
- [ ] In `## Final handoff`, replace "the two commits and the PR link" with an enumeration of the commit kinds (spec, one per pre-ship fix round, ship, one per PR-review fix round) that makes clear the count varies.
- [ ] Confirm nothing else moved: step 3 and the spec commit unchanged; the 3× rule and both "capped at 3 rounds" clauses unchanged; only `lead.md` modified; manifests and versions untouched; the board untouched.
- [ ] Run the "Addressing the story worktree." parity check (must print `1`) and report its output.
- [ ] Report — do not fix — the contradictions this leaves in `README.md`, `docs/ARCHITECTURE.md`, and `coder.md:10`, so the `lead` can route them.
- [ ] **Not the `coder`'s task — docs pass:** reconcile the root `README.md` (the commit-model paragraph, workflow step 8, the security/isolation summary, and the `coder` "ships as one commit" rationale) and `docs/ARCHITECTURE.md` (`## The commit model`, including the "nothing in git either" tradeoff paragraph) with the new model, per `docs/CLAUDE.md`'s rule that the README is the user-facing description of every agent and is updated whenever agent behaviour changes.
- [ ] **Not the `coder`'s task — `lead`:** carry the *Resolution chosen and why* rationale into the PR description (card criterion 1: "The story states which and why"), and relay the board follow-ups below to the human.

## Board follow-ups

Reported, never edited — the board is the human's. Each names the card, the sentence, and what it should now say.

1. **`commit-each-fix-round-in-the-worktree`** (this task's own source card), acceptance criterion 4: *"The change stays consistent with the two-commit ship model (commit 1 spec, commit 2 everything else) and with the three-round caps."* The chosen resolution contradicts the first half. It should now say that the change preserves the ship model's **shape** — the spec committed separately first, everything still uncommitted bundled at ship — and the three-round caps, while the total commit count varies with the number of pre-ship rounds.
2. **`commit-each-fix-round-in-the-worktree`**, criteria 1–3, which say `reviewer`. There is no `reviewer.md` in the plugin; the local-review role is `qa` and the acceptance role is `auditor`. It should carry a dated stale-reference note — the same convention `give-reviewer-a-worktree-review-contract` already uses — reading "reviewer" as "the fresh local-review dispatch, now `qa`".
3. **`feed-the-simplify-pass-the-governing-spec`** (Cancelled), final bullet: *"Cross-links `commit-each-fix-round-in-the-worktree`: both protect the simplify pass from cutting a previous round's remediation."* Its own cancellation note establishes that no local simplify pass remains. The cross-link should now say that what survives is the quality/simplification judgement inside `qa`'s review step, and that this task protects **that** from cutting a previous round's remediation.
4. **`give-reviewer-a-worktree-review-contract`** (Done), first bullet: *"The pipeline commits only at PR time, so the `reviewer` is nearly always pointed at an uncommitted working-tree diff."* Once this ships, every `qa` dispatch after the first is pointed at committed state. It should carry a dated note beside its existing 2026-08-01 stale-reference note saying the uncommitted-target mode remains supported but is no longer the usual case.
