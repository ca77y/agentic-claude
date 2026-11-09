# Deliver story

How `deliver-story` takes a Linear issue to a GitHub pull request (PR) whose review is clean. It is built for non-simple stories, and it spends the most on the how and on validation. It follows the shared rules in [`DESIGN.md`](../DESIGN.md): the severity scale, recorded decisions, bounded loops, and run outcomes.

## Invariants

1. Work starts from a Linear issue that `shape` marked `Deliverable`. The issue holds the why and the what, never the how.
2. The spec holds the how. Agents write it and agents read it. Humans validate the issue and review the PR.
3. Work ends in a GitHub PR.
4. The PR is reviewed. It is marked ready only when the review is clean.
5. The change is validated by running the app, as the target project's `TESTING.md` describes. The workflow knows no platform, so a web app is driven in a browser and an iOS app in the simulator because `TESTING.md` says so.

A delivery ends in a PR unless one of the halt conditions below holds. Anything still open goes into the PR, and the PR stays a draft. A human merges.

## Flow

```text
 /slopify:deliver-story SPR-123
 │
 ▼
 1 INTAKE ─────────── scout-card (haiku) reads the issue and its labels       ⛔ H1 H2
 │                    scout-checkpoint (haiku) reads the run state
 ▼
 2 WORKSPACE ──────── pusher (sonnet) creates the worktree and branch, starts the issue
 ▼
 3 HOW ────────────── GROUND     scout-code, scout-tests, scout-docs, scout-history (haiku), library-reader
 │   ▲  ≤2 tries      DESIGN     designer × 3 (opus), independent: smallest fit, best structure, most robust
 │   │                           scout-upstream-docs, scout-known-issues per dependency (haiku)
 │   │                ADVISE     architecture, performance, risk, security, testability (opus, high)
 │   │                           each compares all 3 designs
 │   └── none viable  DECIDE     judge (opus) picks one and grafts the best of the others  ⛔ H3
 │                    SPEC       writer (opus) writes the spec folder → pusher commits it
 │   ▲  ≤3 rounds     CHALLENGE  check-claim × N, check-criterion × N, lens-scope, lens-consistency (haiku)
 │   │                           the 5 advisors, fresh, try to break the spec
 │   └── confirmed →             judge × N (opus) → writer revises                         ⛔ H3
 ▼
 4 BUILD AND VALIDATE  outer loop: the first build, then ≤3 fix rounds
 │
 │  ┌─► BUILD ──────── one inner loop per task, in dependency waves
 │  │                  ┌───────────────────────────────────────────────┐
 │  │                  │ INNER LOOP  ≤3 tries                          │
 │  │                  │ coder (opus) writes a failing test → commit   │
 │  │                  │ coder (opus) makes it pass → commit           │
 │  │                  │ qa (sonnet) checks the change and its history │
 │  │                  │   fail → back to coder                        │
 │  │                  └───────────────────────────────────────────────┘
 │  │                  then writer (opus) updates the listed docs against that code → commit
 │  │   VALIDATE ───── checks (haiku) runs the TESTING.md checks
 │  │                  validator (sonnet) follows each criterion's category path
 │  │                  lens-docs (haiku) × N, one per listed doc: are its claims true?
 │  │   JUDGE ──────── judge × N (opus), one per problem: severity and kind
 │  │                  no proof → cannot-verify
 │  │   GATEWAY ────── judge (opus): anything missed? a doc not on the list → added
 │  │   PUSH ───────── pusher pushes (even if something is still flagged)                  ⛔ H4
 │  │                  no PR yet: opens a draft once nothing blocks, or on the last round
 │  │                  PR exists: comments "@review"
 │  │   REVIEW ─────── only if a PR exists: watcher (haiku) reads the findings
 │  │                  judge × N (opus), one per finding: severity and kind
 │  │   GATE (code) ── clean → exit
 │  └── code or test → inner loop     docs → writer     spec → advisors and writer
 ▼
 clean → PR ready, issue In Review            not clean → PR stays draft, issue gets questions
```

## Stages

Every delivery runs these stages in this order. Each stage gives its continue-or-stop rule. The script applies it to the agents' typed output, and no prompt decides it.

### 1. Intake

- `scout-card` reads the issue and its comments, labels, and relations.
- `scout-checkpoint` reads the ledger, the spec folder, and the PR, so that a rerun skips the stages that are complete.

The script reads the `Deliverable` label from what `scout-card` returned. `shape` adds that label, so no agent checks the issue. An issue without it stops the run with a comment that says to run `shape`, which accepts an existing card.

### 2. Workspace

`pusher` creates or recovers the story worktree and branch, and moves the issue to its started status.

### 3. How

The issue says why and what. This stage decides how, and it deserves more time and tokens than anything else in the workflow. It never stops on a choice about how: those choices are ours, so they are made and recorded. Each step feeds the next.

1. **Ground.** The scouts and `library-reader` return file and line pointers, existing symbols, tests, documentation claims, history, and earlier research.
2. **Design.** Three independent `designer` dispatches each produce a full approach, and none sees the others. The script gives each a fixed stance: the smallest change that fits the existing patterns, the best long-term structure, and the most robust under failure. Each reads the project's full architecture and design documents, and marks what it reuses and what it creates. `scout-upstream-docs` and `scout-known-issues` then run once for each dependency any design names.
3. **Advise.** Five advisors each compare all three designs from one angle: `advisor-architecture`, `advisor-performance`, `advisor-risk`, `advisor-security`, and `advisor-testability`. The last asks whether each criterion can be proved through its `TESTING.md` validation path. Each claim cites the code, and each concern says what would fix it.
4. **Decide.** One `judge` picks a design, grafts in the best of the others, and records what was rejected and why. If it rules no design viable, Design runs again with its reasons, at most once more. If none survives that, the run halts.
5. **Spec.** `writer` writes the [spec folder](#the-spec), and `pusher` commits it before any code exists.
6. **Challenge.** At most three rounds:
   - One `check-claim` per file, symbol, or API claim checks that it is true of the code.
   - One `check-criterion` per criterion checks that its category matches what `TESTING.md` says that category covers, and that the category's path can check it.
   - `lens-scope` checks that the spec adds and drops no scope. `lens-consistency` checks it against the project's rules and documents.
   - The same five advisors, in fresh dispatches, try to break the finished spec.
   - One `judge` per problem rules on it, and `writer` revises for each confirmed `blocker` or `major`. The rulings go in `RATIONALE.md`.

   A `major` still open after the last round is recorded and the run continues. A `blocker` still open halts the run.

#### The spec

Each story gets one folder, `docs/specs/<lowercase issue id>-<slug>/`. Nothing in it is written for a human to read or approve. It stays in the repository as context for when a deployed feature breaks, and humans compact or remove it when it's time. `git log` on a file gives the issue id, and the id gives the folder.

- **`build.json`** says what to build:
  - `shared`: the constraints and interfaces every task of this story must follow. It never repeats a project rule.
  - `tasks`: for each task, its `id`, `dependsOn`, `files`, `criteria`, what to do, what to reuse, and what to create. Anything only one task needs goes in that task.
  - `docs`: the documents making claims about the area the change touches, which `scout-docs` found. The list can be empty.
- **`validate.json`** says how to prove it. For each criterion:
  - its wording copied from the issue, which can change later;
  - its `category` from `TESTING.md`, or `uncategorized` when none fits;
  - the validation path to run, the evidence it must produce, and the first test to write.
- **`RATIONALE.md`** says why, and only ever grows: the designs considered, each advisor's view and whether it was adopted, what was rejected, the rulings, and the risks. Only agents redoing the design read it.

No agent opens the whole spec. The script hands each one its slice, and project rules reach agents through `.claude/rules/` and `AGENTS.md`:

| Agent                                      | Gets                                                                 |
| ------------------------------------------ | -------------------------------------------------------------------- |
| `coder`                                    | `shared`, its task, and its criteria, plus the problem if it's a fix |
| `qa`                                       | The same, plus the git history                                       |
| `writer`, for documentation                | The `docs` list and the code                                         |
| `validator`                                | `validate.json` and `TESTING.md`                                     |
| `lens-docs`                                | One listed document and the code                                     |
| `judge`, on one problem                    | The problem, the diff, and the relevant task and criterion           |
| Gateway `judge`                            | `build.json`, `validate.json`, and the round's evidence and diff     |
| Advisors and `writer`, on a `spec` problem | All three files                                                      |

### 4. Build and validate

This stage is two nested loops. The inner loop makes one change correct, and only `coder` and `qa` take part. The outer loop checks the whole story against the running app and the review, and decides what happens next. Each outer round goes through these steps.

1. **Build.** Each change runs its own inner loop, the [test-first cycle](#test-first).
   - In the first round, each task in `build.json` is one change. The script works out dependency waves from `dependsOn`. Tasks in a wave whose files don't overlap run in parallel, and the others run one after another. When a criterion's category validates with a flow, the flow is the test, for example a Playwright spec or a Maestro file.
   - In later rounds, each open `code` or `test` problem is one change, and an open `spec` problem first goes to the advisors and `writer`, who revise the spec. `pusher` commits the revision, and the tasks it changes run again.
   - `coder` has no way to halt. It records anything it is unsure of as a decision.
   - An inner loop that runs out of tries doesn't stop the round. Its problem stays open as a `blocker`.
   - After the inner loops, `writer` updates the documents on the `docs` list, so they describe the code as built. It runs in every round that changed code or has an open `docs` problem, and when the list isn't empty. `pusher` commits its work. Documentation needs no failing test, so it stays out of the inner loop.
2. **Validate.** `checks` runs the `Checks` commands from `TESTING.md` and returns the exit codes and failing lines. `validator` then follows each criterion's category path, as defined below. In the first round it runs every criterion. In later rounds it runs the criteria whose code paths changed, or every criterion when a fix touched boot or config files. It runs even when `checks` fails. Boot is its first step, so a broken build fails there and is judged like any other problem. One `lens-docs` per listed document checks that its claims are true against the code.
3. **Judge.** One `judge` (opus) per problem, all in parallel, gives one verdict: `confirmed` with a severity and a [kind](../DESIGN.md#severity-and-problem-kinds), `dismissed` with a reason, or `unverified`. The judge reads the evidence and the diff:
   - It never downgrades a confirmed failure.
   - It flags changes that no criterion calls for, such as unrelated refactors or disabled tests.
   - A `pass` without evidence becomes `cannot-verify`. It isn't a `fail`, because nothing shows that the code is wrong.
   - A finding that conflicts with the spec's design is kind `spec`, which brings in the advisors. `coder` doesn't improvise around a wrong spec.
4. **Gateway.** One `judge` (opus) reads every `qa` verdict, the validator's evidence, the `lens-docs` results, and the round's diff, and decides whether anything was missed. Whatever it flags is judged like any other problem and becomes open for the next round. A document the change affects that isn't on the `docs` list is added to it.
5. **Push.** `pusher` commits and pushes the round's work, even when something is still flagged, so every attempt stays in git history.
   - If no PR exists, `pusher` opens one as a draft once no `blocker` or `major` is open, or on the last round either way. Opening it fires the review. `pusher` then attaches it to the issue.
   - If a PR exists, `pusher` updates its description and comments `@review`.
   - Anything still flagged goes under **Why this is a draft**, with its evidence and what was tried.
6. **Review.** This step runs only when a PR exists. The review is the one `docs/FORGE.md` declares: the Claude Code Review GitHub Action, which runs when the PR opens and again whenever a PR comment is `@review`. The workflow doesn't review the code itself.
   - `watcher` waits for the review run to finish and returns its findings.
   - One `judge` per finding rules on it as in step 3. Each brief includes the earlier rulings for the same fingerprint (file, symbol, category), so a dismissed finding stays dismissed.
   - The judge filters out pre-existing issues, issues a linter would catch, and style. It runs a reproduction when it can, rather than only reading the code.
7. **Gate.** This step is code, not an agent. It waits for every judge.
   - The delivery is clean when a PR exists, its review has run on the latest push, no `blocker` or `major` is open, no criterion is `fail`, and `TESTING.md` lets every `cannot-verify` and `uncategorized` criterion pass as `ready`.
   - If only such a criterion stands in the way, the loop ends and the PR stays a draft. No code could change that result, so no further round starts.
   - Otherwise the next round starts, unless a limit below has been reached. Each open `blocker` or `major` goes where its kind says.
   - Nothing else is sent to a producer.

The outer loop has three limits:

- **Rounds:** the first build, then at most three fix rounds. The review of the last push is still read, judged, and gated, so a last fix that comes back clean marks the PR ready. It starts no further fix.
- **No progress:** the loop ends when the number of open `blocker` and `major` problems doesn't fall over two rounds in a row.
- **Recurrence:** when a problem's fingerprint is confirmed again after a fix attempt, `judge` also gives it a ruling, with the earlier attempts in its brief, and the script applies the fixed action:
  - `fix-differently` starts one more inner loop. It is allowed once; a problem that comes back after that is treated as `escalate`.
  - `accept-as-debt` lists it under **Known debt** and closes it for this PR. Only a `major` can get this ruling.
  - `split-to-issue` files a Linear issue and closes it for this PR. Only a `major` can get this ruling.
  - `escalate` lists it under **Why this is a draft**, and the PR stays a draft.

A `blocker` is therefore either fixed or left open. Anything still open when the loop ends goes under **Why this is a draft**.

Run alone on an existing PR, this loop is `/slopify:review-pr`.

#### Validation

Validation is defined by the target project, not by this workflow. `validator` reads only `TESTING.md` and `validate.json`, runs the setup and boot, and follows each criterion's category path. Drive the app through its accessibility tree first, and use screenshots only when there's no other way. Evidence goes under `.tmp/evidence/`.

- For each categorized criterion, `validator` returns `pass`, `fail`, or `cannot-verify`, with its evidence.
- An `uncategorized` criterion has no validation path. A project can change in ways its `TESTING.md` doesn't cover yet, such as a web UI added to a mobile project. Its tests from the test-first cycle still run, but nothing validates it in the app. Its entry in the PR suggests a category to add to `TESTING.md`.
- A `cannot-verify` result is never retried and never goes to `coder`. Examples: an update broke the simulator, a credential expired, the check hits a blind spot `TESTING.md` declares, or a pass has missing or unusable proof.
- Neither one stops the run. `TESTING.md` decides whether each keeps the PR a draft: the criterion's category for a `cannot-verify` result, and the **Uncategorized** setting for an `uncategorized` criterion. Each states `ready` or `draft`, and anything else means `draft`. With `draft`, the criterion goes under **Why this is a draft**. With `ready`, it goes under **Not validated**.

Validation can also be run on its own with `/slopify:validate <branch or PR>`. It is the same step, shared code, not a child workflow.

#### The PR description

The description is rendered from the run state and updated after every round. It has these sections:

- the issue link
- **Why this is a draft**, only while the PR is one: each thing keeping it a draft, with its evidence and what was tried:
  - an open `blocker` or `major`, with any ruling `judge` gave it;
  - a `cannot-verify` or `uncategorized` criterion that `TESTING.md` sets to `draft`.
- **Needs confirmation**, near the top so that a ready PR shows what it assumed
- the criteria table, one row per criterion:
  - the criterion;
  - its category, or `uncategorized`;
  - the validation path that ran, and its commands, flows, or tests;
  - the result;
  - links to the evidence.
- **Assumptions**
- **Unverified findings**: review findings `judge` couldn't confirm or dismiss. They don't block.
- **Not validated**: `cannot-verify` and `uncategorized` criteria that `TESTING.md` sets to `ready`
- **Known debt**
- **Suggestions**
- a summary of test changes

#### How the run exits

- **Clean:** `pusher` marks the PR ready, moves the issue to In Review, and comments with the evidence and assumptions.
- **Not clean:** the PR stays a draft, and **Why this is a draft** lists everything keeping it one. The issue gets a comment with the specific questions. The run returns `draft` with the decision ids. A rerun with `answers` resumes at the next outer round.

## Test first

This is the inner loop. Every code change runs through it, from the first build to each later fix, whichever check found the problem. The tests are fixed before the code, and the code is validated against tests it couldn't touch. It gets at most three tries.

1. **Test.** A `coder` dispatch writes a new test or changes an existing one, so that the test states the required behavior: its task's criteria in the first build, or one problem in a later round.
   - It changes no production code.
   - The test must fail on the current code. The dispatch returns the test paths and the failing output.
   - `pusher` commits the test in a commit of its own. The commit stays local until the push.
   - When the behavior can't be expressed as a test, the dispatch returns `noTest` with a reason instead. An example is a CI setting. `qa` then judges the reason.
2. **Fix.** A fresh `coder` dispatch makes the test pass.
   - The paths in the test commit are protected, and it changes none of them.
   - If it finds the test wrong, it returns `testProblem` with the reason and stops. The cycle then restarts at step 1 with that reason, which counts as one try.
   - `pusher` commits the fix.
3. **Validate.** A fresh `qa` checks the change and its history:
   - The test fails at the test commit and passes at HEAD.
   - Nothing after the test commit touches a protected path. Nothing skips, weakens, or excludes the test, for example by loosening a tolerance, regenerating a snapshot, or changing the test config.
   - The fix delivers the behavior the criterion or problem asks for. It doesn't merely satisfy the test, for example by special-casing the test's input.
   - The change stays within its criterion or problem.

   Any failed check is a `blocker` and goes back to step 2, or to step 1 when the test itself is at fault.

## Halt conditions

These are the only conditions that stop the run:

| #   | Condition                                                                                         | Found at | What the user gets                                                                   |
| --- | ------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------ |
| H1  | The Linear issue can't be read                                                                    | Intake   | `not-started`, no board write                                                        |
| H2  | The issue doesn't have the `Deliverable` label                                                    | Intake   | `not-started`, and an issue comment saying to run `shape`                            |
| H3  | The how phase's loops are exhausted: no design survives, or a `blocker` stays open in the spec    | How      | `blocked`, and an issue comment saying the workflow is broken, with everything tried |
| H4  | The push is denied, or PR creation fails                                                          | Push     | `blocked`; finished work stays committed on the local branch                         |
| H5  | Infrastructure: a stop signal, a required tool denied, or a budget, usage, or agent limit reached | Any      | `blocked`, with the state reported on the issue                                      |

Every other problem is recorded and the run keeps going. Once a PR exists, the worst outcome is a draft that says exactly what is open.

## TESTING.md

`TESTING.md` lives at the root of the target project, which owns it. Its template, which defines its sections, is [`plugins/slopify/skills/bootstrap/resources/TESTING.md`](../../plugins/slopify/skills/bootstrap/resources/TESTING.md). `bootstrap` creates and audits it.

A flow the validator explores successfully can be saved as a deterministic flow in the project, so later deliveries inherit it. When several deliveries mark criteria `uncategorized` the same way, the run report suggests a new category.

## Authority

Invoking `deliver-story` authorizes the following:

- the story branch and worktree;
- attributable commits, including the spec folder;
- a push of the story branch;
- opening and updating the story's PR, as a draft or ready;
- the issue's status moves the board declares for delivery start and for review;
- one comment on the issue when the run ends or halts;
- filing a Linear issue for each `pre-existing` finding, and for each finding the judge splits off with `split-to-issue`.

It never merges, approves, or force-pushes.
