---
title: SWE-bench Evaluation Guide
type: raw
summary: How SWE-bench lays out run output, caches results by run_id, separates errors from failures, and pins reproducibility
tags: [reliability]
aliases: []
source: https://github.com/SWE-bench/SWE-bench/blob/main/docs/guides/evaluation.md
accessed: 2026-11-15
published: unknown
provider: GitHub (SWE-bench repository documentation)
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-15
updated: 2026-11-15
---

# SWE-bench Evaluation Guide

> [!quote] Source
> **URL**: https://github.com/SWE-bench/SWE-bench/blob/main/docs/guides/evaluation.md
> **Accessed**: 2026-11-15
> **Method/Context**: Repository documentation page on the main branch. Latest commit shown on the page: Sep 1 2026. No publication date on the page itself. Recorded for the SMR-361 question on benchmarking the slopify workflows, in particular run layout and run naming.

## Key evidence

- SWE-bench stores each run under `logs/evaluation/<run_id>/`, with a summary `results.json` and one folder per instance at `<run_id>/<model>/<instance_id>/` holding `report.json`, `test_output.txt`, `run_instance.log`, `eval.sh` and `patch.diff`. ^e1
  > [!quote] Quote
  > "A run writes two things, both under logs/evaluation/<run_id>/. A summary, results.json. A folder per instance, at logs/evaluation/<run_id>/<model>/<instance_id>/"
- `run_id` is a caller-chosen label, and results are cached by `run_id` plus `instance_id`. Rerunning with the same `run_id` reuses the first result even if the prediction changed, so a new `run_id` is required to re-evaluate. Relevant to a collision-free run naming scheme. ^e2
  > [!quote] Quote
  > "if you run the same instance with the same run_id multiple times, even with different prediction diffs, the harness will reuse the cached results from the first run ... you must use a different run_id"
- The summary separates graded outcomes from infrastructure outcomes. It counts resolved, unresolved, empty patches, errors, likely infrastructure failures and ambiguous failures. "Errors" means no `report.json` was produced (patch did not apply, container did not start, timeout). The pattern is to report non-gradable runs separately from failures. ^e3
  > [!quote] Quote (quote/paraphrase)
  > "Instances with errors counts ... instances with no report.json"
- Reproducibility rests on a containerised Docker environment plus a fixed `dataset_name` and a predictions file (JSONL with `instance_id`, `model_name_or_path`, `model_patch`). The guide documents no model-version pin or config snapshot file. ^e4
  > [!quote] Quote
  > "evaluated in a containerized Docker environment to ensure consistent results across different platforms"

## Limitations

- The absence of a model-version pin or config snapshot (^e4) is an inference from the guide not mentioning one; other SWE-bench files were not checked.
- The wording of the ^e3 quote is partly paraphrase, with the elided parts not reproduced here.
- Only this one page was read; the harness code itself was not inspected.

## Relevance

- Gives a concrete example of a per-run directory with a summary file next to per-instance detail (^e1).
- Shows why a run label must be unique per evaluation: a reused label silently returns stale results (^e2).
- Supports reporting infrastructure errors separately from graded failures (^e3).
