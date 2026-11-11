# Deliver spike

How `deliver-spike` answers a bounded technical question with a findings document, delivered as a reviewed GitHub PR. It follows the rules in [`DESIGN.md`](../DESIGN.md) and takes the outer loop and the review from [`STORY.md`](STORY.md), with the document in place of code.

## Flow

```text
 /slopify:deliver-spike SMR-20     or a plain prompt
 │
 1 READ ──────── scout-card (haiku) reads the issue
 │               a prompt gets a new spike card from pusher, so every spike is on the board  ⛔ H1
 2 WORKSPACE ─── pusher (sonnet) creates the worktree and branch, starts the issue
 3 GROUND ────── in parallel: library-reader, scout-code, scout-feasibility,
 │               scout-upstream-docs, scout-known-issues, scout-prior-art (haiku)
 4 PLAN ──────── writer-findings (opus) lists the claims the answer rests on: supported, contested,
 │               or unknown, and the measurement that would settle each one that can be measured
 5 PROTOTYPE ─── only when a claim needs a measurement
 │   ▲ ≤3 tries  pusher creates the prototype worktree that docs/FORGE.md names
 │   │           coder (opus) builds the prototype and runs each measurement
 │   └────────── qa (sonnet) reruns each command and confirms the value
 │               pusher deletes the prototype worktree and branch
 6 FINDINGS ──── writer-findings (opus) writes docs/spikes/<id>-<slug>.md → commit
 7 VALIDATE ──── checks (haiku) runs the TESTING.md checks
 │               lens-evidence, lens-question, lens-neutrality (haiku), on the document
 │               judge × N (opus), one per problem
 8 PUSH ──────── pusher pushes, opens a draft PR, which fires the review               ⛔ H2
 9 REVIEW ────── watcher (haiku) reads the findings
 │   ▲ ≤3 fix    judge × N (opus), one per finding
 │   │  rounds   writer revises the document → commit, then step 7 again
 │   └────────── pusher pushes and comments "@review"
 ▼
 clean → PR ready, issue In Review            not clean → PR stays draft, saying why
```

## The findings document

One file, `docs/spikes/<id>-<slug>.md`, named like a spec folder. Unlike a spec it's for people: the PR is how they read it, and merging it keeps the answer in the repo. Its sections:

- **Question**, verbatim from the issue.
- **Answer**: one paragraph that answers it directly, with the conditions it holds under.
- **Findings**: each claim with its citation, a `path:line`, a library page, a URL, or a measurement.
- **Measurements**: each command, its output, and the value. A figure with no recorded command is left out.
- **Options and trade-offs**: each option with what it costs and the conditions under which it holds. It ranks nothing and recommends nothing; `shape` and its advisors make that choice.
- **Unknowns**: what no evidence settled, including each measurement that couldn't be confirmed, with why.
- **Assumptions**: what the plan or the prototype settled on its own, such as the environment a timing ran in.

## Decisions

- **Nothing stops for a judgment call.** An ambiguous question becomes an assumption the plan states. A measurement that fails three tries stays an unknown with its reason.
- **The prototype is throwaway.** It lives on the local branch and worktree that docs/FORGE.md's "Spike prototypes" line names, is never pushed, and is deleted once the measurements are confirmed, before the document is written. The document keeps each command and its output, so the evidence outlives it. When that line says `none`, the project wants no prototypes: claims that need a measurement go under Unknowns.
- **The loop is `deliver-story`'s.** The same judge rulings, routes, limits, PR sections, and review rounds apply. Every problem that needs a fix, whatever its kind, goes to `writer-findings`, because the document is the only thing the PR changes. There is no app to run, so no `validator`.
- **The three lenses replace `qa`** for the document: every claim cites a source that says what it claims, every part of the question is answered or named as unknown, and nothing recommends.

## Halt conditions

| #   | Condition                                                                                         | Found at | What the user gets                                          |
| --- | ------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------- |
| H1  | The issue can't be read, or the argument says nothing                                             | Read     | `not-started`, no board write                               |
| H2  | The push is denied, or PR creation fails                                                          | Push     | `blocked`; the document stays committed on the local branch |
| H3  | Infrastructure: a stop signal, a required tool denied, or a budget, usage, or agent limit reached | Any      | `blocked`, with the state reported on the issue             |
