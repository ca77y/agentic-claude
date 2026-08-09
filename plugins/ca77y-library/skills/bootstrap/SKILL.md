---
name: bootstrap
description: Scaffold a new project's `library/` folder — the Markdown research vault that `researcher`, `librarian`, `scribe`, and `clerk` read and write at the fixed `library/` path: `README.md`, `CLAUDE.md`, `_meta/` (index, taxonomy, log, librarian conventions, Templater templates), `raw/`, and `wiki/`. Invoked directly by the user to set a project up for the research-library crew, once, before its first research run. Does not run research, write wiki pages, or touch `docs/ISSUE_TRACKING.md` — that declaration belongs to the unrelated `ca77y-engineering:board` skill.
---

You scaffold the fixed `library/` layout every `ca77y-library` agent expects, in a project that doesn't have one yet. There is nothing to resolve at agent run time: `researcher`, `librarian`, `scribe`, and `clerk` all read and write `library/...` directly, at fixed paths, with no discovery step. Your job is making that layout exist, once, correctly — populating it with research is theirs.

## Before you start

- **Check whether the library already exists.** If `library/_meta/librarian.md` is already there, stop and report what exists instead of touching it — this is a create-once scaffold, not a repair tool. If part of the structure exists (someone started by hand, or a prior run was interrupted), tell the user exactly what's missing and confirm before filling the gap; never overwrite a file that already has content.
- **Gather what you cannot invent, and confirm every guess before writing:**
  - **Project name** — for the `README.md` opening line and the taxonomy scope line. Read the project's own `README.md` or `package.json` first; ask only if neither gives a clear name.
  - **One-sentence domain description** — what this library will hold research about (e.g. "search providers, crawling, anti-bot systems, archival, MCP, deployment, and reliability" from `web-tools`, or "product, training domain, and technical topics" from `hangboard-app`). Infer a draft from the project's `README.md`/`CLAUDE.md` if one exists, but confirm it with the user rather than shipping a guess — this line is the library's entry point and should read as true on day one.
  - **A handful of starter domain tags** (5-10) naming the concrete things this project's research will actually be about — technologies, providers, protocols, subsystems. Ask the user directly; do not invent a taxonomy for a domain you haven't been told about. If nothing concrete is offered, leave the domain-tags section with just a comment noting it starts empty — an honestly empty starter beats invented tags nobody asked for.

## What you create

```
library/
├── README.md
├── CLAUDE.md
├── _meta/
│   ├── index.md
│   ├── taxonomy.md
│   ├── log.md
│   ├── librarian.md
│   └── templates/
│       ├── raw-note.md
│       ├── wiki-page.md
│       └── topic-moc.md
├── raw/
│   └── README.md
└── wiki/
    └── README.md
```

Load `references/library-scaffold.md` for the exact content of every file. Most of it is **invariant** — the same text regardless of what the project researches — because it encodes shared conventions the library agents already assume: `CLAUDE.md`, `_meta/librarian.md`, the three `_meta/templates/` scaffolds, and `raw/README.md` / `wiki/README.md` all get copied verbatim (only the `{{TODAY}}` date fields change). Only `README.md`, `_meta/index.md`, `_meta/taxonomy.md`, and `_meta/log.md` carry the project-specific fields you gathered above — the reference file marks each one with `{{PLACEHOLDER}}` tokens; replace every token, and leave everything else byte-for-byte as written there.

Write every file even when a section will start empty (`raw/`, `wiki/`) — an empty *populated-later* directory with just its `README.md` is the expected steady state, not a partial scaffold. Don't add a `researcher`/`librarian`/`scribe`/`clerk` dispatch to this pass: this skill creates the empty vault; the crew fills it in on a separate, later invocation.

## Wire it into the project's root `CLAUDE.md`

Both reference projects (`hangboard-app`, `web-tools`) point their root `CLAUDE.md` at the library rather than restating its conventions there. Do the same:

- If the project has a root `CLAUDE.md` with a directory/layout listing, add one line for `library/` to it (e.g. `library/   # Markdown research wiki: raw sources, synthesis, and metadata`).
- Add a short `## Library` section (or equivalent) that says to read `library/_meta/librarian.md` before library work and names the one or two rules worth surfacing at the root (preserve raw notes, cite claims, no always-on service required) — a pointer, not a restatement of the full `librarian.md`.
- If the project has no root `CLAUDE.md` at all, don't create one — that's a separate concern (the `init` skill). Say so in your report and let the user decide.

## Hard rules

- **Never overwrite an existing `library/`.** This is a create-once scaffold; a repair or restructure is a separate, explicit ask.
- **Never invent domain-specific taxonomy.** A handful of tags the user actually confirmed beats a plausible-looking list you made up — the taxonomy is supposed to grow from real research, not from guessing a project's future needs.
- **Never fabricate the project description.** Draft it from what you can read in the project, but always confirm it with the user before it ships in `_meta/index.md`.
- **Stay off `docs/`.** `docs/ISSUE_TRACKING.md` and anything else under `docs/` belongs to the `ca77y-engineering` pipeline's own fixed paths (its board declaration, its spec area) — unrelated to this library, and not yours to create or assume exists, since a project may run `ca77y-library` with no `ca77y-engineering` installed at all.
- **Never dispatch the library crew from inside this skill.** You create the empty scaffold only; `researcher`, `librarian`, `scribe`, and `clerk` are invoked separately, afterward, by the user.

## Report

List the files you created, the project-specific fields you filled in and where each came from (told by the user vs. inferred-then-confirmed), whether and how you wired the root `CLAUDE.md`, and the natural next step: invoke `ca77y-library:researcher` for the project's first deep dive.
