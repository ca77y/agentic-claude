---
title: Harbor hosted docs, submitting jobs
type: raw
summary: Harbor's hosted-Harbor job config runs every listed agent against every task, with n_attempts 1-10, and pins package-manager agent versions at submission.
tags: []
aliases: []
source: https://github.com/harbor-framework/harbor/blob/main/docs-mintlify/hosted-harbor/submitting-jobs.mdx
accessed: 2026-11-16
published: unknown
provider: GitHub (via context7)
up: "[[library/_meta/index|Library Index]]"
related:
  - "[[library/raw/2026-11-16-harbor-trial-config-source|Harbor trial config.py (AgentConfig) source]]"
  - "[[library/raw/2026-11-16-harbor-framework-harbor|Harbor framework README]]"
created: 2026-11-16
updated: 2026-11-17
---

# Harbor hosted docs, submitting jobs

> [!quote] Source
> **URL**: https://github.com/harbor-framework/harbor/blob/main/docs-mintlify/hosted-harbor/submitting-jobs.mdx
> **Accessed**: 2026-11-16
> **Method/Context**: Harbor submitting-jobs and job config pages, retrieved through context7 (`/harbor-framework/harbor`; versions v0.22.0 and v0.14.0 listed). Published date unknown. The `cli.mdx` page in the same section was retrieved alongside and carries the same trials rule.

## Key evidence

- A job config lists `agents:` and every agent runs against every task, so trials = n_attempts x tasks x agents. n_attempts is 1-10 in the hosted config. The same agent name can appear twice with different `model_name` or `kwargs`. The cited example is a sweep named `opus-vs-codex-sweep` with claude-code on two Claude models plus codex and oracle agents. `n_concurrent_trials`, a retry block (`max_retries`, `include_exceptions`) and `agents[].env`/`kwargs` are per-job or per-agent. ^e1
  - Quotation: "Every agent runs against every task. Trials = n_attempts x tasks x agents."
  - Inference: the repeated agent name with different model or kwargs is how a two-arm comparison is written in this config.
- Agent versions installed from a package manager are pinned at job submission, so every trial in a job gets the same release (hosted docs). ^e2
  - Inference: a job-level version pin gives each arm a fixed Claude Code release for the whole run, though only for the hosted path described here.

## Limitations

- Both pages are in the hosted-Harbor section. I did not confirm that the local `harbor run -c` path takes the same `n_attempts` and multi-agent keys. The `AgentConfig` source says `JobConfig` carries `agents: list[AgentConfig]` for `harbor run -c`, which is recorded in [[library/raw/2026-11-16-harbor-trial-config-source|the config.py note]].
- Findings on `skills`, the Claude Code kwargs, `result.json`, `TrialResult.exception_info` and the `job_name` default rest on other pages and source files, not on this one, and are not recorded here.
- The retrieved excerpts are not the full page, so what they omit is not evidence of absence.

## Relevance

- Shows how Harbor expresses a multi-arm comparison with repeated attempts: one job, several agent entries, shared tasks.

## Update 2026-11-17

> [!quote] Source
> **URL**: https://github.com/harbor-framework/harbor/blob/main/docs-mintlify/hosted-harbor/submitting-jobs.mdx
> **Accessed**: 2026-11-17
> **Method/Context**: Re-read of this note while checking `library/raw` for evidence on single-agent versus multi-agent coding evals (SMR-376). Branch `tokwieci/smr-376-research-published-evals-of-single-agent-vs`, HEAD 50d66a9, clean working tree. No new fetch of the source page.

## Key evidence

- A content search of `library/raw` for "multi-agent", "orchestrat" and "single-agent" matched this note at line 36, in the Limitations bullet, together with two other Harbor notes. The match concerns Harbor job configuration, not eval results. ^e3
  - Quotation: "I did not confirm that the local `harbor run -c` path takes the same `n_attempts` and multi-agent keys."
  - Inference: this note records no success, token or latency comparison between a single agent and an orchestrated design. Its "multi-agent" wording refers to a job config that lists several agents, which is not the same thing as an orchestrated multi-agent system.

## Limitations

- The other two matching notes, `library/raw/2026-11-16-harbor-hosted-cli-docs.md` (line 40) and `library/raw/2026-11-16-harbor-trial-config-source.md` (line 35), are not recorded here. This section rests only on this note.
