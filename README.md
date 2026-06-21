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
  build → ship) plus the `gemini` dispatcher that delegates external work.
- **`ca77y-library`** — a research-library crew (`librarian`, `scribe`, `clerk`)
  that maintains the Markdown knowledge base. These run on Antigravity (`agy`) and
  are reached from the pipeline through `gemini`.

The end-to-end flow:

```
 idea / topic                                                      shipped PR
      │                                                                 ▲
      ▼                                                                 │
┌───────────┐   wiki    ┌──────────┐  story   ┌──────┐  units  ┌──────────┐
│ researcher │ ───────▶ │ analyst  │ ───────▶ │ lead │ ──────▶ │ engineer │
└───────────┘   pages   └──────────┘  cards   └──────┘         │  (×N)    │
      │                      │                    │            └──────────┘
      │ library              │ fit gate           │ specs ▲ docs    │ coder→qa→reviewer
      ▼                      ▼                    ▼       │         (self-contained loop)
   ┌───────────────────┐   human            product-owner, writer
   │  gemini (→ agy)    │   approval
   │ library · review · │   gate
   │ audit (+fallback)  │
   └───────────────────┘
```

Two **human gates** punctuate the flow: you approve the analyst's stories before
anything is built, and you explicitly invoke the `lead` to build a story. Moving a
finished card to **Done** after merge is also yours — the agents never close it out.

## Requires Claude Code **and** agy, working together

These tools are designed to run as a pair — **Claude Code** ([code.claude.com](https://code.claude.com))
and **Antigravity CLI** (`agy`). They are not standalone:

- The **`gemini`** agent in `ca77y-engineering` is a *dispatcher* — it hands code
  review, library work, and readiness audits to `agy` and relays the result.
- The **`ca77y-library`** agents (`librarian`, `scribe`, `clerk`) *execute on agy*;
  the pipeline reaches them through that dispatcher.

Because the engineering pipeline calls into the library crew, **both plugins should
be installed**, and both harnesses must be configured. Installing only one plugin, or
only one harness, leaves the cross-delegation broken. One fallback exists: if `agy`
is exhausted, `gemini` will perform code-review and audit work with Claude (clearly
labeled as degraded) — but **library work has no fallback** and requires `agy`.

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

### Claude Code

```bash
claude plugin marketplace add ca77y/agents
claude plugin install ca77y-engineering@ca77y-agentic
claude plugin install ca77y-library@ca77y-agentic
```

### Antigravity (agy)

```bash
agy plugin import claude            # picks up the Claude marketplace + plugins
agy plugin install ca77y-engineering@ca77y-agentic
agy plugin install ca77y-library@ca77y-agentic
```

## The pipeline at a glance

`researcher → analyst → lead → engineer(s) → writer`, with `gemini` providing every
external review/audit/library call along the way.

| Stage | Agent | In | Out |
| --- | --- | --- | --- |
| Research | `researcher` | a topic | a cited wiki entry + raw sources in the library |
| Analysis | `analyst` | wiki pages + your input | board-ready **story cards** (fit-proven) |
| Orchestration | `lead` | one approved story | a single merged-ready PR |
| Build | `engineer` (×N) | one validated unit spec | one committed unit |
| Spec | `product-owner` | a unit's scope | a validated spec |
| Implementation | `coder` | a validated spec | code + scenario tests |
| Validation | `qa` | a built unit | pass/fail + filled test gaps |
| Docs | `writer` | a shipped story | durable docs; spec converted & removed |
| External pass | `gemini` | any review/audit/library job | the result, via `agy` |

---

## The agents in detail

### researcher — deep-dive research that grows the library

Takes a research topic and runs an agent-steered deep dive, ending in durable
library knowledge — not tickets or code.

1. **Frames** the topic and decides if it's simple or needs subquestions.
2. **Searches the library first** (via `gemini` → `@librarian`) to establish a
   baseline and let gaps steer the web dive.
3. **Decomposes** complex topics into subquestions, dispatching **one child
   `researcher` per subquestion** (sequential fallback if nesting is unavailable).
4. **Runs the deep dive**: spawns explore subagents, follows leads recursively,
   prefers primary sources, and keeps going until leads stop producing new signal.
5. **Persists** anything of durable value as raw source notes (via `@scribe`),
   eagerly and in parallel-safe distinct files.
6. **Synthesizes** one new/updated wiki entry — *parent only*, serialized — citing
   the raw notes, and updates the index/taxonomy/log.
7. **Verifies library health** (`@clerk` audit) and fixes issues before reporting.

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
ready**. After shaping, a `gemini` audit gate critiques the cards. Cards land at
`[ ]` Todo as proposals; nothing executes until you approve and invoke the `lead`.
**Does not** write specs, code, or tests.

### lead — orchestrates one approved story into one PR

Owns the path from an approved story to a single merged-ready PR by delegating —
it never writes specs, code, or tests, and is deliberately **unaware of how an
engineer builds a unit**. Invoking the `lead` is explicit permission to branch,
worktree, commit, push, and open the PR.

1. **Analyze & start** — moves the card to **In Progress `[/]`**, reads the story,
   fit report, wiki, docs, and code; decides the units of work.
2. **Decide the split** — prefers **one unit**; splits only for genuine parallelism
   (frontend/backend, independent verticals). **One level only** — engineers never
   split further.
3. **Lock the contract** (when splitting) — defines the shared seams/interface so
   parallel units cannot diverge.
4. **Spec each unit** — `product-owner` writes a spec; the reviewer (`gemini`,
   audit) validates it; revise until it passes. No unvalidated spec is dispatched.
5. **Review the spec set** (when splitting) — `gemini` audits all specs *plus the
   contract together* for seam agreement and gaps before any fan-out.
6. **Provision isolation** — a worktree/branch per unit so parallel work can't collide.
7. **Dispatch** validated specs to engineers (parallel for independent units).
8. **Integrate** the units into the story branch, resolving seam conflicts.
9. **Integration review & story acceptance** (`gemini`, code-review):
   - **Story acceptance — always**: verifies the integrated result meets the
     **card's acceptance criteria**, not just each unit's spec.
   - **Cross-unit/contract — when split**: reviews the integrated diff for seam issues.
   - Findings route to the **owning engineer**; the PR does not open while any
     acceptance criterion is unmet.
10. **Docs** — one `writer` pass to update docs and convert the shipped spec(s).
11. **Ship** — opens **one PR**, moves the card to **In Review `[?]`**. Moving it to
    **Done `[x]`** after merge is your manual step.

*Nesting fallback:* `lead → engineer → coder` is three levels; if the runtime can't
nest that far, the lead runs units sequentially itself and reports the fallback.

### engineer — builds one unit through a self-contained loop

Takes one validated unit spec (plus its worktree and the shared contract) and
delivers it. Its `coder → qa → reviewer` loop is **private** — the lead only ever
sees the finished, committed unit.

1. **Prepare** the worktree; confirm the spec; isolate pre-existing dirty changes.
2. **Code** — `coder` implements with minimal scoped changes + one scenario test
   per spec scenario.
3. **QA** — `qa` runs validation and fills the test gaps (e2e, frontend, integration,
   edge cases).
4. **Review** — `gemini` (code-review) reviews the unit diff.
5. **Close the loop locally** — routes review/QA findings back to the `coder`,
   re-QAs, re-reviews; capped at 2–3 rounds.
6. **Commit** the clean unit in its worktree (Conventional Commits). **No push, no PR.**
7. **Report up**, escalating only cross-unit/contract or unresolvable issues.

### product-owner — writes one unit's spec, just in time

Called per unit by the lead. Reads the docs and code the unit touches and writes one
spec in the project's specs area, honoring the shared contract exactly (never
widening the interface). Revises against the reviewer's findings until it passes.
The canonical spec shape: **Goal → Design → Requirements (`### Requirement` /
`#### Scenario` with WHEN/THEN) → Tasks**, plus `Status`/`Task`/`Last Updated`
metadata. **Spec only** — no code, tests, or PRs.

### coder — implements one unit

Turns a validated spec into working, tested code: implements the requirements/tasks
with minimal scoped diffs, writes exactly one scenario test per spec scenario, and
consults current third-party docs via context7 when external behavior matters. Applies
fixes the engineer routes back. **Does not** run the broad validation pass, review
code, commit, push, or open PRs — the engineer commits.

### qa — validates a unit and fills its test gaps

Runs the project's validation commands, compares the spec's scenarios against existing
tests, and adds the missing coverage (e2e, frontend, integration, edge cases), then
re-runs. Reports pass/fail with evidence and what it added. **Does not** fix feature
code (defects route to the engineer → coder), review code quality (that's `gemini`),
or weaken a failing test to make the suite pass.

### writer — converts shipped specs into durable docs

The single docs pass the lead runs after integration. Folds each shipped spec's
durable content into its permanent home (features / flows / designs), reconciling
with what exists, then **removes the spec** (specs are not archived). Every
consistency check is delegated to `gemini` (audit mode) — the writer writes, `gemini`
checks. **Does not** implement code, run tests, or commit/branch/PR (the lead does).

### gemini — the single external pass (dispatcher to agy)

The one bridge to Antigravity. It does **not** do the work itself; it builds a prompt,
dispatches to `agy`, retries transient failures (up to 10 attempts with backoff, per
the `antigravity-cli` skill), and relays a clean result. Three modes:

- **code-review** — independent review of local changes (`@code-review`) or a PR
  (`@pr-code-review`). The only mode that reviews code.
- **library** — Markdown library work via the agy library agents: `@librarian`
  (cited answers), `@scribe` (ingest/synthesize), `@clerk` (health audit).
- **audit** — readiness gate for *non-code* artifacts: specs, plans, designs,
  research findings.

**Fallback on exhausted retries:** for **code-review** and **audit**, `gemini` falls
back to performing the review with Claude — clearly labeled as degraded and surfacing
the `agy` failure. For **library**, there is **no fallback** (agy fully owns it).

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

- **Status** `[ ]` Todo · `[<]` Ready · `[/]` In Progress · `[?]` In Review ·
  `[x]` Done · `[-]` Cancelled. The card symbol is the source of truth; the `lead`
  moves it through In Progress and In Review, and **you** move it to Done.
- **Type** (exactly one): `#feature` · `#improvement` · `#bug` (implementation-ready)
  · `#research` · `#marketing` · `#support` (must be refined first).
- **Priority** `🔺` highest · `⏫` high · `🔼` medium · `🔽` low.
- **Dependencies** `🆔 <slug>` identifies a story; dependents declare `⛔ <slug>`.
  The slug is reused for the file name, branch, and spec.

**Specs** live in the specs area only while in flight. They follow Goal → Design →
Requirements (WHEN/THEN scenarios) → Tasks, are written just-in-time by the
`product-owner`, and are **converted into durable docs and removed** by the `writer`
when the story ships — they are never archived.

**Every external check goes through `gemini`** — code-review for code, audit for
non-code (specs, plans, designs, research). Self-checking is forbidden across the
pipeline; the agent that produces an artifact never signs off on it.

**Verification is layered**: `coder` writes per-scenario tests → `qa` fills coverage
gaps → `gemini` reviews the unit → the spec set is reviewed before fan-out → the
integrated story is reviewed *and checked against its acceptance criteria* before the
PR opens.

**Isolation**: each unit builds in its own worktree/branch (under the repo's worktree
directory); the lead integrates and opens the one PR. No secrets are ever inspected,
output, or committed.

## Layout

```
ca77y-agentic/
├── .claude-plugin/
│   └── marketplace.json                  # lists both plugins
└── plugins/
    ├── ca77y-engineering/
    │   ├── .claude-plugin/plugin.json     # Claude manifest (agents whitelist)
    │   ├── plugin.json                    # agy-native manifest (root)
    │   ├── agents/                        # researcher analyst lead engineer product-owner coder qa writer gemini
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
