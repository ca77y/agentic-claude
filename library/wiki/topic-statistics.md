---
title: Statistics topic map
type: moc
summary: Map of library pages tagged statistics (6 pages at creation).
tags: [statistics]
aliases: []
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-16
updated: 2026-11-16
---

# Statistics topic map

> [!abstract] Map of content
> Error bars, paired comparison, task counts, and repeats for small eval comparisons. Lists every page tagged `statistics`; the tag crossed five pages, so librarian.md requires this map.

## Wiki pages

```dataview
TABLE confidence, updated
FROM "library/wiki"
WHERE type = "wiki" AND contains(tags, "statistics")
SORT updated DESC
```

- [[library/wiki/eval-statistics-for-small-agent-comparisons|Eval statistics for small agent comparisons]]

## Raw notes

```dataview
TABLE source, accessed
FROM "library/raw"
WHERE type = "raw" AND contains(tags, "statistics")
SORT file.name ASC
```

- [[library/raw/2026-11-15-agent-benchmarks-stop-ranking-before-they-run-out-of-tasks|Agent Benchmarks Stop Ranking Before They Run Out of Tasks]]
- [[library/raw/2026-11-15-agent-evaluation-reliability-more-tasks-wont-fix-leaderboard|Agent Evaluation Reliability: More Tasks Won't (Always) Fix An Agent Leaderboard]]
- [[library/raw/2026-11-15-anthropic-statistical-approach-to-model-evals|A statistical approach to model evaluations (Anthropic)]]
- [[library/raw/2026-11-15-length-controlled-alpacaeval|Length-Controlled AlpacaEval (Dubois et al., 2024)]]
- [[library/raw/2026-11-15-miller-adding-error-bars-to-evals|Adding Error Bars to Evals (Miller, arXiv 2411.00640)]]
