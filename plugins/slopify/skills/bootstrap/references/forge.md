# Forge declaration

Fill [the forge template](../resources/FORGE.md) with facts from the repository — remotes, branches, ignore rules, commit history, existing documentation — and the user's answers. Write one line per fact: state the rule and the binding, not a command transcript, and don't restate what git already shows. Mark unsupported operations explicitly, and never record credentials. Reference facts the board owns instead of copying them.

Spike prototypes: one line naming the local branch pattern and the worktree path pattern a spike's throwaway prototype uses, in terms of the spike's `<slug>`, and stating that a never-pushed prototype may be deleted. Spike workflows take their names from this line and invent none; write "none" when the project doesn't want prototypes, and a spike then reports findings without one.

Worktree preparation: one line naming what makes a fresh checkout of the repository ready for work, run from its root: usually the dependency install, so commit hooks, checks, and the app find what they need, plus any other step a new checkout needs. A delivery runs it in every worktree it creates or recovers, and in a branch-only checkout, before any work starts, so it must be safe to run again. Write "none" when a fresh checkout needs nothing.

Name no agent, skill, slash command, or model, so the declaration works for any orchestrator; say "a delivery request" for the request that ends in a PR. Keep restrictions on merging, cleanup, force pushes, rewriting pushed history, tags, releases, and destinations; they bind autonomous work, and an explicit user request lifts them.

The cleanup-after-merge and required-checks lines are facts for people and other orchestrators; no delivery reads them. Cleanup stays with the user, and a delivery marks its PR ready without waiting for the forge's required checks.

A delivery opens its PR ready for review, pushes at the end of every round even when something is still flagged. It writes the PR body whole each round, for the person who reviews it, in four parts in this order: **What changes**, **Needs you**, **Why trust it**, and **Not done**. A story's body names its spec folder on a `Spec: <folder>` line. It converts the PR to a draft when the run ends with something open, and marks a draft ready before it fires the next review, since a review may skip a draft. So the declaration binds creating a ready PR, marking it ready, and converting it to a draft, binds merging the target branch into the story branch before each push, so the PR keeps merging cleanly and the forge runs its review, with how to conclude or abort a conflicted merge, and requires every commit on a story branch to name the issue, which is how an agent later finds a commit's spec. The review status binding says how to tell a review that skipped the change from one that reviewed it.

A delivery commits a failing test before the fix that makes it pass, so a commit hook must not run the unit tests; it may format, lint, and typecheck. When the repository's hook runs tests, say so to the user and propose moving the tests out of it, to CI or a pre-push step.

The review status binding says how to read a result that ended early: a reviewer can end its run with success before it posts every finding, so name what in the result shows that each step finished, such as a progress list with no unchecked item.

"No forge" is a complete choice: record the local commit convention and mark hosted PR and review operations unsupported.
