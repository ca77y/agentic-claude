# Librarian Instructions

**Status**: Active
**Last Updated**: {{TODAY}}
**Document Scope**: Shared operating rules for the {{PROJECT_NAME}} research library

---

## Role

Maintain `library/` as a Markdown-first research wiki. These conventions apply to every library operation. The entry-point owner coordinates evidence and assigns exclusive write paths.

## Constraints

- The library entry-point owner may produce artifacts directly or designate one scribe as the sole integration writer. Only that owner writes synthesis and shared metadata at a time.
- Bounded existing-knowledge retrieval is read-only; new-source research returns evidence without persistence. Assigned raw-note writers use disjoint paths and may defer shared metadata explicitly.
- Wait for outstanding raw-note writes before integration. The integration owner completes index, taxonomy, and provenance-log updates before final validation.
- Every validation is report-only and uses a newly dispatched clerk, including spec readiness and final evidence/library checks; corrections require a different fresh clerk. Nontrivial persistence requires validated scope before writes.
- {{SOURCE_PROVIDER_GUIDANCE}}
- Research is evidence, not a product or architecture decision. Decisions belong in `docs/` or the root `README.md`.
- Preserve `library/raw/`; synthesis never overwrites source notes.
- Never inspect or output secrets or `.env` files.
- Keep core content meaningful as plain Markdown even when plugins are unavailable.

## Obsidian conventions

1. Use wikilinks for internal pages and Markdown links for external URLs.
2. Full ingest indexes raw and wiki content pages in `_meta/index.md`, with a plain-Markdown fallback even when Dataview also lists it. Explicit raw-note-only batches defer this shared write to the integration owner before completion.
3. Use block IDs and links such as `[[source-note#^claim-id]]` for granular citations.
4. Give content pages frontmatter with `title`, `type`, `tags`, `aliases`, `created`, `updated`, `up`, and `related`. Raw notes also record `source` and `accessed`; wiki pages record `confidence`.
5. Use lowercase kebab-case tags registered in `_meta/taxonomy.md`. Raw-note-only writers use existing tags and report proposed additions for full ingest.
6. Use Obsidian callouts for summaries, source excerpts, caveats, and open questions.
7. Remove all template placeholders before finishing a page.
8. Update `_meta/log.md` after full ingest, synthesis, taxonomy, or authorized maintenance work. Raw-note-only writers return deferred log information in their report; they never write shared metadata.
9. Clean up temporary helper files before handing work back.

## Plugins

- **Dataview**: query frontmatter, but retain a plain-Markdown index fallback.
- **Breadcrumbs**: use valid `up` and `related` wikilinks for page relationships.

## Templates

- Content writers copy `_meta/templates/raw-note.md`, `wiki-page.md`, or `topic-moc.md` directly so research templates remain next to the library conventions and work without plugin configuration.
