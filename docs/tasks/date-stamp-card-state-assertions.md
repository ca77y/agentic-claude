---
type: story
title: Date-stamp a card's assertions about the state of the codebase
---

# Date-stamp a card's assertions about the state of the codebase

- [ ] Date-stamp a card's assertions about the state of the codebase #improvement 🔽 🆔 date-stamp-card-state-assertions
  - Cards assert facts about the codebase — line numbers, "no test framework exists yet", "no such file is present" — that are true when written and false when the card is invoked. A card reads as ground truth, so a stale claim can send a coder to re-provision infrastructure that already exists.
  - Background: a card scoped "introduce a test runner for the packages this story touches if none exists", asserting at length that the repository had no test framework, no test files, and no test script in three named package manifests. All of it was true when the card was written and false by the time it was invoked — a sibling story had landed a test runner, a test TypeScript config, five test files, and a test script in every package. The card's code citations had drifted too: the function it pointed at had moved about ten lines. Nothing broke, but the lead had to re-verify every factual claim before trusting any of them.
  - The `analyst` already reconciles the *board* at write time. Nothing marks when a claim about the *code* was last verified, so a reader cannot tell a fresh fact from a stale one.
  - Scope: `plugins/ca77y-engineering/agents/analyst.md`, and the card scaffold in `docs/_templates/story.md` if the stamp needs a fixed place to live.
  - Acceptance criteria:
  - A card assertion about the current state of the codebase — line numbers, "no X exists yet", the absence of a tool or file — records the commit or date it was verified against, in the card itself.
  - The stamp is placed consistently enough that a reader can find it without reading the whole card.
  - The `lead` treats a stamp older than recent merges as a signal to re-verify rather than a claim to build on, and its definition says so.
  - The rule complements, rather than repeats, the existing write-time board reconciliation and the shared-infrastructure coordination note.
  - See [`../_templates/story.md`](../_templates/story.md) for the scaffold cards are copied from.
