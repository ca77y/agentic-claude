---
title: AI Agents That Matter (Kapoor et al.)
type: raw
summary: Paper arguing agent evaluations must report accuracy and dollar cost together, and store token counts so cost can be recomputed at current prices
tags: [performance]
aliases: [Kapoor et al. 2024, arXiv 2407.01502]
source: https://arxiv.org/html/2407.01502v1
accessed: 2026-11-15
published: 2024-07-01
provider: arXiv (Kapoor et al.)
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-15
updated: 2026-11-15
---

# AI Agents That Matter (Kapoor et al.)

> [!quote] Source
> **URL**: https://arxiv.org/html/2407.01502v1
> **Accessed**: 2026-11-15
> **Method/Context**: Retrieved for SMR-361 (benchmarking the slopify workflows against a lighter run). Published 2024-07-01, so older than 18 months; it supplies evaluation principles, not tooling. Only the findings that rest on this paper are recorded here; the other SMR-361 sources have their own notes.

## Key evidence

- **Cost-controlled evaluation.** Accuracy and dollar cost should be reported together as a Pareto frontier, because maximizing accuracy alone can hide unbounded cost. Retries or sampling can buy accuracy at large cost, so arms must be compared at matched or reported cost. The paper cites AlphaCode rising from about 0% to over 30% accuracy with a million retries. ^e1
  - Quote (section heading): "AI agent evaluations must be cost-controlled"
  - Quote: "an agent is on the Pareto frontier if there is no other agent that has significantly better performance on both"
- **Store token counts, not only dollars.** Cost can then be recomputed at current prices. The paper measures dollar cost rather than proxies such as parameter count or compute. ^e2
  - Quote: "downstream evaluations of agents should include input/output token counts in addition to dollar costs, so that anyone looking at the evaluation in the future can instantly recalculate the cost using current prices."
- **Price basis recorded in the paper's own run.** It states gpt-4-turbo at $10/$30 per M tokens (April 2024), an example of snapshotting prices alongside results. ^e3

## Limitations

- Published 2024-07-01, more than 18 months before access; it gives principles, not tooling, and its prices and models are dated.
- Its experiments used models and benchmarks of that period, not coding agents with subagent trees or prompt caching.
- Read through the HTML rendering (v1) only; later versions were not checked.
- The AlphaCode figures and the gpt-4-turbo price basis are the paper's own reports; they were not checked against their original sources.

## Relevance

- Inference (not quoted by the paper): for SMR-361, comparing a slopify workflow against a lighter run should report quality and cost for each arm and compare at matched or reported cost, so a workflow arm that retries or fans out is not credited for accuracy bought with extra spend. ^e4
- Inference: storing per-run token counts plus a dated price table lets the cost be recomputed later, as the paper recommends. ^e5

## Update 2026-11-15

> [!quote] Source
> **URL**: https://arxiv.org/abs/2407.01502 (abstract page; findings below were read from the HTML rendering at https://arxiv.org/html/2407.01502v1)
> **Accessed**: 2026-11-15
> **Method/Context**: Second pass for SMR-361 on evaluation validity (weak baselines, non-determinism, harness bugs, overfitting). Published 2024-07-01, older than 18 months, flagged. Only findings that rest on this paper are recorded; other SMR-361 sources have their own notes.

### Key evidence

- **Weak baselines make a workflow look better than it is.** The authors reproduced HumanEval agents (Reflexion, LDB, LATS) and compared them with simple baselines (retry, warming, escalation). No significant accuracy difference separated the warming baseline from the best agent architecture, and agents at similar accuracy differed in cost by almost two orders of magnitude (LATS cost over 50x the warming baseline). They conclude accuracy alone cannot identify progress. Mitigation they point to: cost-controlled comparison against simple baselines such as retry and escalation. ^e6
  - Quote: "Accuracy alone cannot identify progress because it can be improved by scientifically meaningless methods such as retrying."
- **Non-determinism: single-run results are unreliable and error bars are rarely reported.** LLMs are not deterministic even at temperature zero. Many reported scores were above the maximum of the authors' five reproduction runs, and some reported baselines were below the minimum of five runs. They say the cost of evaluating agents makes repeat runs rare, so error bars are missing. Mitigation: repeat runs and report mean and variance. ^e7
  - Quote: "many reported accuracy scores were above the maximum of five runs that we performed in our reproduction attempts, and the reported baselines were in some cases lower than the minimum of five runs"
- **Harness bugs in published agent evaluations.** LATS and STeP marked some incorrectly completed tasks as correct and removed a few tasks from the benchmark (1 and 8 tasks). In WebArena, task order matters because the Reddit clone rate-limits actions, so tasks evaluated back-to-back fail more often, which breaks the assumption that tasks are independent. ^e8
  - Quote: "both LATS and STeP marked some incorrectly completed tasks as correct. Similarly, both agents removed a small number of tasks from the benchmark"
- **Overfitting to the benchmark.** The authors argue agent benchmarks are small (a few hundred samples) and often lack hold-outs, so overfitting is more serious than training-data contamination: knowledge of test samples can be programmed directly into the agent, and a lookup table can reach 100%. Case study: the top WebArena agent (STeP, 35.8%) hardcodes per-task policies, such as constructing a Reddit profile URL by suffix, so leaderboard accuracy misleads downstream users. Mitigation: secret hold-out sets matched to the intended level of generality (they define four levels). ^e9
- **Reporting only best runs or single numbers (partial support).** This paper documents the symptom only: reported scores often exceeded the maximum of five reproduction runs and rarely carried error bars (see ^e7). It states no "best-of-N reporting" rule; any such rule is inference combined with other sources. ^e10

### Limitations

- Published 2024-07-01, older than 18 months; models, benchmarks and prices are of that period, and the agents tested (Reflexion, LDB, LATS, STeP) are not coding agents with subagent trees.
- Figures (50x cost, five runs, 1 and 8 removed tasks, 35.8%) are the paper's own reports; none were re-derived or checked against the original agent papers.
- Read via the HTML rendering (v1) only; later arXiv versions were not checked.
- The abstract page was cited as the canonical identifier; the findings were not separately verified against it.

### Relevance

- Inference (not stated by the paper): for a workflow tuned on benchmark tasks, the overfitting finding implies a separate held-out task set kept out of tuning. ^e11
- Inference: for SMR-361, comparing a slopify workflow with a lighter run suggests including simple baselines (retry, escalation), repeating each arm and reporting mean and variance, and checking the harness for task-independence and grading bugs. This is the scribe's reading, not the paper's claim. ^e12
