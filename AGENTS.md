# Working on agentic-slop

This repo is the source of Claude Code plugins under `plugins/` and the marketplace in `.claude-plugin/` that lists them. The project's research library is in `library/`. Rules for editing particular files live in `.claude/rules/`.

- Product: the root `README.md`. Architecture: `.claude/rules/architecture.md`. Design: `docs/DESIGN.md`, `docs/deliver/`, `docs/RESEARCH.md`, and `docs/SHAPE.md`. Testing: `TESTING.md`.
- Outside a delivery, work on `master` in the root checkout: create no branch or worktree, and commit only when the user asks. Only a delivery request creates a story branch in its own worktree and ends in a PR.
- Run `make install` once per clone. It installs the dev tools and enables the pre-commit hook, which runs `make lint` (every fast check except the unit tests) on every commit and changes no file. CI runs `make check`, which adds the unit tests. Run `make build` after editing `src/` and `make format` before committing. A commit the hook or CI rejects is not done.
- Change a plugin's `version` only when the user asks for that bump.
- Run `make smoke` only when the user asks; it calls models. A delivery request with a criterion in `TESTING.md`'s Smoke eval category counts as asking.
- A rule that governs what happens in a project using the plugin must be encoded where that project gets it: the workflow script, an agent definition or reference under `plugins/`, or the setup `bootstrap` creates and audits. `docs/` explains a rule; it never enforces one, because a project using the plugin never sees it.

## Library

Read `library/_meta/librarian.md` before library work.
