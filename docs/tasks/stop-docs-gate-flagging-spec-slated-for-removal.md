---
type: story
title: Stop the docs-pass audit gate flagging the spec it is about to remove
---

# Stop the docs-pass audit gate flagging the spec it is about to remove

- [ ] Stop the docs-pass audit gate flagging the spec it is about to remove #improvement 🔼 🆔 stop-docs-gate-flagging-spec-slated-for-removal
  - `writer.md`'s docs pass leaves the spec in place while the `auditor` gate runs — "removal happens only after the gate passes, so a blocked audit leaves the run resumable" — but the auditor then reads the still-present spec as the pass's headline defect and returns NOT-READY. The two instructions are individually reasonable and jointly guarantee one wasted audit round on every docs pass whose only remaining step is the deletion.
  - Background: this happened even though the gate dispatch stated the spec was "still present, slated for removal". The auditor called it "the one filesystem action that makes it a docs pass" and blocked, costing a full extra audit round (~80k subagent tokens) to clear something that was never a defect.
  - Scope: `plugins/ca77y-engineering/agents/writer.md`, docs pass (steps 6–7) and the gate dispatch it issues to the `auditor`.
  - Acceptance criteria:
  - The ordering of spec removal versus the docs-pass `auditor` gate is settled in `writer.md` so the still-present spec is never the gate's headline defect.
  - Either resolution is stated explicitly: removal moves ahead of the gate, with the writer stating in the dispatch that the spec was deleted in commit-pending state (recoverable by `git checkout` since the `lead` has not committed); **or** the order stays and the gate dispatch puts the spec's presence explicitly out of scope — "the spec is deleted by this pass after your verdict; judge only whether its content has a home, do not report its presence as a finding".
  - The chosen resolution keeps the run resumable on a genuinely blocked gate, which is the reason the current ordering exists.
  - A docs pass whose only remaining step is the spec deletion no longer costs an extra audit round.
  - Cross-links [`sequence-acceptance-gate-around-docs-pass`](sequence-acceptance-gate-around-docs-pass.md), a related gate-ordering issue on the `lead`'s acceptance gate rather than the writer's docs-pass gate.
