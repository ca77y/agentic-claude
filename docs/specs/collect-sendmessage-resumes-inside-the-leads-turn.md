# Extend the lead's synchronous-dispatch rule to cover resumes

- **Status**: Draft
- **Task**: collect-sendmessage-resumes-inside-the-leads-turn
- **Last Updated**: 2026-08-01
- **Document Scope**: One unit of work: the problem, change, and observable behavior that proves it ships

---

## Goal

`plugins/ca77y-engineering/agents/lead.md` tells the `lead` to dispatch every `Agent`
call synchronously and never to end its turn to wait. That rule covers the smaller half
of the loop. Most of a lead's rounds are not fresh `Agent` calls — the workflow
deliberately **resumes** an already-dispatched agent, because a resume is the only way to
preserve its context:

| Workflow step | What is resumed |
| --- | --- |
| Step 3 (spec) | the `writer`, across spec revisions when the auditor's gate fails |
| Step 5 (qa loop) | the same `coder`, with qa findings |
| Step 6 (acceptance gate) | the same `coder`, with acceptance findings |
| Step 9 / PR-review loop step 5 | the same `coder` with PR-review code findings; the `writer` for docs-only findings |

Those are `SendMessage` calls. `lead.md` documents only their argument shape (line 24,
"**Resuming by agentId**") and says nothing about their delivery semantics. `SendMessage`
has no synchronous mode: it wakes the resumed agent detached, and that agent's report is
delivered to the **session**, not into the lead's turn. A lead that treats a resume like a
synchronous `Agent` call ends its turn expecting a report that structurally cannot arrive.

**Change:** rewrite the dispatch-rules prose near the top of `lead.md` so it covers the
resume path — asynchronous delivery, a mandatory in-turn blocking collection, an explicit
inventory of what does and does not wake the lead, and a guard against re-dispatching an
agent that merely looks lost — and replace the PR-review loop's 5-minute monitor floor
with a genuinely long timeout.

**Value:** the three parallel leads that hit this (`quality-gate-ci`, `timer-cue-sync`,
`native-platform-config`) each stalled repeatedly and each needed an outside human nudge
to continue. Every stall is a human interrupt on work that was already progressing.

### Non-goals

- **Do not touch the worktree-creation section of `lead.md`** (step 2 of the Workflow, and
  the paragraph at line 14 about branch/worktree permission). A concurrent story,
  [`install-dependencies-in-story-worktrees`](../tasks/install-dependencies-in-story-worktrees.md),
  owns that section in its own worktree. See *Coordination* below.
- **Do not touch the "Addressing the story worktree." paragraph** in `lead.md` or in any of
  `coder.md`, `writer.md`, `qa.md`, `auditor.md`. It is duplicated byte-identically across
  those five files (root [`CLAUDE.md`](../../CLAUDE.md)), and the same concurrent story
  owns the pending edit to it. Do not edit it, do not reflow it, do not re-wrap it.
- **Do not "fix" `Monitor`.** `Monitor` genuinely wakes the agent that armed it — the
  `timer-cue-sync` lead woke on its own monitor, unprompted. The only `Monitor` defect in
  scope is the PR-review loop's 5-minute timeout floor being too short. Nothing in the new
  prose may imply `Monitor` is unreliable.
- No change to any other agent definition, to the workflow's step ordering, to the commit
  model, or to the 3× rule.
- No version bump in either plugin manifest (root [`CLAUDE.md`](../../CLAUDE.md): version
  bumps are a human decision, never part of shipping a fix).

## Design

### Boundary

Exactly one file is modified: `plugins/ca77y-engineering/agents/lead.md`, and within it
only:

1. **The dispatch-rules block near the top** — currently lines 20–24: the "Dispatch plugin
   agents by qualified name" paragraph, the "Dispatch every agent synchronously — never in
   the background" paragraph, and the "Resuming by agentId" paragraph. New paragraphs are
   added here.
2. **The `## The PR review loop` section** — currently lines 71–80; specifically step 1 and
   step 3, which both state the 5-minute floor.

Everything else in `lead.md` — frontmatter, lines 8–19 (including the worktree paragraph
at line 14 and the "Addressing the story worktree." paragraph at line 18), Inputs, The
commit model, Workflow steps 1–9, When a gate finds a problem, Delegation, Boundaries,
Final handoff, Process feedback — is out of bounds and must be byte-identical after the
change.

This is a prose/definition change. There is no application code and no test suite in this
repository (no `package.json`, no formatter config, no test runner); the "build" is the
edit to `lead.md`, and every acceptance scenario below is checked by reading or grepping
the resulting file inside the story worktree. That is the only execution environment the
scenarios need, and it is inside this Boundary.

### The mechanism, stated once

The distinction the new prose has to carry is *where a result is delivered*:

- A **synchronous `Agent` call** (`run_in_background: false`) blocks the caller's turn and
  hands the child's final message back as the tool result. The return value **is** the
  report. This is already stated in `lead.md` and stays.
- A **`SendMessage` resume** returns only a delivery acknowledgement. The resumed agent's
  eventual report is delivered to the **session**, not into the caller's turn. There is no
  `run_in_background: false` equivalent — `SendMessage` has no synchronous mode. Confirmed
  from the child side too: coders reported "SendMessage to `lead` isn't reachable from this
  session" on every round and correctly fell back to returning their report per
  `coder.md` — which then surfaced to the session, where the lead could not collect it.

So a resume needs a **separate collection step, issued in the same turn**: `TaskOutput`
with `block: true` on that same agentId, with a generous explicit timeout, re-issued if it
expires while the agent is still working. `TaskOutput` carries a deprecation notice, and
that notice is aimed at *fresh* `Agent` dispatches — where the tool result already is the
report and there is nothing left to collect. It does not apply to a resume, which produces
no such result. The prose must say so inline, or a future reader will delete the rule as
deprecated-tool usage.

### The failure mode has one name

The three leads each described the same act differently and none recognised it as a single
recurring pattern. The prose should name it once, with the evidence, so a lead recognises
it in any wording:

> - "I've sent the auditor's findings back to the writer to revise the spec. This resumed
>   in the background, so I'll wait for the completion notification."
> - "The fix instructions have been sent to the coder (resumed in the background). I'll
>   wait for it to finish."
> - "I'll continue once the coder's comment fix finishes — I'm now polling for completion
>   synchronously instead of ending my turn." (It then ended its turn.)

The third is the important one: the lead had correctly diagnosed the rule and still
performed the forbidden act, because "polling synchronously" and "ending the turn" did not
register as contradictory. The generalisation to state is: **whenever the next thing you
would do is wait, the correct move is a blocking collection inside the turn you are
already in.**

### What wakes the lead and what does not

The prose needs an explicit inventory, because two of the plausible-looking mechanisms
fail the same way `SendMessage` does. Grounded in the runtime's own tool contracts:

| Mechanism | Wakes the lead? | Notes |
| --- | --- | --- |
| `Agent` with `run_in_background: false` | Yes | Tool result **is** the child's report. |
| `TaskOutput` with `block: true` on an agentId | Yes | Blocks the turn until the agent reports or the timeout expires; re-issue on expiry. |
| `Monitor` | Yes | Genuinely wakes the agent that armed it. Right tool for an unbounded external wait (the PR review). |
| `SendMessage` alone | **No** | Delivery ack only; the report goes to the session. |
| Bash poll with `run_in_background: true` | **No** | Completion surfaces to the session — same failure as `SendMessage`. |
| Foreground Bash poll on the default timeout | **No** | The Bash tool's default timeout is 120000 ms; past it the call is auto-backgrounded and degrades into the row above. Set `timeout` explicitly, up to the 600000 ms maximum. |

### The re-dispatch guard

A stalled lead and a slow-but-working one are indistinguishable from outside, and acting on
the wrong guess is expensive: an outside observer diagnosing a stall told a lead to
re-dispatch its writer while the original writer was still alive; two writers then edited
the same spec file concurrently and reconciled only by luck. Before replacing an agent that
merely seems lost, the lead checks the ground truth on disk — `git -C <worktree> status
--short`, plus reading the files the agent was supposed to produce. Work present on disk
means the agent is alive or already finished: collect it rather than replace it. Nothing on
disk after repeated blocking collections have timed out is an escalation, not a licence to
race a second agent onto the same files.

### The PR-review loop's timeout

Two numbers currently live in `lead.md` step 1 and step 3, and they must not be conflated:

- **The trigger window** — roughly 5 minutes of *no review activity at all* is what means
  "no review was triggered" (step 2). This judgement stays.
- **The monitor's own `timeout_ms`** — currently floored at "at least 5 minutes (300000
  ms)" in step 1 and echoed as "a 5-minute floor is the minimum" in step 3. This is the
  defect: the `timer-cue-sync` lead armed exactly that floor for a review that took 6m12s,
  so the monitor expired a minute short and the lead re-armed instead of concluding.

The replacement is a genuinely long deadline. The runtime's `Monitor` contract: `timeout_ms`
defaults to 300000, maximum 3600000, and `persistent: true` runs for the session with no
timeout. So the rule becomes: never leave the monitor on its 300000 ms default; arm at
least 1800000 ms (30 minutes), up to the 3600000 ms maximum, or `persistent: true` for the
wait that follows a review that has already started. Step 3's "5-minute floor is the
minimum" sentence must be updated in the same pass — leaving it re-states the defect one
paragraph below its fix.

`Monitor` stays the mechanism here. It is correct for an unbounded external wait and it does
wake the lead; only its timeout was wrong.

### Risk: `TaskOutput` availability

Criterion 2 names `TaskOutput` explicitly and the prose must name it. It could not be
verified as present in the runtime available while authoring this spec: the deferred-tool
roster surfaced to this `writer` lists `TaskCreate`, `TaskGet`, `TaskList`, `TaskStop`,
`TaskUpdate` and `Monitor`, and a `ToolSearch` for `select:TaskOutput,Monitor` returned only
`Monitor`. Tool rosters differ per agent, so this is not evidence that the `lead` lacks it —
but a rule that names a single tool by name dead-ends in any runtime that does not expose
it, and the lead would be back to ending its turn. The prose therefore names `TaskOutput`
with `block: true` as the mechanism **and** states the fallback for a runtime without it: a
**foreground** Bash poll with an explicitly set timeout (never `run_in_background: true`,
never the default timeout), re-issued until the agent reports. The fallback is an addition
to criterion 2, not a narrowing of it. See *Deviations from the card*.

### Coordination

[`install-dependencies-in-story-worktrees`](../tasks/install-dependencies-in-story-worktrees.md)
is in flight in its own worktree and edits the same file, `lead.md` — the worktree-creation
section and the shared "Addressing the story worktree." paragraph. The two edits target
disjoint regions, so they should merge, but:

- If that story lands first, rebase onto it and re-read `lead.md` before editing rather than
  applying line numbers from this spec, which were taken at commit `057b7f0`.
- Never resolve a conflict in that story's regions by rewriting them. If a conflict lands in
  the worktree-creation section or the shared paragraph, take their side verbatim.
- The parity check in the root [`CLAUDE.md`](../../CLAUDE.md) must still print `1` after this
  change — it is in the Validation list below precisely to prove this story did not disturb
  the shared paragraph.

### Documentation follow-on (not the coder's task)

`docs/CLAUDE.md` makes the root `README.md` the user-facing description of every agent, to be
updated when an agent's behavior changes. Two places will contradict the shipped `lead.md`
and belong to the **`writer`'s docs pass**, not to this build:

- `README.md` "The PR review loop" bullet — "Poll the PR up to **5 minutes** for review
  activity" (currently line 216) — states the floor this story replaces.
- `README.md` "### lead" step list (currently lines 183–205) — describes routing findings
  back "by agentId" with no mention of the collection step.

`docs/ARCHITECTURE.md` describes topology and the commit model, not per-agent dispatch
mechanics, so it needs no change; the docs pass should confirm that rather than assume it.
The docs pass must observe the same two non-goals — it may not touch README prose about
worktree creation or dependency provisioning, which belongs to the concurrent story.

### Prose fences below are content-normative, not byte-verbatim

The Requirements name what each paragraph must assert. The coder writes the final wording
and may improve phrasing, ordering, and headings; what may not change is the set of claims.
A scenario is met when the resulting text asserts the claim, in `lead.md`'s existing voice
(bolded lead-in sentence, second person, no bullet-list-only paragraphs where the file uses
prose).

## Requirements

### Requirement: `lead.md` states that a `SendMessage` resume is asynchronous

The dispatch-rules block states the delivery semantics of a resume, not merely its argument
shape.

#### Scenario: A reader learns where a resume's result is delivered

- **WHEN** the dispatch-rules block of `plugins/ca77y-engineering/agents/lead.md` is read
- **THEN** it states that `SendMessage` has no synchronous mode, that sending it wakes the
  resumed agent detached, and that the resumed agent's report is delivered to the
  **session** and never into the caller's turn
- **AND** it contrasts that with a synchronous `Agent` call, whose tool result **is** the
  child's report

#### Scenario: A reader learns that resumes are the common case

- **WHEN** the same block is read
- **THEN** it names the workflow rounds that are resumes rather than fresh dispatches — the
  `writer` across spec revisions (step 3), and the same `coder` across qa (step 5),
  acceptance (step 6), and PR-review (step 9) rounds
- **AND** the existing "Resuming by agentId" argument-shape rule (agentId, message, required
  summary) is still present and unweakened

### Requirement: every `SendMessage` is followed by an in-turn blocking collection

The definition mandates the collection step, on the same agentId, in the same turn.

#### Scenario: The collection step is mandatory and specified

- **WHEN** the dispatch-rules block is read
- **THEN** it requires that every `SendMessage` be followed **in the same turn** by a
  blocking collection on that same agentId — `TaskOutput` with `block: true` and a generous
  explicit timeout — and that an expired collection be re-issued rather than treated as a
  result
- **AND** it forbids ending the turn after a `SendMessage` to await a completion
  notification

#### Scenario: The deprecation notice is disarmed inline

- **WHEN** the paragraph mandating `TaskOutput` is read
- **THEN** it notes inline that `TaskOutput`'s deprecation notice targets fresh `Agent`
  dispatches, where the tool result already is the report and there is nothing left to
  collect, and therefore does not apply to a resume, which produces no such result

#### Scenario: The rule survives a runtime without `TaskOutput`

- **WHEN** the same paragraph is read
- **THEN** it states what to do if `TaskOutput` is unavailable in the running environment: a
  **foreground** Bash poll on the agent's expected output with an explicitly set timeout,
  re-issued until the agent reports — never `run_in_background: true`, never the default
  timeout
- **AND** it does not present that fallback as the preferred mechanism

### Requirement: the PR-review loop keeps `Monitor` and drops the 5-minute floor

#### Scenario: Step 1 arms a genuinely long monitor

- **WHEN** step 1 of `## The PR review loop` is read
- **THEN** it no longer instructs a timeout of "at least 5 minutes (300000 ms)"
- **AND** it requires a genuinely long deadline instead — at least 30 minutes (1800000 ms),
  up to the 3600000 ms maximum, or `persistent: true` — stating that a review routinely
  outlasts five minutes
- **AND** it still says to poll with the runtime's monitor/until-loop mechanism against
  `gh pr view --json reviews,comments,reviewThreads`, and still warns that a foreground
  sleep loop may be blocked outright

#### Scenario: Step 3 no longer restates the floor

- **WHEN** step 3 of the same section is read
- **THEN** it no longer describes a 5-minute floor as the minimum for the
  waiting-for-the-review-to-land monitor, and instead points at the long timeout from step 1
- **AND** it still distinguishes waiting for a review to be *triggered* from waiting for it
  to *finish*, and still treats "in progress", "working…" and "Reviewing…" as still-running

#### Scenario: The trigger window is not conflated with the monitor deadline

- **WHEN** steps 1 and 2 are read together
- **THEN** step 2's judgement — no review activity at all after about five minutes means no
  review was triggered, and the lead reports that plainly — is still present and is
  distinguishable from the monitor's own timeout

#### Scenario: `Monitor` is not disparaged

- **WHEN** the whole of `lead.md` is read
- **THEN** no sentence claims or implies that a `Monitor` event fails to wake the agent that
  armed it, or that `Monitor` should be replaced for the PR-review wait
- **AND** the text states positively that `Monitor` does wake the lead and is the right tool
  for an unbounded external wait

### Requirement: the two non-waking poll mechanisms are warned off

#### Scenario: A background Bash poll is named as non-waking

- **WHEN** the dispatch-rules block is read
- **THEN** it states that a Bash poll with `run_in_background: true` surfaces its completion
  to the session, not into the lead's turn, and is therefore the same failure as a bare
  `SendMessage`

#### Scenario: A default-timeout foreground poll is named as non-waking

- **WHEN** the same block is read
- **THEN** it states that a foreground Bash poll left on the default tool timeout (about two
  minutes) is auto-backgrounded once it exceeds that timeout and degrades into the previous
  case
- **AND** it instructs setting the timeout explicitly, naming 600000 ms as the maximum

### Requirement: a re-dispatch guard before replacing an agent that seems lost

#### Scenario: On-disk verification precedes any replacement

- **WHEN** the dispatch-rules block is read
- **THEN** it requires verifying on disk — `git -C <worktree> status --short`, plus reading
  the artifacts the agent was to produce — before replacing an agent that merely seems lost
- **AND** it gives the reason: re-dispatching a slow child yields two agents racing on the
  same files, citing the incident where a second `writer` was dispatched onto a spec the
  first was still editing and the two reconciled only by luck
- **AND** it says that a lead which still cannot account for an agent escalates rather than
  dispatching a replacement onto the same files

### Requirement: the failure mode is named once, without over-generalising

#### Scenario: The pattern is named as one recurring act

- **WHEN** the dispatch-rules block is read
- **THEN** it names the failure mode explicitly as a single recurring pattern — ending the
  turn to wait for a resumed agent — and states that three leads performed the same act in
  three different wordings without recognising it as one
- **AND** it carries at least one of the three verbatim quotes as evidence, including the
  case where the lead said it was "polling for completion synchronously instead of ending my
  turn" and then ended its turn
- **AND** it states the generalisation: whenever the next action would be to wait, the
  correct move is a blocking collection inside the current turn

#### Scenario: The scope of the defect is not overstated

- **WHEN** the new prose is read
- **THEN** it confines the broken path to resumes and the two non-waking poll mechanisms,
  and does not present synchronous `Agent` dispatch or `Monitor` as unreliable

### Requirement: the change stays inside its boundary

#### Scenario: Only `lead.md` is modified

- **WHEN** `git -C <worktree> status --short` is run after the build
- **THEN** the only modified file under `plugins/` is
  `plugins/ca77y-engineering/agents/lead.md`
- **AND** neither `plugins/ca77y-engineering/plugin.json` nor
  `plugins/ca77y-engineering/.claude-plugin/plugin.json` is modified

#### Scenario: The byte-identical shared paragraph is untouched

- **WHEN** the parity check from the root `CLAUDE.md` is run in the worktree —
  `grep -h '^\*\*Addressing the story worktree\.\*\*' plugins/ca77y-engineering/agents/{lead,coder,writer,qa,auditor}.md | sort -u | wc -l`
- **THEN** it prints `1`
- **AND** `git -C <worktree> diff -- plugins/ca77y-engineering/agents/lead.md` shows no
  change to that paragraph

#### Scenario: The worktree-creation prose is untouched

- **WHEN** the diff of `lead.md` is read
- **THEN** it contains no change to the paragraph granting branch/worktree permission
  (currently line 14) and no change to Workflow step 2 ("Create the workspace")

## Validation

All checks are read-only and run inside the story worktree; none writes outside this spec's
Boundary. The repository has no build, no formatter, and no test runner — these are the
complete set.

- [ ] `git -C <worktree> status --short` — only `plugins/ca77y-engineering/agents/lead.md`
      (plus this spec's removal at docs time) appears.
- [ ] `git -C <worktree> diff -- plugins/ca77y-engineering/agents/lead.md` — every hunk falls
      inside the dispatch-rules block or `## The PR review loop`.
- [ ] The root `CLAUDE.md` parity check prints `1`.
- [ ] `grep -n '300000' plugins/ca77y-engineering/agents/lead.md` — no surviving instruction
      to arm a 300000 ms monitor for the PR review.
- [ ] Read the resulting dispatch-rules block and PR-review-loop section against each
      scenario above.

## Deviations from the card

- **Criterion 2 is satisfied as written and extended with a fallback.** The card mandates
  `TaskOutput` with `block: true`; the prose names it as the mechanism. It additionally
  states what to do in a runtime that does not expose `TaskOutput` (a foreground,
  explicit-timeout Bash poll), because the tool could not be verified present while
  authoring — see *Risk: `TaskOutput` availability*. This adds to the criterion rather than
  narrowing it, and the fallback is not presented as preferred. If the `lead` would rather
  ship the criterion bare, drop the third scenario under that requirement; nothing else
  depends on it.
- **Criterion 3's "long timeout" is given a number the card does not state.** The card says
  only "a genuinely long timeout". The spec fixes it at ≥ 1800000 ms with the 3600000 ms
  maximum and `persistent: true` named, taken from the runtime's `Monitor` contract, so the
  scenario is checkable rather than a matter of taste.
- **Criterion 3 is extended to step 3 of the PR-review loop.** The card names step 1's
  floor; step 3 restates the same floor ("a 5-minute floor is the minimum, longer is better
  here"). Both are inside the card's own stated scope (the PR-review loop) and fixing only
  step 1 would leave the defect in the section.

## Tasks

- [ ] Re-read `plugins/ca77y-engineering/agents/lead.md` in the worktree before editing —
      line numbers in this spec were taken at commit `057b7f0` and the concurrent story may
      have landed since.
- [ ] Keep the "Dispatch plugin agents by qualified name" and "Dispatch every agent
      synchronously — never in the background" paragraphs; scope the latter explicitly to
      *fresh* `Agent` dispatches and point forward to the resume rule.
- [ ] Add the resume-semantics paragraph: `SendMessage` is asynchronous, its result is
      delivered to the session and never into the caller's turn, and resumes are the common
      case (steps 3, 5, 6, 9).
- [ ] Add the in-turn collection mandate: `TaskOutput` with `block: true` on the same
      agentId, generous explicit timeout, re-issued on expiry; the inline note disarming the
      deprecation notice; the fallback for a runtime without `TaskOutput`.
- [ ] Add the what-wakes-you / what-does-not inventory, covering the background Bash poll and
      the default-timeout foreground poll (explicit timeout, 600000 ms max), and stating
      positively that `Monitor` does wake the lead.
- [ ] Add the named failure mode with at least one verbatim quote and the "three wordings,
      one act" framing, plus the generalisation.
- [ ] Add the re-dispatch guard: verify on disk with `git -C <worktree> status --short`
      before replacing an agent that seems lost, with the two-writers incident as the reason
      and escalation as the alternative.
- [ ] Rewrite PR-review-loop step 1's timeout instruction (≥ 1800000 ms, 3600000 ms max, or
      `persistent: true`) and step 3's restatement of the 5-minute floor, keeping step 2's
      trigger-window judgement intact.
- [ ] Keep the "Resuming by agentId" argument-shape rule intact.
- [ ] Run the Validation checklist, including the root `CLAUDE.md` parity check.
- [ ] **Not the coder's task — the `writer`'s docs pass:** reconcile the root `README.md`
      "The PR review loop" 5-minute bullet and the "### lead" step list with the shipped
      `lead.md`, confirm `docs/ARCHITECTURE.md` needs no change, and fold this spec into
      those durable docs before removing it. The docs pass observes the same two non-goals.
