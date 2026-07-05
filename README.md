# ca77y-agentic

Personal agentic toolkit shared from one repo across two harnesses. It bundles a
Claude Code development pipeline and a research-library crew as **two plugins over
one shared content pool**, with each plugin's roster scoped through marketplace
config rather than separate directories.

## Overview

`ca77y-agentic` turns a raw idea into a shipped pull request through a chain of
specialized agents, each owning one stage and handing off to the next. The whole
flow lives **inside the repository you run it on** — there is no external tracker.
Stories, specs, and research are plain Markdown in an Obsidian vault, so the board
and the knowledge base are versioned alongside the code.

The toolkit is split into two plugins:

- **`ca77y-engineering`** — the idea-to-shipped pipeline (research → analysis →
  build → ship) plus the `gemini` dispatcher for the one job that still lives on the
  agy side: the research library.
- **`ca77y-library`** — a research-library crew (`librarian`, `scribe`, `clerk`)
  that maintains the Markdown knowledge base. These run on Antigravity (`agy`) and
  are reached from the pipeline through `gemini`.

Code review and readiness audits run **natively in Claude** — the `reviewer` and
`auditor` subagents — so `gemini` is purely the bridge to the agy-side library.

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
   ┌───────────────────┐   human          reviewer · auditor · writer
   │  gemini (→ agy)    │   approval          (native, in Claude)
   │  library only      │   gate
   └───────────────────┘
```

Two **human gates** punctuate the flow: you approve the analyst's stories before
anything is built, and you explicitly invoke the `lead` to build a story. Moving a
finished card to **Done** after merge is also yours — the agents never close it out.

## Requires Claude Code **and** agy, working together

These tools are designed to run as a pair — **Claude Code** ([code.claude.com](https://code.claude.com))
and **Antigravity CLI** (`agy`). They are not standalone:

- The **`gemini`** agent in `ca77y-engineering` is a *dispatcher* for **library work
  only** — it hands research-library lookups, synthesis, and audits to `agy` and relays
  the result. Code review and readiness audits do **not** go through it; they run
  natively in Claude (`reviewer` / `auditor`).
- The **`ca77y-library`** agents (`librarian`, `scribe`, `clerk`) *execute on agy*;
  the pipeline reaches them through that dispatcher.

The two plugins live on **different harnesses**, not both on each: install
**`ca77y-engineering` in Claude Code** (where the pipeline runs) and
**`ca77y-library` on `agy`** (where the library crew executes). Skipping the `agy`
side — the library plugin — leaves the pipeline unable to read or grow the research
library. **Library work has no Claude fallback** and requires `agy`; everything else
(code review, audits) is native to Claude and needs no agy at all.

## Requires the target repo to be an Obsidian vault

The pipeline does **not** use an external tracker. Stories, specs, and the research
library are plain Markdown **inside the repo you run the pipeline on**, and that repo
must be an **Obsidian vault** (a committed `.obsidian/` at its root) with the community
plugins below installed and vendored. The board cards, Templater scaffolds, and library
navigation depend on them — without the vault and these plugins, the `analyst`,
`lead`, and library agents have nothing to read or write.

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

Each plugin goes on the harness that runs it — `ca77y-engineering` in Claude Code,
`ca77y-library` on `agy`.

### Claude Code — `ca77y-engineering`

```bash
claude plugin marketplace add ca77y/agents
claude plugin install ca77y-engineering@ca77y-agentic
```

### Antigravity (agy) — `ca77y-library`

```bash
# the research-library crew (the only agy-side dependency)
agy plugin import claude            # picks up the Claude marketplace
agy plugin install ca77y-library@ca77y-agentic
```

## The pipeline at a glance

`researcher → analyst → lead → coder(s) → writer`, with `reviewer` and `auditor`
gating natively in Claude and `gemini` bridging to the agy-side library.

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
| Library | `gemini` | a library lookup / synthesis / audit | the result, via `agy` |

---

## The agents in detail

### researcher — deep-dive research that grows the library

Takes a research topic and runs an agent-steered deep dive, ending in durable
library knowledge — not tickets or code.

1. **Frames** the topic and decides if it's simple or needs subquestions.
2. **Searches the library first** (via `gemini` → the `librarian`) to establish a
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

### gemini — the library dispatcher (bridge to agy)

The one bridge to Antigravity, now **library-only**. It does **not** do the work
itself; it builds a prompt, dispatches to `agy`, retries transient failures (per the
`antigravity-cli` skill), and relays a clean result. Its jobs are the agy library
agents:

- `/ca77y-library:librarian` — cited answers from the Markdown library.
- `/ca77y-library:scribe` — ingest raw notes / synthesize wiki pages.
- `/ca77y-library:clerk` — library health audit (links, citations, taxonomy, stale indexes).

Library work has **no Claude fallback** — the library lives entirely on the agy side.
Code review and readiness audits do **not** go through `gemini`; they are native
(`reviewer` / `auditor`). It also passes the project root with `--add-dir` and attaches
area context (e.g. `@library/AGENTS.md`) so the dispatched agent is properly grounded.

### antigravity-cli *(skill)*

The `agy` command mechanics `gemini` relies on: the headless pattern, core flags,
Gemini-CLI parity notes, the retry policy, output discipline, and safety rules. It is
flavor-blind — *which* job to run is `gemini`'s concern; *how* to run `agy` is the
skill's.

## The library crew (runs on agy)

Reached only through `gemini` in library mode. Each agent reads the library's shared
`librarian` conventions before acting.

- **librarian** — answers questions from the Markdown library with cited synthesis.
- **scribe** — ingests raw notes and writes synthesized wiki pages, links, taxonomy,
  index, and log.
- **clerk** — audits library health: broken links, citations, taxonomy, duplicates,
  unsynthesized notes, stale indexes.

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
health to `gemini` → `clerk`. Self-checking is forbidden across the pipeline; the
agent that produces an artifact never signs off on it — the review always runs as a
separate subagent.

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
│   └── marketplace.json                  # lists both plugins
└── plugins/
    ├── ca77y-engineering/
    │   ├── .claude-plugin/plugin.json     # Claude manifest (agents whitelist)
    │   ├── plugin.json                    # agy-native manifest (root)
    │   ├── agents/                        # subagent definitions
    │   └── skills/                        # antigravity-cli
    └── ca77y-library/
        ├── .claude-plugin/plugin.json     # Claude manifest
        ├── plugin.json                    # agy-native manifest (root)
        └── agents/                        # librarian scribe clerk
```

Each plugin carries two manifests: Claude reads `.claude-plugin/plugin.json`; agy reads
`plugin.json` at the plugin root. They live in different locations, so neither harness
trips over the other's.

## How scoping works

Each plugin is its **own root with its own `plugin.json`**. Scoping must live in
`plugin.json` — a marketplace entry's component fields are *not* honored as an
override, so a shared pool with marketplace-level whitelists silently loads
everything. With separate roots:

- **Agents** — each `plugin.json` whitelists its agents. The whitelist *replaces*
  the default `agents/` scan, so only the listed agent files load and any other
  Markdown in the plugin is never picked up as a phantom agent.
- **Skills** — auto-discovered from each plugin's own `skills/`. No pool trick needed,
  because the rosters are disjoint and each plugin only sees its own directory.
