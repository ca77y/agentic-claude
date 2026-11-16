---
title: Inspect AI Metrics and Epoch Reducers
type: raw
summary: Inspect AI repeats each sample over epochs and combines the repeats with built-in reducers such as mean, median, mode, max, at_least_N, pass_at_k and pass_k_k.
tags: [reliability]
aliases: []
source: https://inspect.aisi.org.uk/metrics.html
accessed: 2026-11-16
published: unknown
provider: UK AI Security Institute (Inspect AI), via context7 /websites/inspect_aisi_uk
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-16
updated: 2026-11-16
---

# Inspect AI Metrics and Epoch Reducers

> [!quote] Source
> **URL**: https://inspect.aisi.org.uk/metrics.html
> **Accessed**: 2026-11-16
> **Method/Context**: Retrieved through context7 (`/websites/inspect_aisi_uk`), together with the companion options page (`options.html`). Page version and publication date unknown.

## Key evidence

- Inspect AI repeats each sample a set number of times (epochs) and reduces the repeats with a built-in reducer. Quoted from the options page: "--epochs Number of times to repeat each sample ... Built in reducers include mean, median, mode, max, at_least_{n}, pass_at_{k}, and pass_k_{k}". ^e1
- `pass_at_k` is defined on the metrics page as "Probability of at least 1 correct sample given k epochs", with a link to arXiv 2107.03374 (quote). ^e2

## Limitations

- Retrieved through context7 excerpts, not the full page; the definitions of the other reducers (`pass_k_k`, `at_least_N`) were not read.
- Page version and publication date unknown.
- This note does not cover how reducer output feeds standard errors or confidence intervals.

## Relevance

- Inspect AI offers repeat-and-reduce evaluation of a sample natively, which bears on how a benchmark of the slopify workflows could handle run-to-run variance (inference; the source does not discuss agentic workflow benchmarks).
