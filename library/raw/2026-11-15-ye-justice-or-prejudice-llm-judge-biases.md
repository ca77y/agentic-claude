---
title: Justice or Prejudice? Quantifying Biases in LLM-as-a-Judge
type: raw
summary: Ye et al. propose a taxonomy of 12 LLM-judge biases and the CALM attack-and-detect framework; abstract-level record only
tags: [evaluation, llm-as-judge]
aliases: [CALM, Justice or Prejudice]
source: https://arxiv.org/abs/2410.02736
accessed: 2026-11-15
published: 2024-10-03
provider: arXiv
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-15
updated: 2026-11-15
---

# Justice or Prejudice? Quantifying Biases in LLM-as-a-Judge

> [!quote] Source
> **URL**: https://arxiv.org/abs/2410.02736
> **Accessed**: 2026-11-15
> **Method/Context**: Ye et al., 2024, "Justice or Prejudice? Quantifying Biases in LLM-as-a-Judge". Recorded for SMR-361 (benchmarking the slopify workflows). Only the abstract was read; per-bias numbers were not retrieved.

## Key evidence

- The paper presents a taxonomy of 12 judge biases and an attack-and-detect framework (CALM) for measuring them. Its authors report that biases remain for advanced models in some tasks. ^e1
  > [!quote] Quote
  > "while advanced models have achieved commendable overall performance, significant biases persist in certain specific tasks" (abstract)

## Limitations

- Abstract only. No per-bias effect sizes, model list, or task list were retrieved, so the size and direction of each bias is unknown from this note.
- The count of 12 biases and the name CALM come from the research finding supplied for this note, not from a separate read of the paper body.

## Relevance

- Supports treating LLM-judge scores in a slopify benchmark as biased by default, so a design needs mitigations (for example order-swapped judging, output length reported per arm) instead of a single open "which is better" judgment. This is inference, not a claim of the paper.
