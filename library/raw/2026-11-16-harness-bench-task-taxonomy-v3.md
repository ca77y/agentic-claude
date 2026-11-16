---
title: Harness-Bench task taxonomy
type: raw
summary: Harness-Bench's task taxonomy lists 300 sandboxed tasks in 6 families, each graded by deterministic oracles with no LLM judge, and compares agent harnesses on the same tasks.
tags: [operations]
aliases: []
source: https://raw.githubusercontent.com/Qihoo360/harness-bench/main/docs/TASK_TAXONOMY_V3.md
accessed: 2026-11-16
published: unknown
provider: Qihoo360 (Harness-Bench)
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-16
updated: 2026-11-16
---

# Harness-Bench task taxonomy

> [!quote] Source
> **URL**: https://raw.githubusercontent.com/Qihoo360/harness-bench/main/docs/TASK_TAXONOMY_V3.md
> **Accessed**: 2026-11-16
> **Method/Context**: Gathered for SMR-361 (benchmarking the slopify workflows). The finding below comes from a researcher's report on Harness Bench (arXiv 2605.27922; repo commit 2026-10-09). That report read this taxonomy page together with https://www.harness-bench.ai/ and https://github.com/Qihoo360/harness-bench. The report does not say which fact came from which of the three pages, so the split is not recorded here. Publication date of the taxonomy page is unknown.

## Key evidence

- Harness Bench is a set of 300 sandboxed offline tasks (274 general, 26 multimodal) in 6 families and 17 subcategories. Software Engineering has 81 tasks (Implementation and Repair 67, Repository Maintenance 14). Research and Analysis has 40 (Data Preparation 20, Evidence-Based Research 13, Quantitative Analysis 7). Each task ships an instruction, an initial workspace, an environment and hidden evaluators. ^e1
- Grading uses deterministic task-specific oracles over final artifacts and workspace state, with weighted modules and safety gates and no LLM judge; a bounded semantic fallback exists only where a task declares one. ^e2
  - > [!quote] From the repository (as reported)
  > "Oracles score only the final artifacts and workspace state." / "No LLM judge in scoring"
- It is the only set found that compares agent harnesses on the same tasks (the Claude Code harness is among 7), and it records token usage and API cost per trial. ^e3
- Tasks are prompts plus a workspace, with no Linear card. Setup needs Python 3.10+ and uv, and each harness runs in its own Docker image. ^e4
- Its tasks target agent-harness and model configurations, not plugin workflows, and it has no spike, shape or validate categories. ^e5 (inference from the category list)

## Limitations

- The licence was not found on the pages fetched; the GitHub page showed no licence field.
- The researcher's report ties these facts to three pages together, so a given fact may come from the homepage or the repository rather than this taxonomy page.
- No-spike, shape and validate categories is an absence in the pages read, not proof none exists.
- The page's publication date is unknown; only the repo commit date (2026-10-09) is known.

## Relevance

- A candidate source of tasks and of a deterministic-grading design for benchmarking the slopify delivery workflows. It fits implementation and repair tasks (bugfix, trivial) and, partly, evidence-based research, but not shape or validate.
