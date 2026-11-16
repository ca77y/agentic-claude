---
title: Agent Benchmarks Stop Ranking Before They Run Out of Tasks
type: raw
summary: Preprint on the statistical power of agent benchmarks - SWE-bench Verified's 500 tasks resolve about 6 points, neighbouring agents are not separable, and graded credit beats a higher bar.
tags: [evaluation, benchmarking, statistics, reliability]
aliases: [Dong Zhan Hu agent benchmarks ranking]
source: https://arxiv.org/abs/2611.13541
accessed: 2026-11-15
published: 2026-11-10
provider: arXiv (Dong, Zhan, Hu)
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-15
updated: 2026-11-15
---

# Agent Benchmarks Stop Ranking Before They Run Out of Tasks

> [!quote] Source
> **URL**: https://arxiv.org/abs/2611.13541
> **Accessed**: 2026-11-15
> **Method/Context**: Retrieved for SMR-361 (benchmarking slopify workflows against a bare model). Dong, Zhan, Hu, arXiv:2611.13541, submitted 2026-11-10. Quotations below are verbatim as supplied to the scribe; bullets without a quotation are the researcher's paraphrase of the paper's reported numbers.

## Key evidence

- Power of a 500-task set to separate nearby arms: on SWE-bench Verified the paper's test detects about 6.3 points with 80% power, yet none of the 45 pairs within the top ten differ significantly (Holm correction). The top ten span 3.6 points and the largest gap between neighbours is 1.4 points. ^e1
  > [!quote] "The test ... detects about 6.3 points with 80% power ... but the largest gap between SWE-bench neighbours is 1.4 points."
- Grader error is larger than the gaps: strengthened tests reject 17.7% of the median agent's passing patches (range 10.8-23.2%), so neighbouring agents differ by less than the tests' own error. ^e2
- The pass/fail bit is called "too coarse". Remedies named: more tasks or trials, more information per task (graded credit), and tiers instead of ranks; cost as a separate axis. ^e3
- Saturation sits partly in the measurement, not only in task difficulty: the top ten agents together solve 91% of SWE-bench Verified tasks, so the set is not capped at ceiling, yet binary verdicts still tie arms. Partial or graded credit can separate arms that pass/fail ties. ^e4
  > [!quote] "On fixed tasks, a higher bar only moves the problem; graded credit fixes it."
- The abstract also reports that on a Terminal-Bench re-run, models tied on pass/fail differ over tenfold on the quantity the tests discard. ^e5

## Limitations

- Preprint, 5 days old at retrieval and not peer reviewed; the numbers in ^e1 to ^e5 rest on this single source.
- Figures are for SWE-bench Verified and one Terminal-Bench re-run; transfer to a small custom task set is inference, not something the paper shows.
- The 6.3-point figure is for a 500-task set; the paper's numbers as supplied do not give the equivalent detectable effect for a 20-50 task set.

## Relevance

- Bears on how many tasks and what scoring (binary versus graded) SMR-361 needs to tell a slopify workflow from a bare model. Inference: a gap smaller than several points needs more tasks, repeated trials, or graded credit to be resolved.
