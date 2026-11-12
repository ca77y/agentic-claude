# Board declaration

Configuration does not authorize execution; the user's request does. An operation not bound here has no grant.

## Board

- Tracker, project, and team: Linear, project `Agentic Claude` in team `Smerfy` (`SMR`), <https://linear.app/ca77y/project/agentic-claude-e233525564c3>.
- Access, without credentials: the connected Linear MCP server (`mcp__plugin_linear_linear__*`).

## Operations

- Locate, read, search: `get_issue` by identifier (taken from the URL when only a URL is given), archived cards included, with `includeRelations: true` when dependencies matter; `list_issues` with `project: "Agentic Claude"` and `query`, `state`, `label`, or `priority`; for duplicates, `list_issues` with `project: "Agentic Claude"`, `includeArchived: true`, no `query` (it misses archived cards), and `limit: 250`, passing the returned `cursor` until `hasNextPage` is false, then comparing titles.
- Create, with initial status: `save_issue` with `team: "Smerfy"`, `project: "Agentic Claude"`, `state: "Backlog"`.
- Transition: `save_issue` with the issue `id` and target `state`.
- Update content and relations: `save_issue` with the issue `id` and only the changed fields; `addLabels`/`removeLabels` change labels, and `removeBlockedBy`/`removeBlocks` remove relations.
- Attach a PR: `save_issue` with the issue `id` and `links: [{url, title}]`, using the URL the PR creation returned and the PR title.
- Comment: `save_comment` with `issueId` and a Markdown `body`.

## Cards

- Identity and spec naming: the issue identifier (`SMR-200`), shared by board, branch, PR, and spec. A spec is a folder, `docs/specs/<lowercase identifier>-<slug>/`, for example `docs/specs/smr-200-card-content-access/`.
- Type and priority: exactly one of the labels `Bug`, `Improvement`, `Feature`; priority `1` Urgent, `2` High, `3` Medium, `4` Low.
- Deliverable: the label `Deliverable` marks a card as written by the shaping process, and is added when that process files or updates it. Only a card with this label can go through a full story delivery.
- Unreproducible: the label `Unreproducible` marks a Bug card whose bug an automated fix could not reproduce.
- Card, spec, and docs: a card holds the why and the what; a spec holds the how for one unit of work, is written and read by agents, stays in the repository as context for later failures, and is never kept current; humans compact or remove it. Durable knowledge belongs in `docs/`, outside `docs/specs/`.
- Kinds of work: a story changes code and ends in a PR; a spike answers an open question and ends in a PR that adds its findings document; any prototype it builds is throwaway and never merged.
- Dependencies: Linear blocking relations (`blockedBy`, `blocks`). No sub-issues: one story is one issue and one PR.
- Story format: the title is an action-verb story title; the description is a summary paragraph, then only the applicable sections of `## Why`, `## Scope`, `## Out of scope`, `## Acceptance criteria`, `## Assumptions`, `## Open questions`, `## References`, with no `#` heading. Acceptance criteria are one observable behavior per line. Linear rewrites `-` bullets to `*` and wraps bare URLs in `<…>` on save; that is not a content change.
- Bug format: the title names the failure as a user meets it; the description is `## Observed`, `## Expected`, `## Steps`, then `## Assumptions`, `## Open questions`, and `## References` when they apply, with no `#` heading.
- Spike format: the title is the question, short; the description is `## Question`, `## What counts as an answer`, then `## Conditions`, `## Assumptions`, `## Open questions`, and `## References` when they apply, with no `#` heading.

## Statuses

- Statuses: `Backlog`, `Todo`, `In Progress`, `In Review`, `Done`, `Canceled`, `Duplicate`.
- User-owned decisions: readiness outside delivery (`Backlog` → `Todo`), `Done`, `Canceled`, `Duplicate`, and changes to a card's goal.

## Delivery

- When delivery starts: from `Backlog` or `Todo`, move the card to `In Progress`; asking for delivery is the user's readiness decision. In any other status, leave it, and report a card in `Done`, `Canceled`, or `Duplicate`. An archived card (`archivedAt` set) gets no card write during the delivery; report it. A full story delivery refuses a card without the `Deliverable` label; the short flow for trivial stories and bugs refuses none.
- When the PR opens: attach the PR.
- When the PR's review is clean: move the card to `In Review` only if it is `In Progress`.
- On a later round: no card operation.

## Other conditions

- Filing a card: only when the user asks for it.
- Editing card content: only when the user asks for it, and never changing the goal. A wrong criterion is corrected in the spec, not on the card.
- Comments: only a message the user asks for.

Never rewrite an acceptance criterion to match an implementation.
