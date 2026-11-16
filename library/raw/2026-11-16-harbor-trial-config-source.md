---
title: Harbor trial config.py (AgentConfig) source
type: raw
summary: Harbor's AgentConfig source, read via context7, supports a job config that lists several agents run against every task; the local `harbor run -c` path was not confirmed.
tags: []
aliases: []
source: https://github.com/harbor-framework/harbor/blob/main/src/harbor/models/trial/config.py
accessed: 2026-11-16
published: unknown
provider: GitHub (via context7)
up: "[[library/_meta/index|Library Index]]"
related:
  - "[[library/raw/2026-11-16-harbor-framework-harbor|Harbor framework README]]"
  - "[[library/raw/2026-11-16-harbor-claude-code-agent-source|Harbor claude_code.py agent source]]"
created: 2026-11-16
updated: 2026-11-16
---

# Harbor trial config.py (AgentConfig) source

> [!quote] Source
> **URL**: https://github.com/harbor-framework/harbor/blob/main/src/harbor/models/trial/config.py
> **Accessed**: 2026-11-16
> **Method/Context**: Research for SMR-361 (benchmark the slopify workflows against alternatives). Retrieved through context7 (`/harbor-framework/harbor`, versions v0.22.0 and v0.14.0 listed) as the AgentConfig source. Publication date unknown.

## Key evidence

- Harbor compares arms by listing several agents in one job config, and every agent runs against every task, so trials = n_attempts x tasks x agents. n_attempts is 1-10 in the hosted config. The same agent name can appear twice with different `model_name` or `kwargs`. The cited example is a sweep named `opus-vs-codex-sweep` with claude-code on two Claude models plus codex and oracle agents. `n_concurrent_trials`, a retry block (`max_retries`, `include_exceptions`) and `agents[].env`/`kwargs` are set per job or per agent. ^e1
  - The AgentConfig source says JobConfig carries `agents: list[AgentConfig]` for `harbor run -c`.
  - Quotation: "Every agent runs against every task. Trials = n_attempts x tasks x agents." This line comes from the hosted-Harbor pages (`docs-mintlify/hosted-harbor/cli.mdx` and `submitting-jobs.mdx`), which were retrieved alongside the source file and are not part of `config.py`.

## Limitations

> [!warning] Caveats
> - The n_attempts range and the multi-agent sweep example come from the hosted-Harbor docs pages, not from `config.py`. I did not confirm that the local `harbor run -c` path takes the same n_attempts and multi-agent keys.
> - The retrieval came through context7 excerpts, so the file was not read in full.
> - Publication date unknown; the context7 listing names two versions (v0.22.0 and v0.14.0) and does not say which the excerpt came from.

## Relevance

- Shows how a two-arm comparison (for example a bare Claude Code agent against the same agent with the slopify plugin) would be written in Harbor: two entries under `agents:` with different `kwargs`, run against the same tasks. This is inference from the cited config shape, not something the source states.
