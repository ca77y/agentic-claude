# Nested subagent result routing

The Claude Code harness doesn't support nested orchestration, where a subagent dispatches its own children, resumes them, and collects their reports. A subagent can't reliably receive its children's results. So orchestration runs only from the main session, through skills and workflows, and every plugin agent is a leaf. A leaf may still dispatch the built-in read-only `Explore` agent: that is a one-shot search whose report returns to the leaf itself, with nothing to resume or route.

## Evidence

The investigation used transcript audits of 39 depth-2 dispatches, two minimal reproductions, and a trial with agent teams enabled. The full log is in the first comment on [SMR-166](https://linear.app/ca77y/issue/SMR-166/convert-the-lead-into-a-main-session-skill-that-runs-the-pipeline-flat).

- **A subagent's children detach, whatever `run_in_background` is set to.** A nested child's completion doesn't return into its parent's turn.
- **Completion notifications go to the root session from any depth.** A child that its parent resumed with `SendMessage` reports to the main session, never to the parent.
- **Subagents have no `TaskOutput`.** The tool exists only in the main session, so a subagent orchestrator can't collect results.
- **No prompt wording can fix this.** Definitions can't reroute the harness's notification delivery.

Upstream reports: [anthropics/claude-code#75043](https://github.com/anthropics/claude-code/issues/75043), [#81438](https://github.com/anthropics/claude-code/issues/81438), and [#69212](https://github.com/anthropics/claude-code/issues/69212). The official docs draw the same boundary: subagents report only to the main agent, and agent teams fix the lead to the main session.

## What would unblock it

An upstream fix that does two things:

- delivers a nested child's completion, whether fresh or resumed, to the subagent that dispatched it;
- gives subagents a collection primitive (`TaskOutput` or an equivalent).

With that fix, a sealed subagent orchestrator becomes possible: hand it a card, and get back a PR in one notification.
