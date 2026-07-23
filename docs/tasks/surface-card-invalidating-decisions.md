---
type: story
title: Surface decisions that invalidate another card's recorded relationship
---

# Surface decisions that invalidate another card's recorded relationship

- [x] Surface decisions that invalidate another card's recorded relationship #improvement 🔽 🆔 surface-card-invalidating-decisions
  - Two cards can each carry a hand-written coordination note describing their relationship. When a decision changes that relationship, only the card being newly blocked gets updated — the other side keeps asserting the old arrangement, and no agent is responsible for noticing.
  - Background: two sibling stories each carried a note describing their relationship as parallel. A decisions session settled that the first story now relocates a subdirectory, making the two sequential. The second card was updated — "no longer parallel", plus a blocking dependency marker. The first card still said "these two root-structure stories are parallel" and "prefer project references over relocating the app" — the exact opposite of what its own spec's first decision settles. The spec's Tasks list only tasked updating the *other* card, missing that its own source card had become the stale one.
  - The pipeline deliberately never writes cards — the board is the human's — so the fix is a reporting obligation, not a card edit. The `writer` discovers the contradiction while speccing; the `lead` is what the human actually reads.
  - Scope: `plugins/ca77y-engineering/agents/writer.md` (spec pass) and `lead.md` (final report). Do not give either agent write access to the board.
  - Acceptance criteria:
  - When a spec settles a decision that contradicts a relationship recorded on any card — not only the card the spec was written from — the `writer` treats both sides as one finding rather than tasking an edit to the counterpart alone.
  - The `writer` searches sibling cards for coordination or dependency prose describing the relationship the decision changes, instead of relying on an audit to flag the pair.
  - Each contradiction is reported as a named board follow-up: which card, which sentence, and what it should now say.
  - The `lead` relays those follow-ups in its final report and in the PR description, so the human owning the board sees them without reading the spec.
  - Neither agent gains permission to edit card files.
  - See [`../tasks/CLAUDE.md`](../tasks/CLAUDE.md) for the rule that card status and content are the human's.
