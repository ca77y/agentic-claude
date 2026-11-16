---
paths:
  - "plugins/*/evals/**"
---

# Eval cases

- A case is a folder under `plugins/<plugin>/evals/<name>/` with `case.yaml`, `prompt.md`, `scaffold.sh`, and `graders/`. Keep `name` equal to the folder name.
- `scaffold.sh` builds a throwaway local repository with everything the workflow reads, and never reaches a real tracker or forge.
- A smoke case checks that its workflow starts and reaches its first milestones within ten minutes, and nothing slower.
- Running a case calls models; see the root `AGENTS.md` for when that is allowed.
