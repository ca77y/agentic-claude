---
title: Agent Architecture Cost-Success Trade-offs (arXiv:2611.12953)
type: raw
summary: A controlled evaluation of eight agent architectures on 13 enterprise SOPs with one model fixed; only orchestration-v2 significantly beat the single-agent baseline (75.6% vs 67.4%), at 4.7x tokens.
tags: [evaluation, architecture, performance]
aliases: []
source: https://arxiv.org/abs/2611.12953
accessed: 2026-11-17
published: 2026-11-07
provider: arXiv (Amazon and University of Washington authors)
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-17
updated: 2026-11-17
---

# Agent Architecture Cost-Success Trade-offs (arXiv:2611.12953)

> [!quote] Source
> **URL**: https://arxiv.org/abs/2611.12953 (full text read at https://arxiv.org/html/2611.12953v1)
> **Accessed**: 2026-11-17
> **Method/Context**: Gathered for SMR-376 (published evals of single-agent versus multi-agent designs). Findings below were reported by a researcher from the arXiv abstract page and the v1 HTML. Each bullet marks whether it is a quotation, a paraphrase, or an inference. Section and table numbers are the paper's. The paper's HTML text renders some counts with doubled digits; the extraction artifact is noted where it matters.

## Key evidence

- Identity: arXiv:2611.12953 v1, "Agent Architecture Cost-Success Trade-offs: A Controlled Evaluation across Enterprise-Style SOPs". 14 authors (Nandi, Arora, Bai, Patel, Shah, et al.), Amazon and University of Washington. Submitted 7 Nov 2026; CC BY-NC-ND 4.0; cs.AI. Only v1 exists. Header passage: "Submitted on 7 Nov 2026 ... Affiliation: Amazon University of Washington". (quotation of header, paraphrase of the rest) ^e1
- Task set and domain: SOP-Bench (Nandi et al. 2026, arXiv 2506.08119), enterprise standard operating procedures with natural-language procedures, tool schemas, deterministic mock-tool dispatch and ground-truth outputs. SOPs named in the tables: aircraft inspection, content flagging, customer service, dangerous goods, email intent, KYB (know your business), patient intake, referral abuse v1 and v2, traffic spoofing, video annotation, video classification, warehouse inspection. "The shared comparison spans the 13 SOPs common to all arms (2,124 tasks per arm)." (sec 3.1, Table 2; quotation and paraphrase) ^e2
- Designs compared: four architecture families, eight arms (Table 1; sec 3.2; Appendix F). (paraphrase) ^e3
  - Function-calling baseline: a single agent with the full SOP and all tools.
  - Skill-augmented single agent, Constrained Skill Execution (CSE): CSE-high with high-quality skills and CSE-low with degraded skills. The executor is exposed only to each selected skill's declared tools.
  - Centralized orchestration. Orch-v1: decomposer, worker, synthesizer; each worker sees an isolated SOP slice and a tool subset; dependency-ready workers run serially. Orch-v2: every worker gets the full SOP and tool set; a commit-with-basis contract forbids placeholder outputs; the synthesizer may resolve gaps; one re-dispatch round; output validated against permitted values.
  - Triage-guided swarm with three blueprint levels: none, descriptive, full. Full is treated as a hybrid of central planning and decentralized execution. 10-handoff cap; shared blackboard.
  - A separate Open-Tool Skill Guidance (OSG) formulation ran on only two SOPs and is not in the shared matrix.
  - Quoted for Orch-v2: "Full SOP and tool set per worker; commit-with-basis contract, one re-dispatch round, output validation."
- Model, tasks and tools held fixed, with caveats. The model is us.anthropic.claude-opus-4-8 on a pinned code revision for all cross-architecture runs, and the tools are the benchmark's deterministic mock tools, so tool outcomes are fixed across arms. Quoted: "Holding the model, tasks, and tools fixed and varying only the architecture" and "All cross-architecture runs hold the model fixed at us.anthropic.claude-opus-4-8 on a pinned code revision." Appendix E justifies the model version: baseline macro TSR 68.5, 66.5 and 67.4 on Opus 4.6, 4.7 and 4.8 (maximum spread 2.3 points). (abstract, sec 3.1, Appendix E, Limitations) ^e4
  - Caveat (inference from the arm designs in ^e3): the tool backend is fixed, but the tool set exposed to the agent differs by arm. CSE scopes the executor to each skill's declared tools, Orch-v1 workers and swarm specialists get tool subsets, and the baseline has all tools.
  - Caveat (Limitations): each arm is a single implementation with its own prompts and control flow, and arms span multiple runs and code revisions.
- Results (Table 3, ordered by tokens; 13 SOPs; macro TSR is the mean over the 13 SOPs). Cost is reported as tokens and latency; no dollar cost is reported. (numbers from the paper) ^e5

  | Arm | TSR | Tokens per task | Latency |
  | --- | --- | --- | --- |
  | Baseline (function calling) | 67.4% | 24.9k (1.0x) | 24.0s (1.0x) |
  | Orch-v1 | 58.2% | 35.8k (1.4x) | 62.4s (2.6x) |
  | Swarm-descriptive | 70.4% | 47.3k (1.9x) | 100.0s (4.2x) |
  | Swarm-none | 65.4% | 52.8k (2.1x) | 104.4s (4.4x) |
  | CSE-low | 59.8% | 58.5k (2.4x) | 62.8s (2.6x) |
  | Swarm-full | 70.5% | 67.2k (2.7x) | 138.6s (5.8x) |
  | CSE-high | 73.1% | 74.0k (3.0x) | 66.1s (2.8x) |
  | Orch-v2 | 75.6% | 117.3k (4.7x) | 73.5s (3.1x) |

  - Macro between-SOP standard errors (points): baseline 7.7, CSE-high 6.3, CSE-low 7.8, Orch-v1 7.7, Orch-v2 6.3, Swarm-none 6.9, Swarm-descriptive 6.6, Swarm-full 6.8.
  - The paper itself confirms the ranges: "every coordinated arm spends 1.4-4.7x the baseline's tokens and 2.6-5.8x its latency." (quotation, Table 3 and Table 2)
- The one design that beat the single agent: Orchestration-v2 is the only arm to significantly exceed the baseline, 75.6% vs 67.4% macro TSR (+8.2 points). Test: paired random-effects on per-SOP log-odds (DerSimonian-Laird with Knapp-Hartung adjustment, k=13); odds ratio 1.72, p=0.007. It is also the most expensive arm (4.7x tokens, 3.1x latency). Quoted: "orchestration-v2 recovers exactly those SOPs (patient_intake 13.6->98.5, email_intent 75.8->96.2, know_your_business 23.3->60.0) and is the only arm to significantly exceed the baseline (... odds ratio 1.72, p=0.007)." Table 2 also shows v2 at 62% vs baseline 34% on video annotation and 60% vs 39% on KYB; v2 does not win everywhere (dangerous goods 87 vs 92, warehouse 50 vs 52). (sec 4.2, 4.4, Appendix D; quotation and numbers) ^e6
- Implementation fixes v2 needed. v1's losses were traced to "one design gap": each worker saw only its SOP slice and none could resolve a missing input, so a blocked worker could only abstain and the pipeline emitted placeholder decisions. Orch-v1 lost to the baseline on 9 of 13 SOPs (6 significant at p<0.05, two-proportion test) and had the lowest macro TSR of any arm (58.2%); failures concentrated on coupled multi-field SOPs (patient_intake 13.6%, know_your_business 23.3%). The HTML text renders the counts as "99 of 1313" and "66"; read as 9 of 13 and 6, an extraction artifact. The five v2 changes: (1) every worker gets the full SOP and tool set; (2) a commit-with-basis contract forbids placeholder outputs; (3) the synthesizer may resolve residual gaps; (4) a single re-dispatch round lets a blocked worker request what it is missing; (5) each decision is validated against the SOP's permitted values. The authors read this "not as multi-agent beats single-agent but as implementation quality mattering more than the single- versus multi-agent choice." (sec 4.2, Appendix F; quotation and paraphrase) ^e7
- Significance and sample size. The unit of inference is the SOP (n=13). (sec 3.4, 4.1, 4.3, 4.5, Appendix E, Limitations; quotation and paraphrase) ^e8
  - Macro between-SOP standard errors of 6.3-7.8 points overlap across all arms, and no arm separates from baseline by a per-SOP sign test. Quoted: "no architecture is statistically separable in aggregate". Orch-v2 is the single exception (random-effects OR 1.72, p=0.007; see ^e6).
  - Pooled task-level standard error is about 1 point, but the authors refuse to read pooled p-values as a ranking and pair each with a per-SOP sign test.
  - Skill-quality gap (CSE-high vs CSE-low, +13.3 points) is not significant by sign test (77 wins vs 44, 22 ties).
  - Swarm-full vs swarm-descriptive: sign test p=1.00, while full costs 42% more tokens and 39% more latency.
  - Complexity analysis: median split into 6 simple and 7 complex SOPs; baseline 71.8 simple vs 63.6 complex; Orch-v2 78.7 vs 72.9. No Spearman correlation is significant (|rho| > 0.56 needed at n=13); framed as hypotheses.
  - One run per task at temperature 1, so only binomial uncertainty is reported.
- Further findings (sec 4.3-4.6; quotation and paraphrase) ^e9
  - The baseline is Pareto-optimal on cost: "no arm both cheaper and more accurate". Orch-v1 and Swarm-none are strictly dominated.
  - Arms that edge the baseline pay heavily for insignificant gains: CSE-high +5.7 points at 3.0x tokens, Swarm-descriptive +3.0 at 1.9x, Swarm-full +3.1 at 2.7x.
  - High-quality skills raise macro TSR (CSE-high 73.1 vs baseline 67.4) while degraded skills fall below baseline (CSE-low 59.8).
  - A swarm blueprint helps (none 65.4 to descriptive 70.4) because of stage coverage, but full ordering adds nothing.
  - On simple SOPs architecture is "a wash"; on complex branching SOPs added structure only plausibly pays off (directional, not significant).
  - Exploratory two-SOP ablation: tool scoping (CSE) helps on KYB (8 tools: CSE 85.6 vs OSG 68.9) but hurts on 26-tool video annotation (CSE-high 37.6 vs OSG-high 57.6).
- Authors' conclusion wording, scoped to enterprise SOPs. This is the authors' statement, not a slopify recommendation: "start simple, measure marginal TSR on the target SOPs, repair implementation failures before changing architecture families, and switch only when the additional TSR justifies the additional architecture cost." The efficiency framing is "the single agent is the efficient default". (sec 5, sec 4.4; quotation) ^e10

## Limitations

- Authors' stated limits (Limitations section; quotation and paraphrase):
  - Single benchmark (SOP-Bench). Synthetic deterministic mock tools omit the latency, errors and nondeterminism of live services, so conclusions may not transfer to production SOPs.
  - One model (claude-opus-4-8): "no claim that the ranking, cost multipliers, or the orchestration v1-to-v2 reversal generalize beyond it".
  - Between-SOP standard errors dominate, so most differences are not significant; complexity correlations are directional only; the OSG ablation is exploratory.
  - Each architecture is a single implementation sensitive to prompt and control-flow choices, and the skill-quality contrast is a bundled degradation.
  - One run per task, no stochastic-variance estimate. Arms span multiple runs and code revisions. Only outcome and cost metrics are reported; process metrics are left to future work.
- Scoring defects (sec 4.7): two were found and fixed, a multi-field output-contract bug and a trace-denominator bug. The multi-field fix is "unverified for orchestration, whose multi-field cells we therefore treat as provisional". This bears directly on the Orch-v1 vs Orch-v2 result in ^e6 and ^e7. (quotation)
- Latency (Appendix E) is "descriptive because runs occurred at different times and no service-load metadata was logged". (quotation)
- Not reported by the paper (inference from absence): dollar cost per run; repeated runs or seeds per task (one run per task); confidence intervals for token and latency multiples; any cross-model-family result; results on coding tasks.
- Multiple definitions of token multiple: Table 3 ranges are pooled task-level multiples, while Table 2 gives per-SOP multiples, and the paper notes that a column mean of Table 2 differs from the pooled Table 3 figures. Per-SOP multiples reach 13.8x tokens (CSE-high, email intent) and 10.6x latency (Swarm-full, KYB), so 1.4-4.7x is a pooled figure, not a per-SOP bound. (Tables 2, 3; paraphrase of the paper's numbers)
- The v1 HTML is the only version; no peer review is indicated in the header.

## Relevance

- A published, controlled comparison of single-agent against multi-agent designs with the model, tasks and tool backend fixed, relevant to SMR-376. Its domain is enterprise SOPs with mock tools, not coding or software delivery. (inference; the paper reports no coding results)
- The quantified cost side (1.4-4.7x tokens, 2.6-5.8x latency, pooled) is confirmed from the paper itself rather than from a secondary source (see ^e5).
- The single significant gain (Orch-v2, ^e6) came after an implementation fix to a design gap (^e7), and the v1-to-v2 contrast rests on scoring cells the authors call provisional (see Limitations). Treat it as one-model, one-benchmark evidence.
