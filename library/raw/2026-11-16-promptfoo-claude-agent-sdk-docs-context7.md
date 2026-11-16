---
title: promptfoo - Claude Agent SDK provider docs (via context7)
type: raw
summary: The providers/claude-agent-sdk.md source page as retrieved through context7, covering plugin loading, setting_sources, skills filter, working-directory isolation and run controls
tags: []
aliases: []
source: https://github.com/promptfoo/promptfoo/blob/main/site/docs/providers/claude-agent-sdk.md
accessed: 2026-11-16
published: unknown
provider: promptfoo
up: "[[library/_meta/index|Library Index]]"
related: ["[[library/raw/2026-11-16-promptfoo-claude-agent-sdk-provider]]"]
created: 2026-11-16
updated: 2026-11-16
---

# promptfoo - Claude Agent SDK provider docs (via context7)

> [!quote] Source
> **URL**: https://github.com/promptfoo/promptfoo/blob/main/site/docs/providers/claude-agent-sdk.md
> **Accessed**: 2026-11-16
> **Method/Context**: Retrieved through context7 (`/promptfoo/promptfoo`, v0.125.1 listed) during SMR-361 (benchmark the slopify workflows against a bare-model baseline). Publication date unknown. Text in quotation marks is verbatim from the retrieved excerpt; everything else paraphrases it. This is the Markdown source of the page that [[library/raw/2026-11-16-promptfoo-claude-agent-sdk-provider]] records from the published site.

## Key evidence

- Plugin loading: the Claude Agent SDK provider takes `plugins: [{type: local, path: ./my-plugin}]` together with `skills: all`. Only the `local` type is supported, and relative paths resolve against the config file's directory. ^e1
  > [!quote]
  > "Only the 'local' type is supported; relative paths resolve against the config file's directory."
- By default the provider reads no settings files, CLAUDE.md or slash commands unless `setting_sources` is set (`user`, `project`, `local`). ^e2
- The `skills` filter needs `@anthropic-ai/claude-agent-sdk` 0.2.120 or later. ^e3
- Run controls: `model` is a per-provider config key, `max_budget_usd` caps spend per call, and `persist_session: false` stops session files being written to `~/.claude/projects`. ^e4
- Workspace isolation: `copy_working_dir: true` gives each eval step a fresh copy of the working directory, deleted after assertions run. Without it, each call changes `working_dir`. ^e5
  > [!quote]
  > "each call changes working_dir; set copy_working_dir: true for isolated workspaces."
- Version: the SDK version is whatever `@anthropic-ai/claude-agent-sdk` is installed (the `skills` filter documents the 0.2.120 minimum in ^e3). Nothing retrieved describes a promptfoo option to pin the Claude Code CLI binary version. ^e6

## Limitations

- Inference, not quotation: a baseline arm would be a second provider entry without `plugins`. The excerpt shows the `plugins` key, not a baseline recipe.
- The excerpts do not say whether plugin-shipped workflow scripts or custom commands run through the SDK path. This was not verified.
- The brief cited `guides/evaluate-coding-agents.md` alongside this page for the `copy_working_dir` quotation and for the Codex SDK and OpenCode SDK support of that option. Those parts are not recorded here, since they rest on another page. The `persist_session` and `model` points in ^e4 were also grouped with that finding, so which page states each is not separated.
- "No option to pin the CLI binary" in ^e6 is an inference from absence in the retrieved excerpts, not proof. The Harbor and inspect_swe `version` parameters that the brief compared against belong in notes for those sources.
- The 0.2.120 minimum for the `skills` filter sits beside the `^0.3.273` install pin recorded in the sibling note. Both are as retrieved on 2026-11-16, and they may reflect different page revisions.
- Findings from the brief that cite other pages (the two-provider `label` comparison in `guides/test-agent-skills.md`, `--repeat` and caching behaviour, Harbor, Inspect AI and inspect_swe) are not recorded here.

## Relevance

- `plugins` with `skills: all` is a documented way to load a local plugin directory into a with-plugin arm, and a provider without it is the candidate bare arm (SMR-361).
- `setting_sources` left unset keeps the project's CLAUDE.md and settings out of the bare arm.
- `copy_working_dir`, `max_budget_usd` and `persist_session: false` bound cross-run contamination and spend per call.
- Pinning the Claude Code version per arm is not documented for promptfoo in what was retrieved.
