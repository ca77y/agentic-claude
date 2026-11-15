---
name: bootstrap
description: Create a project's board, forge, and testing declarations (`docs/BOARD.md`, `docs/FORGE.md`, `TESTING.md`), its agent instructions and `.claude/rules/`, its Markdown research library, and the root library pointer, or verify and fix existing ones, with optional Obsidian settings, as project setup rather than research, content maintenance, or board and forge operations.
disable-model-invocation: true
---

Set the project up so the rest of the plugin can take it as ground truth. Create what is missing, and fix what exists and is wrong, missing, or unclear, keeping project customizations. This is local setup: it creates no external projects, cards, branches, commits, PRs, or messages, researches nothing, creates no source content, and never touches raw notes or wiki pages.

Setup is complete when all of these hold:

- `docs/BOARD.md` meets `${CLAUDE_SKILL_DIR}/references/board.md`, with every binding true of the tracker. Every project has a board, because every workflow files its work as a card.
- `docs/FORGE.md` meets `${CLAUDE_SKILL_DIR}/references/forge.md`. A project may choose no forge; the file records that instead of inventing one.
- `TESTING.md` meets `${CLAUDE_SKILL_DIR}/references/testing.md`.
- The root instructions and `.claude/rules/` meet `${CLAUDE_SKILL_DIR}/references/instructions.md`.
- `library/` meets `${CLAUDE_SKILL_DIR}/references/scaffold.md`, and works as plain Markdown. An existing root `AGENTS.md` or `CLAUDE.md` holds the library pointer once; none is created for it.
- `.tmp/` is ignored at the root of every checkout, and `docs/specs/`, `docs/spikes/`, and `docs/workflows/` exist and are not ignored.
- Obsidian settings exist only when the user asked for them, and meet `${CLAUDE_SKILL_DIR}/references/obsidian.md`.
- Every choice the repository can't show came from the user and is unambiguous: authority, destinations, transitions, publication, review, testing categories, hard rules, which starter rules to adopt, whether to move to `AGENTS.md`, and the source provider research uses.
- The checks `TESTING.md` declares pass with the new files in place.

Configuring an operation never authorizes running it. If a choice would broaden a permission, report the conflict instead of writing it.

Report the created and updated paths, the existing content kept, and the remaining gaps, including a missing `Deliverable` or `Unreproducible` label and anything the testing harness doesn't run.
