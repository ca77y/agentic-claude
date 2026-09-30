# Working on agentic-slop

This repo is the source of two Claude Code plugins, `slop-eng` and `slop-lib`. Work on `master`; only `deliver` uses a worktree, as `docs/FORGE.md` declares.

## Writing plugin text

- Keep rules minimal, concise, and about the current state only. Give each skill or agent only the context its job needs.
- Skills (`skills/<name>/SKILL.md`) orchestrate from the main session. Agents (`agents/<role>.md`) are leaves that dispatch nothing but the built-in `Explore` agent; see [`docs/issues/nested-subagent-result-routing.md`](docs/issues/nested-subagent-result-routing.md).
- Put conditional detail in references: an agent's in `plugins/<plugin>/references/`, a skill's beside its `SKILL.md`. Point to them with `${CLAUDE_PLUGIN_ROOT}/…` or `${CLAUDE_SKILL_DIR}/…` from a `SKILL.md` or agent body, and with relative paths from inside a reference, where placeholders are not substituted.
- Never hardcode a tracker, forge, branch, commit convention, or review trigger; every one comes from the target project's `docs/BOARD.md` and `docs/FORGE.md`.
- `slop-lib` never names a `slop-eng` skill or agent. `slop-eng` uses `slop-lib` only with a fallback that it reports, and neither manifest declares a dependency, so each plugin installs alone.
- `qa`, `auditor`, and `clerk` share their "Fresh report-only contract" section word for word; edit all three together.

## Checks

Enable the pre-commit hook once per clone with `git config core.hooksPath .githooks`; it formats staged Markdown, JSON, and YAML with Prettier and validates both plugins and the marketplace.

These print nothing when the plugins are consistent, except the last command, which prints `1`:

```bash
grep -rn 'slop-eng:\(researcher\|librarian\|scribe\|clerk\|research\|ask\|lint\)' plugins/
grep -rn 'slop-lib:\(coder\|writer\|qa\|auditor\|shape\|deliver\)' plugins/
grep -rnE '@review|@codex|`gh`|gh pr |origin/|mcp__plugin_linear' plugins/
grep -rnE '\b(master|trunk)\b|branch `main`' plugins/
grep -rnoE '\$\{CLAUDE_(PLUGIN_ROOT|SKILL_DIR)\}/[A-Za-z0-9_./-]+\.md' plugins/ | while IFS=: read -r file _ ref; do
  plugin=$(echo "$file" | sed -E 's#^(plugins/[^/]+)/.*#\1#')
  skill=$(echo "$file" | sed -E 's#^(.*/skills/[^/]+)/.*#\1#')
  target=$(echo "$ref" | sed -e "s#\${CLAUDE_PLUGIN_ROOT}#$plugin#" -e "s#\${CLAUDE_SKILL_DIR}#$skill#")
  [ -f "$target" ] || echo "MISSING $file -> $target"
done
for f in plugins/slop-eng/agents/{auditor,qa}.md plugins/slop-lib/agents/clerk.md; do
  awk '/^## Fresh report-only contract$/{f=1;next} /^## /{f=0} f' "$f" | shasum
done | sort -u | wc -l
```

## Releasing

Run the evals last; they call models, so run them only before a release. Every case must pass:

```bash
for p in plugins/slop-eng plugins/slop-lib; do
  claude plugin eval "$p" --tag trigger --runs 1 --ablation none --trust-plugin
done
claude plugin eval plugins/slop-eng --tag smoke --allow-tools Bash Write Edit Agent --scaffold --ablation none --trust-plugin
```

Change a plugin's `version` in `.claude-plugin/plugin.json` only when the user asks for that bump.
