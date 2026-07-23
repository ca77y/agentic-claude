---
type: story
title: Make the coder raise production hazards it worked around as findings
---

# Make the coder raise production hazards it worked around as findings

- [x] Make the coder raise production hazards it worked around as findings #improvement 🔼 🆔 raise-production-hazards-as-findings
  - When the `coder` works around a scenario because a *production* dependency behaves badly — not because the test harness is awkward — the finding currently has no channel out of the unit except the diff itself. It gets written up as a rationale comment on a test fixture, where it reads as a justification for a fixture choice rather than as a reported production risk.
  - Background: while building fake upstreams for a readiness-probe unit, the coder discovered that a refused or hung connect to the upstream makes the transport's underlying event-source package retry every ~3 seconds forever, with no way to stop it from outside the client factory. That is the production behaviour of the exact dependency the new readiness endpoint polls, and the story card's own manual reproduction steps — stop the container, block the port with a listener that never responds — drive straight into it. The finding was written up carefully and accurately, but only as a header comment in three test files. The spec's own Risks section had told the coder to "report it as a finding" if a scenario proved unworkable; with no channel for that, the hazard reached review only because a reviewer read the test comments and then verified the vendored package's source by hand.
  - A rationale comment on a fixture and a reported production defect are different artifacts with different readers. The comment alone routes a production risk to whoever next edits that test file.
  - Scope: `plugins/ca77y-engineering/agents/coder.md`, and the `lead`'s report and pull-request contents in `lead.md` so the hazard reaches the human.
  - Acceptance criteria:
  - The `coder` distinguishes a test-harness inconvenience from a production hazard when it works around a scenario.
  - A production hazard is raised in the completion report to the `lead` as an explicit finding, in addition to any code comment it warrants.
  - The report names the dependency and version, the behaviour, and which spec scenario or acceptance step it affects.
  - The `lead` carries reported hazards into the pull request rather than leaving them in the agent transcript.
  - The existing escalation rule — escalate what cannot be resolved or what the spec gets wrong — is extended rather than duplicated.
