---
title: Library Index
type: moc
summary: Entry point to the {{PROJECT_NAME}} research library
tags:
  - index
aliases:
  - Library Index
created: {{TODAY}}
updated: {{TODAY}}
---

# Library Index

{{DOMAIN_ONE_LINER}}

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
