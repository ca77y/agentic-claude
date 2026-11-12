# Architecture

Rules that hold for every plugin in this repo, whatever its current design.

- A plugin is made of skills, workflows, agents, and references. Skills and workflows run from the main session. Agents are leaves: an agent dispatches nothing except the built-in read-only `Explore` agent. The harness can't route a nested child's result back to its parent.
- The Workflow runtime runs one self-contained script. It can't import files and has no Node or browser APIs. It throws on `Date.now()`, an argless `new Date()`, and `Math.random()`, and it starts a child workflow only one level deep. Workflow sources are TypeScript modules that a build bundles into that form.
- The tracker is Linear and the forge is GitHub. Everything specific to a target project comes from three files in that project:
  - `docs/BOARD.md`: team, project, statuses, and card format;
  - `docs/FORGE.md`: remote, branch naming, commit convention, and PR format;
  - `TESTING.md`: how to boot, check, and validate the app.

  A plugin may also rely on fixed locations of its own, such as `docs/specs/`, `docs/spikes/`, and the ignored `.tmp/`. `bootstrap` sets the project up so that each exists and is reachable.

- Configuration doesn't authorize anything; the user's request does. An operation that the declarations don't bind is not performed.
- One agent role performs every write to git, the board, and the forge: commits, pushes, branches, worktrees, issues, PRs, and comments. No other agent does any of these.
- A validator judges only work it didn't produce. It runs in a fresh dispatch and changes nothing. A check that couldn't run is reported as such: never as passed, and never as a defect for a producer to fix.
- A delivery ends in a PR unless one of its declared halt conditions holds. A PR is marked ready only when its review is clean. No agent merges or approves.
