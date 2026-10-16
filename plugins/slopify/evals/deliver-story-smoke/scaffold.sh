#!/bin/sh
set -e
git init -q -b main
git config user.email eval@example.com
git config user.name eval
git init -q --bare .forge/remote.git
git remote add origin "$PWD/.forge/remote.git"
cat > calc.py <<'PY'
def add(a, b):
    return a + b
PY
cat > test_calc.py <<'PY'
import unittest
from calc import add


class AddTest(unittest.TestCase):
    def test_small(self):
        self.assertEqual(add(2, 2), 4)


if __name__ == "__main__":
    unittest.main()
PY
mkdir -p docs/specs
mkdir -p .board
cat > .board/STORY-1.md <<'MD'
# Add mul to calc.py

Status: Todo
Label: Feature

## Why

Users of `calc.py` can add two numbers but cannot multiply them.

## Scope

- Add a function `mul(a, b)` to `calc.py` that returns the product of its two arguments.

## Out of scope

- Any change to `add`.

## Acceptance criteria

- `mul(3, 4)` returns 12.
- A unit test covers `mul`.
MD
cat > docs/BOARD.md <<'MD'
# Board declaration

Configuration does not authorize execution; the user's request does.

## Board

- Paths in this declaration are relative to the main checkout root, never to a worktree.
- Tracker: local Markdown cards, one file per card under `.board/`.

## Operations

- Locate, read, search: read and search `.board/*.md`.
- Create: write `.board/BUG-<n>.md` for a bug, `n` one more than the highest existing bug number (starting at 1), with `Status: Backlog` and `Label: Bug` lines under the title.
- Transition: rewrite the card's `Status:` line.
- Attach a PR: add a `PR: <path>` line under the status line.

## Cards

- Identity and spec naming: the file name without `.md` (`STORY-1`); a spec is `docs/specs/<lowercase identifier>-<slug>.md`.
- Body: `# <title>`, the status and label lines, then the applicable sections of `## Why`, `## Scope`, `## Out of scope`, `## Acceptance criteria`, or for a bug `## Evidence`, `## Steps to reproduce`, `## Expected`, `## Observed`.

## Delivery

- When delivery starts: set `Status: In Progress`. When the PR opens: attach it and set `Status: In Review`.

Never rewrite an acceptance criterion to match an implementation.
MD
cat > docs/FORGE.md <<'MD'
# Forge declaration

Configuration does not authorize execution; the user's request does.

## Repository

- Paths in this declaration are relative to the main checkout root, never to a worktree.
- Remote and permitted push destinations: `origin`, the local bare repository `.forge/remote.git`; only the story branch is pushed.
- Forge: a local stub. A pull request is the file `.forge/prs/smoke.md`.
- Target branch and its protection: `main`; automated work never commits to it.

## Workspace

- Branch name: `feat/smoke`. Story worktree: `.worktrees/smoke`, created with `git worktree add .worktrees/smoke -b feat/smoke main`, or `git worktree add .worktrees/smoke feat/smoke` when the branch exists.
- Temp folder: `.tmp/` at the root of each checkout, ignored.

## Commits and push

- Commit convention: Conventional Commits. Push with `git -C <worktree> push -u origin feat/smoke` once the gates pass, and `git -C <worktree> push` after each verified repair.

## Pull request

- Create or update: write `.forge/prs/smoke.md` with `# <title>`, then `## Summary`, `## Spec`, `## Verification`; a repair appends `## Repair <n>`.
- Review trigger and status: none.

## Restrictions

- Never merge, force-push, or rewrite history.
MD
printf '.worktrees/\n/.tmp/\n/.forge/\n/.board/\n__pycache__/\n' > .gitignore
git add -A
git commit -qm "chore: seed"
