# Make the run's diff, not the spec, the authority for what shipped in the docs pass

- **Status**: Draft
- **Task**: smr-182-make-the-runs-diff-not-the-spec-the-authority-for-what
- **Last Updated**: 2026-08-09
- **Document Scope**: One unit of work: the problem, change, and observable behavior that proves it ships

---

## Goal

**The problem.** The `writer`'s docs pass converts a shipped spec into durable docs, and nothing in its definition tells it that the spec and the shipped code can disagree. They routinely do, by design: the `lead` commits the spec once (commit 1) and never revises it, so every later `qa` or acceptance-gate finding that changes the design lands in the code and leaves the spec describing a shape that was abandoned. The docs pass then reads that spec as if it were a record of what shipped, and folds an abandoned design into `docs/ARCHITECTURE.md` and the root `README.md` as durable fact.

**The evidence the pass has today.** At HEAD `2b564ed`, `plugins/ca77y-engineering/agents/writer.md`'s `## Docs pass` section carries the right *intent* and no *mechanism*: step 4 says *"Convert the shipped spec"*, and `### Reconciling what you touch` says *"document only what was actually built"* — but no step says where "what was actually built" is to be read from, and nothing states that the spec can describe something else. **Measured baseline** (see *Measured baseline* below): the whole `## Docs pass` region contains no occurrence of `diff`, `spec commit`, `round commit`, or `HEAD`.

**The proposed change.** Give the docs pass the evidence source it is missing, using a mechanism the run already produces. `docs/ARCHITECTURE.md`'s *The commit model* gives every run a spec commit plus one commit per pre-ship round, precisely so a fresh context can diff round N against round N−1 instead of recalling it. The docs pass is a fresh dispatch with the same problem and does not use them. After this change:

- `writer.md` states, once, that the shipped spec and the shipped code can disagree by design, and why.
- The docs pass diffs the spec commit against `HEAD` and reads the round commits' messages **before** authoring, reconciles every durable claim the spec makes against what that diff contains, and treats the diff as authoritative wherever the two disagree.
- The spec keeps its role as the source of durable *intent* — goal, design rationale, requirements.
- Divergence is named in the docs-pass report; an inability to obtain the references is reported rather than papered over.
- `SKILL.md` step 7 hands the docs-pass dispatch the spec commit and the round commit references from the ledger, so the pass has a defined source for them rather than an identification method it has to invent.
- The root `README.md` describes the added behaviour for both agents whose behaviour changes.

**User value.** Only a hand-written warning in a dispatch prompt stopped a rejected design claim reaching `docs/ARCHITECTURE.md` on the `SMR-178` run (the spec's plan table twice required the `auditor`'s freshness claim to be generalised to *"every round **and every caller**"*; the acceptance gate found the "both callers" half unsourceable and the `coder` removed it in the final commit, leaving the spec describing the pre-fix design). The safeguard was a human noticing, not a step the pass performs. This makes it a step.

**Non-goals.** This adds the evidence source the existing reconciliation duty reads from. It does not re-open the paragraph-level reconciliation duty or the spec-side sweep list `SMR-154` shipped; it does not extend any reconciliation duty to documents the *spec* pass edits (`SMR-179`); it does not change which files beyond documentation the docs pass reaches (`SMR-174`); it does not touch the docs pass's own format/lint self-check (`SMR-171`, shipped); it does not address a docs pass made stale by a sibling branch merging (`SMR-172`, a different staleness source); and it records no live-run verdict on `SMR-154`'s criteria (`SMR-180`).

## Acceptance criteria (verbatim transcription)

> **Source**: card `SMR-182`, read from **Linear** (project *Agentic Claude*, team *Smerfy*) via the `read` binding declared in `docs/ISSUE_TRACKING.md`, on **2026-08-09**, at status `In Progress`. No criterion correction was applied to the card by this spec pass — see *Deviations from the card* — so this transcription is of the card exactly as read. This is a **copy, not a summary** — one card bullet per `ACn` line, in card order, `n = 13`. The `auditor`'s mechanical equality check, performed in each gate that uses this section, licenses the copy — not a promise that it is faithful. The reasoning matters and is stated here rather than assumed: the pipeline's other rules forbid restating a card's criteria into a prompt because a paraphrase drifts toward what the work already does, and a verbatim copy carries that same failure mode unless something proves the copy really happened. The equality check is that proof, which is why the copy is licensed here and a paraphrase is not.

- **AC1** — `writer.md`'s docs pass states that the shipped spec and the shipped code can disagree by design.
- **AC2** — It states why: a spec is committed once and never revised, and a later gate finding that changes the design lands in the code.
- **AC3** — The docs pass diffs the spec commit against `HEAD` before authoring.
- **AC4** — The docs pass reads the round commits' messages as part of establishing what shipped.
- **AC5** — Each durable claim the spec makes is reconciled against what that diff contains before it is folded into a durable doc.
- **AC6** — The shipped wording makes the diff authoritative wherever the diff and the spec disagree.
- **AC7** — The spec remains the stated source of durable intent — goal, design rationale, and requirements — under the shipped wording.
- **AC8** — A divergence between the spec and the diff is named in the docs-pass report.
- **AC9** — `SKILL.md` step 7 hands the docs-pass dispatch the spec commit and the round commit references, so the pass has a defined source for them rather than an identification method it has to invent.
- **AC10** — A docs pass that cannot obtain the spec commit or the round commit references reports that, rather than reporting the spec reconciled against the diff.
- **AC11** — The duty is stated once in `writer.md`, with any other step needing it pointing at that statement, per `docs/ARCHITECTURE.md`'s *"Three ways an obligation gets repeated"*.
- **AC12** — The root `README.md` `writer` paragraph describes the added behavior.
- **AC13** — The `version` in every `plugins/*/plugin.json` and every `plugins/*/.claude-plugin/plugin.json` is unchanged by this story.

## Design

### The deliverable's medium

**The deliverable is a non-code artifact: Markdown agent and skill definitions plus the user-facing `README.md`.** There is no product code in this change and this repo ships no test runner for its own product — it is a set of Claude Code plugin definitions, with no `package.json`, no lockfile, and no build. Every requirement below is therefore written as an **inspectable assertion**: its **THEN** names a file, a region inside that file, and a passage a reader can observe present, absent, or reading a specific way. No scenario's **THEN** names build or test-runner output, because none exists to name.

### Boundary — what this task may and may not touch

**In scope, and the only files the build may change:**

| File | Region in scope |
| --- | --- |
| `plugins/ca77y-engineering/agents/writer.md` | the `## Docs pass` numbered list; one new `###` subsection under `## Docs pass`; the **Docs pass** bullet of `## Final report` |
| `plugins/ca77y-engineering/skills/lead/SKILL.md` | step 7 (*Docs*) of `## Workflow`, and nothing else in the file |
| `README.md` | the `### writer — the task's spec, then its docs` **Docs pass** bullet; the `7. **Docs**` bullet of the lead's numbered workflow |
| `docs/specs/smr-182-make-the-runs-diff-the-docs-pass-authority.md` | this spec, ticking its own Tasks list |
| `docs/AGENTS_IMPROVEMENTS.md` | append-only, and only if the build hits real pipeline friction |

**Explicitly out of scope — do not edit:**

- **The canonical `**Addressing the story worktree.**` paragraph**, carried byte-identically by `writer.md` and `SKILL.md` (among five files), and **the canonical `**Board access is granted by your caller.**` paragraph**, carried byte-identically by `writer.md` and `auditor.md`. Both files in scope carry both hazards. The root `CLAUDE.md` drift checks over them are Validation items below, and the correct outcome is that they still print `1` because nothing touched them.
- **Every `plugins/*/plugin.json` and `plugins/*/.claude-plugin/plugin.json`.** Version bumps are a deliberate human decision (root `CLAUDE.md`); none was requested. This is AC13, and it is a *do-not-touch*, not a task.
- `docs/ARCHITECTURE.md` and `docs/PRODUCT.md` — the docs pass converts this spec into them after the build; see *Owned by a mechanism other than the build* below.
- `plugins/ca77y-engineering/agents/{coder,qa,auditor}.md` — no behaviour of theirs changes.
- The `## Spec pass` section of `writer.md` — untouched, which also keeps this change clear of `SMR-179` (see *Coordination*).

**Frontmatter `description` disposition — checked, no change needed** (required by the rule shipped for `SMR-176`, and recorded here so a checked field is distinguishable from one never opened):

- `writer.md`'s `description` says the docs pass *"creates or updates the durable docs (flows, designs, features, architecture), converts the shipped spec into its permanent home, and removes it from the specs area"*. This change adds an evidence source the pass reads **before** doing exactly those things; it falsifies no clause of that sentence. Not an edit site.
- `SKILL.md`'s `description` says the lead *"dispatches … the `writer` for docs"*. This change adds what step 7's dispatch prompt carries; it falsifies no clause. Not an edit site.

Both are Tasks entries below, to be re-confirmed against the final diff rather than assumed.

### Where the duty is stated, and how the other steps reach it

AC11 pins the arrangement: within a single definition, an obligation is **stated once and pointed at from everywhere else** — the third of the four arrangements `docs/ARCHITECTURE.md` records (see *Deviations from the card* on that section's current title). `writer.md` already uses this arrangement in the same section: as the list stands today, docs-pass step 5 is a pointer at `### Reconciling what you touch` and step 7 a pointer at `### Checking your own output`, each a one-line step whose content lives in the subsection it names. This change follows the same shape:

- **One new subsection**, `### What shipped is the run's diff, not the spec`, placed under `## Docs pass` **before** `### Reconciling what you touch` — it governs an earlier step, and the two read in pipeline order that way. It carries the whole duty: the divergence and its cause (AC1, AC2), the two git reads (AC3, AC4), the reconciliation and the diff's authority (AC5, AC6), the spec's retained role (AC7), the report line's content (AC8), and the missing-references outcome (AC10).
- **The numbered list gains one step**, before the authoring step, that names what to establish and points at the subsection. Steps renumber from there. The current list is 8 steps (`1.` resolve → `8.` report); the new step lands as `3.`, making the authoring step `4.`, and the list 9 steps.
- **The step that converts the spec** (currently `4.`, becoming `5.`) points at the same subsection for the reconciliation-against-the-diff duty rather than restating it — this is the "any other step needing it" of AC11.
- **The `## Final report` docs-pass bullet** gains the divergence line. This is a report *contract* line, not a second statement of the duty: it says what to report, where every other report item is already listed, and the subsection is what says why. AC11 is satisfied by there being exactly one place a reader learns the duty from.

### What the pass actually does with the two references

Two reads, both through the story worktree, both read-only:

- `git -C <worktree> diff <spec-commit>..HEAD` — the run's whole diff since the spec was committed. This is *what shipped*. At docs-pass time `HEAD` is the last pre-ship round commit; the ship commit does not exist yet, because the docs pass's own output is part of it.
- `git -C <worktree> log <spec-commit>..HEAD` — the round commits' messages. Per *The commit model*, each names which round's findings it applies and any tests `qa` added that round, so the messages are what turn a bare textual difference into a *reason*: this changed because the acceptance gate rejected that claim. Without them the pass can see that the spec and the code differ but not that a gate is why.

**The rule the subsection states.** Where a durable claim in the spec is contradicted by the diff, the **diff wins** — the doc records what the diff contains, and the spec's version is not written down as fact. Where the diff is silent, the spec's *intent* still governs: the goal, the design rationale, and the requirements are why the change exists and remain the spec's to supply. That split is the whole of AC6 and AC7, and it must be stated as authority ("the diff is authoritative", "the spec's claim is not written down as fact"), not as a preference or an ordering, because a reader who infers precedence from step ordering alone gets nothing when the two conflict inside one sentence.

**When the references cannot be obtained** — the dispatch named none, the named commit is not in the worktree's history, or `git` cannot be run there — the pass says so in its report, naming what was missing and which claims therefore rest on the spec alone. What it must never do is report the spec as reconciled against the diff. This is deliberately shaped like the pass's existing *not defined* / *not trustworthy here* outcomes in `### Checking your own output`: a stated outcome beats a silent assumption.

### The lead side

`SKILL.md` step 7 currently reads, in full:

> **Docs.** Dispatch the `ca77y-engineering:writer` for the docs pass — a fresh dispatch, in whichever mode you choose: durable docs for what shipped, and the spec converted into its permanent home and removed from the specs area. Trust what it returns — there is no docs-consistency gate.

It gains the handover: the **spec commit** and the **round commit references**, taken from the ledger, which already records "commits made" (`## Context discipline`). The skill's *Paths, not content* rule already has dispatch prompts carrying commit refs at steps 5 and 6; step 7 is the only dispatch that needs them and does not get them. Nothing about dispatch mode changes.

### Coordination

Board sweep run 2026-08-09 through the declaration's `search` binding, over the `Agentic Claude` project. Cards sharing a region with this one:

- **`SMR-179`** (*Extend the spec pass's reconciliation duty to the documents it edits outside the spec*) — `Backlog`, so **this card lands first**. It is the closest neighbour because it also extends a `writer` reconciliation duty, but it edits the `## Spec pass` section, which this change does not touch. If `SMR-179` lands after this, it reconciles with the shipped wording of `### What shipped is the run's diff, not the spec` rather than restating it — in particular, it must not create a second independently readable statement of a reconciliation duty inside `writer.md`.
- **`SMR-187`** (*Make a shipped agent-definition change govern the run that ships it*) — **`Canceled` on 2026-08-09**. The Coordination note in this card's own References, which says `SMR-187` "also edits `SKILL.md` step 7" and that whichever ships second reconciles with the other, is **stale**: there is no second change coming to step 7 from that card. This spec therefore treats step 7 as uncontested. Reported as a board follow-up.
- **`SMR-174`**, **`SMR-135`**, **`SMR-172`**, **`SMR-133`**, **`SMR-151`** — all `Backlog`, all touching the docs pass in some way (which files it sweeps, how it routes to doc categories, re-running it after a sibling merge, criteria it exists to satisfy, cross-story doc coordination). None edits the numbered list's ordering or the region this change adds, and all land after it. Each reconciles with this shipped wording when it lands.

No shared *infrastructure* is being provisioned by this task, so the Coordination-note rule's provisioning-collision case does not arise; the sweep above is the relationship-prose case, and it ran.

### Measured baseline

Measured in the story worktree at `HEAD = 2b564ed` (clean), 2026-08-09, by a run performed here rather than a baseline handed over.

- `grep -n "diff\|spec commit\|round commit\|HEAD" plugins/ca77y-engineering/agents/writer.md` returns exactly three hits, all inside `## Spec pass` (the board-follow-up rule, the dependency-citation rule, the baseline-measurement rule). **No hit falls inside `## Docs pass`** — the docs pass has no diff or commit language at all today.
- `plugins/ca77y-engineering/skills/lead/SKILL.md` step 7 is the single sentence quoted above and carries no commit reference.
- Versions, all four manifests: `ca77y-engineering` `2.4.0` in both `plugins/ca77y-engineering/plugin.json` and `plugins/ca77y-engineering/.claude-plugin/plugin.json`; `ca77y-library` `1.1.0` in both of its manifests.
- **The project defines no format or lint command** — the *not defined* outcome, recorded and never escalated. Observed: no `package.json`, no `Makefile`, no `*.toml`, and no `.markdownlint*` at the repository root or one level below it; `.github/workflows/` holds `claude.yml` and `claude-code-review.yml`, neither of which contains a `run:` step. Consequences: the `lead`'s step-3 format step and lint floor are skipped and said to be skipped, and the docs pass's own `### Checking your own output` self-check reports *not defined*. Nothing in this spec's Validation depends on such a command.

### Deviations from the card

**No criterion is unsatisfiable as written, so nothing on the card was corrected and the transcription above is the card verbatim.** Two stale references were found while writing this spec. Neither changes what any criterion asks, so neither is a correction; both are reported as board follow-ups instead.

1. **AC11 cites `docs/ARCHITECTURE.md`'s *"Three ways an obligation gets repeated"*.** At HEAD `2b564ed` that section is titled **_Four_ ways an obligation gets repeated** — a fourth arrangement (*derived text*) was added after this card was written. The arrangement AC11 invokes is unchanged and is the third bullet, *"Stated once, pointed at from everywhere else"*. AC11 is satisfiable exactly as written; only its section title is stale.
2. **The card's References Coordination note describes `SMR-187` as a live counterpart on `SKILL.md` step 7.** `SMR-187` is `Canceled` (2026-08-09). See *Coordination* above.

**One addition beyond the card's literal Scope.** The card scopes "The root `README.md` `writer` paragraph, per `docs/CLAUDE.md`" (AC12). The rule it invokes reads *"The root `README.md` is the user-facing description of every agent. When an agent's behavior changes, update the README"* — and AC9 changes the **lead's** behaviour too. This spec therefore also scopes the README's `7. **Docs**` bullet in the lead's numbered workflow. It is required by the rule the card cites, it is graded by no `ACn`, and leaving it stale would hand the docs pass a contradiction to clean up later.

### Owned by a mechanism other than the build

Every criterion `AC1`…`AC13` is closed by the build (Tasks below) or is a do-not-touch constraint (AC13, with a Validation check). Re-read against the card, no criterion is left present-but-unassigned. One piece of work in this story is nonetheless **not the `coder`'s**:

- **Folding this spec into `docs/ARCHITECTURE.md` and removing it** is the `writer`'s docs pass, after the build, per `docs/CLAUDE.md`. It closes no `ACn`. It is listed in Tasks marked as not the `coder`'s task so the checklist does not read as complete while a durable home is still missing.

### Claims about dependencies

This change asserts nothing about a third-party or vendored dependency. Every load-bearing claim is about this repository's own files at `HEAD = 2b564ed`, cited by path and region above and re-checkable in the worktree. The one behavioural claim about an external system — that `git diff <a>..<b>` and `git log <a>..<b>` report the changes and commit messages between two commits — is standard `git` behaviour exercised by the pipeline's existing steps 5 and 6, and it is observable in the worktree rather than taken on trust.

### Validation

No build or typecheck exists to run. What Validation must reach instead is the set of consumers that actually read these files: the plugin manifests, the frontmatter each definition carries, the root `CLAUDE.md` drift checks over the canonical paragraphs both edited files carry, and the changed-file set the Boundary scopes. All commands run from the story worktree root.

1. **Version parity and immutability (AC13).** `grep -rn '"version"' plugins/` prints exactly four lines, reading `2.4.0`, `2.4.0`, `1.1.0`, `1.1.0` — the same values as the *Measured baseline*, not merely four values that agree with each other. Then run the root `CLAUDE.md` parity loop; every plugin prints `ok`.
2. **Worktree-paragraph drift check.** The root `CLAUDE.md` five-file `grep … | sort -u | wc -l` over `**Addressing the story worktree.**` prints `1`.
3. **Board-access drift check.** The root `CLAUDE.md` two-file `grep … | sort -u | wc -l` over `**Board access is granted by your caller.**` prints `1`.
4. **Cross-plugin name check.** Both root `CLAUDE.md` `grep -rn 'ca77y-…' plugins/` commands print nothing.
5. **Frontmatter intact.** `writer.md` still opens with its `---` block carrying `name: writer`, its `description`, `model: opus`, `effort: high`; `SKILL.md` still opens with `name: lead` and its `description`. Both `description` values are byte-identical to `HEAD = 2b564ed` (the disposition recorded in the Boundary).
6. **Changed-file set.** `git -C <worktree> status --porcelain` shows changes only to the files the Boundary lists as in scope.
7. **Format/lint self-check.** *Not defined* for this project (see *Measured baseline*) — recorded, skipped, and never invented.

**Added by `qa` (round 1)** — the checks below close gaps the list above left: three of the Requirements' *Alternative cause named* notes demand a **region-scoped** observation rather than a whole-file `grep`, and nothing above observed the pointer form or the wrap the two edited prose files already use.

8. **Region-scoped presence, `## Docs pass` (R2/S1's alternative cause).** `awk '/^## Docs pass/,/^## Boundaries/' plugins/ca77y-engineering/agents/writer.md | grep -n 'diff\|HEAD\|spec commit\|round commit'` returns hits inside the docs-pass region — the *Measured baseline*'s three pre-existing whole-file hits all sit in `## Spec pass`, so only a region-scoped run observes the change.
9. **Region-scoped absence, `## Spec pass`.** `awk '/^## Spec pass/,/^## Docs pass/' plugins/ca77y-engineering/agents/writer.md | grep -n 'can disagree by design\|diff is authoritative\|<spec-commit>'` prints nothing — the new duty did not leak into the spec pass.
10. **Duty stated exactly once (AC11).** `grep -c 'diff is authoritative' plugins/ca77y-engineering/agents/writer.md` prints `1`, **and** `grep -rn 'diff is authoritative\|run.s diff\|spec commit' plugins/ | grep -v 'writer.md\|SKILL.md'` prints nothing — the statement present once, and asserted by no other definition under `plugins/`.
11. **Pointer form matches the file's own convention.** `grep -c '\*###' plugins/ca77y-engineering/agents/writer.md` prints `0`. Every pointer at a subsection in `writer.md` uses the established `per *Subsection Title*` form (as at *Reconciling what you touch* and *Checking your own output*); a pointer that embeds the literal `###` marker inside the italics renders as `### What shipped …` in running prose.
12. **Prose wrap in the edited README bullets** (a nit, not a gate). `awk 'length($0)>0 && length($0)<60 && $0 !~ /^[|#>-]/ {print NR": "length($0)": "$0}' README.md` — the file wraps at ~85 columns, and a short line is normal at a paragraph's end. What this item looks for is a short line **mid-paragraph**, where the next line continues the sentence. Note before reading the result: lines 683, 712, and 716 already carried that shape at `HEAD = 2b564ed`, inside the untouched `### writer` **Spec pass** bullet, so the pattern is pre-existing in this very list and a new instance is a tidiness nit rather than a defect.

**Added by `qa` (round 2)** — item 12 as written requires a human to eyeball a ~90-line result and remember which entries pre-existed, which is how round 1's rewrap closed one orphan and opened two more without the check noticing. Item 13 makes the comparison mechanical. Item 14 closes a defect class nothing above observed at all: the numbered list was renumbered by hand.

13. **New mid-paragraph orphans only** (the mechanical form of item 12). Run item 12's `awk` over both the working tree's `README.md` and the baseline's, and diff the *text* of the short lines — line numbers shift with every edit, so comparing numbers reports noise. Four plain commands, not one pipeline: a worktree-isolated harness session refuses `diff <(…) <(…)` process substitution as too complex to verify, so the intermediates go to files.

    ```bash
    git -C <worktree> show 2b564ed:README.md > /tmp/readme_base.md
    awk 'length($0)>0 && length($0)<60 && $0 !~ /^[|#>-]/' /tmp/readme_base.md > /tmp/short_base.txt
    awk 'length($0)>0 && length($0)<60 && $0 !~ /^[|#>-]/' README.md > /tmp/short_now.txt
    diff /tmp/short_base.txt /tmp/short_now.txt
    ```

    Every `>` line is a short line this story introduced. A `>` line is a defect only when the **next** line of `README.md` continues its sentence (mid-paragraph); a `>` line that ends its paragraph or list item is correct wrapping. Read each `>` line in context before calling it either way.
14. **The docs-pass list renumbers cleanly (1…9, no gap, no repeat).** `awk '/^## Docs pass/,/^### What shipped/' plugins/ca77y-engineering/agents/writer.md | grep -o '^[0-9]*\.' | tr '\n' ' '` prints `1. 2. 3. 4. 5. 6. 7. 8. 9.` — the Tasks list inserts a step by hand and renumbers the five that follow, and a duplicated or skipped ordinal is invisible to every other check here.

## Requirements

### Requirement: The docs pass states that the spec and the shipped code can disagree, and why

#### Scenario: The divergence is stated as a designed property

- **WHEN** a reader opens `plugins/ca77y-engineering/agents/writer.md` and reads the new `### What shipped is the run's diff, not the spec` subsection under `## Docs pass`
- **THEN** that subsection contains a sentence stating that the shipped spec and the shipped code **can disagree by design** — an expected property of a run, not a mishap, a staleness warning, or an "if" — so a reader cannot come away treating agreement as the normal case with disagreement as an exception to look out for
- **AND** the statement lives inside `## Docs pass` (the region between the `## Docs pass` heading and the next `##` heading), not anywhere in `## Spec pass`

#### Scenario: The cause is stated, not just the fact

- **WHEN** the same subsection is read
- **THEN** it gives the reason in its own words: a spec is committed once and never revised, and a gate finding that changes the design after that commit lands in the **code**, leaving the spec describing the abandoned shape
- **AND** both halves are present — the commit-once-never-revised half and the later-gate-finding half — since either alone leaves a reader without the mechanism

### Requirement: The docs pass establishes what shipped, from the run's diff, before it authors anything

#### Scenario: A diff step precedes the authoring step

- **WHEN** the `## Docs pass` numbered list is read from `1.` downward
- **THEN** a step that establishes what shipped by diffing the **spec commit** against **`HEAD`** appears **before** the step that authors or updates documentation
- **AND** that step names the diff explicitly — `git -C <worktree> diff <spec-commit>..HEAD` or an equally explicit naming of those two references — rather than saying only "check what shipped"
- **AND** it points at `### What shipped is the run's diff, not the spec` instead of restating the duty

> **Alternative cause named:** a whole-file `grep` for `diff` or `HEAD` in `writer.md` passes today on three pre-existing spec-pass rules (see *Measured baseline*). Any check of this scenario is scoped to the `## Docs pass` region alone; a whole-file match proves nothing.

#### Scenario: The round commits' messages are read as part of establishing what shipped

- **WHEN** the same subsection is read
- **THEN** it requires reading the **round commits' messages** — `git -C <worktree> log <spec-commit>..HEAD` or an equally explicit naming — as part of establishing what shipped
- **AND** it says what those messages carry and why that matters: each names which round's findings it applies, which is what identifies a gate finding as the *reason* a design changed, rather than leaving the pass with an unexplained textual difference

### Requirement: The diff is authoritative over the spec, which keeps its role as the source of intent

#### Scenario: Each durable claim is reconciled against the diff before it is folded

- **WHEN** the same subsection is read
- **THEN** it requires that **each** durable claim the spec makes is checked against what the diff contains **before** that claim is folded into a durable doc — per claim, not once per spec

#### Scenario: The diff wins, stated as authority

- **WHEN** the same subsection is read
- **THEN** it states in an explicit sentence that where the diff and the spec disagree, the **diff is authoritative** — the durable doc records what the diff contains and the spec's contradicted claim is not written down as fact

> **Alternative cause named:** a reader could infer precedence from the step ordering alone (diff read first, therefore diff wins), and a check that only confirms the ordering would pass with no authority sentence present. The observation is the sentence itself, not the order of the steps.

#### Scenario: The spec remains the stated source of durable intent

- **WHEN** the same subsection is read
- **THEN** it states that the spec remains the source of durable **intent**, naming **goal**, **design rationale**, and **requirements**
- **AND** the two statements are reconciled in the shipped wording rather than left side by side — a reader can tell which of the two governs a given sentence they are about to write (the diff for what the system does; the spec for why it exists), instead of finding two live instructions and choosing

### Requirement: The docs pass reports divergence, and reports when it could not look

#### Scenario: A divergence is named in the docs-pass report

- **WHEN** the **Docs pass** bullet of `## Final report` in `writer.md` is read
- **THEN** it lists, among the items that bullet already requires, any **divergence between the spec and the run's diff** — what the spec claimed, what shipped, and where the durable doc followed the diff
- **AND** the requirement to report it is discoverable from `### What shipped is the run's diff, not the spec` as well, so a reader who reaches the duty first learns that divergence is reported

#### Scenario: Unobtainable references are reported, never assumed away

- **WHEN** the same subsection is read
- **THEN** it states that a pass which cannot obtain the spec commit or the round commit references — none was named, the commit is not in the worktree's history, or `git` cannot be run there — **reports that**, naming what was missing and which claims therefore rest on the spec alone
- **AND** it states plainly that such a pass must **not** report the spec as reconciled against the diff

### Requirement: The lead hands the docs-pass dispatch its commit references

#### Scenario: Step 7 names the spec commit and the round commit references

- **WHEN** step `7. **Docs.**` of `## Workflow` in `plugins/ca77y-engineering/skills/lead/SKILL.md` is read
- **THEN** that step states that the dispatch carries the **spec commit** and the **round commit references**, taken from the ledger
- **AND** it says why in one clause — the pass diffs the spec commit against `HEAD` to establish what shipped, because a gate finding can have changed the design after the spec was committed
- **AND** it introduces no dispatch-mode requirement, leaving "a fresh dispatch, in whichever mode you choose" intact

> **Alternative cause named:** `SKILL.md` already hands commit references to `qa` (step 5) and the `auditor` (step 6), so a whole-file `grep` for "commit references" passes today. The observation is scoped to step 7's own paragraph.

### Requirement: The duty is stated once, and every other step points at it

#### Scenario: One statement, and pointers from the steps that need it

- **WHEN** `writer.md` is read end to end
- **THEN** the duty — that the diff is what shipped and is authoritative over the spec — is stated in exactly **one** place, `### What shipped is the run's diff, not the spec`
- **AND** the new numbered step and the spec-conversion step each reach it by **naming that subsection**, carrying no second independently readable statement of it
- **AND** no other agent definition under `plugins/` asserts this duty

> **Alternative cause named:** a check that merely counts one occurrence of the duty's wording also passes when the duty is absent and every step is silent. Both halves are observed together: the statement present exactly once, **and** at least one numbered step pointing at it by name.

### Requirement: The user-facing README describes the added behaviour

#### Scenario: The writer's README description covers the docs pass's new evidence source

- **WHEN** the **Docs pass** bullet under `### writer — the task's spec, then its docs` in the root `README.md` is read
- **THEN** it describes, in the README's own user-facing voice, that the pass establishes what shipped from the run's diff (the spec commit against `HEAD`, plus the round commits' messages) because the spec and the shipped code can disagree by design, that the diff is authoritative where they disagree while the spec remains the source of intent, and that a divergence — or an inability to obtain the references — is reported

#### Scenario: The lead's README description covers the handover

- **WHEN** the `7. **Docs**` bullet of the lead's numbered workflow in the root `README.md` is read
- **THEN** it states that the lead hands the docs-pass dispatch the spec commit and the round commit references
- **AND** the surrounding sentences it touches still read true of the shipped system

## Tasks

- [x] Read `plugins/ca77y-engineering/agents/writer.md`'s `## Docs pass` section end to end, including `### Reconciling what you touch` and `### Checking your own output`, so the new subsection composes with them rather than overlapping them.
- [x] Add `### What shipped is the run's diff, not the spec` under `## Docs pass`, positioned **before** `### Reconciling what you touch`, carrying: the designed divergence (AC1); its cause (AC2); the two git reads and what the round-commit messages supply (AC3, AC4); per-claim reconciliation (AC5); the diff's authority, stated as authority (AC6); the spec's retained role as the source of intent, reconciled with the previous sentence (AC7); that divergence is reported (AC8); and the unobtainable-references outcome, including the ban on reporting the spec as reconciled (AC10).
- [x] Insert the new numbered step before the authoring step in the `## Docs pass` list — it establishes what shipped and points at the subsection — and renumber the steps that follow (the list goes from 8 steps to 9).
- [x] Make the spec-conversion step point at the same subsection for the reconcile-against-the-diff duty rather than restating it (AC11).
- [x] Add the divergence line to the **Docs pass** bullet of `## Final report` in `writer.md` (AC8).
- [x] Re-read `writer.md` end to end and confirm the duty is stated exactly once, with pointers from the steps that need it and no second independently readable copy (AC11).
- [x] Edit step 7 (*Docs*) of `## Workflow` in `plugins/ca77y-engineering/skills/lead/SKILL.md` to hand over the spec commit and the round commit references from the ledger, with the one-clause reason, and no dispatch-mode requirement (AC9).
- [x] Update the **Docs pass** bullet under `### writer — the task's spec, then its docs` in the root `README.md` (AC12).
- [x] Update the `7. **Docs**` bullet of the lead's numbered workflow in the root `README.md` (the addition recorded in *Deviations from the card*).
- [x] Confirm the `Docs` row of the README's pipeline-at-a-glance table (`durable docs (format/lint self-checked); spec converted & removed`) still reads true; leave it unchanged if it does, and record that it was checked. — **Checked: still reads true.** The row describes the pass's outputs (self-checked durable docs; spec converted & removed), which are unchanged; the new evidence-source behaviour is about how the pass establishes what shipped, not what it outputs, so the row needed no edit.
- [x] Confirm `writer.md`'s and `SKILL.md`'s frontmatter `description` values are byte-identical to `HEAD = 2b564ed` — the disposition recorded in the Boundary is *checked, no change needed*, so a diff in either is a defect to undo. — **Confirmed byte-identical**, neither file's frontmatter was touched.
- [x] Run the Validation list above, items 1–7, and record each outcome. — **1:** `grep -rn '"version"' plugins/` prints `2.4.0`, `2.4.0`, `1.1.0`, `1.1.0`, matching the baseline; the `CLAUDE.md` parity loop prints `ok` for both plugins. **2:** the five-file worktree-paragraph drift check prints `1`. **3:** the two-file board-access drift check prints `1`. **4:** both cross-plugin `grep` commands print nothing. **5:** frontmatter intact and byte-identical, confirmed above. **6:** `git status --porcelain` shows only `README.md`, `plugins/ca77y-engineering/agents/writer.md`, `plugins/ca77y-engineering/skills/lead/SKILL.md`, and (after this edit) this spec file — exactly the Boundary's in-scope files. **7:** *not defined* for this project, as measured in the baseline — recorded, skipped, never invented.
- [ ] **Not the `coder`'s task — the `writer`'s docs pass owns it:** fold this spec's durable content into `docs/ARCHITECTURE.md` (the docs pass's evidence source, alongside *The commit model* and *Four ways an obligation gets repeated*) and remove this spec from `docs/specs/`.

## Already satisfied criteria

- **AC13** → **What satisfies it:** the four manifests as they stand at `HEAD = 2b564ed` — `plugins/ca77y-engineering/plugin.json` and `plugins/ca77y-engineering/.claude-plugin/plugin.json` both at `2.4.0`, `plugins/ca77y-library/plugin.json` and `plugins/ca77y-library/.claude-plugin/plugin.json` both at `1.1.0` — together with the root `CLAUDE.md` rule that a version bump is a deliberate human decision, which none of this work requests. The criterion is a *do-not-touch*: it is true now and the build's only job is not to break it. · **What `qa` re-validates against the post-build tree:** `grep -rn '"version"' plugins/` prints those same four values, **and** `git -C <worktree> status --porcelain` plus the run's diff show no manifest among the changed files — comparing against the recorded baseline values, not merely checking the four agree with each other, since a lockstep bump of all four would pass a parity-only check. · **Does this task's own change touch that surface?** **No.** The Boundary lists every manifest as explicitly out of scope, so this entry is satisfied and not an edit site.
