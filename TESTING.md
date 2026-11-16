# Testing

How this project is booted, checked, and validated.

## Platform

CLI: a Claude Code plugin marketplace. There is no running app; plugins are checked statically and exercised through `claude plugin eval`.

## Tools

- Node 26 with npm, as CI uses (`actions/setup-node`, `node-version: "26"`).
- Claude Code CLI: `npm install --global @anthropic-ai/claude-code@2.1.309`.
- Dev tools pinned in `package.json`, installed by `make install`.

## Setup

- Where the env file comes from: none; nothing reads an env file.
- Seed data: none; each smoke case's `scaffold.sh` builds its own throwaway repository.
- Where the test account comes from, never a personal logged-in session: none exists yet. Smoke runs call models through the Claude Code CLI login of whoever runs them. This is an open gap.

## Boot

- Command: none.
- Readiness probe, a URL and port or a simulator name and OS: none.
- Timeout: none.
- How each worktree gets its own port or simulator: none needed; each smoke case runs in its own scaffolded directory.

## Checks

Each command is expected to exit 0. `make check` runs all of them; `make format` rewrites files and is never a check.

- Format: `npx --no-install prettier --check .`
- Lint: `npm run --silent build:check && npm run --silent lint:ts && npm run --silent lint:md && npm run --silent lint:dead && npm run --silent lint:dup && npm run --silent lint:types && claude plugin validate --strict . && claude plugin validate --strict plugins/slopify`
- Typecheck: `npm run --silent typecheck`
- Unit tests: `npm run --silent test:unit`, or `node --test <file>` for one test file.

## Categories

The kinds of change this project recognizes. Every acceptance criterion is filed under one category, or marked `uncategorized` when none fits.

### Deterministic

- Covers, the paths or kinds of change: every criterion a command can prove without a model: workflow and skill code in `src/` and `scripts/`, built files, tests, configuration, docs, and the structure of plugin text.
- Validation path: run `make check`, and the unit test in `test/` that the change adds or changes.
- Required evidence: each command's exit code, and the names of the tests that prove the criterion.
- When a criterion in this category can't be verified, the pull request is `ready` or stays `draft`: `draft`

### Smoke eval

- Covers, the paths or kinds of change: criteria about how a workflow, skill, or agent behaves when run with a model that only a smoke case shows: that a workflow starts, dispatches its agents, and reaches its first milestones.
- Validation path: run `make smoke` (about ten minutes, all cases at once) and read the result of the case for the affected workflow.
- Required evidence: each case's pass or fail and its report under `plugins/slopify/evals/results/`.
- When a criterion in this category can't be verified, the pull request is `ready` or stays `draft`: `draft`

### Full eval

- Covers, the paths or kinds of change: claims about cost, accuracy, or quality across many runs.
- Validation path: a full eval run the user performs by hand. No command exists.
- Required evidence: the user's run report.
- When a criterion in this category can't be verified, the pull request is `ready` or stays `draft`: `draft`

### Uncategorized

When a criterion fits no category, the pull request is `ready` or stays `draft`: `draft`

Anything other than `ready` in these settings, including no statement, means `draft`.

## Flows

The smoke cases under `plugins/slopify/evals/`: `shape-smoke`, `deliver-story-smoke`, `deliver-trivial-smoke`, `deliver-bugfix-smoke`, `deliver-spike-smoke`, and `research-smoke`. Each has a `scaffold.sh`, a `prompt.md`, and `graders/`.

## Evidence

Command output for checks; eval reports in `plugins/slopify/evals/results/`, which is ignored.

## Blind spots

- Full eval claims: cost, accuracy, and quality across runs. Only a run the user performs can show them.
- The real Linear board and GitHub review: smoke cases use local scaffolds, never the real tracker or forge.

## Teardown

None.
