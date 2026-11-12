# Shape

How `shape` turns an idea into a Linear issue that a delivery can take as it is. It writes the why and the what, never the how. [`deliver/CARDS.md`](deliver/CARDS.md) says what each kind of card must hold; this document says how `shape` gets there. It follows the rules in [`DESIGN.md`](DESIGN.md).

People own the issue. They say what kind of card they want, read it on Linear, answer its open questions, and decide which delivery runs on it. `shape` never decides any of that.

## Flow

```text
 /slopify:shape "idea"   or   {idea?, card?, kind?}
 │
 1 READ ──────── scout-card (haiku) reads the card, when one is named, with its comments
 │               scout-related-cards (haiku) finds duplicates, overlaps, and dependencies
 2 GROUND ────── in parallel, by kind: library-reader, scout-code, scout-docs, scout-history,
 │               and, for a story, TESTING.md's categories
 3 ADVISE ────── advisors (opus), by kind
 4 DRAFT ─────── writer-card (opus) writes the card from the kind's template
 │               it settles what doesn't change the outcome as a labelled assumption,
 │               and marks what does as an open question
 5 CHECK ─────── checks by kind (haiku), then judge × N (opus), one per finding
 │   ▲ ≤3 rounds a confirmed problem goes back to writer-card
 │   └────────── what is still open after the last round becomes an open question
 6 FILE ──────── pusher creates or updates the card on Linear
                 no open question → a story gets the Deliverable label
                 open questions   → listed on the card; answer them there and run shape on the card again
```

## By kind

The kind comes from the user, and is `story` when they don't say. It picks the template, the advisors, and the checks. Everything else is the same.

| Kind  | Template parts                                                                     | Advisors                                                                | Checks                                                                     |
| ----- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| story | summary and why, scope, out of scope, acceptance criteria, assumptions, references | `advisor-value`, `advisor-scope`, `advisor-alternatives`, `advisor-fit` | `lens-template`, `lens-criteria` (with `TESTING.md`), `lens-solution-free` |
| bug   | observed, expected, where or how, assumptions, references                          | `advisor-fit`, for duplicates and related cards                         | `lens-template`                                                            |
| spike | the question, what counts as an answer, conditions, assumptions, references        | `advisor-scope`, for whether the question is bounded                    | `lens-template`, `lens-question`                                           |

`lens-template` checks that every required part of the kind is there, and that nothing outside the template is. `lens-criteria` checks that each criterion is one observable behavior that a `TESTING.md` category can check, following its guidance. `lens-question` checks that the question can be answered as bounded.

## Decisions

- **The card is the checkpoint, and Linear is the conversation.** Open questions go on the card, in their own section. A person answers them on the card or in a comment, and runs `shape` on the card again. That run reads the answers, applies them, checks the card again, and updates it. Nothing waits in a session.
- **`Deliverable` means the card meets the story contract.** It goes on only when no open question is left and every check passed, and comes off when a rerun reopens one.
- **Assumptions don't stop the run.** `shape` settles everything that doesn't change what the card delivers or whom it serves, and states it so a reader can object. Only what changes the outcome becomes an open question.
- **Criteria follow `TESTING.md`.** The writer reads its categories and guidance, so every criterion is one that a category can check.
- **`shape` sets no type label.** Feature, Improvement, Bug, or any other label `docs/BOARD.md` declares is the person's choice. A card that already has one keeps it.
- **`shape` always files.** Its output is the Linear issue. The working draft lives under `.tmp/shape/`, and is never the record.

## Halt conditions

| #   | Condition                                                                                         | Found at | What the user gets             |
| --- | ------------------------------------------------------------------------------------------------- | -------- | ------------------------------ |
| H1  | The argument says nothing, or the named card can't be read                                        | Read     | `not-started`, no board write  |
| H2  | Filing or updating the card fails                                                                 | File     | `blocked`, with the draft path |
| H3  | Infrastructure: a stop signal, a required tool denied, or a budget, usage, or agent limit reached | Any      | `blocked`                      |
