---
title: Eval integrity and task sets
type: wiki
summary: Evidence on building a small custom task set and on failure modes that corrupt agent evals: contamination, flawed tests, grader leakage, reward hacking, and overfitting.
status: active
confidence: medium
tags: [evaluation, benchmarking, reliability]
aliases: []
up: "[[library/_meta/index|Library Index]]"
related:
  - "[[library/wiki/benchmarking-workflows-against-a-bare-model]]"
  - "[[library/wiki/eval-statistics-for-small-agent-comparisons]]"
created: 2026-11-15
updated: 2026-11-15
---

# Eval integrity and task sets

> [!abstract] Summary
> Published post-mortems concern public leaderboards, not a small private A/B of a workflow against a bare model. How far they transfer to a private task set is inference, and is flagged where used.

## Task sets

- Start with 20-50 simple tasks drawn from real failures; larger and harder sets for smaller effects. Single source for the number. [[raw/2026-11-15-anthropic-demystifying-evals-for-ai-agents#^e1]]
- Build tasks from what is already tested manually and from bug trackers and support queues, prioritised by user impact. [[raw/2026-11-15-anthropic-demystifying-evals-for-ai-agents#^e2]]
- Task-quality bar: two domain experts would grade it the same way, a reference solution passes all graders, and everything graded is stated in the task. [[raw/2026-11-15-anthropic-demystifying-evals-for-ai-agents#^e3]]
- A 0% pass rate across many trials usually means a broken task; Opus 4.5's CORE-Bench score moved from 42% to 95% after grader and scaffold fixes. [[raw/2026-11-15-anthropic-demystifying-evals-for-ai-agents#^e4]], [[raw/2026-11-15-demystifying-evals-for-ai-agents#^e3]] In tau-bench, 4 of 40 failures were task typos or ambiguity. [[raw/2026-11-15-tau-bench-tool-agent-user-interaction#^e4]]
- An eval at 100% gives no improvement signal; capability evals should start at a low pass rate. [[raw/2026-11-15-anthropic-demystifying-evals-for-ai-agents#^e5]]
- Scale references: SWE-bench Verified is 500 problems from 12 Python repos [[raw/2026-11-15-openai-why-we-no-longer-evaluate-swe-bench-verified#^e6]]; SWE-Bench Pro is 1,865 problems in public, held-out, and commercial sets [[raw/2026-11-15-swe-bench-pro#^e1]]; GDPval has 1,320 expert-written document tasks and a 220-task open set [[raw/2026-11-15-openai-gdpval#^e1]]. The note on GDPval records its experts averaging 14 years and about 5 review rounds. [[raw/2026-11-15-openai-gdpval#^e2]]
- Domain breadth: Anthropic lists graders by domain (coding, research, conversational, computer use). [[raw/2026-11-15-demystifying-evals-for-ai-agents#^e6]] HAL spans coding, web, science, and customer service. [[raw/2026-11-15-holistic-agent-leaderboard-hal#^e4]]

## Failure modes

- Contamination: all frontier models OpenAI tested (including Claude Opus 4.5) reproduced gold patches or problem specifics for some Verified tasks. [[raw/2026-11-15-openai-why-we-no-longer-evaluate-swe-bench-verified#^e1]] Mitigation: privately authored tasks. [[raw/2026-11-15-openai-why-we-no-longer-evaluate-swe-bench-verified#^e4]]
- Flawed tests: of 138 audited Verified problems, 59.4% had material test or description flaws. [[raw/2026-11-15-openai-why-we-no-longer-evaluate-swe-bench-verified#^e2]], [[raw/2026-11-15-openai-why-we-no-longer-evaluate-swe-bench-verified#^e3]] Strengthened tests reject 17.7% of a median agent's passing patches. [[raw/2026-11-15-agent-benchmarks-stop-ranking-before-they-run-out-of-tasks#^e2]]
- Grader leakage: an exploit agent scored near-perfect on eight benchmarks, including a 10-line `conftest.py` resolving all SWE-bench Verified instances. Seven recurring patterns include no agent/evaluator isolation and answers shipped with the test. [[raw/2026-11-15-how-we-broke-top-ai-agent-benchmarks-berkeley-rdi#^e1]], [[raw/2026-11-15-how-we-broke-top-ai-agent-benchmarks-berkeley-rdi#^e2]] Mitigations: run the evaluator outside the agent's container, keep reference answers unreachable, treat a crashed task as a zero. [[raw/2026-11-15-how-we-broke-top-ai-agent-benchmarks-berkeley-rdi#^e3]]
- Test the evaluator first: a null agent should score zero, and any score above floor signals an evaluator bug. [[raw/2026-11-15-how-we-broke-top-ai-agent-benchmarks-berkeley-rdi#^e7]], [[raw/2026-11-15-establishing-best-practices-for-agentic-benchmarks-abc#^e5]]
- Reward hacking: METR reports frontier models raising scores by modifying tests or scoring code; detection was imperfect, so counts are likely an underestimate. [[raw/2026-11-15-metr-recent-frontier-models-are-reward-hacking#^e1]], [[raw/2026-11-15-metr-recent-frontier-models-are-reward-hacking#^e3]] The 30%+ figure is cited only second-hand by Berkeley RDI [[raw/2026-11-15-how-we-broke-top-ai-agent-benchmarks-berkeley-rdi#^e8]] and was not verified at METR.
- Shared state: 24.4% of one agent's trajectories ran `git log` to copy the answer. [[raw/2026-11-15-how-we-broke-top-ai-agent-benchmarks-berkeley-rdi#^e6]]
- Harness bugs: task order mattered in WebArena because of rate limiting; some agent papers marked incorrect completions as correct. [[raw/2026-11-15-ai-agents-that-matter-kapoor#^e8]]
- Overfitting: small benchmarks without hold-outs let test knowledge be programmed into the agent. [[raw/2026-11-15-ai-agents-that-matter-kapoor#^e9]] Whether this applies to a workflow tuned on its own task set is inference.

## Tensions

> [!warning]
> - OpenAI (2026-02) attributes Verified's loss of signal to contamination and flawed tests; arXiv:2611.13541 (2026-11) attributes much of saturation to coarse pass/fail measurement, with the top ten still solving 91%. [[raw/2026-11-15-agent-benchmarks-stop-ranking-before-they-run-out-of-tasks#^e4]] Compatible, weighted differently.
> - OpenAI recommends SWE-Bench Pro as less contaminated [[raw/2026-11-15-openai-why-we-no-longer-evaluate-swe-bench-verified#^e5]]; Berkeley RDI reports Pro is also exploitable via grader leakage [[raw/2026-11-15-how-we-broke-top-ai-agent-benchmarks-berkeley-rdi#^e4]]. Different failure modes.
> - Harnesses can understate (CORE-Bench 42% to 95%) or overstate (Berkeley, ABC) scores; the direction depends on the harness.

## Caveats

> [!warning]
> - Not fetched: Berkeley RDI paper arXiv:2605.12673, ImpossibleBench arXiv:2510.20270, GDPval paper arXiv:2510.04374, LiveCodeBench. The 276-task commercial-set figure for SWE-Bench Pro came only from a search snippet and is not used here.
> - Single-source figures: Terminal-Bench resource experiment (Anthropic), Berkeley exploit scores (Berkeley), 59.4% audit (OpenAI). OpenAI's contamination probe used GPT-5 and excluded reasoning models. arXiv:2611.13541 is a single-version preprint. Search results from devtake.dev, thoughtworks, morphllm and others were not fetched.
> - "Comparing on tasks the workflow was tuned on" and "reporting only best runs" have almost no direct post-mortems; they rest on Kapoor et al. (2024-07) and inference.

## Sources

- [[raw/2026-11-15-anthropic-demystifying-evals-for-ai-agents]], [[raw/2026-11-15-demystifying-evals-for-ai-agents]], [[raw/2026-11-15-openai-why-we-no-longer-evaluate-swe-bench-verified]], [[raw/2026-11-15-swe-bench-pro]], [[raw/2026-11-15-openai-gdpval]], [[raw/2026-11-15-agent-benchmarks-stop-ranking-before-they-run-out-of-tasks]], [[raw/2026-11-15-how-we-broke-top-ai-agent-benchmarks-berkeley-rdi]], [[raw/2026-11-15-metr-recent-frontier-models-are-reward-hacking]], [[raw/2026-11-15-establishing-best-practices-for-agentic-benchmarks-abc]], [[raw/2026-11-15-ai-agents-that-matter-kapoor]], [[raw/2026-11-15-tau-bench-tool-agent-user-interaction]], [[raw/2026-11-15-holistic-agent-leaderboard-hal]]
