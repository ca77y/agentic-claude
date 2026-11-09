# Deliver bugfix

How `deliver-bugfix` fixes a bug on its own, from a Linear issue or a prompt to a reviewed GitHub PR. Nobody is needed at any point. A bug it can reproduce has a clear way to check the fix, and the PR shows the evidence: the reproduced behavior and the behavior after the fix.

## Flow

```text
 /slopify:deliver-bugfix SMR-13      or a plain report
 │
 1 REPRODUCE ─── reproduce-bug, as a child workflow, hands-free
 │               scouts gather evidence
 │               coder builds a reproduction, touching no production code
 │               lens-repro runs it at least 3 times
 │               writer writes the report, lens-bug-report checks it → pusher files the Bug card
 │               (a card that already reports the bug is kept, and only reproduced)
 │               can't reproduce → label the card Unreproducible, comment, and stop, no PR   ⛔
 ▼
 2 DELIVER ───── the flow in TRIVIAL.md, except:
                 the first test is the reproduction as a regression test
                 validator runs the reproduction's steps again in the app
                 the PR has a Reproduced section: the steps and the behavior before the fix
                 the criteria table shows the same steps after it
```

`reproduce-bug` writes a report that says what it decided rather than asking, because no human is available. Run alone, `/slopify:reproduce-bug` still asks.

Everything else, including the review and its fixes, is as in [`TRIVIAL.md`](TRIVIAL.md).

## Halt conditions

As in [`TRIVIAL.md`](TRIVIAL.md), plus one: the bug can't be reproduced. The run returns `blocked`, and no PR is opened, because there would be no way to check a fix. The card gets the `Unreproducible` label and a comment with what was tried. When no card reports the bug, the run creates one from the report first, so a failed reproduction always ends on a card.
