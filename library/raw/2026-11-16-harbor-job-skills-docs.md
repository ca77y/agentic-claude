---
title: Harbor job skills docs
type: raw
summary: Harbor's per-arm knob for Claude Code is `skills`, uploaded to /harbor/skills/<name>; no plugin or workflow-script option appears in the retrieved docs or source.
tags: []
aliases: []
source: https://github.com/harbor-framework/harbor/blob/main/docs-mintlify/jobs/skills.mdx
accessed: 2026-11-16
published: unknown
provider: context7
up: "[[library/_meta/index|Library Index]]"
related:
  - "[[library/raw/2026-11-16-harbor-claude-code-agent-source|Harbor claude_code.py agent source]]"
  - "[[library/raw/2026-11-16-harbor-framework-harbor|Harbor framework README]]"
created: 2026-11-16
updated: 2026-11-16
---

# Harbor job skills docs

> [!quote] Source
> **URL**: https://github.com/harbor-framework/harbor/blob/main/docs-mintlify/jobs/skills.mdx
> **Accessed**: 2026-11-16
> **Method/Context**: Research for SMR-361 (benchmark the slopify workflows against alternatives). Retrieved through context7 (/harbor-framework/harbor) as a docs excerpt, together with the Claude Code agent source `src/harbor/agents/installed/claude_code.py`. Publication date unknown.

## Key evidence

- Harbor's per-arm knob for Claude Code is `skills` (local directories, Git URLs, or org/name[@ref]). Harbor uploads them to `/harbor/skills/<name>` in the sandbox, and the claude-code integration places them under `$CLAUDE_CONFIG_DIR/skills`. ^e1
  > [!quote] Quote
  > "Claude Code uses $CLAUDE_CONFIG_DIR/skills."
- The ClaudeCodeOptions kwargs listed are `max_turns`, `reasoning_effort`, `thinking_display`, `max_budget_usd`, `fallback_model`, `append_system_prompt`, `allowed_tools`, `disallowed_tools`, `disable_web_search`, `permission_mode` (default `bypassPermissions`), `max_thinking_tokens`, `memory_dir`, and `version`. No plugin or workflow-script option appears in the retrieved docs or source. ^e2
- Custom agents are documented under `agents[].import_path` in `module.path:ClassName` form. ^e3
  > [!quote] Quote
  > Custom agents are documented under `agents[].import_path` in `module.path:ClassName` form.
- Inference, not quotation: loading the slopify plugin (plugin.json, commands, workflow scripts) would need a custom agent via `import_path`, a subclass, or a task environment/Dockerfile that installs it. This rests on the absence of a plugin option. ^e4

## Limitations

- The conclusion that Harbor has no plugin option is inferred from absence in the retrieved excerpts, which is not proof.
- Retrieved via context7 excerpts, not read in full; main-branch docs with no version or commit recorded.
- Nothing was run.

## Relevance

- Bears on whether Harbor can run Claude Code with the slopify plugin loaded in one arm and absent in another for SMR-361: skills can be supplied per arm, but plugin and workflow-script loading would need custom glue or confirming.
