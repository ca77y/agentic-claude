---
title: Anthropic, A statistical approach to model evaluations
type: raw
summary: Anthropic's post recommends reporting paired differences, standard errors and 95% confidence intervals, clustered errors, resampling and power analysis when comparing two models, and notes Inspect computes standard errors across epochs.
tags: [reliability]
aliases: []
source: https://www.anthropic.com/research/statistical-approach-to-model-evals
accessed: 2026-11-16
published: 2024-11-19
provider: Anthropic
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-16
updated: 2026-11-16
---

# Anthropic, A statistical approach to model evaluations

> [!quote] Source
> **URL**: https://www.anthropic.com/research/statistical-approach-to-model-evals
> **Accessed**: 2026-11-16
> **Method/Context**: Gathered for SMR-361 (benchmarking the slopify workflows). The findings below were reported by a researcher from the post, published 2024-11-19; the accompanying paper is arXiv:2411.00640. Quotations are marked as quotes; everything else is paraphrase or inference.

## Key evidence

- Guidance for comparing two models or configurations: report the standard error of the mean (SEM) and a 95% confidence interval (mean +/- 1.96 SEM), cluster standard errors where questions are related, resample several times per question to reduce variance, analyze paired differences because the question set is shared, and use power analysis to size the question count (paraphrase). Quote: "our paper recommends reporting pairwise information - mean differences, standard errors, confidence intervals, and correlations - whenever two or more models are being compared". ^e1
- The correlation between frontier models' question scores is "between 0.3 and 0.7" (quote). This is the reason given for analyzing paired differences. ^e2
- Anthropic says of the Inspect framework: "the Inspect framework correctly computes standard errors in this way via its epochs parameter" (quote). ^e3

## Limitations

- The post covers question-level evals. Applying it to long agentic tasks with a small task count is the researcher's inference and is not stated in the source.
- The post's tie to Inspect's `@scorer(metrics=[accuracy(), stderr()])` declaration comes from Inspect's custom-scorer docs, not from this source.

## Relevance

- Gives the statistical reporting a benchmark of slopify workflows (for example plugin on versus off) would need: paired differences with confidence intervals, repeated runs per task, and a power estimate for the task count.
