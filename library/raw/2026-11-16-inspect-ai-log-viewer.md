---
title: Inspect AI Log Viewer
type: raw
summary: Inspect AI's log viewer is a local server over a log directory, and its Publishing section bundles logs into a static directory (not a single HTML file) that needs a range-request web server.
tags: [operations]
aliases: []
source: https://inspect.aisi.org.uk/log-viewer.html
accessed: 2026-11-16
published: unknown
provider: UK AI Security Institute (Inspect AI)
up: "[[library/_meta/index|Library Index]]"
related: ["[[library/raw/2026-11-16-inspect-ai-eval-logs|Inspect AI Eval Logs]]", "[[library/raw/2026-11-16-promptfoo-output-formats|promptfoo Output Formats]]"]
created: 2026-11-16
updated: 2026-11-16
---

# Inspect AI Log Viewer

> [!quote] Source
> **URL**: https://inspect.aisi.org.uk/log-viewer.html
> **Accessed**: 2026-11-16
> **Method/Context**: Gathered for SMR-361 (benchmarking the slopify workflows against a bare-model baseline), to see whether Inspect AI can produce a per-run HTML report that a script could place in a `<version>-<date>[-N]` directory. The page's version is not stated. Quoted passages are from the page; the rest is paraphrase or inference and is marked as such.

## Key evidence

- Inspect AI has no single-file HTML export. `inspect view bundle --log-dir logs --output-dir logs-www` (or the Python `bundle_log_dir`) writes a directory containing `index.html`, `robots.txt`, `assets/` and `logs/`. The bundle must be served by a static web server that supports HTTP range requests, and Python's built-in `http.server` does not. (Paraphrase of the page.) ^e1
  - > [!quote] From the page
  > "create a self contained directory with the log viewer and a set of logs for display"
- Bundling does not overwrite an existing output directory unless `--overwrite` is passed. `--output-dir` can be a local path, an S3 URL, or `hf/<org>/<space>` for HuggingFace Spaces (which needs `huggingface_hub` and a token). `INSPECT_VIEW_BUNDLE_OUTPUT_DIR` sets a default. Inference: a per-run directory is therefore an argument a wrapper script sets on each invocation. (Quote and paraphrase of the page, plus inference.) ^e2
- The interactive viewer, `inspect view`, is a local FastAPI/uvicorn server (default `127.0.0.1:7575`) over a log directory. The bundled static client reads `.eval` zip logs in the browser by byte-range requests, with no Python needed at read time. The viewer's Info panel shows dataset, solver and scorer details, the git revision, and model token usage. (Quote and paraphrase; the server and range-request details are also supported by Context7 `/ukgovernmentbeis/inspect_ai`, `design/eval-sharding.md` and `_view/view.py`, which this note does not cite further.) ^e3
- Inspect's docs navigation also lists log-processing APIs (`EvalLog`, dataframes) and Inspect Viz for custom analysis. Their pages were not fetched, so what they output is unverified. (Inference from the navigation and a one-line mention; uncertain.) ^e4
- Candidate C (Inspect AI) as a storage and HTML option: logs go to `./logs` by default (override with `INSPECT_LOG_DIR` or `--log-dir`) and are read through `inspect view`. The only static form is the bundled directory above. A plain `file://` open was not shown to work, because the range-request requirement was stated for a served directory and not tested here. Dataframe and `EvalLog` APIs exist for a custom comparison. (Paraphrase of the page, plus inference.) ^e5

## Limitations

- The page does not state a version, and the dataframe, `EvalLog` and Inspect Viz pages were not fetched, so any claim about their report output is unverified.
- Whether a bundle opens from `file://` was not tested.
- Bundling output size and per-run cost were not measured.

## Relevance

- Inspect AI's viewer is a directory plus a range-capable server, so it does not give one HTML file per run the way a single-file report would (compare [[library/raw/2026-11-16-promptfoo-output-formats|promptfoo Output Formats]]). Any `<version>-<date>[-N]` naming would come from a wrapper that sets `--output-dir` (see ^e2).
- Log storage and format details are in [[library/raw/2026-11-16-inspect-ai-eval-logs|Inspect AI Eval Logs]].
