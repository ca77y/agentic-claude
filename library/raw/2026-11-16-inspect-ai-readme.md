---
title: Inspect AI README
type: raw
summary: Inspect AI's README, cited with the Inspect SWE docs and the Inspect log viewer docs for the Inspect AI plus inspect_swe candidate of the slopify benchmark
tags: []
aliases: []
source: https://raw.githubusercontent.com/UKGovernmentBEIS/inspect_ai/main/README.md
accessed: 2026-11-16
published: unknown
provider: GitHub raw content (UKGovernmentBEIS/inspect_ai, main branch)
up: "[[library/_meta/index|Library Index]]"
related: ["[[raw/2026-11-16-inspect-ai-github-api]]", "[[raw/2026-11-16-inspect-swe]]", "[[raw/2026-11-16-inspect-ai-log-viewer]]"]
created: 2026-11-16
updated: 2026-11-16
---

# Inspect AI README

> [!quote] Source
> **URL**: https://raw.githubusercontent.com/UKGovernmentBEIS/inspect_ai/main/README.md
> **Accessed**: 2026-11-16
> **Method/Context**: Research for SMR-361, benchmarking the slopify workflows against a bare-model baseline. The README is one of three or more sources behind the finding below. The finding was handed over as a single bullet citing all of them, so the README's own contribution is not separated out here.

## Key evidence

- Candidate C, Inspect AI plus inspect_swe, as summarised for SMR-361 (paraphrase and quotation, with three sources cited together). Inspect is MIT licensed, written in Python, about 3.3k stars, last pushed 2026-11-15, and developed with uv. `pip install inspect-swe` provides a `claude_code()` solver that runs real Claude Code unattended inside an Inspect sandbox (the examples use `sandbox="docker"`), with model calls proxied to Inspect. The options include `system_prompt`, `replace_system_prompt`, `skills`, `mcp_servers`, `disallowed_tools`, `model`, `opus_model`, `sonnet_model`, `haiku_model`, `subagent_model`, `cwd`, `env`, `version` (pins a Claude Code version) and retry options. Each sample records the Claude Code binary it ran. No plugin-directory option appears in the option table, only skills. Model calls go through Inspect's provider (an Anthropic API key), not the local Claude Code login. ^e1
  - Sources cited for this bullet: https://api.github.com/repos/UKGovernmentBEIS/inspect_ai, https://meridianlabs-ai.github.io/inspect_swe/claude_code.html and this README. Retrieved 2026-11-16.

## Limitations

- The README is cited together with the GitHub API and the Inspect SWE docs, so the handed-over finding does not say which clauses rest on the README. Treat the licence, star count and push date as coming from the GitHub API note, the option table and binary-recording claims as coming from the Inspect SWE docs, and "developed with uv" as the likeliest README contribution. That split is an inference and was not checked against the README text in this run.
- The README text was not quoted passage by passage, so no verbatim README excerpt is recorded here.
- The "no plugin-directory option" point rests on the option table as read; whether a plugin directory can be loaded another way (for example mounted into the sandbox through `env` or `cwd`) was not established.
- That model calls need an Anthropic API key rather than the local Claude Code login is stated as a finding without a quoted passage.

## Relevance

- Informs whether Inspect AI with inspect_swe is a workable harness for a bare-model versus slopify-workflow benchmark. Two points stand out: it needs a Python toolchain beyond the `python3` the smoke scaffolds already call, and Docker, which the repo does not use, and it has no plugin-loading option in the option table.
