---
title: Establishing Best Practices for Building Rigorous Agentic Benchmarks (ABC)
type: raw
summary: Paper and checklist (ABC) showing ten popular agent benchmarks have validity flaws that mis-estimate agent performance by up to 100% in relative terms, with mitigations such as trivial-agent baselines and oracle solvers
tags: [evaluation, benchmarking, reliability]
aliases: [Agentic Benchmark Checklist, ABC, Zhu et al. 2025, arXiv 2507.02825]
source: https://arxiv.org/html/2507.02825
accessed: 2026-11-15
published: 2025-08-07
provider: arXiv (Zhu et al.)
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-15
updated: 2026-11-15
---

# Establishing Best Practices for Building Rigorous Agentic Benchmarks (ABC)

> [!quote] Source
> **URL**: https://arxiv.org/html/2507.02825
> **Accessed**: 2026-11-15
> **Method/Context**: Retrieved for SMR-361 (benchmarking the slopify workflows against a lighter run). arXiv:2507.02825, version v5 dated 2025-08-07 (first posted July 2025), within the 18-month window. The `published` field holds the v5 date. Only the findings that rest on this paper are recorded here; the other SMR-361 sources have their own notes.

## Key evidence

- **Validity issues across ten popular benchmarks.** The Agentic Benchmark Checklist (ABC) was applied to ten popular agentic benchmarks and found issues that distort measured agent performance, in either direction. ^e1
  - Quote: "issues that can cause under- or overestimation of agent capabilities by up to 100% in relative terms"
- **Worked examples of mis-estimation.** ^e2
  - tau-bench: a trivial agent passes 38% of tasks, because an agent that returns nothing counts as success on intentionally unattainable tasks. An agent that lists every possible answer inflates the score by 40%.
  - KernelBench: overestimates correctness by about 31%.
  - OSWorld, chrome section: underestimates by 28%, because website changes broke the HTML selectors.
- **LLM-judge weakness in WebArena.** The WebArena LLM judge accepts an empty reply on "N/A" tasks. Its unvalidated LLM-as-judge combined with substring matching overestimates performance by 1.4-5.2%. ^e3
- **Reporting checks are mostly unmet.** The checklist's reporting items include statistical significance (R.10) and trivial-agent baselines (R.13). In the paper's appendix scoring, most assessed benchmarks report neither. ^e4
- **Mitigations the paper gives.** Run a do-nothing or trivial agent as a floor, verify each task with an oracle solver, report statistical significance, and document unavoidable flaws and their impact. ^e5

## Limitations

- Findings come from the HTML rendering of v5 only; earlier versions were not compared.
- The per-benchmark figures (38%, 40%, 31%, 28%, 1.4-5.2%) are the authors' own estimates; they were not checked against the benchmarks' own repositories.
- The paper assesses public benchmarks of general agent tasks, not workflow-level comparisons such as the slopify workflows against a lighter run. Applying its checks to such a comparison is inference, not something the paper states.
- Overlapping claims from other sources (trivial-agent floors in Berkeley RDI's post, judge leakage in WebArena) rest on those sources and are recorded in their own notes, not here.

## Relevance

- Supports using a trivial or do-nothing arm as a floor and an oracle or reference solution per task when benchmarking a workflow, and reporting statistical significance rather than a single score (R.10, R.13). ^e6
- Caution for any LLM-judged arm comparison: an unvalidated judge can over-credit results by a few percent (WebArena example). ^e7
