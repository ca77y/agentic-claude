# Delivery ledger

The ledger lets a run survive interruptions and compaction. The workflows keep their own journal of every dispatch and verdict; the ledger keeps the rest. It is append-only: you add one line per event and never edit or reread earlier lines, so the current state is always at the end.

## Lines

Append one line per event, each complete on its own:

```
<time> run <n>: <request> | worktree <path> | branch <name>
<time> workflow <name> started <run-id> | script <path> | transcript <dir>
<time> workflow <name> returned <run-id>: <status> — <blocker or none> | failures spec <k>/3, implementation <k>/3
<time> review <round> <fired at <trigger time>|started|finished|failed|timed out|ended> <review reference>: <defects fixed, non-issues, or none>
<time> next: <action>
```

- Start each request with a `run` line. A new request on the same story, such as a PR repair, starts run `n+1` with zero failures.
- Write a `workflow started` line from the launch result, and a `workflow returned` line when it reports. Never invent an ID or path.
- Write a `review` line when a review is fired (with its trigger time), starts, finishes, fails, or times out, and when its round ends.
- Write a `next` line before you end a turn to wait, and before the final response.

## Resume

Read from the last `run` line to the end, not the whole file. The latest `workflow returned` line holds the failure counts, the latest `review` line holds the round, and the last `next` line says where you stopped.

A workflow that started and never returned is resumed in the same session with `Workflow({scriptPath, resumeFromRunId})`, which replays its finished agents. In another session, add the failed verdicts recorded in `journal.jsonl` under its transcript directory to the last returned counts, and run it again with the sums as `failures`; if they can't be reconstructed, report the gap rather than assuming zero.
