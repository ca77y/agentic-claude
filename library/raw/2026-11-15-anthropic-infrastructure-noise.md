---
title: Quantifying infrastructure noise in agentic coding evals (Anthropic)
type: raw
summary: Anthropic measures how eval resource configuration shifts agentic coding scores by several points, enough to swamp small differences between arms.
tags: [evaluation, benchmarking, reliability]
aliases: []
source: https://www.anthropic.com/research/infrastructure-noise
accessed: 2026-11-15
published: 2026-02-05
provider: Anthropic
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-15
updated: 2026-11-15
---

# Quantifying infrastructure noise in agentic coding evals (Anthropic)

> [!quote] Source
> **URL**: https://www.anthropic.com/research/infrastructure-noise
> **Accessed**: 2026-11-15
> **Method/Context**: Recorded for SMR-361 (benchmarking the slopify workflows). Findings were relayed to the scribe from the researcher's reading of the page, with the quoted threshold below; the scribe did not re-fetch the page.

## Key evidence

- Infrastructure and environment noise adds variance on top of sampling noise and can exceed the arm difference being measured. Anthropic ran Terminal-Bench 2.0 over six resource configurations with the same model, harness and tasks. Scores differed by 6 percentage points between the most and least resourced configurations (p<0.01). Infrastructure error rates were 5.8% at strict resource enforcement versus 0.5% uncapped. ^e1
- On SWE-bench (227 problems x 10 samples), scores rose 1.54 points going from 1x to 5x RAM. ^e2
- The article states that naive binomial confidence intervals already span 1-2 points and that infrastructure confounders stack on top of them. It concludes: 'leaderboard differences below 3 percentage points deserve skepticism until the eval configuration is documented and matched' (quote). ^e3
- Pass rates also fluctuate with time of day. This is anecdotal and not quantified in the article. ^e4
- Mitigation given: run at multiple times and days, and specify a resource floor and ceiling. ^e5

## Limitations

- Relayed from the researcher's reading of the article. Figures and the quoted sentence were not re-checked against the page by the scribe.
- The experiments concern Terminal-Bench 2.0 and SWE-bench, not the slopify workflows. Transfer of the effect sizes to other harnesses is inference, not shown by the source.
- The time-of-day effect has no measurement behind it (^e4).

## Relevance

- Inference, not source claim: a comparison of two arms on a small task set should hold resources and run timing constant, and should treat gaps under about 3 points as inconclusive unless the configuration is documented and matched.

## Update 2026-11-15

> [!quote] Source
> **URL**: https://www.anthropic.com/engineering/infrastructure-noise (the same article, also served at the `/research/infrastructure-noise` URL recorded in `source:`)
> **Author**: Gian Segato (Anthropic Engineering)
> **Published**: 2026-02-05
> **Accessed**: 2026-11-15
> **Method/Context**: Second capture for SMR-361, from the researcher's reading of the `/engineering/` URL. It adds detail to the findings above and does not replace them. The scribe did not re-fetch the page.

### Key evidence

- Infrastructure is a hidden confounder in agent evals, so two arms being compared must run on identical infrastructure. On Terminal-Bench 2.0 (same Claude model, harness and task set), moving from strict per-task resource enforcement (1x) to uncapped raised the success rate by 6 percentage points (p<0.01), and infrastructure error rates fell from 5.8% to 0.5%. ^e6
- Between 1x and 3x resources the score change was within noise (p=0.40). Above about 3x, the extra resources let the agent solve problems it could not solve before, so the benchmark was then measuring resource headroom as well as capability. ^e7
- On SWE-bench (227 problems, 10 samples each), 5x RAM gave +1.54 points. Pass rates also fluctuated with time of day, anecdotally and not formally quantified. ^e8
- Anthropic advises treating leaderboard gaps under 3 points with skepticism until configurations are documented and matched, and notes that naive binomial confidence intervals already span 1-2 points. Quote: "leaderboard differences below 3 percentage points deserve skepticism until the eval configuration is documented and matched." ^e9
- Mitigations given: specify both a guaranteed allocation and a hard ceiling per task, and calibrate the band so that floor and ceiling scores fall within noise; report the resource multiplier; run at multiple times and on multiple days; treat resource configuration as a first-class experimental variable. ^e10

### Limitations

- The `/engineering/` and `/research/` URLs are recorded here as the same article. This section assumes that, from the researcher's report; the two pages were not compared by the scribe.
- Findings were relayed, not re-read by the scribe. The quotation in ^e9 repeats the one in ^e3 and carries the same caveat.
- The experiments concern Terminal-Bench 2.0 and SWE-bench, not the slopify workflows. Transfer of the effect sizes is inference.
- The time-of-day effect in ^e8 has no measurement behind it.

### Relevance

- Inference, not source claim: both arms of a slopify benchmark should run on the same machine class, with the same resource allocation and ceiling, and interleaved or repeated across times and days. The resource configuration and any multiplier should be reported with the result.
