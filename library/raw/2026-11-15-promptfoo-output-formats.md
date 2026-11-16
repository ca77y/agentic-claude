---
title: promptfoo Output Formats
type: raw
summary: promptfoo can write a standalone self-contained HTML report or JSON, CSV, YAML, JUnit output that embeds config, prompts, outputs, per-assertion results and cost stats.
tags: [reliability]
aliases: []
source: https://www.promptfoo.dev/docs/configuration/outputs/
accessed: 2026-11-15
published: unknown
provider: promptfoo
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-15
updated: 2026-11-15
---

# promptfoo Output Formats

> [!quote] Source
> **URL**: https://www.promptfoo.dev/docs/configuration/outputs/
> **Accessed**: 2026-11-15
> **Method/Context**: Recorded for SMR-361 (benchmarking the slopify workflows). Findings were relayed to the scribe from the researcher's reading of the docs page; the page shows "Last updated Nov 15, 2026". The scribe did not re-fetch the page.

## Key evidence

- `promptfoo eval --output report.html` writes a standalone, self-contained HTML report with a sortable and filterable table, side-by-side output comparison, and pass/fail stats. Other output formats are json, jsonl, csv, yaml and junit.xml. Quote: "HTML outputs are self-contained ... No external dependencies required". ^e1
- JSON, HTML and YAML outputs embed the eval config (secrets redacted on a best-effort basis), timestamp, prompts, providers, tests, outputs, per-assertion results, and stats including latency, token usage and cost. ^e2
- The docs suggest date-prefixed filenames (for example `2024-01-15-baseline.html`) and gitignoring large outputs while keeping summaries. ^e3

## Limitations

- Findings were relayed, not re-read by the scribe; only the quoted phrase in ^e1 is verbatim.
- The page documents output formats only; it says nothing about run identity, repeats or caching (those sit on a separate promptfoo command-line page, not recorded here).

## Relevance

- Evidence for a single-file, self-contained HTML report as a benchmark result format, with the config and run stats embedded next to the per-test outputs.
