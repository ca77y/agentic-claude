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
│   └── marketplace.json        # both plugins; scopes each roster via config
├── agents/                     # shared pool — both plugins whitelist a subset
│   ├── engineer.md gemini.md linear-story.md qa.md researcher.md stack-planner.md
│   ├── librarian.md scribe.md clerk.md
│   └── references/templates/   # Linear issue templates used by linear-story
└── skill-pool/                 # engineering skills (deliberately NOT named skills/)
    ├── analyst/ planner/ antigravity-cli/ gh-stack/
```

## How scoping works

Both plugins share `source: "./"`, so the content lives in one pool and each plugin
selects what it exposes from the marketplace entry:

- **Agents** — the `agents` whitelist *replaces* the default `agents/` scan, so each
  plugin loads only the files it lists. The other agents in the same folder are ignored.
- **Skills** — Claude *always* scans a folder named `skills/` and the `skills` field
  only *adds* to it. To keep skills scopable they live in **`skill-pool/`** instead;
  only `ca77y-engineering` lists them, so `ca77y-library` ships zero skills.

## The pipeline

`researcher → analyst → linear-story → planner → [stack-planner] → engineer → (qa, gemini)`

- **researcher** — deep investigation; delegates library work to `gemini` (agy).
- **analyst** *(skill)* — shape ideas/epics into Linear-ready work.
- **linear-story** — write the labeled Linear story/epic.
- **planner** *(skill)* — turn an approved story into an OpenSpec change.
- **stack-planner** — plan stacked-PR topology for multi-change work.
- **engineer** — take an approved change end to end; delegates QA to `qa`.
- **qa** — review/fix loop via `gemini` (agy code-review).
- **gemini** — the single dispatcher to `agy` (code-review / library / audit).
- **antigravity-cli** / **gh-stack** *(skills)* — `agy` command mechanics; stacked PRs.

## The library crew (runs on agy)

- **librarian** — answers from the Markdown library with cited synthesis.
- **scribe** — ingests raw notes and writes synthesized wiki pages.
- **clerk** — audits library health: links, citations, taxonomy, stale indexes.
