---
title: A Multi-Agent Platform for Automated Enterprise Analytics and Insight Generation (arXiv 2608.18740v1)
type: raw
summary: Author-built five-agent CrewAI analytics pipeline compared with a single-agent baseline on 300 BigQuery test cases; multi-agent wins on accuracy and quality at about 3x tokens and 1.57x latency, with an arm that differs by more than agent count.
tags: [evaluation, architecture, performance]
aliases: []
source: https://arxiv.org/abs/2608.18740
accessed: 2026-11-17
published: 2026-08-19
provider: arXiv
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-17
updated: 2026-11-17
---

# A Multi-Agent Platform for Automated Enterprise Analytics and Insight Generation (arXiv 2608.18740v1)

> [!quote] Source
> **URL**: https://arxiv.org/abs/2608.18740 (full text: https://arxiv.org/html/2608.18740v1)
> **Accessed**: 2026-11-17
> **Method/Context**: Manoj N M et al. (Rakuten India), ICCCM 2026, v1 published 2026-08-19. Read sections 5.1.3, 5.2.5, 5.3, 5.4 and Tables 6-7 of the full text. Quotations are marked "quote"; everything else is paraphrase or the scribe's inference. Task: conversational business intelligence and enterprise text-to-SQL analytics. The single-agent vs multi-agent comparison is partly uncontrolled and the system is the authors' own (see Limitations).

## Key evidence

- **Task set and designs.** 300 hand-designed test cases across 8 categories (260 analytical, 40 security) on two BigQuery datasets: a synthetic e-commerce dataset (12,500 records) and a production competitive-pricing dataset with Japanese-language content. Multi-agent arm: a five-agent sequential CrewAI crew (Data Retrieval, Data Analysis, Report Aggregation, Follow-up Questions, Chart Configuration). Single-agent arm: one agent that "consolidates all responsibilities into a single prompt". ^e1

- **What was held fixed, and what was not.** Model (GPT-4.1) and BigQuery tooling are the same in both arms. But the baseline also omits the regex-based input validation layer, so the arms differ by more than agent count. "The single-agent baseline employs the same GPT-4.1 model and BigQuery tooling but consolidates all responsibilities into a single prompt, omitting the regex-based input validation layer" (quote). The agent prompts were "developed through iterative refinement" (authors' words); the baseline prompt was not reported as tuned the same way. Source: sec 5.1.3, 5.2.5. ^e2

- **Functional accuracy.** Multi-agent 286/300 = 95.3% vs single-agent 218/300 = 72.7%. "95.3% vs. 72.7%" (quote). By category: complex analytics 86.7% vs 50.0%; multi-turn 84.0% vs 36.0%; security 100% vs 52.5%. The security gap is confounded by the omitted validation layer. Source: sec 5.3, Table 6. ^e3

- **Quality and hallucination.** LLM judge (Claude Sonnet 4.5) quality 4.52 vs 3.76 of 5; hallucination-free responses 93.0% vs 72.8% (multi-agent vs single-agent). Source: sec 5.3, Table 6. ^e4

- **Tokens and cost.** About 30,800 vs 10,200 tokens per query (about 3x); cost about $0.08 vs $0.03 per query (2.7x). "approximately 30,800 tokens per query for the multi-agent pipeline versus 10,200 for the single-agent baseline" (quote). Source: sec 5.3, Table 7. ^e5

- **Latency.** Mean 23.8 s multi-agent vs 15.2 s single-agent (multi-agent 1.57x slower). "The single-agent baseline achieves 36.1% lower latency (15.2s vs. 23.8s)" (quote). Selective parallelism cuts the multi-agent mean to 20.1 s. Source: sec 5.3, Table 7. ^e6

- **Ablation.** Removing the Data Analysis agent drops quality from 4.52 to 3.38; removing the Follow-up and Chart agents changes it by 0.02. Source: sec 5.4. ^e7

- **Validation of the judge.** Human validation by 3 experts on 100 responses gives r=0.89 against the LLM judge. This validates the judge, not the multi-agent vs single-agent comparison. Source: sec 5.2.5. ^e8

- **Cross-model claim.** The paper's "architecture beats model" claim compares a Llama 3.1 70B multi-agent run (79.7%) with the GPT-4.1 single-agent run (72.7%); no cross-model single-agent runs are cited. Source: sec 5.3. ^e9

## Limitations

- Partly uncontrolled: the baseline lacks the input validation layer and its prompt was not reported as tuned like the agent prompts, so the gap mixes architecture, validation and prompt effort (^e2, ^e3).
- Author-built system compared against an author-built baseline.
- No significance test on multi-agent vs single-agent was reported in the text read; sample is 300 cases with one run each as far as the read sections show.
- Authors' stated limits: one production domain, human review of only 100 of 260 responses, four LLMs only, sequential design adds latency.
- Appendices and sections other than those listed under Method/Context were not read.

## Relevance

- A published case where multi-agent beats single-agent on an enterprise analytics task at about 3x tokens and 1.57x latency, with a confound (omitted validation layer) that weakens the security-category gap in particular.
- Evidence for pairing any accuracy claim with the token and latency cost, as the paper reports both.
