# Design

How the plugins are built, within the principles in [`.claude/rules/architecture.md`](../.claude/rules/architecture.md). When the code changes a decision below, update it here in the same change. The delivery process is in [`deliver/`](deliver/STORY.md).

## Workflows and skills

- A multi-step process is a workflow under `plugins/<plugin>/workflows/`. Examples are shaping a story, delivering a change, and researching. A task that fits in one session turn is a skill, for example setup, answering from the library, or linting.
- A workflow or skill runs only when the user invokes it; skills set `disable-model-invocation`. The invocation is the user's request, and each workflow states what that request authorizes.
- The script holds all control flow. Whether to continue, retry, or stop is decided by a predicate over typed agent output, never by a prompt. An agent reports what it found and doesn't choose what runs next, and its brief carries no loop state, such as which round this is.
- A step used by more than one workflow, such as validation or the review loop, is shared library code. It can also be exposed as a workflow of its own. A workflow doesn't start another workflow that would itself need a child.

## Source of truth

- The codebase is the only source of truth for how the system behaves now. Cards, specs, ledgers, and findings documents record intent or what was known when they were written. None is kept current, and no workflow trusts one for the state of the code.
- Every workflow works out current behavior from the code, through its scouts, when it starts work. So a card holds only the why and the what: no code locations, and no description of how the code behaves today.

## Sources and build

- A workflow's source is `src/<plugin>/workflows/<name>.ts`. It exports a pure-literal `meta` and a default `run()`. Code that several workflows share is an ordinary module under `src/<plugin>/lib/`.
- `scripts/build.ts` uses esbuild to bundle each source into `plugins/<plugin>/workflows/<name>.js`, which is the file the runtime runs. The built files are committed.
- A skill that needs a deterministic program, such as `workflow-investigate`'s run statistics, has a Node script whose source is `src/<plugin>/skills/<skill>/main.ts`. The same build bundles it into `plugins/<plugin>/skills/<skill>/scripts/<skill>.js`, the file the skill runs. Its code is linted, type-checked, and tested like a workflow's.
- The runtime's globals are typed in `src/runtime.d.ts`. Each agent schema is declared `as const`, and its result type is inferred from it. So the code that reads an agent's output is checked against the schema the agent must satisfy.

## Agent roles and tiers

- **Scouts and checks** run on haiku. Each has one small task whose answer can be checked: gather one kind of evidence, or test one property. They fan out widely, and each returns evidence with its claim. `lens-consistency` runs on sonnet, because it reads the whole spec against the rules and the code it touches.
- **`designer`** runs on opus. It produces one full approach from a stance the script gives it, independently of the other designers.
- **`judge`** runs on opus. Most dispatches rule on one item, such as one review finding or one validation verdict. In a spec's challenge, one dispatch rules on all the cheap checks' findings of a round together, merging duplicates. A gateway dispatch checks a whole round before it is pushed. It confirms, overturns, or dismisses what a cheaper agent or the forge's reviewer reported, against the evidence and the rubric in its brief. It never downgrades a confirmed defect, and it never accepts a pass that lacks evidence.
- **Producers** write the work: most change files, and one returns its work instead. `writer-spec` for specs, `writer-docs` for documents, `writer-findings` for a spike's plan and findings, `writer-card` for stories, `writer-pr` for a delivery's PR description, and `coder` for code and tests. `writer-docs` and `writer-card` run on sonnet, the rest on opus. `writer-pr` runs on opus because nothing judges its prose after it: only a mechanical check of headings, length, and leaks. `writer-pr` changes no file: it returns the description as its result, and the script hands it to `pusher` unchanged. A spec translates the issue's product requirements into technical requirements and interfaces, and stops above the code. `coder` decides how to meet them inside its task's files, and returns the choices it made as assumptions, which `qa` challenges with the rest of the change, so no person reviews them; a question about what to build goes back as a spec problem. Code is written test first: one dispatch commits a failing test, and a separate dispatch makes it pass without changing any committed test. `qa` checks the history for that.
- **`qa`** runs on sonnet. It validates one `coder` change against what that change was meant to do, for example one fix against its finding.
- **`simplifier`** runs on opus once `qa` passes, and reports code a `coder` change adds but doesn't need. Every other reviewer asks what is missing or wrong, so refinement only adds; `simplifier` asks only what could go, and each finding goes to whoever can act on it: one in the change's test to the test's writer, any other to the coder. A `judge` rules once when the coder asks to put back what it trimmed from a test.
- **`validator`** runs on sonnet. It drives the running app as the project's `TESTING.md` describes, and returns per-criterion verdicts with evidence.
- **Operations agents** act on the world outside the files. `pusher` performs every write the declarations bind. It changes no produced file: when a commit hook rejects a commit, it reports the hook's output, the producer of those files fixes exactly that, and the commit is sent again, at most three times. In the delivery loop, a commit the hook still rejects doesn't stop the run: it becomes an open blocker for the next round, and the next commit carries its paths. `watcher` waits on an external event.
- **Advisors** give one view each and don't decide. In `shape`, they run on sonnet and judge the why and the what. In delivery, they run on opus and do the heavy lifting on the how: they compare the designs, then try to break the finished spec. When they attack the spec, or check a revision of it, they report only a `blocker` or a `major`, and their findings go to `writer-spec` without a judge, because a judge on the same tier adds little.
- A workflow passes each dispatch the schema its output must follow. An agent's model and effort come from its frontmatter, and a workflow never overrides them.

## Severity and problem kinds

`judge` gives every problem from every stage a kind, which says what is wrong. A defect in the change also gets a severity, which says how bad it is. Only a problem `judge` confirms counts. `judge` doesn't choose what happens next: the tables below are fixed in the script, which maps each kind to its next step.

| Severity       | Meaning                                                                                                                                                      | Blocks ready | Gets fixed               |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ | ------------------------ |
| `blocker`      | Any of: a criterion fails; the build or tests are broken; data is lost or corrupted; there is a security hole; tests were weakened without a recorded reason | yes          | yes                      |
| `major`        | A confirmed correctness bug on a reachable path in changed code, an error swallowed on a path the user sees, or documentation the change made untrue         | yes          | yes                      |
| `minor`        | Real but low impact                                                                                                                                          | no           | when a round runs anyway |
| `nit`          | Style, naming, readability                                                                                                                                   | no           | no                       |
| `pre-existing` | A defect the change didn't introduce                                                                                                                         | no           | no                       |

What counts as `blocker` or `major` depends on what the PR changes. The rows above are the definitions for code, kept in `plugins/slopify/references/severity-code.md`. A research run rates its library pages by `severity-research.md`, and a spike its findings by `severity-spike.md`: there, a claim its cited source doesn't support, a claim credited to the wrong source, or a broken citation is `major`. The judge's brief names the reference, so the agent that checks a document and the judge that rates its problems use the same standard. `minor`, `nit`, and `pre-existing` mean the same in every flow, and a problem is rated by what it is, never softened by wording elsewhere.

Minor problems and nits go under the PR description's **Not done** part, and the run reports a ready PR with such open items as having no blocking findings, not as clean. A minor problem never starts a fix round, but a round that runs for a blocker or a major also applies the minor problems its writer can fix: every one in a document, and a `docs` problem in code. An applied problem leaves **Not done**. A pre-existing problem goes on one new card with the run's other pre-existing problems, which a person can split.

Each confirmed `blocker` or `major` has one kind:

| Kind   | The problem                                          | Next step                                                                                                                                                                                       |
| ------ | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `code` | The behavior is wrong                                | `coder` and `qa`, from a failing test that shows the problem                                                                                                                                    |
| `test` | The behavior is right, but the test or flow is wrong | `coder` and `qa`, starting by correcting the test                                                                                                                                               |
| `docs` | Documentation is untrue or missing                   | `writer-docs`, with no test                                                                                                                                                                     |
| `spec` | The spec is wrong, so building it can't work         | The advisors and `writer-spec` revise the spec, then the tasks the revision affects run again: those a problem names, those new or changed, and all of them when the shared constraints changed |

Two kinds of problem aren't defects in the change. They have no severity, and no producer sees them:

| Kind            | The problem                                                                                                        | Next step                                 |
| --------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| `cannot-verify` | A tool, simulator, or credential stopped working, the check hits a blind spot, or the proof is missing or unusable | Listed in the PR, as `TESTING.md` decides |
| `decision`      | Only a person can settle what the criterion should mean                                                            | Listed in the PR's Needs you part         |

Two statuses sit beside the scale. A finding is `unverified` when the judge couldn't check it. A check is `cannot-verify` when the environment can't run it or its proof can't be produced. Neither goes to a producer, and both are listed in the PR description: a `cannot-verify` check that keeps the PR a draft under **Needs you**, an `unverified` finding under **Not done**.

An `unverified` finding doesn't block and is listed under **Not done**. Whether a `cannot-verify` criterion or an `uncategorized` criterion keeps the PR a draft is decided only by the target project's `TESTING.md`. Each category states `ready` or `draft`, and so does `uncategorized`. Anything else, including no statement at all, means `draft`.

## Decisions

- An agent that designs or writes a spec, and would ask a question, instead picks the most reasonable option, cites what grounds the choice, and continues. Each choice becomes a decision with these fields: `id`, `question`, `choice`, `rationale`, `reversible`, and `affectsAcceptance`.
- A decision that changes behavior a criterion describes is listed under **Needs you** in the PR and in the issue comment. It doesn't stop the run or keep the PR a draft. The human confirms it when reviewing the PR, and a wrong choice is corrected by a rerun with `answers`.
- An irreversible change, such as a migration on shared data, deleting a public API, or changing production config, is built only when the card or prompt explicitly permits it. Otherwise only its reversible part is built, and the rest goes under **Needs you** in the PR as a manual action for a person to do. In a spec, each decision's `reversible` and `permission` fields record this, and the script sends an irreversible decision with no permission back to `writer-spec`.
- Producers have no field that halts the run. Only the halt conditions a workflow lists stop it.

## Loops and results

- Every loop has a round cap and stops early on no progress. No progress means the same set of failures, or the same count of open blocking findings, two rounds in a row. A recurring fingerprint gets a typed outcome from `judge` instead of another identical attempt.
- When a loop ends without passing, its open items are recorded and the run continues to the next stage. A loop never ends the run.
- A delivery run ends with one of four statuses:
  - `ready`: the PR exists and its review is clean.
  - `draft`: the PR exists, and its description lists what is open.
  - `blocked`: one of the workflow's halt conditions held.
  - `not-started`: the issue couldn't be read, a story isn't marked deliverable, a card for any other delivery lists open questions, `answers` was given as something other than a map, or an answer isn't plain text.
- A `blocked` or `draft` result names what it needs by id, along with the stages completed and how to rerun.
- The issue is the acceptance source. A workflow may clarify a criterion in the spec, keeping the original wording beside the clarification. It never rewrites the issue.

## State and reruns

- A workflow keeps no state between runs. It learns where a run stands from its durable checkpoints:
  - the commits on the story branch;
  - the PR and its description, which names a story's spec folder on its `Spec: <folder>` line;
  - the committed spec folder, and `.tmp/evidence/` in the worktree;
  - an append-only `.tmp/ledger.md` that only `pusher` writes. It holds checkpoint lines and progress entries, the findings, rulings, attempts, and changes of each round. A progress entry is local: it is never posted to a PR, a comment, or a card, and never read as a checkpoint.
- A scout reads the checkpoints at the start of each run.
- Specs are written and read by agents, and stay in the repository as context for later failures. Humans compact or remove them.
- A rerun skips every stage its checkpoints show complete and still current. A story's rerun reads the one spec folder its first run wrote, whatever the title says now. When the ledger shows the spec committed (`done spec`) and its folder holds `build.json`, `validate.json`, and `RATIONALE.md`, the rerun skips the design, advice, decision, and spec stages, and it skips the challenge too when the ledger shows it finished (`done challenge`, which `pusher` appends in a dispatch of its own as soon as the challenge finishes); otherwise it runs the challenge again, with the criteria checks, lenses, and advisors but no claim checks, since the claims went with the earlier run. The ledger holds a copy of the committed `build.json` and `validate.json`, which the rerun reads in preference to the files. A rerun's fix rounds are counted from its own first round, so it gets a fresh budget. A rerun whose ledger shows finished build rounds starts at the next one. Once the PR exists, a rerun validates the work once more, without building, and resumes at the review, so its PR description rests on evidence from this run. Answers to a `draft` or `blocked` result go in `answers`, a map keyed by id. Each answer is plain text: a string, or a number or boolean read as text. `answers` that isn't a map, or an answer that is an object or a list, ends the run as `not-started` before any agent works, naming what to fix, and a `null` answer counts as unanswered.
- A rerun in the same session can instead resume through the workflow runtime, which replays earlier dispatches from the cache.
