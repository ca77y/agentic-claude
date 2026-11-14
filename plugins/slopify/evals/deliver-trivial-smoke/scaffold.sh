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
    def test_zero(self):
        self.assertEqual(add(0, 0), 0)


if __name__ == "__main__":
    unittest.main()
PY
mkdir -p docs/specs
cat > TESTING.md <<'MD'
# Testing

## Platform

cli

## Tools

Python 3, already installed.

## Setup

Nothing to install.

## Boot

Nothing to boot: `calc.py` is a module.

## Checks

- Unit tests: `python3 -m unittest`

## Categories

### Library

- Covers: `calc.py`.
- Validation path: run `python3 -m unittest` and call the function with `python3 -c`.
- Required evidence: the command's output.
- When a criterion in this category can't be verified, the pull request is `ready` or stays `draft`: draft

### Uncategorized

When a criterion fits no category, the pull request is `ready` or stays `draft`: draft

## Flows

None.

## Evidence

Under `.tmp/evidence/`.

## Blind spots

None.
MD
mkdir -p .board
cat > docs/BOARD.md <<'MD'
# Board declaration

Configuration does not authorize execution; the user's request does.

## Board

- Paths in this declaration are relative to the main checkout root, never to a worktree.
- Tracker: local Markdown cards, one file per card under `.board/`.

## Operations

- Locate, read, search: read and search `.board/*.md`.
- Create: write `.board/<TYPE>-<n>.md`, where `<TYPE>` is the card's type in capitals (`STORY`, `BUG`, `SPIKE`, `RESEARCH`) and `n` is one more than the highest existing number for that type (starting at 1), with a `Status: Todo` line under the title.
- Update content and labels: rewrite the card file; labels are one `Labels:` line under the status line, comma-separated.
- Transition: rewrite the card's `Status:` line.
- Attach a PR: add a `PR: <path>` line under the status line.
- Comment: append a `## Comments` section, or a paragraph to it.

## Cards

- Identity and spec naming: the file name without `.md` (`STORY-1`); a spec is the folder `docs/specs/<lowercase identifier>-<slug>/`.
- Story format: `# <title>`, the status and labels lines, a summary paragraph, then `## Why`, `## Scope`, `## Out of scope`, `## Acceptance criteria`, and `## Assumptions`, `## Open questions`, `## References` when they apply.
- Bug format: `# <title>`, the status and labels lines, then `## Observed`, `## Expected`, `## Steps`, and `## Assumptions`, `## Open questions`, `## References` when they apply.
- Spike and research format: `# <title>`, the status and labels lines, then `## Question`, `## What counts as an answer`, and `## Conditions`, `## Assumptions`, `## Open questions`, `## References` when they apply.

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

- Branch name: `fix/smoke`. Story worktree: `.worktrees/smoke`, created with `git worktree add .worktrees/smoke -b fix/smoke main`, or `git worktree add .worktrees/smoke fix/smoke` when the branch exists.

## Commits and push

- Commit convention: Conventional Commits. Push with `git -C <worktree> push -u origin fix/smoke`, then `git -C <worktree> push` each later round.

## Pull request

- Create or update: write `.forge/prs/smoke.md` with `# <title>` and the body the delivery renders, under a `Draft: yes` line while it's a draft; marking it ready removes that line.
- Review trigger and status: none.

## Restrictions

- Never merge, force-push, or rewrite history.
MD
printf '.worktrees/\n/.tmp/\n/.forge/\n/.board/\n__pycache__/\n' > .gitignore
git add -A
GIT_AUTHOR_DATE=2026-01-01T00:00:00Z GIT_COMMITTER_DATE=2026-01-01T00:00:00Z git commit -qm "chore: seed"
