# Architecture

How `ca77y-agentic` is assembled. Per-agent behavior is documented in the root
[`README.md`](../README.md); this file covers structure, contracts, and the constraints
that shape them.

## Repository shape

```text
ca77y-agentic/
|-- .claude-plugin/marketplace.json      # marketplace entry, lists the plugin
|-- plugins/
|   `-- ca77y-engineering/
|       |-- .claude-plugin/plugin.json   # Claude manifest (agents whitelist)
|       |-- plugin.json                  # root manifest, mirrors the Claude one
|       |-- agents/*.md                  # the agent definitions
|       `-- hooks/dispatch-guard.py      # pins every dispatch to its roster model
|-- docs/                                # this documentation + the board
|-- .obsidian/                           # vendored vault config and plugins
`-- CLAUDE.md                            # repo maintenance rules
```

The agent Markdown files under `plugins/ca77y-engineering/agents/` **are the product**.
Everything else is packaging, documentation, or vault state.

## The dual manifest

Each plugin carries two manifests in different locations so neither harness trips over
the other:

- `plugins/<plugin>/.claude-plugin/plugin.json` — the manifest Claude Code reads.
- `plugins/<plugin>/plugin.json` — the root manifest, which mirrors it.

They must always carry the same `version`. They have silently drifted before; the root
[`CLAUDE.md`](../CLAUDE.md) carries the check to run before any push that touches a
version.

## How scoping works

Each plugin is its own root with its own `plugin.json`, and scoping must live there. A
marketplace entry's component fields are **not** honored as an override — a shared pool
with marketplace-level whitelists silently loads everything.

The `agents` whitelist in `plugin.json` *replaces* the default `agents/` directory scan.
Only listed files load, so unrelated Markdown in the plugin is never picked up as a
phantom agent. Adding an agent file without adding it to both manifests means it does not
exist at runtime.

## The agent roster

Eleven agents in one plugin, in two groups:

| Group | Agents | Role |
| --- | --- | --- |
| Pipeline | `researcher`, `analyst`, `lead`, `writer`, `coder`, `qa`, `reviewer`, `auditor` | idea → shipped PR |
| Library crew | `librarian`, `scribe`, `clerk` | maintains the target project's Markdown research library |

The flow is `researcher → analyst → lead → writer → coder → writer`, with `qa`,
`reviewer`, and `auditor` gating. The library crew is dispatched directly by whichever
agent needs library work.

It stays **one plugin**. Splitting the library crew out was considered and rejected: the
seam between the two groups is a file — a wiki page — not an agent call, but the
`analyst` dispatches `librarian` and `clerk` directly, so a split would flip the
dependency rather than remove it.

## Dispatch depth — the constraint that shapes the topology

Subagents can dispatch from the `lead`'s level and one below it. **Three levels down the
dispatch tool is absent entirely**, and an agent there cannot detect the limit in
advance — a fan-out skill invoked from that depth silently collapses to a single pass.

This is why:

- The `reviewer` is dispatched by the `lead`, not by the `coder`. Both of its skills
  (`/simplify` and code review) fan out, and from inside the coder they would degrade
  without warning.
- `qa` and the `auditor` sit happily at that third level, since neither dispatches.
- The `lead` runs a missing gate itself and reports the fallback if a dispatch fails for
  depth anyway.

Any change to who dispatches whom has to be checked against this rule first.

## Model and effort assignment

Models are pinned per agent in the agent definitions. The current split: `opus` for
`analyst`, `coder`, `reviewer`, and `writer`; `sonnet` for `auditor`, `clerk`, `lead`,
`qa`, and `researcher`; `haiku` for `librarian` and `scribe`. Effort is set on every
agent except the two haiku ones — it is unsupported there and setting it breaks dispatch.

`hooks/dispatch-guard.py` enforces the model pin on every dispatch, because nesting
resolves a subagent's model against the *main conversation* rather than the dispatching
agent — so an agent reached through a chain would otherwise inherit the session model.
The hook's `ROSTER` mirrors the `model:` frontmatter and must be kept in sync with it;
the frontmatter wins if they disagree, since it is what applies when hooks are disabled.
The hook pins model only — the Agent tool's schema has no `effort` field, and unknown
keys in a hook's `updatedInput` are silently dropped, so effort lives in frontmatter
alone.

## The commit model

The `lead` is the only agent that commits. Work happens in one worktree on one story
branch under the repo's worktree directory; the repo root stays on its base branch.

There are exactly two commits — the spec, then everything else — plus one per PR-review
fix round. The spec gets its own commit precisely because the docs pass later folds it
into durable docs and deletes it; without that commit it would never appear in history.

The accepted tradeoff: between the two commits the entire build lives only in the
worktree. An interrupted run loses nothing, since the worktree persists, but it has
nothing in git either. That is the price of a clean two-commit history.

## The self-improvement channel

Any agent may append a concrete pipeline improvement to `AGENTS_IMPROVEMENTS.md` at the
root of the target project's documentation area — resolved from project context, never a
hardcoded path, created on first use. It is opt-in: an agent writes only when it has
something specific, and only after reading the file so a point is never duplicated.

The notes are about *how the agents work*, never about the product feature being built.
They are harvested back into this repository by hand.

## Working on this repo with the pipeline

This repository is itself an Obsidian vault with the layout the pipeline expects, so the
toolkit can be run on its own definitions: cards in [`tasks/`](./tasks/), in-flight specs
in `specs/`, scaffolds in `_templates/`. The board scan is scoped to `docs/tasks` in
`.obsidian/plugins/task-board/data.json`, excluding `_archive/`, `_backlog/`, and the
folder's `CLAUDE.md`.
