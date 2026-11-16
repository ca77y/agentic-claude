---
title: SWE-Bench Pro (arXiv:2509.16941)
type: raw
summary: Contamination-resistant coding benchmark of 1,865 long-horizon tasks split into public, held-out and commercial sets
tags: []
aliases: [SWE-Bench Pro, Deng et al. 2025]
source: https://arxiv.org/abs/2509.16941
accessed: 2026-11-15
published: 2025-09-21
provider: arXiv (Deng et al.)
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-15
updated: 2026-11-15
---

# SWE-Bench Pro (arXiv:2509.16941)

> [!quote] Source
> **URL**: https://arxiv.org/abs/2509.16941
> **Accessed**: 2026-11-15
> **Method/Context**: Paper "SWE-Bench Pro: Can AI Agents Solve Long-Horizon Software Engineering Tasks?", Deng et al. v1 published 2025-09-21; v2 2025-11-14 (the version recorded here). Recorded for ticket SMR-361 (benchmarking the slopify workflows against a task set). Primary source for the benchmark's own design; the findings below come from the abstract-level description supplied to the scribe.

## Key evidence

- Contamination-resistant design: SWE-Bench Pro has 1,865 problems from 41 repositories, split into a public set (11 repos), a held-out set (12 repos) and a commercial set (18 proprietary repos under partnership agreements). Held-out and commercial problems are not public, and only commercial results are released. ^e1
- Task quality and difficulty: tasks are human-verified and augmented with context so they are resolvable; they may take a professional hours to days and span multiple files. ^e2
- The authors call the benchmark contamination-resistant. Quote: "SWE-BENCH PRO provides a contamination-resistant testbed" ^e3
- Scale for comparison: 1,865 problems, against 500 for SWE-bench Verified and a 20-50 task starting set for practitioner custom suites (the latter two from other sources, not this paper). The scales differ by one to two orders of magnitude. (paraphrase; comparison is the scribe's framing) ^e4

## Limitations

- Only the public split can be rerun by outsiders; held-out and commercial results are not released, so the contamination-resistance claim cannot be independently checked on them (inference).
- "Contamination-resistant" is the authors' own claim. OpenAI's SWE-bench Verified post separately reports that Pro showed fewer and less severe contamination cases and no complete verbatim gold patch; that corroboration is recorded in the note for that post, not here.
- A figure of 276 tasks for the commercial set appeared on a secondary page and was not verified against the paper; it is not relied on here.
- Findings were recorded from the supplied abstract-level description; the full paper body was not re-read in this pass.

## Relevance

- Gives one example of a benchmark design that mitigates contamination with private repositories, relevant to choosing between a public benchmark and a small private custom set for slopify workflows.
