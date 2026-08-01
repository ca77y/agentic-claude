---
type: story
title: Stop the spec commit from breaking the gate the spec demands
---

# Stop the spec commit from breaking the gate the spec demands

- [ ] Stop the spec commit from breaking the gate the spec demands #bug ⏫ 🆔 format-the-spec-before-the-lead-commits-it
  - The spec is committed to the story branch as commit 1 without ever passing the project's formatter, so a repo-wide lint gate can be red before the coder writes a line — and the first agent to see it is `qa`, which has to bisect a failure back to a document two agents ago before it can report the build honestly.
  - Background: validating the `timer-cue-sync` build, `make lint` failed on no code at all. `pnpm lint` runs `eslint .` **and** `prettier --check .` across the whole repository; the only offending file was `docs/specs/timer-cue-sync.md`, already committed as `7997b36 docs(spec): add timer-cue-sync spec`. Prettier normalises `*emphasis*` to `_emphasis_` and the spec used `*…*` throughout — 78 differing lines. All seven of the coder's changed files were clean. The spec's own Validation section requires "`make lint` … passes with no new errors" as an acceptance scenario, so the spec commits a document that breaks the gate the spec itself demands.
  - Nobody owns it: `writer.md` authors the spec and "creates no commits"; `lead.md` step 3 says "commit the spec (commit 1)" and says nothing about the project's formatter. Docs are inside the lint scope of many projects, so this recurs wherever that is true.
  - Scope: `plugins/ca77y-engineering/agents/lead.md` (the commit model, step 3) or `writer.md` — one owner, stated once.
  - Acceptance criteria:
  - Committing the spec includes running the project's format/lint step over the spec path, so commit 1 never lands a document that fails the project's own gate.
  - The owner is unambiguous: either the `writer` returns a spec already formatted to the project's style, or the `lead` formats it immediately before commit 1 — the definition names one.
  - As a floor, if the project has a lint command, the `lead` runs it once after commit 1 and before dispatching the `coder`, so a doc-only gate failure is caught while it is still attributable to the spec pass.
  - The rule is project-agnostic: it refers to whatever format/lint command the project defines, not to prettier or `make lint` specifically.
  - `qa` is not the first agent to discover a spec-commit gate failure.
