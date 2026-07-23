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
|       `-- agents/*.md                  # the agent definitions
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

Ten agents in one plugin, in two groups:

| Group | Agents | Role |
| --- | --- | --- |
| Pipeline | `researcher`, `analyst`, `lead`, `writer`, `coder`, `qa`, `auditor` | idea → shipped PR |
| Library crew | `librarian`, `scribe`, `clerk` | maintains the target project's Markdown research library |

The flow is `researcher → analyst → lead → writer → coder → writer`, with `qa`
(validation plus the local code review) and the `auditor` gating, and the independent
code review running on the opened PR. Under the `lead`, `writer`, `coder`, `qa`, and
`auditor` are all **leaves it dispatches directly** — none of them dispatches another.
The library crew is dispatched directly by whichever agent needs library work.

It stays **one plugin**. Splitting the library crew out was considered and rejected: the
seam between the two groups is a file — a wiki page — not an agent call, but the
`analyst` dispatches `librarian` and `clerk` directly, so a split would flip the
dependency rather than remove it.

## A flat topology — the lead is the only orchestrator

The pipeline is deliberately flat. The `lead` dispatches every pipeline agent directly —
`writer`, `coder`, `qa`, `auditor` — and **none of them dispatches another**. The chain is
never more than two deep: the lead, then a leaf. Each leaf does its one job and returns;
the lead **trusts that result** and never does the work itself, never re-checks it, and
never steps in when a dispatch fails (it retries or escalates). The `writer`'s docs are
trusted outright; its spec is gated by the lead's `auditor` before the build.

This sidesteps Claude Code's dispatch-depth limit: three levels down the dispatch tool is
absent entirely, and a fan-out skill invoked from that depth silently collapses to a
single pass. With every pipeline agent a leaf under the lead, nothing runs deep enough to
hit it. The leaves keep the Agent tool — the limit is **not** enforced on them — but by
design they do not orchestrate; being a leaf is a role, not a restriction.

The heavy, fan-out **code review runs on the PR** (the Claude GitHub review), outside the
dispatch tree entirely, so depth never constrains it; `qa`'s local review is a
single-context pass.

The `analyst` and `researcher` are separate top-level orchestrators, **not** part of the
lead's tree: they run their own sub-dispatch — the analyst's advisor gate and library
lookups, the researcher's subquestion decomposition and library writes.

## Model and effort assignment

Models are pinned per agent in the agent definitions. The current split: `opus` for
`analyst`, `qa`, and `writer`; `sonnet` for `auditor`, `clerk`, `coder`, `lead`,
and `researcher`; `haiku` for `librarian` and `scribe`. Effort is set on every
agent except the two haiku ones — it is unsupported there and setting it breaks dispatch.

The frontmatter is the only source of truth for both. Note that nesting resolves a
subagent's model against the *main conversation* rather than the dispatching agent, so
an agent reached through a chain and carrying no `model:` of its own inherits the
session model.

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
