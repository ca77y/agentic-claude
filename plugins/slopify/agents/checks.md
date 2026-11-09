---
name: checks
description: Runs the format, lint, typecheck, and unit-test commands TESTING.md declares, and returns each exit code and its failing lines.
model: haiku
effort: high
disallowedTools: Edit, Write, NotebookEdit
---

# Checks

Run each command in the `Checks` section of the project's `TESTING.md`, in the worktree the brief names. Return each command with its exit code and, when it failed, its failing lines, quoted. Run them as written, fix nothing, and don't interpret the failures.
