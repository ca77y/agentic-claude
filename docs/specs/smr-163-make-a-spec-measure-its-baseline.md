# Make a spec measure its baseline instead of inheriting it

- **Status**: Draft
- **Task**: SMR-163
- **Last Updated**: 2026-08-09
- **Document Scope**: One unit of work: give `writer.md` an authoring rule that makes a spec's claims about the *current* state of the system measured rather than inherited, and reconcile the one existing sentence that forbids the measurement

---

## Goal

A spec's value rests on a claim about the current state of the system — *"the code lacks
X"*, *"this check passes today"*. Nothing in `plugins/ca77y-engineering/agents/writer.md`
requires that claim to be **observed**. Inherited from a card, it produces acceptance
scenarios that already pass before the task starts, or a Boundary that excludes the very
file the build must edit.

The change: add to the `writer`'s *Spec authoring rules* an evidence rule for claims about
the project's **own current state** — the claim that a capability is missing is checked
against the built, merged, or effective artifact that would carry it, and the claim that an
existing command currently passes is checked by running it — plus a pre-handoff self-check
that asks of every scenario whether it would already pass against today's tree. The
existing sentence in the `writer`'s *Boundaries* that forbids it from running the project's
checks is reconciled in the same pass, so the definition does not carry one instruction
requiring a measurement and another forbidding it.

User value: the two failure modes the card records stop reaching a build. A spec whose
headline scenarios are green before a line is written wastes a whole run; a Boundary that
excludes a file the build must edit forces the build to override it and the acceptance gate
to flag the omission.

Non-goals:

- **No auditor-side check.** The card's *Scope* is `writer.md` and its spec-pass authoring
  rules. The matching readiness check in `plugins/ca77y-engineering/agents/auditor.md` — so
  an unmeasured gap claim is reported rather than read as established — is carried as a
  named follow-up (see *Boundary*), not built here.
- **No restatement of the dependency-citation rule** (SMR-139, shipped). That rule governs
  claims about a *third-party or vendored dependency*'s behaviour, evidenced by a
  path-and-line into its installed source at the resolved version. This one governs claims
  about the project's own current state and carries no package-version machinery.
- **No restatement of the worktree/provisioning contract.** The three-value
  dependency-provisioning status and the fetch-and-run ban already live in the
  byte-identical *Addressing the story worktree* paragraph. The new rule refers to them; it
  does not copy them, and it does not edit that paragraph (see *Boundary*).
- **No plugin version bump** — versions are a manual human decision per the root
  [`CLAUDE.md`](../../CLAUDE.md).
- **No mechanical or CI guard.** The obligation lands as authoring prose in one agent
  definition.

## Acceptance criteria (verbatim transcription)

> **Source**: card `SMR-163`, read from **Linear** (the `Agentic Claude` project in the
> `Smerfy` team) via the `read` binding on **2026-08-09**, at status `In Progress`. No
> criterion correction was applied to the card during this spec pass — see *No deviations
> from the card* under *Design* for why none was needed — so this transcription is of the
> card as it stands. This is a **copy, not a summary** — one card bullet per `ACn` line, in
> card order, `n = 5`. The `auditor`'s mechanical equality check, performed in each gate
> that uses this section, licenses the copy — not a promise that it is faithful. A
> paraphrase is barred here for the reason the pipeline bars it everywhere: a restatement
> drifts toward what the work already does, and a verbatim copy carries that same failure
> mode unless something proves the copy really happened. The equality check is that proof,
> which is why the copy is licensed and the paraphrase is not.

- **AC1** — A spec may not assert that the system lacks a capability without observing the built, merged, or effective artifact that would carry it — not only the source that declares it.
- **AC2** — Where the project has a command that renders effective state (an introspect/resolved-config dump, a build output, `tsc --showConfig`), the `writer` runs it against the unmodified tree during the spec pass and records the measured baseline in the spec, so the coder and the acceptance gate scope their assertions against observed state.
- **AC3** — When a spec's value depends on an existing command's current result (a CI gate, a pre-commit hook, a smoke check), the `writer` runs that command in the story worktree before writing any Boundary exclusion that assumes it, and records the observed result.
- **AC4** — If that command fails, the failing file is in scope by definition and the Boundary and Deviations say so, rather than deferring it to an Escalation the build has to override anyway.
- **AC5** — The `writer` applies a self-check to its own draft: for every requirement, "would this scenario pass against the tree as it is today?" — any that would is not testing this task.

## Design

### Measured baseline for this spec

This spec is subject to the rule it introduces, so its own claims about the current tree
were measured before they were written. All measurements were taken in the story worktree
at `HEAD` = `91ec18f`, whose dependency-provisioning status was handed over as **no
dependencies required** — the affirmative status, so command output here is trustworthy and
nothing about provisioning is outstanding.

**What the effective artifact is, for this deliverable.** An agent definition has no build,
merge, or codegen layer between the file and what the harness loads: the plugin manifest
registers the file *by path* and the file's own bytes are what the agent runs with.
Observed at `91ec18f`: `plugins/ca77y-engineering/.claude-plugin/plugin.json` lists
`"./agents/writer.md"` in its `agents` array, and the root
`plugins/ca77y-engineering/plugin.json` carries only `name`, `description` and `version` —
it has no `agents` array and registers nothing. So for this task *declared* and *effective*
coincide, and reading `plugins/ca77y-engineering/agents/writer.md` end to end **is** the
measurement AC1 asks for. This is stated rather than assumed precisely because the card's
own background is a case where the two came apart.

**The gap claim, measured.** The claim this spec rests on — *`writer.md` today carries no
rule requiring the writer to observe the tree before asserting a gap* — was checked by
reading the whole file and by
`grep -rn "baseline\|effective config\|unmodified tree\|measure" plugins/` from the
worktree root. Every hit is unrelated: the `researcher`'s *"treat the answer as your
baseline"*, `coder.md` on the spec carrying *"every criterion the work is measured on"*, and
the `lead` skill's git-commit baselines and PR-review polling baseline. No spec-authoring
rule in `writer.md` requires observation of current state, and its *Boundaries* section
affirmatively forbids one form of it (below).

**The command baseline: outcome *not defined*.** No Boundary exclusion in this spec rests on
an existing command's current result, because this repository defines no such command. There
is no `package.json`, no lockfile, no `Makefile` or task runner at the repository root — the
root `CLAUDE.md` states this outright ("This repo has no install or bootstrap step of its
own (no `package.json`, no lockfile)") — and the only CI is
`.github/workflows/claude.yml` and `.github/workflows/claude-code-review.yml`, both of which
invoke `anthropics/claude-code-action@v1` and run no repository command. This is the
**not defined** outcome — the expected result, recorded and reported as such, not a failure
and not a gap. The one repository-mandated check that *is* runnable, the root `CLAUDE.md`
drift snippets, is measured under *How this is validated* below.

**Every criterion checked against what already exists.** AC1–AC5 were each tested against
the current `writer.md`, not against what this task intends to build. None is satisfied
today: no rule addresses effective-versus-declared state (AC1), effective-state commands
(AC2), a command run before a Boundary exclusion (AC3), or a failing command putting its
file in scope (AC4); and the nearest existing rule to AC5 — *"Every acceptance scenario must
be runnable inside the spec's own Boundary"* — asks whether a scenario **can execute**, not
whether it would **already pass**, which is a different question with a different failure
mode. Because every criterion needs work, this spec carries no *Already satisfied criteria*
section, and its absence is a measured result rather than an omission.

### No deviations from the card

No criterion is unsatisfiable as written, so this spec carries no *Deviations from the card*
section and nothing was corrected on the board. Two criteria were examined closely before
that conclusion:

- **AC4 names "an Escalation"**, a section name this project's spec shape does not use
  (`docs/_templates/spec.md`). That is a naming difference, not an unsatisfiable
  requirement: the rule is written so the failing file lands in the Boundary as in-scope and
  in the spec's Deviations content, *instead of* being deferred to an escalation for the
  build to override — which is exactly what the criterion asks for, in this project's own
  vocabulary.
- **AC3 requires the `writer` to run an existing command**, while `writer.md`'s *Boundaries*
  section today says *"Do not implement or change product code, and do not run the test
  suite."* That is a contradiction **inside the artifact being changed**, not a defect in
  the card, and it is reconciled by this task (Requirement 4) rather than deviated from.
  Left unreconciled, the shipped definition would carry two live instructions for one
  decision — the precise failure the `writer`'s own reconciliation rule exists to prevent.

### Boundary

**The deliverable is a non-code artifact: `plugins/ca77y-engineering/agents/writer.md`, a
Markdown agent definition.** This project has no test runner and no validation command (see
*Measured baseline* above), so the prose-deliverable branch applies: the `coder` records one
**inspectable assertion** per Requirements scenario — the file, the region a reader finds it
by (a heading or a **bold lead-in**, never a line number), and the exact quoted sentence
that satisfies it — in place of one scenario test per scenario, and `qa` runs this spec's
own *How this is validated* checklist in place of a validation command.

**In scope — the only file the `coder` edits:**

- `plugins/ca77y-engineering/agents/writer.md`, *Spec authoring rules*: two new rule blocks
  (Requirements 1–3).
- `plugins/ca77y-engineering/agents/writer.md`, *Boundaries*: reconcile the one bullet that
  forbids the measurement the new rules require (Requirement 4).

**Placement is part of the design, not left to taste.** The baseline rule goes immediately
**after** the third-party-dependency citation rule (*"A claim about how a third-party or
vendored dependency behaves carries a citation, or is marked as an assumption."*), and the
draft self-check immediately after that — so the evidence-discipline cluster reads: claims
about a dependency, then claims about the project's own current state, then the
alternative-cause rule that already closes the list. Adjacency is what stops the new rule
being read as a second, competing citation regime.

**Out of scope — must not be touched:**

- The two byte-identical canonical paragraphs in `writer.md`: **Addressing the story
  worktree.** (duplicated across the four worker agents and the `lead` skill) and **Board
  access is granted by your caller.** (duplicated in `writer.md` and `auditor.md`). The new
  rule *refers* to the provisioning-status vocabulary and the fetch-and-run ban those
  paragraphs carry; it never restates or edits them. Editing either would put five files
  (respectively two) out of sync — see the root `CLAUDE.md` drift checks under
  *How this is validated*.
- `writer.md`'s YAML frontmatter. Its `description` was read and deliberately left
  unchanged: it summarises the two-mode split (spec pass / docs pass) and the "writes no
  code, creates no commits" boundary, none of which this change alters. Recorded here so
  that "not edited" is distinguishable from "not considered".
- Every other agent definition, the `lead` skill, both plugin manifests, and their
  `version` fields.

**Sides of this contract that live elsewhere, with a disposition each:**

- `README.md`, the `### writer — the task's spec, then its docs` section, and
  `docs/ARCHITECTURE.md`. `docs/CLAUDE.md` requires the README to be updated when an agent's
  behaviour changes (it is "the user-facing description of every agent"), and requires a
  shipped spec's durable content to be folded into `ARCHITECTURE.md` — which already carries
  the adjacent cross-cutting sections *"A spec is written against a tree the same pass is
  editing"* and *"When the deliverable is prose, not code"* this rule sits beside.
  **Disposition: changes in this run, owned by the docs pass, not the `coder`** (see
  *Tasks*).
- `plugins/ca77y-engineering/agents/auditor.md`, readiness checklist — the matching check
  that would report an unmeasured gap claim. **Disposition: carried as a named follow-up**,
  outside the card's stated scope; reported to the `lead` as a suggested board card.

### Coordination

- **SMR-169 (Backlog) — "Hand qa a measured base-commit baseline so a red suite is
  attributable"** scopes the `lead` to run the project's validation commands against the
  base commit at worktree creation, before dispatching any agent, and hand the result to
  `qa`. That is the same measurement AC3 asks the `writer` to take, taken earlier and by a
  different agent. If SMR-169 lands first, the `writer` should **reuse the baseline the
  `lead` handed over rather than re-running the command**, and record which of the two the
  spec's stated result came from; if this card lands first, SMR-169's *"the baseline costs
  one run at creation, not one per round"* criterion should account for the spec pass's own
  run. The rule's wording should therefore permit an already-measured baseline handed to the
  `writer` to satisfy the run, rather than mandating a fresh invocation in every case.
- **Same file region, all Backlog:** SMR-185 (citations for claims about the project's own
  files), SMR-183 (semantic-mirror enumeration in the Boundary), SMR-134, SMR-137, SMR-179,
  SMR-181, SMR-176. Each adds or moves a rule in this same *Spec authoring rules* list.
  Whichever lands second reads the other's shipped wording before restating anything —
  SMR-185 in particular is the nearest neighbour by subject and its card already records the
  split with this one (a `Read` settles a presence claim; this card governs a claimed
  *absence* no `Read` of the declaring source can settle).
- **SMR-157 (Done, in this tree)** shipped the prose-deliverable branch and the three-outcome
  vocabulary (*defined and runnable* / *not defined* / *defined but not trustworthy here*).
  Requirement 1's fourth scenario **extends** that vocabulary rather than inventing a
  parallel one.

### How this is validated

There is no test runner and no validation command in this repository, so this checklist is
the validation: `qa` runs each item and captures real output. Items state a property, never
a reproducible enumeration — a hit list or a line count is checkable only until the same
pass edits what it counted.

1. **The registration still resolves.** `plugins/ca77y-engineering/.claude-plugin/plugin.json`
   still lists `./agents/writer.md` in its `agents` array and that path still exists; the
   file still opens with valid YAML frontmatter carrying `name: writer`. No other manifest
   registers agents — the root `plugins/ca77y-engineering/plugin.json` has no `agents` array
   at `91ec18f` — so this manifest is the whole consumer set for the changed file.
2. **Neither byte-identical paragraph drifted.** Both root-`CLAUDE.md` drift checks still
   print `1` — the *Addressing the story worktree* check across the four worker agents plus
   the `lead` skill, and the *Board access is granted by your caller* check across `writer.md`
   and `auditor.md`. Both were **measured at `91ec18f`, before the change, and printed `1`**,
   so a post-change `1` is a real regression check rather than a vacuous one.
   *Precondition, discovered running them here:* the snippets as written in the root
   `CLAUDE.md` use relative paths and brace expansion, and a worktree-isolated session
   refuses both the `$VAR` and the `{a,b}` forms as too complex to verify. Run each check as
   a single `grep -h '<pattern>' <path> <path> … | sort -u | wc -l` with every path written
   out in full and absolute. (The snippets' own isolation-unfriendliness is SMR-186's
   subject, not this task's.)
3. **The changed-file set is the Boundary's.** The `coder`'s diff touches
   `plugins/ca77y-engineering/agents/writer.md` and nothing else, and within that file it
   leaves the YAML frontmatter block and both byte-identical canonical paragraphs untouched.
   (The spec itself and any `docs/AGENTS_IMPROVEMENTS.md` append belong to the spec pass's
   commit, not the build's.)
4. **Neither plugin's `version` changed**, in either manifest.
5. **Every existing spec-authoring rule is still present and unweakened** — read the
   *Spec authoring rules* section end to end and confirm each bold lead-in that was there
   before is still there, in particular the dependency-citation rule, the verbatim
   transcription rule, the prose-deliverable rule, the Boundary-runnability rule and both
   sibling-sweep rules. Read them; do not settle this with a pattern match, since a rule the
   build reworded would satisfy a grep for a phrase it no longer contains and a grep for a
   phrase it never had would pass vacuously.
6. **Each Requirements scenario has its inspectable assertion**, keyed to that scenario's own
   name, quoting the sentence in `writer.md` that satisfies it.

## Requirements

Where each transcribed criterion is closed: **AC1** → Requirement 1, scenarios 1 and 3 (the
effective-artifact check, and the assumption marking for a state nothing can render);
**AC2** → Requirement 1, scenarios 2 and 4; **AC3** → Requirement 2, scenarios 1 and 3;
**AC4** → Requirement 2, scenario 2; **AC5** → Requirement 3, both scenarios. Requirements 4
and 5 close no card criterion: they are what makes the criteria coherent in the artifact —
removing the sentence that would forbid AC3's measurement, and placing the new rules where
the evidence-discipline rules already live. Every scenario below was checked against
`writer.md` as it stands at `91ec18f` and would **fail** there, per AC5's own self-check.

### Requirement: A claim that the system lacks a capability is measured against the effective artifact

#### Scenario: Declared state is not accepted as effective state

- **WHEN** a reader opens `writer.md`'s *Spec authoring rules* and looks for what governs a
  spec's claim that the system lacks a capability
- **THEN** a rule block states that the claim must be checked against the **built, merged, or
  effective** artifact that would carry it — not only the source that declares it — and says
  in its own words that declared config and effective config are different artifacts, naming
  the layers where they come apart (plugin/codegen/framework auto-configuration and the like)
  generically, without naming any framework this project does not use as a requirement

#### Scenario: An effective-state command is run against the unmodified tree and its result recorded

- **WHEN** the same rule block is read for what the `writer` does when the project has a
  command that renders effective state — an introspect or resolved-config dump, a build
  output, a `--showConfig`-style dump
- **THEN** it directs the `writer` to run that command **against the unmodified tree during
  the spec pass** and to **record the measured baseline in the spec**, stating the purpose:
  so the `coder` and the acceptance gate scope their assertions against observed state rather
  than against the card's

#### Scenario: A claim that cannot be measured is marked as an assumption, not asserted and not dropped

- **WHEN** the rule block is read for the case where no command or artifact can render the
  state the claim is about
- **THEN** it requires the claim to be written as an **explicitly marked assumption** — saying
  why it could not be measured and what would settle it — rather than dropped or asserted as
  fact, and it says this mirrors how the existing dependency-citation rule already handles an
  uncitable claim rather than establishing a second, unrelated convention

#### Scenario: The measurement takes the pipeline's existing three outcomes

- **WHEN** the rule block is read for what the `writer` records when the command exists but
  the worktree cannot be trusted — its dependency-provisioning status is *provisioning failed*
  or absent — or when the project defines no such command at all
- **THEN** it takes the same three outcomes the pipeline already uses — runnable and run;
  **not defined**, the expected result, recorded and never escalated; and **defined but not
  trustworthy here**, reported as unrunnable and never recorded as a clean baseline — and it
  reaches the provisioning vocabulary and the fetch-and-run ban **by reference to the
  contract the definition already carries**, without restating either

### Requirement: A Boundary exclusion resting on an existing command's current result is measured before it is written

#### Scenario: The command runs before the exclusion is written

- **WHEN** a reader looks in the same rule block for what happens when a spec's value depends
  on an existing command's current result — a CI gate, a pre-commit hook, a smoke check
- **THEN** it requires the `writer` to run that command **in the story worktree, before
  writing any Boundary exclusion that assumes it**, and to record the observed result in the
  spec; and it allows an equivalent baseline already measured and handed to the `writer` to
  satisfy the run, provided the spec records which of the two its stated result came from

#### Scenario: A failing command puts its file in scope, in the Boundary and the Deviations

- **WHEN** the rule block is read for the case where that command **fails**
- **THEN** it states that the failing file is **in scope by definition**, that the spec's
  Boundary names it as in scope and the spec's Deviations content records it, and that this
  replaces deferring it to an escalation the build has to override anyway

#### Scenario: The measurement run is the project's own toolchain, in its non-writing form

- **WHEN** the rule block is read for **how** the command is run
- **THEN** it requires the project's own provisioned toolchain (never a fetch-and-run
  substitute, by reference to the ban the definition already carries) and the command's
  check-only or otherwise non-writing form where one exists, so a measurement never mutates
  the tree the spec is being written against

### Requirement: The draft is self-checked against the tree as it stands today

#### Scenario: Every requirement is asked whether it would already pass

- **WHEN** a reader opens `writer.md`'s *Spec authoring rules* and looks for a pre-handoff
  check on the `writer`'s own draft
- **THEN** a rule block states the check as a question asked of **every** requirement —
  *would this scenario pass against the tree as it is today?* — and states the conclusion the
  card draws: a scenario that would already pass is not testing this task

#### Scenario: The self-check names what to do with a scenario that would already pass

- **WHEN** that rule block is read for the disposition of such a scenario
- **THEN** it names both outcomes rather than only diagnosing the problem: either the
  criterion needs nothing built, in which case it belongs in *Already satisfied criteria*
  with the evidence that section already requires, or the scenario is aimed at the wrong
  observation and is rewritten so that it would fail against today's tree

### Requirement: The definition does not forbid the measurement it now requires

#### Scenario: The Boundaries bullet distinguishes measuring the baseline from validating the build

- **WHEN** a reader opens `writer.md`'s *Boundaries* section and reads the bullet that today
  states *"Do not implement or change product code, and do not run the test suite. That
  belongs to the `lead` and its `coder`."*
- **THEN** that bullet still bars the `writer` from implementing or changing product code and
  from validating the build — which stays `qa`'s — while explicitly permitting the read-only
  baseline measurement over the **unmodified** tree that the spec pass now requires, so the
  definition carries one live instruction on this decision rather than two

#### Scenario: No other sentence in the definition contradicts the new permission

- **WHEN** `writer.md` is read end to end after the change, looking for any other sentence
  that forbids the `writer` from running the project's commands during the spec pass
- **THEN** no such sentence remains, and any sentence that needed rewording to stay true was
  reworded in the same pass rather than left as a follow-up

### Requirement: The new rules land where the evidence-discipline rules already live

#### Scenario: The rule blocks sit in the evidence cluster, in order

- **WHEN** `writer.md`'s *Spec authoring rules* section is read straight through after the
  change
- **THEN** the baseline rule block appears immediately **after** the rule beginning *"A claim
  about how a third-party or vendored dependency behaves carries a citation, or is marked as
  an assumption."*, the draft self-check block appears immediately after the baseline block,
  and the rule beginning *"A scenario asserting an observable outcome must survive asking
  what else could produce it…"* still closes the section — so the three evidence rules read
  as one cluster (a dependency's behaviour, the project's own current state, then the
  alternative-cause check) rather than as a second citation regime bolted on elsewhere

## Tasks

- [ ] Add the baseline rule block to `writer.md`'s *Spec authoring rules*, immediately after
      the third-party-dependency citation rule, satisfying Requirements 1 and 2 (a claim of
      absence measured against the effective artifact; effective-state and existing-command
      runs, their three outcomes, the assumption marking, the failing-command scope rule, and
      the non-writing-form requirement).
- [ ] Add the draft self-check rule block immediately after it, satisfying Requirement 3.
- [ ] Reconcile the *Boundaries* bullet so it no longer forbids the measurement the new rules
      require, satisfying Requirement 4's first scenario.
- [ ] Read `writer.md` end to end and reword any other sentence the new rules supersede,
      satisfying Requirement 4's second scenario — in the same pass, not as a follow-up.
- [ ] Record one **inspectable assertion** per Requirements scenario above (file, region by
      heading or bold lead-in, exact quoted sentence), keyed to the scenario's own name, per
      the prose-deliverable branch.
- [ ] Run the *How this is validated* checklist and capture real output for each item.
- [ ] **Not the `coder`'s task — owned by this run's docs pass:** mirror the shipped rule into
      `README.md`'s `### writer` section and `docs/ARCHITECTURE.md`, per `docs/CLAUDE.md`'s
      requirement that the README track an agent's behaviour change. Closed after the build,
      by the `writer`'s docs pass, not by the build.
- [ ] **Not this task — reported as a board follow-up:** the matching readiness check in
      `auditor.md`, so an unmeasured gap claim is reported rather than read as established.
      Outside the card's stated scope; named here so the gap is assigned rather than
      unnoticed.
