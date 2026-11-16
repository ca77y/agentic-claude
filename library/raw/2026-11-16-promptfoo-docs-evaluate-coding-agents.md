---
title: promptfoo docs - Evaluate Coding Agents
type: raw
summary: The promptfoo docs page on evaluating coding agents, as read for SMR-361, covering the Claude Agent SDK provider setup, baseline arms, repeats, workspace-copy limits and the page's own cost figures
tags: []
aliases: []
source: https://www.promptfoo.dev/docs/guides/evaluate-coding-agents/
accessed: 2026-11-16
published: unknown
provider: promptfoo
up: "[[library/_meta/index|Library Index]]"
related:
  - "[[raw/2026-11-16-promptfoo-evaluate-coding-agents]]"
  - "[[raw/2026-11-16-promptfoo-claude-agent-sdk-provider]]"
created: 2026-11-16
updated: 2026-11-16
---

# promptfoo docs - Evaluate Coding Agents

> [!quote] Source
> **URL**: https://www.promptfoo.dev/docs/guides/evaluate-coding-agents/
> **Accessed**: 2026-11-16
> **Method/Context**: Gathered for SMR-361 (benchmarking the slopify workflows against a baseline). The findings below were reported by a researcher who read the published docs page (last updated 2026-11-16 per the researcher) and are marked quote, paraphrase or inference per bullet. Same guide as [[raw/2026-11-16-promptfoo-evaluate-coding-agents]], which was retrieved from the GitHub source file through context7; this note is the published-site read and carries a different canonical URL. Only the findings that rest on this page are kept here.

## Key evidence

- Setup of the Claude Agent SDK provider (`anthropic:claude-agent-sdk`): `npm install promptfoo @anthropic-ai/claude-agent-sdk@^0.3.273`. The SDK is "distributed under a proprietary license". Auth is `ANTHROPIC_API_KEY`, or a local Claude Code login with `apiKeyRequired: false`. Provider config supports `working_dir`, `copy_working_dir` (a fresh git clone or copy per eval step, with `workspaceDiff` metadata), `plugins: [{type: local, path}]`, `skills`, `setting_sources`, `model`, `max_budget_usd`, `mcp` and permission modes. The default is a temp dir with no tools. (paraphrase and quote) ^e1
  > [!note] Provenance
  > The researcher cited this guide together with the GitHub repo API and the provider page for this finding, so the split between the pages is not recorded. The licence of promptfoo itself (MIT), the star count and the push date come from the GitHub API, not from this page, and are left to [[raw/2026-11-16-promptfoo-github-repo]].

- Arms and repeats: two `providers` entries in one YAML are the documented pattern for a comparison. One is a plain `anthropic:` model as a text-only baseline, or the same Agent SDK provider without `plugins` as a bare arm. The other is the same provider with `plugins`. The page says "Include baselines. A plain LLM fails tasks requiring file access". `--repeat 3` covers nondeterminism. Assertions include `javascript`, `llm-rubric`, `agent-rubric` (runs in the same workspace), cost and latency thresholds, and trajectory assertions via tracing. (quote and paraphrase) ^e2

- Workspace limits: responses are never cached in workspaces. Copy mode rejects a worktree-style `.git` file (the "linked worktree's .git file" case), and repos with submodules are unsupported. (quote and paraphrase) ^e3
  - Inference, not in the source: this repo's work is done in `.worktrees/` checkouts, so copy mode may need a plain clone rather than a worktree.

- Cost figures on the page: the guide says an agent task for a small audit "might cost $0.10-0.30" and warns of about 1M tokens for Codex. The page does not give a per-run price for a full multi-step workflow. (quote and paraphrase) ^e4
  - Inference: spend scales as tasks x arms x repeats x per-task cost, and the page gives no per-task figure for a workflow like slopify's. The researcher's own measurements of this repo's smoke runs are not from this page and are not recorded here.

## Limitations

- Not verified from this page: whether the Agent SDK runs the Claude Code Workflow tool or the scripts that slopify's workflows (`plugins/slopify/workflows/*.js`) depend on, or invokes namespaced slopify skills in headless mode.
- Published date unknown; the researcher saw the docs page marked as last updated 2026-11-16. The SDK version pin (`^0.3.273`) is as the page stated on the access date and may move.
- The split of ^e1 between this page and the provider page is unknown (see the provenance note).

## Relevance

- ^e1 and ^e2 give the pattern for a bare-versus-plugin comparison in promptfoo: one provider with `plugins` and one without, `--repeat` for noise.
- ^e3 is a constraint on isolating each arm in a fresh workspace from a worktree-based checkout (inference above).
- ^e4 bounds the cost question only at the low end; a measured full-workflow cost is still missing.
