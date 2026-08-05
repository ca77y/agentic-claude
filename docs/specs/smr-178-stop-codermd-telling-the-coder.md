# Stop `coder.md` telling the coder it is always resumed with findings

- **Status**: Draft
- **Task**: smr-178-stop-codermd-telling-the-coder-it-is-always-resumed-with
- **Last Updated**: 2026-08-06
- **Document Scope**: One unit of work: make the four worker definitions and the root `README.md` describe how a findings round reaches a worker exactly as `plugins/ca77y-engineering/skills/lead/SKILL.md` already does

---

## Goal

`plugins/ca77y-engineering/agents/coder.md` tells a coder that a resume is how a findings
round reaches it. Since SMR-167 the `lead` skill routes a round either way — a
`SendMessage` resume when it holds a resumable agentId for that worker, a fresh dispatch
carrying the findings when it does not — so a freshly dispatched coder reads a definition
asserting a situation it is not in.

Three sites in `coder.md` carry the claim (line numbers as of this branch's base commit
`42fcb81`):

- **`:3`**, the frontmatter `description` — *"The lead dispatches it once and resumes it
  with qa and acceptance-gate findings, which it applies in one go"*.
- **`:36`**, the lead-in to `## Fixing the findings the lead routes to you` — *"The `lead`
  resumes you — the same agent, in the same worktree — with findings from `qa` or the
  acceptance gate."*
- **`:68`**, the reporting contract — a clause keyed on *"When resumed with findings:"*,
  which a freshly dispatched coder holding findings may not read as applying to it.

**This is not documentation drift.** It changes what a worker believes about its own
situation. A fresh coder is told it carries prior build context it does not have — so it
may answer "what changed since round 1?" from a recollection it never had rather than from
the commit references it was handed — and the paragraph that governs how it reports the
round appears, by its own wording, not to cover the round it is actually running.

**The change.** Five files — `coder.md`, `writer.md`, `qa.md`, `auditor.md`, and the root
`README.md` — are brought into agreement with the contract `skills/lead/SKILL.md` shipped
in SMR-167. `coder.md` and `writer.md` gain both routes as facts of equal standing, plus a
statement of what a freshly dispatched worker does and does not carry. `qa.md` and
`auditor.md` state positively that every round they run is a fresh dispatch and that they
are never resumed, and shed the residual clauses that presuppose otherwise. The `README.md`
per-agent prose is re-mirrored in the same change.

**User value.** A worker's definition stops contradicting the orchestrator that dispatched
it, so a fresh coder or writer recognises its own findings round as one, knows which
reporting rules govern it, and reads the spec and the round's diff from the paths and
commits it was given instead of from context it does not hold.

**Non-goals.**

- **No change to `skills/lead/SKILL.md`.** SMR-167 shipped its side of this contract and
  it is correct as it stands; here it is the authority, not the artifact. The card puts it
  out of scope.
- **No drift guard.** The `docs/AGENTS_IMPROVEMENTS.md` entry *"The dispatch contract has
  semantic mirrors with no drift guard"* proposes a mechanism for catching exactly this
  class of defect. Building it is a separate story (the card puts it out of scope), so the
  entry **stays in the file** — this change fixes one instance, it does not foreclose the
  finding.
- **No re-prescription of a dispatch mode.** SMR-167 removed every sentence fixing
  `run_in_background` to a value. Nothing added here may tell the `lead` which mode to use,
  or tell a worker which mode it should have been dispatched in.
- **No new claim about the harness.** In particular, nothing added may state *why* a
  `lead` might hold no resumable agentId. `docs/ARCHITECTURE.md` records the
  synchronous-dispatch-surfaces-no-agentId asymmetry as *"an **observation** from two runs,
  not a certified harness mechanism"* (`docs/ARCHITECTURE.md:174-176`). The definitions
  state only the invariant that survives either answer: the `lead` resumes a worker whose
  agentId it holds, and dispatches a fresh one when it does not.
- **No version bump.** Versions are a deliberate human decision per the root
  [`CLAUDE.md`](../../CLAUDE.md); neither manifest of any plugin is touched.
- **No edit to either canonical duplicated paragraph** — *"Addressing the story
  worktree."* (five files) or *"Working from the board profile."* (two files) — which
  would force byte-identical edits across every copy.
- **No new file, no new script, no new tooling.**

## Design

### The contract, as shipped

`plugins/ca77y-engineering/skills/lead/SKILL.md` is the authority for every claim the five
files may make about routing. Quoted verbatim at `42fcb81`:

- **Both routes, of equal standing** (`SKILL.md:32`): *"What a resume buys you is the
  worker's preserved context across rounds — that is a benefit, not the only route: when
  you hold no resumable agentId for the worker a round needs to reach, carry the round
  forward instead with a **fresh** dispatch of the same role, carrying the spec path, the
  worktree path and its provisioning status, the board profile where the worker needs one,
  the round's commit references, and the findings (inline or by the findings-file path — see
  *Context discipline*). Either route is a valid way to carry a round forward; the only
  thing a fresh dispatch loses is the previous worker's own context."*
- **`coder`** (`SKILL.md:142`): *"builds the task from the spec, and applies qa and
  acceptance findings either by resuming it (when you hold its agentId) or via a fresh
  dispatch carrying the findings (when you do not). On a fix run against an open PR it is
  always a **fresh** coder that gets the review's findings in its initial dispatch."*
  Also `SKILL.md:92`: *"When it did not, later rounds instead go to a fresh coder, carrying
  the spec path, the worktree and its provisioning status, the findings, and the round's
  commit references."*
- **`writer`** (`SKILL.md:141`): *"The spec it returns is gated by the `auditor`; route
  findings back to the writer to revise — by resuming it if you hold its agentId, or by a
  fresh dispatch carrying the findings if you do not. The docs pass is trusted, no gate."*
  The docs pass itself is *"a fresh dispatch, in whichever mode you choose"*
  (`SKILL.md:99`).
- **`qa`** (`SKILL.md:143`): *"validates the build and reviews the diff. Every round is a
  **fresh dispatch**; route its findings to the `coder`."* Each such dispatch is passed
  *"the commit references — the state the previous round reviewed and the new commit"*
  (`SKILL.md:95`).
- **`auditor`** (`SKILL.md:144`): *"the spec-readiness gate and the acceptance gate. Every
  round is a **fresh dispatch**, never a resume: each gate is meant to be an independent
  critique, and a fresh context re-reads the artifact on its own terms instead of anchoring
  on the verdict it already gave."*

The `analyst` — the auditor's other caller — agrees: it dispatches *"a **new**
`ca77y-engineering:auditor`, never resuming the previous one"* (`analyst.md:44`). So
"never resumed" holds for the auditor across **both** its callers, not only the `lead`.

### What each file says today, and what it must say

Each table row is an **edit site**. A row marked *verify only* is read and reported on
without being changed unless it turns out to state something this change replaces — the
frontmatter rows exist precisely because a stale `description` is wrong product surface,
being what other agents read when choosing a dispatch.

#### `plugins/ca77y-engineering/agents/coder.md`

| Site | Today | Must become |
| --- | --- | --- |
| Frontmatter `description` (`:3`) | *"The lead dispatches it once and resumes it with qa and acceptance-gate findings, which it applies in one go; PR-review findings arrive the same way, or in the initial dispatch when the run is fixing an already-open PR."* | Same summary with both routes: the `lead` routes qa and acceptance-gate findings back to it either by resuming it or by dispatching a fresh coder with the findings, and it applies the set in one go. The PR-review clause stays true and keeps its "initial dispatch on an already-open PR" case. |
| `## Fixing the findings the lead routes to you`, lead-in (`:36`) | *"The `lead` resumes you — the same agent, in the same worktree — with findings from `qa` or the acceptance gate."* | Both routes as facts, plus the fresh-dispatch inventory below. |
| `## Output`, second paragraph (`:68`) | *"When resumed with findings: which you applied and how, …"* | Keyed on the **round**, not the route: the same list governs a findings round however it arrived. |
| `## Output`, first paragraph (`:66`) | Already covers both — *"Dispatched fresh, end your turn with the report as your final message … Resumed, finish the same way"*. | *Verify only.* No change expected. |
| The loop, step 3 (`:28`) and `## Rules` (`:56-62`) | Route-neutral (*"the `lead` … routes any findings back to you"*). | *Verify only.* No change expected. |

The `:36` lead-in must state, in the definition's own voice:

1. **Two routes, both normal.** The `lead` resumes you — the same agent, in the same
   worktree, your build context intact — when it holds a resumable agentId for you; it
   dispatches you **fresh**, carrying the findings, when it does not. Neither is the
   exception. Nothing is said about why it might not hold one (see *Non-goals*).
2. **The already-open-PR case, unchanged in substance.** PR-review findings reach you the
   same two ways *within* a run; on a run that fixes an already-open PR they arrive in your
   **initial dispatch**, because the coder that built the work belonged to an earlier
   session.
3. **What a fresh coder carries — and what it does not.** Freshly dispatched, you hold
   exactly what the dispatch gave you: the findings (inline or as a findings-file path),
   the spec's path, the worktree path and its dependency-provisioning status, and the
   round's commit references. You do **not** carry the previous round's context — not the
   earlier coder's reasoning, not its diff rationale, not which findings it already
   rejected and on what trace. Read the spec from its path and the round's changes from the
   worktree and the commit references rather than recalling them, and treat the findings
   you were given as the whole set for this round.
4. **Then both routes are identical**: the three existing numbered steps, and every rule
   under them (`### Applying a finding`, the pinning-test rule, the rejection-takes-a-trace
   rule, the spec-mismatch rule), apply unchanged either way.

#### `plugins/ca77y-engineering/agents/writer.md`

| Site | Today | Must become |
| --- | --- | --- |
| The mode block (`:14-19`) | *"The `lead` dispatches you **twice per task**, in two distinct modes"*, then *"the `lead` has the `auditor` validate your **spec** before the build and routes its findings back to you to revise."* Silent on how a revision round arrives. | Adds both routes for a **spec-revision round** on the same terms as the coder's, plus the fresh-writer inventory, plus: the **docs pass is always a fresh dispatch**. |
| `## Spec pass` step 4 (`:28`) | *"when findings come back, the `lead` routes them to you"* | Says explicitly that "come back" means either route. One clause; the full statement lives in the mode block, not twice. |
| `## Final report`, first paragraph (`:84`) | Already covers both — *"Dispatched fresh … Resumed, finish the same way"*. | *Verify only.* No change expected. |
| Frontmatter `description` (`:3`) | *"Runs in two modes the lead dispatches separately …"* — no routing claim. | *Verify only.* No change expected; report the outcome either way. |

The fresh-writer inventory: freshly dispatched for a revision round you hold the spec's
path, the worktree and its provisioning status, the board profile, and the auditor's
findings — and none of the earlier round's context, so you read the spec as it now stands
from its path and the card from the board rather than recalling either.

#### `plugins/ca77y-engineering/agents/qa.md`

| Site | Today | Must become |
| --- | --- | --- |
| The dispatch sentence (`:12`) | *"The `lead` calls you each time there is a build to validate — the first build, and after each round of fixes it routes back to the coder."* | Adds that **every one of those is a fresh dispatch and you are never resumed**, and that you therefore hold only what this dispatch gave you — the spec, the worktree and its dependency-provisioning status, and the round's commit references where the `lead` passed them — so you read the worktree as it now stands and diff the round's commits rather than recalling a previous round. |
| `## Boundaries`, report bullet (`:27`) | *"Dispatched fresh, end your turn with the report as your final message … Resumed, finish the same way — the report as your final text …"* | Single-route: every round is a fresh dispatch, so the report is the final message of the turn. The `SendMessage` prohibition and the "final text is the report" rule survive **verbatim in substance**, including the tail naming what a misrouted report loses. |
| Frontmatter `description` (`:3`) | *"Invoked by the `lead` after the coder builds …"* — no routing claim. | *Verify only.* No change expected; report the outcome either way. |

#### `plugins/ca77y-engineering/agents/auditor.md`

| Site | Today | Must become |
| --- | --- | --- |
| `## Re-audits are fresh dispatches` (`:34-36`) | Scoped to re-audits: *"You are dispatched **fresh for every round**, including the re-audit of an artifact you have judged once. Expect no prior context …"* | Generalised to **every** round and every caller: the spec-readiness gate, the acceptance gate, each re-audit of either, and the `analyst`'s story advisor gate — **never a resume**, with the independence reason `SKILL.md:144` gives. The heading is renamed to match its widened scope (nothing in the repo links to it — verified). The existing "expect no prior context" sentence and both paragraphs that follow stay. |
| `## Re-audits …`, report paragraph (`:42`) | *"Dispatched fresh … Resumed, finish the same way — the verdict as your final text …"* | Single-route, exactly as for `qa.md`: the `SendMessage` prohibition and the final-text rule survive in substance. |
| Frontmatter `description` (`:3`) | *"Runs as its own subagent so the critique is never performed by the same context that produced the artifact."* — no routing claim, and consistent with the widened statement. | *Verify only.* No change expected; report the outcome either way. |

#### Root `README.md`

`docs/CLAUDE.md` makes the root `README.md` *"the user-facing description of every
agent"*, to be updated when an agent's behaviour changes — and the card's sixth criterion
names it, so the acceptance gate reads it. It is therefore the **`coder`'s** file on this
task, not the docs pass's.

| Site | Today | Must become |
| --- | --- | --- |
| `### auditor` (`:450-458`) | States the gate roles; silent on routing. | One clause: every round is a fresh dispatch, never a resume, for the same independence reason. |
| `### writer` (`:473-500`) | *"the lead has the `auditor` gate it before the build and routes any findings back to the writer to revise"* — route-neutral. | Names both routes for a spec-revision round, matching `writer.md`. |
| `### coder` (`:421-423`) | Already both routes — *"**resuming it** when it holds a resumable agentId for it, or dispatching a fresh coder carrying the findings when it does not."* | *Verify only.* **No change is required here**; do not restate the fresh-coder inventory in the README. |
| `### qa` (`:439-441`) | Already *"each fresh dispatch handed the round's commit references"*. | *Verify only.* No change expected. |
| The workflow list and `**Dispatch and resume.**` (`:285-355`) | Rewritten by SMR-167; both routes already stated at `:305`, `:317`, `:343-347`. | *Verify only.* Change only a sentence found to disagree. |

### The semantic mirror, enumerated

The `docs/AGENTS_IMPROVEMENTS.md` entry observes that this contract is duplicated
*semantically* across surfaces with no drift guard, and asks a spec that changes one side
to enumerate the others and say, per side, whether it is changed now or carried as a named
follow-up. This spec does that; the enumeration is a deliverable, and the `coder` confirms
each line rather than assuming it.

| Surface | Status |
| --- | --- |
| `plugins/ca77y-engineering/skills/lead/SKILL.md` | **The authority.** Unchanged — out of scope per the card. |
| `plugins/ca77y-engineering/agents/{coder,writer,qa,auditor}.md` | **Changed now**, as tabled above. |
| Root `README.md` | **Changed now** (auditor + writer sections); the rest verified. |
| `plugins/ca77y-engineering/agents/analyst.md:44` | **Verified, no change.** Already *"never resuming the previous one"* — consistent with the widened auditor statement. |
| `docs/ARCHITECTURE.md` § *The dispatch model* (`:138-178`) | **Verified, no change expected.** Already states both routes as equal carry-forwards and resumability as a fact following from the dispatch mode. Structural doc, not per-agent prose. Re-checked by the docs pass. |
| Both `plugins/ca77y-engineering/**/plugin.json` `description` fields | **Verified, no change.** Neither makes a routing claim. No `version` field is touched. |
| `docs/AGENTS_IMPROVEMENTS.md` | **Deliberately unchanged.** The entry is about the missing guard, which this task does not build; it is not foreclosed by this change and must not be removed. |

### How this is validated

**This repository has no test runner, no build, and no validation command** — no
`package.json`, no lockfile, no bootstrap step, as the root `CLAUDE.md` states; the story
worktree's dependency-provisioning status is *not provisioned: no install step*, which is
the expected status here and not a failure. The deliverable is Markdown, so there is
nothing to execute and **no scenario test to write**.

Every requirement below is therefore verified by **inspection of the shipped files**, and
each scenario names its check in a `VERIFIED BY` bullet. Where a check is mechanical it is
given as a command; where the property is about meaning, the check is a read, because a
`grep` hit proves a string exists somewhere and not that the sentence carrying it says the
right thing. The `coder` writes no tests for this task, and `qa` should expect to find no
suite to run — that absence is the expected result here, not a blocker. (This is the
general gap `SMR-157` exists to close for the pipeline as a whole; this spec states the
substitute locally rather than waiting for it — see *Coordination*.)

**Consumers of the changed files.** The agent definitions are loaded by
`plugins/ca77y-engineering/.claude-plugin/plugin.json`, which lists each by path in its
`agents` array, and by the mirrored root `plugins/ca77y-engineering/plugin.json`. No file
is added, removed or renamed, so no registration changes. What a definition **can** break
is its own YAML frontmatter: `description` is a single-line plain scalar, so a rewritten
one that wraps onto a second line, or contains a `": "` sequence or a leading YAML
indicator character, silently breaks the agent's registration. That is checked directly
(below) with a real YAML parse.

**What inspection cannot prove**, stated plainly so a passing gate is not read as more than
it is: that the shipped text names both routes is not evidence that a future coder,
dispatched fresh, actually behaves as if it holds no prior context. The alternative cause
for "the next fresh coder behaved correctly" is simply that its round never depended on
prior context. The only real proof is a live pipeline run, which the project's own
direction requires (`docs/PRODUCT.md`: behaviour changes are validated by running the
pipeline on a live project, not by reasoning about the prompt text). That run is owned and
scheduled in *Tasks*; it is **not** a gate on this card, whose seven criteria are all
satisfiable by inspection of the shipped files.

**No third-party or vendored dependency behaviour is claimed anywhere in this spec.** The
repository has no dependency tree to cite against. Every quoted claim above is a claim
about this repository's own files, given with a path and a line number at `42fcb81` and
verifiable by reading them. The one underlying claim about the **harness** — that a
resume needs an agentId the dispatch produced, and that a synchronous dispatch may surface
none — is not asserted by this spec; `docs/ARCHITECTURE.md:174-176` marks it an observation
rather than a certified mechanism, and the *Non-goals* forbid the definitions from
restating it.

### Boundary

- **The `coder` edits exactly five files**: `plugins/ca77y-engineering/agents/coder.md`,
  `writer.md`, `qa.md`, `auditor.md`, and the root `README.md` — at the sites tabled above
  and nowhere else in them.
- **Out of bounds**: `plugins/ca77y-engineering/skills/lead/SKILL.md`; every other agent
  definition, including `analyst.md`; the `board` skill; `docs/ARCHITECTURE.md`;
  `docs/AGENTS_IMPROVEMENTS.md`; `docs/PRODUCT.md`; `docs/_templates/*`; both manifests of
  every plugin; and any `version` field anywhere.
- **Both canonical duplicated paragraphs are untouchable.** *"Addressing the story
  worktree."* (five files) and *"Working from the board profile."* (two files) stay
  byte-identical; the root `CLAUDE.md` drift checks must still print `1` after the build.
  Every edit site above sits outside both paragraphs.
- **Verification may read more than the build may write.** The mirror enumeration above
  requires reading `SKILL.md`, `analyst.md`, `ARCHITECTURE.md` and both manifests. Reading
  them is required; changing them is not permitted. Any disagreement found in a
  read-only surface is reported, not fixed.

### Coordination

Sibling cards were searched through the board profile's `search` binding (Linear,
`list_issues` over project `Agentic Claude`; the full project list plus a
`coder.md qa dispatch resume findings round` query). Five touch a file this build edits;
whichever lands first must be **detected and reused**, not re-added:

- **`SMR-154` — "Make every writer edit reconcile the rest of the document"** is **In
  Progress right now** on its own branch and edits `writer.md`: a new first rule under
  `### Spec authoring rules`, a cross-reference clause in `### Applying a finding`, a
  rewrite of `## Docs pass` step 5, a new subsection after the docs-pass list, and a line
  in each `## Final report` mode list. **None of those is a site this build touches** (the
  mode block at `:14-19` and spec-pass step 4), so the collision is a textual merge, not a
  semantic one. If `SMR-154` lands first, rebase and re-locate the two sites by their
  wording rather than by line number before editing.
- **`SMR-157` — "Give the pipeline a prose-deliverable mode for tasks with no test
  runner"** (Urgent, unstarted) scopes `writer.md`, `coder.md` (build loop, step 3, Rules)
  and `qa.md` (validation step). Its `qa.md` target sits beside this build's `:12`
  sentence. If it lands first, add the fresh-dispatch statement into the structure it
  leaves rather than creating a second paragraph about what a `qa` round is handed. It is
  also the general form of *How this is validated* above — this spec states the
  inspection-based substitute for itself only, and does not implement the general rule.
- **`SMR-148` — "Make the coder demonstrate each pinning test red, not just name it"**
  (unstarted) rewrites `coder.md`'s per-finding report — the same `## Output` paragraph
  this build re-keys from "when resumed" to "on a findings round". If it lands first,
  re-key the paragraph it leaves rather than restoring the older one.
- **`SMR-169` — "Hand qa a measured base-commit baseline so a red suite is attributable"**
  (unstarted) adds a fact to what `qa` is handed at dispatch, which is the same sentence
  this build extends. If it lands first, extend its handover list rather than writing a
  competing one.
- **`SMR-176` — "Count an agent definition's own frontmatter description as an edit
  site"** (unstarted) is the general form of the four frontmatter rows above. This build
  applies its lesson once, locally; it does not implement the general rule.

Two further siblings bear on the shape of this task without editing the same lines:
**`SMR-175`** ("Re-mirror the user-facing docs inside a fix round, not as a follow-up")
supports putting `README.md` in the `coder`'s scope rather than deferring it to the docs
pass, and **`SMR-151`** ("Coordinate shared-doc edits across concurrent stories") would, if
it landed, own the `SMR-154` overlap above instead of this note.

### Board corrections applied during this spec pass

The same sibling sweep surfaced one card whose recorded contract a **shipped** decision had
already made unbuildable, and which this spec's `coder.md`/`qa.md` edits make plainly so.
The board profile authorises correcting card content, so it was **applied**, not reported:

- **`SMR-157`, third acceptance criterion.** It required the validation step in
  `coder.md`/`qa.md` to read *"run the project's validation — via `ca77y-engineering:qa`
  where the project has one, or the spec's stated validation procedure where it does
  not"*. That presupposes the `coder` dispatching `qa` itself, a route SMR-166 removed —
  `coder.md:16` now reads *"You do not dispatch other pipeline agents — the `lead` runs
  `qa`"* — and which this spec reinforces by stating that every `qa` round is a fresh
  dispatch from the `lead`. The criterion was rewritten to keep its goal (the fallback
  lives in the definitions, not in each dispatch prompt) without the dead route, with a
  dated note recording the change. Its *Why* bullet asserting *"an unconditional hand-off
  to the `qa` subagent"* carries the same dated note.

Nothing on `SMR-178` itself was edited. Two further observations are reported to the `lead`
as follow-ups rather than applied — one is a scope line on this spec's own source card, and
one needs a card the `analyst` must create.

### Deviations from the card

**No criterion is unsatisfiable, none was narrowed, and no card criterion was edited.**
Every one of the seven is closed by the `coder`'s build — the sweep for a criterion
needing a non-`coder` owning mechanism (documentation the docs pass owns, a manual
reproduction) found none: criteria 1–6 are file edits, and criterion 7 is a command the
`coder` runs. Two criteria are met by a deliberate **generalization**, recorded here
because the acceptance gate reads the card's literal wording:

1. Criterion 5 says `qa.md` and `auditor.md` state they are *"always dispatched fresh and
   never resumed"*. For the `auditor` the shipped sentence says so of **every caller** —
   the `lead` and the `analyst` — because `analyst.md:44` dispatches it on the same terms.
   That is strictly broader than the criterion and true of both callers.
2. Criterion 4 says `writer.md` *"admits both routes on the same terms for its
   spec-revision rounds"*. The shipped text also states that the **docs pass** is always a
   fresh dispatch (`SKILL.md:99`). Stating the revision round's routing while leaving the
   other mode silent would recreate, in a smaller way, the ambiguity this card exists to
   remove. This is an addition beyond the criterion, not a narrowing of it.

Two sites this build must change are **implied by the criteria without being listed in the
card's Scope**, recorded here so they are not read as scope creep:

3. The report paragraphs at `qa.md:27` and `auditor.md:42` each open with *"Resumed, finish
   the same way …"*. A file cannot state it is never resumed and also instruct itself on
   what to do when resumed; criterion 5 and criterion 6 both reach these clauses. They are
   changed to their single-route form, with the `SendMessage` prohibition preserved.
4. `coder.md`'s frontmatter `description` is the card's own first cited site, so it is in
   scope explicitly; the other three definitions' descriptions are **verified** rather than
   assumed, and the outcome reported either way.

## Requirements

Every scenario is verified by reading the shipped files in the story worktree; there is no
test runner in this repository (see *How this is validated*). Commands below are run with
the worktree as the working directory, or with absolute paths under it.

### Requirement: `coder.md` names both routes and asserts neither as the only one

*Card criterion 1.*

#### Scenario: the findings-round lead-in states both routes

- **WHEN** a coder reads `## Fixing the findings the lead routes to you`
- **THEN** it finds the resume and the fresh dispatch stated as two normal ways a findings
  round arrives — the resume when the `lead` holds a resumable agentId for it, the fresh
  dispatch carrying the findings when it does not — with neither presented as the rule and
  the other as an exception
- **VERIFIED BY** reading the lead-in at `coder.md:36` in full

#### Scenario: the frontmatter no longer states the replaced behaviour

- **WHEN** an agent reads `coder.md`'s frontmatter `description` to choose a dispatch
- **THEN** it no longer says the `lead` *"dispatches it once and resumes it with qa and
  acceptance-gate findings"*, and instead summarises both routes, keeping the
  already-open-PR case
- **VERIFIED BY** reading line 3, plus
  `grep -c 'dispatches it once and resumes it' plugins/ca77y-engineering/agents/coder.md`
  returning `0`

#### Scenario: no surviving sentence asserts the resume as the only route

- **WHEN** `coder.md` is read end to end
- **THEN** no other sentence tells the coder it was resumed, carries prior build context,
  or that a round reaches it only by resume
- **VERIFIED BY** reading every hit of
  `grep -n -i -E 'resum|fresh|dispatch' plugins/ca77y-engineering/agents/coder.md` and
  confirming each is consistent with both routes

### Requirement: `coder.md`'s reporting contract applies to a findings round however it arrived

*Card criterion 2.*

#### Scenario: a fresh coder holding findings knows the round-reporting rules govern it

- **WHEN** a freshly dispatched coder finishes a findings round and reads `## Output`
- **THEN** the paragraph listing what to report for a findings round — which findings were
  applied and how, the test pinning each behavioural fix, the qa result afterwards, any
  evidence-backed rejection with its trace, any further production hazard — is keyed on the
  round rather than on having been resumed, so no inference is needed to know it applies
- **VERIFIED BY** reading `coder.md:68` and confirming the clause no longer opens on
  *"When resumed with findings:"*, plus
  `grep -c 'When resumed with findings' plugins/ca77y-engineering/agents/coder.md`
  returning `0`

#### Scenario: the every-report hazard obligation is unchanged

- **WHEN** the same paragraph is read
- **THEN** the sentence binding the production-hazard obligation to every report — the
  initial build report and each findings-round reply alike — is still present and still
  covers both
- **VERIFIED BY** reading the sentence following the re-keyed clause

### Requirement: A fresh coder is told what it carries and what it does not

*Card criterion 3.*

#### Scenario: the inventory is complete and explicit

- **WHEN** a coder dispatched fresh with findings reads its definition
- **THEN** it finds named, as what it holds: the findings (inline or as a findings-file
  path), the spec's path, the worktree path and its dependency-provisioning status, and the
  round's commit references
- **VERIFIED BY** reading the lead-in at `coder.md:36` and checking all four items are
  present

#### Scenario: the absence is stated, not left to inference

- **WHEN** the same coder reads on
- **THEN** it is told it does **not** carry the previous round's context — the earlier
  coder's reasoning, its diff rationale, or which findings it already rejected and on what
  trace — and is directed to read the spec from its path and the round's changes from the
  worktree and the commit references instead of recalling them
- **VERIFIED BY** reading the same passage for the negative inventory and the
  read-don't-recall direction

### Requirement: `writer.md` admits both routes for a spec-revision round

*Card criterion 4.*

#### Scenario: the revision round names both routes on the coder's terms

- **WHEN** a writer reads how an `auditor` finding reaches it
- **THEN** it finds the resume and the fresh dispatch stated as two normal routes, and — for
  the fresh case — that it holds the spec path, the worktree and its provisioning status,
  the board profile and the findings, and none of the earlier round's context, so it reads
  the spec as it now stands and the card from the board
- **VERIFIED BY** reading the mode block at `writer.md:14-19` and `## Spec pass` step 4

#### Scenario: the docs pass is stated as always fresh

- **WHEN** a writer is dispatched for the docs pass
- **THEN** its definition says that pass is always a fresh dispatch
- **VERIFIED BY** reading the mode block for that sentence

#### Scenario: the duty is stated once

- **WHEN** `writer.md` is read end to end
- **THEN** the routing statement lives in the mode block and step 4 points at it with a
  single clause rather than restating it
- **VERIFIED BY** reading both sites together

### Requirement: `qa.md` and `auditor.md` state they are always fresh and never resumed

*Card criterion 5.*

#### Scenario: `qa` states it and says what it therefore holds

- **WHEN** a `qa` agent reads its definition
- **THEN** it is told every round it runs is a fresh dispatch and it is never resumed, and
  that it therefore holds only this dispatch's inputs — the spec, the worktree and its
  dependency-provisioning status, and the round's commit references where the `lead` passed
  them — reading the worktree as it now stands rather than recalling a previous round
- **VERIFIED BY** reading `qa.md:12` and the sentences added around it

#### Scenario: `auditor` states it for every round and every caller

- **WHEN** an `auditor` reads its definition
- **THEN** it is told it is dispatched fresh for every round — the spec-readiness gate, the
  acceptance gate, each re-audit of either, and the `analyst`'s advisor gate — and never
  resumed, with the independence reason given, and the existing "expect no prior context"
  direction and the two paragraphs after it intact
- **VERIFIED BY** reading the renamed section at `auditor.md:34-40`

#### Scenario: neither file still instructs itself on being resumed

- **WHEN** either file's report/verdict paragraph is read
- **THEN** it states the single route and no longer carries a *"Resumed, finish the same
  way"* clause, while the `SendMessage` prohibition and the "your final text is the report"
  rule survive in substance, including the tail naming what a misrouted report loses
- **VERIFIED BY** reading `qa.md:27` and `auditor.md:42`, plus
  `grep -c 'Resumed, finish the same way' plugins/ca77y-engineering/agents/qa.md` and the
  same over `auditor.md` both returning `0`, while the same `grep` over `coder.md` and
  `writer.md` still returns `1` each — those two are genuinely resumable and keep the clause

### Requirement: No file claims a routing behaviour `SKILL.md` does not also claim

*Card criterion 6.*

#### Scenario: every routing sentence in the five files traces to the skill

- **WHEN** the routing claims in `coder.md`, `writer.md`, `qa.md`, `auditor.md` and the root
  `README.md` are enumerated
- **THEN** each one is matched to a sentence in
  `plugins/ca77y-engineering/skills/lead/SKILL.md` making the same claim, and any that
  cannot be matched is removed or corrected
- **VERIFIED BY** running
  `grep -n -i -E 'resum|fresh dispatch|dispatched fresh|SendMessage|agentId' <file>` over
  each of the five, reading every hit, and recording the matching `SKILL.md` line for each
  in the build report

#### Scenario: the README mirrors the corrected definitions

- **WHEN** the `### auditor` and `### writer` sections of the root `README.md` are read
- **THEN** the auditor section says every round is a fresh dispatch and never a resume, and
  the writer section names both routes for a spec-revision round — while the `### coder`
  and `### qa` sections and the `**Dispatch and resume.**` paragraph are left as they stand,
  having been verified to agree already
- **VERIFIED BY** reading those sections and confirming the diff touches only the two

#### Scenario: no new prescription and no new harness claim

- **WHEN** the added sentences are read
- **THEN** none fixes a `run_in_background` value, tells the `lead` which mode to choose, or
  explains why a `lead` might hold no resumable agentId
- **VERIFIED BY** reading every added sentence in the five files against this list

### Requirement: The guarded paragraphs and the manifests are untouched

*Card criterion 7, plus the repo's standing constraints.*

#### Scenario: both drift checks still print `1`

- **WHEN** the root `CLAUDE.md` duplicate-paragraph checks are run after the build
- **THEN** each prints `1`
- **VERIFIED BY** running both, expanded for portability:
  `grep -h '^\*\*Addressing the story worktree\.\*\*' plugins/ca77y-engineering/agents/coder.md plugins/ca77y-engineering/agents/writer.md plugins/ca77y-engineering/agents/qa.md plugins/ca77y-engineering/agents/auditor.md plugins/ca77y-engineering/skills/lead/SKILL.md | sort -u | wc -l`
  and
  `grep -h '^\*\*Working from the board profile\.\*\*' plugins/ca77y-engineering/agents/writer.md plugins/ca77y-engineering/agents/auditor.md | sort -u | wc -l`
  (both printed `1` at `42fcb81`, before the build — so the check is a regression check,
  not a first measurement)

#### Scenario: no version moves and no manifest changes

- **WHEN** the diff is reviewed
- **THEN** no `version` field in any plugin's two manifests has changed, and neither
  manifest is touched at all
- **VERIFIED BY** `git -C <worktree> diff --stat` against the spec commit, plus the
  manifest-parity loop from the root `CLAUDE.md` printing `ok` for every plugin

#### Scenario: the blast radius is exactly five files

- **WHEN** the diff is reviewed
- **THEN** it contains only the four agent definitions and the root `README.md`
- **VERIFIED BY** `git -C <worktree> diff --name-only` against the spec commit

### Requirement: Every changed definition still loads

*Not from the card — the definitions' real consumer.*

#### Scenario: frontmatter parses and each `description` stays a single-line scalar

- **WHEN** each changed definition's YAML frontmatter is parsed
- **THEN** it loads without error, `name` and `description` are present, and `description`
  is a single-line string
- **VERIFIED BY** running, for each of the four definitions,
  `python3 -c "import sys,yaml; t=open(sys.argv[1]).read().split('---')[1]; d=yaml.safe_load(t); assert d['name'] and isinstance(d['description'],str) and '\n' not in d['description']; print('ok', sys.argv[1])" <file>`
  (PyYAML 6.0.3 is present in this environment; if it is not, the fallback is confirming by
  reading that each `description:` occupies exactly one line and contains no `": "`)

#### Scenario: the manifests still resolve every definition

- **WHEN** `plugins/ca77y-engineering/.claude-plugin/plugin.json` and
  `plugins/ca77y-engineering/plugin.json` are read
- **THEN** every path in their `agents` arrays still exists, no file having been added,
  removed or renamed
- **VERIFIED BY** reading both `agents` arrays against `ls plugins/ca77y-engineering/agents`

## Tasks

- [ ] Rewrite `coder.md:36`, the lead-in to `## Fixing the findings the lead routes to
      you`: both routes as facts of equal standing; the already-open-PR case preserved; the
      fresh-dispatch inventory (findings, spec path, worktree + provisioning status, commit
      references) and the matching negative inventory with the read-don't-recall direction;
      then the three existing numbered steps unchanged
- [ ] Re-key `coder.md:68` from *"When resumed with findings:"* to the findings round
      itself, leaving the listed items and the following every-report hazard sentence intact
- [ ] Rewrite `coder.md`'s frontmatter `description` to summarise both routes, keeping the
      PR-review clause; confirm it stays a single-line YAML scalar
- [ ] Extend `writer.md`'s mode block (`:14-19`) with both routes for a spec-revision round,
      the fresh-writer inventory, and the docs-pass-is-always-fresh statement; add the single
      pointing clause to `## Spec pass` step 4 — no second copy of the rule
- [ ] Extend `qa.md:12` with every-round-is-fresh / never-resumed and what a fresh `qa`
      therefore holds; convert its `## Boundaries` report bullet (`:27`) to its single-route
      form, preserving the `SendMessage` prohibition and the final-text rule in substance
- [ ] Generalise `auditor.md`'s `## Re-audits are fresh dispatches` section to every round
      and both callers, renaming the heading to match; convert its verdict paragraph (`:42`)
      to its single-route form on the same terms as `qa.md`
- [ ] Update the root `README.md` `### auditor` and `### writer` sections to mirror the
      corrected definitions; leave `### coder`, `### qa` and `**Dispatch and resume.**` as
      they stand after verifying they already agree
- [ ] Check the frontmatter `description` of `writer.md`, `qa.md` and `auditor.md` against
      the shipped behaviour; edit only if one now states something this change replaced, and
      report the outcome either way
- [ ] Enumerate every routing claim left in the five files (`grep -n -i -E
      'resum|fresh dispatch|dispatched fresh|SendMessage|agentId'`), read each, and record in
      the build report the `SKILL.md` line that makes the same claim — this enumeration **is**
      the evidence for the card's sixth criterion
- [ ] Confirm the read-only mirror surfaces still agree and report the outcome without
      changing them: `analyst.md:44`, `docs/ARCHITECTURE.md` § *The dispatch model*, and both
      plugin manifests' `description` fields
- [ ] Verify the blast radius: `git diff --name-only` shows exactly the five files; both root
      `CLAUDE.md` drift `grep`s print `1`; the manifest-parity loop prints `ok` for every
      plugin; no `version` field changed; each changed definition's frontmatter parses
- [ ] **Docs pass, not the `coder`:** fold this spec's durable content into
      `docs/ARCHITECTURE.md` where the dispatch model is documented — correcting it only if
      the verification above found it disagreeing — and remove this spec from `docs/specs/`.
      Leave the `docs/AGENTS_IMPROVEMENTS.md` entry in place: the drift guard it proposes is
      still unbuilt and is explicitly out of this card's scope
- [ ] **Neither the `coder` nor the docs pass — the next pipeline run on this repo:**
      observe a real fresh-dispatch findings round and report whether the shipped wording
      produced the intended behaviour, per `docs/PRODUCT.md`'s rule that behaviour changes are
      validated by running the pipeline on a live project. This is **not** a gate on this card
