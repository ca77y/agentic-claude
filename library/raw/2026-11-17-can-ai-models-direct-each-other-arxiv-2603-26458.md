---
title: Can AI Models Direct Each Other? Organizational Structure as a Probe into Training Limitations (arXiv 2603.26458)
type: raw
summary: Independent academic eval on 200 SWE-bench Lite instances comparing single agents with manager-worker designs; the one model-fixed pair (weak-to-weak) shows overhead, the headline pair mixes models.
tags: [evaluation, agent-harness]
aliases: []
source: https://arxiv.org/abs/2603.26458
accessed: 2026-11-17
published: 2026-03-27
provider: arXiv (Rui Liu)
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-17
updated: 2026-11-17
---

# Can AI Models Direct Each Other? Organizational Structure as a Probe into Training Limitations (arXiv 2603.26458)

> [!quote] Source
> **URL**: https://arxiv.org/abs/2603.26458 (HTML version: https://arxiv.org/html/2603.26458v1)
> **Accessed**: 2026-11-17
> **Method/Context**: Read from the arXiv abstract and the HTML version for SMR-376 (published evals of single agent versus multi-agent designs). Independent academic author; published 2026-03-27.

## Key evidence

- Setup: 200-instance subset of SWE-bench Lite, all Python repositories. Five configurations run through GitHub Copilot CLI. ^e1
- Single-agent baselines on n=200: Strong Direct (Sonnet 4.6, single agent) 60%; Weak Direct (GPT-5-mini, single agent) 51%. On the n=50 subset Weak Direct scored 44%. ^e2
- Orchestrated designs on n=200: ManagerWorker (Sonnet 4.6 manager, text-only, directing a GPT-5-mini worker) 62%; Simple Loop (same pairing, review-only) 53%. ^e3
- Model-fixed pair (n=50): Weak-to-Weak (GPT-5-mini as both manager and worker, same model in both roles) 42% versus Weak Direct 44% on the same subset. The author's reading: "a weak manager directing a weak worker (42%) performs worse than the weak agent alone (44%)... structure without substance is pure overhead". ^e4
- Cost (estimated token counts, not billing): Weak-to-Weak about 75K tokens per instance versus about 15K for Weak Direct; ManagerWorker about 6.6K strong-model tokens versus about 30K for Strong Direct. ^e5
- Complementarity check (n=50): ManagerWorker solved 32/50 and Strong Direct 29/50, with 28 shared. ^e6
- The author's own caution on variance: "identical configurations can vary by 10pp on small subsets... the 50-instance ablations should be interpreted as directional". ^e7
- Latency is not reported. ^e8

## Limitations

- Model is held fixed only in the Weak-to-Weak versus Weak Direct pair, which is n=50 and a 2-point gap. The headline comparison (ManagerWorker versus Strong Direct) mixes models, so it does not isolate the design. ^e9
- No significance test is reported. ^e10
- Stated by the author: one benchmark (Python only), two model tiers only, cost from estimated token counts, pipeline-specific artifacts, non-determinism. ^e11
- Inference (not a quotation): the 2-point gap at n=50 is inside the 10-point run-to-run variation the author reports, so the weak-to-weak result shows no benefit rather than a measured loss. ^e12

## Relevance

- Evidence for SMR-376 on SWE-bench Lite: an independent eval that includes one model-fixed single-agent versus orchestrated pair, with a cost increase and no accuracy gain. It is small and directional.
- The 62% versus 60% headline gain comes from pairing a stronger manager with a weaker worker, not from structure under a fixed model.
