---
title: Harness Bench website
type: raw
summary: Harness Bench is a 300-task offline benchmark that compares agent harnesses, including Claude Code, on the same tasks with deterministic oracles, but its tasks are prompts plus a workspace and cover no spike, shape or validate work.
tags: [operations]
aliases: []
source: https://www.harness-bench.ai/
accessed: 2026-11-16
published: unknown
provider: Harness Bench (Qihoo360)
up: "[[library/wiki/operations|Operations]]"
related: []
created: 2026-11-16
updated: 2026-11-16
---

# Harness Bench website

> [!quote] Source
> **URL**: https://www.harness-bench.ai/
> **Accessed**: 2026-11-16
> **Method/Context**: Gathered for SMR-361 (benchmarking the slopify workflows). The findings below were reported by a researcher who read the website together with the GitHub repository (https://github.com/Qihoo360/harness-bench) and its task taxonomy (https://raw.githubusercontent.com/Qihoo360/harness-bench/main/docs/TASK_TAXONOMY_V3.md). The report does not say which fact came from which of the three pages. The website carries no publication date; the repository's last commit is 2026-10-09 and the paper is arXiv 2605.27922.

## Key evidence

- Harness Bench has 300 sandboxed offline tasks (274 general, 26 multimodal) in 6 families and 17 subcategories. Software Engineering has 81 tasks (Implementation and Repair 67, Repository Maintenance 14). Research and Analysis has 40 (Data Preparation 20, Evidence-Based Research 13, Quantitative Analysis 7). Each task ships an instruction, an initial workspace, an environment and hidden evaluators. ^e1
- Grading uses deterministic task-specific oracles over final artifacts and workspace state, with weighted modules and safety gates. There is no LLM judge; a bounded semantic fallback exists only where a task declares one. ^e2
  - > [!quote] From the repository (as reported)
  > "Oracles score only the final artifacts and workspace state." / "No LLM judge in scoring"
- It is the only set the researcher found that compares agent harnesses on the same tasks (the Claude Code harness is among 7), and it records token usage and API cost per trial. ^e3
- Setup: Python 3.10+ and uv; each harness runs in its own Docker image. ^e4
- Fit to slopify (researcher's inference, not a claim of the source): tasks are prompts plus a workspace, with no Linear card. They target agent-harness and model configurations, not plugin workflows, and the set has no spike, shape or validate categories. ^e5

## Limitations

- The licence was not found on the pages fetched; the GitHub page showed no licence field. Whether the tasks can be reused is unknown.
- Per-claim attribution among the website, repository and taxonomy page is not recorded, so a reader cannot tell which page supports which bullet above.
- The website's own publication date is unknown. The 2026-10-09 date is the repository's last commit, not the date of this content.
- The statement that no spike, shape or validate categories exist rests on the researcher's reading of the taxonomy; it is an absence in what was read, not proof.
- The "only set found that compares agent harnesses" claim reflects the researcher's searches, not an exhaustive survey.

## Relevance

- Candidate comparison set for SMR-361: it supports running the same tasks under different harnesses and recording cost per trial, which matches the comparison-arm need. Its software-engineering tasks map loosely to the bugfix and trivial workflows only, and its research tasks do not use a project library.
