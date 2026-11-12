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
- Create: write `.board/STORY-<n>.md`, `n` one more than the highest existing card number (starting at 1), with a `Status: Backlog` line under the title.
- Update content and labels: rewrite the card file; labels are one `Labels:` line under the status line, comma-separated.
- Transition: rewrite the card's `Status:` line.
- Attach a PR: add a `PR: <path>` line under the status line.

## Cards

- Identity and spec naming: the file name without `.md` (`STORY-1`); a spec is `docs/specs/<lowercase identifier>-<slug>.md`.
- Story format: `# <title>`, the status and labels lines, a summary paragraph, then `## Why`, `## Scope`, `## Out of scope`, `## Acceptance criteria`, and `## Assumptions`, `## Open questions`, `## References` when they apply.
- Bug format: `# <title>`, the status and labels lines, then `## Observed`, `## Expected`, `## Steps`, and `## Assumptions`, `## Open questions`, `## References` when they apply.
- Spike format: `# <title>`, the status and labels lines, then `## Question`, `## What counts as an answer`, and `## Conditions`, `## Assumptions`, `## Open questions`, `## References` when they apply.
- Deliverable: the label `Deliverable` marks a story card the shaping process wrote with no open question.

## Delivery

- When delivery starts: set `Status: In Progress`. When the PR opens: attach it and set `Status: In Review`.

Never rewrite an acceptance criterion to match an implementation.
MD
cat > TESTING.md <<'MD'
# Testing

## Platform

cli

## Checks

- Unit tests: `python3 -m unittest`

## Categories

### Library

- Covers: the functions in `calc.py`.
- Validation path: call the function with `python3 -c` and compare its output.
- Required evidence: the command and its output.
- When a criterion in this category can't be verified, the pull request is `ready` or stays `draft`: draft

### Uncategorized

When a criterion fits no category, the pull request is `ready` or stays `draft`: draft
MD
cat > docs/FORGE.md <<'MD'
# Forge declaration

Configuration does not authorize execution; the user's request does.

No forge: there is no remote, and no branch, push, pull request, or review operation. Work stays in the main checkout, uncommitted.
MD
printf '.worktrees/\n/.tmp/\n/.forge/\n/.board/\n__pycache__/\n' > .gitignore
git add -A
git commit -qm "chore: seed"
