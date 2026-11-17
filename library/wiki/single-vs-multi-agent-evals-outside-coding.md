---
title: Single-agent vs orchestrated designs, published evals outside coding
type: wiki
summary: Published evals on business procedures, research, finance, planning and analytics that compare one agent with orchestrated or multi-agent designs, with what was held fixed, success, tokens or cost, latency, sample size, stated limits, and where they agree and disagree.
status: contested
confidence: medium
tags:
  - evaluation
  - architecture
  - performance
  - agent-harness
aliases:
  - single vs multi-agent non-coding evals
  - SMR-376 outside-coding evals
up: "[[library/_meta/index|Library Index]]"
related:
  - "[[library/wiki/single-vs-multi-agent-evals-coding]]"
  - "[[library/wiki/slopify-benchmark-tooling-options]]"
created: 2026-11-17
updated: 2026-11-17
---

# Single-agent vs orchestrated designs, published evals outside coding

> [!abstract] Summary
> Research question (SMR-376, non-coding half): which published evals compare one agent with orchestrated multi-agent designs on work other than software engineering, and what did they find?
>
> The study that prompted this research, Amazon and University of Washington on SOP-Bench business procedures (arXiv 2611.12953), held model, tasks and tool backend fixed and varied the architecture. Every coordinated design used 1.4x to 4.7x the single agent's tokens and 2.6x to 5.8x its latency, and only one design, Orchestration-v2, beat the single agent significantly (75.6% vs 67.4%, 4.7x tokens), after the authors fixed an implementation gap. Other evals point both ways. Google's 180 to 260 configuration study finds large gains on Finance-Agent and losses on PlanCraft with no average benefit. A matched-thinking-budget study finds one agent matches or beats five multi-agent designs on multi-hop QA. Two author-built systems (enterprise analytics, a research swarm) beat their single-agent baselines, at about 3x and about 20x the tokens, with confounds. Anthropic's research-system post reports a 90.2% gain, but it is uncontrolled. The page records evidence and gaps; it makes no product decision and recommends nothing for slopify.

> [!warning] Reading limits
> Almost all sources are arXiv preprints, vendor posts or docs; none was independently replicated, and no released traces were found to check the numbers. Several figures were relayed by researchers from the source rather than re-read, and some HTML renderings garbled digits (the library's reading is noted where it matters). Absence claims such as "latency not reported" come from keyword searches or partial reads. The Daily Brief article named in the task (beri.net) was not fetched; the primary paper covers the figures it quotes.

## At a glance

"Fixed" means the same model and tools in both arms, as the raw note records it. "Compute" says whether the arms were matched on tokens. Class labels are the library's, not the authors'.

| Eval | Class | Model fixed | Tools fixed | Compute matched |
| --- | --- | --- | --- | --- |
| Amazon and UW, SOP-Bench (arXiv 2611.12953) | controlled | yes | tool backend yes; tool set exposed varies by arm | no, tokens reported |
| Google, scaling agent systems (non-coding benchmarks) | controlled | yes, per model | yes; prompts identical | iterations, not tokens |
| Tran and Kiela, equal thinking budgets (arXiv 2604.02460) | controlled | yes | n/a, no tools | yes, thinking tokens |
| ArcticSwarm, BrowseComp-Plus (arXiv 2609.01870) | controlled, author-built winner | yes | yes | no, except one voting arm |
| Rakuten India, enterprise analytics (arXiv 2608.18740) | partly uncontrolled | yes | tooling same; baseline lacks a validation layer | no |
| Anthropic, multi-agent research system | uncontrolled | no | not stated | no |
| Anthropic docs, orchestrator strategy | vendor-run, mixed | not stated per case | not stated | not stated |
| Squad, MARBLE cost | cost only | not recorded | not recorded | n/a |

## Controlled evals

### Amazon and University of Washington: Agent Architecture Cost-Success Trade-offs (arXiv 2611.12953)

- **Source.** Preprint v1 (submitted 7 Nov 2026), 14 authors; the only version; no peer review indicated. [[library/raw/2026-11-17-agent-architecture-cost-success-tradeoffs-arxiv-2611-12953#^e1]]
- **Task set.** SOP-Bench enterprise standard operating procedures with natural-language procedures, tool schemas and deterministic mock tools: 13 SOPs shared by all arms, 2,124 tasks per arm (aircraft inspection, content flagging, customer service, dangerous goods, email intent, know your business, patient intake, two referral-abuse versions, traffic spoofing, video annotation, video classification, warehouse inspection). [[library/raw/2026-11-17-agent-architecture-cost-success-tradeoffs-arxiv-2611-12953#^e2]]
- **Designs.** Eight arms in four families: a function-calling single agent (the baseline); a skill-augmented single agent (Constrained Skill Execution, with high-quality and degraded skills); centralized orchestration (Orch-v1 and Orch-v2); a triage-guided swarm at three blueprint levels. [[library/raw/2026-11-17-agent-architecture-cost-success-tradeoffs-arxiv-2611-12953#^e3]]
- **Held fixed.** Model (claude-opus-4-8 on a pinned code revision), tasks and the mock tool backend: "Holding the model, tasks, and tools fixed and varying only the architecture". Caveats: the tool set exposed to the agent differs by arm (the baseline has all tools; skill and orchestrated workers and swarm specialists get subsets), and each arm is one implementation with its own prompts, spanning multiple runs and code revisions. [[library/raw/2026-11-17-agent-architecture-cost-success-tradeoffs-arxiv-2611-12953#^e4]] [[library/raw/2026-11-17-arxiv-2611-12953-agent-architecture-cost-success#^e10]]
- **Success, tokens per task, latency** (Table 3, macro task success rate over 13 SOPs; multiples are against the baseline). [[library/raw/2026-11-17-agent-architecture-cost-success-tradeoffs-arxiv-2611-12953#^e5]]

| Arm | Success | Tokens | Latency |
| --- | --- | --- | --- |
| Baseline (single agent) | 67.4% | 24.9k (1.0x) | 24.0 s (1.0x) |
| Orch-v1 | 58.2% | 35.8k (1.4x) | 62.4 s (2.6x) |
| Swarm-descriptive | 70.4% | 47.3k (1.9x) | 100.0 s (4.2x) |
| Swarm-none | 65.4% | 52.8k (2.1x) | 104.4 s (4.4x) |
| Skill-augmented, low-quality skills | 59.8% | 58.5k (2.4x) | 62.8 s (2.6x) |
| Swarm-full | 70.5% | 67.2k (2.7x) | 138.6 s (5.8x) |
| Skill-augmented, high-quality skills | 73.1% | 74.0k (3.0x) | 66.1 s (2.8x) |
| Orch-v2 | 75.6% | 117.3k (4.7x) | 73.5 s (3.1x) |

- **Cost range.** The paper: "every coordinated arm spends 1.4-4.7x the baseline's tokens and 2.6-5.8x its latency." These are pooled task-level multiples; per-SOP multiples reach 13.8x tokens and 10.6x latency; no dollar cost is reported. [[library/raw/2026-11-17-agent-architecture-cost-success-tradeoffs-arxiv-2611-12953#^e5]] [[library/raw/2026-11-17-arxiv-2611-12953-agent-architecture-cost-success#^e12]]
- **The one significant winner.** Orch-v2 beat the baseline by 8.2 points, the only arm to do so: paired random-effects test on per-SOP log-odds (k=13), odds ratio 1.72, p=0.007. It recovered the SOPs where Orch-v1 failed (Orch-v1 to Orch-v2: patient intake 13.6% to 98.5%, email intent 75.8% to 96.2%, know your business 23.3% to 60.0%); against the baseline it scored 60% vs 39% on know your business and 62% vs 34% on video annotation, and it did not win everywhere (dangerous goods 87 vs 92, warehouse 50 vs 52). [[library/raw/2026-11-17-agent-architecture-cost-success-tradeoffs-arxiv-2611-12953#^e6]] [[library/raw/2026-11-17-agent-architecture-cost-success-tradeoffs-arxiv-2611-12953#^e7]]
- **What v2 fixed.** Orch-v1 lost to the baseline on 9 of 13 SOPs (6 significant) because each worker saw only its slice of the SOP and could not resolve a missing input, so the pipeline emitted placeholder decisions. The five v2 changes: full SOP and tools for every worker, a commit-with-basis contract, a synthesizer that may resolve gaps, one re-dispatch round, output validation. The authors read the result "not as multi-agent beats single-agent but as implementation quality mattering more than the single- versus multi-agent choice." The HTML garbled the loss counts as "99 of 1313" and "66"; the researcher read them as 9 of 13 and 6. [[library/raw/2026-11-17-agent-architecture-cost-success-tradeoffs-arxiv-2611-12953#^e7]]
- **Significance and sample size.** The unit of inference is the SOP (n=13); between-SOP standard errors of 6.3 to 7.8 points overlap across all arms, and "no architecture is statistically separable in aggregate" except Orch-v2. One run per task at temperature 1. Skill-quality gap (+13.3 points) not significant by sign test; swarm-full vs swarm-descriptive sign test p=1.00 at 42% more tokens. [[library/raw/2026-11-17-agent-architecture-cost-success-tradeoffs-arxiv-2611-12953#^e8]]
- **Other findings.** The baseline is Pareto-optimal on cost ("no arm both cheaper and more accurate"); Orch-v1 and Swarm-none are strictly dominated; arms that edged the baseline paid heavily for insignificant gains (skill-augmented high quality +5.7 points at 3.0x tokens; Swarm-descriptive +3.0 at 1.9x; Swarm-full +3.1 at 2.7x). On simple SOPs architecture is "a wash". [[library/raw/2026-11-17-agent-architecture-cost-success-tradeoffs-arxiv-2611-12953#^e9]]
- **Authors' conclusion, scoped to enterprise SOPs.** "start simple, measure marginal TSR on the target SOPs, repair implementation failures before changing architecture families, and switch only when the additional TSR justifies the additional architecture cost"; and "the single agent is the efficient default". This is the authors' statement, not a library finding. [[library/raw/2026-11-17-agent-architecture-cost-success-tradeoffs-arxiv-2611-12953#^e10]]
- **Stated limits.** One benchmark with synthetic mock tools; one model, with "no claim that the ranking, cost multipliers, or the orchestration v1-to-v2 reversal generalize beyond it"; one implementation per arm; one run per task; the multi-field scoring fix is "unverified for orchestration, whose multi-field cells we therefore treat as provisional", which bears on the v1-to-v2 result; latency is "descriptive because runs occurred at different times and no service-load metadata was logged". [[library/raw/2026-11-17-arxiv-2611-12953-agent-architecture-cost-success#^e10]]
- **Not found in the paper.** Dollar cost, repeated runs, confidence intervals for token and latency multiples, any other model family, any coding results. [[library/raw/2026-11-17-arxiv-2611-12953-agent-architecture-cost-success#^e12]]
- **Unreconciled variant figures.** The researcher's hand-off, not recorded in either raw note, says the paper's Conclusion and Limitations carry a different set (12 shared SOPs, 1.5x to 4.8x tokens, 2.5x to 5.9x latency, Orch-v2 74.4% vs 65.6%, odds ratio 1.78, p=0.008) from the abstract, Sections 1 to 4 and Table 3 (13 SOPs, the figures above), probably a stale draft. This page uses the 13-SOP figures, which match the task brief and the arXiv abstract page, and the 12-SOP variant is unverified in the library; confirm against the PDF, which was not fetched. Both raw notes of this paper, [[library/raw/2026-11-17-arxiv-2611-12953-agent-architecture-cost-success]] and [[library/raw/2026-11-17-agent-architecture-cost-success-tradeoffs-arxiv-2611-12953]], record only the 13-SOP figures.

### SOP-Bench itself (arXiv 2506.08119): a boundary datum

- SOP-Bench v2 evaluates only two single-agent loops, Function-Calling (up to 10 iterations) and ReAct (up to 15 iterations), across 11 models, on 2,411 tasks; a keyword search of the saved v2 text found no multi-agent or orchestrated design, and the v1 abstract names only the same two agents. The absence rests on keyword search, not a full read. [[library/raw/2026-11-17-sop-bench-v2-html#^e5]] [[library/raw/2026-11-17-sop-bench-v2-html#^e8]] [[library/raw/2026-11-17-sop-bench-v1-abstract#^e1]]
- Same-model comparison of the two loops with Claude 4 Opus: ReAct 72% against FC 68% task success, but latency 87.82 s against 66.21 s per task (33% more). No token counts or significance tests were seen. [[library/raw/2026-11-17-sop-bench-v2-html#^e7]] [[library/raw/2026-11-17-sop-bench-v2-html#^e11]]
- Cite the version: v1 (June 2025) reported 1,800+ tasks, 10 domains, FC 27% and ReAct 48%; v2 (Feb 2026) reports 2,000+ tasks, 12 domains, Claude 4 Opus FC 68% and ReAct 72%. The v2 paper counts 12 SOPs in some places and 13 rows in its task table; the 2,411 tasks are the total over 13 rows. [[library/raw/2026-11-17-sop-bench-v2-html#^e2]] [[library/raw/2026-11-17-sop-bench-v2-html#^e12]]
- Authors' limits: the baselines "are not intended to represent optimal architectures", and the SOPs differ in ways "preventing definitive conclusions". [[library/raw/2026-11-17-sop-bench-v2-html#^e13]]

### Google Research: Towards a science of scaling agent systems (non-coding benchmarks)

- **Versions.** The blog (28 Jan 2026) and v1 (9 Dec 2025) describe 180 configurations on four benchmarks (Finance-Agent, BrowseComp-Plus, PlanCraft, Workbench), five architectures and three model families; v3 (8 Apr 2026) adds SWE-bench Verified and Terminal-Bench for 260 configurations (coding results are on [[library/wiki/single-vs-multi-agent-evals-coding]]). The blog was not updated; cite the version with each number. [[library/raw/2026-11-17-google-research-scaling-agent-systems#^e1]] [[library/raw/2026-11-17-scaling-agent-systems-v1-abstract#^e1]]
- **Designs.** Single agent against Independent (parallel, no communication), Centralized (orchestrator), Decentralized (peer debate) and Hybrid. [[library/raw/2026-11-17-google-research-scaling-agent-systems#^e2]]
- **Held fixed.** Within each model, prompts, tools and compute budgets; compute matched by total iterations, not tokens. The model varies across the study (nine models from OpenAI, Google and Anthropic on the original four benchmarks) but each comparison is same-model. [[library/raw/2026-11-17-google-research-scaling-agent-systems#^e3]] [[library/raw/2026-11-17-google-research-scaling-agent-systems#^e4]]
- **Success by task (mean, v3).** Finance-Agent: single 0.349; Centralized +80.8% (0.631), Decentralized +74.5%, Hybrid +73.1% (the blog and v1 say 80.9%). PlanCraft: single 0.568; all four orchestrated designs worse, -39.1% to -70.0%. Workbench: single 0.629; Decentralized +5.6%, Centralized and Hybrid -1.2%. BrowseComp-Plus: single 0.318; Decentralized +9.2%, Centralized +0.2%, Independent about -35%. Across all six benchmarks and architectures the mean change is -0.3% (95% interval -58.7% to +77.2%), so no average benefit and very high heterogeneity. [[library/raw/2026-11-17-google-research-scaling-agent-systems#^e5]] [[library/raw/2026-11-17-google-research-scaling-agent-systems#^e17]]
- **Tokens.** Overhead against the single agent: Independent 58%, Decentralized 263%, Centralized 285%, Hybrid 515%, "1.6-6.2x token budgets relative to single-agent at matched performance"; coordination efficiency (success per relative turn count) 0.466 for the single agent against 0.074 for Hybrid. [[library/raw/2026-11-17-google-research-scaling-agent-systems#^e8]]
- **Latency.** Not reported per design in the sections read. [[library/raw/2026-11-17-google-research-scaling-agent-systems#^e9]]
- **Scaling claims.** Tasks where the single agent already exceeds about 45% accuracy see negative returns from added agents (v3 beta=-0.236, p=0.004; v1 beta=-0.408, p<0.001; the effect size changed between versions). The predictive model's cross-validated R-squared fell from 0.513 on four benchmarks (blog and v1) to 0.373, or 0.413 with a task-grounded index, on six (v3); 87% correct architecture selection is reported in all versions. [[library/raw/2026-11-17-google-research-scaling-agent-systems#^e12]] [[library/raw/2026-11-17-google-research-scaling-agent-systems#^e13]]
- **Error amplification.** The blog and v1 give 17.2x for Independent against 4.4x for Centralized; these are trace-level factors, the task-level factor is about 1.1 to 1.3, and the v3 regression finds the error-amplification term not significant (p=0.658), saying efficiency and overhead explain the gaps better. That weakens the blog's framing of architecture as a safety feature. [[library/raw/2026-11-17-google-research-scaling-agent-systems#^e10]] [[library/raw/2026-11-17-google-research-scaling-agent-systems#^e11]]
- **Model family.** On Finance-Agent, Centralized gains over single were +127.5% (Anthropic), +164.3% (Google) and +69.9% (OpenAI); on PlanCraft every family degraded; "No vendor achieves universal multi-agent dominance". [[library/raw/2026-11-17-google-research-scaling-agent-systems#^e16]]
- **Stated limits.** Identical prompts, not tuned per model or architecture; teams up to nine agents explored only preliminarily; regression clustered at six datasets, so several effects are descriptive patterns. The authors of a blog and paper are the same group; no replication. [[library/raw/2026-11-17-google-research-scaling-agent-systems#^e15]]

### Tran and Kiela: equal thinking-token budgets (arXiv 2604.02460v2)

- **Task set.** FRAMES and the 4-hop subset of MuSiQue, text-only multi-hop question answering graded by an LLM judge with one rubric. Number of questions per dataset not found in the text read. [[library/raw/2026-11-17-single-agent-vs-multi-agent-equal-thinking-budgets#^e1]] [[library/raw/2026-11-17-single-agent-vs-multi-agent-equal-thinking-budgets#^e5]]
- **Designs and fixed factors.** One agent (and a variant with a pre-answer scaffold) against five multi-agent designs (Sequential, Subtask-parallel, Parallel-roles, Debate, Ensemble), on four models (Qwen3-30B-A3B, DeepSeek-R1-Distill-Llama-70B, Gemini-2.5-Flash, Gemini-2.5-Pro). Model and a global thinking-token budget are fixed; no tools. [[library/raw/2026-11-17-single-agent-vs-multi-agent-equal-thinking-budgets#^e1]]
- **Success.** The single agent is best or statistically indistinguishable from best at every budget except the 100-token one; Debate is the strongest multi-agent design; on Gemini-2.5-Pro FRAMES at the 5,000 and 10,000-token budgets, Ensemble attained the best accuracy. The authors: "SAS is the strongest default architecture for multi-hop reasoning" under matched budgets. [[library/raw/2026-11-17-single-agent-vs-multi-agent-equal-thinking-budgets#^e2]]
- **Tokens and latency.** The single agent "consumes much less thinking token than any MAS variants"; exact multiples are in an appendix that was not read. Latency not reported. [[library/raw/2026-11-17-single-agent-vs-multi-agent-equal-thinking-budgets#^e3]] [[library/raw/2026-11-17-single-agent-vs-multi-agent-equal-thinking-budgets#^e4]]
- **Significance.** 95% bootstrap intervals; the table marks every system whose interval overlaps the best. [[library/raw/2026-11-17-single-agent-vs-multi-agent-equal-thinking-budgets#^e5]]
- **Boundary.** Under heavy context corruption (alpha 0.7, Qwen3-30B-A3B, MuSiQue, 1,000-token budget) Sequential multi-agent beats the single agent; "Our claim is not that SAS always dominates in every regime". [[library/raw/2026-11-17-single-agent-vs-multi-agent-equal-thinking-budgets#^e6]]
- **Stated limits.** Text-only multi-hop reasoning; "MAS advantages with tools/vision or safety constraints are out of scope"; Gemini thinking-token accounting is approximate and API budget-control artifacts could favour either arm. [[library/raw/2026-11-17-single-agent-vs-multi-agent-equal-thinking-budgets#^e7]]

### ArcticSwarm: deferring early consensus (arXiv 2609.01870v2)

- **Task set.** All 830 BrowseComp-Plus questions with a fixed retrieval corpus, three executions each; single-agent rows use 20 and 40 runs. A live-web BrowseComp extension with GPT-5 was run once per configuration and is not a matched single-agent comparison. [[library/raw/2026-11-17-arcticswarm-deferring-early-consensus-arxiv-2609-01870v2#^e1]] [[library/raw/2026-11-17-arcticswarm-deferring-early-consensus-arxiv-2609-01870v2#^e8]]
- **Designs.** ArcticSwarm (orchestrator with up to 16 subagents and two gates; the authors' own system), a single agent, majority vote over single-agent runs at the swarm's token budget, MiroFlow multi-agent and single agent, Duo (leader plus auditor) and Direct Messaging, all on Qwen 3.5-27B. [[library/raw/2026-11-17-arcticswarm-deferring-early-consensus-arxiv-2609-01870v2#^e2]]
- **Held fixed.** Model, corpus, tool endpoints, timeout (20,000 s per question) and turn limits for the architecture rows. [[library/raw/2026-11-17-arcticswarm-deferring-early-consensus-arxiv-2609-01870v2#^e3]]
- **Success.** ArcticSwarm 82.6% (+/-0.5); MiroFlow multi-agent 70.6%; MiroFlow single agent 54.1%; ArcticSwarm single agent 48.4%; Majority@20 62.5%; Majority@36 (MiroFlow) 63.2%; Duo 66.1%; Direct Messaging 61.9%. [[library/raw/2026-11-17-arcticswarm-deferring-early-consensus-arxiv-2609-01870v2#^e4]]
- **Tokens and latency.** Relative to ArcticSwarm at 24.86M tokens per case: single agent 0.05x (about 1.25M, so ArcticSwarm used about 20x the single agent's tokens, the note's reading), Duo 0.31x, Direct Messaging 1.14x. Median latency per case: ArcticSwarm 104.4 min, Direct Messaging 38.9, Duo 10.0; single-agent latency is not in the table read. [[library/raw/2026-11-17-arcticswarm-deferring-early-consensus-arxiv-2609-01870v2#^e5]] [[library/raw/2026-11-17-arcticswarm-deferring-early-consensus-arxiv-2609-01870v2#^e6]]
- **Significance.** 95% question-bootstrap intervals and Holm-adjusted paired tests within the ArcticSwarm family; as read, the single-agent rows are not marked significant, and the paired tests for them were not verified. [[library/raw/2026-11-17-arcticswarm-deferring-early-consensus-arxiv-2609-01870v2#^e7]]
- **Authors' reading and the note's.** "structured coordination, not agent count alone, drives the improvement"; majority voting at equal tokens reached only about 63%. Its own single agent (48.4%) is weaker than MiroFlow's (54.1%), so the 34-point gap over "single agent" depends on which single agent is used; against MiroFlow's multi-agent system the lead is 12.0 points. [[library/raw/2026-11-17-arcticswarm-deferring-early-consensus-arxiv-2609-01870v2#^e9]] [[library/raw/2026-11-17-arcticswarm-deferring-early-consensus-arxiv-2609-01870v2#^e4]]
- **Stated limits.** Tool-harness issues, run-to-run nondeterminism, closed-model live-web runs executed once because of cost; the winner is the authors' own system. [[library/raw/2026-11-17-arcticswarm-deferring-early-consensus-arxiv-2609-01870v2#^e7]]

## Partly uncontrolled and uncontrolled evals

### Rakuten India: multi-agent platform for enterprise analytics (arXiv 2608.18740v1)

- **Task set.** 300 hand-designed test cases in 8 categories (260 analytical, 40 security) on two BigQuery datasets (synthetic e-commerce, 12,500 records; a production competitive-pricing set with Japanese text). [[library/raw/2026-11-17-multi-agent-platform-enterprise-analytics-arxiv-2608-18740#^e1]]
- **Designs and fixed factors.** A five-agent sequential CrewAI crew against one agent that consolidates all responsibilities into one prompt; same model (GPT-4.1) and BigQuery tooling, but the baseline "omit[s] the regex-based input validation layer", and the agent prompts were iteratively refined with no matching tuning reported for the baseline. Author-built system against author-built baseline. [[library/raw/2026-11-17-multi-agent-platform-enterprise-analytics-arxiv-2608-18740#^e2]]
- **Success.** Functional accuracy 286/300 (95.3%) against 218/300 (72.7%); complex analytics 86.7% vs 50.0%; multi-turn 84.0% vs 36.0%; security 100% vs 52.5% (confounded by the omitted validation layer). An LLM judge scored quality 4.52 vs 3.76 of 5 and hallucination-free responses 93.0% vs 72.8%. [[library/raw/2026-11-17-multi-agent-platform-enterprise-analytics-arxiv-2608-18740#^e3]] [[library/raw/2026-11-17-multi-agent-platform-enterprise-analytics-arxiv-2608-18740#^e4]]
- **Tokens, cost, latency.** About 30,800 against 10,200 tokens per query (about 3x); about $0.08 against $0.03 per query (2.7x); mean latency 23.8 s against 15.2 s (1.57x slower), 20.1 s with selective parallelism. [[library/raw/2026-11-17-multi-agent-platform-enterprise-analytics-arxiv-2608-18740#^e5]] [[library/raw/2026-11-17-multi-agent-platform-enterprise-analytics-arxiv-2608-18740#^e6]]
- **Ablation and judge.** Removing the Data Analysis agent drops quality from 4.52 to 3.38; the judge correlates r=0.89 with three human experts on 100 responses, which validates the judge, not the comparison. The "architecture beats model" claim compares a Llama 3.1 70B multi-agent run (79.7%) with the GPT-4.1 single agent (72.7%). [[library/raw/2026-11-17-multi-agent-platform-enterprise-analytics-arxiv-2608-18740#^e7]] [[library/raw/2026-11-17-multi-agent-platform-enterprise-analytics-arxiv-2608-18740#^e8]] [[library/raw/2026-11-17-multi-agent-platform-enterprise-analytics-arxiv-2608-18740#^e9]]
- **Significance and limits.** No significance test was seen in the sections read; one run per case as far as read. Authors' limits: one production domain, human review of 100 of 260 responses, four LLMs, sequential design adds latency. The gap mixes architecture, validation and prompt effort. [[library/raw/2026-11-17-multi-agent-platform-enterprise-analytics-arxiv-2608-18740#^e2]]

### Anthropic Engineering: how we built our multi-agent research system (2025-06-13)

- **Result.** A multi-agent system with Claude Opus 4 as lead and Claude Sonnet 4 subagents outperformed single-agent Claude Opus 4 by 90.2% on an internal research eval. [[library/raw/2026-11-17-anthropic-multi-agent-research-system#^e1]]
- **Controlled?** No. The arms differ in model mix; the post says prompts, tool descriptions and scaling rules were tuned for the multi-agent system; no per-arm parity, sample size, variance, significance or absolute scores are given; the only stated size is a starting set of about 20 queries; grading is one LLM-judge call with a rubric plus human testing. "Outperformed by 90.2%" is not defined. [[library/raw/2026-11-17-anthropic-multi-agent-research-system#^e2]] [[library/raw/2026-11-17-anthropic-multi-agent-research-system#^e4]] [[library/raw/2026-11-17-anthropic-multi-agent-research-system#^e9]]
- **Tokens.** Agents use about 4x the tokens of chat and multi-agent systems about 15x those of chat. The baseline is chat, so the post gives no multi-agent to single-agent multiple (15/4 = 3.75 is the library's arithmetic, not the post's figure). [[library/raw/2026-11-17-anthropic-multi-agent-research-system#^e5]]
- **What drove performance.** On BrowseComp, three factors explained 95% of variance and token usage alone 80%; the post concludes multi-agent systems work "mainly because they help spend enough tokens to solve the problem". Sample size and method are not given. [[library/raw/2026-11-17-anthropic-multi-agent-research-system#^e6]]
- **Latency.** Parallelization "cut research time by up to 90% for complex queries" against the team's own earlier sequential versions, not a separate single-agent arm. [[library/raw/2026-11-17-anthropic-multi-agent-research-system#^e7]]
- **Stated limits.** Breadth-first work benefits most; poor fit where agents share context or have many dependencies; early agents spawned 50 subagents for simple queries; synchronous execution creates bottlenecks; errors compound. [[library/raw/2026-11-17-anthropic-multi-agent-research-system#^e8]]

### Anthropic docs: the orchestrator-strategy conclusion

- The Claude Platform docs page "Optimizing for cost and intelligence" concludes that delegation came out ahead in only two situations: routine work with a long cost tail, and work larger than one context window. The measured cases were BrowseComp, DeepWideSearch and an internal defect-search benchmark. Quoted: "When the work is one dependent chain, or fits in a single context without a long cost tail, the orchestrator's model alone at lower effort came out ahead in every case measured on earlier models". Vendor-run, self-reported, internal benchmarks; the per-case scores were not recorded in the library note, so this is a stated conclusion, not data. [[library/raw/2026-11-17-optimizing-for-cost-and-intelligence#^e5]]

### Squad: MARBLE cost per task

- Squad's README reports cost per task on MARBLE, a benchmark mixing research, bargaining, database and coding tasks: Full Squad $0.97, coordination-only $0.41, No-Squad $0.68. Accuracy for these arms was not recorded, the arms are tool-author-run, and the mix of task types means it does not isolate a domain. [[library/raw/2026-11-17-squad-marble-benchmark-readme#^e5]]

## Where the evals agree

- **Coordination costs tokens, and usually time.** Where a coordinated arm's cost is reported against a single agent, it is higher in every case but one: 1.4x to 4.7x tokens and 2.6x to 5.8x latency (Amazon and UW), 1.6x to 6.2x tokens (Google), about 3x tokens and 1.57x latency (Rakuten), about 20x tokens (ArcticSwarm), much more thinking tokens (Tran and Kiela). The exception is Squad's coordination-only arm on MARBLE, at $0.41 per task against No-Squad's $0.68. [[library/raw/2026-11-17-squad-marble-benchmark-readme#^e5]] [[library/raw/2026-11-17-agent-architecture-cost-success-tradeoffs-arxiv-2611-12953#^e5]] [[library/raw/2026-11-17-google-research-scaling-agent-systems#^e8]] [[library/raw/2026-11-17-multi-agent-platform-enterprise-analytics-arxiv-2608-18740#^e5]] [[library/raw/2026-11-17-arcticswarm-deferring-early-consensus-arxiv-2609-01870v2#^e5]] [[library/raw/2026-11-17-single-agent-vs-multi-agent-equal-thinking-budgets#^e3]]
- **No design wins everywhere.** Amazon and UW find a single significant winner among seven alternatives; Google's mean change is -0.3% with huge spread and "No vendor achieves universal multi-agent dominance"; Tran and Kiela find a regime where multi-agent wins; Orch-v2 lost on some SOPs. [[library/raw/2026-11-17-agent-architecture-cost-success-tradeoffs-arxiv-2611-12953#^e6]] [[library/raw/2026-11-17-google-research-scaling-agent-systems#^e17]] [[library/raw/2026-11-17-single-agent-vs-multi-agent-equal-thinking-budgets#^e6]]
- **Implementation and design details matter as much as agent count.** Amazon and UW (v1 to v2), ArcticSwarm ("structured coordination, not agent count alone"), and Google (prompts untuned per architecture) all stress design specifics. [[library/raw/2026-11-17-agent-architecture-cost-success-tradeoffs-arxiv-2611-12953#^e7]] [[library/raw/2026-11-17-arcticswarm-deferring-early-consensus-arxiv-2609-01870v2#^e9]] [[library/raw/2026-11-17-google-research-scaling-agent-systems#^e15]]
- **Gains concentrate where work decomposes or the baseline is weak.** Finance-Agent gains under every reported design and planning (PlanCraft) loses under all four, while BrowseComp-Plus depends on the design (Decentralized +9.2%, Centralized +0.2%, Independent about -35%); Anthropic names breadth-first research as the fit and dependent chains as the poor fit; Google reports negative returns above about 45% single-agent accuracy. [[library/raw/2026-11-17-google-research-scaling-agent-systems#^e5]] [[library/raw/2026-11-17-anthropic-multi-agent-research-system#^e8]] [[library/raw/2026-11-17-google-research-scaling-agent-systems#^e13]]
- **Evidence is limited and generalization is disclaimed.** Single benchmarks, one model, mock tools or author-built systems; the authors of Amazon and UW, Tran and Kiela and Google each state limits on generalizing. [[library/raw/2026-11-17-arxiv-2611-12953-agent-architecture-cost-success#^e10]] [[library/raw/2026-11-17-single-agent-vs-multi-agent-equal-thinking-budgets#^e7]] [[library/raw/2026-11-17-google-research-scaling-agent-systems#^e15]]

## Where the evals disagree

- **Does multi-agent beat one agent on research and enterprise tasks at all.** Tran and Kiela (equal compute, no tools) find one agent matches or beats five designs; Rakuten (95.3% vs 72.7%, about 3x tokens) and ArcticSwarm (82.6% vs 48.4%, about 20x tokens) find large multi-agent gains. The compute is not matched in the latter two, the baselines have confounds (omitted validation layer; a single agent weaker than a rival's). Tran and Kiela's own boundary case (multi-agent winning under heavy context corruption) shows their result is regime-specific. Whether the Rakuten and ArcticSwarm gains come from design or from extra compute is not settled by these sources. [[library/raw/2026-11-17-single-agent-vs-multi-agent-equal-thinking-budgets#^e2]] [[library/raw/2026-11-17-multi-agent-platform-enterprise-analytics-arxiv-2608-18740#^e3]] [[library/raw/2026-11-17-arcticswarm-deferring-early-consensus-arxiv-2609-01870v2#^e4]]
- **Design or budget.** ArcticSwarm: majority voting at equal tokens reached about 63%, so the swarm's 82.6% is not just tokens. Anthropic: token usage alone explained 80% of BrowseComp variance and multi-agent systems "help spend enough tokens". Both are read from different setups. [[library/raw/2026-11-17-arcticswarm-deferring-early-consensus-arxiv-2609-01870v2#^e9]] [[library/raw/2026-11-17-anthropic-multi-agent-research-system#^e6]]
- **BrowseComp-style research.** Google's v3 means show Centralized +0.2% and Decentralized +9.2% over a single agent across nine models; ArcticSwarm shows +34 points on one 27B model with an author-built swarm. Models, harnesses and designs differ. [[library/raw/2026-11-17-google-research-scaling-agent-systems#^e5]] [[library/raw/2026-11-17-arcticswarm-deferring-early-consensus-arxiv-2609-01870v2#^e4]]
- **Efficient default vs paid-for gain.** The Amazon and UW paper calls the single agent "the efficient default", yet its only significant winner buys +8.2 points at the top of the cost range (4.7x tokens, 3.1x latency). Its "no architecture is statistically separable in aggregate" rests on the per-SOP sign test, under which no arm separates from the baseline; Orch-v2's significance comes from a paired random-effects test over per-SOP log-odds. [[library/raw/2026-11-17-agent-architecture-cost-success-tradeoffs-arxiv-2611-12953#^e10]] [[library/raw/2026-11-17-agent-architecture-cost-success-tradeoffs-arxiv-2611-12953#^e6]] [[library/raw/2026-11-17-agent-architecture-cost-success-tradeoffs-arxiv-2611-12953#^e8]]
- **Pace of change with model capability.** The researcher's hand-off (not recorded in the raw notes) says the Google blog concludes smarter models accelerate the need for multi-agent systems, while the paper's own capability-saturation finding says single-agent baselines above about 45% see negative returns, and the blog does not mention the coding benchmarks, where every orchestrated design was slightly worse on SWE-bench Verified. The paper's held-out check also finds its equation over-predicts single-agent performance on newer models. [[library/raw/2026-11-17-google-research-scaling-agent-systems#^e13]] [[library/raw/2026-11-17-google-research-scaling-agent-systems#^e14]]
- **Versions and internal inconsistencies.** Google: 180 vs 260 configurations, R-squared 0.513 vs 0.373, capability-ceiling beta -0.408 vs -0.236; Amazon and UW: 13-SOP vs 12-SOP variant figures (see above, unverified in the library); SOP-Bench: v1 vs v2 results and 12 vs 13 SOPs. Each number needs its version. [[library/raw/2026-11-17-scaling-agent-systems-v1-abstract#^e4]] [[library/raw/2026-11-17-sop-bench-v2-html#^e12]]

## Open questions

> [!question]
> - Whether the Amazon and UW 12-SOP variant figures in the Conclusion and Limitations exist as the researcher reported; the PDF was not fetched.
> - Whether released traces or code exist for arXiv 2611.12953; no link was found in the HTML, so the numbers could not be checked.
> - Whether the amazon-science/sop-bench repository gained multi-agent baselines after the SOP-Bench paper; not checked.
> - Whether Vals AI or other benchmark sites publish a non-coding single-vs-multi-agent comparison; none was found (per the researcher's hand-off, Vals' finance benchmark compares models under one harness; not recorded in a raw note).
> - Per-design latency for Google's study and for Tran and Kiela; Appendix F of the latter was not read.
> 
## Related pages

- [[library/wiki/single-vs-multi-agent-evals-coding]] covers the coding evals, including Google's SWE-bench Verified and Terminal-Bench arms.
- [[library/wiki/slopify-benchmark-tooling-options]] covers tooling for running benchmark comparisons; no eval was run for this page.

## Sources

- [[library/raw/2026-11-17-agent-architecture-cost-success-tradeoffs-arxiv-2611-12953]]
- [[library/raw/2026-11-17-arxiv-2611-12953-agent-architecture-cost-success]]
- [[library/raw/2026-11-17-sop-bench-v2-abstract]]
- [[library/raw/2026-11-17-sop-bench-v2-html]]
- [[library/raw/2026-11-17-sop-bench-v1-abstract]]
- [[library/raw/2026-11-17-google-research-scaling-agent-systems]]
- [[library/raw/2026-11-17-arxiv-2512-08296-scaling-agent-systems]]
- [[library/raw/2026-11-17-towards-a-science-of-scaling-agent-systems-arxiv-v3]]
- [[library/raw/2026-11-17-scaling-agent-systems-v1-abstract]]
- [[library/raw/2026-11-17-single-agent-vs-multi-agent-equal-thinking-budgets]]
- [[library/raw/2026-11-17-multi-agent-platform-enterprise-analytics-arxiv-2608-18740]]
- [[library/raw/2026-11-17-arcticswarm-deferring-early-consensus-arxiv-2609-01870v2]]
- [[library/raw/2026-11-17-anthropic-multi-agent-research-system]]
- [[library/raw/2026-11-17-optimizing-for-cost-and-intelligence]]
- [[library/raw/2026-11-17-squad-marble-benchmark-readme]]
