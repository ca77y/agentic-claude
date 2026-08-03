# Convert the lead into a main-session skill that runs the pipeline flat

- **Status**: Draft
- **Task**: contain-subagent-traffic-inside-the-pipeline
- **Last Updated**: 2026-08-02
- **Document Scope**: One unit of work: retire the `lead` agent, ship the `lead` skill, retarget the worker contracts, and record the harness limitation

---

## Goal

The `lead` agent orchestrates the pipeline from inside a subagent, and that topology
sits on an open harness defect: children of a subagent detach regardless of
`run_in_background`, completion notifications route to the root session from any depth,
a resumed child's report leaks to the main session, and subagents have no `TaskOutput`
to collect with. Established empirically in the story's investigation log
([SMR-166](https://linear.app/ca77y/issue/SMR-166)) and reproduced
upstream ([anthropics/claude-code#75043](https://github.com/anthropics/claude-code/issues/75043),
[#81438](https://github.com/anthropics/claude-code/issues/81438),
[#69212](https://github.com/anthropics/claude-code/issues/69212)).

The change: the orchestrator moves to where the harness actually delivers. The `lead`
becomes a **skill** the user invokes in the main session. It dispatches
`ca77y-engineering:{writer,coder,qa,auditor}` directly — flat, depth 1, no pipeline
agent ever dispatching another. Fresh dispatches return their report as the tool
result; resumed workers' completion notifications arrive at the orchestrator because
the orchestrator *is* the main session; `TaskOutput` exists there, dissolving the
`lead.md:28` defect.

User value: the pipeline stops stalling on reports that cannot arrive, the main session
stops receiving traffic it cannot act on (it now owns that traffic), and every
collection rule becomes executable in the runtime it is written for.

Non-goals:

- No `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` or any depth-limiting env var — flatness is
  the skill's design, not a machine-enforced cap.
- No agent teams, no dynamic-workflow rebuild (possible follow-up story; nothing here
  forecloses it).
- No change to the analyst/researcher/library agents' own dispatch trees beyond the
  worker-side hygiene below.
- No plugin version bump — versions are a manual human decision per the root
  [`CLAUDE.md`](../../CLAUDE.md).
- No mitigation of the one-story-per-session trade: parallel stories are parallel
  sessions over the existing per-story worktrees.

## Design

### The skill

`plugins/ca77y-engineering/skills/lead/SKILL.md`, invoked as
`/ca77y-engineering:lead <task>`. Frontmatter: `name: lead` plus a `description` that
carries the current agent description's triggering intent (execute or ship one task
end to end, from a prompt or story card to a single PR). The current `lead.md`
`model: sonnet` / `effort: high` frontmatter does not translate — a skill runs on the
session's model; the workers keep their own frontmatter models. The body is the
current `lead.md` contract with its waiting mechanics translated; everything else —
inputs, workspace creation and dependency provisioning, the workflow (spec → spec gate
→ build → qa loop → acceptance gate → docs → ship → PR-review loop), the commit model,
gate routing, the 3× rule, delegation table, boundaries, final handoff, process
feedback — survives on purpose. The PR-review loop's baseline/polling discipline
(`Monitor` ceilings, trigger-anchored baselines, distinct printed signals) transfers
unchanged: `Monitor` works in the main session.

Translation rules, which are the heart of the change:

- **Fresh dispatches stay synchronous.** Every fresh `Agent` call — writer spec pass,
  every `qa` round, every `auditor` gate — sets `run_in_background: false`; the tool
  result is the report. (Since v2.1.198 the omitted flag defaults to background; from
  the main session that would still *work* via notification, but synchronous keeps
  gates sequential and reports in-turn, and preserves the existing "trust the returned
  result" contract verbatim.)
- **Resumes end the turn.** Resuming the coder or writer is `SendMessage` by agentId,
  as today. What changes is the wait: the skill **ends its turn** after updating the
  ledger with what is awaited; the resumed worker's completion notification wakes the
  main session and carries the report. This is the delivery path the harness designs
  for — the exact path that was the "leak" when the orchestrator was a subagent. The
  old in-turn blocking-collection rule is retired, not translated: it existed because a
  subagent's turn end was fatal, and that premise is gone.
- **Lost-report recovery.** If a wake brings no usable report or nothing arrives, the
  skill checks ground truth before re-dispatching, in order: `TaskList`/`TaskOutput` on
  the agentId (available in main), then `git -C <worktree> status --short` and the
  files the worker was to produce. Work on disk means collect, not replace — the
  existing verify-on-disk rule survives with `TaskOutput` now genuinely available.
- **No rule may mandate a mechanism unavailable in its runtime.** The skill states its
  mechanics in main-session terms only; nothing in it may instruct a *worker* to use
  tools workers lack.

### Context discipline

Two additions the investigation's research pass showed every mature flat pipeline
converges on:

- **Paths, not content.** Dispatch prompts carry the spec path, worktree path,
  provisioning status, and commit refs — never pasted file bodies. When a round's
  findings exceed a short summary, the skill writes them to
  `.worktrees/<branch>.findings-round-<N>.md` and passes that path in the resume
  message. `.worktrees/` is already gitignored, so orchestration files never enter a
  story commit — which is also why they live *next to* the worktree, not inside it,
  where the commit model's "commit whatever is uncommitted" steps would sweep them up.
- **The ledger.** The skill maintains `.worktrees/<branch>.ledger.md` from workspace
  creation onward: the task and card, worktree path and provisioning status, current
  workflow step, dispatched agentIds (writer, coder), round counters per gate, commits
  made, what is currently awaited, and retained board follow-ups. Updated before every
  dispatch and turn end. After a compaction, wake, or session restart, the ledger plus
  `git log` — not recollection — are the source of truth for where the pipeline
  stands. The observed failure this prevents: re-dispatching completed work.

### Retiring the agent

`plugins/ca77y-engineering/agents/lead.md` is deleted and its registration removed
from the `agents` array in `plugins/ca77y-engineering/.claude-plugin/plugin.json`
(the root `plugin.json` lists no agents; both versions stay `1.9.0`). The Claude
manifest's `description` sentence describing the lead is reworded from subagent to
skill.

The canonical **"Addressing the story worktree."** paragraph currently duplicated
byte-identically across five agent files moves to a five-file set of
`{coder,writer,qa,auditor}.md` **plus the skill** — the skill creates the worktree and
names it to every dispatch, so it must carry the paragraph verbatim. The root
[`CLAUDE.md`](../../CLAUDE.md) duplication rule and its verification `grep` are
updated to the new file list; the check must still print `1`.

### Worker-side hygiene

In `{coder,writer,qa,auditor}.md`, the reporting contract is restated to name the real
channels and close the invented-fallback hole (investigation Finding 1: a coder
escalated to `SendMessage to: "main"`, which no definition forbids):

- Dispatched fresh: the final text **is** the report; return it.
- Resumed: finish with the report as final text; its delivery to the orchestrator is
  the harness's job, not the worker's. Do not `SendMessage` anyone — not the
  dispatcher, not `main`, not a sibling — and do not treat the `SendMessage` tool
  description's recipient list as an invitation.

This hygiene stays valuable beyond the lead pipeline: the analyst and researcher trees
still run depth-2 dispatches, where the same fallback invention would leak. References
to "the `lead`" in the worker and analyst definitions are retargeted where the
referent is the orchestrating session (mode lines like "the lead tells you which mode",
"the lead dispatches you twice") — the role keeps its name; what changes is that the
role is a skill run by the main session, not a peer subagent.

### The issue note

`docs/issues/nested-subagent-result-routing.md`, per the `docs/` rules: nested
orchestration remains unsupported by the harness — what was tried (the card's
investigation log, with probe evidence), the upstream trail (#75043, #81438, #69212,
all open as of 2026-08-02), and what would unblock it (upstream fix to child result
routing for intermediate parents, at which point a sealed-lead topology could become a
story again).

### Docs

- Root `README.md`: the lead's section moves from the agent roster to a skill,
  documenting `/ca77y-engineering:lead` invocation; the agent count and any "dispatch
  the lead" phrasing updated.
- `docs/ARCHITECTURE.md`: dispatch model updated — orchestrator is the main session
  via the lead skill; the pipeline is flat by design; agent roster shrinks by one.

### Risks and alternatives

- **Risk:** the session model, not `sonnet`, now runs orchestration — cost moves with
  the user's model choice. Accepted; orchestration is low-volume when handoffs are
  paths.
- **Risk:** a user prompt arriving mid-pipeline interleaves with orchestration. The
  ledger makes state recoverable; the skill treats an unrelated prompt as a pause, not
  an abort.
- **Alternatives considered and rejected in the card:** agent teams (experimental,
  idle-notification burn, wrong fit for sequential hub-and-spoke), staying nested with
  file-poll workarounds (fights an open harness defect forever), dynamic workflows
  (larger rebuild; viable follow-up).

## Requirements

### Requirement: The lead skill exists and is loadable

#### Scenario: skill registration

- **WHEN** plugins are reloaded in a session with ca77y-engineering enabled
- **THEN** `ca77y-engineering:lead` is available as a skill, and no
  `ca77y-engineering:lead` *agent* appears in the agent roster

### Requirement: The pipeline runs flat from the main session

#### Scenario: fresh dispatches

- **WHEN** the skill dispatches the writer's spec pass, any qa round, or any auditor
  gate
- **THEN** the dispatch is a synchronous `Agent` call (`run_in_background: false`) to
  the qualified agent name, made from the main session, and the tool result is treated
  as the report

#### Scenario: no nesting

- **WHEN** any pipeline step executes
- **THEN** no pipeline agent dispatches or resumes another pipeline agent — every
  worker is a leaf below the main session

### Requirement: Resume collection works as written in its runtime

#### Scenario: resumed worker report

- **WHEN** the skill resumes the coder or writer by agentId and ends its turn
- **THEN** the worker's completion notification wakes the session carrying the report,
  and the skill continues from the ledger without re-dispatching work that exists on
  disk

#### Scenario: lost report

- **WHEN** a wake brings no usable report
- **THEN** the skill consults `TaskList`/`TaskOutput` and the worktree state before any
  replacement dispatch, and escalates to the user rather than silently re-dispatching
  onto files a live agent may still be writing

### Requirement: Orchestration state survives context loss

#### Scenario: ledger recovery

- **WHEN** the session compacts or restarts mid-pipeline
- **THEN** `.worktrees/<branch>.ledger.md` plus `git log` suffice to resume at the
  correct step with the correct agentIds and round counts, and no completed step is
  re-run

#### Scenario: orchestration files stay out of story commits

- **WHEN** the skill executes any commit-model step
- **THEN** the ledger and findings files are not part of the commit, because they live
  under gitignored `.worktrees/`, outside the worktree

### Requirement: Workers name their real report channels

#### Scenario: no invented fallback

- **WHEN** any of `{coder,writer,qa,auditor}` finishes, fresh or resumed
- **THEN** its definition directs it to return the report as final text and forbids
  `SendMessage` to `main` or any other recipient as a reporting or escalation channel

### Requirement: The harness limitation is recorded

#### Scenario: issue note

- **WHEN** the change ships
- **THEN** `docs/issues/nested-subagent-result-routing.md` exists with the evidence,
  the upstream references (#75043, #81438, #69212), and the unblock condition

### Requirement: No stale references to the lead agent remain

#### Scenario: reference sweep

- **WHEN** searching the repo for the lead-as-agent
- **THEN** `agents/lead.md` is gone, both manifests carry version `1.9.0` and the
  Claude manifest's `agents` array omits it, the root `CLAUDE.md` worktree-paragraph
  rule names the new five-file set and its `grep` prints `1`, and `README.md` /
  `docs/ARCHITECTURE.md` / worker & analyst definitions describe the lead as a skill

### Requirement: No depth-limiting variable

#### Scenario: settings untouched

- **WHEN** reviewing the shipped diff
- **THEN** it introduces no `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` or equivalent cap in
  any settings, manifest, or definition

## Tasks

- [ ] Write `plugins/ca77y-engineering/skills/lead/SKILL.md`: translate `lead.md` per
      the design — synchronous fresh dispatches, end-turn resumes woken by
      notification, lost-report recovery order, paths-not-content handoffs, the ledger
      contract, the worktree-addressing paragraph verbatim, and the unchanged workflow,
      commit model, 3× rule, PR-review loop, boundaries, final handoff, and process
      feedback sections
- [ ] Delete `plugins/ca77y-engineering/agents/lead.md`; remove it from the Claude
      manifest's `agents` array; reword the manifest `description`'s lead sentence;
      leave both versions at `1.9.0` and verify manifest parity (root `CLAUDE.md`
      script)
- [ ] Update root `CLAUDE.md`: worktree-paragraph file set becomes
      `agents/{coder,writer,qa,auditor}.md` + `skills/lead/SKILL.md`; update the
      verification `grep`; run it and confirm it prints `1`
- [ ] Update `{coder,writer,qa,auditor}.md`: report-channel contract (fresh = return
      value, resumed = completion notification, never `SendMessage` as
      reporting/escalation), and retarget lead-as-agent phrasing to the skill
- [ ] Update `analyst.md` phrasing where it hands off to "the `lead`" (user invokes
      the skill)
- [ ] Write `docs/issues/nested-subagent-result-routing.md`
- [ ] Update root `README.md` (lead as skill, invocation, roster count) and
      `docs/ARCHITECTURE.md` (flat dispatch model, roster)
- [ ] Verify: `/reload-plugins` shows the skill and no lead agent; grep sweep for
      stale `ca77y-engineering:lead` agent references; manifest parity check passes
- [ ] Validation run: ship one real story end to end via `/ca77y-engineering:lead` —
      reports collected without stalls, ledger accurate throughout, no depth var, no
      orchestration files in commits — then update the story card's investigation log
      with the run's outcome
