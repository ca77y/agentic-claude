#!/bin/sh
# Seed a git repo with board and forge declarations, a resolved library scaffold that allows
# only local sources, and one source file. The library tree comes from the bundled resources.
set -e
here=$(cd "$(dirname "$0")" && pwd)
resources="$here/../../skills/bootstrap/resources"
if [ ! -d "$resources/library" ] && [ -n "${CLAUDE_PLUGIN_ROOT:-}" ]; then
  resources="$CLAUDE_PLUGIN_ROOT/skills/bootstrap/resources"
fi
[ -d "$resources/library" ] || { echo "library resources not found from $here" >&2; exit 1; }

git init -q -b main
git config user.email eval@example.com
git config user.name eval

mkdir -p docs/specs docs/spikes
cat > docs/BOARD.md <<'MD'
# Board declaration

No board: there are no card operations. Acceptance comes from the user's request.
MD
git init -q --bare .forge/remote.git
git remote add origin "$PWD/.forge/remote.git"
cat > TESTING.md <<'MD'
# Testing

## Checks

None.

## Categories

### Uncategorized

When a criterion fits no category, the pull request is `ready` or stays `draft`: draft
MD
cat > docs/FORGE.md <<'MD'
# Forge declaration

Configuration does not authorize execution; the user's request does.

## Repository

- Paths in this declaration are relative to the main checkout root, never to a worktree.
- Remote and permitted push destinations: `origin`, the local bare repository `.forge/remote.git`; only the research branch is pushed.
- Forge: a local stub. A pull request is the file `.forge/prs/smoke.md`.
- Target branch and its protection: `main`; automated work never commits to it.

## Workspace

- Branch name: `research/smoke`. Worktree: `.worktrees/smoke`, created with `git worktree add .worktrees/smoke -b research/smoke main`, or `git worktree add .worktrees/smoke research/smoke` when the branch exists.

## Commits and push

- Commit convention: Conventional Commits. Push with `git -C <worktree> push -u origin research/smoke`, then `git -C <worktree> push` each later round.

## Pull request

- Create or update: write `.forge/prs/smoke.md` with `# <title>` and the body the workflow renders, under a `Draft: yes` line while it's a draft; marking it ready removes that line.
- Review trigger and status: none.

## Restrictions

- Never merge, force-push, or rewrite history.
MD

cp -R "$resources/library" library
today=$(date +%Y-%m-%d)
for f in $(find library -type f -name '*.md'); do
  sed \
    -e "s|{{PROJECT_NAME}}|Eval Project|g" \
    -e "s|{{TODAY}}|$today|g" \
    -e "s|{{DOMAIN_ONE_LINER}}|Evidence about request rate limiting.|g" \
    -e 's|{{SOURCE_PROVIDER_GUIDANCE}}|Source provider: local files under `sources/`; no internet. Read them with the file tools and cite them by path.|g' \
    -e 's|{{DOMAIN_TAGS}}|<!-- Domain tags start empty. -->|g' \
    "$f" > "$f.tmp"
  mv "$f.tmp" "$f"
done

mkdir -p sources
cat > sources/token-bucket.md <<'MD'
# Token bucket

A token bucket holds up to 40 tokens and gains 5 tokens per second. Each request removes one token. A request that finds the bucket empty is rejected with HTTP 429, so a client can burst up to 40 requests and then sustain 5 requests per second.
MD

printf '.worktrees/\n/.tmp/\n/.forge/\n' > .gitignore
git add -A
git commit -qm "chore: seed"
