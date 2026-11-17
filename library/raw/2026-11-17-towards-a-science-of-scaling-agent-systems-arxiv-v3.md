---
title: Towards a Science of Scaling Agent Systems (arXiv 2512.08296v3)
type: raw
summary: Paper reporting a controlled single-agent vs multi-agent evaluation (260 configurations, six benchmarks in v3) with per-task effects, coordination cost, error amplification, and a predictive model.
tags: [evaluation, architecture, performance, agent-harness]
aliases: []
source: https://arxiv.org/html/2512.08296v3
accessed: 2026-11-17
published: 2026-04-08
provider: arXiv
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-17
updated: 2026-11-17
---

# Towards a Science of Scaling Agent Systems (arXiv 2512.08296v3)

> [!quote] Source
> **URL**: https://arxiv.org/html/2512.08296v3
> **Accessed**: 2026-11-17
> **Method/Context**: Full-text HTML of paper v3 (8 Apr 2026). The first version (v1, 9 Dec 2025) is at https://arxiv.org/abs/2512.08296v1 and is cited below only where a finding names it. Quotations are marked "quote"; everything else is paraphrase or the scribe's inference. Appendices were not read in full.

## Key evidence

- **Study size across versions.** v1 describes 180 configurations on four benchmarks (Finance-Agent, BrowseComp-Plus, PlanCraft, Workbench); v3 extends this to 260 configurations and six benchmarks by adding SWE-bench Verified and Terminal-Bench. The 180 are 4 benchmarks x 9 models x 5 architectures (4 x 45). Source: v3 sec 4.1, v1 abstract. "BrowseComp-Plus, Finance Agent, PlanCraft, and Workbench each contribute 45 configurations (9 models x 5 architectures); SWE-bench Verified and Terminal-Bench each contribute 40 configurations (8 models x 5 architectures, as Claude Sonnet 3.7 is deprecated)." (quote). v1: "a controlled evaluation spanning 180 configurations with standardized tools and token budgets." (quote) ^e1

- **Architectures.** Single-Agent (SAS); Independent (parallel, no communication, outputs concatenated by a synthesis-only aggregator); Centralized (orchestrator hub-and-spoke, r rounds); Decentralized (peer-to-peer debate rounds); Hybrid (orchestrator plus limited peer edges). The paper frames them as a structural ablation of orchestrator presence and peer communication. Source: v3 sec 3.1, 4.1. "The synthesis_only policy concatenates sub-agent outputs without cross-validation or majority voting" (quote) ^e2

- **Models.** Three families, nine models on the four original benchmarks: OpenAI GPT-5-nano, GPT-5-mini, GPT-5; Google Gemini-2.0 Flash, Gemini-2.5 Flash, Gemini-2.5 Pro; Anthropic Claude Sonnet 3.7, Sonnet 4, Sonnet 4.5 (Sonnet 3.7 dropped on SWE-bench Verified and Terminal-Bench). Source: v3 sec 4.1. "spanning externally standardized Intelligence Index values from 42 to 71" (quote) ^e3

- **What is held fixed.** Within a model, tools, prompts and compute are held fixed across architectures. The model varies across the study, but each SAS vs MAS comparison is at the same model (the SAS baseline is the same-model reference). Compute is matched by total iterations: MAS agents get fewer per-agent iterations and SAS gets proportionally more. Source: v3 sec 1, 4.1, abstract. "maintains identical task prompts, tools, and computational budgets across all configurations, while systematically varying only coordination structure and model capability" (quote); "we matched maximum total iterations between MAS and SAS systems ... SAS received proportionally more reasoning rounds to compensate for lack of parallel deliberation" (quote); abstract: "standardizing tools, prompts, and compute to isolate architectural effects" (quote). ^e4

- **Effect by task type (mean success, v3 sec 4.2).** Source: v3 sec 4.2 and Fig. 2 caption. "PlanCraft exhibits universal performance degradation across all multi-agent architectures." (quote) ^e5
  - Finance-Agent: SAS 0.349; Centralized +80.8% (0.631), Decentralized +74.5% (0.609), Hybrid +73.1% (0.604).
  - PlanCraft: SAS 0.568; Centralized -50.3% (0.282), Decentralized -41.5% (0.332), Hybrid -39.1% (0.346), Independent -70.0% (0.170).
  - Workbench: SAS 0.629; Decentralized +5.6% (0.664), Centralized and Hybrid -1.2%.
  - BrowseComp-Plus: SAS 0.318; Decentralized +9.2% (0.347), Centralized +0.2%, Independent about -35% (Fig. 2 caption).
  - The Finance-Agent Centralized gain is +80.8% in v3 but 80.9% in the v1 abstract.

- **Coding results (v3 only; added in the 6-benchmark extension).** SWE-bench Verified, SAS mean 0.522, all MAS slightly worse: Hybrid -2.1% (0.511), Centralized -3.1% (0.506), Decentralized -5.4% (0.494), Independent -14.9% (0.444). SWE-bench Verified has 7 tools (bash, file editing, test execution). Terminal-Bench (2 tools), SAS mean 0.344: Independent +1.7% (0.350), Centralized -19.2% (0.278). The authors attribute SWE-bench to capability saturation (single-agent baselines above 45%) and Terminal-Bench to low tool count. Source: v3 sec 4.1, 4.2. "On SWE-bench Verified, all MAS architectures show slight degradation relative to SAS (mean 0.522)" (quote). ^e6

- **Sample size and significance for the coding arms.** SWE-bench Verified and Terminal-Bench use 20-instance subsets per configuration (the other four use 50 to 100 instances). Bootstrap 95% CIs are about +/-20 percentage points per cell; pairwise comparisons are underpowered at n=20, and only the aggregate trend (45% threshold, 94% match rate, p<0.001 binomial test) is called robust. Source: v3 sec 4.1, sec 5 Limitations (v). "Bootstrap 95% confidence intervals (10,000 resamples) yield typical widths of +/-20 percentage points per cell; while individual pairwise comparisons are underpowered at n=20, aggregate trends across 8 models x 2 benchmarks remain robust" (quote) ^e7

- **Coordination overhead and token cost.** Overhead is (T_MAS - T_SAS)/T_SAS. Coordination efficiency E_c (success per relative turn count): SAS 0.466, Independent 0.234, Hybrid 0.074, a 2 to 6x efficiency penalty; on Workbench E_c falls from 0.466 (SAS) to 0.074 (Hybrid). The cost-performance figure covers only the four original benchmarks (180 configurations with full cost tracking); SWE-bench Verified and Terminal-Bench lack cost tracking in that figure because of the Docker-based evaluation. Source: v3 sec 4.1, 4.3 (Table 5). "Multi-agent architectures incur substantial overhead: independent (58%), centralized (285%), decentralized (263%), and hybrid (515%), representing 1.6-6.2x token budgets relative to single-agent at matched performance." (quote) ^e8

- **Latency.** No per-design latency or wall-clock numbers were found in the sections read. The limitations section says only that "token consumption and latency grow substantially with agent count" and treats latency as a floor imposed by token-based communication. Source: v3 sec 5 Limitations (vi). Treat latency per design as not reported. (Paraphrase, plus inference that no table was seen: a grep for "latency" and "wall-clock" found only the limitations hit among the lines checked, and the appendices were not read in full.) ^e9

- **Error amplification (trace level).** Trace-level amplification factors: SAS 1.0, Centralized 4.4, Hybrid 5.1, Decentralized 7.8, Independent 17.2. The task-level factor (E_MAS/E_SAS) is only about 1.1 to 1.3, and the paper says the two metrics measure "complementary aspects" and differ in magnitude. Source: v3 sec 3.1, 4.3. "Independent systems amplify trace-level errors 17.2x ... Centralized coordination, however, contains this to 4.4x" (quote) ^e10

- **Error amplification is not significant in the v3 regression.** "neither the main effect of error amplification (beta=0.014, p=0.658) nor its interaction with tool count (A_e^trace x T: beta=0.022, p=0.332) reaches statistical significance" (quote). The authors say performance differences are better explained by efficiency and overhead than by error propagation per se. Source: v3 sec 4.3. ^e11

- **Predictive model.** v1 abstract reports cross-validated R^2=0.513 on four benchmarks; v3 reports R^2_CV=0.373 (+/-0.170 SD) with the Intelligence Index, or 0.413 (+/-0.130) with a task-grounded Agentic Capability Index, on six benchmarks. The regression has about 20 parameters (a mixed-effects model with nine interaction terms, including a quadratic capability term), fitted on 260 configurations. All versions report 87% correct architecture selection on held-out configurations (versus 20% random and 54% for a capability-only model, per v3). Source: v3 sec 4.3 and abstract; v1 abstract. ^e12

- **Key scaling effects.** Source: v3 sec 1, 4.3; v1 abstract. "tasks where single-agent performance already exceeds 45% accuracy experience negative returns from additional agents" (quote) ^e13
  - Capability ceiling: v3 beta=-0.236, p=0.004 (intro); v1 abstract beta=-0.408, p<0.001; decision boundary about 0.45 raw accuracy.
  - Tool-coordination trade-off: beta=-0.096, p=0.002, 95% CI [-0.154,-0.037]; tasks with 4 or fewer tools show negligible efficiency effects.
  - Overhead x tools interaction: beta=-0.033, p=0.211, not significant in the 6-benchmark model and labelled a directional pattern.
  - Linear capability effect beta_I=0.126, p=0.008; the quadratic term is not significant (p=0.977).

- **Out-of-sample check.** On three held-out models (GPT-5.2, Gemini-3.0 Pro, Gemini-3.0 Flash; Intelligence Index 75; BrowseComp-Plus only) the equation is reported as well calibrated for MAS (average error 6.1%) but systematically over-predicts single-agent performance. Three findings are said to generalize and two are model-family-specific. Leave-one-dataset-out CV is reported as hard for absolute success rates. Source: v3 appendix Tables 7 to 10 and sec 5 (vii). (Paraphrase of grep-visible captions; the appendix tables were not read in full.) ^e14

- **Architecture preference varies by model family.** Finance-Agent, Centralized gains over SAS: Anthropic +127.5% (0.636 vs 0.280), Google +164.3% (0.740 vs 0.280), OpenAI +69.9% (0.79 vs 0.465). On PlanCraft every family degrades (Anthropic worst, -54.5% for Hybrid). "No vendor achieves universal multi-agent dominance" (quote). Source: v3 sec 4.2. ^e15

- **Aggregate across all six benchmarks and architectures.** "the overall mean MAS improvement is -0.3% (95% CI: [-58.7%, +77.2%])" (quote), sigma 37.5%: no average benefit and very high heterogeneity. Source: v3 sec 4.2. ^e16

## Limitations

- Authors' stated limits (v3 sec 5): (i) teams up to nine agents explored only preliminarily; (ii) all agents share the same base architecture, and 13 heterogeneous-model configurations on BrowseComp-Plus show no escape from the capability ceiling; (iv) identical prompts across conditions, not tuned per model or architecture, so architecture-specific prompt tuning may change the results; (v) six benchmarks only, with 20-instance subsets for SWE-bench Verified and Terminal-Bench; (vi) token-based communication sets cost and latency floors, and benchmarks are text-based; (vii) regression clustered at the dataset level (G=6), and "several predictors that are significant under naive OLS lose significance under cluster-robust inference (Table 14)" (quote), so they are framed as descriptive patterns. ^e17
- The coding-arm results rest on 20 instances per configuration with about +/-20 point CIs (see ^e7); the per-design coding differences are within noise.
- Appendices were not read in full, so the latency absence and the held-out-model results are partial.
- The model set (GPT-5, Gemini 2.x/2.5, Claude Sonnet 3.7 to 4.5) is older than current frontier models; the paper's own held-out check suggests the equation over-predicts single-agent performance for newer models.

## Relevance

- Gives a same-model SAS vs orchestrated comparison across five designs, with token overhead, which bears on the single-agent vs multi-agent question. The SWE-bench result is on Verified, not Pro, so it is relevant to the coding page and SMR-375 only with that caveat.
- No latency per design; any latency claim needs another source.
