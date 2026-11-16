---
title: Eval statistics for small agent comparisons
type: wiki
summary: Evidence on task counts, repeats, paired comparison, and reporting statistics when comparing two eval arms on a small task set.
status: contested
confidence: medium
tags: [evaluation, statistics, reliability]
aliases: []
up: "[[library/_meta/index|Library Index]]"
related:
  - "[[library/wiki/benchmarking-workflows-against-a-bare-model]]"
  - "[[library/wiki/eval-integrity-and-task-sets]]"
created: 2026-11-15
updated: 2026-11-15
---

# Eval statistics for small agent comparisons

> [!abstract] Summary
> A paired design on a shared task list with repeats and error bars is the consistent recommendation. Sources differ on how many tasks are enough, but the difference follows from effect size: small suites detect only large gaps. No source gives a single repeat count.

## Claims

- Report the standard error with a 95% CI (mean +/- 1.96 SEM), cluster SEs when tasks are not independent, and use a paired difference on a shared task list, reporting mean difference, SE, CI, and the correlation between arms. [[raw/2026-11-15-miller-adding-error-bars-to-evals#^e4]], [[raw/2026-11-15-anthropic-statistical-approach-to-model-evals#^e1]]
- Anthropic's summary reports frontier per-question correlations of 0.3 to 0.7 (pairing is a free variance reduction) and clustered SEs over 3x naive SEs on popular evals. Anthropic-only figures. [[raw/2026-11-15-anthropic-statistical-approach-to-model-evals#^e2]], [[raw/2026-11-15-anthropic-statistical-approach-to-model-evals#^e3]]
- Repeats help only down to the floor set by task-sampling variance. In Miller's power example (n = 198; parameters are fictional by the author's description, so the numbers illustrate the method and are not measured values), raising repeats K from 1 to 10 cuts the minimum detectable effect from 13.2% to 7.5%. [[raw/2026-11-15-miller-adding-error-bars-to-evals#^e1]], [[raw/2026-11-15-miller-adding-error-bars-to-evals#^e2]]
- Sample-size formula for a paired design with repeats (Miller eq. 9-10): [[raw/2026-11-15-miller-adding-error-bars-to-evals#^e3]]
- Resampling several answers per task is recommended for non-deterministic evals (Inspect `epochs`). [[raw/2026-11-15-anthropic-statistical-approach-to-model-evals#^e4]]
- Run-to-run inconsistency is real: gpt-4o reached pass^1 of about 61% (retail) but pass^8 below 25%; tau-bench used at least 3 trials. [[raw/2026-11-15-tau-bench-tool-agent-user-interaction#^e3]] (June 2024, gpt-4o era)
- pass@k (at least one success in k) rises with k; pass^k (all k succeed) falls with k. Pick by whether one success or consistency matters. [[raw/2026-11-15-tau-bench-tool-agent-user-interaction#^e1]], [[raw/2026-11-15-tau-bench-tool-agent-user-interaction#^e2]], [[raw/2026-11-15-anthropic-demystifying-evals-for-ai-agents#^e7]]
- Single-run reporting is unreliable: many reported scores exceeded the maximum of five reproduction runs and error bars were rarely given. No source states a "best-of-N" rule; that is inference. [[raw/2026-11-15-ai-agents-that-matter-kapoor#^e7]], [[raw/2026-11-15-ai-agents-that-matter-kapoor#^e10]]
- Most assessed benchmarks report neither statistical significance nor a trivial-agent baseline. [[raw/2026-11-15-establishing-best-practices-for-agentic-benchmarks-abc#^e4]]
- Noise floor: infrastructure confounders stack on binomial CIs that already span 1-2 points; Anthropic says gaps under 3 points deserve skepticism until configuration is matched. [[raw/2026-11-15-anthropic-infrastructure-noise#^e3]]
- Binary pass/fail can be too coarse: 500 tasks resolve about 6.3 points, none of 45 top-ten pairs differ significantly, and graded credit can separate arms that pass/fail ties. [[raw/2026-11-15-agent-benchmarks-stop-ranking-before-they-run-out-of-tasks#^e1]], [[raw/2026-11-15-agent-benchmarks-stop-ranking-before-they-run-out-of-tasks#^e3]], [[raw/2026-11-15-agent-benchmarks-stop-ranking-before-they-run-out-of-tasks#^e4]] (preprint, single version, not peer reviewed)

## Tensions

> [!warning] Not contradictions, but kept visible
> - Anthropic: 20-50 tasks from real failures suffice early because effects are large. [[raw/2026-11-15-anthropic-demystifying-evals-for-ai-agents#^e1]] Miller's worked example (n about 969 for a 3-point effect) implies about 1,000 independent tasks under assumed variances, and the 500-task power figure above says small effects need many tasks. They apply to different effect sizes (MDE scales as 1/sqrt(n)).
> - Hardy et al.: more similar tasks cannot fix uncertainty from limited scaffold coverage (by at most 0.097 reliability). [[raw/2026-11-15-agent-evaluation-reliability-more-tasks-wont-fix-leaderboard#^e2]] This is a model-ranking claim, not a single-system claim.
> - Repeat counts differ (tau-bench at least 3; Anthropic's SWE-bench experiment 10 samples; secondary posts 5 or 10). No primary source fixes one number; by Miller's formula it depends on within-task versus between-task variance.

## Caveats

> [!warning]
> - The 20-50 task figure is single-source (below the two-source bar).
> - No source was found on paired tests for binary outcomes (McNemar, sign test) or bootstrap CIs; the sources give the normal-approximation paired SE. Miller's approximation is likely weakest at small n and near 0 or 1 pass rates (unconfirmed). Card et al. 2020 (arXiv 2010.06595) was not fetched.
> - SWE-bench variance sources (arXiv 2508.03501, SWE-Edit arXiv 2604.26102), the "Identical Runs, Different Results" ResearchGate page (HTTP 500), and Medium/Substack noise posts were seen only as snippets or not fetched; the 1.8-point std and 5-rerun figures are unverified.
> - Anthropic's summary post restates Miller, so they are not independent confirmations. Miller (2024-11) and tau-bench (2024-06) are over 18 months old, but the statistics are method, not model-dependent.

## Open questions

> [!question]
> What repeat count and task count would give a useful minimum detectable effect for the slopify suite? Left to shaping.

## Sources

- [[raw/2026-11-15-miller-adding-error-bars-to-evals]], [[raw/2026-11-15-anthropic-statistical-approach-to-model-evals]], [[raw/2026-11-15-tau-bench-tool-agent-user-interaction]], [[raw/2026-11-15-anthropic-infrastructure-noise]], [[raw/2026-11-15-anthropic-demystifying-evals-for-ai-agents]], [[raw/2026-11-15-agent-benchmarks-stop-ranking-before-they-run-out-of-tasks]], [[raw/2026-11-15-agent-evaluation-reliability-more-tasks-wont-fix-leaderboard]], [[raw/2026-11-15-ai-agents-that-matter-kapoor]], [[raw/2026-11-15-establishing-best-practices-for-agentic-benchmarks-abc]]
