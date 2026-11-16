---
title: "Agent Evaluation Reliability: More Tasks Won't (Always) Fix An Agent Leaderboard"
type: raw
summary: arXiv abstract by Hardy et al. reporting that fixed model-scaffold systems rank far more reliably than underlying models, and that more similar tasks cannot fix scaffold-coverage uncertainty.
tags: [reliability]
aliases: [arXiv:2610.00651]
source: https://arxiv.org/abs/2610.00651
accessed: 2026-11-15
published: 2026-09-30
provider: arXiv
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-15
updated: 2026-11-15
---

# Agent Evaluation Reliability: More Tasks Won't (Always) Fix An Agent Leaderboard

> [!quote] Source
> **URL**: https://arxiv.org/abs/2610.00651
> **Accessed**: 2026-11-15
> **Method/Context**: Abstract page only (Hardy et al., submitted 2026-09-30). The PDF fetch failed with a 500, so the full text, methods, and tables were not read. Everything below rests on the abstract as retrieved.

## Key evidence

- Reliability depends on the claim being made. Across 22 benchmarks (HAL and Harbor Index), fixed model-scaffold systems rank at reliability 0.935-0.994, while underlying-model rankings reach only 0.148-0.841. ^e1
  > [!quote] Quotation
  > "Fixed model-scaffold systems are ranked reliably (0.935-0.994), while underlying-model reliability is substantially lower (0.148-0.841)."
- Scaffold coverage limits what more tasks can fix: infinite similar tasks improve model-ranking reliability by at most 0.097 when scaffold coverage dominates uncertainty. ^e2
- Pooling diverse benchmarks raises projected cross-task reliability from 0.44 to 0.75 at the same budget. ^e3

## Limitations

- Abstract only: the figures above are the authors' summary claims, not checked against the paper's methods, benchmark list, or reliability definition.
- The 0.097 bound is stated for the case where scaffold coverage dominates uncertainty; the abstract as retrieved does not say how often that case holds.
- The paper concerns leaderboard rankings across benchmarks, not a single workflow-versus-bare comparison on one project.

## Relevance

- Inference, not the paper's wording: for a workflow-versus-bare comparison, the claim "this workflow system beats bare Opus" is a fixed model-scaffold claim and so the more reliably measurable one (^e1). The claim "workflows improve the model in general" is a claim about the underlying model across scaffolds and is weaker (^e1, ^e2).
