# Deliver trivial

How `deliver-trivial` takes a trivial story from a card or a prompt to a reviewed PR. There is no spec, and the issue or prompt says everything. It follows the rules in [`ARCHITECTURE.md`](../ARCHITECTURE.md) and takes the review from [`STORY.md`](STORY.md). `deliver-bugfix` is the same flow; see [`BUGFIX.md`](BUGFIX.md).

## Flow

```text
 /slopify:deliver-trivial SMR-12     or a plain prompt
 │
 1 READ ──────── scout-card (haiku) reads the issue, scout-checkpoint (haiku) the run state ⛔ H5
 │               a prompt gets a new card from pusher, so all work is on the board  ⛔ H1
 │               a card that lists open questions stops the run with a comment  ⛔ H6
 2 WORKSPACE ─── pusher (sonnet) creates and prepares the worktree, starts the issue
 3 BUILD ─────── coder (opus) writes a failing test → commit
 │   ▲ ≤3 tries  coder (opus) makes it pass → commit
 │   │           checks (haiku) runs the TESTING.md checks
 │   │           qa (sonnet) checks the change and its history
 │   └────────── simplifier (opus) finds code the change doesn't need
 │               scout-docs (haiku) finds docs the diff affects
 │               writer-docs (sonnet) fixes them, only if it found any → commit
 4 VALIDATE ──── validator (sonnet) runs the app as TESTING.md says, once
 5 PUSH ──────── writer-pr (opus) writes the PR description whole
 │               code checks its headings, length, and leaks                        ⛔ H4
 │               pusher pushes, opens the PR ready, which fires the review          ⛔ H2
 6 REVIEW ────── watcher (haiku) reads the findings
 │   ▲ ≤3 fix    judge × 1 (opus) rules on every finding
 │   │  rounds   each blocker/major that isn't a docs finding: failing test → commit → coder → commit → checks
 │   │           scout-docs; writer-docs fixes what it found and each docs finding → commit
 │   │           writer-pr rewrites the description
 │   └────────── pusher pushes and requests the review
 ▼
 clean → PR ready, card updated as docs/BOARD.md declares      not clean → PR turns draft, saying why
```

## What differs from `deliver-story`

- **No how phase:** no designs, advisors, spec, or challenge.
- **No label:** this flow doesn't need `Deliverable`, so it can start from a prompt. A prompt always gets a card first. A card that still lists open questions is refused, because with no spec phase nothing would settle them: the run comments on the card and returns `not-started`.
- **Checks inside the inner loop:** a fix isn't validated until the project's checks pass.
- **`qa` and `simplifier` check only the first change**, on each of its tries. A review fix has only the checks, except one whose test may pass on the current code, a `test`-kind fix or a guard of behavior the code already has: `qa` proves it by breaking the behavior it states, and `simplifier` then checks it.
- **The app runs once**, before the PR opens, and again only if that run failed. With no criteria, the validator treats the whole change as one, under whichever `TESTING.md` category covers it. When none fits, it reports `cannot-verify`, and `TESTING.md`'s **Uncategorized** setting decides whether the PR stays a draft.
- **`judge` rules only on review findings.** A failing check or validator run goes straight back to `coder`.
- **No gateway `judge`, and no recurrence rulings.** A finding that comes back stays open and keeps the PR a draft.
- **A scout finds the affected docs**, because no spec lists them.
- **`coder` decides how, not what**, and `qa` challenges each choice it made; none reaches you. With no spec to send it back to, a question about what to build that the issue or prompt leaves open keeps the PR a draft, listed for you to settle.

The loop limits, test first, and what the run is allowed to do are as in `STORY.md`.

The PR description is written and checked as in [`STORY.md`](STORY.md#the-pr-description): four parts, **What changes**, **Needs you**, **Why trust it**, and **Not done**, rewritten whole in every round that opens or updates the PR. Here **What changes** opens with one sentence saying what changed, with no `Spec:` line, because there is no spec. **Why trust it** rests on the test and the app run: the run's one criterion, or the whole change as one, and its result.

## Halt conditions

| #   | Condition                                                                                                 | Found at | What the user gets                                           |
| --- | --------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------ |
| H1  | The issue can't be read, the argument says nothing, or `answers` isn't a map or holds an object or a list | Read     | `not-started`, no board write                                |
| H2  | The push is denied, or PR creation fails                                                                  | Push     | `blocked`; finished work stays committed on the local branch |
| H3  | Infrastructure: a stop signal, a required tool denied, or a budget, usage, or agent limit reached         | Any      | `blocked`, naming the stage and the checkpoint to rerun from |
| H4  | `writer-pr` returns no description in any attempt of a stage                                              | Push     | `blocked`; finished work stays committed on the local branch |
| H5  | On a rerun, a checkpoint item the scout returned for a ledger key isn't a ledger line                     | Read     | `blocked`, naming the key                                    |
| H6  | The card lists open questions                                                                             | Read     | `not-started`, and an issue comment listing them             |
