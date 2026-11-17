---
title: "Agyn: A Multi-Agent System for Team-Based Autonomous Software Engineering (arXiv 2602.01465)"
type: raw
summary: Paper claiming a role-based multi-agent team resolves 72.2% of SWE-bench Verified vs about 65% for single-agent baselines, with mixed models, role-specific tools and leaderboard baselines, so not a controlled comparison, and no tokens, cost or latency.
tags: [evaluation, architecture, agent-harness]
aliases: []
source: https://arxiv.org/html/2602.01465
accessed: 2026-11-17
published: 2026-02
provider: arXiv
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-17
updated: 2026-11-17
---

# Agyn: A Multi-Agent System for Team-Based Autonomous Software Engineering (arXiv 2602.01465)

> [!quote] Source
> **URL**: https://arxiv.org/html/2602.01465
> **Accessed**: 2026-11-17
> **Method/Context**: Full-text HTML of the paper (February 2026; exact day not recorded). Quotations are marked "quote"; everything else is paraphrase or the scribe's inference. Table 1 and sec 4.3 are the cited locations.

## Key evidence

- **Headline result.** Agyn is a multi-agent team (manager, engineer, reviewer, researcher). The paper claims it resolves 72.2% of SWE-bench Verified (500 tasks). Baselines it reports: mini-SWE-agent + GPT-5 (medium reasoning) 65.0%; mini-SWE-agent + GPT-5.2 (high reasoning) 71.8%; OpenHands + GPT-5 71.8%. The abstract says 7.4% higher resolution than mini-SWE-agent "under comparable model configurations". Source: Table 1, sec 4.3. ^e1

- **Not held fixed (uncontrolled comparison).** The team mixes GPT-5 and GPT-5-Codex by role, agents get role-specific tools and isolated sandboxes, and the baselines are leaderboard entries rather than runs under the same model and tools. Source: system description and sec 4.3. "Agents may be backed by different language models depending on their role." (quote) ^e2

- **No efficiency measurements.** The paper reports no tokens, cost or latency for either design. Its own text says benchmark resolution rates omit "cost, and traceability" (quote, as recorded at retrieval). ^e3

> [!warning] Caveat
> The single-agent leaderboard entries are not a same-model comparison, so the 72.2% vs 65.0% gap cannot be attributed to the orchestration design alone (scribe's inference from ^e2).

## Limitations

- Single-run leaderboard-style numbers; the findings supplied record no significance test or sample variance.
- Exact publication day and the full set of role-to-model assignments were not recorded here.
- Secondary blogs (vibecoding.app, udit.co, dev.to) repeat "72.2% vs ~65%"; these restate this paper's number and are not independent evals.

## Relevance

- Evidence for the claim that a multi-agent design beats a single agent on SWE-bench Verified, but weak evidence on cost, because it is uncontrolled and reports no tokens, cost or latency. It does not meet the same-model, same-tools criterion with efficiency measures.
