---
name: bootstrap
description: Create a project's board and forge declarations (`docs/BOARD.md`, `docs/FORGE.md`), its Markdown research library, and the root `CLAUDE.md` library pointer, or verify and fix existing ones, with optional Obsidian settings. Use for project setup, not research, content maintenance, or external board/forge operations.
---

Create or complete `docs/BOARD.md`, `docs/FORGE.md`, and the project's `library/` from repository facts and the user's choices. The library comes from `${CLAUDE_SKILL_DIR}/resources/library/` and works as plain Markdown. This is local setup: it creates no external projects, cards, branches, commits, PRs, or messages, researches nothing, and creates no source content.

1. Inspect the existing declarations, `library/`, and root `CLAUDE.md`. If any exist, verify every entry against the repository, the tracker, the user, and `${CLAUDE_SKILL_DIR}/references/scaffold.md` — the declarations, `library/CLAUDE.md`, `README.md`, the `_meta/` conventions, templates, index, and taxonomy, and the root pointer — and fix what is wrong, missing, or unclear while keeping project customizations. Never touch raw notes or wiki pages.
2. Take what the repository shows, such as the remote, default branch, and conventions. Ask the user about every board, forge, and source-provider choice — authority, destinations, transitions, publication, review, and which source provider research uses — and anything else the conventions need, and keep asking until each one is unambiguous. A project may choose no board or no forge; record that instead of inventing one.
3. Write one short setup spec in the project's spec location, normally `docs/specs/`: scope, facts and their sources, choices, files, what must be preserved, and acceptance, covering the declarations and the library. A fresh `slopify:auditor` validates it; tell it the declarations and library conventions are the outputs being created, not missing prerequisites.
4. Draft the declarations yourself from the templates. Read `${CLAUDE_SKILL_DIR}/references/board.md` for the board declaration and `${CLAUDE_SKILL_DIR}/references/forge.md` for the forge declaration. Produce the library scaffold from `${CLAUDE_SKILL_DIR}/references/scaffold.md` directly or through `slopify:library-scribe` with exclusive paths. If a root `CLAUDE.md` exists, merge the bundled library pointer into its matching section without duplicating it, and add a library entry to its layout when appropriate; if none exists, don't create one, and report that no pointer was added. Add Obsidian settings only when requested, reading `${CLAUDE_SKILL_DIR}/references/obsidian.md` first.
5. A different fresh `slopify:auditor` validates the declarations against the spec, and a fresh `slopify:library-clerk` validates the scaffold against it. Fix and revalidate with new validators.

Configuring an operation never authorizes running it. If a choice would broaden a permission, report the conflict instead of writing it.

Each validation is a new `Agent` dispatch, never a `SendMessage` continuation, so its verdict is independent of the production. Allow three attempts per outcome; on the third failure, stop and return the approaches, why each failed, and what you need.

Report the created and updated paths, the existing content preserved, the validation evidence, and remaining gaps.
