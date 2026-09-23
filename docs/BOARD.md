# The board

This declaration binds board operations to the project below. Authorization comes from the user's actual request and established conversation scope. Configuring an operation does not request its execution.

## The board

**Linear** — the `Agentic Claude` project in the `Smerfy` team (`SMR`).
<https://linear.app/ca77y/project/agentic-claude-e233525564c3>

Work is not tracked in this repository. Stories use their `SMR-<number>` identity and
belong to the `Agentic Claude` Linear project.

## Reaching it

The **Linear MCP server**, already connected in this workspace. Its tools are named
`mcp__plugin_linear_linear__*` and load through `ToolSearch` on demand; no credentials
live in this repository.

## Operations

- **locate** — `mcp__plugin_linear_linear__get_issue` by identifier (`SMR-200`) or URL;
  `mcp__plugin_linear_linear__list_issues` with `project: "Agentic Claude"` and
  `query: <title or slug>` when only a name is known.
- **read** — `mcp__plugin_linear_linear__get_issue`, with `includeRelations: true` when
  dependencies matter.
- **search** — `mcp__plugin_linear_linear__list_issues` with
  `project: "Agentic Claude"` plus `query`, `state`, `label`, or `priority`.
- **create** — `mcp__plugin_linear_linear__save_issue` with `team: "Smerfy"`,
  `project: "Agentic Claude"`, and `state: "Backlog"`.
- **transition** — `mcp__plugin_linear_linear__save_issue` with the issue `id` and target
  `state`.
- **comment** — `mcp__plugin_linear_linear__save_comment` with the issue identifier as
  `issueId` and a Markdown `body`.
- **update** — `mcp__plugin_linear_linear__save_issue` with the issue `id` and only the
  fields being changed (`description`, `labels`, `priority`, `links`, or relations).

## Card shape

A Linear issue. The title is an action-verb story title; the body is Markdown in the
`description` field.

- **Type** — exactly one label: `Bug`, `Improvement`, or `Feature`.
- **Priority** — `1` Urgent · `2` High · `3` Medium · `4` Low.
- **Identity** — the issue identifier (`SMR-200`). It is the stable name across board,
  branch, PR, and spec. A spec uses the lowercase identifier and a concise slug, for
  example `docs/specs/smr-200-card-content-access.md`. Branch derivation is
  owned by [`FORGE.md`](./FORGE.md).
- **Dependencies** — Linear blocking relations, supplied as `blockedBy` and `blocks` to
  `mcp__plugin_linear_linear__save_issue`. There are no sub-issues: one story is one issue
  is one PR.
- **Body** — a summary paragraph, then the applicable sections from `## Why`,
  `## Scope`, `## Out of scope`, `## Acceptance criteria`, and `## References`.
  Sections that do not apply are omitted rather than left empty. The body has no `#`
  heading because the Linear title is the heading.

Acceptance criteria are recorded **one observable behaviour per line** under
`## Acceptance criteria`; the acceptance gate reads and grades them individually.

Linear rewrites `-` bullets to `*` and wraps bare URLs in `<…>` on save. This is a
cosmetic round-trip quirk, not a content change.

## Statuses

`Backlog` · `Todo` · `In Progress` · `In Review` · `Done` · `Canceled` · `Duplicate`.

| From → to | Authorization and preconditions |
| --- | --- |
| `Backlog` → `Todo` | User decision that the story is refined and ready; no automated grant. |
| `Todo` → `In Progress` | Authorized implementation of this identified card has started and its workspace is established; verify current state is Todo. |
| `In Progress` → `In Review` | The requested publication endpoint has been reached for the same card and its PR exists; verify current state is In Progress. |
| `In Review` → `Done` | User decision; no automated grant. |
| anything → `Canceled` / `Duplicate` | User decision; no automated grant. |

Only the two middle transitions may be automated. Never move Backlog through the readiness gate. Terminal values — `Done`, `Canceled`, and `Duplicate` — remain the user's decisions.

## Visibility

A status write is the Linear call itself and is visible immediately. No checkout is
involved; never write a board transition into a repository, worktree, or branch.

## Operation conditions

- **Locate, read, search** — relevant read access follows the requested task; query only its authorized scope in the configured project.
- **Create** — the user requested filing a card. Create in the bound project/team at `Backlog` using the schema above. A proposal-only request does not authorize filing.
- **Transition** — only the two middle transitions and preconditions above.
- **Attach the PR** — attaching it is within the authorized card/publication task. Add the real URL returned by the PR creation operation in [`FORGE.md`](./FORGE.md) to the matching issue's `links`; never invent a URL or attach another task's PR.
- **Comment** — progress, hazards, and handoff information on the in-scope issue, only when posting those messages is explicitly authorized. Configuration alone does not authorize communication.
- **Edit card content** — description, acceptance criteria, labels, priority, and relations may be corrected during specification preparation when the user authorized card refinement and the correction preserves the goal. Record criterion corrections before implementation.
- **Apply retained follow-ups** — after acceptance, apply only previously identified follow-ups whose exact update is already authorized. Introduce no criteria rewrite, new goal, or terminal transition.

Never change an acceptance criterion to match an implementation or change criteria between implementation and acceptance. A mis-worded criterion found during acceptance returns to the user for correction in a later run. Goal changes and readiness/terminal decisions have no automated grant. Report ambiguous correction-versus-goal changes instead of writing them.
