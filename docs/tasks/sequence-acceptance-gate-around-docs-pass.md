---
type: story
title: Stop the acceptance gate failing criteria the docs pass exists to satisfy
---

# Stop the acceptance gate failing criteria the docs pass exists to satisfy

- [ ] Stop the acceptance gate failing criteria the docs pass exists to satisfy #improvement 🔼 🆔 sequence-acceptance-gate-around-docs-pass
  - The `lead` runs the acceptance gate at step 6 and the docs pass at step 7. Any acceptance criterion phrased as "docs and code agree" is therefore audited before the step that makes it true, and returns NOT-READY by construction.
  - Background: a story's second criterion read "the `src/` ↔ architecture-`/ui` naming is reconciled **so docs and imports agree**", and its seventh hinged on the card's own coordination prose being consistent. Both are satisfied only once the docs pass reconciles the architecture document, the README, and the project instructions file. The acceptance audit returned NOT-READY on exactly the two criteria the *next* step exists to fix, forcing a docs pass plus a manual re-verify instead of a clean gate. Every story whose criteria include a doc-consistency clause hits this.
  - A docs-only NOT-READY is also misread downstream: findings route to the `coder`, which cannot satisfy a criterion that the `writer` owns.
  - Scope: `plugins/ca77y-engineering/agents/lead.md`, and `auditor.md` if the gate needs to distinguish criterion classes. Pick one of the two resolutions rather than both.
  - Acceptance criteria:
  - The `lead` classifies each acceptance criterion as code-satisfied or documentation-satisfied before the gate runs.
  - A documentation-satisfied criterion is either audited after the docs pass, or declared to the auditor as pending it — the definition states which resolution the pipeline uses and why.
  - A NOT-READY on a documentation-satisfied criterion is never routed to the `coder`; it is closed by the `writer`'s own auditor gate.
  - The three-round cap on the acceptance gate is unaffected by the reordering.
  - The `lead`'s workflow ordering and the round-cap wording stay consistent with each other after the change.
