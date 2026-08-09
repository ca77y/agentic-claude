# Library scaffold — file contents

Every file below is written to the target project verbatim, except for the tokens in
`{{DOUBLE_BRACES}}`. Replace every token; change nothing else — the surrounding text is
the shared convention every `ca77y-library` agent already assumes.

Tokens used:

- `{{PROJECT_NAME}}` — the project's name, e.g. `Web Tools`, `Hangboard Companion`.
- `{{TODAY}}` — today's date, `YYYY-MM-DD`, used for every `created`/`updated`/`Last
  Updated` field. Use the same date across every file in one bootstrap pass.
- `{{DOMAIN_ONE_LINER}}` — one sentence naming what this library holds research about,
  confirmed with the user (see `SKILL.md`).
- `{{DOMAIN_TAGS}}` — a bullet list of 5-10 lowercase-kebab-case tags naming the
  concrete things this project's research will be about. If the user gave none, write
  a single line: `<!-- no starter domain tags yet — add them as research lands -->`
  instead of a bullet list.

Templater's own `<% ... %>` placeholders inside the three templates are **not**
tokens — they run at page-creation time inside Obsidian and must be copied as-is.

---

## `library/README.md`

````markdown
# Library

A Markdown-first research wiki for {{PROJECT_NAME}}. It stores research memory and source provenance, not implementation authority. The repository root is an Obsidian vault, so use wikilinks and backlinks for internal navigation.

## Layout

- `raw/` - source notes with provenance preserved
- `wiki/` - synthesis pages built from raw notes
- `_meta/index.md` - library entry point
- `_meta/taxonomy.md` - controlled tag vocabulary
- `_meta/librarian.md` - authoring and maintenance rules
- `_meta/log.md` - maintenance history
- `_meta/templates/` - Templater scaffolds

Read [`_meta/librarian.md`](./_meta/librarian.md) before library work.
````

## `library/CLAUDE.md`

Invariant — no tokens.

````markdown
# Library

A Markdown-first research wiki: evidence and synthesis, not implementation authority. Read `library/_meta/librarian.md` before any library task.

## Rules

- Preserve raw notes and source provenance.
- Cite durable claims from wiki pages back to raw sources or external primary sources.
- Keep generated indexes rebuildable from Markdown and frontmatter.
- Do not require an always-on service, vector database, MCP server, or Obsidian plugin for the library to remain usable.
- Never inspect or record secrets.
````

## `library/_meta/index.md`

````markdown
---
title: Library Index
type: moc
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
TABLE title, tags, updated, confidence
FROM "library/wiki"
WHERE type = "wiki"
SORT updated DESC
```

## Raw Notes

```dataview
TABLE title, source, accessed, up
FROM "library/raw"
WHERE type = "raw"
SORT file.name ASC
```

## Plain-Markdown Fallback

No research pages have been added yet.
````

## `library/_meta/taxonomy.md`

````markdown
---
title: Library Taxonomy
type: moc
tags: []
created: {{TODAY}}
updated: {{TODAY}}
---

# Library Taxonomy

**Status**: Active
**Last Updated**: {{TODAY}}
**Document Scope**: Controlled tags for {{PROJECT_NAME}} research

---

## Core tags

- `index`
- `architecture`
- `reliability`
- `security`
- `performance`
- `operations`

## Domain tags

{{DOMAIN_TAGS}}

## Rules

- Use lowercase kebab-case.
- Prefer stable concepts over one-off labels.
- Add a tag only when it improves retrieval.
- Keep each tag registered exactly once and remove unused terms.
````

## `library/_meta/log.md`

````markdown
---
title: Library Maintenance Log
type: moc
tags: []
created: {{TODAY}}
updated: {{TODAY}}
---

# Library Maintenance Log

**Status**: Active
**Last Updated**: {{TODAY}}
**Document Scope**: Chronological record of library ingest and maintenance

---

## Log

### {{TODAY}}

- Initialized the {{PROJECT_NAME}} research library, templates, index, and taxonomy.
````

## `library/_meta/librarian.md`

Invariant except `{{TODAY}}`. This is the shared operating-conventions file every
library agent (`librarian`, `scribe`, `clerk`, `researcher`) reads before acting —
do not add project-specific rules here; project-specific scope belongs in the root
`CLAUDE.md` pointer instead (see `SKILL.md`, "Wire it into the project's root
`CLAUDE.md`"). Note that the templates bullet below is deliberately silent on any
*other* plugin's scaffolds (e.g. `ca77y-engineering`'s `docs/_templates/`) — this
file must read correctly whether or not that plugin is also installed.

````markdown
# Librarian Instructions

**Status**: Active
**Last Updated**: {{TODAY}}
**Document Scope**: Shared operating rules for the {{PROJECT_NAME}} research library

---

## Role

Maintain `library/` as a Markdown-first research wiki. Role-specific workflows come from the librarian, scribe, clerk, or researcher agent; these conventions apply to every library operation.

## Constraints

- Route all library work through the library/research agents.
- Research is evidence, not a product or architecture decision. Decisions belong in `docs/` or the root `README.md`.
- Preserve `library/raw/`; synthesis never overwrites source notes.
- Never inspect or output secrets or `.env` files.
- Keep core content meaningful as plain Markdown even when plugins are unavailable.

## Obsidian conventions

1. Use wikilinks for internal pages and Markdown links for external URLs.
2. Index every raw and wiki content page in `_meta/index.md`, with a plain-Markdown fallback even when Dataview also lists it.
3. Use block IDs and links such as `[[source-note#^claim-id]]` for granular citations.
4. Give content pages frontmatter with `title`, `type`, `tags`, `aliases`, `created`, `updated`, `up`, and `related`. Raw notes also record `source` and `accessed`; wiki pages record `confidence`.
5. Register every tag in `_meta/taxonomy.md`; use lowercase kebab-case.
6. Use Obsidian callouts for summaries, source excerpts, caveats, and open questions.
7. Remove all template placeholders before finishing a page.
8. Update `_meta/log.md` after ingest, synthesis, taxonomy, or maintenance work.
9. Clean up temporary helper files before handing work back.

## Plugins

- **Dataview**: query frontmatter, but retain a plain-Markdown index fallback.
- **Breadcrumbs**: use valid `up` and `related` wikilinks for page relationships.

## Templates

- Library agents copy `_meta/templates/raw-note.md`, `wiki-page.md`, or `topic-moc.md` directly so research templates remain next to the library conventions and work without plugin configuration.
````

## `library/_meta/templates/raw-note.md`

Invariant — Templater placeholders are copied as-is.

````markdown
---
title: <% tp.file.title %>
type: raw
tags: []
aliases: []
source:
accessed: <% tp.date.now("YYYY-MM-DD") %>
up: "[[Library Index]]"
related: []
created: <% tp.date.now("YYYY-MM-DD") %>
updated: <% tp.date.now("YYYY-MM-DD") %>
---

# <% tp.file.title %>

> [!quote] Source
> **URL**:
> **Accessed**: <% tp.date.now("YYYY-MM-DD") %>
> **Method/Context**:

## Key evidence

-

## Limitations

-

## Relevance

-
````

## `library/_meta/templates/topic-moc.md`

Invariant — Templater placeholders are copied as-is.

````markdown
---
title: <% tp.file.title %>
type: moc
tags: []
aliases: []
up: "[[Library Index]]"
related: []
created: <% tp.date.now("YYYY-MM-DD") %>
updated: <% tp.date.now("YYYY-MM-DD") %>
---

# <% tp.file.title %>

> [!abstract] Map of content
> Overview of this topic and the pages beneath it.

## Wiki pages

```dataview
TABLE confidence, updated
FROM "library/wiki"
WHERE up = this.file.link
SORT updated DESC
```

## Raw notes

```dataview
TABLE source, accessed
FROM "library/raw"
WHERE up = this.file.link
SORT file.name ASC
```
````

## `library/_meta/templates/wiki-page.md`

Invariant — Templater placeholders are copied as-is.

````markdown
---
title: <% tp.file.title %>
type: wiki
status: active
confidence: medium
tags: []
aliases: []
up: "[[Library Index]]"
related: []
created: <% tp.date.now("YYYY-MM-DD") %>
updated: <% tp.date.now("YYYY-MM-DD") %>
---

# <% tp.file.title %>

> [!abstract] Summary
>

## Claims

- Claim with citation to a source block ID

## Design considerations

-

## Related pages

-

## Open questions

> [!question]
>

## Sources

- [[raw-note]]
````

## `library/raw/README.md`

Invariant — no tokens.

````markdown
# Raw Research Notes

Preserve source material and provenance here. Create notes from [`../_meta/templates/raw-note.md`](../_meta/templates/raw-note.md) through the research-library workflow.
````

## `library/wiki/README.md`

Invariant — no tokens.

````markdown
# Research Wiki

Store cited synthesis built from raw notes here. Create pages from [`../_meta/templates/wiki-page.md`](../_meta/templates/wiki-page.md) through the research-library workflow.
````

## Root `CLAUDE.md` pointer section

Append (or merge into an existing similarly-named section) — adapt the wording to
match the surrounding file's voice rather than pasting this verbatim over existing
content:

````markdown
## Library

Read `library/_meta/librarian.md` before library work. Preserve raw notes and cite durable claims back to sources; no always-on service is required for the library to work.
````
