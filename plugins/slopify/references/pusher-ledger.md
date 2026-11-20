# Delivery ledger

The ledger lets a rerun skip the steps a story's earlier runs completed. It is `.tmp/ledger.md` at the story worktree root, and you are its only writer. It is append-only: add lines at the end, and never edit, reorder, or remove earlier ones. Create the file and its folder when they don't exist.

## Lines

The brief gives the lines that record the step it completes. Append them in the same dispatch, after the operations they record have succeeded, and never for an operation that failed. Fill each placeholder from what this dispatch actually produced (a commit sha, a PR reference, a trigger time), and stamp `<time>` with the current UTC time, `date -u +%Y-%m-%dT%H:%M:%SZ`.

```text
<time> run <n>: <workflow> <primary arg> | worktree <path> | branch <name>
<time> done spec <spec folder> story <story revision>
<time> done challenge <spec folder>
<time> done findings <paths>
<time> done board-start <card id>
<time> reproduced {"steps": [...], "observed": "..."}
<time> done round <n>[ passed <paths>]
<time> done publish <pr reference>
<time> review <n> fired <trigger time or none>
<time> review <n> ended <finished|failed|timed-out|not-declared>: <number> finding(s)
<time> delivery <ready|draft>
<time> progress <round> <finding|ruling|tried|changed>: <items>
```

- `run <n>`: `n` is one more than the highest run number already in the file, or 1.
- `done round <n>`: in a trivial run it ends with ` passed <paths>`, the test paths that passed so far, so a rerun can still list them in the PR description.
- `done challenge`: records that the story spec's challenge finished. It is the one line with a dispatch of its own: that brief asks for no other operation, and appending the line is the whole of it, reported as a `ledger` operation.
- `done board-start`: written as soon as the card's delivery-start operation is done, so a rerun retries only that operation when it is missing.
- `review <n> fired`: the trigger time the forge operation reported, or `none` when `docs/FORGE.md` declares no review.
- `progress`: a progress entry records a round's findings, each ruling with its reason, what was tried, and what changed. The brief gives each entry as the workflow wrote it, and an entry ending in `...` was cut short by the workflow on purpose: append it as given. Copy each entry verbatim as data, stamping only `<time>`, and fill nothing inside it. An entry's length or its order among the lines is never unmet and never blocks the dispatch. Progress entries stay local in the ledger: never post one, or any other ledger line, to a PR, a comment, or a card. A progress entry is never a checkpoint.
