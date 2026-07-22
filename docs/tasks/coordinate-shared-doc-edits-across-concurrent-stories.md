---
type: story
title: Coordinate shared-doc edits across concurrent stories
---

# Coordinate shared-doc edits across concurrent stories

- [ ] Coordinate shared-doc edits across concurrent stories #improvement 🔼 🆔 coordinate-shared-doc-edits-across-concurrent-stories
  - When several stories are in flight at once, more than one docs pass can owe an edit to the same shared file — the root `README.md`'s per-agent sections, or `ARCHITECTURE.md`. The only coordination the pipeline offers is an advisory prose note in each spec, and the record of a deferred edit lives only in the spec, which the docs pass then deletes.
  - Background: `docs/CLAUDE.md` makes the root `README.md` the user-facing description of **every** agent, to be updated whenever an agent's behavior changes. Three sibling stories changed three different agent definitions concurrently, so all three docs passes owed edits to adjacent `### <agent>` sections of one file across three unmerged PRs. The `lead` resolved it by forbidding the README edit and having the docs pass flag it as undone — safe, but the README drifts behind the definitions with nothing tracking the debt once the PR closes. `writer.md`'s docs pass step 7 makes spec removal conditional on the `auditor` gate alone; the spec's `Coordination` section was the only record of the deferral, and step 7 deletes the spec — so following the definition literally destroys the record of an unmet obligation and reports the docs tree consistent.
  - Scope: `plugins/ca77y-engineering/agents/writer.md` (docs pass), and `lead.md` for detecting the collision and surfacing the deferral.
  - Acceptance criteria:
  - When an owed durable-doc edit cannot be made in this pass — a concurrent sibling holds the file, or the change belongs in a later shared PR — the docs pass re-homes the obligation into a durable artifact outside the spec before the spec is removed: a follow-up board card, which `docs/CLAUDE.md` already prescribes for an identified-but-undone change.
  - The spec-removal rule is restated: the spec may be removed once every obligation it carries has either been written into durable docs or re-homed this way, *and* the `auditor` gate has passed — not on the gate alone.
  - The `writer`'s final report names any re-homed obligation and the artifact that now carries it.
  - When the `lead` detects a sibling story in flight that also changes agent behavior and owes the same shared-file region, the deferral is a tracked decision rather than a paragraph that disappears with the PR.
  - An alternative resolution — writing the owed hunk to a per-story file (e.g. `docs/_pending-readme/<slug>.md`) folded in by a later card — is considered in the story; it picks one mechanism rather than mandating both.
  - Cross-links [`document-researcher-evidence-discipline-in-readme`](document-researcher-evidence-discipline-in-readme.md), the concrete README debt this mechanism would have tracked.
