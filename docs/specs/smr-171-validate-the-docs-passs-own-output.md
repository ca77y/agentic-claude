# Validate the docs pass's own output before it ships

- **Status**: Draft
- **Task**: smr-171-validate-the-docs-passs-own-output-before-it-ships
- **Last Updated**: 2026-08-09
- **Document Scope**: One unit of work: give the docs pass a self-check over the files it just authored, and give the `lead` one validation run over the tree before the ship commit is created — the two places in a run where a formatting break can reach the human as a red gate on an otherwise-clean PR

---

## Goal

**The problem.** The docs pass is the last step in a run that writes files, and nothing reads
what it produces. `plugins/ca77y-engineering/agents/writer.md` ends its `## Docs pass`
numbered list at *"Report back to the `lead`, which commits everything."* — no formatter, no
linter, no self-check. `plugins/ca77y-engineering/skills/lead/SKILL.md` step 7 (*Docs*) says
*"Trust what it returns — there is no docs-consistency gate."* Both are behaving as written:
the specification is what is missing. On a project whose CI runs a format or lint gate over
documentation, a doc the pass authors can therefore turn the PR red, and no agent in the run
is positioned to notice — `qa`'s last round (step 5) and the acceptance gate (step 6) both
finish before the docs are written.

**The change.** Two named steps, one per side of the same hole:

- **The writer's own check.** `writer.md` gains one subsection, `### Checking your own
  output`, and the docs-pass numbered list gains a step pointing at it: before reporting
  back, run the project's format or lint command over the files this pass authored, changed,
  or removed, and confirm clean. A failure inside that set is the pass's own to fix and
  re-run; a failure outside it is pre-existing and relayed. A pass that cannot clear a
  failure in its own file reports the pass as **not clean** rather than reporting success.
- **The lead's ship-time backstop.** `SKILL.md`'s *Ship and hand off* step 1 gains one
  validation run over the worktree, before the ship commit is created and therefore before
  it is pushed, so this class of break is caught whichever agent introduced it. Its failures
  route by owner and the fix folds into the ship commit, with no commit of its own.

Both commands are whatever the project defines, discovered from project context, and both
reuse the vocabulary [SMR-144](https://linear.app/ca77y/issue/SMR-144) already shipped for
exactly this discovery — three outcomes, of which *not defined* is a stated outcome rather
than a failure (see *Reusing SMR-144's wording* below). The card's coordination note asked
for that reuse explicitly, and SMR-144 has landed (commit `76f9cad`), so the condition it
named is met.

**User value.** A PR that opens green. The pipeline stops handing the human a red CI check
produced by the one pass no gate reads, and stops depending on an unrelated later round
happening to run the project's lint and notice.

**Non-goals.**

- **No new gate.** The writer's docs stay ungated: the `lead` still trusts what the docs pass
  returns, and the new step is the pass checking its own output, not a review of anyone
  else's work. The `lead`'s ship-time run is commit hygiene on the commit it is about to
  make, in the same sense the step-3 format step and lint floor already are.
- **No tool is named**, in either file, on either side.
- **The spec's formatting stays the `lead`'s.** SMR-144 settled that: `SKILL.md` step 3 says
  *"This is the `lead`'s own step, not the `writer`'s… so no other agent owns formatting the
  spec."* Nothing here reaches back to the spec commit; the docs pass's check is scoped to
  the docs pass's own file set, and by then the spec is being deleted, not written.
- **No change to `qa`'s job.** The ship-time run is one command over the tree at ship time,
  not a re-run of the `qa` loop and not a substitute for it.

## Acceptance criteria (verbatim transcription)

> **Source**: card `SMR-171`, read from Linear (the `Agentic Claude` project, `Smerfy` team)
> via the `read` binding on **2026-08-09**, at status `In Progress`, **after** this spec
> pass's correction was applied to the card (see *Deviations from the card* — the correction
> amended the dated annotation inside `AC5`, and left `AC1`–`AC4` byte-identical). This is a
> **copy, not a summary** — one card bullet per `ACn` line, in card order, `n = 5`.
>
> **Two notes on the copy's mechanics.** Linear stores an inline issue mention as an
> `<issue id="…" href="…">SMR-…</issue>` element inside the description's Markdown, and
> `AC5` carries four of them; they are copied here exactly as stored, unaltered, so the
> equality check has an exact counterpart rather than a prettified one. The card's own
> bullets use `*` (Linear rewrites `-` to `*` on save); the `- **ACn** — ` prefix here is
> the spec template's line shape, which the check normalises.
>
> **Why a checked copy is licensed where a paraphrase is not.** Elsewhere this pipeline
> forbids restating a card's criteria into a dispatch prompt, because a paraphrase drifts
> toward what the work already does. A verbatim copy carries exactly the same failure mode
> unless something proves the copy really was verbatim. The `auditor`'s **mechanical equality
> check** is that proof: it compares this section against the card's own criteria character
> for character, normalising only Linear's `-`-to-`*` bullet rewrite and its `<…>`-wrapping
> of bare URLs, and it runs that check itself inside the spec-readiness gate before judging
> anything and again inside the acceptance gate before grading any criterion, on every round
> of each. The licence is that check, not an assurance from this document that the copy is
> faithful.

- **AC1** — The docs pass ends by running the project's formatter or linter over the files it just authored and confirming clean before reporting back.
- **AC2** — The command is discovered from project context rather than hardcoded, so the step works on a project with a different toolchain or none.
- **AC3** — Where the project has no such command, the pass says so in its report rather than treating the absence as a failure.
- **AC4** — A docs pass that authors a file the project's own gate would reject cannot report success.
- **AC5** — Optionally, the `lead` runs the project's validation once before pushing the ship commit — the only commit in a run that no validation has ever seen — so this class of break is caught whichever agent introduces it. *(Corrected 2026-08-07 during the [SMR-144](<https://linear.app/ca77y/issue/SMR-144>) spec pass. "the only commit in a run that no validation has ever seen" is not true today: commit 1, the spec commit, is the other one, and that is* <issue id="8126d310-436a-410b-98ca-68b0cacece44" href="https://linear.app/ca77y/issue/SMR-144/stop-the-spec-commit-from-breaking-the-gate-the-spec-demands">SMR-144</issue>*'s entire premise. It becomes true once* <issue id="8126d310-436a-410b-98ca-68b0cacece44" href="https://linear.app/ca77y/issue/SMR-144/stop-the-spec-commit-from-breaking-the-gate-the-spec-demands">SMR-144</issue> *gives commit 1 its own format step and a post-commit lint floor. The ask here is unchanged. Coordination:* <issue id="8126d310-436a-410b-98ca-68b0cacece44" href="https://linear.app/ca77y/issue/SMR-144/stop-the-spec-commit-from-breaking-the-gate-the-spec-demands">SMR-144</issue> *introduces the* `lead`*-side wording for discovering the project's format/lint command from project context and for treating its absence as a stated outcome rather than a failure — if it lands first, reuse that wording rather than re-adding a second, differently-worded copy. Amended 2026-08-09 during this card's own spec pass:* <issue id="8126d310-436a-410b-98ca-68b0cacece44" href="https://linear.app/ca77y/issue/SMR-144/stop-the-spec-commit-from-breaking-the-gate-the-spec-demands">SMR-144</issue> *landed as commit* `76f9cad`*, so commit 1 and the conditional spec-format-fix commit are now covered by its format step and its post-commit lint floor. The clause is still not literally exact — an acceptance-gate fix-round commit is committed and then judged only by the* `auditor`*, which runs no validation, so it is unseen too unless a further* `qa` *round follows. The ask is unchanged, and it covers both cases, because a validation run at ship time sees the whole tree rather than one commit's path set.)*

**Dispositions.** Every criterion needs work; none is already true of the tree, so the
*Already satisfied criteria* section is dropped. `AC1`–`AC4` are `writer.md`'s; `AC5` is
`SKILL.md`'s. **`AC5` is taken as in scope and satisfied**, not skipped: the card marks it
optional, and this spec elects to build it, so the acceptance gate grades it as met rather
than as deliberately declined.

## Design

### The deliverable's medium

**The deliverable is a non-code artifact: two Markdown agent/skill definition files under
`plugins/ca77y-engineering/`.** This repo defines no test runner and no validation command
(measured below), so the pipeline's prose-deliverable branch applies: the `coder` records one
**inspectable assertion** per Requirements scenario rather than one scenario test, and `qa`
runs this spec's own *Validation* list as the validation. Every scenario's **THEN** below is
therefore written as an observation a reader can make by opening the changed file.

### Measured baseline (observed 2026-08-09, worktree at `91ec18f`, clean)

- The repo root holds no `package.json`, no lockfile, no `prettier`/`markdownlint`/
  `editorconfig` config, no `Makefile` and no `justfile` (`ls -a` at the worktree root).
- `.github/workflows/` holds exactly two files, `claude-code-review.yml` and `claude.yml`;
  both invoke the Claude GitHub action. Neither runs a format, lint, or test step. The review
  workflow's own comment says `actions: read` "Lets Claude read CI check results on PRs,
  **if/when this repo adds CI**".
- The root `CLAUDE.md` states the repo "has no install or bootstrap step of its own (no
  `package.json`, no lockfile)", which is why this run's dependency-provisioning status is
  *no dependencies required*.
- `grep -c 'a stated outcome, not a failure'
  plugins/ca77y-engineering/skills/lead/SKILL.md` prints `1` **today** — the count this
  spec asks to preserve, not one the build creates.
- `writer.md`'s `## Docs pass` list ends at *"Report back to the `lead`, which commits
  everything."*, and `## Boundaries` says *"Do not implement or change product code, and do
  not run the test suite."* with no carve-out. `SKILL.md`'s *Ship and hand off* step 1 reads
  *"**Commit** whatever is still uncommitted — the ship commit — and **push** the branch."*
  No criterion is satisfied at the baseline.

**Consequence, and it is deliberate:** on **this** repo both new steps take the *not defined*
outcome. The three `grep` drift checks in the root `CLAUDE.md` are targeted verification
snippets for specific paragraphs, not a project-wide format or lint gate, so a `coder` must
not press them into service as "the project's lint command"; they are run below as this
spec's own *Validation*, which is a different job. The build therefore cannot be demonstrated
by watching the new steps find a real failure here — the scenarios below are all observations
of the changed text, and that is the falsifiable form available in this mode.

### Boundary

**In bounds — the only two files the `coder` edits:**

| File | Region |
| --- | --- |
| `plugins/ca77y-engineering/agents/writer.md` | `## Docs pass` (numbered list + one new subsection), `## Boundaries`, `## Final report` |
| `plugins/ca77y-engineering/skills/lead/SKILL.md` | the opening paragraph's carve-out parenthetical, `## The commit model`, `## When a gate finds a problem`, `## Ship and hand off`, `## Boundaries`, `## Final handoff` |

Appending to `docs/AGENTS_IMPROVEMENTS.md` is permitted to any agent by its own *Process
feedback* rule and is not a scope breach.

**Out of bounds:**

- The canonical **`**Addressing the story worktree.**`** paragraph, in all five files that
  carry it byte-identically (`coder.md`, `writer.md`, `qa.md`, `auditor.md`,
  `skills/lead/SKILL.md`), and the canonical **`**Board access is granted by your caller.**`**
  paragraph in `writer.md` and `auditor.md`. Both carry a drift check in the root
  `CLAUDE.md`; neither has anything to do with this change, and editing either would force a
  multi-file byte-identical edit for no benefit.
- `coder.md`, `qa.md`, `auditor.md`, `analyst.md`, and every file under
  `plugins/ca77y-library/`.
- Both plugin manifests and every `version` field (the root `CLAUDE.md` makes a bump a
  deliberate human decision, never a step in shipping a feature).
- `README.md` and `docs/ARCHITECTURE.md` — these change, but in the **docs pass**, not the
  build; see *Owners outside the build* below.

**Semantic mirror — the other sides of what this change states.** The two new steps are a
matched pair with statements that already exist elsewhere, and each of these must be read
before the build is called finished, whether or not it turns out to need an edit:

1. `SKILL.md` step 3's format step and lint floor — the wording being reused, and the
   statement that owns spec formatting. Must stay the single home of the three-outcome list.
2. `SKILL.md` step 7 (*Docs*) — *"there is no docs-consistency gate."* Must stay true.
3. `writer.md`'s *"Your **docs** are trusted with no gate."* and its frontmatter
   `description`'s *"its docs are trusted with no gate"*. Must stay true.
4. `SKILL.md` step 6's *"It is also the **last gate you run**"* and its *Boundaries*
   *"the one outcome the run ships past"*. Must stay true — which they do only if the new
   ship-time run is stated as hygiene rather than as a gate.
5. `README.md`'s `### writer` section (its docs-pass bullet, and *"**Does not** implement
   code, run tests, or commit/branch/PR"*) and its lead step 8 — the docs pass's, below.
6. `docs/ARCHITECTURE.md`'s *The commit model* and *Three ways an obligation gets repeated* —
   the docs pass's, below.

### Reusing SMR-144's wording

The card's coordination note requires reuse rather than "a second, differently-worded copy".
SMR-144's statement lives in `SKILL.md` step 3 and is reused two different ways, because the
two new steps sit in different files:

- **Within `SKILL.md` (the ship-time run) — stated once, pointed at.** The ship step names
  the command and its routing, and refers to step 3 for the three outcomes rather than
  repeating them. This is the third arrangement in `docs/ARCHITECTURE.md`'s *Three ways an
  obligation gets repeated*, the one that file prescribes for repetition **within a single
  document**, and it is why *Validation* below asserts the three outcome bullets appear
  exactly once in `SKILL.md`.
- **Across files (the writer's check) — the same vocabulary, minimally substituted.** An
  agent is loaded with its own definition alone and cannot follow a pointer into another
  file, so `writer.md` must carry the outcomes itself. It carries SMR-144's sentences with
  only these substitutions, and no others:

| SMR-144's wording (`SKILL.md` step 3) | In `writer.md` |
| --- | --- |
| "say so in the handoff" | "say so in your report" (the writer reports; it does not hand off) |
| "concluding the spec is clean" | "concluding your docs are clean" |
| "over commit 1's path set" | "over the files this pass authored, changed, or removed" |

The bold outcome labels — **Defined and runnable**, **Not defined**, **Defined but not
trustworthy here** — and the sentences *"a stated outcome, not a failure"*, *"never invent
one"*, *"never a repo-wide write"*, and the whole `no dependencies required` clause are
carried across unchanged.

**No new drift check, deliberately.** The root `CLAUDE.md`'s `grep … | sort -u | wc -l`
checks exist for paragraphs that must bind **byte-identically** across files. These two
statements govern different commands, different scopes and different report surfaces, so
they cannot be byte-identical and a check demanding it would fail by construction. The
relationship is recorded in prose (in `docs/ARCHITECTURE.md`, by the docs pass) instead.

### What each commit in a run is checked by, and what `AC5` closes

`AC5`'s appositive — *"the only commit in a run that no validation has ever seen"* — is
load-bearing for why the step exists, so it is checked here against `SKILL.md` as it now
stands rather than inherited:

| Commit | What sees it today |
| --- | --- |
| Commit 1, the spec | step 3's format step (before every gate dispatch) and the post-commit-1 lint floor |
| The spec-format-fix commit (conditional) | re-run through the format step before it is committed |
| The `coder`'s build | committed before the **first** `qa` dispatch, so `qa` validates it |
| A `qa` fix round | committed, then the next fresh `qa` round validates it |
| An **acceptance-gate** fix round | committed, then judged by the `auditor`, which grades criteria and runs no validation |
| The **ship** commit | nothing |

So after SMR-144 the appositive is nearly, not exactly, true: the ship commit is joined by
any acceptance-round commit that no later `qa` round happened to follow. This does not change
the ask, and the step as designed covers both, because it runs over the **tree** at ship time
rather than over one commit's path set. The card now records this (see *Deviations from the
card*).

### Owners outside the build

Two consequences of this change are **not** the `coder`'s, and are assigned here so they are
not rediscovered at the acceptance gate:

- **`README.md`** — `docs/CLAUDE.md` makes the root README the user-facing description of
  every agent, to be updated when an agent's behaviour changes. Both the `### writer` docs-pass
  bullet and the `lead`'s step 8 change, and the sentence *"**Does not** implement code, run
  tests, or commit/branch/PR (the lead does)"* needs re-reading against a writer that now runs
  the project's format/lint command over its own output. **Owner: the docs pass** (pipeline
  step 7), the same way SMR-144's README change shipped. No acceptance criterion depends on it.
- **`docs/ARCHITECTURE.md`** — *The commit model* (the ship commit's paragraph) and *Three
  ways an obligation gets repeated* (the cross-file reuse recorded above). **Owner: the docs
  pass.**

Both appear in *Tasks* marked as not the `coder`'s.

### Coordination

- **`SMR-163` is `In Progress` in a sibling worktree** (`.worktrees/tokwieci/smr-163-…`,
  branched from the same `91ec18f`) and its scope is *"`plugins/ca77y-engineering/agents/
  writer.md`, spec-pass authoring rules"* — the **same file**, a different section. Whichever
  lands second reconciles with the other's shipped wording rather than restating it. Two
  specific collisions to expect: both stories append to `docs/AGENTS_IMPROVEMENTS.md`, and
  SMR-163 requires the `writer` to **run project commands during the spec pass** — if it lands
  first and has already added a carve-out to `writer.md`'s *Boundaries* bullet for running a
  project command, **extend that carve-out rather than adding a second one**.
- **`SMR-187` (`Backlog`)** already lists this card in its shared-region note for
  `SKILL.md` as *"(optionally the ship step)"*, and its own edits are to the dispatch-prompt
  rule and step 7. No overlap with the sections edited here; whichever lands second reconciles.
- **`SMR-144` (`Done`)** is the wording source, already landed. Nothing to detect and reuse
  at build time beyond what this spec quotes.

### Deviations from the card

**One correction was applied to the card, and it is not a criterion narrowing.** `AC5`'s
dated parenthetical said the clause *"becomes true once SMR-144 gives commit 1 its own format
step and a post-commit lint floor"*. SMR-144 has landed, so a reader now takes the clause as
simply true, and the table above shows it is not — an acceptance-round commit is unseen too.
Under the declaration's authority to correct a card's content during the spec pass, the
annotation was amended in place (dated 2026-08-09, appended to the same parenthetical, the
form the card already uses) to record what landed, what is still inexact, and that the ask is
unchanged. **The criterion's own ask was not touched**, and `AC1`–`AC4` were not touched.
The transcription above was taken **after** this edit.

No criterion is unsatisfiable as written, so nothing else is deviated from.

### Claims about dependencies

This spec makes no claim about a third-party or vendored dependency's behaviour, and none is
available to cite: the repo has no dependency tree (root `CLAUDE.md`: no `package.json`, no
lockfile) and the change is confined to two Markdown files. Every load-bearing claim above is
about this repo's own files and is cited by file and by the heading or quoted phrase a reader
finds it under, never by line number.

### Validation

Run in the story worktree, addressed by absolute path. The dependency-provisioning status is
*no dependencies required*, so command output here is trustworthy.

1. **Changed-file set.** `git status --short` / `git diff --stat` shows only
   `plugins/ca77y-engineering/agents/writer.md`,
   `plugins/ca77y-engineering/skills/lead/SKILL.md`, and (if appended)
   `docs/AGENTS_IMPROVEMENTS.md`.
2. **Canonical paragraphs.** `git diff -- plugins/` contains no changed line beginning
   `**Addressing the story worktree.**` or `**Board access is granted by your caller.**`; then
   both root-`CLAUDE.md` drift checks print `1`.
3. **Cross-plugin edge.** The root `CLAUDE.md`'s two cross-plugin `grep -rn` commands print
   nothing.
4. **Stated once in `SKILL.md`.** `grep -c 'a stated outcome, not a failure'
   plugins/ca77y-engineering/skills/lead/SKILL.md` prints `1`. **This is a regression guard,
   not a demonstration** — it already prints `1` at the baseline (measured 2026-08-09 at
   `91ec18f`), so on its own it would also pass against a ship step that says nothing at all.
   Pair it with the positive observation: the ship step's own text contains an explicit
   reference to step 3's outcomes.
5. **No tool named.** A case-insensitive search of the changed regions for `prettier`,
   `markdownlint`, `eslint`, `ruff`, `black`, `npm run`, `pnpm`, and `make ` returns nothing.
6. **Reading the two files end to end** against every scenario in *Requirements* below — the
   falsifiable form
   in this mode, since the project defines no format, lint, or test command (see *Measured
   baseline*). That absence is itself the expected outcome, recorded rather than escalated.
7. **Manifests.** The root `CLAUDE.md` version-parity loop prints `ok` for both plugins, and
   neither version differs from `91ec18f`.

## Requirements

### Requirement (R1): The docs pass ends with a check of its own output

#### Scenario: The numbered list has a check before the report

- **WHEN** a reader opens `plugins/ca77y-engineering/agents/writer.md` and reads the
  `## Docs pass` numbered list end to end
- **THEN** the final step is still the one that reports back to the `lead`, and the step
  immediately before it directs running the project's format or lint command over the files
  this pass authored, changed, or removed and confirming it clean, pointing at the
  `### Checking your own output` subsection instead of restating it — the same
  state-once-and-point arrangement the list already uses for *Reconciling what you touch*

#### Scenario: The check is scoped to the pass's own files

- **WHEN** the reader reads `### Checking your own output`
- **THEN** the set the command is run over is named as the files this pass authored, changed,
  or removed — not the repository, not the whole worktree — and a separate passage says a
  failure naming only files outside that set is pre-existing, to be recorded and relayed and
  never fixed

### Requirement (R2): The command is the project's, discovered, and never named

#### Scenario: No tool appears anywhere in the new text

- **WHEN** a reader searches the new subsection in `writer.md`, and the new ship-step text in
  `plugins/ca77y-engineering/skills/lead/SKILL.md`, for a concrete tool or script name —
  `prettier`, `markdownlint`, `eslint`, `black`, `ruff`, `make`, `npm run`, `pnpm`
- **THEN** none appears, and each passage instead says the command is discovered from project
  context, the same way the rest of the pipeline discovers a project's commands

#### Scenario: The writer's copy carries all three outcomes

- **WHEN** the reader reads `### Checking your own output` in `writer.md`
- **THEN** it carries three labelled outcomes — **Defined and runnable**, **Not defined**, and
  **Defined but not trustworthy here** — reproducing SMR-144's sentences with only the three
  substitutions this spec's *Reusing SMR-144's wording* table lists, including the clause that
  a status of `no dependencies required` is **not** the untrustworthy case

### Requirement (R3): A missing command is a stated outcome, not a failure

#### Scenario: The absent-command outcome is stated as such

- **WHEN** the reader reads the **Not defined** outcome in `writer.md`
- **THEN** it reads as a stated outcome rather than a failure — skip it, say so in the report,
  and never invent one — with no wording that treats the absence as a blocker, an escalation,
  or a reason to keep searching

#### Scenario: The report line requires the outcome

- **WHEN** the reader reads the **Docs pass:** bullet of `writer.md`'s `## Final report`
- **THEN** it requires the check's outcome to be reported, enumerating *ran clean*, *failures
  found in this pass's own files and re-run clean*, *not defined*, *unrunnable*, and *not
  clean*, so a pass that never ran a command is never read as a pass that ran one and passed

### Requirement (R4): A pass whose own output fails the gate cannot report success

#### Scenario: An uncleared failure is reported as not clean

- **WHEN** the reader reads `### Checking your own output` for what happens when the command
  reports a failure in a file the pass authored or changed
- **THEN** the pass is directed to fix it and re-run until clean, and where it cannot, to
  report the pass as **not clean**, naming the file, the failure, and what it tried — stated
  as the one outcome the step exists to prevent, so reporting success is not available

### Requirement (R5): The writer's other statements survive the addition

#### Scenario: The Boundaries bullet carves the check out

- **WHEN** the reader reads `writer.md`'s `## Boundaries` bullet that begins *"Do not
  implement or change product code, and do not run the test suite"*
- **THEN** it carries a carve-out naming the docs-pass self-check as hygiene on the files this
  pass itself authored — explicitly not the test suite, and judging nobody else's work — so
  the bullet and the new subsection do not give two live instructions for one decision

#### Scenario: The docs stay ungated

- **WHEN** the reader reads `writer.md`'s statement that the writer's docs are trusted with no
  gate, alongside the new subsection
- **THEN** that statement is unchanged, and the subsection itself says in so many words that
  this is a self-check and not a gate — no round is added to the run and no other agent's work
  is judged

### Requirement (R6): The lead runs the project's validation once before the ship commit

#### Scenario: The run happens before the commit is created

- **WHEN** the reader reads step 1 of `SKILL.md`'s `## Ship and hand off`
- **THEN** it directs running the project's validation once over the worktree **before** the
  ship commit is created — and therefore before it is pushed — and says why: the docs pass
  writes after `qa`'s last round and after the acceptance gate, and an acceptance fix round's
  commit is judged only by the `auditor`, which runs no validation

#### Scenario: The three outcomes are stated once in the skill

- **WHEN** a reader counts the occurrences of the three-outcome list in `SKILL.md`
- **THEN** it appears exactly once, in step 3, and the ship step reaches it by pointing at it
- **AND** the alternative cause is excluded by hand: a count of one would also hold if the
  ship step simply forgot the outcomes, so the same reading confirms the ship step carries an
  explicit reference to step 3's outcomes rather than silence

#### Scenario: Failures route by owner and fold into the ship commit

- **WHEN** the reader reads the ship step for what happens when the command reports a failure
- **THEN** a failure naming a path this run touched routes by owner per *When a gate finds a
  problem* — docs to the `writer`, code to the `coder` — with the fix folded into the ship
  commit and no commit of its own; a failure naming only paths the run never touched is
  recorded and relayed as pre-existing, never routed, never fixed, and never allowed to stop
  the run; and the **3× rule** bounds the retries, after which the failure is named in the PR
  description and the handoff rather than looped on

#### Scenario: The routing table and the handoff both carry it

- **WHEN** the reader reads `SKILL.md`'s `## When a gate finds a problem` list and its
  `## Final handoff` list
- **THEN** the routing list carries the ship-step failure's two owners, and the handoff list
  carries the run's outcome — *ran clean*, *failed and how it closed*, *skipped and why*, or
  *unrunnable* — so a ship commit no validation saw is never reported as a checked one

#### Scenario: The ship-time run is hygiene, not a gate

- **WHEN** the reader reads `SKILL.md`'s opening paragraph, its `## Boundaries` carve-out
  bullet, its `## The commit model` ship-commit bullet, and step 6's statement that the
  acceptance gate is the last gate the lead runs
- **THEN** the opening parenthetical and the carve-out bullet both name the ship-time run
  alongside the step-3 format step and lint floor, the commit-model bullet says the run
  happens before the ship commit is created so any fix folds in, and step 6's *last gate* and
  *the one gate outcome the run proceeds past* sentences are unchanged — consistent because
  the new run is stated as hygiene rather than as a gate

### Requirement (R7): Nothing outside the two files moves

#### Scenario: The canonical duplicated paragraphs are untouched

- **WHEN** the run's diff for `plugins/` is read
- **THEN** neither the `**Addressing the story worktree.**` line in any of its five files nor
  the `**Board access is granted by your caller.**` line in `writer.md` and `auditor.md`
  appears in it
- **AND** the alternative cause is named: the root `CLAUDE.md` drift greps printing `1` would
  also hold if every copy had been rewritten uniformly, so the diff is the primary observation
  here and the greps in *Validation* are corroboration, not proof

#### Scenario: The other plugin and the manifests are untouched

- **WHEN** the run's diff is read
- **THEN** no file under `plugins/ca77y-library/` appears in it, and no `version` field in
  either plugin's two manifests has changed

## Tasks

- [ ] Add `### Checking your own output` to `writer.md`'s `## Docs pass`, after
      `### Reconciling what you touch`: the scope, the three outcomes reused per the
      substitution table, the narrow attribution rule, the cannot-report-success rule, and the
      self-check-not-a-gate sentence.
- [ ] Insert the pointing step into `writer.md`'s docs-pass numbered list, immediately before
      the report-back step, and renumber.
- [ ] Extend `writer.md`'s `## Boundaries` "do not run the test suite" bullet with the
      carve-out. If SMR-163 has landed first and already added a carve-out there for running a
      project command, extend that one instead of adding a second.
- [ ] Extend the **Docs pass:** bullet of `writer.md`'s `## Final report` with the check's
      outcome.
- [ ] Re-read `writer.md`'s frontmatter `description` and its *"docs are trusted with no
      gate"* sentence; both remain true, so leave them — and say so in the build report rather
      than leaving it looking unchecked.
- [ ] Add the pre-ship validation run to `SKILL.md`'s `## Ship and hand off` step 1, pointing
      at step 3 for the three outcomes.
- [ ] Reconcile the five other `SKILL.md` sites in the same pass: the opening paragraph's
      carve-out parenthetical, `## The commit model`'s ship-commit bullet,
      `## When a gate finds a problem`'s routing list, `## Boundaries`' carve-out bullet, and
      `## Final handoff`'s report list.
- [ ] Re-read `SKILL.md` step 6 and step 7 (*"last gate you run"*, *"no docs-consistency
      gate"*); both remain true, so leave them, and say so in the build report.
- [ ] **Not the `coder`'s task — the docs pass owns it:** update `README.md`'s `### writer`
      docs-pass bullet, its `lead` step 8, and the *"Does not implement code, run tests…"*
      sentence.
- [ ] **Not the `coder`'s task — the docs pass owns it:** update `docs/ARCHITECTURE.md`'s
      *The commit model* and *Three ways an obligation gets repeated*, recording the
      cross-file reuse and why it carries no drift check.
