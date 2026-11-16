---
title: Track cost and usage (Claude Agent SDK docs)
type: raw
summary: Claude Code Docs page on Agent SDK cost and usage fields, covering cache token fields, subagent exclusion from result usage, double-counting pitfalls, and cost as a client-side estimate.
tags: [performance]
aliases: [Agent SDK cost tracking]
source: https://code.claude.com/docs/en/agent-sdk/cost-tracking
accessed: 2026-11-15
published: unknown
provider: Anthropic (Claude Code Docs)
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-15
updated: 2026-11-15
---

# Track cost and usage (Claude Agent SDK docs)

> [!quote] Source
> **URL**: https://code.claude.com/docs/en/agent-sdk/cost-tracking
> **Accessed**: 2026-11-15
> **Method/Context**: Current docs page "Track cost and usage - Claude Code Docs (Agent SDK)"; undated, so the current docs version at access. Vendor documentation of its own product, primary for field semantics. Recorded for SMR-361, benchmarking slopify workflows against a bare model. Findings below are quotation or paraphrase of the page unless marked as inference.

## Key evidence

- The usage object carries `cache_creation_input_tokens` (charged at a higher rate than standard input) and `cache_read_input_tokens` (charged at a reduced rate). The SDK uses prompt caching automatically, so cache effects should be recorded separately per run. ^e1
  > [!quote] Page
  > "Track these separately from input_tokens to understand caching savings."
- Result-level `usage` excludes subagents; `total_cost_usd` and `modelUsage` / `model_usage` include subagent requests, and `modelUsage` is the whole-tree token breakdown by model. Use `modelUsage` for whole-tree token accounting. ^e2
  > [!quote] Page
  > `usage`: "Counts only the top-level agent loop" (table marks subagents "Excluded"; `total_cost_usd` and `modelUsage` are marked "Included").
- Inference, not quotation: for a workflow-versus-bare comparison, summing `usage` would undercount the multi-agent arm, because nested subagent requests are missing from it. ^e3
- Per-step usage pitfalls (paraphrase): ^e4
  - Parallel tool calls produce multiple assistant messages that share one message id and carry identical usage, so dedupe by id to avoid inflated totals.
  - Per-step `output_tokens` is a placeholder (the count at message_start), so take output tokens from the result message.
  - In streaming input mode and in resumed sessions the totals are running totals, so read the latest result rather than summing; summing double-counts.
  - Before v2.1.277, resumed sessions started their totals at zero.
  > [!quote] Page
  > "Per-step output_tokens is a placeholder"; "summing results double-counts the restored spend"
- `total_cost_usd` and `costUSD` are computed locally from a price table bundled at build time, so they drift when pricing changes or when the installed SDK version does not recognize a model. The page also applies a 1.1 multiplier for `inference_geo` "us" data residency. ^e5
  > [!quote] Page
  > "client-side estimates, not authoritative billing data"
- Inference, not quotation: a benchmark should pin the CLI and SDK version and, ideally, recompute cost from stored per-model token counts and a recorded price table. This combines this page with Kapoor et al. (arXiv 2407.01502), not a claim the page makes. ^e6

## Limitations

> [!warning] Caveats
> - Page is undated and describes the current docs version; field names and behavior can change between SDK versions, and the v2.1.277 note shows they already have.
> - e3 and e6 are inferences for the benchmark design, not statements on the page.
> - The page's own table and wording were not re-verified against a pinned SDK release.

## Relevance

- Gives the field-level rules a cost comparison of slopify workflows against a bare model needs: which fields count subagents (e2), which double-count (e4), and why dollar cost should be recomputed from tokens (e5, e6).
