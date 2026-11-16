---
title: Judging the Judges - Position Bias in LLM-as-a-Judge
type: raw
summary: Shi et al. study of position bias across 15 LLM judges; bias is non-random, varies by judge and task, and grows when two answers are close in quality.
tags: [evaluation, llm-as-judge, reliability]
aliases: []
source: https://arxiv.org/abs/2406.07791
accessed: 2026-11-15
published: 2024-06-12
provider: arXiv
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-15
updated: 2026-11-15
---

# Judging the Judges - Position Bias in LLM-as-a-Judge

> [!quote] Source
> **URL**: https://arxiv.org/abs/2406.07791
> **Accessed**: 2026-11-15
> **Method/Context**: Shi et al., "Judging the Judges: A Systematic Study of Position Bias in LLM-as-a-Judge", AACL-IJCNLP 2025, v9. First submitted 2024-06-12; v9 dated 2025-11-11. Retrieved for SMR-361 (benchmarking the slopify workflows against a bare model). Only the abstract was read; no numeric effect sizes were retrieved.

## Key evidence

- Position bias is not random chance and varies significantly across judges and tasks. Quote (abstract): "position bias is not due to random chance and varies significantly across judges and tasks". ^e1
- Study scale: 15 LLM judges, MTBench and DevBench (22 tasks, about 40 solution models), over 150,000 evaluation instances. The paper introduces repetition stability, position consistency and preference fairness metrics. DevBench is a code-oriented set. ^e2
- Position bias is "strongly affected by the quality gap between solutions" (bias grows when two answers are close in quality) but only weakly by prompt length. ^e3

## Limitations

- Abstract only; no numeric effect sizes, per-judge results or mitigation results were retrieved.
- Inference, not from the source: the judges studied may not include the judge model a project would use, so the size of the bias for that judge is unknown.

## Relevance

- Inference: two near-equal arms (the likely case for slopify versus a bare Opus run) fall where order bias is worst, which supports judging each pair in both orders. The paper's abstract does not itself recommend this mitigation.
