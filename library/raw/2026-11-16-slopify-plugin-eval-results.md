---
title: slopify local plugin eval results (aggregate-result.json, report.html)
type: raw
summary: Layout, fields and recorded spend of this repo's existing `claude plugin eval` smoke result directories under plugins/slopify/evals/results, a floor for benchmark cost and a model for per-run output.
tags: []
aliases: [slopify eval results, claude plugin eval output]
source: plugins/slopify/evals/results
accessed: 2026-11-16
published: unknown
provider: local files
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-16
updated: 2026-11-16
---

# slopify local plugin eval results (aggregate-result.json, report.html)

> [!quote] Source
> **URL**: `plugins/slopify/evals/results` in the repo (local directory, not a web URL; the repo gitignores `plugins/*/evals/results/`)
> **Accessed**: 2026-11-16
> **Method/Context**: Local result directories written by earlier `claude plugin eval` runs (smoke tagged, `--ablation none`), read while researching SMR-361 (benchmarking the slopify workflows against a bare model). Repo HEAD 1c5aefd. The finding below is an inference from the file listing and the JSON fields, not a quotation.

## Key evidence

- Each run writes `<results>/<ISO-timestamp>/aggregate-result.json` plus `report.html` (about 37-65 KB each). The JSON keys are `schemaVersion`, `claudeVersion`, `startedAt`, `durationSeconds`, `costUsd`, `partial`, `suite` (`root`, `ablation`, `tagFilters`, `threshold`, `concurrency`, `plugins`), `cases`, and `aggregates` (`casesTotal`, `casesPassed`, `overallScore`, `overallPassRate`). Inference from the file listing and JSON fields. ^e1
- Recorded spend of existing smoke runs with `--ablation none`: 6 cases cost USD 6.51 (4052 s), 7.18 (517 s), 8.29 (600 s) and 13.52 (600 s) across four runs; a 3-case run cost USD 3.25 and a 13-case "trigger" run cost USD 2.42. Values read from the `costUsd` and `durationSeconds` fields. ^e2
- Directory naming is timestamp based, not `<version>-<date>[-N]`; the `--output-dir` option can redirect it. Inference from the file listing; the `--output-dir` option is from the CLI help, which is a different source. ^e3

## Limitations

- Smoke cases only check that workflows start and reach their first milestones, so the figures in ^e2 are a floor, not the cost of full-task runs. The full-workflow cost per task was not measured.
- The runs used `--ablation none`, so no result here shows a no-plugin baseline arm or a score delta.
- The directory is gitignored and local to one machine; its contents will differ elsewhere and over time. Only the fields and figures listed above were recorded; the per-case contents were not recorded here.

## Relevance

- Gives a concrete shape for per-run machine-readable output (JSON aggregate plus HTML report) and a lower bound on spend for sizing a bare-versus-slopify benchmark: spend scales as tasks x arms x repeats x full-workflow cost, and the smoke runs show USD 2-14 per run before any full-task or baseline-arm work.
