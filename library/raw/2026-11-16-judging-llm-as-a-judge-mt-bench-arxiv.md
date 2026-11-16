---
title: Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena (arXiv 2306.05685)
type: raw
summary: Zheng et al. measure how well strong LLM judges agree with human preferences (over 80% for GPT-4) and name the judge biases, on chat-assistant answers
tags: []
aliases: []
source: https://arxiv.org/abs/2306.05685
accessed: 2026-11-16
published: 2023-06-09
provider: arXiv
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-16
updated: 2026-11-16
---

# Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena (arXiv 2306.05685)

> [!quote] Source
> **URL**: https://arxiv.org/abs/2306.05685
> **Accessed**: 2026-11-16
> **Method/Context**: Zheng et al., arXiv:2306.05685 v4, NeurIPS 2023 Datasets and Benchmarks. Published 2023-06-09, revised 2023-12-24. Retrieved during SMR-361 (benchmark the slopify workflows against a bare-model baseline). Lines marked "quote" are verbatim from the retrieved text; the rest paraphrase it.

## Key evidence

- Strong LLM judges agree with human preferences over 80% of the time, the same level as human-human agreement. The judges show position, verbosity and self-enhancement biases and limited reasoning ability. ^e1
  > [!quote]
  > "strong LLM judges like GPT-4 can match both controlled and crowdsourced human preferences well, achieving over 80% agreement"

## Limitations

- The agreement result was measured on chat-assistant answers (MT-Bench and Chatbot Arena), not on agent work products. That the result transfers to agent work is not shown by this source (inference).
- The bias list and the "limited reasoning ability" caveat are paraphrased from the retrieved abstract-level text; this note does not record the paper's size or mitigation results.

## Relevance

- SMR-361 compares slopify workflows against a bare-model baseline. ^e1 is evidence on how far an LLM-judge grader can be trusted and which biases to guard against (for example order of the two arms, and length of output).
- Inference: because the evidence is about chat answers, an LLM rubric grading agent output would need its own agreement check against human judgement.
