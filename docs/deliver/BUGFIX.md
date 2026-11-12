# Deliver bugfix

How `deliver-bugfix` fixes a bug on its own, from a Linear issue or a prompt to a reviewed GitHub PR. Nobody is needed at any point. A bug it can reproduce has a clear way to check the fix, and the PR shows the evidence: the reproduced behavior and the behavior after the fix.

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
 4 WORKSPACE ─── pusher creates the worktree and branch, starts the issue, and records
 │               the reproduction on the ledger
 ▼
 5 DELIVER ───── the flow in TRIVIAL.md, except:
                 the first test is the reproduction as a regression test
                 validator runs the reproduction's steps again in the app
                 the PR has a Reproduced section: the steps and the behavior before the fix
                 the criteria table shows the same steps after it
```

Everything else, including the review and its fixes, is as in [`TRIVIAL.md`](TRIVIAL.md).

## Decisions

- **The reproduction settles what the report leaves open.** `coder` decides from the evidence and never asks, because no human is available.
- **Why it couldn't reproduce goes on the card.** Either `coder` couldn't make the failure happen, or `lens-repro` saw it come and go. The comment says which, with what was tried.
- **A check that can't run is not an unreproducible bug.** When `lens-repro` can't run the reproduction at all, for example because a tool is missing, the run halts and labels nothing.
- **The card isn't started before the bug is reproduced.** An unreproducible bug leaves no branch or worktree behind.
- **A rerun reads the reproduction back from the ledger** and goes straight to the delivery.

## Halt conditions

As in [`TRIVIAL.md`](TRIVIAL.md). An unreproducible bug isn't a halt: the run returns `unreproducible`, and the card says why.
