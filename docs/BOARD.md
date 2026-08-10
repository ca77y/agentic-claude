# The board

How this project tracks work, read directly at this fixed path — `docs/BOARD.md` — by
every board-touching agent, with no per-run resolution step in between. Keep it true,
because the pipeline binds real calls to what it says.

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
- **comment** — `save_comment` with the issue `id` and a Markdown `body`.
- **update** — `save_issue` with the issue `id` and the changed fields (`description`,
  labels, `priority`, or a relation).

## Card shape

A Linear issue. Title is the action-verb story title; the body goes in `description` as
Markdown.

- **Type** — exactly one label: `Bug`, `Improvement`, or `Feature`. These three are
  implementation-ready; there is no research/marketing/support label, so work of that
  kind is refined into one of the three before it is filed.
- **Priority** — `1` Urgent · `2` High · `3` Medium · `4` Low.
- **Identity** — the issue identifier (`SMR-166`). It is the stable name across board,
  branch, and PR, and the spec takes it as `docs/specs/<identifier-slug>.md` (lowercase,
  e.g. `smr-166-convert-the-lead.md`). **How a branch name is derived from it is
  [`FORGE.md`](./FORGE.md)'s to say** — this file supplies the identity, that one
  supplies the branch.
- **Dependencies** — Linear's blocking relations, set via `blockedBy` / `blocks` on
  `save_issue`. There are no sub-issues: one story is one issue is one PR.
- **Body** — scaffolded by [`_templates/story.md`](./_templates/story.md): a summary
  paragraph, then `## Why`, `## Scope`, `## Out of scope`, `## Acceptance criteria`,
  `## References`. Sections that do not apply are dropped, not left empty. The fields
  above are Linear's own and are never restated in the body, and the body carries no
  `#` heading — the issue title is the heading.

Acceptance criteria are recorded **one observable behaviour per line** under the
`## Acceptance criteria` heading — the acceptance gate reads them one at a time, and
grades each separately.

*Quirk:* Linear rewrites `-` bullets to `*` and wraps bare URLs in `<…>` on save. It is
cosmetic and the content round-trips intact; do not reshape a body to avoid it.

## Statuses

`Backlog` · `Todo` · `In Progress` · `In Review` · `Done` · `Canceled` · `Duplicate`.

The flow, and who moves it:

| From → to | Who | When |
| --- | --- | --- |
| `Backlog` → `Todo` | **human** | the story is refined and ready to start |
| `Todo` → `In Progress` | `lead` | the run starts, at workspace creation |
| `In Progress` → `In Review` | `lead` | the PR is open |
| `In Review` → `Done` | **human** | the work is verified |
| anything → `Canceled` / `Duplicate` | **human** | abandoning or folding work is a product call |

The two human gates are the whole point of the split: I decide what is **ready to build**
and what is **actually finished**. Everything between those two is the pipeline's.

## Visibility

A status write is the API call itself; it is visible in Linear immediately. **No checkout
is involved** — never write a status into the repository, a worktree, or a branch, and
never commit one.

## What the pipeline may write

Agents **work** these issues; they do not just read them. Permitted, and expected:

- **create** — the `analyst` files new issues at `Backlog`.
- **transition** — the `lead` makes the two middle transitions above, and only those.
- **attach the PR** — the `lead` links the PR to the issue when it opens it. Preferred,
  not optional: an issue should carry its own PR rather than making someone search. The
  link itself comes from [`FORGE.md`](./FORGE.md)'s *open the change* binding.
- **comment** — progress, production hazards, and the handoff summary belong on the
  issue, where they outlive the session that produced them.
- **edit content** — description, acceptance criteria, labels, priority, and relations
  may be corrected as the work teaches something. A stale relationship, a mislabelled
  type, a criterion the design proves unsatisfiable: **fix it on the issue** rather than
  reporting it and hoping someone gets to it.

Two rules bound all of that:

- **Never move a status through a human gate.** `Backlog` → `Todo`, `In Review` → `Done`,
  and anything → `Canceled`/`Duplicate` are mine. They encode judgements — *ready* and
  *verified* — that the pipeline is not positioned to make about its own work.
- **Never edit an acceptance criterion to match what was built.** Criteria may be
  corrected — when the design proves one unsatisfiable as written, or a met one should be
  marked verified — but never by the agent whose work is being judged against it, and
  never in the window between the build and the gate that judges it. The `writer`
  corrects a criterion during the spec pass and records the deviation; the `lead` marks
  criteria verified only after the acceptance gate has passed; the `auditor` never edits
  what it gates. A criterion edited by the work it governs is not a criterion. Where a
  gate finds a criterion's own wording defective inside that window, it does not correct
  it there either: it reports the defect in the verdict it returns, and the run escalates
  it to the human, unresolved — the correction happens in a later run's spec pass, on the
  corrected card.

Where an agent is unsure whether an edit is a correction or a rewrite of the goal, it
reports instead of writing. That is the only case left where reporting beats acting.

## What the old per-run artifact used to carry

A generated scratch file used to accompany this declaration on every run, restating it
and adding four run-local facts. That artifact is gone; here is what happened to each
fact:

| Fact | Disposition |
| --- | --- |
| When and by whom it resolved | **Dropped.** The `lead`'s ledger and the run it belongs to carry it. |
| The probe call and its result | **Dropped.** There is no probe step anymore. |
| The card's resolved branch name | **Recorded in the ledger.** It already tracks the branch and the worktree. |
| `Unresolved: nothing` | **Dropped.** An unbound operation is read from this declaration, directly, at the point of use. |
