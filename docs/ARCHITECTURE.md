# Architecture

Rules that hold for every plugin in this repo, whatever its current design.

- A plugin is made of skills, workflows, agents, and references. Skills and workflows run from the main session. Agents are leaves: an agent dispatches nothing except the built-in read-only `Explore` agent. The harness can't route a nested child's result back to its parent; see [`issues/nested-subagent-result-routing.md`](issues/nested-subagent-result-routing.md).
- The Workflow runtime runs one self-contained script: it can't import files, has no Node or browser APIs, throws on `Date.now()`, argless `new Date()`, and `Math.random()`, and starts a child workflow only one level deep. Workflow sources are TypeScript modules that a build bundles into that form.
- Everything specific to a target project comes from that project's `docs/BOARD.md` and `docs/FORGE.md`: the tracker, the forge, branch naming, the commit convention, and the review trigger. A plugin hardcodes none of them.
- Configuration doesn't authorize anything; the user's request does. An operation that the declarations don't bind is not performed.
- One agent role performs every write to git, the board, and the forge: commits, pushes, branches, worktrees, cards, PRs, and review triggers. No other agent does any of these.
- A validator judges only work it didn't produce, in a fresh dispatch, and changes nothing. A check that couldn't run is reported as unverified, never as passed.
