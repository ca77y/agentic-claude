---
title: Inspect AI Eval Logs
type: raw
summary: Inspect AI writes per-eval logs to a configurable log directory in a binary .eval or text .json format, locally or on remote storage, and reads them through a CLI and Python API.
tags: [operations]
aliases: []
source: https://inspect.aisi.org.uk/eval-logs.html
accessed: 2026-11-16
published: unknown
provider: UK AI Security Institute (Inspect AI)
up: "[[library/wiki/operations|Operations]]"
related: []
created: 2026-11-16
updated: 2026-11-16
---

# Inspect AI Eval Logs

> [!quote] Source
> **URL**: https://inspect.aisi.org.uk/eval-logs.html
> **Accessed**: 2026-11-16
> **Method/Context**: Gathered for SMR-361 (benchmarking the slopify workflows), to see how an eval tool could store per-run results in a directory named `<version>-<date>[-N]`. The page's version date is not stated. Quoted passages are from the page; the rest is paraphrase or inference and is marked as such.

## Key evidence

- Inspect AI writes per-eval log files into a directory set by `--log-dir` or `INSPECT_LOG_DIR` (default `./logs`). A per-run directory named `<version>-<date>[-N]` is therefore reachable by setting the log directory on each invocation. ^e1
  - > [!quote] From the page
  > "inspect eval popularity.py --model ... --log-dir ./experiment-log"
  >
  > "The INSPECT_LOG_DIR environment variable can also be specified to override the default ./logs location."
- Log files default to the `.eval` binary format (default since v0.3.46). The `.json` text format is selectable through `INSPECT_LOG_FORMAT`. A `.eval` file is binary and so not human-diffable plain text. `.json` is plain text but takes substantially more disk space and is slow in the viewer above 50MB. ^e2
  - > [!quote] From the page
  > ".eval | Binary file format optimised for size and speed. Typically 1/8 the size of .json files"
  >
  > ".json | Text file format with native JSON representation."
- Log file names default to `{timestamp}_{task}_{id}`. The timestamp prefix is required; the rest is customisable through `INSPECT_EVAL_LOG_FILE_PATTERN` (task, model, and id fields). Inference: version-date naming has to come from the directory, not the file name. (Paraphrase of the page, plus inference.) ^e3
- Logs can also go to remote storage (`s3://`, `hf://buckets/...`, `az://`, `abfss://`) through the same log directory setting. Locations are URIs resolved by fsspec, and local plain-file storage is the default. ^e4
  - > [!quote] From the page
  > "EvalLog.location is a URI rather than a traditional file path (e.g. it could be a file:// URI, an s3:// URI ...)"
- Logs are reachable from the CLI and from Python: `inspect log list/dump/convert/export-config/schema`, plus `list_eval_logs()` and `read_eval_log()`. A custom script can read the log directory and build a report, and `inspect view` serves a viewer for a log directory. (Paraphrase of the page.) ^e5

## Limitations

- The page does not state its version date, so currency is unknown beyond the access date.
- Whether a static HTML export per run exists was not verified. `inspect view bundle` is named only in passing on the page.
- Items ^e2 and ^e3 rest on the page's format table and naming text as read in this run; the `.eval` format version (v0.3.46) is the page's claim, not checked elsewhere.

## Relevance

- Bears on SMR-361's choice of where per-run benchmark results live. Inspect's log directory can be set per invocation, but its default `.eval` format is binary, and file names carry a timestamp rather than a version, so any `<version>-<date>[-N]` scheme would be a directory-level convention supplied by the caller.
