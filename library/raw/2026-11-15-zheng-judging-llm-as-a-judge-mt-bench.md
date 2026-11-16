---
title: Zheng et al., Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena
type: raw
summary: Zheng et al. (2023) on LLM judge agreement with humans and judge biases, plus five follow-up papers on position, length and self-preference bias and on agent-based judging
tags: [evaluation, llm-as-judge, reliability]
aliases: [MT-Bench, LLM-as-a-Judge]
source: https://arxiv.org/abs/2306.05685
accessed: 2026-11-15
published: 2023-06-09
provider: arXiv (Zheng et al., LMSYS and UC Berkeley; NeurIPS 2023 Datasets and Benchmarks)
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-15
updated: 2026-11-15
---

# Zheng et al., Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena

> [!quote] Source
> **URL**: https://arxiv.org/abs/2306.05685
> **Accessed**: 2026-11-15
> **Method/Context**: Zheng et al., "Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena" (NeurIPS 2023 D&B; published 2023-06-09, v4 2023-12-24). Recorded for SMR-361 (benchmarking the slopify workflows). Table values below are from the v4 HTML. The five papers under "Follow-up sources" were retrieved the same day; where only an abstract was read it is stated.

## Key evidence

- Strong LLM judges approximate human preference on open-ended tasks. GPT-4 agreement with human experts is 85% (non-tie votes, setup S2) versus 81% human-human on MT-bench; 66% versus 63% when ties are included (S1). ^e1
  > [!quote] Quote
  > "The agreement under setup S2 (w/o tie) between GPT-4 and humans reaches 85%, which is even higher than the agreement among humans (81%)" (v4, Table 5)
- Position bias is large and judge-dependent. Swapping answer order, consistency was Claude-v1 23.8%, GPT-3.5 46.2%, GPT-4 65.0% (default prompt); "biased toward first" was 75.0%, 50.0%, 30.0%. The test set was 80 pairs of near-identical GPT-3.5 answers (Table 2, section 3.4). The "rename" prompt (A/B replaced by other names) barely changed GPT-4 (66.2%) but changed Claude-v1 to 56.2%. ^e2
  > [!quote] Quote
  > "A conservative approach is to call a judge twice by swapping the order of two answers and only declare a win when an answer is preferred in both orders. If the results are inconsistent after swapping, we can call it a tie."
  - Mitigation named in the paper: call the judge twice with swapped order and declare a win only if preferred in both orders, else tie; or randomize position at scale.
- Verbosity bias. Under a "repetitive list" attack (23 MT-bench answers padded with rephrased, information-free list items) the judge preferred the padded answer in 91.3% of cases for Claude-v1 and GPT-3.5, and 8.7% for GPT-4 (Table 3). Small sample, 23 answers. ^e3
- Self-enhancement. GPT-4 favored itself with a 10% higher win rate than humans did, Claude-v1 25% higher, and GPT-3.5 did not favor itself (section 3.3). The authors say the data cannot settle the question. ^e4
  > [!quote] Quote
  > "Due to limited data and small differences, our study cannot determine whether the models exhibit a self-enhancement bias."
- Reference answers and chain-of-thought reduce judge errors on tasks with a checkable answer. On 10 math questions with swapped positions (20 judgments), GPT-4 wrongly called an incorrect answer correct 14/20 with the default prompt, 6/20 with CoT, 3/20 with a reference answer (Table 4). Small n (20). ^e5

### Follow-up sources

- Self-preference is linked to self-recognition. Out of the box GPT-4 and Llama 2 distinguish their own output from other LLMs and humans with non-trivial accuracy, and fine-tuning shows a linear correlation between self-recognition and strength of self-preference; human annotators rated the outputs as equal quality. Effect sizes are in the full text, which was not retrieved. Source: Panickssery, Bowman, Feng, "LLM Evaluators Recognize and Favor Their Own Generations" ([arXiv 2404.13076](https://arxiv.org/abs/2404.13076), published 2024-04-15, v1). ^e6
  > [!quote] Quote
  > "we discover a linear correlation between self-recognition capability and the strength of self-preference bias" (abstract)
- Position bias is non-random and depends on judge, candidate and task, and is "strongly affected by the quality gap between solutions" (bias grows when two answers are close in quality) but only weakly by prompt length. Study of 15 LLM judges on MTBench and DevBench (22 tasks, about 40 solution models), over 150,000 evaluation instances; introduces repetition stability, position consistency and preference fairness metrics. DevBench is code-oriented. Abstract only read; no numeric effect sizes retrieved. Source: Shi et al., "Judging the Judges: A Systematic Study of Position Bias in LLM-as-a-Judge" ([arXiv 2406.07791](https://arxiv.org/abs/2406.07791), AACL-IJCNLP 2025; v1 2024-06-12, v9 2025-11-11). ^e7
  > [!quote] Quote
  > "position bias is not due to random chance and varies significantly across judges and tasks" (abstract)
- Length (verbosity) bias can be removed statistically. Fit a GLM predicting the judge's preference from length difference and other features, then predict at zero length difference; this raised the Spearman correlation of AlpacaEval with Chatbot Arena from 0.94 to 0.98 and made the metric robust to verbosity manipulation. Source: Dubois et al., "Length-Controlled AlpacaEval" ([arXiv 2404.04475](https://arxiv.org/abs/2404.04475), COLM 2024; v1 2024-04-06, v2 2025-03-10). ^e8
  > [!quote] Quote
  > "increases the Spearman correlation with LMSYS Chatbot Arena from 0.94 to 0.98"
- Agent-based, requirement-level judging for code-producing agents. DevAI has 55 tasks with 365 hierarchical user requirements; judging each requirement with an agent that inspects the project "dramatically outperforms LLM-as-a-Judge and is as reliable as our human evaluation baseline". This is the closest published design for scoring outputs per rubric item with tool access to the artifact. Abstract only read; alignment numbers not retrieved. Source: Zhuge et al., "Agent-as-a-Judge: Evaluate Agents with Agents" ([arXiv 2410.10934](https://arxiv.org/abs/2410.10934), published 2024-10-14, v2 2024-10-16). ^e9
  > [!quote] Quote
  > "find it dramatically outperforms LLM-as-a-Judge and is as reliable as our human evaluation baseline" (abstract)
- A taxonomy of 12 judge biases exists, with an attack-and-detect framework (CALM) showing biases persist even for advanced models. Abstract only read; per-bias numbers not retrieved. Source: Ye et al., "Justice or Prejudice? Quantifying Biases in LLM-as-a-Judge" ([arXiv 2410.02736](https://arxiv.org/abs/2410.02736), published 2024-10-03). ^e10
  > [!quote] Quote
  > "while advanced models have achieved commendable overall performance, significant biases persist in certain specific tasks" (abstract)

## Limitations

- Zheng et al. is older than 18 months, and its judge models (GPT-4, Claude-v1, GPT-3.5) are obsolete; the bias magnitudes may not transfer to current judges.
- Several results rest on small samples: 80 pairs (position), 23 answers (verbosity), 20 judgments (math grading).
- Panickssery et al. tested GPT-4 and Llama 2, not Claude; it is evidence the self-preference risk is real, not that it applies to Claude.
- Shi et al., Zhuge et al. and Ye et al. were read at abstract level only. Zhuge et al. is the authors' own benchmark with three agents.
- Length-controlled AlpacaEval needs many comparisons to fit the GLM.

## Relevance

- Inference, not source claim: slopify and bare Opus are both Claude outputs, so a Claude judge may recognize and favor its own style (^e6). The two arms are likely near-equal in quality, where position bias is worst (^e7), which supports order-swapped judging (^e2).
- Inference: a small benchmark would more likely report output length per arm next to the score than fit a length-control model (^e3, ^e8).
- Inference: giving a judge a reference or checklist plus deterministic evidence, rather than an open "which is better", is supported by ^e5 and ^e9.
