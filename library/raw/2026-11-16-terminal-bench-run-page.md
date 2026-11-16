---
title: Terminal-Bench run page (version 2.1)
type: raw
summary: A search snippet of the Terminal-Bench "How to run" page confirms that Harbor's `harbor view jobs` is the way to view run results; the page itself was not fetched.
tags: [operations]
aliases: []
source: https://www.tbench.ai/run?version=2.1
accessed: 2026-11-16
published: unknown
provider: Terminal-Bench (tbench.ai)
up: "[[library/wiki/operations|Operations]]"
related: []
created: 2026-11-16
updated: 2026-11-16
---

# Terminal-Bench run page (version 2.1)

> [!quote] Source
> **URL**: https://www.tbench.ai/run?version=2.1
> **Accessed**: 2026-11-16
> **Method/Context**: Gathered for SMR-361 (benchmarking the slopify workflows). A researcher saw this page only as a web search snippet titled "How to run Terminal-Bench"; the page was not fetched. Only the finding that rests on this source is recorded here. The wording is the researcher's paraphrase, not a verbatim quotation.

## Key evidence

- The snippet confirms that Harbor, the runner for Terminal-Bench, is used to view job results with `harbor view jobs` (`jobs` being the jobs directory). (paraphrase of a search snippet) ^e1

## Limitations

- Search snippet only: the full page, the version 2.1 instructions and any other run or reporting guidance were not read.
- The page says nothing, in what was seen, about the viewer's output format. What `harbor view` shows (a local web viewer, no static HTML export found) comes from the Harbor docs page https://docs.harborframework.com/results/view-job-results, which is a separate source and is not recorded in this note.
- Published date unknown.

## Relevance

- Corroborates, from the benchmark's own site, that Terminal-Bench results are viewed through Harbor's `harbor view` command (^e1). That bears on SMR-361's question of how a benchmark run's report could be produced, but this source alone does not establish whether a static report file exists.
