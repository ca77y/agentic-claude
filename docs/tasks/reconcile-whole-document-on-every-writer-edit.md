---
type: story
title: Make every writer edit reconcile the rest of the document
---

# Make every writer edit reconcile the rest of the document

- [ ] Make every writer edit reconcile the rest of the document #improvement ⏫ 🆔 reconcile-whole-document-on-every-writer-edit
  - The `writer` edits the section it was sent to edit and leaves the rest of the artifact stating the superseded thing. In a spec this ships two live contradictory instructions to the `coder`; in a docs pass it re-publishes a claim the product contract already forbids.
  - Background — an amendment that contradicts its own checklist: a spec gained a post-review amendment in its Design section explicitly superseding an earlier rule, stating that a probe function must reset its client on **every** failure branch "including `timeout`". The Tasks checklist further down the same file was never reconciled and still instructed the coder to "reset `client`/`connecting` on rejection only (not on timeout)" — the exact rule the amendment overturned. Neither reads as obviously stale: the amendment announces itself only in Design, and the Tasks entry carries no marker that it predates the amendment. A coder working the checklist implements the superseded behaviour; a reviewer checking the diff against the checklist reports a false finding.
  - Background — a stale claim surviving the paragraph rewritten around it: two documents stated that a component runs "against a synced/exported copy of the SQLite DB", directly contradicting the product document's explicit principle that this phase is *not* built against a hand-exported data copy, and contradicting the architecture document's own wording ("never a hand-exported copy the user maintains"). A docs pass rewrote the paragraphs immediately above and below that sentence in both files — renaming a package path, updating a tree diagram, rewriting an adjacent bullet — and left the contradictory sentence untouched in both. It has now survived at least two docs passes. Renaming an old path inside a wrong sentence still ships the wrong sentence.
  - Scope: `plugins/ca77y-engineering/agents/writer.md`, both the spec pass and the docs pass.
  - Acceptance criteria:
  - Writing a spec amendment requires reconciling every other section of that spec in the same pass — Tasks entries, Requirements scenarios, and the Validation list — not as a follow-up.
  - An amendment enumerates which existing bullets it invalidates and edits them in the same pass, so the spec never carries two live instructions for one decision.
  - When the docs pass touches a paragraph, it checks every sentence in that paragraph — not only the lines it is mechanically editing — against the product document's stated principles, not just against the shipped tree.
  - A sentence that contradicts a stated product principle is corrected or removed even when the edit that surfaced it was unrelated.
  - The writer's final report names any contradiction it found and fixed outside the section it was dispatched to change.
