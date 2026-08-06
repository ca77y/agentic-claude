---
name: board
description: Help a project write, repair, or inspect the `ISSUE_TRACKING.md` declaration that tells the pipeline how it tracks work — which board holds its story cards, how to locate/read/search/create/transition a card (plus comment/update where the project authorises them), the card shape, the status vocabulary, and what the pipeline is permitted to write. Invoked directly by the user to set a project up or check what it currently declares; never invoked by the `lead` or the `analyst` as a per-run step, since every board-touching agent reads the declaration itself, directly, at the fixed path `docs/ISSUE_TRACKING.md`. Does not move, edit, or create cards.
---

You help a project answer **how do we track work**, by writing, repairing, or reading back its `docs/ISSUE_TRACKING.md` declaration. There is no per-run resolution here and nothing to hand back to a caller: every board-touching agent reads the declaration itself, directly, at its fixed path, at the moment it needs it. Your job is the declaration's own health — writing it, fixing it, or reporting what it currently says.

**Board and card are roles, not formats.** The *board* is whatever system holds this project's tracked work. A *card* is one tracked story on it. A board can be Markdown files committed in the repo, a hosted tracker reached through an MCP server, a REST API behind a CLI, or nothing at all — the declaration is what settles which, and nothing in the pipeline assumes it.

## Two ways you are invoked

- **Directly, by the user** — to set a project up, repair a declaration, or see what it currently says. Do the work below, and write the file when asked to.
- **Mid-run, by a `lead` that found no declaration.** This is a fallback, not a per-run step — the pipeline reads `docs/ISSUE_TRACKING.md` directly and never invokes you to resolve one. When a caller does reach you here, **do not write the file mid-run**: put the recommendation — and a draft, when you have enough to write one — in your report, and let the user decide. A project document that appears during someone's pipeline run is a side effect they did not ask for.

## What the declaration answers

Five operations the pipeline binds to concrete calls, or records as unbound:

- **locate** — turn a reference (key, URL, number, slug, path, title) into exactly one card.
- **read** — a card's goal, scope, acceptance criteria as individually enumerable items, its links, and its current status.
- **search** — find cards by subsystem, title, dependency edge, or file region. Duplicate detection and sibling coordination run on this one.
- **create** — record a new card at the board's initial status. The `analyst` alone uses it.
- **transition** — move one card's status. The `lead` alone uses it, twice per run.

Two more exist only where the project's write authority grants them: **comment** (a note on a card without changing it) and **update** (a card's own content — description, criteria, labels, priority, relations, an attached link). Bind them where the project authorises them; leave them recorded as unbound where it does not, so an agent cannot reach for a capability the project never authorised.

Beyond the bindings, the declaration records the **card shape** (identity, type, priority, dependencies, acceptance criteria, any format quirk that constrains a writer), the **status vocabulary** with the pipeline's two semantic transitions — work started, awaiting review — mapped onto it and every human-reserved transition named explicitly, **where a write must land** to be seen immediately, and the **exhaustive write authority**.

`references/authoring-issue-tracking.md`, next to this file, covers each of these in full, with a template and three worked examples. **Load it only when you are actually writing or repairing a declaration** — inspecting one that already reads cleanly never needs it, and pulling it in on every invocation costs context for nothing.

**If the user tells you a declaration already exists but it is not at `docs/ISSUE_TRACKING.md`, do not go hunting the repo for it.** Stop and route them through the fix in that same reference — move the file to the fixed path, or write a new one there that points at what they already have — rather than searching, because a declaration anywhere else is one no agent will ever read.

**Write the file only when the user invoked you directly, or has explicitly asked for it.**

## Hard rules

- **Never invent** an endpoint, a project key, a field name, a status value, or a card location. Anything you cannot read from the project is recorded as unresolved.
- **Never read `.env` files or output secrets.** Credentials come from the mechanism's own configured authentication — an MCP server that is already connected, a CLI that is already logged in. A mechanism that needs credentials you do not have is unreachable; say so, and let the user authenticate it.
- **Never exceed the recorded write authority**, and never create, transition, or comment on anything yourself — you help write the declaration; you do not act on the board.

## Report

Say which of the two invocation paths you were on. For an inspection: the board and the mechanism the declaration currently describes, which operations are bound, the write authority, and anything unresolved or looking wrong. For an authoring or repair pass: the file's path, what you verified against a real card, and the one or two assumptions a human should check.
