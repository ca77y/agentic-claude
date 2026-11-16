---
title: Inspect AI Log Files
type: raw
summary: How Inspect AI (UK AISI) names, retains, and structures eval log files, with status, results, and per-sample detail in one log
tags: [evaluation, operations]
aliases: [Inspect eval logs, inspect.aisi.org.uk eval-logs]
source: https://inspect.aisi.org.uk/eval-logs.html
accessed: 2026-11-15
published: unknown
provider: UK AI Security Institute (Inspect AI documentation)
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-15
updated: 2026-11-15
---

# Inspect AI Log Files

> [!quote] Source
> **URL**: https://inspect.aisi.org.uk/eval-logs.html
> **Accessed**: 2026-11-15
> **Method/Context**: Inspect AI documentation page "Log Files". Undated page showing current docs (it mentions `.eval` as the default format since v0.3.46). Recorded for ticket SMR-361 (benchmarking the slopify workflows against a task set), as evidence on how an eval harness names and structures run logs.

## Key evidence

- Log file naming: Inspect names log files `{timestamp}_{task}_{id}`. The timestamp makes files sort sequentially and the id is a unique task id. The default directory is `./logs`, overridable with `--log-dir` or `INSPECT_LOG_DIR`, and the file name pattern is customisable via `INSPECT_EVAL_LOG_FILE_PATTERN`. Quote: "{timestamp}_{task}_{id}" ^e1
- Retries keep old logs: a retry creates a new log and does not overwrite the old one, preserving the task_id. Quote: "eval_retry() does not overwrite the previous log file, but rather creates a new one (preserving the task_id)" ^e2
- Log content: an `EvalLog` holds transcripts and summary in one file. Fields: version, status (started/success/error), eval (task, model, creation time), plan (solvers and generation config), results (aggregate scores), stats (token usage), error, tags, metadata, samples (input, output, target, score, messages), and reductions for multi-epoch runs. The docs say to always check `status == 'success'` before analysis. ^e3
- Size and partial reads: the binary `.eval` format is typically 1/8 the size of `.json`, and `read_eval_log_sample_summaries` reads per-sample scores without loading transcripts. Quote: "Typically 1/8 the size of .json files" ^e4

## Limitations

- Findings were recorded from the supplied description of the page; the page was not re-fetched in this pass.
- The page is undated, so currency is judged only from its mention of the `.eval` default since v0.3.46.
- Whether the page covers anything beyond the items above, such as retention policy, was not checked.

## Relevance

- Gives one example of a collision-resistant run naming scheme (timestamp plus unique id) that sorts chronologically and keeps retries as separate logs, relevant to naming benchmark runs for the slopify workflows.
- Shows a pattern of one log holding status, config, aggregate results, and per-sample detail, with a status field that analysis must check, relevant to separating non-gradable runs from failures.
