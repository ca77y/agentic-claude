# Give the reviewer an explicit contract for reviewing an uncommitted worktree

- **Status**: Draft
- **Task**: give-reviewer-a-worktree-review-contract
- **Last Updated**: 2026-07-22
- **Document Scope**: One unit of work: revise `plugins/ca77y-engineering/agents/reviewer.md` so that reviewing a non-pull-request target is a stated contract instead of a per-invocation improvisation

---

## Goal

**Problem.** The `lead` commits only at PR time, so the `reviewer` is nearly always pointed at
an **uncommitted working tree**. Its definition tells it to invoke Claude Code's built-in
code-review skill, which is written end to end for a **GitHub pull request**. Against a
non-PR target a large part of that skill is unreachable:

- the opening eligibility check (closed / draft / already reviewed) — there is no PR to check;
- the pass that reads previous pull requests touching these files and their review comments;
- the step 7 re-check of that eligibility;
- the final `gh pr comment` delivery, whose mandated citation format is a permalink built from
  a **full commit SHA** — and lines that live only in the working tree have no SHA at all.

Nothing in the definition says what to do instead, so every reviewer invents a substitute
procedure from scratch. This has now been reported five separate times by five different
reviewers, each rediscovering the same adaptation. Two consequences follow:

1. The skill's **confidence gate** (score each candidate 0–100, keep ≥ 80) is applied by feel
   rather than by the specified rubric, so what actually reaches the `coder` varies per round.
2. The definition tells the reviewer to relay findings **as-is** from a skill that never
   produced them in the prescribed form — the instruction and the reality disagree.

One report also observed a reviewer whose tool set contained **no subagent-launch tool**,
making the skill's prescribed fan-out unexecutable. The passes are the contract and the
fan-out is only an optimization, but nothing in either document says so, so that reviewer had
no basis for deciding whether it had run a real review.

**Change.** Give `reviewer.md` an explicit **target-mode contract**: name the three targets it
handles (uncommitted working tree, local commit range, pull request), map the skill's steps
onto each, state the substitutions for the PR-only steps, fix the confidence threshold in
writing, state that the passes — not the fan-out — are the contract, and require the report to
name the mode used and the steps skipped.

**Value.** The adaptation is decided once, in the definition, instead of five times in five
transcripts. The set of findings that reaches the `coder` stops depending on which reviewer
instance ran, and a reviewer that could not fan out says so instead of silently returning a
one-pass review as if it were a five-pass one.

**Non-goals.**

- **Changing the code-review skill.** It is Claude Code's, not ours. This spec adapts our
  *use* of it and never edits, forks, vendors, or wraps it.
- Changing the `/simplify` pass, the reviewer's model/effort, or who dispatches the reviewer.
- Changing any other agent definition, the `lead`'s dispatch wording, or the plugin version.
- Adding tooling, hooks, or automation. The deliverable is prose in one Markdown file.

## Design

### The deliverable

One revised agent definition: `plugins/ca77y-engineering/agents/reviewer.md`. This is a
**prompt-engineering** task — the file is YAML frontmatter plus prose instructions read by an
LLM at dispatch time. There is no application code and **no test suite**; see *Validation*.

Suggested shape (the coder may arrange it differently as long as every requirement below is
met): a new `## Target modes` section after `## Inputs` carrying the mode/step map and the
substitutions; revisions to the numbered steps in `## What you do` that invoke the skill and
relay its findings; and an addition to `## Output` for the mode disclosure.

### Ground truth: the skill's own procedure

The step numbers below are those of the installed code-review command
(`plugins/code-review/commands/code-review.md` in the official marketplace). Because that file
is external and may be renumbered, the revision must name each step **by what it does**, with
the current number in parentheses — never by bare number alone.

| Skill step | What it does | Working tree | Commit range | Pull request |
| --- | --- | --- | --- | --- |
| 1 | Eligibility: closed / draft / needs-no-review / already reviewed | skip | skip | run |
| 2 | Collect paths of relevant `CLAUDE.md` files | run | run | run |
| 3 | Summarize the change (from the mode's diff basis) | run | run | run |
| 4a | `CLAUDE.md` adherence | run | run | run |
| 4b | Shallow bug scan of the changed lines | run | run | run |
| 4c | `git blame` / history of the modified code | run | run | run |
| 4d | Previous PRs touching these files, and their review comments | **substitute** | **substitute** | run |
| 4e | Compliance with code comments in the modified files | run | run | run |
| 5 | Confidence score 0–100 per candidate finding, rubric verbatim | run | run | run |
| 6 | Drop everything scoring < 80 | run | run | run |
| 7 | Re-run the step 1 eligibility check | skip | skip | run |
| 8 | Post the result via `gh pr comment`, citing SHA permalinks | **substitute** | **substitute** | run |

A step marked "run" runs in every mode, but some read their input differently — step 3
summarizes the PR in PR mode and the mode's diff basis otherwise. That is a mechanical swap of
input, not a substitution: the angle and its output are unchanged. Only two rows are
substitutions, and they carry the whole change:

- **4d → repository history over the touched paths.** `git log` over each touched path (commit
  messages and bodies, which in a squash-merge repo carry the merged PR's number and its review
  outcome), `git log -S` when a specific symbol is in question, and `git blame` around the
  changed lines.
- **8 → return to the caller.** The reviewer is a subagent; its result *is* the delivery
  channel. Citations become `path:Lstart-Lend` relative to the repository root.

### Deriving the diff per mode

- **Uncommitted working tree** (the default — the `lead` dispatches "at the worktree's
  uncommitted changes"): unstaged **and** staged changes, **plus untracked files**, which
  `git diff` alone does not show. Missing them silently reviews a subset of the build.
- **Local commit range**: the named `base..head`.
- **Pull request**: the PR's diff via `gh`.

### Two conflicts the revision has to settle

1. **Skill step 6 says "if there are no issues that meet this criteria, do not proceed."** In
   PR mode that means *do not post a comment*. Read literally in a non-PR mode it would mean
   *return nothing* — which contradicts the definition's existing rule that a clean pass is a
   complete result, and would look identical to a crashed reviewer. It must be read as a
   delivery instruction, not a reporting one.
2. **"Relay findings as-is" vs. a substituted citation format.** Rule 5 of the current
   definition stands untouched in substance: no softening, no summarizing away, no
   editorializing, no findings the skill did not surface, and the reviewer still never fixes
   what it finds. What the revision permits is strictly a **change of citation form** —
   `path:Lstart-Lend` where the skill would have emitted a permalink — because the permalink is
   unconstructible, not because the finding is being edited.

### Confidence gate

The threshold is a property of the skill, not of the invocation: score every candidate 0–100
against the skill's rubric **verbatim**, keep those ≥ 80, drop the rest outright. It is not
raised to cut noise on a large diff, nor lowered to have something to report on a clean one,
and sub-threshold candidates are not smuggled back as "low-confidence extras". The existing
**coverage note** (current rule 6 — build inputs changed without their named consumers) is not
a skill finding and is therefore outside the gate; that distinction has to survive the edit.

### Passes vs. fan-out

The skill prescribes Haiku/Sonnet subagents for steps 1–5. `docs/ARCHITECTURE.md` already
records why the `lead` dispatches the reviewer directly: three levels down the dispatch tool is
absent and a fan-out skill silently collapses to a single pass. At one level below the `lead`
the reviewer is therefore the agent normally *able* to fan out — yet a reviewer with no
subagent-launch tool at all was observed and reported. The contract must hold regardless of
why the tool is missing, and the definition should not make the fallback conditional on the
reviewer first diagnosing its own depth: it cannot detect the limit in advance. The contract is the **five review angles plus the per-finding scoring pass**;
parallelism is an optimization. Without it, the same angles run sequentially in the reviewer's
own context and the report says so — including that the scoring pass was self-scored rather
than scored by an independent agent, which is a weaker check.

### Risks

- **Length.** The file is a prompt paid for on every dispatch. The map belongs in a compact
  table, not restated in prose. *Guidance only — not asserted as a requirement, because there
  is no falsifiable threshold for "too long".*
- **Coupling to an external file.** Naming steps by behaviour with the number in parentheses
  keeps a renumber from invalidating the contract (R1.3).
- **PR mode regression.** Nothing about PR mode changes; the revision only makes it one branch
  of three (R1.2).

### Boundary

- **May change**: `plugins/ca77y-engineering/agents/reviewer.md` — the prose body, and nothing
  else in it. `name`, `model: opus`, and `effort: high` in the frontmatter stay as they are.
- **Must not change**: any other agent definition. In particular `researcher.md`, `writer.md`,
  and `auditor.md` are being edited right now by two in-flight sibling stories
  (`harden-researcher-evidence-discipline`, `generalize-audit-findings-to-the-property`) and
  touching them collides.
- **Must not change**: `plugins/ca77y-engineering/plugin.json` and
  `plugins/ca77y-engineering/.claude-plugin/plugin.json` — both stay at `1.6.2`. One bump
  happens after all three sibling PRs merge.
- **Must not change**: the code-review skill or anything under `~/.claude/plugins/`, `README.md`,
  and `docs/ARCHITECTURE.md` (see *Documentation ownership*).
- **No test files, no test runner, no application code** — none exists for this repo and none is
  to be introduced.

### Documentation ownership

`docs/CLAUDE.md` states that the root `README.md` is the user-facing description of every agent
and must be updated when an agent's behavior changes. That update is **real and owed** — the
`### reviewer` section describes the skill invocation with no mention of target modes — but it
is **not the coder's task here**. It belongs to the `writer`'s docs pass, for two reasons: the
docs pass is where this pipeline folds a shipped spec into `README.md`, and both in-flight
sibling stories change agent behavior too, so all three would otherwise edit the same
per-agent prose region of `README.md` concurrently. Flagged rather than done; see Tasks.

### Coordination

- **`README.md`** — as above: three concurrent stories, one file. Whichever docs pass runs last
  must re-read the file rather than reapplying a stale hunk.
- **`recheck-pending-feedback-notes-before-commit`** (board, not yet in flight) scopes "the
  shared process-feedback paragraph carried by every agent", which includes the one at the
  bottom of `reviewer.md`. Do not restructure or reword that paragraph in this story; if that
  story lands first, keep its wording and add around it.
- **`AGENTS_IMPROVEMENTS.md`** in the docs area is append-only and shared with the concurrent
  stories — never revert or `git checkout --` another story's pending entry.

## Requirements

Every scenario below is a statement about the **content of the revised
`plugins/ca77y-engineering/agents/reviewer.md`**, and is verified by reading that one file.
Each is therefore runnable inside the Boundary, which permits changing exactly that file.

### Requirement: The definition names its target modes and maps the skill's steps onto them

#### Scenario: The three targets are enumerated

- **WHEN** a reviewer reads the definition before choosing how to run
- **THEN** it names exactly three target modes — an uncommitted working tree, a local commit
  range, and a pull request — and states that the uncommitted working tree is the default,
  because the pipeline commits only at PR time

#### Scenario: Each mode says which skill steps do not apply

- **WHEN** the reviewer has identified its target mode
- **THEN** the definition tells it, for that mode, which of the skill's steps are run, which are
  skipped, and which are substituted — covering the eligibility check (1), the `CLAUDE.md` path
  collection (2), the change summary (3), each of the five review angles (4a–4e), the confidence
  scoring (5), the < 80 filter (6), the re-eligibility check (7), and the delivery step (8)
- **AND** pull-request mode is stated to run the skill unchanged, end to end

#### Scenario: Steps are identified by behaviour, not by bare number

- **WHEN** the installed code-review skill renumbers or reorders its steps
- **THEN** the definition still identifies each step it names by what that step does, with the
  current number given in parentheses as a pointer rather than as the identifier

#### Scenario: The diff basis for each mode is stated

- **WHEN** the reviewer assembles the diff it is about to review
- **THEN** the definition states the basis per mode: unstaged plus staged changes **plus
  untracked files** for the working tree; the named `base..head` for a commit range; the PR's
  diff for a pull request
- **AND** it calls out explicitly that untracked files do not appear in `git diff` and must be
  picked up separately, or the review silently covers a subset of the change

#### Scenario: The skill's false-positive list is carried across

- **WHEN** the reviewer applies the skill's false-positive guidance against a non-PR target
- **THEN** the definition states that the entry about issues on lines the user did not modify
  *in their pull request* reads, for a non-PR target, as lines outside the target diff

### Requirement: A non-pull-request target skips the PR-only steps and returns findings to the caller

#### Scenario: The eligibility checks are skipped

- **WHEN** the target is an uncommitted working tree or a local commit range
- **THEN** the definition instructs the reviewer to skip the opening eligibility check (1) and
  its step 7 re-check, and states why: there is no pull request whose state could be checked

#### Scenario: Delivery is a return value, not a `gh` comment

- **WHEN** the target is an uncommitted working tree or a local commit range
- **THEN** the definition instructs the reviewer not to invoke `gh pr comment` and to return the
  findings to the caller as its result instead
- **AND** it states that the skill's fixed comment template, including its trailer, is a
  pull-request artifact and is not reproduced in a returned result

#### Scenario: A clean pass is still reported

- **WHEN** no candidate finding survives the confidence filter on a non-pull-request target
- **THEN** the definition states that the skill's "do not proceed" at step 6 is an instruction
  not to **post**, not an instruction not to **report**, and the reviewer reports the clean pass
  plainly to the caller

#### Scenario: Pull-request mode is unaffected

- **WHEN** the target is a pull request
- **THEN** the definition leaves the eligibility check, the re-check, and the `gh pr comment`
  delivery in force exactly as the skill specifies them
- **AND** it is stated that posting that comment does not conflict with the constraint that the
  simplify pass is the only writing the reviewer does — that constraint governs writes to the
  code under review, not the delivery of a review to its destination

### Requirement: Non-pull-request findings cite file path and line range

#### Scenario: The citation format is fixed

- **WHEN** the reviewer cites code in a finding on a non-pull-request target
- **THEN** the definition specifies the citation as the repository-root-relative file path plus
  a line range (for example `plugins/ca77y-engineering/agents/reviewer.md:28-31`), replacing the
  skill's SHA permalink

#### Scenario: The permalink is stated to be unconstructible

- **WHEN** a reviewer considers producing the skill's mandated permalink for working-tree lines
- **THEN** the definition states that lines existing only in the working tree have no commit SHA,
  so the permalink cannot be produced at all — and that inventing one, or substituting a
  branch-name or `HEAD` URL for the required full SHA, is not an acceptable stand-in

### Requirement: Historical context comes from the repository's own history

#### Scenario: The prior-pull-request pass is substituted

- **WHEN** the target is not a pull request and the reviewer reaches the pass that reads previous
  pull requests touching these files and their review comments (4d)
- **THEN** the definition replaces it with the repository's own history over the touched paths —
  `git log` over each touched path including commit message bodies, `git blame` around the
  changed lines, and `git log -S` when a specific symbol is in question — and states that this
  substitution is what makes the angle reachable without a PR

#### Scenario: Consulting a merged pull request found in history never blocks the pass

- **WHEN** a commit message over a touched path names a merged pull request whose review comments
  would add context
- **THEN** the definition states that following it is optional and that the pass completes on
  local history alone if the network, `gh`, or the remote is unavailable — the historical angle
  is never reported as blocked for that reason

### Requirement: The skill's passes are the contract and its fan-out is an optimization

#### Scenario: The contract is named as the passes

- **WHEN** the reviewer plans how to execute the skill
- **THEN** the definition states that the contract is the five review angles (4a–4e) plus the
  per-finding confidence scoring (5), and that the skill's dispatch of subagents is an
  optimization for running them in parallel

#### Scenario: No subagent-launch tool available

- **WHEN** the reviewer's tool set contains no subagent-launch tool, or a dispatch fails because
  of dispatch depth
- **THEN** the definition instructs it to run the same angles and the same scoring pass
  sequentially in its own context rather than dropping any of them, and to complete the review
  rather than reporting it blocked

#### Scenario: A sequential run is disclosed

- **WHEN** the reviewer ran the passes sequentially instead of fanning them out
- **THEN** the definition requires the report to say so, and to state that the confidence scoring
  was self-scored rather than scored by an independent agent

### Requirement: The confidence threshold is fixed in the definition

#### Scenario: The rubric and the threshold are written down

- **WHEN** the reviewer decides which candidate findings to report
- **THEN** the definition states the skill's own gate explicitly: score each candidate 0–100
  against the skill's rubric applied verbatim, and keep only those scoring 80 or above

#### Scenario: The threshold does not move

- **WHEN** a round produces many candidates, or none at all
- **THEN** the definition states that the threshold is fixed and is not raised to cut noise nor
  lowered to have something to report, and that sub-threshold candidates are dropped rather than
  attached to the report as low-confidence extras

#### Scenario: The coverage note stays outside the gate

- **WHEN** the diff changes build inputs without changing their named consumers and no skill
  finding survives the filter
- **THEN** the definition still requires the existing coverage note, stating that it is not a
  skill finding and so is not subject to the confidence threshold, and keeping it visibly
  separate from the relayed findings

### Requirement: The report names the mode used and the steps skipped

#### Scenario: Mode disclosure

- **WHEN** the reviewer returns its result
- **THEN** the definition requires the report to name the target mode it used and the diff basis
  that defined the target (the refs or working-tree state it read)

#### Scenario: Skipped-step disclosure

- **WHEN** the reviewer ran against a non-pull-request target
- **THEN** the definition requires the report to list which skill steps it skipped and which it
  substituted, so the caller can see that a partial procedure was intentional rather than failed

### Requirement: The existing relay and no-fix rules survive the revision

#### Scenario: Findings are still relayed without editorializing

- **WHEN** the revised definition is compared against the current one
- **THEN** the rule that findings are relayed as-is — verdict first, then severity, location,
  evidence, and fix direction, with no softening, no summarizing away, no editorializing, and no
  findings the skill did not surface — is still present and no weaker than before

#### Scenario: Reformatting a citation is not editorializing

- **WHEN** the reviewer converts a finding's citation to path plus line range on a non-PR target
- **THEN** the definition states that this is a change of citation form only, and that the
  finding's substance, severity, and wording are otherwise untouched

#### Scenario: The reviewer still does not fix what it finds

- **WHEN** the revised definition is compared against the current one
- **THEN** the constraints that the simplify pass is the only writing it does, that it does not
  fix the defects the review surfaces, and that it does not pass `--fix`, are still present and
  unchanged in force

### Requirement: The change stays inside its boundary

#### Scenario: One file changed

- **WHEN** `git status --porcelain` is run in the story worktree after the build
- **THEN** the only changed file under `plugins/` is
  `plugins/ca77y-engineering/agents/reviewer.md`, and neither
  `plugins/ca77y-engineering/plugin.json` nor
  `plugins/ca77y-engineering/.claude-plugin/plugin.json` appears

#### Scenario: Manifests still agree at 1.6.2

- **WHEN** the manifest parity loop from the root `CLAUDE.md` is run
- **THEN** every plugin prints `ok`, and `ca77y-engineering` reads `1.6.2`

#### Scenario: Frontmatter is intact

- **WHEN** the revised file's frontmatter is read
- **THEN** `name`, `model: opus`, and `effort: high` are unchanged from the current definition

### Requirement: Validation is by inspection, and is recorded

#### Scenario: Each acceptance criterion is checked one at a time

- **WHEN** the work is validated
- **THEN** validation consists of reading the revised
  `plugins/ca77y-engineering/agents/reviewer.md` against the card's seven acceptance criteria
  one at a time, plus the boundary checks above (`git status --porcelain`, the manifest parity
  loop, `git diff` of the relay and constraints paragraphs)
- **AND** no test runner, test file, or build step is invoked, because this repository ships
  prose agent definitions and has none

*Untested by design:* the file-length guidance in *Risks* is style advice with no falsifiable
threshold and carries no scenario.

## Tasks

- [ ] Read the current `plugins/ca77y-engineering/agents/reviewer.md` end to end, and the
      installed code-review command it invokes, before editing anything.
- [ ] Add the target-mode contract: the three modes, the default, the diff basis per mode
      (including untracked files), and the step map as a compact table.
- [ ] State the skips for a non-PR target: the eligibility check, the re-eligibility check, and
      the `gh pr comment` delivery — with findings returned to the caller instead, and step 6's
      "do not proceed" read as *do not post*.
- [ ] State the non-PR citation format as `path:Lstart-Lend`, and why the SHA permalink cannot
      be produced.
- [ ] Substitute the prior-pull-request angle with repository history over the touched paths,
      and state that following a merged PR named in that history is optional and non-blocking.
- [ ] State that the passes are the contract and the fan-out an optimization, with the
      sequential fallback and its disclosure.
- [ ] Write the confidence gate down: 0–100, rubric verbatim, keep ≥ 80, threshold fixed, and
      the coverage note explicitly outside the gate.
- [ ] Extend `## Output` with the mode, diff basis, skipped steps, substituted steps, and
      fan-out-vs-sequential disclosure.
- [ ] Re-read the relay rule and the constraints block to confirm they are intact and no weaker,
      and that the shared process-feedback paragraph at the bottom is untouched.
- [ ] Run the boundary checks: `git status --porcelain` shows only `reviewer.md` under
      `plugins/`, and the manifest parity loop prints `ok` at `1.6.2`.
- [ ] **Not the coder's task — the `writer`'s docs pass owns it:** update the `### reviewer`
      section of the root `README.md` with the target-mode contract, per `docs/CLAUDE.md`,
      re-reading the file first because two sibling stories are editing the same per-agent prose.
