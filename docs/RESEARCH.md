# Research

How `research` answers a question from new sources and adds the answer to the project's library, delivered as a reviewed GitHub PR. It follows the rules in [`DESIGN.md`](DESIGN.md) and takes the outer loop and the review from [`deliver/STORY.md`](deliver/STORY.md), with the library pages in place of code. The library's own conventions are in `library/_meta/librarian.md` in the target project.

## Flow

```text
 /slopify:research SMR-30     or a plain question
 │
 1 READ ──────── scout-card (haiku) reads the issue
 │               a prompt gets a new card from pusher, as in deliver-trivial                ⛔ H1
 2 WORKSPACE ─── pusher (sonnet) creates the worktree and branch, starts the issue
 3 GROUND ────── library-reader (sonnet): what the library already supports
 4 PLAN ──────── library-scribe (sonnet) writes the plan to .tmp/research/<slug>.plan.md:
 │   ▲ ≤3 rounds the sub-questions, and how good the evidence must be
 │   │           library-clerk (sonnet) checks it → judge × N (opus)
 │   └────────── library-scribe revises; what is still wrong becomes a stated limit
 5 RETRIEVE ──── library-researcher (sonnet) × N, one per sub-question, in parallel
 6 PERSIST ───── library-scribe × N, one raw note per source, in parallel
 │               then one library-scribe integrates: the wiki page or pages that answer
 │               the question, and the index, taxonomy, and log → commit
 7 VALIDATE ──── checks (haiku) and library-clerk on the changed files → judge × N (opus)
 8 PUSH ──────── pusher pushes, opens a draft PR, which fires the review                     ⛔ H2
 9 REVIEW ────── watcher (haiku) reads the findings
 │   ▲ ≤3 fix    judge × N (opus), one per finding
 │   │  rounds   library-scribe repairs the pages → commit, then step 7 again
 │   └────────── pusher pushes and comments "@review"
 ▼
 clean → PR ready, issue In Review            not clean → PR stays draft, saying why
```

## Decisions

- **The answer is a wiki page.** The main question is answered in one or more wiki pages. Raw notes hold what was retrieved, one per source, as the library's conventions say. The PR names the pages.
- **The plan lives for the run only.** It sits in the worktree's ignored `.tmp/` and is never committed. It isn't a spec: specs are the how of a delivery.
- **No replanning.** A researcher who finds the plan wrong reports it, and it becomes a limit the answer states. A sub-question nothing could be found for is a limit too, never a guess.
- **Nothing stops for a judgment call.** What the plan's checks or the final checks leave open is stated in the pages or listed in the PR.
- **The loop is the delivery loop's document mode,** extended to several files: every problem, whatever its kind, goes to `library-scribe`, because the library pages are all the PR changes.

## Halt conditions

As in [`deliver/TRIVIAL.md`](deliver/TRIVIAL.md).
