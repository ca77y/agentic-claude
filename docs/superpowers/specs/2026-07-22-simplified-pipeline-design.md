# Simplified pipeline — design

Date: 2026-07-22
Repo: `ca77y-agentic` (`plugins/ca77y-engineering`)
Status: approved, ready to plan

## Problem

The pipeline grew a story/unit split that never pays for itself. The `lead`
decides whether to split a story into units, locks a shared interface contract
between them, writes and audits a spec per unit, provisions a worktree and branch
per unit, dispatches N coders, merges their branches, resolves seam conflicts,
runs a separate simplify pass, runs an integration review, and audits the
integrated result against the card's acceptance criteria. Each of those steps is
a place the run can stall or diverge, and in practice nearly every story is one
unit anyway.

The `lead` also owns board card status transitions, which forces an awkward
carve-out: the one write it is allowed to make to the base branch, in the
repository root, outside its own worktree.

## Goals

- One task in, one PR out, with no splitting, no per-unit worktrees, and no merge
  step.
- The `lead` orchestrates and never touches the board.
- Every artifact accumulates in a single story worktree; git history stays clean.
- The PR review is part of the flow, not an afterthought.

## Non-goals

- Splitting the toolkit into multiple plugins. It stays one plugin,
  `ca77y-engineering`, with the same eleven agents. (Considered and rejected: the
  seam between the library crew and the pipeline is a file — a wiki page — not an
  agent call, but the `analyst` dispatches `librarian` and `clerk` and is gated by
  `auditor`, so a split would only flip the dependency rather than remove it.)
- Changing the roster. No agent is added or removed.
- Changing the dispatch-guard hook. Its ROSTER already matches the agents and
  their models, and none of those change.

## Roster (unchanged)

`lead`, `coder`, `qa`, `reviewer`, `auditor`, `writer`, `analyst`, `researcher`,
`librarian`, `scribe`, `clerk`.

Two review roles stay distinct:

- `reviewer` — **code** only. Callers name a diff to review; how it reviews (the
  code-review skill, and at what effort) is internal to it. Its sole caller is now
  the `coder`.
- `auditor` — **artifacts** only (specs, docs trees, story cards). Its callers are
  the `writer` (spec gate, docs gate) and the `analyst` (advisor gate).

The `lead` dispatches neither. It dispatches only `writer` and `coder`.

## The flow

```
task (prompt, optionally referencing a story card)
  │
  ▼
lead ── creates one story branch in one worktree; all work happens there
  │
  ├─▶ writer  (spec pass) ──▶ auditor gate ──▶ spec ready
  │      │
  │   lead commits the spec                                    [commit 1]
  │
  ├─▶ coder  (build) ──▶ qa ──▶ /simplify ──▶ reviewer ──▶ fix ──┐
  │      ▲                                                       │
  │      └───────────────── loop, cap 3 rounds ──────────────────┘
  │      (reports; never commits)
  │
  ├─▶ writer  (docs pass) ──▶ auditor gate ──▶ spec converted & removed
  │
  ├─ lead commits everything else, pushes, opens the PR          [commit 2]
  │
  └─▶ PR review loop, max 3 rounds
         poll ≤5 min for review activity
           · nothing at all       → report the task finished
           · review started       → keep waiting until it lands
           · issues               → resume the coder by agentId,
                                    commit, push, re-fire the review
```

### Commit model

Nothing is committed while work is in flight. The story worktree is the only
workspace, and the `lead` is the only agent that commits.

1. **Commit 1 — the spec.** Made by the `lead` immediately after the `writer`'s
   spec pass clears its `auditor` gate. This exists so the spec is preserved in
   history: the `writer`'s later docs pass converts the spec into durable docs and
   deletes it, so without this commit the spec would never appear in git at all.
2. **Commit 2 — everything else.** Code, tests, docs, and the spec's removal, all
   in one commit at PR time. The `lead` pushes both commits and opens the PR.
3. **One commit per PR-review fix round.** The PR already exists, so each round of
   fixes is committed and pushed on its own.

Consequence to accept: an interrupted run leaves uncommitted work in the story
worktree. It is recoverable (the worktree persists), but it is not in git.

### The lead's workflow

1. **Read the task.** The task arrives as a prompt. If it references a story card,
   read that card and what it links before reasoning about the task. That is the
   lead's entire relationship with the board — it never writes card status.
2. **Create the workspace.** One story branch off the project's target branch, in
   one worktree under the repository's worktree directory. The repository root
   stays on its base branch. All work happens in the story worktree.
3. **Spec.** Dispatch the `writer` to author the spec. The `writer` runs its own
   `auditor` gate and returns when the spec is ready. Commit the spec (commit 1).
4. **Build.** Dispatch one `coder` with the spec's explicit file path and the
   worktree. **Record the coder's agentId** — the PR-review loop resumes this same
   coder rather than dispatching a fresh one. The coder reports the finished work;
   it does not commit.
5. **Docs.** Dispatch the `writer` for the docs pass: durable docs for what
   shipped, the spec converted into its permanent home and removed. The `writer`
   runs its own `auditor` gate.
6. **Confirm and ship.** Confirm the result covers the task as stated. Commit
   everything else (commit 2), push, open **one** PR against the project's target
   branch.
7. **PR review loop** (below).

Every dispatch is a single agent the lead has nothing to do but wait on, so the
lead **blocks synchronously** on each one. The parallel-dispatch monitor branch is
removed along with the split — there is never more than one agent in flight.

### PR review loop

The project's PR review is performed by the Claude GitHub app, triggered on PR
open and re-triggerable by comment. Capped at **3 rounds**.

1. **Poll the PR for up to 5 minutes** for review activity — reviews, review
   threads, or comments (`gh pr view --json reviews,comments,reviewThreads`).
2. **Nothing at all within 5 minutes** → report the task finished to the user. The
   PR is open and the work is pushed; no review was triggered.
3. **A comment indicating the review has started** → the 5-minute timer has done
   its job. It bounds how long to wait for the review to be *triggered*, not for it
   to *finish*. Keep waiting past 5 minutes until the review actually lands.
4. **Review lands with no blocking issues** → report the task finished.
5. **Review lands with issues** → resume the same `coder` via `SendMessage` with
   its recorded agentId, handing it the full set of findings. It applies them all
   in one go and re-runs its own gates. Then commit, push, and re-fire the review
   with `gh pr comment --body "@claude review"`. Return to step 1.
6. **After 3 rounds** → stop and report what remains unresolved. Do not loop
   further.

## Per-agent changes

### `lead.md` — substantial rewrite

Remove:

- The board-as-live-tracker paragraph and every card status transition (In
  Progress, In Review), including the base-branch write carve-out.
- The split decision, the shared-contract/seam lock, and the one-level split rule.
- Spec authoring and the *Spec authoring rules* section (both move to the
  `writer`).
- The spec-set integration review.
- Per-unit worktree provisioning and parallel coder dispatch, including the
  monitor-based active wait for multiple dispatches.
- The integrate step.
- The simplify-pass dispatch.
- The integration review dispatch.
- The story-acceptance `auditor` dispatch and per-criterion gating.
- Finding routing across multiple coders.

Keep, adapted:

- Worktree/branch creation and the safety rules (never commit to the target
  branch, never overwrite unrelated dirty work, no secrets).
- The active-wait discipline, narrowed to blocking synchronously on one dispatch.
- The nesting-fallback note. The chain is still two levels
  (`lead → writer → auditor`, `lead → coder → qa/reviewer`).
- The process-feedback section.

Add:

- The task input rule (prompt, optionally referencing a card to read first).
- The commit model (commit 1 after the spec gate, commit 2 at PR time).
- The agentId recording requirement.
- The PR review loop.

Its `description` frontmatter is rewritten to match: task orchestrator, one task
end to end, no splitting, no board ownership.

### `coder.md`

- Reframe from "one unit of work" to the whole task.
- Loop becomes: implement → `qa` → `/simplify` → `reviewer` → apply findings →
  re-run, capped at 3 rounds → **report without committing**.
- `/simplify` folds into the loop, after qa passes and before the review, so the
  review sees cleaned code. The existing fallback note stays: when `/simplify`'s
  own agent dispatch is denied by the dispatch guard, perform its review angles
  directly and say so in the report.
- Delete the standalone story-level *Simplify pass* section.
- Add a **PR review fixes** section: when resumed by the `lead` with PR findings,
  apply them **all in one go**, then run the same gates (`qa`, then `reviewer`)
  before reporting back. Same worktree, still no commits.
- Remove the shared-contract obligations and the cross-unit escalation language;
  keep spec-mismatch escalation to the `lead`.
- Boundaries: never commit, never push, never open or modify a PR.

Retained unchanged: the evidence standard for rejecting a review finding, the
spec-mismatch escalation rule, and the blocked-review-gate rule.

### `writer.md`

- Gains **spec authoring** as its first mode, taken from the `lead`, including the
  *Spec authoring rules* verbatim (runnable-scenario rule, validation-reaches-every-
  consumer rule, shared-infrastructure coordination note).
- Two modes, both dispatched by the `lead`: the **spec pass** before the build, and
  the **docs pass** after it.
- Both modes run the required `auditor` gate, with the existing rules intact: never
  self-audit, re-audit as a fresh dispatch, a genuine no-result is escalated to the
  `lead`.
- Docs pass is otherwise unchanged, including deferring spec removal until after
  the gate passes so a blocked gate leaves the run resumable.
- Still never commits — the `lead` owns every commit.

### `reviewer.md`

- Callers: the `coder` only. Remove the lead's integration review.
- Its usual target is now the **uncommitted working tree**, since nothing is
  committed until PR time. Keep support for a committed range and a PR ref.
- **How the review is performed becomes internal to the reviewer.** The caller
  names only *what* to review — the target. That it runs the code-review skill, and
  at what effort, is the reviewer's own business: it sizes the change and picks the
  effort itself. Remove "use the effort the caller names" and every caller-side
  mention of an effort level.

### `auditor.md`

- Update the caller list to the `writer` (spec gate, docs gate) and the `analyst`
  (advisor gate). Remove the `lead`'s spec validation, spec-set review, and
  story-acceptance uses.

### `qa.md`

- Vocabulary only: "one unit of work" becomes the task. Caller is still the
  `coder`.

### `analyst.md`

- Remove references to the `lead` splitting a story into units. The `lead`
  executes a story as one task, and the `writer` specs it.
- The `auditor` advisor gate and the `librarian`/`clerk` dispatches stay.

### `researcher.md`, `librarian.md`, `scribe.md`, `clerk.md`

- No functional change. Only the incidental "the `lead` and its `coder`s" plural in
  `researcher.md`'s boundaries becomes singular.

### `hooks/dispatch-guard.py`

No change. The ROSTER already lists all eleven agents with the correct models, and
no agent or model changes.

## Repo-level changes

- `README.md` — rewrite the flow diagram, the "pipeline at a glance" table, and the
  per-agent sections. Purge "unit of work", "split", "shared contract", "seam",
  "spec set", and "integration review". Document the commit model and the PR review
  loop.
- `plugins/ca77y-engineering/plugin.json` and
  `plugins/ca77y-engineering/.claude-plugin/plugin.json` — bump both to **1.0.0**
  and update both descriptions. Per `CLAUDE.md`, verify the two agree before
  pushing.
- `.claude-plugin/marketplace.json` — update the plugin description to match.

## Vocabulary to purge repo-wide

"unit of work", "unit spec", "split", "shared contract", "shared seam", "spec set",
"integration review", "integrate", "per-unit worktree", "story-level simplify
pass", "story acceptance", "In Progress"/"In Review" as lead actions.

## Risks

- **Uncommitted work in flight.** Between commit 1 and commit 2 the entire build
  lives only in the worktree. An interrupted run loses nothing (the worktree
  persists) but has nothing in git either. Accepted deliberately in exchange for a
  clean two-commit history.
- **The 5-minute poll is a heuristic.** If the Claude GitHub app is slow to post
  *any* signal, the lead reports the task finished with the PR unreviewed. The
  report must say plainly that no review was triggered, so this is visible rather
  than silent.
- **Losing the story-acceptance gate.** Nothing now audits the finished work against
  a card's acceptance criteria. The `lead` confirming the result covers the task is
  a weaker check by design; the tradeoff is one fewer dispatch and one fewer loop.
