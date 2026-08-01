---
type: story
title: Give a story worktree its dependencies before any agent works in it
---

# Give a story worktree its dependencies before any agent works in it

- [ ] Give a story worktree its dependencies before any agent works in it #improvement 🔺 🆔 install-dependencies-in-story-worktrees
  - `git worktree add` copies no `node_modules`, and no agent in the pipeline owns installing them. Every agent that has to run a project command or read a dependency's source inside a fresh story worktree either cannot, or runs against a toolchain that is not the project's and draws a wrong conclusion from the result.
  - Background (three independent runs): the `native-platform-config` writer tried to verify `expo config --type introspect` in the worktree; with no `node_modules` at any level, a bare `npx` silently fetched a detached CLI and failed with `Failed to resolve plugin for module "expo-router"` — an error that reads exactly like a real config defect in the file under review. The `timer-cue-sync` writer needed the installed `expo-notifications` types to settle a technical ambiguity, and the only copy was in the root checkout its dispatch had told it never to touch: the instruction draws no read/write distinction, so the safe-looking action and the correct action pointed in opposite directions.
  - Background (the install itself is not neutral): after the `native-platform-config` coder ran its own `pnpm install` in the worktree, two untouched pre-existing suites (`error-boundary.test.tsx`, `ruler-field.test.tsx`) failed to load with `TypeError: _reanimatedWrapper.Reanimated?.default?.createAnimatedComponent is not a function` from inside `react-native-gesture-handler`. The same files passed from the main checkout's `node_modules` — same lockfile. 100% reproducible from a clean worktree install, 0% from the main checkout; content-level diffing found nothing. The working theory is `node-linker=hoisted`: a fresh hoisted install of the same lockfile in a second checkout is not guaranteed to hoist identically. Copying the main checkout's `node_modules` in fixed it. Cost: over an hour of debugging a failure unrelated to the task.
  - This is a project-agnostic property — the toolkit cannot assume pnpm — so the rule has to be "provision the worktree using the project's own install/bootstrap step, preferring to inherit the main checkout's resolved state over re-deriving it", stated once in the definition that creates the worktree.
  - Scope: `plugins/ca77y-engineering/agents/lead.md` (worktree creation), plus the read/write clarification in the canonical "Addressing the story worktree." paragraph duplicated byte-identically across `lead.md`, `coder.md`, `writer.md`, `qa.md`, `auditor.md` — see the root [`CLAUDE.md`](../../CLAUDE.md) for the parity check that must pass before pushing.
  - Acceptance criteria:
  - The `lead` provisions the story worktree's dependencies as part of creating it, before dispatching any agent into it.
  - Where the project's dependency layout can be inherited from the main checkout rather than re-resolved, the definition says to prefer inheriting it, and names the class of failure that motivates it (an install that re-resolves can break tests the task never touched).
  - The worktree path the `lead` hands to each agent states whether dependencies are installed, so an agent knows before it runs a command whether the result is trustworthy.
  - The "Addressing the story worktree." paragraph distinguishes **write**-off-limits from readable: the root checkout may be read for dependency and vendor sources, and must never be written.
  - Agents are told not to invoke a project CLI through a bare `npx`-style fetch from inside a worktree, since that silently runs a toolchain that is not the project's.
  - Cross-links [`address-story-worktrees-consistently`](address-story-worktrees-consistently.md), which fixed how agents *address* the worktree but not what is inside it.
