---
title: Inspect SWE and other harnesses that can run Claude Code
type: raw
summary: Inspect SWE's claude_code() agent plus the promptfoo, Harbor, SWE-bench and Braintrust surfaces for running or tracing Claude Code in an eval
tags: []
aliases: []
source: https://api.github.com/repos/meridianlabs-ai/inspect_swe
accessed: 2026-11-16
published: unknown
provider: GitHub API (meridianlabs-ai/inspect_swe), with linked docs and READMEs
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-16
updated: 2026-11-16
---

# Inspect SWE and other harnesses that can run Claude Code

> [!quote] Source
> **URL**: https://api.github.com/repos/meridianlabs-ai/inspect_swe
> **Accessed**: 2026-11-16
> **Method/Context**: Research for SMR-361, benchmarking the slopify workflows. The repo metadata came from the GitHub API. The findings below also rest on the pages named in each bullet, all retrieved 2026-11-16 with the publication or version date unknown unless a bullet says otherwise. Each bullet marks quotation, paraphrase and inference apart.

## Key evidence

- Inspect AI can run Claude Code as an agent on a task. Its agent bridge supports CLI agents that run in sandboxes. The Inspect SWE package's `claude_code()` agent drives the Claude Code CLI in unattended mode inside an Inspect sandbox, and model API calls from the sandbox are proxied to the Inspect model provider. ^e1
  - Sources: https://inspect.aisi.org.uk/agent-bridge.html (Agent Bridge) and https://meridianlabs-ai.github.io/inspect_swe/claude_code.html (Inspect SWE: Claude Code).
  - Quote: "The `claude_code()` agent uses the unattended mode of Anthropic Claude Code to execute agentic tasks within the Inspect sandbox. Model API calls that occur in the sandbox are proxied back to Inspect"

- Inspect SWE `claude_code()` options relevant to a per-arm setup: `model`, `system_prompt` and `replace_system_prompt`, `skills`, `mcp_servers`, `bridged_tools`, `disallowed_tools`, `cwd`, `env`, `version` ("stable", "latest", an exact version, or one preinstalled in the sandbox), `subagent_model`, `opus_model`, `sonnet_model`, `haiku_model`, `attempts`, and `retry_refusals` / `retry_uncaught_errors` (default 3). The options table lists no plugin-loading option. ^e2
  - Source: https://meridianlabs-ai.github.io/inspect_swe/claude_code.html (paraphrase of the Options table).
  - Not established: whether a plugin directory can be loaded another way, such as mounted into the sandbox with `env` or `cwd`.

- Inspect SWE usage and runtime: the agent is used as a Task solver (`solver=claude_code()`, `scorer=model_graded_qa()`, `sandbox="docker"`), or from the CLI with `inspect eval ctf.py --solver inspect_swe/claude_code`. It downloads the Claude Code binary and copies it into the sandbox, and it records the binary version and origin it actually ran per sample as an InfoEvent. ^e3
  - Source: https://meridianlabs-ai.github.io/inspect_swe/claude_code.html (paraphrase and code quote).

- Inspect AI maturity and licence: Python, MIT licence, created 2023-11-14, last pushed 2026-11-15, about 3.3k stars, 521 open issues, not archived. inspect_swe: MIT, Python, created 2025-08-29, last pushed 2026-11-16, 42 stars, 46 open issues, maintained by the meridianlabs-ai org (a separate org from UK AISI). ^e4
  - Sources: https://api.github.com/repos/UKGovernmentBEIS/inspect_ai and https://api.github.com/repos/meridianlabs-ai/inspect_swe (paraphrase of API fields; repo metadata as of 2026-11-16).

- promptfoo can drive the Claude Agent SDK through its provider `anthropic:claude-agent-sdk`. Config keys: `working_dir`, `copy_working_dir` (a fresh copy of the working directory per eval step, for isolated workspaces), `max_budget_usd`, `additional_directories`, `setting_sources` (default None, so CLAUDE.md, settings and slash commands are not loaded), `plugins` (local plugin directories, with skills namespaced as `plugin:skill`), `skills` (filter), `model`, `fallback_model`, and `apiKeyRequired` (false for local SDK auth). If `working_dir` is unset, the SDK runs in a temp directory with no tools by default. ^e5
  - Source: https://www.promptfoo.dev/docs/providers/claude-agent-sdk/ (published date unknown).
  - Quotes: "`plugins` | array | Local plugins to load for the session"; "`copy_working_dir` ... Run each eval step in a fresh copy of `working_dir`"

- promptfoo runtime and licence: TypeScript/Node, installed with `npm install promptfoo @anthropic-ai/claude-agent-sdk@^0.3.273` (version pin as shown in the retrieved docs), or run with npx. The JavaScript runtime can be node, bun or deno. MIT licence, about 27.3k stars, last pushed 2026-11-16, 965 open issues. The docs say caching is disabled for local Claude login (`apiKeyRequired: false`), for runtime callbacks and hooks, and for SDK settings. ^e6
  - Sources: https://www.promptfoo.dev/docs/providers/claude-agent-sdk/ and https://api.github.com/repos/promptfoo/promptfoo (paraphrase; repo metadata as of 2026-11-16).

- promptfoo's Anthropic provider page points to the Claude Agent SDK provider for agentic evaluations that need file access and skill plugins. ^e7
  - Source: https://www.promptfoo.dev/docs/providers/anthropic/ (search result snippet only; the page was not fetched).
  - Quote: "For agentic evaluations that need built-in file access and skill plugins on top of the Messages API, see the Claude Agent SDK provider."

- Harbor (the framework from the Terminal-Bench creators) evaluates arbitrary agents including Claude Code. README example: `harbor run --dataset terminal-bench@2.0 --agent claude-code --model anthropic/claude-opus-5-5 --n-concurrent 4`. It runs locally in Docker or on cloud providers (Daytona, Modal and others) via `--env`. `harbor datasets list` shows the supported third-party benchmarks (SWE-Bench and Aider Polyglot are named), and users can build their own benchmarks and environments. ^e8
  - Source: https://github.com/harbor-framework/harbor (README; version date unknown).
  - Quotes: "Evaluate arbitrary agents like Claude Code, OpenHands, Codex CLI, and more." "Build and share your own benchmarks and environments."

- Harbor's claude-code agent runs the `claude` CLI as `claude --verbose --output-format=stream-json ... --print` inside the task container. It copies a skills directory into `$CLAUDE_CONFIG_DIR/skills`, and it also copies `~/.claude/skills` when that directory exists. The source as grepped showed no plugin-directory loading. ^e9
  - Source: https://raw.githubusercontent.com/harbor-framework/harbor/main/src/harbor/agents/installed/claude_code.py (main branch at retrieval; paraphrase of grep matches at lines 132, 1193, 1875-1886, 2141-2153, 2196-2200).
  - Caveat: this is a partial read from keyword matches only, so the absence of plugin loading is not confirmed.

- Harbor runtime, licence and maturity: Python (92.6%), installed with `uv tool install harbor` or `pip install harbor`. Apache-2.0, about 7.1k stars, created 2025-08-04, 31 releases, last pushed 2026-11-14, 1306 open issues. It is the official harness for Terminal-Bench-2.0. ^e10
  - Sources: https://github.com/harbor-framework/harbor and https://api.github.com/repos/harbor-framework/harbor (paraphrase; repo metadata as of 2026-11-16).

- The SWE-bench harness does not invoke an agent for the eval step. `swebench eval` evaluates patch predictions, run as `swebench eval verified -p <path_to_predictions> --run-id <run_id>`. A separate `swebench infer ... -m <model>` command generates predictions with mini-SWE-agent, and no Claude Code or Agent SDK driver is documented in the README. It needs Docker, with a recommended x86_64 machine with 120GB of free storage, 16GB of RAM and 8 CPU cores; arm64 is experimental. MIT licence, Python 3.8+, about 6.2k stars, last pushed 2026-09-18. Results are cached by `run_id` and instance_id, and the run summary is written to `logs/evaluation/<run_id>/results.json`. ^e11
  - Sources: https://raw.githubusercontent.com/SWE-bench/SWE-bench/main/README.md and https://api.github.com/repos/SWE-bench/SWE-bench (README news items run to Sep. 1, 2026; repo metadata as of 2026-11-16).
  - Quote: "Evaluate patch predictions with the following command"

- Braintrust does not run the agent. It traces Claude Agent SDK runs and hosts evals. The TypeScript integration wraps the SDK with `wrapClaudeAgentSDK(claudeSDK)` after `initLogger({projectName, apiKey: BRAINTRUST_API_KEY})`, and a `braintrust-claude-plugin` offers a `trace-claude-code` skill to trace Claude Code sessions. The SDK repo is Apache-2.0 TypeScript, last pushed 2026-11-16. The tracing docs show an API key and a Braintrust project, which implies the hosted service. ^e12
  - Sources: https://www.braintrust.dev/docs/integrations/agent-frameworks/claude-agent-sdk, https://github.com/braintrustdata/braintrust-claude-plugin (search snippet only) and https://api.github.com/repos/braintrustdata/braintrust-sdk-javascript (version date unknown).
  - Quote (search snippet): "Trace Claude Agent SDK runs in Braintrust to debug agent queries, tool calls, and multi-step reasoning."
  - Not established: self-hosting, pricing, and a local-only mode.

- Inference, not quotation: the Claude Agent SDK and the Claude Code CLI are themselves invocation surfaces. promptfoo wraps the SDK (`@anthropic-ai/claude-agent-sdk`), Inspect SWE and Harbor wrap the CLI in unattended or print mode, and Braintrust instruments the SDK. ^e13
  - Basis: synthesis of ^e1, ^e5, ^e8, ^e9 and ^e12.

## Limitations

- Only the repo metadata at the canonical URL was read from the GitHub API. The other claims rest on the linked pages, each retrieved 2026-11-16 with unknown publication or version dates; repo figures (stars, issues, last push) are a snapshot of that day.
- Two items are search-snippet leads only, not fetched pages: the promptfoo Anthropic provider page (^e7) and the braintrust-claude-plugin repo (^e12).
- The Harbor plugin-loading finding (^e9) comes from keyword matches, not a full read of the source.
- Not established: whether Inspect SWE can load a plugin directory by mounting it into the sandbox; Braintrust self-hosting, pricing and local-only mode.

## Relevance

- Bears on SMR-361, benchmarking the slopify workflows against alternatives: which harnesses can run Claude Code with a plugin loaded per arm. Of the sources here, only promptfoo documents a `plugins` option (^e5); Inspect SWE (^e2) and Harbor (^e9) list skills but no plugin loading.
