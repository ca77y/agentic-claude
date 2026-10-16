#!/bin/sh
set -e
git init -q -b main
git config user.email eval@example.com
git config user.name eval
here=$(cd "$(dirname "$0")" && pwd)
resources="$here/../../skills/bootstrap/resources"
if [ ! -d "$resources/library" ] && [ -n "${CLAUDE_PLUGIN_ROOT:-}" ]; then
  resources="$CLAUDE_PLUGIN_ROOT/skills/bootstrap/resources"
fi
[ -d "$resources/library" ] || { echo "library resources not found from $here" >&2; exit 1; }
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

- Branch name: `story/smoke`. Story worktree: `.worktrees/smoke`, created with `git worktree add .worktrees/smoke -b story/smoke main`, or `git worktree add .worktrees/smoke story/smoke` when the branch exists.
- Spike prototypes: the local branch `spike/<slug>` and the worktree `.worktrees/spike-<slug>`, from the spike's slug; the prototype is never pushed, and deleting a never-pushed prototype is allowed.
- Temp folder: `.tmp/` at the root of each checkout, ignored.

## Commits and push

- Commit convention: Conventional Commits. Push with `git -C <worktree> push -u origin story/smoke` once the gates pass, and `git -C <worktree> push` after each verified repair.

## Pull request

- Create or update: write `.forge/prs/smoke.md` with `# <title>`, then `## Summary`, `## Spec`, `## Verification`; a repair appends `## Repair <n>`.
- Review trigger and status: none.

## Restrictions

- Never merge, force-push, or rewrite history.
- Deleting the spike's own unpushed prototype branch and worktree is allowed.
MD
cp -R "$resources/library" library
today=$(date +%Y-%m-%d)
for f in $(find library -type f -name '*.md'); do
  sed \
    -e "s|{{PROJECT_NAME}}|Eval Project|g" \
    -e "s|{{TODAY}}|$today|g" \
    -e "s|{{DOMAIN_ONE_LINER}}|Evidence about Python performance.|g" \
    -e 's|{{SOURCE_PROVIDER_GUIDANCE}}|Source provider: local files under `sources/`; no internet. Read them with the file tools and cite them by path.|g' \
    -e 's|{{DOMAIN_TAGS}}|<!-- Domain tags start empty. -->|g' \
    "$f" > "$f.tmp"
  mv "$f.tmp" "$f"
done

mkdir -p sources
cat > sources/python-call-rate.md <<'MD'
# Python call rate

On a current laptop, CPython 3 runs a loop that calls a small pure-Python function on the order of 10 million times per second. The rate varies with the machine and the Python build, so a claim about a specific machine needs a measurement on that machine.
MD
printf '.worktrees/\n/.tmp/\n/.forge/\n/.board/\n__pycache__/\n' > .gitignore
git add -A
git commit -qm "chore: seed"
