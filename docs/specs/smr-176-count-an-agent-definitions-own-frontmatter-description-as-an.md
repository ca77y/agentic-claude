# Count an agent definition's own frontmatter description as an edit site

- **Status**: Draft
- **Task**: smr-176-count-an-agent-definitions-own-frontmatter-description-as-an
- **Last Updated**: 2026-08-09
- **Document Scope**: One unit of work: the problem, change, and observable behavior that proves it ships

---

## Goal

When a spec enumerates the edit sites inside a definition file and scopes the `coder` to exactly
those sites, the file's frontmatter `description` is never among them. A behaviour-changing edit
therefore lands in the body while the `description` at the top of the same file keeps stating the
behaviour the change replaced. The `coder` is right to leave it — it is outside the named sites —
and no other agent is assigned to it, so the contradiction ships unless a human names it by hand in
a dispatch prompt.

That field is not incidental metadata. It is the surface other agents read when choosing a
dispatch, so a stale one is wrong product surface, not merely wrong prose. It is also the cheapest
thing in the file to check: one line at the top of a file the enumeration already has open.

**The change**: `plugins/ca77y-engineering/agents/writer.md` gains one rule in its
`### Spec authoring rules` section, placed immediately after the owning-mechanism rule it points
at. The rule names the practice of enumerating edit sites inside a definition file, folds the
frontmatter `description` into that enumeration, and requires a disposition for it — in scope as a
named edit site, or assigned to a named owner with a Tasks entry marked as not the `coder`'s.

**Non-goals** — stated as constraints on this spec's scope, not as sentences to be carried into the
shipped rule text:

- No matching check is added to `auditor.md`. This card scopes `writer.md` only; the audit-side
  counterpart for Boundary enumeration is `SMR-183`'s.
- No mechanical or CI guard. The obligation lands as authoring prose.
- No change to the enumerated-edit-site list's *permission* semantics (whether the list is an
  exclusive permission or a set of planned regions). That is `SMR-195`'s question — see
  *Coordination*.
- No version bump in either plugin manifest (root `CLAUDE.md`: version changes are a human's
  explicit request only).

## Acceptance criteria (verbatim transcription)

> **Source**: card `SMR-176`, read from Linear via the `read` binding (`get_issue`) on
> **2026-08-09**, at status `In Progress`. No criterion correction was applied to the card during
> this spec pass — every criterion is satisfiable as written, so there is no *Deviations from the
> card* section and this transcription is of the card exactly as it stands. This is a **copy, not a
> summary** — one card bullet per `ACn` line, in card order, `n = 4`. The `auditor`'s mechanical
> equality check, performed in each gate that uses this section, licenses the copy — not a promise
> that it is faithful. A verbatim copy drifts toward what the work already does exactly the way a
> paraphrase does, unless something proves it did not; that check is the proof, which is why the
> copy is permitted here where a restatement into a dispatch prompt would not be.

- **AC1** — When a task changes behaviour that an agent definition's frontmatter `description` also states, the spec either includes that description in the enumerated edit sites or names its owner with a Tasks entry — the same treatment already required for a criterion no build step can close.
- **AC2** — A `coder` scoped to enumerated sites never has to choose between staying in scope and leaving a contradiction behind.
- **AC3** — The check is stated as part of enumerating edit sites in a definition file, so it costs one line read rather than a separate pass.
- **AC4** — A stale `description` no longer depends on a human naming it in a dispatch prompt to get fixed.

## Design

### Deliverable and boundary

**The deliverable is a non-code artifact: one Markdown agent definition,
`plugins/ca77y-engineering/agents/writer.md`.** There is no application code in this change. The
project supplies no test runner and no validation command (measured below), so the prose-deliverable
branch of `coder.md` and `qa.md` applies: one inspectable assertion per Requirements scenario, and
every scenario's **THEN** below names something a reader observes by opening the changed file.

**Edit sites** — the planned regions, pinned to commit `e2eb85a` (the worktree's HEAD at the time
this spec was written), and named by their bold lead-ins so a later edit in the same pass cannot rot
the citation:

| # | File | Region | What happens |
| --- | --- | --- | --- |
| 1 | `plugins/ca77y-engineering/agents/writer.md` | `### Spec authoring rules`, immediately after the paragraph led by **A criterion no automated build step can satisfy gets a named owning mechanism — and naming one triggers a sweep of the rest.** | Insert one new rule paragraph (Requirements 1–3) |
| 2 | `plugins/ca77y-engineering/agents/writer.md` | the frontmatter `description:` field | **Checked, no change.** See the disposition below |

**Site 2 is this spec applying the rule it adds, to its own target file.** The disposition:
`writer.md`'s `description` states the writer's two modes, that its spec is gated by the `auditor`
and its docs are not, and that it writes no code and creates no commits. This change adds one
authoring rule inside the spec pass; it changes none of those statements, so the `description`
states nothing this change falsifies and is left unchanged. Recording that outcome — rather than
omitting the field from the table — is what makes "checked and unaffected" distinguishable from
"never opened".

**Must not touch:**

- The two canonical byte-identical paragraphs inside `writer.md` — **Addressing the story
  worktree.** and **Board access is granted by your caller.** Editing either requires the
  five-file and two-file sweeps the root `CLAUDE.md` mandates, which this task does not perform.
- Any other agent definition or skill, including `auditor.md` (see *Non-goals*).
- Either manifest of either plugin, and every `version` field in them.
- `docs/AGENTS_IMPROVEMENTS.md` beyond appending, per the pipeline's own append-only rule.

**Affected, but not the `coder`'s to change** — these carry a named owner and a Tasks entry, so
they are distinguishable from files that are simply unaffected:

- Root `README.md` (the writer's user-facing section) and `docs/ARCHITECTURE.md` (its account of
  the writer's spec-authoring rules). `docs/CLAUDE.md` makes the root `README.md` the user-facing
  description of every agent, to be updated when an agent's behaviour changes. **Owner: the docs
  pass**, after the build is accepted — Tasks entry 5, marked as not the `coder`'s task.

### Where the rule goes, and why there

`writer.md` today has **no** rule that names the edit-site enumeration practice at all. Measured
against the unmodified worktree at `e2eb85a`: `grep -n 'edit site\|edit-site'
plugins/ca77y-engineering/agents/writer.md` returns exactly one hit, inside the *Already satisfied
criteria* rule ("an entry that is also an edit site is satisfied *and* at risk"), which presumes the
practice rather than stating it; and `grep -n 'frontmatter' ` on the same file returns one hit,
inside the Validation rule, where frontmatter appears only as a **consumer** to be reached by
Validation, never as a site to be edited. So the rule has to do two things at once: name the
practice, and fold the `description` check into it.

The closest existing rule — and the one AC1 names as the treatment to reuse — is **A criterion no
automated build step can satisfy gets a named owning mechanism**. The new rule is placed directly
after it and **reaches that treatment by naming it, rather than restating what it requires**. This
is the repo's *stated once, pointed at from everywhere else* arrangement, recorded in
`docs/ARCHITECTURE.md` under *Four ways an obligation gets repeated*: a second independently
readable statement of one duty inside a single definition means an agent obeys whichever it reaches
first, and an edit to one silently leaves the other asserting the superseded version.

### Content the rule must carry

1. Its subject is enumerating the edit sites inside a definition file — a file whose frontmatter
   carries a `description`.
2. The frontmatter `description` is read **as part of that enumeration**, not as a separate later
   pass: one line at the top of a file the enumeration already has open.
3. The trigger is that the task changes behaviour the `description` also states.
4. Disposition A — include the `description` among the enumerated edit sites, putting it inside the
   `coder`'s named scope.
5. Disposition B — name its owning mechanism with a Tasks entry marked as not the `coder`'s task,
   by pointing at the owning-mechanism rule rather than restating it.
6. The negative case — where the `description` states nothing the change falsifies, the spec records
   that it was checked, so a checked field is distinguishable from an unopened one.
7. The reason — the `description` is what other agents read when choosing a dispatch, so a stale one
   is wrong product surface, not just wrong prose.

Points 4 and 5 are alternatives the **spec's author** chooses between at authoring time, never the
`coder`; the rule says so in its own text. **Every one of the seven points is backed by a
Requirements scenario whose THEN fails if the shipped paragraph omits it** — 1 and the paragraph's
placement by Requirement 1's first scenario, 2 by its second, 4 and 5 by its third, 5's pointer form
and the absence of any competing statement elsewhere in `writer.md` by its fourth, 7 by its fifth,
3 by Requirement 3's first, 6 by Requirement 2's second, and the alternatives' exhaustiveness and
ownership by Requirement 2's first. Nothing in this list is mandatory content that only Design
asserts.

**Widening beyond AC1's antecedent, deliberately.** AC1 speaks of an *agent definition's*
frontmatter `description`. The rule is written for any definition file whose frontmatter carries a
`description` — an agent definition or a skill — because the mechanism is identical (a skill's
`description` is the surface that decides when it is invoked) and because these tasks routinely edit
a skill definition the same way they edit an agent's. A rule covering the superset satisfies AC1;
splitting it would leave the identical gap open one file type over. This widening is marked as
deliberate scope in Requirement 1 rather than mapped to a criterion.

### Claims about dependencies

This spec asserts nothing about a third-party or vendored dependency. Every claim it makes is about
this repository's own files, read in the story worktree at commit `e2eb85a`; each is cited to the
file and the region a reader finds it by.

### Measured baseline

Both measurements were taken in the story worktree against the **unmodified** tree, during this spec
pass. The worktree's dependency-provisioning status is **no dependencies required** — this repo has
no install or bootstrap step — so command output here is trustworthy.

- **The capability is absent.** The two greps above are the measurement; there is no build,
  codegen, or merge layer between `writer.md`'s source and its effective text, so the shipped file
  *is* the effective artifact and reading it settles the claim.
- **The two canonical-paragraph drift checks pass today.** The Boundary's *must not touch* entry for
  the **Addressing the story worktree.** and **Board access is granted by your caller.** paragraphs
  rests on their being in agreement before the build, so both root-`CLAUDE.md` checks were run here,
  in the story worktree, against the unmodified tree: each printed `1`. This result came from a run
  performed during this spec pass, not from a baseline handed over. Validation item 3 re-runs them
  after the build.
- **Format/lint command: not defined.** The repository root carries no `package.json`, `Makefile`,
  or Markdown lint configuration, and `.github/workflows/` holds only the two Claude workflows. This
  is the pipeline's **not defined** outcome — the expected result for this project, recorded and
  never escalated, and never a reason to invent a command.
- **Would any scenario below pass against today's tree?** No. Every scenario's **THEN** asserts
  something about a rule that does not exist in `writer.md` at `e2eb85a`, except Requirement 4's,
  which asserts a disposition this spec is the first to record. Requirement 4 also fails today, for
  the same reason.
- **No criterion is already satisfied.** Each of `AC1`–`AC4` was tested against the prose that
  exists at `e2eb85a`, not against what this task intends to build: the rule they all speak of is
  absent from `writer.md` (the two greps above), so all four need work and every one is dispositioned
  through Requirements. The *Already satisfied criteria* section is therefore dropped, per the
  project's spec template.

### Alternative causes for a green scenario

A scenario that merely asked "does `writer.md` mention a frontmatter `description`?" would already
pass at `e2eb85a` — the Validation rule mentions frontmatter, in an unrelated role. Every scenario
below therefore names **both** the location (the `### Spec authoring rules` section, the new rule's
own paragraph) and the statement, so a passage elsewhere in the file cannot satisfy it. Where a
scenario asserts an outcome about the `coder` (AC2) or about a human's dispatch prompt (AC4), the
observation is of the rule's own text — those outcomes are properties of what the rule says, not
run-time behaviour this task can execute, and they are checked that way deliberately.

### Coordination

Six open cards share `plugins/ca77y-engineering/agents/writer.md` as an edit region, found by a
sibling sweep through the declaration's `search` binding on 2026-08-09. None is a blocker; each is a
sequencing note for whichever lands second:

- **`SMR-191`** — *Extend the owning-mechanism rule to the lead's own session and split-ownership
  criteria* (Backlog). It edits the **exact paragraph this rule points at**. If `SMR-191` lands
  first, point at the extended rule as it then reads and do not restate its two new owner
  categories; if this card lands first, `SMR-191` must keep the pointer target intact.
- **`SMR-183`** — *Enumerate a semantic mirror's other sides in the spec's Boundary* (Backlog). Its
  References already name `SMR-176` as a shared region and say "whichever of these lands second
  should read the other's shipped wording before restating anything". Both add a Boundary-side
  enumeration obligation; if `SMR-183` lands first, extend its enumeration rule rather than adding a
  second independently readable statement of edit-site enumeration.
- **`SMR-195`** — *Give the spec's Boundary section owner and reconciliation semantics* (Backlog).
  It would state that the named edit-site list is *planned regions, not an exclusive permission*,
  and would give a stale out-of-bounds file a named owner. That is the same rule region from a
  different angle; see the board follow-up in this pass's report.
- **`SMR-179`**, **`SMR-181`**, **`SMR-185`** — all scope `writer.md`'s spec-authoring rules for
  unrelated obligations. File-edit overlap only; no rule-content collision.

This task adds no shared infrastructure, so the provisioning-collision half of the sweep found
nothing to note.

## Requirements

### Requirement: The frontmatter `description` is one of the enumerated edit sites

*Maps to AC1 and AC3.*

#### Scenario: The rule exists, and its subject is enumerating edit sites in a definition file

- **WHEN** a reader opens `plugins/ca77y-engineering/agents/writer.md` at `### Spec authoring rules`
- **THEN** that section carries a rule paragraph, placed immediately after the paragraph led by
  **A criterion no automated build step can satisfy gets a named owning mechanism — and naming one
  triggers a sweep of the rest.**, whose subject is enumerating the edit sites inside a definition
  file, and that paragraph states that the file's own frontmatter `description` is read as one of
  those sites

#### Scenario: The check is part of the enumeration, not a separate pass

- **WHEN** that rule paragraph is read
- **THEN** it states that the `description` is checked while the edit sites are being enumerated —
  one line at the top of a file the enumeration already has open — and it prescribes no separate
  later pass, review step, or re-read of the file to perform the check

#### Scenario: Two dispositions when the `description` states the changed behaviour

- **WHEN** that rule paragraph is read for the case where the task changes behaviour the
  `description` also states
- **THEN** it requires one of exactly two outcomes: the `description` is included among the
  enumerated edit sites, or its owning mechanism is named together with a Tasks entry marked as not
  the `coder`'s task

#### Scenario: The owning-mechanism treatment is reached by pointer, not restated

- **WHEN** the second disposition is read, and then the rest of `writer.md` is read for statements
  of the same duties
- **THEN** the second disposition reaches the treatment by naming the existing owning-mechanism
  rule, and no other paragraph in `writer.md` carries a second independently readable statement
  either of what an owning mechanism must contain or of the frontmatter-`description` check itself —
  in particular the *Already satisfied criteria* rule's phrase "an entry that is also an edit site"
  and the Validation rule's frontmatter clause read consistently with the new rule and do not
  restate it

#### Scenario: The rule states why the `description` is worth the check

- **WHEN** that rule paragraph is read for the reason it gives
- **THEN** it states that the frontmatter `description` is the surface other agents read when
  choosing a dispatch, so a stale one is wrong product surface rather than only wrong prose

#### Scenario: The rule covers any definition file carrying a frontmatter `description`

*Deliberate scope: wider than AC1's antecedent, per* Widening beyond AC1's antecedent *in Design.*

- **WHEN** that rule paragraph is read for what kind of file it governs
- **THEN** it applies to any definition file whose frontmatter carries a `description` — an agent
  definition or a skill — rather than to agent definitions alone

### Requirement: No `coder` is left choosing between scope and a contradiction

*Maps to AC2.*

#### Scenario: The dispositions are exhaustive, and the choice belongs to the spec's author

*Distinct from Requirement 1's two-disposition scenario, which tests that the two dispositions are
stated: this one tests that they leave no third case and that the `coder` is not the one choosing
between them.*

- **WHEN** the rule is read for what it leaves the `coder` to decide
- **THEN** it states that the choice between the two dispositions is made by the spec's author at
  authoring time, and that between them they leave no case in which a `coder` must either edit
  outside the spec's named sites or knowingly leave the `description` contradicting the change

#### Scenario: The unaffected case is recorded, so silence is not a third disposition

- **WHEN** the rule is read for the case where the `description` states nothing the change falsifies
- **THEN** it requires the spec to record that the `description` was checked and needs no change, so
  a checked `description` is distinguishable from one that was never opened

### Requirement: The check is carried by the definition, not by a dispatch prompt

*Maps to AC4.*

#### Scenario: The rule is standing, and its trigger is evaluable from the task itself

- **WHEN** the rule's placement and trigger are read
- **THEN** it sits inside `### Spec authoring rules`, which governs every spec pass, and its trigger
  is a comparison the writer makes between the behaviour the task changes and what the
  `description` states — no sentence in it conditions the check on a human, a caller, or a dispatch
  prompt naming the `description` first

#### Scenario: The rule is stated in the toolkit's general voice

- **WHEN** the rule paragraph is read for the names it uses
- **THEN** it names no repository-specific file path, no card identifier, and no project-specific
  filename, referring to roles only by the pipeline's own names (`coder`, `writer`, docs pass)

### Requirement: This task records its own frontmatter-`description` disposition

*Deliberate scope: not mapped to an `ACn`. It is the rule's first application, and it is what shows
the rule is executable rather than only stated.*

#### Scenario: The target file's own `description` carries a stated disposition

- **WHEN** this spec's *Edit sites* table and the shipped
  `plugins/ca77y-engineering/agents/writer.md` are read together
- **THEN** the table names the file's frontmatter `description:` field with an explicit disposition
  of *checked, no change* and the reason for it, and the shipped file's `description` field matches
  that disposition — byte-identical to its text at `e2eb85a`

## Validation

The project defines no test runner and no validation command (measured above), so this list **is**
the validation, run by `qa` against the post-build worktree. Each item states a check and the
property it establishes, never a hit list or a count.

1. **Inspection.** Read `plugins/ca77y-engineering/agents/writer.md` and confirm each Requirements
   scenario's **THEN** by observation, one recorded assertion per scenario, each quoting the
   sentence in the new rule that satisfies it.
2. **The frontmatter still loads.** Parse `writer.md`'s frontmatter block with a real YAML loader
   and confirm it parses and still carries `name`, `description`, `model`, and `effort` — the
   frontmatter is what the plugin loader reads, and it is the consumer this change sits closest to.
3. **The canonical paragraphs are untouched.** Both drift checks in the root `CLAUDE.md` — the
   five-file **Addressing the story worktree.** check and the two-file **Board access is granted by
   your caller.** check — each still print `1`.
4. **The changed set is what the Boundary scopes.** `git status --porcelain` in the story worktree
   shows the only product file changed is `plugins/ca77y-engineering/agents/writer.md`, alongside
   this spec.
5. **No version moved.** No `version` field differs from `master` in any `plugins/*/plugin.json` or
   `plugins/*/.claude-plugin/plugin.json`.
6. **The cross-plugin guards stay clean.** Both `grep -rn` guards in the root `CLAUDE.md` for
   mis-qualified dispatch names print nothing.

## Tasks

- [ ] 1. Insert the new rule paragraph at edit site 1 — `### Spec authoring rules`, immediately
      after the owning-mechanism rule — carrying the seven content points in *Content the rule must
      carry* and satisfying Requirements 1–3.
- [ ] 2. Apply the new rule to this very file: check `writer.md`'s own frontmatter `description`
      against the change, confirm it states nothing this change falsifies, and leave it unchanged
      (edit site 2, Requirement 4).
- [ ] 3. Reconcile the rest of `writer.md` against the insertion: confirm no other paragraph now
      states a superseded thing — in particular the *Already satisfied criteria* rule's phrase "an
      entry that is also an edit site" and the Validation rule's frontmatter clause, both of which
      should read consistently with, and not duplicate, the new rule. Requirement 1's
      *reached by pointer, not restated* scenario is what this task is checked by.
- [ ] 4. Record, per Requirements scenario, the region and the exact quoted sentence in `writer.md`
      that satisfies it (the prose-deliverable branch's inspectable assertions).
- [ ] 5. **Not the `coder`'s task — the docs pass owns it, after the build is accepted:** mirror the
      new rule into the root `README.md`'s writer section and `docs/ARCHITECTURE.md`'s account of
      the writer's spec-authoring rules, then convert and remove this spec.
