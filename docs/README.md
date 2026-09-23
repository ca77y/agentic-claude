# Engineering docs

Durable engineering knowledge for `agentic-slop`. Toolkit usage stays in the root [`README.md`](../README.md); repo-maintenance rules stay in the root [`CLAUDE.md`](../CLAUDE.md).

## Layout

- `BOARD.md` — how this repo's board is reached and what may be written to it; read directly, at this fixed path
- `FORGE.md` — how this repo branches, commits, publishes, and is reviewed; read directly, at this fixed path
- `issues/` — known problems with no identified solution on our side
- `specs/` — durable specs for in-flight or recent units of work

## Rules

- Keep documentation focused on the system as it exists now. It may briefly name gaps or plans, but it is not a history of the discussions behind a decision.
- The agent and skill definitions under `plugins/` are the product. Prose about how a role should behave belongs in its definition, not here.
- Record a problem in `issues/` only when it is real but no solution could be identified on our side: what was investigated, the evidence, and what would unblock it. Once a fix becomes identifiable, file it on the board instead.
