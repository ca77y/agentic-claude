# Working on ca77y-agentic

Notes for editing **this toolkit repo**. The plugins themselves discover everything
from their target project's context — this file is for maintaining the repo, not for
runtime agent behavior.

## Worktrees

Story worktrees live in `.worktrees/<branch>` at the repo root (gitignored). One story
branch per worktree, branched off `master`; the root checkout stays on `master` and
never has a story branch checked out. Remove the worktree and its branch once the PR
merges.

Dispatched agents address the worktree by its absolute path, not by cwd: git calls
carry `-C <path>`, and file tools take an absolute path under `<path>`. `EnterWorktree`
is deliberately not used for this — it only accepts worktrees under `.claude/worktrees/`,
not `.worktrees/<branch>` — so do not "fix" the location to match it.

That addressing convention lives as one canonical "Addressing the story worktree."
paragraph duplicated **byte-identically** across five agent files:
`plugins/ca77y-engineering/agents/{lead,coder,writer,qa,auditor}.md`. There is no
shared-include mechanism across agent `.md` files, so the copies are deliberate — but
they carry the same drift hazard as the two manifests below: sharpen the wording in one
and the others silently fall out of sync. **Whenever you edit that paragraph, edit all
five and verify they still match before you push** (this should print `1` — a single
distinct copy across all five files):

```bash
grep -h '^\*\*Addressing the story worktree\.\*\*' \
  plugins/ca77y-engineering/agents/{lead,coder,writer,qa,auditor}.md | sort -u | wc -l
```

## Version management is a manual human process

Bumping any plugin's `version` is **a deliberate human decision, never an automated
step.** Do not change a version — in either manifest — unless the human has
**explicitly requested that version bump in this session.** Shipping a feature, fix,
or refactor does **not** on its own justify a bump: leave the versions untouched and
let the human decide when and to what. Agents (leads included) must not bump versions
as part of finishing a task.

## When a version bump *is* requested: both manifests must agree

Every plugin ships **two** manifests that must always carry the same `version`:

- `plugins/<plugin>/plugin.json` — root manifest (mirrors the Claude one)
- `plugins/<plugin>/.claude-plugin/plugin.json` — Claude

These have silently drifted before (engineering sat at `0.8.3` in the Claude manifest
while the root manifest stayed `0.8.0`). **Whenever you change a version, verify both
manifests of every plugin under `plugins/*` match before you push:**

```bash
for d in plugins/*/; do
  r=$(python3 -c "import json;print(json.load(open('${d}plugin.json'))['version'])")
  c=$(python3 -c "import json;print(json.load(open('${d}.claude-plugin/plugin.json'))['version'])")
  [ "$r" = "$c" ] && echo "ok    ${d%/}  $r" || echo "DRIFT ${d%/}  root=$r  claude=$c"
done
```

Every plugin should print `ok`. Investigate any `DRIFT` line before pushing.
