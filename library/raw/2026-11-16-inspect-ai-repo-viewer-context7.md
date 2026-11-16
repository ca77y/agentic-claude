---
title: Inspect AI repository, viewer and log-shard design (Context7)
type: raw
summary: Context7 excerpts from the inspect_ai repository (design/eval-sharding.md, _view/view.py) on the local log viewer server and its static client reading .eval logs by byte-range requests.
tags: []
aliases: []
source: https://github.com/ukgovernmentbeis/inspect_ai
accessed: 2026-11-16
published: unknown
provider: Context7
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-16
updated: 2026-11-16
---

# Inspect AI repository, viewer and log-shard design (Context7)

> [!quote] Source
> **URL**: https://github.com/ukgovernmentbeis/inspect_ai
> **Accessed**: 2026-11-16
> **Method/Context**: Context7 library `/ukgovernmentbeis/inspect_ai`, passages from `design/eval-sharding.md` and `_view/view.py`, retrieved during research on SMR-361 (benchmarking the slopify workflows against a bare-model baseline; question: which tools produce a per-run HTML report). No tool version was stated. The note records only the viewer findings below; it does not cover the Inspect documentation pages, bundling options or the Info panel.

## Key evidence

- Inspect's interactive viewer, `inspect view`, is a local FastAPI/uvicorn server over a log directory, listening by default on 127.0.0.1:7575. (paraphrase of `_view/view.py` as returned by Context7) ^e1
- The bundled static client reads `.eval` zip-format logs in the browser using byte-range requests, so no Python is needed at read time. (paraphrase of `design/eval-sharding.md` as returned by Context7) ^e2

## Limitations

- Context7 returns excerpts, not the full files; the exact passages were not retained verbatim, so both bullets are paraphrase, not quotation.
- The excerpts describe the viewer and its client. They do not show a single-file HTML export, and absence of one is not established by this source.
- Other claims about the same viewer (Info panel contents, `inspect view bundle` output layout, range-request server requirement, overwrite and output-dir options) rest on the Inspect docs page, not on this source, and are not recorded here.
- Publication date and version unknown.

## Relevance

- Supports the view that Inspect's report surface is a served viewer over logs rather than a static per-run file (see ^e1, ^e2), which matters when choosing a per-run report format for the slopify benchmark.
