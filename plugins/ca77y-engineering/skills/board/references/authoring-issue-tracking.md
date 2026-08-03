# Authoring `ISSUE_TRACKING.md`

Load this only when a project's board declaration has to be **written or repaired**. Resolving an existing one needs nothing from this file — `SKILL.md` alone covers that.

`ISSUE_TRACKING.md` is the project's own answer to *how do we track work*. The `board` skill resolves it into a profile; a human maintains it. It is prose a person can read, not config — but every claim in it has to be true enough to bind a call to.

## Where it goes, and what it is called

Exactly `ISSUE_TRACKING.md`, committed, at the **root of the project's documentation area** — the same root `AGENTS_IMPROVEMENTS.md` uses — or at the repository root when the project keeps no docs area. Do not rename it, and do not split it across files. If the project already documents its board somewhere else — a rules page beside the cards, a section of a `CLAUDE.md` — the new file **points at that page and fills the gaps it leaves** rather than restating it; two declarations that can disagree are worse than one that is thin.

**Its path must be named in the project's context, and writing the file is only half the job.** The skill reads the declaration at the path its context gives it and never searches for one. So the authoring pass ends by wiring the pointer into whatever the project actually loads every session — normally a line in the root `CLAUDE.md`:

```markdown
Work tracking — the board, its statuses, and what agents may write to it — is declared in
[`docs/ISSUE_TRACKING.md`](docs/ISSUE_TRACKING.md).
```

A declaration nothing points at loads on the run where someone happens to grep for it and vanishes on the next, and the pipeline binds real calls to what it says. Intermittently visible is worse than absent: absent is at least consistent.

## If the user says a declaration already exists

Take them at their word — and do not go hunting for it, and do not write a second one. What is missing is the pointer, not the file. Tell them so, and give them the fix:

1. Add the pointer line above to the project's root `CLAUDE.md` (or wherever its always-loaded context lives), with the real path.
2. Alternatively, pass the path directly when invoking the skill, for a one-off run.
3. Then invoke the skill again — it will resolve from the existing file, probe it, and report anything the declaration leaves unbound.

Offer to add that line yourself if they want, subject to the same rule as everything else here: only when they invoked the skill directly, never mid-run.

## Write it only when the user asked for it

- **The user invoked the skill directly** → interview them, write the file, and tell them what to check.
- **A `lead` or `analyst` run is in progress** → never write it. Put the draft in your report and let the user decide. A file that appears in someone's repo mid-pipeline is a side effect they did not ask for, and a declaration authored without them is a guess wearing the authority of a project document.
- **Never write credentials, tokens, cookies, or private endpoints into it.** Name the mechanism and say it is already authenticated ("the Linear MCP server, connected in this workspace"). If a reader would need a secret to use what the file describes, describe it differently.

## What it must answer

Eight questions. Ask the user only what the project cannot tell you — read the rest from the repo, the available tooling, and the way existing work is referenced in commits and PRs.

1. **What system holds the work?** Name it, and say whether it is files in this repo or a service.
2. **How is it reached from a session?** A project skill, an MCP server (name the tools), a CLI (name the command and that it is already logged in), repo files, or a documented HTTP endpoint.
3. **How does each operation work?** *locate* a card from a reference, *read* one, *search* for related ones, *create* one, *transition* one. Say plainly when the project does not want one of them available — an unbound operation is a real answer.
4. **What shape is a card?** Where the scaffold or field set is defined, and which field carries identity, type, priority, dependencies, and acceptance criteria. Note any format quirk that constrains whoever writes one.
5. **What are the statuses?** The full vocabulary in the board's own words, then which value means *work started* and which means *awaiting review*, plus the value each should be transitioned *from*.
6. **Where must a status write land to be seen immediately?** For a repo-local board that is the root checkout, uncommitted, never a story branch. For a hosted board it is the API call.
7. **What may the pipeline write?** The exhaustive list. Silence here means the two status transitions and nothing else.
8. **What stays the human's?** Terminal states, card content, relationships. Name them, so a follow-up is reported rather than applied.

## The template

````markdown
# Issue tracking

How this project tracks work. The `ca77y-engineering:board` skill resolves this file;
keep it true, because the pipeline binds real calls to what it says.

## The board

<Name the system, and whether it is files in this repo or a service. One or two sentences.>

## Reaching it

<The mechanism: a project skill, an MCP server and its tools, a CLI that is already
authenticated, repo files, or a documented endpoint. No credentials here.>

## Operations

- **locate** — <how a reference (key, URL, number, slug, path, title) becomes one card>
- **read** — <how a card's goal, scope, acceptance criteria, links, and status are read>
- **search** — <how related cards are found: by subsystem, title, dependency, file region>
- **create** — <how a new card is filed, and at which status> | *not available*
- **transition** — <how a card's status is changed> | *not available*

## Card shape

<Where the scaffold or field set lives. Which field carries identity, type, priority,
dependencies, and acceptance criteria. Any format quirk a writer must respect.>

Acceptance criteria are recorded **one observable behaviour per line** — the acceptance
gate reads them one at a time.

## Statuses

<The full vocabulary, in this board's own words.>

- **work started** → `<value>` (expect `<value>` before writing)
- **awaiting review** → `<value>` (expect `<value>` before writing)
- Terminal states — <values> — are the human's.

## Visibility

<Where a status write must land so it is visible immediately.>

## What the pipeline may write

<The exhaustive list. Default: the two transitions above and nothing else.>

Everything else — <terminal states, card content, relationships> — is the human's. The
pipeline reports follow-ups rather than applying them.
````

## Worked examples

Three shapes, none privileged. Copy the closest and cut what does not apply.

**Repo-local Markdown.** *Reaching it:* files in this repo, no service. *Operations:* locate `docs/tasks/<slug>.md` by slug or title; read the file; search by grep across `docs/tasks/` including `_backlog/` and `_archive/`; create by copying `docs/_templates/story.md`; transition by editing the card's checkbox symbol. *Statuses:* work started → `[/]` (expect `[ ]` or `[<]`), awaiting review → `[?]` (expect `[/]`). *Visibility:* the root checkout on the base branch, left uncommitted — a card edited on a story branch stays invisible until it merges. *Quirk worth recording:* the kanban view scans files for checkbox markers and surfaces every match, so nested checkboxes create phantom cards.

**A tracker over MCP** (Linear, Jira, GitHub Issues). *Reaching it:* the tracker's MCP server, connected in this workspace — name the tools for reading an issue, searching, creating, and updating state. *Operations:* bind each to its tool, and say which team, project, or repository scopes them. *Statuses:* the workflow states as the tracker spells them, exactly. *Visibility:* the tool call itself; no checkout is involved. *Worth stating:* whether the pipeline may comment, and whether it may attach the PR link — both are outside the default authority unless this file grants them.

**A CLI or documented REST endpoint.** *Reaching it:* the command, and that it is already authenticated for whoever runs the pipeline. *Operations:* the concrete invocation per operation, with the project key or board id filled in. *Visibility:* the call. *Worth stating:* the rate limit or approval step, if either can make a write fail in a way that looks like a bug.

## Before calling it done

- **Wire the pointer into the project's loaded context**, per *Where it goes* above. An unpointed declaration is not done — the next run will resolve as if the project had none and offer to author the file you just wrote.
- **Probe it.** Run the `locate` and `read` bindings against a card that already exists. A declaration nobody has read a card through is a plan, not a resolution — and it will read as correct right up until a status is written into the wrong place.
- **Check every operation** the project wants available is bound, and every one it does not is marked *not available* rather than left out.
- **Check the status values are spelled the way the board spells them**, including case and punctuation.
- **Check no credential got written down**, including in a URL.
- Hand the user the file's path, what the probe returned, and the one or two things you had to assume.
