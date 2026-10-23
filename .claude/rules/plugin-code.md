---
paths:
  - "src/**/*.ts"
  - "scripts/**/*.ts"
  - "test/**/*.ts"
---

# Plugin code

- Match the surrounding code: its naming, comment density, and idiom.
- A comment explains why the code is the way it is. It never records history or review rounds.
- When code consumes an agent's output, give that output a typed schema field rather than parsing prose.
- Remove dead code and values that nothing reads.
- Follow `docs/ARCHITECTURE.md`. When a change alters a decision in `docs/DESIGN.md`, update it in the same change.
