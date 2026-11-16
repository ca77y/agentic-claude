---
title: Agent-as-a-Judge abstract
type: raw
summary: Abstract of Agent-as-a-Judge (arXiv:2410.10934, Zhuge et al.), which judges code-producing agents per requirement on DevAI with an agent that inspects the project.
tags: [evaluation, llm-as-judge, reliability]
aliases: [Agent-as-a-Judge, DevAI]
source: https://arxiv.org/abs/2410.10934
accessed: 2026-11-15
published: 2024-10-14
provider: arXiv (Zhuge et al.)
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-15
updated: 2026-11-15
---

# Agent-as-a-Judge abstract

> [!quote] Source
> **URL**: https://arxiv.org/abs/2410.10934
> **Accessed**: 2026-11-15
> **Method/Context**: Abstract page only (v1 published 2024-10-14, v2 2024-10-16). The full text, including the alignment numbers, was not retrieved.

## Key evidence

- DevAI is a benchmark of 55 tasks with 365 hierarchical user requirements, built for code-producing agents. Each requirement is judged separately by an agent that can inspect the project the agent produced. This is the closest published design found so far for scoring outputs per rubric item with tool access to the artifact. ^e1
  > [!quote] Abstract
  > "find it dramatically outperforms LLM-as-a-Judge and is as reliable as our human evaluation baseline" (quoted from the abstract; the task and requirement counts are as reported in the supplied findings and not re-quoted here)

## Limitations

- Only the abstract was read, so no alignment numbers or per-requirement agreement figures were retrieved.
- The benchmark is the authors' own, and the finding rests on three agents only.
- The comparison to human evaluation is the authors' claim; no independent replication was checked.

## Relevance

- Inference, not quotation: a benchmark of the slopify workflows against bare Opus could score each output per requirement, with the judge given tool access to the produced artifact, instead of asking an open "which is better".
