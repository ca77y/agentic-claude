# Card templates

The general format and the required parts of each kind of card. A project's `docs/BOARD.md` adapts each part to its issue store: the heading, field, or label that holds it. `writer-card` writes to these templates through that mapping, and `bootstrap` checks that the mapping covers every part.

A card holds intent, never the state of the code: no code locations, and no description of how the code behaves now. The code can change while the card waits, so each run reads it when it starts.

## Story

- **Title**: the outcome, as an action.
- **Summary**: one paragraph.
- **Why**: who benefits, and what it costs not to do it.
- **Scope**: what the change covers.
- **Out of scope**: what it must not touch.
- **Acceptance criteria**: one behavior each, stated so that it passes or fails with nothing in between. Each is checkable the way `TESTING.md` says to check its category, within what that category permits: a category with a relaxed process, such as one for a physical device, allows a criterion that only that process can check.
- **Assumptions**, when any: what was settled without asking.
- **Open questions**, when any: what only a person can settle, because it changes what the card delivers or whom it serves. A person answers them on the card.
- **References**, when any: links and prior cards.

## Bug

- **Title**: the failure, as a user meets it.
- **Observed**: what happens, with any error or output.
- **Expected**: what should happen instead.
- **Steps or input**: what shows it, as a user meets it, as far as known.
- **Assumptions**, when any.
- **Open questions**, when any.
- **References**, when any.

## Spike

- **Title**: the question, short.
- **Question**: bounded, stated so that it can be answered.
- **What counts as an answer**: a yes or no, a value or range, or the conditions under which something holds.
- **Conditions**, when they matter: the environment, versions, or scale an answer must hold for.
- **Assumptions**, when any.
- **Open questions**, when any.
- **References**, when any.
