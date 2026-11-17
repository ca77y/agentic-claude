---
title: Can AI Models Direct Each Other? HTML full text
type: raw
summary: Liu's SWE-bench Lite study (n=200) reports a strong-manager plus weak-worker pairing at 62% against 60% for the strong model alone, and a weak-to-weak manager loop 2 points below the weak agent alone; both gaps are inside the author's stated run-to-run swing, with no significance test.
tags: [evaluation, agent-harness]
aliases: [arXiv 2603.26458v1, Strong Direct vs ManagerWorker]
source: https://arxiv.org/html/2603.26458v1
accessed: 2026-11-17
published: 2026-03-27
provider: arXiv (Rui Liu)
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-17
updated: 2026-11-17
---

# Can AI Models Direct Each Other? HTML full text

> [!quote] Source
> **URL**: https://arxiv.org/html/2603.26458v1
> **Accessed**: 2026-11-17
> **Method/Context**: Gathered for SMR-376 (published evals of single-agent versus multi-agent designs). Findings were reported by a researcher from the arXiv abstract (https://arxiv.org/abs/2603.26458) and the v1 HTML full text; the published date is the 27 Mar 2026 submission date. Each bullet is marked as quotation or paraphrase of the researcher's report, or as inference. Page text was not re-fetched by the scribe.

## Key evidence

- Setup: independent academic study (Rui Liu) on a 200-instance subset of SWE-bench Lite, all Python repositories. Five configurations run through GitHub Copilot CLI. (paraphrase) ^e1
- Single-agent baselines: Strong Direct (Sonnet 4.6 as one agent) solves 60%; Weak Direct (GPT-5-mini as one agent) solves 51% on n=200 and 44% on the n=50 subset. (paraphrase of reported figures) ^e2
- Orchestrated designs: ManagerWorker (Sonnet 4.6 manager, text-only, directing a GPT-5-mini worker) solves 62%; Simple Loop (same pairing, review-only) solves 53%. (paraphrase of reported figures) ^e3
- Model-fixed pair: Weak-to-Weak (GPT-5-mini as both manager and worker, n=50) solves 42% against Weak Direct's 44% on the same subset. This is the only pair in the study where the model is the same across single-agent and managed designs. Author's wording (quotation): "a weak manager directing a weak worker (42%) performs worse than the weak agent alone (44%)... structure without substance is pure overhead". ^e4
- Model not fixed in the headline comparison: ManagerWorker (62%) versus Strong Direct (60%) mixes models, since the worker is a different, weaker model than the single agent. (inference from the configuration list) ^e5
- Cost, estimated token counts and not billing: Weak-to-Weak about 75K tokens per instance versus about 15K for Weak Direct; ManagerWorker about 6.6K strong-model tokens versus about 30K for Strong Direct. (paraphrase of reported estimates) ^e6
- Complementarity check (n=50): ManagerWorker solved 32/50 and Strong Direct 29/50, with 28 shared. (paraphrase of reported figures) ^e7
- Latency is not reported. No significance test is reported. (reported absence; not checked by the scribe) ^e8
- Author's own caveat on small subsets (quotation): "identical configurations can vary by 10pp on small subsets... the 50-instance ablations should be interpreted as directional". ^e9

## Limitations

- Stated by the author: one benchmark (Python only), two model tiers only, cost given as estimated token counts, pipeline-specific artifacts, and non-determinism.
- The 2-point ManagerWorker gap over Strong Direct and the 2-point Weak-to-Weak gap (n=50) are both inside the author's own stated 10 pp run-to-run swing on small subsets, and no significance test is reported.
- Model is held fixed only in the Weak-to-Weak versus Weak Direct pair, which is n=50.
- Figures were relayed by a researcher, not re-read by the scribe; the quotations are as reported.

## Relevance

- A published, independent single-agent versus manager-worker comparison on a coding benchmark (SWE-bench Lite), with one model-fixed pair showing no gain from adding a same-model manager.
- Useful as the academic counterpart to vendor and tool-author results gathered for SMR-376; not a SWE-bench Pro or Terminal-Bench result.
