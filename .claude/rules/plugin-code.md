---
paths:
  - "src/**/*.ts"
  - "scripts/**/*.ts"
  - "test/**/*.ts"
---

# Plugin code

- Match the surrounding code: its naming, comment density, and idiom.
- Name things so the code explains itself. Write a comment only when it can't.
- Don't copy logic; extract what two places share. `npm run lint:dup` (jscpd over `src/`, `scripts/`, and `test/`) enforces this.
- A comment explains why the code is the way it is. It never records history or review rounds.
- When code consumes an agent's output, give that output a typed schema field rather than parsing prose.
- Remove dead code and values that nothing reads.
- When a change alters a decision in `docs/DESIGN.md`, update it in the same change.
