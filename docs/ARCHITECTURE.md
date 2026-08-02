# Architecture

How `ca77y-agentic` is assembled. Per-agent behavior is documented in the root
[`README.md`](../README.md); this file covers structure, contracts, and the constraints
that shape them.

## Repository shape

```text
ca77y-agentic/
|-- .claude-plugin/marketplace.json      # marketplace entry, lists the plugin
|-- plugins/
|   `-- ca77y-engineering/
|       |-- .claude-plugin/plugin.json   # Claude manifest (agents whitelist)
|       |-- plugin.json                  # root manifest, mirrors the Claude one
|       |-- skills/lead/SKILL.md         # the lead skill - the pipeline orchestrator
|       `-- agents/*.md                  # the agent definitions
|-- docs/                                # this documentation + the board
|-- .obsidian/                           # vendored vault config and plugins
`-- CLAUDE.md                            # repo maintenance rules
```

The agent Markdown files under `plugins/ca77y-engineering/agents/` and the `lead`
skill under `plugins/ca77y-engineering/skills/` **are the product**. Everything else
is packaging, documentation, or vault state.

## The dual manifest

Each plugin carries two manifests in different locations so neither harness trips over
the other:

- `plugins/<plugin>/.claude-plugin/plugin.json` — the manifest Claude Code reads.
- `plugins/<plugin>/plugin.json` — the root manifest, which mirrors it.

They must always carry the same `version`. They have silently drifted before; the root
[`CLAUDE.md`](../CLAUDE.md) carries the check to run before any push that touches a
version.

## How scoping works

Each plugin is its own root with its own `plugin.json`, and scoping must live there. A
marketplace entry's component fields are **not** honored as an override — a shared pool
with marketplace-level whitelists silently loads everything.

The `agents` whitelist in `plugin.json` *replaces* the default `agents/` directory scan.
Only listed files load, so unrelated Markdown in the plugin is never picked up as a
phantom agent. Adding an agent file without adding it to both manifests means it does not
exist at runtime.

## The agent roster

Nine agents and one skill in one plugin, in two groups:

| Group | Agents | Role |
| --- | --- | --- |
| Pipeline | the `lead` **skill**, plus `researcher`, `analyst`, `writer`, `coder`, `qa`, `auditor` | idea → shipped PR |
| Library crew | `librarian`, `scribe`, `clerk` | maintains the target project's Markdown research library |

The flow is `researcher → analyst → lead → writer → coder → writer`, with `qa`
(validation plus the local code review) and the `auditor` gating, and the independent
code review running on the opened PR. The `lead` is not an agent: it is a **skill the
user invokes in the main session** (`/ca77y-engineering:lead <task>`), and the main
session then orchestrates. Under it, `writer`, `coder`, `qa`, and `auditor` are all
**leaves it dispatches directly** — no pipeline agent dispatches or resumes another.
The library crew is dispatched directly by whichever agent needs library work.

It stays **one plugin**. Splitting the library crew out was considered and rejected: the
seam between the two groups is a file — a wiki page — not an agent call, but the
`analyst` dispatches `librarian` and `clerk` directly, so a split would flip the
dependency rather than remove it.

## A flat topology — the orchestrator is the main session

The pipeline is deliberately flat, and the orchestrator is the **main session**,
running the `lead` skill. It dispatches every pipeline agent directly — `writer`,
`coder`, `qa`, `auditor` — and **no pipeline agent dispatches or resumes another**:
every worker is a leaf at depth 1. Each leaf does its one job and returns; the lead
**trusts that result** and never does the work itself, never re-checks it, and never
steps in when a dispatch fails (it retries or escalates). The `writer`'s docs are
trusted outright; its spec is gated by the lead's `auditor` before the build.

The flatness exists because the harness does not support a nested orchestrator: a
subagent's children detach regardless of `run_in_background`, their completion
notifications route to the root session from any depth, a resumed child's report never
reaches a subagent parent, and subagents have no `TaskOutput` to collect with. The
`lead` ran as a subagent orchestrator until 1.9.0 and hit exactly that; the evidence
and upstream references are recorded in
[`issues/nested-subagent-result-routing.md`](issues/nested-subagent-result-routing.md).
Running the orchestrator in the main session puts it where the harness actually
delivers: fresh synchronous dispatches return their report as the tool result, a
resumed worker's completion notification wakes the orchestrating session, and
`TaskOutput`/`TaskList` exist there for lost-report recovery. The trade is accepted:
one story per session, with parallel stories as parallel sessions over their own
per-story worktrees. Flatness is the skill's design, not a machine-enforced cap — no
depth-limiting environment variable is set anywhere.

The skill keeps its orchestration state on disk, next to the worktree and outside it
(`.worktrees/<branch>.ledger.md` for the pipeline ledger,
`.worktrees/<branch>.findings-round-<N>.md` for oversized findings), and hands workers
**paths, not content** — so a compaction or restart mid-pipeline recovers from the
ledger plus `git log`, and orchestration files can never enter a story commit.

The heavy, fan-out **code review runs on the PR** (the Claude GitHub review), outside
the dispatch tree entirely; `qa`'s local review is a single-context pass.

The `analyst` and `researcher` are separate top-level orchestrators, **not** part of
the lead's tree: they run their own sub-dispatch — the analyst's advisor gate and
library lookups, the researcher's subquestion decomposition and library writes. Their
fresh, synchronous depth-2 dispatches are the pattern the harness delivers correctly;
the worker definitions' report-channel hygiene (final text is the report, never
`SendMessage` as a reporting or escalation channel) keeps those trees clean too.

## Model and effort assignment

Models are pinned per agent in the agent definitions. The current split: `opus` for
`analyst`, `qa`, and `writer`; `sonnet` for `auditor`, `clerk`, `coder`, and
`researcher`; `haiku` for `librarian` and `scribe`. Effort is set on every
agent except the two haiku ones — it is unsupported there and setting it breaks dispatch.
The `lead` skill has no model of its own — a skill runs on the session's model, so
orchestration cost moves with the user's model choice (accepted: orchestration is
low-volume when handoffs are paths).

The frontmatter is the only source of truth for both. Note that nesting resolves a
subagent's model against the *main conversation* rather than the dispatching agent, so
an agent reached through a chain and carrying no `model:` of its own inherits the
session model.

## The story worktree contract

A story worktree is the pipeline's only workspace, and the `lead` owns making it usable.
`git worktree add` copies no installed dependencies, so **provisioning is part of
creating the workspace** — it happens in the `lead`'s workspace-creation step, before any
agent is dispatched into the worktree, and it is provisioning only: not running the
project's tests, validation, or build, which stay `qa`'s.

Provisioning **prefers inheriting the main checkout's already-resolved dependency state
over re-deriving it**, wherever the project's dependency layout allows; otherwise it runs
the project's own install/bootstrap step, discovered from project context. The rule is
stated as a shape, never as a command — the toolkit runs against arbitrary projects, so no
package manager, installer, or ecosystem may be named. The preference is not cosmetic: an
install that re-resolves can produce a different dependency layout than the main checkout
*from the same lockfile*, and so can break pre-existing tests the task never touched.
When a project has no install step, or provisioning fails, the status is recorded as **not
provisioned, with the reason**, and the run proceeds.

**The resulting status is part of the handover.** Every dispatch that names a worktree
names its dependency-provisioning status alongside the path, so a receiving agent knows
*before* it runs a command whether the result is trustworthy. An agent handed an absent or
negative status treats dependency-sensitive command output as untrustworthy and **reports
that**, and does **not** provision the worktree itself — self-repair by fresh install is
the exact move that breaks untouched tests, and only the `lead`'s creation step can prefer
inheritance over re-resolution.

Two further rules complete the contract. The repository root checkout is **readable** for
dependency and vendor sources — resolved dependency trees, installed type definitions,
vendored packages — when something is missing or ambiguous in the worktree, and **never
writable**; reading it that way never substitutes the root for the worktree as the review
or build target. And a project CLI is never invoked through a **bare fetch-and-run**
(`npx`-style, or any ecosystem's equivalent) from inside a worktree: the fetched CLI is
not the project's toolchain, and it fails with errors that read exactly like a real defect
in the file under review.

**All of this lives in one physical line.** The contract is a single canonical
`**Addressing the story worktree.**` paragraph duplicated byte-identically across
`coder.md`, `writer.md`, `qa.md`, `auditor.md`, and the `lead` skill's `SKILL.md` —
the skill creates the worktree and names it to every dispatch, so it carries the
paragraph verbatim; there is no shared-include mechanism across these `.md` files.
That placement is a constraint, not a style choice:
the drift check in the root [`CLAUDE.md`](../CLAUDE.md) compares exactly one line per
file, so a *sibling* shared paragraph would be invisible to it and would drift freely
across five copies. Carrying the obligation in the shared paragraph rather than at each of
the `lead`'s dispatch steps also makes it bind by construction — including sub-dispatches
the `lead` does not make itself — and puts the rule in the receiving agent's own
definition, which is where a "is this result trustworthy?" decision is taken.

## The commit model

The `lead` — the orchestrating main session — is the only place commits happen; no
worker commits. Work happens in one worktree on one story
branch under the repo's worktree directory; the repo root stays on its base branch, and
that worktree is provisioned at creation (above).

The commits a run produces, in order: the spec; one per **pre-ship round** — the
`coder`'s initial build, then each `qa` and acceptance-gate fix round; the **ship
commit**, carrying whatever is still uncommitted at PR time (by then mainly the docs and
the spec's removal); then one per PR-review fix round. The count therefore varies with
how many rounds ran, rather than being fixed at two. The spec gets its own commit
precisely because the docs pass later folds it into durable docs and deletes it; without
that commit it would never appear in history.

The pre-ship round commits exist because every `qa` and acceptance-gate dispatch is a
**fresh** context. Without them, a round-2 dispatch inherits one undifferentiated
working tree holding the build and every round folded together, and cannot answer the
question its own dispatch asks — *what did the coder change in response to round 1?*
With them, the `lead` hands each fresh dispatch two commit references and it diffs round
N against round N−1: cheap, exact, and enough to check the coder changed **only** what
was reported. It is the same mechanism the PR-review loop already used, applied one
phase earlier. Round commits stay local in the worktree — there is no remote branch to
push to until the PR opens.

Three details of the design are deliberate. The **build** is committed before the *first*
`qa` dispatch, not just after each fix round: without it, round 1's fix lands fused with
the build and the first isolable diff only arrives at round 3 — exactly the blindness the
rule exists to remove. A round is committed **when the `coder` reports back**, whether or
not another dispatch follows, since the terminal round — the 3× cap reached and the
`lead` escalating to a human — is when the diffable history is needed most. And a round
stays **one** commit whose message names its composition (which round's findings it
applies, and any tests the previous `qa` added), rather than being split into coder and
qa commits: the reader of the diff needs to tell the hunks apart, which the message does,
without doubling the commit count. Keeping the branch at literally two commits by
amending and recording the pre-amend SHA was rejected — it makes the baseline a dangling,
unreachable commit that `git gc` may prune, and the PR-review loop already put the count
above two, so "two commits" described the model's *shape*, not a ceiling.

A consequence worth stating: an interrupted run now has each completed round in git, not
just in the worktree. The worktree already made an interruption lossless; the round
commits also make the work *legible* after one — the history shows which rounds landed
and what each changed, instead of one working tree of merged edits.

## The self-improvement channel

Any agent may append a concrete pipeline improvement to `AGENTS_IMPROVEMENTS.md` at the
root of the target project's documentation area — resolved from project context, never a
hardcoded path, created on first use. It is opt-in: an agent writes only when it has
something specific, and only after reading the file so a point is never duplicated.

The notes are about *how the agents work*, never about the product feature being built.
They are harvested back into this repository by hand.

## Working on this repo with the pipeline

This repository is itself an Obsidian vault with the layout the pipeline expects, so the
toolkit can be run on its own definitions: cards in [`tasks/`](./tasks/), in-flight specs
in `specs/`, scaffolds in `_templates/`. The board scan is scoped to `docs/tasks` in
`.obsidian/plugins/task-board/data.json`, excluding `_archive/`, `_backlog/`, and the
folder's `CLAUDE.md`.
