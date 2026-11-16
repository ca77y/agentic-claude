---
title: Why SWE-bench Verified no longer measures frontier coding capabilities (OpenAI)
type: raw
summary: OpenAI's account of contamination and flawed tests in SWE-bench Verified, and why it stopped reporting the benchmark.
tags: [reliability]
aliases: [Why we no longer evaluate SWE-bench Verified]
source: https://openai.com/index/why-we-no-longer-evaluate-swe-bench-verified/
accessed: 2026-11-15
published: 2026-02-23
provider: OpenAI
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-15
updated: 2026-11-15
---

# Why SWE-bench Verified no longer measures frontier coding capabilities (OpenAI)

> [!quote] Source
> **URL**: https://openai.com/index/why-we-no-longer-evaluate-swe-bench-verified/
> **Accessed**: 2026-11-15
> **Method/Context**: Vendor engineering post (OpenAI, published 2026-02-23), recorded for SMR-361 (benchmarking the slopify workflows). Findings below are limited to what rests on this post; passages are quoted where the researcher supplied a quote, otherwise paraphrased.

## Key evidence

- Contamination in a public coding benchmark, measured. OpenAI found that all frontier models it tested (GPT-5.2, Claude Opus 4.5, Gemini 3 Flash Preview) could reproduce gold patches or verbatim problem-statement specifics for some SWE-bench Verified tasks, and that models that had seen the problems were more likely to succeed. OpenAI stopped reporting SWE-bench Verified. Probe method: an automated red-team where GPT-5 over 15 turns varied system/user prompts and prefill to elicit task details, with judge-model severity labels and manual review of "strong" cases. ^e1
  > [!quote] Excerpt
  > "all frontier models we tested were able to reproduce the original, human-written bug fix ... indicating that all of them have seen at least some of the problems and solutions during training."

- Flawed tasks in a curated benchmark. OpenAI audited 138 SWE-bench Verified problems that o3 did not solve consistently over 64 runs, each reviewed by at least six engineers. 59.4% had material test or description flaws (35.5% narrow tests, 18.8% wide tests, 5.1% other). Separately, tests on a 27.6% subset that models often fail were flawed in at least 59.4% of audited problems. Verified is 500 problems curated from 1,699 by 3 experts each; the top score rose only from 74.9% to 80.9% in 6 months. ^e2
  > [!quote] Excerpt
  > "59.4% of the 138 problems contained material issues in test design and/or problem description, rendering them extremely difficult or impossible even for the most capable model or human to solve."

- Grader flaws reject correct work. The same audit reports that at least 59.4% of the audited problems have flawed test cases that reject functionally correct submissions; narrow tests enforce implementation details and wide tests check unspecified functionality. ^e3
  > [!quote] Excerpt
  > "at least 59.4% of the audited problems have flawed test cases that reject functionally correct submissions"

- Public-repo benchmarks are contamination-prone because both the code and release notes are open. Mitigations the post describes: privately authored tasks (GDPval), password-protecting posted datasets, strict canary-string adherence in training-data filtering, and extra contamination tests when public data is used. ^e4
  > [!quote] Excerpt
  > "Benchmarks, and even their solutions, posted publicly can end up in training data."

- OpenAI independently reports that SWE-Bench Pro showed fewer and less severe contamination cases and no complete verbatim gold patch (paraphrase, not a verbatim quote). ^e5

- Scale reference: SWE-bench Verified is 500 problems from 12 Python repos, as this post describes it (paraphrase). ^e6

## Limitations

- A competitor lab's account of a model family (Claude Opus 4.5) that slopify would use; the Opus examples are OpenAI-selected.
- The Pro contamination comparison (^e5) is recorded as a paraphrase; no verbatim passage was supplied.
- The post is a vendor self-report; the audit and probe results were not independently reproduced in this pass.

## Relevance

- Evidence for the risks of using a public benchmark to compare the slopify workflows (contamination, flawed graders), and for privately authored tasks as the mitigation OpenAI names (inference for slopify; not stated by the post).
