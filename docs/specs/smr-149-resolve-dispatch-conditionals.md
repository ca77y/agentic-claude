# Resolve a dispatch prompt's conditionals before they reach published prose

- **Status**: Draft
- **Task**: smr-149-resolve-dispatch-conditionals
- **Last Updated**: 2026-08-04
- **Document Scope**: One unit of work: the `scribe` resolves its dispatch's
  conditionals against the vault instead of publishing them, self-checks for the tell
  before reporting done, and the `clerk`'s default audit names leaked meta-instructions
  as a defect category

---

## Goal

A dispatcher that cannot know the vault's state in advance writes an if/then into the
dispatch prompt. Observed on [SMR-149](https://linear.app/ca77y/issue/SMR-149): a parent
orchestrator dispatched `scribe` to write a synthesis page while a sibling deep-dive was
still running, phrasing one section as *"if a dedicated TinyBase wiki page exists by now,
link to it as authority and summarize its conclusion in one line; if not, state
'dedicated deep-dive in progress, will supersede this entry' — do NOT perform full
analysis here."* The `scribe` reproduced that conditional verbatim in five places — the
abstract, two gate-table rows, a section heading and the open-questions list — including
*"do NOT perform full analysis here"* and *"Check whether a dedicated
`library/wiki/tinybase-*.md` page exists at this time"* as sentences in the finished
page. A reader-facing document ended up containing instructions to its own author.

Nothing in the pipeline caught it. A `clerk` audit over the same page ran two rounds and
found broken links and missing index entries — leaked meta-instruction is not one of its
named defect categories, so it was not looked for; it was flagged only once the parent
named it explicitly in the round-2 dispatch, after a manual re-read. Fixing it cost a
full extra `scribe` round.

**The change.** Two independent nets, both unconditional:

1. The `scribe` treats a dispatch conditional as an instruction *to itself*: it tests the
   condition against the actual vault at write time and publishes only the resolved
   branch's outcome, as a settled statement about what is true. Before reporting done it
   sweeps the whole batch for the tell — wording addressed to the page's author rather
   than its reader.
2. The `clerk`'s default audit checklist names leaked meta-instructions in prose as a
   defect category, so it is checked on every audit without a dispatcher naming it.

**User value.** A published wiki page states what is true of the vault, not what someone
should check. The defect is caught by the agent that writes it or by the audit that
follows it, rather than by a human re-reading the page and paying for a remediation
round.

**Non-goals.**

- No dispatcher-side change. `researcher.md` (and any other caller) may keep writing
  conditionals into dispatch prompts — the card fixes the receiving side by design, and
  a dispatcher genuinely cannot know a racing sibling's state in advance. Preventing the
  conditional at source would be a separate story; see *Board follow-ups considered*.
- No plugin version bump — versions are a manual human decision per the root
  [`CLAUDE.md`](../../CLAUDE.md).
- No raw-note-only mode for the `scribe`; that is [SMR-143](https://linear.app/ca77y/issue/SMR-143),
  a separate card that edits the same file. See *Coordination*.
- No change to `library/` content — this repository has no `library/` tree; the vault
  lives in the target project, and `library/_meta/librarian.md` is not ours to edit.

## Boundary

The deliverable is prose. In this repository the agent definitions under
`plugins/*/agents/` **are** the product (`docs/CLAUDE.md`), and the repo has no
`package.json`, no lockfile, no build and no test runner. There is therefore no scenario
test to write and no suite to run: every scenario below is falsifiable by reading a file
inside this Boundary, and the Validation procedure is a read-only checklist.

**May change** (the complete edit-site set):

- `plugins/ca77y-engineering/agents/scribe.md` — body sections `## Writing rules` and
  `## Verify before you report done`.
- `plugins/ca77y-engineering/agents/clerk.md` — body sections `## Audit workflow`
  (audit-only checks), `## Review standard`, `## Output`, **and the frontmatter
  `description`**.
- `README.md` (repo root) — the `### scribe` and `### clerk` paragraphs only.

**Must not change:**

- Either manifest under `plugins/ca77y-engineering/` — in particular the `version`
  fields, which stay `2.2.1`.
- The canonical **"Addressing the story worktree."** and **"Working from the board
  profile."** paragraphs. Neither `scribe.md` nor `clerk.md` carries either one today and
  neither may gain a copy; both root-`CLAUDE.md` verification greps must still print `1`.
- Any other agent definition (`researcher.md`, `analyst.md`, `librarian.md`, the pipeline
  agents) and `docs/ARCHITECTURE.md` — the roster, model table and dispatch model are
  unaffected by this change.
- `plugins/ca77y-engineering/agents/scribe.md`'s frontmatter `description`: it is
  **checked** (see R5) and left unchanged, because nothing it states becomes stale.

**No dependency claims.** This spec asserts nothing about the behaviour of a third-party
or vendored dependency; the repository has none. There is consequently no citation to
give and none was skipped.

## Design

### `scribe.md` — resolve, then self-check

**A new `## Writing rules` bullet: resolve the dispatch, never publish it.** A conditional
in the dispatch prompt is an instruction to the `scribe`, not content. Where the prompt
says *"if X exists, do A; if not, do B"*, the `scribe` settles X against the vault at
write time using the same mechanical checks the definition already mandates for wikilink
targets (filename match, glob, or `grep -rl`), then writes only the resolved branch's
outcome, phrased as a settled statement about the vault's current state. Where the
condition genuinely cannot be settled, the page still states what is true now (*"no
dedicated page for X exists yet"*) and the unresolved condition goes in the report to the
caller — never into the page. This lands in `## Writing rules`, which applies to every
page the `scribe` writes, so it is not gated on a caller mentioning conditionals.

**A new `## Verify before you report done` check: sweep for the tell.** Before reporting,
the `scribe` re-reads and greps every page it created or edited in the pass for wording
addressed to the page's *author* rather than its reader. The definition names the tell so
the check is mechanical rather than a matter of taste: *"check whether"*, *"if … exists"*,
*"do NOT"*, *"at this time"*, *"will supersede"*, *"in progress"* used as a process status
rather than a fact about the subject, *"TODO"*, and any reference to the dispatch itself.
Every hit is resolved into a statement of fact or removed before the pass may be reported
done.

Two properties this check must carry, both taken from how the observed defect actually
behaved:

- **Batch-wide and page-wide.** The leak reproduced in five separate places on one page.
  The existing *"Sweep the whole batch before reporting a class handled"* rule already
  states the general form; this check is written as an instance of it, so one resolved
  occurrence never closes the class, and the `library/_meta/log.md` entry states the
  count swept exactly as that rule already requires.
- **Published prose only.** The tell list contains *"do NOT"*, which is also the exact
  form of a legitimate caller prohibition (*"do NOT touch the shared meta files"*). The
  rule is explicit that it governs what reaches a page: a prohibition addressed to the
  `scribe` is still obeyed as an instruction; it simply never appears in a page. Without
  that sentence the two rules read as contradictory. See *Coordination* for the sibling
  card this protects.

### `clerk.md` — a named default defect category

A new numbered entry in `## Audit workflow`'s **audit-only checks**: *leaked
meta-instructions in published prose* — a page carrying wording addressed to its own
author rather than its reader. Four recognisable forms, all observed or directly implied
by the incident: an unresolved dispatch conditional (*"if a dedicated X page exists, link
it; if not, state …"*), an instruction to check something (*"check whether
`library/wiki/x-*.md` exists at this time"*), a prohibition (*"do NOT perform full
analysis here"*), and a process-status sentence that describes the writing of the page
rather than its subject (*"dedicated deep-dive in progress, will supersede this entry"*).

Placement is deliberate. The audit-only checks are the part of the checklist `clerk.md`
owns; the *Convention compliance* paragraph — which is where the placeholder-header and
callout checks the card names live — explicitly defers to the target project's
`library/_meta/librarian.md` and forbids keeping a second copy here. This repository does
not contain that file, so the category is named where `clerk.md` can actually carry it.
See *Deviations from the card*.

Three properties the entry must carry:

- **Default, not requested.** It sits in the standing numbered list, ungated by mode or by
  a caller request, so a dispatcher never has to name it. This is the direct fix for
  *"only confirmed it gone once the parent named it explicitly"*.
- **Ranked as a library-integrity issue.** In `## Output`'s severity ordering it belongs
  under **1. Critical library-integrity issues**: the page asserts to a reader something
  that is not true of its subject. Stating the rank in the definition stops each audit
  guessing.
- **Bounded against false positives.** A page may legitimately *quote* an instruction as
  its subject matter; the check targets prose in the page's own voice. The existing
  `library/_meta/templates/` exception in `## Audit scope` (Templater `<% %>` placeholders
  and intentionally empty sections) continues to apply unchanged.

Every occurrence is reported, not the first — the same discipline check 8 already states
for log-claim reconciliation, and the reason the observed leak needed a full second round.

### Mirrors: frontmatter and README

`clerk.md`'s frontmatter `description` enumerates the defect categories it audits for
("duplicate wiki pages, stale index entries, broken links, uncited claims, missing
taxonomy tags, unsynthesized raw notes, and convention violations"). Adding a category
without extending that list leaves the description stating the behaviour the change
replaced — the exact defect [SMR-176](https://linear.app/ca77y/issue/SMR-176) exists to
prevent — and that description is what another agent reads when choosing a dispatch.
`scribe.md`'s description states what it ingests and updates; nothing in it becomes stale,
so it is checked and left alone, and the check is recorded rather than silently skipped.

`docs/CLAUDE.md` makes the root `README.md` the user-facing description of every agent,
to be updated whenever an agent's behavior changes. Both README paragraphs already
describe these agents at this level of detail (the `### scribe` paragraph enumerates its
verify-before-done checks; the `### clerk` paragraph enumerates its audit categories), so
mirroring is an extension of existing sentences, not a new section.

### Risks

- **Over-triggering.** *"do NOT"* and *"in progress"* appear in legitimate prose. Mitigated
  by scoping both the `scribe` check and the `clerk` category to the page's own voice, and
  by the quoted-material and templates exclusions. The residual cost of a false positive is
  a reported finding a human dismisses — cheaper than the round the false negative cost.
- **Two nets, one wording.** The `scribe`'s tell list and the `clerk`'s category describe
  the same defect from two sides. They are deliberately not factored into a shared file:
  there is no include mechanism across these `.md` files, and unlike the canonical
  paragraphs in the root `CLAUDE.md` these two are written for different jobs (self-check
  vs. audit finding) and are not required to match byte for byte.

## Requirements

### Requirement: The `scribe` resolves dispatch conditionals against the vault

#### Scenario: conditional resolved before writing

- **WHEN** a `scribe` dispatch contains a conditional whose truth depends on vault state
  (*"if a dedicated `library/wiki/tinybase-*.md` page exists by now, link to it; if not,
  state 'deep-dive in progress'"*)
- **THEN** `scribe.md` directs it to settle that condition against the vault at write time
  by a mechanical check (filename match, glob, or `grep -rl`) and to publish only the
  resolved branch's outcome, phrased as a settled statement about the vault's current
  state

#### Scenario: condition that cannot be settled

- **WHEN** the condition cannot be settled from the vault
- **THEN** the rule directs the `scribe` to state what is currently true in reader-facing
  terms (*"no dedicated page for X exists yet"*) and to report the unresolved condition to
  the caller, and forbids reproducing the caller's if/then wording in the page

#### Scenario: the rule is not gated on the dispatch

- **WHEN** a dispatch says nothing about conditionals or about how to phrase the page
- **THEN** the rule still governs, because it is written into `scribe.md`'s standing
  `## Writing rules` section rather than as a response to a caller instruction

### Requirement: The `scribe` self-checks for the tell before reporting done

#### Scenario: tell sweep blocks "done"

- **WHEN** the `scribe` is about to report a pass done
- **THEN** `## Verify before you report done` requires sweeping every page created or
  edited in the pass for author-facing wording against a named tell list (*"check
  whether"*, *"if … exists"*, *"do NOT"*, *"at this time"*, *"will supersede"*, *"in
  progress"* as a process status, *"TODO"*, any reference to the dispatch), and every hit
  must be resolved into a statement of fact or removed before the pass may be reported
  done

#### Scenario: every occurrence, not the first

- **WHEN** one occurrence of the tell is found and fixed
- **THEN** the check is written as an instance of the existing batch-sweep rule — the
  whole page and the whole batch are swept for the same wording before the class may be
  reported handled, and the `library/_meta/log.md` entry states the count swept

#### Scenario: a caller prohibition is obeyed, not published

- **WHEN** the dispatch carries a prohibition addressed to the `scribe` (*"do NOT touch
  the shared meta files — the parent owns those"*)
- **THEN** the definition states explicitly that the tell check governs published page
  prose only: the instruction is still obeyed as an instruction, and simply never appears
  in a page

### Requirement: The `clerk`'s default audit names leaked meta-instructions

#### Scenario: named defect category

- **WHEN** `clerk.md`'s `## Audit workflow` audit-only checks are read
- **THEN** they include a numbered entry for leaked meta-instructions in published prose,
  naming the four forms (unresolved dispatch conditional, instruction to check something,
  prohibition, process-status sentence about the page's own writing) and requiring the
  file path, the offending wording, and the recommended fix

#### Scenario: no dispatcher naming required

- **WHEN** an audit dispatch does not mention this defect at all
- **THEN** the check still runs, because it sits in the standing numbered checklist and is
  not gated on a caller request, on read-only vs. fix mode, or on any conditional phrase

#### Scenario: severity is stated, not guessed

- **WHEN** the `clerk` reports a leak
- **THEN** `clerk.md` places it under **1. Critical library-integrity issues** in the
  `## Output` ordering, on the stated ground that the page asserts to a reader something
  that is not true of its subject

#### Scenario: quoted instructions and templates are excluded

- **WHEN** a page legitimately quotes an instruction as its subject matter, or the file
  lies under `library/_meta/templates/`
- **THEN** the check does not flag it — the entry scopes itself to prose in the page's own
  voice and leaves the existing `## Audit scope` templates exception intact

#### Scenario: every occurrence reported

- **WHEN** the same leaked wording appears more than once in a page or across pages
- **THEN** the entry requires reporting every instance, not the first, matching the
  discipline audit-only check 8 already states

### Requirement: Neither net depends on a human re-read

#### Scenario: two independent, unconditional nets

- **WHEN** the shipped `scribe.md` and `clerk.md` are read together
- **THEN** the writing-side self-check and the audit-side category each catch the defect
  on their own, and neither is conditioned on a dispatcher naming the defect, on a human
  re-reading the published page, or on the other net having run

*The remaining half of the card's fourth criterion — that such a leak is "never a reason
for an extra remediation round" — is an outcome over future runs that no inspection of
this diff can close. Its owner is named in* Validation *step 7 and in* Tasks*.*

### Requirement: The change stays inside the repo's maintenance rules

#### Scenario: no version bump

- **WHEN** the shipped diff is reviewed
- **THEN** neither `plugins/ca77y-engineering/plugin.json` nor
  `plugins/ca77y-engineering/.claude-plugin/plugin.json` is modified, both still read
  `2.2.1`, and the root `CLAUDE.md` parity script prints `ok` for every plugin

#### Scenario: canonical paragraphs untouched

- **WHEN** the two verification greps in the root `CLAUDE.md` are run against the worktree
- **THEN** each prints `1`, and neither `scribe.md` nor `clerk.md` has gained a copy of
  either canonical paragraph

#### Scenario: user-facing surfaces mirror the change

- **WHEN** the `clerk` gains a defect category
- **THEN** its frontmatter `description` names it alongside the categories it already
  lists, and the root `README.md` `### clerk` paragraph does the same; the `### scribe`
  paragraph names the resolve-and-self-check behaviour; and `scribe.md`'s frontmatter
  `description` is confirmed to state nothing the change makes stale and is left unchanged

#### Scenario: changed-file set is exactly the Boundary

- **WHEN** `git -C <worktree> status --short` is run after the build
- **THEN** the changed files are exactly `plugins/ca77y-engineering/agents/scribe.md`,
  `plugins/ca77y-engineering/agents/clerk.md`, `README.md`, and this spec — no test file,
  no `library/` file, no other agent definition

## Coordination

- **[SMR-143](https://linear.app/ca77y/issue/SMR-143) — "Give the scribe a raw-note-only
  mode so a caller prohibition cannot be overridden"** (Backlog) edits the same file,
  `scribe.md`, and touches the same subject from the opposite side: it makes a caller's
  *"do NOT touch the shared meta files"* binding, while this card stops *"do NOT …"*
  wording reaching a page. If SMR-143 lands first, the `coder` must reconcile rather than
  re-state: the tell-check bullet's "published prose only" sentence should point at
  SMR-143's named mode instead of describing the prohibition in prose. If this card lands
  first, SMR-143's mode work must leave that sentence intact. Read the current
  `scribe.md` before editing rather than assuming the pre-SMR-143 shape. The two cards
  are now recorded as related on the board.
- **[SMR-157](https://linear.app/ca77y/issue/SMR-157) — "Give the pipeline a
  prose-deliverable mode for tasks with no test runner"** (Backlog, Urgent) is not yet
  shipped, which is why the Boundary and Validation sections above state the prose-mode
  contract inline. If SMR-157 lands first, the `coder` and `qa` should follow the
  definitions' own prose branch and treat this spec's Validation checklist as the
  project's stated validation procedure rather than as a one-off override.

## Validation

Read-only; this repository has no build, no test runner and no validation command, and
finding none is the expected result, not a blocker. Run every step against the worktree
and capture real output.

1. `grep -n` `plugins/ca77y-engineering/agents/scribe.md` for the new `## Writing rules`
   bullet — confirm it mandates the mechanical vault check, the resolved-branch-only
   publication, the unresolvable-condition fallback, and that it sits in the standing
   section (R1).
2. `grep -n` the same file's `## Verify before you report done` — confirm the tell list,
   the batch/page sweep, the log-count requirement, and the "published prose only"
   sentence (R2).
3. `grep -n` `plugins/ca77y-engineering/agents/clerk.md` — confirm the new numbered
   audit-only entry with its four forms, its ungated placement, the stated severity rank,
   the quoted-material and templates exclusions, and the every-occurrence requirement
   (R3); confirm the frontmatter `description` names the new category (R5).
4. Read `scribe.md` and `clerk.md` end to end and confirm neither net is phrased as
   conditional on a dispatch instruction or on the other net (R4).
5. `git -C <worktree> status --short` and `git -C <worktree> diff --stat` — the changed
   set is exactly the Boundary's three files plus this spec (R5).
6. Run both root-`CLAUDE.md` verification greps (each must print `1`) and the manifest
   parity script (every plugin `ok`); confirm `git diff` touches neither manifest (R5).
7. **Owner: the human, on the next real library pass** (not the `coder`, not `qa`, not the
   acceptance gate) — on the next research or ingest run whose dispatch carries a
   state-dependent conditional, confirm the published page needed no remediation round,
   and record the outcome on SMR-149. This closes the observational half of the card's
   fourth criterion; nothing in this diff can.

## Tasks

- [x] `scribe.md` `## Writing rules`: add the resolve-the-dispatch bullet — mechanical
      vault check, publish only the resolved branch as a settled statement,
      unresolvable-condition fallback plus report to caller
- [x] `scribe.md` `## Verify before you report done`: add the tell sweep — named tell
      list, whole-page and whole-batch scope framed as an instance of the existing sweep
      rule, log-count statement, and the "published prose only / a caller prohibition is
      still obeyed" sentence
- [x] `clerk.md` `## Audit workflow`: add the numbered audit-only check for leaked
      meta-instructions — four forms, ungated by mode or dispatch, quoted-material and
      `library/_meta/templates/` exclusions, every occurrence reported, path + wording +
      fix in the finding
- [x] `clerk.md` `## Output` (and `## Review standard` if a line helps): state the
      severity rank as a critical library-integrity issue
- [x] `clerk.md` frontmatter `description`: name the new category alongside the existing
      list
- [x] `README.md`: extend the `### clerk` paragraph with the new category and the
      `### scribe` paragraph with the resolve-and-self-check behaviour
- [x] Confirm `scribe.md`'s frontmatter `description` states nothing the change makes
      stale, leave it unchanged, and say so in the build report (the check is recorded,
      not skipped)
- [x] Run the Validation checklist steps 1–6 and paste the real output; leave both
      manifests and both canonical paragraphs untouched
- [ ] *Not the `coder`'s task* — Validation step 7: the human closes the observational
      half of the fourth criterion on the next real library pass and records it on
      SMR-149
- [ ] *Not the `coder`'s task* — the `writer`'s docs pass folds this spec's durable
      content into `README.md` (already mirrored above) and `docs/ARCHITECTURE.md` if
      anything structural remains, then removes this spec per `docs/CLAUDE.md`

## Deviations from the card

1. **Scope widened beyond the card's two files.** The card's `## Scope` reads
   "`plugins/ca77y-engineering/agents/scribe.md`, and `clerk.md`'s audit checklist." The
   spec adds `clerk.md`'s frontmatter `description` and the root `README.md` paragraphs.
   Reason: `docs/CLAUDE.md` makes the README the user-facing description of every agent,
   to be updated whenever an agent's behavior changes, and `clerk.md`'s description
   enumerates the very category list this change extends — leaving either stale ships a
   contradiction the `coder` would be scoped out of fixing (the failure
   [SMR-176](https://linear.app/ca77y/issue/SMR-176) records). No acceptance criterion is
   narrowed. The card's `## Scope` line has been extended on the board to match.
2. **"Alongside the placeholder headers and callouts it already checks" is realized in
   the audit-only list.** The card's third criterion asks for the new category "alongside
   the placeholder headers and callouts it already checks". Those checks are not written
   in `clerk.md`: they live in the *Convention compliance* paragraph, which delegates to
   the target project's `library/_meta/librarian.md` and explicitly forbids keeping a
   second copy in `clerk.md`. That file is not in this repository and is not ours to edit.
   The category is therefore named in `clerk.md`'s own **audit-only checks** — still the
   default checklist, still ungated, which is what the criterion is for — rather than
   literally adjacent to the placeholder wording.
3. **The fourth criterion is split, and half of it has a non-build owner.** "A
   dispatcher's if/then is never a reason for an extra remediation round: the defect is
   caught by the writing agent or by the default audit, not by a manual re-read." The
   mechanism half is closed by inspection (R4: two unconditional nets, neither depending
   on a dispatcher or a human). The outcome half — *never* a reason for an extra round —
   is a claim about future runs that no step of this build can close; its owner is named
   in Validation step 7 and carries its own Tasks entry marked as not the `coder`'s.
