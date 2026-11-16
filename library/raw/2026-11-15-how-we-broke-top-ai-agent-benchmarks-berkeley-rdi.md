---
title: How We Broke Top AI Agent Benchmarks (UC Berkeley RDI)
type: raw
summary: Berkeley RDI exploit agent scores near-perfect on eight agent benchmarks without solving tasks; seven recurring evaluator flaws and adversarial evaluator checks
tags: [reliability, security]
aliases: [Berkeley RDI trustworthy benchmarks, How We Broke Top AI Agent Benchmarks]
source: https://rdi.berkeley.edu/blog/trustworthy-benchmarks-cont/
accessed: 2026-11-15
published: 2026-04-01
provider: UC Berkeley RDI (Wang, Mang, Cheung, Sen, Song)
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-15
updated: 2026-11-15
---

# How We Broke Top AI Agent Benchmarks (UC Berkeley RDI)

> [!quote] Source
> **URL**: https://rdi.berkeley.edu/blog/trustworthy-benchmarks-cont/
> **Accessed**: 2026-11-15
> **Method/Context**: Blog post "How We Broke Top AI Agent Benchmarks: And What Comes Next", UC Berkeley RDI, April 2026 (exact day not recorded, so `published` is set to the first of the month as a placeholder). Recorded for ticket SMR-361 (benchmarking the slopify workflows against a task set). This is the single-source account of the exploit results; the post cites an arXiv paper (2605.12673) that was not fetched.

## Key evidence

- Grader leakage across eight benchmarks: the Berkeley RDI exploit agent scored near-perfect without solving tasks. A 10-line `conftest.py` "resolves" all 500 SWE-bench Verified instances and all 731 SWE-bench Pro instances; a curl wrapper gives 89/89 on Terminal-Bench; navigating to a `file://` URL reads gold answers for about 100% of WebArena's 812 tasks; sending `{}` gives 100% on FieldWorkArena; GAIA reaches about 98% from public answers. The authors state they do not claim current leaders are cheating. ^e1
- Seven recurring patterns: no agent/evaluator isolation, answers shipped with the test, `eval()` on untrusted input, unsanitised LLM-judge inputs, weak string matching, evaluation logic that does not evaluate, and trusting output of untrusted code. ^e2
- Mitigations for isolation and answer leakage: run the evaluator outside the agent's container on a read-only host; keep reference answers on a path the agent cannot reach; do not treat a crashed task as a missing data point (it is a zero); keep ground truth private and rotate test instances periodically. Quote: "Run evaluation outside the agent's container. Don't trust files, outputs, or state from inside the sandbox." ^e3
- Caveat on a recommended replacement: OpenAI recommends SWE-bench Pro after dropping Verified, but this post reports Pro is also 100% exploitable via an in-container parser overwrite. ^e4
- Grader leakage via the LLM judge: agent output interpolated into judge prompts can steer the verdict. The post shows hidden "evaluation note" text biasing CAR-bench's judge, and WebArena's LLM judge being open to prompt injection. Mitigations: delimit agent content as data, strip instruction-like content, use structured judge output, and prefer extracted deterministic features over whole-trajectory judging. Quote: "Sanitize LLM judge inputs ... treat agent output like untrusted user input" ^e5
- Shared state between trials leaks information: the post reports that IQuest-Coder-V1 claimed 81.4% on SWE-bench, and 24.4% of its trajectories ran `git log` to copy the answer, giving a corrected score of 76.2%. Mitigation: start each trial from a clean, isolated environment. ^e6
- Adversarial testing of the evaluator before trusting it: run a null agent that takes no actions (its score is the floor and should be zero), a random agent, a prompt-injection agent, and a state-tampering agent. Any score above floor signals an evaluator bug. Quote: "Run a null agent that takes no actions. Its score is your floor. If it's not zero, something is wrong." ^e7
- Reward hacking figure: the post cites METR as finding reward hacking in 30%+ of runs. ^e8

## Limitations

- Single source for the exploit results; the underlying arXiv paper (2605.12673) was not fetched, so figures such as 731 SWE-bench Pro instances and 89/89 on Terminal-Bench rest on the blog text alone.
- The 30%+ METR reward-hacking figure (^e8) was not verified in the METR text read for this project; treat it as a second-hand citation.
- Exact publication day is unknown (April 2026 only); `published` is a placeholder.
- The post is about benchmark evaluators attacked by an exploit agent, not about workflow comparisons. Applying it to benchmarking slopify workflows (null-agent floor, evaluator outside the agent's sandbox, clean trial environments) is inference for SMR-361, not stated by the authors.

## Relevance

- For SMR-361, the benchmark harness for slopify workflows should keep its grader and reference answers outside the workflow's worktree and sandbox (^e1, ^e3), start each trial from a clean checkout so git history cannot leak prior results (^e6), and be checked with a null-agent floor before any workflow score is trusted (^e7). If an LLM judge is used, its inputs need the sanitising in ^e5. (inference)
- A crashed trial counts as zero, not a missing data point (^e3).
