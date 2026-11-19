---
title: SOP-Bench v2 abstract and paper (arXiv 2506.08119v2)
type: raw
summary: SOP-Bench v2 benchmarks single-agent loops (Function-Calling vs ReAct) on 2,411 SOP tasks; a keyword search of it found no single-agent versus multi-agent comparison.
tags: [evaluation, agent-harness]
aliases: [SOP-Bench]
source: https://arxiv.org/abs/2506.08119v2
accessed: 2026-11-17
published: 2026-02-23
provider: arXiv
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-17
updated: 2026-11-17
---

# SOP-Bench v2 abstract and paper (arXiv 2506.08119v2)

> [!quote] Source
> **URL**: https://arxiv.org/abs/2506.08119v2 (title: SOP-Bench: Complex Industrial SOPs for Evaluating LLM Agents)
> **Accessed**: 2026-11-17
> **Method/Context**: v2 abstract page plus the v2 HTML full text (section and table numbers below are the paper's own). v2 was revised 2026-02-23; v1 appeared 2025-06-09. The v1 abstract (https://arxiv.org/abs/2506.08119v1) was also read; the full v1 text was not. Collected for the question of published evals of single-agent versus multi-agent designs.

## Key evidence

- Scale and origin. SOP-Bench v2 has 2,000+ tasks, 2,411 in total, built from human expert-authored SOPs. The abstract says 12 business domains (healthcare, logistics, finance, content moderation). Sec 3 reads "SOP-Bench consists of 12 diverse SOPs instantiated in 2,411 tasks". Quotation. ^e1
  - Count discrepancy: the abstract says 12 domains and Sec 3 says 12 SOPs, but Table 3 lists 13 rows (Referral Abuse v1 and v2 both appear) totalling 2,411 tasks and 122 tools, and Sec 5.1.1 says "all 13 SOPs".
- Table 3, tasks per SOP (domain). Table data. ^e2
  - Content Flagging (Content Moderation) 226; Customer Service (Support) 208; Dangerous Goods (Supply Chain) 327; Aircraft Inspection (Transportation) 150; Email Intent (Retail Seller Management) 122; Know Your Business (Finance) 122; Patient Intake (Healthcare) 90.
  - Video Annotation (Autonomous Driving) 168 tasks with 26 tools; Video Classification (Media) 198; Warehouse Package Inspection (Logistics) 200; Referral Abuse v1 and v2 (Trust & Safety) 200 each; Traffic Spoofing (Fraud Detection) 200.
  - Averages: 185 tasks, 9 tools, 1,394 SOP tokens.
- Tools are mocked. Sec 4: "each dataset includes precomputed inputs and outputs for every tool call... These mocks replace live APIs". Tasks, SOPs and tools are AI-generated artifacts validated by human experts. Quotation. ^e3
- Only two baseline agents, both single-agent loops. A Function-Calling (FC) agent (native tool calling, up to 10 iterations) and a ReAct agent (Thought/Action/Observation, up to 15 iterations). Authors (Sec 4, Appendix A): "These implementations serve as baseline agents... and are not intended to represent optimal architectures." Quotation. ^e4
- Models. 11 LLMs: Llama-3.3-70B, GPT-OSS-120B, DeepSeek-R1, Claude 3.5 Sonnet v2, 3.7 Sonnet, 4 Sonnet, 4 Opus, 4.1 Opus, Sonnet 4.5, Opus 4.5, plus Haiku 4.5 in the tables. FC was evaluated only with Claude models; ReAct across all. Temperature 0.5 and an 8000-token output cap were held fixed (Sec 4.1, Sec 5.1, Table 6 caption). Quotation and paraphrase. ^e5
- FC versus ReAct with Claude 4 Opus is the controlled comparison (Sec 5.1.1, Tables 4 and 6). Both arms are single agents; the model is held fixed. ^e6
  - ReAct 72% versus FC 68% average TSR (Table 6: 0.724 versus 0.682).
  - Latency per task: ReAct 87.82s +/-10.30s versus FC 66.21s +/-9.57s (ReAct 33% more).
  - ReAct beats FC on only 8 of 13 SOPs.
  - Across all models: FC 65.9% versus ReAct 61.1% average TSR.
- No single-agent versus multi-agent comparison. A keyword search of the saved v2 text for "multi-agent", "multi agent", "orchestrat" and "planner" found only "tool orchestration demands" in the abstract and related-work prose. The only "limitations" hit was a snippet inside a tool-generation prompt. The v1 abstract also names only FC and ReAct agents. Inference from a negative keyword search; the full v1 text was not read. ^e7
- Headline findings (Sec 5.1, Sec 6). Quotation. ^e8
  - "no single model-agent combination dominates"; best TSR per SOP ranges from 57% to 100%.
  - Newer models are not better: the conclusion gives the Claude 4 family 73.8% versus the Claude 4.5 family 58.8% average ReAct TSR. The abstract gives Claude 4 Opus 72.4% versus Claude 4.5 Sonnet 63.3%.
  - Near parity on Dangerous Goods (FC 69.1%, ReAct 69.8%) and Customer Service (FC 47.8%, ReAct 47.7%).
- Ablations (Sec 5.2). Quotation. ^e9
  - Tool-registry bloat on Video Annotation with Claude Sonnet 4.5 ReAct: 26 tools (20 distractors) gave 20.8% TSR versus 37% with 6 tools.
  - Referral Abuse Easy versus Hard: execution time up 51.5% for FC (53.99s to 81.79s) and 34.2% for ReAct (66.45s to 89.16s).
- Metrics (Sec 4.1, Appx B). The paper defines ECR, conditional TSR and TSR but reports only ECR and TSR plus per-task latency in seconds. Per-SOP tables (Appx B, Tables 7+) give TSR and a second numeric column, apparently latency in seconds; the column header was not checked. Latency carries +/- values for the Claude 4 Opus comparison. Token or cost counts and significance tests or confidence intervals on TSR were not seen; that is an inference from keyword search and partial reading. ^e10
- Stated limits (Sec 4.1, Sec 5.2.3). Quotation. ^e11
  - "Our goal is not to rank model capabilities or build optimal agents".
  - The SOPs differ in several dimensions, "preventing definitive conclusions"; future work should add metrics for planning, tool-mapping and tool-calling accuracy.
  - Version caveat: v1 (2025-06) reported 1,800+ tasks across 10 domains with FC 27% and ReAct 48% average success. v2 (2026-02) reports 2,000+ tasks, 12 domains, newer Claude models and different numbers.

## Limitations

- Both agent arms are single-agent loops, so this source cannot support any claim about single-agent versus multi-agent or orchestrated designs. The absence finding (^e7) rests on a keyword search, not a full read.
- FC covers Claude models only; the FC versus ReAct comparison with the model held fixed is therefore limited to that family, and the Claude 4 Opus pair is the controlled case.
- Tools are mocked and tasks, SOPs and tools are AI-generated and then expert-validated, so results measure SOP-following against simulated tools.
- The 12-versus-13 SOP count is inconsistent within the paper (see ^e1).
- No token or cost data, and no significance tests, were found (inference; see ^e10). The column header for Appx B's second numeric column was not checked.
- v1 and v2 numbers differ substantially (^e11); cite the version.

## Relevance

- Evidence that a published agent benchmark compares agent loop designs (FC versus ReAct) with the model held fixed, and reports latency alongside success. It gives no data on multi-agent designs, so it is a negative or boundary datum for the single-agent versus multi-agent question.
- The tool-registry bloat ablation (^e9) is relevant to tool-count effects on a single agent.
