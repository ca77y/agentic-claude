---
title: Inspect AI epochs source (via context7)
type: raw
summary: How Inspect AI repeats each sample over epochs and reduces the epoch scores, from its epochs.py, run.py and results.py source as returned by context7.
tags: []
aliases: []
source: https://github.com/ukgovernmentbeis/inspect_ai/blob/main/src/inspect_ai/_eval/task/epochs.py
accessed: 2026-11-16
published: unknown
provider: context7 (/ukgovernmentbeis/inspect_ai)
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-16
updated: 2026-11-16
---

# Inspect AI epochs source (via context7)

> [!quote] Source
> **URL**: https://github.com/ukgovernmentbeis/inspect_ai/blob/main/src/inspect_ai/_eval/task/epochs.py
> **Accessed**: 2026-11-16
> **Method/Context**: Retrieved through the context7 MCP server (`/ukgovernmentbeis/inspect_ai`) while benchmarking the slopify workflows against existing eval frameworks. The retrieved material spans `_eval/task/epochs.py`, `run.py`, `results.py` and `design/metric-score-view-refactor.md`. The version is not stated; it is current main. Publication date unknown.

## Key evidence

- `Epochs(n, reducer)` or `epochs=n` runs every sample n times. Each (sample, epoch) pair is an independent run with its own sandbox and scorer call. The default reducer is mean, and reducers such as median, mode and max are supported (a list gives one result per reducer). stderr and bootstrap_stderr metrics operate on epoch-reduced per-sample scores, and "unreduced" metrics see the raw epoch scores. ^e1
  - Source passage (paraphrase of the context7 description, not a verbatim quote): "Each epoch of each sample is an independent execution with its own sandbox, scorer call, and EvalSample record."

## Limitations

- The context7 excerpts are a description of the source, not the files read in full; the passage above is a paraphrase.
- The material does not show whether the stderr over epoch-reduced scores gives a valid paired two-arm interval. That is not established here.
- The version is not stated.

## Relevance

- Inspect's repeat mechanism is the nondeterminism control for a bare-versus-plugin comparison: epochs repeat each sample, and the reducer and stderr metrics set what the per-sample score and its error are. Whether a paired comparison between two arms is valid on top of this is open (see Limitations).
