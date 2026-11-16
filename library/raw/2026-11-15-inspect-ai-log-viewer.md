---
title: Inspect AI Log Viewer
type: raw
summary: Inspect AI (UK AISI) log viewer docs - what the viewer shows per log and sample, and how logs are bundled into a static site.
tags: [evaluation, operations]
aliases: []
source: https://inspect.aisi.org.uk/log-viewer.html
accessed: 2026-11-15
published: unknown
provider: UK AI Security Institute (Inspect AI documentation)
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-15
updated: 2026-11-15
---

# Inspect AI Log Viewer

> [!quote] Source
> **URL**: https://inspect.aisi.org.uk/log-viewer.html
> **Accessed**: 2026-11-15
> **Method/Context**: Retrieved for SMR-361 (benchmarking the slopify workflows), as evidence on how an eval harness presents and publishes run records. The page carries no publication date; it is current documentation as retrieved.

## Key evidence

- The viewer's Info panel shows, per log, "additional meta-information about evaluation tasks, including dataset, solver, and scorer details, git revision, and model token usage" (quote). Sample drill-down has Messages, Scoring (input, target, answer, explanation) and Metadata tabs. Samples can be sorted by sample to see all epochs of one sample together, which helps diagnose inconsistency across epochs. ^e1
- Inspect publishes results as a static site: `inspect view bundle --log-dir logs --output-dir logs-www` yields `index.html`, `robots.txt`, `assets/` and `logs/`. The output can be deployed to GitHub Pages or S3 but needs HTTP range requests; "notably, Python's built in http.server does not" (quote) support them. An existing output directory is not overwritten without `--overwrite`. This is a bundled viewer app, not a single self-contained HTML file. ^e2

## Limitations

- Quotation is limited to the two phrases marked as quotes; the rest of each bullet is paraphrase of the page.
- The page is undated, so currency of the commands and flags rests on the retrieval date only.
- Only this page was recorded here; Inspect's log file naming, EvalLog fields and retry behaviour are documented on a different page (Log Files) and are not recorded in this note.

## Relevance

- ^e1 is evidence that a harness viewer can pair each run with its configuration context (git revision, solver, scorer, token usage) and let a reader compare repeated epochs of one sample.
- ^e2 shows that publishing run records as a static site needs a bundle step and a server with range requests, which differs from a single standalone HTML report.
