# ca77y-agentic

Personal agentic toolkit for **Claude Code**. It ships an idea-to-shipped
development pipeline **and** a research-library crew as two plugins you can install
together or separately — all agents run natively as Claude Code subagents. There is no
second harness.

## Overview

`ca77y-agentic` turns a raw idea into a shipped pull request through a chain of
specialized agents, each owning one stage and handing off to the next. Specs and
research live **inside the repository you run it on** — plain Markdown in an Obsidian
vault, versioned alongside the code. **The board is whatever you already use**:
Markdown cards in the repo, Linear, Jira, GitHub Issues, or nothing at all. The
pipeline resolves it from the project's own context at the start of every run and
hardcodes none of it — see [Bring your own board](#bring-your-own-board).

The toolkit is **two plugins**, each its own roster:

- **`ca77y-engineering`** — the pipeline `analyst → lead → writer → coder → writer`, with
  `qa` (validation plus the local code review) and the `auditor` gating native to
  Claude, and the independent code review running on the opened PR. The `lead` is a
  **skill run in the main session** (`/ca77y-engineering:lead <task>`), not a
  subagent; every other pipeline role is a subagent it dispatches directly, flat.
  It also carries the **board skill** (`/ca77y-engineering:board`), which resolves *how
  this project tracks work* and hands the pipeline a **board profile** to work from: the
  bindings for reading, searching, creating, and transitioning cards, the card shape and
  status vocabulary, and what the pipeline is permitted to write. The `lead` and the
  `analyst` invoke it before touching a card; you can run it yourself to see what resolves.
- **`ca77y-library`** — the research crew `researcher → librarian · scribe · clerk`
  that grows and maintains the project's Markdown research library: deep dives that
  produce cited wiki entries, cited answers out of the wiki, raw-note ingestion, and
  library health audits.

**The two are independent installs.** `ca77y-library` needs nothing else. The pipeline
runs fine without it — the `analyst` reads library wiki pages directly — and reaches for
`ca77y-library:librarian` and `ca77y-library:clerk` when they are there. Install one, or
both.

Every check runs **natively in Claude** — the local code review (`qa`), readiness and
acceptance audits (`auditor`), and library health (`clerk`), plus the independent code
review on the PR (the Claude GitHub review — Claude Code in CI). No external CLI
dispatcher.

**One task in, one PR out.** The `lead` takes a single task — a prompt, optionally
referencing a story card — and ships it. There is no splitting into units, no
per-unit worktrees, and nothing to merge.

The end-to-end flow:

```
   ca77y-library     │  ca77y-engineering
                     │
 idea / topic        │                                              shipped PR
      │              │                                                   ▲
      ▼              │                                                   │
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

The two plugins meet at the `researcher → analyst` handoff, and the wiki pages in the
repository are the interface — not a call between them. The only live cross-plugin
dispatch is the `analyst` optionally pulling extra context from `librarian`/`clerk`;
without `ca77y-library` installed it reads the wiki pages itself and says so in its
report.

Two **human gates** punctuate the flow: you approve the analyst's stories before
anything is built, and you explicitly invoke the `lead` skill
(`/ca77y-engineering:lead <task>`) to build one. **The gates on your board are
yours** — the `lead` moves the story it is executing to your board's *work-started*
status when it starts and to *awaiting-review* when the PR opens, and never through a
transition your declaration reserves for you (typically *ready to start* and *done*:
the judgements about whether work should begin and whether it is actually finished).
How much else the pipeline may write is **your declaration's call** — it can be limited
to those two transitions, or extended to commenting, attaching the PR, and correcting a
card's own content. When speccing settles a decision that contradicts what a card records
about its relationship to another — even the card the work came from — the `writer`
surfaces it as a **board follow-up**, and *applies* it where you authorised that or
relays it where you did not; the `lead`'s report says which happened for each.

## Runs entirely in Claude Code

These tools run as **Claude Code** ([code.claude.com](https://code.claude.com))
subagents. Everything the pipeline needs — research, code review, readiness
audits, and the research library — is handled by agents in these two plugins,
using the tools and models available in Claude Code. No external CLI, no second
harness, no dispatcher bridge.

## Bring your own board

**Nothing in the pipeline knows what tracks your work.** *Board* and *card* are roles,
not formats: a board can be Markdown files committed in the repo, a hosted tracker
behind an MCP server or a CLI, a documented REST API, or nothing at all. Which one it
is gets **resolved from the project's own context at the start of each run**, by the
`board` skill, and everything downstream works from what it resolves.

The skill hands back a **board profile** — the pipeline's only interface to a tracker:

| Field | What it settles |
| --- | --- |
| **Board & mechanism** | which system, reached through what: a project skill, an MCP server, a CLI, repo files, documented HTTP |
| **Bindings** | the concrete call for each of the five operations — *locate · read · search · create · transition* |
| **Probe** | the read-only call actually run to prove the binding works. A binding no real call returned through is **unresolved**, however plausible it looks |
| **Card shape** | where the scaffold or field set is defined, and which field carries identity, type, priority, dependencies, acceptance criteria |
| **Status** | the board's own vocabulary, with the pipeline's two semantic transitions mapped onto it: *work started* and *awaiting review*, each with the value to expect before writing — plus every transition reserved for you by name, terminal or not |
| **Visibility** | where a write must land to be seen **now** — for a repo-local board, the root checkout left uncommitted; for a hosted one, the bound call |
| **Write authority** | the exhaustive list of operations the pipeline may perform. **Declared by your project; defaults to the two status transitions and nothing else** — grant more (comment, attach the PR, update a card) and the pipeline uses it, applying authorised fixes rather than reporting them |

**Declare your board in an `ISSUE_TRACKING.md`** at the root of your docs area (or the
repo root) — the bindings, the card shape, the statuses, and what the pipeline may write
— **and point at it from your `CLAUDE.md`**:

```markdown
Work tracking — the board, its statuses, and what agents may write to it — is declared in
[`docs/ISSUE_TRACKING.md`](docs/ISSUE_TRACKING.md).
```

That pointer is load-bearing. The skill reads the declaration at the path its **context**
gives it and **never searches for one**: a file nothing points at loads on the run where
something happens to grep for it and vanishes on the next, and the pipeline binds real
calls to what it says. Intermittently visible is worse than absent.

Don't have one? `/ca77y-engineering:board` is dual-purpose: with no declaration in
context it walks you through writing the file, wiring up the pointer, and probing the
result. Invoked *during* a run it never writes anything — it resolves what it can and
puts the recommendation in the report, because a project document that appears
mid-pipeline is a side effect you didn't ask for. And if you already have the file but
it isn't in context, it tells you to add the pointer rather than hunting for it or
writing a second one.

A declaration is not mandatory. With none in context, discovery falls through to the
project's other self-documentation (a `CLAUDE.md` section, a rules page beside the
cards), then what the session can actually reach (MCP servers, CLIs), then repo evidence,
then the shape of the reference you handed it (`PROJ-123` vs a URL vs a slug) — so a run
is never blocked, it just also recommends writing the declaration. A board the
project declares but nothing available can reach resolves as **blocked** and is
reported — never silently swapped for one that happens to be reachable. Two equally
plausible candidates resolve to **none**, for the same reason.

Three shapes it resolves today, none of them privileged:

- **Repo-local Markdown** — cards as files, searched by grep, transitioned by editing
  the card in the root checkout and leaving it uncommitted, so your board is current on
  disk before the branch merges.
- **A hosted tracker over MCP** (Linear, Jira, GitHub Issues) — bindings are tool
  calls, transitions are API writes, and no checkout is involved at all. This is what
  this repo itself uses; its declaration is
  [`docs/ISSUE_TRACKING.md`](docs/ISSUE_TRACKING.md), pointed at from the root
  `CLAUDE.md`.
- **A CLI or documented REST endpoint** — bindings are commands. Credentials come from
  the mechanism's own configured auth; `.env` files are never read.

**No board is a supported answer, not a failure.** The pipeline then runs trackerless:
acceptance criteria come from the spec's requirements and scenarios, there are no
status transitions, and the handoff says so. The `analyst` still shapes and fit-gates
its stories and returns them in its report as the deliverable — a story you can paste
into your own tracker beats a card written somewhere it guessed.

Discovery never invents an endpoint, a project key, a field, a status value, or a card
location, and never writes through a binding that was not probed.

## Requires the target repo to be an Obsidian vault (docs & library)

Specs, durable docs, and the research library are plain Markdown **inside the repo you
run the pipeline on**, and that repo must be an **Obsidian vault** (a committed
`.obsidian/` at its root) with the community plugins below installed and vendored. This
requirement covers the *documentation and library*, not the board — a project using a
hosted tracker needs only the pieces its docs and library actually use.

| Plugin | Used for | |
| --- | --- | --- |
| **Templater** (`templater-obsidian`) | the spec scaffold under `docs/_templates/`, plus the story scaffold when the board is repo-local | required |
| **Tasks** (`obsidian-tasks-plugin`) | the card checkbox + emoji format (`#type`, `🆔`, `⛔`, priority) | required *for a repo-local board* |
| **Task Board** (`task-board`) | the status-based kanban view built from `docs/tasks/*.md` cards | required *for a repo-local board* |
| **Dataview** (`dataview`) | index/query pages across docs and the library | recommended |
| **Breadcrumbs** (`breadcrumbs`) | `up`/`related` wikilink navigation the library `clerk` audits | recommended |
| **Excalidraw** (`obsidian-excalidraw-plugin`) | design/flow diagrams and analyst visual companions | recommended |

The two board plugins are conditional, and **this repo does not vendor them** — its own
board is Linear, so only Templater, Dataview, Breadcrumbs, and Excalidraw are installed
under `.obsidian/`. Add them back only if you keep your cards as Markdown in the repo.

The expected vault layout in the target repo: `docs/specs/` (in-flight specs),
`docs/features|flows|designs/` (durable docs), `library/` (the research wiki),
`docs/_templates/` (Templater scaffolds), and — for a repo-local board — `docs/tasks/`
(story cards). The reference Nextflick vault is the canonical example of this layout.
The agents discover these locations from the project's own context — they do not
hardcode paths.

## Install

Both plugins go in Claude Code, from the same marketplace. Install either on its own,
or both.

```bash
claude plugin marketplace add ca77y/agents
claude plugin install ca77y-engineering@ca77y-agentic   # the pipeline
claude plugin install ca77y-library@ca77y-agentic       # the research library crew
```

Neither requires the other. `ca77y-library` is entirely self-contained.
`ca77y-engineering` uses `ca77y-library:librarian` and `ca77y-library:clerk` when they
resolve and works from the wiki pages directly when they do not — so installing the
pipeline alone costs you the deep-research front end, not a broken pipeline.

## The pipeline at a glance

`researcher → analyst → lead → writer → coder → writer`, with `qa` (validation plus the
local code review) and the `auditor` gating natively in Claude, and the independent code
review on the opened PR. The `lead` is a skill the main session runs; everything else is
a subagent. The first stage — `researcher`, and the `librarian`, `scribe`, `clerk` crew
behind it — is the separate `ca77y-library` plugin; everything from `analyst` onward is
`ca77y-engineering`.

| Stage | Agent | In | Out |
| --- | --- | --- | --- |
| Research ᴸ | `researcher` | a topic | a cited wiki entry + raw sources in the library |
| Analysis | `analyst` | wiki pages + your input | board-ready **story cards** (fit-proven) |
| Board resolution | `board` (skill) | the project's own context | a **board profile**: bindings, card shape, status vocabulary, write authority |
| Orchestration | `lead` (skill, main session) | one task (a prompt, maybe naming a card) | a single open PR, gated and handed off for review |
| Spec | `writer` | the task | a validated spec in the specs area |
| Build | `coder` | the validated spec | the finished work in the story worktree |
| Validation & review | `qa` | the work in progress | pass/fail + filled test gaps + code-review findings |
| Readiness & acceptance | `auditor` | the spec, the built work vs its criteria, or a story card | ready / not-ready verdict |
| Docs | `writer` | the finished task | durable docs; spec converted & removed |
| Library lookup ᴸ | `librarian` | a research question | cited synthesis from the Markdown library |
| Library write ᴸ | `scribe` | raw notes / a synthesis target | wiki pages + index/taxonomy/log updates |
| Library audit ᴸ | `clerk` | the library vault | health findings (links, citations, taxonomy) |

ᴸ ships in the **`ca77y-library`** plugin; every other row is **`ca77y-engineering`**.

---

## The agents in detail

### researcher — deep-dive research that grows the library  ·  `ca77y-library`

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
your board's **initial status** as proposals; nothing executes until you approve and
invoke the `lead`. When no board resolves — or the profile cannot create on it — the
analyst still shapes and gates every story and returns them **in its report** rather
than inventing somewhere to file them. **Does not** write specs, code, or tests.

### lead — the skill that takes one task to one reviewed PR

The `lead` is a **skill, not a subagent**: invoking `/ca77y-engineering:lead <task>`
makes the **main session itself the orchestrator**, dispatching the workers flat —
every pipeline agent is a leaf directly below it. It owns the path from a task to a
single open PR, and writes neither code nor specs — it dispatches, gates,
commits, and ships. Invoking the `lead` is explicit permission to branch, worktree,
commit, push, and open the PR. (Orchestration runs on the session's model; the
workers keep the models pinned in their own frontmatter.)

Its input is a **prompt**. Before anything else it **resolves the board** (the `board`
skill), so that if the prompt references a card it reads that card — and what it links —
through resolved bindings rather than an assumed tracker. That, plus two status
transitions on that one card — *work started* at workspace creation, *awaiting review*
once the PR is open, landed wherever the profile's visibility rule says — is its whole
relationship with the board. It names the profile in every dispatch that touches a card
(`writer`, `auditor`); the `coder` and `qa` get no board access and need none.

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
   dispatch into the worktree names it, and **transitions the referenced card to
   work started**. Everything else happens in that worktree. Where the harness refuses
   file writes until the session has isolated itself — a background job typically is —
   the lead's one compliant move is to enter the worktree it just created with
   `EnterWorktree`'s **`path`** form, never its `name` form: `name` would create a second
   worktree in the harness's own directory and leave this story's branch behind, while
   entering the existing one leaves it exactly where the project puts it, with every
   dispatch still naming its absolute path. A fix run on an open PR (below) takes the same
   step after recovering the worktree.
3. **Spec** — dispatches the `writer` to author the spec, then the `auditor` to gate
   it; routes any findings back to the writer to revise, re-audits fresh, and once
   ready **commits the spec** (commit 1).
4. **Build** — dispatches **one** `coder` with the spec's path, and **records its
   agentId when the dispatch produces one**. The coder implements and reports; the
   lead trusts that reported state.
5. **Validate & review** — **commits the coder's build**, then dispatches `qa` to
   validate it and review the diff; routes its findings back to the same coder —
   resuming it by agentId when one is held, or a fresh dispatch carrying the findings
   when it is not, either way continuing on the report that dispatch delivers (see
   **Dispatch and resume** below) — **commits that round's work** when the coder
   reports back, and re-dispatches a **fresh** `qa` with the commit references to
   diff against, capped at 3 rounds.
6. **Acceptance gate** — the `auditor` verifies the built result meets the task's
   acceptance criteria: the **card's** enumerated criteria when a card was named —
   read off the board itself, never restated into the dispatch prompt, since a
   restated criterion drifts toward what the work already does — or the **spec's**
   requirements when there is no card or no board. Anything the qa loop left uncommitted — the
   final clean round's added tests included — is **committed before the first
   acceptance dispatch**, so it does not fuse into the first acceptance fix. Findings
   route back to the same coder — resumed when its agentId is held, or freshly
   dispatched with the findings when it is not — and each round's fix is likewise
   **committed before the fresh re-audit**, which is handed the references to diff
   against. Capped at 3 rounds. Docs do not start while a criterion is unmet.
7. **Docs** — a `writer` pass to update docs and convert the shipped spec; the lead
   trusts it, no docs gate.
8. **Ship** — **commits whatever is still uncommitted** (the ship commit), pushes, and
   opens **one PR** —
   carrying any production hazards the coder reported into its description, and relaying
   any board follow-ups the writer surfaced while speccing in both its final report and
   the PR description, so a card a decision made stale is visible without opening the spec.
   Then **transitions the card to awaiting review**.
   The run **ends here** — the lead does not wait for the review (below).

**Dispatch and resume.** Each `Agent` dispatch is either synchronous
(`run_in_background: false`), whose tool result **is** the worker's report in the same
turn, or background, which frees the turn and delivers the report later as a completion
notification — and whose spawn result is also what makes that worker resumable. Neither
mode is fixed for any step; the lead weighs the trade-off per dispatch. When a round
needs to carry a worker's context forward — a spec revision, a qa or acceptance fix —
the lead **resumes** it if it holds a resumable agentId for that worker: a resume is a
`SendMessage` by agentId, which hands back only a delivery acknowledgement — the
resumed worker's report arrives as its **completion notification**, delivered to the
main session. Because the orchestrator *is* the main session, that delivery lands
exactly where it is needed: the lead records what is awaited in its ledger, **ends its
turn**, and the notification wakes it carrying the report. A resume is what preserves a
worker's context across rounds — that is its benefit, not the only route: when the lead
holds no resumable agentId for the worker a round needs to reach, it carries the round
forward instead with a fresh dispatch of the same role, given the spec path, the
worktree and its provisioning status, the board profile where needed, the round's
commit references, and the findings. When a wake brings no usable report, the lead
checks ground truth before re-dispatching — `TaskList`/`TaskOutput` on the agentId,
where the dispatch produced one, then `git -C <worktree> status --short` and the files
the worker was to produce: work on disk means collect, not replace (a stalled agent and
a slow-but-working one look identical, and re-dispatching the second puts two agents on
the same files), and anything genuinely lost is escalated rather than silently
re-dispatched. A synchronous dispatch's in-turn result and a background or resumed
worker's notification are the only waits the lead has; it never waits on anything
external.

**Context discipline.** Workers are handed **paths, not content** — the spec path, the
worktree path, the provisioning status, and commit refs; a round's findings that exceed
a short summary go to `.worktrees/<branch>.findings-round-<N>.md`, with the resume
message, or a fresh dispatch's prompt, carrying that path. The lead also maintains a
durable **ledger** at `.worktrees/<branch>.ledger.md` — task, step, agentIds, round
counters, commits, what is awaited — updated before every dispatch and turn end, so
after a compaction or session restart the ledger plus `git log`, not recollection, say
where the pipeline stands. Both files live next to the worktree, outside it and
gitignored, so no commit step can sweep them into a story commit.

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
opens the PR, transitions the card to awaiting review, reports the PR as open and not yet reviewed,
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

The lead routes qa, acceptance-gate, and PR-review findings back to the same coder —
**resuming it** when it holds a resumable agentId for it, or dispatching a fresh coder
carrying the findings when it does not. All are handled the same way: apply the whole
set in one go and report back to the lead, which re-runs `qa`. A finding is rejected
only with a traced input, never a restated conclusion; a finding that genuinely
conflicts with the spec is escalated as a mismatch, never rejected.

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

**An edit to one part of a document is an edit to the whole document.** That duty binds
both modes: the writer reconciles what its edit supersedes rather than leaving the rest
of the artifact asserting the superseded thing, and both of its report lines name what it
reconciled beyond the change it was dispatched to make — plus anything it left unfixed,
with the reason.

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
  came from), it names which card, which sentence, and what it should now say — and
  **applies the correction itself where your write authority permits it**, reporting what
  it changed, rather than handing you a fix you already authorised. Inside the spec, the
  reconciliation duty is concrete: when an edit supersedes a decision stated somewhere
  else in the file — an `auditor` finding, a course correction from the lead, or a
  decision the writer settles while authoring — it names the superseding decision,
  searches the whole spec for the terms that decision is expressed in, and rewrites or
  deletes every entry it invalidates **in the same pass**, across Goal, Design, every
  scenario, the Validation list where the spec carries one, and every Tasks entry.
  Annotating a superseded entry as historical does not count as reconciling it. The
  invariant: **a spec never carries two live instructions for one decision** — otherwise
  the `coder` implements the superseded one and `qa` reports a false finding against a
  stale checklist.
- **Docs pass**, after the build is accepted: folds the shipped spec's durable
  content into its permanent home (features / flows / designs), reconciling with what
  exists, and **removes the spec** (specs are not archived). Here the unit of review is
  **the paragraph, and every sentence in it** — not the lines being mechanically edited:
  touching a prose block, a list item, a table row, or a diagram is vouching for all of
  it. Every sentence is held to **two** standards, the shipped system *and* the project's
  stated principles, which is what makes a sentence describing something the project
  explicitly decided **not** to build correctable rather than merely unverifiable. Where
  those principles live is discovered from the project's own context, never hardcoded,
  and a project that states none is reported as such rather than passed silently. A
  contradiction is fixed even when the edit that surfaced it was unrelated to it. The one
  thing the writer never does is rewrite the principle: when the principle may be the
  stale side, or it cannot tell which side is stale, it reports and leaves the sentence
  standing — what the product is *for* stays yours.

The writer just authors and returns; its spec is gated by the lead's `auditor`, its
docs trusted. **Does not** implement code, run tests, or commit/branch/PR (the lead does).

### librarian — cited answers from the library  ·  `ca77y-library`

Answers research and product-context questions from the project's Markdown research
library. Reads synthesized wiki first, verifies important claims against raw notes,
and returns cited synthesis. Read-and-report by default — it does not edit library
files unless you explicitly ask. Discovers the library layout from `library/README.md`
and the `_meta/` files; never inspects secrets.

### scribe — ingests raw notes into the wiki  ·  `ca77y-library`

Ingests raw Markdown research notes into the synthesized wiki without destroying
provenance. Preserves raw notes, extracts durable concepts/claims, writes or updates
the matching wiki page, and updates links, taxonomy, the index, and the maintenance
log. Follows the Obsidian authoring conventions in `library/_meta/librarian.md` for
every file it touches — resolving each wikilink target against a real filename or a
declared alias (never a page's `title:`) and placing `^block-id` anchors only in
Obsidian's valid forms. A dispatch conditional whose truth depends on vault state
("if a dedicated page exists, link to it; if not, state …") is an instruction to the
scribe, not content: it settles the condition against the vault at write time and
publishes only the resolved branch's outcome as a settled statement, never the
caller's if/then wording. Before reporting a pass done it verifies its own claims
mechanically rather than from recall: it sweeps the whole batch it touched for a
defect class before reporting that class handled, states the class and files-swept
count in the log, grep-verifies every additive claim ("tag added", "block ID added")
against the target file, and parses any frontmatter it wrote or edited with a real
YAML loader — a parse failure blocks "done". The same pass sweeps the prose it
authored for wording addressed to its own author rather than the reader: an
unresolved conditional, "check whether", "do NOT", "in progress" used as a process
status, a TODO, or any reference to the dispatch itself. That sweep is scoped by
authorship, not by file — wiki pages, `_meta/` prose, and its own wording inside a
raw note such as a Rejected Sources callout, never the verbatim source text
preserved under `library/raw/`, and never a legitimate quotation of source material.
Every hit is resolved into a statement of fact or removed before the pass may be
reported done.

### clerk — audits library health  ·  `ca77y-library`

Audits the project's Markdown research library for duplicate wiki pages, stale index
entries, broken links, uncited claims, missing taxonomy tags, unsynthesized raw notes,
leaked meta-instructions in published prose, and convention violations. Its
broken-link audit catches wikilinks that resolve only against another page's
`title:`; it flags `^block-id` anchors that are textually present but invalidly
placed (so a citation to them will not resolve); it reconciles completion claims in
the maintenance log against the files they name, reporting every instance where a
claimed string is absent; and, by default and without a dispatcher naming it, it
flags wording addressed to a page's own author rather than its reader — an
unresolved dispatch conditional, an instruction to check something, a prohibition,
or a process-status sentence about the page's own writing — as a critical
library-integrity issue, excluding legitimately quoted instructions and the
`library/_meta/templates/` exception. Read-only by default — reports findings;
applies fixes only when you explicitly ask. Audits against the Obsidian conventions
in `library/_meta/librarian.md`.

---

## Conventions that tie it together

**One story = one card = one PR.** There is no epic/story/bug hierarchy and no
sub-task decomposition, whatever your board offers. Bigger work becomes a bigger single story (and a bigger
single PR); genuinely separate work becomes **multiple linked stories** sequenced with
dependencies — never a stack of PRs.

**Story cards** carry the same semantics on every board; the *form* comes from your
board's own shape, recorded in the profile. Where a board has no native field for one
of these, the project's documented convention supplies it — the pipeline never invents
a field, a status, or a marker:

- **Status** is the source of truth for where a story stands. New cards land at the
  board's initial value. The `lead` moves the story it is executing to *work started*
  when it starts and to *awaiting review* once its PR is open, checking the expected
  current value first and leaving the card alone if it does not match. **Every transition
  your declaration reserves for you stays yours** — terminal states like *done*, and any
  mid-flow gate like *ready to start*; those encode judgements about the pipeline's own
  work that it is not positioned to make. No other agent writes card status. The `lead`
  starts an invoked story from whatever state it's in; invoking it is the go-ahead.
- **Type** (exactly one), by central outcome: feature · improvement · bug
  (implementation-ready) · research · marketing · support (must be refined first).
- **Priority** when known, on the board's own scale.
- **Identity and dependencies**: a stable unique id, reused for the branch and the
  spec so one story is one name across board, repo, and PR; dependents point back at
  it through the board's own dependency link.
- **Acceptance criteria are individually verifiable** — one observable behaviour per
  line, never a prose blob. This is the one property the acceptance gate depends on,
  and it holds on every board.

On a repo-local Markdown board those become `type: story` frontmatter, an Obsidian
Tasks checkbox (`[ ]` Todo · `[/]` In Progress · `[?]` In Review · `[x]` Done ·
`[-]` Cancelled), `#type` tags, `🔺⏫🔼🔽` priority, and `🆔`/`⛔` dependency markers —
**one realization of the semantics above, not the semantics themselves.**

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
│   └── marketplace.json                  # lists both plugins
└── plugins/
    ├── ca77y-engineering/
    │   ├── .claude-plugin/plugin.json    # Claude manifest (agents whitelist)
    │   ├── plugin.json                   # root manifest (mirrors the Claude one)
    │   ├── skills/
    │   │   ├── lead/SKILL.md             # the lead — the pipeline orchestrator,
    │   │   │                             #   run in the main session
    │   │   └── board/SKILL.md            # resolves the project's board into a
    │   │                                 #   board profile the pipeline works from
    │   └── agents/                       # pipeline subagents:
    │                                     #   analyst, auditor, coder, qa, writer
    └── ca77y-library/
        ├── .claude-plugin/plugin.json    # Claude manifest (agents whitelist)
        ├── plugin.json                   # root manifest (mirrors the Claude one)
        └── agents/                       # library subagents:
                                          #   clerk, librarian, researcher, scribe
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
