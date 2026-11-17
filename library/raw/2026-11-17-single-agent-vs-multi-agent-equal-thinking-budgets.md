---
title: Single-Agent LLMs Outperform Multi-Agent Systems on Multi-Hop Reasoning Under Equal Thinking Token Budgets
type: raw
summary: Controlled arXiv study (Tran and Kiela) where a single agent matches or beats five multi-agent designs on multi-hop QA at matched thinking-token budgets.
tags: [evaluation, architecture, performance]
aliases: []
source: https://arxiv.org/abs/2604.02460
accessed: 2026-11-17
published: 2026-04-02
provider: web-tools
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-17
updated: 2026-11-17
---

# Single-Agent LLMs Outperform Multi-Agent Systems on Multi-Hop Reasoning Under Equal Thinking Token Budgets

> [!quote] Source
> **URL**: https://arxiv.org/abs/2604.02460 (full text read at https://arxiv.org/html/2604.02460v2)
> **Accessed**: 2026-11-17
> **Method/Context**: Tran and Kiela, arXiv 2604.02460v2. Published 2026-04-02 (v1); v2 2026-04-11. Read for research question smr-376 (published evals of single-agent vs multi-agent designs). Sections 4.1-4.4, 5.1, 5.3 and Appendix C were read; Appendix F (exact token multiples, bootstrap CIs) was not read.

## Key evidence

- **Setup (controlled on model and compute).** Task set: FRAMES and MuSiQue (4-hop subset only), both multi-hop world-knowledge QA with short ground-truth answers, graded by LLM-as-judge with the same rubric for all systems. Designs: SAS (one call, whole budget B); SAS-L (SAS plus a pre-answer analysis scaffold in the user message); five multi-agent systems (MAS) built from planner/worker/aggregator parts: Sequential (the main comparator), Subtask-parallel, Parallel-roles, Debate, Ensemble, all splitting the same global budget B. Models run per comparison: Qwen3-30B-A3B, DeepSeek-R1-Distill-Llama-70B, Gemini-2.5-Flash, Gemini-2.5-Pro. Held fixed: model yes, compute budget yes, tools n/a (text-only, no tools). ^e1
  > [!quote] Authors
  > "All architectures operate under the same global thinking-token budget B"
- **Success.** SAS is best or statistically indistinguishable from best at every budget except the 100-token one, where neither arm reasons. Debate is the strongest MAS. On Gemini-2.5-Pro FRAMES at the 5000 and 10000-token budgets, Ensemble attains the best accuracy. ^e2
  > [!quote] Authors
  > "under matched thinking token budgets ... SAS is the strongest default architecture for multi-hop reasoning"
- **Tokens.** SAS "consumes much less thinking token than any MAS variants". Exact multiples are in Appendix F, not read. ^e3
- **Latency.** Not reported in what was read. ^e4
- **Significance.** 95% bootstrap CIs (Appendix F). Table 1 bolds every system whose CI overlaps the best. Number of questions per dataset not found in the retrieved text. ^e5
- **Boundary found.** Under heavy context corruption (masking and substitution at alpha=0.7, Qwen3-30B-A3B, MuSiQue, 1000-token budget) Sequential MAS beats SAS. ^e6
  > [!quote] Authors
  > "Our claim is not that SAS always dominates in every regime"
- **Authors' stated limits.** Scope is text-only multi-hop reasoning. ^e7
  > [!quote] Authors
  > "MAS advantages with tools/vision or safety constraints are out of scope"

  Gemini thinking-token accounting is approximate. Only an upper cap on thinking tokens is enforced, not a lower one. The authors flag artifacts in API budget control (Gemini 2.5) and in standard benchmarks that can inflate MAS gains.

## Limitations

- Evidence is from sections 4.1-4.4, 5.1, 5.3 and Appendix C; Appendix F (token multiples, CIs) was not read, so token ratios and exact confidence intervals are unrecorded. ^e8
- No sample size and no latency figures recorded. ^e9
- The setting is single-call text reasoning without tools, so it says little about tool-using, long-horizon, or safety-constrained agents. The authors say the same. ^e10
- Budgets bound thinking tokens only; the budget-control artifacts the authors flag could favor either arm.

## Relevance

- A controlled (same model, same compute) data point that, for text-only multi-hop QA, splitting a fixed budget across agents did not beat one agent. It is evidence about equal-compute comparisons, not about agents with tools or parallel wall-clock gains. ^e11
- The corrupted-context boundary (^e6) is the one condition found where a multi-agent design won.
