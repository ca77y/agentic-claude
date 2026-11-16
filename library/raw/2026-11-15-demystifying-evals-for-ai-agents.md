---
title: Demystifying evals for AI agents
type: raw
summary: Anthropic Engineering guidance on agent evals - harness plus model, trial isolation, grader choice, sample size, pass@k, and harness bugs as a confound.
tags: [reliability]
aliases: [Anthropic demystifying evals]
source: https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
accessed: 2026-11-15
published: 2026-01-09
provider: Anthropic Engineering
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-15
updated: 2026-11-15
---

# Demystifying evals for AI agents

> [!quote] Source
> **URL**: https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
> **Accessed**: 2026-11-15
> **Method/Context**: Retrieved for SMR-361 (benchmarking slopify workflows against a bare model). Published 2026-01-09 by Anthropic Engineering. Quotations below are verbatim as supplied to the scribe; bullets without a quotation are the researcher's paraphrase.

## Key evidence

- An agent evaluation measures the harness and the model together, so a scaffold-versus-bare-model comparison changes the harness and holds the model fixed. ^e1
  > [!quote] "When we evaluate 'an agent,' we're evaluating the harness and the model working together."
  > The second clause (scaffold versus bare model) is inference from this quote, not the post's wording.
- Constants and conditions the post names: the same task and grader per trial; a clean, isolated environment per trial, because shared state (leftover files, cached data, resource exhaustion) causes correlated failures and can inflate scores; multiple trials per task because outputs vary; the eval agent must function roughly like the production agent. ^e2
  > [!quote] "Each trial should be 'isolated' by starting from a clean environment... in some internal evals we observed Claude gaining an unfair advantage on some tasks by examining the git history from previous trials."
- Harness and grader bugs are a confound. Opus 4.5 scored 42% on CORE-Bench until grading and scaffold issues were fixed (rigid numeric match, ambiguous task specs, irreproducible stochastic tasks), then 95% with a less constrained scaffold. METR found misconfigured tasks that penalized models for following instructions. A scaffold that constrains the model can therefore look worse than bare for reasons unrelated to quality (inference). ^e3
  > [!quote] "After fixing bugs and using a less constrained scaffold, Opus 4.5's score jumped to 95%."
  > The CORE-Bench and METR cases are the post's secondary reports, linked to X posts that were not fetched.
- Grade outcomes rather than path. The post advises grading what the agent produced, not the tool-call sequence, because agents find valid approaches the designer did not anticipate. Deterministic graders are preferred for coding; LLM-rubric graders are calibrated against humans for subjective output, with an "Unknown" escape and one isolated judge per rubric dimension. Track tokens, turns, tool calls and latency as transcript metrics. ^e4
  > [!quote] "it's often better to grade what the agent produced, not the path it took."
- Sample size and metrics. 20-50 tasks drawn from real failures is a good start when effect sizes are large; smaller effects need bigger, harder suites. pass@k is at least one success in k tries; pass^k is all k succeed (0.75 per trial gives about 42% for 3 trials). A 0% pass rate across many trials usually signals a broken task. Saturation hides improvement. ^e5
  > [!quote] "20-50 simple tasks drawn from real failures is a great start... this large effect size means small sample sizes suffice."
- Domain breadth. Coding: SWE-bench Verified (issues graded by fail-to-pass and pass-to-pass tests) and Terminal-Bench. Research agents: a grader mix of groundedness, coverage and source quality, with LLM rubrics calibrated to experts. Conversational agents: tau-bench, with state checks plus a rubric. Computer use: WebArena and OSWorld. Documents and research tasks have no unit tests and need rubric or LLM graders. ^e6
  > [!quote] "Unlike coding agents where unit tests provide binary pass/fail signals, research quality can only be judged relative to the task."

## Limitations

- The post is guidance from one vendor's engineering team, not a controlled study. Its numbers (42% to 95%, 20-50 tasks) are illustrations, not measured effect sizes for any other setup.
- The CORE-Bench and METR cases are reported second-hand; the linked X posts were not fetched.
- The e1 reading for scaffold-versus-bare comparisons and the e3 reading on constraining scaffolds are inferences from the post's statements, not claims the post makes.
- Retrieval details beyond the supplied quotations (full-page structure, figures, code samples) were not re-checked by this scribe.

## Relevance

- Bears on SMR-361, benchmarking slopify workflows against a bare model: it fixes what must stay constant (task, grader, model, isolated environment per trial), what to vary (the harness), and the pitfalls (grader bugs, over-constrained scaffold, shared state).
- Supports grading outcomes with deterministic checks where possible and calibrated LLM rubrics for documents and research output, which are the cases slopify workflows produce.
