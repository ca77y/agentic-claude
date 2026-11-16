---
title: Harness Bench repository (Qihoo360)
type: raw
summary: Harness Bench is a 300-task offline benchmark that compares agent harnesses, including Claude Code, with deterministic oracle grading and no LLM judge.
tags: [operations]
aliases: [Qihoo360/harness-bench]
source: https://github.com/Qihoo360/harness-bench
accessed: 2026-11-16
published: unknown
provider: Qihoo360
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-16
updated: 2026-11-16
---

# Harness Bench repository (Qihoo360)

> [!quote] Source
> **URL**: https://github.com/Qihoo360/harness-bench
> **Accessed**: 2026-11-16
> **Method/Context**: Gathered for SMR-361 (benchmarking the slopify workflows). The findings below were reported by a researcher from the repository page, the project site https://www.harness-bench.ai/, and https://raw.githubusercontent.com/Qihoo360/harness-bench/main/docs/TASK_TAXONOMY_V3.md. The repo was last updated 2026-10-09 (commit date); the paper is arXiv 2605.27922. Quoted fragments are verbatim from those pages; the rest is paraphrase.

## Key evidence

- Scope: 300 sandboxed offline tasks (274 general, 26 multimodal) in 6 families and 17 subcategories. Software Engineering has 81 tasks (Implementation and Repair 67, Repository Maintenance 14). Research and Analysis has 40 (Data Preparation 20, Evidence-Based Research 13, Quantitative Analysis 7). Each task ships an instruction, an initial workspace, an environment and hidden evaluators. ^e1
- Grading: deterministic, task-specific oracles over final artifacts and workspace state, with weighted modules and safety gates. A bounded semantic fallback exists only where a task declares one. ^e2
  - > [!quote] From the repository
  > "Oracles score only the final artifacts and workspace state."
  > "No LLM judge in scoring"
- Comparison design: it is the only set found that compares agent harnesses on the same tasks. The Claude Code harness is among 7 compared. It records token usage and API cost per trial. ^e3
- Setup: Python 3.10+ and uv; each harness runs in its own Docker image. ^e4
- Task format: prompts plus a workspace, with no Linear card. ^e5
- Fit to slopify: the tasks target agent-harness and model configurations, not plugin workflows, and the set has no spike, shape or validate categories. ^e6 (inference from the taxonomy)

## Limitations

- The licence was not found on the pages fetched; the GitHub page showed no licence field. Reuse terms for the tasks are unknown.
- The publication date of the project site and paper is recorded as unknown here; only the repo commit date (2026-10-09) and the arXiv identifier were seen. The paper itself was not read.
- "Only set found that compares agent harnesses" is a statement about the researcher's searches, not proof that no other such set exists.
- The fit judgement (^e6) is the researcher's inference from the task taxonomy, not a claim the project makes.

## Relevance

- Candidate source for the SMR-361 comparison of benchmarks against the slopify workflows: its Software Engineering and Research and Analysis families overlap deliver-bugfix, deliver-trivial and research only in part, and its task format would need adapting because slopify workflows take a card or prompt rather than a bare workspace instruction.
