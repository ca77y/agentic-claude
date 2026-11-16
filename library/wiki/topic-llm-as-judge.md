---
title: LLM as judge topic map
type: moc
summary: Map of library pages tagged llm-as-judge (7 pages at creation).
tags: [llm-as-judge]
aliases: []
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-16
updated: 2026-11-16
---

# LLM as judge topic map

> [!abstract] Map of content
> Judge bias, rubric scoring, and agent-based judging for outputs that tests cannot grade. Lists every page tagged `llm-as-judge`; the tag crossed five pages, so librarian.md requires this map.

## Wiki pages

```dataview
TABLE confidence, updated
FROM "library/wiki"
WHERE type = "wiki" AND contains(tags, "llm-as-judge")
SORT updated DESC
```

- [[library/wiki/llm-judge-bias-and-rubric-scoring|LLM judge bias and rubric scoring]]

## Raw notes

```dataview
TABLE source, accessed
FROM "library/raw"
WHERE type = "raw" AND contains(tags, "llm-as-judge")
SORT file.name ASC
```

- [[library/raw/2026-11-15-agent-as-a-judge-evaluate-agents-with-agents|Agent-as-a-Judge abstract]]
- [[library/raw/2026-11-15-judging-the-judges-position-bias-llm-judge|Judging the Judges - Position Bias in LLM-as-a-Judge]]
- [[library/raw/2026-11-15-length-controlled-alpacaeval|Length-Controlled AlpacaEval (Dubois et al., 2024)]]
- [[library/raw/2026-11-15-llm-evaluators-recognize-and-favor-their-own-generations|LLM Evaluators Recognize and Favor Their Own Generations]]
- [[library/raw/2026-11-15-ye-justice-or-prejudice-llm-judge-biases|Justice or Prejudice? Quantifying Biases in LLM-as-a-Judge]]
- [[library/raw/2026-11-15-zheng-judging-llm-as-a-judge-mt-bench|Zheng et al., Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena]]
