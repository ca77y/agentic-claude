---
title: "tau-bench: A Benchmark for Tool-Agent-User Interaction in Real-World Domains"
type: raw
summary: tau-bench (Yao et al., arXiv 2406.12045) defines pass^k, the all-k-trials-succeed reliability metric with unbiased estimators from n trials, and reports run-to-run inconsistency of a gpt-4o-era agent.
tags: [evaluation, benchmarking]
aliases: [tau-bench, τ-bench, 2406.12045]
source: https://arxiv.org/html/2406.12045v1
accessed: 2026-11-15
published: 2024-06-17
provider: arXiv (Yao et al.)
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-15
updated: 2026-11-15
---

# tau-bench: A Benchmark for Tool-Agent-User Interaction in Real-World Domains

> [!quote] Source
> **URL**: https://arxiv.org/html/2406.12045v1 (arXiv 2406.12045)
> **Accessed**: 2026-11-15
> **Method/Context**: Primary paper, retrieved through web-tools for SMR-361 (benchmarking the slopify workflows). Only findings resting on this paper are recorded here; findings from Miller (arXiv 2411.00640) and the Anthropic posts belong to their own notes. Published 2024-06-17, so older than 18 months.

## Key evidence

- Metric definitions: pass@k is the chance that at least one of k i.i.d. trials succeeds (discovery/capability). pass^k is the chance that all k trials succeed (reliability/consistency). Choose pass@k where one success suffices and pass^k where consistency matters. ^e1
  > "pass^k measures the probability that all k trials succeed"

- Estimators: from n trials with c successes per task, the paper gives unbiased estimators pass^k = E_task[C(c,k)/C(n,k)] and pass@k = 1 - E_task[C(n-c,k)/C(n,k)]. At k=1 both equal mean per-trial success; as k grows pass@k tends toward 100% and pass^k toward 0%. (Formulas as supplied in the research findings; the divergence behaviour is a property of the formulas.) ^e2

- Observed run-to-run inconsistency: gpt-4o with function calling reached pass^1 of about 61% (retail) and about 35% (airline), and pass^8 below 25% in retail. The main results use at least 3 trials per task, with agent temperature 0.0 and user simulator temperature 1.0. ^e3
  > "pass^8 <25% in retail"

- Failure breakdown from a lone-trial analysis: 4 of 40 failures were task-specification typos or ambiguity. ^e4

## Limitations

- Published 2024-06-17 and based on gpt-4o-era models: the metric method remains current, the absolute numbers are not Opus-era and should not be read as expectations for current agents.
- The figures in ^e3 and ^e4 are as supplied to this note from the research findings, not re-checked against the paper text here.
- Domains are customer-service tool use (retail, airline) with a simulated user; transfer to the slopify workflows is untested.
- Reported figures say nothing about how many trials slopify benchmarking needs; the paper's "at least 3" is its own practice, not a recommendation.

## Relevance

- Supplies the pass^k versus pass@k vocabulary and estimators for deciding whether a slopify workflow benchmark reports capability or reliability, computable from n repeated runs per task.
- Shows that a repeat count of 3 or more per task is established practice in a reference agent benchmark, and that reliability can fall sharply as k rises even at moderate pass^1.
