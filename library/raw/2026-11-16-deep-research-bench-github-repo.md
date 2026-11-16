---
title: DeepResearch Bench GitHub repository
type: raw
summary: The DeepResearch Bench repository holds 100 PhD-level research tasks graded by LLM judges (RACE for report quality, FACT for citations), with a non-Anthropic judge dependency and a licence conflict between page and badge.
tags: [operations]
aliases: []
source: https://github.com/Ayanami0730/deep_research_bench
accessed: 2026-11-16
published: unknown
provider: Ayanami0730 and contributors (DeepResearch Bench)
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-16
updated: 2026-11-16
---

# DeepResearch Bench GitHub repository

> [!quote] Source
> **URL**: https://github.com/Ayanami0730/deep_research_bench
> **Accessed**: 2026-11-16
> **Method/Context**: Gathered for SMR-361 (benchmarking the slopify workflows). The findings below were reported by a researcher from the repository page. The repo README was updated 2026-09-29. The accompanying paper is https://arxiv.org/abs/2506.11763 (arXiv v1 2025-06-13), which the researcher read alongside the repository. The repository has no single publication date, so `published` is unknown.

## Key evidence

- Task set: 100 PhD-level research tasks across 22 fields (50 Chinese, 50 English). The input is a prompt (`query.jsonl`) and the output is a cited research report. ^e1
- Grading is by LLM judge, in two parts. RACE is reference-based adaptive-criteria report quality, over 4 dimensions: comprehensiveness, insight/depth, instruction-following, readability. FACT is citation accuracy and effective citations, verified by scraping the cited URLs plus an LLM. ^e2
- Judge and cost dependencies: the default judge is GPT-5.5 and the FACT judge is GPT-5.4-mini, via OpenRouter or OpenAI, plus a Jina API key. This means a non-Anthropic API dependency and a cost per evaluated report. ^e3
- Judge alignment with human preference was reported as 71.82 for GPT-5.5, against a human inter-annotator baseline of 68.78. ^e4
- Licence conflict: the GitHub page shows Apache-2.0, but the README badge says `Code_License-MIT`. The dataset licence was not checked. ^e5
- A follow-up, DeepResearch Bench II, uses 9,430 binary rubrics. It was not fetched in detail. ^e6
- Fit for slopify (researcher's inference, not a repository statement): it is open-web research, whereas the slopify research workflow answers from a project library through connected MCP servers, so it is a partial fit at best. Tasks are query lines with no Linear card. ^e7

## Limitations

- The licence conflict (^e5) is unresolved: the page and the badge disagree, and the dataset licence was not checked.
- The alignment figures (^e4) are from the paper's reporting as relayed by the researcher; the units and the human baseline method were not checked here.
- DeepResearch Bench II (^e6) is a lead only: no contents were fetched.
- The fit for slopify (^e7) is an inference by the researcher, not stated by the source.

## Relevance

- Candidate public task set for the slopify research workflow only. It covers none of deliver-story, deliver-bugfix, deliver-trivial, deliver-spike, shape or validate.
- Its judges are not Anthropic models and cost money per report, which matters for any comparison arm.
