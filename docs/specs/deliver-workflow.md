# Deliver through workflows

## Problem and outcome

`deliver` states its gate order, fresh-validation rule, and failure budgets as prose that the main session must obey. The outcome: a workflow script runs the gates, so the order, the fresh dispatch of every validator, and the budgets hold by construction. `/slop-eng:deliver` stays the single entry point.

## Scope

- `plugins/slop-eng/workflows/deliver-gates.js`: the gate engine, in three modes: `hard` (spec, build, verify), `easy` (build, verify), and `repair` (fix given defects, verify).
- `plugins/slop-eng/workflows/deliver-repair.js`: a wrapper that runs `deliver-gates` in `repair` mode, for review rounds.
- `plugins/slop-eng/skills/deliver/`: the skill keeps what a script cannot do (worktree, commits, push, PR, card, review wait, finding triage, report) and runs the workflows for the gates.
- README and CLAUDE.md describe the current state.

## Exclusions

- `shape`, both `bootstrap` skills, and all of `slop-lib` stay as they are.
- Nothing forge-, board-, or branch-specific enters a script; the skill reads those from `docs/FORGE.md` and `docs/BOARD.md` and passes values in.
- No version bump.

## Facts

From [`docs/issues/deliver-workflow-spike.md`](../issues/deliver-workflow-spike.md): `agent()` with `agentType: 'slop-eng:<role>'` runs the plugin definition with its pinned model, effort, and tool limits; `schema` returns validated objects; completed agents replay on resume within the run's session; a skill starts a plugin workflow by its qualified name; `args` may arrive as a JSON string; workflow agents inherit the session's permissions and have no `Agent` tool. A workflow can run another plugin workflow by qualified name with `workflow()`, one level deep. Scripts have no clock, shell, or filesystem.

## Approach

### Inputs

`args` is an object, or the same object as a JSON string:

| Field        | Meaning                                                                                                  |
| ------------ | -------------------------------------------------------------------------------------------------------- |
| `mode`       | `hard`, `easy`, or `repair`.                                                                             |
| `request`    | The user's request.                                                                                      |
| `acceptance` | The acceptance source, verbatim.                                                                         |
| `worktree`   | Absolute path of the story worktree.                                                                     |
| `base`       | The commit the story branch started from.                                                                |
| `spec`       | Absolute spec path: where to write it (`hard`), or the validated spec (`repair`); omitted for easy work. |
| `context`    | Repository and product evidence, project rules, and the checks the project requires.                     |
| `producer`   | `easy` only: `coder` (default) or `writer`.                                                              |
| `findings`   | `repair` only: the defects, each `{location, problem, area}` with `area` one of `spec`, `code`, `docs`.  |
| `failures`   | Failures already counted this run, `{spec, implementation}`; zero when omitted.                          |
| `decision`   | The user's answer to an earlier `blocked` result, when rerunning.                                        |
| `pluginRoot` | Absolute path of the plugin, so briefs can name its references.                                          |
| `skillDir`   | Absolute path of the `deliver` skill, for `references/specification.md`.                                 |

### Verdicts and producer reports

Every validator returns, through `schema`:

```
{ verdict: pass | fail | unverified, revision, findings: [{ location, problem, blocking, area }], limits }
```

`revision` is what the validator evaluated: the spec file's hash for a spec, or the HEAD commit plus a digest of uncommitted and untracked content for a candidate. Every producer returns `{ status: done | spec_defect | unworkable | blocked, changed[], open }`.

### Gates

- **Spec** (`hard`, and whenever the spec is reopened): `slop-eng:writer` drafts or revises the spec, then a fresh `slop-eng:auditor` judges it. On `fail` the spec budget takes a failure and the writer fixes the findings; a new auditor judges again.
- **Build**: `slop-eng:coder` implements against the validated spec, then `slop-eng:writer` updates affected documentation, sequentially, so neither edits under the other. Easy work runs only the named producer.
- **Verify**: a fresh `slop-eng:qa` judges the candidate, documentation included; easy work by the writer goes to a fresh auditor. On `fail` the implementation budget takes a failure and the findings go back by area: `code` to the coder, `docs` to the writer, `spec` to the spec gate. A new validator judges again.
- **Repair** starts at the producers with the given findings, then verifies.

A producer that reports `spec_defect` reopens the spec gate with its count kept, and the build restarts against the revised spec. `unworkable` costs its gate a failure. A budget reaching three ends the run.

### Fresh validation

Each verdict is a new `agent()` call. A validator brief is built in code from the request, acceptance, context, worktree, base, spec path and revision, and earlier validator findings to recheck; producer reports never enter it. Briefs name `references/specification.md` and `references/claim-correction.md` by path instead of repeating them.

### Result

The workflow never throws for a gate outcome; it returns:

```
{ status: passed | budget_exhausted | blocked, mode, spec: { path, revision } | null,
  candidate, failures: { spec, implementation }, attempts[], findings[], blocker }
```

`attempts` lists every verdict and abandoned approach with its gate, role, revision, and findings. `findings` holds the open ones at a stop. `blocker` names what stopped a `blocked` run: a producer's missing decision, a validator's `unverified` limits, or an agent that returned nothing.

### Skill

The skill sets up the worktree and card, gathers `context`, picks the mode, runs `deliver-gates`, and acts on its result: on `passed` it commits, pushes, opens the PR, and runs the review loop, where each round with defects runs `deliver-repair` with the run's failure counts; on `blocked` it asks the user, then reruns with `decision`; on `budget_exhausted` it reports the attempts and the decision it needs. The main session commits, so commit authority stays where it was.

### Ledger

The ledger keeps what the workflow does not persist: `run` lines, a `workflow` line when one starts (name, run ID, script path, transcript directory) and when it returns (status and failure counts), `review` lines, and `next` lines. A run interrupted in the same session resumes with `resumeFromRunId`; otherwise it reruns with the counts from the last returned line, recovered from the run's `journal.jsonl` when a later run never returned.

## Acceptance criteria

1. Hard work runs writer, auditor, coder, documentation writer, and QA in that order; verified by the deliver smoke eval and a dry run of the script against stub agents.
2. Every verdict comes from a fresh `agent()` call whose brief holds no producer report; verified by reading the brief builders.
3. A third failure in either budget returns `budget_exhausted` with every attempt and stops; verified by a stubbed dry run where every verdict fails.
4. Easy work runs no writer or auditor for a spec; verified by a stubbed dry run.
5. A repair run starts at the producers with the given findings and adds to the passed failure counts; verified by a stubbed dry run.
6. An `unverified` verdict, a producer's `blocked`, or a null agent result returns `blocked` with the reason; verified by stubbed dry runs.
7. No script names a tracker, forge, branch, or commit convention; verified by the CLAUDE.md greps.
8. The skill no longer states the gate order, the fresh dispatch rule, or attempt counting as instructions to itself; verified by reading it.
9. README and CLAUDE.md name the workflow requirement and the allow rule for headless runs; verified by reading them.

## Tasks

1. `deliver-gates.js` and `deliver-repair.js`, with a dry-run harness outside the plugin.
2. Skill, `specification.md`, `review-round.md`, and `ledger.md` rewrite.
3. README, CLAUDE.md, and eval updates.
