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
Markdown cards in the repo, Linear, Jira, GitHub Issues, or nothing at all. The pipeline
reads it from one fixed declaration at the start of every run, and hardcodes nothing
about the tracker itself — see [Bring your own board](#bring-your-own-board).

The toolkit is **two plugins**, each its own roster:

- **`ca77y-engineering`** — the pipeline `analyst → lead → writer → coder → writer`, with
  `qa` (validation plus the local code review) and the `auditor` gating native to
  Claude, and the independent code review running on the opened PR. The `lead` is a
  **skill run in the main session** (`/ca77y-engineering:lead <task>`), not a
  subagent; every other pipeline role is a subagent it dispatches directly, flat.
  It also carries the **board skill** (`/ca77y-engineering:board`), which helps you write
  or repair the `ISSUE_TRACKING.md` declaration that tells the pipeline *how this project
  tracks work* — the bindings for reading, searching, creating, and transitioning cards,
  the card shape and status vocabulary, and what the pipeline is permitted to write. The
  `lead` and the `analyst` read that declaration directly, at its fixed path, before
  touching a card; you invoke the skill yourself to set a project up or see what it
  currently says.
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
behind an MCP server or a CLI, a documented REST API, or nothing at all. Which one it is
gets **declared once, at a fixed path** — `docs/ISSUE_TRACKING.md` — and every
board-touching agent reads that declaration directly, itself, whenever it needs it.
There is no per-run resolution step and nothing handed between agents: the file is the
pipeline's whole interface to your tracker.

| Field | What it settles |
| --- | --- |
| **Board & mechanism** | which system, reached through what: a project skill, an MCP server, a CLI, repo files, documented HTTP |
| **Bindings** | the concrete call for each operation — *locate · read · search · create · transition*, plus *comment* and *update* where you grant them |
| **Card shape** | where the scaffold or field set is defined, and which field carries identity, type, priority, dependencies, acceptance criteria |
| **Status** | the board's own vocabulary, with the pipeline's two semantic transitions mapped onto it: *work started* and *awaiting review*, each with the value to expect before writing — plus every transition reserved for you by name, terminal or not |
| **Visibility** | where a write must land to be seen **now** — for a repo-local board, the root checkout left uncommitted; for a hosted one, the bound call |
| **Write authority** | the exhaustive list of operations the pipeline may perform. **Declared by your project; defaults to the two status transitions and nothing else** — grant more (comment, attach the PR, update a card) and the pipeline uses it, applying authorised fixes rather than reporting them |

**Declare your board in `docs/ISSUE_TRACKING.md`** — the bindings, the card shape, the
statuses, and what the pipeline may write. That path is fixed, on purpose: every
board-touching agent reads it directly, with no discovery step and nothing to search
for. Fixing *where the declaration lives* asserts nothing about your tracker — the
declaration is still what says which board, which statuses, and what may be written;
only its own location stops being a variable.

Don't have one yet? `/ca77y-engineering:board` helps: invoked directly, it interviews
you, writes the file, and verifies it against a real card. Invoked *during* a `lead` run
that finds no declaration, it never writes anything mid-pipeline — that run instead
proceeds without one (below), and relays the recommendation to write one in its report,
because a project document that appears mid-pipeline is a side effect you didn't ask
for.

**A missing declaration does not block a run.** With none at `docs/ISSUE_TRACKING.md`,
the pipeline runs trackerless: acceptance criteria come from the spec's requirements and
scenarios, there are no status transitions to make, and the handoff says so plainly. The
`analyst` still shapes and fit-gates its stories and returns them in its report as the
deliverable — a story you can paste into your own tracker beats a card written somewhere
it guessed.

Three shapes the declaration covers today, none of them privileged:

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

The declaration never invents an endpoint, a project key, a field, or a status value —
anything it cannot state plainly is recorded as unbound, and an agent that needs an
unbound operation reports the gap rather than improvising a call.

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

**Two committed ignore entries are also part of the setup.** Your repo needs a
`.gitignore` entry for whatever directory holds its story worktrees (this repo uses
`.worktrees/`) and one for `/tmp/` inside each story worktree, where the pipeline keeps
its run-local ledger and findings files. Both matter for the same reason: without them, a
commit step can sweep either into a story commit. Name the worktree-directory entry to
match whatever you actually call it; `/tmp/` is fixed, and **anchored** deliberately —
unanchored would also silently ignore any unrelated nested `tmp/` your project already
tracks on purpose, while anchored matches only the scratch directory this design creates
at the worktree's own root.

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
| Orchestration | `lead` (skill, main session) | one task (a prompt, maybe naming a card) | a single open PR, gated and handed off for review |
| Spec | `writer` | the task | a validated spec in the specs area |
| Build | `coder` | the validated spec | the finished work in the story worktree |
| Validation & review | `qa` | the work in progress | pass/fail + filled test (or checklist) gaps + code-review findings |
| Readiness & acceptance | `auditor` | the spec, the built work vs its criteria, or a story card | ready / not-ready verdict |
| Docs | `writer` | the finished task | durable docs (format/lint self-checked); spec converted & removed |
| Library lookup ᴸ | `librarian` | a research question | cited synthesis from the Markdown library |
| Library write ᴸ | `scribe` | raw notes / a synthesis target | wiki pages + index/taxonomy/log updates |
| Library audit ᴸ | `clerk` | the library vault | health findings (links, citations, taxonomy) |

ᴸ ships in the **`ca77y-library`** plugin; every other row is **`ca77y-engineering`**.
Board resolution is not a pipeline stage: every row above that touches a card reads
`docs/ISSUE_TRACKING.md` itself, directly, at its fixed path (see
[Bring your own board](#bring-your-own-board)); the `board` skill (below) is a standalone
setup and inspection tool, not something the pipeline invokes per run.

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
invoke the `lead`. When the declaration is absent — or it leaves `create` unbound — the
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

Its input is a **prompt**. Before anything else it **reads the tracking declaration**
(`docs/ISSUE_TRACKING.md`, at its fixed path), so that if the prompt references a card it
reads that card — and what it links — through the declaration's own bindings rather than
an assumed tracker. That, plus two status transitions on that one card — *work started*
at workspace creation, *awaiting review* once the PR is open, landed wherever the
declaration's visibility rule says — is its whole relationship with the board. Board
access downstream is **caller-granted**: the `writer` always carries read and search into
every spec pass; the `auditor` carries **read and search** into the lead's spec-readiness
gate and **read** into its acceptance gate, and performs the mechanical equality check and
the readiness gate's board-side duplicate detection itself, in each; the
`coder` and `qa` get no board access and need none.

1. **Read the task** — the prompt, the referenced card if any, the docs it touches,
   and the relevant code.
2. **Create the workspace** — one story branch in **one worktree**; the repo root
   stays on its base branch. Creating it includes **provisioning its dependencies**,
   before any agent is dispatched into it: wherever the project's dependency layout
   allows, by inheriting the main checkout's already-resolved state rather than
   re-deriving it with a fresh install — a re-resolving install can produce a different
   layout from the same lockfile and break tests the task never touched — otherwise by
   running the project's own install/bootstrap step. The lead then **records the
   provisioning status** — one of three values: *provisioned*; *no dependencies
   required*, the affirmative outcome when the project has no install/bootstrap step it
   can detect; or *provisioning failed*, with the reason — and every dispatch into the
   worktree names it, and **transitions the referenced card to work started**. Everything else happens in that worktree. Where the harness refuses
   file writes until the session has isolated itself — a background job typically is —
   the lead's one compliant move is to enter the worktree it just created with
   `EnterWorktree`'s **`path`** form, never its `name` form: `name` would create a second
   worktree in the harness's own directory and leave this story's branch behind, while
   entering the existing one leaves it exactly where the project puts it, with every
   dispatch still naming its absolute path. A fix run on an open PR (below) takes the same
   step after recovering the worktree.
3. **Spec** — dispatches the `writer` to author the spec, then **runs the project's
   format step** over everything commit 1 will land — the spec plus whatever else the
   spec pass left behind, typically an `AGENTS_IMPROVEMENTS.md` append — and only then
   dispatches the `auditor` to gate it; routes any findings back to the writer to
   revise, re-formats and re-audits fresh, and once ready **commits the spec**
   (commit 1). Immediately after, and before the coder is dispatched, it runs the
   project's **lint command once as a floor**: a failure naming a path commit 1 landed
   routes to the writer and is fixed in its own commit, while a failure only outside
   that set is recorded as pre-existing and relayed, never silently fixed. Both
   commands are whatever the project defines, discovered from project context — no tool
   is named — and each has three outcomes: it ran, it is **not defined** (a stated
   outcome, never a reason to invent one), or it is defined but **not trustworthy
   here**, reported as unrunnable and attributed to nobody. See **The commit model**
   below.
4. **Build** — dispatches **one** `coder` with the spec's path, and **records its
   agentId when the dispatch produces one**. The coder implements and reports; the
   lead trusts that reported state.
5. **Validate & review** — **commits the coder's build**, then dispatches `qa` to
   validate it and review the diff; routes its findings back to the same coder —
   resuming it by agentId when one is held, or a fresh dispatch carrying the findings
   when it is not, either way continuing on the report that dispatch delivers (see
   **Dispatch and resume** below) — **commits that round's work** when the coder
   reports back, and re-dispatches a **fresh** `qa` with the commit references to
   diff against **and the coder's fix report**, so qa reads each behavioural fix's
   demonstration outcome rather than re-deriving every pin; capped at 3 rounds.
6. **Acceptance gate** — the `auditor` verifies the built result meets the task's
   acceptance criteria against the **spec's labelled `AC1`…`ACn` transcription** of the
   card's criteria — the standard either way, whether or not a card exists — carrying
   **read** access into this gate. Before it grades anything, the gate performs the
   **mechanical equality check** (below) itself, on this dispatch and every re-audit
   round, which is what keeps that transcription trustworthy without the lead running a
   check of its own. Anything the qa loop left uncommitted — the final clean round's added
   tests included — is **committed before the first acceptance dispatch**, so it does not
   fuse into the first acceptance fix. **Unmet and partially met** findings route back to
   the same coder — resumed when its agentId is held, or freshly dispatched with the
   findings when it is not — and each round's fix is likewise **committed before the fresh
   re-audit**, which is handed the references to diff against. Capped at 3 rounds. Docs do
   not start while a criterion is unmet or partially met. A criterion graded
   **mis-worded** — the work is right and the wording is not — goes to neither the coder
   nor a respec, since neither can reword a card inside this window: the lead escalates it
   to the human, in the PR description, the final handoff, and a comment on the card, and
   proceeds to the docs pass and the PR. That is the one gate outcome a run ships past,
   and the correction lands in a later run's spec pass.

   **The mechanical equality check**, performed by the `auditor` itself inside each gate it
   runs: the spec's acceptance-criteria section is a verbatim, labelled copy of the card's
   own — `AC1`…`ACn` — never a paraphrase, and a copy earns that exemption only because the
   gate checks it: character for character, normalising only Linear's `-`-to-`*` bullet
   rewrite and its `<…>`-wrapping of bare URLs, run inside the spec-readiness gate before it
   judges the mapping and inside the acceptance gate before it grades any criterion,
   including every re-audit round of either. The lead performs no check of its own over
   the card's criteria — no comparison, no classification, no per-criterion read; a
   mismatch reported by either gate routes back to the writer for a respec, never to
   grading a stale list.
7. **Docs** — a `writer` pass to update docs and convert the shipped spec; the lead
   hands the dispatch the **spec commit** and the **round commit references** from the
   ledger, so the pass can diff the spec commit against `HEAD` to establish what
   shipped, rather than trusting the spec's own account of itself. The lead trusts what
   it returns, no docs gate. The pass does run your project's format/lint command over
   the files it wrote and reports the outcome — a self-check on its own output, not a
   review of its content by anyone.
8. **Ship** — **runs the project's validation once over the whole worktree** *before* the
   ship commit exists, then **commits whatever is still uncommitted** (the ship commit),
   pushes, and opens **one PR**. That run is the only look anything takes at the tree as it
   ships: the docs pass writes after qa's last round and after the acceptance gate, and an
   acceptance-round commit is judged by the `auditor`, which runs no validation — so this
   catches a break of that class whichever agent introduced it. Same command discovery and
   same three outcomes as step 3 (ran, **not defined**, or **not trustworthy here**). A
   failure naming a path this run touched routes by owner — docs to the writer, code to the
   coder — and its fix **folds into the ship commit** rather than becoming one of its own;
   a failure naming only untouched paths is relayed as pre-existing and never stops the
   run; the 3× rule bounds the retries. It is commit hygiene, not a gate: nothing is
   re-reviewed and no round is added. The PR then goes out
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
worktree and its provisioning status, the round's commit references, and the findings.
When a wake brings no usable report, the lead
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
a short summary go to `tmp/findings-round-<N>.md`, **inside the story worktree**, with
the resume message, or a fresh dispatch's prompt, carrying that path. The lead also
maintains a durable **ledger** at `tmp/ledger.md`, inside the same worktree — task, step,
agentIds, round counters, commits, what is awaited — updated before every dispatch and
turn end, so after a compaction or session restart the ledger plus `git log`, not
recollection, say where the pipeline stands. One committed `.gitignore` entry (`/tmp/`)
keeps both files out of every story commit; neither name carries a branch qualifier,
since each worktree now holds only its own story's scratch. That scratch does not
outlive the worktree it is inside — see the hand-off below for what recovery rests on
instead.

**The commit model.** The story worktree is the only workspace and the lead is the
only one that commits. It commits the spec — carrying the step-3 format step's output
for every path that commit lands, where the project defines a format command at all;
then, only on a run where the lint floor finds something, a **spec-format-fix commit**;
then one commit per **pre-ship round** — the coder's initial build, then each `qa` and
acceptance-gate fix round; then the **ship commit** with whatever is still uncommitted
at PR time (mainly docs and the spec's removal, plus anything the step-8 validation run
turned up — it runs before that commit is created so its fix folds in); then one per
PR-review fix round. The
count varies with how many rounds ran. The pre-ship round commits exist because every
`qa` and acceptance dispatch is a **fresh** context: they give it two commit references
to diff round N against round N−1, instead of one undifferentiated tree in which the
build and every round are folded together. They stay local until the PR opens. The docs
pass at step 7 is a fresh context too, and reads the same two references for the same
reason — to establish what shipped rather than trust the spec's account of it. Committing
the spec separately keeps it in history at all, since the docs pass later converts and
deletes it, and gives that pass the baseline it diffs against — and formatting it and
linting after it are what stop that commit from reddening the project's own gate with no
agent able to attribute the failure. The spec commit and the ship commit are the two the
pipeline's gates never read — the first lands before any of them, the last after all of
them — which is why each now has a step of its own: the format step and lint floor at
step 3, the tree-wide validation run at step 8.

**The PR review, and the hand-off.** The lead does **not** wait for the review. It
opens the PR, transitions the card to awaiting review, reports the PR as open and not yet reviewed,
and stops — no monitor, no polling script, no baseline diffing. Waiting on an external
reviewer means polling an outside system on an unbounded schedule from a session with
nothing else to do; you drive the review from the PR instead. An unreviewed PR that is
*reported* as unreviewed is a correct outcome.

The review's findings come back by **invoking the lead again** with them (or with the
PR). That fix run reuses the existing branch, worktree, and PR — never a second one —
recovering state primarily from the card's **handoff comment**, the **PR description**,
and `git log`, since the previous run's agentIds died with it and every worker is a fresh
dispatch; a surviving `tmp/ledger.md` is a **bonus** cross-check, not something recovery
depends on, since scratch inside the worktree does not outlive it. It routes each finding to its owner (code
→ `coder`, docs → `writer`, approach-invalidating → a revised spec), re-runs `qa` over
any code change, commits and pushes the round, updates the PR description with anything
new it must carry, re-fires the review with a `@review` comment — and hands off again.
The 3× rule applies within each run.

**A flat topology, and the lead never does the work.** The lead skill is the only
orchestrator, and it runs in the main session: it dispatches `writer`, `coder`, `qa`,
and `auditor` directly, and no pipeline agent dispatches or resumes another — every
worker is a leaf at depth 1. Each leaf does its one job and returns, and the lead
**trusts that result**: it never writes, tests, reviews, or judges the work itself, and
if a dispatch fails it retries or escalates rather than stepping in. The carve-outs are
commit hygiene on its **own** commits — the step-3 format step and lint floor, bounded to
what commit 1 lands, and the step-8 validation run over the tree just before the ship
commit; each routes a failure by owner instead of judging the work, and none replaces a
`qa` round or reads an acceptance criterion. The flatness is
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

**The prose-deliverable branch.** Step 2's default is the code case, and it is replaced
only when **both** facts hold: the spec's Boundary declares the deliverable a non-code
artifact, *and* the project has no test runner or validation command. Then "one scenario
test per scenario" becomes **one inspectable assertion per Requirements scenario** — the
file, the region a reader finds it by (a heading, a bold lead-in, a quoted phrase; never a
line number), and the exact quoted sentence that satisfies it, one entry keyed to each
scenario's own name, with a scenario nothing satisfies named as missing rather than
dropped. Finding no runner in that mode is the **expected** result, reported and moved
past — never escalated, and never a reason to invent one or add a test file the Boundary
forbids. A project that *does* define a validation command whose output the worktree's
provisioning makes untrustworthy is a distinct case, reported as unrunnable. A partly-code
deliverable on a project with a test runner leaves the second fact false, so its code
still gets scenario tests. Where the project defines a validation command it is `qa`'s to
run; where it defines none, the spec's own stated Validation procedure is what the coder's
work is checked against before it reports up.

The lead routes qa, acceptance-gate, and PR-review findings back to the same coder —
**resuming it** when it holds a resumable agentId for it, or dispatching a fresh coder
carrying the findings when it does not. (The one exception is an acceptance-gate criterion
graded **mis-worded**, which is escalated to the human rather than routed here — the coder
holds no board access and cannot reword a card.) All are handled the same way: apply the whole
set in one go and report back to the lead, which re-runs `qa`. A finding is rejected
only with a traced input, never a restated conclusion; a finding that genuinely
conflicts with the spec is escalated as a mismatch, never rejected.

**Every behavioural fix is demonstrated red before it is reported pinned.** Naming a test
is free — nothing the round produces can contradict a plausible-looking name, so an
unpinned fix would report identically to a pinned one. So per behavioural fix, one at a
time (never two reverts in flight together), the coder **reverts** the fix in the working
tree, **runs** the named test — that test, or at minimum only its file, never the whole
suite — **observes** the failure and records the test's name and the assertion that went
red from the real output, **restores** the fix verbatim, and **re-runs** the same test to
see it green again. A claim that the test *would* fail is not a demonstration; only the
observed red counts. The restore is *proved* by two things together rather than assumed
from having made the edit — the test green again *and* the worktree carrying the fix as
written — and a revert that cannot be restored is a blocker reported to the lead
immediately, never left in the tree. What is reverted is always the coder's **own** fix and
only until the restore, so this is not the "never revert another agent's changes" rule,
which stays in force unmodified.

**Each fix carries exactly one of three outcomes, and the set is closed**: **demonstrated**
(reverted, observed red, restored, re-observed green — carrying the test's name and the
assertion that went red), **not demonstrated** (a test named but red never observed here,
or no test named at all — carrying the reason), or **nothing can reach it** (no test can
reach the fix — carrying the concrete reason). The second and third are not
interchangeable: a test that exists but could not be run here — untrustworthy worktree
provisioning, a runner that will not start — is **not demonstrated** with that reason,
never **nothing can reach it**, which would turn a temporary environment problem into a
permanent, accepted coverage gap. A fix reported with no outcome at all reads as **not
demonstrated**, so silence costs a probe rather than buying a pass.

**In the prose-deliverable branch the demonstration takes its analogue** — there is no test
to revert and run, so the entry is the exact quoted line in the changed artifact that
carries the fix, the region a reader finds it by (never a line number), the finding it is
keyed to, and **what a reader would find missing were that line removed**, which is the
prose counterpart of the assertion that went red. The three outcomes are the same three, so
qa needs no second branch to consume them. Where the project has a test runner — including
on a task whose deliverable is only partly a document — the runnable demonstration is what
is required, and the analogue never substitutes for one that could have been run.

**No demonstration is owed** for the initial build's per-scenario tests, for a
test-quality, documentation, comment, or naming change, for a refactor with no behavioural
effect, or for a finding rejected with a traced input. The rule is scoped to a findings
round's behavioural fixes, over the named test only, one fix at a time — which is what
keeps it from becoming a mutation-testing exercise over the suite.

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
reviewed, and the new round commit) so it can diff round N against round N−1, and — on a
findings round — the coder's fix report, which carries the pin evidence below. Runs the
project's validation commands, compares the spec's scenarios against existing tests and
adds the missing coverage (e2e, frontend, integration, edge cases), then re-runs;
**re-validates every entry in the spec's *Already satisfied criteria* section** against
the post-build tree, reporting a broken one as a regression finding and a result per
`ACn` for the acceptance gate to grade from; and **reviews the changed code** against the
spec and the project's conventions for defects and quality, since it is a separate context
from the one that wrote it. Reports pass/fail with evidence, the tests it added, the
already-satisfied results, and its review findings — the lead routes them to the
`coder`. **Does not** fix feature code — a pin probe's temporary, restored revert (below)
is the single exception — and never weakens a failing test to make the suite pass.
The heavy, independent code review runs again on the **PR** — the Claude GitHub review.

**On a findings round it consumes the coder's pin evidence instead of re-deriving it.**
Each behavioural fix arrives marked **demonstrated**, **not demonstrated**, or **nothing
can reach it**; a fix carrying no mark — including every fix in a round whose dispatch
never carried the coder's report at all — reads as **not demonstrated**, and qa says so
explicitly rather than assuming any of them was demonstrated. A **demonstrated** pin is
**trusted** and not re-derived; that is where the round's saving actually comes from, and
the budget goes to the pins that are unproven. A **not demonstrated** or unmarked fix is
**probed** with the same revert-run-restore, on qa's own authority — the one narrow,
temporary, verified exception to *does not fix feature code*. Red on the revert means the
pin holds. Still green, or no test named, means the fix is unpinned: a finding naming the
fix and the test it was claimed to have, reported even where qa closes it by writing the
covering test itself, because the coder's report was wrong and the lead needs to see that.
A test qa writes that way is held to the same bar as the coder's: it closes the finding
only once qa has **demonstrated it red** — revert the restored fix again, run the new test,
observe it fail, restore the fix verbatim, re-run it green. A test qa added but never
observed red is reported as **not demonstrated**, not as closing the finding; naming a test
is no more a demonstration for qa's own tests than for the coder's.
A probe that could not be run at all is neither red nor green — reported as unproven with
its reason, never as a finding against the coder — and a probe that cannot be restored is a
blocking finding raised immediately. A **nothing can reach it** entry is **inherited** as a
known gap rather than rediscovered a round later, though a reachable seam qa can see
against a claim that none exists is an ordinary review finding. In prose mode the probe is
to re-read the region the entry names and check the quoted line is present and answers the
finding it is keyed to. Its report then carries a per-fix pin result — trusted, probed with
its outcome, or inherited — so the lead and the acceptance gate read the state of the
evidence rather than reconstructing it.

**Where the project defines no validation command** — the prose-deliverable case above —
the spec's own **Validation checklist is the validation**: qa runs every check it lists
and captures real output, and its gap-filling becomes finding the read-only checks that
checklist should have had and did not, running them, and reporting them **as additions to
the checklist** rather than as new test files (the spec stays the writer's to amend).
Finding no command there is the expected outcome, never a silent pass and never a missing
prerequisite; a command that exists but cannot be trusted in this worktree is reported as
unrunnable instead. Only its validate, gap-find, add, and re-run steps branch — the
already-satisfied re-validation, the diff review, and the report are observations over
files either way.

### auditor — independent readiness & acceptance gate (native, in Claude)

The gate for everything that isn't code quality. The `lead` uses it as the
**spec-readiness gate** before the build and the **acceptance gate** after it, proving
the finished work meets the task's acceptance criteria criterion by criterion; the
`analyst` uses it as a story advisor gate on candidate cards. (The `writer`'s docs are
trusted with no gate; its spec is gated.) Reads the artifact plus enough context to judge it on its own terms and
returns a **ready / not-ready** verdict. **Report-only** — the caller owns applying
fixes. Does not review code quality.

**At the acceptance gate it grades each criterion in one of four labels, and no more —
met, partially met, unmet, and mis-worded.** The fourth is for a criterion whose shipped
work does what the design intends while the criterion *as worded* does not describe it;
the other three all grade the work, so without it the gate has to either fail correct work
or pass wording the work does not satisfy. It names which sub-case applies — the criterion
is narrower or broader than the design intends, it contradicts a specific other `ACn`, or
its antecedent cannot arise in any run — and quotes the criterion's own sentence beside the
shipped text rather than paraphrasing either. Four bars stop it becoming a cheap way out:
failing work, a wrong design, and a criterion it could not verify are graded **unmet**
(or reported unverified, the existing mechanism-verification mode) and never mis-worded,
and its severity ranks *with* unmet, never below it. It cannot correct the criterion — it
never edits the card it is gating, and the declaration bars any correction between the
build and the gate that judges it — so it reports the defect in the verdict it returns,
the lead escalates it to the human, and the fix lands in a **later run's spec pass**,
where correcting a criterion is legal because no code exists yet to reshape it toward.
The same defect one gate earlier — the spec's Design, or the region an already-satisfied
entry names, contradicting a criterion as worded — is a readiness finding routed straight
to the `writer`, since there that window is still open.

**Every verdict it returns names its evidence, `met` included** — the file and region it
read and what it said, or, for a criterion in the spec's *Already satisfied criteria*
section, that section's evidence plus `qa`'s re-validation result. A criterion satisfied
only because its antecedent never arose is graded met with an observation saying the
antecedent was false and nothing was exercised, so the vacuous case is visible in what the
observation says instead of needing a fifth label. The obligation is also what keeps
mis-worded honest: a gate that must name an observation for every verdict cannot quietly
relabel a criterion it failed to check.

**Board access is granted per dispatch by whoever calls it.** The `lead`'s spec-readiness
gate grants it **read and search**; its acceptance gate grants it **read** only, because
grading a criterion needs that card's own criteria, not its siblings. In both, it performs
the **mechanical equality check** itself before doing anything else with the transcription
— comparing the spec's `AC1`…`ACn` copy against the card's own criteria, character for
character — and, at the spec-readiness gate, the board-side duplicate detection that keeps
the artifact under review from clashing with something already on the board. It grades the
transcription, not the card directly: the transcription is the standard, the card is
evidence about the copy, and a criterion found only on the card is a mismatch finding that
blocks rather than a criterion graded on the spot. The `analyst`'s advisor gate is a third,
separate dispatch that grants it **read and search**, for that gate's own board-side
duplicate and clash detection.

Where a criterion rests on a claim about how a **third-party or vendored dependency**
behaves, it verifies at the **mechanism, not the symptom**: it opens the cited source at
the cited version and confirms the behavior is what the spec says, because a scenario
passing on its observable outcome is not on its own evidence for the mechanism — the same
outcome can come from an unrelated cause. A claim the spec marks as an *assumption* is
reported as unverified rather than treated as established, and so is one whose cited
source it cannot read (package absent, or the worktree's provisioning status
*provisioning failed* or absent — *no dependencies required* is not that case, and is
trustworthy) — it reports that instead of provisioning anything to check. At the readiness
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

**In the spec pass, the writer always carries read and search access to the board's
declaration** — its sibling sweep for real board contradictions cannot come from a
prompt, so the `lead` grants both by default rather than leaving them to be requested.

- **Spec pass**, before any code exists: authors the task's spec (Goal → Acceptance
  criteria (verbatim transcription) → Design → Requirements with WHEN/THEN scenarios →
  Tasks → Already satisfied criteria) against the acceptance criteria the
  work will be judged on — **transcribing the card's own `## Acceptance criteria`
  verbatim into a labelled `AC1`…`ACn` section, taken after any criterion correction it
  makes, so the auditor's mechanical equality check, run inside each gate that uses this
  section, has something correct to check against** — and checking each transcribed
  criterion against code and prose that already exist, placing every one that needs no
  work in a bottom *Already satisfied criteria* section, per entry naming what satisfies
  it, what `qa` re-validates against the post-build tree, and whether the task's own
  changes also touch that surface — and hands back the path; the lead has the `auditor` gate it
  before the build and routes any findings back to the writer to revise. **When the
  deliverable is a document rather than code it says so in the Boundary content** — the
  declaration the coder's and qa's prose branch keys off, named by what that content *is*
  rather than by a heading, so your own spec shape is left alone — and then writes every
  scenario's **THEN** as an observation a reader can make in the changed artifact itself,
  with Validation reaching the artifact's real consumers (manifests, loaders, frontmatter,
  the changed-file set) in place of a build. **When a spec enumerates the edit sites
  inside a definition file — an agent or a skill — that file's own frontmatter
  `description` is one of them**, read during the same enumeration rather than in a later
  pass: where the task changes behaviour the `description` also states, it is either
  inside the scope the `coder` is dispatched to or handed to a named owning mechanism
  with a Tasks entry marked as not the `coder`'s task, and where it states nothing the
  change falsifies, the spec records that it was checked — so a checked field stays
  distinguishable from one never opened. That field is what other agents read when
  choosing a dispatch, so a stale one is wrong product surface rather than only stale
  prose, and a `coder` scoped to the enumerated sites is right to leave anything outside
  them alone — which is why the disposition is made while the spec is written, by its
  author and never by the `coder`. Its authoring
  rules make a spec's claims about the outside world checkable: a claim about how a
  **third-party or vendored dependency** behaves carries the package at the
  **resolved/installed** version plus a file-and-line into that package's own source —
  one citation per distinct mechanism claimed, since a compound sentence can be half
  true — or else it is written as an explicitly marked **assumption** saying why it
  could not be cited and what would settle it, so the round that verifies it knows it
  was never checked. A scenario whose observable outcome could hold with the claimed
  mechanism absent gets that alternative cause named while the spec is written, so a
  green test is never mistaken for a confirmed claim. The same discipline covers claims
  about **your project's own current state**, which are measured rather than inherited
  from the card: a claim that the system *lacks* something is checked against the
  **built, merged, or effective** artifact that would carry it — not only the source that
  declares it, since declared and effective configuration come apart at any layer that
  transforms one into the other — and where your project has a command that renders
  effective state, the writer runs it against the **unmodified** tree and records the
  measured baseline in the spec, so the coder and the acceptance gate scope their
  assertions against observed state. Where a Boundary exclusion instead rests on an
  **existing command's current result** (a CI gate, a pre-commit hook, a smoke check),
  that command runs before the exclusion is written — and if it **fails**, the failing
  file is in scope by definition, named in the Boundary and recorded in the Deviations
  rather than deferred to an escalation the build has to override anyway. An equivalent
  baseline already measured and handed to the writer satisfies that run, provided the
  spec says which of the two its result came from. Every such run goes through your
  project's own toolchain in its check-only or otherwise non-writing form, so a
  measurement never mutates the tree the spec is being written against, and it records
  which of the pipeline's three outcomes it took — *defined and runnable*, *not defined*,
  or *defined but not trustworthy here*. Where nothing can render the state a claim is
  about, the claim is written as a marked **assumption**, exactly as an uncitable
  dependency claim is. Then, before handing the
  spec back, it asks of **every** requirement: *would this scenario pass against the tree
  as it is today?* — one that would is not testing this task, and is either moved into
  *Already satisfied criteria* with that section's evidence or rewritten so that it would
  fail against today's tree. It also
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
- **Docs pass**, after the build is accepted: the shipped spec and the shipped code
  **can disagree by design** — a later `qa` or acceptance-gate finding that changes the
  design ordinarily lands in the code, not the spec, leaving the spec describing a shape
  the run has since abandoned. Before authoring anything, the writer establishes what
  shipped from the run's diff rather than from the spec's own account of itself: it
  diffs the spec commit against `HEAD` and reads the round commits' messages, which is
  what turns a bare textual difference into a *reason* — this changed because a gate
  rejected that claim. Each durable claim the spec makes is reconciled against that diff
  before it is folded into a durable doc; where the two disagree, **the diff is
  authoritative** and the spec's contradicted claim is not written down as fact, while
  the spec remains the source of durable **intent** — goal, design rationale,
  requirements — wherever the diff is silent. A divergence it finds, or an inability to
  obtain the spec commit or round commit references, is named in its report rather than
  papered over. It folds the shipped spec's durable content into its permanent home
  (features / flows / designs), reconciling with what exists, and **removes the spec**
  (specs are not archived). Here the unit of review is **the paragraph, and every
  sentence in it** — not the lines being mechanically edited: touching a prose block, a
  list item, a table row, or a diagram is vouching for all of it. Every sentence is held
  to **two** standards, the shipped system *and* the project's stated principles, which
  is what makes a sentence describing something the project explicitly decided **not**
  to build correctable rather than merely unverifiable. Where those principles live is
  discovered from the project's own context, never hardcoded, and a project that states
  none is reported as such rather than passed silently. A contradiction is fixed even
  when the edit that surfaced it was unrelated to it. The one thing the writer never
  does is rewrite the principle: when the principle may be the stale side, or it cannot
  tell which side is stale, it reports and leaves the sentence standing — what the
  product is *for* stays yours. The pass then **checks its own output**: before
  reporting back it runs your project's format or lint command over the files it
  authored, changed, or removed, and confirms clean. The command is discovered from your
  project's context — no tool is named — with the same three outcomes step 3 uses: it
  ran; it is **not defined**, said so in the report and never invented; or it is defined
  but **not trustworthy here**, reported as unrunnable rather than concluded clean. A
  failure inside its own file set is the pass's to fix and re-run; one naming only files
  outside it is relayed as pre-existing and never fixed; and a failure in its own file
  it cannot clear is reported as **not clean**, so a docs pass that authored a file your
  own gate would reject cannot report success. This is a self-check on files the pass
  itself wrote, not a review of anyone's work and not a new round.

The writer just authors and returns; its spec is gated by the lead's `auditor`, its
docs trusted. **Does not** implement code (the `coder` does), validate a build (`qa`
does), or create branches, commits, or PRs (the lead alone does, for every agent's work
including its own). It **may** run your project's own commands, read-only and in their
non-writing form, against the **unmodified** tree — that is the baseline measurement
above, and measuring what the tree already does before a line is written is not
validating a build. The docs pass's format/lint self-check above is the same kind of
exception: hygiene over its own output, not the test suite and not a gate over anyone
else's work.

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
board's own shape, recorded in the declaration. Where a board has no native field for one
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

**Specs** live in the specs area only while in flight. They follow Goal → Acceptance
criteria (the card's own, copied verbatim into `AC1`…`ACn`) → Design → Requirements
(WHEN/THEN scenarios) → Tasks → Already satisfied criteria (every `ACn` needing nothing
built, checked against the code and prose that already satisfy it), are written
just-in-time by the `writer`, and are **converted into durable docs and removed** by the
`writer` when the task ships — they are never archived. The spec gets its own commit
precisely so it survives in history after that removal, and the card stays the durable
home of the criteria once the transcription goes with the spec.

**Every check runs in an independent context.** Code review goes to `qa` locally — a
separate context from the `coder` — and to the PR review on the opened PR, readiness and
acceptance audits to the native `auditor`, and library health to the `clerk`. **No agent
ever gates its own artifact**; the judgement always runs as a separate subagent.

What that rules out is *sign-off*, not hygiene. Two **hygiene** steps deliberately run
over work the running agent is about to hand over, and neither is a gate, adds a round, or
judges anybody's work: the `writer`'s docs pass runs your project's format/lint command
over the files it just wrote, and the `lead` runs your project's validation over the whole
tree immediately before it creates the ship commit (see **The commit model** above for why
those two points and no others). Both are mechanical commands your project itself
defines — run them or report that you define none; nothing is reviewed either way. The
`coder`'s **pin demonstration** is a third step over its own work and a different kind
again: it runs one named test to make its own claim falsifiable, and what it hands on is
*evidence* for `qa` to consume rather than a judgement — `qa`, the acceptance gate, and the
PR review all still run in their own contexts over everything it produced.

**Verification is layered**: the `writer` authors the spec → the `auditor` gates it
ready-to-build → `coder` writes per-scenario tests → `qa` fills coverage gaps and reviews
the diff → the `auditor` gates the result against its acceptance criteria → the PR opens →
the Claude GitHub review reviews it, and its findings come back through another `lead` run.
The layers hold when the deliverable is **prose rather than code** — a spec, a doc, an
agent definition, on a project with no test runner: the two middle layers change medium,
not existence. Per-scenario tests become **one inspectable assertion per scenario** (the
file, the region, and the quoted sentence that satisfies it), and the coverage gap `qa`
fills becomes the read-only checks the spec's own Validation checklist should have had.
Both facts must hold together for that substitution — the spec declares the medium *and*
the project has no runner — so a task with a real test suite is untouched by it.
**Layered, not repeated**: on a findings round the `coder`'s pin demonstration is what
lets one layer skip re-deriving another's observation — a fix demonstrated red is trusted
by `qa`, which spends the round probing the pins nobody ever proved.
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
the worktree path **together with the resulting provisioning status** — one of
*provisioned*, *no dependencies required*, or *provisioning failed* — so it knows
before it runs anything whether a command's result is trustworthy. The first two are
both trustworthy, and *no dependencies required* is affirmative rather than a weaker
*provisioned*: the project has no install or bootstrap step, so nothing is missing, and
the agent runs the project's commands and **reports nothing about provisioning**, having
no gap to describe. Handed *provisioning failed*, or a dispatch naming no status at all,
an agent reports the gap instead of concluding from the output, and never provisions
the worktree itself (a fresh re-resolving install is what breaks
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
skill) to a single `docs/AGENTS_IMPROVEMENTS.md`, at that fixed path in the project's
documentation area (created on first use). It is opt-in, not a required step: an agent
appends a note **only** when it has a concrete improvement to propose, and only after
checking the file so the same point is never duplicated — no friction means no entry.
This is for *how the agents work*, never the product feature being built; you harvest
the accumulated notes back into this toolkit.

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
    │   │   └── board/SKILL.md            # helps write/repair the ISSUE_TRACKING.md
    │   │                                 #   declaration; not a per-run resolver
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
