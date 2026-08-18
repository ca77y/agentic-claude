---
name: bootstrap
description: Scaffold a project's `library/` research vault (the fixed layout `researcher`, `librarian`, `scribe`, and `clerk` read and write), optionally its Obsidian vault config too — run once, before the first research run. Does not run research, write wiki pages, or touch `docs/BOARD.md`.
---

You scaffold the fixed `library/` layout every `ca77y-library` agent expects, in a project that doesn't have one yet. `researcher`, `librarian`, `scribe`, and `clerk` read and write `library/...` at fixed paths with no discovery step; you make that layout exist, once, correctly — populating it is theirs.

## Before you start

- **Check whether the library already exists.** If `library/_meta/librarian.md` is already there, stop and report what exists instead of touching it — this is a create-once scaffold, not a repair tool. If part of the structure exists, tell the user exactly what's missing and confirm before filling the gap; never overwrite a file that already has content.
- **Gather what you cannot invent, and confirm every guess before writing:**
  - **Project name** — for the `README.md` opening line and the taxonomy scope line. Read the project's own `README.md` or `package.json` first; ask only if neither gives a clear name.
  - **One-sentence domain description** — what this library will hold research about (e.g. "search providers, crawling, anti-bot systems, archival, MCP, deployment, and reliability"). Infer a draft from the project's `README.md`/`CLAUDE.md` if one exists, but confirm it with the user rather than shipping a guess.
  - **A handful of starter domain tags** (5-10) naming the concrete things this project's research will be about — technologies, providers, protocols, subsystems. Ask the user directly; do not invent a taxonomy for a domain you haven't been told about. If nothing concrete is offered, leave the `## Domain tags` section with just an HTML comment noting it starts empty.
- **Ask whether to also bootstrap the project's Obsidian vault config.** Default to **yes** if `.obsidian/` already exists in the project (then merge rather than overwrite — see below); otherwise ask. A "no" still leaves the library fully usable as plain Markdown — `_meta/librarian.md` requires no plugin.

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

Every file under `resources/library/` in this skill is a **real file to copy**, not prose to transcribe — copy the whole `resources/library/` tree into the target project's `library/` preserving structure, then edit only the copies (never `resources/`) to fill in tokens. `CLAUDE.md`, the three `_meta/templates/` files, and `raw/README.md` / `wiki/README.md` copy over with no edits at all; `_meta/librarian.md`'s body is likewise invariant, but its header carries the `{{TODAY}}` and `{{PROJECT_NAME}}` tokens.

**Token replacement.** After copying, replace every `{{TOKEN}}` in the copied files (never in `resources/` itself) with the values gathered above:

| Token | Appears in | Value |
| --- | --- | --- |
| `{{PROJECT_NAME}}` | `README.md`, `_meta/index.md` (via title text), `_meta/taxonomy.md`, `_meta/log.md`, `_meta/librarian.md` | the project's name |
| `{{TODAY}}` | `_meta/index.md`, `_meta/taxonomy.md`, `_meta/log.md`, `_meta/librarian.md` | today's date, `YYYY-MM-DD`, the same value in every file for one bootstrap pass |
| `{{DOMAIN_ONE_LINER}}` | `_meta/index.md` | the confirmed one-sentence domain description |
| `{{DOMAIN_TAGS}}` | `_meta/taxonomy.md` | a Markdown bullet list of the confirmed starter tags, one per line as `` - `tag-name` ``, or the placeholder HTML comment when none were given |

`_meta/templates/*.md` also contain `<% tp.file.title %>` / `<% tp.date.now(...) %>` — those are **Templater's own placeholders**, not this skill's tokens. Copy them exactly as-is.

Write every file even when a section will start empty (`raw/`, `wiki/`) — an empty directory with just its `README.md` is the expected steady state. Do not dispatch the crew from this pass (per *Hard rules*).

## Obsidian bootstrap (if the user opted in)

`resources/obsidian/` holds the vault config for the three plugins the library itself uses — `dataview` (index/MOC queries), `templater-obsidian` (the `_meta/templates/` scaffolds), `breadcrumbs` (the `up`/`related` links `clerk` audits). This skill only knows about the library; it never assumes any other plugin's vault needs.

- If `.obsidian/` does **not** exist yet: copy `resources/obsidian/community-plugins.json` and `resources/obsidian/app.json` to `.obsidian/community-plugins.json` and `.obsidian/app.json` verbatim — no tokens in either file.
- If `.obsidian/` **already exists**: don't overwrite `app.json` (it may carry the user's own settings). Instead, merge the three plugin ids into the existing `community-plugins.json`'s array (dedup, keep any plugins already listed there).
- Append the contents of `resources/obsidian/gitignore-additions.txt` to the project's `.gitignore` (create one if none exists), skipping any line already present.
- **This skill does not vendor the plugin binaries** (`main.js`/`manifest.json`/`styles.css`) — third-party compiled code that goes stale once copied. Say so in your report, and tell the user to install Dataview, Templater, and Breadcrumbs from Obsidian's Community Plugins browser (Settings → Community plugins → Browse) — `community-plugins.json` already lists them, so each enables itself once installed.

## Wire it into the project's root `CLAUDE.md`

Point the root `CLAUDE.md` at the library rather than restating its conventions there:

- If the project has a root `CLAUDE.md` with a directory/layout listing, add one line for `library/` to it (e.g. `library/   # Markdown research wiki: raw sources, synthesis, and metadata`).
- Append `resources/root-claude-md-library-section.md` (or merge it into an existing similarly-named section, adapting the wording to the surrounding file's voice rather than duplicating a section).
- If the project has no root `CLAUDE.md` at all, don't create one — that's a separate concern (the `init` skill). Say so in your report and let the user decide.

## Hard rules

- **Never overwrite an existing `library/`.** This is a create-once scaffold; a repair or restructure is a separate, explicit ask.
- **Never invent domain-specific taxonomy.** Only tags the user confirmed — the taxonomy grows from real research, not from guessing a project's future needs.
- **Never fabricate the project description.** Draft it from what you can read in the project, but always confirm it with the user before it ships in `_meta/index.md`.
- **Stay off `docs/`.** `docs/BOARD.md` and anything else under `docs/` is unrelated to this library and not yours to create or assume exists — a project may run `ca77y-library` alone.
- **Never overwrite an existing `.obsidian/app.json`** or any other pre-existing Obsidian config file — merge into `community-plugins.json` and `.gitignore` only, as described above.
- **Never dispatch the library crew from inside this skill.** You create the empty scaffold only; `researcher`, `librarian`, `scribe`, and `clerk` are invoked separately, afterward, by the user.

## Report

List the files you created (library and, if opted in, Obsidian config), the project-specific fields you filled in and where each came from (told by the user vs. inferred-then-confirmed), whether and how you wired the root `CLAUDE.md`, whether Obsidian was bootstrapped and the plugin-install step still pending, and the natural next step: invoke `ca77y-library:researcher` for the project's first deep dive.
