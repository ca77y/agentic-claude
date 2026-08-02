# Nested subagent result routing

Nested orchestration — a subagent that dispatches and resumes its own children and
collects their reports — is not supported by the Claude Code harness. An orchestrator
that is itself a subagent cannot reliably receive its children's results, so the
toolkit's pipeline runs flat: the orchestrator is the main session, via the `lead`
skill (`plugins/ca77y-engineering/skills/lead/SKILL.md`), and every pipeline agent is
a leaf below it. This note records the limitation so the sealed-lead topology is not
re-attempted while the harness behaves this way.

## What was investigated

The full investigation log — transcript audits of a four-lead session (39 depth-2
dispatches, harness 2.1.220), two live minimal-reproduction probes, an agent-teams
evaluation with the flag enabled, and three web-research passes — lives on the story
card:
[`../tasks/contain-subagent-traffic-inside-the-pipeline.md`](../tasks/contain-subagent-traffic-inside-the-pipeline.md).

## The evidence

Established empirically (card findings 1–10, sessions of 2026-08-01/02):

- **Children of a subagent detach regardless of `run_in_background`.** A nested
  child's completion does not return into its parent's turn.
- **Completion notifications route to the root session from any depth.** In the
  audited session, all 15 depth-2 task-notifications delivered to the main session
  came from *resumed* workers; zero came from the fresh, synchronous dispatches —
  a clean split along the resume/fresh boundary (n=39).
- **A resumed child's report leaks to the main session.** Reproduced minimally: a
  stand-in parent resumed its child via `SendMessage`; the child's report never
  reached the parent by any channel and arrived in the main session as a
  `<task-notification>` instead. This held with agent teams enabled too.
- **Subagents have no `TaskOutput`.** Across 43 subagents, `TaskOutput` was called
  zero times while every lead searched for it and failed (`ToolSearch
  select:TaskOutput` → no match). The tool exists only in the main-session roster,
  so a subagent orchestrator's collection rule mandating it could never execute.
- **Prose cannot fix it.** No agent-definition wording can reroute the harness's
  notification delivery; workers denied a working report channel invented
  `SendMessage to: "main"` as a fallback, which no definition forbade at the time.

## The upstream trail

Independently reproduced and filed against the harness — all open as of 2026-08-02:

- [anthropics/claude-code#75043](https://github.com/anthropics/claude-code/issues/75043)
  — the exact pattern, with repro: children of a subagent detach, notifications
  route to root, 4/4 orchestrator runs stalled waiting on reports that cannot arrive.
- [anthropics/claude-code#81438](https://github.com/anthropics/claude-code/issues/81438)
  — the literal leak: a `SendMessage`-resumed nested child's completion routes to
  the top-level session.
- [anthropics/claude-code#69212](https://github.com/anthropics/claude-code/issues/69212)
  — results route to root; orphaned grandchildren.

The official docs draw the same boundary: subagents "report results back to the main
agent only", agent teams fix the lead to the main session and forbid nested teams —
so neither primitive offers a non-main orchestrator that collects its own children.

## What would unblock it

An upstream fix to child result routing for intermediate parents — a nested child's
completion (fresh or resumed) delivered to the subagent that dispatched it, plus a
collection primitive (`TaskOutput` or equivalent) available to subagents. If that
ships, converting the `lead` skill back into a sealed subagent — hand it a card, get
back a PR, one notification — could become a story again.
