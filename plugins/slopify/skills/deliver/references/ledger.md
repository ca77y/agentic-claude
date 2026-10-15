# Delivery ledger

The ledger lets a run survive interruptions and compaction. It is append-only: you add one line per event and never edit or reread earlier lines, so the current state is always at the end.

## Lines

Append one line per event, each complete on its own:

```
<time> run <n>: <request> | worktree <path> | branch <name>
<time> spec <path@revision>
<time> dispatch <role> <agent-id or unavailable>: <assignment>
<time> report <agent-id>: <outcome>
<time> verdict <spec|implementation> <agent-id> on <revision>: <pass|fail|unverified> — <blocking findings> | failures <k>/3
<time> review <round> <fired at <trigger time>|started|finished|failed|timed out|ended> <review reference>: <defects fixed, non-issues, or none>
<time> next: <action>
```

- Start each request with a `run` line. A new request on the same story, such as a PR repair, starts run `n+1` with zero failures.
- Write the `dispatch` line right after dispatching, with the returned agent ID. Never invent an ID.
- Write a `report` line when a producer reports, and a `verdict` line when a validator does. A verdict covers only the revision it names.
- Write a `review` line when a review is fired (with its trigger time), starts, finishes, fails, or times out, and when its round ends.
- Write a `next` line before you end a turn to wait, and before the final response.

## Resume

Read from the last `run` line to the end, not the whole file. The latest `verdict` line for the spec and for the implementation holds that budget's failure count, the latest `review` line holds the round, and the last `next` line says where you stopped. A logged agent ID is a handle, not proof the worker is alive or that its work passed: recover a finished worker's result before replacing it. If the lines don't let you reconstruct a budget's failures, report the gap rather than assuming zero.
