# SWE-bench Pro comparison

Runs SWE-bench Pro v2 tasks through the slopify workflows and through plain Claude Code on Opus 5.5, grades both arms
with each task's hidden tests, and reports, per task and arm, whether it resolved the task, its cost, wall time, agent
count, and how the run ended.

It calls models through your own Claude Code login and runs the tasks in Docker, so it runs only when you ask: no CI
job, `make check`, or `make smoke` runs it.

## Requirements

- Docker (Docker Desktop or OrbStack on macOS), running. The task images are linux/amd64; Apple Silicon runs them under
  emulation. Each image is 2–5 GB, about 50 GB for all 16.
- Claude Code, logged in (`claude` once). Both arms bill to that login.
- Node 26 and `make install`, as for the rest of this repository.
- Python 3, which the grader uses to read a few tasks' test lists.

## Usage

```sh
make install-eval                  # once: task folders, dataset rows, and images into .eval/
make eval-grader                   # optional: every reference patch resolves, every empty patch doesn't
make eval TASKS=trivial ARMS=plain # a small first run to see the cost
make eval                          # all 16 tasks, both arms
```

- `TASKS` limits a run to some tasks: a workflow (`story`, `bugfix`, `trivial`, or `deliver-story` and so on),
  `shape` for the shape → story tasks, or any part of an instance id, separated by commas. A term that names no task
  stops the run.
- `ARMS` is `slopify`, `plain`, or both (the default).
- `JOBS` sets how many arms run at once (default 4). Each arm keeps one task container running.
- `RUN=.eval/runs/<stamp>` resumes a stopped run: finished arms are kept and the rest run again.
- `KEEP=1` keeps each arm's repository after grading, for a look at what it did.

A deliver-story run can take hours and cost about $100; a plain run of the same task takes minutes. Start with one
task per workflow, for example `make eval TASKS=96b997802e,a02e22e902,7cbfb812ef`.

## What a run does

For each task and arm:

1. Copies the task's repository out of its image at the base commit, adds a `TESTING.md`, `docs/BOARD.md`, and
   `docs/FORGE.md` for a local Markdown board under `.board/` and a local stub forge under `.forge/`, and commits them
   as the seed. A story's card is written to `.board/STORY-1.md`.
2. Starts the task's container with the repository mounted in it. The code's toolchain lives only in the container,
   so `TESTING.md` tells both arms to run commands through `.swepro/run '<command>'`.
3. Runs Claude Code headless in the repository, with `--setting-sources project,local` and no MCP servers, so your
   own plugins, hooks, and settings stay out of both arms, and without WebFetch or WebSearch, so neither arm can look
   up the upstream fix. Its Bash tool runs in bash on every machine (`SHELL=/bin/bash`), since agents' shell commands
   can behave differently in zsh:
   - slopify: the plugin from `plugins/slopify`, with `/slopify:deliver-trivial` or `/slopify:deliver-bugfix` and the
     task text, or `/slopify:deliver-story STORY-1`, each on a branch without a worktree. A shape → story task first
     runs `/slopify:shape` on the problem statement and interface, then deliver-story on the card shape filed.
   - plain: the task text and a pointer to `TESTING.md`, on Opus 5.5 at its default effort.
4. Takes the arm's final code as a patch on the seed, leaving out the three setup files.
5. Grades the patch in a fresh container of the task's published image with the task's own verifier, which applies
   the hidden tests and checks every fail-to-pass and pass-to-pass test.

Each task's text is its problem statement, requirements, and interface. The shape → story tasks withhold the
requirements from shape and from plain Opus, so shape and the design phase decide them.

The local forge runs no review: a workflow's PR stays a draft, and the review rounds a real forge would trigger are
neither run nor costed. A workflow arm is graded on the code it leaves either way.

Cost is priced from the transcripts Claude Code keeps under `~/.claude/projects/`, the session's and every agent's,
so it includes every agent a workflow starts. Agent count is the number of agent transcripts.

## Output

Everything goes under `.eval/`, which git ignores:

- `.eval/cache/`: the pinned SWE-bench Pro task folders and the dataset rows.
- `.eval/runs/<stamp>/report.md` and `results.json`: the report.
- `.eval/runs/<stamp>/<task>/<arm>/`: each invocation's stream (`*.jsonl`), the graded `patch.diff`, the verifier's
  log under `grade/`, and `result.json`.

## Task list

[`tasks.json`](tasks.json) names the 16 tasks, the workflow each runs through, and whether shape runs first. It pins
the [SWE-bench Pro harness](https://github.com/scaleapi/SWE-bench_Pro-os) to one commit; `make install-eval` checks
each dataset row against that commit's task text and stops if they differ.
