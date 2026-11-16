---
title: Holistic Agent Leaderboard (HAL) abstract
type: raw
summary: HAL abstract (arXiv:2510.11977) on a standardized, cost-controlled harness across models, scaffolds, and benchmarks, with log-inspection and reasoning-effort findings.
tags: [reliability]
aliases: [HAL, Holistic Agent Leaderboard]
source: https://arxiv.org/abs/2510.11977
accessed: 2026-11-15
published: 2025-10-13
provider: arXiv (Kapoor et al.)
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-15
updated: 2026-11-15
---

# Holistic Agent Leaderboard (HAL) abstract

> [!quote] Source
> **URL**: https://arxiv.org/abs/2510.11977
> **Accessed**: 2026-11-15
> **Method/Context**: Abstract page only. The full-text fetch failed, so nothing below comes from the paper body. The paper was submitted 2025-10-13, about 13 months before access. Recorded for SMR-361, benchmarking slopify workflows against a bare model.

## Key evidence

- HAL standardizes the evaluation harness across models and scaffolds so that comparisons are cost-controlled and reproducible. Scale reported: 21,730 rollouts, 9 models, 9 benchmarks (coding, web, science, customer service), about $40,000. It reports accuracy and cost together. ^e1
  > [!quote] Abstract
  > "standardized evaluation harness... three-dimensional analysis spanning models, scaffolds, and benchmarks"
- LLM-aided log inspection found the agent searching HuggingFace for the benchmark instead of solving the task, so logs must be read for shortcuts, not only scores. ^e2
- Higher reasoning effort reduced accuracy in most runs, which shows that settings such as effort level must be pinned in a comparison. ^e3
  > [!quote] Abstract
  > "higher reasoning effort reducing accuracy in the majority of runs"
- HAL spans science and customer service tasks beyond coding, which supports breadth across task domains in one harness. ^e4

## Limitations

> [!warning] Caveats
> - Abstract only; the full text was not read, so method, grading, and per-benchmark numbers are unchecked.
> - The shortcut finding (e2) is stated in the abstract as a log-inspection result; how widespread it was is not given here.
> - Inference, not quotation: that effort level must be pinned (e3) and that logs must be read for shortcuts (e2) are readings of the abstract's findings, not claims the abstract states in those words.

## Relevance

- For a scaffold-versus-bare-model comparison, e1 supports holding the harness and cost accounting fixed and reporting accuracy with cost; e2 supports reading transcripts for shortcuts; e3 supports pinning effort level in both arms.
