# Docs

Engineering documentation for `ca77y-agentic`: product direction, how the plugin is assembled, known issues, active specs, and the story board. Human-facing toolkit usage stays in the root [`README.md`](../README.md); the repo's own maintenance rules (manifest version parity) stay in the root [`CLAUDE.md`](../CLAUDE.md).

## Layout

```text
docs/
|-- PRODUCT.md       # Toolkit intent, boundaries, and direction
|-- ARCHITECTURE.md  # Plugin structure, agent roster, dispatch model
|-- issues/          # Known problems with no identified solution on our side
|-- specs/           # Active specs, one per in-flight unit
|-- tasks/           # Story board
`-- _templates/      # Story, task-card, and spec scaffolds
```

## Rules

- Put a document where its primary purpose lives and cross-link instead of duplicating content.
- Keep product direction in `PRODUCT.md` and the structural model in `ARCHITECTURE.md`.
- The root `README.md` is the user-facing description of every agent. When an agent's behavior changes, update the README — `ARCHITECTURE.md` covers structure, not per-agent prose.
- Specs are temporary implementation contracts. After shipping, fold durable content into `ARCHITECTURE.md` (or `PRODUCT.md` when it changes direction) and the root `README.md`, then remove the spec. Do not archive specs.
- Record a problem in `issues/` only when it is real but no solution could be identified on our side. State what was investigated, the evidence, and what would unblock it. Once a fix becomes identifiable, replace the note with a story in `tasks/`.
- Copy templates from `_templates/`; do not edit a template into a real artifact.
- The agent definitions under `plugins/*/agents/` are the product. Prose about how an agent *should* behave belongs in its definition, not here.
