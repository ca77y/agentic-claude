# Give agents one convention for addressing a story worktree

- **Status**: Draft
- **Task**: address-story-worktrees-consistently
- **Last Updated**: 2026-07-23
- **Document Scope**: One unit of work: state one canonical convention for how a dispatched agent addresses the story worktree, carried identically by the five pipeline agents and consistent with the root `CLAUDE.md`, so an agent can no longer silently operate on the root `master` checkout.

---

## Goal

**Problem.** An agent dispatched to work in a story worktree cannot reliably make that worktree its working directory: `EnterWorktree` refuses the switch (it only accepts worktrees under `.claude/worktrees/`, while this repo places story worktrees at `.worktrees/<branch>`), and an agent thread's cwd resets between bash calls regardless. Nothing in the five pipeline agent definitions states the fallback once. Today each agent mentions "the story worktree" in its own words — `coder` "Work in the story worktree", `qa` "Validate what is in the worktree now", `writer` "leave your work in the story worktree" — but none says **how to address it**. So every git call has to carry `-C <path>` by hand and every subagent prompt has to repeat the path, or the agent silently reads the repository root on `master` and reviews or builds the wrong tree. This is a per-dispatch correctness hazard: nothing distinguishes a clean pass from a pass that read the wrong tree.

**Change.** Introduce **one canonical "Addressing the story worktree" paragraph**, byte-identical, into all five agents the `lead` dispatches into the worktree (`lead`, `coder`, `writer`, `qa`, `auditor`). It states the addressing convention once: treat the caller-named absolute path as the review/build root, prefix every git command with `-C <path>`, give every file tool an absolute path under `<path>`, and pass the path plus this instruction into every subagent prompt — never rely on cwd. Reconcile the root `CLAUDE.md` Worktrees section and the `lead`'s worktree-creation step so the worktree location, the addressing convention, and the rules all agree.

**Value.** After the change the correct target is unambiguous in every dispatched agent's definition, and an agent can no longer silently operate on the root `master` checkout when it was handed a worktree.

**Non-goals.**
- Not relocating story worktrees to `.claude/worktrees/` (that is the rejected Resolution B — see Design).
- Not changing `.gitignore`, the worktree location, or how the `lead` physically creates the worktree.
- Not editing the library-crew agents (`librarian`, `scribe`, `clerk`, `analyst`, `researcher`); the card scopes exactly the five worktree-dispatched pipeline agents.
- Not rewriting the existing per-agent "leave your work in the worktree" / "validate the worktree" mentions — those describe *what* happens in the worktree, not *how to address* it, and stay as-is alongside the new paragraph.
- README/`ARCHITECTURE.md` completeness updates are the **docs pass's** job, not a `coder` task (see Design → Documentation ownership).

## Design

### Chosen resolution: A (state the addressing convention once), not B (relocate the worktree)

The card offers two mutually exclusive resolutions. This spec picks **Resolution A** and rejects **Resolution B**, for these reasons:

1. **Smaller, mechanical footprint.** The only *literal* `.worktrees/` references in the whole repo are `.gitignore:12` and `CLAUDE.md:9`; every other mention (`lead.md`, `ARCHITECTURE.md`, `README.md`) already speaks abstractly of "the repository's worktree directory". Resolution A adds one identical paragraph and one `CLAUDE.md` note. Resolution B would additionally require migrating the live worktree directory (including this story's own worktree, which lives at `.worktrees/address-story-worktrees-consistently`), rewriting `.gitignore`, and re-validating `EnterWorktree` across every dispatch scenario.
2. **`-C <path>` is immune to the core hazard.** The card's own background states cwd resets between bash calls, and this environment confirms agent-thread cwd resets between bash calls. `-C <path>` and absolute file paths work unconditionally from any cwd on every single call, needing no session state. Resolution B's one benefit — a single cwd switch — is undercut for exactly the subagents this is about, because their cwd does not persist between bash calls.
3. **`EnterWorktree` acceptance is confirmed but unhelpful here.** `EnterWorktree` genuinely only accepts worktrees under `.claude/worktrees/` (verified against its tool contract, for both `name` creation and `path` entry). Adopting B means committing the whole pipeline to that directory and to `EnterWorktree`'s base-ref semantics; A leaves the proven `git worktree` + `-C` flow untouched.
4. **Matches the card's primary phrasing.** The card lists Resolution A as its first acceptance-criterion form; A satisfies "stated once, applied consistently" directly.

### The canonical paragraph

One paragraph, **byte-identical** in all five agent files (this is what "stated once, applied consistently" means in a repo with no shared-include mechanism — each agent `.md` is standalone, so the single source of truth is enforced by identical text a grep can verify). Insert this verbatim:

> **Addressing the story worktree.** Every task runs in one story worktree at an absolute path — the `lead` creates it and names that path to every agent it dispatches. Do not assume it is your working directory: an agent thread's working directory can stay at the repository root and resets between bash calls, so cwd is never a reliable way to reach the worktree. Treat the named path as the review/build root instead — prefix every git command with `-C <path>`, and give every file tool an absolute path under `<path>`. When you dispatch a subagent, pass the worktree path and this instruction into its prompt. An agent that skips this silently operates on the repository root on its base branch, reviewing or building the wrong tree, with nothing to distinguish that from a clean pass.

The opening parenthetical ("the `lead` creates it and names that path to every agent it dispatches") makes the identical text correct for both roles: the `lead` reads it as *"I create it and name it"*; the four dispatched leaves read it as *"the lead named it to me"*. This lets the text stay byte-identical across all five while remaining accurate in each.

### Why the paragraph goes into all five (including `auditor`)

All five agents operate **inside** the worktree and so must address it:
- `lead` — creates the worktree, commits in it, and passes its path to every agent it dispatches.
- `coder` — implements and leaves work in it.
- `writer` — writes the spec/docs into it.
- `qa` — validates and reviews the diff in it (runs the project's git/validation there).
- `auditor` — reads the spec (spec-readiness gate) and inspects the built result / git diff (acceptance gate) in it. The `auditor` currently mentions the worktree only in its Process-feedback footer, so it is the agent most exposed to the silent-wrong-tree hazard; it needs the convention explicitly.

### Relationship to the existing per-agent worktree mentions

The new paragraph is **additive**. The existing sentences (`coder` "Work in the story worktree", `qa` "Validate what is in the worktree now", `writer` "leave your work in the story worktree", `lead`'s "its own worktree under the repository's worktree directory") describe *what* each agent does in the worktree and stay unchanged — they do not state a competing *addressing* convention, so there is no contradiction to resolve, only a gap to fill. The `coder` MUST NOT introduce a second, differently-worded addressing convention anywhere; the paragraph above is the only one.

### Root `CLAUDE.md` reconciliation

`CLAUDE.md` stays the source of truth for the worktree **location** and keeps `.worktrees/<branch>`. It gains a short note recording the deliberate addressing decision, so a future maintainer does not "fix" the location back to `.claude/worktrees/` and re-open the inconsistency: dispatched agents address the worktree by its absolute path (git via `-C`, file tools by absolute path), and `EnterWorktree` is deliberately not used because it only accepts `.claude/worktrees/`. This makes `CLAUDE.md`, the addressing paragraph, and the `lead`'s creation step mutually consistent.

### `lead` creation step consistency

The `lead`'s line-14 permission statement and workflow step 2 ("Create the workspace … in its own worktree under the repository's worktree directory") already reference the location abstractly and resolve it from `CLAUDE.md`; they need no location change under Resolution A. The `lead` additionally carries the canonical paragraph, which tells it to pass the path down and address the worktree via `-C`. After the change: step 2 creates at `.worktrees/<branch>`, `CLAUDE.md` says `.worktrees/<branch>`, and the addressing paragraph says address it by absolute path + `-C` — all three agree, and none implies `EnterWorktree` can switch into it.

### Documentation ownership (not `coder` tasks)

Two consistency touch-points are owned by the **docs pass** (the `writer` after the build), not the `coder`, and are named here so the acceptance gate does not rediscover them as gaps:

- `docs/ARCHITECTURE.md` — its commit-model section speaks of "the repo's worktree directory" abstractly and stays *factually correct* under Resolution A (no location change), so it needs no edit for correctness. Per `docs/CLAUDE.md`, `ARCHITECTURE.md` covers structure, not per-agent prose, so the addressing convention does not belong there. **Owner: docs pass**, to confirm no staleness; no `coder` task.
- Root `README.md` — the user-facing per-agent description. Its worktree statements ("one worktree", "under the repo's worktree directory") stay *factually correct* under Resolution A, so nothing becomes wrong; they are merely *less complete* (they do not mention the `-C` addressing convention). Per `docs/CLAUDE.md`, agent-behavior changes update the README. **Owner: docs pass**, as an optional completeness follow-up; no `coder` task and not an acceptance-gate item (the card does not scope the README).

### Risks

- **Drift between the five copies.** Byte-identical duplication can drift on a later edit. Mitigated by the Validation grep (Requirement 1's scenario): a single marker sentence must appear exactly five times, once per agent file.
- **Over-narrow subagent clause.** The leaves rarely dispatch subagents, but they retain the Agent tool (per `ARCHITECTURE.md`) and use `Explore`/`general-purpose`/context7; the "pass the path into every subagent prompt" clause is correct whenever they do and harmless when they do not. Kept verbatim because it is an explicit acceptance-criterion clause.

## Requirements

### Requirement: One canonical addressing convention, carried identically by all five dispatched agents

#### Scenario: The marker sentence appears once per agent, and nowhere is a second variant introduced

- **WHEN** the five files `plugins/ca77y-engineering/agents/{lead,coder,writer,qa,auditor}.md` are grepped for the paragraph's marker (`Addressing the story worktree`)
- **THEN** each of the five contains exactly one occurrence, the paragraph text is byte-identical across all five (same `-C <path>` rule, same absolute-file-path rule, same subagent-handoff clause), and no other paragraph in any of the five states a different addressing convention

### Requirement: The convention names the correct target and forbids relying on cwd

#### Scenario: Each agent's paragraph makes the review/build root unambiguous

- **WHEN** a reader follows any one of the five agent definitions to reach the story worktree
- **THEN** the paragraph names the caller-provided absolute path as the review/build root, directs `-C <path>` on every git command and an absolute path under `<path>` for every file tool, states that cwd is not a reliable way to reach the worktree, and states that skipping this silently operates on the repository root on its base branch (the wrong tree)

#### Scenario: A dispatched agent can no longer silently operate on the root `master` checkout

- **WHEN** an agent is handed a worktree path and follows its own definition
- **THEN** the definition tells it to address that path (not cwd) for git and file tools, so operating on the root `master` checkout is a documented mistake the definition rules out rather than an undistinguished default

### Requirement: The `lead` creation step, the addressing convention, and the root `CLAUDE.md` agree

#### Scenario: All three place and address the worktree the same way

- **WHEN** the `lead`'s worktree-creation step (line-14 permission statement and workflow step 2), the canonical addressing paragraph, and the root `CLAUDE.md` Worktrees section are read together
- **THEN** all three place story worktrees at `.worktrees/<branch>` (referenced abstractly by the agents as "the repository's worktree directory"), all three describe addressing it by absolute path + `-C` rather than by a cwd switch, and none states or implies `EnterWorktree` can switch into it

#### Scenario: `CLAUDE.md` records why the worktree is addressed by path, not cwd

- **WHEN** a maintainer reads the root `CLAUDE.md` Worktrees section after the change
- **THEN** it keeps the `.worktrees/<branch>` location and adds that dispatched agents address the worktree by absolute path (git via `-C`, file tools by absolute path), and that `EnterWorktree` is not used because it only accepts `.claude/worktrees/` — so the location is not "fixed" back into an inconsistency later

### Requirement: The change is additive and introduces no contradiction or duplication

#### Scenario: Existing per-agent worktree mentions remain and do not compete with the new paragraph

- **WHEN** the five agent files are read after the change
- **THEN** the pre-existing worktree mentions (`coder` "Work in the story worktree", `qa` "Validate what is in the worktree now", `writer` "leave your work in the story worktree", `lead`'s worktree-directory references) are still present and unchanged, and none of them states an addressing convention that conflicts with the canonical paragraph

## Acceptance criteria coverage

Mapping the card's three acceptance criteria to the requirements that prove them:

- **"The convention … is stated once, in the shared paragraph every dispatched agent carries."** → Requirement *One canonical addressing convention, carried identically by all five dispatched agents*.
- **"A dispatched agent can no longer silently operate on the root `master` checkout … the definition makes the correct target unambiguous."** → Requirement *The convention names the correct target and forbids relying on cwd* (both scenarios).
- **"The `lead`'s worktree-creation step and the addressing convention stay consistent with each other and with the root `CLAUDE.md` worktree rules."** → Requirement *The `lead` creation step, the addressing convention, and the root `CLAUDE.md` agree* (both scenarios).

## Tasks

- [ ] **`plugins/ca77y-engineering/agents/lead.md`** — insert the canonical "Addressing the story worktree" paragraph verbatim as a new paragraph in the intro, immediately after the "project layout … is in your context" line (currently line 16). Leave line 14, workflow step 2 ("Create the workspace"), and step 4's "with the spec's path and the worktree" unchanged — verify they still agree with the paragraph and with `CLAUDE.md` (location `.worktrees/<branch>`, no `EnterWorktree`).
- [ ] **`plugins/ca77y-engineering/agents/coder.md`** — insert the canonical paragraph verbatim, immediately after the intro that hands it "the spec's file path and the story worktree" (after line 8, or the "project layout … is in your context" line 12). Leave the existing "Work in the story worktree" (loop step 1) unchanged.
- [ ] **`plugins/ca77y-engineering/agents/writer.md`** — insert the canonical paragraph verbatim, immediately after the intro line "You leave your work in the story worktree and report what changed — the `lead` commits it." (line 8).
- [ ] **`plugins/ca77y-engineering/agents/qa.md`** — insert the canonical paragraph verbatim, immediately after the intro naming "the story worktree holding the coder's changes" (after line 8, before or after the "Validate what is in the worktree now" sentence on line 10).
- [ ] **`plugins/ca77y-engineering/agents/auditor.md`** — insert the canonical paragraph verbatim, in the intro region after the `## Inputs` section (after line 12), so both the spec-readiness gate and the acceptance gate address the worktree by path.
- [ ] **Root `CLAUDE.md`** — in the `## Worktrees` section, keep the `.worktrees/<branch>` location and add a sentence: dispatched agents address the worktree by its absolute path (git via `-C <path>`, file tools by absolute path), and `EnterWorktree` is deliberately not used because it only accepts `.claude/worktrees/`. Do not change `.gitignore` or the location.
- [ ] **Verify (consistency checks, no code):**
  - `grep -rl "Addressing the story worktree" plugins/ca77y-engineering/agents/` returns exactly the five files `lead.md`, `coder.md`, `writer.md`, `qa.md`, `auditor.md`.
  - The paragraph text is byte-identical across all five (e.g. `grep -A6 "Addressing the story worktree"` on each, or a diff of the extracted block).
  - Root `CLAUDE.md`, `lead.md` step 2, and the addressing paragraph all agree the location is `.worktrees/<branch>` and that addressing is by `-C`/absolute path, not `EnterWorktree`.
- [ ] **Not a `coder` task — docs pass follow-ups** (named for the acceptance gate, owned by the `writer`'s docs pass): confirm `docs/ARCHITECTURE.md` needs no correctness edit under Resolution A; optionally add the `-C` addressing convention to the relevant per-agent sections of the root `README.md` for completeness. Neither gates acceptance (the card scopes only the five agent files and root `CLAUDE.md`).
