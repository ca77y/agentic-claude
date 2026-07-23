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

The toolkit is **one plugin**, `ca77y-engineering`, holding two rosters:

- The **pipeline** — `researcher → analyst → lead → writer → coder → writer`, with
  `qa` (validation plus the local code review) and the `auditor` gating native to
  Claude, and the independent code review running on the opened PR.
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
┌────────────┐   wiki   ┌──────────┐  story   ┌──────┐   task   ┌──────────┐
│ researcher │ ───────▶ │ analyst  │ ───────▶ │ lead │ ───────▶ │  writer  │ spec
└────────────┘  pages   └──────────┘  cards   └──────┘          │  coder   │ build
      │                      │                    │             │    qa    │ test+review
      │ library              │ fit gate           │             │  auditor │ accept
      ▼                      ▼                    │             │  writer  │ docs
   ┌───────────┐        human                     │             └──────────┘
   │ librarian │        approval                  │
   │ scribe    │        gate                      │   commits · pushes · opens the PR
   │ clerk     │                                  └──▶ then drives the PR review loop
   └───────────┘
```

Two **human gates** punctuate the flow: you approve the analyst's stories before
anything is built, and you explicitly invoke the `lead` to build one. **The board is
yours** — the `lead` reads a referenced card but never writes it, so every status
transition, Done included, is a manual step.

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
review on the opened PR. The library crew — `librarian`, `scribe`,
`clerk` — runs as native subagents too, dispatched directly by whoever needs the
library work.

| Stage | Agent | In | Out |
| --- | --- | --- | --- |
| Research | `researcher` | a topic | a cited wiki entry + raw sources in the library |
| Analysis | `analyst` | wiki pages + your input | board-ready **story cards** (fit-proven) |
| Orchestration | `lead` | one task (a prompt, maybe naming a card) | a single merged-ready PR, reviewed |
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

### lead — takes one task to one reviewed PR

Owns the path from a task to a single merged-ready PR. It writes neither code nor
specs — it dispatches, gates, commits, and ships. Invoking the `lead` is explicit
permission to branch, worktree, commit, push, and open the PR.

Its input is a **prompt**. If that prompt references a story card, the lead reads the
card and what it links before reasoning about the task. That is its whole
relationship with the board: read-only.

1. **Read the task** — the prompt, the referenced card if any, the docs it touches,
   and the relevant code.
2. **Create the workspace** — one story branch in **one worktree**; the repo root
   stays on its base branch. Everything happens in that worktree.
3. **Spec** — dispatches the `writer` to author the spec, then the `auditor` to gate
   it; routes any findings back to the writer to revise, re-audits fresh, and once
   ready **commits the spec** (commit 1).
4. **Build** — dispatches **one** `coder` with the spec's path, and **records its
   agentId**. The coder implements and reports; the lead trusts that reported state.
5. **Validate & review** — dispatches `qa` to validate the build and review the diff;
   routes its findings back to the same coder by agentId and re-dispatches a **fresh**
   `qa`, capped at 3 rounds.
6. **Acceptance gate** — the `auditor` verifies the built result meets the task's
   acceptance criteria: the **card's** enumerated criteria when a card was named,
   the **spec's** requirements when not. Findings route back to the same coder by
   agentId, capped at 3 rounds. Docs do not start while a criterion is unmet.
7. **Docs** — a `writer` pass to update docs and convert the shipped spec; the lead
   trusts it, no docs gate.
8. **Ship** — **commits everything else** (commit 2), pushes, opens **one PR**.
9. **PR review loop** — drives the review to resolution (below).

**The commit model.** Nothing is committed while work is in flight; the story
worktree is the only workspace and the lead is the only agent that commits. There
are exactly two commits — the spec, then everything else — plus one per PR-review
fix round. Committing the spec separately is what keeps it in history at all, since
the docs pass later converts and deletes it.

**The PR review loop** (max 3 rounds). The review is performed by the Claude GitHub
app, triggered on open and re-triggerable by comment.

- Poll the PR up to **5 minutes** for review activity.
- **Nothing at all** in 5 minutes → report the task finished, saying plainly that no
  review was triggered.
- **A comment showing the review started** → the timer bounds how long to wait for
  the review to be *triggered*, not to *finish* — keep waiting until it lands.
- **Issues** → resume the same coder by agentId with the full set of findings, then
  commit, push, and re-fire with `gh pr comment --body "@review rerun the PR review"`.
- After 3 rounds it stops and reports what remains.

**A flat topology, and the lead never does the work.** The `lead` is the only
orchestrator: it dispatches `writer`, `coder`, `qa`, and `auditor` directly, and none of
them dispatches another — the chain is never more than two deep. Each is a leaf that does
its one job and returns, and the lead **trusts that result**: it never writes, tests,
reviews, or judges the work itself, and if a dispatch fails it retries or escalates rather
than stepping in. This also sidesteps Claude Code's dispatch-depth limit — three levels
down the dispatch tool is gone, and a fan-out skill there silently collapses to a single
pass — since with every pipeline agent a leaf under the lead, nothing runs deep enough to
hit it, and the heavy fan-out **code review runs on the PR** (the Claude GitHub review),
outside the dispatch tree entirely.

### coder — builds the whole task

Takes the validated spec and the story worktree and delivers the task end to end.
**It never commits** — its work stays in the tree for the lead, because the task
ships as one commit. It is **not its own reviewer** — `qa` reviews its work in a
separate context — and the lead owns every gate over it.

1. **Prepare** the worktree; confirm the spec; isolate pre-existing dirty changes.
2. **Implement** with minimal scoped diffs + one scenario test per spec scenario,
   consulting current third-party docs via context7 when external behavior matters.
3. **Report up** — no commit, no push, no PR. The lead then runs `qa` over the build.

The lead **resumes the same coder** for qa, acceptance-gate, and PR-review findings. All
are handled the same way: apply the whole set in one go and report back to the lead, which
re-runs `qa`. A finding is rejected only with a traced input, never a restated conclusion;
a finding that genuinely conflicts with the spec is escalated as a mismatch, never rejected.

### qa — validates the work, fills test gaps, and reviews the diff

Dispatched by the `lead` after the coder builds, and again after each fix round. Runs the
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

### writer — the task's spec, then its docs

Runs in two modes the lead dispatches separately, and **never commits**.

- **Spec pass**, before any code exists: authors the task's spec (Goal → Design →
  Requirements with WHEN/THEN scenarios → Tasks) against the acceptance criteria the
  work will be judged on, and hands back the path; the lead has the `auditor` gate it
  before the build and routes any findings back to the writer to revise.
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
every file it touches.

### clerk — audits library health

Audits the project's Markdown research library for duplicate wiki pages, stale index
entries, broken links, uncited claims, missing taxonomy tags, unsynthesized raw notes,
and convention violations. Read-only by default — reports findings; applies fixes only
when you explicitly ask. Audits against the Obsidian conventions in
`library/_meta/librarian.md`.

---

## Conventions that tie it together

**One story = one card = one file = one PR.** There is no epic/story/bug hierarchy
and no sub-task decomposition. Bigger work becomes a bigger single story (and a bigger
single PR); genuinely separate work becomes **multiple linked stories** sequenced with
dependencies — never a stack of PRs.

**Story cards** (`type: story` frontmatter) are Obsidian Tasks-format checkboxes:

- **Status** `[ ]` Todo · `[/]` In Progress · `[?]` In Review ·
  `[x]` Done · `[-]` Cancelled. The card symbol is the source of truth, and **moving
  it is yours** — no agent writes card status. The `lead` starts an invoked story
  from whatever state it's in; invoking it is the go-ahead.
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
the Claude GitHub review reviews it, and the lead loops fixes back through the same coder.

**Isolation**: the task builds in one worktree/branch under the repo's worktree
directory, and the repo root stays on its base branch. Nothing is committed until the
lead ships: two commits (the spec, then everything else) plus one per PR-review fix
round. No secrets are ever inspected, output, or committed.

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
        └── agents/                       # all subagent definitions:
                                          #   analyst, auditor, clerk, coder, lead,
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
