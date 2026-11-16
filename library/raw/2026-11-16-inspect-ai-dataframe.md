---
title: Inspect AI Log Dataframes
type: raw
summary: Inspect AI logs per-sample token usage and timing and loads them into Pandas dataframes via evals_df and samples_df, so aggregation is custom analysis code.
tags: [operations]
aliases: []
source: https://inspect.aisi.org.uk/dataframe.html
accessed: 2026-11-16
published: unknown
provider: UK AI Security Institute (Inspect AI), via context7 /websites/inspect_aisi_uk
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-16
updated: 2026-11-16
---

# Inspect AI Log Dataframes

> [!quote] Source
> **URL**: https://inspect.aisi.org.uk/dataframe.html
> **Accessed**: 2026-11-16
> **Method/Context**: Inspect docs page "log dataframes (evals_df, samples_df)", retrieved through the context7 MCP server (/websites/inspect_aisi_uk). Retrieved version unknown; published date unknown. The research question is how to benchmark the slopify workflows (SMR-361).

## Key evidence

- Inspect AI logs per-sample token usage and timing, and the logs load into Pandas dataframes, so aggregation across runs is custom analysis code. ^e1
  - Quote: "Sample summaries were enhanced in version 0.3.93 (May 1, 2025) to include the metadata, model_usage, total_time, working_time, and retries fields". The retrieved text attributes this sentence to the Inspect docs and CHANGELOG; the sentence is recorded here as retrieved and was not separately checked against the CHANGELOG.
  - Quote: "evals_df() returns one row per eval run ... samples_df() one row per sample with inputs, targets, scores, and timing". The ellipsis marks text elided in the retrieval.
  - Inference: because the logs reach the user as dataframes, any comparison across runs (means, differences, intervals) is analysis the user writes on top of them.
- Token limits and working_limit are configurable (finding as reported; the exact passage is not reproduced in this note). ^e2

## Limitations

- Cost in dollars is not mentioned in the retrieved text; token usage appears as `model_usage`, and its exact field structure was not retrieved (unknown).
- The docs show no built-in two-arm paired comparison view. This is not found, not confirmed absent.
- Retrieved through context7 snippets rather than a full page fetch, so surrounding text may be missing.
- Version of the docs is unknown; the 0.3.93 date is the only version marker in the retrieved text.

## Relevance

- Per-sample token usage, timing and retries are the raw measurements a benchmark of workflow runs needs, but a paired plugin-on versus plugin-off comparison would have to be built from the dataframes.
