---
title: Evaluation topic map
type: moc
summary: Map of library pages tagged evaluation (36 pages at creation).
tags: [evaluation]
aliases: []
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-16
updated: 2026-11-16
---

# Evaluation topic map

> [!abstract] Map of content
> How to evaluate agents and workflows: harnesses, graders, task sets, and reporting. Lists every page tagged `evaluation`; the tag crossed five pages, so librarian.md requires this map.

## Wiki pages

```dataview
TABLE confidence, updated
FROM "library/wiki"
WHERE type = "wiki" AND contains(tags, "evaluation")
SORT updated DESC
```

- [[library/wiki/benchmarking-workflows-against-a-bare-model|Benchmarking workflows against a bare model]]
- [[library/wiki/eval-cost-run-layout-and-reporting|Eval cost, run layout, and reporting]]
- [[library/wiki/eval-integrity-and-task-sets|Eval integrity and task sets]]
- [[library/wiki/eval-statistics-for-small-agent-comparisons|Eval statistics for small agent comparisons]]
- [[library/wiki/llm-judge-bias-and-rubric-scoring|LLM judge bias and rubric scoring]]

## Raw notes

```dataview
TABLE source, accessed
FROM "library/raw"
WHERE type = "raw" AND contains(tags, "evaluation")
SORT file.name ASC
```

- [[library/raw/2026-11-15-agent-as-a-judge-evaluate-agents-with-agents|Agent-as-a-Judge abstract]]
- [[library/raw/2026-11-15-agent-benchmarks-stop-ranking-before-they-run-out-of-tasks|Agent Benchmarks Stop Ranking Before They Run Out of Tasks]]
- [[library/raw/2026-11-15-agent-evaluation-reliability-more-tasks-wont-fix-leaderboard|Agent Evaluation Reliability: More Tasks Won't (Always) Fix An Agent Leaderboard]]
- [[library/raw/2026-11-15-ai-agents-that-matter-kapoor|AI Agents That Matter (Kapoor et al.)]]
- [[library/raw/2026-11-15-anthropic-demystifying-evals-for-ai-agents|Demystifying evals for AI agents (Anthropic Engineering)]]
- [[library/raw/2026-11-15-anthropic-infrastructure-noise|Quantifying infrastructure noise in agentic coding evals (Anthropic)]]
- [[library/raw/2026-11-15-anthropic-statistical-approach-to-model-evals|A statistical approach to model evaluations (Anthropic)]]
- [[library/raw/2026-11-15-aws-tokenomics-for-coding-agents|Tokenomics for coding agents (AWS)]]
- [[library/raw/2026-11-15-demystifying-evals-for-ai-agents|Demystifying evals for AI agents]]
- [[library/raw/2026-11-15-establishing-best-practices-for-agentic-benchmarks-abc|Establishing Best Practices for Building Rigorous Agentic Benchmarks (ABC)]]
- [[library/raw/2026-11-15-holistic-agent-leaderboard-hal|Holistic Agent Leaderboard (HAL) abstract]]
- [[library/raw/2026-11-15-how-we-broke-top-ai-agent-benchmarks-berkeley-rdi|How We Broke Top AI Agent Benchmarks (UC Berkeley RDI)]]
- [[library/raw/2026-11-15-inspect-ai-log-files|Inspect AI Log Files]]
- [[library/raw/2026-11-15-inspect-ai-log-viewer|Inspect AI Log Viewer]]
- [[library/raw/2026-11-15-judging-the-judges-position-bias-llm-judge|Judging the Judges - Position Bias in LLM-as-a-Judge]]
- [[library/raw/2026-11-15-length-controlled-alpacaeval|Length-Controlled AlpacaEval (Dubois et al., 2024)]]
- [[library/raw/2026-11-15-lesswrong-just-a-wrapper-scaffolds-matter|Just a Wrapper? How Much Do Scaffolds Matter?]]
- [[library/raw/2026-11-15-llm-evaluators-recognize-and-favor-their-own-generations|LLM Evaluators Recognize and Favor Their Own Generations]]
- [[library/raw/2026-11-15-lm-evaluation-harness-evaluation-tracker|lm-evaluation-harness evaluation_tracker.py]]
- [[library/raw/2026-11-15-lm-evaluation-harness-user-guide|lm-evaluation-harness User Guide (interface.md)]]
- [[library/raw/2026-11-15-metr-recent-frontier-models-are-reward-hacking|Recent Frontier Models Are Reward Hacking (METR)]]
- [[library/raw/2026-11-15-miller-adding-error-bars-to-evals|Adding Error Bars to Evals (Miller, arXiv 2411.00640)]]
- [[library/raw/2026-11-15-openai-gdpval|OpenAI GDPval, measuring model performance on real-world tasks]]
- [[library/raw/2026-11-15-openai-why-we-no-longer-evaluate-swe-bench-verified|Why SWE-bench Verified no longer measures frontier coding capabilities (OpenAI)]]
- [[library/raw/2026-11-15-promptfoo-command-line|promptfoo Command Line]]
- [[library/raw/2026-11-15-promptfoo-output-formats|promptfoo Output Formats]]
- [[library/raw/2026-11-15-swe-bench-evaluation-guide|SWE-bench Evaluation Guide]]
- [[library/raw/2026-11-15-swe-bench-pro|SWE-Bench Pro (arXiv:2509.16941)]]
- [[library/raw/2026-11-15-tau-bench-tool-agent-user-interaction|tau-bench: A Benchmark for Tool-Agent-User Interaction in Real-World Domains]]
- [[library/raw/2026-11-15-ye-justice-or-prejudice-llm-judge-biases|Justice or Prejudice? Quantifying Biases in LLM-as-a-Judge]]
- [[library/raw/2026-11-15-zheng-judging-llm-as-a-judge-mt-bench|Zheng et al., Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena]]
