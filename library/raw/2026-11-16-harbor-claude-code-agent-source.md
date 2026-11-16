---
title: Harbor claude_code.py agent source
type: raw
summary: Harbor's claude-code agent runs the claude CLI in print mode in the task container and copies skills, with no plugin-directory loading seen in a partial read.
tags: []
aliases: []
source: https://raw.githubusercontent.com/harbor-framework/harbor/main/src/harbor/agents/installed/claude_code.py
accessed: 2026-11-16
published: unknown
provider: GitHub
up: "[[library/_meta/index|Library Index]]"
related:
  - "[[library/raw/2026-11-16-harbor-framework-harbor|Harbor framework README]]"
created: 2026-11-16
updated: 2026-11-16
---

# Harbor claude_code.py agent source

> [!quote] Source
> **URL**: https://raw.githubusercontent.com/harbor-framework/harbor/main/src/harbor/agents/installed/claude_code.py
> **Accessed**: 2026-11-16
> **Method/Context**: Research for SMR-361 (benchmark the slopify workflows against alternatives). The file was retrieved from the main branch and searched by keyword; it was not read in full. Version date unknown (main branch at retrieval).

## Key evidence

- Harbor's claude-code agent runs the `claude` CLI as `claude --verbose --output-format=stream-json ... --print` inside the task container. It copies a skills directory into `$CLAUDE_CONFIG_DIR/skills`, and also copies `~/.claude/skills` when that directory exists. The source showed no plugin-directory loading. (Paraphrase of keyword matches at lines 132, 1193, 1875-1886, 2141-2153 and 2196-2200.) ^e1

## Limitations

- Partial read from keyword matches only, so the absence of plugin-directory loading is not established.
- Main branch at retrieval; the file may have changed since, and no commit or release was recorded.
- Whether a plugin directory can reach the container another way (a mounted path, config directory contents) is not established.
- Nothing was run.

## Relevance

- Bears on whether Harbor can run Claude Code with the slopify plugins loaded per arm in the SMR-361 comparison: skills can be supplied, but plugin loading would need confirming. The same finding is also summarised in [[library/raw/2026-11-16-harbor-framework-harbor#^e2]].

## Update 2026-11-16

> [!quote] Source
> **URL**: https://github.com/harbor-framework/harbor/blob/main/src/harbor/agents/installed/claude_code.py (same file as the raw URL above)
> **Accessed**: 2026-11-16
> **Method/Context**: Retrieved a second way, as the ClaudeCodeOptions source via context7 (Harbor docs-mintlify/jobs/skills.mdx alongside src/harbor/agents/installed/claude_code.py). Published date unknown. Research for SMR-361.

### Key evidence

- Harbor's per-arm knob for Claude Code is `skills` (local directories, Git URLs, or org/name[@ref]). Harbor uploads them to `/harbor/skills/<name>` in the sandbox, and the claude-code integration places them under `$CLAUDE_CONFIG_DIR/skills`. Quote: "Claude Code uses $CLAUDE_CONFIG_DIR/skills." ^e2
- The ClaudeCodeOptions kwargs listed are `max_turns`, `reasoning_effort`, `thinking_display`, `max_budget_usd`, `fallback_model`, `append_system_prompt`, `allowed_tools`, `disallowed_tools`, `disable_web_search`, `permission_mode` (default `bypassPermissions`), `max_thinking_tokens`, `memory_dir`, and `version`. ^e3
- No plugin or workflow-script option appears in the retrieved docs or source. Loading the slopify plugin (plugin.json, commands, workflow scripts) would need a custom agent via `import_path`, a subclass, or a task environment/Dockerfile that installs it. Custom agents are documented under `agents[].import_path` in `module.path:ClassName` form (quote). The need for a custom route is inferred from the absence of a plugin option; absence in the retrieved excerpts is not proof. ^e4
- The pinned, per-arm Claude Code version is available in Harbor as the `version` kwarg, inherited from InstalledAgentOptions (per the ClaudeCodeOptions source note via context7). ^e5

### Limitations

- Retrieved through context7 excerpts, not read in full; no commit or release recorded.
- The plugin-loading conclusion is inferred from absence, so it is consistent with, and no firmer than, the partial read above.
- Nothing was run.

### Relevance

- Confirms for SMR-361 that Harbor can vary skills and Claude Code version per arm, while a plugin-loaded arm needs custom glue or an image that installs the plugin.
