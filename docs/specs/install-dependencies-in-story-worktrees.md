# Give a story worktree its dependencies before any agent works in it

- **Status**: Draft
- **Task**: install-dependencies-in-story-worktrees
- **Last Updated**: 2026-08-01
- **Document Scope**: One unit of work: make the `lead` provision a story worktree's dependencies as part of creating it, and revise the canonical "Addressing the story worktree." paragraph so every dispatched agent is told the provisioning status, may read the root checkout for dependency sources without ever writing it, and never resolves a project CLI through a bare fetch-and-run.

---

## Goal

**The problem.** `git worktree add` copies no installed dependencies, and no agent in the pipeline owns putting them there. Three independent runs show what that costs:

- The `native-platform-config` writer tried to verify `expo config --type introspect` inside the worktree. With no installed dependency tree at any level, a bare `npx` silently fetched a **detached** CLI and failed with `Failed to resolve plugin for module "expo-router"` — an error that reads exactly like a real config defect in the file under review. The agent was one step from reporting a defect that did not exist.
- The `timer-cue-sync` writer needed the installed `expo-notifications` types to settle a technical ambiguity. The only copy was in the root checkout, which its dispatch had told it never to touch. The instruction draws no read/write distinction, so the safe-looking action and the correct action pointed in opposite directions.
- The `native-platform-config` coder solved the first problem by running the project's install itself inside the worktree — and two untouched pre-existing suites (`error-boundary.test.tsx`, `ruler-field.test.tsx`) then failed to load with `TypeError: _reanimatedWrapper.Reanimated?.default?.createAnimatedComponent is not a function` from inside `react-native-gesture-handler`. Same lockfile; the same files passed from the main checkout's installed tree. 100% reproducible from a clean worktree install, 0% from the main checkout; content-level diffing found nothing. Working theory: with a hoisting node-linker, a fresh install of the same lockfile in a second checkout is not guaranteed to hoist identically. Copying the main checkout's installed tree in fixed it. Cost: over an hour debugging a failure unrelated to the task.

So there are three distinct gaps, and closing only the first makes the third worse: nobody provisions the worktree; nobody says whether it was provisioned; and an agent left to fix it itself picks the one remedy (a fresh re-resolving install) that can break tests the task never touched.

**The change.** Prose edits to agent definitions, in two places:

- `plugins/ca77y-engineering/agents/lead.md` — Workflow step 2 (**"Create the workspace"**) gains the provisioning obligation: provision the worktree using the project's own install/bootstrap step, preferring to inherit the main checkout's resolved state over re-deriving it, before dispatching any agent into it; and record the resulting status, which every dispatch then names.
- The canonical **"Addressing the story worktree."** paragraph — duplicated byte-identically across `lead.md`, `coder.md`, `writer.md`, `qa.md`, `auditor.md` — gains three things: the worktree path is handed over **together with its dependency-provisioning status** (and what an agent does when that status is absent or negative); the repository root checkout is **readable** for dependency and vendor sources but **never writable**; and a project CLI is never invoked through a bare fetch-and-run from inside a worktree.

**User value.** An agent dispatched into a story worktree can tell, before it runs anything, whether a command's result is trustworthy. A wrong conclusion drawn from a missing toolchain, an hour lost to a dependency layout the task never touched, and a correct action that looked forbidden all stop being possible from the definition alone.

**Non-goals.**

- **No version bump.** Neither plugin manifest is touched. Versions are a human-only decision (root `CLAUDE.md`).
- **No ecosystem-specific rule.** The toolkit's agents run against arbitrary projects, so nothing in the prescribed wording may name pnpm, npm, yarn, or any particular installer. `npx` appears only as a *named example* of the bare fetch-and-run pattern, alongside an explicit "or the equivalent in any ecosystem".
- **No new agent, no change to who does what.** Provisioning is part of creating the workspace, which the `lead` already owns; this does not hand the `lead` any agent's job.
- **Not editing the board.** The card is the human's; contradictions found while speccing are reported, not fixed (see *Board follow-ups*).
- **Not editing `README.md`, `docs/ARCHITECTURE.md`, or the root `CLAUDE.md`** in this build — see *Deviations from the card* and the docs-pass entries in *Tasks*.

## Design

**Where the edits land.**

- `lead.md` → Workflow step **2. Create the workspace** (currently one sentence plus "Everything from here happens there."). This is the only step that changes.
- `lead.md`, `coder.md`, `writer.md`, `qa.md`, `auditor.md` → the single line beginning `**Addressing the story worktree.**` (currently `lead.md:18`, `coder.md:14`, `writer.md:10`, `qa.md:10`, `auditor.md:14`). One revised line, applied byte-identically to all five.

**Design decision — the dependency status rides the shared paragraph, not six dispatch steps.** Card criterion 3 ("the worktree path the `lead` hands to each agent states whether dependencies are installed") could be satisfied by editing every dispatch site in `lead.md` — Workflow steps 3, 4, 5, 6, 7 and the PR-review loop's step 5. It is satisfied instead by one clause in the shared paragraph, for three reasons:

- **It binds by construction.** The paragraph already ends with *"When you dispatch a subagent, pass the worktree path and this instruction into its prompt."* Extending that clause to carry the provisioning status makes every dispatch that names a worktree carry it — including dispatches the `lead` does not make at all (a `qa` or `writer` fanning out to `Explore`), which per-step edits in `lead.md` would never reach.
- **Six edit sites drift; one parity-checked line does not.** The repo already treats this paragraph as a single canonical artifact with a mechanical check. Enumerating the obligation at six sites in `lead.md` means the seventh dispatch site added later silently omits it.
- **It reaches the receiver, not just the sender.** Criterion 3's purpose is that an agent *knows before running a command whether the result is trustworthy*. That is a rule the receiving agent must carry in its own definition, which is exactly what the shared paragraph is.

`lead.md` step 2 still changes, because it is where the status is *established* — provisioning happens there, and the status it produces is what the paragraph then requires every dispatch to name.

**Design decision — all new shared content stays inside the one parity-checked line.** The repo's drift check is:

```bash
grep -h '^\*\*Addressing the story worktree\.\*\*' \
  plugins/ca77y-engineering/agents/{lead,coder,writer,qa,auditor}.md | sort -u | wc -l
```

It compares exactly one physical line per file — the line starting with that marker. A tempting alternative shape, a second shared paragraph (e.g. `**Dependencies in the worktree.**`) added under it in all five files, would be **invisible to that check**: the grep would still print `1` while the new paragraph drifted freely across five copies. Fixing that would mean extending the check in the root `CLAUDE.md`, which this card scopes out. So the revised content goes **inside the existing single line**, keeping the whole shared convention under the existing check. The line gets longer; that is the accepted cost, and it is the reason no scenario below is satisfied by a new sibling paragraph.

**Design decision — an agent that finds the worktree unprovisioned reports, it does not install.** The third background incident is precisely an agent repairing missing dependencies itself with a fresh re-resolving install, and breaking two untouched suites. The paragraph therefore tells an agent handed an absent or negative provisioning status to treat command results as untrustworthy and **say so**, rather than provisioning the worktree on its own initiative. Provisioning belongs to the one place that can prefer inheritance over re-resolution: the `lead`, at workspace creation.

**Project-agnostic phrasing.** The provisioning rule is stated as a shape, not a command: *provision using the project's own install/bootstrap step, discovered from project context, preferring to inherit the main checkout's already-resolved dependency state over re-deriving it wherever the project's dependency layout allows.* The motivating failure is named in the same general terms — *an install that re-resolves can produce a different dependency layout than the main checkout from the same lockfile, breaking pre-existing tests the task never touched* — so the rule holds for a project with no lockfile, no installer, or a vendored tree.

**Provisioning is workspace creation, not an agent's job.** `lead.md` opens with *"You dispatch work and gather feedback — you never do the work yourself."* That boundary is about specs, code, tests, validation, review, and acceptance — each of which is an agent. Creating the workspace is already the `lead`'s own hands-on step (it runs the git commands); provisioning is the rest of making that workspace usable. The step-2 wording must read as an extension of workspace creation, and must not authorise the `lead` to run the project's tests or validation, which remain `qa`'s.

**Relationship to the shipped `address-story-worktrees-consistently` card.** That story (Done) established this paragraph as the single canonical statement of how an agent *addresses* a worktree, and the root `CLAUDE.md` parity rule that keeps the five copies identical. This task changes what is *inside* the worktree and what the handover states about it — the same paragraph, same parity obligation. Nothing that story settled is being reversed; the addressing sentences (named path as review/build root, `-C <path>`, absolute file paths, the "wrong tree" warning) must all survive the edit intact.

**Deliverable is prose — falsification is by inspection.** `docs/ARCHITECTURE.md` records that the agent `.md` files under `plugins/*/agents/` **are the product**. There is no test runner, no build, and no CI for them (`.github/workflows/` holds only the Claude review workflows). Every scenario below is falsified by reading the changed file and quoting the sentence that satisfies it, or by running the two shell checks in *Validation*. The absence of a test command is the expected state here, not an unfinished spec.

## Boundary

**In scope — the `coder` edits exactly five files, prose only:**

- `plugins/ca77y-engineering/agents/lead.md` — Workflow step **2. Create the workspace**, and its copy of the shared paragraph.
- `plugins/ca77y-engineering/agents/coder.md`, `writer.md`, `qa.md`, `auditor.md` — their copies of the shared paragraph only.

The revised paragraph is **one authored text applied byte-identically to all five files**. It is authored once and copied; it is not re-worded per agent, and it stays a single physical line with exactly one `**Addressing the story worktree.**` marker per file.

**Out of scope — do not touch:**

- `plugins/ca77y-engineering/plugin.json` and `plugins/ca77y-engineering/.claude-plugin/plugin.json` — no edit, **no version bump** (root `CLAUDE.md`: human-only decision).
- The root `CLAUDE.md` — including its worktree section and its parity check. The check keeps working unchanged; its prose description is a docs-pass follow-up (*Tasks*).
- `README.md` and `docs/ARCHITECTURE.md` — reconciled by the docs pass after this ships (*Deviations*, *Tasks*).
- Any card under `docs/tasks/*.md`, including this task's own card.
- The shared **process-feedback** paragraph (`## Process feedback`, present in ten agent files). Its sentence *"the repository root checkout is off-limits"* is about writing `AGENTS_IMPROVEMENTS.md` and stays true under the new read/write distinction, but its flat wording is now imprecise — reported as a board follow-up, not edited here (five files in scope, not ten).
- Every other agent definition (`analyst.md`, `researcher.md`, `librarian.md`, `scribe.md`, `clerk.md`) — they do not carry the worktree paragraph.
- All other sections of `lead.md`: Workflow steps 1 and 3–9, the PR review loop, Delegation, Boundaries, Final handoff, Process feedback. Step 2 is the only workflow step that changes (see the Design decision above).

**No test runner.** There is no build, suite, or validation command for these files. Each scenario is closed by making the prose edit and by inspection; the `coder` should quote the sentence that satisfies each scenario, or name what is missing. The two shell checks in *Validation* are the only mechanical checks that exist, and both run inside this Boundary against the five in-scope files.

## Coordination

No sibling card scopes worktree provisioning, so there is no provisioning collision. Several siblings do edit `lead.md`, and one edits a *different* shared paragraph across agent files. None is merged today, but any may land first — a `coder` working from one card has no other signal:

- **`collect-sendmessage-resumes-inside-the-leads-turn`** (Todo, 🔺) — `lead.md` dispatch rules and the PR-review loop. **If it lands first**, the dispatch-rule area will have new prose; this task adds nothing there (its dispatch obligation lives in the shared paragraph), so merge additively and do not disturb it.
- **`commit-each-fix-round-in-the-worktree`** (Ready to start, ⏫) — `lead.md` `## The commit model`. No overlap with step 2 or the paragraph; leave its section alone.
- **`sequence-acceptance-gate-around-docs-pass`** (Ready to start, 🔼) — `lead.md` Workflow steps 6/7 and possibly `auditor.md`. **If it lands first**, workflow steps may be renumbered or reordered: locate step 2 by its **"Create the workspace"** heading rather than by number, and if it has touched `auditor.md`, re-derive that file's paragraph line number instead of trusting this spec's.
- **`coordinate-shared-doc-edits-across-concurrent-stories`** (Todo, 🔼) — `writer.md` docs pass and `lead.md`. No overlap with step 2 or the paragraph.
- **`recheck-pending-feedback-notes-before-commit`** (Ready to start, 🔽) — `lead.md` plus the **shared process-feedback paragraph carried by every agent**. That is a second byte-identical shared paragraph in the same files. **If it lands first**, do not conflate the two paragraphs: this task changes only the `**Addressing the story worktree.**` line and must leave the process-feedback paragraph exactly as found, whatever shape that sibling gave it.

Several of these cards have uncommitted edits in the root checkout at the time of writing, so treat their status as possibly stale and re-read the card before assuming it has not landed.

## Deviations from the card

No card criterion is unsatisfiable, so nothing is being overridden. Three scoping decisions are recorded here for the acceptance gate, which reads the card rather than the `lead`'s dispatch:

1. **Criterion 3 is satisfied in the shared paragraph, not at each dispatch step.** The card's sentence — *"The worktree path the `lead` hands to each agent states whether dependencies are installed"* — is closed by the paragraph clause every dispatching agent carries, plus step 2 establishing the status, rather than by edits to `lead.md`'s Workflow steps 3–7 and PR-review loop. The reasoning is in *Design*; the auditor should look for the obligation in the paragraph (Requirement 3) and confirm it holds for **every** dispatch into the worktree, which is what the criterion asks. No clause of the criterion is dropped.
2. **`README.md` is not edited by the `coder`, and that is a deliberate conflict resolution.** `docs/CLAUDE.md` states *"The root `README.md` is the user-facing description of every agent. When an agent's behavior changes, update the README."* The `lead`'s behaviour changes here, so the README's step 2 ("**Create the workspace** — one story branch in **one worktree**…") and its **Isolation** paragraph do become incomplete. The card's scope is *exactly* `lead.md` plus the paragraph in five files, so the README is left to the **docs pass**, which owns durable docs. This is a named hand-off, not a dropped obligation — see the docs-pass entries in *Tasks*. The `coder` must not edit `README.md`.
3. **The root `CLAUDE.md`'s description of the canonical paragraph becomes an understatement, and is handed to the docs pass.** It currently says *"That **addressing** convention lives as one canonical 'Addressing the story worktree.' paragraph…"*. After this change the paragraph also carries provisioning-status handover, the root-checkout read/write rule, and the bare-fetch prohibition. The **parity check itself keeps working unchanged** — it is the surrounding prose that is now narrow. Out of the card's scope for the `coder`; assigned to the docs pass in *Tasks*, and reported to the `lead` so the human can decide whether a repo-maintenance file belongs in the docs pass at all.

## Requirements

### Requirement: The lead provisions the worktree's dependencies as part of creating it

`lead.md` Workflow step 2 makes provisioning part of creating the workspace, completed before any agent is dispatched into it, in project-agnostic terms.

#### Scenario: Step 2 owns provisioning and orders it before any dispatch

- **WHEN** a reader inspects Workflow step **2. Create the workspace** in `lead.md`
- **THEN** it states that the `lead` provisions the new worktree's dependencies as part of creating it, and that this happens **before** any agent is dispatched into that worktree

#### Scenario: The provisioning rule names no specific ecosystem

- **WHEN** a reader inspects the provisioning wording added to step 2
- **THEN** it instructs the `lead` to use **the project's own install/bootstrap step, discovered from project context**, and names no specific package manager, installer, or ecosystem (no `pnpm`, `npm`, `yarn`, `bundle`, `pip`, or equivalent appears in the rule)

#### Scenario: Provisioning is workspace creation, not an agent's job

- **WHEN** a reader compares the step-2 wording to `lead.md`'s existing rule *"You dispatch work and gather feedback — you never do the work yourself"* and its Boundaries section
- **THEN** the step-2 wording reads as part of creating the workspace (alongside branching and `git worktree add`), grants the `lead` no agent's job — in particular it does not have the `lead` run the project's tests, validation, or build for verification — and the "never do the work yourself" rule is left present and unweakened

#### Scenario: Provisioning that cannot be completed is stated, not skipped silently

- **WHEN** a reader inspects step 2 for the case where the project has no install/bootstrap step, or provisioning fails
- **THEN** it directs the `lead` to proceed with the status recorded as **not provisioned, with the reason**, rather than dispatching as if the worktree were provisioned

### Requirement: Inheriting the main checkout's resolved state is preferred, and the failure that motivates it is named

Step 2 states the preference for inheriting over re-resolving, and names the class of failure a re-resolving install can cause.

#### Scenario: The preference is stated and conditioned

- **WHEN** a reader inspects the provisioning wording in step 2
- **THEN** it states that **wherever the project's dependency layout allows it**, the `lead` prefers inheriting the main checkout's already-resolved dependency state over re-deriving it with a fresh install

#### Scenario: The motivating failure class is named in general terms

- **WHEN** a reader inspects the same wording
- **THEN** it names why: an install that **re-resolves** can produce a different dependency layout than the main checkout from the same lockfile, and so can break **pre-existing tests the task never touched** — stated as a general class of failure, without naming a specific package manager, linker mode, or library

### Requirement: Every dispatch into the worktree states the dependency-provisioning status

The shared paragraph makes the handover carry the provisioning status, and tells the receiving agent what to do when that status is absent or negative.

#### Scenario: The handover clause carries the status

- **WHEN** a reader inspects the revised `**Addressing the story worktree.**` line
- **THEN** its dispatch clause requires an agent passing the worktree path into a subagent's prompt to pass **the dependency-provisioning status of that worktree** along with the path and the addressing instruction

#### Scenario: The receiving agent knows when a result is untrustworthy

- **WHEN** a reader inspects the same line for the receiver's obligation
- **THEN** it states that an agent handed a worktree whose provisioning status is **absent or negative** must treat the output of any command that depends on the project's installed dependencies as untrustworthy, and must **report that** rather than drawing a conclusion from it

#### Scenario: An unprovisioned worktree is reported, not self-installed

- **WHEN** a reader inspects the same line for what the receiving agent may do about missing dependencies
- **THEN** it directs the agent **not** to provision the worktree itself, and gives the reason — a fresh re-resolving install can change the dependency layout and break tests the task never touched — leaving provisioning to the `lead`'s workspace-creation step

#### Scenario: The obligation holds for every dispatch, not an enumerated list

- **WHEN** a reader checks how the obligation reaches each agent dispatched into the worktree
- **THEN** it is carried by the shared paragraph that all five of `lead.md`, `coder.md`, `writer.md`, `qa.md`, `auditor.md` hold byte-identically — so it binds every dispatch that names a worktree, including sub-dispatches the `lead` does not make — and **no** dispatch site in `lead.md` (Workflow steps 3, 4, 5, 6, 7 or the PR-review loop) is left as the sole carrier of it

### Requirement: The root checkout is readable for dependency sources and never writable

The shared paragraph distinguishes write-off-limits from readable, so an agent needing an installed dependency's source is not choosing between the safe action and the correct one.

#### Scenario: Reading the root checkout for dependency and vendor sources is permitted

- **WHEN** a reader inspects the revised line for what the repository root checkout may be used for
- **THEN** it states the root checkout may be **read** — naming dependency and vendor sources, such as resolved dependency trees, installed type definitions, or vendored packages — when something is missing or ambiguous in the worktree

#### Scenario: Writing the root checkout is forbidden

- **WHEN** a reader inspects the same line
- **THEN** it states the root checkout must **never be written**, with no exception carved out

#### Scenario: The wrong-tree warning survives and is scoped to write/build, not to reading

- **WHEN** a reader compares the revised line to the current one
- **THEN** the existing addressing content is intact — the named path is the review/build root, git commands carry `-C <path>`, file tools take absolute paths under it, and the closing warning that an agent skipping this silently operates on the repository root on its base branch and reviews or builds the wrong tree — and that warning is worded so it cannot be read as forbidding the permitted dependency-source reads

### Requirement: A project CLI is never invoked through a bare fetch-and-run from inside a worktree

The shared paragraph forbids resolving a project CLI by fetching it, and says what to do instead.

#### Scenario: The prohibition is stated with its ecosystem-agnostic form

- **WHEN** a reader inspects the revised line for how project CLIs are invoked
- **THEN** it forbids invoking a project CLI through a bare fetch-and-run — naming `npx`-style invocation as an example and explicitly covering the equivalent pattern in any other ecosystem — from inside a worktree

#### Scenario: The reason names the misleading-error failure

- **WHEN** a reader inspects the same prohibition
- **THEN** it gives the reason: the fetched CLI is **not the project's toolchain**, and it fails with errors that read exactly like a real defect in the file under review

#### Scenario: The correct alternative is stated

- **WHEN** a reader inspects the same prohibition for what to do instead
- **THEN** it directs the agent to run project CLIs through the worktree's own provisioned dependencies, and — when those are absent — to report the missing provisioning rather than conclude anything from the failure

### Requirement: The five copies stay byte-identical and the new content is inside the parity-checked line

The change stays inside its scoped files, and every word of the new shared content is covered by the repo's existing drift check.

#### Scenario: The parity check passes

- **WHEN** the repo's drift check is run from the worktree root after the edit — `grep -h '^\*\*Addressing the story worktree\.\*\*' plugins/ca77y-engineering/agents/{lead,coder,writer,qa,auditor}.md | sort -u | wc -l`
- **THEN** it prints `1`

#### Scenario: The new content is inside the checked line, not a sibling paragraph

- **WHEN** a reader takes the single line the drift check compares and reads it in full
- **THEN** that one line contains **all** of the new shared content — the provisioning-status handover, the root-checkout read/write distinction, and the bare-fetch prohibition — and each of the five files contains exactly **one** line beginning `**Addressing the story worktree.**`, with no additional shared paragraph added beside it

#### Scenario: Nothing outside the scoped surfaces changed

- **WHEN** a reader inspects the full diff of the build
- **THEN** the only changed files are `lead.md` (step 2 and its paragraph copy) and the paragraph line in `coder.md`, `writer.md`, `qa.md`, `auditor.md`; both `plugin.json` manifests are unchanged with no version bump; and no card, template, `README.md`, `docs/ARCHITECTURE.md`, or root `CLAUDE.md` is modified

## Validation

There is no test suite, build, or CI for these files (`.github/workflows/` carries only the Claude review workflows). Validate against the real consumers:

- **The drift check, from the worktree root, must print `1`:**

  ```bash
  grep -h '^\*\*Addressing the story worktree\.\*\*' \
    plugins/ca77y-engineering/agents/{lead,coder,writer,qa,auditor}.md | sort -u | wc -l
  ```

- **Exactly one marker line per file** — this must print `1` for each of the five files, proving no second copy or split paragraph was introduced:

  ```bash
  grep -c '^\*\*Addressing the story worktree\.\*\*' \
    plugins/ca77y-engineering/agents/{lead,coder,writer,qa,auditor}.md
  ```

- **Read the compared line in full** and confirm it carries all three new obligations (status handover, root read/write, bare-fetch prohibition) plus the original addressing content — the checks above prove the five copies agree, not that they say the right thing.
- **The five files remain valid agent definitions**: frontmatter (`name`, `description`, `model`, `effort`) untouched, section structure intact, `lead.md`'s Workflow still numbered 1–9 with step 2 as "Create the workspace".
- **Internal consistency of `lead.md`**: step 2's provisioning wording does not contradict the "you never do the work yourself" rule or the Boundaries section, and the status it records is the one the shared paragraph requires every dispatch to name.
- **Manifests untouched**: `git diff` shows no change to either `plugin.json`; no version bump.
- **Consumers deliberately not edited**: confirm `README.md`, `docs/ARCHITECTURE.md`, the root `CLAUDE.md`, and every card under `docs/tasks/` are unmodified by this build — their reconciliation is the docs pass's (see *Deviations* and *Tasks*).

## Tasks

- [ ] In `lead.md` Workflow step **2. Create the workspace**, add the provisioning obligation: provision the new worktree's dependencies using the project's own install/bootstrap step (discovered from project context, no ecosystem named) as part of creating it and before dispatching any agent into it.
- [ ] In the same step, state the preference for inheriting the main checkout's already-resolved dependency state over re-deriving it wherever the project's layout allows, and name the motivating failure class: a re-resolving install can produce a different dependency layout from the same lockfile and break pre-existing tests the task never touched.
- [ ] In the same step, state that the `lead` records the resulting provisioning status — including **not provisioned, with the reason**, when there is no install step or it fails — and that this status is what every dispatch into the worktree names.
- [ ] Author the revised `**Addressing the story worktree.**` line **once**, as a single physical line, keeping all existing addressing content intact and adding: (a) the dispatch clause passing the provisioning status alongside the path and instruction; (b) the receiver's rule for an absent or negative status — results untrustworthy, report it, do not self-provision, with the re-resolution reason; (c) the root checkout is readable for dependency and vendor sources and never writable; (d) no bare fetch-and-run of a project CLI (`npx`-style or any ecosystem's equivalent), with the misleading-error reason and the correct alternative.
- [ ] Apply that one authored line **byte-identically** to all five of `lead.md`, `coder.md`, `writer.md`, `qa.md`, `auditor.md`, replacing each file's existing copy in place — no per-agent rewording, no second shared paragraph.
- [ ] Run both checks in *Validation* (drift check prints `1`; per-file marker count prints `1` for each of the five), and read the compared line in full to confirm it carries all three new obligations.
- [ ] Confirm the diff is confined to the five scoped files: no manifest change, no version bump, no card, template, `README.md`, `ARCHITECTURE.md`, or root `CLAUDE.md` edit; and the shared **process-feedback** paragraph untouched in all ten files that carry it.
- [ ] Quote, for each Requirements scenario, the sentence in the changed files that satisfies it — or name what is missing. This is how the prose scenarios are closed in the absence of a test runner.
- [ ] **Not the `coder`'s task — docs pass** (after this ships): update the root `README.md`'s `lead` step 2 ("Create the workspace") and its **Isolation** paragraph so the user-facing description states that the worktree is provisioned at creation and that the handover names the provisioning status, per `docs/CLAUDE.md`'s rule that the README is the user-facing description of every agent.
- [ ] **Not the `coder`'s task — docs pass** (after this ships): reconcile `docs/ARCHITECTURE.md`'s commit-model / worktree prose with worktree provisioning if it is now incomplete, and widen the root `CLAUDE.md`'s description of the canonical paragraph — it says the paragraph carries the *addressing* convention, which is now an understatement; its parity check itself needs no change. Flagged to the `lead` in the spec report, since the root `CLAUDE.md` is a repo-maintenance file rather than a doc.
