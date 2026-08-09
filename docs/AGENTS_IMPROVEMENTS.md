# Agents improvements

Append-only notes on friction in the pipeline itself — the flow, an agent's instructions, or a
skill. One `###` entry per concrete proposal.

Entries are triaged periodically: a solvable finding becomes an issue on the board (see [`ISSUE_TRACKING.md`](./ISSUE_TRACKING.md))
and a finding already resolved or foreclosed by shipped work is removed. Clearing an entry is part
of converting it, not a follow-up — see *The improvements log is cleared as it is converted* in the
root [`CLAUDE.md`](../CLAUDE.md). The log is empty when every recorded finding has been converted
or retired.

### The `lead` never forwards the `coder`'s fix report to the next `qa` round

**Area**: `skill:lead`

**Observed**: `SMR-148` gives `coder.md` a per-fix demonstration outcome (**demonstrated** /
**not demonstrated** / **nothing can reach it**) and `qa.md` an intake that trusts a
**demonstrated** pin and probes the rest — the cost saving the story exists for. But the `lead`
skill's step 5 (`plugins/ca77y-engineering/skills/lead/SKILL.md`, *Validate and review*)
enumerates what a fresh `qa` dispatch carries as the spec path, the worktree and its provisioning
status, and the round's commit references. The `coder`'s report is not in that list, and `qa` is
never resumed, so the evidence the `coder` produced does not reach the agent written to consume
it. `qa.md` degrades safely — a dispatch without the report treats every fix as unmarked — but
that means the default path probes everything and the saving never lands. Observed live on this
story: the round-2 `qa` dispatch carried the round-1 findings and the commit references, not the
`coder`'s report.

**Suggested change**: add the `coder`'s fix report to the list of what step 5 passes into a fresh
`qa` dispatch, alongside the commit references, and to the `qa` bullet in *The agents*. `SMR-148`
deliberately scoped the `lead` skill out of its own edit set, so this is the follow-up that
closes the loop.

### A final edit to a spec in the docs pass leaves no trace, because the same commit removes it

**Area**: `flow`

**Observed**: the docs pass both edits the shipped spec's surroundings and **removes** the spec,
and the `lead` commits the whole pass as one commit. A commit that deletes a file shows that
file's content **as of `HEAD`**, so any edit the same pass makes to the spec before deleting it is
invisible in history — it is not merely redundant, it is unrecoverable. On this story the docs
pass was asked to tick `T1`–`T9`'s checkboxes before removal "for an accurate historical record in
git log", which cannot work in a one-commit pass: the removal diff shows the boxes unchecked
either way. The same applies to any last correction to a spec discovered during its own conversion.

**Suggested change**: state in `writer.md`'s docs pass (step 6) and in the `lead`'s commit step
that a shipped spec is removed **as it stands**, and that anything worth recording about its final
state — all tasks implemented and verified, a deviation that held, a criterion re-graded — goes in
the **removal commit's message**, which is the only surviving trace. This mirrors the rule the
root `CLAUDE.md` already applies to clearing `AGENTS_IMPROVEMENTS.md` entries, where the removal
commit's message is explicitly the finding's only surviving record.

### A PR-review fix round routed to the `coder` can silently falsify the docs the same run shipped

**Area**: `skill:lead`

**Observed**: *Invoked on an open PR* (`plugins/ca77y-engineering/skills/lead/SKILL.md`, bullets 3–4)
routes each review finding **by owner** — "code to the `coder`, docs to the `writer`" — and then
re-runs `qa` over any code change. Nothing in that sequence covers the common case where a *code*
fix changes behaviour that the **docs pass of the same run already described**. The docs pass runs
once, before the PR opens (step 7), and is trusted with no gate; every fix round after it can
therefore invalidate prose it wrote, with no owner assigned to reconcile it. Observed live on this
story: the round fixing two PR-review findings changed `qa.md`'s probe rule and its restoration
check, while `README.md` and `docs/ARCHITECTURE.md` — written one commit earlier, in this run's own
docs pass — kept describing the pre-fix behaviour. `qa` caught it only because this repo's
`docs/CLAUDE.md` happens to state that the README tracks per-agent behaviour; on a project without
that rule written down, nothing in the pipeline would have looked.

**Suggested change**: add a bullet to *Invoked on an open PR* (and to the pre-ship *When a gate
finds a problem* routing) stating that a finding routed to the `coder` is checked for docs the run
already shipped that the fix falsifies, and that any such divergence is routed to the `writer` in
the same round so the fix and its docs land in one commit. The `qa` round that already re-runs over
the code change is the natural place to surface the divergence, since it is the only agent reading
the diff in that round.
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

### The docs pass has no rule for a divergence it finds in the shipped artifact itself

**Area:** `agent:writer`

**Observed:** On SMR-182's docs pass — the first live use of *What shipped is the run's diff, not
the spec* — the divergence the diff surfaced sat in the **shipped artifact**, not in a durable doc.
`writer.md` and `README.md` both state that the `lead` "commits the spec once ... and never revises
it", and the run's own diff falsifies the literal claim twice: both round commits (`debeaef`,
`e28a813`) modify the spec file, and `SKILL.md`'s *When a gate finds a problem* defines two mid-run
respec routes. The new duty makes the diff authoritative over the spec and requires divergence to be
reported, and *Reconciling what you touch* fixes a contradiction in any paragraph the pass touches —
but neither covers this case: the inaccurate sentence is gate-accepted product prose the pass did
not author and *Boundaries* tells it not to change built artifacts. The pass wrote the precise
version into `ARCHITECTURE.md`, left the artifact alone, and reported it — which leaves the toolkit
shipping a sentence its own run disproved, with nothing but a report line against it.

**Suggested change:** State in *What shipped is the run's diff, not the spec* what to do when the
divergence is in the shipped deliverable rather than in a durable doc: do not edit it (the
acceptance gate judged it), record the accurate statement in the durable doc, and name it in the
report as a **defect in shipped work** — a category distinct from a spec-only divergence — so the
`lead` can choose between a fix round and a follow-up card instead of reading it as ordinary drift.
