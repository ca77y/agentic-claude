# Library integrity

Check the files in scope and what they affect — citations, frontmatter against the schema in `library/_meta/librarian.md`, anchors, index lines and their summaries, registered tags, and log claims — against the actual files and the project conventions. Template expressions inside template files are intentional; leftover author instructions in content are findings.

Resolve wikilinks, heading and block anchors, and Markdown links as the conventions define them, and separate an ambiguous match from a demonstrably broken target. Check that metadata the raw-note writers deferred was completed by the integrator, and tell an unsynthesized raw note apart from missing navigation.

Each index line's title and summary match its note's frontmatter `title` and `summary` word for word; quote each mismatch. Each raw note in scope has a `summary` that claims nothing its body doesn't: compare it with the key evidence and Limitations, and report a summary that drops a hedge they state, such as reading only an abstract, or a claim of "only" or "none" that rests on a search.

In a raw note, each block ID is unique within the note, and a line ends with at most one; an ID in the middle of a line is a mention, not a block. Every block a wiki page cites exists in the note it names.
