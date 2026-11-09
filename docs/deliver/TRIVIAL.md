# Deliver trivial

How `deliver-trivial` takes a trivial story from a Linear issue or a prompt to a reviewed GitHub PR. There is no spec, and the issue or prompt says everything. It follows the rules in [`DESIGN.md`](../DESIGN.md) and takes the review from [`STORY.md`](STORY.md). `deliver-bugfix` is the same flow; see [`BUGFIX.md`](BUGFIX.md).

## Flow

```text
 /slopify:deliver-trivial SMR-12     or a plain prompt
 │
 1 READ ──────── scout-card (haiku) reads the issue
 │               a prompt gets a new card from pusher, so all work is on the board  ⛔ H1
 2 WORKSPACE ─── pusher (sonnet) creates the worktree and branch, starts the issue
 3 BUILD ─────── coder (opus) writes a failing test → commit
 │   ▲ ≤3 tries  coder (opus) makes it pass → commit
 │   │           checks (haiku) runs the TESTING.md checks
 │   └────────── qa (sonnet) checks the change and its history
 │               scout-docs (haiku) finds docs the diff affects
 │               writer (opus) fixes them, only if it found any → commit
 4 VALIDATE ──── validator (sonnet) runs the app as TESTING.md says, once
 5 PUSH ──────── pusher pushes, opens a draft PR, which fires the review             ⛔ H2
 6 REVIEW ────── watcher (haiku) reads the findings
 │   ▲ ≤3 fix    judge × N (opus), one per finding
 │   │  rounds   each blocker/major: failing test → commit → coder → commit → checks
 │   │           scout-docs, then writer if it found any
 │   └────────── pusher pushes and comments "@review"
 ▼
 clean → PR ready, issue In Review            not clean → PR stays draft, saying why
```

## What differs from `deliver-story`

- **No how phase:** no designs, advisors, spec, or challenge.
- **No label:** this flow doesn't need `Deliverable`, so it can start from a prompt. A prompt always gets a card, unless the project declares no board.
- **Checks inside the inner loop:** a fix isn't validated until the project's checks pass.
- **`qa` runs once**, on the first change. A review fix has only the checks.
- **The app runs once**, before the PR opens, and again only if that run failed. With no criteria, the validator treats the whole change as one, under whichever `TESTING.md` category covers it. When none fits, it reports `cannot-verify`, and `TESTING.md`'s **Uncategorized** setting decides whether the PR stays a draft.
- **`judge` rules only on review findings.** A failing check or validator run goes straight back to `coder`.
- **No gateway `judge`, and no recurrence rulings.** A finding that comes back stays open and keeps the PR a draft.
- **A scout finds the affected docs**, because no spec lists them.

The PR, its sections, the loop limits, test first, and what the run is allowed to do are as in `STORY.md`, except that the criteria table has one row.

## Halt conditions

| #   | Condition                                                                                         | Found at | What the user gets                                           |
| --- | ------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------ |
| H1  | The issue can't be read, or the argument says nothing                                             | Read     | `not-started`, no board write                                |
| H2  | The push is denied, or PR creation fails                                                          | Push     | `blocked`; finished work stays committed on the local branch |
| H3  | Infrastructure: a stop signal, a required tool denied, or a budget, usage, or agent limit reached | Any      | `blocked`, with the state reported on the issue              |
