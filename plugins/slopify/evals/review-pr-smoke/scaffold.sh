#!/bin/sh
set -e
git init -q -b main
git config user.email eval@example.com
git config user.name eval
git init -q --bare .forge/remote.git
git remote add origin "$PWD/.forge/remote.git"
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
mkdir -p docs
cat > docs/BOARD.md <<'MD'
# Board declaration

No board: there are no card operations. Acceptance comes from the user's request.
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
- Temp folder: `.tmp/` at the root of each checkout, ignored.

## Commits and push

- Commit convention: Conventional Commits. Push with `git -C <worktree> push -u origin fix/smoke` once the gates pass, and `git -C <worktree> push` after each verified repair.

## Pull request

- Create or update: write `.forge/prs/smoke.md` with `# <title>`, then `## Summary`, `## Spec`, `## Verification`; a repair appends `## Repair <n>`.
- Review trigger: opening the PR requested review 1; re-fire review `n` by creating `.forge/reviews/smoke-<n>.requested`.
- Review status: review `n` has finished when `.forge/reviews/smoke-<n>.md` exists, and its findings are that file's list items. Poll every 10 seconds; a review not finished within 2 minutes of its trigger has timed out.

## Restrictions

- Never merge, force-push, or rewrite history.
MD
printf '.worktrees/\n/.tmp/\n/.forge/\n/.board/\n__pycache__/\n' > .gitignore
git add -A
git commit -qm "chore: seed"
git switch -q -c fix/smoke
cat > calc.py <<'PY'
def add(a, b):
    return a - b


def div(a, b):
    """Return a divided by b as a float."""
    return a // b
PY
git commit -qam "feat: add div"
git push -q -u origin fix/smoke
git switch -q main
git worktree add -q .worktrees/smoke fix/smoke
mkdir -p .forge/prs .forge/reviews
cat > .forge/prs/smoke.md <<'MD'
# feat: add div

## Summary

Adds `div(a, b)` to `calc.py`.

## Spec

None; acceptance comes from the user's request.

## Verification

Not yet verified.
MD
cat > .forge/reviews/smoke-1.md <<'MD'
# Review 1

- `div` floors the result; its docstring promises true division
- Rename `add` to `plus` for consistency
MD
