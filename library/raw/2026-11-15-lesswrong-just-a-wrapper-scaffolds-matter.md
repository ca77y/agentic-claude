---
title: Just a Wrapper? How Much Do Scaffolds Matter?
type: raw
summary: Gundlach et al. (2026) analysis of HAL data finding that scaffold effects are large and model-dependent, with guidance on fixing versus varying the scaffold.
tags: [reliability]
aliases: []
source: https://www.lesswrong.com/posts/jXLi3dhSpSMd7B6z8/just-a-wrapper-how-much-do-scaffolds-matter-1
accessed: 2026-11-15
published: 2026-06-26
provider: LessWrong (linkpost of an MIT FutureTech Substack post)
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-15
updated: 2026-11-15
---

# Just a Wrapper? How Much Do Scaffolds Matter?

> [!quote] Source
> **URL**: https://www.lesswrong.com/posts/jXLi3dhSpSMd7B6z8/just-a-wrapper-how-much-do-scaffolds-matter-1
> **Accessed**: 2026-11-15
> **Method/Context**: Gundlach, Brown, Lynch, Thompson. LessWrong linkpost of an MIT FutureTech Substack post, published 2026-06-26. Retrieved for SMR-361 (benchmarking the slopify workflows against a bare model). The authors state the analysis was run and reviewed by Claude Opus. Not peer reviewed.

## Key evidence

- Scaffold effects are large and model-dependent, so a result for one model does not transfer. On HAL data (18 models, several benchmarks, each model under a generalist scaffold and benchmark-specific ones), scaffolds explained more variance in logit performance than models did, after controlling for log price and benchmark. ^e1
- A generalist-to-specialist scaffold switch bought up to about 100x cheaper performance at the same accuracy. Some gains cost significantly more tokens. ^e2
- The same scaffold helped some models and hurt others. GAIA: Kendall tau 0.17 across scaffolds. CORE-Bench Hard: rank correlation negative from CORE-Agent to Claude Code. ^e3
- The authors flag that specialist scaffolds may be overfit to their benchmark, and that results are relative to the HAL baseline. A no-tool baseline would make scaffolds look better.
  > [!quote]
  > "if we had instead used a baseline that did not allow for tool calls, many of the scaffolds we assess would look comparatively amazing." ^e4
- Design guidance: to assess typical deployment, fix the scaffold actually used. To assess maximum capability, run several scaffolds and take the best. The design follows from the claim being made.
  > [!quote]
  > "the leaderboard should fix the scaffold that will actually be used." (recorded as a paraphrase of the post's quoted guidance, not a verbatim extract) ^e5

## Limitations

- Secondary source: a LessWrong linkpost of a Substack post, not peer reviewed. The analysis was run and reviewed by Claude Opus per the authors, so errors there are not independently checked.
- Findings rest on HAL data and its generalist baseline, so effects are relative to that baseline.
- Not a comparison of a workflow system against a bare model with the same tools, which is the shape of the SMR-361 benchmark.
- The e5 quote is a paraphrase of quoted guidance, not a verified verbatim string.

## Relevance

- A workflow-versus-bare result for one model should not be generalised to other models (e1, e3).
- The baseline choice (bare model with tools versus no tools) changes how a scaffold looks (e4).
- The claim determines the design: fix the workflow as shipped to measure deployment value (e5).
