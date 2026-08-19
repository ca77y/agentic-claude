# Invoked on an open PR — the fix run

The review's findings come back to you as a **new invocation**: the user hands you the findings (or the PR) as the task. Treat it as a fix run, not a fresh story — same branch, same PR, never a second of either. Everything in `SKILL.md` still binds; this file is what changes.

## Recover the workspace before anything else

- The durable record is the card's **handoff comment**, the **PR description** — reached through the forge declaration's *read* binding — and `git log`. Read these first; they hold what already shipped whether or not the worktree survived. A surviving `tmp/ledger.md` is a **bonus** cross-check, never something recovery depends on: the worktree — and every scratch file in it — dies with `git worktree remove` once the PR merges.
- If the worktree still exists, reuse it. If not, recreate it on the **existing** branch — never branch again, never open a second PR.
- Reused or recreated, apply the isolation step first if the harness refuses writes until the session is isolated: enter by `path`, per `${CLAUDE_SKILL_DIR}/references/recovery.md`.
- Recreate the ledger per *Context discipline* if it is gone, seeded from the durable record.

## Every agent is a fresh dispatch

The previous run's agents are gone — their agentIds died with that session. Every dispatch this run is fresh and carries the spec path, the worktree path and its provisioning status, and the PR's findings. The coder is a fresh coder, routed from the spec's **Coding complexity** score exactly as step 4 does — no coder survives past the run that dispatched it; its dispatch opens on findings, so it names `${CLAUDE_PLUGIN_ROOT}/references/coder-fix-round.md` — by path, never pasted — as the file the coder reads first, exactly as a findings round does per *Dispatch, resume, and collection*. Record each new agentId in the ledger when a dispatch produces one; within this run, later rounds resume or go fresh per *Dispatch, resume, and collection*, exactly as in a first run.

## Route, fix, verify, push, re-fire

- **Route each finding by owner** per *When a gate finds a problem*: code to the `coder`, docs to the `writer`, and an issue large enough to invalidate the approach back to the `writer` for a revised spec the `coder` rebuilds against. Retain any board follow-ups a revised spec surfaces, as step 3 does for every spec pass.
- **Re-run `qa` over any code change**, then commit the round — one commit per fix round, per *The commit model* — and **push** it, since the branch now has a remote.
- **Re-fire the review** through the declaration's *re-fire* binding. Where it binds none, push the round and say in the handoff that the review has to be fired by hand.
- **Keep the PR description true.** If this run surfaces anything new the PR must carry — a board follow-up from a respec, a production hazard the coder reports while fixing — update the open description through the declaration's *update* binding as well as pushing the fix, so the description and your report both carry every follow-up and hazard whenever it was found. Where it binds no update, report what the description should now carry.
- **The card stays at awaiting review** — it is already there, and it is not yours to move again.
- **Hand off again** per *Final handoff*, and still do not wait for the review's result. The *3× rule* bounds a review finding that keeps returning exactly as it bounds any other problem.
