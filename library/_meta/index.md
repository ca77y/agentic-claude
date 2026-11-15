---
title: Library Index
type: moc
summary: Entry point to the agentic-slop research library
tags:
  - index
aliases:
  - Library Index
created: 2026-11-15
updated: 2026-11-15
---

# Library Index

Research behind the agentic-slop Claude Code plugins.

## Wiki Pages

```dataview
TABLE summary, confidence, status, updated
FROM "library/wiki"
WHERE type = "wiki"
SORT updated DESC
```

## Raw Notes

```dataview
TABLE summary, source, accessed
FROM "library/raw"
WHERE type = "raw"
SORT file.name ASC
```

## Plain-Markdown Index

One line per page: `- [[path|title]] — summary (updated YYYY-MM-DD)`.

No research pages have been added yet.
