# Design

How the plugins are built. When the code changes a decision below, update it here in the same change. The delivery process is in [`deliver/`](deliver/STORY.md).

## Workflows and skills

- A multi-step process is a workflow under `plugins/<plugin>/workflows/`. Examples are shaping a story, delivering a change, reviewing a PR, and researching. A task that fits in one session turn is a skill, for example setup, answering from the library, or linting.
- A workflow or skill runs only when the user invokes it; skills set `disable-model-invocation`. The invocation is the user's request, and each workflow states what that request authorizes.
- The script holds all control flow. Whether to continue, retry, or stop is decided by a predicate over typed agent output, never by a prompt. An agent reports what it found and doesn't choose what runs next, and its brief carries no loop state, such as which round this is.
- A step used by more than one workflow, such as validation or the review loop, is shared library code. It can also be exposed as a workflow of its own. A workflow doesn't start another workflow that would itself need a child.

## Sources and build

- A workflow's source is `src/<plugin>/workflows/<name>.ts`. It exports a pure-literal `meta` and a default `run()`. Code that several workflows share is an ordinary module under `src/<plugin>/lib/`.
- `scripts/build.ts` uses esbuild to bundle each source into `plugins/<plugin>/workflows/<name>.js`, which is the file the runtime runs. The built files are committed.
- The runtime's globals are typed in `src/runtime.d.ts`. Each agent schema is declared `as const`, and its result type is inferred from it. So the code that reads an agent's output is checked against the schema the agent must satisfy.

## Agent roles and tiers

- **Scouts and checks** run on haiku. Each has one small task whose answer can be checked: gather one kind of evidence, or test one property. They fan out widely, and each returns evidence with its claim.
- **`designer`** runs on opus. It produces one full approach from a stance the script gives it, independently of the other designers.
- **`judge`** runs on opus. Most dispatches rule on one item, such as one review finding or one validation verdict. A gateway dispatch checks a whole round before it is pushed. It confirms, overturns, or dismisses what a cheaper agent or the forge's reviewer reported, against the evidence and the rubric in its brief. It never downgrades a confirmed defect, and it never accepts a pass that lacks evidence.
- **Producers** change files: `writer-spec` for specs, `writer-docs` for documents, `writer` for stories, bug reports, and findings, and `coder` for code and tests. All run on opus. `coder` only implements its brief and makes no decisions: what the brief leaves open goes back as a spec problem. Code is written test first: one dispatch commits a failing test, and a separate dispatch makes it pass without changing any committed test. `qa` checks the history for that.
- **`qa`** runs on sonnet. It validates one `coder` change against what that change was meant to do, for example one fix against its finding.
- **`validator`** runs on sonnet. It drives the running app as the project's `TESTING.md` describes, and returns per-criterion verdicts with evidence.
- **Operations agents** act on the world outside the files. `pusher` performs every write the declarations bind. `watcher` waits on an external event.
- **Advisors** give one view each and don't decide. In `shape`, they run on sonnet and judge the why and the what. In delivery, they run on opus at high effort and do the heavy lifting on the how: they compare the designs, then try to break the finished spec.
- A workflow passes each dispatch the schema its output must follow. An agent's model and effort come from its frontmatter, and a workflow never overrides them.

## Severity and problem kinds

`judge` gives every problem from every stage a kind, which says what is wrong. A defect in the change also gets a severity, which says how bad it is. Only a problem `judge` confirms counts. `judge` doesn't choose what happens next: the tables below are fixed in the script, which maps each kind to its next step.

| Severity       | Meaning                                                                                                                                                      | Blocks ready | Gets fixed |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ | ---------- |
| `blocker`      | Any of: a criterion fails; the build or tests are broken; data is lost or corrupted; there is a security hole; tests were weakened without a recorded reason | yes          | yes        |
| `major`        | A confirmed correctness bug on a reachable path in changed code, an error swallowed on a path the user sees, or documentation the change made untrue         | yes          | yes        |
| `minor`        | Real but low impact                                                                                                                                          | no           | no         |
| `nit`          | Style, naming, readability                                                                                                                                   | no           | no         |
| `pre-existing` | A defect the change didn't introduce                                                                                                                         | no           | no         |

Minor problems and nits go to the PR's Suggestions section. A pre-existing problem becomes a new issue.

Each confirmed `blocker` or `major` has one kind:

| Kind   | The problem                                          | Next step                                                                         |
| ------ | ---------------------------------------------------- | --------------------------------------------------------------------------------- |
| `code` | The behavior is wrong                                | `coder` and `qa`, from a failing test that shows the problem                      |
| `test` | The behavior is right, but the test or flow is wrong | `coder` and `qa`, starting by correcting the test                                 |
| `docs` | Documentation is untrue or missing                   | `writer-docs`, with no test                                                       |
| `spec` | The spec is wrong, so building it can't work         | The advisors and `writer-spec` revise the spec, then the affected tasks run again |

Two kinds of problem aren't defects in the change. They have no severity, and no producer sees them:

| Kind            | The problem                                                                                                        | Next step                                     |
| --------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- |
| `cannot-verify` | A tool, simulator, or credential stopped working, the check hits a blind spot, or the proof is missing or unusable | Listed in the PR, as `TESTING.md` decides     |
| `decision`      | Only a person can settle what the criterion should mean                                                            | Listed in the PR's Needs confirmation section |

Two statuses sit beside the scale. A finding is `unverified` when the judge couldn't check it. A check is `cannot-verify` when the environment can't run it or its proof can't be produced. Neither goes to a producer, and both are listed in the PR.

An `unverified` finding doesn't block and goes in its own PR section. Whether a `cannot-verify` criterion or an `uncategorized` criterion keeps the PR a draft is decided only by the target project's `TESTING.md`. Each category states `ready` or `draft`, and so does `uncategorized`. Anything else, including no statement at all, means `draft`.

## Decisions

- An agent that designs or writes a spec, and would ask a question, instead picks the most reasonable option, cites what grounds the choice, and continues. Each choice becomes a decision with these fields: `id`, `question`, `choice`, `rationale`, `reversible`, and `affectsAcceptance`.
- A decision that changes behavior a criterion describes is listed as **Needs confirmation** in the PR and in the issue comment. It doesn't stop the run or keep the PR a draft. The human confirms it when reviewing the PR, and a wrong choice is corrected by a rerun with `answers`.
- An irreversible action outside the story's scope is never taken on an assumption. Examples are a migration on shared data, deleting a public API, or changing production config. Only its reversible part is built, and the rest is recorded as deferred.
- Producers have no field that halts the run. Only the halt conditions a workflow lists stop it.

## Loops and results

- Every loop has a round cap and stops early on no progress. No progress means the same set of failures, or the same count of open blocking findings, two rounds in a row. A recurring fingerprint gets a typed outcome from `judge` instead of another identical attempt.
- When a loop ends without passing, its open items are recorded and the run continues to the next stage. A loop never ends the run.
- A delivery run ends with one of four statuses:
  - `ready`: the PR exists and its review is clean.
  - `draft`: the PR exists, and its description lists what is open.
  - `blocked`: one of the workflow's halt conditions held.
  - `not-started`: the issue couldn't be read or isn't marked deliverable.
- A `blocked` or `draft` result names what it needs by id, along with the stages completed and how to rerun.
- The issue is the acceptance source. A workflow may clarify a criterion in the spec, keeping the original wording beside the clarification. It never rewrites the issue.

## State and reruns

- A workflow keeps no state between runs. It learns where a run stands from its durable checkpoints:
  - the commits on the story branch;
  - the PR and its description;
  - the committed spec folder, and `.tmp/evidence/` in the worktree;
  - an append-only `.tmp/ledger.md` that only `pusher` writes.
- A scout reads the checkpoints at the start of each run.
- Specs are written and read by agents, and stay in the repository as context for later failures. Humans compact or remove them.
- A rerun skips every stage its checkpoints show complete and still current. Once the PR exists, a rerun resumes at the review. Answers to a `draft` or `blocked` result go in `answers`, keyed by id.
- A rerun in the same session can instead resume through the workflow runtime, which replays earlier dispatches from the cache.
