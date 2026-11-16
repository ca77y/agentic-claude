---
title: LLM Evaluators Recognize and Favor Their Own Generations
type: raw
summary: Panickssery et al. (arXiv:2404.13076) abstract on LLM judges recognizing their own output and preferring it, with a linear link between self-recognition and self-preference.
tags: [reliability]
aliases: [self-preference bias, Panickssery self-recognition]
source: https://arxiv.org/abs/2404.13076
accessed: 2026-11-15
published: 2024-04-15
provider: arXiv (Panickssery, Bowman, Feng)
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-15
updated: 2026-11-15
---

# LLM Evaluators Recognize and Favor Their Own Generations

> [!quote] Source
> **URL**: https://arxiv.org/abs/2404.13076
> **Accessed**: 2026-11-15
> **Method/Context**: Abstract only; effect sizes are in the full text, which was not retrieved. Submitted 2024-04-15 (v1), about 19 months before access. Recorded for SMR-361, benchmarking slopify workflows against a bare model.

## Key evidence

- Out of the box, GPT-4 and Llama 2 distinguish their own output from other LLMs and from humans with non-trivial accuracy. Fine-tuning shows a linear correlation between self-recognition and the strength of self-preference. Human annotators rated the outputs as equal quality. ^e1
  > [!quote] Abstract
  > "we discover a linear correlation between self-recognition capability and the strength of self-preference bias"

## Limitations

> [!warning] Caveats
> - Abstract only; accuracy figures, datasets, and the fine-tuning setup are unchecked.
> - The models tested were GPT-4 and Llama 2. Nothing here tests Claude judges.
> - The "equal quality" statement is the human annotators' rating as relayed in the abstract; how many outputs or raters is not known from this source.
> - Inference, not quotation: reading the correlation as a causal link is not claimed in the quoted sentence.

## Relevance

- For slopify versus bare Opus, both arms are Claude outputs, and a Claude judge may recognize and favor its own style. e1 is evidence that the risk is real, not that it applies to Claude specifically.
