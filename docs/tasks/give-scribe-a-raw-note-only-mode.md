---
type: story
title: Give the scribe a raw-note-only mode so a caller prohibition cannot be overridden
---

# Give the scribe a raw-note-only mode so a caller prohibition cannot be overridden

- [ ] Give the scribe a raw-note-only mode so a caller prohibition cannot be overridden #bug ⏫ 🆔 give-scribe-a-raw-note-only-mode
  - The `scribe`'s standing workflow ends with three unconditional steps: update the library's index, taxonomy, and log. A dispatch that explicitly forbids those updates is prose competing against a built-in step, and the built-in step can win silently.
  - Background: in a five-way parallel second-pass research fan-out, every child agent's dispatch ended with "do NOT write a wiki page and do NOT touch the shared meta files (index, taxonomy, log) — the parent owns those", precisely because concurrent edits to those three files from parallel children corrupt the vault. Four of five children's scribes complied and said so. One did not — it reported having updated all three meta files, and the working tree confirmed all three modified. The agent had no way to signal the conflict between its default behaviour and the prohibition; it just took the default. With five children in flight simultaneously this is a lost-update race on three shared files, not merely a protocol violation.
  - The `researcher` already documents the serialization rule on its side ("children do not write wiki pages or the shared meta files — those are written once, by the parent"), so the parent-side contract exists and only the `scribe` side is unenforced.
  - Scope: `plugins/ca77y-engineering/agents/scribe.md`, with the corresponding dispatch wording in `researcher.md` updated to name the mode rather than describe the prohibition in prose.
  - Acceptance criteria:
  - The `scribe` has a named raw-note-only mode in which it writes the raw note and performs no index, taxonomy, or log update.
  - The definition states that an explicit caller prohibition on meta updates always wins over the default update step, so the conflict resolves the same way every time.
  - In that mode the `scribe` returns the paths of the notes it left un-indexed, so the caller can batch the meta update itself.
  - The `researcher`'s fan-out dispatches invoke the mode by name instead of relying on a prose instruction to suppress a built-in step.
  - The `researcher`'s parent-side serialized meta update consumes the returned un-indexed paths rather than rediscovering them.
