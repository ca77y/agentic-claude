---
type: story
title: Stop a dispatch prompt's conditionals leaking into finished prose
---

# Stop a dispatch prompt's conditionals leaking into finished prose

- [ ] Stop a dispatch prompt's conditionals leaking into finished prose #bug 🔼 🆔 resolve-conditional-dispatch-prompts-before-writing
  - A dispatcher that cannot know the repository's state in advance writes an if/then into the dispatch prompt. The `scribe` does not resolve that conditional against the actual state — it copies the wording into the published page as prose, so a reader-facing document contains instructions to its own author.
  - Background: a parent orchestrator dispatched `scribe` to write a synthesis wiki page while a sibling deep-dive on one candidate (TinyBase) was still running, and phrased that section as "if a dedicated TinyBase wiki page exists by now, link to it as authority and summarize its conclusion in one line; if not, state 'dedicated deep-dive in progress, will supersede this entry' — do NOT perform full analysis here." `scribe` reproduced the conditional verbatim in five places — the abstract, two gate-table rows, a section heading and the open-questions list — including "do NOT perform full analysis here" and "Check whether a dedicated `library/wiki/tinybase-*.md` page exists at this time" as sentences in the finished page. It was caught only because the parent re-read the page; a `clerk` audit pass over the same page did not flag it as a defect category on its own (its two rounds found broken links and missing index entries), and only confirmed it gone once the parent named it explicitly in the round-2 dispatch. Fixing it cost a full extra `scribe` round.
  - Scope: `plugins/ca77y-engineering/agents/scribe.md`, and `clerk.md`'s audit checklist.
  - Acceptance criteria:
  - Before finishing any wiki or synthesis write, the `scribe` resolves every conditional in its dispatch prompt against the actual repository state, and the published page states what is true rather than what the author should check.
  - The `scribe` runs a self-check for the tell — a sentence that describes what someone should do ("check whether", "if X exists", "do NOT") — and resolves it rather than shipping it.
  - `clerk`'s default audit checklist includes leaked meta-instructions in prose as a named defect category, alongside the placeholder headers and callouts it already checks, so a dispatcher does not have to name it for the check to run.
  - A dispatcher's if/then is never a reason for an extra remediation round: the defect is caught by the writing agent or by the default audit, not by a manual re-read.
