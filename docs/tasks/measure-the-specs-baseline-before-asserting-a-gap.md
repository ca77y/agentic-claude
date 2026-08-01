---
type: story
title: Make a spec measure its baseline instead of inheriting it
---

# Make a spec measure its baseline instead of inheriting it

- [ ] Make a spec measure its baseline instead of inheriting it #improvement ⏫ 🆔 measure-the-specs-baseline-before-asserting-a-gap ⛔ install-dependencies-in-story-worktrees
  - A spec's value rests on a claim about the current state of the system — "the code lacks X", "this check passes today". Nothing in `writer.md` requires that claim to be **observed**. Inherited from a card, it produces acceptance scenarios that already pass before the task starts, or a Boundary that excludes the very file the build must edit.
  - Background (declared config is not effective config): the `native-platform-config` spec was built on the card's "verified gaps on disk" — `app.json` sets no iOS `UIBackgroundModes` and does not register `expo-notifications`. Both true of `app.json`, both false of the merged native config: `expo-audio@57.0.0` pushes `"audio"` into `UIBackgroundModes` unconditionally, and `@expo/prebuild-config` auto-applies the notifications plugin, entitlement included. One introspection command against the *unmodified* tree would have shown it; nobody ran one. Two headline acceptance scenarios would have passed before a line was written. The auditor caught one instance, sweeping the property found a second, and the revision itself re-introduced a third. The pattern generalizes to any config/codegen/plugin layer — Expo plugins, webpack/vite defaults, framework auto-configuration: declared config and effective config are different artifacts.
  - Background (a green suite is a claim, not a fact): the `quality-gate-ci` spec existed to run the repo's existing scripts in a fresh environment, and its Boundary excluded everything else, including `apps/mobile/jest.setup.js`. The "suite is green — 94 tests, 3 projects" assumption came from the card and held only in a long-lived dev checkout with stale artifacts. In a fresh clone two suites fail on a `react-native-reanimated` mock missing `createAnimatedComponent` and `useEvent` — the gate would have been red on its first CI run. The build had to edit a file the Boundary and Deviations never mention, and the acceptance auditor flagged the omission.
  - The existing rule that validation must "reach every consumer" covers what the task changes; nothing covers whether the task's **starting assumption** holds in the environment the task introduces.
  - Scope: `plugins/ca77y-engineering/agents/writer.md`, spec-pass authoring rules.
  - Acceptance criteria:
  - A spec may not assert that the system lacks a capability without observing the built, merged, or effective artifact that would carry it — not only the source that declares it.
  - Where the project has a command that renders effective state (an introspect/resolved-config dump, a build output, `tsc --showConfig`), the `writer` runs it against the unmodified tree during the spec pass and records the measured baseline in the spec, so the coder and the acceptance gate scope their assertions against observed state.
  - When a spec's value depends on an existing command's current result (a CI gate, a pre-commit hook, a smoke check), the `writer` runs that command in the story worktree before writing any Boundary exclusion that assumes it, and records the observed result.
  - If that command fails, the failing file is in scope by definition and the Boundary and Deviations say so, rather than deferring it to an Escalation the build has to override anyway.
  - The `writer` applies a self-check to its own draft: for every requirement, "would this scenario pass against the tree as it is today?" — any that would is not testing this task.
  - Depends on [`install-dependencies-in-story-worktrees`](install-dependencies-in-story-worktrees.md): the `writer` cannot run a project command in a worktree that has no dependencies.
  - Cross-links [`require-citations-for-dependency-claims`](require-citations-for-dependency-claims.md) — that card governs claims about a dependency's documented behaviour; this one governs claims about the project's own current state.
