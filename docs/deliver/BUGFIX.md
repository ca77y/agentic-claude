# Deliver bugfix

How `deliver-bugfix` fixes a bug on its own, from a card or a prompt to a reviewed PR. It asks nobody anything while it runs; a halt, or a PR left a draft, says what needs you. A bug it can reproduce has a clear way to check the fix, and the PR shows the evidence: the reproduced behavior and the behavior after the fix.

## Flow

```text
 /slopify:deliver-bugfix SMR-13      or a plain report
 │
 1 READ ──────── scout-card (haiku) reads the issue
 │               a prompt gets a new Bug card from pusher, so every bug is on the board      ⛔ H1
 2 GROUND ────── in parallel: scout-code, scout-tests, scout-history (haiku)
 3 REPRODUCE ─── coder (opus) reproduces it in .tmp/repro/<slug>, touching no production code
 │   ▲ ≤3 tries  lens-repro (haiku) runs it at least 3 times: the same symptom every time
 │   └────────── a try that fails passes its reason to the next one
 │               can't reproduce → the card gets the Unreproducible label and a comment
 │               saying why, and the run stops: no worktree, no PR
 4 WORKSPACE ─── pusher creates and prepares the worktree, starts the issue, and records
 │               the reproduction on the ledger
 ▼
 5 DELIVER ───── the flow in TRIVIAL.md, except:
                 the first test is the reproduction as a regression test
                 validator runs the reproduction's steps again in the app
                 the PR description shows the reproduction: the steps and the behavior
                 before the fix, and the same steps after it
```

Everything else, including the review and its fixes, is as in [`TRIVIAL.md`](TRIVIAL.md).

## The PR description

`writer-pr` writes it as in [`STORY.md`](STORY.md#the-pr-description): four parts, **What changes**, **Needs you**, **Why trust it**, and **Not done**, rewritten whole in every round that opens or updates the PR. Here **What changes** opens with the bug, before and after the fix, and **Why trust it** rests on the reproduction, before the fix and after it. The brief gives `writer-pr` the reproduction's steps and the behavior seen before the fix. There is no `Spec:` line.

## Decisions

- **The reproduction checks the expected behavior.** It fails on the bug, so the same steps pass once the fix is in, and the validator reruns them against the worktree's code. The run's one criterion is the card's **Expected** section, or the whole card when it has none. `lens-repro` fails one that asserts the buggy behavior.
- **The reproduction settles what the report leaves open.** `coder` decides from the evidence and never asks, because the run asks nobody anything while it runs.
- **Why it couldn't reproduce goes on the card.** Either `coder` couldn't make the failure happen, or `lens-repro` found the reproduction doesn't reliably show the reported symptom. The comment says which, with the reason from the last try.
- **A check that can't run is not an unreproducible bug.** When `lens-repro` can't run the reproduction at all, for example because a tool is missing, the run halts and labels nothing.
- **The card isn't started before the bug is reproduced.** An unreproducible bug leaves no branch or worktree behind.
- **A rerun reads the reproduction back from the ledger** and goes straight to the delivery.

## Halt conditions

As in [`TRIVIAL.md`](TRIVIAL.md), plus one: `lens-repro` can't run the reproduction at all (Reproduce) → `blocked`, naming the missing prerequisite, with no label or comment on the card. An unreproducible bug isn't a halt: the run returns `unreproducible`, and the card says why.
