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
