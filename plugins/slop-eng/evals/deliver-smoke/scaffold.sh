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
cat > docs/BOARD.md <<'MD'
# Board declaration

No board: there are no card operations. Acceptance comes from the user's request.
MD
cat > docs/FORGE.md <<'MD'
# Forge declaration

Configuration does not authorize execution; the user's request does.

## Repository

- Remote and permitted push destinations: none; this repository is local only.
- Forge: none. Hosted pull requests and reviews are unsupported.
- Target branch and its protection: `main`; automated work never commits to it.

## Workspace

- Branch name: `fix/<slug>`.
- Story worktree path and its ignore rule: `.worktrees/<slug>`, ignored by `.gitignore`.
- Temp folder: `.tmp/` at the root of each checkout, ignored. The delivery ledger is `.tmp/ledger.md` in the story worktree.
- Cleanup after merge: the user.

## Commits and push

- Commit convention: Conventional Commits.
- When to push: never; there is no remote.

## Pull request

- Unsupported. Delivery ends with the verified commit on the story branch.

## Restrictions

- Never merge, force-push, or rewrite history.
MD
printf '.worktrees/\n/.tmp/\n__pycache__/\n' > .gitignore
git add -A
git commit -qm "chore: seed"
