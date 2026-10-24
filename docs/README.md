# Engineering docs

Engineering notes for people working on `agentic-slop`. How to use the toolkit is in the root [`README.md`](../README.md). Rules for agents are in the root [`CLAUDE.md`](../CLAUDE.md) and in [`.claude/rules/`](../.claude/rules/), which loads the rules for whichever files an agent edits.

- [`ARCHITECTURE.md`](ARCHITECTURE.md): the rules every plugin part follows
- [`DESIGN.md`](DESIGN.md): how the plugins are built now
- [`BOARD.md`](BOARD.md): how this repo's board is reached and what may be written to it
- [`FORGE.md`](FORGE.md): how this repo branches, commits, publishes, and is reviewed
- [`issues/`](issues/): known problems with no solution on our side
- [`specs/`](specs/): throwaway specs, the how of one unit of work, never kept current

Tooling:

- `make install` installs the dev tools and enables the pre-commit hook.
- `make build` bundles the TypeScript workflow sources in `src/` into `plugins/`.
- `make format` formats the repo with Prettier.
- `make check` runs every fast check on the whole repo: build freshness, type checks, ESLint, markdownlint, Prettier, knip for dead code, jscpd for duplication, type coverage, unit tests, and plugin validation.
- `make test` runs the unit tests.
- `make smoke-test` runs the plugin's smoke evals, four cases at a time. They call models and take about 12 minutes, so nothing runs them automatically.

The hook only checks: it runs `make check`. It changes no file, so run `make build` after editing `src/` and `make format` before committing. CI runs `make check` on every pull request and every push to `master`.
