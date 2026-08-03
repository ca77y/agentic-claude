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
code — without adopting a second harness or a dispatcher bridge, and without being
told which issue tracker to use.

## Principles

- **Specs and research live in the target repo.** Both are plain Markdown inside the
  repository the pipeline runs on. No hosted state of the toolkit's own.
- **The board is resolved, never assumed.** How a project tracks work — repo-local
  Markdown, Linear, Jira, GitHub Issues, or nothing — is discovered from that project's
  own context at the start of every run and reached only through the resolved bindings.
  A tracker detail hardcoded in an agent is a defect.
- **Nothing signs off on itself.** The agent that produces an artifact never gates it.
  Code review goes to `qa` (a separate context from the `coder`) locally and to the PR
  review on the opened PR, readiness and acceptance to the `auditor`, library health to
  the `clerk` — each in its own subagent context.
- **The human owns the board.** Agents read cards, and the `analyst` files them; only
  the `lead` moves one, twice, within a write authority the project declares and which
  defaults to exactly those two transitions. Everything else — terminal states, card
  content, stale relationships — is reported, never applied. Two human gates punctuate
  the flow: approving the analyst's stories, and invoking the `lead`.
- **Agents discover, they do not assume.** Every agent reads paths, conventions, and
  product context from the target project. Hardcoded paths are a defect.
- **Verification is layered, not repeated.** Spec authored + audited → per-scenario tests → qa gap
  fill and local review → acceptance audit → PR review. Each layer checks something
  the previous one cannot.

## Boundaries

- **Not a general-purpose agent framework.** The roster is fixed and opinionated; agents
  are added when a stage of this pipeline needs one, not to cover hypothetical uses.
- **Not a project tracker.** It works against the board you already have and never
  becomes one: no sync, no hosted state, no board of its own. Markdown cards in the repo
  are the zero-setup default, not a requirement.
- **Not multi-harness.** Everything runs in Claude Code. Earlier versions bridged to an
  external CLI dispatcher; that is gone and is not coming back.
- **No hierarchy of work items.** One story = one card = one PR, whatever hierarchy the
  board offers. Bigger work
  is a bigger story; genuinely separate work is multiple linked stories.

## Requirements it places on target repos

A repo the pipeline runs on must be an Obsidian vault with a committed `.obsidian/` and
the community plugins listed in the root [`README.md`](../README.md) — Templater is
required for the scaffolds; Dataview, Breadcrumbs, and Excalidraw are recommended. That
requirement covers the **docs and library** (`docs/specs/`, durable docs, `library/`,
`docs/_templates/`), not the board.

The board is separate and optional: a project either declares one — canonically in an
`ISSUE_TRACKING.md` the `board` skill can help write, or anywhere else its context already
documents itself — or declares none, and the pipeline runs trackerless off the spec. This
repo tracks its own work in Linear; a repo-local Markdown board instead needs a cards
directory plus the Tasks and Task Board community plugins.

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
