# ca77y-agentic

Personal agentic toolkit for **Claude Code**. It bundles an idea-to-shipped
development pipeline **and** a research-library crew into a single plugin — all
agents run natively as Claude Code subagents. There is no second harness.

## Overview

`ca77y-agentic` turns a raw idea into a shipped pull request through a chain of
specialized agents, each owning one stage and handing off to the next. The whole
flow lives **inside the repository you run it on** — there is no external tracker.
Stories, specs, and research are plain Markdown in an Obsidian vault, so the board
and the knowledge base are versioned alongside the code.

The toolkit is **one plugin**, `ca77y-engineering`, holding two rosters and one skill:

- The **pipeline** — `researcher → analyst → lead → writer → coder → writer`, with
  `qa` (validation plus the local code review) and the `auditor` gating native to
  Claude, and the independent code review running on the opened PR. The `lead` is a
  **skill run in the main session** (`/ca77y-engineering:lead <task>`), not a
  subagent; every other pipeline role is a subagent it dispatches directly, flat.
- The **library crew** — `librarian`, `scribe`, `clerk` — that maintains the
  project's Markdown research library. The crew runs as native Claude subagents,
  dispatched directly by the agents that need library work.

Every check runs **natively in Claude** — the local code review (`qa`), readiness and
acceptance audits (`auditor`), and library health (`clerk`), plus the independent code
review on the PR (the Claude GitHub review — Claude Code in CI). No external CLI
dispatcher.

**One task in, one PR out.** The `lead` takes a single task — a prompt, optionally
referencing a story card — and ships it. There is no splitting into units, no
per-unit worktrees, and nothing to merge.

The end-to-end flow:

```
 idea / topic                                                       shipped PR
      │                                                                  ▲
      ▼                                                                  │
┌────────────┐   wiki   ┌──────────┐  story   ┌────────────┐  task  ┌──────────┐
│ researcher │ ───────▶ │ analyst  │ ───────▶ │ lead skill │ ─────▶ │  writer  │ spec
└────────────┘  pages   └──────────┘  cards   │ (the main  │        │  coder   │ build
      │                      │                │  session)  │        │    qa    │ test+review
      │ library              │ fit gate       └────────────┘        │  auditor │ accept
      ▼                      ▼                      │               │  writer  │ docs
   ┌───────────┐        human                       │               └──────────┘
   │ librarian │        approval                    │
   │ scribe    │        gate                        │   commits · pushes · opens the PR
   │ clerk     │                                    └──▶ then hands the PR off to you
   └───────────┘
```

Two **human gates** punctuate the flow: you approve the analyst's stories before
anything is built, and you explicitly invoke the `lead` skill
(`/ca77y-engineering:lead <task>`) to build one. **The board is
yours** — the `lead` only moves the story it is executing to **In Progress** when it
starts and to **In Review** when its PR opens, so every other transition, **Done**
included, is a manual step. When speccing settles a decision that
contradicts what a card records about its relationship to another — even the card the
work came from — the `writer` surfaces it as a **board follow-up** (which card, which
sentence, and what it should now say) and the `lead` relays it to you in its final report
and on the PR, so you can correct a stale card yourself; the pipeline still never edits
the board for you.

## Runs entirely in Claude Code

These tools run as **Claude Code** ([code.claude.com](https://code.claude.com))
subagents. Everything the pipeline needs — research, code review, readiness
audits, and the research library — is handled by agents in this one plugin,
using the tools and models available in Claude Code. No external CLI, no second
harness, no dispatcher bridge.

## Requires the target repo to be an Obsidian vault

The pipeline does **not** use an external tracker. Stories, specs, and the research
library are plain Markdown **inside the repo you run the pipeline on**, and that repo
must be an **Obsidian vault** (a committed `.obsidian/` at its root) with the community
plugins below installed and vendored. The board cards, Templater scaffolds, and library
navigation depend on them — without the vault and these plugins, the `analyst`, the
`lead`, and the library crew have nothing to read or write.

| Plugin | Used for | |
| --- | --- | --- |
| **Tasks** (`obsidian-tasks-plugin`) | the card checkbox + emoji format (`#type`, `🆔`, `⛔`, priority) | required |
| **Task Board** (`task-board`) | the status-based kanban board built from `docs/tasks/*.md` cards | required |
| **Templater** (`templater-obsidian`) | the story / task-card / spec scaffolds under `docs/_templates/` | required |
| **Dataview** (`dataview`) | index/query pages across docs and the library | recommended |
| **Breadcrumbs** (`breadcrumbs`) | `up`/`related` wikilink navigation the library `clerk` audits | recommended |
| **Excalidraw** (`obsidian-excalidraw-plugin`) | design/flow diagrams and analyst visual companions | recommended |

The expected vault layout in the target repo: `docs/tasks/` (story cards),
`docs/specs/` (in-flight specs), `docs/features|flows|designs/` (durable docs),
`library/` (the research wiki), and `docs/_templates/` (Templater scaffolds).
The reference Nextflick vault is the canonical example of this layout. The agents
discover these locations from the project's own context — they do not hardcode paths.

## Install

The whole plugin goes in Claude Code.

### Claude Code — `ca77y-engineering`

```bash
claude plugin marketplace add ca77y/agents
claude plugin install ca77y-engineering@ca77y-agentic
```

## The pipeline at a glance

`researcher → analyst → lead → writer → coder → writer`, with `qa` (validation plus the
local code review) and the `auditor` gating natively in Claude, and the independent code
review on the opened PR. The `lead` is a skill the main session runs; everything else is
a subagent. The library crew — `librarian`, `scribe`,
`clerk` — runs as native subagents too, dispatched directly by whoever needs the
library work.

| Stage | Agent | In | Out |
| --- | --- | --- | --- |
| Research | `researcher` | a topic | a cited wiki entry + raw sources in the library |
| Analysis | `analyst` | wiki pages + your input | board-ready **story cards** (fit-proven) |
| Orchestration | `lead` (skill, main session) | one task (a prompt, maybe naming a card) | a single open PR, gated and handed off for review |
| Spec | `writer` | the task | a validated spec in the specs area |
| Build | `coder` | the validated spec | the finished work in the story worktree |
| Validation & review | `qa` | the work in progress | pass/fail + filled test gaps + code-review findings |
| Readiness & acceptance | `auditor` | the spec, the built work vs its criteria, or a story card | ready / not-ready verdict |
| Docs | `writer` | the finished task | durable docs; spec converted & removed |
| Library lookup | `librarian` | a research question | cited synthesis from the Markdown library |
| Library write | `scribe` | raw notes / a synthesis target | wiki pages + index/taxonomy/log updates |
| Library audit | `clerk` | the library vault | health findings (links, citations, taxonomy) |

---

## The agents in detail

### researcher — deep-dive research that grows the library

Takes a research topic and runs an agent-steered deep dive, ending in durable
library knowledge — not tickets or code.

1. **Frames** the topic and decides if it's simple or needs subquestions.
2. **Searches the library first** (dispatching `librarian`) to establish a
   baseline and let gaps steer the web dive.
3. **Decomposes** complex topics into subquestions, dispatching **one child
   `researcher` per subquestion** (sequential fallback if nesting is unavailable).
4. **Runs the deep dive**: spawns explore subagents, follows leads recursively,
   prefers primary sources, and keeps going until leads stop producing new signal.
5. **Persists** anything of durable value as raw source notes (via the `scribe`),
   eagerly and in parallel-safe distinct files.
6. **Synthesizes** one new/updated wiki entry — *parent only*, serialized — citing
   the raw notes, and updates the index/taxonomy/log.
7. **Verifies library health** (`clerk` audit) and fixes issues before reporting.

Output: a cited synthesis, the new wiki entry + raw-source paths, contradictions and
uncertainty, and the audit result. **Does not** write cards, specs, or code.

### analyst — turns research into fit-proven stories

Takes one or more wiki pages plus your input and produces **board-ready story
cards**. Its defining job is **fit**: proving each story belongs in the product
before recording it.

The **fit & conflict gate** runs on every candidate story across six dimensions,
each with a *fits / conflicts / unknown* verdict backed by concrete evidence:

1. **Product vision & roadmap** — does it advance the stated direction?
2. **Design & UX** — does it conform to the design system and existing flows?
3. **Existing features & mechanics** — does it contradict or silently change anything?
4. **Duplication** — is this already delivered, in flight, or carded?
5. **Rules & conventions** — does it respect domain boundaries, architecture, naming?
6. **Data & contract impact** — does it touch shared schemas/contracts/migrations?

A story with an unresolved conflict or an unaddressed unknown is **never recorded as
ready**. After shaping, the native `auditor` gate critiques the cards. Cards land at
`[ ]` Todo as proposals; nothing executes until you approve and invoke the `lead`.
**Does not** write specs, code, or tests.

### lead — the skill that takes one task to one reviewed PR

The `lead` is a **skill, not a subagent**: invoking `/ca77y-engineering:lead <task>`
makes the **main session itself the orchestrator**, dispatching the workers flat —
every pipeline agent is a leaf directly below it. It owns the path from a task to a
single open PR, and writes neither code nor specs — it dispatches, gates,
commits, and ships. Invoking the `lead` is explicit permission to branch, worktree,
commit, push, and open the PR. (Orchestration runs on the session's model; the
workers keep the models pinned in their own frontmatter.)

Its input is a **prompt**. If that prompt references a story card, the lead reads the
card and what it links before reasoning about the task. That, plus two status
transitions on that one card — **In Progress** at workspace creation, **In Review**
once the PR is open, written in the repository root checkout and left uncommitted —
is its whole relationship with the board.

1. **Read the task** — the prompt, the referenced card if any, the docs it touches,
   and the relevant code.
2. **Create the workspace** — one story branch in **one worktree**; the repo root
   stays on its base branch. Creating it includes **provisioning its dependencies**,
   before any agent is dispatched into it: wherever the project's dependency layout
   allows, by inheriting the main checkout's already-resolved state rather than
   re-deriving it with a fresh install — a re-resolving install can produce a different
   layout from the same lockfile and break tests the task never touched — otherwise by
   running the project's own install/bootstrap step. The lead then **records the
   provisioning status**, including *not provisioned, with the reason*, and every
   dispatch into the worktree names it, and **moves the referenced card to In
   Progress** in the root checkout. Everything else happens in that worktree.
3. **Spec** — dispatches the `writer` to author the spec, then the `auditor` to gate
   it; routes any findings back to the writer to revise, re-audits fresh, and once
   ready **commits the spec** (commit 1).
4. **Build** — dispatches **one** `coder` with the spec's path, and **records its
   agentId**. The coder implements and reports; the lead trusts that reported state.
5. **Validate & review** — **commits the coder's build**, then dispatches `qa` to
   validate it and review the diff; routes its findings back to the same coder by
   agentId — resuming it and continuing on its completion notification (see
   **Dispatch and resume** below) — **commits that round's work** when the coder reports back, and
   re-dispatches a **fresh** `qa` with the commit references to diff against, capped
   at 3 rounds.
6. **Acceptance gate** — the `auditor` verifies the built result meets the task's
   acceptance criteria: the **card's** enumerated criteria when a card was named,
   the **spec's** requirements when not. Anything the qa loop left uncommitted — the
   final clean round's added tests included — is **committed before the first
   acceptance dispatch**, so it does not fuse into the first acceptance fix. Findings
   route back to the same coder by agentId; each round's fix is likewise **committed
   before the fresh re-audit**, which is handed the references to diff against. Capped
   at 3 rounds. Docs do not start while a criterion is unmet.
7. **Docs** — a `writer` pass to update docs and convert the shipped spec; the lead
   trusts it, no docs gate.
8. **Ship** — **commits whatever is still uncommitted** (the ship commit), pushes, and
   opens **one PR** —
   carrying any production hazards the coder reported into its description, and relaying
   any board follow-ups the writer surfaced while speccing in both its final report and
   the PR description, so a card a decision made stale is visible without opening the spec.
   Then **moves the card to In Review**.
   The run **ends here** — the lead does not wait for the review (below).

**Dispatch and resume.** A *fresh* dispatch is synchronous (`run_in_background: false`)
and its tool result **is** the worker's report. Most rounds are not fresh dispatches,
though: the lead **resumes** the writer across spec revisions and the same coder across
qa and acceptance rounds, because a resume is the only way to preserve their
context. A resume is a `SendMessage` by agentId, which hands back only a delivery
acknowledgement — the resumed worker's report arrives as its **completion notification**,
delivered to the main session. Because the orchestrator *is* the main session, that
delivery lands exactly where it is needed: the lead records what is awaited in its
ledger, **ends its turn**, and the notification wakes it carrying the report. When a
wake brings no usable report, it checks ground truth before re-dispatching —
`TaskList`/`TaskOutput` on the recorded agentId, then `git -C <worktree> status --short`
and the files the worker was to produce: work on disk means collect, not replace (a
stalled agent and a slow-but-working one look identical, and re-dispatching the second
puts two agents on the same files), and anything genuinely lost is escalated rather
than silently re-dispatched. Those two waits — a synchronous dispatch and a
resumed worker's notification — are the only ones the lead has; it never waits on
anything external.

**Context discipline.** Workers are handed **paths, not content** — the spec path, the
worktree path, the provisioning status, and commit refs; a round's findings that exceed
a short summary go to `.worktrees/<branch>.findings-round-<N>.md`, with the resume
message carrying that path. The lead also maintains a durable **ledger** at
`.worktrees/<branch>.ledger.md` — task, step, agentIds, round counters, commits, what
is awaited — updated before every dispatch and turn end, so after a compaction or
session restart the ledger plus `git log`, not recollection, say where the pipeline
stands. Both files live next to the worktree, outside it and gitignored, so no commit
step can sweep them into a story commit.

**The commit model.** The story worktree is the only workspace and the lead is the
only one that commits. It commits the spec; then one commit per **pre-ship round**
— the coder's initial build, then each `qa` and acceptance-gate fix round; then the
**ship commit** with whatever is still uncommitted at PR time (mainly docs and the
spec's removal); then one per PR-review fix round. The count varies with how many
rounds ran. The pre-ship round commits exist because every `qa` and acceptance
dispatch is a **fresh** context: they give it two commit references to diff round N
against round N−1, instead of one undifferentiated tree in which the build and every
round are folded together. They stay local until the PR opens. Committing the spec
separately is what keeps it in history at all, since the docs pass later converts and
deletes it.

**The PR review, and the hand-off.** The lead does **not** wait for the review. It
opens the PR, moves the card to In Review, reports the PR as open and not yet reviewed,
and stops — no monitor, no polling script, no baseline diffing. Waiting on an external
reviewer means polling an outside system on an unbounded schedule from a session with
nothing else to do; you drive the review from the PR instead. An unreviewed PR that is
*reported* as unreviewed is a correct outcome.

The review's findings come back by **invoking the lead again** with them (or with the
PR). That fix run reuses the existing branch, worktree, and PR — never a second one —
recovering state from the ledger and `git log`, since the previous run's agentIds died
with it and every worker is a fresh dispatch. It routes each finding to its owner (code
→ `coder`, docs → `writer`, approach-invalidating → a revised spec), re-runs `qa` over
any code change, commits and pushes the round, updates the PR description with anything
new it must carry, re-fires the review with a `@review` comment — and hands off again.
The 3× rule applies within each run.

**A flat topology, and the lead never does the work.** The lead skill is the only
orchestrator, and it runs in the main session: it dispatches `writer`, `coder`, `qa`,
and `auditor` directly, and no pipeline agent dispatches or resumes another — every
worker is a leaf at depth 1. Each leaf does its one job and returns, and the lead
**trusts that result**: it never writes, tests, reviews, or judges the work itself, and
if a dispatch fails it retries or escalates rather than stepping in. The flatness is
deliberate: the harness does not support a nested orchestrator — a subagent's children
detach, their completion notifications route to the root session, and a resumed child's
report never reaches a subagent parent (see
[`docs/issues/nested-subagent-result-routing.md`](docs/issues/nested-subagent-result-routing.md)).
Running the orchestrator in the main session puts it exactly where the harness
delivers. The heavy fan-out **code review runs on the PR** (the Claude GitHub review),
outside the dispatch tree entirely.

### coder — builds the whole task

Takes the validated spec and the story worktree and delivers the task end to end.
**It never commits** — its work stays in the tree for the lead, which commits the
build and each fix round itself. It is **not its own reviewer** — `qa` reviews its
work in a separate context — and the lead owns every gate over it.

1. **Prepare** the worktree; confirm the spec; isolate pre-existing dirty changes.
2. **Implement** with minimal scoped diffs + one scenario test per spec scenario,
   consulting current third-party docs via context7 when external behavior matters.
3. **Report up** — no commit, no push, no PR. The lead then runs `qa` over the build.

The lead **resumes the same coder** for qa, acceptance-gate, and PR-review findings. All
are handled the same way: apply the whole set in one go and report back to the lead, which
re-runs `qa`. A finding is rejected only with a traced input, never a restated conclusion;
a finding that genuinely conflicts with the spec is escalated as a mismatch, never rejected.

When a scenario workaround is forced by a real production dependency misbehaving — a
**production hazard**, as opposed to a mere **test-harness inconvenience** the fixture
setup made awkward with no effect on the shipped system — the coder raises it as an
explicit finding to the lead (naming the dependency and its version, the observed
behaviour, and the spec scenario or acceptance step it affects), on top of any code/test
comment, even when its own workaround fully resolved the problem. That obligation holds for
**every** report it sends — the initial build and each findings round — so a production
risk reaches the human through the PR rather than only through a comment on a test file.

### qa — validates the work, fills test gaps, and reviews the diff

Dispatched by the `lead` after the coder builds, and again after each fix round — each
fresh dispatch handed the round's commit references (the state the previous round
reviewed, and the new round commit) so it can diff round N against round N−1. Runs the
project's validation commands, compares the spec's scenarios against existing tests and
adds the missing coverage (e2e, frontend, integration, edge cases), then re-runs; and
**reviews the changed code** against the spec and the project's conventions for defects
and quality, since it is a separate context from the one that wrote it. Reports pass/fail
with evidence, the tests it added, and its review findings — the lead routes them to the
`coder`. **Does not** fix feature code or weaken a failing test to make the suite pass.
The heavy, independent code review runs again on the **PR** — the Claude GitHub review.

### auditor — independent readiness & acceptance gate (native, in Claude)

The gate for everything that isn't code quality. The `lead` uses it as the
**spec-readiness gate** before the build and the **acceptance gate** after it, proving
the finished work meets the task's acceptance criteria criterion by criterion; the
`analyst` uses it as a story advisor gate on candidate cards. (The `writer`'s docs are
trusted with no gate; its spec is gated.) Reads the artifact plus enough context to judge it on its own terms and
returns a **ready / not-ready** verdict. **Report-only** — the caller owns applying
fixes. Does not review code quality.

Where a criterion rests on a claim about how a **third-party or vendored dependency**
behaves, it verifies at the **mechanism, not the symptom**: it opens the cited source at
the cited version and confirms the behavior is what the spec says, because a scenario
passing on its observable outcome is not on its own evidence for the mechanism — the same
outcome can come from an unrelated cause. A claim the spec marks as an *assumption* is
reported as unverified rather than treated as established, and so is one whose cited
source it cannot read (package absent, or the worktree's provisioning status absent or
negative) — it reports that instead of provisioning anything to check. At the readiness
gate, before anything is built, the same concern shows up as two things it looks for in
the spec: a dependency claim carrying neither a citation nor an assumption marking, and a
scenario that could pass with the claimed mechanism absent without naming the alternative
cause or saying where the mechanism is really covered.

### writer — the task's spec, then its docs

Runs in two modes the lead dispatches separately, and **never commits**.

- **Spec pass**, before any code exists: authors the task's spec (Goal → Design →
  Requirements with WHEN/THEN scenarios → Tasks) against the acceptance criteria the
  work will be judged on, and hands back the path; the lead has the `auditor` gate it
  before the build and routes any findings back to the writer to revise. Its authoring
  rules make a spec's claims about the outside world checkable: a claim about how a
  **third-party or vendored dependency** behaves carries the package at the
  **resolved/installed** version plus a file-and-line into that package's own source —
  one citation per distinct mechanism claimed, since a compound sentence can be half
  true — or else it is written as an explicitly marked **assumption** saying why it
  could not be cited and what would settle it, so the round that verifies it knows it
  was never checked. A scenario whose observable outcome could hold with the claimed
  mechanism absent gets that alternative cause named while the spec is written, so a
  green test is never mistaken for a confirmed claim. It also
  returns any **board follow-ups** — when a decision the spec settles contradicts
  relationship or dependency prose recorded on any card (including the card the work
  came from), it names which card, which sentence, and what it should now say, for you
  to fix. It never edits the board.
- **Docs pass**, after the build is accepted: folds the shipped spec's durable
  content into its permanent home (features / flows / designs), reconciling with what
  exists, and **removes the spec** (specs are not archived).

The writer just authors and returns; its spec is gated by the lead's `auditor`, its
docs trusted. **Does not** implement code, run tests, or commit/branch/PR (the lead does).

### librarian — cited answers from the library

Answers research and product-context questions from the project's Markdown research
library. Reads synthesized wiki first, verifies important claims against raw notes,
and returns cited synthesis. Read-and-report by default — it does not edit library
files unless you explicitly ask. Discovers the library layout from `library/README.md`
and the `_meta/` files; never inspects secrets.

### scribe — ingests raw notes into the wiki

Ingests raw Markdown research notes into the synthesized wiki without destroying
provenance. Preserves raw notes, extracts durable concepts/claims, writes or updates
the matching wiki page, and updates links, taxonomy, the index, and the maintenance
log. Follows the Obsidian authoring conventions in `library/_meta/librarian.md` for
every file it touches — resolving each wikilink target against a real filename or a
declared alias (never a page's `title:`) and placing `^block-id` anchors only in
Obsidian's valid forms. Before reporting a pass done it verifies its own claims
mechanically rather than from recall: it sweeps the whole batch it touched for a
defect class before reporting that class handled, states the class and files-swept
count in the log, grep-verifies every additive claim ("tag added", "block ID added")
against the target file, and parses any frontmatter it wrote or edited with a real
YAML loader — a parse failure blocks "done".

### clerk — audits library health

Audits the project's Markdown research library for duplicate wiki pages, stale index
entries, broken links, uncited claims, missing taxonomy tags, unsynthesized raw notes,
and convention violations. Its broken-link audit catches wikilinks that resolve only
against another page's `title:`; it flags `^block-id` anchors that are textually
present but invalidly placed (so a citation to them will not resolve); and it
reconciles completion claims in the maintenance log against the files they name,
reporting every instance where a claimed string is absent. Read-only by default —
reports findings; applies fixes only when you explicitly ask. Audits against the
Obsidian conventions in `library/_meta/librarian.md`.

---

## Conventions that tie it together

**One story = one card = one file = one PR.** There is no epic/story/bug hierarchy
and no sub-task decomposition. Bigger work becomes a bigger single story (and a bigger
single PR); genuinely separate work becomes **multiple linked stories** sequenced with
dependencies — never a stack of PRs.

**Story cards** (`type: story` frontmatter) are Obsidian Tasks-format checkboxes:

- **Status** `[ ]` Todo · `[/]` In Progress · `[?]` In Review ·
  `[x]` Done · `[-]` Cancelled. The card symbol is the source of truth. The `lead`
  moves the story it is executing to **In Progress** when it starts and to
  **In Review** once its PR is open — edited in the repository root checkout, not
  the story worktree, and left uncommitted, so the board is current on your disk
  before the merge. Every other transition — **Done** above all — is **yours**, and
  no other agent writes card status. The `lead` starts an invoked story from
  whatever state it's in; invoking it is the go-ahead.
- **Type** (exactly one): `#feature` · `#improvement` · `#bug` (implementation-ready)
  · `#research` · `#marketing` · `#support` (must be refined first).
- **Priority** `🔺` highest · `⏫` high · `🔼` medium · `🔽` low.
- **Dependencies** `🆔 <slug>` identifies a story; dependents declare `⛔ <slug>`.
  The slug is reused for the file name, branch, and spec.

**Specs** live in the specs area only while in flight. They follow Goal → Design →
Requirements (WHEN/THEN scenarios) → Tasks, are written just-in-time by the `writer`,
and are **converted into durable docs and removed** by the `writer` when the task
ships — they are never archived. The spec gets its own commit precisely so it
survives in history after that removal.

**Every check runs in an independent context.** Code review goes to `qa` locally — a
separate context from the `coder` — and to the PR review on the opened PR, readiness and
acceptance audits to the native `auditor`, and library health to the `clerk`.
Self-checking is forbidden across the pipeline; the agent that produces an artifact never
signs off on it — the review always runs as a separate subagent.

**Verification is layered**: the `writer` authors the spec → the `auditor` gates it
ready-to-build → `coder` writes per-scenario tests → `qa` fills coverage gaps and reviews
the diff → the `auditor` gates the result against its acceptance criteria → the PR opens →
the Claude GitHub review reviews it, and its findings come back through another `lead` run.
The two `auditor` gates divide a spec's **dependency claims** between them: at readiness
it checks each such claim is either cited or explicitly marked an assumption, and that a
scenario which could pass with the claimed mechanism absent names that alternative cause
or says where the mechanism is really covered; at acceptance — once there is built work to
judge — it opens the cited source at the cited version and confirms the mechanism itself,
since a passing scenario's observable outcome can hold for a reason unrelated to the claim
it was written for.

**Isolation**: the task builds in one worktree/branch under the repo's worktree
directory, and the repo root stays on its base branch. That worktree is **provisioned
with the project's dependencies when the lead creates it**, and every agent is handed
the worktree path **together with the resulting provisioning status** — so it knows
before it runs anything whether a command's result is trustworthy. Handed an absent or
negative status, an agent reports the gap instead of concluding from the output, and
never provisions the worktree itself (a fresh re-resolving install is what breaks
untouched tests). The root checkout is **readable** for dependency and vendor sources —
resolved dependency trees, installed type definitions, vendored packages — and is
**never written**; and no agent resolves a project CLI through a bare `npx`-style
fetch-and-run, which silently runs a toolchain that is not the project's and fails with
errors that read like a real defect in the file under review. Only the lead commits, and
only in that worktree: the spec, one per pre-ship round (the build, then each qa and
acceptance fix round), the ship commit, then one per PR-review fix round — nothing is
pushed until the PR opens. No secrets are ever inspected, output, or committed.

**The pipeline improves itself.** Every agent — orchestrators and sub-agents alike —
can log feedback about the *pipeline itself* (the flow, an agent's instructions, or a
skill) to a single `AGENTS_IMPROVEMENTS.md` at the root of the project's documentation
area (resolved from project context, never a hardcoded path; created on first use). It
is opt-in, not a required step: an agent appends a note **only** when it has a concrete
improvement to propose, and only after checking the file so the same point is never
duplicated — no friction means no entry. This is for *how the agents work*, never the
product feature being built; you harvest the accumulated notes back into this toolkit.

## Layout

```
ca77y-agentic/
├── .claude-plugin/
│   └── marketplace.json                  # lists the plugin
└── plugins/
    └── ca77y-engineering/
        ├── .claude-plugin/plugin.json    # Claude manifest (agents whitelist)
        ├── plugin.json                   # root manifest (mirrors the Claude one)
        ├── skills/
        │   └── lead/SKILL.md             # the lead — the pipeline orchestrator,
        │                                 #   run in the main session
        └── agents/                       # all subagent definitions:
                                          #   analyst, auditor, clerk, coder,
                                          #   librarian, qa, researcher, scribe,
                                          #   writer
```

Each plugin carries two manifests: Claude reads `.claude-plugin/plugin.json`; the root
`plugin.json` mirrors it (kept in sync per the toolkit's version-drift rule). They live
in different locations so neither harness trips over the other.

## How scoping works

Each plugin is its **own root with its own `plugin.json`**. Scoping must live in
`plugin.json` — a marketplace entry's component fields are *not* honored as an
override, so a shared pool with marketplace-level whitelists silently loads
everything. With separate roots:

- **Agents** — each `plugin.json` whitelists its agents. The whitelist *replaces*
  the default `agents/` scan, so only the listed agent files load and any other
  Markdown in the plugin is never picked up as a phantom agent.
