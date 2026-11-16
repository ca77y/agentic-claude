---
title: Terminal-Bench README
type: raw
summary: The Terminal-Bench README describes terminal tasks, each with an instruction, a test script and an oracle solution, run in a sandboxed Docker terminal.
tags: [operations]
aliases: []
source: https://raw.githubusercontent.com/laude-institute/terminal-bench/main/README.md
accessed: 2026-11-16
published: unknown
provider: Laude Institute (Terminal-Bench)
up: "[[library/wiki/operations|Operations]]"
related: []
created: 2026-11-16
updated: 2026-11-16
---

# Terminal-Bench README

> [!quote] Source
> **URL**: https://raw.githubusercontent.com/laude-institute/terminal-bench/main/README.md
> **Accessed**: 2026-11-16
> **Method/Context**: Gathered for SMR-361 (benchmarking the slopify workflows). The findings below were reported by a researcher from the README on the main branch. The README is undated; it cites ICLR 2026. Wording is paraphrase or quotation as marked on each bullet.

## Key evidence

- Task shape: each task has an English instruction, a test script that verifies success, and a reference oracle solution. Tasks run in a sandboxed Docker terminal. Grading is by the test script, so it is deterministic. (paraphrase) ^e1
- Scope of the original set: about 100 tasks (beta, v0.1.1), covering compiling code, training models and setting up servers. (paraphrase) ^e2
- Version guidance: the README says new users should use Harbor for Terminal-Bench 2.0. It cites ICLR 2026. (paraphrase) ^e3
- The tasks are system or terminal work, not feature delivery, and are given as prompts only, with no Linear card. (inference from the task format in ^e1 and ^e2, not a README statement) ^e4

## Limitations

- The README is undated, and the task counts above are for the original beta set only.
- The 2.1 task count (89 tasks, version 2.1.0) and the Apache License 2.0 come from a Hugging Face dataset card seen only as a search snippet, not fetched, and are not recorded here as README evidence.
- The researcher's report does not say how the README states the Terminal-Bench 2.0 and 2.1 registry arrangement; only the Harbor guidance in ^e3 is recorded.

## Relevance

- Terminal-Bench fits terminal or system tasks, not the slopify delivery, research, shape or validate workflows as a whole (inference, ^e4).
- Its task anatomy (instruction, test script, oracle solution) is a pattern a custom task set could copy (inference from ^e1).
