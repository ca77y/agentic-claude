---
name: bootstrap
description: Create a project's Markdown research library, or verify and fix an existing library's configuration, with optional Obsidian settings. Use for library setup, not research or content maintenance.
---

Create or complete the project's `library/` from `${CLAUDE_SKILL_DIR}/resources/library/`. The library works as plain Markdown. Setup creates the structure, instructions, navigation, taxonomy, log, and templates; it researches nothing and creates no source content.

1. Read `${CLAUDE_SKILL_DIR}/references/scaffold.md` for the resource map and substitutions, and inspect the existing library and root `CLAUDE.md`. Create missing files. Verify existing configuration — `library/CLAUDE.md`, `README.md`, the `_meta/` conventions, templates, index, and taxonomy, and the root pointer — against the scaffold, and fix what is wrong or missing while keeping project customizations. Never touch raw notes or wiki pages.
2. Ask which source provider research should use, and anything else the conventions need, until every rule is unambiguous; record the answers in the conventions.
3. Write a short setup spec in the project's spec location, normally `docs/specs/`: scope, choices, files, what must be preserved, and acceptance. A fresh `slop-lib:clerk` validates it; tell it the library conventions are the outputs being created, not missing prerequisites.
4. Produce the scaffold directly or through `slop-lib:scribe` with exclusive paths. Merge the bundled library pointer into an existing `CLAUDE.md` section without duplicating it; don't create a `CLAUDE.md` just for the pointer. Add Obsidian settings only when requested, reading `${CLAUDE_SKILL_DIR}/references/obsidian.md` first.
5. A different fresh `slop-lib:clerk` validates the scaffold against the spec. Fix and revalidate with a new clerk.

Each validation is a new `Agent` dispatch, never a `SendMessage` continuation, so its verdict is independent of the production. Allow three attempts per outcome; on the third failure, stop and return the approaches, why each failed, and what you need.

Report the created and updated paths, the existing content preserved, the validation evidence, and remaining gaps.
