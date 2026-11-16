---
title: promptfoo LLM-as-a-judge guide (select-best)
type: raw
summary: The promptfoo LLM-as-a-judge guide documents a select-best grader that compares outputs across providers for one test and passes only the winner.
tags: [operations]
aliases: []
source: https://github.com/promptfoo/promptfoo/blob/main/site/docs/guides/llm-as-a-judge.md
accessed: 2026-11-16
published: unknown
provider: promptfoo
up: "[[library/wiki/operations|Operations]]"
related: []
created: 2026-11-16
updated: 2026-11-16
---

# promptfoo LLM-as-a-judge guide (select-best)

> [!quote] Source
> **URL**: https://github.com/promptfoo/promptfoo/blob/main/site/docs/guides/llm-as-a-judge.md
> **Accessed**: 2026-11-16
> **Method/Context**: Gathered for SMR-361 (benchmarking the slopify workflows). A researcher retrieved the guide through context7 (`/promptfoo/promptfoo`), not by fetching the GitHub page directly. Publication date and version are unknown.

## Key evidence

- promptfoo has a pairwise or best-of grader, `select-best`. It compares outputs across several providers for the same test and passes the winner. ^e1
  - > [!quote] From the guide
  > Use select-best to compare prompts, models, or system configurations; the selected winner passes and the non-winning outputs fail.

## Limitations

- The guide's example compares two providers. The researcher did not confirm how it compares two configurations of the same model, such as the plugin on versus off.
- Retrieved through context7, so the text is an indexed copy and may differ from the current page.
- Publication date and version are unknown.

## Relevance

- Candidate grader for a two-arm comparison of a slopify workflow, with the open question above about same-model configurations.
