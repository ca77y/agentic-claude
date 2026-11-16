---
title: SWE-bench README
type: raw
summary: The SWE-bench README describes a patch-evaluation harness and a task set of GitHub issues graded by repo tests in Docker, not an agent driver.
tags: [operations]
aliases: []
source: https://raw.githubusercontent.com/SWE-bench/SWE-bench/main/README.md
accessed: 2026-11-16
published: unknown
provider: SWE-bench (Princeton NLP and contributors)
up: "[[library/wiki/operations|Operations]]"
related: []
created: 2026-11-16
updated: 2026-11-16
---

# SWE-bench README

> [!quote] Source
> **URL**: https://raw.githubusercontent.com/SWE-bench/SWE-bench/main/README.md
> **Accessed**: 2026-11-16
> **Method/Context**: Gathered for SMR-361 (benchmarking the slopify workflows). The findings below were reported by a researcher from the README on the main branch (current v5 CLI). The README is undated; its news items run to Sep. 1, 2026. Repo metadata (licence, stars, last push) comes from https://api.github.com/repos/SWE-bench/SWE-bench, a second source read alongside the README.

## Key evidence

- The SWE-bench harness does not invoke an agent for the eval step. `swebench eval` evaluates patch predictions, run as `swebench eval verified -p <path_to_predictions> --run-id <run_id>`. A separate `swebench infer ... -m <model>` command generates predictions with mini-SWE-agent, and no Claude Code or Agent SDK driver is documented in the README. ^e1
  - > [!quote] From the README
  > Evaluate patch predictions with the following command
- The harness needs Docker, with a recommended x86_64 machine with 120GB of free storage, 16GB of RAM and 8 CPU cores; arm64 is experimental. Licence MIT, Python 3.8+. Results are cached by `run_id` and `instance_id`, and the run summary is written to `logs/evaluation/<run_id>/results.json`. Repo metadata (paraphrase of API fields): about 6.2k stars, last pushed 2026-09-18. ^e2
- Task shape: a GitHub issue plus a codebase, and the agent produces a patch. Grading runs the repo test suite in Docker (fail-to-pass and pass-to-pass tests). Variants: full, Verified (500 human-confirmed problems), Lite, Multimodal (v2: 480 tasks), Multilingual. The original set uses Python repos. ^e3
  - > [!quote] From the README
  > A subset of 500 problems that real software engineers have confirmed are solvable.
- Licence: the code is MIT-licensed. The README says "MIT license. Check `LICENSE.md`." The dataset-card licence was not checked. ^e4
- Fit for slopify (researcher's inference, not a README statement): tasks are prompts (issue text) with no Linear card, so they map to the bugfix and trivial workflows only, and the repos are not this project's. ^e5

## Limitations

- The README is undated, so the version and any later change to the CLI are unknown.
- The dataset-card licence for the task data was not checked.
- The fit for slopify (^e5) is an inference by the researcher, not stated by the source.
- Hardware figures and licence come from the README as reported; this note holds no verbatim passages beyond the two quoted above.

## Relevance

- Candidate task set and grading model for benchmarking the slopify bugfix and trivial workflows (SMR-361). The harness grades patches only, so a separate driver would have to run Claude Code (with and without the plugin) to produce predictions.
