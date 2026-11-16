---
title: DeepResearch Bench (arXiv 2506.11763)
type: raw
summary: DeepResearch Bench is a 100-task set of PhD-level research prompts graded by LLM judges (RACE for report quality, FACT for citations), a partial fit for evaluating the slopify research workflow.
tags: [operations]
aliases: []
source: https://arxiv.org/abs/2506.11763
accessed: 2026-11-16
published: 2025-06-13
provider: arXiv (paper) and the Ayanami0730/deep_research_bench GitHub repository
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-16
updated: 2026-11-16
---

# DeepResearch Bench (arXiv 2506.11763)

> [!quote] Source
> **URL**: https://arxiv.org/abs/2506.11763
> **Accessed**: 2026-11-16
> **Method/Context**: Read for SMR-361, benchmarking the slopify workflows. The paper page gives arXiv v1 as 2025-06-13. The repository https://github.com/Ayanami0730/deep_research_bench was read alongside it; its README was last updated 2026-09-29. The findings below mix paraphrase and quotation as marked; the source passages were not retained verbatim.

## Key evidence

- Task set: 100 PhD-level research tasks across 22 fields, 50 Chinese and 50 English. The input is a prompt (`query.jsonl`) and the output is a cited research report. (paraphrase) ^e1
- Grading is by LLM judge in two parts. RACE scores report quality against a reference with adaptive criteria on 4 dimensions: comprehensiveness, insight/depth, instruction-following, readability. FACT scores citation accuracy and effective citations, verified by scraping the cited URLs plus an LLM. (paraphrase) ^e2
- Default judges: GPT-5.5 for RACE and GPT-5.4-mini for FACT, reached through OpenRouter or OpenAI, plus a Jina API key. This is a non-Anthropic API dependency and a cost per evaluated report. (paraphrase) ^e3
- Judge alignment with human preference was reported as 71.82 for GPT-5.5, against a human inter-annotator baseline of 68.78. (paraphrase) ^e4
- Licence: the GitHub page shows Apache-2.0, but the README badge says `Code_License-MIT`. The two conflict and were not resolved. The dataset licence was not checked. ^e5
- A follow-up, DeepResearch Bench II, uses 9,430 binary rubrics. It was not fetched in detail. ^e6

## Limitations

- The benchmark covers open-web research. The slopify research workflow answers from a project library through connected MCP servers, so DeepResearch Bench is a partial fit at best. (inference)
- Judges are LLMs from another vendor, so scores depend on that dependency and its cost.
- The licence conflict (Apache-2.0 on the GitHub page against an MIT badge in the README) is open, and the dataset licence is unchecked.
- DeepResearch Bench II is a lead only, with no detail fetched: https://arxiv.org/abs/2506.11763 and the repository README mention it.
- The finding that no public task set covers the slopify workflows as a whole rests on the author's searches, not on this source, and is not recorded here.

## Relevance

- Candidate external set for the research workflow only. It has no coverage of deliver-story, deliver-bugfix, deliver-trivial, deliver-spike, shape or validate. (inference)
- Its tasks are prompts, with no Linear card, so any comparison arm would pass the question as a prompt.
