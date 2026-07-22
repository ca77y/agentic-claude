# Product

What `ca77y-agentic` is for, what it deliberately is not, and where it is going.

## Intent

A personal agentic toolkit for Claude Code that carries an idea from raw research to a
reviewed pull request, and grows a durable research library along the way. It ships as
**one plugin** — `ca77y-engineering` — whose agents run natively as Claude Code
subagents.

The organizing promise is **one task in, one PR out**: the `lead` takes a single task,
optionally naming a story card, and ships it as a single reviewed pull request. No
splitting into units, no per-unit branches, nothing to merge.

## Who it is for

One developer running Claude Code on their own repositories, who wants the planning,
specification, review, and documentation work to happen with the same rigor as the
code — without adopting a tracker, a second harness, or a dispatcher bridge.

## Principles

- **Everything lives in the target repo.** Stories, specs, and the research library are
  plain Markdown inside the repository the pipeline runs on. There is no external
  tracker and no hosted state.
- **Nothing signs off on itself.** The agent that produces an artifact never gates it.
  Code review goes to the `reviewer`, readiness and acceptance to the `auditor`, library
  health to the `clerk` — each in its own subagent context.
- **The human owns the board.** Agents read cards; only the human moves them. Two human
  gates punctuate the flow: approving the analyst's stories, and invoking the `lead`.
- **Agents discover, they do not assume.** Every agent reads paths, conventions, and
  product context from the target project. Hardcoded paths are a defect.
- **Verification is layered, not repeated.** Spec audit → per-scenario tests → qa gap
  fill → simplify + review → acceptance audit → PR review. Each layer checks something
  the previous one cannot.

## Boundaries

- **Not a general-purpose agent framework.** The roster is fixed and opinionated; agents
  are added when a stage of this pipeline needs one, not to cover hypothetical uses.
- **Not a project tracker.** The board is Obsidian Task Board over Markdown files. No
  sync, no API, no server.
- **Not multi-harness.** Everything runs in Claude Code. Earlier versions bridged to an
  external CLI dispatcher; that is gone and is not coming back.
- **No hierarchy of work items.** One story = one card = one file = one PR. Bigger work
  is a bigger story; genuinely separate work is multiple linked stories.

## Requirements it places on target repos

A repo the pipeline runs on must be an Obsidian vault with a committed `.obsidian/` and
the community plugins listed in the root [`README.md`](../README.md) — Tasks, Task Board,
and Templater are required; Dataview, Breadcrumbs, and Excalidraw are recommended. The
expected layout is `docs/tasks/`, `docs/specs/`, durable docs, `library/`, and
`docs/_templates/`.

This repository satisfies those requirements itself, so the pipeline can be run on the
toolkit that defines it.

## Direction

- **Harvest the feedback loop.** Agents append pipeline improvements to a project-level
  `AGENTS_IMPROVEMENTS.md`. Those notes are the primary input for the next version of the
  agent definitions; harvesting them is recurring work, not a one-off.
- **Keep the roster shrinking, not growing.** The pipeline went from a story/unit split
  with per-unit worktrees to a single-task/single-PR flow because the split never paid
  for itself. Prefer removing a stage over adding one.
- **Prove it on real repos.** Behavior changes are validated by running the pipeline on
  a live project, not by reasoning about the prompt text.

## Non-goals

- Publishing to a public marketplace or supporting other people's workflows.
- Supporting harnesses other than Claude Code.
- Replacing human judgment on what to build. The analyst proposes; the human approves.
