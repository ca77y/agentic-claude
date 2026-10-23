# Delivery ledger

The ledger lets a rerun skip the steps a story's earlier runs completed. It is `.tmp/ledger.md` at the story worktree root, and you are its only writer. It is append-only: add lines at the end, and never edit, reorder, or remove earlier ones. Create the file and its folder when they don't exist.

## Lines

The brief gives the lines that record the step it completes. Append them in the same dispatch, after the operations they record have succeeded, and never for an operation that failed. Fill each placeholder from what this dispatch actually produced (a commit sha, a PR reference, a trigger time), and stamp `<time>` with the current UTC time, `date -u +%Y-%m-%dT%H:%M:%SZ`.

```text
<time> run <n>: <workflow> <primary arg> | worktree <path> | branch <name>
<time> done spec <path>@<spec hash> commit <sha> story <story revision> [test <path>]
<time> done implement commit <sha> spec <spec hash> [pushed]
<time> done board-start <card id>
<time> done board-pr <pr reference>
<time> done publish <pr reference> commit <sha>
<time> review <n> fired <trigger time> [head <sha>]
<time> review <n> ended <finished|failed|timed-out>: <defects fixed, non-issues, unverified, or none>
```

- `run <n>`: `n` is one more than the highest run number already in the file, or 1.
- `done spec`: the spec hash is `git hash-object` of the committed spec; `test <path>` names the regression test committed with it.
- `done board-start` and `done board-pr`: written as soon as the card's delivery-start operation, or the board operations for when the PR opens, are done, so a rerun retries only the board operation that is missing. `done board-pr` comes before `done publish`, which waits for the review trigger.
- `done implement … pushed`: written when a review round's push carries the commit.
- `review <n> fired`: the trigger time the forge operation reported, and `head <sha>`, the pushed head that review judges. A pushed head beyond it on a rerun means a fix was pushed and the steps after the push did not finish.
