---
title: LLM judge bias and rubric scoring
type: wiki
summary: Evidence on position, length, and self-preference bias in LLM judges, and on per-requirement and reference-guided judging, for scoring non-test outputs.
status: contested
confidence: low
tags: [evaluation, llm-as-judge, reliability]
aliases: []
up: "[[library/_meta/index|Library Index]]"
related:
  - "[[library/wiki/benchmarking-workflows-against-a-bare-model]]"
  - "[[library/wiki/eval-integrity-and-task-sets]]"
created: 2026-11-15
updated: 2026-11-15
---

# LLM judge bias and rubric scoring

> [!abstract] Summary
> If arm outputs are documents (specs, research, reviews) rather than test-gradable code, an LLM judge is the likely scorer. The retrievable evidence documents position, length, and self-preference bias, all from the 2023-2024 judge generation and from chat or code settings. Magnitudes for current Claude models are unmeasured here. Rubric design and judge-plus-deterministic-check mixing have only indirect, low-confidence evidence.

## Claims

- Strong judges approximate human preference: GPT-4 agreed with experts 85% (non-tie votes) versus 81% human-human on MT-bench. [[raw/2026-11-15-zheng-judging-llm-as-a-judge-mt-bench#^e1]] This is an aggregate figure, while position tests show per-pair order effects (below).
- Position bias is large and judge-dependent. Swapped-order consistency was 23.8% (Claude-v1), 46.2% (GPT-3.5), 65.0% (GPT-4) on 80 near-identical pairs. [[raw/2026-11-15-zheng-judging-llm-as-a-judge-mt-bench#^e2]]
- Across 15 judges and over 150,000 instances, position bias is non-random, varies by judge and task, and grows when the two answers are close in quality. [[raw/2026-11-15-judging-the-judges-position-bias-llm-judge#^e1]], [[raw/2026-11-15-judging-the-judges-position-bias-llm-judge#^e3]] Two sources agree (Zheng, Shi). Close arms are exactly the case a workflow-versus-bare comparison produces (inference).
- Verbosity bias: under a padding attack the judge preferred the padded answer 91.3% of the time for Claude-v1 and GPT-3.5 and 8.7% for GPT-4 (23 answers, small sample). [[raw/2026-11-15-zheng-judging-llm-as-a-judge-mt-bench#^e3]]
- Length bias can be removed statistically by a GLM fit, which raised AlpacaEval's Spearman correlation with Chatbot Arena from 0.94 to 0.98, but it needs many comparisons; a small benchmark would more likely report output length per arm beside the score (the note's inference). [[raw/2026-11-15-length-controlled-alpacaeval#^e1]], [[raw/2026-11-15-length-controlled-alpacaeval#^e2]] Two sources agree on length bias (Zheng, Dubois).
- Self-preference conflicts across sources. Zheng et al. found GPT-4 +10% and Claude-v1 +25% win rate for itself, GPT-3.5 none, and could not conclude. [[raw/2026-11-15-zheng-judging-llm-as-a-judge-mt-bench#^e4]] Panickssery et al. report a linear link between self-recognition and self-preference in GPT-4 and Llama 2. [[raw/2026-11-15-llm-evaluators-recognize-and-favor-their-own-generations#^e1]] Not reconciled; neither tested current Claude models. Both arms in a bare-Opus comparison would likely be Opus-written, which makes a same-family judge a question to settle (inference).
- A taxonomy of 12 judge biases exists (CALM); abstract only, no per-bias numbers. [[raw/2026-11-15-ye-justice-or-prejudice-llm-judge-biases#^e1]]
- Reference answers and chain-of-thought cut judge errors on checkable tasks: wrong calls 14/20, 6/20, 3/20 for default, CoT, reference (n = 20). [[raw/2026-11-15-zheng-judging-llm-as-a-judge-mt-bench#^e5]]
- Requirement-level judging: DevAI judges 365 requirements across 55 tasks with an agent that inspects the project; the abstract claims it outperforms plain LLM-as-a-Judge. Closest published design to per-rubric-item scoring with artifact access; abstract only. [[raw/2026-11-15-agent-as-a-judge-evaluate-agents-with-agents#^e1]]
- Grader guidance from Anthropic: calibrate LLM graders against human experts, give an "Unknown" way out, and judge each rubric dimension in isolation. [[raw/2026-11-15-anthropic-demystifying-evals-for-ai-agents#^e8]] Grade the outcome, not the path. [[raw/2026-11-15-demystifying-evals-for-ai-agents#^e4]]
- An unvalidated judge can over-credit by a few percent (WebArena, 1.4-5.2%). [[raw/2026-11-15-establishing-best-practices-for-agentic-benchmarks-abc#^e3]]
- Judge inputs can be attacked: agent output interpolated into a judge prompt can steer the verdict. Mitigations: delimit agent content as data, strip instruction-like content, use structured judge output. [[raw/2026-11-15-how-we-broke-top-ai-agent-benchmarks-berkeley-rdi#^e5]]
- Blind pairwise grading against an expert deliverable with task-specific rubrics is how GDPval grades document tasks (one-shot tasks only). [[raw/2026-11-15-openai-gdpval#^e4]], [[raw/2026-11-15-openai-gdpval#^e5]]

## Caveats

> [!warning]
> - Only abstracts were read for Panickssery, Shi, Dubois, Zhuge, and Ye; their effect sizes were not retrieved. Zheng et al. was read from the saved HTML by grep (tables 2-5 and the self-enhancement and swapping passages), not end to end.
> - No source covers rubric design (analytic versus holistic, granularity, scales), a blind pairwise protocol in agent or workflow settings (hiding which arm produced which output), or mixing deterministic checks with a judge. Leads not searched: Anthropic eval guidance, G-Eval, Prometheus.
> - No source scores specs, research, or review documents specifically. Every key source is from 2023-2024 and near or past the 18-month bar.
> - Evidence bar (two independent sources) is met for position bias and length bias only.

## Open questions

> [!question]
> Which judge model, rubric, and order-randomisation would hold up for slopify outputs? Not answered by the evidence gathered.

## Sources

- [[raw/2026-11-15-zheng-judging-llm-as-a-judge-mt-bench]], [[raw/2026-11-15-judging-the-judges-position-bias-llm-judge]], [[raw/2026-11-15-length-controlled-alpacaeval]], [[raw/2026-11-15-llm-evaluators-recognize-and-favor-their-own-generations]], [[raw/2026-11-15-agent-as-a-judge-evaluate-agents-with-agents]], [[raw/2026-11-15-ye-justice-or-prejudice-llm-judge-biases]], [[raw/2026-11-15-openai-gdpval]], [[raw/2026-11-15-anthropic-demystifying-evals-for-ai-agents]], [[raw/2026-11-15-demystifying-evals-for-ai-agents]], [[raw/2026-11-15-establishing-best-practices-for-agentic-benchmarks-abc]], [[raw/2026-11-15-how-we-broke-top-ai-agent-benchmarks-berkeley-rdi]]
