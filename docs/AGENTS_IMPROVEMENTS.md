# Agents improvements

Pipeline friction observed during runs, with concrete proposals. Append only.

### The simplify pass needs the governing spec, or it cuts spec-required content

**Area**: agent:reviewer

**Observed**: On `generalize-audit-findings-to-the-property`, `/simplify` was dispatched over the diff alone. The task's artifact was prose whose exact propositions are mandated clause by clause by the spec's Requirements scenarios (e.g. *"it says the restatement is what the fix is written against and the named examples only say where to start looking"*). The cleanup agents correctly identified that several of those clauses are restatements of neighbouring sentences and cut three of them. Every cut was a genuine redundancy and every one broke an acceptance scenario. The `reviewer` only caught it because it happened to read the spec afterwards to size the code review; had it not, a clean-looking simplify pass would have silently failed the acceptance gate a round later.

**Suggested change**: In `reviewer.md`, require the simplify step to locate the task's spec first and pass it to the pass as a constraint — *"these propositions are required by the spec's Requirements; redundancy between them is intentional and out of bounds for cleanup"*. Redundancy that a spec mandates is not a cleanup target, and the pass cannot know which redundancy is mandated without the spec in hand. This matters most for docs and agent-definition work, where the artifact is prose and the spec quotes it directly.

### A spec scenario that mandates a cross-agent promise needs the other agent's text cited

**Area**: agent:writer

**Observed**: On `generalize-audit-findings-to-the-property`, a Requirements scenario mandated that `writer.md` state a specific payoff — *"acknowledging such a criterion in Validation without an owner and a Tasks entry leaves it for a later audit round to find one criterion at a time"* — and the implementation stated it verbatim. The payoff is only real if some *other* agent honors the named owner. It does not: `auditor.md`'s acceptance-gate paragraph is unconditional (*"A criterion nothing in the work addresses is a finding even when everything that was built works perfectly"*), and grepping `owning mechanism` / `not the coder` / `Tasks entry` across `auditor.md`, `lead.md`, and `coder.md` returns zero hits. The scenario passed the readiness gate and the code review caught it only by tracing the claim into the sibling definitions by hand.

**Suggested change**: Add a `### Spec authoring rules` rule: when a scenario requires a definition to assert a consequence that some other agent has to realize — a gate treating something differently, a downstream pass picking work up — cite the sentence in that agent's definition that realizes it, or state the payoff only in terms the edited agent achieves on its own. A cross-agent promise no other definition carries reads as implemented while changing nothing, and the acceptance gate reads the card, not the sibling file that would have to honor it.

### A fresh reviewer cannot see what the previous round's fix replaced

**Area**: agent:lead

**Observed**: On round 2 of `generalize-audit-findings-to-the-property`, the caller asked the `reviewer` to verify that two round-1 findings had been correctly reworded. Per `lead.md`'s `## The commit model`, only the spec is committed (commit 1); everything else stays uncommitted until ship (commit 2). So round 1's pre-fix wording existed nowhere — not in `git log`, `git stash`, or the reflog — and the round-2 `reviewer` could only see the post-fix text. This has a concrete cost beyond weaker verification: the simplify pass proposed cutting a sentence in `writer.md`'s W4 rule that three of four cleanup agents independently confirmed was unmandated by the spec and redundant, but that sentence was plausibly *itself* the round-1 remediation for the flagged overclaim. With no way to tell a remediation from filler, the only safe call was to skip a legitimate cleanup — the simplify pass is silently degraded on every round after the first.

**Suggested change**: In `lead.md`'s `## The commit model`, commit each fix round in the story worktree the way the PR-review loop already does ("One commit per PR-review fix round"), or at minimum commit once after the `coder` applies a review round's findings. Then a fresh `reviewer` can diff round N against round N-1 and verify a reworded fix against the text it replaced. Alternatively, have the `lead` pass the previous round's findings verbatim when it dispatches the next `reviewer`, so the reviewer at least knows which sentences are remediations and must not be simplified away.

### The docs pass routes to doc categories the project may not have

**Area**: agent:writer

**Observed**: On the docs pass of `generalize-audit-findings-to-the-property`, `writer.md` step 3 gives a fixed routing table — capability behavior to "the feature docs", journeys to "the flow docs", UI/system design to "the design docs" — and step 4 says to fold the spec into "the right permanent home above", with the final report asking "which content went to features / flows / designs". This project has no such categories: `docs/CLAUDE.md` routes durable content to `PRODUCT.md`, `ARCHITECTURE.md`, and the root `README.md`, and additionally states that prose about how an agent should behave belongs in the agent definition and *not* in docs at all — so the correct outcome here was to create no doc. Followed literally, the routing table produces an invented `features/` entry restating the agent prose. The `lead` had evidently hit this before: its dispatch prompt spent a paragraph pre-empting it ("Do NOT invent a features/flows/designs doc entry that just restates the agent prose"), which is a manual workaround for something the definition should say itself.

**Suggested change**: In `writer.md`'s docs pass, state the categories as an example mapping rather than the target set — "route by kind (behavior / journey / design); the project's documentation conventions name the actual documents, which may be a different set entirely" — and add the case the table has no row for: when the project's conventions say the durable home for this content *is* the artifact that was already changed, the correct output is no new doc, reported as such. Mirror the same softening in the final-report template so it does not ask which of features/flows/designs received content when the project has none.
