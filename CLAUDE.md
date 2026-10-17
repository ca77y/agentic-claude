# Working on agentic-slop

This repo is the source of one Claude Code plugin, `slopify`. Work on `master`; only the deliver workflows and `review-pr` use a worktree, as `docs/FORGE.md` declares.

## Writing plugin text

- Keep rules minimal, concise, and about the current state only. Give each skill or agent only the context its job needs.
- Skills (`skills/<name>/SKILL.md`) orchestrate from the main session. Agents (`agents/<role>.md`) are leaves that dispatch nothing but the built-in `Explore` agent; see [`docs/issues/nested-subagent-result-routing.md`](docs/issues/nested-subagent-result-routing.md).
- Workflows (`workflows/<name>.js`) are the only orchestrators: they dispatch every agent by `slopify:<agent>`, dispatch scouts, lenses, and advisors only through the helpers in the shared family-schema block, which every workflow except `research.js` carries byte for byte, and never pass `model` or `effort`. `deliver-story.js` and `deliver-bugfix.js` also carry the deliver-helpers block (`// BEGIN slopify deliver helpers`) byte for byte; step-specific code stays in each script.
- A `scout-*`, `lens-*`, or `advisor-*` agent has exactly one task, has no return format, and gets its schema from the workflow; a new need gets a new agent.
- Only `pusher` commits, pushes, or performs board and forge operations.
- Put conditional detail in references: an agent's in `plugins/slopify/references/`, a skill's beside its `SKILL.md`. Point to them with `${CLAUDE_PLUGIN_ROOT}/…` or `${CLAUDE_SKILL_DIR}/…` from a `SKILL.md` or agent body, and with relative paths from inside a reference, where placeholders are not substituted.
- Never hardcode a tracker, forge, branch, commit convention, or review trigger; every one comes from the target project's `docs/BOARD.md` and `docs/FORGE.md`.
- `qa`, `library-clerk`, `auditor`, and every `lens-*` share their "Report-only contract" section word for word; edit them together.

## Checks

Enable the pre-commit hook once per clone with `git config core.hooksPath .githooks`; it formats staged Markdown, JSON, and YAML with Prettier and validates the plugin and the marketplace.

These print nothing when the plugin is consistent:

````bash
grep -rnE '@review|`gh`|gh pr |origin/|mcp__plugin_linear' plugins/
grep -rnE '\b(master|trunk)\b|branch `main`' plugins/
grep -rnoE '\$\{CLAUDE_(PLUGIN_ROOT|SKILL_DIR)\}/[A-Za-z0-9_./-]+\.md' plugins/ | while IFS=: read -r file _ ref; do
  plugin=$(echo "$file" | sed -E 's#^(plugins/[^/]+)/.*#\1#')
  skill=$(echo "$file" | sed -E 's#^(.*/skills/[^/]+)/.*#\1#')
  target=$(echo "$ref" | sed -e "s#\${CLAUDE_PLUGIN_ROOT}#$plugin#" -e "s#\${CLAUDE_SKILL_DIR}#$skill#")
  [ -f "$target" ] || echo "MISSING $file -> $target"
done
grep -ohE "agentType:[[:space:]]*.slopify:[a-z0-9-]+|\b(scout|lens|advise)\(.(scout|lens|advisor)-[a-z0-9-]+" plugins/slopify/workflows/*.js | sed -E 's/.*(slopify:|\(.)//' | sort -u | while read -r name; do
  [ -f "plugins/slopify/agents/$name.md" ] || echo "MISSING agent $name"
done
grep -ohE "workflow\(.slopify:[a-z0-9-]+" plugins/slopify/workflows/*.js | sed 's/.*slopify://' | sort -u | while read -r name; do
  [ -f "plugins/slopify/workflows/$name.js" ] || echo "MISSING workflow $name"
done
grep -nE "agentType:[[:space:]]*.slopify:(scout|lens|advisor)-|\b(model|effort):|slopify:auditor" plugins/slopify/workflows/*.js
grep -nE '^(## )?Return|^```' plugins/slopify/agents/scout-*.md plugins/slopify/agents/lens-*.md plugins/slopify/agents/advisor-*.md
block() { awk '/^\/\/ BEGIN slopify family schemas$/{f=1} f; /^\/\/ END slopify family schemas$/{f=0}' "$1"; }
ref=$(block plugins/slopify/workflows/shape.js)
[ -n "$ref" ] || echo "MISSING schema block plugins/slopify/workflows/shape.js"
for f in plugins/slopify/workflows/*.js; do
  [ "$f" = plugins/slopify/workflows/research.js ] || [ "$(block "$f")" = "$ref" ] || echo "SCHEMA DRIFT $f"
done
dblock() { awk '/^\/\/ BEGIN slopify deliver helpers$/{f=1} f; /^\/\/ END slopify deliver helpers$/{f=0}' "$1"; }
ref=$(dblock plugins/slopify/workflows/deliver-story.js)
[ -n "$ref" ] || echo "MISSING deliver helpers block plugins/slopify/workflows/deliver-story.js"
[ "$(dblock plugins/slopify/workflows/deliver-bugfix.js)" = "$ref" ] || echo "DELIVER HELPERS DRIFT plugins/slopify/workflows/deliver-bugfix.js"
contract() { awk '/^## Report-only contract$/{f=1;next} /^## /{f=0} f' "$1"; }
ref=$(contract plugins/slopify/agents/qa.md)
[ -n "$ref" ] || echo "MISSING contract plugins/slopify/agents/qa.md"
for f in plugins/slopify/agents/library-clerk.md plugins/slopify/agents/auditor.md plugins/slopify/agents/lens-*.md; do
  [ "$(contract "$f")" = "$ref" ] || echo "CONTRACT DRIFT $f"
done
fm() { grep -qx "model: $2" "$1" && grep -qx "effort: $3" "$1" || echo "FRONTMATTER $1"; }
nowrite() { grep -qx 'disallowedTools: Edit, Write, NotebookEdit' "$1" && ! grep -q '^tools:' "$1" || echo "WRITE TOOLS $1"; }
for f in plugins/slopify/agents/scout-*.md plugins/slopify/agents/lens-*.md; do fm "$f" haiku high; nowrite "$f"; done
for n in value scope alternatives fit; do fm "plugins/slopify/agents/advisor-$n.md" sonnet medium; done
for n in architecture performance risk security; do fm "plugins/slopify/agents/advisor-$n.md" opus medium; done
for f in plugins/slopify/agents/advisor-*.md; do nowrite "$f"; done
fm plugins/slopify/agents/coder.md opus high; fm plugins/slopify/agents/writer.md opus medium; fm plugins/slopify/agents/qa.md sonnet high
````

## Releasing

Run the evals last; they call models, so run them only before a release. Smoke workflows can outlast a headless session's 10-minute wait for background work, so lift that ceiling. Every case must pass:

```bash
claude plugin eval plugins/slopify --tag trigger --runs 1 --allow-tools Workflow --ablation none --trust-plugin
CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS=0 claude plugin eval plugins/slopify --tag smoke --allow-tools Bash Write Edit Agent Workflow --scaffold --ablation none --trust-plugin
```

Change the plugin's `version` in `plugins/slopify/.claude-plugin/plugin.json` only when the user asks for that bump.
