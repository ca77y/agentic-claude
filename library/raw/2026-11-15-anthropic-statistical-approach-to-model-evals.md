---
title: A statistical approach to model evaluations (Anthropic)
type: raw
summary: Anthropic's recommendations for error bars and paired-difference comparison of two eval arms, with clustered standard errors and resampling
tags: [reliability]
aliases: [Anthropic statistical approach to model evals]
source: https://www.anthropic.com/research/statistical-approach-to-model-evals
accessed: 2026-11-15
published: 2024-11-19
provider: Anthropic
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-15
updated: 2026-11-15
---

# A statistical approach to model evaluations (Anthropic)

> [!quote] Source
> **URL**: https://www.anthropic.com/research/statistical-approach-to-model-evals
> **Accessed**: 2026-11-15
> **Method/Context**: Retrieved for SMR-361 (benchmarking the slopify workflows against a baseline). Anthropic's summary of the primary paper, Miller, "Adding Error Bars to Evals", arXiv:2411.00640 (https://arxiv.org/html/2411.00640v1), which makes the same recommendations. Only the findings that rest on this page are recorded here.

## Key evidence

- Recommended statistics for comparing two arms: report the standard error of the mean with a 95% CI = mean +/- 1.96*SEM; cluster the standard errors when tasks are not independent; use a paired-difference analysis on a shared task list rather than a two-sample test; and report mean difference, SE, CI and the correlation between the arms' per-task scores. ^e1
- Anthropic's summary reports that frontier-model per-question score correlations are 0.3 to 0.7, so pairing is a "free" variance reduction. Quote: 'paired-difference analysis thus represents a "free" variance reduction technique'. ^e2
- Anthropic's summary reports that clustered SEs on popular evals can be over 3x the naive SE. ^e3
- Resampling (several answers per task, task-level means as scores) is recommended for non-deterministic or chain-of-thought evals, and the Inspect framework's `epochs` parameter computes SEs that way. ^e4

## Limitations

- Published 2024-11-19; the statistical method is not model-specific, but the 0.3 to 0.7 correlation range and the 3x clustering figure describe the evals and models the authors examined, not slopify workflow tasks.
- Findings e1 to e4 are recorded from the supplied research summary, not re-read from the page in this note; the quoted phrase in e2 is as supplied.
- The page was written for model evals; applying it to comparing workflow arms on a small task list is an inference, not a claim of the source.

## Relevance

- Gives the comparison design for a slopify benchmark: a shared task list run under both arms, a paired difference with SE and 95% CI, and the per-task correlation reported alongside it. ^e5
- Resampling per task with task-level means matches repeated runs of an agentic workflow; the primary paper corroborates the same recommendations.
