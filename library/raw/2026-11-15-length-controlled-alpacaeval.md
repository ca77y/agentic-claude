---
title: Length-Controlled AlpacaEval (Dubois et al., 2024)
type: raw
summary: Dubois et al. remove LLM-judge length bias with a GLM fit, raising AlpacaEval's Spearman correlation with Chatbot Arena from 0.94 to 0.98.
tags: [reliability]
aliases: [Length-Controlled AlpacaEval, AlpacaEval LC]
source: https://arxiv.org/abs/2404.04475
accessed: 2026-11-15
published: 2024-04-06
provider: arXiv
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-15
updated: 2026-11-15
---

# Length-Controlled AlpacaEval (Dubois et al., 2024)

> [!quote] Source
> **URL**: https://arxiv.org/abs/2404.04475
> **Accessed**: 2026-11-15
> **Method/Context**: Dubois et al., "Length-Controlled AlpacaEval: A Simple Way to Debias Automatic Evaluators" (COLM 2024). Version 2 dated 2025-03-10; version 1 dated 2024-04-06 (the `published` date). Gathered for SMR-361, benchmarking the slopify workflows against a bare-model baseline. Recorded from the research brief's finding and quotation; the full text was not re-read for this note.

## Key evidence

- Length (verbosity) bias in an LLM judge can be removed statistically. Fit a generalized linear model (GLM) that predicts the judge's preference from the length difference and other features, then predict the preference at zero length difference. This raised the Spearman correlation of AlpacaEval with LMSYS Chatbot Arena from 0.94 to 0.98 and made the metric robust to verbosity manipulation. ^e1

> [!quote] Source excerpt
> "increases the Spearman correlation with LMSYS Chatbot Arena from 0.94 to 0.98" (quoted from the paper, as supplied in the brief)

## Limitations

- The method needs many comparisons to fit the GLM. A small benchmark would more likely report output length per arm beside the score (inference by the researcher, not a claim of the paper). ^e2
- The sources of the figures 0.94 and 0.98 and the robustness claim are as supplied in the brief; effect sizes beyond the quoted correlation were not retrieved.

## Relevance

- Bears on the SMR-361 benchmark design: a judge comparing slopify output with bare-model output can be swayed by length, so length belongs in the report even when the statistical correction is not applied. See [[library/raw/2026-11-15-length-controlled-alpacaeval#^e2|e2]].
