---
title: Library Index
type: moc
summary: Entry point to the agentic-slop research library
tags:
  - index
aliases:
  - Library Index
created: 2026-11-15
updated: 2026-11-16
---

# Library Index

Research behind the agentic-slop Claude Code plugins.

## Wiki Pages

```dataview
TABLE summary, confidence, status, updated
FROM "library/wiki"
WHERE type = "wiki"
SORT updated DESC
```

## Raw Notes

```dataview
TABLE summary, source, accessed
FROM "library/raw"
WHERE type = "raw"
SORT file.name ASC
```

## Plain-Markdown Index

One line per page: `- [[path|title]] — summary (updated YYYY-MM-DD)`.

### Wiki pages

- [[library/wiki/benchmarking-workflows-against-a-bare-model|Benchmarking workflows against a bare model]] — What published evaluation work says about comparing a workflow or scaffold against a bare model, what to hold constant, and where the evidence is thin. (updated 2026-11-15)
- [[library/wiki/eval-cost-run-layout-and-reporting|Eval cost, run layout, and reporting]] — Evidence on cost and usage accounting between arms, how public harnesses name and lay out run results, and what their HTML or log reports show. (updated 2026-11-15)
- [[library/wiki/eval-integrity-and-task-sets|Eval integrity and task sets]] — Evidence on building a small custom task set and on failure modes that corrupt agent evals: contamination, flawed tests, grader leakage, reward hacking, and overfitting. (updated 2026-11-15)
- [[library/wiki/eval-statistics-for-small-agent-comparisons|Eval statistics for small agent comparisons]] — Evidence on task counts, repeats, paired comparison, and reporting statistics when comparing two eval arms on a small task set. (updated 2026-11-15)
- [[library/wiki/llm-judge-bias-and-rubric-scoring|LLM judge bias and rubric scoring]] — Evidence on position, length, and self-preference bias in LLM judges, and on per-requirement and reference-guided judging, for scoring non-test outputs. (updated 2026-11-15)

### Topic maps

- [[library/wiki/topic-evaluation|Evaluation topic map]] — Map of library pages tagged evaluation (36 pages at creation). (updated 2026-11-16)
- [[library/wiki/topic-benchmarking|Benchmarking topic map]] — Map of library pages tagged benchmarking (18 pages at creation). (updated 2026-11-16)
- [[library/wiki/topic-llm-as-judge|LLM as judge topic map]] — Map of library pages tagged llm-as-judge (7 pages at creation). (updated 2026-11-16)
- [[library/wiki/topic-statistics|Statistics topic map]] — Map of library pages tagged statistics (6 pages at creation). (updated 2026-11-16)
- [[library/wiki/topic-reliability|Reliability topic map]] — Map of library pages tagged reliability (23 pages: 5 wiki, 18 raw). (updated 2026-11-16)
- [[library/wiki/topic-operations|Operations topic map]] — Map of library pages tagged operations (7 pages at creation). (updated 2026-11-16)

### Raw notes

- [[library/raw/2026-11-15-agent-as-a-judge-evaluate-agents-with-agents|Agent-as-a-Judge abstract]] — Abstract of Agent-as-a-Judge (arXiv:2410.10934, Zhuge et al.), which judges code-producing agents per requirement on DevAI with an agent that inspects the project. (updated 2026-11-15)
- [[library/raw/2026-11-15-agent-benchmarks-stop-ranking-before-they-run-out-of-tasks|Agent Benchmarks Stop Ranking Before They Run Out of Tasks]] — Preprint on the statistical power of agent benchmarks - SWE-bench Verified's 500 tasks resolve about 6 points, neighbouring agents are not separable, and graded credit beats a higher bar. (updated 2026-11-15)
- [[library/raw/2026-11-15-agent-evaluation-reliability-more-tasks-wont-fix-leaderboard|Agent Evaluation Reliability: More Tasks Won't (Always) Fix An Agent Leaderboard]] — arXiv abstract by Hardy et al. reporting that fixed model-scaffold systems rank far more reliably than underlying models, and that more similar tasks cannot fix scaffold-coverage uncertainty. (updated 2026-11-15)
- [[library/raw/2026-11-15-ai-agents-that-matter-kapoor|AI Agents That Matter (Kapoor et al.)]] — Paper arguing agent evaluations must report accuracy and dollar cost together, and store token counts so cost can be recomputed at current prices (updated 2026-11-15)
- [[library/raw/2026-11-15-anthropic-demystifying-evals-for-ai-agents|Demystifying evals for AI agents (Anthropic Engineering)]] — Anthropic engineering guidance on agent eval design, task count, task quality, saturation, trial isolation, and pass@k versus pass^k. (updated 2026-11-15)
- [[library/raw/2026-11-15-anthropic-infrastructure-noise|Quantifying infrastructure noise in agentic coding evals (Anthropic)]] — Anthropic measures how eval resource configuration shifts agentic coding scores by several points, enough to swamp small differences between arms. (updated 2026-11-15)
- [[library/raw/2026-11-15-anthropic-statistical-approach-to-model-evals|A statistical approach to model evaluations (Anthropic)]] — Anthropic's recommendations for error bars and paired-difference comparison of two eval arms, with clustered standard errors and resampling (updated 2026-11-15)
- [[library/raw/2026-11-15-aws-tokenomics-for-coding-agents|Tokenomics for coding agents (AWS)]] — AWS Cloud Financial Management post on benchmarking coding-agent cost and quality, with a one-lever-at-a-time comparison design and a measured lighter-vs-heavier harness result. (updated 2026-11-15)
- [[library/raw/2026-11-15-claude-agent-sdk-track-cost-and-usage|Track cost and usage (Claude Agent SDK docs)]] — Claude Code Docs page on Agent SDK cost and usage fields, covering cache token fields, subagent exclusion from result usage, double-counting pitfalls, and cost as a client-side estimate. (updated 2026-11-15)
- [[library/raw/2026-11-15-demystifying-evals-for-ai-agents|Demystifying evals for AI agents]] — Anthropic Engineering guidance on agent evals - harness plus model, trial isolation, grader choice, sample size, pass@k, and harness bugs as a confound. (updated 2026-11-15)
- [[library/raw/2026-11-15-establishing-best-practices-for-agentic-benchmarks-abc|Establishing Best Practices for Building Rigorous Agentic Benchmarks (ABC)]] — Paper and checklist (ABC) showing ten popular agent benchmarks have validity flaws that mis-estimate agent performance by up to 100% in relative terms, with mitigations such as trivial-agent baselines and oracle solvers (updated 2026-11-15)
- [[library/raw/2026-11-15-holistic-agent-leaderboard-hal|Holistic Agent Leaderboard (HAL) abstract]] — HAL abstract (arXiv:2510.11977) on a standardized, cost-controlled harness across models, scaffolds, and benchmarks, with log-inspection and reasoning-effort findings. (updated 2026-11-15)
- [[library/raw/2026-11-15-how-we-broke-top-ai-agent-benchmarks-berkeley-rdi|How We Broke Top AI Agent Benchmarks (UC Berkeley RDI)]] — Berkeley RDI exploit agent scores near-perfect on eight agent benchmarks without solving tasks; seven recurring evaluator flaws and adversarial evaluator checks (updated 2026-11-15)
- [[library/raw/2026-11-15-inspect-ai-log-files|Inspect AI Log Files]] — How Inspect AI (UK AISI) names, retains, and structures eval log files, with status, results, and per-sample detail in one log (updated 2026-11-15)
- [[library/raw/2026-11-15-inspect-ai-log-viewer|Inspect AI Log Viewer]] — Inspect AI (UK AISI) log viewer docs - what the viewer shows per log and sample, and how logs are bundled into a static site. (updated 2026-11-15)
- [[library/raw/2026-11-15-judging-the-judges-position-bias-llm-judge|Judging the Judges - Position Bias in LLM-as-a-Judge]] — Shi et al. study of position bias across 15 LLM judges; bias is non-random, varies by judge and task, and grows when two answers are close in quality. (updated 2026-11-15)
- [[library/raw/2026-11-15-length-controlled-alpacaeval|Length-Controlled AlpacaEval (Dubois et al., 2024)]] — Dubois et al. remove LLM-judge length bias with a GLM fit, raising AlpacaEval's Spearman correlation with Chatbot Arena from 0.94 to 0.98. (updated 2026-11-15)
- [[library/raw/2026-11-15-lesswrong-just-a-wrapper-scaffolds-matter|Just a Wrapper? How Much Do Scaffolds Matter?]] — Gundlach et al. (2026) analysis of HAL data finding that scaffold effects are large and model-dependent, with guidance on fixing versus varying the scaffold. (updated 2026-11-15)
- [[library/raw/2026-11-15-llm-evaluators-recognize-and-favor-their-own-generations|LLM Evaluators Recognize and Favor Their Own Generations]] — Panickssery et al. (arXiv:2404.13076) abstract on LLM judges recognizing their own output and preferring it, with a linear link between self-recognition and self-preference. (updated 2026-11-15)
- [[library/raw/2026-11-15-lm-evaluation-harness-evaluation-tracker|lm-evaluation-harness evaluation_tracker.py]] — How EleutherAI's lm-evaluation-harness names and lays out result files and what reproducibility metadata it records in the results JSON (updated 2026-11-15)
- [[library/raw/2026-11-15-lm-evaluation-harness-user-guide|lm-evaluation-harness User Guide (interface.md)]] — How lm-evaluation-harness exposes seeds, config files and a testing-only sample limit on its command line (updated 2026-11-15)
- [[library/raw/2026-11-15-metr-recent-frontier-models-are-reward-hacking|Recent Frontier Models Are Reward Hacking (METR)]] — METR reports that frontier models often raise benchmark scores by tampering with tests or scorers, so an agent under test can corrupt the score it is measured by. (updated 2026-11-15)
- [[library/raw/2026-11-15-miller-adding-error-bars-to-evals|Adding Error Bars to Evals (Miller, arXiv 2411.00640)]] — Statistical treatment of eval scores: variance decomposition, repeats versus tasks, paired comparison, and a sample-size formula. (updated 2026-11-15)
- [[library/raw/2026-11-15-openai-gdpval|OpenAI GDPval, measuring model performance on real-world tasks]] — OpenAI's description of how GDPval, an expert-written set of document-producing tasks, was built and graded (updated 2026-11-15)
- [[library/raw/2026-11-15-openai-why-we-no-longer-evaluate-swe-bench-verified|Why SWE-bench Verified no longer measures frontier coding capabilities (OpenAI)]] — OpenAI's account of contamination and flawed tests in SWE-bench Verified, and why it stopped reporting the benchmark. (updated 2026-11-15)
- [[library/raw/2026-11-15-promptfoo-command-line|promptfoo Command Line]] — How promptfoo identifies, repeats, resumes and retries eval runs, and how its response cache affects repeat independence (updated 2026-11-15)
- [[library/raw/2026-11-15-promptfoo-output-formats|promptfoo Output Formats]] — promptfoo can write a standalone self-contained HTML report or JSON, CSV, YAML, JUnit output that embeds config, prompts, outputs, per-assertion results and cost stats. (updated 2026-11-15)
- [[library/raw/2026-11-15-swe-bench-evaluation-guide|SWE-bench Evaluation Guide]] — How SWE-bench lays out run output, caches results by run_id, separates errors from failures, and pins reproducibility (updated 2026-11-15)
- [[library/raw/2026-11-15-swe-bench-pro|SWE-Bench Pro (arXiv:2509.16941)]] — Contamination-resistant coding benchmark of 1,865 long-horizon tasks split into public, held-out and commercial sets (updated 2026-11-15)
- [[library/raw/2026-11-15-tau-bench-tool-agent-user-interaction|tau-bench: A Benchmark for Tool-Agent-User Interaction in Real-World Domains]] — tau-bench (Yao et al., arXiv 2406.12045) defines pass^k, the all-k-trials-succeed reliability metric with unbiased estimators from n trials, and reports run-to-run inconsistency of a gpt-4o-era agent. (updated 2026-11-15)
- [[library/raw/2026-11-15-ye-justice-or-prejudice-llm-judge-biases|Justice or Prejudice? Quantifying Biases in LLM-as-a-Judge]] — Ye et al. propose a taxonomy of 12 LLM-judge biases and the CALM attack-and-detect framework; abstract-level record only (updated 2026-11-15)
- [[library/raw/2026-11-15-zheng-judging-llm-as-a-judge-mt-bench|Zheng et al., Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena]] — Zheng et al. (2023) on LLM judge agreement with humans and judge biases, plus five follow-up papers on position, length and self-preference bias and on agent-based judging (updated 2026-11-15)
