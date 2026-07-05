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

- The **pipeline** — `researcher → analyst → lead → coder(s) → writer`, with
  `reviewer` and `auditor` gating native to Claude.
- The **library crew** — `librarian`, `scribe`, `clerk` — that maintains the
  project's Markdown research library. The crew runs as native Claude subagents,
  dispatched directly by the agents that need library work.

Every check runs **natively in Claude** — code review (`reviewer`), readiness
audits (`auditor`), and library health (`clerk`). No external CLI dispatcher.

The end-to-end flow:

```
 idea / topic                                                       shipped PR
      │                                                                  ▲
      ▼                                                                  │
┌───────────┐   wiki    ┌──────────┐  story   ┌──────┐  specs  ┌──────────┐
│ researcher │ ───────▶ │ analyst  │ ───────▶ │ lead │ ──────▶ │  coder   │
└───────────┘   pages   └──────────┘  cards   └──────┘         │  (×N)    │
      │                      │                    │            └──────────┘
      │ library              │ fit gate           │ specs ▲ docs   │ qa · reviewer
      ▼                      ▼                    ▼       │       (owns its own loop)
   ┌───────────┐        human          reviewer · auditor · writer
   │ librarian │        approval          (native, in Claude)
   │ scribe    │        gate
   │ clerk     │
   └───────────┘
```

Two **human gates** punctuate the flow: you approve the analyst's stories before
anything is built, and you explicitly invoke the `lead` to build a story. Moving a
finished card to **Done** after merge is also yours — the agents never close it out.

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

`researcher → analyst → lead → coder(s) → writer`, with `reviewer` and `auditor`
gating natively in Claude. The library crew — `librarian`, `scribe`, `clerk` —
runs as native subagents too, dispatched directly by whoever needs the library work.

| Stage | Agent | In | Out |
| --- | --- | --- | --- |
| Research | `researcher` | a topic | a cited wiki entry + raw sources in the library |
| Analysis | `analyst` | wiki pages + your input | board-ready **story cards** (fit-proven) |
| Orchestration | `lead` | one approved story | validated specs + a single merged-ready PR |
| Build | `coder` (×N) | a validated unit spec | one committed, tested, reviewed unit |
| Validation | `qa` | a built unit | pass/fail + filled test gaps |
| Code review | `reviewer` | a unit or story diff | findings (low for a unit, medium for the story) |
| Readiness | `auditor` | a spec, spec set, or the story vs its criteria | ready / not-ready verdict |
| Docs | `writer` | a shipped story | durable docs; spec converted & removed |
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

### lead — orchestrates one approved story into one PR

Owns the path from an approved story to a single merged-ready PR. It **writes and
validates each unit's spec itself**, then delegates the build to a `coder` per unit
— it never writes code or tests. Invoking the `lead` is explicit permission to
branch, worktree, commit, push, and open the PR.

1. **Analyze & start** — moves the card to **In Progress `[/]`**, reads the story,
   fit report, wiki, docs, and code; decides the units of work.
2. **Decide the split** — prefers **one unit**; splits only for genuine parallelism
   (frontend/backend, independent verticals). **One level only** — units never
   split further.
3. **Lock the contract** (when splitting) — defines the shared seams/interface so
   parallel units cannot diverge.
4. **Spec each unit** — **writes the spec itself** (Goal → Design → Requirements →
   Tasks); the `auditor` validates it; revise until it passes. No unvalidated spec
   is dispatched.
5. **Review the spec set** (when splitting) — the `auditor` reviews all specs *plus
   the contract together* for seam agreement and gaps before any fan-out.
6. **Provision isolation** — a worktree/branch per unit so parallel work can't collide.
7. **Dispatch** each validated spec to a `coder` (parallel for independent units).
   Each coder owns its own qa → **low** review → fix → commit loop and returns the
   finished unit; the lead trusts that reported state.
8. **Integrate** the units into the story branch, resolving seam conflicts.
9. **Simplify pass** — dispatches a `coder` to run `/simplify` over the whole
   integrated change, re-run `qa`, and commit the cleanup — *before* the review, so
   it sees already-cleaned code.
10. **Integration review** — `reviewer` code-reviews the simplified `story-base..story-head`
    range at **medium** effort (correctness + seam/contract issues when split).
11. **Story acceptance** — the `auditor` verifies the integrated result meets the
    **card's acceptance criteria**, not just each unit's spec. Findings from either
    gate route to the **owning coder**; the PR does not open while any criterion is unmet.
12. **Docs** — one `writer` pass to update docs and convert the shipped spec(s).
13. **Ship** — opens **one PR**, moves the card to **In Review `[?]`**. Moving it to
    **Done `[x]`** after merge is your manual step.

*Nesting fallback:* `lead → coder → (qa/reviewer)` is two levels; if the runtime
can't nest even that far, the lead runs units sequentially itself and reports the fallback.

### coder — builds one unit through its own loop

Takes one validated unit spec (plus its worktree and the shared contract) and
delivers it end to end — the lead dispatches it directly and trusts the reported result.

1. **Prepare** the worktree; confirm the spec; isolate pre-existing dirty changes.
2. **Implement** with minimal scoped diffs + one scenario test per spec scenario,
   consulting current third-party docs via context7 when external behavior matters.
3. **QA** — hands off to `qa`, which runs validation and fills the test gaps (e2e,
   frontend, integration, edge cases).
4. **Review** — the `reviewer` reviews the unit diff at **low** effort.
5. **Close the loop** — applies review/QA findings, re-QAs, re-reviews; capped at
   2–3 rounds. A finding is rejected only with concrete evidence.
6. **Commit** the clean unit in its worktree (Conventional Commits). **No push, no PR.**
7. **Report up** with the commit hash, escalating only cross-unit/contract, blocked
   review gates, or unresolvable issues.

It also runs the **story-level simplify pass** when the lead dispatches it: applies
`/simplify` over the named range (quality-only — reuse, simplification, efficiency;
no bug-hunting), re-runs `qa`, and commits the cleanup on the story branch.

### qa — validates a unit and fills its test gaps

Called by the `coder` inside its loop. Runs the project's validation commands,
compares the spec's scenarios against existing tests, and adds the missing coverage
(e2e, frontend, integration, edge cases), then re-runs. Reports pass/fail with
evidence and what it added. **Does not** fix feature code (defects route back to the
`coder`), review code quality (that's the `reviewer`), or weaken a failing test to
make the suite pass.

### reviewer — independent code review (native, in Claude)

Invokes Claude Code's built-in code-review skill against exactly the diff the caller
names — the coder's single-unit diff at **low** effort, the lead's whole-story
`story-base..story-head` at **medium** — and relays the findings verbatim. Runs as
its own subagent so a review is never done by the context that wrote the code.
**Report-only**: it never edits or fixes code, and never reviews non-code artifacts
(that's the `auditor`). `ultra` (multi-agent cloud review) only on explicit request.

### auditor — independent readiness gate (native, in Claude)

The readiness gate for *non-code* artifacts. The `lead` uses it to validate each unit
spec, to review a split story's spec set against the shared contract, and to check the
integrated story against the **card's acceptance criteria**; the `writer` uses it for
docs consistency; the `analyst` uses it as a story advisor gate. Reads the artifact
plus enough context to judge it on its own terms and returns a **ready / not-ready**
verdict. **Report-only** — the caller owns applying fixes. Does not review code.

### writer — converts shipped specs into durable docs

The single docs pass the lead runs after integration. Folds each shipped spec's
durable content into its permanent home (features / flows / designs), reconciling
with what exists, then **removes the spec** (specs are not archived). Every
consistency check is delegated to the `auditor` — the writer writes, the `auditor`
checks. **Does not** implement code, run tests, or commit/branch/PR (the lead does).

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
  `[x]` Done · `[-]` Cancelled. The card symbol is the source of truth; the `lead`
  moves it through In Progress and In Review, and **you** move it to Done. The `lead`
  starts an invoked story from whatever state it's in — invoking it is the go-ahead.
- **Type** (exactly one): `#feature` · `#improvement` · `#bug` (implementation-ready)
  · `#research` · `#marketing` · `#support` (must be refined first).
- **Priority** `🔺` highest · `⏫` high · `🔼` medium · `🔽` low.
- **Dependencies** `🆔 <slug>` identifies a story; dependents declare `⛔ <slug>`.
  The slug is reused for the file name, branch, and spec.

**Specs** live in the specs area only while in flight. They follow Goal → Design →
Requirements (WHEN/THEN scenarios) → Tasks, are written just-in-time by the
`lead`, and are **converted into durable docs and removed** by the `writer`
when the story ships — they are never archived.

**Every check runs in an independent context.** Code review goes to the native
`reviewer`, readiness/audit of non-code artifacts to the native `auditor`, and library
health to the `clerk`. Self-checking is forbidden across the pipeline; the agent that
produces an artifact never signs off on it — the review always runs as a separate
subagent.

**Verification is layered**: `coder` writes per-scenario tests → `qa` fills coverage
gaps → `reviewer` reviews the unit (low) → the spec set is audited before fan-out →
a `/simplify` pass cleans the integrated change → `reviewer` reviews the whole story
(medium) → the `auditor` checks it against its acceptance criteria before the PR opens.

**Isolation**: each unit builds in its own worktree/branch (under the repo's worktree
directory); the lead integrates and opens the one PR. No secrets are ever inspected,
output, or committed.

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
                                          #   librarian, qa, researcher, reviewer,
                                          #   scribe, writer
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
