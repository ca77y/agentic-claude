---
paths:
  - ".github/workflows/*.yml"
---

# GitHub workflows

- Give each job the least `permissions` it needs.
- Pin the Claude Code CLI to an exact version, and actions to a major version or a commit.
- `check.yml` runs `make check` and nothing else; a new fast check goes into the `Makefile`'s `lint` target, so the pre-commit hook and CI both run it. The hook runs `make lint` and never the unit tests, because a delivery commits a failing test before its fix.
- Secrets come from repository secrets, never from the file.
- The review trigger and comment shape in `claude-code-review.yml` are bound by `docs/FORGE.md`; change both together.
