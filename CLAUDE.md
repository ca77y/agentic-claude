# Working on agentic-slop

Notes for editing **this toolkit repo**. The plugins discover everything from their target project's context — this file is for maintaining the repo, not for runtime agent behavior.

## Layout

- `.claude-plugin/marketplace.json` is the marketplace catalog.
- `plugins/slop-eng/` holds the delivery skills (`shape`, `deliver`, `bootstrap`) and agents (`coder`, `writer`, `qa`, `auditor`).
- `plugins/slop-lib/` holds the research-library skills (`research`, `ask`, `bootstrap`), agents (`researcher`, `librarian`, `scribe`, `clerk`), and the library scaffold resources.
- `docs/` holds this repo's own board and forge declarations, known issues, and specs.

## Editing rules

- Keep each plugin name identical across its folder, marketplace entry, and both manifests.
- Put every user-callable workflow and orchestrator in `skills/<name>/SKILL.md`. Orchestration runs in the main session; every agent is a leaf that never dispatches another (see [`docs/issues/nested-subagent-result-routing.md`](docs/issues/nested-subagent-result-routing.md)).
- Put a leaf agent's core procedure in `agents/<role>.md` and list it in `.claude-plugin/plugin.json`. Agent frontmatter carries `name` and `description` only — **no `model` or `effort`**: the orchestrator passes the model on every dispatch, and a pinned model would silently override complexity routing.
- Simplify the normal workflow. Put edge cases and mode-specific detail in references with explicit read conditions; never load every reference by default. Add machinery only when a simpler procedure cannot preserve the required behavior.
- Agent references live at the plugin root, `plugins/<plugin>/references/<role>-<topic>.md`, addressed from the agent body as `${CLAUDE_PLUGIN_ROOT}/references/<file>.md` — never under `agents/`, which the harness scans for definitions. Skill references and assets live beside the skill and are addressed from `SKILL.md` as `${CLAUDE_SKILL_DIR}/…`; a skill using another skill's file addresses it as `${CLAUDE_PLUGIN_ROOT}/skills/<skill>/…`.
- The harness substitutes those placeholders only in a loaded `SKILL.md` or agent body. Inside a reference or asset file, link with a path relative to that file, never a placeholder.
- Orchestrators dispatch the plugin-qualified agent name (`slop-eng:qa`), never a generic agent standing in for a missing role. Every validation is a fresh `Agent` dispatch; `SendMessage` continues production work only.
- Add code comments only when the code cannot explain the behavior or rationale itself.
- Keep documentation focused on the system as it exists now. It may briefly identify gaps or future plans, but it is neither a historical record nor a record of the discussions behind a decision.

## Upstream: the Codex build

`/Users/catty/Workspace/agentic-codex` is the Codex-native build of the same toolkit and the design source for this one. When porting its changes, Codex wins on any discrepancy in behavior; only harness mechanics are translated: `spawn_agent`/`fork_turns: "none"` → a fresh `Agent` dispatch, `followup_task` → `SendMessage`, `wait_agent` → the completion notification, and the GPT-6 Luna/Sol/Astra matrix → `haiku`/`sonnet`/`opus` with the effort column dropped. Codex's `install-subagents` skill has no equivalent here, because Claude Code plugins ship their agents directly. Two Claude-only features are kept deliberately: the `--fast` flag on `deliver` and `shape`, and the `deliver` review loop that fires the declared review after opening the PR and after each repair push.

## Worktrees

Where story worktrees live, what they branch off, and how they are named is this repo's own [`docs/FORGE.md`](docs/FORGE.md) — the same declaration `deliver` reads. In summary: `.worktrees/<branch>` at the repo root (gitignored), one story branch per worktree off `master`, ledgers under `.tmp/ledgers/`, and the worktree and branch removed by the human once the PR merges. Where this summary and the declaration disagree, the declaration is right.

Address a worktree by its absolute path — git calls carry `-C <path>`, file tools take absolute paths. Do not use `EnterWorktree`'s `name` form: it creates a second worktree on a new branch under `.claude/worktrees/`. Where the harness requires isolation before writes, enter the existing worktree by `path`.

This repo has no install or bootstrap step (no `package.json`, no lockfile), so a story worktree here needs no dependency provisioning.

## Two plugins — keep the cross-plugin edge soft

The plugins install independently, and **no plugin manifest can declare a dependency on another plugin** — so the only thing keeping that true is how the definitions are written:

- `slop-lib` must never dispatch or assume a `slop-eng` agent or skill.
- Every `slop-eng` → `slop-lib` dispatch must **degrade**: the caller needs a documented fallback and must report having used it. Today there is exactly one such edge — `shape` optionally using `slop-lib:librarian`.

Moving an agent between plugins means rewriting every `slop-<plugin>:<agent>` string that names it. This should print nothing:

```bash
grep -rn 'slop-eng:\(researcher\|librarian\|scribe\|clerk\|research\|ask\)' plugins/
grep -rn 'slop-lib:\(coder\|writer\|qa\|auditor\|shape\|deliver\)' plugins/
```

## Board and forge are declared, never hardcoded

No agent or skill may name a tracker, card path, status value, card field, remote, target branch, branch pattern, commit convention, forge CLI, or review trigger as a fact about "the project". All of it comes from the target project's `docs/BOARD.md` and `docs/FORGE.md`, read at those fixed paths; the `bootstrap` skill authors them from its templates. Configuration never authorizes execution — authority comes from the user's actual request and the declaration's operation conditions. Treat any concrete tracker or forge detail in `plugins/` as a bug unless it is framed as an example. These should print nothing:

```bash
grep -rnE '@review|@codex|`gh`|gh pr |origin/|mcp__plugin_linear' plugins/
grep -rnE '\b(master|trunk)\b|branch `main`' plugins/ | grep -v 'including master'
```

## Checks before pushing

Every agent and skill pointer must resolve, and no agent may pin a model. Both should print only `ok` lines:

```bash
grep -rnoE '\$\{CLAUDE_(PLUGIN_ROOT|SKILL_DIR)\}/[A-Za-z0-9_./-]+\.md' plugins/ \
| while IFS=: read -r file _ ref; do
    plugin=$(echo "$file" | sed -E 's#^(plugins/[^/]+)/.*#\1#')
    skill=$(echo "$file" | sed -E 's#^(.*/skills/[^/]+)/.*#\1#')
    target=$(echo "$ref" | sed -e "s#\${CLAUDE_PLUGIN_ROOT}#$plugin#" -e "s#\${CLAUDE_SKILL_DIR}#$skill#")
    [ -f "$target" ] && echo "ok    $file -> $target" || echo "MISSING $file -> $target"
  done
for f in plugins/*/agents/*.md; do
  awk '/^---$/{c++; next} c==1' "$f" | grep -qE '^(model|effort):' && echo "PINNED $f" || echo "ok    $f"
done
```

The validator contract is repeated verbatim across the three validators, because there is no shared include for `.md` definitions. Edit every copy together; this should print `1`:

```bash
for f in plugins/slop-eng/agents/{auditor,qa}.md plugins/slop-lib/agents/clerk.md; do
  awk '/^## Fresh report-only contract$/{f=1;next} /^## /{f=0} f' "$f" | shasum
done | sort -u | wc -l
```

## Version management is a manual human process

Bumping any plugin's `version` is **a deliberate human decision, never an automated step.** Do not change a version — in either manifest — unless the human has **explicitly requested that version bump in this session.** Shipping a feature, fix, or refactor does not on its own justify a bump.

## When a version bump *is* requested: both manifests must agree

Every plugin ships **two** manifests that must always carry the same `version`: `plugins/<plugin>/plugin.json` (root, mirrors the Claude one) and `plugins/<plugin>/.claude-plugin/plugin.json`. Verify both match before you push; every plugin should print `ok`:

```bash
for d in plugins/*/; do
  r=$(python3 -c "import json;print(json.load(open('${d}plugin.json'))['version'])")
  c=$(python3 -c "import json;print(json.load(open('${d}.claude-plugin/plugin.json'))['version'])")
  [ "$r" = "$c" ] && echo "ok    ${d%/}  $r" || echo "DRIFT ${d%/}  root=$r  claude=$c"
done
```
