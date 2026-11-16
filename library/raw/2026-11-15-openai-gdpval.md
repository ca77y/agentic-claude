---
title: OpenAI GDPval, measuring model performance on real-world tasks
type: raw
summary: OpenAI's description of how GDPval, an expert-written set of document-producing tasks, was built and graded
tags: [evaluation, benchmarking]
aliases: [GDPval]
source: https://openai.com/index/gdpval/
accessed: 2026-11-15
published: 2025-09-25
provider: OpenAI
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-15
updated: 2026-11-15
---

# OpenAI GDPval, measuring model performance on real-world tasks

> [!quote] Source
> **URL**: https://openai.com/index/gdpval/
> **Accessed**: 2026-11-15
> **Method/Context**: "Measuring the performance of our models on real-world tasks" (OpenAI, 2025-09-25). Recorded for SMR-361 (benchmarking the slopify workflows). Vendor self-description of its own benchmark method, so a primary source for how GDPval was built and a vendor claim about its merits.

## Key evidence

- GDPval is a document-producing task set built by domain experts to be representative. It covers 44 occupations across 9 industries, with 1,320 full-set tasks (30 per occupation) and a 220-task gold open set (5 per occupation). ^e1
  > [!quote] Quote
  > "30 fully reviewed tasks per occupation (full-set) with 5 tasks per occupation in our open-sourced gold set"
- Task authors were professionals averaging 14 years of experience, and each task went through about 5 rounds of review. Tasks ship with reference files and expect deliverables such as documents, slides and spreadsheets. ^e2
- Occupations were chosen by GDP share and BLS wage data. The breadth of experts was recruited deliberately "to maximize representativeness". ^e3
- Grading is blind pairwise comparison of a model deliverable against the expert deliverable, done by professionals, with task-specific rubrics. ^e4
- Limitation stated by the authors: tasks are one-shot only. ^e5

## Limitations

- Vendor self-description of method; not independently verified in this pass.
- The figures above are as reported by the source; the post's headline model results are not recorded here because no finding assigned to this note rests on them.
- One-shot tasks only (^e5), so multi-turn or iterative workflows are not covered.

## Relevance

- Inference (not from the source): GDPval is an example of a privately authored, expert-written, document-producing task set with blind pairwise grading, which is the closest analogue found for benchmarking workflows whose output is documents.
