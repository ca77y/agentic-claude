---
type: story
title: Require a spec to cite the agent text that honors a cross-agent promise
---

# Require a spec to cite the agent text that honors a cross-agent promise

- [ ] Require a spec to cite the agent text that honors a cross-agent promise #improvement 🔼 🆔 cite-cross-agent-promises-in-specs
  - A Requirements scenario can mandate that a definition assert a payoff only some *other* agent can realize. The edited agent states it verbatim and the scenario passes, but no other definition honors it — so the promise reads as implemented while changing nothing. The acceptance gate reads the card, not the sibling file that would have to honor it, so nothing catches this except a reviewer tracing the claim by hand.
  - Background: on `generalize-audit-findings-to-the-property`, a scenario mandated `writer.md` state that "acknowledging such a criterion in Validation without an owner and a Tasks entry leaves it for a later audit round to find one criterion at a time". The payoff is real only if some agent honors the named owner — but `auditor.md`'s acceptance-gate paragraph is unconditional, and grepping the owner language across `auditor.md`, `lead.md`, and `coder.md` returned zero hits. The scenario passed the readiness gate; the code review caught it only by tracing into the sibling definitions.
  - Scope: `plugins/ca77y-engineering/agents/writer.md`, spec-authoring rules.
  - Acceptance criteria:
  - A spec-authoring rule states: when a Requirements scenario requires a definition to assert a consequence some other agent must realize — a gate treating something differently, a downstream pass picking work up — the spec cites the sentence in that agent's definition that realizes it, or states the payoff only in terms the edited agent achieves on its own.
  - The rule names why it matters: the acceptance gate reads the card, not the sibling file, so an unrealized cross-agent promise reads as implemented while changing nothing.
  - A cross-agent promise no other definition carries is caught at authoring time rather than by a reviewer tracing it by hand.
  - The rule sits alongside the existing spec-authoring rules and does not duplicate [`require-citations-for-dependency-claims`](require-citations-for-dependency-claims.md), which covers third-party *dependency* behaviour; this covers cross-*agent* promises.
