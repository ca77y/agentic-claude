---
title: Demystifying evals for AI agents (Anthropic Engineering)
type: raw
summary: Anthropic engineering guidance on agent eval design, task count, task quality, saturation, trial isolation, and pass@k versus pass^k.
tags: [reliability]
aliases: []
source: https://www.anthropic.com/research/demystifying-evals-for-ai-agents
accessed: 2026-11-15
published: 2026-01-09
provider: Anthropic Engineering
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-15
updated: 2026-11-15
---

# Demystifying evals for AI agents (Anthropic Engineering)

> [!quote] Source
> **URL**: https://www.anthropic.com/research/demystifying-evals-for-ai-agents
> **Accessed**: 2026-11-15
> **Method/Context**: Vendor engineering post, retrieved through web-tools for SMR-361 (benchmarking the slopify workflows). Only findings resting on this post are recorded here; findings from other sources belong to their own notes.

## Key evidence

- Small custom set as a starting point: 20-50 simple tasks drawn from real failures. Early on effect sizes are large, so small samples suffice; more mature agents or smaller effects need larger, harder sets. Single primary source for this sizing claim; no second source found for the 20-50 figure. It gives no recommended trial count. ^e1
  > "20-50 simple tasks drawn from real failures is a great start. ... this large effect size means small sample sizes suffice. More mature agents may need larger, more difficult evals to detect smaller effects"

- Representativeness: build tasks from what you already test manually and from bug trackers and support queues, and prioritise by user impact. ^e2
  > "Converting user-reported failures into test cases ensures your suite reflects actual usage; prioritizing by user impact helps you invest effort where it counts."

- Task-quality bar: a good task is one two domain experts would grade the same way; each task ships with a reference solution that passes all graders; everything the grader checks is stated in the task description. A task two experts would not grade alike is too ambiguous. ^e3
  > "A good task is one where two domain experts would independently reach the same pass/fail verdict."
  > "Everything the grader checks should be clear from the task description"

- Too-hard or unsolvable signal: with frontier models, a 0% pass rate across many trials is most often a broken task, not an incapable agent. Examples given: a Terminal-Bench task with an unspecified filepath that tests assumed; Opus 4.5 scoring 42% on CORE-Bench until rigid grading (penalising "96.12" when "96.124991..." was expected), ambiguous specs and irreproducible stochastic tasks were fixed, then 95% with a less constrained scaffold. Mitigations named: read transcripts from many trials, and build a reference solution per task to prove solvability and grader correctness. ^e4
  > "a 0% pass rate across many trials (i.e. 0% pass@100) is most often a signal of a broken task, not an incapable agent"
  > "Opus 4.5 initially scored 42% on CORE-Bench ... After fixing bugs and using a less constrained scaffold, Opus 4.5's score jumped to 95%."

- Too-easy and saturation: an eval at 100% tracks regressions but gives no improvement signal; capability evals should start at a low pass rate, regression evals near 100%. Near ceiling, large capability gains appear as small score increases. Class-imbalanced task sets drive one-sided optimisation. ^e5
  > "Capability or 'quality' evals ... should start at a low pass rate"
  > "Eval saturation occurs when an agent passes all of the solvable tasks, leaving no room for improvement."

- Shared state between trials can inflate results: Anthropic saw Claude gain an advantage by reading git history from previous trials. Correlated infrastructure failures make trials non-independent. Each trial should start from a clean, isolated environment. Relevant to running two arms in the same repository. ^e6
  > "we observed Claude gaining an unfair advantage on some tasks by examining the git history from previous trials"
  > Each trial should be "isolated" by starting from a clean environment. (as quoted in the task findings)

- Run-to-run variation and metrics: a trial is one attempt at a task, and multiple trials are run because outputs vary between runs. pass@k is the chance of at least one success in k tries and rises with k; pass^k is the chance all k trials succeed and falls with k. Choose pass@k where one success suffices and pass^k where consistency matters. Model-based graders are also non-deterministic. ^e7
  > "If your agent has a 75% per-trial success rate and you run 3 trials, the probability of passing all three is (0.75)^3 ~ 42%." (formula paraphrased in the task findings)

- LLM graders need calibration against human experts, a way out such as returning "Unknown", and isolated judges per rubric dimension. ^e8

## Limitations

- Single vendor engineering post, not peer reviewed; the sizing figure (20-50 tasks) is stated as practitioner guidance with no derivation, so confidence is low to medium.
- The CORE-Bench and METR anecdotes are second-hand links to social posts that were not fetched.
- The Opus 4.5 examples come from the vendor of the model, which a slopify benchmark would also use.
- The `^e6` second quotation, `^e7` formula wording and `^e8` guidance are recorded as relayed in the research findings, not re-read from the post in this pass.

## Relevance

- Informs the size, source, quality bar, saturation behaviour, isolation and repeat-metric choices for a benchmark of the slopify workflows (SMR-361). Inference: applying these points to two workflow arms in one repository is the researcher's reading, not stated by the post.
