---
type: story
title: Give issue-note shaping an owner and a provisional-status rule
---

# Give issue-note shaping an owner and a provisional-status rule

- [ ] Give issue-note shaping an owner and a provisional-status rule #improvement 🔽 🆔 own-issue-note-shaping
  - No agent in the roster owns the issue-note area — the place a project records a real problem for which no fix could be identified on its own side. Nothing defines when a note may claim a confirmed root cause, so notes get written as settled findings while the investigation that would confirm them is still outstanding.
  - Background: an issue note stated, in its `Status` line and again under "why no solution could be identified", that the root cause was confirmed to sit outside the repository's control — an upstream proxy's exit-IP reputation. Its own Reproduction section, in the same file, recorded the protocol that would confirm or refute that exact hypothesis as "not yet performed". The evidence offered — near-identical rejection timestamps across seven providers — was equally explained by the service's own concurrent per-engine fan-out, which by design hits every active engine within the same second, so the note's "strongest single piece of evidence" did not discriminate between the upstream-reputation hypothesis and the project's own request volume, which the note elsewhere conceded it could not rule out. The area's own README frames an issue note as the durable record of an investigation that *concluded*, which reads as settled rather than as a hypothesis pending its own confirmation step.
  - Scope: assign the area to an existing agent and add the shaping rule to its definition. The `writer` (already the owner of non-code prose artifacts) and the `analyst` (already the owner of deciding what becomes trackable work) are the two candidates; the story should settle which and say why.
  - Acceptance criteria:
  - Exactly one agent definition names the issue-note area as its responsibility, and the choice is justified against that agent's existing scope.
  - A note may present a confirmed root cause only when the reproduction that confirms it has actually been run.
  - When the confirming reproduction is outstanding, the note's status and its conclusion section are both phrased as provisional — "suspected, unconfirmed" rather than settled — and an unperformed reproduction step blocks a confirmed-root-cause framing rather than appearing as a footnote.
  - The rule states that evidence consistent with more than one hypothesis does not select between them.
  - The owning agent's boundaries still forbid it from converting an issue note into a story on its own; that remains the human's call, per the existing rule that a note is replaced by a card once a fix becomes identifiable.
  - See [`../CLAUDE.md`](../CLAUDE.md) for when a problem belongs in `issues/` rather than `tasks/`.
