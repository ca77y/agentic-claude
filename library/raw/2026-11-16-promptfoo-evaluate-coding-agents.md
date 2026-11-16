---
title: promptfoo - evaluate coding agents guide
type: raw
summary: promptfoo's guide to evaluating coding agents with the Claude Agent SDK provider, covering copy_working_dir isolation, assertions, LLM rubrics, and cost and latency thresholds
tags: []
aliases: []
source: https://github.com/promptfoo/promptfoo/blob/main/site/docs/guides/evaluate-coding-agents.md
accessed: 2026-11-16
published: unknown
provider: promptfoo
up: "[[library/_meta/index|Library Index]]"
related:
  - "[[raw/2026-11-16-promptfoo-claude-agent-sdk-provider]]"
created: 2026-11-16
updated: 2026-11-16
---

# promptfoo - evaluate coding agents guide

> [!quote] Source
> **URL**: https://github.com/promptfoo/promptfoo/blob/main/site/docs/guides/evaluate-coding-agents.md
> **Accessed**: 2026-11-16
> **Method/Context**: Retrieved through context7 (`/promptfoo/promptfoo`, indexed v0.125.1), as excerpts, not a full-page fetch. Published date and the page's own version are unknown. Gathered for SMR-361, benchmarking the slopify workflows against a baseline.

## Key evidence

- `copy_working_dir: true` gives each eval step a fresh copy of the working directory, deleted after assertions run. It is supported for the Claude Agent SDK, Codex SDK and OpenCode SDK providers. Without it, each call changes `working_dir`. ^e1
  > [!quote] Quote
  > "each call changes working_dir; set copy_working_dir: true for isolated workspaces."
  >
  > Provenance: the retrieved findings cite both this guide and `providers/claude-agent-sdk.md` for this claim, so the split between the two pages is not recorded. The related `max_budget_usd` and `persist_session: false` controls were cited to the provider page and are left to [[raw/2026-11-16-promptfoo-claude-agent-sdk-provider]].

- promptfoo can grade a Claude Agent SDK run with test-style assertions (a `javascript` assert on output text, cost, latency) and with an LLM rubric. ^e2
  > [!quote] Excerpt (paraphrase of the guide's example)
  > `providers: - id: anthropic:claude-agent-sdk ... assert: - type: llm-rubric ... threshold: 0.75`. The example grader is a `javascript` assert over output text.

  - Inference, not in the source: the sample test checks the agent's own output text for `pytest` or `passed`, which is not an independent test run.

- promptfoo captures cost and latency per run as assertable fields, with thresholds in dollars and milliseconds. ^e3
  > [!quote] Quote
  > `- type: cost threshold: 0.25` / `- type: latency threshold: 30000`; "Token distribution reveals what the agent is doing"

  - Inference from that remark: per-run token counts appear in results. The retrieved excerpts do not give the JSON field names (unknown).

## Limitations

- Excerpts via context7, not the full guide. A feature not mentioned here is not shown to be absent.
- Published date unknown. The context7 index lists v0.125.1, and the guide may have changed since.
- The guide's example assertion reads the agent's own output text, so it does not by itself show that the agent's work product passes an independent check.

## Relevance

- `copy_working_dir` is the isolation control for running each arm of a comparison on a fresh checkout (^e1).
- The assertion, rubric, cost and latency types are the grading options available to a promptfoo-based benchmark (^e2, ^e3).
