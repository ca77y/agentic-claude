---
type: story
title: Make a library pass verify its own claims and sweep its whole batch
---

# Make a library pass verify its own claims and sweep its whole batch

- [<] Make a library pass verify its own claims and sweep its whole batch #improvement 🔼 🆔 verify-library-pass-claims-mechanically
  - The `scribe` and `clerk` report a defect class as handled after fixing the files they happened to open, and log completion claims from recall rather than from a check. Three separate defect classes have now recurred after a corrective pass declared them fixed.
  - Background — wikilinks written against `title`, not filename: every raw note in one vault set `up: "[[Library Index]]"`. The index page's frontmatter `title` is "Library Index" but its filename is `index.md` with no `aliases:` entry, and Obsidian resolves wikilinks by filename or alias, never by the `title` property — so the link was unresolved on 47+ notes. A corrective pass had already fixed this exact bug class vault-wide once before ("fixed the ~50 stack-note wikilinks that resolved by title text rather than filename"), then re-copied the broken convention into the three notes it was fixing, because nothing checks a wikilink target against an actual filename before writing it.
  - Background — a fix that stops at the files it opened: a corrective pass fixed `#`-prefixed YAML tags in three raw notes and logged the class as done. Three other notes from the same batch still carry the identical defect (`tags: [#platforms/backend, #sync, ...]`). The same run's log claimed "no new taxonomy tags introduced: all tags used were already registered" — untrue even of the one page it checked, and across the batch's 22 notes dozens of tags were never registered at all.
  - Background — completion claims logged without a grep: a round-two corrective pass logged "added genuine reusable concept tags to taxonomy.md §2–§3", naming `sync` and `abandoned` among them. Neither string appears anywhere in the taxonomy file; one `grep` would have caught it. The same pass added roughly ten `^block-id` anchors, several placed mid-sentence with trailing prose after the caret, and several blank-line-separated from a *heading* rather than from the list, quote, callout, or table that placement form is valid for. Both are invalid per Obsidian's block-link rules, so wiki citations point at anchors that will not resolve — while a `grep -F` audit reports the literal `^block-id` text as present. That same pass also committed a raw note whose frontmatter `source:` value contained an unquoted colon, which is invalid YAML and fails to parse.
  - Scope: `plugins/ca77y-engineering/agents/scribe.md` and `clerk.md`. Prevention rules go to the `scribe` (it writes); detection rules go to the `clerk` (it audits).
  - Acceptance criteria:
  - The `scribe` resolves every `up:`/`related:`/inline wikilink target against an actual file basename or a declared `aliases:` entry before writing it, and never against a page's `title:` property.
  - When a pass fixes a defect class in one file of a multi-file batch, it checks every file created or touched in that batch for the same pattern before reporting the class handled.
  - A log entry naming a fix states the defect class and the number of files swept, not only the files that happened to be edited.
  - Before logging a claim of the form "tag X added" or "block ID Y added", the pass verifies it by searching the target file for the literal string rather than trusting the diff it just wrote.
  - Frontmatter written or edited by the `scribe` is parsed with a real YAML loader before the pass reports done.
  - New `^block-id` placements are checked against Obsidian's two valid forms — a same-line trailing caret for paragraphs and headings, and a blank-line-separated line only for lists, quotes, callouts, and tables — and the `clerk` audit flags anchors that are textually present but invalidly placed.
