---
title: SOP-Bench v1 abstract page
type: raw
summary: The arXiv v1 abstract of SOP-Bench (June 2025) reports 1,800+ tasks in 10 domains and evaluates only a Function-Calling agent and a ReAct agent.
tags: [evaluation]
aliases: []
source: https://arxiv.org/abs/2506.08119v1
accessed: 2026-11-17
published: 2025-06-09
provider: arXiv (SOP-Bench authors)
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-17
updated: 2026-11-17
---

# SOP-Bench v1 abstract page

> [!quote] Source
> **URL**: https://arxiv.org/abs/2506.08119v1
> **Accessed**: 2026-11-17
> **Method/Context**: Gathered for SMR-376 (published evals of single-agent versus other agent designs). Only the v1 abstract page is recorded here; the full v1 text was not read. Findings about v2 (revised 2026-02-23) rest on the v2 abstract and HTML, which are a different source and are not recorded in this note. Bullets say whether they are quotation, paraphrase or inference.

## Key evidence

- Agent designs in v1: the abstract names only two agents, a Function-Calling (FC) agent and a ReAct agent. It names no multi-agent, planner or orchestrated design. (paraphrase of the abstract) ^e1
- Scale and results in v1: the abstract reports 1,800+ tasks across 10 domains, with average success of 27% for the FC agent and 48% for the ReAct agent. (paraphrase of the abstract, as relayed by the researcher) ^e2
- Version difference: v2 (2026-02) reports 2,000+ tasks, 12 domains, newer Claude models and different numbers, so v1 figures must not be quoted as the current results. (inference from comparing the v1 and v2 abstracts; the v2 figures are not recorded here) ^e3
- SOP-Bench does not compare single-agent against multi-agent designs: the v1 abstract is consistent with this, as it names only two single-agent loops. The wider claim rests on a negative keyword search of the v2 text, which is not part of this source. (inference) ^e4

## Limitations

- Abstract page only; the v1 body text, tables and method were not read, so nothing here covers how the 27% and 48% were measured or which models were used.
- The absence of multi-agent designs is inferred from an abstract; a design could appear in the body without being named in the abstract.
- The v1 and v2 numbers are not comparable without checking changes in tasks, models and scoring.

## Relevance

- A published benchmark whose agent arms are two single-agent loops cannot show whether a single agent beats an orchestrated design (inference, ^e1, ^e4).
- Anyone citing SOP-Bench should name the version, since the task count, domains and success rates changed between v1 and v2 (^e2, ^e3).
