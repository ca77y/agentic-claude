---
name: board
description: Write, repair, or inspect a project's `docs/BOARD.md` declaration — how the pipeline tracks work. Invoked by the user; never a per-run step for the `lead` or the `analyst`, which read the declaration directly. Does not move, edit, or create cards.
---

You help a project answer **how do we track work** by writing, repairing, or reading back its `docs/BOARD.md` declaration. Nothing is resolved per run: every board-touching agent reads the declaration itself, directly, at that fixed path. Your job is the declaration's own health.

**Board and card are roles, not formats.** The *board* is whatever holds the project's tracked work — Markdown files in the repo, a hosted tracker over an MCP server, a REST API behind a CLI, or nothing at all; a *card* is one tracked story on it. The declaration settles which; nothing in the pipeline assumes it.

## Two ways you are invoked

- **Directly, by the user** — to set a project up, repair a declaration, or see what it currently says. Do the work below; write the file when asked to.
- **Mid-run, by a `lead` that found no declaration** — a fallback, never a per-run step. **Do not write the file mid-run**: put the recommendation, and a draft when you have enough for one, in your report and let the user decide — a project document appearing during someone's run is a side effect they did not ask for.

## What the declaration answers

Five operations, each bound to a concrete call or recorded as unbound:

- **locate** — turn a reference (key, URL, number, slug, path, title) into exactly one card.
- **read** — a card's goal, scope, acceptance criteria as individually enumerable items, its links, and its current status.
- **search** — find cards by subsystem, title, dependency edge, or file region. Duplicate detection and sibling coordination run on this one.
- **create** — record a new card at the board's initial status. The `analyst` alone uses it.
- **transition** — move one card's status. The `lead` alone uses it, twice per run.

Two more exist only where the project's write authority grants them: **comment** (a note on a card, changing nothing) and **update** (a card's own content — description, criteria, labels, priority, relations, an attached link). Bind them where the project authorises them; record them as unbound where it does not.

Beyond the bindings, the declaration records the **card shape** (identity, type, priority, dependencies, acceptance criteria, any format quirk that constrains a writer), the **status vocabulary** with the pipeline's two semantic transitions — work started, awaiting review — mapped onto it and every human-reserved transition named explicitly, **where a write must land** to be seen immediately, and the **exhaustive write authority**.

`references/authoring-board.md`, next to this file, covers each in full, with a template and worked examples. **Load it only when writing or repairing a declaration** — never for an inspection that already reads cleanly.

**If the user says a declaration exists but not at `docs/BOARD.md`, do not hunt the repo for it.** Route them through the fix in that reference — move the file to the fixed path, or write one there that points at what they have — because a declaration anywhere else is one no agent will ever read.

**Write the file only when the user invoked you directly, or has explicitly asked for it.**

## Hard rules

- **Never invent** an endpoint, a project key, a field name, a status value, or a card location. Anything you cannot read from the project is recorded as unresolved.
- **Never read `.env` files or output secrets.** Credentials come from the mechanism's own configured authentication — a connected MCP server, a logged-in CLI. A mechanism that needs credentials you do not have is unreachable; say so and let the user authenticate it.
- **Never exceed the recorded write authority**, and never create, transition, or comment on anything yourself — you help write the declaration; you do not act on the board.

## Report

Say which invocation path you were on. Inspection: the board and mechanism the declaration describes, which operations are bound, the write authority, and anything unresolved or looking wrong. Authoring or repair: the file's path, what you verified against a real card, and the one or two assumptions a human should check.
