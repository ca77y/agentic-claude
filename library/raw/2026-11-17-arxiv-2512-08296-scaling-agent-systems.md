---
title: Towards a Science of Scaling Agent Systems (arXiv 2512.08296)
type: raw
summary: Controlled study of single-agent vs four multi-agent architectures across models and benchmarks, with per-task effects, overhead, error amplification, and a predictive model.
tags: [evaluation, architecture, performance, reliability]
aliases: [Towards a Science of Scaling Agent Systems]
source: https://arxiv.org/abs/2512.08296
accessed: 2026-11-17
published: 2025-12-09
provider: arXiv
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-17
updated: 2026-11-17
---

# Towards a Science of Scaling Agent Systems (arXiv 2512.08296)

> [!quote] Source
> **URL**: https://arxiv.org/abs/2512.08296
> **Accessed**: 2026-11-17
> **Method/Context**: Abstract page (v3, 8 Apr 2026), the v3 HTML full text (https://arxiv.org/html/2512.08296v3), and the v1 abstract (https://arxiv.org/abs/2512.08296v1). `published` is the v1 date, 9 Dec 2025. Passages in quotation marks are verbatim; everything else is a paraphrase or note. Section numbers are v3's. The appendices were not read in full.

## Key evidence

- **Study size changed between versions.** v1 describes "a controlled evaluation spanning 180 configurations with standardized tools and token budgets." v3 extends this to 260 configurations and six benchmarks by adding SWE-bench Verified and Terminal-Bench. The 180 are the 4 original benchmarks x 9 models x 5 architectures. v3 sec 4.1: "BrowseComp-Plus, Finance Agent, PlanCraft, and Workbench each contribute 45 configurations (9 models x 5 architectures); SWE-bench Verified and Terminal-Bench each contribute 40 configurations (8 models x 5 architectures, as Claude Sonnet 3.7 is deprecated)." ^e1
- **Architectures.** Single-Agent (SAS); Independent (parallel, no communication, outputs concatenated by a synthesis-only aggregator); Centralized (orchestrator hub-and-spoke, r rounds); Decentralized (peer-to-peer debate rounds); Hybrid (orchestrator plus limited peer edges). The paper frames them as a structural ablation of orchestrator presence and peer communication (v3 sec 3.1, 4.1). "The synthesis_only policy concatenates sub-agent outputs without cross-validation or majority voting." ^e2
- **Models.** Three families, nine models on the four original benchmarks: OpenAI GPT-5-nano, GPT-5-mini, GPT-5; Google Gemini-2.0 Flash, Gemini-2.5 Flash, Gemini-2.5 Pro; Anthropic Claude Sonnet 3.7, Sonnet 4, Sonnet 4.5. Sonnet 3.7 is dropped on SWE-bench Verified and Terminal-Bench. The models are "spanning externally standardized Intelligence Index values from 42 to 71" (v3 sec 4.1). ^e3
- **What is held fixed.** Within a model: tools, prompts, and compute. The model varies across the study, but each SAS vs MAS comparison uses the same model, and the SAS run is the same-model reference. v3 sec 1: the study "maintains identical task prompts, tools, and computational budgets across all configurations, while systematically varying only coordination structure and model capability." Abstract: "standardizing tools, prompts, and compute to isolate architectural effects." Compute is matched by total iterations (sec 4.1): "we matched maximum total iterations between MAS and SAS systems ... SAS received proportionally more reasoning rounds to compensate for lack of parallel deliberation." MAS agents therefore get fewer per-agent iterations. ^e4
- **Effect by task type (mean success, v3 sec 4.2).** "PlanCraft exhibits universal performance degradation across all multi-agent architectures." ^e5
  - Finance-Agent: SAS 0.349; Centralized +80.8% (0.631), Decentralized +74.5% (0.609), Hybrid +73.1% (0.604).
  - PlanCraft: SAS 0.568; Centralized -50.3% (0.282), Decentralized -41.5% (0.332), Hybrid -39.1% (0.346), Independent -70.0% (0.170).
  - Workbench: SAS 0.629; Decentralized +5.6% (0.664), Centralized and Hybrid -1.2%.
  - BrowseComp-Plus: SAS 0.318; Decentralized +9.2% (0.347), Centralized +0.2%, Independent about -35% (Fig. 2 caption).
  - The Finance-Agent Centralized gain is +80.8% in v3 and 80.9% in the v1 abstract.
- **Coding results (v3 only).** SWE-bench Verified has 7 tools (bash, file editing, test execution). SAS mean 0.522, and every MAS architecture is slightly worse: Hybrid -2.1% (0.511), Centralized -3.1% (0.506), Decentralized -5.4% (0.494), Independent -14.9% (0.444). "On SWE-bench Verified, all MAS architectures show slight degradation relative to SAS (mean 0.522)." Terminal-Bench (2 tools), SAS mean 0.344: Independent +1.7% (0.350), Centralized -19.2% (0.278). The authors attribute SWE-bench to capability saturation (single-agent baselines above 45%) and Terminal-Bench to low tool count (sec 4.1, 4.2). ^e6
- **Sample size for the coding arms is small.** SWE-bench Verified and Terminal-Bench use 20-instance subsets per configuration; the other four benchmarks use 50 to 100 instances (sec 4.1). Sec 5 Limitations (v): "Bootstrap 95% confidence intervals (10,000 resamples) yield typical widths of +/-20 percentage points per cell; while individual pairwise comparisons are underpowered at n=20, aggregate trends across 8 models x 2 benchmarks remain robust." The aggregate trend is the 45% threshold with a 94% match rate (p<0.001, binomial test). ^e7
- **Coordination overhead and token cost.** Overhead is (T_MAS - T_SAS)/T_SAS (sec 4.1, 4.3, Table 5). "Multi-agent architectures incur substantial overhead: independent (58%), centralized (285%), decentralized (263%), and hybrid (515%), representing 1.6-6.2x token budgets relative to single-agent at matched performance." Coordination efficiency E_c (success per relative turn count): SAS 0.466, Independent 0.234, Hybrid 0.074, a 2 to 6x efficiency penalty. On Workbench, E_c falls from 0.466 (SAS) to 0.074 (Hybrid). The cost-performance figure covers only the four original benchmarks; SWE-bench Verified and Terminal-Bench lack cost tracking there because of the Docker-based evaluation. ^e8
- **Latency.** I found no per-design latency or wall-clock numbers in the sections read. Sec 5 Limitations (vi) says only that "token consumption and latency grow substantially with agent count" and treats latency as a floor imposed by token-based communication. A grep for "latency" and "wall-clock" found only the limitations hit among the lines checked; the appendices were not read in full. ^e9
- **Error amplification.** The v1 abstract and the paper give 17.2x for Independent against 4.4x for Centralized. Trace-level amplification factors (sec 3.1, 4.3): SAS 1.0, Centralized 4.4, Hybrid 5.1, Decentralized 7.8, Independent 17.2. "Independent systems amplify trace-level errors 17.2x ... Centralized coordination, however, contains this to 4.4x." The task-level factor (E_MAS/E_SAS) is only about 1.1 to 1.3, and the paper says the two metrics measure "complementary aspects" and differ in magnitude. ^e10
- **Error amplification is not significant in the v3 regression.** "neither the main effect of error amplification (beta=0.014, p=0.658) nor its interaction with tool count (A_e^trace x T: beta=0.022, p=0.332) reaches statistical significance." The authors say performance differences are better explained by efficiency and overhead than by error propagation per se (sec 4.3). ^e11
- **Predictive model.** The v1 abstract reports cross-validated R^2=0.513 on four benchmarks. v3 reports R^2_CV=0.373 (+/-0.170 SD) with the Intelligence Index, or 0.413 (+/-0.130) with a task-grounded Agentic Capability Index, on six benchmarks. The regression is a mixed-effects model with about 20 parameters (nine interaction terms, including a quadratic capability term), fitted on 260 configurations. All versions report 87% correct architecture selection on held-out configurations; v3 compares this with 20% random and 54% for a capability-only model (sec 4.3, abstract). ^e12
- **Key scaling effects (v3 sec 1, 4.3; v1 abstract).** ^e13
  - Capability ceiling: "tasks where single-agent performance already exceeds 45% accuracy experience negative returns from additional agents." v3 gives beta=-0.236, p=0.004 in the introduction; the v1 abstract gives beta=-0.408, p<0.001. The decision boundary is about 0.45 raw accuracy.
  - Tool-coordination trade-off: beta=-0.096, p=0.002, 95% CI [-0.154, -0.037]. Tasks with 4 or fewer tools show negligible efficiency effects.
  - Overhead x tools interaction: beta=-0.033, p=0.211. It is not significant in the 6-benchmark model and is labelled a directional pattern.
  - Linear capability effect beta_I=0.126, p=0.008; the quadratic term is not significant (p=0.977).
- **Out-of-sample check.** On three held-out models (GPT-5.2, Gemini-3.0 Pro, Gemini-3.0 Flash; Intelligence Index 75; BrowseComp-Plus only) the equation is reported as well calibrated for MAS (average error 6.1%) but systematically over-predicts single-agent performance. Three findings are said to generalize and two are model-family-specific. Leave-one-dataset-out CV is reported as hard for absolute success rates (appendix Tables 7 to 10, sec 5 (vii)). This is a paraphrase of captions seen by grep; the appendix tables were not read in full. ^e14
- **Stated limits (v3 sec 5).** ^e15
  - (i) Teams of up to nine agents were explored only preliminarily.
  - (ii) All agents share the same base architecture. 13 heterogeneous-model configurations on BrowseComp-Plus show no escape from the capability ceiling.
  - (iv) Prompts are identical across conditions, not tuned per model or architecture, so architecture-specific prompt tuning may change the results.
  - (v) Six benchmarks only, with the 20-instance subsets for SWE-bench Verified and Terminal-Bench.
  - (vi) Token-based communication sets cost and latency floors, and the benchmarks are text-based.
  - (vii) The regression is clustered at the dataset level (G=6). "several predictors that are significant under naive OLS lose significance under cluster-robust inference (Table 14)," so they are framed as descriptive patterns.
- **Architecture preference varies by model family (sec 4.2).** On Finance-Agent, Centralized gains over SAS are Anthropic +127.5% (0.636 vs 0.280), Google +164.3% (0.740 vs 0.280), OpenAI +69.9% (0.79 vs 0.465). On PlanCraft every family degrades; Anthropic is worst, with -54.5% for Hybrid. "No vendor achieves universal multi-agent dominance." ^e16
- **Aggregate across all six benchmarks and architectures (sec 4.2).** "the overall mean MAS improvement is -0.3% (95% CI: [-58.7%, +77.2%])" with sigma 37.5%. That is no average benefit and very high heterogeneity. ^e17

## Limitations

- Section numbers and quotations come from v3 unless a version is named. The v1 and v3 figures differ in several places (configuration count, R^2, the capability-ceiling beta), so cite the version with each number.
- The coding arms (SWE-bench Verified, Terminal-Bench) use 20 instances per configuration. The authors state that pairwise comparisons there are underpowered, with cells about +/-20 percentage points wide.
- The regression is clustered at the dataset level with G=6, so many predictors are descriptive patterns, not established effects.
- Per-design latency was not found. The appendices (including Tables 7 to 10 and 14) were not read in full, so the absence of latency tables is not confirmed.
- The task and tool-count effects come from one study with a single shared prompt per condition; the authors note that per-architecture prompt tuning may change the results.

## Relevance

- Gives a same-model SAS vs orchestrated comparison on SWE-bench Verified (not Pro) with all four MAS designs slightly worse (^e6), with the sample-size caveat in ^e7. Relevant to the coding page and SMR-375.
- Overhead, efficiency, and error-amplification numbers (^e8, ^e10, ^e11) bear on the cost side of single-agent vs multi-agent decisions.
- The v1 to v3 changes (^e1, ^e12, ^e13) show which headline numbers moved between versions.
