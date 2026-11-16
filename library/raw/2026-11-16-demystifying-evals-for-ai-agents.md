---
title: Demystifying evals for AI agents
type: raw
summary: Anthropic's engineering guide recommends a small project-specific eval set built from real failures, and gives grader and trial-design guidance for coding and research agents.
tags: [reliability]
aliases: []
source: https://www.anthropic.com/research/demystifying-evals-for-ai-agents
accessed: 2026-11-16
published: 2026-01-09
provider: Anthropic
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-16
updated: 2026-11-16
---

# Demystifying evals for AI agents

> [!quote] Source
> **URL**: https://www.anthropic.com/research/demystifying-evals-for-ai-agents
> **Accessed**: 2026-11-16
> **Method/Context**: Gathered for SMR-361 (benchmarking the slopify workflows). The findings below were reported by a researcher from the Anthropic Engineering article (published 2026-01-09). Quotations are marked; the rest is paraphrase. The article is a single vendor source and does not say how to evaluate plugin or workflow variants.

## Key evidence

- SWE-bench Verified is described as graded by running the test suite, and as near saturation. ^e1
  - > [!quote] From the article
  > a solution passes only if it fixes the failing tests without breaking existing ones
  - > [!quote] From the article
  > LLMs have progressed from 40% to >80% on this eval in just one year
  - > [!quote] From the article
  > frontier models are now nearing saturation at >80%
- Building a small project-specific task set is the recommended norm, and each task should have an unambiguous spec and a reference solution. ^e2
  - > [!quote] From the article
  > 20-50 simple tasks drawn from real failures is a great start
  - > [!quote] From the article
  > Start with what you already test manually
  - > [!quote] From the article
  > You don't need to invent an evaluation from scratch
- Grader guidance. For coding agents the article says deterministic graders are natural (unit tests), with an optional LLM rubric for code quality. Research agents have no binary pass/fail, so graders should combine groundedness, coverage and source-quality checks with LLM rubrics that are "frequently calibrated against expert human judgment" (quote). ^e3
- Task-set design points (quote/paraphrase): run multiple trials per task and report pass@k and pass^k; isolate trials from a clean environment (the article observed Claude reading git history from earlier trials); grade outcomes, not paths; treat 0% pass@100 as usually a broken task; balance positive and negative cases. ^e4
- Implication for comparison arms (researcher's inference, not an article statement): any custom task set should ship a reference solution and a fresh checkout per trial. ^e5

## Limitations

- Single vendor source; it gives general eval practice and does not address plugin or workflow variants.
- The article's description of SWE-bench Verified (^e1) is secondhand; the SWE-bench README is recorded separately in [[library/raw/2026-11-16-swe-bench-readme]].
- ^e5 is the researcher's inference.

## Relevance

- Supports building a small custom task set for the slopify workflows instead of adopting a public benchmark, with deterministic graders for the coding workflows and calibrated LLM rubrics for research.
- Supports multiple trials per task with clean checkouts when comparing arms.
