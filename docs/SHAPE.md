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

## Splitting a request

`shape` with `split: true` turns one larger request, given as `idea`, into several small story cards. It takes no `card` and no kind but story, and `cap`, when given, must be a whole number of 1 or more; otherwise it returns `not-started` before any agent works, saying what to fix.

```text
 /slopify:shape {idea, split: true, cap?}
 │
 1 READ ──────── scout-related-cards (haiku) finds cards related to the whole request
 2 GROUND ────── once, for the whole request, as for one story: library-reader, scout-code, scout-docs
 3 PLAN ──────── writer-split (sonnet) returns every part the request needs, uncapped: each part's outcome and
 │               the parts it depends on, the constraints that hold for the whole set, the cap the request states,
 │               and what it leaves out, with why
 4 COVER ─────── for each part: scout-related-cards looks for the card holding the part's hidden line,
 │               then the story advisors judge the part, and advisor-fit names a card that already holds it
 │               a covered part takes no slot and files nothing
 5 SELECT ────── the open parts in dependency order, up to the cap; the rest are left out, over the cap
 6 WAVES ─────── up to four parts at a time: writer-card drafts each, Check refines it as for one card,
                 then pusher files the wave's cards one by one, in order,
                 each blocked by the cards of the parts it depends on and related to the cards that overlap it
```

The cap is the `cap` arg when given; otherwise the cap the request states, and never more than 20. Selection alone applies it: `writer-split` plans every part and is never told a cap, so the report can name what the cap left out. A run never asks `pusher` for more creates than its cap.

The selected parts are drafted in waves of up to four, and each wave's cards are filed in order before the next wave is drafted, so a dependency's card exists before a dependent's create names it as blocked-by.

Each split card ends with a hidden line naming the request's slug and the part's key, so two requests never share one, and a rerun on the same request finds the cards an earlier run filed and counts their parts as covered. A relation names only a card the run checked against the part's related cards, a covering card, or a card this run filed; an id a model chose counts only when it is the bare identifier, or a whole token, of a location the part's scout reported.

The run returns `done` with the cards it filed and a report that names every planned part once: filed, with its card, whether it is `Deliverable`, and its open questions; covered, with the card that covers it; or left out, with the reason, which is the planner's own, the cap it went over, or the required parts it still lacked after the revisions.

## Decisions

- **The card is the checkpoint, and the board is the conversation.** Open questions go on the card, in their own section. A person answers them on the card or in a comment, and runs `shape` on the card again. That run reads the answers, applies them, checks the card again, and updates it. Nothing waits in a session.
- **`Shaped` means the card's grounding and advice are already in it.** `shape` adds it every time it files a card. A rerun on a `Shaped` card skips Ground and Advise and only applies the answers its comments give, then checks the card as fully as the first run did. A card written by hand doesn't have the label, so its first run goes through every phase; to ground a `Shaped` card again, remove the label.
- **`Deliverable` means the card meets the story contract.** It goes on only when no open question is left and every check passed, and comes off when a rerun reopens one.
- **A duplicate stops the run before drafting.** `advisor-fit` judges whether an existing card already holds the same outcome, from what `scout-related-cards` found. An idea it repeats files nothing, and the run returns `duplicate` with that card, to shape instead. The exception is the card an earlier run filed for the same idea: `shape` ends each card with a hidden line naming the run's slug, its words joined by spaces so a board leaves it as written, and `scout-related-cards` reports the card that holds it. A rerun on that idea updates that card instead. A named card it repeats is marked a duplicate of that card through the binding `docs/BOARD.md` declares, which on Linear moves it to `Duplicate`. A rerun on a `Shaped` card skips Advise, so it never checks again.
- **Assumptions don't stop the run.** `shape` settles everything that doesn't change what the card delivers or whom it serves, and states it so a reader can object. Only what changes the outcome becomes an open question.
- **Criteria follow `TESTING.md`.** The writer reads its categories and guidance, so every criterion is one that a category can check.
- **`shape` sets no type label.** Feature, Improvement, Bug, or any other label `docs/BOARD.md` declares is the person's choice. A card that already has one keeps it.
- **A split never files more than its cap.** The cap is the user's `cap` when given. A cap read from the request can lower the limit of 20, and never raises it.
- **A part another card already covers files nothing.** The report names that card instead. Covered cards are never changed: a split only creates cards, and changes no existing card, not even to add a relation.
- **Constraints that hold for the whole set go to every card.** `writer-split` returns them once, and each part's card idea carries all of them.
- **A part still missing a required part is not filed.** In a split, writer-card reports each template part of its draft with its word count; a required part that is absent or empty is a problem for the revisions, and a draft still missing one after them is left out, and the report names what it lacks.
- **A relation without a binding stops the run before that card is created.** When a relation the pusher brief names has no Create binding in `docs/BOARD.md`, pusher creates nothing and reports it unmet, so the run halts with no card filed without its relations.
- **`shape` always files.** Its output is the card. The working draft lives under `.tmp/shape/`, and is never the record.

## Halt conditions

| #   | Condition                                                                                                                    | Found at | What the user gets             |
| --- | ---------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------ |
| H1  | The argument says nothing, or the named card can't be read                                                                   | Read     | `not-started`, no board write  |
| H2  | Filing or updating the card fails; in a split, cards filed before it stay filed, and a rerun finds them by their hidden line | File     | `blocked`, with the draft path |
| H3  | Infrastructure: a stop signal, a required tool denied, or a budget, usage, or agent limit reached                            | Any      | `blocked`                      |
