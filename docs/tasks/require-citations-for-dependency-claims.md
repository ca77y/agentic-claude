---
type: story
title: Require citations for third-party behaviour claims in specs
---

# Require citations for third-party behaviour claims in specs

- [ ] Require citations for third-party behaviour claims in specs #improvement 🔼 🆔 require-citations-for-dependency-claims
  - A spec can assert how a vendored dependency behaves as plain fact. Nothing requires evidence for the claim, and nothing re-checks it once the code exists — so a false claim propagates into the implementation, the commit message, and the docs.
  - Background: a post-review amendment stated as fact that "closing aborts the EventSource, which both stops the retry loop and settles a wedged in-flight connect". The first half was true. The second was not: in the pinned version of that package, the fetch-error handler skips both the reconnect and the `error` event when the error is an abort, and `close()` sets the ready state to closed so a later reconnect schedule returns early — meaning the transport's connect promise, which settles only on that error event or on an endpoint event, never settles when a hung connect is closed. The claim propagated unchallenged into the fix's commit message. It went unnoticed because the scenario written for it asserted an observable outcome — a later probe recovers — which held for a different reason entirely: the shared state was nulled, not because the connect settled.
  - A spec claim about a dependency is load-bearing in exactly the way a test assertion is, but only the assertion is required to be checkable.
  - Scope: `plugins/ca77y-engineering/agents/writer.md` for the authoring rule, `auditor.md` for the verification rule.
  - Acceptance criteria:
  - A spec claim about how a third-party dependency behaves carries a `package@version` plus a file-and-line citation, one per distinct mechanism claimed.
  - A claim that cannot be cited is phrased as an assumption, so the round that verifies it knows it is untested.
  - The round verifying a fix checks the cited mechanism itself, not only the scenario's observable outcome.
  - A scenario whose observable outcome could hold for a reason other than the claimed mechanism is identified as such at authoring time.
  - The rule sits alongside the existing spec-authoring rules and does not duplicate the context7 guidance already given to the `coder`.
