---
title: SWE-bench GitHub repository and README
type: raw
summary: GitHub API metadata and README for SWE-bench/SWE-bench (MIT, Python, about 6.2k stars); its harness evaluates patch predictions and does not invoke an agent for the eval step.
tags: []
aliases: [SWE-bench repo]
source: https://api.github.com/repos/SWE-bench/SWE-bench
accessed: 2026-11-16
published: unknown
provider: GitHub API
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-16
updated: 2026-11-16
---

# SWE-bench GitHub repository and README

> [!quote] Source
> **URL**: https://api.github.com/repos/SWE-bench/SWE-bench
> **Accessed**: 2026-11-16
> **Method/Context**: GitHub API repository record for SWE-bench/SWE-bench, plus the repository README at https://raw.githubusercontent.com/SWE-bench/SWE-bench/main/README.md (main branch at retrieval), read while researching SMR-361 (benchmarking the slopify workflows against a bare model). Version date: repo metadata as of 2026-11-16; README news items run to Sep. 1, 2026.

## Key evidence

- The SWE-bench harness does not invoke an agent for the eval step. `swebench eval` evaluates patch predictions, run as `swebench eval verified -p <path_to_predictions> --run-id <run_id>`. Paraphrase; the README says "Evaluate patch predictions with the following command" (quote). ^e1
- A separate `swebench infer ... -m <model>` command generates predictions with mini-SWE-agent. No Claude Code or Agent SDK driver is documented in the README. Paraphrase. ^e2
- Requirements: Docker, with a recommended x86_64 machine with 120GB of free storage, 16GB of RAM and 8 CPU cores; arm64 is experimental. Paraphrase of the README. ^e3
- Results are cached by run_id and instance_id, and the run summary is written to `logs/evaluation/<run_id>/results.json`. Paraphrase of the README. ^e4
- Licence is MIT, language Python 3.8+, about 6.2k stars, last pushed 2026-09-18. Paraphrase of API fields and the README. ^e5

## Limitations

- The README does not document a Claude Code or Agent SDK driver; this is an absence in the README, not proof that none exists elsewhere.
- Star counts are a snapshot as of 2026-11-16 and approximate. Publication date of the README text is unknown; its news items run only to Sep. 1, 2026.
- The README was read as a separate URL from the API record named in `source`.

## Relevance

- Input for judging SWE-bench as a fit for the SMR-361 benchmark: it scores patches, so a separate runner would have to drive Claude Code (with or without slopify) to produce the predictions.
