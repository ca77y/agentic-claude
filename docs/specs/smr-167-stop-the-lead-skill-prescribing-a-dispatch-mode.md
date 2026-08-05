# Stop the lead skill prescribing a dispatch mode, and drop the "only way to preserve context" claim

- **Status**: Draft
- **Task**: smr-167-stop-the-lead-skill-prescribing-a-dispatch-mode
- **Last Updated**: 2026-08-05
- **Document Scope**: One unit of work: remove the single-mode dispatch mandate and the "only way to preserve context" claim from the `lead` skill, make every round-routing step work under either dispatch mode, and bring the user-facing mirror in `README.md` with it

---

## Goal

`plugins/ca77y-engineering/skills/lead/SKILL.md` carries two rules six lines apart that
cannot both be followed. Verified verbatim against the file at commit `4035926`:

- **Line 30** — *"**Every fresh dispatch is synchronous.** Set `run_in_background: false`
  on every fresh `Agent` dispatch — the writer's spec pass and docs pass, every `qa`
  round, every `auditor` gate."*
- **Line 32** — *"**Resumes end your turn.** Resuming the `coder` or the `writer` — the
  only way to preserve their context across rounds — is a `SendMessage` by agentId…"*

A lead that obeys line 30 has dispatched every worker synchronously; when the first gate
returns findings, lines 32, 89, 92, 93, 98, 141, and 142 all instruct it to resume that
worker. Observed on the `logged-actuals-fidelity` run following the skill literally, the
resume failed (`No transcript found for agent ID`), role-name addressing failed (`No
agent named 'coder' is reachable. Check the spelling, or use the agent ID from a
background agent's spawn result`), and `TaskList` returned "No tasks found". The conflict
is invisible until the first findings round — by which point the coder's whole build
context has already been spent — and the lead has to improvise a recovery mid-pipeline.

**The change is the removal of a prescription, not its inversion.** Both dispatch modes
work from the main session, and the skill already says so under *What wakes you*
(line 34). What breaks a run is one rule insisting on a mode while another rule depends
on the affordance only the other mode provides. After this change the skill states what
each mode gives the lead — including the fact that resumability follows from the mode —
and leaves the choice to the lead, per dispatch.

**Value.** A lead reaches the end of a fix round by following the text, in either mode,
without improvising; and a reader of the skill is told the truth about what a resume is
(a context-preserving convenience) rather than a falsehood about it (the only way to
carry a round forward).

**Non-goals.**

- Mandating background dispatch, or any other single mode. A spec that requires
  `run_in_background: true` everywhere is as wrong as the rule it replaces.
- Changing the workflow's steps, the commit model, the gate routing, the 3× rule, the
  board contract, the ledger contract, or the PR-review hand-off. Only the *waiting and
  carry-forward mechanics* move.
- Changing the four worker definitions (`agents/{coder,writer,qa,auditor}.md`), the
  `board` skill, or either plugin manifest.
- Any version bump. Per the root `CLAUDE.md`, a bump is a deliberate human decision and
  has not been requested in this run.
- Re-opening the topology decision (agent teams, dynamic workflows). SMR-166 settled it.

## Design

### The runtime facts the new text rests on

This repo has no dependency tree of its own (no `package.json`, no lockfile; the story
worktree is *not provisioned — no install step*), so the "dependency" whose behaviour
these claims are about is the **Claude Code harness runtime**, and there is no installed
package path in the worktree or the root checkout to cite a file and line from. Each
claim below is therefore cited to the harness's own tool-schema text as delivered to
this session (2026-08-05), or explicitly marked as an observation.

- **M1 — dispatch mode and its collection path.** *Cited loosely — see the note below:*
  the `Agent` tool's `run_in_background` description says that agents run in the
  background by default, that the caller is notified when one completes, and that setting
  the flag to false runs the agent synchronously when the caller needs its result before
  continuing. So: synchronous → the report is the tool result, in-turn; background → a
  completion notification carries it. Both are real collection paths; neither is an error.
- **M2 — a resume needs an identifier the dispatch produced.** *Cited verbatim:* the
  `SendMessage` tool description delivered to this session states *"Refer to agents by
  name — names keep working after an agent completes (a send resumes it from its
  transcript). Use the raw `agentId` (format `a…-…`) from its spawn result only when the
  agent has no name…"*. *Cited loosely:* the `Agent` tool description separately says that
  continuing a previously spawned agent means using `SendMessage` with the agent's ID or
  name as the `to` field, which resumes it with full context, whereas a new `Agent` call
  starts a fresh agent with no memory of prior runs. The `Agent` tool schema in this
  session exposes no `name` parameter, so a pipeline worker has no name to be addressed by
  and only the agentId route exists. The harness's own failure string names where that id
  comes from: *"use the agent ID from a background agent's spawn result"*.
- **M3 — a synchronously dispatched worker was not resumable.** **Marked as an
  observation, not a certified mechanism.** Evidence: the `logged-actuals-fidelity` run
  recorded in SMR-167 (`No transcript found for agent ID`; role-name addressing
  rejected; `TaskList` empty), and SMR-166's probe 1 (2026-08-02, harness 2.1.220), which
  recorded the identical two error strings. It cannot be cited to a source file, because
  the harness is the runtime rather than a readable dependency here. What would settle
  it: a controlled probe — dispatch one throwaway agent with `run_in_background: false`,
  record whether any agentId is surfaced, attempt a `SendMessage` to it, and record the
  verbatim result.
- **M4 — the asymmetry between the two modes is an inference, recorded as one.** Neither
  M1's nor M2's cited text says that a *synchronous* dispatch's tool result carries no
  agentId. What is cited is that the id comes *"from its spawn result"* and that
  background is the mode that produces one; the step from there to "a lead that dispatched
  synchronously holds nothing to address" is an inference. It is consistent with M3's
  observation and with the card's own criterion 4, but it is not quoted — written down
  here so it is visible rather than smuggled.

*Why two of the citations above are loose rather than quoted:* the harness is a runtime
interface, not a versioned file, and its wording is not one fixed string — the same fact
appears in the `Agent` tool's body and in its `run_in_background` parameter description in
different words, and what is delivered varies with the session and the agent type reading
it. The substance is invariant across those wordings, so this spec states the substance
and names the field it came from rather than pinning a quotation a later reader on a
different harness build would find does not match. Where a string *is* quoted here, it is
byte-identical to the schema delivered to this session.

**The design depends on neither M3 nor M4 being universally true**, and this is
deliberate. Whatever the mechanism turns out to be, the skill must stop asserting
*unconditional* resumability: a lead can only resume a worker whose agentId it actually
holds, and M2's verbatim citation ties that id to a spawn result. Every requirement below
is a property of the resulting **text**, so no scenario's outcome is evidence for or
against M3 or M4 — each is covered only by its own record above (an observation, with the
probe that would settle it; an inference, marked as one), and by nothing else in this
spec.

### What changes in `SKILL.md`

The *Dispatch, resume, and collection* section is rewritten, and every later sentence
that assumes a resume will succeed is made mode-aware. Sites, as of commit `4035926`
— **this list is where to start, not the definition of the work**: the requirement is
that *no* sentence in the file mandates a mode or assumes unconditional resumability, so
the whole file is swept and any further site found is fixed the same way.

| Line | Today | After |
| --- | --- | --- |
| 30 | mandates `run_in_background: false` on every fresh dispatch | states what each mode gives the lead and leaves the choice to it, per dispatch; keeps the trade-off (synchronous keeps gates sequential and lands the report in-turn; background frees the turn and yields a resumable worker) as *information*, not a rule |
| 32 | *"the only way to preserve their context across rounds"*; resume framed as the route | resume framed as **a** route — the one that preserves the worker's context — available when the lead holds a resumable agentId; the findings-file + fresh-dispatch route named beside it as equally valid; resumability stated as a **fact** that follows from how the agent was dispatched |
| 34 | "a synchronous `Agent` call returns its report in-turn, and a resumed worker's completion notification wakes the session… the only two waits you have" | same two waits, restated so a **background fresh** dispatch is covered: an in-turn tool result, or a completion notification (from a background dispatch or a resume). The no-polling / no-sleep rule survives verbatim |
| 42 | findings file "passed in the resume message" | passed in the resume message **or** in a fresh worker's dispatch prompt |
| 89 | spec-gate findings: "resume it by agentId and end your turn" | carry the round forward by whichever route the writer's dispatch mode allows |
| 92 | "Every later round in this run — qa, acceptance — **resumes** *this same coder*" | continuity is the reason to prefer a resumable dispatch, stated as such; if no resumable agentId is held, later rounds go to a fresh coder with the findings file and the commit refs |
| 93, 98 | qa / acceptance findings: "Resume it and end your turn" | same two-route routing; the commit-per-round rule and the fresh re-gate are untouched |
| 99 | docs pass is "a fresh, **synchronous** dispatch" | "a fresh dispatch" — the mode is the lead's call |
| 131 | fix run on an open PR: "resumes work within this run as they always do" | reworded so it does not promise resumability the run's own dispatch mode may not have produced |
| 141, 142 | Delegation table: writer/coder findings routed "(resume it by agentId)" | both routes named |

**One further site does change, smaller than the table's rows:** line 36 (lost-report
recovery). Its discipline is correct under either mode and survives intact, but its
phrase "the recorded agentId" presumes one was recorded, so it is reworded not to imply
that an agentId always exists. It has its own Tasks entry.

**Untouched on purpose:** lines 143–144 — `qa` and `auditor` are always a **fresh**
dispatch, never a resume. That is a statement about gate independence, not about dispatch
mode, and it survives unchanged.

The skill's frontmatter `description` makes no dispatch-mode or resume claim (verified),
so it needs no edit — but it is an edit site to *check*, not to skip.

### The user-facing mirror

`README.md` carries the same two claims and must not survive the change asserting them.
Known sites (again, a starting list, not the definition):

- **The *Dispatch and resume* paragraph, L328–344** — L328: *"A **fresh** dispatch is
  synchronous (`run_in_background: false`) and its tool result **is** the worker's
  report"* (the mandate); L331: *"because a resume is the only way to preserve their
  context"* (the false claim).
- **L302–305** (workflow step 5, *"routes its findings back to the same coder by agentId
  — resuming it and continuing on its completion notification"*) and **L410** (`coder`
  section, *"The lead **resumes the same coder** for qa, acceptance-gate, and PR-review
  findings"*): routing prose that admits only the resume route.

This is a **deviation from the card's original scope** (recorded below) that the card now
carries: the acceptance gate runs *before* the docs pass, so the README correction
belongs to the build, not to the writer's docs pass.

`docs/ARCHITECTURE.md` L103 was checked and needs no change: it describes what the main
session enables (*"fresh synchronous dispatches return their report as the tool result, a
resumed worker's completion notification wakes the orchestrating session, and
`TaskOutput`/`TaskList` exist there for lost-report recovery"*) without mandating
anything. The **docs pass owns re-checking it** once the skill's new wording is
final, and owns folding this spec into `README.md` / `ARCHITECTURE.md` per
`docs/CLAUDE.md`.

### Boundary

Files the build may change:

- `plugins/ca77y-engineering/skills/lead/SKILL.md`
- `README.md`
- this spec (removed by the docs pass, per `docs/CLAUDE.md`)

Files the build must **not** change: the four worker definitions, `analyst.md`, the
`board` skill, either `plugin.json` (no version bump), `docs/ARCHITECTURE.md`,
`docs/issues/*`, and `docs/specs/contain-subagent-traffic-inside-the-pipeline.md` (see
*Coordination*). Nothing outside the story worktree is written; the repository root
checkout is read-only.

Every scenario below is a property of text inside that boundary, verifiable by reading
the changed files and by the commands in *Validation* — so every scenario can be run
where the change lives.

### Validation

This repo has no test runner, no build, and no install step, so validation is inspection
plus the repo's own invariant scripts. Consumers of the changed files, and how each is
reached:

1. **The root `CLAUDE.md` five-file invariant** — `SKILL.md` is one of the five files
   carrying the byte-identical *"Addressing the story worktree."* paragraph. Run from the
   worktree root; must print `1`:

   ```bash
   grep -h '^\*\*Addressing the story worktree\.\*\*' \
     plugins/ca77y-engineering/agents/{coder,writer,qa,auditor}.md \
     plugins/ca77y-engineering/skills/lead/SKILL.md | sort -u | wc -l
   ```

2. **The two-file board-profile invariant** — this change touches neither copy; run it as
   a regression check. Must print `1`:

   ```bash
   grep -h '^\*\*Working from the board profile\.\*\*' \
     plugins/ca77y-engineering/agents/{writer,auditor}.md | sort -u | wc -l
   ```

3. **Manifest parity and no version bump** — the root `CLAUDE.md` parity loop must print
   `ok` for every plugin, and `git -C <worktree> diff -- plugins/*/plugin.json
   plugins/*/.claude-plugin/plugin.json` must be empty.
4. **Diff scope** — `git -C <worktree> status --short` / `diff --stat` shows only
   `SKILL.md`, `README.md`, and this spec.
5. **Residual-mandate sweep** — `grep -rn "run_in_background" --include='*.md' .`, with
   every surviving hit read and confirmed descriptive rather than prescriptive. The token
   grep is a starting point only: a mandate can be written without the token ("always
   dispatch synchronously"), so the sweep is a reading of every dispatch-instructing
   sentence, not a grep result.
6. **The skill still loads** — `/reload-plugins` shows the `lead` skill. **This one is not
   the coder's**, and it is not a gate: it is a session command, run by whoever next
   invokes the skill. What the coder owns instead is the inspection it stands in for — the
   skill file's path and frontmatter are unchanged, and the Claude manifest lists agents
   only, so no manifest entry is involved.

There is no CI build consuming these files: `.github/workflows/` holds only the Claude
review and mention workflows, neither of which builds or type-checks Markdown.

### Deviations from the card

1. **Scope widened to `README.md`.** The card's Scope named only
   `plugins/ca77y-engineering/skills/lead/SKILL.md`. The same two claims are mirrored in
   the user-facing `README.md`, and the acceptance gate runs before the docs pass, so a
   README left asserting the removed rule would ship. **Applied to the card during this
   spec pass** (the board profile authorises content corrections, and a spec pass is
   before any code exists): a Scope paragraph and a sixth acceptance criterion were added
   to SMR-167, both marked with the date and the reason.
2. **Criterion 5 has no automated owner.** *"No two rules in the skill can both be
   followed only by violating the other, and a lead following it literally reaches the end
   of a fix round without improvising"* cannot be closed by any script in a repo whose
   product is prose. Its **owning mechanism is a recorded walkthrough**: the coder
   produces, in its report, a step-by-step trace of one fix round in *each* mode, naming
   for every action the sentence in the changed file that licenses it, and naming the two
   points where the two traces diverge. `qa` and the acceptance `auditor` verify by
   re-reading that trace against the file. It is a Tasks entry below, owned by the coder,
   and it is inspection — not a test.
3. **No other criterion lacks an owner.** The remaining five criteria (1–4 and the new 6)
   are all closable by the coder's edits and verifiable by reading the changed files;
   swept against the card's full criteria list, not only the one that prompted this note.

### Coordination

- **`docs/specs/contain-subagent-traffic-inside-the-pipeline.md` is SMR-166's spec, still
  in the specs area, and it contradicts this change** — its Design (*"**Fresh dispatches
  stay synchronous.**"*), its scenario at L189 (*"**THEN** the dispatch is a synchronous
  `Agent` call (`run_in_background: false`) to the qualified agent name, made from the main
  session, and the tool result is treated as the report"*), and its Tasks bullet at L267. It is **not this story's
  to edit or remove**; the docs pass must convert and remove *this* spec only. Raised as a
  board follow-up on SMR-166 instead. If SMR-166 is worked after this ships, that spec
  file must be reconciled or retired first, or its gate will demand the mandate back.
- **Sibling sweeps ran.** The board profile's `search` binding is bound and probed, and
  both sweeps were executed against the `Agentic Claude` project: (a) no sibling card
  scopes shared infrastructure this task would collide with — this change adds none; (b)
  the settled-decision sweep found one contradiction, on SMR-166, **already corrected on
  the card** (criterion 3 and the turn-discipline Scope bullet), plus SMR-165 (`Done`),
  whose criteria describe the superseded subagent topology and are history rather than a
  live contradiction.

### Risks and alternatives

- **Risk: the removal reads as permission to be arbitrary.** Mitigated by keeping the
  trade-off in the text as information (what each mode buys) and by keeping the
  consequence explicit (a mode that yields no resumable agentId means the findings-file
  route), so the lead chooses knowingly rather than by coin flip.
- **Risk: a mode-neutral rewrite loses the no-polling discipline** that SMR-165/SMR-166
  shipped. Mitigated by keeping line 34's prohibition on sleeps and background Bash polls
  verbatim, and by R6's pairwise consistency sweep.
- **Alternative rejected: mandate background everywhere** so every worker is resumable.
  It re-creates the same defect with the opposite sign — it would forbid the synchronous
  gate dispatches the pipeline relies on for sequencing — and the card names it as the
  wrong fix.
- **Alternative rejected: fix `SKILL.md` only and leave `README.md` to the docs pass.**
  The acceptance gate runs first; the mirror would be judged as shipped while still
  asserting the removed rule.

## Requirements

### Requirement: The skill mandates no single dispatch mode

#### Scenario: no single-mode mandate survives

- **WHEN** every sentence in `SKILL.md` that instructs the lead how to make an `Agent`
  dispatch is read
- **THEN** none of them requires one `run_in_background` value across all fresh
  dispatches, and none makes a mode a condition of following the skill correctly

#### Scenario: the opposite prescription is not substituted

- **WHEN** the same set of sentences is read
- **THEN** none of them mandates background dispatch either; the mode is stated to be the
  lead's per-dispatch choice, with the consequences of each choice named

### Requirement: Resumability is stated as a fact that follows from the dispatch mode

#### Scenario: the fact is stated as a property, not an instruction

- **WHEN** the resume passage is read
- **THEN** it states that whether a worker can be resumed follows from how it was
  dispatched — a resume needs an agentId the dispatch produced — phrased as a property of
  the runtime rather than as a rule the lead is being asked to obey

#### Scenario: a synchronously dispatched worker has a stated route

- **WHEN** a lead that dispatched a worker synchronously reaches a gate that returns
  findings
- **THEN** the text directs it to carry the round forward by findings file and a fresh
  dispatch, and no sentence directs it to attempt a resume that its dispatch mode cannot
  support

### Requirement: The findings-file plus fresh-dispatch route is an equally valid carry-forward

#### Scenario: both routes named at every round-routing step

- **WHEN** each step that routes findings back to a worker is read — the spec gate
  (step 3), the qa loop (step 5), the acceptance gate (step 6), the Delegation entries for
  `writer` and `coder`, and the open-PR fix run
- **THEN** each names both routes, and the findings-file route is presented as a valid way
  to carry the round forward rather than as a degraded fallback

#### Scenario: the fresh dispatch's payload is fully specified

- **WHEN** the text tells the lead to carry a round forward with a fresh worker
- **THEN** it names what that dispatch must carry — the spec path, the worktree path and
  its dependency-provisioning status, the board profile where the worker needs one, the
  round's commit references, and the findings-file path — so the only thing lost is the
  previous worker's context

### Requirement: Both collection paths are stated as working from the main session

#### Scenario: both paths described, neither privileged

- **WHEN** the collection passage is read
- **THEN** it states that a synchronous call returns its report as the tool result in the
  same turn, and that a background dispatch or a resume wakes the session with a
  completion notification carrying the report; both are stated as working, and neither is
  named as the one correct path

#### Scenario: the no-polling discipline survives

- **WHEN** the same passage is read
- **THEN** it still forbids sleeps and background Bash polls as waiting mechanisms, and
  still states that the only waits the lead has are bounded by an agent finishing

### Requirement: The "only way to preserve context" claim is gone

#### Scenario: the claim is absent

- **WHEN** `SKILL.md` is searched for any statement that a resume is the only way to
  preserve a worker's context across rounds
- **THEN** no such statement appears; where the benefit of a resume is described, it is
  described as what a resume preserves, with no claim of exclusivity

### Requirement: The skill is internally consistent and walkable in either mode

#### Scenario: pairwise consistency sweep

- **WHEN** every sentence in `SKILL.md` that instructs a dispatch, a resume, or a wait is
  enumerated and compared pairwise
- **THEN** no two of them can be satisfied only by violating the other — in particular, no
  sentence mandates a mode while another depends on the affordance the other mode provides

#### Scenario: recorded literal walkthrough of a fix round

- **WHEN** a reader walks the qa round and the acceptance round literally, once having
  dispatched the coder synchronously and once in the background
- **THEN** each walk reaches the round's commit and the next fresh gate with every action
  licensed by a named sentence in the file, with no step requiring a capability the chosen
  mode does not provide and no improvisation; the two traces and their divergence points
  are recorded in the build report

### Requirement: The user-facing mirror agrees with the skill

#### Scenario: README carries no claim the skill no longer makes

- **WHEN** `README.md` is read — the *Dispatch and resume* paragraph, the workflow steps
  that route findings back, and the `coder` section
- **THEN** it neither fixes `run_in_background` to a single value for all fresh dispatches
  nor calls a resume the only way to preserve a worker's context, and where it describes
  routing a round back to a worker it admits both routes

### Requirement: The repo's cross-file invariants survive the change

#### Scenario: the worktree paragraph stays byte-identical across five files

- **WHEN** the root `CLAUDE.md` verification `grep` for *"Addressing the story worktree."*
  is run over the four worker definitions and `skills/lead/SKILL.md`
- **THEN** it prints `1`

#### Scenario: the board-profile paragraph is untouched

- **WHEN** the root `CLAUDE.md` verification `grep` for *"Working from the board profile."*
  is run over `writer.md` and `auditor.md`
- **THEN** it prints `1`, and neither file appears in the change's diff

#### Scenario: no version is bumped and both manifests agree

- **WHEN** the root `CLAUDE.md` manifest-parity loop is run and the diff is inspected
- **THEN** every plugin prints `ok`, and no `plugin.json` under `plugins/*` appears in the
  diff at all

#### Scenario: the diff touches only the boundary

- **WHEN** `git -C <worktree> status --short` and `diff --stat` are inspected
- **THEN** only `plugins/ca77y-engineering/skills/lead/SKILL.md`, `README.md`, and this
  spec appear; the worker definitions, `analyst.md`, the `board` skill,
  `docs/ARCHITECTURE.md`, `docs/issues/*`, and
  `docs/specs/contain-subagent-traffic-inside-the-pipeline.md` are unchanged

## Tasks

- [ ] Rewrite `SKILL.md` line 30's paragraph: replace the mandate with a statement of what
      each dispatch mode gives the lead (in-turn tool result vs. a completion notification
      plus a resumable agentId), the trade-off as information, and the choice left to the
      lead per dispatch.
- [ ] Rewrite `SKILL.md` line 32's paragraph: drop *"the only way to preserve their
      context across rounds"*; state resumability as a fact following from the dispatch
      mode; name the findings-file plus fresh-dispatch route beside the resume as an equal
      carry-forward; keep the `SendMessage` argument shape (agentId, message, and the
      required summary) and the end-your-turn collection for the resume case.
- [ ] Restate line 34's *What wakes you* so a **background fresh** dispatch is covered by
      the notification path; keep the no-sleep / no-background-poll prohibition verbatim.
- [ ] Make lines 42, 89, 92, 93, 98, 99, 131, 141, and 142 mode-aware, per the table in
      *Design*.
- [ ] Adjust line 36 (lost-report recovery) so "the recorded agentId" does not imply one
      always exists; the recovery discipline itself — check `TaskList`/`TaskOutput`, then
      the worktree state, collect rather than replace, escalate rather than double-dispatch
      — is otherwise unchanged.
- [ ] Leave lines 143–144 (`qa` and `auditor` are always a fresh dispatch, never a resume)
      **fully untouched** — that is a statement about gate independence, not dispatch mode.
- [ ] Sweep the whole of `SKILL.md` (including the frontmatter `description`) for any
      further sentence that mandates a mode or assumes unconditional resumability, and fix
      each the same way — the table is the starting set, not the definition of the work.
- [ ] Update `README.md`: the *Dispatch and resume* paragraph (L328–344, claims at L328
      and L331), workflow step 5 (L302–305), and the `coder` section's routing sentence
      (L410), plus any other site the same sweep finds.
- [ ] Record in the build report the two literal walkthrough traces required by R6 —
      one synchronous, one background — each action tied to the sentence that licenses it,
      with the divergence points named. *(Owner: the coder. Inspection, not a test — this
      is the owning mechanism for card criterion 5.)*
- [ ] Run *Validation* checks 1–5 and report each result verbatim. Check 6 is **not the
      coder's** — record instead that the skill file's path and frontmatter are unchanged.
- [ ] **Not the coder's task — already done in the spec pass:** the SMR-167 and SMR-166
      card corrections. Do not re-apply them, and do not edit
      `docs/specs/contain-subagent-traffic-inside-the-pipeline.md`.
- [ ] **Not the coder's task — the docs pass owns it:** folding this spec into `README.md`
      and `docs/ARCHITECTURE.md`, re-checking `ARCHITECTURE.md` L103 against the final
      wording, and removing this spec from the specs area.
