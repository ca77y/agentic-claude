# Design

How the plugins are built now. When the code changes a decision below, update it here in the same change.

## Workflows and skills

- A multi-step process (shaping a story, delivering a change, reviewing a PR, researching) is a workflow under `plugins/<plugin>/workflows/`. A task that fits one session turn, such as setup, answering from the library, or linting, is a skill.
- A workflow runs only when the user invokes it. The invocation is the user's request, and each workflow states what that request authorizes.

## Sources and build

- A workflow's source is `src/<plugin>/workflows/<name>.ts`: it exports a pure-literal `meta` and a default `run()`. Code that several workflows share is an ordinary module under `src/<plugin>/lib/`.
- `scripts/build.ts` bundles each source with esbuild into `plugins/<plugin>/workflows/<name>.js`, the file the runtime runs, and the built files are committed.
- The runtime's globals are typed in `src/runtime.d.ts`. An agent schema is declared `as const`, and its result type is inferred from it, so the code that reads an agent's output is checked against the schema the agent must satisfy.

## Agent roles

- **Scouts** gather evidence for one question. **Lenses** judge one property of an artifact and report only. **Advisors** give one view on an approach from the evidence in their brief.
- **Producers** (`coder`, `writer`) change files. A fresh **validator** (`qa`, or a lens) judges every revision they make.
- **Operations agents** act on the world outside the files: `pusher` performs the writes the declarations bind, and `watcher` waits for a review.
- A workflow passes each dispatch the schema its output must follow. An agent's model and effort come from its frontmatter; a workflow never overrides them.

## Gates and results

- Each gate allows three failures per run. A failure is a `fail` verdict, an `unverified` verdict whose missing prerequisite a producer could supply, or a producer reporting the approach unworkable. A validator that returns no usable verdict is run again; that doesn't count as a failure.
- A run ends `done`, `not-started`, or `blocked`. A `blocked` result names each need by kind (`story`, `decision`, `prerequisite`, `validation`, `input`), the steps already completed, and how to rerun.
- The story on the card is the acceptance source. A criterion that is wrong comes back to the user as a `story` need; a workflow never rewrites one.

## State and reruns

- A workflow keeps no state between runs. It learns where a run stands from durable checkpoints: the artifacts it produced, and an append-only ledger under the worktree's `.tmp/` that only `pusher` writes. A scout reads them at the start of each run.
- A rerun skips every step that its checkpoints show is complete and still current. A rerun in the same session can instead resume through the workflow runtime, which replays earlier dispatches from the cache.
