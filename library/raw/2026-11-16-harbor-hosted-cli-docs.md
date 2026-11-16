---
title: Harbor hosted CLI docs
type: raw
summary: Harbor's hosted job config runs every listed agent against every task, so trials = n_attempts x tasks x agents; the same agent can appear twice with different models.
tags: []
aliases: []
source: https://github.com/harbor-framework/harbor/blob/main/docs-mintlify/hosted-harbor/cli.mdx
accessed: 2026-11-16
published: unknown
provider: context7
up: "[[library/_meta/index|Library Index]]"
related:
  - "[[library/raw/2026-11-16-harbor-job-skills-docs|Harbor job skills docs]]"
  - "[[library/raw/2026-11-16-harbor-framework-harbor|Harbor framework README]]"
created: 2026-11-16
updated: 2026-11-16
---

# Harbor hosted CLI docs

> [!quote] Source
> **URL**: https://github.com/harbor-framework/harbor/blob/main/docs-mintlify/hosted-harbor/cli.mdx
> **Accessed**: 2026-11-16
> **Method/Context**: Research for SMR-361 (benchmark the slopify workflows against alternatives). Retrieved through context7 (/harbor-framework/harbor; versions v0.22.0 and v0.14.0 listed) as a docs excerpt covering the hosted CLI config example and agent sweeps. Related excerpts from `submitting-jobs.mdx` and `src/harbor/models/trial/config.py` (AgentConfig) came in the same retrieval. Publication date unknown.

## Key evidence

- A job config lists `agents:` and every agent runs against every task, so trials = n_attempts x tasks x agents. `n_attempts` is 1-10 in the hosted config. ^e1
  > [!quote] Quote
  > "Every agent runs against every task. Trials = n_attempts x tasks x agents."
- The same agent name can appear twice with different `model_name` or `kwargs`. The cited example is a sweep named `opus-vs-codex-sweep` with claude-code on two Claude models plus codex and oracle agents. ^e2
- `n_concurrent_trials`, a retry block (`max_retries`, `include_exceptions`) and `agents[].env`/`kwargs` are per-job or per-agent settings. ^e3
- Results and versions: a job writes `<jobs_dir>/<job_name>/result.json` with aggregated stats and trial results, and each trial exception is recorded in `TrialResult.exception_info`. `job_name` defaults to a UTC timestamp, and the docs advise setting a name. Agent versions installed from a package manager are pinned at job submission, so every trial in a job gets the same release (hosted docs). ^e4
  > [!quote] Quote
  > "job_name | Defaults to a UTC timestamp such as 2026-08-13__14-30-00"
- Inference, not quotation: a `job_name` like `<version>-<date>[-N]` is a config string, and the `-N` suffix would be computed by the caller. ^e5

## Limitations

- These pages are in the hosted-Harbor section. I did not confirm that the local `harbor run -c` path takes the same `n_attempts` and multi-agent keys, though the AgentConfig source says JobConfig carries `agents: list[AgentConfig]` for `harbor run -c`.
- Retrieved via context7 excerpts, not read in full; docs from main with the two listed versions, and no single commit recorded.
- The `job.py` source and `submitting-jobs.mdx` passages behind ^e4 were seen only as context7 excerpts.
- Nothing was run.

## Relevance

- Bears on how SMR-361 could express a bare-vs-plugin comparison in Harbor: two `agents:` entries (same agent, different `kwargs` or `model_name`) crossed with every task and repeated by `n_attempts`. Whether the plugin arm can be loaded at all is a separate question; see [[library/raw/2026-11-16-harbor-job-skills-docs|Harbor job skills docs]].
