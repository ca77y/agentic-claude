#!/bin/sh
set -e
git init -q -b main
git config user.email eval@example.com
git config user.name eval
cat > calc.py <<'PY'
def add(a, b):
    return a - b
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

No forge: there is no remote, and no branch, push, pull request, or review operation. Work stays in the main checkout, uncommitted.
MD
printf '.worktrees/\n/.tmp/\n/.forge/\n/.board/\n__pycache__/\n' > .gitignore
git add -A
git commit -qm "chore: seed"
