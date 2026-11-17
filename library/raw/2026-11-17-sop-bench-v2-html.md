---
title: SOP-Bench v2 HTML full text
type: raw
summary: SOP-Bench v2 benchmarks single-agent FC and ReAct loops on 2,411 SOP tasks; it has no single-agent versus multi-agent comparison.
tags: [evaluation, agent-harness]
aliases: [SOP-Bench, arXiv 2506.08119v2]
source: https://arxiv.org/html/2506.08119v2
accessed: 2026-11-17
published: 2026-02-23
provider: arXiv (SOP-Bench authors)
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-17
updated: 2026-11-17
---

# SOP-Bench v2 HTML full text

> [!quote] Source
> **URL**: https://arxiv.org/html/2506.08119v2
> **Accessed**: 2026-11-17
> **Method/Context**: Gathered for SMR-376 (published evals of single-agent versus multi-agent designs). Findings were reported by a researcher from the v2 HTML full text (v2 revised 2026-02-23; v1 submitted 2025-06-09). Each bullet is marked as quotation, paraphrase, or inference. Where a bullet cites a section or table, it comes from the HTML text; the v1 abstract (https://arxiv.org/abs/2506.08119v1) was also read.

## Key evidence

- Scale: the benchmark has 2,000+ tasks from human expert-authored SOPs. The abstract says 12 business domains (healthcare, logistics, finance, content moderation); Sec 3 says "SOP-Bench consists of 12 diverse SOPs instantiated in 2,411 tasks". (quotation, abstract and Sec 3) ^e1
- Count discrepancy: the abstract says 12 domains and Sec 3 says 12 SOPs, but Table 3 lists 13 rows (Referral Abuse v1 and v2 both appear) totalling 2,411 tasks and 122 tools, and Sec 5.1.1 says "all 13 SOPs". (inference from comparing the text with the table) ^e2
- Table 3, tasks per SOP: Content Flagging (Content Moderation) 226; Customer Service (Support) 208; Dangerous Goods (Supply Chain) 327; Aircraft Inspection (Transportation) 150; Email Intent (Retail Seller Mgmt) 122; Know Your Business (Finance) 122; Patient Intake (Healthcare) 90; Video Annotation (Autonomous Driving) 168, with 26 tools; Video Classification (Media) 198; Warehouse Package Inspection (Logistics) 200; Referral Abuse v1 and v2 (Trust & Safety) 200 each; Traffic Spoofing (Fraud Detection) 200. Averages: 185 tasks, 9 tools, 1,394 SOP tokens. (quotation, Table 3) ^e3
- Mocked tools: "each dataset includes precomputed inputs and outputs for every tool call... These mocks replace live APIs". Tasks, SOPs and tools are AI-generated artifacts validated by human experts. (quotation, Sec 4) ^e4
- Agents: only two single-agent loops were evaluated, a Function-Calling (FC) agent (native tool calling, up to 10 iterations) and a ReAct agent (Thought/Action/Observation, up to 15 iterations). The authors say: "These implementations serve as baseline agents... and are not intended to represent optimal architectures." (quotation, Sec 4 and Appendix A) ^e5
- Models: 11 LLMs (Llama-3.3-70B, GPT-OSS-120B, DeepSeek-R1, Claude 3.5 Sonnet v2, 3.7 Sonnet, 4 Sonnet, 4 Opus, 4.1 Opus, Sonnet 4.5, Opus 4.5, plus Haiku 4.5 in the tables). FC was evaluated only with Claude models; ReAct across all. Temperature 0.5 and an 8000-token output cap were held fixed. (paraphrase, Sec 4.1, Sec 5.1, Table 6 caption) ^e6
- FC versus ReAct with Claude 4 Opus, the controlled comparison: ReAct 72% versus FC 68% average TSR, but latency 87.82s +/-10.30s versus 66.21s +/-9.57s per task (33% more). ReAct beats FC on only 8 of 13 SOPs. Table 6: Claude 4 Opus ReAct 0.724, FC 0.682. Across all models FC averages 65.9% TSR and ReAct 61.1%. The model is held fixed, but both arms are single agents. (quotation of figures, Sec 5.1.1, Tables 4 and 6) ^e7
- No single-agent versus multi-agent comparison: a keyword search of the saved v2 text for "multi-agent", "multi agent", "orchestrat" and "planner" found only "tool orchestration demands" in the abstract and related-work prose; the only "limitations" hit was a text snippet inside a tool-generation prompt. The v1 abstract also names only FC and ReAct agents. (inference from a negative keyword search; the full v1 text was not read) ^e8
- Headline findings: "no single model-agent combination dominates" (best TSR per SOP ranges from 57% to 100%). Newer models are not better: the Claude 4 family averages 73.8% ReAct TSR versus 58.8% for the Claude 4.5 family (conclusion); the abstract gives Claude 4 Opus 72.4% versus Claude 4.5 Sonnet 63.3%. Dangerous Goods is near parity (FC 69.1%, ReAct 69.8%); Customer Service FC 47.8%, ReAct 47.7%. (quotation, Sec 5.1 and Sec 6) ^e9
- Ablations (Sec 5.2): tool-registry bloat on Video Annotation with Claude Sonnet 4.5 ReAct, where 26 tools (20 distractors) gave 20.8% TSR versus 37% with 6 tools. Referral Abuse Easy versus Hard: execution time rose 51.5% for FC (53.99s to 81.79s) and 34.2% for ReAct (66.45s to 89.16s). (quotation of figures) ^e10
- Metrics: ECR, conditional TSR and TSR are defined; the paper reports only ECR and TSR plus per-task latency in seconds. Per-SOP tables (Appendix B, Tables 7+) give TSR and a second numeric column, apparently latency in seconds (column header not checked). Token or cost counts are not reported in the portions examined, and no significance tests or confidence intervals on TSR were seen; latency has +/- values for the Claude 4 Opus comparison. (Sec 4.1 and Appendix B; the absence claims are inference from keyword search only) ^e11
- Version caveat: v1 (2025-06) reported 1,800+ tasks across 10 domains with FC at 27% and ReAct at 48% average success. v2 (2026-02) reports 2,000+ tasks, 12 domains, newer Claude models, and different numbers. (quotation, v1 and v2 abstracts) ^e12

## Limitations

- The source's own limits: "Our goal is not to rank model capabilities or build optimal agents". It says its SOPs differ in several dimensions, "preventing definitive conclusions", and that future work should add metrics for planning, tool-mapping and tool-calling accuracy. (quotation, Sec 4.1 and Sec 5.2.3) ^e13
- Tools are mocked and the tasks are AI-generated, so results may not transfer to live APIs.
- The abstract/Sec 3/Table 3 count mismatch (^e2) is unresolved.
- The absence claims in ^e8 and ^e11 rest on a keyword search, not a full read.

## Relevance

- For the question of single-agent versus multi-agent designs, this source offers no multi-agent evidence. It compares two single-agent loops (FC and ReAct) with the model held fixed, so it bears only on single-agent loop choice and on latency cost. (inference from ^e5, ^e7 and ^e8)
