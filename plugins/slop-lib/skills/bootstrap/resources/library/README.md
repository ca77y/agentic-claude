# Library

A Markdown-first research wiki for {{PROJECT_NAME}}. It stores research memory and source provenance, not implementation authority. It is Obsidian-compatible with the repository root as the vault: internal wikilinks and Dataview paths resolve from there, and everything reads as plain Markdown without Obsidian.

## Layout

- `raw/` - append-only source notes with provenance
- `wiki/` - synthesis pages built from raw notes
- `_meta/index.md` - library entry point
- `_meta/taxonomy.md` - controlled tag vocabulary
- `_meta/librarian.md` - authoring and maintenance rules
- `_meta/log.md` - maintenance history
- `_meta/templates/` - Templater scaffolds

Read [`_meta/librarian.md`](./_meta/librarian.md) before library work.
