---
title: Adding Error Bars to Evals (Miller, arXiv 2411.00640)
type: raw
summary: "Statistical treatment of eval scores: variance decomposition, repeats versus tasks, paired comparison, and a sample-size formula."
tags: [evaluation, statistics]
aliases: [Miller error bars, arXiv 2411.00640]
source: https://arxiv.org/html/2411.00640v1
accessed: 2026-11-15
published: 2024-11-01
provider: arXiv
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-15
updated: 2026-11-15
---

# Adding Error Bars to Evals (Miller, arXiv 2411.00640)

> [!quote] Source
> **URL**: https://arxiv.org/html/2411.00640v1
> **Accessed**: 2026-11-15
> **Method/Context**: Recorded from the research findings supplied for SMR-361 (benchmarking the slopify workflows). Quotes are the ones carried in those findings; the paper text was not re-read for this note.

## Key evidence

- Run-to-run noise is a first-class component of an eval score and splits into question (task) sampling variance and within-task sampling noise. Miller's decomposition is s_i = x_i + eps_i (per-task mean plus random component). The variance of the mean score falls as K (repeats per task) rises, but only down to the floor set by between-task variance Var(x). Quote: "Once E[sigma_i^2]/K << Var(x), increasing K further will have little effect on the standard error". Worked example (binary scores, difficulty uniform on [0,1]): K=2 cuts total variance by 1/3, K=4 by 1/2, K=6 by 5/9, with an upper limit of 2/3 (quote/paraphrase). ^e1
- Repeats are cheaper than new tasks only up to a point. In the paper's power example (sigma_A^2 = sigma_B^2 = 1/6, omega^2 = 1/9, Corr(x_A,x_B) = 0.5, n = 198, alpha = 0.05, power 80%), raising K from 1 to 10 reduces the minimum detectable effect from 13.2% to 7.5%. Ten times more runs shrinks the detectable gap by less than half, so more distinct tasks are needed to go lower (section 5). Quote: "increasing K_A=K_B from 1 to 10 reduces the Minimum Detectable Effect from 13.2% to 7.5%". ^e2
- Sample-size formula for a paired design with K repeats per arm (eq. 9-10): n = (z_{alpha/2} + z_beta)^2 * (omega^2 + sigma_A^2/K_A + sigma_B^2/K_B) / delta^2, with omega^2 = Var(x_A) + Var(x_B) - 2Cov(x_A, x_B). Inverted, the minimum detectable effect is delta = (z_{alpha/2} + z_beta) * sqrt((omega^2 + sigma_A^2/K_A + sigma_B^2/K_B) / n). Quoted example: detecting a 3-point absolute difference at 80% power and 5% false positives with sigma^2 = 0 and omega^2 = 1/9 needs about 969 independent questions, and the author concludes new evals "should contain at least 1,000 questions". The parameters are described as "fictional, but reasonable" and are estimated from prior eval data. ^e3
- Recommended statistics for comparing two arms: report the standard error of the mean with a 95% CI of mean +/- 1.96 * SEM; cluster the standard errors when tasks are not independent; use a paired-difference analysis on a shared task list rather than a two-sample test; report mean difference, SE, CI and the correlation between the arms' per-task scores. Resampling (several answers per task, task-level means as scores) is recommended for non-deterministic or chain-of-thought evals. These recommendations are also stated in Anthropic's summary of the paper, "A statistical approach to model evaluations" (https://www.anthropic.com/research/statistical-approach-to-model-evals, published 2024-11-19), which the findings treat as corroborated by this paper. ^e4

## Limitations

- Inference: for a task set of a few dozen, the formula in ^e3 implies only large effects are detectable (13.2% MDE at n = 198, K = 1 in ^e2); this extrapolation is the researcher's, not a statement in the paper.
- The power example's parameters are fictional by the author's own description, so the specific numbers (13.2%, 7.5%, 969) illustrate the method and are not measured values for any agent eval.
- The paper dates from 2024-11-01 and treats question-answering style evals; applying it to multi-step agent runs is an extension, not something it tests.
- Figures that the findings attribute to Anthropic's summary only (frontier-model per-question score correlations of 0.3 to 0.7, clustered SEs over 3x the naive SE on popular evals, "free" variance reduction from pairing, the Inspect `epochs` parameter) are not recorded here as claims of this source.
- Quotes and numbers come from the supplied findings, not a fresh fetch of the paper.

## Relevance

- Gives the arithmetic for choosing repeats (K) versus distinct tasks (n) when benchmarking two workflow arms, and for stating the minimum detectable difference a given task set can support.
- Supports a paired design on a shared task list with CIs and the per-task correlation reported, as the default comparison method.
