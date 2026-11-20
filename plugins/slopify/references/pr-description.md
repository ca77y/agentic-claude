# PR description

A delivery's pull-request description is for the person who reviews it. It says what the change is, what they must decide, why they can trust it, and what is left, as the run stands now.

## Format

- Four level-2 headings, in this order: `## What changes`, `## Needs you`, `## Why trust it`, `## Not done`. Use no other heading.
- **What changes** and **Why trust it** are always present. **Needs you** and **Not done** appear only when they have something under them.
- The whole description is at most 4,000 characters.
- Current state only, with no process detail: no rulings, fingerprints, round counts, fix-attempt counts, what was tried, agent names, or how the run went. Say what is true of the change now, not how it got there.
- Write for a person: short sentences, one item per line.

## What goes where

- **What changes:** what the change does and why, opening as its kind's line below says.
- **Needs you:** each decision the reviewer must make or confirm, each confirmation (the coder's trivial choices and decisions that change no acceptance criterion), each manual action, and each reason the brief gives for the PR being a draft.
- **Why trust it:** the evidence, as its kind's line below says. Each line matches a result the brief gives, and claims nothing it doesn't.
- **Not done:** every open item the brief gives, each once, including every unfixed finding, and each follow-up card the brief says was filed, named by its identifier with its link.

An unfixed finding goes only under **Not done**, never under **Needs you**.

The whole description claims only what the committed branch and the brief's results show: a count covers only committed tests, a result shown against a stand-in for an outside service is stated as shown against that stand-in, not as how the service behaves, and nothing tried and undone is mentioned.

## Overflow

When everything doesn't fit in 4,000 characters:

- Criteria with the same result and the same evidence share one grouped **Why trust it** line that names each criterion it covers.
- **Needs you** items of one kind may be one grouped line with their count and a link to the committed file that lists them, or else to the card, which lists each in full. A grouped line counts as each of its items appearing under **Needs you**.
- When the brief's Needs you lines are already grouped, keep each grouped line's count as given and link the card it names: the run has commented each of its items in full on that card.

Never link validator evidence.

## Per kind

| Kind     | **What changes** opens with                                     | **Why trust it** rests on                                     |
| -------- | --------------------------------------------------------------- | ------------------------------------------------------------- |
| story    | the card's outcome                                              | the criterion results                                         |
| trivial  | one sentence saying what changed                                | the test and the app run                                      |
| bugfix   | the bug, before and after                                       | the reproduction, failing before the fix and passing after it |
| spike    | the question and its answer, recommending nothing               | the claims checked, and the unknowns                          |
| research | the question and a short answer linking the pages the run added | the citations checked, and the source count                   |

A story's **What changes** also holds its spec folder exactly once, on a line of the form `Spec: <folder>`: plain text, no backticks, the folder relative to the repository root.

## Leak rules

The description never holds:

- an absolute filesystem path, such as a home or checkout path (a URL route or a slash command is not one);
- a reference to `.tmp/`;
- a ledger line, a progress entry included;
- text shaped like a credential, such as a token, key, or password.

A description that breaks a leak rule is never posted.
