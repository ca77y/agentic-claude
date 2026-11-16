---
title: promptfoo - Claude Agent SDK provider
type: raw
summary: promptfoo's anthropic:claude-agent-sdk provider, its config keys (plugins, copy_working_dir, setting_sources), install and auth, and caching limits
tags: []
aliases: []
source: https://www.promptfoo.dev/docs/providers/claude-agent-sdk/
accessed: 2026-11-16
published: unknown
provider: promptfoo
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-16
updated: 2026-11-16
---

# promptfoo - Claude Agent SDK provider

> [!quote] Source
> **URL**: https://www.promptfoo.dev/docs/providers/claude-agent-sdk/
> **Accessed**: 2026-11-16
> **Method/Context**: Fetched during SMR-361 (benchmark the slopify workflows against a bare-model baseline). Publication date unknown; the docs carry no version date. Lines marked "quote" are verbatim from the page; the rest paraphrase it.

## Key evidence

- promptfoo drives the Claude Agent SDK through its provider `anthropic:claude-agent-sdk`. Config keys: `working_dir`, `copy_working_dir` (a fresh copy of the working directory per eval step, for isolated workspaces), `max_budget_usd`, `additional_directories`, `setting_sources`, `plugins` (local plugin directories, with skills namespaced as `plugin:skill`), `skills` (filter), `model`, `fallback_model`, and `apiKeyRequired` (false for local SDK auth). ^e1
  > [!quote]
  > "`plugins` | array | Local plugins to load for the session"; "`copy_working_dir` ... Run each eval step in a fresh copy of `working_dir`"
- `setting_sources` defaults to None, so CLAUDE.md, settings and slash commands are not loaded. If `working_dir` is unset, the SDK runs in a temporary directory with no tools by default. ^e2
- Install and runtime: TypeScript/Node, installed with `npm install promptfoo @anthropic-ai/claude-agent-sdk@^0.3.273` (the version pin as shown on the retrieved page), or run with npx. The JavaScript runtime can be node, bun or deno. ^e3
- Authentication: `ANTHROPIC_API_KEY`, or the local Claude Code login with `apiKeyRequired: false`. The page describes the Agent SDK as distributed under a proprietary license. ^e4
- Caching: the docs say caching is disabled for local Claude login (`apiKeyRequired: false`), for runtime callbacks and hooks, and for SDK settings. ^e5
- Provider options also include `mcp` servers and permission modes; the default is a temporary directory with no tools (as in ^e2). ^e6

## Limitations

- The page is a provider reference. It was not shown to say whether the Agent SDK runs the Claude Code Workflow tool or scripts, or invokes namespaced skills in headless mode, so it does not establish that slopify's workflows (`plugins/slopify/workflows/*.js`) run under it.
- The SDK version pin (`^0.3.273`) is as retrieved on 2026-11-16 and may change.
- Findings from the original brief that cite this page together with other pages could not be separated by source and are not recorded here. Those are the licence, star and issue counts from the GitHub API, the `workspaceDiff` metadata and the git-clone copy mode from the evaluate-coding-agents guide, the rejection of linked-worktree `.git` files and repos with submodules in copy mode, and the baseline-arm and `--repeat` pattern. They belong in a note for the page that supports them.
- The page does not describe a `<version>-<date>[-N]` output naming scheme.

## Relevance

- `plugins` plus `copy_working_dir` give a documented way to load a local plugin directory into an isolated workspace, which matters for a with-plugin versus without-plugin benchmark arm (SMR-361).
- `setting_sources` defaulting to None means a bare arm does not pick up the project's CLAUDE.md or settings unless asked.
- Local-login auth (`apiKeyRequired: false`) matches TESTING.md's statement that eval runs use the Claude Code CLI login of whoever runs them, but it disables caching.
