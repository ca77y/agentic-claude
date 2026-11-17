---
title: Squad benchmark results (squad-marble-benchmark README)
type: raw
summary: Tool author's self-run results for Squad, a multi-agent layer for GitHub Copilot CLI, on SWE-bench Verified (50), TerminalBench 2.0 (20), and MARBLE.
tags: [evaluation, agent-harness]
aliases: [squad-marble-benchmark]
source: https://github.com/tamirdresher/squad-marble-benchmark
accessed: 2026-11-17
published: unknown
provider: GitHub (tamirdresher/squad-marble-benchmark)
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-17
updated: 2026-11-17
---

# Squad benchmark results (squad-marble-benchmark README)

> [!quote] Source
> **URL**: https://github.com/tamirdresher/squad-marble-benchmark
> **Accessed**: 2026-11-17
> **Method/Context**: README of the repository, read for published evals of a single agent versus a multi-agent or orchestrated design (SMR-376, feeding SMR-375). The repository's latest commit is dated 3 Jul 2026. Author-run by the tool's author; README only, no peer review. The Verified-50 raw data lives in a separate repo, tamirdresher/squad-swe-bench, which was not fetched.

## Key evidence

- **Eval D** (third-party tool author, self-run; mixed controlled and uncontrolled). Squad is a multi-agent coordination layer for GitHub Copilot CLI. ^e1
- **SWE-bench Verified, 50 instances, controlled by the author's own label.** Matched model gpt-5.5 and matched WSL/Docker harness. Squad-on 36/50 (72%) versus Squad-off 36/50 (72%), a tie. The two arms resolve non-overlapping subsets (3 unique instances each). ^e2
  > [!quote] Author's words
  > "Squad-on and Squad-off both resolve 36/50 (72%) - an honest statistical tie at n=50"
- **TerminalBench 2.0, 20 of 89 tasks.** Squad 16/20 (80%) versus baseline 15/20 (75%). Same model but different harness paths (host-side orchestrator versus native harness), so record it as uncontrolled. ^e3
  > [!quote] Author's words
  > "a +1-task margin on n=20 - directional, not a clean controlled result"
- **SWE-bench Lite: 66% versus an estimated ~48% baseline.** Uncontrolled: the baseline comes from public reports, not a matched run. ^e4
- **Cost per task on MARBLE** (not coding-only; the benchmark also covers research, bargaining, and database tasks): Full Squad $0.97, Coord-only $0.41, No-Squad $0.68. ^e5
- Latency is not reported for the coding arms. ^e6

## Limitations

- Author-run by the tool's author, README only, no peer review.
- Only the Verified-50 arm is matched on model and harness; its n=50 result is a tie, and the author calls it a statistical tie.
- TerminalBench 2.0 (n=20) differs in harness path between arms; a one-task margin is not evidence of a difference.
- The SWE-bench Lite baseline is an estimate from public reports.
- MARBLE cost mixes non-coding task types, so it does not isolate coding cost.
- Underlying per-instance data was not fetched (separate repo, tamirdresher/squad-swe-bench).

## Relevance

- A model-fixed, harness-matched single-agent versus orchestrated comparison on a coding benchmark. The result is a tie at n=50, with no cost or latency figures for it. Supports "no demonstrated gain" more than "no gain". ^e7
- The Terminal-Bench entry is the only self-reported single-versus-orchestrated result found there, and it is uncontrolled, so it cannot fill the model-fixed gap. ^e8
