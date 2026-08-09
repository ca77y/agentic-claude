# Agents improvements

Append-only notes on friction in the pipeline itself — the flow, an agent's instructions, or a
skill. One `###` entry per concrete proposal.

Entries are triaged periodically: a solvable finding becomes an issue on the board (see [`ISSUE_TRACKING.md`](./ISSUE_TRACKING.md))
and a finding already resolved or foreclosed by shipped work is removed. Clearing an entry is part
of converting it, not a follow-up — see *The improvements log is cleared as it is converted* in the
root [`CLAUDE.md`](../CLAUDE.md). The log is empty when every recorded finding has been converted
or retired.

### A spec's Validation commands must be runnable by a worktree-isolated session

**Area:** `agent:writer`

**Observed:** On SMR-182 round 2, three Validation commands were refused outright before running,
by the harness rather than by the project: the root `CLAUDE.md` manifest-parity `for` loop, a
`git show … > file; …; diff` sequence, and `diff <(…) <(…)` process substitution. Each came back
as *"this command is too complex to verify that it stays inside the worktree; break it into plain,
separate commands"* — a worktree-isolated session (which every dispatched `qa` and `coder` is)
refuses compound shell whose target it cannot statically prove stays inside the worktree. The
Validation item still had to be executed, so it was re-derived by hand into three plain commands.
`writer.md`'s *Validation must reach every consumer of what the task changes* governs what
Validation must cover but says nothing about the **form** each command takes, so a spec can record
a check that no dispatched agent can run as written.

**Suggested change:** Add one sentence to that rule in `plugins/ca77y-engineering/agents/writer.md`:
each Validation item is recorded as commands a worktree-isolated session can run — plain, separate
invocations, with intermediates written to files rather than loops, process substitution, or
chained redirects — because the agents that execute the list are dispatched into the worktree and
the harness refuses compound shell there. Where a project's own documented check (such as this
repo's `CLAUDE.md` parity loop) is compound, the spec cites it *and* records the plain-command
equivalent alongside it, so citing it does not hand the executing agent something it cannot run.
