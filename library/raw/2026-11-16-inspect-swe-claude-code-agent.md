---
title: Inspect SWE - Claude Code agent
type: raw
summary: inspect_swe's claude_code() agent runs Claude Code unattended in an Inspect sandbox, with documented options, version pinning and per-sample binary recording, and no plugin-loading option.
tags: [operations]
aliases: []
source: https://meridianlabs-ai.github.io/inspect_swe/claude_code.html
accessed: 2026-11-16
published: unknown
provider: meridianlabs-ai (Inspect SWE documentation)
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-16
updated: 2026-11-16
---

# Inspect SWE - Claude Code agent

> [!quote] Source
> **URL**: https://meridianlabs-ai.github.io/inspect_swe/claude_code.html
> **Accessed**: 2026-11-16
> **Method/Context**: Docs page fetched in full for SMR-361 (benchmark the slopify workflows against bare Claude Code). The page is undated; a log filename shown in it reads 2026-09-15. Version of inspect_swe not stated. Findings below rest on this page only; claims from other pages (GitHub repository metadata, Inspect AI `eval()` source and task docs, the Agent Bridge page) are not recorded here.

## Key evidence

- Inspect AI can run Claude Code as an agent through the Inspect SWE package's `claude_code()` agent, which drives the Claude Code CLI in unattended mode inside an Inspect sandbox. Model API calls from the sandbox are proxied back to Inspect. ^e1
  > [!quote] Quote
  > "The `claude_code()` agent uses the unattended mode of Anthropic Claude Code to execute agentic tasks within the Inspect sandbox. Model API calls that occur in the sandbox are proxied back to Inspect"
  >
  > "Model API calls that occur in the sandbox are proxied back to Inspect for handling by the model provider for the current task."
- Usage and runtime (paraphrase and code quote): the agent is used as a Task solver (`solver=claude_code()`, `scorer=model_graded_qa()`, `sandbox="docker"`), or from the CLI with `inspect eval ctf.py --solver inspect_swe/claude_code`. It downloads the Claude Code binary and copies it into the sandbox. ^e2
- Options (paraphrase of the page's Options table): `model`, `system_prompt` and `replace_system_prompt`, `skills` (Inspect skills), `mcp_servers`, `bridged_tools`, `disallowed_tools`, `cwd`, `env`, `version` (`auto`, `sandbox`, `stable`, `latest`, an exact `x.x.x`, or one preinstalled in the sandbox), `subagent_model`, `opus_model`, `sonnet_model`, `haiku_model`, `attempts`, and `retry_refusals` / `retry_uncaught_errors` (default 3 each). The table lists no plugin or plugin-directory option. ^e3
- The model comes from the Inspect model setting for the task, with per-role overrides (`model`, `opus_model`, `sonnet_model`, `haiku_model`, `subagent_model`). ^e4
- Version recording (page section "Recording What Ran"): each sample records the binary it actually ran, with version and origin, as an InfoEvent (source `inspect_swe`, `AgentBinaryInstall`: agent, requested, version, origin). With `version="stable"` or `"latest"` the resolution happens once per process with no expiry, so a resumed run or an `eval_set` retry can install a newer release for the remaining samples. Pinning is by `version="x.x.x"`, and the page notes a pinned version has no digest check. ^e5
  > [!quote] Quote
  > "The version installed is not always the one a task appears to name."
- Per-arm Claude Code version is therefore a parameter in inspect_swe (`version`). ^e6

## Limitations

- Inference, not stated by the page: a slopify-style plugin (plugin.json, commands, workflow scripts) would have to be present in the sandbox image or `cwd`, or added through custom glue, because the options table shows only `skills`. Whether a plugin directory can be loaded another way, such as mounted into the sandbox with `env` or `cwd`, is not established.
- Inference: model calls go through Inspect's model provider (an Anthropic API key), not the local Claude Code login. The page says calls are proxied to the task's model provider; it was not checked what credentials that provider needs.
- The page is undated and carries no inspect_swe version, so the options table may drift.
- Not shown here: whether Claude Code's Workflow tool or slopify's workflow scripts run under this agent, and whether stderr over epoch-reduced scores gives a valid paired two-arm interval (that rests on Inspect AI material, not this page).

## Relevance

- Candidate C in the SMR-361 comparison of benchmark tools: it gives per-arm model and Claude Code version control and per-sample version provenance, but needs a Python/Docker toolchain the repo does not otherwise use, and its lack of a plugin option is the main gap for a bare-versus-slopify comparison.
