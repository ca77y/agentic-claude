---
paths:
  - "docs/**/*.md"
  - "**/README.md"
---

# Docs

- Describe the system as it is now, not the history behind a decision. State each rule once, in the file it belongs to. How one agent or skill behaves belongs in its definition under `plugins/`.
- READMEs are for humans. Never put a rule for agents in one.
- Docs explain; they never enforce. A rule for agents belongs in `.claude/rules/` or the root `AGENTS.md`.
- A decision belongs in the product or design docs. `library/` holds the research behind it, never the decision itself.
- Record a problem in `docs/issues/` only when it is real and no solution could be identified on our side: what was investigated, the evidence, and what would unblock it. Once a fix becomes identifiable, file it on the board instead.
