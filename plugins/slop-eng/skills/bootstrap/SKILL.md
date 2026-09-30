---
name: bootstrap
description: Create a project's board and forge declarations (`docs/BOARD.md`, `docs/FORGE.md`) from project facts and user choices, or verify and fix existing ones. Use for engineering setup, not ordinary implementation or external board/forge operations.
---

Create or complete `docs/BOARD.md` and `docs/FORGE.md` from repository facts and the user's choices. This is local setup: it creates no external projects, cards, branches, commits, PRs, or messages.

1. If declarations exist, verify every entry against the repository, the tracker, and the user, and fix what is wrong, missing, or unclear while keeping what still holds.
2. Take what the repository shows, such as the remote, default branch, and conventions. Ask the user about every choice that sets an action or a rule — authority, destinations, transitions, publication, review — and keep asking until each one is unambiguous. A project may choose no board or no forge; record that instead of inventing one.
3. Write a short setup spec in the project's spec location, normally `docs/specs/`: scope, facts and their sources, choices, files, what must be preserved, and acceptance. A fresh `slop-eng:auditor` validates it; tell it the declarations are the outputs being created, not missing prerequisites.
4. Draft the declarations yourself from the templates. Read `${CLAUDE_SKILL_DIR}/references/board.md` for the board declaration and `${CLAUDE_SKILL_DIR}/references/forge.md` for the forge declaration.
5. A different fresh `slop-eng:auditor` validates the declarations against the spec. Fix and revalidate with a new auditor.

Configuring an operation never authorizes running it. If a choice would broaden a permission, report the conflict instead of writing it.

Each validation is a new `Agent` dispatch, never a `SendMessage` continuation, so its verdict is independent of the drafting. Allow three attempts per outcome; on the third failure, stop and return the approaches, why each failed, and what you need.

Report the created and updated paths, the existing content preserved, the validation evidence, and remaining gaps.
