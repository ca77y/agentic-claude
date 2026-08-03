# Issue tracking

How this project tracks work. The `ca77y-engineering:board` skill resolves this file into
a board profile; keep it true, because the pipeline binds real calls to what it says.

## The board

Plain Markdown files committed in this repo, under [`tasks/`](./tasks/), viewed as a
kanban board by the vendored Obsidian **Task Board** plugin. There is no tracker service
and no API — every operation is a file read, a grep, or a file edit. The card format and
the folder's own rules live in [`tasks/CLAUDE.md`](./tasks/CLAUDE.md).

## Reaching it

The repo itself. No credentials, no server, nothing to authenticate.

## Operations

- **locate** — `docs/tasks/<slug>.md`, by slug or by title.
- **read** — read the file. One story per file, context on the card's sub-bullets.
- **search** — grep `docs/tasks/`, including `_backlog/` and `_archive/`.
- **create** — copy [`_templates/story.md`](./_templates/story.md) to `docs/tasks/<slug>.md`.
- **transition** — edit the card's checkbox symbol in place.

## Card shape

Defined by [`_templates/story.md`](./_templates/story.md), with the semantics in
[`tasks/CLAUDE.md`](./tasks/CLAUDE.md): `type: story` frontmatter; one Obsidian Tasks
checkbox carrying the title, a `#type` tag, a priority emoji (`🔺⏫🔼🔽`), and the story id
(`🆔 <slug>`); dependents declare `⛔ <slug>`. The slug is reused for the branch and the
spec file, so one story is one name across board, repo, and PR.

Acceptance criteria are recorded **one observable behaviour per line** — the acceptance
gate reads them one at a time.

**Format quirk:** the Task Board view scans files for `- [ ]` markers and surfaces *every*
match as its own item, including indented ones. Exactly one checkbox per card; scope,
criteria, and references go on plain `-` bullets.

## Statuses

`[ ]` Todo · `[<]` Ready to start · `[/]` In Progress · `[?]` In Review · `[x]` Done ·
`[X]` Completed · `[-]` Cancelled. The checkbox symbol is the source of truth; status is
never duplicated in frontmatter.

- **work started** → `[/]` (expect `[ ]` or `[<]`)
- **awaiting review** → `[?]` (expect `[/]`)
- Terminal states — `[x]`, `[X]`, `[-]` — are the human's.

## Visibility

Status writes land in the **repository root checkout on `master`, left uncommitted**, and
never inside a story worktree: a card edited on a story branch stays invisible until that
branch merges, which is exactly when its status has stopped mattering. The board is the
human's to commit.

## What the pipeline may write

- The `analyst` creates cards, at `[ ]`.
- The `lead` makes the two transitions above, on the one card it is executing.

Nothing else. Every other status, and every edit to a card's content — its scope, its
criteria, its links, its relationships — is the human's; the pipeline reports follow-ups
rather than applying them.
