# Recovery — lost reports, isolation by `path`, and resuming after a wake

Read this when a wake brings no usable report, when the harness refuses writes until the session is isolated, or when you are continuing after a compaction, wake, or session restart. Everything in `SKILL.md` still binds.

## A wake with no usable report, or nothing arriving

Check ground truth before any replacement dispatch, in this order:

1. `TaskList` and `TaskOutput` on the awaited worker's agentId, where the dispatch produced one — both available to you in the main session, and to no worker.
2. `git -C <worktree> status --short`, plus the files the worker was to produce.

Work present on disk means the worker is alive or already finished: **collect it rather than replace it.** A stalled agent and a slow-but-working one look identical from outside, and a re-dispatched replacement has edited the same spec file as a still-live original before, reconciled only by luck. Only when the task is genuinely gone and nothing on disk accounts for it, escalate to the user — never silently dispatch a second agent onto files a live one may still be writing.

## When the harness refuses writes until the session is isolated

Some sessions — a background job in particular — are refused every file write until they have isolated themselves, and `EnterWorktree` is the only mechanism accepted. Its two forms are not interchangeable:

- The **`name` form creates** a worktree, in the harness's own directory on a new branch — using it on a story leaves this story's tree and branch behind. Never use it, and never relocate the story worktree to satisfy the tool.
- The **`path` form enters** a worktree that already exists; on the session's first entry from the launch directory it accepts any path registered in `git worktree list`, which is exactly what `git worktree add` produced at step 2. Enter the worktree you just created by `path`. Nothing moves, and every dispatch still names the absolute path.

This move is yours alone: a dispatched worker's working directory is pinned at launch and cannot reach the story worktree this way, so the workers keep addressing it by absolute path exactly as *Addressing the story worktree* says.

**A refusal that entry does not clear is escalated, not quietly recorded.** If a file-tool write to `tmp/` is refused by an isolation guard or a permission on `tmp/` itself — not for an unrelated reason such as a subagent's own report-file restriction — and entering by `path` does not clear it, that is a **blocker on this story**: report it to the user rather than reaching for `bash` or shipping around it, in addition to recording which outcome occurred (dispatch mode and whether the guard fired, and whether `path` entry cleared it) in `docs/ARCHITECTURE.md` under *Where the remedy is stated* — never instead of it.

## After a compaction, wake, or session restart

The ledger (`tmp/ledger.md`, per *Context discipline*) plus `git log` — never recollection — are the source of truth for where the pipeline stands. Before doing anything else, read them and re-establish:

- the current workflow step and what is currently awaited — a completed round is collected, never re-dispatched;
- whether the run is `--fast` — if so, re-read `${CLAUDE_SKILL_DIR}/references/fast.md` before the next dispatch — so no later dispatch silently drops the model step;
- the coder tier in play, any senior fallback, and any promotion already made — the tier never re-routes from the score mid-run;
- the agentIds you hold, so a round resumes where it can and goes fresh where it cannot, per *Dispatch, resume, and collection*;
- the commits already made and the round counters per gate, so the *3× rule* counts every attempt;
- the card transitions already made, in the board's own values, so none is repeated or lost; and the retained board follow-ups.

A user prompt that arrived mid-pipeline was a pause, not an abort: handle it, then resume from the ledger.
