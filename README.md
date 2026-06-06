# ca77y-agentic

Personal agentic toolkit shared from one repo across two harnesses. It bundles a
Claude Code development pipeline and a research-library crew as **two plugins over
one shared content pool**, with each plugin's roster scoped through marketplace
config rather than separate directories.

## Requires Claude Code **and** agy, working together

These tools are designed to run as a pair — **Claude Code** ([code.claude.com](https://code.claude.com))
and **Antigravity CLI** (`agy`). They are not standalone:

- The **`gemini`** agent in `ca77y-engineering` is a *dispatcher* — it hands code
  review, library work, and readiness audits to `agy` and relays the result.
- The **`ca77y-library`** agents (`librarian`, `scribe`, `clerk`) *execute on agy*;
  the pipeline reaches them through that dispatcher.

Because the engineering pipeline calls into the library crew, **both plugins should
be installed**, and both harnesses must be configured. Installing only one plugin, or
only one harness, leaves the cross-delegation broken.

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

## Layout

```
ca77y-agentic/
├── .claude-plugin/
│   └── marketplace.json                  # lists both plugins
└── plugins/
    ├── ca77y-engineering/
    │   ├── .claude-plugin/plugin.json     # Claude manifest (agents whitelist)
    │   ├── plugin.json                    # agy-native manifest (root)
    │   ├── agents/                        # engineer gemini linear-story qa researcher stack-planner
    │   ├── references/templates/          # Linear issue templates used by linear-story
    │   └── skills/                        # analyst planner antigravity-cli gh-stack
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
  the default `agents/` scan, which also keeps the `linear-story` templates under
  `references/templates/` from being picked up as phantom agents.
- **Skills** — auto-discovered from each plugin's own `skills/`. No pool trick needed,
  because the rosters are disjoint and each plugin only sees its own directory.

## The pipeline

`researcher → analyst → linear-story → planner → [stack-planner] → engineer → (qa, writer, gemini)`

- **researcher** — deep investigation; delegates library work to `gemini` (agy).
- **analyst** *(skill)* — shape ideas/epics into Linear-ready work.
- **linear-story** — write the labeled Linear story/epic.
- **planner** *(skill)* — turn an approved story into a spec (one file per story under docs/specs/).
- **stack-planner** — plan stacked-PR topology for multi-change work.
- **engineer** — take an approved spec end to end; delegates QA to `qa` and docs to `writer`.
- **qa** — review/fix loop via `gemini` (agy code-review).
- **writer** — documentation and spec conversion (shipped spec → docs/features|flows|designs, then removed).
- **gemini** — the single dispatcher to `agy` (code-review / library / audit).
- **antigravity-cli** / **gh-stack** *(skills)* — `agy` command mechanics; stacked PRs.

## The library crew (runs on agy)

- **librarian** — answers from the Markdown library with cited synthesis.
- **scribe** — ingests raw notes and writes synthesized wiki pages.
- **clerk** — audits library health: links, citations, taxonomy, stale indexes.
