---
name: lint
description: Check the whole project research library for broken links, pages missing from the index, frontmatter and tag violations, duplicate sources, and contested or superseded pages, and repair them when asked. Use for library maintenance, not new research.
---

Check the whole `library/` against `library/_meta/librarian.md` and report what's wrong. Repair only when the user asks.

1. Dispatch a fresh `slop-lib:clerk` with the whole library as its scope. Ask it to report:
   - broken wikilinks, block anchors, and Markdown links;
   - pages missing from the index, and index lines without a summary;
   - frontmatter that breaks the schema, and tags missing from the taxonomy;
   - raw notes that share a canonical `source`, and raw notes whose original capture was rewritten rather than appended to (from the git history);
   - wiki pages marked `contested` or `superseded`.
2. Report the findings grouped by kind.
3. When the user asks for repairs, fix the mechanical findings — links, index lines, frontmatter, tags — directly or through `slop-lib:scribe`, and add a lint entry to `_meta/log.md`. A finding that changes what a page claims, such as merging duplicates or resolving a contested page, goes back to the user as `research` work. A new fresh clerk checks the repaired files.

Allow three attempts per repair; on the third failure, stop and return the approaches, why each failed, and what you need.
