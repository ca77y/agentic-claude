---
title: Towards a Science of Scaling Agent Systems v1 abstract page
type: raw
summary: The arXiv v1 abstract (9 Dec 2025) of the Google scaling-agent-systems paper reports a 180-configuration controlled study, a 45% single-agent capability ceiling, 17.2x vs 4.4x error amplification, and R^2=0.513 with 87% architecture selection.
tags: [evaluation, architecture]
aliases: []
source: https://arxiv.org/abs/2512.08296v1
accessed: 2026-11-17
published: 2025-12-09
provider: arXiv (paper authors)
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-17
updated: 2026-11-17
---

# Towards a Science of Scaling Agent Systems v1 abstract page

> [!quote] Source
> **URL**: https://arxiv.org/abs/2512.08296v1
> **Accessed**: 2026-11-17
> **Method/Context**: Gathered for SMR-376 (published evals of single-agent versus other agent designs). Only the v1 abstract page is recorded here. The paper's later version (v3, 8 Apr 2026, 260 configurations, six benchmarks) and the Google Research blog (28 Jan 2026) are different sources and are not recorded in this note. Bullets say whether they are quotation, paraphrase or inference.

## Key evidence

- Study size: v1 describes "a controlled evaluation spanning 180 configurations with standardized tools and token budgets." (quote) ^e1
- Finance-Agent gain: the v1 abstract gives the best multi-agent improvement on Finance-Agent as 80.9%. (paraphrase of the abstract, as relayed by the researcher; the v3 paper states +80.8% for Centralized, so the figure differs between versions) ^e2
- Error amplification: v1 reports that independent multi-agent systems amplify errors 17.2x, against 4.4x for centralized coordination. (paraphrase of the abstract, as relayed by the researcher; the v3 paper qualifies these as trace-level factors, which this source is not recorded as doing) ^e3
- Capability ceiling: v1 reports that tasks where single-agent performance already exceeds about 45% see negative returns from added agents, with beta=-0.408, p<0.001. (paraphrase of the abstract, as relayed by the researcher; v3 reports beta=-0.236, p=0.004 for the same finding) ^e4
- Predictive model: v1 reports a cross-validated R^2=0.513 on the four original benchmarks, and 87% correct selection of the best architecture on held-out configurations. (paraphrase of the abstract, as relayed by the researcher; v3 reports R^2_CV=0.373 or 0.413 on six benchmarks, with 87% unchanged) ^e5

## Limitations

- Abstract page only; the v1 body text, tables and method were not read from this source, so nothing here covers per-benchmark results, models, architectures or sample sizes.
- Figures in ^e2 to ^e5 are relayed from the abstract and were compared with a later version by the researcher; the exact abstract wording is not quoted except in ^e1.
- v1 figures were superseded in v3 (different benchmark set, regression and coefficients) and must not be cited as the current results.
- The abstract is the authors' own summary and is not an independent replication.

## Relevance

- Dates the first public claims of the study (9 Dec 2025) and shows which headline numbers changed in later versions (^e2, ^e4, ^e5), so a citation can name the version it uses.
- Supports a same-study comparison of a single agent with four multi-agent architectures, with the study's own error-amplification and capability-ceiling claims (^e1, ^e3, ^e4). The claims are not tied to coding tasks in this source.
