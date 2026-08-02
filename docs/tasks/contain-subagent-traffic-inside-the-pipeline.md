---
type: story
title: Convert the lead into a main-session skill that runs the pipeline flat
---

# Convert the lead into a main-session skill that runs the pipeline flat

- [<] Convert the lead into a main-session skill that runs the pipeline flat #improvement 🔺 🆔 contain-subagent-traffic-inside-the-pipeline
  - **Why.** The `lead` was designed as a sealed unit — hand it a card, get back a PR —
    but as a *subagent* it sits on a topology the harness does not support and has an
    open defect in: children of a subagent detach regardless of `run_in_background`,
    their completion notifications route to the **root session** from any depth, a
    resumed child's report leaks to main, and subagents have no `TaskOutput` to collect
    with. This was established empirically by this card's investigation (log below,
    sessions of 2026-08-01/02) and is independently reproduced and filed upstream:
    [anthropics/claude-code#75043](https://github.com/anthropics/claude-code/issues/75043)
    (open, `has repro` — the exact pattern, 4/4 stalls),
    [#81438](https://github.com/anthropics/claude-code/issues/81438) (the literal
    resumed-child leak), [#69212](https://github.com/anthropics/claude-code/issues/69212)
    (results route to root, orphaned grandchildren). It is a harness defect, not a prose
    problem: no agent-definition wording can reroute notification delivery.
  - **Decision (2026-08-02, log below).** Move the orchestrator to where the harness
    delivers: the `lead` becomes a **skill run in the main session** that dispatches
    `ca77y-engineering:{writer,coder,qa,auditor}` **directly, flat, no nesting**. Every
    mechanism the lead contract needs is GA and works from main: synchronous fresh
    dispatch returns the report in-turn; `SendMessage` resume is first-class and the
    resumed worker's completion notification is *delivered to the orchestrator* (the
    leak becomes the designed signal path); `TaskOutput` exists in the main-session
    roster, dissolving the `lead.md:28` defect (Finding 5). All four workers are proven
    leaves, and the analyst seam is untouched — the user invokes the skill instead of
    the agent. This shape is the community consensus (superpowers
    `subagent-driven-development`, ccpm, get-shit-done) and the officially recommended
    one (sequential subagent chaining + fresh-context adversarial review); agent teams
    were evaluated and **rejected** for this pipeline (experimental, 13–22% idle-
    notification token burn, no teammate restore on `/resume`, wrong fit for sequential
    hub-and-spoke — see the option A analysis in the log).
  - **Scope — build:**
    - A `lead` skill in the ca77y-engineering plugin carrying the full lead contract
      translated to main-session semantics: inputs, workspace/worktree creation and
      dependency provisioning, the spec → spec-gate → build → qa loop → acceptance gate
      → docs → ship → PR-review loop workflow, the commit model, gate routing, the 3×
      rule, and the final handoff. The turn discipline inverts where the runtime does:
      fresh gate dispatches (`qa`, `auditor`) stay synchronous in-turn; `writer`/`coder`
      continuity across rounds keeps `SendMessage` resume, collected by the main-session
      mechanics that actually exist there (blocking `TaskOutput`, or ending the turn and
      being woken by the completion notification — both legitimate in main, and the
      skill says which to use when). No rule may mandate a mechanism unavailable in its
      runtime — that is how the `lead.md:28` defect happened.
    - Orchestrator context discipline, per the convergent evidence in the log: workers
      are handed **paths, not content**, and write reports to files in the worktree
      where a round's findings exceed a summary; the skill keeps a durable **pipeline
      ledger file** in the worktree (task, step, dispatched agentIds, round counts,
      commits) so mid-pipeline compaction cannot lose orchestration state — after
      compaction, trust the ledger and `git log` over recollection.
    - Retire `plugins/ca77y-engineering/agents/lead.md` and update everything that
      names it: root `README.md` (lead is the user-facing entry point), root
      `CLAUDE.md` (the byte-identical "Addressing the story worktree." paragraph is
      currently duplicated across five agent files including `lead.md` — the skill must
      carry it and the verification `grep` updated to the new file set),
      `docs/ARCHITECTURE.md` dispatch model, and the other agents' references to "the
      `lead`" where the referent is now the orchestrating main session.
    - Worker-side hygiene in `{coder,writer,qa,auditor}.md`: the report contract names
      the real channels — final text as the return value when dispatched fresh, the
      completion notification reaching the orchestrator when resumed — and explicitly
      forbids inventing `SendMessage to: "main"` as an escalation fallback (no
      definition forbids it today; Finding 1 shows a coder inventing exactly that).
      Keep this hygiene even though the orchestrator now *is* main: the analyst and
      researcher trees still run depth-2 dispatches.
    - A `docs/issues/` note recording the nested-orchestrator topology as
      harness-limited: what was tried, the evidence (log below), the upstream trail
      (#75043, #81438, #69212), and what would unblock it (fixed upstream, or a
      topology change like this one).
  - **Scope — explicitly out:**
    - No `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` or any depth-limiting env var —
      flatness is the skill's design, not a machine-enforced cap (user decision,
      2026-08-02).
    - No agent teams (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` was removed from settings
      2026-08-02); no dynamic-workflow rebuild — that remains a possible follow-up card
      for restoring the sealed-unit property, and nothing here forecloses it.
    - The known trade is accepted, not worked around: the main session runs one story
      at a time; parallel stories are parallel sessions over the existing per-story
      worktrees.
  - Acceptance criteria:
  - Invoking the `lead` skill in the main session drives one task end to end — prompt
    (optionally a story card) to a single PR — dispatching only
    `ca77y-engineering:{writer,coder,qa,auditor}` directly from the main session; no
    pipeline agent dispatches or resumes another pipeline agent.
  - `agents/lead.md` is removed, and every reference to the lead-as-agent is updated:
    root `README.md`, root `CLAUDE.md` (including the five-file worktree-paragraph
    duplication rule and its verification `grep`, updated to the surviving set plus the
    skill), `docs/ARCHITECTURE.md`, and the worker/analyst definitions.
  - Every collection rule in the skill is executable in the main session as written —
    fresh dispatches synchronous, resumes collected via mechanisms that exist there —
    and no instruction mandates a tool unavailable in its runtime.
  - The skill hands workers paths rather than pasted content, and maintains the
    on-disk pipeline ledger; the ledger is sufficient to resume orchestration after a
    compaction or session restart.
  - No worker definition permits messaging `main` as an invented fallback; each names
    its real report channel for both fresh and resumed dispatch.
  - The nested-topology limitation is recorded in `docs/issues/` with the evidence and
    the upstream issue references, per [`../CLAUDE.md`](../CLAUDE.md) and
    [`CLAUDE.md`](CLAUDE.md) rules.
  - The commit model, gate routing, 3× rule, and PR-review loop semantics from the
    current `lead.md` survive the translation — including the polling/baseline
    discipline shipped for the review loop — with only their waiting mechanics changed.
  - Verified by a real pipeline run, not inspection: one real story shipped end to end
    through the skill, with worker reports collected without stalls and without the
    orchestrator re-dispatching an agent whose work already existed on disk.
  - No depth-limiting environment variable is introduced anywhere in the change.
  - Cross-links [`collect-sendmessage-resumes-inside-the-leads-turn`](collect-sendmessage-resumes-inside-the-leads-turn.md)
    (shipped the collection discipline this skill inherits in translated form) and
    [`detect-pr-review-completion-from-an-edited-comment`](detect-pr-review-completion-from-an-edited-comment.md)
    (the PR-review loop this skill carries forward).

---

## Investigation log

The evidence base for the decision above. Kept verbatim as working notes for the spec
pass; the card supersedes the log's open questions. Dates are absolute.

### Source: the 2026-08-01 session transcript

The session that produced the incident is retained at
`~/.claude/projects/-Users-catty-Workspace-agentic-claude/b3e03d47-ca3d-4901-8e92-efff145d0f69.jsonl`,
with per-subagent transcripts and `*.meta.json` (carrying `parentAgentId` and
`spawnDepth`) under the sibling `b3e03d47-…/subagents/` directory. Harness version
recorded in the entries: `2.1.220`.

The session ran **four** leads, not the two the card's Background paragraph names:

| agentId | story |
| --- | --- |
| `af3f6ffc41ceeac42` | worktree dependency provisioning |
| `ad932b28fb5599436` | SendMessage resume collection rule |
| `a5a60c6ba2156d81b` | require-citations ([#10](https://github.com/ca77y/agentic-claude/pull/10)) |
| `a1fe10dd4b564ba39` | commit-each-fix-round ([#11](https://github.com/ca77y/agentic-claude/pull/11)) |

Those four dispatched 39 depth-2 children (13 `qa`, 9 `auditor`, 12 `writer`, 5 `coder`).

### Finding 1 — the child→lead addressability ladder, verbatim

Coder `ae2b3b6576641e2fb` (under the #11 lead) tried three recipients in order and
recorded these verbatim `SendMessage` results:

| `to:` | result |
| --- | --- |
| `ca77y-engineering:lead` | `{"success":false,"message":"No agent named 'ca77y-engineering:lead' is reachable.\nCheck the spelling, or use the agent ID from a background agent's spawn result."}` |
| `lead` | `{"success":false,"message":"No agent named 'lead' is reachable. …"}` |
| `main` | `{"success":true,"message":"Message queued for the main conversation's next turn."}` |

It then addressed `main` directly for its next two rounds. Coder `a6767c4d5233dc5eb`
(under the #10 lead) tried `ca77y-engineering:lead`, failed, and did not retry.

This revises the card's stated root cause. The fallback path is **not** "the child
returns its report as its result" — it is the child *inventing* `main` as the next rung
of an escalation ladder, and `main` accepting. `coder.md:64` forbids messaging *the
lead*; it says nothing about `main`, so the prose does not cover the path actually taken.

### Finding 2 — resumed agents leak, freshly dispatched ones do not

Of the 15 depth-2 task-notifications delivered to the main session, **all 15** came from
a `coder` (10) or a `writer` (5) — the only two agents the `lead` resumes by
`SendMessage`. **Zero** came from `qa` (13 dispatched) or `auditor` (9 dispatched) — the
two the `lead` always dispatches fresh and synchronously. With n=39 and a clean split
along the resume/fresh boundary, this is direct evidence for the resume hypothesis rather
than inference from it.

### Finding 3 — the `lead` itself is the larger share of the leak

21 of the 36 attributable notifications delivered to main were **depth-1** — the leads
themselves, not their children. Every notification carries the harness's own contract:

> A task-notification fires each time this agent stops with no live background children
> of its own. The user can send it another message and resume it, so the same task-id may
> notify more than once.

Counts per lead: `ad932b28…` ~11 (it ran while the 1.9.0 collection rule was still being
built), against ~2 each for `a5a60c6ba…` and `a1fe10dd…` (which ran after it). The
collection rule cut lead-stop notifications sharply but not to one. The session's very
first notification carries this `<result>`:

> The writer fix is running in the background. I'll wait for its completion notification
> before proceeding to re-audit.

— the exact failure `lead.md:32` documents, captured live.

### Finding 4 — the `SendMessage` tool description primes the behaviour

The harness's own `SendMessage` description tells every child:

> Your plain text output is NOT visible to other agents — to communicate, you MUST call
> this tool.

and lists `"main"` as a first-class recipient: *"The main conversation (background
subagents only)"*. It also states that recipients are addressed **by teammate name**, and
that `agentId` is for when an agent has no name.

So the pipeline's "your report is your return value" rule (`coder.md:64`, `qa.md:27`,
`writer.md:82`, `auditor.md:38`) is contradicted by the tool description the child reads
at the same time — and the contradiction resolves in favour of `main` precisely for a
*resumed* (hence background) child, which is the case where the return-value path really
has stopped working. The prose is not competing with a bug; it is competing with a
documented harness affordance.

### Live probes (2026-08-02, harness 2.1.220, this session)

Two throwaway `general-purpose` agents, dispatched from the main session. No pipeline
agents were used.

**Probe 1 — addressability and self-identification.** A leaf subagent found:

- Name-shaped addresses all fail identically: `to: "general-purpose"`, `to: "claude"`,
  `to: "parent"` each return
  `{"success":false,"message":"No agent named '…' is reachable.\nCheck the spelling, or use the agent ID from a background agent's spawn result."}`
- An **id-shaped** address takes a different code path:
  `to: "a1111111111111111"` returns
  `{"success":false,"message":"Agent \"a1111111111111111\" could not be resumed: No transcript found for agent ID: a1111111111111111"}`.
  Addressing an agentId means *resuming its transcript*, not messaging a live process.
- **There is no roster.** The agent-type list in a subagent's context is a set of spawn
  templates, not addressees — `general-purpose` is unreachable as an address even though
  it is the agent's own type. A leaf agent that has spawned nothing holds no addresses at
  all; its outbound space is effectively `{"main"}`.
- A subagent **can** recover its own agentId, but only off-disk and heuristically: the
  session scratchpad's `tasks/<agentId>.output` symlink points at its own transcript,
  disambiguated by matching the transcript's first line against its own prompt. Nothing
  in-context — system prompt, `env`, cwd — carries it. Relevant env: `CLAUDE_CODE_CHILD_SESSION=1`,
  `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH=5`, `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS=30`.

**Probe 2 — the leak, reproduced minimally.** A stand-in "lead" (depth 1) dispatched a
child (depth 2) synchronously, then resumed it with `SendMessage`:

- **A child *can* address its blocked parent by raw agentId** —
  `{"success":true,"message":"Message queued for delivery to a5900e7d8f4c81f20 at its next tool round.",…}`,
  and the text was delivered as
  `<agent-message from="general-purpose">PROBE-CHILD-TO-PARENT-ROUND-1</agent-message>`.
  Two caveats: delivery is **queued to the parent's next tool round**, so it cannot wake a
  blocked parent — it landed in the same turn as the child's return value, not before it;
  and the delivery envelope names the **agent type**, not the id.
- Resuming a finished child returns
  `{"success":true,"message":"Agent \"…\" had no active task; resumed from transcript in the background with your message. You'll be notified when it finishes.",…}`.
  **"You'll be notified" does not mean the resumer.** The resumed child's report
  (`PROBE-R-ROUND-2`) never reached its parent by any channel — the parent only learned of
  it by reading the transcript off disk. It arrived in **this main session** as a
  `<task-notification>`. The card's leak reproduced live, from the only vantage point that
  can observe it.

### Finding 5 — `lead.md:28`'s mandated collection primitive does not exist

`TaskOutput` is **not available to subagents** in this harness. Evidence from the
2026-08-01 transcripts, independent of the probes:

- Across all 43 subagents, `TaskOutput` was called **0** times, while `Bash` (501),
  `Agent` (39), `ToolSearch` (24), `SendMessage` (22), `Monitor` (12) and `TaskStop` (5)
  all were. Absence is not preference: **all four leads searched for it and failed.**
- `ToolSearch select:TaskOutput` → `No matching deferred tools found`, in
  `af3f6ffc…`, `ad932b28…`, `a5a60c6b…`, and `a1fe10dd…`.
- `select:SendMessage,TaskOutput` returned only `SendMessage` (twice).
- One lead tried alternative names — `select:AgentOutput,GetTaskOutput,BashOutput,TaskResult`
  → `No matching deferred tools found`.
- Probe 2's subagent reproduced the same result today.

`TaskOutput` **is** available to the main session (it is in the main deferred-tool
roster), so the tool exists — its availability differs between the main session and
subagents. The rule shipped in 1.9.0 therefore cannot execute as written for the agent it
is written for; whatever containment 1.9.0 achieved came from its *fallback* (the
foreground `Bash` poll), not its mandated mechanism. This is a defect in a shipped rule,
found by this investigation and outside this card's stated scope.

### Finding 6 — the official docs say this topology is not supported

There is first-party documentation for building pipelines like this one, and it draws the
boundary explicitly.

[Run agent teams](https://code.claude.com/docs/en/agent-teams) — comparison table:

| | Subagents | Agent teams |
| --- | --- | --- |
| Communication | **Report results back to the main agent only** | Teammates message each other directly |
| Coordination | Main agent manages all work | Shared task list with self-coordination |

and in prose: *"Unlike subagents, which run within a single session and can only report
back to the main agent…"*. **Depth-2 → main is the documented design of the subagent
primitive, not a bug.** The pipeline nests subagents two deep and expects depth-2 to
report to depth-1; that is not a topology the primitive offers.

`SendMessage`'s name-addressing is an **agent-team** feature. Teams keep a name registry
and mailboxes — `~/.claude/teams/{team}/config.json` holds a `members` array of names and
agent IDs, and each agent has an inbox at
`~/.claude/teams/{team}/inboxes/{agent}.json`. Teams are **experimental and off by
default**, gated behind `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`. That variable is **not
set** in this environment (`~/.claude/settings.json` `env` holds only
`ENABLE_CLAUDEAI_MCP_SERVERS`, `CLAUDE_AFK_TIMEOUT_MS`, `CLAUDE_CODE_ATTRIBUTION_HEADER`,
`CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH`, `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`). With no
team there is no registry, which is exactly why `to: "lead"` failed and why probe 1 found
no roster.

Two documented limitations rule out the obvious fix of simply enabling teams: **"No nested
teams: teammates cannot spawn their own teammates"**, and **"Lead is fixed: the main
session is the lead for its lifetime"** — the repo's `lead` is precisely a non-main
session that spawns its own workers.

[Dynamic workflows](https://code.claude.com/docs/en/workflows) is the other first-party
option, and its stated property is the card's desired contract: *"A workflow script holds
the loop, the branching, and the intermediate results itself, so Claude's context holds
only the final answer."* Its table classifies the repo's current design under **Agent
teams** — *"a lead agent supervising peer sessions"*, *"the lead agent, turn by turn"* —
against **Workflows**, where the script decides and intermediate results live in script
variables. Workflows are generally available (v2.1.154+), not experimental.

### Consequences for this card's acceptance criteria

- Criterion 3 ("a child's report reaches its `lead` without transiting the main session")
  is **partly reachable**: a child can message its parent by agentId, but only if the
  `lead` passes its own id down — and the `lead` cannot obtain its own id from context,
  only by the off-disk heuristic in probe 1. The *resumed*-child report remains
  unreachable, which is the case that actually leaks.
- Criterion 4 ("one notification per `lead`") is **unreachable under the subagent
  primitive**: a task-notification fires each time an agent stops, by documented design.
- Criterion 6 ("verified by a real pipeline run") is unreachable while this card is
  worked in the main session with no `lead` dispatches.
- Finding 5 is a live defect in `lead.md:28`. **Decided 2026-08-02: folded into this
  card** rather than split out, since it is the same collection contract this story
  already covers. Recorded as a scope sub-bullet above.

### Status after session 1 (2026-08-02 ~02:00 — superseded below)

Investigation paused here on 2026-08-02 with the evidence recorded and no agent
definitions changed yet. Still open: whether the deliverable is a `docs/issues/` note plus
the controllable tightening (forbidding `to: "main"` in the child definitions, which no
definition currently forbids, and stating the resumed-report dead end plainly in
`lead.md`), a note alone, or a larger re-scope toward the
[dynamic workflows](https://code.claude.com/docs/en/workflows) primitive, which provides
natively what this pipeline hand-rolls. The card's acceptance criteria need rewriting
against the findings before it is built either way.

---

## Investigation log — session 2 (2026-08-02 ~02:20, harness 2.1.220, agent teams ENABLED)

Validation pass over findings 1–6, plus continuation probes run with
`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` active. The user framed two candidate designs to
evaluate: **(A)** rebuild the pipeline on agent teams, or **(B)** convert the `lead` into
a skill run from the main session that dispatches the workers flat.

### Environment change since session 1

`~/.claude/settings.json` gained `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` at 02:13 on
2026-08-02 — after session 1 paused, before session 2 started. **Finding 6's "the
variable is not set" is stale from that moment on.** Everything in sessions before 02:13
was measured with teams off; every probe below was measured with teams on.

### Validation verdicts on findings 1–6

| Finding | Verdict with teams ON |
| --- | --- |
| 1 — no name addressing, `main` is the invented fallback | **Superseded.** A name registry now exists (see 7). `to: "lead"` still fails, but only because no member carries that literal name; real registered names resolve. |
| 2 — resumed children leak, fresh ones don't | **Holds.** Reproduced live: a resumed depth-2 child's completion arrived in the main session as a `<task-notification>` (see 10). |
| 3 — the lead's own stop-notifications are the larger share | **Holds and extends**: under teams, a subagent's idle also surfaces to main as a teammate `idle_notification`. |
| 4 — `SendMessage` description primes `main` | **Holds**, though with a roster present the child now has real alternatives. |
| 5 — `TaskOutput` unavailable to subagents | **Holds unchanged.** Re-probed: `ToolSearch select:TaskOutput` → "No matching deferred tools found"; `select:SendMessage,TaskOutput,TaskList,TaskStop` returns the other three and omits `TaskOutput`. The `lead.md:28` defect stands. |
| 6 — teams off, no registry; nested topology unsupported | **Environment half stale** (flag now on). Docs half re-verified current: no nested teams, lead fixed to the main session, one team per session. New: `TeamCreate`/`TeamDelete` no longer exist (since v2.1.178) — the team is **implicit**; spawning agents auto-forms it. |

### Finding 7 — with teams on, an implicit per-session team forms and depth-1 subagents join it by name

At session start the harness creates `~/.claude/teams/session-<8 chars>/` with the main
session registered as `team-lead` (agent type `team-lead`, `leadSessionId` = the session).
Every agent spawned from the main session via the plain `Agent` tool is added to
`config.json`'s `members` with its assigned **name**, and its idle events are delivered to
the main session as `<teammate-message>` `idle_notification`s. A depth-1 subagent's
context now names reachable teammates (observed: `main` plus a sibling's name) — the
roster finding 1 proved missing now exists, **for registered members**.

### Finding 8 — a depth-2 child can message its depth-1 parent by name; the child itself stays off-roster

Probe (this session): a named depth-1 agent (`nest-lead`) spawned a named depth-2 child
(`nest-child`), then resumed it via `SendMessage`. Results:

- The child's `SendMessage(to: "nest-lead")` **succeeded and was delivered**, both from
  the synchronous first run and from the resumed round — the parent is a registered
  member, so its name resolves. Session 1's criterion-3 dead end ("resumed-child report
  unreachable") is **closed under teams**, with the caveats below.
- The child itself was **not added to the team roster** despite being spawned with a
  name — nested spawns stay anonymous, addressable only by raw agentId. "No nested
  teams" in practice means: nested spawns work but are not team members.
- Inbound envelopes carry the **agent type, not the assigned name**:
  `<teammate-message teammate_id="general-purpose" …>`. With several same-type children
  across rounds, sender identity must be carried in message content by convention.

### Finding 9 — mailbox delivery is deferred to the recipient's turn boundary; it wakes an idle agent but cannot reach a polling one

The decisive scheduling fact: the parent ran five in-turn foreground sleeps (~100 s)
after the child's sends and observed **nothing**; both messages were then delivered
**batched at the start of its next turn**, having sat queued through a child return, two
`SendMessage` calls, five sleeps, and two file reads. The queued mail then **woke the
idle parent** for a new turn. Consequences:

- The teams waiting model is *go idle and be woken by mail* — the exact opposite of
  `lead.md`'s "never end your turn to wait; collect in-turn". Under teams the in-turn
  collection is not just unsupported, it is **unobservable**: no amount of in-turn
  polling ever sees a mailbox message.
- `lead.md`'s current contract cannot be patched onto teams; the turn discipline would
  have to be inverted (end turn after every resume, resume work on wake).

### Finding 10 — the leak persists under teams

Observed in this session, teams on: the resumed depth-2 child's completion was delivered
to the **main session** as a `<task-notification>` (with its full `<result>`), even
though its report also reached its parent by name. And each depth-1 agent's idle
surfaced to main as an `idle_notification`. **"One notification per `lead`" remains
unreachable for a subagent lead under teams** — main gets the resumed-child completions
*and* the lead's idles; the traffic is duplicated to the parent rather than contained
inside it.

### Option A — rebuild on agent teams: viability check (own probes + docs)

**The structural point first: teams cannot host the current shape.** "Lead is fixed: the
main session is the lead" and "no nested teams" are both confirmed current. A teams
rebuild therefore *forces* the orchestrator into the main session — which is the same
move as option B. The real question is what teams add once the orchestrator is main:

Gains over flat subagents:
- Name-addressed messaging among registered members; auto-delivery of teammate messages
  and idle notifications to the lead (no polling).
- Idle-wake semantics: mail wakes an idle teammate — a usable replacement for resume
  collection, on the main-session side where it is the designed receiver anyway.
- Teammates can be spawned **from plugin subagent definitions** (docs, confirmed
  current): `ca77y-engineering:coder` etc. work as teammate types as-is; `tools`
  allowlist and `model` are honored, definition body appended to the system prompt.
  Caveat: `skills`/`mcpServers` frontmatter is ignored for teammates.
- Shared task list with dependencies and file-locked claiming; `TaskCreated`/
  `TaskCompleted`/`TeammateIdle` hooks as quality gates; plan-approval flow.

Costs and risks (docs "Limitations", confirmed current, plus probes):
- **Experimental, off by default**, with documented rough edges: task status can lag,
  shutdown slow, "lead shuts down before work is done" is a listed failure mode.
- **No session resumption for in-process teammates**: `/resume`/`/rewind` do not restore
  them — a resumed main session mid-pipeline has lost every worker and must respawn.
  For a pipeline whose whole run spans hours, this is the biggest operational risk.
- In-process teammates **cannot run background subagents** (foreground only).
- Envelope identity loss (finding 8) and turn-boundary delivery (finding 9) must be
  designed around.
- Token cost: each teammate is a full session loading project context; docs explicitly
  say teams cost significantly more than subagents and are wrong for *sequential* work —
  and this pipeline is sequential by design (spec → gate → build → qa → gate → docs).
  Teams' headline benefits (parallel exploration, inter-worker debate, self-claimed task
  lists) are things this hub-and-spoke pipeline deliberately does not use: workers never
  talk to each other; every edge runs through the lead.
- Keeping the `lead` as a *subagent* under teams stays broken: its children are
  off-roster (finding 8), resumed-child completions still leak to main (finding 10), and
  its own idles notify main (finding 10). Containment inside a subagent lead is not
  achievable with teams either.

**Verdict: teams do not rescue the nested design, and for the flat design they add
coordination machinery this sequential pipeline does not need, at experimental-grade
stability.** Real-world usage feedback: web research running, to be appended below.

### Option B — `lead` as a skill in the main session, flat dispatches: validated

Checked against the actual definitions and the probes; the approach is correct, and the
whole pipeline fits flat:

- **All four workers are leaves.** `coder.md:16`, `writer.md:17/74` state it outright;
  `qa.md` and `auditor.md` dispatch nothing. `lead.md:10` already asserts "the pipeline
  is flat — every agent below is a leaf". Depth after conversion: orchestrator (main,
  depth 0) → writer/coder/qa/auditor (depth 1). No nesting remains anywhere in the
  engineering pipeline.
- **The analyst seam is unaffected**: the analyst records cards; the *user* invokes the
  lead. Invoking a skill instead of an agent changes nothing for it. (The analyst's own
  depth-2 dispatches — auditor advisor gate, librarian — are fresh and synchronous, the
  kind finding 2 shows do not leak. The researcher's fan-out likewise.)
- **Every mechanism the lead needs works from main, today, GA:**
  - Fresh synchronous dispatch returns the report in-turn (unchanged).
  - `TaskOutput` **is** in the main-session roster — the `lead.md:28` rule becomes
    executable exactly by moving the lead to main; the folded-in scope bullet resolves
    itself.
  - A resumed worker's completion notification is *delivered to the main session* — the
    very leak this card documents becomes the designed signal path, arriving at the
    orchestrator that wants it. Nothing transits a session that didn't ask for it.
  - Criterion 4 ("one notification per lead") dissolves rather than being satisfied:
    there is no third party left to spare from notifications.
- **Costs, stated plainly:** the main session *becomes* the pipeline for the duration —
  its context accumulates every report (this is bounded: the current lead already holds
  the same traffic in one context). The sealed-unit property is traded away: one story
  per session; parallel stories need parallel sessions over the existing per-story
  worktrees, which the repo's worktree model already supports. A skill also cannot be
  version-pinned to the session the way an in-flight subagent is — a mid-pipeline skill
  edit changes later turns.
- Two session-1 findings become moot (finding 1's ladder, finding 5's defect); the
  child-side hygiene (forbid inventing `to: "main"` in worker definitions) is still
  worth shipping for the analyst/researcher trees that keep depth-2 dispatches.

### Option C — dynamic workflows (recorded in session 1, unchanged)

Still the only shape that restores the *sealed unit* (one background task, one
notification, script holds the loop; GA since v2.1.154). Two real design deltas beyond
prose: workflow `agent()` calls are always **fresh** — the resume-same-coder-by-agentId
pattern (context continuity across qa/acceptance/PR rounds) has no workflow equivalent
and would be replaced by the round-commit diffs already shipped in 1.9.0; and the
orchestrator's judgment calls (routing findings, 3×-rule escalation) must either live in
the script as structured-output decisions or in a decider agent. Viable, but a larger
rebuild than B, and B does not foreclose C later.

### Option A continued — real-world feedback on agent teams (web research, 2026-08-02)

Full sourced report retained in the session transcript; distilled here. Feature age:
launched v2.1.32 (2026-02-05), ~6 months experimental, actively maintained (fixes as
recent as v2.1.212), **no GA or deprecation signal either way**. Direction of travel:
v2.1.178 merged teams into named background subagents — convergence with the subagent
primitive, not divergence.

- **The community split is exactly along this card's axis.** Teams earn their cost on
  research, parallel review with distinct lenses, competing-hypothesis debugging, and
  multi-repo work. **Autonomous spec→code→qa→review pipelines are the most frequently
  reported failure.** The canonical cautionary tale (r/ClaudeCode, 2026-04, "Does anyone
  use agent teams successfully?"): an overnight Sonnet-workers + Opus-review + 3-strikes
  pipeline on a large refactor — *"Spec wasn't followed, tests made up to make it look
  like it was… Absolute carnage. Just slop."* The top-voted diagnosis: same-model-class
  review shares the worker's blind spots; mechanical gates (real test runs, hooks that
  block) and cross-model review are what actually hold.
- **The idle-notification economics are quantified and match findings 3/10.**
  [anthropics/claude-code#47930](https://github.com/anthropics/claude-code/issues/47930)
  (open since 2026-04-14, `area:cost`): an instrumented 8-teammate session burned
  **13–22% of lead input tokens** on no-op idle/echo acknowledgement turns, a ~3–4×
  lead-turn inflation vs plain background subagents for the same artifacts. The most-
  cited skeptic thread names the same thing: *"Idle notifications overwhelm the team
  leader's context window quickly."*
- **Message delivery is the dominant bug family**, and reports keep being closed
  *not_planned* while equivalents reappear months later: turn-boundary-only delivery and
  its stale-message feedback loops (#39699, #50779 — the same deferred-delivery behavior
  probe finding 9 measured), undelivered message bodies (#70087, open), duplicate idle
  floods (#74112, open), Monitor/background events never waking an idle teammate
  (#77300, open).
- **Definition-fidelity bugs directly hit a plugin-role pipeline**: `tools:` allowlist
  silently dropped for in-process teammates (#81852, open) yet over-enforced for
  separate-process ones to the point of muting `SendMessage` (#81185, open); `effort`
  frontmatter ignored (#80569, open); plugin-namespaced `subagent_type` silently ignored
  when `name` is passed (#81746, open); `skills`/`mcpServers` frontmatter officially not
  applied to teammates. Anything this repo's frontmatter carries would need per-field
  verification as a teammate.
- **Cost, official**: *"approximately 7x more tokens than standard sessions when
  teammates run in plan mode"* — the qualifier is usually dropped when quoted, but the
  direction is confirmed by every source.
- **The strongest pro-teams datapoint is narrow**: a 2026-07-31 head-to-head (same five
  roles, same app, relay vs parallel subagents vs teams) found the one capability only
  teams had was *autonomous remediation routing* — and still concluded *"round three
  shipped the weakest authentication design of the three… a team that coordinates well
  is not the same thing as a team that builds well."*
- Recurring practitioner endpoint after months of use: *"pretty much 100% sub agents
  now"*; *"No supervisor agent… simpler always wins."*

### Option B continued — real-world evidence for the main-session flat pipeline (web research, 2026-08-02)

Second research pass, targeted at the exact option-B shape: skill/command-triggered
orchestrator in the main session, flat sequential leaf workers with quality gates.
Full sourced report in the session transcript; distilled:

- **This shape is the mid-2026 community consensus**, not an invention of this repo.
  Closest public implementation: obra/superpowers' `subagent-driven-development` skill —
  main session dispatches a fresh implementer per task, a two-stage review gate (spec
  compliance + code quality) per task, scoped re-reviews per fix round, and a final
  whole-branch review; strictly sequential ("never dispatch multiple implementation
  subagents in parallel"). PM-flavored variants: ccpm ("your main conversation becomes
  the conductor"), get-shit-done (discuss→research→plan→execute→verify with fresh-context
  leaf workers). External swarm platforms (claude-flow) are widely viewed as
  token-burners people bounce off, back to plain subagents.
- **It is also the officially recommended shape.** The sub-agents doc blesses sequential
  chaining from the main session; best-practices has a dedicated "adversarial review
  step" section (fresh-context reviewer subagent, findings routed back to the
  implementing session); the agent-teams doc itself says *"for sequential tasks…
  a single session or subagents are more effective"* than teams. Nesting is positioned
  only for a delegated task that itself splits into parallel subtasks.
- **Resume is first-class from the main session** (officially documented): resumed
  subagents retain full history via `SendMessage`, transcripts persist under the session
  directory. The community fix-loop convention worth adopting: **resume the implementer
  for rounds 1–3, then fresh dispatch on a stronger model for rounds 4–5, hard cap, then
  adjudicate** — matches this repo's existing 3× rule with an escalation refinement.
- **Every mature implementation converged on the same four mitigations**, which are
  design requirements for the lead skill:
  1. **File-based handoffs** — the orchestrator passes paths, never content; workers
     write reports to disk and return thin markers. ("The #1 cause of context explosion"
     is worker output flooding the orchestrator; a real dispatch measured 42k chars of
     which 99% was pasted history.)
  2. **A durable state ledger** on disk — compaction *will* eat orchestration memory
     mid-pipeline; the observed worst failure is re-dispatching entire completed task
     sequences. After compaction, trust the ledger and `git log` over recollection.
  3. **Capped resume-then-escalate fix loops** (above).
  4. **Worktree isolation per story** — already this repo's model; the official
     per-subagent `isolation: worktree` (v2.1.203+) and worktree docs support it.
- **Known criticisms of the shape** (to design around, none architectural): subagent
  observability ("you just get a summary" — mitigated by report files + persisted
  transcripts), reviewer over-firing at gates (official guidance: flag only gaps
  affecting correctness or stated requirements), plan staleness over a long pipeline,
  and the human review becoming the bottleneck.
- Relevant knobs recorded for the build: `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH=1` can
  enforce flatness mechanically; a 200-subagents-per-session cap exists (reset by
  `/clear`) — a real ceiling for very long review loops.
- Supporting datapoint for gates as *independent contexts*: a same-context verifier
  passed a phase 8/8 while an adversarial fresh-context reviewer immediately found an
  auth bypass (get-shit-done incident). This repo's fresh-auditor rule is the same
  principle, validated in the wild.

### The nested orchestrator in the wild (web research, 2026-08-02)

Third research pass: does anyone run this repo's *current* shape — an orchestrator that
is itself a subagent, collecting its own children's reports? Full sourced report in the
session transcript; distilled:

- **Nesting is young and its contract is narrower than this pipeline assumes.** Native
  nested subagents only landed v2.1.172 (2026-06-10); the depth default churned 5→1→3
  across three July releases. The official docs frame nesting as **fire-and-forget
  summarization** ("only the top-level subagent's summary returns to you") — they never
  promise an intermediate parent gets its children's results back. The sealed-lead
  contract this repo wants was never the documented contract.
- **This card's exact findings are a reproduced, open upstream bug.**
  [anthropics/claude-code#75043](https://github.com/anthropics/claude-code/issues/75043)
  (open, `has repro`) is a controlled experiment of precisely this pattern and matches
  this investigation point for point: children spawned by a subagent detach regardless
  of `run_in_background`; completion notifications route to the **root** session at any
  depth ("15 task-notifications for 13 children, including a depth-2 grandchild, all
  arriving at root"); 4/4 orchestrator runs stalled "waiting for the completion
  notification"; after a `SendMessage` resume, `TaskStop` fails with ownership errors; a
  thread commenter independently confirmed subagents have **no TaskGet/TaskOutput/
  TaskList** ("it genuinely cannot fetch a child's output") — this card's Finding 5,
  found in the wild. The workaround documented there — children write reports to an
  agreed path, parent runs a bounded **foreground** poll, "never end a turn depending on
  a child's completion" — took stalls from 4/4 to 0/4, and is exactly the discipline
  this repo shipped in 1.9.0. Related: [#69212](https://github.com/anthropics/claude-code/issues/69212)
  (results route to root; orphaned grandchildren; 22 transcripts 5 levels deep from one
  dispatch), [#81438](https://github.com/anthropics/claude-code/issues/81438)
  (a SendMessage-resumed nested child's completion routes to the top-level session — the
  literal leak this card documents, filed upstream 2026-07-26),
  [#73829](https://github.com/anthropics/claude-code/issues/73829) (unstoppable orphaned
  nested background agents), [#69824](https://github.com/anthropics/claude-code/issues/69824)
  (duplicate work from un-awaited nested results). Even **Anthropic's own `/code-review`
  fan-out** reproduces the failure (per a #75043 comment).
- **Who succeeds with nesting:** depth-2/3 fan-outs with **foreground, sequential**
  children and file handoffs (one documented end-to-end sealed run: issue→PR at depth 3,
  ~148k tokens / 21 minutes for one small ticket; a Reddit user runs a continuous loop
  at `SPAWN_DEPTH=2` for weeks). Nobody reports a working sealed lead with *resumed*
  or background children — the case this pipeline needs.
- **The escape hatch people actually use is leaving the Agent tool**: Agent SDK
  `query()` loops or driver scripts where the child's result is a function return value,
  so the misrouting class cannot exist; or heavyweight external harnesses (claude-flow)
  most people bounce off. Other frameworks either design the problem away (OpenAI
  agents-as-tools: synchronous by construction; LangGraph: explicit shared state) or
  have their own milder version (CrewAI hierarchical manager flakiness). Research
  datapoint: middle managers amplify error ~4.4× even when routing works — "the
  intermediate manager loses fidelity" is universal; "the intermediate manager never
  receives the result" is the Claude-Code-specific form.
- **Consequence for this card:** the leak is not a misconfiguration of the pipeline and
  not fixable by agent prose — it is an open harness defect (filed, reproduced,
  unresolved) in a feature whose documented contract never covered this topology. The
  `docs/issues/` note this card requires should cite #75043, #81438, and #69212 as the
  upstream trail and "fixed upstream or topology changed" as what unblocks it.

### Status

Investigation and options analysis complete 2026-08-02. Verdicts:

- **Option A (agent teams rebuild): not viable now.** Teams structurally force the
  orchestrator into the main session anyway (fixed lead, no nested teams), so they are
  not an alternative topology to B — only an alternative *mechanism* for it, and that
  mechanism is experimental, quantifiably lossy for hub-and-spoke sequential pipelines
  (idle-notification burn, turn-boundary delivery, definition-fidelity bugs), carries no
  GA signal at 6 months, and its documented sweet spots are the things this pipeline
  deliberately does not do (peer debate, self-claimed parallel work). Community evidence
  is one-sided against exactly this use case.
- **Option B (lead as a main-session skill, flat dispatches): validated and
  recommended.** All four workers are proven leaves; every mechanism the lead contract
  needs is GA and works from main (synchronous fresh dispatch, `TaskOutput`,
  notification delivery to the orchestrator); the analyst seam is untouched; the
  `lead.md:28` defect resolves itself. Costs are known and acceptable: the session runs
  one story at a time (parallel stories = parallel sessions over the existing per-story
  worktrees), and the main context hosts the pipeline traffic it previously delegated.
- **Option C (dynamic workflows)** remains the eventual sealed-unit shape; B does not
  foreclose it and is the sensible stepping stone.

Next step when this card is built: rewrite the acceptance criteria around option B
(the current ones assume the nested topology), convert `lead.md` into a skill the main
session runs, keep the worker definitions as-is minus child-side hygiene (forbid
inventing `to: "main"`, which still matters for the analyst/researcher depth-2 trees),
and record the harness-limited residue (nested notification routing, teams gaps) in
`docs/issues/` per the card's own rule.

