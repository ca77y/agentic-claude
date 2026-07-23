# Make a library pass verify its own claims and sweep its whole batch

- **Status**: Draft
- **Task**: verify-library-pass-claims-mechanically
- **Last Updated**: 2026-07-23
- **Document Scope**: One unit of work: add self-verification and whole-batch discipline to the `scribe` (prevention) and `clerk` (detection) agent definitions so a corrective library pass can no longer report a defect class handled from recall or from a partial fix.

---

## Goal

**Problem.** A library corrective pass currently reports a defect class as "handled" after touching only the files it happened to open, and logs completion claims from recall rather than from an actual check. Three defect classes have each recurred *after* a pass declared them fixed:

1. **Wikilinks resolved by `title:`, not filename.** Notes set `up: "[[Library Index]]"` where the index page's `title:` is "Library Index" but its filename is `index.md` with no `aliases:` entry. Obsidian resolves `[[...]]` by filename or a declared `aliases:` entry, never by `title:`, so 47+ links were unresolved. A prior pass had already fixed this exact class vault-wide, then re-copied the broken convention because nothing checks a wikilink target against a real filename before writing it.
2. **A fix that stops at the files it opened.** A pass fixed `#`-prefixed YAML tags in 3 raw notes and logged the class done; 3 other notes in the same 22-note batch still carried `tags: [#platforms/backend, #sync, ...]`, and dozens of tags across the batch were never registered in the taxonomy — while the log claimed "all tags used were already registered".
3. **Completion claims logged without a check.** A pass logged "added genuine reusable concept tags to taxonomy.md", naming `sync` and `abandoned`; neither string appears in the taxonomy file. The same pass added ~10 `^block-id` anchors, several placed mid-sentence and several blank-line-separated from a *heading* rather than from the list/quote/callout/table that placement form is valid for — both invalid per Obsidian's block-link rules, so citations point at anchors that will not resolve, even though a `grep -F` for the literal `^block-id` reports it present. That pass also committed a raw note whose frontmatter `source:` value held an unquoted colon — invalid YAML that fails to parse.

**Change.** Add prevention rules to `scribe.md` (it writes content) and detection rules to `clerk.md` (it audits after the fact) so that:

- wikilink targets are resolved against a real filename/alias before being written;
- a defect-class fix sweeps every file in the active batch before the class is reported handled;
- log entries name the defect class and the count of files swept, not just the files edited;
- additive claims ("tag X added", "block ID Y added") are grep-verified against the target file before being logged;
- frontmatter the `scribe` writes or edits is parsed with a real YAML loader before "done" is reported;
- `^block-id` anchors are placed only in Obsidian's two valid forms, and the `clerk` audit flags anchors that are textually present but invalidly placed.

**User value.** A corrective pass's "done" becomes trustworthy: the same defect class stops re-appearing in files the pass claimed to have cleaned, and citations resolve instead of silently dangling.

**Non-goals.**
- No change to any agent other than `scribe` and `clerk`. No application/plugin code, no dispatch model, no other pipeline agent.
- No test suite, harness, or fixture is added — this repo has no build/test suite for plugin prose (see *Design → Nature of change and verification*).
- Not building a general Obsidian linter or a runtime validator binary; the "checks" are procedures the agent performs during its pass (grep, YAML parse, placement inspection), expressed as instruction text in the two definitions.
- Not editing `library/_meta/librarian.md` or any target-project vault file — those live in the target project, not this repo; the two definitions already defer formatting conventions to `librarian.md` and this spec keeps that deference.

## Design

### Files touched

Exactly two, per the card's strict scope:

- `plugins/ca77y-engineering/agents/scribe.md` — **prevention** rules (the `scribe` writes content).
- `plugins/ca77y-engineering/agents/clerk.md` — **detection** rules (the `clerk` audits after the fact).

The card's split is load-bearing and must not be blurred: the `clerk` is not made responsible for preventing a defect at write time, and the `scribe` is not made responsible for auditing the whole vault after the fact. The one nuance the card grants: the `scribe` must sweep the batch **it is actively working on** before declaring a class handled — that is prevention within its own pass, not a full-vault audit.

### Where each rule lands

`scribe.md` current sections: front-matter, `## Shared principles`, `## Library layout`, `## Source of truth`, `## Ingest workflow` (steps 1–11), `## Writing rules` (bullets that defer to `librarian.md`), `## Output` (1–4), `## Process feedback`.

- **Wikilink resolution (Req A / criterion 1)** and **block-id placement (Req F, prevention half / criterion 6)** are write-time formatting disciplines → new bullets in `## Writing rules`, alongside the existing bullets that already govern wikilinks and citations.
- **Batch sweep (Req B / criterion 2)**, **log wording (Req C / criterion 3)**, **grep-verified additive claims (Req D / criterion 4)**, and **YAML parse before done (Req E / criterion 5)** are all "before I report / before I write the log" disciplines → a new `## Verify before you report done` section placed after `## Writing rules` and before `## Output`, plus a cross-reference from `## Ingest workflow` step 11 (the log-writing step) and from `## Output`.

`clerk.md` current sections: front-matter, `## Shared principles`, `## Mode`, `## Audit scope`, `## Audit workflow` (a "Convention compliance" paragraph + numbered "Audit-only checks" 1–6), `## Review standard`, `## Output`, `## Process feedback`.

- **Block-id placement detection (Req F, detection half / criterion 6)** → a new numbered entry under "Audit-only checks", because judging placement validity needs the cross-line structural check the card describes, not a per-page convention rule.
- **Title-resolved wikilink detection (Req A, detection counterpart)** → clarify existing "Audit-only check" #1 (broken wikilinks) to name title-text resolution explicitly as the recurring failure it must catch.
- **Claim/state reconciliation (Req D, detection counterpart)** → a new numbered entry under "Audit-only checks": a completion claim in `library/_meta/log.md` (e.g. "tag X added to taxonomy") whose asserted string is absent from the file it names is flagged, and every instance across the vault is reported, not the first.

### The "check" each rule mechanically consists of

- **Wikilink resolution:** before writing `[[target]]` (whether `up:`, `related:`, or an inline link), locate `target` as an actual file basename under the vault (e.g. a case-insensitive filename match, `ls`/glob or `grep -rl` for the file) **or** as a value in that page's `aliases:` frontmatter list. If it matches only a page's `title:` property, it is *not* a valid target — use the real basename or a declared alias instead. Never derive a wikilink target from a `title:` value.
- **Batch sweep:** the "batch" is the full set of files the pass created or touched in this run (for an ingest, every raw note and wiki page in scope; for a correction, every file named in the corrective assignment). When a defect class is fixed in one file, `grep` the whole batch for the same pattern (e.g. `grep -rn '^\s*tags:.*#' <batch>` for `#`-prefixed tags) and fix every hit before the class is reported handled.
- **Log wording:** the log entry for a fixed class states the defect class *and* the number of files swept for it (e.g. "normalized `#`-prefixed tags — swept 22 batch files, fixed 6"), not merely the files that were edited.
- **Grep-verified additive claim:** before logging "tag X added" or "block ID Y added", run a literal search of the target file for the exact string (`grep -F 'X' library/_meta/taxonomy.md`, `grep -F '^Y' <file>`) and only log the claim if the search reports it present. For a **block-id** claim the literal grep is necessary but *not sufficient* — a `grep -F` reports an invalidly placed anchor as present — so the claim additionally requires the block-id placement check (Req F) to pass. State this coupling in the rule.
- **YAML parse before done:** any frontmatter the `scribe` wrote or edited is parsed with a real YAML loader (e.g. `python3 -c 'import sys,yaml; yaml.safe_load(...)'` over the frontmatter block, or an equivalent scripted parse) — not eyeballed — and a parse failure blocks "done". This is what catches the unquoted-colon `source:` value.
- **Block-id placement:** for each `^block-id` added, inspect the anchor against Obsidian's two valid forms — (1) a **same-line trailing caret** appended to a paragraph or heading line (nothing but the anchor after it), and (2) a **line on its own, separated by a blank line**, valid only when the block it references is a list, quote, callout, or table. Mid-sentence carets, trailing prose after the caret, and a caret blank-line-separated from a *heading* are all invalid. The `scribe` must place anchors only in a valid form; the `clerk` audit must flag anchors that are textually present but invalidly placed.

### Nature of change and verification

This is a **prose / agent-definition change, not application code**. There is no build, no test runner, and no `tests/` directory for this plugin — downstream agents (`coder`, `qa`, `auditor`) must not look for one. The "checks" specified above are procedures the agent performs *at runtime during a library pass* (grep, YAML parse, placement inspection); they are not unit tests of this repo.

Because there is nothing to execute, **every acceptance scenario in this spec is verified by inspection of the two edited definition files** — re-reading `scribe.md` / `clerk.md` and confirming the required instruction text is present, correctly worded, and placed in the section named above (and, for criterion 6, that the prevention half is in `scribe.md` and the detection half in `clerk.md`). A scenario's WHEN/THEN describes the runtime behaviour the rule mandates so it can also be validated by a walkthrough against the concrete recurring cases in *Goal*; the passing bar for this task, however, is that the definition instructs that behaviour. This owning mechanism — coder edits the prose, `qa`/`auditor` verify by re-reading — is called out here and in *Tasks* so no agent hunts for an automated gate that cannot exist for prose.

### Boundary

- Edits are confined to `plugins/ca77y-engineering/agents/scribe.md` and `plugins/ca77y-engineering/agents/clerk.md`. No other file is created or modified by this task.
- No test infrastructure exists or is added; validation is inspection of the two files, which is fully within this boundary (the behaviour under test lives entirely in the two files being edited).
- No consumer build step exists (no `Dockerfile`/compose/CI compiles these definitions), so there is no downstream build to validate through; the definitions are consumed by the Claude plugin loader at runtime, unchanged in shape.
- Keep deferring all formatting-convention detail to `library/_meta/librarian.md` where the definitions already do; add the *verification discipline* (resolve, sweep, grep, parse, placement-check) rather than restating Obsidian syntax rules the conventions file owns.

### Coordination

`docs/tasks/give-scribe-a-raw-note-only-mode.md` (an active sibling story) also edits `plugins/ca77y-engineering/agents/scribe.md` — specifically the `## Ingest workflow` steps 9–11 (index/taxonomy/log) and adds a named raw-note-only mode. This spec adds a new `## Verify before you report done` section and cross-references step 11 (the log step). The two touch adjacent-but-distinct regions of the same file. **If `give-scribe-a-raw-note-only-mode` lands first, detect its changes and reuse them rather than reverting:** the batch-sweep/log-wording discipline here applies within whatever mode the `scribe` is running, and the log cross-reference should attach to the log step as that story left it (raw-note-only mode performs no log update, so the log-wording rule simply does not fire in that mode). A `coder` working from one card alone has no other signal the collision exists.

### Downstream docs note (not a criterion of this task)

The root `README.md` (`### scribe`, `### clerk`) and `docs/ARCHITECTURE.md` describe these two agents. Per `docs/CLAUDE.md`, when an agent's behavior changes the README must be updated. That is the **docs pass's** job, not part of this build; noted here so the later docs pass keeps them in sync.

## Requirements

Each requirement's scenarios are verified by re-reading the named definition file (see *Design → Nature of change and verification*); the WHEN/THEN states the runtime behaviour the added instruction text must mandate.

### Requirement: Wikilink targets resolve against a real filename or alias, never `title:` (criterion 1)

`scribe.md` `## Writing rules` gains a bullet requiring the `scribe` to resolve every `up:`, `related:`, and inline wikilink target against an actual file basename or a declared `aliases:` entry before writing `[[target]]`, and never against a page's `title:` property. `clerk.md` "Audit-only check" #1 is clarified so its broken-wikilink audit names title-text resolution as a class it must catch.

#### Scenario: Scribe resolves a link target before writing it

- **WHEN** the `scribe` is about to write `up: "[[Library Index]]"` and the target page's filename is `index.md` with no `aliases:` entry (only `title: "Library Index"`)
- **THEN** the `scribe` definition instructs it to reject the `title`-derived target, resolve to the real basename or a declared alias (e.g. `[[index]]`), and write that instead — never a target matched only against `title:`

#### Scenario: Scribe writes a link only after confirming the target exists

- **WHEN** the `scribe` needs an inline or `related:` wikilink to a page
- **THEN** the definition instructs it to confirm the target as an actual file basename (filename match / glob / `grep -rl`) or a declared alias before writing the link, so a target that resolves against nothing real is not written

#### Scenario: Clerk audit flags a title-resolved wikilink

- **WHEN** the `clerk` audits a page whose `[[...]]` target matches only another page's `title:` property and no filename or alias
- **THEN** the `clerk` definition's broken-wikilink audit instructs it to flag that link as unresolved (title-text resolution is named as the failure class), with the file path and recommended fix

### Requirement: A defect-class fix sweeps the whole active batch before the class is reported handled (criterion 2)

`scribe.md` gains (in the new `## Verify before you report done` section) a rule that when a defect class is fixed in one file of a multi-file batch, the `scribe` checks every file it created or touched in that batch for the same pattern and fixes all occurrences before reporting the class handled. "Batch" is defined as the full set of files in scope for the pass.

#### Scenario: A tag defect fixed in one file triggers a batch-wide check

- **WHEN** the `scribe` fixes `#`-prefixed YAML tags in one raw note that is part of a 22-file batch
- **THEN** the definition instructs it to grep the whole batch for the same pattern (e.g. `#`-prefixed `tags:` values) and fix every occurrence before it may report the `#`-prefixed-tag class handled

#### Scenario: The class is not reported handled while batch instances remain

- **WHEN** identical defects still exist in other files of the same batch
- **THEN** the definition prohibits reporting the class handled until the batch sweep has cleared them, so "handled" cannot mean "handled in the files I happened to open"

### Requirement: A log entry naming a fix states the defect class and files-swept count (criterion 3)

`scribe.md` `## Verify before you report done` (cross-referenced from `## Ingest workflow` step 11, the log step) requires that a log entry for a fixed defect class states the class and the number of files swept for it, not only the files that were edited.

#### Scenario: Log entry records class and sweep count

- **WHEN** the `scribe` writes a `library/_meta/log.md` entry for a defect class it corrected
- **THEN** the definition instructs the entry to name the defect class and the count of files swept (e.g. "swept 22 batch files, fixed 6"), not just the edited files

#### Scenario: A "no defects" claim is scoped to the swept set

- **WHEN** the `scribe` logs a negative claim such as "all tags used were already registered"
- **THEN** the definition requires that claim to be backed by the batch sweep and scoped to the files actually swept, so an unswept file cannot silently falsify it

### Requirement: Additive claims are grep-verified against the target file before being logged (criterion 4)

`scribe.md` `## Verify before you report done` requires that before logging a claim of the form "tag X added" or "block ID Y added", the `scribe` searches the target file for the literal string and logs the claim only if found — never trusting the diff it just wrote. `clerk.md` gains an "Audit-only check" that reconciles logged completion claims against the files they name.

#### Scenario: Scribe grep-verifies a taxonomy claim

- **WHEN** the `scribe` is about to log "added tag `sync` to taxonomy.md"
- **THEN** the definition instructs it to run a literal search (`grep -F 'sync' library/_meta/taxonomy.md`) and log the claim only if the string is present, so a claim naming a tag absent from the file is never written

#### Scenario: Scribe grep-verifies a block-id claim with the placement coupling

- **WHEN** the `scribe` is about to log "added block ID `^concept-1`"
- **THEN** the definition instructs it to `grep -F '^concept-1'` the target file **and** confirm the anchor passes the block-id placement check (Req F), because a literal grep alone reports an invalidly placed anchor as present

#### Scenario: Clerk audit reconciles a logged claim against file state

- **WHEN** the `clerk` audits and a `library/_meta/log.md` entry claims "tag X added to taxonomy" but `X` is absent from `taxonomy.md`
- **THEN** the `clerk` definition instructs it to flag the claim as unverified against file state and to report every such instance across the vault, not just the first

### Requirement: Frontmatter the scribe writes or edits parses under a real YAML loader before "done" (criterion 5)

`scribe.md` `## Verify before you report done` requires any frontmatter the `scribe` wrote or edited to be parsed with a real YAML loader — a scripted parse, not visual inspection — before the pass reports done, and a parse failure blocks "done".

#### Scenario: An unquoted-colon value is caught before reporting done

- **WHEN** the `scribe` writes a raw note whose frontmatter `source:` value contains an unquoted colon (invalid YAML)
- **THEN** the definition instructs it to parse the frontmatter with a real YAML loader (e.g. `python3 -c '... yaml.safe_load ...'`) and, on parse failure, fix the frontmatter and re-parse before it may report done

#### Scenario: Reporting done requires a clean parse

- **WHEN** the `scribe` is ready to report a pass done
- **THEN** the definition requires every frontmatter block it wrote or edited to have parsed cleanly under the loader first, so unparseable frontmatter cannot ship as "done"

### Requirement: Block-id anchors are placed in a valid form and invalid placements are audited (criterion 6)

`scribe.md` `## Writing rules` gains a bullet: a `^block-id` is placed only in Obsidian's two valid forms — a same-line trailing caret for a paragraph or heading, or a blank-line-separated line for a list, quote, callout, or table. `clerk.md` "Audit-only checks" gains an entry: the audit flags anchors that are textually present but invalidly placed. The prevention half is in `scribe.md`; the detection half is in `clerk.md`.

#### Scenario: Scribe places an anchor in a valid form

- **WHEN** the `scribe` adds a `^block-id` to a paragraph
- **THEN** the definition instructs it to append the caret at the end of that same paragraph line with nothing after it (form 1), and to use the blank-line-separated form only when the referenced block is a list, quote, callout, or table (form 2)

#### Scenario: Scribe rejects mid-sentence and heading-separated placements

- **WHEN** the `scribe` would place a caret mid-sentence, with trailing prose after it, or on a blank-line-separated line following a *heading*
- **THEN** the definition names these as invalid placements it must not write, and requires re-placing the anchor in a valid form

#### Scenario: Clerk audit flags a textually-present but invalidly-placed anchor

- **WHEN** the `clerk` audits a file containing a `^block-id` that a `grep -F` reports present but which sits mid-sentence or is blank-line-separated from a heading
- **THEN** the `clerk` definition's audit instructs it to flag the anchor as invalidly placed (so a citation to it will not resolve), with the file path and the valid form it should take — distinct from a merely missing anchor

## Tasks

- [ ] Edit `plugins/ca77y-engineering/agents/scribe.md` `## Writing rules`: add a wikilink-resolution bullet (Req A) — resolve `up:`/`related:`/inline targets against a real basename or declared alias, never `title:`.
- [ ] Edit `plugins/ca77y-engineering/agents/scribe.md` `## Writing rules`: add a block-id placement bullet (Req F prevention) — the two valid Obsidian forms and the named invalid placements.
- [ ] Add a `## Verify before you report done` section to `plugins/ca77y-engineering/agents/scribe.md` (after `## Writing rules`, before `## Output`) covering: batch sweep before a class is reported handled (Req B); log entry states class + files-swept count (Req C); grep-verify additive claims, with the block-id placement coupling (Req D); real-YAML-loader parse of written/edited frontmatter before done (Req E).
- [ ] Cross-reference the new section from `## Ingest workflow` step 11 (log) and from `## Output` in `scribe.md`, without duplicating the rule text.
- [ ] Edit `plugins/ca77y-engineering/agents/clerk.md` "Audit-only check" #1: name title-text wikilink resolution as a broken-link class it must catch (Req A detection).
- [ ] Edit `plugins/ca77y-engineering/agents/clerk.md` "Audit-only checks": add an entry flagging `^block-id` anchors textually present but invalidly placed (Req F detection).
- [ ] Edit `plugins/ca77y-engineering/agents/clerk.md` "Audit-only checks": add an entry reconciling `library/_meta/log.md` completion claims against the files they name, reporting every instance (Req D detection).
- [ ] Confirm no other file is touched; keep formatting-convention detail deferred to `library/_meta/librarian.md`; respect the `give-scribe-a-raw-note-only-mode` coordination note if that story has landed.
- [ ] Verify by inspection: re-read both edited definitions and confirm each requirement's instruction text is present, correctly worded, and in the named section, with criterion 6's prevention half in `scribe.md` and detection half in `clerk.md`. No test suite exists — this inspection is the acceptance check.
