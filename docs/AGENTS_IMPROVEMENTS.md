# Agents improvements

Append-only notes on friction in the pipeline itself — the flow, an agent's instructions, or a
skill. One `###` entry per concrete proposal.

Entries are triaged periodically: a solvable finding becomes an issue on the board (see [`ISSUE_TRACKING.md`](./ISSUE_TRACKING.md))
and a finding already resolved or foreclosed by shipped work is removed. Clearing an entry is part
of converting it, not a follow-up — see *The improvements log is cleared as it is converted* in the
root [`CLAUDE.md`](../CLAUDE.md). The log is empty when every recorded finding has been converted
or retired.

### The repo's canonical verification commands cannot be run as written from a story worktree

**Area**: flow

**Observed**: Root `CLAUDE.md` publishes its four maintenance checks (the five-file "Addressing the
story worktree." grep, the two-file "Board access" grep, the two cross-plugin greps, and the
manifest-parity loop) as compound shell — brace expansion, a `for` loop with command substitution,
`&&` chains. Specs cite them verbatim as validation steps: `SMR-143`'s V2 and V4 say "the root
`CLAUDE.md` … greps still print `1` each" and "the root `CLAUDE.md` manifest-parity loop prints
`ok`". A worktree-isolated agent session refuses those commands outright — "this command is too
complex to verify that it stays inside the worktree; break it into plain, separate commands" — so
every worker that runs V2/V4 burns refused round-trips rediscovering that the published form does
not execute, then hand-decomposes the loop into per-file greps and loses the loop's actual output
shape (`ok` / `DRIFT` lines) in the process.

**Suggested change**: In root `CLAUDE.md`, give each canonical check a plain single-command form
alongside the readable one (e.g. the manifest check as one `grep -H '"version"'` over the four
manifest paths, the greps already single commands with paths spelled out rather than brace-
expanded), and note that a worktree-isolated session must run the plain form. Specs can then cite a
command that actually runs where the pipeline runs it.
