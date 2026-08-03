# Issue tracking

How this project tracks work. The `ca77y-engineering:board` skill resolves this file into
a board profile; keep it true, because the pipeline binds real calls to what it says.

## The board

**Linear** — the `Agentic Claude` project in the `Smerfy` team (`SMR`).
<https://linear.app/ca77y/project/agentic-claude-e233525564c3>

Work is not tracked in this repo. The Markdown board that used to live in `docs/tasks/`
was migrated to Linear on 2026-08-03 (35 cards → `SMR-132`…`SMR-166`) and removed; git
history holds the originals, and each migrated issue names its source file.

## Reaching it

The **Linear MCP server**, already connected in this workspace — tools are named
`mcp__plugin_linear_linear__*` and load through `ToolSearch` on demand. Nothing to
authenticate; no credentials live in this repo.

## Operations

- **locate** — `get_issue` by identifier (`SMR-166`) or URL; `list_issues` with
  `project: "Agentic Claude"` and `query: <title or slug>` when only a name is known.
- **read** — `get_issue`, with `includeRelations: true` when dependencies matter.
- **search** — `list_issues` with `project: "Agentic Claude"` plus `query`, `state`,
  `label`, or `priority`. Full-text `query` covers title and description.
- **create** — `save_issue` with `team: "Smerfy"`, `project: "Agentic Claude"`, and
  `state: "Backlog"`.
- **transition** — `save_issue` with the issue `id` and the target `state`.

## Card shape

A Linear issue. Title is the action-verb story title; the body goes in `description` as
Markdown.

- **Type** — exactly one label: `Bug`, `Improvement`, or `Feature`. These three are
  implementation-ready; there is no research/marketing/support label, so work of that
  kind is refined into one of the three before it is filed.
- **Priority** — `1` Urgent · `2` High · `3` Medium · `4` Low.
- **Identity** — the issue identifier (`SMR-166`). It is the stable name across board,
  branch, and PR: branch from the issue's own `gitBranchName`, and name the spec
  `docs/specs/<identifier-slug>.md` (lowercase, e.g. `smr-166-convert-the-lead.md`).
- **Dependencies** — Linear's blocking relations, set via `blockedBy` / `blocks` on
  `save_issue`. There are no sub-issues: one story is one issue is one PR.

Acceptance criteria are recorded **one observable behaviour per line** under an
`Acceptance criteria:` line — the acceptance gate reads them one at a time.

## Statuses

`Backlog` · `Todo` · `In Progress` · `In Review` · `Done` · `Canceled` · `Duplicate`.

- **work started** → `In Progress` (expect `Backlog` or `Todo`)
- **awaiting review** → `In Review` (expect `In Progress`)
- Terminal states — `Done`, `Canceled`, `Duplicate` — are the human's.

## Visibility

A status write is the API call itself; it is visible in Linear immediately. **No checkout
is involved** — never write a status into the repository, a worktree, or a branch, and
never commit one.

## What the pipeline may write

- The `analyst` creates issues, at `Backlog`.
- The `lead` makes the two transitions above, on the one issue it is executing.

Nothing else. Comments, PR-link attachments, terminal states, and every edit to an
issue's content — its title, description, criteria, labels, priority, relations — are the
human's; the pipeline reports follow-ups rather than applying them.
