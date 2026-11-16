---
title: Harbor view job results
type: raw
summary: Harbor's docs describe `harbor view <jobs-dir>`, a local web viewer for job results that must keep running; no static HTML export was found on the page.
tags: []
aliases: []
source: https://docs.harborframework.com/results/view-job-results
accessed: 2026-11-16
published: unknown
provider: web-tools
up: "[[library/_meta/index|Library Index]]"
related:
  - "[[library/raw/2026-11-16-harbor-framework-harbor|Harbor framework README]]"
  - "[[library/raw/2026-11-16-harbor-hosted-cli-docs|Harbor hosted CLI docs]]"
created: 2026-11-16
updated: 2026-11-16
---

# Harbor view job results

> [!quote] Source
> **URL**: https://docs.harborframework.com/results/view-job-results (page title: "View job results - Harbor")
> **Accessed**: 2026-11-16
> **Method/Context**: Captured for SMR-361 (benchmarking the slopify workflows), as part of asking what report a per-run benchmark can produce. Harbor is the runner for Terminal-Bench. The findings below are the writer's paraphrase of the page's text and image captions; no verbatim passage was recorded. Page version and date are not stated.

## Key evidence

- `harbor view <jobs-dir>` is a local web viewer over a directory of job results. It opens the first free port in 8080-8089 and must keep running while the results are being viewed. (paraphrase) ^e1
- The viewer lists jobs with search, filters and result columns. (paraphrase of text and image captions) ^e2
- The trial view shows reward, cost, tokens, timing, trajectory, agent and verifier files, and the resolved trial config. (paraphrase of text and image captions) ^e3
- The viewer can also launch new runs. (paraphrase) ^e4
- No static HTML export was found on the page. (absence on this one page; not a claim that Harbor has none) ^e5

## Limitations

- Paraphrase only: no quotation was kept, so wording-level claims (exact port range, column names) should be re-checked against the page before being cited as settled.
- The absence of a static export (^e5) rests on this one page. Other Harbor pages and the CLI were not searched for an export option in this capture.
- No Harbor version is stated on the page.
- The writer's brief also mentioned a Terminal-Bench page, https://www.tbench.ai/run?version=2.1, that confirms `harbor view jobs` from a search snippet. That page was not fetched here and is a separate source, so it is a lead only.

## Relevance

- For a benchmark that wants a report file per run, Harbor's own viewer is a served app, not a file: a script would have to start it and keep it running, or produce a report some other way. (inference from ^e1 and ^e5)
- The trial view's fields (reward, cost, tokens, timing, trajectory, resolved config) show what Harbor records per trial, and so what a slopify benchmark report might be compared against. (inference from ^e3)
