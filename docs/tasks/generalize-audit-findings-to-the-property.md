---
type: story
title: Generalize an audit finding to its property before fixing or verifying it
---

# Generalize an audit finding to its property before fixing or verifying it

- [x] Generalize an audit finding to its property before fixing or verifying it #improvement 🔼 🆔 generalize-audit-findings-to-the-property #important
  - An audit finding illustrates a general property with a few named examples. The revision fixes the named examples, the re-audit verifies the named examples, and the property stays broken everywhere the finding's prose did not happen to point.
  - Background — a coverage gap fixed for three of nine cases: a round-2 audit flagged "no scenario verifies that three named functions are routed through the shared operation wrapper without altering their return values — these three have zero test coverage". Round 3 added a scenario naming exactly those three and fixed them. The underlying property — every one of the nine public tool functions the unit routes through the wrapper is exercised by a scenario that would fail if the wrapping were skipped or the return value altered — was never restated as the actual requirement. Two of the nine are invoked by zero scenarios anywhere in the spec, and two more only for an unrelated assertion. The identical gap the finding described persists for four of nine, just not the three it happened to name.
  - Background — an owner named for one criterion of a matching set: a spec was revised to add an explicit owning mechanism for a card's documentation acceptance criterion, with its own subsection and a Tasks entry marked "not the coder's task". The same card carried another criterion outside the coder's automated scope — manual reproduction steps that had to be executed and their results recorded — which the spec's Validation section acknowledged but never assigned an owner, a time, or a Tasks entry. One gap of the shape "present on the card, absent from the Tasks checklist, no stated owner" got closed; its identical siblings were left for a later audit round to find one at a time.
  - Scope: `plugins/ca77y-engineering/agents/writer.md` (the revision side) and `auditor.md` (the verification side).
  - Acceptance criteria:
  - Before writing a fix for an audit finding, the `writer` restates the finding as the general property it is an instance of.
  - The fix is checked against every instance the property applies to — the full enumerated set the spec names — not only the examples the finding's prose used.
  - When a spec resolves one out-of-scope acceptance criterion by naming its owning mechanism, the same pass sweeps the card's remaining criteria for the same pattern.
  - The `auditor` re-checking a revision performs the same generalization, and verifies the property rather than the named examples.
  - Both definitions state that an audit finding's examples are illustrative unless the finding says otherwise.
