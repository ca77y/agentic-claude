# Working on agentic-slop

This repo is the source of Claude Code plugins under `plugins/` and the marketplace in `.claude-plugin/` that lists them. Rules for editing particular files live in `.claude/rules/`.

- Run `make install` once per clone. It installs the dev tools and enables the pre-commit hook, which formats, lints, and validates every commit. A commit the hook rejects is not done.
- Change a plugin's `version` only when the user asks for that bump.
