---
title: Operations topic map
type: moc
summary: Map of library pages tagged operations (7 pages at creation).
tags: [operations]
aliases: []
up: "[[library/_meta/index|Library Index]]"
related: []
created: 2026-11-16
updated: 2026-11-16
---

# Operations topic map

> [!abstract] Map of content
> Running evals in practice: harness run layouts, logs, viewers, and output formats. Lists every page tagged `operations`; the tag crossed five pages, so librarian.md requires this map.

## Wiki pages

```dataview
TABLE confidence, updated
FROM "library/wiki"
WHERE type = "wiki" AND contains(tags, "operations")
SORT updated DESC
```


## Raw notes

```dataview
TABLE source, accessed
FROM "library/raw"
WHERE type = "raw" AND contains(tags, "operations")
SORT file.name ASC
```

- [[library/raw/2026-11-15-inspect-ai-log-files|Inspect AI Log Files]]
- [[library/raw/2026-11-15-inspect-ai-log-viewer|Inspect AI Log Viewer]]
- [[library/raw/2026-11-15-lm-evaluation-harness-evaluation-tracker|lm-evaluation-harness evaluation_tracker.py]]
- [[library/raw/2026-11-15-lm-evaluation-harness-user-guide|lm-evaluation-harness User Guide (interface.md)]]
- [[library/raw/2026-11-15-promptfoo-command-line|promptfoo Command Line]]
- [[library/raw/2026-11-15-promptfoo-output-formats|promptfoo Output Formats]]
- [[library/raw/2026-11-15-swe-bench-evaluation-guide|SWE-bench Evaluation Guide]]
