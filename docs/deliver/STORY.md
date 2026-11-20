# Deliver story

How `deliver-story` takes a card to a pull request (PR) whose review is clean. It is built for non-simple stories, and it spends the most on the how and on validation. [`TRIVIAL.md`](TRIVIAL.md) and [`BUGFIX.md`](BUGFIX.md) cover the short flow. It follows the shared rules in [`DESIGN.md`](../DESIGN.md): the severity scale, recorded decisions, bounded loops, and run outcomes.

## Invariants

1. Work starts from a card that `shape` marked `Deliverable`. The issue holds the why and the what, never the how; [`CARDS.md`](CARDS.md) lists what it must hold.
2. The spec holds the how. Agents write it and agents read it. Humans validate the issue and review the PR.
3. Work ends in a PR.
4. The PR is reviewed. It is marked ready only when the review is clean.
5. The change is validated by running the app, as the target project's `TESTING.md` describes. The workflow knows no platform, so a web app is driven in a browser and an iOS app in the simulator because `TESTING.md` says so.

A delivery ends in a PR unless one of the halt conditions below holds. Anything still open goes into the PR description, which has four parts, in this order: **What changes**, **Needs you**, **Why trust it**, and **Not done**. `pusher` converts the PR to a draft. A human merges.

## Flow

```text
 /slopify:deliver-story SPR-123
 │
 ▼
 1 INTAKE ─────────── scout-card (haiku) reads the issue and its labels       ⛔ H1 H2
 │                    scout-checkpoint (haiku) reads the run state                          ⛔ H7
 ▼
 2 WORKSPACE ──────── pusher (sonnet) creates and prepares the worktree, starts the issue
 ▼
 3 HOW ────────────── GROUND     scout-code, scout-tests, scout-docs, scout-history (haiku), library-reader
 │   ▲  ≤2 tries      DESIGN     designer × 3 (opus), independent: smallest fit, best structure, most robust
 │   │                           scout-upstream-docs, scout-known-issues per new dependency (sonnet)
 │   │                ADVISE     architecture, performance, risk, security, testability (opus)
 │   │                           each compares all 3 designs
 │   └── none viable  DECIDE     judge (opus) picks one and grafts the best of the others  ⛔ H3
 │                    SPEC       writer-spec (opus) writes the spec folder → pusher commits it
 │   ▲  ≤3 revisions  CHALLENGE  check-claim × N, check-criterion × N (haiku),
 │   │                           lens-scope, lens-consistency (sonnet), lens-altitude (haiku)
 │   │                           the 6 advisors, fresh, try to break the spec: blocker or major only
 │   │                           later rounds: only failed or changed checks; an advisor checks the
 │   │                           revision only for its own findings; a criteria conflict → a decision
 │   └── problems →              judge × 1 (opus) rules on the checks' findings → writer-spec revises  ⛔ H3
 ▼
 4 BUILD AND VALIDATE  outer loop: the first build, then ≤3 fix rounds
 │
 │  ┌─► BUILD ──────── one inner loop per task, in dependency waves
 │  │                  ┌───────────────────────────────────────────────┐
 │  │                  │ INNER LOOP  ≤3 tries                          │
 │  │                  │ coder (opus) writes a failing test → commit   │
 │  │                  │ coder (opus) makes it pass → commit           │
 │  │                  │ qa (sonnet) checks the change and its history │
 │  │                  │ simplifier (opus) finds code it doesn't need  │
 │  │                  │   fail → back to coder                        │
 │  │                  └───────────────────────────────────────────────┘
 │  │                  then writer-docs (sonnet) updates the listed docs against that code → commit
 │  │   VALIDATE ───── checks (haiku) runs the TESTING.md checks
 │  │                  validator (sonnet) follows each criterion's category path
 │  │                  lens-docs (haiku) × N, one per listed doc: are the claims this branch touched true?
 │  │   JUDGE ──────── judge × 1 (opus) rules on every problem: severity and kind
 │  │                  no proof → cannot-verify
 │  │   GATEWAY ────── judge (opus): anything missed? a doc not on the list → added
 │  │   DESCRIBE ───── PR exists or opens: writer-pr (sonnet) writes the description whole,
 │  │                  lens-pr (haiku) checks it                                          ⛔ H6
 │  │   PUSH ───────── pusher pushes (even if something is still flagged)                  ⛔ H4
 │  │                  no PR yet: opens it ready once nothing blocks, or on the last round
 │  │                  PR exists: requests the review
 │  │   REVIEW ─────── only if a PR exists: watcher (haiku) reads the findings
 │  │                  judge × 1 (opus) rules on every finding: severity and kind
 │  │   GATE (code) ── clean → exit
 │  └── code or test → inner loop     docs → writer-docs     spec → advisors and writer-spec
 ▼
 clean → PR ready, issue In Review            not clean → PR turns draft, issue gets questions
```

## Stages

Every delivery runs these stages in this order. Each stage gives its continue-or-stop rule. The script applies it to the agents' typed output, and no prompt decides it.

### 1. Intake

- `scout-card` reads the issue and its comments, labels, and relations.
- `scout-checkpoint` reads the ledger, the spec folder, and the PR, so that a rerun skips the stages that are complete.

The script reads the `Deliverable` label from what `scout-card` returned. `shape` adds that label, so no agent checks the issue. An issue without it stops the run with a comment that says to run `shape`, which accepts an existing card.

### 2. Workspace

`pusher` creates or recovers the story worktree and branch, prepares it as `docs/FORGE.md`'s "Worktree preparation" line declares, and moves the issue to its started status. A recovered worktree is prepared again, since an earlier run may have stopped before preparing it. Work in the worktree starts only after that, because its first commit runs the project's hooks; a failed preparation stops the run.

### 3. How

The issue says why and what. This stage decides how, and it deserves more time and tokens than anything else in the workflow. It never stops on a choice about how: those choices are ours, so they are made and recorded. Each step feeds the next.

1. **Ground.** The scouts and `library-reader` return file and line pointers, existing symbols, tests, documentation claims, history, and earlier research.
2. **Design.** Three independent `designer` dispatches each produce a full approach, and none sees the others. The script gives each a fixed stance: the smallest change that fits the existing patterns, the best long-term structure, and the most robust under failure. Each reads the project's full architecture and design documents, and marks what it reuses and what it creates. Each design lists the outside libraries and services it relies on, never the project's own code or tools, and marks what is new: a dependency the project doesn't use yet, or a part of it the project doesn't use yet. `scout-upstream-docs` and `scout-known-issues` then run once for each new dependency, by name, whichever designs name it.
3. **Advise.** Six advisors each compare all three designs from one angle: `advisor-architecture`, `advisor-performance`, `advisor-risk`, `advisor-security`, `advisor-testability`, and `advisor-simplify`. `advisor-testability` asks whether each criterion can be proved through its `TESTING.md` validation path. `advisor-simplify` asks only what each design could remove, merge, or narrow and still deliver, since every other angle asks what is missing. Each claim cites the code, and each concern says what would fix it.
4. **Decide.** One `judge` picks a design, grafts in the best of the others, and records what was rejected and why. If it rules no design viable, Design runs again with its reasons, at most once more. If none survives that, the run halts.
5. **Spec.** `writer-spec` writes the [spec folder](#the-spec), and `pusher` commits it before any code exists.
6. **Challenge.** At most three revisions, each checked by the next round:
   - One `check-claim` per file, symbol, or API claim checks that it is true of the code.
   - One `check-criterion` per criterion checks that its category matches what `TESTING.md` says that category covers, and that the category's path can check it.
   - `lens-scope` checks that the spec adds and drops no scope. `lens-consistency` checks it against the project's rules and documents. `lens-altitude` (haiku) checks that the spec stops above the code and keeps to its size budget: no constant, pattern, string, or step-by-step logic inside one task, no task over 300 words, and `shared` within 600.
   - How a task is implemented inside its own files is its coder's decision, so a finding that only asks for more precision there is out of scope for every advisor, lens, and the judge, and a revision fixes problems by removing detail rather than adding it.
   - The same six advisors, in fresh dispatches, try to break the finished spec. Each reports only a `blocker` or a `major`, with its evidence, because nothing acts on a minor problem. Their findings need no judge.
   - One `judge` rules on all the checks' and lenses' findings of the round together. It merges findings that report the same problem, leaves out what an advisor already reported, and returns each problem that holds as a `blocker` or a `major`.
   - Each problem is of kind `spec`, which a revision can fix, or kind `decision`, when the issue's own criteria conflict or can be read more than one way, so only a person can settle what they mean.
   - `writer-spec` revises for every `spec` problem, and records each one and its reason in `RATIONALE.md`. It never revises around a `decision` problem: it picks the most reasonable reading and records it as a decision with `affectsAcceptance` set, which reaches the person under **Needs you**. Advisors and the judge don't report a recorded decision again, and a round whose only problems are decisions ends the challenge.
   - After a revision, the next round checks the revision. The code doesn't change during the challenge, so a claim or criterion that held and kept its wording isn't checked again. Only the advisors whose findings the revision was for check it, each for its own findings: they report each one the revision didn't fix and each `blocker` or `major` the revision introduced. The other advisors aren't dispatched again, because the checks, lenses, and judge cover every round.

   A `major` still open after the last revision's round is recorded and the run continues. A `blocker` still open halts the run.

#### The spec

Each story gets one folder, `docs/specs/<lowercase issue id>-<slug>/`. Nothing in it is written for a human to read or approve. It stays in the repository as context for when a deployed feature breaks, and humans compact or remove it when it's time. `git log` on a file gives the issue id, and the id gives the folder.

- **`build.json`** says what to build:
  - `shared`: the constraints and interfaces every task of this story must follow. It never repeats a project rule.
  - `decisions`: each choice the spec made, with `affectsAcceptance` set when it changes behavior a criterion describes. A coder has no choices left to make.
  - `tasks`: for each task, its `id`, `dependsOn`, `files`, `criteria`, what to do, what to reuse, and what to create. Anything only one task needs goes in that task.
  - `docs`: the documents making claims about the area the change touches, which `scout-docs` found. The list can be empty.
- **`validate.json`** says how to prove it. For each criterion:
  - its wording copied from the issue, which can change later;
  - its `category` from `TESTING.md`, or `uncategorized` when none fits;
  - the validation path to run, the evidence it must produce, and the first test to write.
- **`RATIONALE.md`** says why the spec is what it is now: the designs considered and why the chosen one won, each advisor's view and whether it was adopted, what was rejected, the rulings in force, and the open risks. Each revision updates it and removes what the revision made untrue; git keeps the earlier versions. Only agents redoing the design read it.

No agent opens the whole spec. The script hands each one its slice, and project rules reach agents through `.claude/rules/` and `AGENTS.md`:

| Agent                                           | Gets                                                                 |
| ----------------------------------------------- | -------------------------------------------------------------------- |
| `coder`                                         | `shared`, its task, and its criteria, plus the problem if it's a fix |
| `qa`                                            | The same, plus the git history                                       |
| `writer-docs`                                   | The `docs` list and the code                                         |
| `validator`                                     | `validate.json` and `TESTING.md`                                     |
| `lens-docs`                                     | One listed document and the code                                     |
| `judge`, on one problem                         | The problem, the diff, and the relevant task and criterion           |
| Gateway `judge`                                 | `build.json`, `validate.json`, and the round's evidence and diff     |
| Advisors and `writer-spec`, on a `spec` problem | All three files                                                      |

### 4. Build and validate

This stage is two nested loops. The inner loop makes one change correct, and only `coder` and `qa` take part. The outer loop checks the whole story against the running app and the review, and decides what happens next. Each outer round goes through these steps.

1. **Build.** Each change runs its own inner loop, the [test-first cycle](#test-first).
   - In the first round, each task in `build.json` is one change. The script works out dependency waves from `dependsOn`. Tasks in a wave whose files don't overlap run in parallel, and the others run one after another. Every other change, such as a fix for a problem, runs alone after the tasks, because it can't know beforehand where its test will go, and two coders in one worktree would build on each other's unfinished work. When a criterion's category validates with a flow, the flow is the test, for example a Playwright spec or a Maestro file.
   - In later rounds, each open `code` or `test` problem is one change, and an open `spec` problem first goes to the advisors and `writer-spec`, who revise the spec. `pusher` commits the revision, and the tasks it affects run again: each task a problem names by id, file, or criterion, each task that is new or differs from the previous spec (in itself or in its criteria' validation entries), and every task when the shared constraints changed. A task whose change already passed `simplifier` before the revision is built, so its test and code are committed: its coder starts from them and changes only what the revised task needs, and its test may guard behavior the code already has. A rebuilt change whose files are already committed leaves nothing for `pusher` to commit; it reports that as `nothing to commit:`, and the script counts the commit as done.
   - `coder` meets what its brief requires, and decides how: structure, names, helpers, and algorithms. `qa` challenges each choice it made with the rest of the change; none reaches the person. A requirement that is unclear or can't be met, or that would change described behavior or an interface another task relies on, comes back as a spec problem, which goes to `writer-spec`.
   - An inner loop that runs out of tries doesn't stop the round. Its problem stays open as a `blocker`.
   - After the inner loops, `writer-docs` updates the documents on the `docs` list, so they describe the code as built. It runs in every round that changed code or has an open `docs` problem, and when the list isn't empty. `pusher` commits its work. Documentation needs no failing test, so it stays out of the inner loop.
2. **Validate.** `checks` runs the `Checks` commands from `TESTING.md` and returns the exit codes and failing lines. `validator` then follows each criterion's category path, as defined below. In the first round it runs every criterion. In later rounds it runs the criteria whose code paths changed, or every criterion when a fix touched boot or config files. It runs even when `checks` fails. Boot is its first step, so a broken build fails there and is judged like any other problem. One `lens-docs` per listed document checks that its claims are true against the code.
3. **Judge.** One `judge` (opus) rules on all the round's problems together, so it reads the issue, the diff, and the earlier rulings once. Each problem still gets its own verdict, because its severity and kind decide where it goes, and problems that report the same thing get the same fingerprint. Each verdict is `confirmed` with a severity and a [kind](../DESIGN.md#severity-and-problem-kinds), `dismissed` with a reason, or `unverified`. The judge reads the evidence and the diff:
   - It never downgrades a confirmed failure.
   - It flags changes that no criterion calls for, such as unrelated refactors or disabled tests.
   - A `pass` without evidence becomes `cannot-verify`. It isn't a `fail`, because nothing shows that the code is wrong.
   - A finding that conflicts with the spec's design is kind `spec`, which brings in the advisors. `coder` doesn't improvise around a wrong spec.
4. **Gateway.** One `judge` (opus) reads every `qa` verdict, the validator's evidence, the `lens-docs` results, and the round's diff, and decides whether anything was missed. Whatever it flags is judged like any other problem and becomes open for the next round. A document the change affects that isn't on the `docs` list is added to it.
5. **Push.** `pusher` commits and pushes the round's work, even when something is still flagged, so every attempt stays in git history.
   - Before each push that opens the PR or updates it, `writer-pr` writes the PR's whole description and `lens-pr` checks it, as [the PR description](#the-pr-description) says. `pusher` posts the body `writer-pr` returned, unchanged.
   - If no PR exists, `pusher` opens one ready for review once no `blocker` or `major` is open, or on the last round either way. Opening it fires the review. It is never opened as a draft, because a review may skip drafts; when a PR is a draft, as after an earlier run, `pusher` marks it ready before firing the next review. `pusher` then attaches it to the issue.
   - If a PR exists, `pusher` updates its description and requests the review as `docs/FORGE.md` declares.
   - Anything still flagged is listed in the description under **Not done**.
6. **Review.** This step runs only when a PR exists. The review is the one `docs/FORGE.md` declares, with the trigger and the status it declares for it. The workflow doesn't review the code itself.
   - `watcher` waits for the review run to finish and returns its findings. A review that ended without reviewing the change, comes back `skipped`; it is not clean, though it has no findings, so the PR becomes a draft.
   - One `judge` rules on all the review's findings as in step 3. Each brief includes the earlier rulings for the same fingerprint (file, symbol, category), so a dismissed finding stays dismissed.
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
  - `accept-as-debt` lists it under **Not done** and closes it for this PR. Only a `major` can get this ruling.
  - `split-to-issue` files a card and closes it for this PR. Only a `major` can get this ruling.
  - `escalate` lists it under **Not done**, and the PR stays a draft.

A `blocker` is therefore either fixed or left open. Anything still open when the loop ends is listed under **Not done**.

#### Validation

Validation is defined by the target project, not by this workflow. `validator` reads only `TESTING.md` and `validate.json`, runs the setup and boot, and follows each criterion's category path. Drive the app through its accessibility tree first, and use screenshots only when there's no other way. Evidence goes under `.tmp/evidence/`.

- For each categorized criterion, `validator` returns `pass`, `fail`, or `cannot-verify`, with its evidence.
- An `uncategorized` criterion has no validation path. A project can change in ways its `TESTING.md` doesn't cover yet, such as a web UI added to a mobile project. Its tests from the test-first cycle still run, but nothing validates it in the app. Its entry in the PR suggests a category to add to `TESTING.md`.
- A `cannot-verify` result is never retried and never goes to `coder`. Examples: an update broke the simulator, a credential expired, the check hits a blind spot `TESTING.md` declares, or a pass has missing or unusable proof.
- Neither one stops the run. `TESTING.md` decides whether each keeps the PR a draft: the criterion's category for a `cannot-verify` result, and the **Uncategorized** setting for an `uncategorized` criterion. Each states `ready` or `draft`, and anything else means `draft`. With `draft`, the criterion is a reason the PR is a draft, listed under **Needs you**. With `ready`, it appears only in the criterion results, not under **Needs you** or **Not done**.

Validation can also be run on its own with `/slopify:validate <branch or PR>`. It is the same step, shared code, not a child workflow.

#### The PR description

The description is written for the person who reviews the PR. `writer-pr` (sonnet) writes it whole, from the card, the diff against the target branch, the ledger, the run's criterion results and open items, the reasons the PR is a draft, and any follow-up cards filed. It runs in every round that opens or updates the PR, and again once the run's end is known, and it rewrites the description from scratch each time. Its format is [`references/pr-description.md`](../../plugins/slopify/references/pr-description.md). It has four level-2 parts, in this order and with no other heading, in at most 4,000 characters:

- **What changes** is always present and opens with the card's outcome, and it holds the spec folder exactly once, on a line `Spec: <folder>` in plain text, the folder relative to the repository root. A rerun does not read the folder from that line: it derives the folder again from the card (its spec path, else its identifier and title), so a changed story title changes the folder.
- **Needs you** is present only when something is in it: each decision the reviewer must make or confirm, each confirmation, such as a decision that changes no criterion, each manual action (an irreversible step the issue didn't explicitly permit, left for a person), and each reason the PR is a draft, such as a `cannot-verify` or `uncategorized` criterion that `TESTING.md` sets to `draft`.
- **Why trust it** is always present, and rests on the criterion results, each line matching a result the run produced.
- **Not done** is present only when something is in it: every open item, each once, including every unfixed finding, an unverified one among them, and each follow-up card filed, with its identifier and link. When `pusher` doesn't confirm the filing, nothing says which follow-ups have a card, so each is listed here as not confirmed filed, and it appears in the card comment and the run's result as an open follow-up. An unfixed finding is listed only here.

It states the change as it stands: no rulings, fingerprints, round counts, what was tried, or agent names. When the content doesn't fit, criteria with the same result and evidence share one **Why trust it** line, and **Needs you** items of one kind may be one line with their count and a link to the committed file that lists them, or else to the card. Validator evidence is never linked. The description never holds an absolute filesystem path (a URL route or a slash command is not one), a `.tmp/` reference, a ledger line, or text shaped like a credential.

`lens-pr` (haiku) checks the description against the format, for readability, and against what its brief gives, never judging whether the run's evidence is strong enough: the headings and their order, the length, process detail, the opening line, the `Spec:` line, each **Why trust it** line against a criterion result, each open item appearing once, and leaks. Code checks the mechanical part of the format first, so the lens runs only on a description that passes it. A problem goes back to `writer-pr` with the previous description, at most three times in a stage, and the revision is checked again. A lens that couldn't judge twice counts as not passed, and no revision follows. Its findings go only to `writer-pr`: they never go to `judge` or count as problems with the change.

`pusher` posts the last description `writer-pr` returned, unchanged, with one exception: a description that breaks a leak rule is never posted. The latest description without a leak is posted instead, or none: a PR opens with an empty description, and an existing PR keeps its current one. When the revisions run out, the last description is posted and the PR ends a draft.

Only the final description decides readiness. A clean run whose final description didn't pass its check ends a draft, and the reason, "The PR description did not pass its check.", appears in the card comment and the run's result, not in the description. If `writer-pr` never returns a description, the run halts (H6).

Each `pusher` dispatch that writes the ledger also appends the progress entries kept since the last write: a round's findings, each ruling with its reason, what was tried, and what changed. They stay in the ledger. `writer-pr` reads them to see what is still open on a rerun, and no progress entry reaches a PR, a comment, or a card. They are never read as checkpoints.

A progress entry is a record, never an operation. If `pusher` reports one as unmet, or out of order, and nothing else in the dispatch is unmet, the workflow counts the dispatch as done, keeps no entry pending for it, and does not halt at the push (H4). An unmet operation of any other kind still does.

#### How the run exits

- **Clean:** `pusher` marks the PR ready, moves the issue to In Review, and comments with each item that needs a person.
- **Not clean:** `pusher` converts the PR to a draft, and the description's **Needs you** and **Not done** list everything keeping it one. The issue gets a comment with each Needs-you item, each follow-up card not confirmed filed, and the text of each reason the PR is a draft; the comment leaves out the Not-done items. The run returns `draft` with the decision ids. A rerun with `answers` resumes at the next outer round.

## Test first

This is the inner loop. Every code change runs through it, from the first build to each later fix, whichever check found the problem. The tests are fixed before the code, and the code is validated against tests it couldn't touch. It gets at most three tries.

1. **Test.** A `coder` dispatch writes a new test or changes an existing one, so that the test states the required behavior: its task's criteria in the first build, or one problem in a later round.
   - The test must fail on the current code on its merit: an assertion fails, never a compile, type, or import error. When it names code that doesn't exist yet, the dispatch adds the smallest stub that lets it compile, and changes no other production code. In a later round's fix, a task rebuilt after a spec revision, or a rewrite after a failed check, the test may instead guard behavior the code already has, and then the dispatch returns no failing output.
   - It ends by running the `Checks` commands `TESTING.md` declares, which pass except for the new test's assertions, so the commit hook accepts the test. The dispatch returns the test paths, the stubs, and that output.
   - `pusher` commits the test and its stubs in a commit of their own. Only the test paths are protected, so the fix can replace the stubs. The commit stays local until the push.
   - When the behavior can't be expressed as a test, the dispatch returns `noTest` with a reason instead. An example is a CI setting. `qa` then judges the reason.
2. **Fix.** A fresh `coder` dispatch makes the test pass.
   - The paths in the test commit are protected, and it changes none of them.
   - If it finds the test wrong, it returns `testProblem` with the reason and stops. The cycle then restarts at step 1 with that reason, which counts as one try.
   - `pusher` commits the fix.
3. **Validate.** A fresh `qa` checks the change and its history:
   - The test fails at the test commit on one of its assertions, not on a compile, type, or import error, and passes at HEAD.
   - Nothing after the test commit touches a protected path. Nothing skips, weakens, or excludes the test, for example by loosening a tolerance, regenerating a snapshot, or changing the test config.
   - The fix delivers the behavior the criterion or problem asks for. It doesn't merely satisfy the test, for example by special-casing the test's input.
   - The change stays within its criterion or problem.

   Any failed check is a `blocker` and goes back to step 2, or to step 1 when the test itself is at fault.

   A problem the `judge` rules `test`-kind is in the tests, such as missing coverage, so its test may already pass on the current code. For it, `qa` checks instead that the test fails when the behavior it states is broken. A fix round's test, a rebuilt task's test, or a test rewritten after a failed check, can also guard behavior the code already has. No code fails such a test, so the `coder` may write it passing and return no failing output, and `qa` proves it the same way.

4. **Simplify.** Once `qa` passes, a fresh `simplifier` (opus) reads the change's diff for code it adds but doesn't need: a helper or file used once, an option nothing exercises, handling for a case that can't happen, or a new mechanism where an existing one does the job. Each finding names what to remove, merge, or narrow. A finding in the change's test goes back to step 1, since its test paths are protected from the `coder`, and any other goes back to step 2. When a `coder` then says the trimmed test needs what was removed, one `judge` rules between them, and later tries keep to that ruling instead of trading the test back and forth. `qa` judges whether the change is right; `simplifier` judges only whether it is bigger than it needs to be.

## Halt conditions

These are the only conditions that stop the run:

| #   | Condition                                                                                         | Found at | What the user gets                                                                   |
| --- | ------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------ |
| H1  | The card can't be read, or `answers` isn't a map or holds an object or a list                     | Intake   | `not-started`, no board write                                                        |
| H2  | The issue doesn't have the `Deliverable` label                                                    | Intake   | `not-started`, and an issue comment saying to run `shape`                            |
| H3  | The how phase's loops are exhausted: no design survives, or a `blocker` stays open in the spec    | How      | `blocked`, and an issue comment saying the workflow is broken, with everything tried |
| H4  | The push is denied, or PR creation fails                                                          | Push     | `blocked`; finished work stays committed on the local branch                         |
| H5  | Infrastructure: a stop signal, a required tool denied, or a budget, usage, or agent limit reached | Any      | `blocked`, with the state reported on the issue                                      |
| H6  | `writer-pr` returns no description in any attempt of a stage                                      | Push     | `blocked`; finished work stays committed on the local branch                         |
| H7  | On a rerun, a checkpoint item the scout returned for a ledger key isn't a ledger line             | Intake   | `blocked`, naming the key                                                            |

Every other problem is recorded and the run keeps going. Once a PR exists, the worst outcome is a draft that says exactly what is open, except when H4, H5, H6, or H7 holds.

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
- filing one card that lists every `pre-existing` finding, which a person can split, and one card for each finding the judge splits off with `split-to-issue`.

It never merges, approves, or force-pushes.
