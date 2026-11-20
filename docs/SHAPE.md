# Shape

How `shape` turns an idea into a card that a delivery can take as it is. It writes the why and the what, never the how. [`deliver/CARDS.md`](deliver/CARDS.md) says what each kind of card must hold; this document says how `shape` gets there. It follows the rules in [`DESIGN.md`](DESIGN.md).

People own the issue. They say what kind of card they want, read it on the board, answer its open questions, and decide which delivery runs on it. `shape` never decides any of that.

## Flow

```text
 /slopify:shape "idea"   or   {idea?, card?, kind?}
 │
 1 READ ──────── scout-card (haiku) reads the card, when one is named, with its labels and comments
 │               scout-related-cards (haiku) finds duplicates, overlaps, and dependencies
 │               a card labelled Shaped skips 2 and 3, and 4 applies the answers its comments give
 2 GROUND ────── in parallel, by kind: library-reader, scout-code, scout-docs, scout-history,
 │               and, for a story, TESTING.md's categories
 3 ADVISE ────── advisors (opus), by kind
 │               advisor-fit names a card that already holds this outcome → stop:
 │               an idea files nothing and returns that card; a named card is marked its duplicate
 4 DRAFT ─────── writer-card (sonnet) writes the card from the kind's template
 │               it settles what doesn't change the outcome as a labelled assumption,
 │               and marks what does as an open question
 5 CHECK ─────── checks by kind (haiku) and advisor-simplify (opus),
 │               then judge × 1 (opus) rules on the round's findings
 │   ▲ ≤3 revisions a confirmed problem goes back to writer-card
 │   └────────── what is still open after the last round becomes an open question
 6 FILE ──────── pusher creates or updates the card on the board, and labels it Shaped
                 no open question → a story gets the Deliverable label
                 open questions   → listed on the card; answer them there and run shape on the card again
```

## By kind

The kind comes from the user, and is `story` when they don't say. It picks the template, the advisors, and the checks. Everything else is the same.

| Kind  | Template parts                                                                     | Advisors                                                                | Checks                                                                     |
| ----- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| story | summary and why, scope, out of scope, acceptance criteria, assumptions, references | `advisor-value`, `advisor-scope`, `advisor-alternatives`, `advisor-fit` | `lens-template`, `lens-criteria` (with `TESTING.md`), `lens-solution-free` |
| bug   | observed, expected, where or how, assumptions, references                          | `advisor-fit`, for duplicates and related cards                         | `lens-template`                                                            |
| spike | the question, what counts as an answer, conditions, assumptions, references        | `advisor-scope`, for whether the question is bounded; `advisor-fit`     | `lens-template`                                                            |

`lens-template` checks that every required part of the kind is there, and that nothing outside the template is. For every kind, `advisor-simplify` reads each draft for what it could remove, merge, or narrow and still deliver its outcome, since the checks only ask what is missing; the judge rules on its findings with the rest, and writer-card revises by removing. `lens-criteria` checks that each criterion passes or fails by a check `TESTING.md` declares for its category.

## Decisions

- **The card is the checkpoint, and the board is the conversation.** Open questions go on the card, in their own section. A person answers them on the card or in a comment, and runs `shape` on the card again. That run reads the answers, applies them, checks the card again, and updates it. Nothing waits in a session.
- **`Shaped` means the card's grounding and advice are already in it.** `shape` adds it every time it files a card. A rerun on a `Shaped` card skips Ground and Advise and only applies the answers its comments give, then checks the card as fully as the first run did. A card written by hand doesn't have the label, so its first run goes through every phase; to ground a `Shaped` card again, remove the label.
- **`Deliverable` means the card meets the story contract.** It goes on only when no open question is left and every check passed, and comes off when a rerun reopens one.
- **A duplicate stops the run before drafting.** `advisor-fit` judges whether an existing card already holds the same outcome, from what `scout-related-cards` found. An idea it repeats files nothing, and the run returns `duplicate` with that card, to shape instead. The exception is the card an earlier run filed for the same idea: `shape` ends each card with a hidden line naming the run's slug, its words joined by spaces so a board leaves it as written, and `scout-related-cards` reports the card that holds it. A rerun on that idea updates that card instead. A named card it repeats is marked a duplicate of that card through the binding `docs/BOARD.md` declares, which on Linear moves it to `Duplicate`. A rerun on a `Shaped` card skips Advise, so it never checks again.
- **Assumptions don't stop the run.** `shape` settles everything that doesn't change what the card delivers or whom it serves, and states it so a reader can object. Only what changes the outcome becomes an open question.
- **Criteria follow `TESTING.md`.** The writer reads its categories and guidance, so every criterion is one that a category can check.
- **A story has at most 20 acceptance criteria.** More means more than one PR's work, and a spec too big for an agent to read whole. `shape` counts the criteria the writer reports, and a story over the cap goes back to the writer like a confirmed problem: keep the core, and move the rest to Out of scope as follow-up stories. A story still over it after the revisions keeps the question of how to split it under Open questions, so it isn't `Deliverable`.
- **`shape` sets no type label.** Feature, Improvement, Bug, or any other label `docs/BOARD.md` declares is the person's choice. A card that already has one keeps it.
- **`shape` always files.** Its output is the card. The working draft lives under `.tmp/shape/`, and is never the record.

## Halt conditions

| #   | Condition                                                                                         | Found at | What the user gets             |
| --- | ------------------------------------------------------------------------------------------------- | -------- | ------------------------------ |
| H1  | The argument says nothing, or the named card can't be read                                        | Read     | `not-started`, no board write  |
| H2  | Filing or updating the card fails                                                                 | File     | `blocked`, with the draft path |
| H3  | Infrastructure: a stop signal, a required tool denied, or a budget, usage, or agent limit reached | Any      | `blocked`                      |
