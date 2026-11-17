# Forge declaration

Fill [the forge template](../resources/FORGE.md) with facts from the repository — remotes, branches, ignore rules, commit history, existing documentation — and the user's answers. Write one line per fact: state the rule and the binding, not a command transcript, and don't restate what git already shows. Mark unsupported operations explicitly, and never record credentials. Reference facts the board owns instead of copying them.

Spike prototypes: one line naming the local branch pattern and the worktree path pattern a spike's throwaway prototype uses, in terms of the spike's `<slug>`, and stating that a never-pushed prototype may be deleted. Spike workflows take their names from this line and invent none; write "none" when the project doesn't want prototypes, and a spike then reports findings without one.

Worktree preparation: one line naming what makes a fresh checkout of the repository ready for work, run from its root: usually the dependency install, so commit hooks, checks, and the app find what they need, plus any other step a new checkout needs. A delivery runs it in every worktree it creates or recovers, and in a branch-only checkout, before any work starts, so it must be safe to run again. Write "none" when a fresh checkout needs nothing.

Name no agent, skill, slash command, or model, so the declaration works for any orchestrator; say "a delivery request" for the request that ends in a PR. Keep restrictions on merging, cleanup, force pushes, rewriting pushed history, tags, releases, and destinations; they bind autonomous work, and an explicit user request lifts them.

A delivery opens its PR as a draft, pushes at the end of every round even when something is still flagged, and renders the PR body from its run state. So the declaration binds draft creation and marking ready, and requires every commit on a story branch to name the issue, which is how an agent later finds a commit's spec. The PR is marked ready only after a clean review, so the declared review must review a draft PR; a review that skips drafts never comes back clean. Its status binding says how to tell a review that skipped the change from one that reviewed it.

"No forge" is a complete choice: record the local commit convention and mark hosted PR and review operations unsupported.
