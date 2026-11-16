---
title: Inspect AI changelog (via context7)
type: raw
summary: Inspect AI changelog entry showing that sample summaries carry model usage, total time, working time and retries, as returned by context7.
tags: []
aliases: []
source: https://inspect.aisi.org.uk/CHANGELOG.html
accessed: 2026-11-16
published: unknown
provider: context7 (/websites/inspect_aisi_uk)
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-16
updated: 2026-11-16
---

# Inspect AI changelog (via context7)

> [!quote] Source
> **URL**: https://inspect.aisi.org.uk/CHANGELOG.html
> **Accessed**: 2026-11-16
> **Method/Context**: Retrieved through the context7 MCP server (/websites/inspect_aisi_uk) while researching how to benchmark the slopify workflows (SMR-361). The Inspect docs version and the changelog's publication date are unknown.

## Key evidence

- Inspect AI logs per-sample token usage and timing. The changelog says sample summaries gained these fields in version 0.3.93. ^e1

  > [!quote] Source excerpt
  > "Sample summaries were enhanced in version 0.3.93 (May 1, 2025) to include the metadata, model_usage, total_time, working_time, and retries fields" (quoted from the context7 result for the Inspect docs and changelog; the passage is one the finding cites to the changelog).

  Inference, not quoted: aggregating this usage and timing across a benchmark run is custom analysis code, because the same finding notes logs load into Pandas dataframes (that dataframe passage, `evals_df()` and `samples_df()`, comes from the Inspect dataframe docs, not this changelog, and is not recorded here).

## Limitations

- Only one passage from this source was supplied. It names `model_usage` but the retrieved text does not mention cost in dollars.
- Version and publication date of the changelog are unknown; the version cited inside the quote is 0.3.93 (May 1, 2025).
- The exact attribution between the changelog and the dataframe docs in the context7 result was given as "dataframe.html and CHANGELOG"; this note keeps the quote only and does not claim which page held it beyond that.

## Relevance

- Supports the finding that Inspect AI records per-sample token usage and timing, which a benchmark of the slopify workflows could compare across two arms by writing its own aggregation.
