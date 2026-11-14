# Delivery ledger

The ledger lets a rerun skip the steps a story's earlier runs completed. It is `.tmp/ledger.md` at the story worktree root, and you are its only writer. It is append-only: add lines at the end, and never edit, reorder, or remove earlier ones. Create the file and its folder when they don't exist.

## Lines

The brief gives the lines that record the step it completes. Append them in the same dispatch, after the operations they record have succeeded, and never for an operation that failed. Fill each placeholder from what this dispatch actually produced (a commit sha, a PR reference, a trigger time), and stamp `<time>` with the current UTC time, `date -u +%Y-%m-%dT%H:%M:%SZ`.

```text
<time> run <n>: <workflow> <primary arg> | worktree <path> | branch <name>
<time> done spec <spec folder> story <story revision>
<time> done findings <paths>
<time> done board-start <card id>
<time> reproduced {"steps": [...], "observed": "..."}
<time> done round <n>
<time> done publish <pr reference>
<time> review <n> fired <trigger time>
<time> review <n> ended <finished|failed|timed-out|not-declared>: <number> finding(s)
<time> delivery <ready|draft>
```

- `run <n>`: `n` is one more than the highest run number already in the file, or 1.
- `done board-start`: written as soon as the card's delivery-start operation is done, so a rerun retries only that operation when it is missing.
- `review <n> fired`: the trigger time the forge operation reported.
