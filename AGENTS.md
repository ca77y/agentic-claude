# Working on agentic-slop

This repo is the source of Claude Code plugins under `plugins/` and the marketplace in `.claude-plugin/` that lists them. Rules for editing particular files live in `.claude/rules/`.

- Run `make install` once per clone. It installs the dev tools and enables the pre-commit hook, which runs `make check` on every commit and changes no file. Run `make build` after editing `src/` and `make format` before committing. A commit the hook or CI rejects is not done.
- Change a plugin's `version` only when the user asks for that bump.
- Run `make smoke` only when the user asks; it calls models.
- `bootstrap` sets a repository up correctly, and the rest of the plugin takes that setup as ground truth. Never add a defensive check or a fallback: nothing runs to confirm the environment or the setup, and nothing handles a setup that is wrong. A check that would fire on a correctly configured repository and do nothing doesn't belong in a workflow or an agent.
- A rule that governs what happens in a project using the plugin must be encoded where that project gets it: the workflow script, an agent definition or reference under `plugins/`, or the setup `bootstrap` creates and audits. `docs/` explains a rule; it never enforces one, because a project using the plugin never sees it.
