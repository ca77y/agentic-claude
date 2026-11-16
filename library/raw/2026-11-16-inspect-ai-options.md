---
title: Inspect AI Eval Options (Epochs)
type: raw
summary: Inspect AI repeats each sample with --epochs and reduces the repeats with built-in reducers such as mean, median, mode, max, at_least_N, pass_at_k and pass_k_k.
tags: [operations]
aliases: []
source: https://inspect.aisi.org.uk/options.html
accessed: 2026-11-16
published: unknown
provider: UK AI Security Institute (Inspect AI), via context7 /websites/inspect_aisi_uk
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-16
updated: 2026-11-16
---

# Inspect AI Eval Options (Epochs)

> [!quote] Source
> **URL**: https://inspect.aisi.org.uk/options.html
> **Accessed**: 2026-11-16
> **Method/Context**: Gathered for SMR-361 (benchmarking the slopify workflows). Retrieved through context7 (`/websites/inspect_aisi_uk`), not by fetching the page directly. The retrieval cited options.html together with metrics.html; the finding below was not split between the two pages. Published date and docs version unknown.

## Key evidence

- Inspect AI repeats each sample a set number of times with epochs and reduces the repeats with built-in reducers, including mean, median, mode, max, at_least_N, pass_at_k and pass_k_k. ^e1
  - > [!quote] From the page (via context7)
  > `--epochs` Number of times to repeat each sample ... Built in reducers include mean, median, mode, max, at_least_{n}, pass_at_{k}, and pass_k_{k}
- The definition of pass_at, as retrieved: "Probability of at least 1 correct sample given k epochs", with a link to arXiv 2107.03374. This definition came in the same retrieval and may come from metrics.html rather than options.html. ^e2

## Limitations

- Retrieved through context7, not read on the live page; the quotes are as context7 returned them, with ellipses where text was elided.
- The page's published date and the docs version are unknown.
- The retrieval did not separate options.html from metrics.html, so the pass_at definition (^e2) cannot be pinned to this page alone.
- This note records what the options page says about epochs and reducers only. It does not say how epochs feed standard errors or comparisons between two arms.

## Relevance

- For SMR-361, epochs are Inspect's built-in way to repeat a task run and aggregate the repeats, which bears on how a benchmark of the slopify workflows could handle run-to-run variance. Whether that fits long agentic tasks is not stated by the source.
