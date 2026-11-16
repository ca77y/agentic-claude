---
title: Tokenomics for coding agents (AWS)
type: raw
summary: AWS Cloud Financial Management post on benchmarking coding-agent cost and quality, with a one-lever-at-a-time comparison design and a measured lighter-vs-heavier harness result.
tags: [performance]
aliases: [Tokenomics for coding agents, AWS tokenomics]
source: https://aws.amazon.com/blogs/aws-cloud-financial-management/tokenomics-for-coding-agents-benchmark-cost-and-quality-on-your-own-code/
accessed: 2026-11-15
published: 2026-10-21
provider: AWS Cloud Financial Management blog (Arora and Sinha)
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-15
updated: 2026-11-15
---

# Tokenomics for coding agents (AWS)

> [!quote] Source
> **URL**: https://aws.amazon.com/blogs/aws-cloud-financial-management/tokenomics-for-coding-agents-benchmark-cost-and-quality-on-your-own-code/
> **Accessed**: 2026-11-15
> **Method/Context**: Blog post by Arora and Sinha, published 2026-10-21, about 3 weeks before access. A vendor engineering post describing its own method, so primary for method but a single vendor-authored source. Sample code at aws-samples/sample-agentic-coding-harness-benchmarks was not inspected. Recorded for SMR-361, benchmarking slopify workflows against a bare model.

## Key evidence

- Comparison design: hold model, hosting and per-token rate identical and change one lever at a time (model, harness, hosting). ^e1
  > [!quote] Post
  > "Comparing a single model across the two harnesses is a fair cost comparison, because the hosting basis ... is identical in both runs, so nothing but the harness changes."
- Measured harness effect on cost with quality held: across 12 models and the same tasks, the lighter harness cost less and used fewer tokens for every model with no loss in score. One model cost about $8 per task on the lighter harness against about $24 on the heavier one. The heavier harness is the one that spawns subagents. This is directly the multi-agent-workflow versus lighter-run comparison. ^e2
  > [!quote] Post
  > "The heavier harness spawns subagents, which inflated token counts, dollar cost, and wall-clock time without a matching gain in quality."
- Per-task metrics the AWS harness records (paraphrase): tokens, turns and latency per run, scored against a rubric by an independent judge, each run starting from a clean clone pinned to a commit. A metrics.json is stored with a timestamp per run so frontiers can be diffed over time. Cost per task and quality are reported together, for example a router 44.7% cheaper for 4.8% lower mean quality over 21 tasks. ^e3
- Caching and input skew: a coding agent replays its growing transcript as input every turn, so the input:output ratio can reach "a few hundred to one". Pricing by output tokens understates the bill. Cost depends on "how many turns it takes, how much context it re-reads each turn, and whether its prompt cache hits". ^e4
  > [!quote] Post
  > "a coding task that runs 98% input tokens is not a cheap task"
  > [!note] Inference
  > Cache effects therefore need recording per run, since a cache-heavy run is cheaper than a cold one. This consequence is drawn here, not stated as such in the quotes above.

## Limitations

- Single vendor-authored source describing its own method; no independent replication.
- The harnesses compared are not named in the text retrieved, so the lighter-vs-heavier result cannot be tied to a specific product or to slopify.
- Task set, rubric, judge model and prices are not captured here beyond the figures quoted; the 21-task router figure and the $8 versus $24 figure come from different comparisons.
- Sample code was not inspected, so the metric definitions are as the post describes them.

## Relevance

- ^e1 gives a design for comparing a slopify workflow against a bare model: fix model and hosting, change only the harness.
- ^e2 is the closest published evidence that a subagent-spawning arm can cost more with no quality gain, which is the hypothesis a slopify benchmark would test.
- ^e3 and ^e4 list what to record per run: tokens, turns, latency, judged quality, pinned commit, and cache behavior.
